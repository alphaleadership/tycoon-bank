const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let state = {
  day: 1,
  money: 100000,
  clients: 10,
  employees: 2,
  loansOut: 0,
  interestRate: 0.05,
  marketingLevel: 1
};

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function displayStats() {
  console.log(`=== TYCOON BANCAIRE - Jour ${state.day} ===`);
  console.log(`Argent: ${state.money.toFixed(2)} €`);
  console.log(`Clients: ${state.clients}`);
  console.log(`Employés: ${state.employees}`);
  console.log(`Prêts en cours: ${state.loansOut.toFixed(2)} € (Taux: ${(state.interestRate * 100).toFixed(1)}%)`);
  console.log(`Niveau Marketing: ${state.marketingLevel}`);
  console.log(`================================`);
}

function nextDay() {
  state.day++;
  
  // Expenses
  const salaries = state.employees * 100;
  state.money -= salaries;
  
  // Income from loans
  const interestIncome = state.loansOut * state.interestRate;
  state.money += interestIncome;
  
  // Clients repayment
  const principalRepayment = state.loansOut * 0.1;
  state.money += principalRepayment;
  state.loansOut -= principalRepayment;
  
  // New clients
  const newClients = Math.floor(Math.random() * state.marketingLevel * 5);
  state.clients += newClients;
  
  console.log(`\nFin de la journée. Salaires payés: ${salaries} €. Intérêts perçus: ${interestIncome.toFixed(2)} €.`);
  if (state.money < 0) {
    console.log("Attention ! Vous êtes à découvert !");
  }
}

function askAction() {
  console.log("\nQue voulez-vous faire ?");
  console.log("1. Lancer une campagne marketing (Coût: 5000 €)");
  console.log("2. Embaucher un employé (Coût: 100 € / jour)");
  console.log("3. Accorder des prêts (Montant max selon le nombre de clients)");
  console.log("4. Modifier le taux d'intérêt");
  console.log("5. Passer au jour suivant");
  console.log("0. Quitter");

  rl.question("> ", (answer) => {
    switch(answer) {
      case '1':
        if (state.money >= 5000) {
          state.money -= 5000;
          state.marketingLevel++;
          console.log("\nCampagne marketing lancée ! Niveau marketing augmenté.");
        } else {
          console.log("\nPas assez d'argent pour le marketing.");
        }
        break;
      case '2':
        state.employees++;
        console.log("\nNouvel employé embauché !");
        break;
      case '3':
        const maxLoan = state.clients * 5000;
        if (state.money > 0) {
          const loanAmount = Math.min(state.money, maxLoan);
          state.money -= loanAmount;
          state.loansOut += loanAmount;
          console.log(`\nVous avez accordé pour ${loanAmount.toFixed(2)} € de prêts.`);
        } else {
          console.log("\nVous n'avez pas d'argent à prêter !");
        }
        break;
      case '4':
        rl.question("Nouveau taux d'intérêt (en %, par ex 5 pour 5%): ", (rate) => {
          const r = parseFloat(rate);
          if (!isNaN(r) && r >= 0) {
            state.interestRate = r / 100;
            console.log(`\nTaux mis à jour à ${r}%.`);
          } else {
            console.log("\nTaux invalide.");
          }
          continueGame();
        });
        return; // wait for inner callback
      case '5':
        nextDay();
        break;
      case '0':
        console.log("Merci d'avoir joué !");
        rl.close();
        return;
      default:
        console.log("Option non reconnue.");
    }
    continueGame();
  });
}

function continueGame() {
  console.log("\nAppuyez sur Entrée pour continuer...");
  rl.once('line', () => {
    clearScreen();
    displayStats();
    askAction();
  });
}

clearScreen();
console.log("Bienvenue dans votre Tycoon Bancaire !\n");
displayStats();
askAction();
