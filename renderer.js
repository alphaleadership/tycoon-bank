const formatNumber = (val) => {
  if (val >= 1e33) return (val / 1e33).toFixed(2) + ' Dc';
  if (val >= 1e30) return (val / 1e30).toFixed(2) + ' No';
  if (val >= 1e27) return (val / 1e27).toFixed(2) + ' Oc';
  if (val >= 1e24) return (val / 1e24).toFixed(2) + ' Sp';
  if (val >= 1e21) return (val / 1e21).toFixed(2) + ' Sx';
  if (val >= 1e18) return (val / 1e18).toFixed(2) + ' Qi';
  if (val >= 1e15) return (val / 1e15).toFixed(2) + ' Qa';
  if (val >= 1e12) return (val / 1e12).toFixed(2) + ' T';
  if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Md';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + ' M';
  return Math.floor(val).toString();
};

const formatMoney = (val) => {
  if (val >= 1e6) return formatNumber(val) + ' €';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};

let researchNetwork = null;
let researchNodes = null;
let researchEdges = null;
let researchNodesView = null;
let researchEdgesView = null;
let currentResearchFilter = 'Finance';

let endgameNetwork = null;
let endgameNodes = null;
let endgameEdges = null;
// [FIX #5] Version tracker pour détecter un changement de structure de l'arbre endgame
let endgameTreeVersion = null;

// [FIX #1] focusEndgameTier : vis.Network.focus() attend un nodeId (string), pas un tableau.
// On utilise network.fit({ nodes: ids }) à la place, qui accepte bien un tableau d'ids.
const focusEndgameTier = (state, tier) => {
  if (!endgameNetwork) return;
  const ids = Object.keys(state.endgameTree || {})
    .filter(id => (state.endgameTree[id].tier || 1) === tier);
  if (ids.length === 0) return;

  endgameNetwork.selectNodes(ids, false);
  endgameNetwork.fit({
    nodes: ids,
    animation: { duration: 500, easingFunction: 'easeInOutQuad' }
  });
};

function getNodeCategory(id) {
  if (id.includes('tech') || ['r_quantum', 'r_ai', 'r_hft_ai', 'r_roboadvisor', 'r_neural_trading', 'r_datamining_lab', 'r_quant'].includes(id)) return 'Tech';
  if (id.includes('bio') || id === 'r_cloning') return 'Bio';
  if (id.includes('cosmic') || id === 'r_moon' || id === 'r_mars') return 'Cosmic';
  return 'Finance';
}

const renderResearchTree = (state) => {
  const container = document.getElementById('research-tree-container');
  const msgContainer = document.getElementById('endgame-msg-container');
  
  const urSet = new Set(state.unlockedResearches);
  const allDone = Object.keys(state.researchTree)
    .filter(k => !state.researchTree[k].repeatable)
    .every(k => urSet.has(k));

  if (allDone) {
    if (msgContainer) msgContainer.innerHTML = '<div style="padding:1rem; text-align:center; background:rgba(100,255,150,0.1); border-radius:8px; margin-bottom:1rem;"><b style="color:var(--primary-color);">🌟 Arbre Technologique Complété !</b><br/><span style="font-size:0.85em;">Mode Endgame activé : Les jours passent automatiquement toutes les 10 secondes. Vos RP optimisent votre rentabilité (+0.1% / point).</span></div>';
  } else {
    if (msgContainer) msgContainer.innerHTML = '';
  }

  if (!researchNetwork) {
    researchNodes = new vis.DataSet();
    researchEdges = new vis.DataSet();
    
    let edges = [];
    let nodes = [];
    
    for (const [id, r] of Object.entries(state.researchTree)) {
      let icon = '💡';
      if (id.includes('market') || id.includes('ad') || id.includes('loyalty') || id.includes('gamification') || id.includes('sponsor')) icon = '📣';
      else if (id.includes('risk') || id.includes('cb_') || id.includes('subprime') || id.includes('bribery') || id.includes('monopoly')) icon = '⚖️';
      else if (id.includes('online') || id.includes('premium') || id.includes('vip') || id.includes('mobile') || id.includes('eco') || id.includes('greenbonds') || id.includes('blockchain')) icon = '🌐';
      else if (id.includes('ai') || id.includes('hft') || id.includes('quant') || id.includes('roboadvisor') || id.includes('neural')) icon = '🤖';
      else if (id.includes('lab') || id.includes('university') || id.includes('quantum') || id.includes('moon') || id.includes('mars') || id.includes('cloning') || id.includes('datamining')) icon = '🧪';
      else if (id.includes('hr') || id.includes('tax') || id.includes('offshore') || id.includes('retreat')) icon = '💼';

      nodes.push({ id: id, label: icon + ' ' + r.name + '\n' + formatNumber(r.cost) + ' RP', title: r.desc });
      for (const req of r.req) {
        edges.push({ from: req, to: id, arrows: 'to' });
      }
    }
    
    researchNodes.add(nodes);
    researchEdges.add(edges);
    
    researchNodesView = new vis.DataView(researchNodes, { filter: item => getNodeCategory(item.id) === currentResearchFilter });
    // [FIX #4] Filtre avec && au lieu de || pour éviter les arêtes "fantômes" pointant vers des
    // nœuds non affichés (appartenant à une autre catégorie que le filtre actif).
    researchEdgesView = new vis.DataView(researchEdges, {
      filter: item =>
        getNodeCategory(item.to) === currentResearchFilter &&
        getNodeCategory(item.from) === currentResearchFilter
    });
    
    const data = { nodes: researchNodesView, edges: researchEdgesView };
    const options = {
      layout: {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
          nodeSpacing: 250,
          treeSpacing: 300,
          levelSeparation: 150,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true
        }
      },
      nodes: {
        shape: 'box',
        margin: 12,
        font: { color: '#ffffff', face: 'Inter', multi: 'html', size: 14 },
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 5, x: 2, y: 2 }
      },
      edges: {
        color: { color: 'rgba(255,255,255,0.2)' },
        smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 },
        arrows: { to: { enabled: true, scaleFactor: 0.5 } }
      },
      physics: {
        enabled: true,
        hierarchicalRepulsion: {
          nodeDistance: 200
        }
      },
      interaction: { hover: true, dragNodes: true, zoomView: true, dragView: true }
    };
    researchNetwork = new vis.Network(container, data, options);
    
    researchNetwork.on('doubleClick', async function (params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        window.doResearch(nodeId);
      }
    });
  }
  
  const updates = [];
  
  const getMissingCost = (nodeId) => {
    const missing = new Set();
    const findMissing = (nId) => {
      const node = state.researchTree[nId];
      if (!node) return;
      for (const req of node.req) {
        if (!state.unlockedResearches.includes(req) && !missing.has(req)) {
          findMissing(req);
          missing.add(req);
        }
      }
    };
    findMissing(nodeId);
    let total = state.researchTree[nodeId].cost;
    for (const m of missing) total += state.researchTree[m].cost;
    return { total, count: missing.size };
  };

  for (const [id, r] of Object.entries(state.researchTree)) {
    const isUnlocked = state.unlockedResearches.includes(id) && !r.repeatable;
    const hasReq = r.req.every(reqId => state.unlockedResearches.includes(reqId));
    const missingInfo = getMissingCost(id);
    
    // 1000 € = 1 RP
    const equivalentRPFromMoney = Math.floor(state.money / 1000);
    const totalAvailableRP = state.researchPoints + equivalentRPFromMoney;
    const canAffordAll = totalAvailableRP >= missingInfo.total;
    const canAffordSingle = totalAvailableRP >= r.cost;
    
    let background = '#2c3e50';
    let border = '#34495e';
    let titleStr = r.desc + '\nStatus: ';
    
    if (isUnlocked) {
      background = '#27ae60'; border = '#2ecc71';
      titleStr += 'Débloqué';
    } else if (hasReq && canAffordSingle) {
      background = '#2980b9'; border = '#3498db';
      titleStr += 'Disponible (Double-cliquez pour rechercher)';
      if (state.researchPoints < r.cost) titleStr += `\n(Achètera les RP manquants pour ${formatNumber((r.cost - state.researchPoints) * 1000)} €)`;
    } else if (hasReq) {
      background = '#8e44ad'; border = '#9b59b6';
      titleStr += `Fonds insuffisants (${formatNumber(r.cost)} RP)`;
    } else if (!hasReq && canAffordAll) {
      background = '#d35400'; border = '#e67e22'; // Orange pour l'achat récursif
      titleStr += `Déblocage groupé disponible (${missingInfo.count} prérequis, Total: ${formatNumber(missingInfo.total)} RP)`;
      if (state.researchPoints < missingInfo.total) titleStr += `\n(Achètera les RP manquants pour ${formatNumber((missingInfo.total - state.researchPoints) * 1000)} €)`;
    } else {
      background = '#7f8c8d'; border = '#95a5a6';
      titleStr += `Verrouillé (Il vous faut ${formatNumber(missingInfo.total)} RP au total)`;
    }
    
    updates.push({ id: id, color: { background: background, border: border }, title: titleStr });
  }
  researchNodes.update(updates);
};

