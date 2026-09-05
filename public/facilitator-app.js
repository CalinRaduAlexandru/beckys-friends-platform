const root = document.getElementById('facilitator-app');
const audio = document.getElementById('facilitator-audio');
const CACHE_KEY = 'becky-facilitator:library:v1';
const PLAYLIST_KEY = 'becky-facilitator:playlists:v1';
const RECENT_KEY = 'becky-facilitator:recent:v1';
const VOLUME_KEY = 'becky-facilitator:volume:v1';
const RATINGS_KEY = 'becky-facilitator:music-ratings:v1';
const SESSION_KEY = 'becky-facilitator-session';
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const saveJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
let facilitatorSession = readJson(SESSION_KEY, null);
let voiceAudio = null;
let voiceUrl = '';
const colorVoiceClips = new Map();
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; });

const state = {
  library: null,
  activities: [],
  challengeDecks: [],
  musicTracks: [],
  playlists: [],
  activityPlaylists: [],
  customPlaylists: readJson(PLAYLIST_KEY, []),
  musicRatings: readJson(RATINGS_KEY, {}),
  recentIds: readJson(RECENT_KEY, []),
  view: 'home',
  previousView: 'home',
  selectedActivity: null,
  session: null,
  query: '',
  category: 'Toate',
  sheet: '',
  currentTrack: null,
  currentPlaylist: null,
  playlistQueues: {},
  timerSeconds: 0,
  timerInitial: 0,
  timerRunning: false,
  timerId: null,
  challenge: null,
  shownChallenges: new Set(),
  colorGame: null,
  colorOptions: ['#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#8e24aa','#ec407a'],
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[character]);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const lines = value => String(value || '').split(/\n+/).map(item => item.trim()).filter(Boolean);
const activityComplete = item => item?.title && item.title !== 'Activitate nouă' && (item.steps || item.image);
const activityIcon = activity => ({ 'Gândește':'🧠', 'Simte':'♥', 'Colaborează':'🤝', 'Devine independent':'🍃', 'Creează':'★', 'Se mișcă':'🏃' }[activity.category] || '✦');
const activityNeedsChallenge = activity => Boolean(activity?.challengeDeckId || activity?.rounds?.length || /provocare|pedeaps/i.test(`${activity?.steps || ''} ${activity?.rules || ''}`));
const allPlaylists = () => [...state.playlists, ...state.customPlaylists];
const selectedTrack = id => state.musicTracks.find(track => track.id === id);
const navView = () => state.view === 'session' ? 'home' : ['home','games','music','tools'].includes(state.view) ? state.view : state.previousView;

function authHeaders() {
  try { const session = facilitatorSession || JSON.parse(sessionStorage.getItem('becky-admin-session') || 'null'); return session?.access_token ? { Authorization:`Bearer ${session.access_token}` } : {}; }
  catch { return {}; }
}

function saveSession(session) { facilitatorSession = session; if (session) saveJson(SESSION_KEY, session); else localStorage.removeItem(SESSION_KEY); }
async function refreshSession() {
  if (!facilitatorSession?.refresh_token) return false;
  const response = await fetch('/api/auth/refresh', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({refresh_token:facilitatorSession.refresh_token}) });
  if (!response.ok) { saveSession(null); return false; }
  saveSession(await response.json()); return true;
}

async function loadLibrary() {
  try {
    if (facilitatorSession?.access_code) {
      const response = await fetch('/api/facilitator/library', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code:facilitatorSession.access_code}) });
      if (response.status === 401) { saveSession(null); throw Object.assign(new Error('Cod invalid'), { code:'AUTH' }); }
      if (!response.ok) throw new Error('library');
      const payload = await response.json(); saveJson(CACHE_KEY, payload); return payload;
    }
    let response = await fetch('/api/workspaces', { headers:authHeaders() });
    if (response.status === 401 && await refreshSession()) response = await fetch('/api/workspaces', { headers:authHeaders() });
    if (response.status === 401) throw Object.assign(new Error('Este nevoie de autentificare pentru a deschide Biblioteca.'), { code:'AUTH' });
    if (!response.ok) throw new Error('library');
    const payload = await response.json();
    saveJson(CACHE_KEY, payload);
    return payload;
  } catch (error) {
    if (error?.code === 'AUTH') throw error;
    const cached = readJson(CACHE_KEY, null);
    if (cached) { toast('Folosesc ultima versiune salvată a Bibliotecii.'); return cached; }
    throw new Error('Biblioteca nu este disponibilă încă. Deschide aplicația o dată din Admin când ai internet.');
  }
}

function showLogin() {
  document.querySelector('.facilitator-login')?.remove();
  const style = document.createElement('style'); style.textContent = `.facilitator-login{position:fixed;z-index:200;inset:0;display:grid;place-items:center;padding:20px;background:rgba(35,52,72,.42);backdrop-filter:blur(6px)}.facilitator-login-card{width:min(420px,100%);padding:26px;border-radius:28px;background:#fffdf9;box-shadow:0 25px 70px rgba(24,39,55,.25)}.facilitator-login-card .brand-mark{margin-bottom:16px}.facilitator-login-card h1{margin:7px 0;font:600 28px/1.08 DynaPuff,sans-serif}.facilitator-login-card p{margin:0 0 20px;color:#6f7f8f;font-size:13px;font-weight:650;line-height:1.4}.facilitator-login-card label{display:grid;gap:6px;margin-top:12px;color:#6f7f8f;font-size:11px;font-weight:900}.facilitator-login-card input{min-height:50px;padding:0 13px;border:1px solid #ccdadd;border-radius:15px;outline:0;background:white;color:#233448}.facilitator-login-card input:focus{border-color:#2399a6;box-shadow:0 0 0 4px rgba(35,153,166,.12)}.facilitator-login-card button{width:100%;margin-top:18px;min-height:54px;border:0;border-radius:17px;background:#233448;color:white;font-weight:900}.facilitator-login-error{min-height:18px;margin-top:12px;color:#c45468;font-size:11px;font-weight:800}`; document.head.appendChild(style);
  const overlay=document.createElement('div'); overlay.className='facilitator-login'; overlay.innerHTML=`<form class="facilitator-login-card"><div class="brand-mark">✦</div><span class="eyebrow">BECKY · FACILITATOR</span><h1>Intră în Biblioteca Becky</h1><p>Scrie codul comun al echipei pentru a deschide jocurile și instrumentele Becky.</p><label>Cod de acces<input type="password" name="code" inputmode="text" autocomplete="current-password" autocapitalize="none" required></label><div class="facilitator-login-error" aria-live="polite"></div><button type="submit">Intră în aplicație</button></form>`; document.body.appendChild(overlay);
  overlay.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');const error=overlay.querySelector('.facilitator-login-error');button.disabled=true;button.textContent='Se verifică…';error.textContent='';try{const code=form.code.value.trim();const response=await fetch('/api/facilitator/library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'Codul nu este corect.');saveSession({access_code:code});const payload=await response.json();saveJson(CACHE_KEY,payload);overlay.remove();await init();}catch(loginError){error.textContent=loginError.message;button.disabled=false;button.textContent='Intră în aplicație';}}); overlay.querySelector('input')?.focus();
}

