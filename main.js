const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const formatNumber = (val) => {
  if (!isFinite(val)) return isNaN(val) ? '0' : (val > 0 ? 'Infini' : '-Infini');
  let absVal = Math.abs(val);
  let sign = val < 0 ? '-' : '';
  if (absVal >= 1e66) return sign + (absVal / 1e66).toFixed(2) + ' Uv';
  if (absVal >= 1e63) return sign + (absVal / 1e63).toFixed(2) + ' V';
  if (absVal >= 1e60) return sign + (absVal / 1e60).toFixed(2) + ' Nd';
  if (absVal >= 1e57) return sign + (absVal / 1e57).toFixed(2) + ' Od';
  if (absVal >= 1e54) return sign + (absVal / 1e54).toFixed(2) + ' Spd';
  if (absVal >= 1e51) return sign + (absVal / 1e51).toFixed(2) + ' Sxd';
  if (absVal >= 1e48) return sign + (absVal / 1e48).toFixed(2) + ' Qid';
  if (absVal >= 1e45) return sign + (absVal / 1e45).toFixed(2) + ' Qd';
  if (absVal >= 1e42) return sign + (absVal / 1e42).toFixed(2) + ' Td';
  if (absVal >= 1e39) return sign + (absVal / 1e39).toFixed(2) + ' Dd';
  if (absVal >= 1e36) return sign + (absVal / 1e36).toFixed(2) + ' Ud';
  if (absVal >= 1e33) return sign + (absVal / 1e33).toFixed(2) + ' Dc';
  if (absVal >= 1e30) return sign + (absVal / 1e30).toFixed(2) + ' No';
  if (absVal >= 1e27) return sign + (absVal / 1e27).toFixed(2) + ' Oc';
  if (absVal >= 1e24) return sign + (absVal / 1e24).toFixed(2) + ' Sp';
  if (absVal >= 1e21) return sign + (absVal / 1e21).toFixed(2) + ' Sx';
  if (absVal >= 1e18) return sign + (absVal / 1e18).toFixed(2) + ' Qi';
  if (absVal >= 1e15) return sign + (absVal / 1e15).toFixed(2) + ' Qa';
  if (absVal >= 1e12) return sign + (absVal / 1e12).toFixed(2) + ' T';
  if (absVal >= 1e9) return sign + (absVal / 1e9).toFixed(2) + ' Md';
  if (absVal >= 1e6) return sign + (absVal / 1e6).toFixed(2) + ' M';
  return sign + Math.floor(absVal).toString();
};

const formatMoney = (val) => {
  if (!isFinite(val)) {
    if (isNaN(val)) return '0.00 €';
    return val > 0 ? 'Infini €' : '-Infini €';
  }
  if (Math.abs(val) >= 1e6) return formatNumber(val) + ' €';
  return val.toFixed(2) + ' €';
};

let mainWindow;