const updateEndgameTree = (state) => {
  const container = document.getElementById('endgame-tree-container');
  if (!container) return;

  // [FIX #5] Si la structure de l'arbre endgame a changé (ex: après un rebirth qui modifierait
  // endgameTree), on détruit le réseau existant pour le reconstruire proprement.
  const newVersion = JSON.stringify(Object.keys(state.endgameTree));
  if (endgameNetwork && endgameTreeVersion !== newVersion) {
    endgameNetwork.destroy();
    endgameNetwork = null;
    endgameNodes = null;
    endgameEdges = null;
  }
  endgameTreeVersion = newVersion;

  if (!endgameNetwork) {
    endgameNodes = new vis.DataSet();
    endgameEdges = new vis.DataSet();
    
    let edges = [];
    let nodes = [];
    
    for (const [id, r] of Object.entries(state.endgameTree)) {
      // Icône et couleur initiale par palier
      const tier = r.tier || 1;
      const icon = tier === 3 ? '👑' : tier === 2 ? '⚫' : '🌌';
      const initBg = tier === 3 ? '#7d6608' : tier === 2 ? '#0e6655' : '#34495e';
      const initBorder = tier === 3 ? '#d4ac0d' : tier === 2 ? '#1abc9c' : '#9b59b6';
      nodes.push({
        id: id,
        label: icon + ' ' + r.name + '\n' + formatNumber(r.cost) + ' DM',
        title: r.desc,
        color: { background: initBg, border: initBorder }
      });
      for (const req of r.req) {
        edges.push({ from: req, to: id, arrows: 'to' });
      }
    }
    
    endgameNodes.add(nodes);
    endgameEdges.add(edges);
    
    const data = { nodes: endgameNodes, edges: endgameEdges };
    const options = {
      layout: { hierarchical: { direction: 'UD', sortMethod: 'directed', nodeSpacing: 250, levelSeparation: 150 } },
      nodes: { shape: 'box', margin: 12, font: { color: '#ffffff', face: 'Inter', multi: 'html', size: 14 }, borderWidth: 2, shadow: { enabled: true, color: 'rgba(155, 89, 182, 0.5)', size: 5, x: 2, y: 2 } },
      edges: { color: { color: 'rgba(155, 89, 182, 0.5)' }, smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 }, arrows: { to: { enabled: true, scaleFactor: 0.5 } } },
      physics: { enabled: true, hierarchicalRepulsion: { nodeDistance: 200 } },
      interaction: { hover: true, dragNodes: true, zoomView: true, dragView: true }
    };
    endgameNetwork = new vis.Network(container, data, options);
    
    endgameNetwork.on('doubleClick', async function (params) {
      if (params.nodes.length > 0) {
        window.doEndgameResearch(params.nodes[0]);
      }
    });
  }
  
  const updates = [];
  const erSet = new Set(state.endgameResearches);
  for (const [id, r] of Object.entries(state.endgameTree)) {
    const isUnlocked = erSet.has(id);
    const hasReq = r.req.every(reqId => erSet.has(reqId));
    const tier = r.tier || 1;
    
    // Palette par palier : I = violet, II = cyan/teal, III = or
    const palettes = {
      1: { locked: '#34495e', lockBorder: '#2c3e50', avail: '#8e44ad', availBorder: '#9b59b6', done: '#6c3483', doneBorder: '#9b59b6', noFund: '#c0392b', noFundBorder: '#e74c3c' },
      2: { locked: '#0e4d43', lockBorder: '#0e6655', avail: '#148f77', availBorder: '#1abc9c', done: '#0e6655', doneBorder: '#1abc9c', noFund: '#922b21', noFundBorder: '#e74c3c' },
      3: { locked: '#4d3b00', lockBorder: '#7d6608', avail: '#b7950b', availBorder: '#d4ac0d', done: '#7d6608', doneBorder: '#f1c40f', noFund: '#922b21', noFundBorder: '#e74c3c' }
    };
    const p = palettes[tier];
    
    let background, border;
    let titleStr = r.desc + `\n[Palier ${tier}]`;
    
    if (isUnlocked) {
      background = p.done; border = p.doneBorder;
      titleStr += '\n✅ Débloqué';
    } else if (hasReq && state.darkMatter >= r.cost) {
      background = p.avail; border = p.availBorder;
      titleStr += '\n▶ Disponible (Cliquez pour débloquer)';
    } else if (hasReq) {
      background = p.noFund; border = p.noFundBorder;
      titleStr += `\n🔒 DM insuffisante (${formatNumber(r.cost)} DM requis)`;
    } else {
      background = p.locked; border = p.lockBorder;
      titleStr += '\n🔒 Prérequis manquants';
    }
    
    updates.push({ id: id, color: { background, border, highlight: { background, border: '#ecf0f1' } }, title: titleStr });
  }
  endgameNodes.update(updates);
};

