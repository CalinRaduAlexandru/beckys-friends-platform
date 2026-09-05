const root = document.getElementById('parents-app');
const SESSION_KEY = 'becky-parents-session';
const EVENTS_KEY = 'becky-parents-events:v2';
const CONVERSATION_KEY = 'becky-parents-conversation:v1';
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let activities = [];
let active = null;
let recognition = null;
let listening = false;
let speaking = false;
let runToken = 0;
const sessionId = sessionStorage.getItem(SESSION_KEY) || crypto.randomUUID();
sessionStorage.setItem(SESSION_KEY, sessionId);

const saved = readJson(CONVERSATION_KEY, {});
const conversation = {
  stage: saved.stage || 'welcome',
  preference: saved.preference || null,
  relationship: saved.relationship || null,
  rejectedIds: Array.isArray(saved.rejectedIds) ? saved.rejectedIds : [],
  proposedId: saved.proposedId || null,
  transcript: '',
  status: 'Pregătită să vă asculte'
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
}

function persistConversation() {
  localStorage.setItem(CONVERSATION_KEY, JSON.stringify({
    stage: conversation.stage,
    preference: conversation.preference,
    relationship: conversation.relationship,
    rejectedIds: conversation.rejectedIds.slice(-12),
    proposedId: conversation.proposedId
  }));
}

function track(eventName, extra = {}) {
  const item = {
    surface: 'parents', session_id: sessionId, event_name: eventName,
    experience_id: active?.id || conversation.proposedId || null,
    occurred_at: new Date().toISOString(), app_version: 'parents-voice-1', ...extra
  };
  const queue = readJson(EVENTS_KEY, []);
  queue.push(item);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(queue.slice(-150)));
}

function controlsMarkup() {
  if (speaking) return '<div class="voice-state">● Vocea este activă</div>';
  if (listening) return '<button class="voice-state is-live" type="button" data-stop-listening>● Ascult acum</button>';
  const buttons = conversation.stage === 'confirm'
    ? '<button type="button" data-answer="da">Da</button><button type="button" data-answer="nu">Nu</button>'
    : conversation.stage === 'warmup'
      ? '<button type="button" data-answer="gata">Am terminat</button>'
      : conversation.stage === 'relationship'
        ? '<button type="button" data-answer="prieteni">Ne cunoaștem bine</button><button type="button" data-answer="grup nou">Suntem un grup mai nou</button>'
    : conversation.stage === 'activity'
      ? '<button type="button" data-answer="alta">Altă idee</button><button type="button" data-answer="repeta">Repetă</button>'
      : '<button type="button" data-answer="continuă">Continuă</button>';
  return `<div class="voice-fallback"><button class="mic-again" type="button" data-listen>Vorbește cu Becky</button><div>${buttons}</div></div>`;
}

function voiceMarkup({ locked = false } = {}) {
  const proposed = activities.find(item => item.id === conversation.proposedId);
  return `
    <div class="parents-shell voice-shell">
      <header class="parents-top">
        <span class="brand">BECKY · TIMP PENTRU VOI</span>
        <button class="reset" type="button" data-reset>Începeți de la zero</button>
      </header>
      <section class="voice-stage ${listening ? 'is-listening' : ''} ${speaking ? 'is-speaking' : ''}">
        <span class="eyebrow">GAZDA VOASTRĂ VOCALĂ</span>
        <div class="voice-orb" aria-hidden="true"><i></i><i></i><i></i></div>
        <h1>${locked ? (conversation.stage === 'welcome' ? 'Bun venit.' : 'Continuăm?') : esc(conversation.status)}</h1>
        <p class="voice-caption">${locked
          ? 'O singură atingere pornește vocea și microfonul.'
          : listening ? 'Vorbiți natural. Becky vă ascultă.'
          : speaking ? 'Becky vorbește…'
          : esc(conversation.transcript || 'Vă ajut să găsiți ceva potrivit pentru momentul acesta.')}</p>
        ${proposed && conversation.stage === 'confirm' ? `<article class="voice-suggestion"><small>${esc(proposed.category)} · ${esc(proposed.duration)}</small><strong>${esc(proposed.title)}</strong></article>` : ''}
        ${locked ? '<button class="unlock-voice" type="button" data-unlock>Deblochează conversația</button>' : controlsMarkup()}
        <button class="manual-link" type="button" data-manual>Prefer să aleg de pe ecran</button>
      </section>
    </div>`;
}

