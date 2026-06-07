const fs = require('fs');

const branches = [
  { prefix: 'r_tech_', name: 'Tech', req: 'r_quantum', baseCost: 1500, count: 30, flavor: ["Réseau de Neurones", "IA Forte", "Singularité", "Nano-robots", "Dyson Sphere", "Matriochka Brain", "Vitesse Lumière", "Téléportation", "Réalité Simulée"] },
  { prefix: 'r_bio_', name: 'Bio', req: 'r_cloning', baseCost: 1500, count: 30, flavor: ["Modification Génétique", "Immortalité", "Transhumanisme", "Conscience Téléchargée", "Amélioration Cognitive", "Espérance de vie +100", "Photosynthèse Humaine", "Régénération Cellulaire"] },
  { prefix: 'r_cosmic_', name: 'Cosmic', req: 'r_mars', baseCost: 5500, count: 30, flavor: ["Base Astéroïde", "Terraformation", "Colonie Alpha Centauri", "Extraction de Matière Noire", "Trous de Ver", "Commerce Intergalactique", "Empire Galactique", "Ascension Dimensionnelle"] },
  { prefix: 'r_finance_', name: 'Finance', req: 'r_tax_haven', baseCost: 1500, count: 30, flavor: ["Monnaie Universelle", "Capitalisme Absolu", "Optimisation Quantique", "Asservissement par la Dette", "Achat de Planètes", "Monopole de l'Univers", "Hyper-inflation Maîtrisée"] }
];

let out = `module.exports = {\n`;

for (let b of branches) {
  let prevReq = b.req;
  for (let i = 1; i <= b.count; i++) {
    let id = `${b.prefix}${i}`;
    let cost = b.baseCost + (i * i * 300);
    let title = b.flavor[(i - 1) % b.flavor.length] + (i > b.flavor.length ? ` Mk${Math.ceil(i/b.flavor.length)}` : '');
    let desc = `Avancée majeure en ${b.name}.`;
    
    out += `  '${id}': { id: '${id}', name: "${title}", cost: ${cost}, desc: "${desc}", req: ['${prevReq}'] },\n`;
    prevReq = id;
  }
}

out += `};\n`;

fs.writeFileSync('researches_ext.js', out);
console.log('Generated 120 researches in researches_ext.js');