const renderStockMarket = (state) => {
  const container = document.getElementById('stock-list-container');
  
  // Mise à jour différentielle : si le conteneur a déjà les bons enfants, on met à jour les données seulement
  const symbols = Object.keys(state.stocks);
  const existingItems = container.querySelectorAll('.stock-item');
  
  if (existingItems.length !== symbols.length) {
    // Première construction complète
    container.innerHTML = '';
    for (const symbol of symbols) {
      const stock = state.stocks[symbol];
      const owned = state.portfolio[symbol];
      let trend = 0;
      if (stock.history.length > 1) {
        const prev = stock.history[stock.history.length - 2];
        trend = ((stock.price - prev) / prev) * 100;
      }
      const trendClass = trend >= 0 ? 'text-success' : 'text-danger';
      const trendSymbol = trend >= 0 ? '▲' : '▼';
      const div = document.createElement('div');
      div.className = 'stock-item';
      div.dataset.symbol = symbol;
      div.innerHTML = `
        <div class="stock-header">
          <div class="stock-name">${stock.name} <span style="font-size:0.8rem; color:var(--text-muted)">(${symbol})</span></div>
          <div class="stock-price-box">
            <div class="stock-price" data-price>${formatMoney(stock.price)}</div>
            <div class="stock-trend ${trendClass}" data-trend>${trendSymbol} ${Math.abs(trend).toFixed(2)}%</div>
          </div>
        </div>
        <div class="stock-portfolio">
          Possédé : <strong data-owned>${formatNumber(owned)}</strong> action(s)
        </div>
        <div class="stock-actions">
          <button class="btn btn-buy stock-btn" data-buy onclick="window.buyStock('${symbol}', 1)" ${state.money < stock.price ? 'disabled' : ''}>Acheter (1)</button>
          <button class="btn btn-sell stock-btn" data-sell onclick="window.sellStock('${symbol}', 1)" ${owned < 1 ? 'disabled' : ''}>Vendre (1)</button>
        </div>
      `;
      container.appendChild(div);
    }
  } else {
    // Mise à jour partielle via data-symbol : matching robuste indépendant de l'ordre DOM
    // Construire une Map symbol -> element en O(n) une seule fois
    const itemBySymbol = new Map();
    for (const el of existingItems) {
      if (el.dataset.symbol) itemBySymbol.set(el.dataset.symbol, el);
    }

    for (const symbol of symbols) {
      const item = itemBySymbol.get(symbol);
      if (!item) {
        // Élément manquant : forcer une reconstruction complète au prochain cycle
        container.innerHTML = '';
        renderStockMarket(state);
        return;
      }

      const stock = state.stocks[symbol];
      const owned = state.portfolio[symbol];
      let trend = 0;
      if (stock.history.length > 1) {
        const prev = stock.history[stock.history.length - 2];
        trend = ((stock.price - prev) / prev) * 100;
      }
      const trendClass = trend >= 0 ? 'text-success' : 'text-danger';
      const trendSymbol = trend >= 0 ? '▲' : '▼';

      const priceEl = item.querySelector('[data-price]');
      const trendEl = item.querySelector('[data-trend]');
      const ownedEl = item.querySelector('[data-owned]');
      const buyBtn = item.querySelector('[data-buy]');
      const sellBtn = item.querySelector('[data-sell]');
      if (priceEl) priceEl.textContent = formatMoney(stock.price);
      if (trendEl) {
        trendEl.textContent = `${trendSymbol} ${Math.abs(trend).toFixed(2)}%`;
        trendEl.className = `stock-trend ${trendClass}`;
      }
      if (ownedEl) ownedEl.textContent = formatNumber(owned);
      if (buyBtn) buyBtn.disabled = state.money < stock.price;
      if (sellBtn) sellBtn.disabled = owned < 1;
    }
  }
};

window.doResearch = async (id) => {
  const res = await window.electronAPI.unlockResearch(id);
  addLog(res.message);
  updateUI();
};

window.doEndgameResearch = async (id) => {
  const res = await window.electronAPI.unlockEndgameResearch(id);
  addLog(res.message);
  updateUI();
};

window.buyStock = async (symbol, amount) => {
  const res = await window.electronAPI.buyStock(symbol, amount);
  addLog(res.message);
  updateUI();
};

window.sellStock = async (symbol, amount) => {
  const res = await window.electronAPI.sellStock(symbol, amount);
  addLog(res.message);
  updateUI();
};