function header(title = 'Activități Becky') {
  return `<header class="app-header"><div class="brand"><span class="brand-mark">✦</span><div><small>BECKY · FACILITATOR</small><strong>${esc(title)}</strong></div></div><button class="header-action" type="button" data-open-sheet="effects" aria-label="Reacții rapide">✨</button></header>`;
}

function bottomNav() {
  const active = navView();
  const items = [['home','◉','Acum'],['games','✦','Jocuri'],['music','♫','Muzică'],['tools','⊞','Trusă']];
  return `<nav class="bottom-nav" aria-label="Navigația principală">${items.map(([id,icon,label]) => `<button type="button" class="${active === id ? 'is-active' : ''}" data-nav="${id}"><span>${icon}</span>${label}</button>`).join('')}</nav>`;
}

function nowPlaying() {
  if (!state.currentTrack) return '';
  const progress = audio.duration ? Math.min(100, (audio.currentTime / audio.duration) * 100) : 0;
  return `<div class="now-playing"><span>♫</span><div><strong>${esc(state.currentTrack.title)}</strong><small>${esc(state.currentPlaylist?.title || state.currentTrack.artist || 'Muzică Becky')}</small></div><button type="button" data-toggle-audio aria-label="${audio.paused ? 'Pornește' : 'Pauză'}">${audio.paused ? '▶' : 'Ⅱ'}</button>${state.currentPlaylist ? '<button type="button" data-next-track aria-label="Melodia următoare">⏭</button>' : ''}<div class="now-playing-progress" aria-label="Progres melodie"><span data-now-playing-progress style="width:${progress}%"></span></div></div>`;
}

function shell(content, options = {}) {
  const player = nowPlaying();
  return `<main class="app-shell ${player ? 'has-player' : ''}">${content}</main>${player}${timerBanner()}${options.nav === false ? '' : bottomNav()}${state.sheet ? sheetMarkup(state.sheet) : ''}${state.challenge ? challengeMarkup() : ''}${state.colorGame ? colorGameMarkup() : ''}`;
}

function timerBanner() {
  if (!state.timerInitial) return '';
  return `<button class="timer-banner ${state.timerRunning ? 'is-running' : ''}" type="button" data-open-sheet="timer"><span class="timer-banner-icon">◷</span><span><small>${state.timerRunning ? 'TIMER ÎN DESFĂȘURARE' : 'TIMER PUS PE PAUZĂ'}</small><strong data-timer-display>${formatTime(state.timerSeconds) || '0:00'}</strong></span><i>${state.timerRunning ? 'Pauză / schimbă' : 'Continuă'}</i></button>`;
}

function homeView() {
  const recent = state.recentIds.map(id => state.activities.find(item => item.id === id)).filter(Boolean).slice(0,4);
  const active = state.session?.activity;
  return shell(`${header('Activități Becky')}<section class="hero-card"><small>${active ? 'JOC ÎN DESFĂȘURARE' : 'TOTUL PREGĂTIT ÎNTR-UN LOC'}</small><h1>${active ? esc(active.title) : 'Tu conduci joaca. Aplicația ține ritmul.'}</h1><p>${active ? `Pasul ${state.session.step + 1} din ${state.session.steps.length}. Muzica și instrumentele rămân la îndemână.` : 'Alege activitatea din Bibliotecă, apoi folosește doar instrumentele de care ai nevoie în acel moment.'}</p><div class="hero-actions"><button class="primary" type="button" ${active ? 'data-resume-session' : 'data-nav="games"'}>${active ? 'Continuă jocul' : 'Alege un joc'}</button>${active ? '<button class="secondary" type="button" data-end-session>Încheie</button>' : '<button class="secondary" type="button" data-open-sheet="music">Alege muzica</button>'}</div></section><section class="section"><div class="section-heading"><div><span class="eyebrow">ACCES RAPID</span><h2>În timpul jocului</h2></div></div><div class="quick-grid"><button class="quick-card" data-open-sheet="music"><span>♫</span><strong>Muzică</strong><small>Playlisturi și volum</small></button><button class="quick-card" data-open-sheet="effects"><span>✨</span><strong>Reacții</strong><small>Sunete dintr-o atingere</small></button><button class="quick-card" data-open-sheet="timer"><span>◷</span><strong>Timer</strong><small>30 sec, 1, 3 sau 5 min</small></button><button class="quick-card" data-open-challenge><span>🫨</span><strong>Provocare</strong><small>Scutură sau alege</small></button></div></section>${recent.length ? `<section class="section"><div class="section-heading"><div><span class="eyebrow">ULTIMELE FOLOSITE</span><h2>Pornește din nou</h2></div><button data-nav="games">Toate</button></div><div class="game-list">${recent.map(gameCard).join('')}</div></section>` : ''}`);
}

function gameCard(activity) {
  const ages = (activity.ageCategories || []).join(' · ') || activity.age || '';
  const collection = activity.collection ? `${activity.collection} · ` : '';
  return `<button type="button" class="game-card" data-game="${esc(activity.id)}"><span class="game-icon">${activityIcon(activity)}</span><span><strong>${esc(activity.title)}</strong><small>${esc(collection)}${esc(activity.category || 'Activitate')} · ${esc(ages)}</small></span><i>→</i></button>`;
}

function gamesView() {
  const categories = ['Toate', ...new Set(state.activities.map(item => item.category).filter(Boolean))];
  const matches = filteredActivities();
  return shell(`${header('Jocuri')}<label class="search"><span>⌕</span><input type="search" data-game-search value="${esc(state.query)}" placeholder="Caută joc, material sau abilitate" aria-label="Caută în Bibliotecă"></label><div class="filter-row">${categories.map(category => `<button type="button" class="filter-chip ${state.category === category ? 'is-active' : ''}" data-category="${esc(category)}">${esc(category)}</button>`).join('')}</div>${activityPlaylistsMarkup()}<section class="section"><div class="section-heading"><div><span class="eyebrow">DIN BIBLIOTECA BECKY</span><h2 class="activity-count">${matches.length} ${matches.length === 1 ? 'activitate' : 'activități'}</h2></div></div><div class="game-list">${matches.map(gameCard).join('') || '<div class="empty">Nu am găsit o activitate potrivită.</div>'}</div></section>`);
}

function activityPlaylistsMarkup() { return state.activityPlaylists.length ? `<section class="section activity-playlists"><div class="section-heading"><div><span class="eyebrow">LISTELE ECHIPEI</span><h2>Activități pregătite</h2></div></div><div class="playlist-list">${state.activityPlaylists.map(list => `<button type="button" class="playlist-card" data-activity-playlist="${esc(list.id)}"><span>✦</span><div><strong>${esc(list.title)}</strong><small>${(list.activityIds||[]).length} ${(list.activityIds||[]).length===1?'activitate':'activități'}</small></div><i>Deschide →</i></button>`).join('')}</div></section>` : '' ; }