const RESEARCH_TREE = {
  'r_marketing': { id: 'r_marketing', name: 'Marketing Ciblé', cost: 10, desc: 'Améliore les campagnes marketing', req: [] },
  'r_risk': { id: 'r_risk', name: 'Analyse des Risques', cost: 20, desc: 'Permet de prêter plus sans risque', req: [] },
  'r_online': { id: 'r_online', name: 'Banque en Ligne', cost: 50, desc: 'Gain passif de clients', req: ['r_marketing'] },
  'r_targeted_ads': { id: 'r_targeted_ads', name: 'Publicités Ciblées', cost: 180, desc: 'Réduit le coût des campagnes marketing de 40%', req: ['r_marketing'] },
  'r_viral_marketing': { id: 'r_viral_marketing', name: 'Marketing Viral', cost: 150, desc: 'Les campagnes marketing rapportent deux fois plus de clients', req: ['r_marketing'] },
  'r_auto_marketing': { id: 'r_auto_marketing', name: 'Marketing Automatisé', cost: 250, desc: 'Lance automatiquement une campagne par jour si les fonds le permettent', req: ['r_viral_marketing'] },
  'r_influencer': { id: 'r_influencer', name: "Sponsoring d'Influenceurs", cost: 350, desc: "Les campagnes ont 20% de chances d'avoir un effet critique (x3 clients)", req: ['r_viral_marketing'] },
  'r_premium': { id: 'r_premium', name: 'Comptes Premium', cost: 200, desc: 'Double les frais de tenue de compte (10 € par client)', req: ['r_online'] },
  'r_lab_equip': { id: 'r_lab_equip', name: 'Équipement de Pointe', cost: 100, desc: 'Les chercheurs produisent 3 RP/jour au lieu de 2', req: [] },
  'r_university': { id: 'r_university', name: 'Partenariat Universitaire', cost: 200, desc: 'Génère 5 RP passivement chaque jour', req: ['r_lab_equip'] },
  'r_grants': { id: 'r_grants', name: 'Subventions', cost: 300, desc: 'Le salaire des chercheurs est réduit de moitié (75€/jour)', req: ['r_university'] },
  'r_hr': { id: 'r_hr', name: 'Département RH & CRM', cost: 180, desc: 'Un employé gère 50 clients. Recrute automatiquement si besoin.', req: ['r_online'] },
  'r_tax_evasion': { id: 'r_tax_evasion', name: 'Optimisation Fiscale', cost: 600, desc: 'Réduit les salaires versés de 20%', req: ['r_hr'] },
  'r_ai': { id: 'r_ai', name: 'Trading IA', cost: 100, desc: 'Rendements journaliers', req: ['r_risk', 'r_online'] },
  'r_ai_research': { id: 'r_ai_research', name: "IA d'Analyse", cost: 500, desc: "Double l'efficacité de tous vos chercheurs", req: ['r_grants', 'r_ai'] },
  'r_subprime': { id: 'r_subprime', name: 'Prêts Subprimes', cost: 400, desc: "Permet d'accorder des prêts encore plus massifs à vos clients", req: ['r_risk'] },
  'r_auto_rate': { id: 'r_auto_rate', name: 'Ajustement Dynamique', cost: 120, desc: "Aligne automatiquement votre taux d'intérêt au maximum toléré", req: ['r_risk'] },
  'r_lobbying': { id: 'r_lobbying', name: 'Lobbying Central', cost: 150, desc: 'Tolère une marge de +5% face au Taux Directeur (au lieu de 3%)', req: ['r_risk'] },
  'r_cb_influence': { id: 'r_cb_influence', name: 'Siège au Conseil Central', cost: 300, desc: 'Biaise les décisions de la Banque Centrale à la baisse', req: ['r_lobbying'] },
  'r_hike_cb': { id: 'r_hike_cb', name: 'Pression Haussière', cost: 100, desc: 'Fait augmenter immédiatement le Taux Directeur (+0.5%). Répétable.', req: ['r_cb_influence'], repeatable: true },
  'r_hft': { id: 'r_hft', name: 'Algorithme HFT', cost: 250, desc: 'Génère 2% de dividendes journaliers sur votre portefeuille', req: ['r_ai'] },
  'r_insider': { id: 'r_insider', name: "Réseau d'Informateurs", cost: 400, desc: 'Protège vos actions en portefeuille des krachs boursiers', req: ['r_hft'] }
  , 'r_eco': { id: 'r_eco', name: 'Banque Écologique', cost: 150, desc: 'Améliore l\'image publique (+2 clients/jour)', req: ['r_online'] }
  , 'r_mobile': { id: 'r_mobile', name: 'Application Mobile', cost: 200, desc: 'Frais de tenue de compte +2€', req: ['r_online'] }
  , 'r_crypto_trade': { id: 'r_crypto_trade', name: 'Trading Crypto Avancé', cost: 300, desc: 'Les traders génèrent 50€ de plus par jour', req: ['r_ai'] }
  , 'r_vip': { id: 'r_vip', name: 'Service VIP', cost: 400, desc: 'Frais de tenue de compte +5€', req: ['r_premium'] }
  , 'r_roboadvisor': { id: 'r_roboadvisor', name: 'Robo-Advisor', cost: 350, desc: 'Génère 1000€/jour passivement', req: ['r_ai'] }
  , 'r_greenbonds': { id: 'r_greenbonds', name: 'Obligations Vertes', cost: 300, desc: 'Génère 500€/jour passivement', req: ['r_eco'] }
  , 'r_loyalty': { id: 'r_loyalty', name: 'Programme de Fidélité', cost: 120, desc: 'Réduit la perte de clients due aux taux de 20%', req: ['r_marketing'] }
  , 'r_datamining': { id: 'r_datamining', name: 'Data Mining', cost: 280, desc: 'Les chercheurs produisent +1 RP', req: ['r_targeted_ads'] }
  , 'r_neuromarketing': { id: 'r_neuromarketing', name: 'Neuromarketing', cost: 500, desc: 'Les campagnes marketing rapportent 50% de clients en plus', req: ['r_viral_marketing', 'r_datamining'] }
  , 'r_hedge': { id: 'r_hedge', name: 'Hedge Fund Interne', cost: 600, desc: 'Revenu des traders +100€/jour', req: ['r_hft'] }
  , 'r_offshore': { id: 'r_offshore', name: 'Comptes Offshore', cost: 800, desc: 'Réduit encore les salaires de 10%', req: ['r_tax_evasion'] }
  , 'r_microcredit': { id: 'r_microcredit', name: 'Micro-crédits', cost: 150, desc: 'Prêts max +2000 par client', req: ['r_risk'] }
  , 'r_gamification': { id: 'r_gamification', name: 'Gamification', cost: 250, desc: 'Attire 5 clients passifs supplémentaires', req: ['r_mobile'] }
  , 'r_blockchain': { id: 'r_blockchain', name: 'Infrastructure Blockchain', cost: 450, desc: 'Frais de tenue +3€', req: ['r_crypto_trade'] }
  , 'r_quant': { id: 'r_quant', name: 'Analyse Quantitative', cost: 500, desc: 'Dividendes HFT +1%', req: ['r_ai_research'] }
  , 'r_flashcrash': { id: 'r_flashcrash', name: 'Protection Flash Crash', cost: 450, desc: 'Réduit les pertes boursières de 50%', req: ['r_insider'] }
  , 'r_bribery': { id: 'r_bribery', name: 'Pots-de-vin', cost: 400, desc: 'Tolère encore +2% d\'écart avec le taux directeur', req: ['r_lobbying'] }
  , 'r_monopoly': { id: 'r_monopoly', name: 'Monopole Régional', cost: 700, desc: 'Les clients ne partent presque plus (-50% de fuite)', req: ['r_cb_influence'] }
  , 'r_quantum': { id: 'r_quantum', name: 'Informatique Quantique', cost: 1000, desc: 'Double la production de RP', req: ['r_quant', 'r_lab_equip'] }
  , 'r_moon': { id: 'r_moon', name: 'Succursale Lunaire', cost: 2000, desc: 'Frais +10€, Prestige interplanétaire', req: ['r_quantum'] }
  , 'r_cloning': { id: 'r_cloning', name: 'Clonage d\'Employés', cost: 1500, desc: 'Les employés gèrent 100 clients', req: ['r_hr', 'r_lab_equip'] }
  , 'r_mindcontrol': { id: 'r_mindcontrol', name: 'Contrôle Mental', cost: 2500, desc: 'Les clients acceptent n\'importe quel taux', req: ['r_neuromarketing', 'r_monopoly'] }
  , 'r_hr_ai': { id: 'r_hr_ai', name: 'Tri IA des CVs', cost: 800, desc: 'Les employés gèrent 20% de clients en plus', req: ['r_hr', 'r_ai'] }
  , 'r_event_forecast': { id: 'r_event_forecast', name: 'Prévision d\'Événements', cost: 1200, desc: 'Augmente la probabilité d\'événements positifs', req: ['r_datamining'] }
  , 'r_corporate_retreat': { id: 'r_corporate_retreat', name: 'Séminaires d\'Entreprise', cost: 2000, desc: 'Divise par deux le taux de fuite des clients en cas d\'événement négatif', req: ['r_loyalty'] }
  , 'r_agressive_trading': { id: 'r_agressive_trading', name: 'Trading Agressif', cost: 600, desc: 'Les traders génèrent 100€ supplémentaires par jour.', req: ['r_ai'] }
  , 'r_global_expansion': { id: 'r_global_expansion', name: 'Expansion Mondiale', cost: 1500, desc: 'Attire massivement 20 clients passifs par jour', req: ['r_monopoly'] }
  , 'r_neural_link': { id: 'r_neural_link', name: 'Interface Neuronale', cost: 3000, desc: 'Les chercheurs produisent +5 RP/jour', req: ['r_quantum'] }
  , 'r_mars': { id: 'r_mars', name: 'Succursale Martienne', cost: 5000, desc: 'Frais de tenue +20€, l\'ultime frontière !', req: ['r_moon'] }
  , 'r_tax_haven': { id: 'r_tax_haven', name: 'Paradis Fiscal Total', cost: 1200, desc: 'Réduit encore les salaires de 15%', req: ['r_offshore'] }
  , 'r_sponsor_esport': { id: 'r_sponsor_esport', name: 'Sponsoring eSport', cost: 400, desc: 'Attire 10 clients passifs par jour', req: ['r_viral_marketing'] }
};

const researchesExt = require('./researches_ext.js');
Object.assign(RESEARCH_TREE, researchesExt);


const STOCKS = {
  'TECH': { name: 'TechCorp', price: 150, volatility: 0.10, history: [150] },
  'INDUS': { name: 'IndusCorp', price: 80, volatility: 0.05, history: [80] },
  'GOLD': { name: 'SafeGold', price: 300, volatility: 0.02, history: [300] },
  'HEALTH': { name: 'PharmaLife', price: 120, volatility: 0.08, history: [120] },
  'AUTO': { name: 'MotorsGen', price: 90, volatility: 0.07, history: [90] },
  'ENERGY': { name: 'EcoPower', price: 60, volatility: 0.06, history: [60] },
  'FOOD': { name: 'TastyFoods', price: 40, volatility: 0.03, history: [40] },
  'REAL': { name: 'PrimeImmo', price: 200, volatility: 0.04, history: [200] },
  'CRYPTO': { name: 'BitCoin', price: 500, volatility: 0.25, history: [500] },
  'AERO': { name: 'SkyTravel', price: 110, volatility: 0.09, history: [110] },
  'MEDIA': { name: 'StreamFlix', price: 130, volatility: 0.12, history: [130] },
  'RETAIL': { name: 'GlobalMart', price: 75, volatility: 0.05, history: [75] },
  'DEFENSE': { name: 'ArmorCorp', price: 180, volatility: 0.04, history: [180] },
  'LUXURY': { name: 'Elegance', price: 250, volatility: 0.06, history: [250] },
  'AI': { name: 'NeuroSys', price: 350, volatility: 0.15, history: [350] }
};