const updateUI = async () => {
  const state = await window.electronAPI.getState();
  if (!state) return;
  
  if (state.appVersion && document.getElementById('app-version')) {
    document.getElementById('app-version').innerText = 'v' + state.appVersion;
  }

  document.getElementById('val-day').textContent = state.day;
  document.getElementById('val-money').textContent = formatMoney(state.money);
  document.getElementById('val-clients').textContent = formatNumber(state.clients);
  document.getElementById('val-employees').textContent = formatNumber(state.employees);
  if (document.getElementById('val-hrmanagers')) {
    document.getElementById('val-hrmanagers').textContent = formatNumber(state.hrManagers || 0);
  }
  
  const btnToggleLoan = document.getElementById('btn-toggle-auto-loan');
  if (btnToggleLoan) {
    if (state.autoLoanEnabled !== false) {
      btnToggleLoan.textContent = "Prêts Automatiques : ON";
      btnToggleLoan.style.background = "rgba(39, 174, 96, 0.2)";
      btnToggleLoan.style.borderColor = "rgba(39, 174, 96, 0.5)";
    } else {
      btnToggleLoan.textContent = "Prêts Automatiques : OFF";
      btnToggleLoan.style.background = "rgba(192, 57, 43, 0.2)";
      btnToggleLoan.style.borderColor = "rgba(192, 57, 43, 0.5)";
    }
  }

  const btnToggleConsumeRP = document.getElementById('btn-toggle-auto-consume-rp');
  if (btnToggleConsumeRP) {
    if (state.autoConsumeRPEnabled !== false) {
      btnToggleConsumeRP.textContent = "Bonus Scientifique Auto : ON";
      btnToggleConsumeRP.style.background = "rgba(39, 174, 96, 0.2)";
      btnToggleConsumeRP.style.borderColor = "rgba(39, 174, 96, 0.5)";
    } else {
      btnToggleConsumeRP.textContent = "Bonus Scientifique Auto : OFF";
      btnToggleConsumeRP.style.background = "rgba(192, 57, 43, 0.2)";
      btnToggleConsumeRP.style.borderColor = "rgba(192, 57, 43, 0.5)";
    }
  }

  document.getElementById('val-loans').innerText = formatMoney(state.loansOut);
  document.getElementById('val-rate').innerText = (state.interestRate * 100).toFixed(1) + '%';
  document.getElementById('val-cb-rate').innerText = (state.centralBankRate * 100).toFixed(1) + '%';
  
  const urSet = new Set(state.unlockedResearches);
  const allDone = Object.keys(state.researchTree)
    .filter(k => !state.researchTree[k].repeatable)
    .every(k => urSet.has(k));
  // [FIX #3b] Synchronise le cache utilisé par le setInterval endgame.
  // Sans cette ligne, _lastKnownAllDone restait false pour toujours et
  // l'auto-avance de jour ne se déclenchait jamais.
  _lastKnownAllDone = allDone;
  if (allDone && document.getElementById('endgame-upgrades')) {
    document.getElementById('endgame-upgrades').style.display = 'block';
    if (document.getElementById('nav-ascension')) document.getElementById('nav-ascension').style.display = 'inline-block';
    if (document.getElementById('val-dm')) document.getElementById('val-dm').textContent = formatNumber(state.darkMatter || 0);
    document.getElementById('lvl-mega-marketing').textContent = state.megaMarketing || 0;
    document.getElementById('lvl-mega-lobbying').textContent = state.megaLobbying || 0;
    
    const missingDmSpan = document.getElementById('val-dm-missing');
    if (missingDmSpan) {
      const dmCost = 1000000000000;
      if (state.money >= dmCost) {
        missingDmSpan.textContent = "Prêt pour l'Ascension !";
        missingDmSpan.style.color = "#2ecc71";
      } else {
        const missingPercent = ((dmCost - state.money) / dmCost) * 100;
        missingDmSpan.textContent = `(Il manque ${missingPercent.toFixed(1)}%)`;
        missingDmSpan.style.color = "#e74c3c";
      }
    }
    
    // We only update endgame tree if the tab is visible or we just want to keep it updated in background
    updateEndgameTree(state);
    const tierButtons = [
      ['tier1-badge', 1],
      ['tier2-badge', 2],
      ['tier3-badge', 3]
    ];
    tierButtons.forEach(([id, tier]) => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = () => focusEndgameTier(state, tier);
    });
    // [FIX #2] updateRebirthUI est async (appelle rebirthPreview() en interne).
    // Sans await, la Promise était ignorée silencieusement et la preview EP ne s'affichait jamais.
    await updateRebirthUI(state);
    updateAmfUI(state);

    // Mise à jour des badges de palier
    const erSet = new Set(state.endgameResearches);
    const tier1Keys = ['e_base','e_marketing','e_finance','e_tech','e_dm','e_auto_dm'];
    const tier2Keys = ['e2_empire','e2_workforce','e2_blackhole','e2_omniloan','e2_apex'];
    const tier3Keys = ['e3_godbank','e3_timewarp','e3_singularity','e3_omniscience'];

    const countDone = (keys) => keys.filter(k => erSet.has(k)).length;
    const t1Done = countDone(tier1Keys), t2Done = countDone(tier2Keys), t3Done = countDone(tier3Keys);
    // [FIX] Le palier suivant ne devient accessible que quand le palier précédent est
    // ENTIÈREMENT complété, pas dès qu'une seule recherche est débloquée.
    const hasTier1 = t1Done === tier1Keys.length;
    const hasTier2 = t2Done === tier2Keys.length;

    const t1El = document.getElementById('tier1-status');
    const t2El = document.getElementById('tier2-status');
    const t3El = document.getElementById('tier3-status');
    const t2Badge = document.getElementById('tier2-badge');
    const t3Badge = document.getElementById('tier3-badge');

    if (t1El) t1El.textContent = hasTier1 ? '✅ Complété' : `${t1Done}/${tier1Keys.length} recherches`;
    if (t2El) t2El.textContent = t2Done === tier2Keys.length ? '✅ Complété' : hasTier1 ? `${t2Done}/${tier2Keys.length} recherches (Palier II disponible)` : 'Nécessite de compléter le Palier I';
    if (t3El) t3El.textContent = t3Done === tier3Keys.length ? '✅ Complété' : hasTier2 ? `${t3Done}/${tier3Keys.length} recherches (Palier III disponible)` : 'Nécessite de compléter le Palier II';

    if (t2Badge) {
      t2Badge.style.opacity = hasTier1 ? '1' : '0.5';
      t2Badge.style.cursor = hasTier1 ? 'pointer' : 'not-allowed';
      t2Badge.onclick = hasTier1 ? () => focusEndgameTier(state, 2) : null;
    }
    if (t3Badge) {
      t3Badge.style.opacity = hasTier2 ? '1' : '0.5';
      t3Badge.style.cursor = hasTier2 ? 'pointer' : 'not-allowed';
      t3Badge.onclick = hasTier2 ? () => focusEndgameTier(state, 3) : null;
    }
  } else if (document.getElementById('endgame-upgrades')) {
    document.getElementById('endgame-upgrades').style.display = 'none';
    if (document.getElementById('nav-ascension')) document.getElementById('nav-ascension').style.display = 'none';
  }
  document.getElementById('val-marketing').innerText = `Niv ${state.marketingLevel} / ${formatNumber(state.marketers)} Emp`;
  
  document.getElementById('val-rp').textContent = formatNumber(state.researchPoints);
  document.getElementById('val-researchers').textContent = formatNumber(state.researchers);
  document.getElementById('btn-hire-researcher').disabled = state.researchers >= 100;
  document.getElementById('btn-fire-researcher').disabled = state.researchers === 0;

  document.getElementById('val-traders').textContent = formatNumber(state.traders);
  document.getElementById('btn-fire-trader').disabled = state.traders === 0;
  
  document.getElementById('btn-fire-marketer').disabled = state.marketers === 0;
  if (document.getElementById('btn-fire-hrmanager')) {
    document.getElementById('btn-fire-hrmanager').disabled = (state.hrManagers || 0) === 0;
  }
  
  if (document.getElementById('val-perso-cs')) {
    document.getElementById('val-perso-cs').textContent = formatNumber(state.employees);
    document.getElementById('val-perso-traders').textContent = formatNumber(state.traders);
    document.getElementById('val-perso-marketers').textContent = formatNumber(state.marketers);
    document.getElementById('val-perso-researchers').textContent = formatNumber(state.researchers);
    document.getElementById('val-perso-hrmanagers').textContent = formatNumber(state.hrManagers || 0);
  }
  
  renderResearchTree(state);
  renderStockMarket(state);
};