function activityPlaylistView() { const list=state.activityPlaylists.find(item=>item.id===state.selectedPlaylistId); const items=(list?.activityIds||[]).map(id=>state.activities.find(item=>item.id===id)).filter(Boolean); return shell(`<section class="detail-sheet"><div class="detail-top"><button class="back-button" data-back type="button">←</button><span class="eyebrow">LISTĂ DE ACTIVITĂȚI</span></div><section class="detail-hero"><h1>${esc(list?.title||'Listă')}</h1><p>${items.length} activități pregătite pentru echipă.</p><small class="list-hint">Apasă lung și mută pentru reordonare · glisează stânga pentru check</small></section><div class="game-list activity-playlist-items">${items.map(activity=>`<div class="activity-playlist-item ${(list.completedIds||[]).includes(activity.id)?'is-complete':''}" data-playlist-item="${esc(activity.id)}" draggable="true"><span class="swipe-remove">✓ Gata</span>${gameCard(activity)}</div>`).join('')||'<div class="empty">Lista este goală.</div>'}</div></section>`); }

function filteredActivities() {
  const query = normalize(state.query);
  return state.activities.filter(item => (state.category === 'Toate' || item.category === state.category) && (!query || normalize(`${item.title} ${item.subtitle} ${item.materials} ${item.skills} ${item.collection}`).includes(query)));
}

function infoSection(kicker, title, value, ordered = false) {
  const items = lines(value);
  if (!items.length) return '';
  const tag = ordered ? 'ol' : 'ul';
  return `<section class="info-card"><small>${esc(kicker)}</small><h2>${esc(title)}</h2><${tag}>${items.map(item => `<li>${esc(item)}</li>`).join('')}</${tag}></section>`;
}

function detailView() {
  const activity = state.selectedActivity;
  if (!activity) { state.view = 'games'; return gamesView(); }
  const variants = [activity.easier && `Mai ușor: ${activity.easier}`, activity.harder && `Mai greu: ${activity.harder}`].filter(Boolean).join('\n');
  return shell(`<div class="detail-sheet"><div class="detail-top"><button class="back-button" data-back type="button">←</button><span class="eyebrow">BIBLIOTECA BECKY</span><button class="icon-button" data-open-sheet="effects" type="button">✨</button></div><section class="detail-hero"><span class="eyebrow">${esc(activity.collection || activity.category || 'ACTIVITATE')}</span><h1>${esc(activity.title)}</h1><p>${esc(activity.subtitle || '')}</p><div class="meta-row"><span>${esc((activity.ageCategories || []).join(' · ') || activity.age || '')}</span><span>${esc((activity.participantCategories || []).join(' · ') || activity.participants || '')}</span><span>${esc((activity.durationCategories || []).join(' · ') || activity.duration || '')}</span></div></section>${activity.skills ? infoSection('CE EXERSĂM','Obiectiv',activity.skills) : ''}${infoSection('PREGĂTEȘTE','Materiale',activity.materials)}${infoSection('PAS CU PAS','Cum se joacă',activity.steps,true)}${infoSection('REPER CLAR','Reguli',activity.rules)}${infoSection('REGLEAZĂ PROVOCAREA','Adaptări',variants)}${infoSection('DE ȚINUT MINTE','Atenție',activity.caution)}<button class="start-game" type="button" data-start-activity>Pornește jocul</button></div>`);
}

function sessionView() {
  const session = state.session;
  if (!session) { state.view = 'home'; return homeView(); }
  const current = session.steps[session.step] || session.activity.title;
  const needsChallenge = activityNeedsChallenge(session.activity);
  return shell(`<section class="session"><header class="session-header"><button class="back-button" type="button" data-minimize-session>⌄</button><div class="session-title"><small>ÎN DESFĂȘURARE</small><strong>${esc(session.activity.title)}</strong></div><button class="timer-pill ${state.timerRunning ? 'is-running' : ''}" type="button" data-open-sheet="timer">${formatTime(state.timerSeconds) || 'Timer'}</button></header><div class="session-stage"><span class="step-count">PASUL ${session.step + 1} DIN ${session.steps.length}</span><h1>${esc(current)}</h1><p>${session.step === 0 && session.activity.materials ? `Pregătit: ${lines(session.activity.materials).join(', ')}` : session.activity.facilitator || 'Privește grupul și schimbă ritmul când este nevoie.'}</p></div><div class="session-controls"><button type="button" data-previous-step ${session.step === 0 ? 'disabled' : ''}>←</button><button type="button" class="next-step" data-next-step>${session.step === session.steps.length - 1 ? 'Încheie jocul' : 'Pasul următor'}</button><button type="button" data-read-step aria-label="Citește pasul">🔊</button></div><div class="live-tools"><button type="button" data-open-sheet="music"><span>♫</span>Muzică</button><button type="button" data-open-sheet="effects"><span>✨</span>Reacții</button><button class="challenge-tool" type="button" data-open-challenge ${needsChallenge ? '' : 'hidden'}><span>🫨</span>Provocare</button></div></section>`, { nav:false });
}

function musicView() {
  return shell(`${header('Muzică')}<section class="hero-card"><small>ATMOSFERA JOCULUI</small><h1>Muzica susține momentul, nu îl conduce.</h1><p>Alege un playlist înainte de joc. În timpul activității rămân vizibile doar pauză, reluare și volum.</p></section><section class="section"><div class="section-heading"><div><span class="eyebrow">PLAYLISTURI</span><h2>Pentru diferite momente</h2></div><button type="button" data-new-playlist>＋ Playlist</button></div><div class="playlist-list">${allPlaylists().map(playlistCard).join('') || '<div class="empty">Creează primul playlist.</div>'}</div></section><section class="section"><div class="section-heading"><div><span class="eyebrow">PIESE DISPONIBILE</span><h2>Biblioteca muzicală</h2></div><small class="rating-hint">Notează din mers</small></div>${musicTrackGroups()}</section>`);
}

function musicTrackGroups() {
  const groups = [['copii','Cu copiii'],['adulti','Terasa · adulți']];
  return groups.map(([audience,title]) => { const tracks = state.musicTracks.filter(track => (track.audience || 'copii') === audience); return tracks.length ? `<section class="music-group"><div class="music-group-title"><strong>${title}</strong><small>${audience === 'adulti' ? 'Separat de muzica pentru copii' : 'Muzică pentru joacă'}</small></div><div class="track-list">${tracks.map(trackCard).join('')}</div></section>` : ''; }).join('') || '<div class="empty">Nu sunt încă piese în Bibliotecă.</div>';
}

