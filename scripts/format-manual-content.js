const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'manual.json');
const document = JSON.parse(fs.readFileSync(file, 'utf8'));

const flatChapterIds = new Set([
  'block-002', 'block-003', 'block-004', 'block-005', 'block-006',
  'block-007', 'block-008', 'block-009', 'block-010', 'block-013', 'block-014'
]);

const plain = value => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const entries = html => [...html.matchAll(/<(h2|h3|p)>([\s\S]*?)<\/\1>/g)].map(match => ({ tag: match[1], html: match[2], text: plain(match[2]) }));

function splitChapterTitle(title) {
  const match = title.match(/^Capitolul\s+(\d+)\s*[–-]\s*(.+)$/i);
  return match ? { number: match[1], title: match[2] } : { number: '', title };
}

function sectionGroups(items) {
  const groups = [];
  let current = null;
  for (const item of items) {
    if (item.tag === 'h3') {
      current = { heading: item.html, headingText: item.text, body: [] };
      groups.push(current);
    } else if (item.tag === 'p' && current) {
      current.body.push(item);
    }
  }
  return groups;
}

function flatGroups(items) {
  const groups = [];
  let current = null;
  for (const item of items) {
    if (item.tag === 'p' && isSectionHeading(item.text)) {
      current = { heading: item.html, headingText: item.text, body: [] };
      groups.push(current);
    } else if (item.tag === 'p') {
      if (!current) {
        current = { heading: 'Context', headingText: 'Context', body: [] };
        groups.push(current);
      }
      current.body.push(item);
    }
  }
  return groups;
}

const headings = new Set([
  'Realitatea de astăzi','Problema pe care o rezolvă Becky','O schimbare de perspectivă','Ce este Becky?','Principiile fundamentale','Cum arată succesul','Concluzie','Idei-cheie','Ideile-cheie',
  'Schimbarea de perspectivă','Diferența dintre client și membru','Piramida apartenenței','Psihologia apartenenței','Relațiile sunt produsul','Cum se construiește comunitatea','Exemple','Indicatorul suprem al succesului',
  'De ce există Becky','Misiunea','Viziunea','Valorile comunității','Personalitatea brandului','Cum comunicăm','Promisiunea Becky','Cum se reflectă misiunea în deciziile zilnice',
  'Ce este Becky Friends?','De ce un sistem de apartenență?','Nivelurile Becky Friends','Cum evoluează o familie?','Badge-uri','Invită un prieten','Recunoașterea membrilor','Principii de design','Rezultatul dorit',
  'Ce înseamnă cultura Becky?','Cultura este avantajul competitiv','Valorile trăite zilnic','Limbajul comunității','Ritualuri mici, efect mare','Tradițiile Becky','Contribuția comunității','Rolul membrilor implicați','Cum știm că cultura funcționează?',
  'De ce contează ritualurile?','Diferența dintre un eveniment și un ritual','Ritualurile recurente Becky','Tradiții care construiesc apartenența','Familia Lunii','Copacul Becky','Ritualuri spontane','Calendarul comunității','Cum apar tradițiile noi',
  'De ce este importantă memoria unei comunități?','Becky ca loc al amintirilor','Peretele Comunității','Povestea fiecărui an','Rolul copiilor','Rolul părinților','Memoria digitală','Moștenirea comunității',
  'Spațiul este un facilitator','Zone cu scop clar','Colțul comunității','Masa comunității','Elemente care spun o poveste','Flexibilitate','Experiența de la intrare la ieșire','Spațiul digital',
  'Evenimentele nu sunt scopul','Fiecare eveniment are un obiectiv','Portofoliul Becky','Experiențe, nu spectacole','Integrarea familiilor noi','Continuitatea','Cum măsurăm succesul','După eveniment',
  'De ce măsurăm?','Indicatori de participare','Indicatori ai comunității','Indicatori ai experienței','Indicatori digitali','Indicatori financiari','Revizuire periodică','Succesul pe termen lung',
  'Dincolo de un loc de joacă','O comunitate care crește organic','Becky peste cinci ani','Impact asupra orașului','Dezvoltarea conceptului','Principii care nu se schimbă','Moștenirea Becky','Manifestul Becky'
]);

function isSectionHeading(text) { return headings.has(text); }

function listShape(group) {
  if (/Idei(?:le)?-cheie/i.test(group.headingText)) return { intro: 0, outro: 0, force: true };
  if (group.body.length < 3) return null;
  const first = group.body[0]?.text || '';
  const last = group.body[group.body.length - 1]?.text || '';
  const intro = /:$/.test(first) || /^(Progresul|Fiecare experiență|Familiile implicate|Cultura se construiește|Semnele sunt simple|Evenimentele recurente pot include|Pe lângă participare|Imaginea dorită|Pe termen lung pot apărea|Indiferent cât crește)/i.test(first) ? 1 : 0;
  const outro = last.length > 145 && group.body.length - intro > 2 ? 1 : 0;
  const candidates = group.body.slice(intro, group.body.length - outro || undefined);
  const shortRatio = candidates.filter(item => item.text.length <= 145).length / Math.max(candidates.length, 1);
  return candidates.length >= 3 && shortRatio >= .7 ? { intro, outro, force: false } : null;
}

