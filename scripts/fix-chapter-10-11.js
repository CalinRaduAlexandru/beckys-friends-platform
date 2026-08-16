const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'manual.json');
const document = JSON.parse(fs.readFileSync(file, 'utf8'));
const chapter10 = document.blocks[10];
const chapter11 = document.blocks[11];

if (!chapter10 || !chapter11) throw new Error('Capitolele 10 și 11 nu există în structura curentă.');

const websiteContent = chapter11.html
  .replace(/CAPITOLUL\s+11/gi, 'CAPITOLUL 10')
  .replace(/Capitolul\s+11/gi, 'Capitolul 10');

chapter10.html = websiteContent;
chapter10.type = 'chapter';
chapter11.html = '<h2>Capitolul 11 – Planul de implementare</h2>\n<p>Plan de acțiune pe 90 de zile, 6 luni și 12 luni, prioritizare și experimente.</p>';
chapter11.type = 'chapter';
document.updatedAt = new Date().toISOString();

fs.writeFileSync(file, JSON.stringify(document, null, 2));
console.log('Capitolele 10 și 11 au fost reparate.');