function playlistCard(playlist) {
  const count = playlist.trackIds?.length || 0;
  return `<button class="playlist-card" type="button" data-playlist="${esc(playlist.id)}" aria-label="Redă tot playlistul ${esc(playlist.title)}"><span>♫</span><div><strong>${esc(playlist.title)}</strong><small>${esc(playlist.occasion || 'Playlist personalizat')} · ${count} ${count === 1 ? 'piesă' : 'piese'} · Redă tot</small></div><i>▶</i></button>`;
}

function trackCard(track) {
  const playing = state.currentTrack?.id === track.id && !audio.paused;
  const rating = Number(state.musicRatings[track.id] || 0);
  const progress = playing && audio.duration ? Math.round((audio.currentTime / audio.duration) * 100) : 0;
  return `<div class="track-card ${playing ? 'is-playing' : ''}" data-track-card="${esc(track.id)}"><span>♪</span><div><strong>${esc(track.title)}</strong><small>${esc(track.artist || track.mood || '')}</small><div class="track-rating" aria-label="Notare: ${rating} din 5 stele">${[1,2,3,4,5].map(value => `<button type="button" class="rating-star ${value <= rating ? 'is-selected' : ''}" data-rate-track="${esc(track.id)}" data-rating="${value}" aria-label="${value} din 5 stele">${value <= rating ? '★' : '☆'}</button>`).join('')}</div><div class="track-progress" aria-label="Progres melodie"><span data-track-progress="${esc(track.id)}" style="width:${progress}%"></span></div></div><button type="button" data-track="${esc(track.id)}" aria-label="Redă">${playing ? 'Ⅱ' : '▶'}</button></div>`;
}

function toolsView() {
  return shell(`${header('Trusă')}<section class="hero-card"><small>INSTRUMENTE DE FACILITARE</small><h1>Puține gesturi. Efect imediat.</h1><p>Sunetele, timerul și provocările sunt instrumente scurte. Jocul și copiii rămân în centru.</p></section><section class="section"><div class="section-heading"><div><span class="eyebrow">REACȚII RAPIDE</span><h2>O singură atingere</h2></div></div>${effectsGrid()}</section><section class="section"><div class="section-heading"><div><span class="eyebrow">RITM</span><h2>Timer rapid</h2></div></div><div class="timer-options">${[30,60,180,300].map(value => `<button data-set-timer="${value}">${value < 60 ? `${value} sec` : `${value / 60} min`}</button>`).join('')}</div></section><section class="section"><button class="start-game" data-open-color-game type="button">Alege o culoare prin shake</button></section><section class="section"><button class="start-game" data-open-challenge type="button">Deschide provocările</button></section>`);
}

function effectsGrid() {
  return `<div class="effect-grid">${state.library.soundEffects.map(effect => `<button class="effect-card" type="button" data-effect="${esc(effect.id)}"><span>${esc(effect.icon)}</span>${esc(effect.title)}</button>`).join('')}</div>`;
}

function sheetMarkup(kind) {
  const heading = { effects:['Reacții rapide','Declanșează un sunet și revino imediat la copii.'], timer:['Timer','Alege durata fără să părăsești jocul.'], music:['Muzică','Schimbă atmosfera fără să pierzi pasul curent.'], playlist:['Playlist nou','Alege un nume și piesele pe care le vrei.'], activityPlaylist:['Adaugă în listă','Alege unde vrei să păstrezi activitatea pentru mai târziu.'] }[kind];
  let body = '';
  if (kind === 'effects') body = effectsGrid();
  if (kind === 'timer') body = `<div class="timer-options">${[30,60,180,300].map(value => `<button data-set-timer="${value}">${value < 60 ? `${value} sec` : `${value / 60} min`}</button>`).join('')}</div>${state.timerInitial ? `<button class="start-game" data-toggle-timer>${state.timerRunning ? 'Pauză' : state.timerSeconds ? 'Continuă' : 'Repornește'}</button>` : ''}`;
  if (kind === 'music') body = `<div class="playlist-list">${allPlaylists().map(playlistCard).join('')}</div><label class="music-volume">Volum <input type="range" data-volume min="0" max="1" step=".01" value="${audio.volume || .35}"></label>`;
  if (kind === 'playlist') body = `<form data-playlist-form><label class="search"><input name="title" required maxlength="40" placeholder="Ex. Petrecere cu energie"></label><div class="track-list">${state.musicTracks.map(track => `<label class="track-card"><span>♪</span><div><strong>${esc(track.title)}</strong><small>${esc(track.artist || '')}</small></div><input type="checkbox" name="trackIds" value="${esc(track.id)}"></label>`).join('')}</div><button class="start-game" type="submit">Salvează playlistul</button></form>`;
  if (kind === 'activityPlaylist') body = `<div class="playlist-list">${state.activityPlaylists.map(list => `<button type="button" class="playlist-card" data-add-activity-playlist="${esc(list.id)}"><span>✦</span><div><strong>${esc(list.title)}</strong><small>${(list.activityIds||[]).length} ${(list.activityIds||[]).length===1?'activitate':'activități'}</small></div><i>${list.activityIds?.includes(state.pendingActivityId) ? 'Adăugată ✓' : 'Adaugă +'}</i></button>`).join('')}</div>`;
  return `<div class="sheet-backdrop" data-close-sheet><section class="bottom-sheet" role="dialog" aria-modal="true" aria-label="${esc(heading[0])}" data-sheet><div class="sheet-handle"></div><div class="sheet-heading"><div><span class="eyebrow">TRUSA FACILITATORULUI</span><h2>${esc(heading[0])}</h2><p>${esc(heading[1])}</p></div><button type="button" data-close-sheet>×</button></div>${body}</section></div>`;
}

function challengeMarkup() {
  const item = state.challenge;
  return `<section class="challenge-overlay" role="dialog" aria-modal="true"><button class="challenge-close" type="button" data-close-challenge>×</button><div class="challenge-card"><div class="challenge-visual">${item.image ? `<img src="${esc(item.image)}" alt="">` : `<span>${esc(item.icon || '✦')}</span>`}</div><small>SCUTURĂ PENTRU ALTA</small><h1>${esc(item.title)}</h1><p>${esc(item.meta || '')}</p><div class="challenge-actions"><button type="button" data-read-challenge>🔊 Citește</button><button class="challenge-next" type="button" data-next-challenge>Altă provocare</button></div></div></section>`;
}
function colorGameMarkup(){const game=state.colorGame;if(game.phase==='color')return `<section class="color-overlay color-reveal ${game.effect}" data-color-overlay style="background:${game.color}"><span class="color-surprise">${game.effect==='color-burst'?'✦':''}</span></section>`;if(game.phase==='countdown')return `<section class="color-overlay color-countdown"><strong>${game.count}</strong></section>`;if(game.phase==='waiting')return `<section class="color-overlay color-waiting"><button class="challenge-close" data-close-color>×</button><div><span class="color-shake-icon">🎨</span><h1>${game.ready?'Totul este pregătit':'Pregătim vocea…'}</h1><p>${game.ready?'Apasă Start. După culoare, atinge ecranul pentru o rundă nouă.':'Doar prima rundă are nevoie de câteva clipe.'}</p><button class="start-game color-start-button" data-reveal-color ${game.ready?'':'disabled'}>${game.ready?'Start':'Se încarcă…'}</button></div></section>`;return `<div class="sheet-backdrop" data-close-color><section class="bottom-sheet" data-sheet><div class="sheet-heading"><div><span class="eyebrow">JOC CU CULORI</span><h2>Alege culorile</h2><p>Bifează culorile pentru random show.</p></div><button type="button" data-close-color>×</button></div><div class="color-options">${[['#e53935','Roșu'],['#fb8c00','Portocaliu'],['#fdd835','Galben'],['#43a047','Verde'],['#1e88e5','Albastru'],['#8e24aa','Mov'],['#ec407a','Roz']].map(([color,name])=>`<label><span style="background:${color}"></span>${name}<input type="checkbox" value="${color}" ${state.colorOptions.includes(color)?'checked':''} data-color-option></label>`).join('')}</div><button class="start-game" data-start-color>Go</button></section></div>`;}

