const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(ROOT, 'data', 'manual.json');
const CSS_FILE = path.join(ROOT, 'data', 'custom.css');
const WORKSPACES_FILE = path.join(ROOT, 'data', 'workspaces.json');
const EVENT_SURVEY_FILE = path.join(ROOT, 'data', 'event-survey-responses.json');
const EVENT_FUNNEL_FILE = path.join(ROOT, 'data', 'event-survey-funnel-events.json');
const PLAYGROUND_SURVEY_FILE = path.join(ROOT, 'data', 'playground-survey-responses.json');
const PLAYGROUND_FUNNEL_FILE = path.join(ROOT, 'data', 'playground-survey-funnel-events.json');
const PLAYGROUND_RAFFLE_FILE = path.join(ROOT, 'data', 'playground-survey-raffle.json');
const PUBLIC = path.join(ROOT, 'public');

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}

function importManualFromDocx() {
  const source = '/Users/radu/Desktop/Proiecte/Becky/MANUAL.docx';
  if (!fs.existsSync(source)) return { title: 'Becky Friends — Community Playbook', blocks: [] };
  try {
    const { execFileSync } = require('child_process');
    const xml = execFileSync('unzip', ['-p', source, 'word/document.xml'], { encoding: 'utf8' });
    const paragraphs = [];
    for (const paragraph of xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || []) {
      const text = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (!text) continue;
      paragraphs.push({ text, heading: /^(Introducere|Capitolul \d+|Anexă)/i.test(text) });
    }
    const actualStart = paragraphs.findIndex(item => /^Capitolul 1\s*[–-]\s*De ce există Becky\?/i.test(item.text));
    const blocks = [];
    const addBlock = (items, type = 'chapter') => {
      if (!items.length) return;
      const first = items[0];
      const html = items.map(item => item.heading ? `<h2>${escapeHtml(item.text)}</h2>` : `<p>${escapeHtml(item.text)}</p>`).join('\n');
      blocks.push({ id: `block-${String(blocks.length + 1).padStart(3, '0')}`, type, html });
    };
    if (actualStart > 0) addBlock(paragraphs.slice(0, actualStart), 'overview');
    const content = actualStart > 0 ? paragraphs.slice(actualStart) : paragraphs;
    let current = [];
    for (const item of content) {
      if (item.heading && current.length) { addBlock(current); current = []; }
      current.push(item);
    }
    addBlock(current);
    const document = { title: 'Becky Friends — Community Playbook', source: 'MANUAL.docx', importedAt: new Date().toISOString(), blocks };
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(document, null, 2));
    return document;
  } catch (error) {
    console.error('Manual import failed:', error.message);
    return { title: 'Becky Friends — Community Playbook', blocks: [] };
  }
}

function normalizeDocument(document) {
  if (!document || !Array.isArray(document.blocks)) return document;
  return {
    ...document,
    blocks: document.blocks.map(block => {
      if (block.id !== 'block-011' || typeof block.html !== 'string') return block;
      const html = block.html.replace(/<div class="cta">[\s\S]*?(?=<div class="section">\s*<h2>Cum măsurăm succesul<\/h2>)/i, '').replace('<section class="chapter">', '<section class="chapter chapter-website">');
      return html === block.html ? block : { ...block, html };
    })
  };
}

function readDocument() {
  try { if (!fs.existsSync(DATA_FILE)) return importManualFromDocx(); return normalizeDocument(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); }
  catch { return { title: 'Becky Friends — Community Playbook', blocks: [] }; }
}

function readWorkspaces() {
  try { return JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf8')); }
  catch { return { updatedAt: null, workspaces: [] }; }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.includes('json') ? JSON.stringify(body) : body);
}

function readArrayFile(file) {
  if (!fs.existsSync(file)) return [];
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(value)) throw new Error('Invalid local data store');
  return value;
}

function appendArrayFile(file, entry) {
  const values = readArrayFile(file);
  values.push(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(values, null, 2));
}