function renderVoice(options = {}) {
  root.innerHTML = voiceMarkup(options);
  root.querySelector('[data-reset]')?.addEventListener('click', resetConversation);
  root.querySelector('[data-unlock]')?.addEventListener('click', unlockConversation);
  root.querySelector('[data-listen]')?.addEventListener('click', listen);
  root.querySelector('[data-stop-listening]')?.addEventListener('click', stopListening);
  root.querySelector('[data-manual]')?.addEventListener('click', renderLibrary);
  root.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => handleAnswer(button.dataset.answer)));
}

async function unlockConversation() {
  track('voice_unlocked', { resumed_stage: conversation.stage });
  renderVoice();
  if (conversation.stage === 'confirm' && conversation.proposedId) {
    const item = activities.find(value => value.id === conversation.proposedId);
    if (item) return sayAndListen(`Bine ați revenit. Rămăsesem la ${item.title}. V-ar plăcea să încercați?`);
  }
  if (conversation.stage === 'activity' && conversation.proposedId) {
    const item = activities.find(value => value.id === conversation.proposedId);
    if (item) return explainActivity(item, true);
  }
  if (conversation.stage === 'refine') {
    const item = activities.find(value => value.id === conversation.proposedId);
    return sayAndListen(`Rămăsesem la alegerea unei variante mai potrivite. ${rejectionQuestion(item)}`);
  }
  if (conversation.stage === 'warmup') return beginWarmup(true);
  if (conversation.stage === 'relationship') return askRelationship();
  return beginWarmup();
}

async function beginWarmup(resumed = false) {
  conversation.stage = 'warmup';
  persistConversation();
  track('warmup_started', { resumed });
  return sayAndListen(`${resumed ? 'Bine ați revenit. ' : 'Bun venit! Eu sunt Becky. Nu trebuie să alegeți nimic încă. '}Începem foarte simplu. Pe rând, fiecare spune un lucru mic care l-a făcut să zâmbească astăzi. Fără explicații lungi și fără răspunsuri perfecte. Când ați terminat, spuneți doar: gata.`);
}

async function askRelationship() {
  conversation.stage = 'relationship';
  persistConversation();
  return sayAndListen('Perfect. Ca să aleg ceva potrivit pentru voi, am nevoie de un singur indiciu. Vă cunoașteți deja bine, sau sunteți un grup mai nou?');
}

async function say(text) {
  const token = ++runToken;
  stopListening();
  speaking = true;
  conversation.status = 'Ascultați puțin';
  conversation.transcript = text;
  renderVoice();
  track('voice_prompt', { stage: conversation.stage });
  try {
    const response = await fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error('tts');
    const url = URL.createObjectURL(await response.blob());
    const audio = new Audio(url);
    await new Promise((resolve, reject) => {
      audio.onended = resolve; audio.onerror = reject;
      audio.play().catch(reject);
    });
    URL.revokeObjectURL(url);
  } catch {
    if (token !== runToken) return false;
    speaking = false;
    conversation.status = 'Vocea Becky nu este disponibilă';
    conversation.transcript = 'Nu pornesc o voce de sistem. Verificați conexiunea și încercați din nou.';
    renderVoice();
    track('elevenlabs_voice_error', { stage: conversation.stage });
    return false;
  }
  if (token !== runToken) return false;
  speaking = false;
  conversation.status = 'Acum vă ascult';
  renderVoice();
  return true;
}