function render() {
  const view = { home:homeView, games:gamesView, detail:detailView, playlist:activityPlaylistView, session:sessionView, music:musicView, tools:toolsView }[state.view] || homeView;
  root.innerHTML = view();
  bind();
}

function bind() {
  root.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.nav)));
  bindGameCards();
  root.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { state.category = button.dataset.category; render(); }));
  root.querySelector('[data-game-search]')?.addEventListener('input', event => { state.query = event.target.value; updateGameResults(); });
  root.querySelector('[data-back]')?.addEventListener('click', () => { state.view = state.previousView || 'games'; render(); });
  root.querySelector('[data-start-activity]')?.addEventListener('click', startActivity);
  root.querySelector('[data-resume-session]')?.addEventListener('click', () => { state.view = 'session'; render(); });
  root.querySelector('[data-minimize-session]')?.addEventListener('click', () => { state.view = 'home'; render(); });
  root.querySelector('[data-end-session]')?.addEventListener('click', endSession);
  root.querySelector('[data-previous-step]')?.addEventListener('click', () => changeStep(-1));
  root.querySelector('[data-next-step]')?.addEventListener('click', () => state.session.step === state.session.steps.length - 1 ? endSession() : changeStep(1));
  root.querySelector('[data-read-step]')?.addEventListener('click', () => speak(state.session?.steps[state.session.step] || ''));
  root.querySelectorAll('[data-open-sheet]').forEach(button => button.addEventListener('click', () => { state.sheet = button.dataset.openSheet; render(); }));
  root.querySelectorAll('[data-close-sheet]').forEach(element => element.addEventListener('click', event => { if (event.target.closest('[data-sheet]') && !event.target.matches('[data-close-sheet]')) return; state.sheet = ''; render(); }));
  root.querySelectorAll('[data-effect]').forEach(button => button.addEventListener('click', () => playEffect(button.dataset.effect)));
  root.querySelectorAll('[data-set-timer]').forEach(button => button.addEventListener('click', () => setTimer(Number(button.dataset.setTimer))));
  root.querySelector('[data-toggle-timer]')?.addEventListener('click', toggleTimer);
  root.querySelectorAll('[data-track]').forEach(button => button.addEventListener('click', () => toggleTrack(button.dataset.track)));
  root.querySelector('[data-next-track]')?.addEventListener('click', playNextTrack);
  root.querySelectorAll('[data-rate-track]').forEach(button => button.addEventListener('click', () => rateTrack(button.dataset.rateTrack, Number(button.dataset.rating))));
  root.querySelectorAll('[data-playlist]').forEach(button => button.addEventListener('click', () => playPlaylist(button.dataset.playlist)));
  root.querySelector('[data-toggle-audio]')?.addEventListener('click', toggleAudio);
  root.querySelector('[data-volume]')?.addEventListener('input', event => { audio.volume = Number(event.target.value); localStorage.setItem(VOLUME_KEY, String(audio.volume)); });
  root.querySelectorAll('[data-open-challenge]').forEach(button => button.addEventListener('click', openChallenge));
  root.querySelectorAll('[data-open-color-game]').forEach(button => button.addEventListener('click', openColorGame));
  root.querySelectorAll('[data-close-color]').forEach(button => button.addEventListener('click', event => { if (event.target.closest('[data-sheet]') && !event.target.matches('[data-close-color]')) return; closeColorGame(); }));
  root.querySelector('[data-start-color]')?.addEventListener('click', startColorGame);
  root.querySelector('[data-reveal-color]')?.addEventListener('click', revealColor);
  bindColorOverlay();
  root.querySelector('[data-close-challenge]')?.addEventListener('click', closeChallenge);
  root.querySelector('[data-next-challenge]')?.addEventListener('click', nextChallenge);
  root.querySelector('[data-read-challenge]')?.addEventListener('click', () => speak(`${state.challenge?.title || ''}. ${state.challenge?.meta || ''}`));
  root.querySelector('[data-new-playlist]')?.addEventListener('click', () => { state.sheet = 'playlist'; render(); });
  root.querySelectorAll('[data-add-activity-playlist]').forEach(button => button.addEventListener('click', () => { const list=state.activityPlaylists.find(item=>item.id===button.dataset.addActivityPlaylist); if(!list||list.activityIds?.includes(state.pendingActivityId))return; const activityId=state.pendingActivityId; list.activityIds=[...(list.activityIds||[]),activityId]; state.sheet=''; render(); saveActivityPlaylists(()=>{const current=state.activityPlaylists.find(item=>item.id===list.id);if(current)current.activityIds=(current.activityIds||[]).filter(id=>id!==activityId);saveActivityPlaylists();render();}); }));
  root.querySelector('[data-playlist-form]')?.addEventListener('submit', savePlaylist);
}

function gamesViewUpdate() {
  const input = root.querySelector('[data-game-search]');
  const selection = input?.selectionStart || state.query.length;
  render();
  const next = root.querySelector('[data-game-search]');
  next?.focus(); next?.setSelectionRange(selection, selection);
}

function bindGameCards() {
  root.querySelectorAll('[data-game]').forEach(button => { button.addEventListener('click', () => openActivity(button.dataset.game)); let startX=0; button.addEventListener('touchstart', event => { startX=event.changedTouches[0].screenX; button.classList.remove('is-swipe-ready'); }, { passive:true }); button.addEventListener('touchmove', event => { const dx=event.changedTouches[0].screenX-startX; if(dx>8){event.preventDefault();button.style.transform=`translateX(${Math.min(88,dx)}px)`;button.classList.toggle('is-swipe-ready',dx>70);} }, { passive:false }); button.addEventListener('touchend', event => { const dx=event.changedTouches[0].screenX-startX;button.style.transform='';button.classList.remove('is-swipe-ready'); if(dx>70){event.preventDefault();chooseActivityPlaylist(button.dataset.game);} }); });
  root.querySelectorAll('[data-activity-playlist]').forEach(button => button.addEventListener('click', () => { state.selectedPlaylistId=button.dataset.activityPlaylist; state.view='playlist'; render(); }));
  root.querySelectorAll('[data-playlist-item]').forEach(item => bindPlaylistItem(item));
}

