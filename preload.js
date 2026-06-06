const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getState: () => ipcRenderer.invoke('get-state'),
  actionMarketing: () => ipcRenderer.invoke('action-marketing'),
  saveGame: () => ipcRenderer.invoke('save-game'),
  loadGame: () => ipcRenderer.invoke('load-game'),
  actionHire: () => ipcRenderer.invoke('action-hire'),
  actionHireResearcher: () => ipcRenderer.invoke('action-hire-researcher'),
  actionFireResearcher: () => ipcRenderer.invoke('action-fire-researcher'),
  actionHireTrader: () => ipcRenderer.invoke('action-hire-trader'),
  actionFireTrader: () => ipcRenderer.invoke('action-fire-trader'),
  actionLoan: () => ipcRenderer.invoke('action-loan'),
  setRate: (rate) => ipcRenderer.invoke('set-rate', rate),
  unlockResearch: (id) => ipcRenderer.invoke('unlock-research', id),
  buyStock: (symbol, amount) => ipcRenderer.invoke('buy-stock', { symbol, amount }),
  sellStock: (symbol, amount) => ipcRenderer.invoke('sell-stock', { symbol, amount }),
  nextDay: () => ipcRenderer.invoke('next-day')
});