const addLog = (message) => {
  const logContainer = document.getElementById('log-container');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `[Jour ${document.getElementById('val-day').textContent}] ${message}`;
  logContainer.prepend(entry);
  
  // Prévention des freezes : limiter l'historique à 50 messages
  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastChild);
  }
};

document.getElementById('btn-marketing').addEventListener('click', async () => {
  const res = await window.electronAPI.actionMarketing();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const slot = document.getElementById('save-slot').value;
  const res = await window.electronAPI.saveGame(slot);
  addLog(res.message);
});

document.getElementById('btn-load').addEventListener('click', async () => {
  const slot = document.getElementById('save-slot').value;
  const res = await window.electronAPI.loadGame(slot);
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-hire').addEventListener('click', async () => {
  const res = await window.electronAPI.actionHire();
  if(res.success) { addLog(res.message); updateUI(); }
  else { alert(res.message); }
});

if (document.getElementById('btn-hire-hrmanager')) {
  document.getElementById('btn-hire-hrmanager').addEventListener('click', async () => {
    const res = await window.electronAPI.actionHireHrManager();
    if(res.success) { addLog(res.message); updateUI(); }
    else { alert(res.message); }
  });
}

if (document.getElementById('btn-fire-hrmanager')) {
  document.getElementById('btn-fire-hrmanager').addEventListener('click', async () => {
    const res = await window.electronAPI.actionFireHrManager();
    if(res.success) { addLog(res.message); updateUI(); }
    else { alert(res.message); }
  });
}

document.getElementById('btn-research-all').addEventListener('click', async () => {
  const res = await window.electronAPI.unlockAllResearch();
  if(res.success) {
    addLog(res.message);
    updateUI();
  } else {
    alert(res.message);
  }
});

document.getElementById('btn-buy-rp').addEventListener('click', async () => {
  const res = await window.electronAPI.buyRP();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-sell-rp').addEventListener('click', async () => {
  const res = await window.electronAPI.sellRP();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-sell-all-rp').addEventListener('click', async () => {
  const res = await window.electronAPI.sellAllRP();
  addLog(res.message);
  updateUI();
});

if (document.getElementById('btn-mega-buy-max-rp')) {
  document.getElementById('btn-mega-buy-max-rp').addEventListener('click', async () => {
    const res = await window.electronAPI.buyMaxRP();
    addLog(res.message);
    updateUI();
  });
  document.getElementById('btn-mega-marketing').addEventListener('click', async () => {
    const res = await window.electronAPI.buyMegaMarketing();
    addLog(res.message);
    updateUI();
  });
  document.getElementById('btn-mega-lobbying').addEventListener('click', async () => {
    const res = await window.electronAPI.buyMegaLobbying();
    addLog(res.message);
    updateUI();
  });
}

if (document.getElementById('btn-buy-dm')) {
  document.getElementById('btn-buy-dm').addEventListener('click', async () => {
    const res = await window.electronAPI.buyDM();
    addLog(res.message);
    updateUI();
  });
}

document.getElementById('btn-toggle-auto-consume-rp').addEventListener('click', async () => {
  const res = await window.electronAPI.toggleAutoConsumeRP();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-hire-researcher').addEventListener('click', async () => {
  const res = await window.electronAPI.actionHireResearcher();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-fire-researcher').addEventListener('click', async () => {
  const res = await window.electronAPI.actionFireResearcher();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-hire-trader').addEventListener('click', async () => {
  const res = await window.electronAPI.actionHireTrader();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-fire-trader').addEventListener('click', async () => {
  const res = await window.electronAPI.actionFireTrader();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-hire-marketer').addEventListener('click', async () => {
  const res = await window.electronAPI.actionHireMarketer();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-fire-marketer').addEventListener('click', async () => {
  const res = await window.electronAPI.actionFireMarketer();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-loan').addEventListener('click', async () => {
  const res = await window.electronAPI.actionLoan();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-toggle-auto-loan').addEventListener('click', async () => {
  const res = await window.electronAPI.toggleAutoLoan();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-rate').addEventListener('click', async () => {
  const val = document.getElementById('input-rate').value;
  if(val) {
    const res = await window.electronAPI.setRate(val);
    addLog(res.message);
    updateUI();
    document.getElementById('input-rate').value = '';
  }
});