function readRequestJson(req, res, maxBytes, callback) {
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > maxBytes) req.destroy(); });
  req.on('end', () => {
    try { callback(JSON.parse(raw)); }
    catch { send(res, 400, { error: 'Invalid request' }); }
  });
}

async function generateCarouselArtwork(apiKey, prompt, quality = 'medium', transparent = false) {
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY lipsește din mediul local'), { status: 503 });
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      size: '1024x1024',
      quality,
      output_format: 'webp',
      output_compression: 82,
      ...(transparent ? { background: 'transparent' } : {})
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.data?.[0]?.b64_json) {
    console.error('OpenAI image generation failed', response.status, result.error?.code || result.error?.message || 'unknown');
    const message = response.status === 401 ? 'Cheia OpenAI nu este validă. Configurează OPENAI_API_KEY în .dev.vars.' : response.status === 429 ? 'Limita OpenAI a fost atinsă. Încearcă din nou în câteva momente.' : 'Generarea imaginii nu a reușit';
    throw Object.assign(new Error(message), { status: response.status === 401 ? 503 : response.status === 429 ? 429 : 502 });
  }
  return { image: result.data[0].b64_json, mimeType: 'image/webp', model: 'gpt-image-2' };
}

async function generateCarouselPlan(apiKey, context, brand) {
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY lipsește din mediul local'), { status: 503 });
  const headingPart = { type: 'object', additionalProperties: false, properties: { text: { type: 'string' }, color: { type: 'string', enum: ['teal', 'coral'] }, breakBefore: { type: 'boolean' } }, required: ['text', 'color', 'breakBefore'] };
  const slide = { type: 'object', additionalProperties: false, properties: { heading: { type: 'string' }, body: { type: 'string' }, headingParts: { type: 'array', minItems: 2, maxItems: 2, items: headingPart }, artworkInstruction: { type: 'string' } }, required: ['heading', 'body', 'headingParts', 'artworkInstruction'] };
  const schema = { type: 'object', additionalProperties: false, properties: { slides: { type: 'array', minItems: 5, maxItems: 5, items: slide } }, required: ['slides'] };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: localSecret('OPENAI_TEXT_MODEL') || 'gpt-4.1-mini',
      instructions: 'Creează direct draftul final de text pentru un carousel social media Becky’s Garden în limba română. Obiectiv unic: awareness prin informație de calitate, prezentată matur, profesionist și atractiv. Firul argumentului este obligatoriu: slide 1 identifică problema părintelui și promite concret 3 modalități de ajutor; slide-urile 2–4 sunt trei soluții practice, distincte și aplicabile; slide 5 arată firesc, fără reclamă forțată, cum spațiul Becky aplică exact principiile prezentate. Hook-ul și conținutul trebuie să livreze aceeași promisiune. Dacă slide-urile oferă strategii pentru schimbarea unui comportament, hook-ul formulează scurt comportamentul recognoscibil, de exemplu „Cere ajutor înainte să încerce singur?”, și NU întreabă „De ce...?”, deoarece asta ar promite explicarea cauzelor. Folosește „De ce...?” numai când slide-urile următoare explică efectiv motive sau mecanisme. Headerele slide-urilor 2–4 trebuie să înceapă cu un verb de acțiune adresat părintelui, precum „Oferă”, „Lasă”, „Observă”, „Întreabă” sau „Păstrează”; nu folosi aici adevăruri abstracte precum „Frustrarea face parte din creștere”. Nu vinde agresiv și nu cere utilizatorului alte alegeri. Folosește numai afirmațiile susținute de context; nu inventa studii, cifre sau concluzii. Body-ul copertei trebuie să urmeze forma „3 modalități să-ți ajuți copilul să [rezultat concret legat de problemă]”. Sunt interzise drept hook afirmațiile instituționale și generice precum „Încurajăm răbdarea celor mici”, „Susținem dezvoltarea”, „Copiii învață prin joacă” sau orice formulare care începe cu „La Becky…”, „Încurajăm…”, „Susținem…”, „Promovăm…”. Headerele au 4–10 cuvinte, descrierile maximum 24 de cuvinte. Headerul formulează concluzia slide-ului; descrierea o explică și NU repetă, NU continuă și NU începe cu aceleași cuvinte ca headerul. Fiecare soluție trebuie înțeleasă fără slide-ul anterior. CTA-ul numește principiul aplicat de Becky înainte să invite părintele. Pentru ORICE slide, inclusiv cover și CTA, headingParts conține exact două fragmente semantice: primul este contextul ideii, color teal și breakBefore true; al doilea este sintagma-cheie care poartă concluzia sau schimbă sensul propoziției, color coral și breakBefore false. Cele două fragmente trebuie să recompună exact heading-ul. artworkInstruction descrie un singur simbol sau o singură ilustrație simplă, fără text. Respectă vocea, audiența, vocabularul și CTA-ul din brand.',
      input: JSON.stringify({ context, brand }),
      text: { format: { type: 'json_schema', name: 'becky_carousel_plan', strict: true, schema } }
    })
  });
  const result = await response.json().catch(() => ({}));
  const outputText = result.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!response.ok || !outputText) {
    console.error('OpenAI carousel plan failed', response.status, result.error?.code || result.error?.message || 'unknown');
    throw Object.assign(new Error(response.status === 429 ? 'Limita OpenAI a fost atinsă.' : 'Draftul carouselului nu a putut fi construit.'), { status: response.status === 429 ? 429 : 502 });
  }
  return { plan: JSON.parse(outputText), model: result.model };
}