const RANDOM_EVENTS = [
  {
    name: "Influenceur Viral",
    effect: (state) => {
      let gained = Math.floor(state.clients * 0.15) + 20;
      state.clients += gained;
      return `📱 Événement : Un influenceur a parlé de vous ! +${gained} clients massifs.`;
    }
  },
  {
    name: "Contrôle Fiscal",
    effect: (state) => {
      if (state.unlockedResearches.includes('r_tax_evasion')) {
        let fine = Math.floor(state.money * 0.1) + 20000;
        state.money -= fine;
        return `🚨 Événement : Le fisc vous redresse suite à votre optimisation... Amende de ${formatMoney(fine)}.`;
      }
      return "";
    }
  },
  {
    name: "Krach Localisé",
    condition: (state) => Object.values(state.portfolio).some(v => v > 0),
    effect: (state) => {
      for (let s in state.stocks) state.stocks[s].price *= 0.85;
      return `📉 Événement : Panique sur les marchés ! Les actions chutent de 15%.`;
    }
  },
  {
    name: "Don de généreux investisseurs",
    effect: (state) => {
      let amount = Math.floor(Math.max(0, state.money) * 0.05 + 5000);
      state.money += amount;
      return `🎁 Événement : Des investisseurs impressionnés vous offrent ${formatMoney(amount)} !`;
    }
  },
  {
    name: "Amende réglementaire",
    effect: (state) => {
      let amount = Math.floor(Math.max(0, state.money) * 0.02 + 1000);
      state.money -= amount;
      return `⚖️ Événement : Amende de l'autorité des marchés de -${formatMoney(amount)} pour non-conformité.`;
    }
  },
  {
    name: "Scandale financier",
    effect: (state) => {
      let lost = Math.floor(state.clients * 0.1) + 2;
      state.clients -= lost;
      if (state.clients < 0) state.clients = 0;
      return `🗞️ Événement : Scandale dans la presse, vous perdez ${lost} clients !`;
    }
  },
  {
    name: "Article élogieux",
    effect: (state) => {
      let gained = Math.floor(state.clients * 0.05) + 5;
      state.clients += gained;
      return `📰 Événement : Un article élogieux attire ${gained} nouveaux clients !`;
    }
  },
  {
    name: "Fuite d'eau au laboratoire",
    condition: (state) => state.researchers > 0,
    effect: (state) => {
      let lostRP = Math.floor(state.researchPoints * 0.1) + 5;
      if (lostRP > state.researchPoints) lostRP = state.researchPoints;
      state.researchPoints -= lostRP;
      return `💧 Événement : Fuite d'eau au laboratoire, perte de ${lostRP} points de recherche !`;
    }
  },
  {
    name: "Inspiration géniale",
    condition: (state) => state.researchers > 0,
    effect: (state) => {
      let gainedRP = Math.floor(state.researchPoints * 0.1) + 10;
      state.researchPoints += gainedRP;
      return `💡 Événement : Un chercheur a une idée de génie, +${gainedRP} points de recherche !`;
    }
  },
  {
    name: "Panne informatique",
    effect: (state) => {
      let cost = Math.floor(state.employees * 200 + 500);
      state.money -= cost;
      return `💻 Événement : Panne de vos serveurs, la réparation coûte ${formatMoney(cost)}.`;
    }
  },
  {
    name: "Héritage inattendu",
    effect: (state) => {
      state.money += 10000;
      return `📜 Événement : Un client lointain vous a légué 10 000.00 € !`;
    }
  }
  ,{
    name: "Audit Surprise",
    effect: (state) => {
      let cost = Math.floor(Math.max(0, state.money) * 0.03 + 2000);
      state.money -= cost;
      return `🕵️ Événement : Audit surprise, frais de procédure de -${formatMoney(cost)}.`;
    }
  },
  {
    name: "Bourse Favorable",
    condition: (state) => state.traders > 0,
    effect: (state) => {
      let gain = state.traders * 1500;
      state.money += gain;
      return `📈 Événement : Excellente journée en bourse, vos traders rapportent un bonus de +${formatMoney(gain)} !`;
    }
  },
  {
    name: "Grève des transports",
    effect: (state) => {
      let lost = Math.floor(state.clients * 0.03) + 1;
      state.clients -= lost;
      if (state.clients < 0) state.clients = 0;
      return `🚇 Événement : Grève des transports, ${lost} clients ferment leur compte.`;
    }
  },
  {
    name: "Subvention Gouvernementale",
    effect: (state) => {
      state.money += 15000;
      return `🏛️ Événement : L'État vous accorde une subvention exceptionnelle de 15 000.00 €.`;
    }
  },
  {
    name: "Campagne de dénigrement",
    effect: (state) => {
      let lost = Math.floor(state.clients * 0.08) + 3;
      state.clients -= lost;
      if (state.clients < 0) state.clients = 0;
      return `📉 Événement : Un concurrent lance une rumeur sur vous, vous perdez ${lost} clients.`;
    }
  },
  {
    name: "Nouveau Partenariat",
    effect: (state) => {
      let gained = Math.floor(state.clients * 0.1) + 10;
      state.clients += gained;
      return `🤝 Événement : Nouveau partenariat stratégique, +${gained} clients !`;
    }
  },
  {
    name: "Découverte de faille de sécurité",
    effect: (state) => {
      let cost = 10000;
      state.money -= cost;
      return `🔓 Événement : Faille de sécurité critique détectée ! Colmatage en urgence pour -${formatMoney(cost)}.`;
    }
  },
  {
    name: "Revente de matériel obsolète",
    effect: (state) => {
      let gain = 3500;
      state.money += gain;
      return `🖥️ Événement : Vous revendez de vieux serveurs pour ${formatMoney(gain)}.`;
    }
  }

];

let gameState = {
  day: 1,
  money: 100000,
  clients: 10,
  employees: 2,
  hrManagers: 0,
  researchers: 0,
  traders: 0,
  marketers: 0,
  researchPoints: 0,
  loansOut: 0,
  interestRate: 0.05,
  centralBankRate: 0.03,
  marketingLevel: 1,
  autoLoanEnabled: true,
  autoConsumeRPEnabled: true,
  megaMarketing: 0,
  megaLobbying: 0,
  unlockedResearches: [],
  researchTree: RESEARCH_TREE,
  stocks: JSON.parse(JSON.stringify(STOCKS)),
  portfolio: Object.keys(STOCKS).reduce((acc, key) => { acc[key] = 0; return acc; }, {})
};

let currentSlot = '1';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Vérifier les mises à jour et notifier l'utilisateur au lancement
  autoUpdater.checkForUpdatesAndNotify();
  
  // Vérifier régulièrement (toutes les 15 minutes)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 15 * 60 * 1000);

  // Redémarrer l'application automatiquement une fois la mise à jour téléchargée
  autoUpdater.on('update-downloaded', () => {
    try {
      const savePath = path.join(app.getPath('userData'), `tycoon_save_${currentSlot}.json`);
      fs.writeFileSync(savePath, JSON.stringify(gameState));
    } catch (err) {
      console.error("Erreur de sauvegarde avant MAJ:", err);
    }
    autoUpdater.quitAndInstall();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-state', () => {
  return { ...gameState, appVersion: app.getVersion() };
});

ipcMain.handle('check-update', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo && result.updateInfo.version) {
      return { success: true, message: `Mise à jour disponible (${result.updateInfo.version}). Téléchargement en cours...` };
    }
    return { success: true, message: "Vous avez déjà la dernière version." };
  } catch (err) {
    return { success: false, message: "Impossible de vérifier les mises à jour pour le moment." };
  }
});