document.getElementById('btn-next-day').addEventListener('click', async () => {
  const res = await window.electronAPI.nextDay();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-update').addEventListener('click', async () => {
  addLog("⏳ Vérification des mises à jour en cours...");
  const res = await window.electronAPI.checkUpdate();
  addLog(res.message);
});

document.getElementById('btn-hard-reset').addEventListener('click', async () => {
  if (confirm("Êtes-vous sûr de vouloir réinitialiser la partie ? Cette action est irréversible !")) {
    const res = await window.electronAPI.hardReset();
    addLog(res.message);
    updateUI();
  }
});

document.getElementById('btn-sponsor').addEventListener('click', () => {
  if (window.electronAPI && window.electronAPI.openSponsor) {
    window.electronAPI.openSponsor();
  } else {
    alert("Merci pour votre soutien moral, les étoiles GitHub suffiront !");
  }
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('primary-btn');
      b.classList.add('secondary-btn');
    });
    e.target.classList.remove('secondary-btn');
    e.target.classList.add('primary-btn');
    
    currentResearchFilter = e.target.dataset.filter;
    if (researchNodesView && researchEdgesView) {
      researchNodesView.refresh();
      researchEdgesView.refresh();
      if (researchNetwork) researchNetwork.fit();
    }
  });
});

// Init
updateUI();

// [FIX #3] Auto-advance endgame : on appelle nextDay() directement sans vérifier allDone
// côté renderer (ce qui nécessitait un getState() supplémentaire).
// Le backend sait déjà s'il est en mode endgame ; nextDay() retourne res.autoAdvanced = false
// quand il n'y a rien à faire, et on évite ainsi le double aller-retour IPC.
// Si ton main.js ne supporte pas encore res.autoAdvanced, la version de repli ci-dessous
// reste correcte : on passe simplement l'état déjà chargé par updateUI() via une variable partagée.
let _lastKnownAllDone = false; // cache local mis à jour par updateUI

setInterval(async () => {
  if (!_lastKnownAllDone) return; // pas encore en endgame, on ne touche rien
  const res = await window.electronAPI.nextDay();
  if (res && res.message) {
    addLog("<b>⏳ Journée Auto (Endgame)</b><br/>" + res.message);
    updateUI();
  }
}, 10000);

// Tabs Management
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    btn.classList.add('active');
    const target = document.getElementById(btn.getAttribute('data-tab'));
    if (target) target.style.display = 'block';
  });
});

// ── REBIRTH SYSTEM ────────────────────────────────────────────────────────────

const REBIRTH_UPGRADES_DEF = [
  { id: 'rb_money',    name: 'Héritage Capital',      icon: '💰', desc: 'Démarre avec 10× plus d\'argent par niveau.', maxLevel: 8 },
  { id: 'rb_clients',  name: 'Réseau Fidèle',          icon: '👥', desc: '+200 clients au départ par niveau.',           maxLevel: 10 },
  { id: 'rb_rp_speed', name: 'Mémoire Scientifique',   icon: '🔬', desc: '+1 RP/chercheur/jour par niveau.',             maxLevel: 10 },
  { id: 'rb_income',   name: 'Multiplicateur Karmique', icon: '✨', desc: 'Revenus journaliers ×(1+0.25×niv).',          maxLevel: 8 },
  { id: 'rb_salary',   name: 'Syndicats Démantelés',    icon: '🏢', desc: '-5% de masse salariale par niveau.',           maxLevel: 10 },
  { id: 'rb_dm',       name: 'Noyau de Matière Noire',  icon: '⚫', desc: '+1 DM au départ par niveau.',                  maxLevel: 5 }
];

// Coûts (doivent correspondre à REBIRTH_UPGRADES dans main.js)
const rbCostFn = {
  rb_money:    (lvl) => lvl + 1,
  rb_clients:  (lvl) => lvl + 1,
  rb_rp_speed: (lvl) => (lvl + 1) * 2,
  rb_income:   (lvl) => (lvl + 1) * 3,
  rb_salary:   (lvl) => (lvl + 1) * 2,
  rb_dm:       (lvl) => (lvl + 1) * 5
};

const renderRebirthUpgrades = (state) => {
  const grid = document.getElementById('rebirth-upgrades-grid');
  if (!grid) return;
  const upgrades = state.rebirthUpgrades || {};

  grid.innerHTML = REBIRTH_UPGRADES_DEF.map(upg => {
    const lvl = upgrades[upg.id] || 0;
    const isMax = lvl >= upg.maxLevel;
    const cost = isMax ? '–' : rbCostFn[upg.id](lvl);
    const ep = state.prestigePoints || 0;
    const canAfford = !isMax && ep >= rbCostFn[upg.id](lvl);

    const progress = (lvl / upg.maxLevel) * 100;
    const btnStyle = isMax
      ? 'background: rgba(39,174,96,0.2); border-color: #27ae60; color: #27ae60; cursor: default;'
      : canAfford
        ? 'background: rgba(231,76,60,0.2); border-color: #e74c3c; color: #e74c3c; cursor: pointer;'
        : 'background: rgba(127,140,141,0.1); border-color: #7f8c8d; color: #7f8c8d; cursor: not-allowed;';

    return `
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span style="font-size: 1.4rem;">${upg.icon}</span>
          <div>
            <div style="font-weight: bold; color: #ecf0f1; font-size: 0.95rem;">${upg.name}</div>
            <div style="font-size: 0.75rem; color: #95a5a6;">${upg.desc}</div>
          </div>
        </div>
        <div style="background: rgba(0,0,0,0.3); border-radius: 4px; height: 6px; margin: 0.5rem 0;">
          <div style="background: #e74c3c; width: ${progress}%; height: 100%; border-radius: 4px; transition: width 0.3s;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
          <span style="font-size: 0.8rem; color: #bdc3c7;">Niv. <strong>${lvl}</strong> / ${upg.maxLevel}</span>
          <button
            onclick="window.buyRebirthUpgrade('${upg.id}')"
            style="padding: 0.3rem 0.75rem; font-size: 0.8rem; border-radius: 6px; border: 1px solid; ${btnStyle}"
            ${isMax || !canAfford ? 'disabled' : ''}>
            ${isMax ? '✅ MAX' : `Améliorer (${cost} EP)`}
          </button>
        </div>
      </div>`;
  }).join('');
};