async function editCarouselSlide(apiKey, instruction, slide) {
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY lipsește din mediul local'), { status: 503 });
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      heading: { type: ['string', 'null'] },
      body: { type: ['string', 'null'] },
      headingParts: { type: ['array', 'null'], items: { type: 'object', additionalProperties: false, properties: { text: { type: 'string' }, color: { type: 'string', enum: ['teal', 'coral'] } }, required: ['text', 'color'] } },
      artworkInstruction: { type: ['string', 'null'] },
      headerOffsetDelta: { type: 'integer', minimum: -80, maximum: 80 },
      artworkOffsetDelta: { type: 'integer', minimum: -160, maximum: 160 },
      decorationOffsetDelta: { type: 'integer', minimum: -120, maximum: 120 },
      decorationMode: { type: 'string', enum: ['keep', 'balanced', 'airy', 'opposite'] }
    },
    required: ['heading', 'body', 'headingParts', 'artworkInstruction', 'headerOffsetDelta', 'artworkOffsetDelta', 'decorationOffsetDelta', 'decorationMode']
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: localSecret('OPENAI_TEXT_MODEL') || 'gpt-4.1-mini',
      instructions: 'Ești editorul de layout pentru un carousel Becky în limba română. Aplică doar schimbările cerute și respectă regulile din currentSlide.brand pentru voce, audiență, vocabular și CTA. Pentru câmpurile de text sau ilustrație necerute întoarce null. Offseturile sunt diferențe în pixeli față de poziția curentă; întoarce 0 dacă nu se cere mutarea. heading trebuie să rămână scurt, clar și de sine stătător. body trebuie să explice relevanța pentru părinte. Fontul Mali, conturul alb, norii și paginația sunt reguli fixe de brand. Dacă utilizatorul indică exact ce parte din header vrea teal sau coral, întoarce headingParts în ordinea afișării, fiecare fragment având textul și culoarea cerută; fiecare fragment devine un rând colorat. Dacă nu cere culori, headingParts trebuie să fie null și aplicația păstrează alternanța implicită teal/coral.',
      input: JSON.stringify({ instruction, currentSlide: slide }),
      text: { format: { type: 'json_schema', name: 'carousel_slide_edit', strict: true, schema } }
    })
  });
  const result = await response.json().catch(() => ({}));
  const outputText = result.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!response.ok || !outputText) {
    console.error('OpenAI slide edit failed', response.status, result.error?.code || result.error?.message || 'unknown');
    throw Object.assign(new Error(response.status === 429 ? 'Limita OpenAI a fost atinsă.' : 'Content Assistant nu a putut interpreta modificarea.'), { status: response.status === 429 ? 429 : 502 });
  }
  return { edit: JSON.parse(outputText), model: result.model };
}