ipcMain.handle('hard-reset', () => {
  gameState = {
    day: 1,
    money: 100000,
    clients: 10,
    employees: 2,
    researchers: 0,
    traders: 0,
    marketers: 0,
    researchPoints: 0,
    loansOut: 0,
    interestRate: 0.05,
    centralBankRate: 0.03,
    marketingLevel: 1,
    autoLoanEnabled: true,
    autoConsumeRPEnabled: true,
    megaMarketing: 0,
    megaLobbying: 0,
    unlockedResearches: [],
    researchTree: JSON.parse(JSON.stringify(RESEARCH_TREE)),
    stocks: JSON.parse(JSON.stringify(STOCKS)),
    portfolio: Object.keys(STOCKS).reduce((acc, key) => { acc[key] = 0; return acc; }, {})
  };
  return { success: true, message: "La partie a été réinitialisée de zéro !" };
});

ipcMain.handle('open-sponsor', () => {
  shell.openExternal('https://github.com/sponsors/alphaleadership');
});

ipcMain.handle('action-marketing', () => {
  let cost = 500 * gameState.marketingLevel;
  if (gameState.unlockedResearches.includes('r_targeted_ads')) cost *= 0.6;
  
  if (gameState.money >= cost) {
    gameState.money -= cost;
    gameState.marketingLevel++;
    let gained = Math.floor(Math.random() * 20 + 10) * gameState.marketingLevel;
    if (gameState.unlockedResearches.includes('r_viral_marketing')) gained *= 2;
      if (gameState.unlockedResearches.includes('r_neuromarketing')) gained = Math.floor(gained * 1.5);
    if (gameState.unlockedResearches.includes('r_neuromarketing')) gained = Math.floor(gained * 1.5);
    
    let critical = false;
    if (gameState.unlockedResearches.includes('r_influencer') && Math.random() < 0.2) {
      gained *= 3;
      critical = true;
    }
    
    gameState.clients += gained;
    return { success: true, message: `Campagne réussie ! +${gained} clients.${critical ? ' (Coup de Maître !)' : ''}` };
  }
  return { success: false, message: "Fonds insuffisants." };
});

ipcMain.handle('action-hire', () => {
  gameState.employees++;
  return { success: true, message: "Nouvel employé embauché !" };
});

ipcMain.handle('action-hire-hrmanager', () => {
  if (gameState.money >= 1000) {
    gameState.money -= 1000;
    gameState.hrManagers = (gameState.hrManagers || 0) + 1;
    return { success: true, message: "Directeur RH recruté !" };
  }
  return { success: false, message: "Fonds insuffisants (1000 €)." };
});

ipcMain.handle('action-fire-hrmanager', () => {
  if (gameState.hrManagers && gameState.hrManagers > 0) {
    gameState.hrManagers--;
    return { success: true, message: "Directeur RH licencié." };
  }
  return { success: false, message: "Aucun directeur RH à licencier." };
});

ipcMain.handle('action-hire-researcher', () => {
  if (gameState.researchers >= 100) {
    return { success: false, message: "Limite maximale atteinte (100 chercheurs maximum)." };
  }
  gameState.researchers++;
  return { success: true, message: "Chercheur recruté." };
});

ipcMain.handle('action-fire-researcher', () => {
  if (gameState.researchers > 0) {
    gameState.researchers--;
    return { success: true, message: "Chercheur licencié." };
  }
  return { success: false, message: "Aucun chercheur à licencier." };
});

ipcMain.handle('action-hire-trader', () => {
  if (gameState.money >= 5000) {
    gameState.money -= 5000;
    gameState.traders++;
    return { success: true, message: "Vous avez embauché un Trader (Coût: 5000 €, Salaire: 300 €/jour)." };
  }
  return { success: false, message: "Fonds insuffisants (5000 € requis)." };
});

ipcMain.handle('action-fire-trader', () => {
  if (gameState.traders > 0) {
    gameState.traders--;
    return { success: true, message: "Trader licencié." };
  }
  return { success: false, message: "Aucun trader à licencier." };
});

ipcMain.handle('action-hire-marketer', () => {
  if (gameState.money >= 150) {
    gameState.money -= 150;
    gameState.marketers++;
    return { success: true, message: "Marketeur recruté." };
  }
  return { success: false, message: "Fonds insuffisants (150 €)." };
});

ipcMain.handle('action-fire-marketer', () => {
  if (gameState.marketers > 0) {
    gameState.marketers--;
    return { success: true, message: "Marketeur licencié." };
  }
  return { success: false, message: "Aucun marketeur à licencier." };
});

ipcMain.handle('save-game', (event, slot = '1') => {
  currentSlot = slot;
  try {
    const savePath = path.join(app.getPath('userData'), `tycoon_save_${slot}.json`);
    fs.writeFileSync(savePath, JSON.stringify(gameState));
    return { success: true, message: `Partie sauvegardée (Slot ${slot}) !` };
  } catch (err) {
    return { success: false, message: "Erreur lors de la sauvegarde." };
  }
});

ipcMain.handle('load-game', (event, slot = '1') => {
  currentSlot = slot;
  try {
    // Migration: s'il s'agit du slot 1 et qu'il n'existe pas, on tente de charger l'ancien format
    let savePath = path.join(app.getPath('userData'), `tycoon_save_${slot}.json`);
    if (slot === '1' && !fs.existsSync(savePath)) {
      const oldPath = path.join(app.getPath('userData'), 'tycoon_save.json');
      if (fs.existsSync(oldPath)) savePath = oldPath;
    }

    if (fs.existsSync(savePath)) {
      const data = fs.readFileSync(savePath);
      gameState = JSON.parse(data);
      
      // Mises à jour de compatibilité avec les anciennes sauvegardes
      gameState.researchTree = RESEARCH_TREE;
      if (gameState.traders === undefined) gameState.traders = 0;
      if (gameState.marketers === undefined) gameState.marketers = 0;
      if (gameState.marketingLevel === undefined) gameState.marketingLevel = 1;
      
      // Injecter les nouvelles actions si elles n'existent pas dans la sauvegarde
      for (let s in STOCKS) {
        if (gameState.portfolio[s] === undefined) gameState.portfolio[s] = 0;
        if (!gameState.stocks[s]) gameState.stocks[s] = JSON.parse(JSON.stringify(STOCKS[s]));
      }
      
      return { success: true, message: "Partie chargée avec succès !" };
    } else {
      return { success: false, message: "Aucune sauvegarde trouvée." };
    }
  } catch (err) {
    return { success: false, message: "Erreur lors du chargement." };
  }
});

ipcMain.handle('action-loan', () => {
  let maxLoanMultiplier = 5000;
  if (gameState.unlockedResearches.includes('r_subprime')) maxLoanMultiplier = 15000;
  else if (gameState.unlockedResearches.includes('r_risk')) maxLoanMultiplier = 8000;
    if (gameState.unlockedResearches.includes('r_microcredit')) maxLoanMultiplier += 2000;
  if (gameState.unlockedResearches.includes('r_microcredit')) maxLoanMultiplier += 2000;
  
  const maxLoan = gameState.clients * maxLoanMultiplier;
  if (gameState.money > 0) {
    const loanAmount = Math.min(gameState.money, maxLoan);
    gameState.money -= loanAmount;
    gameState.loansOut += loanAmount;
    return { success: true, message: `Vous avez accordé pour ${loanAmount.toFixed(2)} € de prêts.` };
  }
  return { success: false, message: "Pas de liquidités disponibles." };
});