function bindPlaylistItem(item) { let startX=0; let startY=0; let moved=false; item.addEventListener('touchstart',event=>{startX=event.changedTouches[0].screenX;startY=event.changedTouches[0].screenY;moved=false;item.classList.add('is-pressing');},{passive:true}); item.addEventListener('touchmove',event=>{const touch=event.changedTouches[0];const dx=touch.screenX-startX;const dy=touch.screenY-startY;if(Math.abs(dx)>12||Math.abs(dy)>12)moved=true;if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){event.preventDefault();item.style.transform=`translateX(${Math.max(-100,Math.min(100,dx))}px)`;item.classList.toggle('is-swipe-ready',dx< -70);}}, {passive:false}); item.addEventListener('touchend',event=>{const dx=event.changedTouches[0].screenX-startX;item.classList.remove('is-pressing');item.style.transform='';if(dx< -70){toggleActivityDone(item.dataset.playlistItem);return;}if(!moved){const game=item.querySelector('[data-game]');if(game)openActivity(game.dataset.game);}}); item.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',item.dataset.playlistItem);item.classList.add('is-dragging');});item.addEventListener('dragend',()=>item.classList.remove('is-dragging'));item.addEventListener('dragover',event=>event.preventDefault());item.addEventListener('drop',event=>{event.preventDefault();reorderPlaylistItem(event.dataTransfer.getData('text/plain'),item.dataset.playlistItem);}); }
function toggleActivityDone(activityId){const list=state.activityPlaylists.find(item=>item.id===state.selectedPlaylistId);if(!list)return;list.completedIds=[...(list.completedIds||[])];const index=list.completedIds.indexOf(activityId);if(index>=0)list.completedIds.splice(index,1);else list.completedIds.push(activityId);render();saveActivityPlaylists();}
function reorderPlaylistItem(fromId,toId){const list=state.activityPlaylists.find(item=>item.id===state.selectedPlaylistId);if(!list||fromId===toId)return;const ids=[...(list.activityIds||[])];const from=ids.indexOf(fromId),to=ids.indexOf(toId);if(from<0||to<0)return;ids.splice(to,0,ids.splice(from,1)[0]);list.activityIds=ids;render();saveActivityPlaylists();}

function updateGameResults() {
  const list = root.querySelector('.game-list');
  if (!list) return;
  const matches = filteredActivities();
  list.innerHTML = matches.map(gameCard).join('') || '<div class="empty">Nu am găsit o activitate potrivită.</div>';
  const count = root.querySelector('.activity-count');
  if (count) count.textContent = `${matches.length} ${matches.length === 1 ? 'activitate' : 'activități'}`;
  bindGameCards();
}

function rateTrack(id, rating) {
  if (!id || rating < 1 || rating > 5) return;
  state.musicRatings[id] = rating;
  saveJson(RATINGS_KEY, state.musicRatings);
  render();
}