function localSecret(name) {
  try {
    const file = path.join(ROOT, '.dev.vars');
    if (fs.existsSync(file)) {
      const match = fs.readFileSync(file, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
      if (match?.[1]?.trim()) return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {}
  return process.env[name];
}

function serve(res, pathname) {
  const routes = {'/':'/index.html','/admin':'/admin/index.html','/admin/biblioteca-copii':'/admin/children-library.html','/admin/biblioteca-activitati-copii':'/admin/children-library.html','/petreceri':'/petreceri.html','/evenimente':'/evenimente.html','/comunitate':'/comunitate.html','/chestionare':'/chestionare.html','/chestionar-evenimente':'/chestionar-evenimente.html','/chestionar-loc-de-joaca':'/chestionar-loc-de-joaca.html'};
  let decodedPathname;
  try { decodedPathname = decodeURIComponent(pathname); }
  catch { return send(res, 400, { error: 'Invalid path' }); }
  const requested = routes[pathname] || decodedPathname;
  const file = path.normalize(path.join(PUBLIC, requested));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found' });
    const ext = path.extname(file);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
    send(res, 200, data, types[ext] || 'application/octet-stream');
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/runtime') return send(res, 200, {
    runtime: 'node-local',
    authRequired: false,
    testingMode: process.env.NODE_ENV !== 'production'
  });
  if (req.method === 'GET' && url.pathname === '/api/manual') return send(res, 200, readDocument());
  if (req.method === 'GET' && url.pathname === '/api/styles') return send(res, 200, { css: fs.existsSync(CSS_FILE) ? fs.readFileSync(CSS_FILE, 'utf8') : '' });
  if (req.method === 'GET' && url.pathname === '/api/workspaces') return send(res, 200, readWorkspaces());
  if (req.method === 'GET' && url.pathname === '/api/event-survey/results') {
    try {
      const stored = fs.existsSync(EVENT_SURVEY_FILE) ? JSON.parse(fs.readFileSync(EVENT_SURVEY_FILE, 'utf8')) : [];
      const responses = (Array.isArray(stored) ? stored : []).map(row => ({
        id: row.id,
        submitted_at: row.submitted_at || row.submittedAt,
        answers: row.answers || {},
        duels: row.duels || [],
        concept_ranking: row.concept_ranking || row.conceptRanking || [],
        schema_version: row.schema_version || row.schemaVersion || 1
      })).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      return send(res, 200, { responses, generatedAt: new Date().toISOString() });
    } catch { return send(res, 500, { error: 'Survey results unavailable' }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/event-survey/funnel') {
    try {
      const events = fs.existsSync(EVENT_FUNNEL_FILE) ? JSON.parse(fs.readFileSync(EVENT_FUNNEL_FILE, 'utf8')) : [];
      return send(res, 200, { events: Array.isArray(events) ? events : [], generatedAt: new Date().toISOString() });
    } catch { return send(res, 500, { error: 'Survey funnel unavailable' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/event-survey/funnel') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 20_000) req.destroy(); });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw);
        if (!body || typeof body.sessionId !== 'string' || !['open', 'step', 'complete'].includes(body.eventType)) throw new Error('Invalid funnel event');
        const step = Number(body.step);
        if (!Number.isInteger(step) || step < 0 || step > 13) throw new Error('Invalid funnel step');
        const events = fs.existsSync(EVENT_FUNNEL_FILE) ? JSON.parse(fs.readFileSync(EVENT_FUNNEL_FILE, 'utf8')) : [];
        if (!Array.isArray(events)) throw new Error('Invalid funnel store');
        events.push({ id: crypto.randomUUID(), session_id: body.sessionId, event_type: body.eventType, step, section: body.section ?? null, milestone: body.milestone ?? null, duel_index: body.duelIndex ?? null, created_at: new Date().toISOString() });
        fs.mkdirSync(path.dirname(EVENT_FUNNEL_FILE), { recursive: true });
        fs.writeFileSync(EVENT_FUNNEL_FILE, JSON.stringify(events, null, 2));
        send(res, 201, { ok: true });
      } catch { send(res, 400, { error: 'Funnel event invalid' }); }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/event-survey') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 500_000) req.destroy(); });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw);
        if (!body || typeof body.answers !== 'object' || !Array.isArray(body.duels) || !Array.isArray(body.conceptRanking)) throw new Error('Invalid survey response');
        const responses = fs.existsSync(EVENT_SURVEY_FILE) ? JSON.parse(fs.readFileSync(EVENT_SURVEY_FILE, 'utf8')) : [];
        if (!Array.isArray(responses)) throw new Error('Invalid survey store');
        const entry = { id: crypto.randomUUID(), submittedAt: new Date().toISOString(), answers: body.answers, duels: body.duels, conceptRanking: body.conceptRanking, schemaVersion: 2 };
        responses.push(entry);
        fs.mkdirSync(path.dirname(EVENT_SURVEY_FILE), { recursive: true });
        fs.writeFileSync(EVENT_SURVEY_FILE, JSON.stringify(responses, null, 2));
        send(res, 201, { id: entry.id, submittedAt: entry.submittedAt });
      } catch { send(res, 400, { error: 'Survey response invalid' }); }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/playground-survey/results') {
    try {
      const responses = readArrayFile(PLAYGROUND_SURVEY_FILE).map(row => ({ id:row.id, submitted_at:row.submitted_at, answers:row.answers || {}, schema_version:row.schema_version || 1 })).sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      return send(res, 200, { responses, generatedAt:new Date().toISOString() });
    } catch { return send(res, 500, { error:'Playground survey results unavailable' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/playground-survey') {
    readRequestJson(req, res, 250_000, body => {
      if (!body?.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) return send(res, 400, { error:'Survey response invalid' });
      const entry = { id:crypto.randomUUID(), submitted_at:new Date().toISOString(), answers:body.answers, schema_version:1 };
      appendArrayFile(PLAYGROUND_SURVEY_FILE, entry);
      send(res, 201, { id:entry.id, submittedAt:entry.submitted_at });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/playground-survey/funnel') {
    try { return send(res, 200, { events:readArrayFile(PLAYGROUND_FUNNEL_FILE), generatedAt:new Date().toISOString() }); }
    catch { return send(res, 500, { error:'Playground funnel unavailable' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/playground-survey/funnel') {
    readRequestJson(req, res, 20_000, body => {
      const step = Number(body?.step);
      if (typeof body?.sessionId !== 'string' || !['open','step','complete'].includes(body.eventType) || !Number.isInteger(step) || step < 0 || step > 10) return send(res, 400, { error:'Funnel event invalid' });
      appendArrayFile(PLAYGROUND_FUNNEL_FILE, { id:crypto.randomUUID(), session_id:body.sessionId, event_type:body.eventType, step, section:body.section ?? null, created_at:new Date().toISOString() });
      send(res, 201, { ok:true });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/playground-survey/raffle') {
    try { return send(res, 200, { entries:readArrayFile(PLAYGROUND_RAFFLE_FILE), generatedAt:new Date().toISOString() }); }
    catch { return send(res, 500, { error:'Raffle entries unavailable' }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/playground-survey/raffle') {
    readRequestJson(req, res, 20_000, body => {
      const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
      const phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
      if (!firstName || firstName.length > 60 || phone.length < 9 || phone.length > 15 || body.consent !== true) return send(res, 400, { error:'Raffle entry invalid' });
      const drawMonth = `${new Date().toISOString().slice(0,7)}-01`;
      const entries = readArrayFile(PLAYGROUND_RAFFLE_FILE);
      if (!entries.some(entry => entry.phone === phone && entry.draw_month === drawMonth)) {
        entries.push({ id:crypto.randomUUID(), first_name:firstName, phone, draw_month:drawMonth, created_at:new Date().toISOString() });
        fs.mkdirSync(path.dirname(PLAYGROUND_RAFFLE_FILE), { recursive:true });
        fs.writeFileSync(PLAYGROUND_RAFFLE_FILE, JSON.stringify(entries, null, 2));
      }
      send(res, 201, { ok:true });
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/carousel/image') {
    readRequestJson(req, res, 30_000, async body => {
      try {
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        const quality = ['low', 'medium', 'high'].includes(body?.quality) ? body.quality : 'medium';
        if (!prompt || prompt.length > 8_000) return send(res, 400, { error: 'Descrierea imaginii este invalidă' });
        send(res, 200, await generateCarouselArtwork(localSecret('OPENAI_API_KEY'), prompt, quality, body?.transparent === true));
      } catch (error) {
        send(res, error.status || 500, { error: error.message || 'Generarea imaginii nu a reușit' });
      }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/carousel/plan') {
    readRequestJson(req, res, 40_000, async body => {
      try {
        const context = typeof body?.context === 'string' ? body.context.trim() : '';
        if (!context || context.length > 12_000) return send(res, 400, { error: 'Contextul postării este invalid' });
        send(res, 200, await generateCarouselPlan(localSecret('OPENAI_API_KEY'), context, body?.brand || {}));
      } catch (error) {
        send(res, error.status || 500, { error: error.message || 'Draftul carouselului nu a putut fi construit' });
      }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/carousel/edit') {
    readRequestJson(req, res, 30_000, async body => {
      try {
        const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';
        if (!instruction || instruction.length > 2_000 || !body?.slide || typeof body.slide !== 'object') return send(res, 400, { error: 'Instrucțiunea pentru slide este invalidă' });
        send(res, 200, await editCarouselSlide(localSecret('OPENAI_API_KEY'), instruction, body.slide));
      } catch (error) {
        send(res, error.status || 500, { error: error.message || 'Content Assistant nu este disponibil' });
      }
    });
    return;
  }
  if (req.method === 'PUT' && url.pathname === '/api/workspaces') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 12_000_000) req.destroy(); });
    req.on('end', () => {
      try {
        const next = JSON.parse(raw);
        if (!Array.isArray(next.workspaces)) throw new Error('Invalid workspaces');
        next.updatedAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(WORKSPACES_FILE), { recursive: true });
        fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(next, null, 2));
        send(res, 200, next);
      } catch { send(res, 400, { error: 'Workspaces invalid' }); }
    });
    return;
  }
  if (req.method === 'PUT' && url.pathname === '/api/styles') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw);
        if (typeof body.css !== 'string') throw new Error('Invalid CSS');
        fs.mkdirSync(path.dirname(CSS_FILE), { recursive: true });
        fs.writeFileSync(CSS_FILE, body.css);
        send(res, 200, { css: body.css, updatedAt: new Date().toISOString() });
      } catch { send(res, 400, { error: 'CSS invalid' }); }
    });
    return;
  }
  if (req.method === 'PUT' && url.pathname === '/api/manual') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 5_000_000) req.destroy(); });
    req.on('end', () => {
      try {
        const next = JSON.parse(raw);
        if (!Array.isArray(next.blocks)) throw new Error('Invalid document');
        next.updatedAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2));
        send(res, 200, next);
      } catch { send(res, 400, { error: 'Document invalid' }); }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/manual/download') {
    const doc = readDocument();
    const customCss = fs.existsSync(CSS_FILE) ? fs.readFileSync(CSS_FILE, 'utf8') : '';
    const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${doc.title}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mali:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap"><style>body{font:16px 'Nunito',sans-serif;max-width:820px;margin:50px auto;line-height:1.6;color:#243447}h1,h2,h3{font-family:'Mali',sans-serif;font-weight:500;color:#168F9F}.manual-content .chapter-number{font-family:'Nunito',sans-serif;font-weight:700;color:#FB7176}li{margin:.35rem 0}</style><style>${customCss}</style></head><body><main class="manual-content"><h1>${doc.title}</h1>${doc.blocks.map(b => b.html).join('\n')}</main></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': 'attachment; filename="becky-friends-manual.html"' });
    return res.end(html);
  }
  serve(res, url.pathname);
});

server.listen(PORT, () => console.log(`Becky Friends admin running at http://localhost:${PORT}/admin`));
