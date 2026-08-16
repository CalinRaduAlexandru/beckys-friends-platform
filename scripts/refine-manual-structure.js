const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'manual.json');
const document = JSON.parse(fs.readFileSync(file, 'utf8'));

const strategyIndex = document.blocks.findIndex(block => block.id === 'block-001a');
const overviewIndex = document.blocks.findIndex(block => block.id === 'block-001');
if (strategyIndex < 0 || overviewIndex < 0) throw new Error('Strategy or overview block missing');

const [strategy] = document.blocks.splice(strategyIndex, 1);
const currentOverviewIndex = document.blocks.findIndex(block => block.id === 'block-001');
document.blocks.splice(currentOverviewIndex, 0, strategy);

const overview = document.blocks.find(block => block.id === 'block-001');
overview.html = overview.html.replace(
  /<article class="manual-overview-card"><span>(.*?)<\/span><div><h2>(.*?)<\/h2><p>(.*?)<\/p><\/div><\/article>/g,
  (_, oldNumber, rawTitle, description) => {
    const chapter = rawTitle.match(/^Capitolul\s+(\d+)\s*[–-]\s*(.+)$/i);
    const introduction = rawTitle.match(/^Introducere\s*[–-]\s*(.+)$/i);
    const appendix = rawTitle.match(/^Anexă\s*[–-]\s*(.+)$/i);
    const number = chapter ? String(Number(chapter[1])).padStart(2, '0') : introduction ? '00' : appendix ? 'A' : oldNumber;
    const title = chapter ? chapter[2] : introduction ? `Introducere — ${introduction[1]}` : appendix ? appendix[1] : rawTitle;
    return `<article class="manual-overview-card"><h2><span class="manual-overview-number">${number}</span><span class="manual-overview-separator" aria-hidden="true">—</span><span>${title}</span></h2><p>${description}</p></article>`;
  }
);

const vision = document.blocks.find(block => block.id === 'block-014');
if (!vision) throw new Error('Vision chapter missing');
const manifestoPattern = /<section class="manual-section"><h2><span aria-hidden="true">[^<]*<\/span>Manifestul Becky<\/h2><div class="manual-section-body"><ul class="manual-list">([\s\S]*?)<\/ul><\/div><\/section>/;
const manifestoMatch = vision.html.match(manifestoPattern);
const existingAppendix = document.blocks.find(block => block.id === 'block-015');

let manifestoItems = [];
if (manifestoMatch) {
  manifestoItems = [...manifestoMatch[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(match => match[1]);
  vision.html = vision.html.replace(manifestoPattern, '');
} else if (existingAppendix) {
  manifestoItems = [...existingAppendix.html.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map(match => match[1])
    .filter(text => /^Credem|^Și credem/.test(text.replace(/<[^>]+>/g, '').trim()));
}

if (manifestoItems.length !== 4) throw new Error(`Expected 4 manifesto statements, found ${manifestoItems.length}`);

const appendixHtml = `<article class="manual-chapter manual-appendix"><header class="manual-chapter-hero"><div class="chapter-number">ANEXĂ · MANIFEST</div><h1>Manifestul Becky</h1><p class="manual-lead">O declarație care sintetizează filosofia comunității și devine reper pentru felul în care construim fiecare experiență.</p><div class="manual-hero-mark" aria-hidden="true">♡</div></header><div class="manual-manifesto-lines">${manifestoItems.map((item, index) => `<p><span>${String(index + 1).padStart(2, '0')}</span>${item}</p>`).join('')}</div><div class="manual-manifesto-signoff"><span>Joacă cu sens.</span><span>Conexiune autentică.</span><span>Dezvoltare naturală.</span></div></article>`;

const appendix = existingAppendix || { id: 'block-015', type: 'appendix', html: '' };
appendix.type = 'appendix';
appendix.html = appendixHtml;
document.blocks = document.blocks.filter(block => block.id !== 'block-015');
document.blocks.push(appendix);

document.updatedAt = new Date().toISOString();
fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);

const ids = document.blocks.map(block => block.id);
if (ids[0] !== 'block-001a' || ids[1] !== 'block-001' || ids.at(-1) !== 'block-015') throw new Error('Final block order is invalid');
console.log('Manual order, contents layout, and manifesto appendix refined.');
