const formatMoney = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

const renderResearchTree = (state) => {
  const container = document.getElementById('research-tree-container');
  container.innerHTML = '';
  
  for (const [id, r] of Object.entries(state.researchTree)) {
    const isUnlocked = state.unlockedResearches.includes(id) && !r.repeatable;
    const hasReq = r.req.every(reqId => state.unlockedResearches.includes(reqId));
    
    const div = document.createElement('div');
    div.className = `research-item ${isUnlocked ? 'unlocked' : (hasReq ? 'available' : 'locked')}`;
    
    let btnHtml = '';
    if(isUnlocked) {
      btnHtml = `<span style="color:var(--success); font-size:0.8rem;">Débloqué</span>`;
    } else {
      const canAfford = state.researchPoints >= r.cost;
      btnHtml = `<button class="btn secondary-btn research-btn" ${(!hasReq || !canAfford) ? 'disabled' : ''} onclick="window.doResearch('${id}')">Rechercher (${r.cost} RP)</button>`;
    }

    div.innerHTML = `
      <div class="research-header">
        <span>${r.name}</span>
        ${btnHtml}
      </div>
      <div class="research-desc">${r.desc}</div>
    `;
    container.appendChild(div);
  }
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
          <div class="stock-price">${stock.price.toFixed(2)} €</div>
          <div class="stock-trend ${trendClass}">${trendSymbol} ${Math.abs(trend).toFixed(2)}%</div>
        </div>
      </div>
      <div class="stock-portfolio">
        Possédé : <strong>${owned}</strong> action(s)
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
  document.getElementById('val-clients').textContent = state.clients;
  document.getElementById('val-employees').textContent = state.employees;
  document.getElementById('val-loans').textContent = formatMoney(state.loansOut);
  document.getElementById('val-rate').textContent = (state.interestRate * 100).toFixed(1) + '%';
  document.getElementById('val-cb-rate').textContent = (state.centralBankRate * 100).toFixed(1) + '%';
  document.getElementById('val-marketing').textContent = 'Niv ' + state.marketingLevel;
  
  document.getElementById('val-rp').textContent = state.researchPoints;
  document.getElementById('val-researchers').textContent = state.researchers;
  document.getElementById('btn-fire-researcher').disabled = state.researchers === 0;

  document.getElementById('val-traders').textContent = state.traders;
  document.getElementById('btn-fire-trader').disabled = state.traders === 0;
  
  renderResearchTree(state);
  renderStockMarket(state);
};

const addLog = (message) => {
  const logContainer = document.getElementById('log-container');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `[Jour ${document.getElementById('val-day').textContent}] ${message}`;
  logContainer.prepend(entry);
};

document.getElementById('btn-marketing').addEventListener('click', async () => {
  const res = await window.electronAPI.actionMarketing();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const res = await window.electronAPI.saveGame();
  addLog(res.message);
});

document.getElementById('btn-load').addEventListener('click', async () => {
  const res = await window.electronAPI.loadGame();
  addLog(res.message);
  updateUI();
});

document.getElementById('btn-hire').addEventListener('click', async () => {
  const res = await window.electronAPI.actionHire();
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

// Init
updateUI();