ipcMain.handle('toggle-auto-loan', () => {
  if (gameState.autoLoanEnabled === undefined) gameState.autoLoanEnabled = true;
  gameState.autoLoanEnabled = !gameState.autoLoanEnabled;
  return { success: true, message: `Prêts automatiques : ${gameState.autoLoanEnabled ? 'ON' : 'OFF'}`, status: gameState.autoLoanEnabled };
});

ipcMain.handle('toggle-auto-consume-rp', () => {
  if (gameState.autoConsumeRPEnabled === undefined) gameState.autoConsumeRPEnabled = true;
  gameState.autoConsumeRPEnabled = !gameState.autoConsumeRPEnabled;
  return { success: true, message: `Bonus Scientifique Auto : ${gameState.autoConsumeRPEnabled ? 'ON' : 'OFF'}`, status: gameState.autoConsumeRPEnabled };
});

ipcMain.handle('set-rate', (event, rate) => {
  const r = parseFloat(rate);
  let maxRate = 0.15;
  if (gameState.megaLobbying > 0) maxRate += gameState.megaLobbying * 0.05;
  
  if (!isNaN(r) && r >= 0) {
    if (r / 100 <= maxRate) {
      gameState.interestRate = r / 100;
      return { success: true, message: `Taux mis à jour à ${r}%.` };
    } else {
      return { success: false, message: `Le taux est trop élevé ! L'autorité des marchés bloque à ${(maxRate*100).toFixed(0)}%.` };
    }
  }
  return { success: false, message: "Taux invalide." };
});

ipcMain.handle('unlock-research', (event, id) => {
  const r = RESEARCH_TREE[id];
  if(!r) return { success: false, message: "Recherche introuvable." };
  if(gameState.unlockedResearches.includes(id) && !r.repeatable) return { success: false, message: "Déjà débloqué." };
  
  // Find all missing requirements recursively
  const missing = new Set();
  const getMissing = (nodeId) => {
    const node = RESEARCH_TREE[nodeId];
    if (!node) return;
    for (const req of node.req) {
      if (!gameState.unlockedResearches.includes(req) && !missing.has(req)) {
        getMissing(req);
        missing.add(req);
      }
    }
  };
  getMissing(id);
  
  let totalCost = r.cost;
  for (const mId of missing) {
    totalCost += RESEARCH_TREE[mId].cost;
  }

  let missingRP = totalCost - gameState.researchPoints;
  if (missingRP < 0) missingRP = 0;
  let moneyCost = missingRP * 1000;

  if (gameState.money >= moneyCost) {
    if (moneyCost > 0) {
      gameState.money -= moneyCost;
      gameState.researchPoints += missingRP;
    }
    
    gameState.researchPoints -= totalCost;
    
    // Unlock all missing
    for (const mId of missing) {
      gameState.unlockedResearches.push(mId);
    }
    
    // Unlock target
    if (!r.repeatable) {
      gameState.unlockedResearches.push(id);
    } else {
      if (id === 'r_hike_cb') {
        gameState.centralBankRate += 0.005; // +0.5%
        if (gameState.centralBankRate > 0.15) gameState.centralBankRate = 0.15;
      }
    }
    
    let msgSuffix = moneyCost > 0 ? ` (et ${formatNumber(moneyCost)} € dépensés pour les RP manquants)` : '';
    if (missing.size > 0) {
      return { success: true, message: `Recherche appliquée: ${r.name} (et ${missing.size} prérequis)${msgSuffix}` };
    }
    return { success: true, message: `Recherche appliquée: ${r.name}${msgSuffix}` };
  }
  return { success: false, message: `Pas assez de fonds. Il vous faut ${formatNumber(moneyCost)} € pour compenser les RP manquants.` };
});

ipcMain.handle('unlock-all-research', () => {
  let unlockedCount = 0;
  let totalCost = 0;
  let moneySpent = 0;
  let changed = true;

  const prioSet = new Set();
  const getAncestors = (id) => {
    if (!RESEARCH_TREE[id]) return;
    prioSet.add(id);
    if (RESEARCH_TREE[id].req) {
      for (const req of RESEARCH_TREE[id].req) getAncestors(req);
    }
  };
  getAncestors('r_hr');
  getAncestors('r_auto_rate');

  const entries = Object.entries(RESEARCH_TREE).sort((a, b) => {
    const aPrio = prioSet.has(a[0]) ? 0 : 1;
    const bPrio = prioSet.has(b[0]) ? 0 : 1;
    return aPrio - bPrio;
  });

  while(changed) {
    changed = false;
    for (const [id, r] of entries) {
      if (gameState.unlockedResearches.includes(id)) continue;
      if (r.repeatable) continue;

      const hasReq = r.req.every(reqId => gameState.unlockedResearches.includes(reqId));
      if (hasReq) {
        let missingRP = r.cost - gameState.researchPoints;
        if (missingRP < 0) missingRP = 0;
        let moneyCost = missingRP * 1000;
        
        if (gameState.money >= moneyCost) {
          if (moneyCost > 0) {
            gameState.money -= moneyCost;
            gameState.researchPoints += missingRP;
            moneySpent += moneyCost;
          }
          gameState.researchPoints -= r.cost;
          gameState.unlockedResearches.push(id);
          totalCost += r.cost;
          unlockedCount++;
          changed = true;
        }
      }
    }
  }
  
  if (unlockedCount > 0) {
    let msg = `Vous avez débloqué ${unlockedCount} recherches pour ${formatNumber(totalCost)} RP.`;
    if (moneySpent > 0) msg += ` (${formatNumber(moneySpent)} € utilisés).`;
    return { success: true, message: msg };
  } else {
    return { success: false, message: "Aucune recherche abordable ou disponible." };
  }
});

ipcMain.handle('buy-rp', () => {
  if (gameState.money >= 100000) {
    gameState.money -= 100000;
    gameState.researchPoints += 100;
    return { success: true, message: "Achat de 100 RP réussi (-100k €)." };
  }
  return { success: false, message: "Fonds insuffisants pour acheter des RP (100k € requis)." };
});

ipcMain.handle('sell-rp', () => {
  if (gameState.researchPoints >= 100) {
    gameState.researchPoints -= 100;
    gameState.money += 50000;
    return { success: true, message: "Vente de 100 RP réussie (+50k €)." };
  }
  return { success: false, message: "Vous n'avez pas assez de RP à vendre (100 RP requis)." };
});

ipcMain.handle('sell-all-rp', () => {
  if (gameState.researchPoints > 0) {
    let rpToSell = gameState.researchPoints;
    let earned = rpToSell * 500;
    gameState.researchPoints = 0;
    gameState.money += earned;
    return { success: true, message: `Vente de ${formatNumber(rpToSell)} RP réussie (+${formatMoney(earned)}).` };
  }
  return { success: false, message: "Vous n'avez aucun RP à vendre." };
});

ipcMain.handle('buy-max-rp', () => {
  if (gameState.money >= 1000) {
    let chunks = Math.floor(gameState.money / 1000);
    gameState.money -= chunks * 1000;
    gameState.researchPoints += chunks;
    return { success: true, message: `Achat massif réussi : +${formatNumber(chunks)} RP !` };
  }
  return { success: false, message: "Fonds insuffisants pour acheter ne serait-ce qu'un RP (1 000 € requis)." };
});

ipcMain.handle('buy-mega-marketing', () => {
  if (!gameState.megaMarketing) gameState.megaMarketing = 0;
  let cost = 100000000000 * Math.pow(10, gameState.megaMarketing); // 100 Billions * 10^lvl
  if (gameState.money >= cost) {
    gameState.money -= cost;
    gameState.clients += 1000000;
    gameState.megaMarketing++;
    return { success: true, message: `Campagne Galactique Lancée ! Vous avez touché 1 Million de nouveaux clients (-${formatMoney(cost)}).` };
  }
  return { success: false, message: `Fonds insuffisants. Il vous faut ${formatMoney(cost)}.` };
});