async function sayAndListen(text) {
  if (await say(text)) setTimeout(listen, 350);
}

function listen() {
  if (speaking || listening) return;
  if (!Recognition) {
    conversation.status = 'Microfonul vocal nu este disponibil';
    conversation.transcript = 'Folosiți pentru moment răspunsurile mari de pe ecran.';
    renderVoice();
    track('speech_recognition_unavailable');
    return;
  }
  recognition = new Recognition();
  recognition.lang = 'ro-RO';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    listening = true; conversation.status = 'Vă ascult'; renderVoice();
    track('listening_started', { stage: conversation.stage });
  };
  recognition.onresult = recognitionEvent => {
    const transcript = Array.from(recognitionEvent.results).map(result => result[0].transcript).join(' ').trim();
    conversation.transcript = `Am auzit: „${transcript}”`;
    renderVoice();
    if (recognitionEvent.results[recognitionEvent.results.length - 1].isFinal) {
      track('voice_answer', { stage: conversation.stage, answer_kind: classify(transcript) });
      stopListening();
      handleAnswer(transcript);
    }
  };
  recognition.onerror = errorEvent => {
    listening = false;
    conversation.status = errorEvent.error === 'not-allowed' ? 'Microfonul are nevoie de permisiune' : 'Nu am auzit clar';
    conversation.transcript = errorEvent.error === 'not-allowed'
      ? 'Permiteți microfonul în browser, apoi apăsați „Vorbește cu Becky”.'
      : 'Puteți spune din nou sau folosi răspunsurile de pe ecran.';
    renderVoice();
    track('listening_error', { error: errorEvent.error });
  };
  recognition.onend = () => {
    if (!listening) return;
    listening = false; conversation.status = 'Nu am auzit răspunsul'; renderVoice();
  };
  try { recognition.start(); } catch { listening = false; renderVoice(); }
}

function stopListening() {
  if (recognition) { recognition.onend = null; try { recognition.stop(); } catch {} }
  recognition = null; listening = false;
}

