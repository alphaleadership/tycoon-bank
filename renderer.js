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

const renderResearchTree = (state) => {
  const container = document.getElementById('research-tree-container');
  const msgContainer = document.getElementById('endgame-msg-container');
  
  const allDone = Object.keys(state.researchTree)
    .filter(k => !state.researchTree[k].repeatable)
    .every(k => state.unlockedResearches.includes(k));

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
    
    const data = { nodes: researchNodes, edges: researchEdges };
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
          nodeDistance: 200,
          treeSpacing: 300
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
  for (const [id, r] of Object.entries(state.researchTree)) {
    const isUnlocked = state.unlockedResearches.includes(id) && !r.repeatable;
    const hasReq = r.req.every(reqId => state.unlockedResearches.includes(reqId));
    const canAfford = state.researchPoints >= r.cost;
    
    let background = '#2c3e50';
    let border = '#34495e';
    let titleStr = r.desc + '\nStatus: ';
    
    if (isUnlocked) {
      background = '#27ae60'; border = '#2ecc71';
      titleStr += 'Débloqué';
    } else if (hasReq && canAfford) {
      background = '#2980b9'; border = '#3498db';
      titleStr += 'Disponible (Double-cliquez pour rechercher)';
    } else if (hasReq) {
      background = '#8e44ad'; border = '#9b59b6';
      titleStr += 'Fonds insuffisants (' + formatNumber(r.cost) + ' RP)';
    } else {
      background = '#7f8c8d'; border = '#95a5a6';
      titleStr += 'Verrouillé (Prérequis manquants)';
    }
    
    updates.push({ id: id, color: { background: background, border: border }, title: titleStr });
  }
  researchNodes.update(updates);
};

const renderStockMarket = (state) => {
  const container = document.getElementById('stock-list-container');
  container.innerHTML = '';
  
  for (const [symbol, stock] of Object.entries(state.stocks)) {
    const owned = state.portfolio[symbol];
    
    // Calculate trend based on history
    let trend = 0;
    if(stock.history.length > 1) {
      const prev = stock.history[stock.history.length - 2];
      trend = ((stock.price - prev) / prev) * 100;
    }
    
    const trendClass = trend >= 0 ? 'text-success' : 'text-danger';
    const trendSymbol = trend >= 0 ? '▲' : '▼';
    
    const div = document.createElement('div');
    div.className = 'stock-item';
    
    div.innerHTML = `
      <div class="stock-header">
        <div class="stock-name">${stock.name} <span style="font-size:0.8rem; color:var(--text-muted)">(${symbol})</span></div>
        <div class="stock-price-box">
          <div class="stock-price">${formatMoney(stock.price)}</div>
          <div class="stock-trend ${trendClass}">${trendSymbol} ${Math.abs(trend).toFixed(2)}%</div>
        </div>
      </div>
      <div class="stock-portfolio">
        Possédé : <strong>${formatNumber(owned)}</strong> action(s)
      </div>
      <div class="stock-actions">
        <button class="btn btn-buy stock-btn" onclick="window.buyStock('${symbol}', 1)" ${state.money < stock.price ? 'disabled' : ''}>Acheter (1)</button>
        <button class="btn btn-sell stock-btn" onclick="window.sellStock('${symbol}', 1)" ${owned < 1 ? 'disabled' : ''}>Vendre (1)</button>
      </div>
    `;
    container.appendChild(div);
  }
};

window.doResearch = async (id) => {
  const res = await window.electronAPI.unlockResearch(id);
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
  document.getElementById('val-day').textContent = state.day;
  document.getElementById('val-money').textContent = formatMoney(state.money);
  document.getElementById('val-clients').textContent = formatNumber(state.clients);
  document.getElementById('val-employees').textContent = formatNumber(state.employees);
  if (document.getElementById('val-hrmanagers')) {
    document.getElementById('val-hrmanagers').textContent = formatNumber(state.hrManagers || 0);
  }
  document.getElementById('val-loans').innerText = formatMoney(state.loansOut);
  document.getElementById('val-rate').innerText = (state.interestRate * 100).toFixed(1) + '%';
  document.getElementById('val-cb-rate').innerText = (state.centralBankRate * 100).toFixed(1) + '%';
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
  window.electronAPI.openSponsor();
});

// Init
updateUI();

// Auto-advance day every 10 seconds if all researches are completed
setInterval(async () => {
  const state = await window.electronAPI.getState();
  const allDone = Object.keys(state.researchTree)
    .filter(k => !state.researchTree[k].repeatable)
    .every(k => state.unlockedResearches.includes(k));
    
  if (allDone) {
    const res = await window.electronAPI.nextDay();
    if (res && res.message) {
      addLog("<b>⏳ Journée Auto (Endgame)</b><br/>" + res.message);
      updateUI();
    }
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