ipcMain.handle('buy-mega-lobbying', () => {
  if (!gameState.megaLobbying) gameState.megaLobbying = 0;
  let cost = 10000000000000 * Math.pow(10, gameState.megaLobbying); // 10 Trillions * 10^lvl
  if (gameState.money >= cost) {
    gameState.money -= cost;
    gameState.megaLobbying++;
    return { success: true, message: `Lobbying Stellaire Réussi ! Taux maximum augmenté de 5% (-${formatMoney(cost)}).` };
  }
  return { success: false, message: `Fonds insuffisants. Il vous faut ${formatMoney(cost)}.` };
});

ipcMain.handle('buy-stock', (event, { symbol, amount }) => {
  const stock = gameState.stocks[symbol];
  if(!stock) return { success: false, message: "Action invalide." };
  const cost = stock.price * amount;
  if(gameState.money >= cost) {
    gameState.money -= cost;
    gameState.portfolio[symbol] += amount;
    return { success: true, message: `Achat de ${amount} x ${stock.name} (-${cost.toFixed(2)} €).` };
  }
  return { success: false, message: "Fonds insuffisants pour cet achat." };
});

ipcMain.handle('sell-stock', (event, { symbol, amount }) => {
  const stock = gameState.stocks[symbol];
  if(!stock) return { success: false, message: "Action invalide." };
  if(gameState.portfolio[symbol] >= amount) {
    const revenue = stock.price * amount;
    gameState.money += revenue;
    gameState.portfolio[symbol] -= amount;
    return { success: true, message: `Vente de ${amount} x ${stock.name} (+${revenue.toFixed(2)} €).` };
  }
  return { success: false, message: "Vous ne possédez pas assez de cette action." };
});