// [FIX #2] updateRebirthUI est déclarée async car elle appelle window.electronAPI.rebirthPreview().
// Elle doit être attendue avec await dans updateUI() pour que la preview EP s'affiche correctement.
const updateRebirthUI = async (state) => {
  const navRebirth = document.getElementById('nav-rebirth');

  // Afficher l'onglet dès qu'on a fait au moins 1 rebirth ou qu'on peut en faire
  const erSet = new Set(state.endgameResearches || []);
  const canRebirth = erSet.has('e3_omniscience');
  const hasRebirthed = (state.rebirthCount || 0) > 0;

  if ((canRebirth || hasRebirthed) && navRebirth) {
    navRebirth.style.display = 'inline-block';
  }

  if (document.getElementById('val-ep')) {
    document.getElementById('val-ep').textContent = formatNumber(state.prestigePoints || 0);
  }
  if (document.getElementById('val-rebirth-count')) {
    document.getElementById('val-rebirth-count').textContent = formatNumber(state.rebirthCount || 0);
  }

  const previewEl = document.getElementById('val-ep-preview');
  const btnRebirth = document.getElementById('btn-do-rebirth');
  const lockMsg = document.getElementById('rebirth-lock-msg');

  if (canRebirth) {
    const preview = await window.electronAPI.rebirthPreview();
    if (previewEl) previewEl.textContent = `+${formatNumber(preview.epGain)} EP`;
    if (btnRebirth) btnRebirth.disabled = false;
    if (lockMsg) lockMsg.textContent = '✅ Prêt pour le Rebirth !';
    if (lockMsg) lockMsg.style.color = '#2ecc71';
  } else {
    if (previewEl) previewEl.textContent = '–';
    if (btnRebirth) btnRebirth.disabled = true;
    if (lockMsg) lockMsg.textContent = 'Nécessite : Omniscience Financière (Palier III)';
    if (lockMsg) lockMsg.style.color = '#7f8c8d';
  }

  renderRebirthUpgrades(state);
};

// Binding global pour les boutons onclick injectés
window.buyRebirthUpgrade = async (id) => {
  const res = await window.electronAPI.buyRebirthUpgrade(id);
  addLog(res.message);
  updateUI();
};

// Bouton Rebirth
document.getElementById('btn-do-rebirth')?.addEventListener('click', async () => {
  const confirmed = confirm('⚠️ Êtes-vous sûr de vouloir effectuer un Rebirth ?\n\nToute votre progression (argent, clients, recherches, ascension) sera réinitialisée.\nSeuls vos Éclats de Prestige et améliorations permanentes seront conservés.');
  if (!confirmed) return;
  const res = await window.electronAPI.doRebirth();
  addLog(`<b style="color:#e74c3c">${res.message}</b>`);
  updateUI();
});

// ── AMF SYSTEM ────────────────────────────────────────────────────────────────

const AMF_ACTIONS_DEF = [
  { id: 'a_amende_std',     name: 'Amende Standard',        icon: '📄', costAuth: 10,  cooldown: 1,  desc: '+5B€ d\'amendes immédiates.' },
  { id: 'a_enquete',        name: 'Ouvrir une Enquête',      icon: '🔍', costAuth: 50,  cooldown: 7,  desc: '7 jours → +500B€ d\'amendes.' },
  { id: 'a_gel_actifs',     name: 'Gel d\'Actifs',           icon: '🧊', costAuth: 80,  cooldown: 5,  desc: 'Crashes réduits de 75% pendant 10 jours.' },
  { id: 'a_revoc_licence',  name: 'Révoquer une Licence',    icon: '🚫', costAuth: 120, cooldown: 14, desc: '+2000B€ + +10 Influence Politique.' },
  { id: 'a_intervention',   name: 'Intervention de Marché',  icon: '📈', costAuth: 200, cooldown: 10, desc: '+50% dividendes HFT pendant 15 jours.' },
  { id: 'a_nationalisation', name: 'Nationalisation',         icon: '🏛️', costAuth: 500, cooldown: 30, desc: 'Revenus permanents cumulatifs +0.1%/j.' }
];

const AMF_MANDATS_DEF = [
  { id: 'm_transparence', name: 'Mandat Transparence',      icon: '📋', cost: 10,  desc: '+5 Autorité/jour.' },
  { id: 'm_anti_blanch',  name: 'Anti-Blanchiment',         icon: '🚿', cost: 20,  desc: '+50M€/jour d\'amendes passives.' },
  { id: 'm_hft_ctrl',     name: 'Contrôle HFT',             icon: '⚡', cost: 35,  desc: 'Toutes les amendes ×2.' },
  { id: 'm_supervision',  name: 'Supervision Cosmique',     icon: '🔭', cost: 60,  desc: '+20 Autorité/jour. Crashes → baisses minimales.' },
  { id: 'm_omnireg',      name: 'Régulation Omniverselle',  icon: '👑', cost: 100, desc: '5% de la trésorerie → Autorité/jour.' }
];