function navigate(view) { state.previousView = ['home','games','music','tools'].includes(state.view) ? state.view : state.previousView; state.view = view; state.sheet = ''; render(); window.scrollTo(0,0); }
function openActivity(id) { state.selectedActivity = state.activities.find(item => item.id === id); state.previousView = 'games'; state.view = 'detail'; state.recentIds = [id, ...state.recentIds.filter(value => value !== id)].slice(0,8); saveJson(RECENT_KEY,state.recentIds); render(); window.scrollTo(0,0); }
async function saveActivityPlaylists(afterSave) { if(!facilitatorSession?.access_code)return; const response=await fetch('/api/facilitator/playlists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:facilitatorSession.access_code,playlists:state.activityPlaylists})}); if(response.ok){const payload=await response.json();state.activityPlaylists=payload.activityPlaylists||state.activityPlaylists;saveJson(CACHE_KEY,{...readJson(CACHE_KEY,{}),workspaces:readJson(CACHE_KEY,{}).workspaces});toast('Activitate adăugată ✓',afterSave);}else toast('Lista nu a putut fi salvată.'); }
function chooseActivityPlaylist(activityId) { if(!state.activityPlaylists.length){toast('Nu există încă liste în Bibliotecă.');return;} state.pendingActivityId=activityId; state.sheet='activityPlaylist'; render(); }
function startActivity() { const activity = state.selectedActivity; state.session = { activity, steps:lines(activity.steps).length ? lines(activity.steps) : [activity.title], step:0 }; state.view='session'; state.sheet=''; render(); }
function endSession() { state.session=null; clearTimer(); state.view='home'; render(); toast('Joc încheiat.'); }
function changeStep(delta) { state.session.step=Math.max(0,Math.min(state.session.steps.length-1,state.session.step+delta)); render(); }

function playTrack(track, playlist = null) {
  if (!track?.src) { toast('Piesa nu are încă o sursă audio disponibilă.'); return; }
  state.currentTrack=track; state.currentPlaylist=playlist; audio.pause(); audio.src=track.src; audio.volume=Number(localStorage.getItem(VOLUME_KEY) || .35); audio.load(); const start=audio.play(); if(start?.catch)start.catch(()=>setTimeout(()=>{if(state.currentTrack?.id===track.id)audio.play().catch(()=>{});},250)); render();
}
function toggleTrack(id) { const track=selectedTrack(id); if (state.currentTrack?.id===id) toggleAudio(); else playTrack(track, allPlaylists().find(playlist => playlist.trackIds?.includes(id)) || null); }
function shuffledTracks(playlist) { const tracks=(playlist?.trackIds||[]).map(selectedTrack).filter(Boolean); for(let i=tracks.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tracks[i],tracks[j]]=[tracks[j],tracks[i]];} return tracks; }
function playPlaylist(id) { const playlist=allPlaylists().find(item=>item.id===id); const queue=shuffledTracks(playlist); if(queue.length){state.playlistQueues[playlist.id]=queue.slice(1);playTrack(queue[0],playlist);} else toast('Playlistul nu are încă piese disponibile.'); }
function playNextTrack() { if (!state.currentPlaylist) return; let queue=state.playlistQueues[state.currentPlaylist.id]||[]; if(!queue.length) queue=shuffledTracks(state.currentPlaylist); const next=queue.shift(); state.playlistQueues[state.currentPlaylist.id]=queue; const duck=state.library?.soundEffects?.find(effect=>effect.id==='duck'); if(next&&duck?.src&&Math.random()<.3)playEffectAudio(duck.src,.75); if(next)playTrack(next,state.currentPlaylist); }
function toggleAudio() { if(!state.currentTrack)return; audio.paused ? audio.play().catch(()=>{}) : audio.pause(); render(); }

function savePlaylist(event) {
  event.preventDefault(); const form=new FormData(event.currentTarget); const title=String(form.get('title')||'').trim(); const trackIds=form.getAll('trackIds'); if(!title||!trackIds.length){toast('Alege un nume și cel puțin o piesă.');return;} state.customPlaylists.push({id:`custom-${Date.now()}`,title,occasion:'Playlist personalizat',trackIds}); saveJson(PLAYLIST_KEY,state.customPlaylists); state.sheet=''; render(); toast('Playlist salvat.');
}

function getAudioContext(){const Context=window.AudioContext||window.webkitAudioContext;getAudioContext.context ||= new Context();if(getAudioContext.context.state==='suspended')getAudioContext.context.resume();return getAudioContext.context;}
function tone(frequency,duration,type='sine',delay=0,volume=.1){const context=getAudioContext();const oscillator=context.createOscillator();const gain=context.createGain();const at=context.currentTime+delay;oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(gain).connect(context.destination);oscillator.start(at);oscillator.stop(at+duration+.03);}
function playEffect(id){const effect=state.library.soundEffects.find(item=>item.id===id);if(!effect)return;if(effect.src){playEffectAudio(effect.src,.9);if(id==='duck')setTimeout(()=>playEffectAudio(effect.src,1),100);}else if(id==='applause')[0,.09,.18,.27].forEach(delay=>tone(180,.1,'triangle',delay,.12));else if(id==='victory'){tone(523,.16,'sine');tone(659,.16,'sine',.12);tone(784,.34,'sine',.24);}else if(id==='gong'){tone(110,1.1,'sine',0,.18);tone(220,.7,'triangle',0,.05);}else if(id==='quiet'){tone(880,.3,'sine');tone(660,.5,'sine',.22,.07);}else{tone(240,.12,'triangle');tone(190,.2,'triangle',.13);}flash(effect.icon);}
function playEffectAudio(src,volume){const sound=new Audio(src);sound.volume=volume;sound.play().catch(()=>{});}
function flash(icon){const element=document.createElement('div');element.className='reaction-flash';element.textContent=icon;document.body.appendChild(element);setTimeout(()=>element.remove(),780);}

function startTimerInterval(){clearInterval(state.timerId);state.timerId=setInterval(()=>{state.timerSeconds-=1;updateTimerDOM();if(state.timerSeconds<=0){clearTimer(false);playEffect('gong');toast('Timpul s-a terminat.');updateTimerDOM();}},1000);}
function updateTimerDOM(){root.querySelectorAll('[data-timer-display]').forEach(element=>{element.textContent=formatTime(state.timerSeconds)||'0:00';});root.querySelectorAll('.timer-banner').forEach(element=>{element.classList.toggle('is-running',state.timerRunning);});}
function setTimer(seconds){clearInterval(state.timerId);state.timerInitial=seconds;state.timerSeconds=seconds;state.timerRunning=true;state.sheet='';startTimerInterval();render();}
function toggleTimer(){if(state.timerRunning){clearInterval(state.timerId);state.timerId=null;state.timerRunning=false;}else{if(!state.timerSeconds)state.timerSeconds=state.timerInitial;state.timerRunning=true;startTimerInterval();}render();}
function clearTimer(reset=true){clearInterval(state.timerId);state.timerId=null;state.timerRunning=false;if(reset){state.timerSeconds=0;state.timerInitial=0;}}
function formatTime(seconds){if(!seconds)return'';return`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}

async function openChallenge(){state.sheet='';await requestMotionPermission();nextChallenge();}
function nextChallenge(){const items=state.challengeDecks[0]?.items||[];if(!items.length){toast('Nu există încă provocări în Bibliotecă.');return;}if(state.shownChallenges.size>=items.length)state.shownChallenges.clear();let index;do{index=Math.floor(Math.random()*items.length);}while(state.shownChallenges.has(index)&&items.length>1);state.shownChallenges.add(index);state.challenge=items[index];render();}
function closeChallenge(){state.challenge=null;render();}
async function openColorGame(){await requestMotionPermission();state.colorGame={phase:'setup'};render();}
function closeColorGame(){state.colorGame=null;render();}
function bindColorOverlay(){const overlay=root.querySelector('[data-color-overlay]');if(!overlay)return;let startY=0,currentY=0,moved=false;overlay.addEventListener('pointerdown',event=>{startY=event.clientY;currentY=startY;moved=false;overlay.setPointerCapture?.(event.pointerId);overlay.classList.add('is-dragging');});overlay.addEventListener('pointermove',event=>{if(!startY)return;currentY=event.clientY;const distance=Math.max(0,currentY-startY);if(distance>8)moved=true;overlay.style.transform=`translateY(${distance}px)`;overlay.style.opacity=String(Math.max(.55,1-distance/500));});overlay.addEventListener('pointerup',event=>{const distance=Math.max(0,currentY-startY);startY=0;overlay.classList.remove('is-dragging');if(distance>=80){closeColorGame();return;}overlay.style.transform='';overlay.style.opacity='';if(!moved){state.colorGame={phase:'waiting',ready:true};render();revealColor();}});overlay.addEventListener('pointercancel',()=>{startY=0;overlay.classList.remove('is-dragging');overlay.style.transform='';overlay.style.opacity='';});}
async function prepareColorVoices(){await Promise.all(['Sunteți gata?','Trei!','Doi!','Unu!','O jumătate!'].map(async text=>{if(colorVoiceClips.has(text))return;const response=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(!response.ok)throw new Error('TTS');colorVoiceClips.set(text,URL.createObjectURL(await response.blob()));}));}
async function playColorVoice(text){const src=colorVoiceClips.get(text);if(!src){await speak(text);return;}const played=await new Promise(resolve=>{const sound=new Audio(src);sound.playbackRate=.82;sound.addEventListener('ended',()=>resolve(true),{once:true});sound.addEventListener('error',()=>resolve(false),{once:true});sound.play().catch(()=>resolve(false));});if(!played)await speak(text);}
async function startColorGame(){const selected=[...root.querySelectorAll('[data-color-option]:checked')].map(input=>input.value);if(!selected.length){toast('Alege cel puțin o culoare.');return;}state.colorOptions=selected;state.colorGame={phase:'waiting',ready:false};render();try{await prepareColorVoices();if(state.colorGame?.phase==='waiting'){state.colorGame.ready=true;render();}}catch{if(state.colorGame?.phase==='waiting'){state.colorGame.ready=true;render();toast('Vocea nu s-a putut pregăti. Countdown-ul va continua vizual.');}}}
async function revealColor(){if(!state.colorGame||state.colorGame.phase!=='waiting'||!state.colorGame.ready)return;const color=state.colorOptions[Math.floor(Math.random()*state.colorOptions.length)];state.colorGame={phase:'countdown',count:'Gata?'};render();await playColorVoice('Sunteți gata?');await new Promise(resolve=>setTimeout(resolve,900));const sequence=[[3,'Trei!',1100],[2,'Doi!',1100],[1,'Unu!',1200]];if(Math.random()<.28)sequence.push(['½','O jumătate!',1800]);for(const [count,word,pause] of sequence){state.colorGame={phase:'countdown',count};render();await playColorVoice(word);await new Promise(resolve=>setTimeout(resolve,pause));}const effects=['color-pop','color-spin','color-burst'];state.colorGame={phase:'color',color,effect:effects[Math.floor(Math.random()*effects.length)]};render();}
async function requestMotionPermission(){try{if(typeof window.DeviceMotionEvent?.requestPermission==='function')await window.DeviceMotionEvent.requestPermission();}catch{}}
let lastShake=0;window.addEventListener('devicemotion',event=>{if(!state.challenge)return;const a=event.accelerationIncludingGravity;if(!a)return;const force=Math.hypot(a.x||0,a.y||0,a.z||0);if(force>18&&Date.now()-lastShake>1200){lastShake=Date.now();nextChallenge();}});

async function speak(value){
  if(!value)return;
  voiceAudio?.pause();
  if(voiceUrl){URL.revokeObjectURL(voiceUrl);voiceUrl='';}
  try{
    const response=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value})});
    if(!response.ok)throw new Error('TTS');
    voiceUrl=URL.createObjectURL(await response.blob());
    voiceAudio=new Audio(voiceUrl);
    voiceAudio.addEventListener('ended',()=>{if(voiceUrl){URL.revokeObjectURL(voiceUrl);voiceUrl='';}} ,{once:true});
    await voiceAudio.play();
  }catch{toast('Vocea ElevenLabs nu a putut porni.');}
}
function toast(message, action){document.querySelector('.toast')?.remove();const element=document.createElement(action?'button':'div');element.className='toast';element.type='button';element.innerHTML=`<span>${esc(message)}</span>${action?'<b>Adăugată ✓</b>':''}`;if(action)element.addEventListener('click',()=>{element.remove();action();});document.body.appendChild(element);setTimeout(()=>element.remove(),4500);}

function showInstallPrompt(){
  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  if(standalone||sessionStorage.getItem('becky-install-prompt-dismissed'))return;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const overlay=document.createElement('div');overlay.className='install-overlay';overlay.innerHTML=`<section class="install-card" role="dialog" aria-modal="true"><button class="install-close" type="button" aria-label="Închide">×</button><div class="install-mark">✦</div><span class="eyebrow">ACTIVITĂȚI BECKY</span><h2>Instalează aplicația</h2><p>Ai toate activitățile, muzica și instrumentele Becky la îndemână, direct de pe telefon.</p>${ios?'<div class="install-ios-steps"><b>Pe iPhone:</b><span>1. Apasă butonul Share din Safari</span><span>2. Alege „Add to Home Screen”</span><span>3. Apasă „Add”</span></div>':'<button class="primary install-action" type="button">Instalează Activități Becky</button>'}<button class="install-later" type="button">Mai târziu</button></section>`;document.body.appendChild(overlay);
  const close=()=>{sessionStorage.setItem('becky-install-prompt-dismissed','1');overlay.remove();};overlay.querySelector('.install-close').onclick=close;overlay.querySelector('.install-later').onclick=close;
  overlay.querySelector('.install-action')?.addEventListener('click',async()=>{if(!deferredInstallPrompt){toast('În Chrome, deschide meniul ⋮ și alege „Install app”.');return;}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;close();});
}

async function init(){
  try{
    const payload=await loadLibrary(); const children=payload.workspaces?.find(item=>item.id==='children')||{}; state.library={soundEffects:children.soundEffects||[]}; state.activities=(children.activities||[]).filter(activityComplete); state.challengeDecks=children.challengeDecks||[]; state.musicTracks=children.musicTracks||[]; state.playlists=children.playlists||[]; state.activityPlaylists=children.activityPlaylists||[]; if(!state.activityPlaylists.some(list=>list.id==='today'))state.activityPlaylists=[{id:'today',title:'De încercat azi',activityIds:[]},...state.activityPlaylists]; audio.volume=Number(localStorage.getItem(VOLUME_KEY)||.35);
    const params=new URLSearchParams(location.search); const requested=params.get('activity_id'); const requestedView=params.get('view'); if(['home','games','music','tools'].includes(requestedView))state.view=requestedView; if(requested&&state.activities.some(item=>item.id===requested)){state.selectedActivity=state.activities.find(item=>item.id===requested);state.view='detail';}
    render();
    setTimeout(showInstallPrompt,250);
  }catch(error){if(error.code==='AUTH'){root.innerHTML='<div class="app-loading"><span>✦</span><strong>Biblioteca Becky este protejată.</strong></div>';showLogin();return;}root.innerHTML=`<div class="app-loading"><span>♡</span><strong>${esc(error.message)}</strong></div>`;}
}

let audioRecoveryTimer=0;function recoverPlaylistAudio(){if(!state.currentPlaylist||audio.paused===false)return;clearTimeout(audioRecoveryTimer);audioRecoveryTimer=setTimeout(()=>{if(state.currentPlaylist&&audio.paused){if(audio.error)playNextTrack();else audio.play().catch(()=>playNextTrack());}},350);}
audio.addEventListener('play',()=>{restoreAudioVolume();updateAudioControls();}); audio.addEventListener('pause',updateAudioControls); audio.addEventListener('timeupdate',()=>{updateAudioProgress();softenTrackEnding();}); audio.addEventListener('loadedmetadata',updateAudioProgress); audio.addEventListener('ended',()=>{restoreAudioVolume();setTimeout(playNextTrack,120);}); audio.addEventListener('error',recoverPlaylistAudio); audio.addEventListener('stalled',recoverPlaylistAudio);
function updateAudioControls(){root.querySelectorAll('[data-toggle-audio]').forEach(button=>{button.textContent=audio.paused?'▶':'Ⅱ';button.setAttribute('aria-label',audio.paused?'Pornește':'Pauză');});}
function updateAudioProgress(){if(!state.currentTrack)return;const percent=audio.duration?Math.min(100,(audio.currentTime/audio.duration)*100):0;root.querySelectorAll(`[data-track-progress="${CSS.escape(state.currentTrack.id)}"]`).forEach(bar=>{bar.style.width=`${percent}%`;});root.querySelectorAll('[data-now-playing-progress]').forEach(bar=>{bar.style.width=`${percent}%`;});}
function restoreAudioVolume(){audio.volume=Number(localStorage.getItem(VOLUME_KEY)||.35);}
function softenTrackEnding(){if(!audio.duration||audio.paused)return;const fadeDuration=1.8;const remaining=audio.duration-audio.currentTime;if(remaining<fadeDuration){const normalVolume=Number(localStorage.getItem(VOLUME_KEY)||.35);audio.volume=Math.max(0,normalVolume*(remaining/fadeDuration));}}
init();