ipcMain.handle('next-day', () => {
  gameState.day++;
  
  // Salaires
  let baseSalaries = (gameState.employees * 100) + ((gameState.hrManagers || 0) * 500) + (gameState.researchers * (gameState.unlockedResearches.includes('r_grants') ? 75 : 150)) + (gameState.traders * 300) + (gameState.marketers * 150);
  let salaries = baseSalaries;
  if (gameState.unlockedResearches.includes('r_tax_evasion')) salaries *= 0.8;
  if (gameState.unlockedResearches.includes('r_offshore')) salaries *= 0.9;
  if (gameState.unlockedResearches.includes('r_tax_haven')) salaries *= 0.85;
  gameState.money -= salaries;
  
  // Frais de tenue de compte
  let feePerClient = gameState.unlockedResearches.includes('r_premium') ? 10 : 5;
  if (gameState.unlockedResearches.includes('r_mobile')) feePerClient += 2;
  if (gameState.unlockedResearches.includes('r_vip')) feePerClient += 5;
  if (gameState.unlockedResearches.includes('r_blockchain')) feePerClient += 3;
  if (gameState.unlockedResearches.includes('r_moon')) feePerClient += 10;
  if (gameState.unlockedResearches.includes('r_mars')) feePerClient += 20;
  const accountFees = gameState.clients * feePerClient;
  gameState.money += accountFees;
  
  const interestIncome = gameState.loansOut * gameState.interestRate;
  gameState.money += interestIncome;
  
  const principalRepayment = gameState.loansOut * 0.1;
  gameState.money += principalRepayment;
  gameState.loansOut -= principalRepayment;
  
  let newClients = Math.floor(Math.random() * gameState.marketingLevel * 5);
  if(gameState.unlockedResearches.includes('r_online')) {
    newClients += 5; // Passive clients
  }
  if(gameState.unlockedResearches.includes('r_eco')) newClients += 2;
  if(gameState.unlockedResearches.includes('r_gamification')) newClients += 5;
  if(gameState.unlockedResearches.includes('r_global_expansion')) newClients += 20;
  if(gameState.unlockedResearches.includes('r_sponsor_esport')) newClients += 10;
  
  let cbMessage = "";
  // Central Bank adjusts rates occasionally
  if (Math.random() < 0.25) { 
    let change = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 10 + 5) / 1000); // +/- 0.5% to 1.5%
    
    // Influence de la recherche r_cb_influence
    if (gameState.unlockedResearches.includes('r_cb_influence')) {
      if (change > 0) change *= 0.5; // Divise par 2 les hausses
      if (change < 0) change *= 1.5; // Multiplie par 1.5 les baisses
    }

    gameState.centralBankRate += change;
    if (gameState.centralBankRate < 0.005) gameState.centralBankRate = 0.005;
    if (gameState.centralBankRate > 0.15) gameState.centralBankRate = 0.15;
    cbMessage += ` 🏦 La Banque Centrale fixe son taux à ${(gameState.centralBankRate*100).toFixed(1)}%.`;
  }

  let maxDiff = gameState.unlockedResearches.includes('r_lobbying') ? 0.05 : 0.03;
  if (gameState.unlockedResearches.includes('r_bribery')) maxDiff += 0.02;
  if (gameState.unlockedResearches.includes('r_mindcontrol')) maxDiff = 0.99;

  if (gameState.unlockedResearches.includes('r_auto_rate')) {
    gameState.interestRate = gameState.centralBankRate + maxDiff;
  }

  // Influence of the rate difference
  let rateDiff = gameState.interestRate - gameState.centralBankRate;

  if (rateDiff > maxDiff + 0.001) {
    let lost = Math.floor(gameState.clients * 0.05) + 1;
    if (gameState.unlockedResearches.includes('r_loyalty')) lost = Math.floor(lost * 0.8);
    if (gameState.unlockedResearches.includes('r_monopoly')) lost = Math.floor(lost * 0.5);
    if (gameState.unlockedResearches.includes('r_mindcontrol')) lost = 0;
    gameState.clients -= lost;
    cbMessage += ` Taux trop élevés : -${lost} clients.`;
  } else if (rateDiff <= 0.001) {
    let gained = Math.floor(Math.random() * 4 + 2);
    newClients += gained;
  }
  
  gameState.clients += newClients;
  if(gameState.clients < 0) gameState.clients = 0;

  // Gestion de la charge de travail et RH
  let employeeEfficiency = gameState.unlockedResearches.includes('r_hr') ? 50 : 30;
  if (gameState.unlockedResearches.includes('r_cloning')) employeeEfficiency = 100;
  if (gameState.unlockedResearches.includes('r_hr_ai')) employeeEfficiency = Math.floor(employeeEfficiency * 1.2);
  employeeEfficiency += (gameState.hrManagers || 0) * 50;
  
  // Auto-recrutement et licenciement si RH débloqué
  if (gameState.unlockedResearches.includes('r_online')) {
    let passiveGained = Math.floor(Math.random() * 5 + 1);
    gameState.clients += passiveGained;
  }
  
  // Marketing automatisé
  if (gameState.unlockedResearches.includes('r_auto_marketing')) {
    let autoCost = 500 * gameState.marketingLevel;
    if (gameState.unlockedResearches.includes('r_targeted_ads')) autoCost *= 0.6;
    if (gameState.money >= autoCost) {
      gameState.money -= autoCost;
      gameState.marketingLevel++;
      let gained = Math.floor(Math.random() * 20 + 10) * gameState.marketingLevel;
      if (gameState.unlockedResearches.includes('r_viral_marketing')) gained *= 2;
      let critical = false;
      if (gameState.unlockedResearches.includes('r_influencer') && Math.random() < 0.2) {
        gained *= 3;
        critical = true;
      }
      gameState.clients += gained;
      cbMessage += ` 📣 Auto-Marketing: +${gained} clients${critical ? ' (Coup de Maître !)' : ''}.`;
    }
  }

  // Action des Marketeurs
  if (gameState.marketers > 0) {
    let gainedMarketers = gameState.marketers * 3;
    if (gameState.unlockedResearches.includes('r_viral_marketing')) gainedMarketers *= 2;
    gameState.clients += gainedMarketers;
    cbMessage += ` 📣 Équipe Marketing: +${gainedMarketers} clients.`;
  }

  if (gameState.unlockedResearches.includes('r_hr')) {
    let requiredEmployees = Math.ceil(gameState.clients / employeeEfficiency);
    if (requiredEmployees < 1) requiredEmployees = 1;

    let hired = 0;
    if (gameState.employees < requiredEmployees) {
      hired = requiredEmployees - gameState.employees;
      gameState.employees = requiredEmployees;
    }

    let fired = 0;
    if (gameState.employees > requiredEmployees) {
      fired = gameState.employees - requiredEmployees;
      gameState.employees = requiredEmployees;
    }
    
    // Gestion auto des Traders (1 trader recommandé par tranche de 50 000 € de capital libre)
    let desiredTraders = Math.floor(gameState.money / 50000);
    if (desiredTraders < 0) desiredTraders = 0;
    
    let hiredTraders = 0;
    if (gameState.traders < desiredTraders) {
      let toHire = desiredTraders - gameState.traders;
      if (gameState.money >= toHire * 5000) {
        gameState.money -= toHire * 5000;
        gameState.traders += toHire;
        cbMessage += ` 📈 RH: ${toHire} Traders embauchés automatiquement.`;
      }
    }
    
    let firedTraders = 0;
    if (gameState.traders > desiredTraders) {
      firedTraders = gameState.traders - desiredTraders;
      gameState.traders = desiredTraders;
    }

    // Gestion auto des Marketeurs (1 marketeur par niveau de marketing)
    let desiredMarketers = gameState.marketingLevel;
    let hiredMarketers = 0;
    if (gameState.marketers < desiredMarketers) {
      let toHire = desiredMarketers - gameState.marketers;
      if (gameState.money >= toHire * 150) {
        gameState.money -= toHire * 150;
        hiredMarketers = toHire;
        gameState.marketers = desiredMarketers;
      }
    }
    let firedMarketers = 0;
    if (gameState.marketers > desiredMarketers) {
      firedMarketers = gameState.marketers - desiredMarketers;
      gameState.marketers = desiredMarketers;
    }

    // Gestion auto des Chercheurs (1 chercheur par 100k €)
    let desiredResearchers = Math.floor(gameState.money / 100000);
    if (desiredResearchers < 0) desiredResearchers = 0;
    if (desiredResearchers > 100) desiredResearchers = 100;
    let hiredResearchers = 0;
    if (gameState.researchers < desiredResearchers) {
      hiredResearchers = desiredResearchers - gameState.researchers;
      gameState.researchers = desiredResearchers;
    }
    let firedResearchers = 0;
    if (gameState.researchers > desiredResearchers) {
      firedResearchers = gameState.researchers - desiredResearchers;
      gameState.researchers = desiredResearchers;
    }

    // Gestion auto des Directeurs RH (1 pour 10 employés, max 5)
    let desiredHr = Math.floor(gameState.employees / 10);
    if (desiredHr > 5) desiredHr = 5;
    let hiredHr = 0;
    if ((gameState.hrManagers || 0) < desiredHr) {
      let toHire = desiredHr - (gameState.hrManagers || 0);
      if (gameState.money >= toHire * 1000) {
        gameState.money -= toHire * 1000;
        hiredHr = toHire;
        gameState.hrManagers = desiredHr;
      }
    }

    if (hired > 0) cbMessage += ` 👔 Auto (${hired} CS).`;
    if (fired > 0) cbMessage += ` 👔 Auto (-${fired} CS).`;
    if (hiredTraders > 0) cbMessage += ` 📈 RH: +${hiredTraders} trader.`;
    if (firedTraders > 0) cbMessage += ` 📈 RH: -${firedTraders} trader.`;
    if (hiredMarketers > 0) cbMessage += ` 📣 RH: +${hiredMarketers} marketeur.`;
    if (firedMarketers > 0) cbMessage += ` 📣 RH: -${firedMarketers} marketeur.`;
    if (hiredResearchers > 0) cbMessage += ` 🔬 RH: +${hiredResearchers} chercheur.`;
    if (firedResearchers > 0) cbMessage += ` 🔬 RH: -${firedResearchers} chercheur.`;
    if (hiredHr > 0) cbMessage += ` 👔 RH: +${hiredHr} directeur RH.`;
  }

  // Distribution automatique de prêts par les employés
  if (gameState.employees > 0 && gameState.money > 0 && gameState.autoLoanEnabled !== false) {
    let maxLoanMultiplier = 5000;
    if (gameState.unlockedResearches.includes('r_subprime')) maxLoanMultiplier = 15000;
    else if (gameState.unlockedResearches.includes('r_risk')) maxLoanMultiplier = 8000;
    
    const maxLoan = gameState.clients * maxLoanMultiplier;
    let currentLoanGap = maxLoan - gameState.loansOut;
    
    if (currentLoanGap > 0) {
      // Un employé peut traiter jusqu'à 25 000 € de dossiers de prêt par jour
      let dailyEmployeeCapacity = gameState.employees * 25000;
      let loanAmount = Math.min(dailyEmployeeCapacity, currentLoanGap, gameState.money);
      if (loanAmount > 10) {
        gameState.money -= loanAmount;
        gameState.loansOut += loanAmount;
        cbMessage += ` 🏦 Prêts automatiques : ${formatMoney(loanAmount)} accordés par les employés.`;
      }
    }
  }

  let maxClientsAllowed = gameState.employees * employeeEfficiency;
  if (gameState.clients > maxClientsAllowed) {
    let overloadedClients = gameState.clients - maxClientsAllowed;
    let leavingClients = Math.ceil(overloadedClients * 0.2);
    gameState.clients -= leavingClients;
    cbMessage += ` 📞 Sous-effectif du support : -${leavingClients} clients partis.`;
  }

  let rpPerResearcher = 2;
  if (gameState.unlockedResearches.includes('r_lab_equip')) rpPerResearcher = 3;
  if (gameState.unlockedResearches.includes('r_ai_research')) rpPerResearcher *= 2;
  if (gameState.unlockedResearches.includes('r_datamining')) rpPerResearcher += 1;
  if (gameState.unlockedResearches.includes('r_neural_link')) rpPerResearcher += 5;
  
  gameState.researchPoints += gameState.researchers * rpPerResearcher;
  if (gameState.unlockedResearches.includes('r_university')) {
    gameState.researchPoints += 5;
  }
  if (gameState.unlockedResearches.includes('r_quantum')) gameState.researchPoints *= 2;
  
  if(gameState.unlockedResearches.includes('r_ai')) {
    gameState.money += 2000; // AI Trading passive income
  }
  if(gameState.unlockedResearches.includes('r_roboadvisor')) gameState.money += 1000;
  if(gameState.unlockedResearches.includes('r_greenbonds')) gameState.money += 500;

  let hftDividends = 0;
  // Stock Market Update
  for (let sym in gameState.stocks) {
    let stock = gameState.stocks[sym];
    let changePercent = (Math.random() * 2 - 1) * stock.volatility;
    
    // Market crash or boom event
    if (Math.random() < 0.05) {
      if (changePercent < 0 && gameState.unlockedResearches.includes('r_insider') && gameState.portfolio[sym] > 0) {
        changePercent = 0; // Protégé du krach
        cbMessage += ` 🛡️ Krach évité sur ${stock.name}.`;
      } else {
        changePercent *= 3;
      }
      if (changePercent < 0 && gameState.unlockedResearches.includes('r_flashcrash')) changePercent *= 0.5;
    } 
    
    let newPrice = stock.price * (1 + changePercent);
    if (newPrice < 1) newPrice = 1;
    
    stock.price = newPrice;
    stock.history.push(newPrice);
    if (stock.history.length > 10) stock.history.shift();

    // Dividendes HFT
    if (gameState.unlockedResearches.includes('r_hft') && gameState.portfolio[sym] > 0) {
      hftDividends += (stock.price * gameState.portfolio[sym]) * (0.02 + (gameState.unlockedResearches.includes('r_quant') ? 0.01 : 0));
    }
  }

  if (hftDividends > 0) {
    gameState.money += hftDividends;
    cbMessage += ` 💰 Dividendes HFT: +${hftDividends.toFixed(2)} €.`;
  }

  let traderMessage = "";
  let traderProfit = gameState.traders * 150;
  if (gameState.unlockedResearches.includes('r_crypto_trade')) traderProfit += gameState.traders * 50;
  if (gameState.unlockedResearches.includes('r_hedge')) traderProfit += gameState.traders * 100; // Revenu de base garanti par trader
  if (gameState.unlockedResearches.includes('r_agressive_trading')) traderProfit += gameState.traders * 100;
  if (gameState.traders > 0) {
    let salesProfit = 0;
    let syms = Object.keys(gameState.stocks);
    let actionsPerStock = Math.floor(gameState.traders / syms.length);
    let leftoverActions = gameState.traders % syms.length;

    for (let sym of syms) {
      let stock = gameState.stocks[sym];
      let trend = 0;
      if (stock.history.length > 1) {
         trend = stock.price - stock.history[stock.history.length - 2];
      }
      
      let actions = actionsPerStock;
      if (leftoverActions > 0) {
        actions++;
        leftoverActions--;
      }
      
      if (actions > 0) {
        if (trend > 0) {
           // Les traders vendent s'ils possèdent l'action
           let sharesToSell = Math.min(actions, gameState.portfolio[sym]);
           if (sharesToSell > 0) {
             gameState.portfolio[sym] -= sharesToSell;
             salesProfit += sharesToSell * stock.price;
           }
        } else if (trend <= 0) {
           // Les traders achètent si les fonds le permettent
           let maxAffordable = Math.floor(gameState.money / stock.price);
           let sharesToBuy = Math.min(actions, maxAffordable);
           if (sharesToBuy > 0) {
             gameState.money -= sharesToBuy * stock.price;
             gameState.portfolio[sym] += sharesToBuy;
           }
        }
      }
    }
    
    traderProfit += salesProfit;
    gameState.money += traderProfit;
    
    if (salesProfit > 0) {
      traderMessage = ` 📈 Traders : +${formatMoney(traderProfit)} (dont ${formatMoney(salesProfit)} de ventes).`;
    } else {
      traderMessage = ` 📈 Traders (Revenu Garanti) : +${formatMoney(traderProfit)}.`;
    }
  }

  // Bonus de rentabilité si toutes les recherches sont terminées
  let allDone = Object.keys(gameState.researchTree).filter(k => !gameState.researchTree[k].repeatable).every(k => gameState.unlockedResearches.includes(k));
  let profitBonus = 0;
  let totalGrossIncome = accountFees + interestIncome + hftDividends + traderProfit;
  let consumedRP = 0;
  
  if (allDone && gameState.researchPoints > 0 && gameState.autoConsumeRPEnabled !== false) {
    let multiplier = Math.log2(1 + gameState.researchPoints) * 0.05; // Échelle logarithmique pour éviter l'explosion
    profitBonus = totalGrossIncome * multiplier;
    gameState.money += profitBonus;
    consumedRP = gameState.researchPoints;
    gameState.researchPoints = 0;
  }
  
  // Hard cap pour éviter le dépassement (Infinity)
  if (gameState.money > 1e66) gameState.money = 1e66;
  if (gameState.clients > 1e66) gameState.clients = 1e66;

  let randomEventMessage = "";
  let eventFinancialImpact = 0;
  if (Math.random() < 0.15) {
    let validEvents = RANDOM_EVENTS.filter(e => !e.condition || e.condition(gameState));
    if (validEvents.length > 0) {
      let event = validEvents[Math.floor(Math.random() * validEvents.length)];
      let moneyBefore = gameState.money;
      randomEventMessage = event.effect(gameState);
      eventFinancialImpact = gameState.money - moneyBefore;
    }
  }

  let totalIncome = totalGrossIncome + profitBonus;
  let totalExpenses = salaries;

  if (eventFinancialImpact > 0) totalIncome += eventFinancialImpact;
  if (eventFinancialImpact < 0) totalExpenses -= eventFinancialImpact;

  let netProfit = totalIncome - totalExpenses;

  let balanceHtml = `<b style="font-size: 1.1em; color: var(--text-color);">Bilan du Jour ${gameState.day - 1}</b><br/>`;
  
  let incomeDetails = `(Frais: ${formatMoney(accountFees)}, Intérêts: ${formatMoney(interestIncome)}, Marchés: ${formatMoney(hftDividends + traderProfit)}`;
  if (eventFinancialImpact > 0) incomeDetails += `, Événement: ${formatMoney(eventFinancialImpact)}`;
  incomeDetails += `)`;
  balanceHtml += `🟢 Entrées : +${formatMoney(totalIncome)} <span style="font-size:0.8rem; color:#aaa;">${incomeDetails}</span><br/>`;
  
  if (profitBonus > 0) {
    let bonusPercent = (Math.log2(1 + consumedRP) * 5).toFixed(1);
    balanceHtml += `✨ <b>Bonus Scientifique (+${bonusPercent}%) : +${formatMoney(profitBonus)}</b><br/>`;
  }
  
  let expenseDetails = `(Salaires: ${formatMoney(salaries)}`;
  if (eventFinancialImpact < 0) expenseDetails += `, Événement: ${formatMoney(-eventFinancialImpact)}`;
  expenseDetails += `)`;
  balanceHtml += `🔴 Sorties : -${formatMoney(totalExpenses)} <span style="font-size:0.8rem; color:#aaa;">${expenseDetails}</span><br/>`;
  
  balanceHtml += `<b style="font-size: 1.05em;">Résultat net : <span style="color:${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${netProfit >= 0 ? '+' : ''}${formatMoney(netProfit)}</span></b>`;
  
  let events = cbMessage;
  if (events !== "") balanceHtml += `<hr style="margin: 6px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.1);"><span style="font-size:0.9rem;">${events}</span>`;
  
  if (randomEventMessage !== "") {
    balanceHtml += `<hr style="margin: 6px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.1);"><div style="padding-top: 4px; font-size:0.9rem; font-weight: bold; color: #ffeb3b;">${randomEventMessage}</div>`;
  }
  
  if (gameState.money < 0) balanceHtml += "<br/><b style='color:var(--danger)'>⚠️ ATTENTION : Votre banque est à découvert !</b>";
  
  return { success: true, message: balanceHtml };
});