const renderAmfActions = (amf) => {
  const grid = document.getElementById('amf-actions-grid');
  if (!grid) return;
  const cooldowns = amf.cooldowns || {};
  const autorite = amf.autorite || 0;

  grid.innerHTML = AMF_ACTIONS_DEF.map(a => {
    const cd = cooldowns[a.id] || 0;
    const onCd = cd > 0;
    const canAfford = autorite >= a.costAuth;
    const disabled = onCd || !canAfford;

    const bgColor = onCd ? 'rgba(127,140,141,0.1)' : canAfford ? 'rgba(243,156,18,0.15)' : 'rgba(192,57,43,0.1)';
    const borderColor = onCd ? '#7f8c8d' : canAfford ? '#f39c12' : '#e74c3c';
    const textColor = onCd ? '#7f8c8d' : canAfford ? '#f39c12' : '#e74c3c';

    return `
      <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 10px; padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div style="font-size: 1.3rem;">${a.icon}</div>
          <span style="font-size: 0.75rem; color: #f39c12; background: rgba(243,156,18,0.15); padding: 0.1rem 0.4rem; border-radius: 4px;">${a.costAuth} 🏛️</span>
        </div>
        <div style="font-weight: bold; color: #ecf0f1; margin-bottom: 0.25rem;">${a.name}</div>
        <div style="font-size: 0.78rem; color: #95a5a6; margin-bottom: 0.75rem;">${a.desc}</div>
        <button
          onclick="window.amfDoAction('${a.id}')"
          style="width: 100%; padding: 0.4rem; font-size: 0.85rem; border-radius: 6px; border: 1px solid ${borderColor}; background: ${bgColor}; color: ${textColor}; cursor: ${disabled ? 'not-allowed' : 'pointer'};"
          ${disabled ? 'disabled' : ''}>
          ${onCd ? `⏳ Recharge (${cd}j)` : !canAfford ? '🔒 Autorité insuffisante' : 'Exécuter'}
        </button>
      </div>`;
  }).join('');
};

const renderAmfMandats = (amf) => {
  const grid = document.getElementById('amf-mandats-grid');
  if (!grid) return;
  const mandats = new Set(amf.mandats || []);
  const influence = amf.influence || 0;

  grid.innerHTML = AMF_MANDATS_DEF.map(m => {
    const owned = mandats.has(m.id);
    const canAfford = influence >= m.cost;
    const borderColor = owned ? '#27ae60' : canAfford ? '#3498db' : '#7f8c8d';
    const bgColor = owned ? 'rgba(39,174,96,0.1)' : canAfford ? 'rgba(52,152,219,0.1)' : 'rgba(127,140,141,0.05)';

    return `
      <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 10px; padding: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span style="font-size: 1.3rem;">${m.icon}</span>
          <div style="font-weight: bold; color: #ecf0f1;">${m.name}</div>
        </div>
        <div style="font-size: 0.78rem; color: #95a5a6; margin-bottom: 0.75rem;">${m.desc}</div>
        <button
          onclick="window.amfBuyMandat('${m.id}')"
          style="width: 100%; padding: 0.35rem; font-size: 0.82rem; border-radius: 6px; border: 1px solid ${borderColor}; background: ${bgColor}; color: ${borderColor}; cursor: ${owned || !canAfford ? 'not-allowed' : 'pointer'};"
          ${owned || !canAfford ? 'disabled' : ''}>
          ${owned ? '✅ Actif' : `Ratifier (${m.cost} ⚖️)`}
        </button>
      </div>`;
  }).join('');
};

const updateAmfUI = (state) => {
  const amf = state.amf;
  const navAmf = document.getElementById('nav-amf');
  const unlockSection = document.getElementById('amf-unlock-section');
  const rb = state.rebirthCount || 0;

  // Afficher le bouton d'activation si 50 rebirths atteints
  if (rb >= 50 && unlockSection) {
    unlockSection.style.display = 'block';
    const btnActivate = document.getElementById('btn-amf-activate');
    if (btnActivate) {
      if (amf?.active) {
        btnActivate.textContent = '✅ Mode AMF actif';
        btnActivate.disabled = true;
      }
    }
  }

  if (!amf?.active) return;

  // Afficher le tab AMF
  if (navAmf) navAmf.style.display = 'inline-block';

  // Stats
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('val-autorite', formatNumber(amf.autorite || 0));
  setEl('val-influence', formatNumber(amf.influence || 0));
  setEl('val-amf-day', formatNumber(amf.amfDay || 0));
  setEl('val-total-fines', formatMoney(amf.totalFines || 0));

  // Barre de statuts actifs
  const statusBar = document.getElementById('amf-status-bar');
  if (statusBar) {
    const statuses = [];
    if ((amf.gelActifsRemaining || 0) > 0) statuses.push(`🧊 Gel d'Actifs (${amf.gelActifsRemaining}j)`);
    if ((amf.interventionRemaining || 0) > 0) statuses.push(`📈 Intervention Marché (${amf.interventionRemaining}j)`);
    if ((amf.enqueteRemaining || 0) > 0) statuses.push(`🔍 Enquête en cours (${amf.enqueteRemaining}j)`);
    if ((amf.nationalisations || 0) > 0) statuses.push(`🏛️ ${amf.nationalisations} nationalisation(s)`);
    statusBar.innerHTML = statuses.map(s =>
      `<span style="padding: 0.25rem 0.6rem; background: rgba(243,156,18,0.15); border: 1px solid rgba(243,156,18,0.4); border-radius: 20px; font-size: 0.8rem; color: #f39c12;">${s}</span>`
    ).join('');
  }

  renderAmfActions(amf);
  renderAmfMandats(amf);
};

// Fonctions globales pour boutons onclick
window.amfDoAction = async (id) => {
  const res = await window.electronAPI.amfAction(id);
  addLog(`<span style="color:#f39c12">${res.message}</span>`);
  updateUI();
};
window.amfBuyMandat = async (id) => {
  const res = await window.electronAPI.amfBuyMandat(id);
  addLog(`<span style="color:#3498db">${res.message}</span>`);
  updateUI();
};

// Bouton activation AMF
document.getElementById('btn-amf-activate')?.addEventListener('click', async () => {
  const res = await window.electronAPI.amfActivate();
  addLog(`<b style="color:#f39c12">${res.message}</b>`);
  updateUI();
  // Naviguer vers le tab AMF
  if (res.success) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    const navAmf = document.getElementById('nav-amf');
    if (navAmf) { navAmf.classList.add('active'); navAmf.style.display = 'inline-block'; }
    const tabAmf = document.getElementById('tab-amf');
    if (tabAmf) tabAmf.style.display = 'block';
  }
});