function renderParagraph(item) {
  const quote = /^([«„]).+([»”])$/.test(item.text);
  if (quote) return `<blockquote class="manual-quote">${item.html}</blockquote>`;
  if (item.text.includes(' → ') && item.text.length < 180) return `<div class="manual-flowline">${item.html}</div>`;
  return `<p>${item.html}</p>`;
}

function renderGroup(group, index) {
  const lower = group.headingText.toLowerCase();
  const conclusion = lower === 'concluzie';
  const takeaways = /idei(?:le)?-cheie/i.test(group.headingText);
  const list = listShape(group);
  const icon = ['✦','♡','◌','→'][index % 4];
  const className = conclusion ? 'manual-conclusion' : takeaways ? 'manual-takeaways' : 'manual-section';
  let body = '';
  if (list) {
    const start = list.intro;
    const end = group.body.length - list.outro;
    if (list.intro) body += renderParagraph(group.body[0]);
    body += `<ul class="manual-list">${group.body.slice(start, end).map(item => `<li>${item.html}</li>`).join('')}</ul>`;
    if (list.outro) body += renderParagraph(group.body[group.body.length - 1]);
  } else {
    body = group.body.map(renderParagraph).join('');
  }
  return `<section class="${className}"><h2><span aria-hidden="true">${icon}</span>${group.heading}</h2><div class="manual-section-body">${body}</div></section>`;
}

function formatFlatChapter(block) {
  const items = entries(block.html);
  const titleEntry = items.find(item => item.tag === 'h2');
  const title = splitChapterTitle(titleEntry.text);
  const groups = flatGroups(items.slice(items.indexOf(titleEntry) + 1));
  const originalParagraphs = items.filter(item => item.tag === 'p').map(item => item.text);
  const html = `<article class="manual-chapter"><header class="manual-chapter-hero"><div class="chapter-number">CAPITOLUL ${String(title.number).padStart(2,'0')}</div><h1>${title.title}</h1><div class="manual-hero-mark" aria-hidden="true">${Number(title.number) % 2 ? '♡' : '✦'}</div></header><div class="manual-chapter-body">${groups.map(renderGroup).join('')}</div></article>`;
  for (const paragraph of originalParagraphs) {
    if (!plain(html).includes(paragraph)) throw new Error(`${block.id}: paragraph lost: ${paragraph}`);
  }
  return html;
}

function formatStrategy(block) {
  const items = entries(block.html);
  const title = items.find(item => item.tag === 'h2');
  const status = items[items.indexOf(title) + 1];
  const groups = sectionGroups(items.slice(items.indexOf(status) + 1));
  const originalParagraphs = items.filter(item => item.tag === 'p').map(item => item.text);
  const html = `<article class="manual-chapter manual-strategy"><header class="manual-chapter-hero"><div class="chapter-number">DIRECȚIE STRATEGICĂ · 04 AUGUST 2026</div><h1>${title.html}</h1><p class="manual-lead">${status.html}</p><div class="manual-hero-mark" aria-hidden="true">✦</div></header><div class="manual-chapter-body manual-strategy-grid">${groups.map(renderGroup).join('')}</div></article>`;
  for (const paragraph of originalParagraphs) {
    if (!plain(html).includes(paragraph)) throw new Error(`${block.id}: paragraph lost: ${paragraph}`);
  }
  return html;
}

function formatOverview(block) {
  const items = entries(block.html);
  const intro = items.filter(item => item.tag === 'p').slice(0, 2);
  const cards = [];
  for (let index = 2; index < items.length; index += 2) {
    const heading = items[index];
    const description = items[index + 1];
    if (!heading || heading.tag !== 'h2' || !description) continue;
    const chapter = heading.text.match(/^Capitolul\s+(\d+)/i);
    const introduction = heading.text.match(/^Introducere\s*[–-]\s*(.+)$/i);
    const appendix = heading.text.match(/^Anexă\s*[–-]\s*(.+)$/i);
    const number = chapter ? String(Number(chapter[1])).padStart(2,'0') : introduction ? '00' : appendix ? 'A' : '✦';
    const title = chapter ? heading.html.replace(/^Capitolul\s+\d+\s*[–-]\s*/i,'') : introduction ? `Introducere — ${introduction[1]}` : appendix ? appendix[1] : heading.html;
    cards.push(`<article class="manual-overview-card"><h2><span class="manual-overview-number">${number}</span><span class="manual-overview-separator" aria-hidden="true">—</span><span>${title}</span></h2><p>${description.html}</p></article>`);
  }
  return `<section class="manual-overview"><header class="manual-cover"><div class="chapter-number">DOCUMENT VIU · BECKY FRIENDS</div><h1>${intro[0].html}</h1><p>${intro[1].html}</p><div class="manual-cover-note"><strong>Joacă cu sens.</strong><span>Conexiune autentică. Dezvoltare naturală.</span></div></header><div class="manual-overview-grid">${cards.join('')}</div></section>`;
}

for (const block of document.blocks) {
  if (/class="manual-(?:chapter|overview)/.test(block.html)) continue;
  if (block.id === 'block-001') block.html = formatOverview(block);
  else if (block.id === 'block-001a') block.html = formatStrategy(block);
  else if (flatChapterIds.has(block.id)) block.html = formatFlatChapter(block);
}

document.updatedAt = new Date().toISOString();
fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Formatted ${flatChapterIds.size + 2} manual blocks; ${document.blocks.length} total blocks.`);
