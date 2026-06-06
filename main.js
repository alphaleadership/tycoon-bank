const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

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
};

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
];

let gameState = {
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
  unlockedResearches: [],
  researchTree: RESEARCH_TREE,
  stocks: JSON.parse(JSON.stringify(STOCKS)),
  portfolio: Object.keys(STOCKS).reduce((acc, key) => { acc[key] = 0; return acc; }, {})
};

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
      const savePath = path.join(app.getPath('userData'), 'tycoon_save.json');
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
ipcMain.handle('get-state', () => gameState);

ipcMain.handle('action-marketing', () => {
  let cost = 500 * gameState.marketingLevel;
  if (gameState.unlockedResearches.includes('r_targeted_ads')) cost *= 0.6;
  
  if (gameState.money >= cost) {
    gameState.money -= cost;
    gameState.marketingLevel++;
    let gained = Math.floor(Math.random() * 20 + 10) * gameState.marketingLevel;
    if (gameState.unlockedResearches.includes('r_viral_marketing')) gained *= 2;
    
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

ipcMain.handle('action-hire-researcher', () => {
  gameState.researchers++;
  return { success: true, message: "Chercheur embauché !" };
});

ipcMain.handle('action-fire-researcher', () => {
  if (gameState.researchers > 0) {
    gameState.researchers--;
    return { success: true, message: "Chercheur licencié." };
  }
  return { success: false, message: "Aucun chercheur à licencier." };
});

ipcMain.handle('action-hire-trader', () => {
  if (gameState.money >= 300) {
    gameState.money -= 300;
    gameState.traders++;
    return { success: true, message: "Trader recruté." };
  }
  return { success: false, message: "Fonds insuffisants (300 €)." };
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

ipcMain.handle('save-game', () => {
  try {
    const savePath = path.join(app.getPath('userData'), 'tycoon_save.json');
    fs.writeFileSync(savePath, JSON.stringify(gameState));
    return { success: true, message: "Partie sauvegardée !" };
  } catch (err) {
    return { success: false, message: "Erreur lors de la sauvegarde." };
  }
});

ipcMain.handle('load-game', () => {
  try {
    const savePath = path.join(app.getPath('userData'), 'tycoon_save.json');
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
  
  const maxLoan = gameState.clients * maxLoanMultiplier;
  if (gameState.money > 0) {
    const loanAmount = Math.min(gameState.money, maxLoan);
    gameState.money -= loanAmount;
    gameState.loansOut += loanAmount;
    return { success: true, message: `Vous avez accordé pour ${loanAmount.toFixed(2)} € de prêts.` };
  }
  return { success: false, message: "Pas de liquidités disponibles." };
});

ipcMain.handle('set-rate', (event, rate) => {
  const r = parseFloat(rate);
  if (!isNaN(r) && r >= 0) {
    gameState.interestRate = r / 100;
    return { success: true, message: `Taux mis à jour à ${r}%.` };
  }
  return { success: false, message: "Taux invalide." };
});

ipcMain.handle('unlock-research', (event, id) => {
  const r = RESEARCH_TREE[id];
  if(!r) return { success: false, message: "Recherche introuvable." };
  if(gameState.unlockedResearches.includes(id) && !r.repeatable) return { success: false, message: "Déjà débloqué." };
  if(gameState.researchPoints >= r.cost) {
    const hasReq = r.req.every(reqId => gameState.unlockedResearches.includes(reqId));
    if(hasReq) {
      gameState.researchPoints -= r.cost;
      if (!r.repeatable) {
        gameState.unlockedResearches.push(id);
      } else {
        if (id === 'r_hike_cb') {
          gameState.centralBankRate += 0.005; // +0.5%
          if (gameState.centralBankRate > 0.15) gameState.centralBankRate = 0.15;
        }
      }
      return { success: true, message: `Recherche appliquée: ${r.name}` };
    } else {
      return { success: false, message: "Prérequis manquants." };
    }
  }
  return { success: false, message: "Pas assez de points." };
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
  let baseSalaries = (gameState.employees * 100) + (gameState.researchers * (gameState.unlockedResearches.includes('r_grants') ? 75 : 150)) + (gameState.traders * 300) + (gameState.marketers * 150);
  let salaries = baseSalaries;
  if (gameState.unlockedResearches.includes('r_tax_evasion')) salaries *= 0.8;
  gameState.money -= salaries;
  
  // Frais de tenue de compte
  const feePerClient = gameState.unlockedResearches.includes('r_premium') ? 10 : 5;
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
  
  if (gameState.unlockedResearches.includes('r_auto_rate')) {
    gameState.interestRate = gameState.centralBankRate + maxDiff;
  }

  // Influence of the rate difference
  let rateDiff = gameState.interestRate - gameState.centralBankRate;
  // Ajout d'une tolérance de 0.001 pour éviter les erreurs de flottants (ex: 0.050000001 > 0.05)
  if (rateDiff > maxDiff + 0.001) {
    let lost = Math.floor(gameState.clients * 0.05) + 1;
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
      hiredTraders = desiredTraders - gameState.traders;
      gameState.traders = desiredTraders;
    }
    
    let firedTraders = 0;
    if (gameState.traders > desiredTraders) {
      firedTraders = gameState.traders - desiredTraders;
      gameState.traders = desiredTraders;
    }

    if (hired > 0) cbMessage += ` 👔 Recrutement auto (${hired} employé${hired>1?'s':''}).`;
    if (fired > 0) cbMessage += ` 👔 Licenciement auto (${fired} employé${fired>1?'s':''}).`;
    if (hiredTraders > 0) cbMessage += ` 📈 RH: Embauche de ${hiredTraders} trader(s).`;
    if (firedTraders > 0) cbMessage += ` 📈 RH: Licenciement de ${firedTraders} trader(s).`;
  }

  // Distribution automatique de prêts par les employés
  if (gameState.employees > 0 && gameState.money > 0) {
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
  
  gameState.researchPoints += gameState.researchers * rpPerResearcher;
  if (gameState.unlockedResearches.includes('r_university')) {
    gameState.researchPoints += 5;
  }
  
  if(gameState.unlockedResearches.includes('r_ai')) {
    gameState.money += 2000; // AI Trading passive income
  }

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
    } 
    
    let newPrice = stock.price * (1 + changePercent);
    if (newPrice < 1) newPrice = 1;
    
    stock.price = newPrice;
    stock.history.push(newPrice);
    if (stock.history.length > 10) stock.history.shift();

    // Dividendes HFT
    if (gameState.unlockedResearches.includes('r_hft') && gameState.portfolio[sym] > 0) {
      hftDividends += (stock.price * gameState.portfolio[sym]) * 0.02;
    }
  }

  if (hftDividends > 0) {
    gameState.money += hftDividends;
    cbMessage += ` 💰 Dividendes HFT: +${hftDividends.toFixed(2)} €.`;
  }

  let traderMessage = "";
  let traderProfit = gameState.traders * 150; // Revenu de base garanti par trader
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
  
  if (allDone) {
    let multiplier = gameState.researchPoints * 0.001; // +0.1% de rentabilité par RP
    profitBonus = totalGrossIncome * multiplier;
    gameState.money += profitBonus;
  }

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
  
  if (profitBonus > 0) balanceHtml += `✨ <b>Bonus Scientifique (+${(gameState.researchPoints * 0.1).toFixed(1)}%) : +${formatMoney(profitBonus)}</b><br/>`;
  
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
