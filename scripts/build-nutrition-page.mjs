import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'data', 'menu-nutrition.json');
const outputPath = path.join(root, 'public', 'ingrediente-alergeni-valori-nutritionale.html');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const categories = ['Pizza', 'Paste', 'Salate', 'Crispy'];
const expectedProducts = [
  ['MARGHERITA', '370.00 g'],
  ['QUATTRO STAGIONI 32cm', '610.00 g'],
  ['PROSCIUTTO 32CM', '485.00 g'],
  ['PROSCIUTTO E FUNGHI 32CM', '560.00 g'],
  ['QUATRO FORMAGI 32CM', '465.00 g'],
  ['PIZZA RUSTICA 32CM', '530.00 g'],
  ['PIZZA POLLO DELICIOUS 32CM', '605.00 g'],
  ['SPAGHETTI CARBONARA', '404.00 g'],
  ['PASTE BOLOGNEZE', '400.00 g'],
  ['SALATA ARISTOCRAT', '355.00 g'],
  ['SALATA TON', '397.00 g'],
  ['SALATA PUI', '377.00 g'],
  ['CRISPY STRIPS', '535.00 g'],
  ['CRISPY WINGS', '536.00 g']
];

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
})[character]);
const categoryId = category => category.toLocaleLowerCase('ro-RO');

function sourceBlocks(source) {
  const markers = [
    { kind: 'nutrition', pattern: /Informatii nutritionale 100g:?/ },
    { kind: 'allergens', pattern: /Alergeni Con(?:ț|t)ine:/ },
    { kind: 'traces', pattern: /Poate contine urme de:/ }
  ];
  const matches = markers
    .map(marker => {
      const match = marker.pattern.exec(source);
      return match ? { ...marker, index: match.index, label: match[0] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
  const blocks = [{ kind: 'ingredients', label: 'Ingrediente', body: source.slice(0, matches[0]?.index ?? source.length), labelFromSource: false }];
  matches.forEach((match, index) => {
    const end = matches[index + 1]?.index ?? source.length;
    blocks.push({ kind: match.kind, label: match.label, body: source.slice(match.index + match.label.length, end), labelFromSource: true });
  });
  const reconstructed = blocks.map(block => `${block.labelFromSource ? block.label : ''}${block.body}`).join('');
  if (reconstructed !== source) throw new Error('Ierarhizarea a modificat textul sursă.');
  return blocks;
}

function validate() {
  if (data.products?.length !== 14) throw new Error(`Sunt necesare exact 14 produse; găsite: ${data.products?.length || 0}.`);
  expectedProducts.forEach(([name, weight], index) => {
    const product = data.products[index];
    if (product?.name !== name || product?.weight !== weight) throw new Error(`Produsul ${index + 1} nu corespunde listei aprobate.`);
  });
  const counts = Object.fromEntries(categories.map(category => [category, data.products.filter(product => product.category === category).length]));
  if (JSON.stringify(counts) !== JSON.stringify({ Pizza: 7, Paste: 2, Salate: 3, Crispy: 2 })) throw new Error('Gruparea produselor nu este 7/2/3/2.');
  const joined = data.products.map(product => product.source).join('\n');
  ['FOCCACIA', 'QUATRO FORMAGI 32CM', 'carbonat acid e amoniu', '(*produs/din produs decongelat)', 'Poate contine urme de:'].forEach(marker => {
    if (!joined.includes(marker) && !data.products.some(product => product.name.includes(marker))) throw new Error(`Lipsește textul obligatoriu: ${marker}`);
  });
}

function renderProduct(product, index) {
  const blocks = sourceBlocks(product.source);
  return `        <details class="nutrition-product" data-product${index === 0 ? ' open' : ''}>
          <summary>
            <span class="product-heading"><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.weight)}</span></span>
            <span class="product-toggle" aria-hidden="true"></span>
          </summary>
          <div class="product-content">
${blocks.map(block => `            <p class="source-block source-${block.kind}"><strong>${escapeHtml(block.label)}</strong><span>${escapeHtml(block.body)}</span></p>`).join('\n')}
          </div>
        </details>`;
}

function renderPage() {
  const sections = categories.map(category => {
    const products = data.products.filter(product => product.category === category);
    return `    <section class="nutrition-category" id="${categoryId(category)}" aria-labelledby="${categoryId(category)}-title">
      <header class="category-heading"><span aria-hidden="true"></span><div><p>${products.length} ${products.length === 1 ? 'produs' : 'produse'}</p><h2 id="${categoryId(category)}-title">${escapeHtml(category)}</h2></div></header>
      <div class="nutrition-list">
${products.map(product => renderProduct(product, data.products.indexOf(product))).join('\n')}
      </div>
    </section>`;
  }).join('\n\n');

  return `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Informații complete despre ingrediente, alergeni și valori nutriționale pentru preparatele Becky’s Garden.">
  <title>Ingrediente, alergeni și valori nutriționale complete | Becky’s Garden</title>
  <link rel="icon" type="image/png" href="/assets/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@500;600;700&family=Nunito+Sans:wght@400;600;700;800;900&display=swap">
  <link rel="stylesheet" href="/ingrediente-alergeni-valori-nutritionale.css?v=20260830-1">
  <link rel="stylesheet" href="/ingrediente-alergeni-valori-nutritionale-hierarchy.css?v=20260830-1">
</head>
<body>
  <header class="nutrition-topbar">
    <a href="/" aria-label="Becky’s Garden — acasă"><img src="/assets/logo/new_logo_horizontal.png" alt="Becky’s Garden"></a>
    <span>Informații meniu</span>
  </header>

  <main>
    <section class="nutrition-hero" aria-labelledby="nutrition-title">
      <p class="nutrition-eyebrow"><span aria-hidden="true">♥</span> Informații complete despre preparate</p>
      <h1 id="nutrition-title">${escapeHtml(data.title)}</h1>
      <p class="nutrition-intro">${escapeHtml(data.intro)}</p>
      <nav class="category-nav" aria-label="Categorii preparate">
${categories.map(category => `        <a href="#${categoryId(category)}">${escapeHtml(category)}</a>`).join('\n')}
      </nav>
    </section>

${sections}
  </main>

  <footer class="nutrition-footer">
    <img src="/assets/heart_little.png" alt="">
    <strong>Becky’s Garden</strong>
    <span>Informații pentru alegeri în cunoștință de cauză.</span>
  </footer>
</body>
</html>
`;
}

validate();
const output = renderPage();
if ((output.match(/data-product/g) || []).length !== 14) throw new Error('HTML-ul nu conține exact 14 produse.');
for (const product of data.products) {
  for (const block of sourceBlocks(product.source)) {
    if (!output.includes(escapeHtml(block.body))) throw new Error(`Textul sursă lipsește din HTML pentru ${product.name}.`);
  }
}

if (process.argv.includes('--check')) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  if (existing !== output) throw new Error('Pagina nutrițională nu este sincronizată cu fișierul de date. Rulează npm run nutrition:build.');
  console.log('Pagina nutrițională: 14 produse verificate, sursa integrală este randată.');
} else {
  fs.writeFileSync(outputPath, output);
  console.log(`Generat ${path.relative(root, outputPath)} cu 14 produse.`);
}