function normalize(value) {
  return String(value || '').toLocaleLowerCase('ro-RO').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function classify(value) {
  const text = normalize(value);
  if (/\b(gata|terminat|terminaram|mai departe|continua)\b/.test(text)) return 'done';
  if (/grup nou|mai nou|nu ne cunoastem|colegi|abia/.test(text)) return 'new';
  if (/prieteni|apropiat|ne stim|ne cunoastem|familie|cuplu/.test(text)) return 'close';
  if (/personal|intim|incomod/.test(text)) return 'too-personal';
  if (/prea mult de vorbit|multa vorba|nu vrem sa vorbim|mai putina vorba/.test(text)) return 'too-talky';
  if (/complicat|prea multe reguli|mai simplu/.test(text)) return 'too-complex';
  if (/improviz|inventat|creativitate/.test(text)) return 'too-creative';
  if (/lung|dureaza|timp/.test(text)) return 'too-long';
  if (/multa miscare|prea energ|obosit|stand jos/.test(text)) return 'too-active';
  if (/prea linist|plictis|mai multa energie/.test(text)) return 'too-calm';
  if (/\b(nu|deloc|alta|altceva|schimba)\b/.test(text)) return 'no';
  if (/\b(da|sigur|bine|ok|okay|merge|incercam|place)\b/.test(text)) return 'yes';
  if (/amuz|ras|glum|jucaus/.test(text)) return 'fun';
  if (/creativ|invent|desen|povest/.test(text)) return 'creative';
  if (/energ|misc|dans/.test(text)) return 'active';
  if (/linist|convers|vorb|calm/.test(text)) return 'calm';
  if (/repeta|inca o data/.test(text)) return 'repeat';
  return 'unknown';
}

function chooseActivity(preference, excludeId, constraint = null) {
  const available = activities.filter(item => item.id !== excludeId && !conversation.rejectedIds.includes(item.id));
  const pools = {
    fun: available.filter(item => item.energy === 'râs'),
    creative: available.filter(item => item.tags.includes('creativ')),
    active: available.filter(item => item.energy === 'mai energic'),
    calm: available.filter(item => item.energy === 'calm' || item.tags.includes('fără mișcare'))
  };
  let pool = pools[preference]?.length ? pools[preference] : available.length ? available : activities;
  if (constraint === 'too-personal') pool = available.filter(item => item.tags.includes('creativ') || item.energy === 'râs');
  if (constraint === 'too-talky') pool = available.filter(item => item.category === 'Alegeți' || item.energy === 'mai energic');
  if (constraint === 'too-complex') pool = available.filter(item => item.duration.startsWith('5') && item.steps.length <= 3);
  if (constraint === 'too-creative') pool = available.filter(item => !item.tags.includes('creativ'));
  if (constraint === 'too-long') pool = available.filter(item => item.duration.startsWith('5'));
  if (constraint === 'too-active') pool = available.filter(item => item.energy === 'calm' || item.tags.includes('fără mișcare'));
  if (constraint === 'too-calm') pool = available.filter(item => item.energy === 'râs' || item.energy === 'mai energic');
  if (!pool.length) pool = available.length ? available : activities;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function propose(preference, excludeId = null, constraint = null) {
  conversation.preference = preference || conversation.preference || 'calm';
  const item = chooseActivity(conversation.preference, excludeId, constraint);
  active = item;
  conversation.proposedId = item.id;
  conversation.stage = 'confirm';
  persistConversation();
  track('activity_proposed', { preference: conversation.preference });
  await sayAndListen(`Am o idee. ${item.title}. Durează cam ${item.duration}. ${item.prompt} V-ar plăcea să încercați?`);
}

async function explainActivity(item, resumed = false) {
  active = item;
  conversation.stage = 'activity';
  conversation.proposedId = item.id;
  persistConversation();
  track(resumed ? 'activity_resumed' : 'activity_accepted');
  const steps = item.steps.map((step, index) => `Pasul ${index + 1}. ${step}`).join(' ');
  await say(`${resumed ? 'Continuăm de unde ați rămas. ' : 'Perfect. '}Așa se joacă. ${steps} ${item.prompt} Distracție plăcută! Când vreți altceva, spuneți Becky, altă idee.`);
  conversation.status = item.title;
  conversation.transcript = item.prompt;
  renderVoice();
}

function rejectionQuestion(item) {
  if (!item) return 'Ce anume nu vi se potrivește la ideea aceasta?';
  if (item.energy === 'mai energic') {
    return 'Ce nu vi se potrivește: e prea multă energie, e prea multă improvizație, sau ați prefera ceva simplu la masă?';
  }
  if (item.tags.includes('creativ')) {
    return 'Ce nu vi se potrivește: e prea multă improvizație, pare prea complicat, sau ați prefera ceva fără creativitate pe loc?';
  }
  if (item.category === 'Conversație' || item.category === 'Conectare' || item.category === 'Ghicește') {
    return 'Ce nu vi se potrivește: pare prea personal, presupune prea multă vorbă, sau ați prefera ceva mai jucăuș?';
  }
  return 'Ce nu vi se potrivește: pare prea lung, prea complicat, sau ați prefera ceva mai amuzant?';
}

async function handleAnswer(rawAnswer) {
  const kind = classify(rawAnswer);
  if (conversation.stage === 'welcome') return beginWarmup();
  if (conversation.stage === 'warmup') {
    if (kind === 'done') return askRelationship();
    conversation.status = 'Continuați în ritmul vostru';
    conversation.transcript = 'Când ați terminat, spuneți „gata”.';
    renderVoice();
    return setTimeout(listen, 450);
  }
  if (conversation.stage === 'relationship') {
    if (kind === 'close' || kind === 'new') {
      conversation.relationship = kind;
      persistConversation();
      track('relationship_learned', { relationship: kind });
      return propose(kind === 'close' ? 'calm' : 'creative');
    }
    return sayAndListen('Ca să vă înțeleg bine: spuneți „ne cunoaștem bine” sau „suntem un grup mai nou”.');
  }
  if (conversation.stage === 'confirm') {
    if (kind === 'yes') return explainActivity(activities.find(item => item.id === conversation.proposedId));
    if (kind === 'no') {
      conversation.rejectedIds.push(conversation.proposedId);
      conversation.stage = 'refine'; persistConversation();
      track('activity_rejected');
      const item = activities.find(value => value.id === conversation.proposedId);
      return sayAndListen(`Sigur. ${rejectionQuestion(item)}`);
    }
    return sayAndListen('Nu sunt sigură că am înțeles. Vreți să încercați această idee? Spuneți da sau nu.');
  }
  if (conversation.stage === 'refine') {
    const preference = kind === 'fun' ? 'fun' : kind === 'creative' ? 'creative' : kind === 'active' || kind === 'too-active' ? 'calm' : kind === 'calm' || kind === 'too-calm' ? 'fun' : conversation.preference;
    return propose(preference, conversation.proposedId, kind);
  }
  if (conversation.stage === 'activity') {
    const item = activities.find(value => value.id === conversation.proposedId);
    if (kind === 'repeat' || normalize(rawAnswer) === 'repeta') return explainActivity(item, true);
    if (kind === 'no' || normalize(rawAnswer).includes('alta')) return propose(conversation.preference, item?.id);
    return sayAndListen('Spuneți „altă idee” dacă vreți să vă propun ceva nou, sau „repetă” dacă vreți să auziți din nou regulile.');
  }
}

function resetConversation() {
  ++runToken; stopListening();
  localStorage.removeItem(CONVERSATION_KEY);
  Object.assign(conversation, { stage: 'welcome', preference: null, relationship: null, rejectedIds: [], proposedId: null, transcript: '', status: 'Pregătită să vă asculte' });
  active = null; track('conversation_reset'); renderVoice({ locked: true });
}

function renderLibrary() {
  stopListening();
  root.innerHTML = `<div class="parents-shell"><header class="parents-top"><span class="brand">BECKY · ALEGEȚI DE PE ECRAN</span><button class="reset" data-voice>Înapoi la voce</button></header><section class="hero compact"><span class="eyebrow">IDEI PENTRU VOI</span><h1>Alegeți ce vă face cu ochiul.</h1></section><section class="grid">${activities.map(item => `<button class="activity-card" data-id="${esc(item.id)}"><small>${esc(item.category)}</small><h2>${esc(item.title)}</h2><p>${esc(item.prompt)}</p><div class="meta"><span>${esc(item.duration)}</span><span>${esc(item.participants)}</span></div></button>`).join('')}</section></div>`;
  root.querySelector('[data-voice]').onclick = () => renderVoice({ locked: true });
  root.querySelectorAll('[data-id]').forEach(button => button.onclick = () => {
    const item = activities.find(value => value.id === button.dataset.id);
    conversation.proposedId = item.id; conversation.stage = 'activity'; persistConversation();
    renderVoice(); explainActivity(item);
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activities.length) renderVoice({ locked: true });
  else stopListening();
});
window.addEventListener('pagehide', () => track('session_end'));

(async () => {
  try {
    const response = await fetch('/api/parents/experiences');
    const payload = await response.json();
    activities = payload.experiences || [];
    active = activities.find(item => item.id === conversation.proposedId) || null;
    track('session_start', { resumed_stage: conversation.stage });
    renderVoice({ locked: true });
  } catch {
    root.innerHTML = '<div class="parents-loading">Nu am putut încărca experiența. Reîncercați.</div>';
  }
})();
