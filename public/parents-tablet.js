const root = document.getElementById('parents-app');
const MODERN_BRAND_LOGO = '/assets/logo/new_logo_horizontal.png';
function modernizeLegacyLogos() {
  root.querySelectorAll('img[src="/assets/logo_sun.png"], img[src="/assets/logo_sun_square.png"]').forEach(image => {
    image.src = MODERN_BRAND_LOGO;
    image.alt ||= 'Becky’s Garden';
  });
}
new MutationObserver(modernizeLegacyLogos).observe(root, { childList: true, subtree: true });
const SESSION_KEY = 'becky-parents-session';
const EVENTS_KEY = 'becky-parents-events:v2';
const COMPLETED_ACTIVITIES_KEY = 'becky-parents-completed-activities:v1';
const ACTIVITY_PROGRESS_KEY = 'becky-parents-activity-progress:v1';
const HIDE_COMPLETED_ACTIVITIES_KEY = 'becky-parents-hide-completed:v1';
const PARENT_PROFILE_KEY = 'becky-parents-profile:v1';
const PARENT_PROFILES_KEY = 'becky-parents-profiles:v1';
const TV_INSTALL_DISMISSED_KEY = 'becky-parents-tv-install-dismissed:v1';
const GROUP_SIZE_KEY = 'becky-parents-group-size:v1';
const ACTIVE_ACTIVITY_ORDER = ['recunoaste-ti-animalul', 'ai-prefera', 'intrebari-amuzante', 'intrebari-profunde', 'mini-quiz-general', 'reproduceti-sunetul', 'intrarea-dramatica', 'dans-schimbare-lider', 'karaoke', 'dans'];
const LOCKED_ACTIVITY_START = ACTIVE_ACTIVITY_ORDER.indexOf('mini-quiz-general');
function isActivityLocked(item) { return ACTIVE_ACTIVITY_ORDER.indexOf(item?.id) >= LOCKED_ACTIVITY_START; }
function activityLockMarkup(item) { return isActivityLocked(item) ? '<span class="activity-lock-overlay" aria-hidden="true"><span>🔒</span><small>În curând</small></span>' : ''; }
function makeSessionId() { return window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

let activities = [];
let musicTracks = [];
let active = null;
let selectedGroupSize = localStorage.getItem(GROUP_SIZE_KEY) === 'large' ? 'large' : 'small';
let musicGameAudio = null;
let musicGameTimer = null;
let musicGameTransition = null;
let musicGameRunToken = 0;
let musicGameQueue = [];
let lastMusicTrackId = null;
let musicGameAutoRunning = false;
let animalAudio = null;
let animalRoundQueue = [];
let animalQueueActivityId = null;
let animalScore = { correct: 0, wrong: 0 };
let parentProfileUsername = localStorage.getItem(PARENT_PROFILE_KEY) || '';
let completionReturnId = null;
let deferredInstallPrompt = null;
const sessionId = sessionStorage.getItem(SESSION_KEY) || makeSessionId();
sessionStorage.setItem(SESSION_KEY, sessionId);

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function cardTitleMarkup(title) {
  const words = String(title ?? '').trim().split(/\s+/);
  if (words.length < 2) return esc(title);
  let splitAt = 1;
  let bestDifference = Infinity;
  for (let index = 1; index < words.length; index += 1) {
    const firstLength = words.slice(0, index).join(' ').length;
    const secondLength = words.slice(index).join(' ').length;
    const difference = Math.abs(firstLength - secondLength);
    if (difference < bestDifference) { bestDifference = difference; splitAt = index; }
  }
  return `<span class="title-line">${esc(words.slice(0, splitAt).join(' '))}</span><span class="title-line">${esc(words.slice(splitAt).join(' '))}</span>`;
}
function responsiveTextClass(text) { const length = String(text ?? '').length; return length > 230 ? 'is-text-very-long' : length > 170 ? 'is-text-long' : length > 120 ? 'is-text-medium' : ''; }
function fitQuestionText(element) {
  if (!element || !window.matchMedia('(orientation: landscape) and (min-aspect-ratio: 3/2)').matches) return;
  let size = parseFloat(getComputedStyle(element).fontSize) || 48;
  const content = element.closest('.question-content');
  const maxHeight = Math.max(230, window.innerHeight - 104);
  while (content && content.getBoundingClientRect().height > maxHeight && size > 22) { size -= 2; element.style.fontSize = `${size}px`; }
}

function supportsGroupSize(item, groupSize = selectedGroupSize) {
  return !Array.isArray(item.groupSizes) || item.groupSizes.includes(groupSize);
}

function isLargeGroupOnly(item) {
  return Array.isArray(item.groupSizes) && item.groupSizes.length === 1 && item.groupSizes[0] === 'large';
}

function prefersLargeGroup(item) {
  return item.preferredGroupSize === 'large' && supportsGroupSize(item, 'small') && supportsGroupSize(item, 'large');
}

function compareActivitiesForGroup(first, second) {
  if (selectedGroupSize === 'large') {
    const priority = item => isLargeGroupOnly(item) ? 0 : prefersLargeGroup(item) ? 1 : 2;
    const groupDifference = priority(first) - priority(second);
    if (groupDifference) return groupDifference;
    return ACTIVE_ACTIVITY_ORDER.indexOf(second.id) - ACTIVE_ACTIVITY_ORDER.indexOf(first.id);
  }
  return ACTIVE_ACTIVITY_ORDER.indexOf(first.id) - ACTIVE_ACTIVITY_ORDER.indexOf(second.id);
}

function groupSizeToggleMarkup() {
  return `<div class="group-size-filter"><div class="group-size-toggle ${selectedGroupSize === 'large' ? 'is-large' : ''}" role="group" aria-label="Numărul de persoane"><span class="group-size-thumb" aria-hidden="true"></span><button type="button" data-group-size="small" aria-pressed="${selectedGroupSize === 'small'}">Două–trei persoane</button><button type="button" data-group-size="large" aria-pressed="${selectedGroupSize === 'large'}">Grup extins <small>4+</small></button></div></div>`;
}

function bindGroupSizeToggle(container, onChange) {
  container.querySelectorAll('[data-group-size]').forEach(button => button.onclick = () => {
    const nextSize = button.dataset.groupSize;
    if (nextSize === selectedGroupSize) return;
    selectedGroupSize = nextSize;
    localStorage.setItem(GROUP_SIZE_KEY, selectedGroupSize);
    track('group_size_changed', { group_size: selectedGroupSize });
    onChange?.();
  });
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
}

function completedActivityIds() { return readJson(COMPLETED_ACTIVITIES_KEY, []); }
function knownParentProfiles() { return [...new Set([...(readJson(PARENT_PROFILES_KEY, [])), parentProfileUsername].filter(Boolean))]; }
function rememberParentProfile(username) { localStorage.setItem(PARENT_PROFILES_KEY, JSON.stringify([...new Set([...knownParentProfiles(), username])])); }
function activityProgress() { return readJson(ACTIVITY_PROGRESS_KEY, {}); }
function activityResumeIndex(id) { const saved = activityProgress()[id]; const index = Number(saved && typeof saved === 'object' ? saved.batch_index : saved); return Number.isInteger(index) && index >= 0 ? index : 0; }
function saveActivityResumeIndex(id, index) { localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify({ ...activityProgress(), [id]: index })); }
function clearActivityResumeIndex(id) { const progress = activityProgress(); delete progress[id]; localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify(progress)); }
function animalSavedProgress(id) { const saved = activityProgress()[id]; return saved && typeof saved === 'object' ? saved : {}; }
function saveAnimalProgress(id, progress) { localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify({ ...activityProgress(), [id]: progress })); }
const WOULD_YOU_RATHER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
function shuffleList(list) { const result = [...list]; for (let index = result.length - 1; index > 0; index -= 1) { const swapIndex = Math.floor(Math.random() * (index + 1)); [result[index], result[swapIndex]] = [result[swapIndex], result[index]]; } return result; }
function saveActivityProgress(id, progress) { localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify({ ...activityProgress(), [id]: progress })); }
function wouldYouRatherBatch(item) {
  const pool = Array.isArray(item.questions) ? item.questions : [];
  const saved = activityProgress()[item.id];
  const completedAt = saved?.completed_at ? Date.parse(saved.completed_at) : 0;
  if (Array.isArray(saved?.batch) && saved.batch.length === 6 && saved.batch.every(question => pool.includes(question)) && (!completedAt || Date.now() - completedAt < WOULD_YOU_RATHER_COOLDOWN_MS)) return saved.batch;
  let used = Array.isArray(saved?.used_questions) ? saved.used_questions : [];
  let available = pool.filter(question => !used.includes(question));
  if (available.length < 6) { used = []; available = [...pool]; }
  const buckets = [0, 1, 2, 3].map(bucket => available.slice(bucket * 6, bucket * 6 + 6));
  const packPlan = Array.isArray(saved?.pack_plan) && saved.pack_plan.length === 4 ? saved.pack_plan : shuffleList([[0, 1], [2, 3], [0, 2], [1, 3]]);
  const packIndex = Math.floor(used.length / 6) % 4;
  const firstFromEachBucket = buckets.filter(bucket => bucket.length).map(bucket => shuffleList(bucket)[0]);
  const extras = (packPlan[packIndex] || [0, 1]).map(bucketIndex => shuffleList(buckets[bucketIndex].filter(question => !firstFromEachBucket.includes(question)))[0]).filter(Boolean);
  const batch = shuffleList([...firstFromEachBucket, ...extras]).slice(0, 6);
  saveActivityProgress(item.id, { used_questions: [...used, ...batch], batch, batch_index: 0, completed_at: null, pack_plan: packPlan });
  return batch;
}
function funnyQuestionCatalog(item) {
  const questions = Array.isArray(item.questionPool?.questions) ? item.questionPool.questions : (item.questionSets || []).flat();
  return questions.filter(question => question?.id && question?.text);
}
function balancedQuestionCycle(item, previousIds = []) {
  const catalog = funnyQuestionCatalog(item);
  const cycleSize = Math.min(Number(item.questionPool?.cycleSize) || catalog.length, catalog.length);
  const previous = new Set(previousIds);
  const tiers = ['safe', 'medium', 'wildcard'];
  const perTier = Math.floor(cycleSize / tiers.length);
  const selected = Object.fromEntries(tiers.map(tier => {
    const values = catalog.filter(question => question.tier === tier);
    const fresh = shuffleList(values.filter(question => !previous.has(question.id)));
    const repeated = shuffleList(values.filter(question => previous.has(question.id)));
    return [tier, [...fresh, ...repeated].slice(0, perTier)];
  }));
  const sets = Array.from({ length: perTier }, (_, index) => shuffleList(tiers.map(tier => selected[tier][index]).filter(Boolean).map(question => question.id)));
  const selectedIds = new Set(sets.flat());
  const missing = cycleSize - selectedIds.size;
  if (missing > 0) {
    const extras = shuffleList(catalog.filter(question => !selectedIds.has(question.id))).slice(0, missing);
    extras.forEach((question, index) => sets[index % Math.max(sets.length, 1)]?.push(question.id));
  }
  return sets;
}
function freshFunnyState(item, previous = {}) {
  const catalog = funnyQuestionCatalog(item);
  const byId = new Set(catalog.map(question => question.id));
  const configuredSets = Array.isArray(item.questionPool?.initialSets) ? item.questionPool.initialSets.map(set => set.filter(id => byId.has(id))) : [];
  const firstCycle = !Array.isArray(previous.cycle_ids) || !previous.cycle_ids.length;
  const pendingSets = firstCycle && configuredSets.length ? configuredSets : balancedQuestionCycle(item, previous.cycle_ids || []);
  const cycleIds = [...new Set(pendingSets.flat())];
  return { version: 3, cycle_ids: cycleIds, remaining: cycleIds, deferred: [], current: [], pending_sets: pendingSets, turn: 0, cycle_number: (Number(previous.cycle_number) || 0) + 1, completed_at: null };
}
function funnyState(item) {
  const catalog = funnyQuestionCatalog(item);
  const saved = activityProgress()[item.id];
  const cooldownMs = (Number(item.questionPool?.cooldownHours) || 24) * 60 * 60 * 1000;
  if (saved?.completed_at && Date.now() - Date.parse(saved.completed_at) >= cooldownMs) return item.questionPool ? freshFunnyState(item, saved) : { version: 2, remaining: catalog.map(question => question.id), deferred: [], current: [], turn: 0, completed_at: null };
  if (item.questionPool && saved?.version === 3 && Array.isArray(saved.cycle_ids) && saved.cycle_ids.every(id => catalog.some(question => question.id === id))) {
    const current = Array.isArray(saved.current) ? saved.current.filter(id => catalog.some(question => question.id === id)) : [];
    const pendingSets = Array.isArray(saved.pending_sets) ? saved.pending_sets.map(set => set.filter(id => catalog.some(question => question.id === id))).filter(set => set.length) : [];
    return { ...saved, current, pending_sets: pendingSets };
  }
  if (saved?.version === 2 && Array.isArray(saved.remaining) && saved.remaining.every(id => catalog.some(question => question.id === id))) {
    const current = Array.isArray(saved.current) ? saved.current.map(question => typeof question === 'object' ? question.id : question).filter(id => catalog.some(question => question.id === id)) : [];
    return { ...saved, current };
  }
  return item.questionPool ? freshFunnyState(item) : { version: 2, remaining: catalog.map(question => question.id), deferred: [], current: [], turn: 0, completed_at: null };
}
function saveFunnyState(item, state) { saveActivityProgress(item.id, state); }
function createFunnySet(item) {
  const catalog = funnyQuestionCatalog(item);
  const byId = new Map(catalog.map(question => [question.id, question]));
  const state = funnyState(item);
  if (Array.isArray(state.pending_sets) && state.pending_sets.length) {
    const [nextSet, ...pendingSets] = state.pending_sets;
    const selected = nextSet.map(id => byId.get(id)).filter(question => question && state.remaining.includes(question.id));
    if (selected.length) {
      state.current = shuffleList(selected).map(question => question.id);
      state.pending_sets = pendingSets;
      saveFunnyState(item, state);
      return state.current.map(id => byId.get(id)).filter(Boolean);
    }
    state.pending_sets = pendingSets;
  }
  const eligibleDeferred = state.deferred.filter(question => question.available_after <= state.turn).map(question => question.id);
  const deferredIds = new Set(state.deferred.map(question => question.id));
  const candidates = [...new Set([...state.remaining.filter(id => !deferredIds.has(id)), ...eligibleDeferred])].map(id => byId.get(id)).filter(Boolean);
  let available = candidates;
  if (available.length < 3 && state.deferred.length) { state.turn = Math.max(state.turn, Math.min(...state.deferred.map(question => question.available_after))); available = [...new Set([...state.remaining, ...state.deferred.map(question => question.id)])].map(id => byId.get(id)).filter(Boolean); }
  const selected = ['safe', 'medium', 'wildcard'].map(tier => shuffleList(available.filter(question => question.tier === tier))[0]).filter(Boolean);
  if (selected.length < Math.min(3, available.length)) selected.push(...shuffleList(available.filter(question => !selected.includes(question))).slice(0, Math.min(3, available.length) - selected.length));
  state.current = shuffleList(selected).map(question => question.id);
  saveFunnyState(item, { ...state, version: 2 });
  return state.current.map(id => byId.get(id)).filter(Boolean);
}
function renderFunnyQuestions(item) {
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  const catalog = funnyQuestionCatalog(item);
  const byId = new Map(catalog.map(question => [question.id, question]));
  let state = funnyState(item);
  if (state.completed_at && Date.now() - Date.parse(state.completed_at) < WOULD_YOU_RATHER_COOLDOWN_MS) { renderLibrary(); return; }
  let current = (state.current || []).map(id => byId.get(id)).filter(Boolean);
  if (current.length !== 3) current = createFunnySet(item);
  state = funnyState(item);
  const cycleIds = Array.isArray(state.cycle_ids) && state.cycle_ids.length ? state.cycle_ids : catalog.map(question => question.id);
  const answered = cycleIds.length - state.remaining.length;
  root.innerHTML = `<main class="funny-experience"><button class="question-back" type="button" data-funny-back>← Activități</button><div class="funny-content"><small class="funny-count">${answered} din ${cycleIds.length} întrebări explorate</small><h1>${esc(item.title)}</h1><p class="funny-intro">Alegeți una și povestiți. Dacă niciuna nu vă surâde, apăsați „Pas” și primiți alte trei.</p><div class="funny-options">${current.map(question => `<button type="button" class="funny-option ${responsiveTextClass(question.text)}" data-funny-id="${esc(question.id)}"><small class="funny-option-number">${String(catalog.findIndex(value => value.id === question.id) + 1).padStart(2, '0')}</small><span>${esc(question.text)}</span></button>`).join('')}</div><button type="button" class="funny-skip" data-funny-skip>Pas — alte trei</button></div>${activityDockMarkup(item)}</main>`;
  root.querySelector('[data-funny-back]').onclick = () => { state.current = current.map(question => question.id); saveFunnyState(item, state); renderLibrary(); };
  let funnyAdvancing = false;
  const advance = selectedId => {
    if (funnyAdvancing) return;
    funnyAdvancing = true;
    const nextState = funnyState(item);
    const currentIds = current.map(question => question.id);
    const buttons = [...root.querySelectorAll('[data-funny-id]')];
    if (selectedId) {
      const selectedIndex = buttons.findIndex(value => value.dataset.funnyId === selectedId);
      buttons.forEach((button, index) => button.classList.add(button.dataset.funnyId === selectedId ? 'is-selected-leaving' : index < selectedIndex ? 'is-fading-left' : 'is-fading-right'));
    } else buttons.forEach((button, index) => button.classList.add(index % 2 ? 'is-fading-right' : 'is-fading-left'));
    setTimeout(() => {
      if (selectedId) nextState.remaining = nextState.remaining.filter(id => id !== selectedId);
      nextState.version = item.questionPool ? 3 : 2;
      nextState.deferred = [...nextState.deferred.filter(question => !currentIds.includes(question.id)), ...currentIds.filter(id => id !== selectedId).map(id => ({ id, available_after: nextState.turn + 2 + Math.floor(Math.random() * 2) }))];
      nextState.turn += 1;
      nextState.current = [];
      if (nextState.remaining.length === 0 && nextState.deferred.length === 0) {
        nextState.completed_at = new Date().toISOString();
        saveFunnyState(item, nextState);
        markActivityComplete(item.id);
        completionReturnId = item.id;
        renderLibrary();
        return;
      }
      saveFunnyState(item, nextState);
      renderFunnyQuestions(item);
    }, 560);
  };
  root.querySelectorAll('[data-funny-id]').forEach(button => button.onclick = () => advance(button.dataset.funnyId));
  root.querySelector('[data-funny-skip]').onclick = () => advance(null);
  bindActivityDock(item);
}
function markActivityComplete(id) {
  const completed = completedActivityIds();
  if (!completed.includes(id)) localStorage.setItem(COMPLETED_ACTIVITIES_KEY, JSON.stringify([...completed, id]));
}
function activityCompletionBadge(item) {
  return completedActivityIds().includes(item.id) && !((item.id === 'intrebari-amuzante' || item.questionPool) && !activityCooldownActive(item)) ? '<span class="activity-completed-badge" aria-label="Activitate completată">✓</span>' : '';
}
function hideCompletedActivities() { return localStorage.getItem(HIDE_COMPLETED_ACTIVITIES_KEY) !== 'false'; }
function activityCooldownActive(item) { const saved = activityProgress()[item.id]; const completedAt = saved?.completed_at ? Date.parse(saved.completed_at) : 0; const cooldownMs = (Number(item.questionPool?.cooldownHours) || 24) * 60 * 60 * 1000; return (item.id === 'intrebari-amuzante' || Boolean(item.questionPool)) && completedAt > 0 && Date.now() - completedAt < cooldownMs; }
function activityIsVisible(item) { return !hideCompletedActivities() || !completedActivityIds().includes(item.id) || ((item.id === 'intrebari-amuzante' || item.questionPool) && !activityCooldownActive(item)); }
function parentProgressSnapshot() { return { completed_activity_ids: completedActivityIds(), activity_progress: activityProgress(), hide_completed_activities: hideCompletedActivities(), group_size: selectedGroupSize, last_activity_id: active?.id || null, saved_at: new Date().toISOString() }; }
function applyParentProgress(progress) {
  if (!progress || typeof progress !== 'object') return;
  if (Array.isArray(progress.completed_activity_ids)) localStorage.setItem(COMPLETED_ACTIVITIES_KEY, JSON.stringify(progress.completed_activity_ids));
  if (progress.activity_progress && typeof progress.activity_progress === 'object') localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify(progress.activity_progress));
  if (typeof progress.hide_completed_activities === 'boolean') localStorage.setItem(HIDE_COMPLETED_ACTIVITIES_KEY, String(progress.hide_completed_activities));
  if (progress.group_size === 'small' || progress.group_size === 'large') { selectedGroupSize = progress.group_size; localStorage.setItem(GROUP_SIZE_KEY, selectedGroupSize); }
  if (progress.last_activity_id) localStorage.setItem('becky-parents-last-activity:v1', progress.last_activity_id); else localStorage.removeItem('becky-parents-last-activity:v1');
}
async function getParentProgress(username) { const response = await fetch(`/api/parents/progress?username=${encodeURIComponent(username)}`); if (!response.ok) throw new Error('Progresul nu a putut fi citit'); return response.json(); }
async function saveParentProgress(username, progress) { const response = await fetch('/api/parents/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, progress }) }); if (!response.ok) throw new Error('Progresul nu a putut fi salvat'); return response.json(); }
async function deleteParentProgress(username) { const response = await fetch(`/api/parents/progress?username=${encodeURIComponent(username)}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Progresul nu a putut fi resetat'); }
async function restoreSavedParentProgress() { if (!parentProfileUsername) return; try { const row = await getParentProgress(parentProfileUsername); if (row.progress) applyParentProgress(row.progress); } catch { /* local progress remains available */ } }

function track(eventName, extra = {}) {
  const item = {
    surface: 'parents', session_id: sessionId, event_name: eventName,
    experience_id: active?.id || null,
    occurred_at: new Date().toISOString(), app_version: 'parents-voice-1', ...extra
  };
  const queue = readJson(EVENTS_KEY, []);
  queue.push(item);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(queue.slice(-150)));
}
async function saveParentQuestionFeedback(payload) {
  try {
    const response = await fetch('/api/parents/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error('feedback failed');
  } catch {
    const fallback = readJson('becky-parents-feedback-pending:v1', []);
    fallback.push({ ...payload, pending: true, created_at: new Date().toISOString() });
    localStorage.setItem('becky-parents-feedback-pending:v1', JSON.stringify(fallback.slice(-100)));
  }
}

function registerParentsPwa() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/parents-sw.js', { scope: '/parinti' }).catch(() => {});
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });
}

function showInstallModal() {
  const isInstalledPwa = window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;
  if (isInstalledPwa || sessionStorage.getItem(TV_INSTALL_DISMISSED_KEY)) return;
  const androidTv = /android|google tv|googletv|aft|crkey/i.test(navigator.userAgent);
  const directInstall = Boolean(deferredInstallPrompt);
  const instructions = directInstall
    ? 'Apăsați butonul de mai jos. Becky se va adăuga pe ecranul principal al televizorului.'
    : androidTv
      ? 'Din meniul browserului alegeți „Install app” sau „Add to Home screen”. Dacă opțiunea nu apare, televizorul nu permite instalarea PWA din acest browser.'
      : 'Din meniul browserului televizorului alegeți „Adaugă la ecranul principal” / „Add to Home screen”. Disponibilitatea depinde de modelul televizorului.';
  const modal = document.createElement('div');
  modal.className = 'tv-install-overlay';
  modal.innerHTML = `<section class="tv-install-modal" role="dialog" aria-modal="true" aria-labelledby="tv-install-title"><img src="/assets/logo_sun_square.png" alt=""><span class="eyebrow">BECKY’S GARDEN</span><h2 id="tv-install-title">Instalează Becky pe TV</h2><p data-tv-install-copy>${instructions}</p><ol class="tv-install-steps" data-tv-install-steps hidden><li>Deschideți meniul browserului cu butonul ⋮.</li><li>Alegeți „Install app” sau „Add to Home screen”.</li><li>Confirmați cu OK și porniți Becky din ecranul principal.</li></ol><div class="tv-install-actions">${directInstall ? '<button class="primary" data-tv-install>Instalează aplicația</button>' : '<button class="primary" data-tv-install-help>Arată pașii</button>'}<button class="tv-install-later" type="button" data-tv-install-close>Continuă în browser</button></div></section>`;
  document.body.appendChild(modal);
  modal.querySelector('h2').textContent = 'Instalează Becky';
  modal.querySelector('[data-tv-install-copy]').textContent = directInstall
    ? 'Adăugați Becky pe ecranul principal pentru o experiență fără bara browserului.'
    : 'Din meniul browserului alegeți „Install app” sau „Add to Home screen”.';
  const close = () => { sessionStorage.setItem(TV_INSTALL_DISMISSED_KEY, '1'); modal.remove(); };
  modal.querySelector('[data-tv-install-close]').onclick = close;
  modal.querySelector('[data-tv-install-help]')?.addEventListener('click', () => {
    modal.querySelector('[data-tv-install-copy]').textContent = 'Urmați pașii de mai jos pentru a o păstra pe ecranul principal:';
    modal.querySelector('[data-tv-install-steps]').hidden = false;
    const button = modal.querySelector('[data-tv-install-help]');
    button.textContent = 'Am înțeles';
    button.onclick = close;
  });
  modal.querySelector('[data-tv-install]')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    close();
  });
}

async function lockParentsLandscape() {
  if (!window.matchMedia('(display-mode: standalone)').matches || !screen.orientation?.lock) return;
  try { await screen.orientation.lock('landscape'); } catch { /* manifestul rămâne fallback-ul nativ */ }
}

function activityProgressMarkup() {
  const progressStages = selectedGroupSize === 'large'
    ? [['Dezmăț', '🤩'], ['Provocări', '✨'], ['Relax', '☁️']]
    : [['Relax', '☁️'], ['Provocări', '✨'], ['Dezmăț', '🤩']];
  return `<div class="slider-progress" aria-label="Progres de la relaxare spre distracție"><div class="slider-progress-line" data-slider-progress-line data-stage="0"><span class="slider-progress-fill" data-slider-progress-fill><span class="slider-progress-shimmer"></span></span><span class="slider-progress-sparkles" aria-hidden="true">${Array.from({ length: 12 }, (_, index) => `<i style="--spark:${index}">${index % 3 === 0 ? '✦' : index % 3 === 1 ? '·' : '✧'}</i>`).join('')}</span><span class="slider-progress-avatar" data-slider-progress-avatar>😌</span>${progressStages.map(([label, icon], index) => `<span class="slider-milestone" style="left:${index / (progressStages.length - 1) * 100}%" data-milestone="${index}"><i>${icon}<small>${label}</small></i></span>`).join('')}</div></div>`;
}
function resetLocalProfileState() { localStorage.removeItem(COMPLETED_ACTIVITIES_KEY); localStorage.removeItem(ACTIVITY_PROGRESS_KEY); localStorage.removeItem(HIDE_COMPLETED_ACTIVITIES_KEY); localStorage.removeItem(GROUP_SIZE_KEY); localStorage.removeItem('becky-parents-last-activity:v1'); active = null; completionReturnId = null; animalQueueActivityId = null; animalRoundQueue = []; animalScore = { correct: 0, wrong: 0 }; selectedGroupSize = 'small'; }
function showProfilePicker() {
  const profiles = knownParentProfiles();
  const modal = document.createElement('div');
  modal.className = 'profile-picker-overlay';
  modal.innerHTML = `<section class="profile-picker" role="dialog" aria-modal="true" aria-label="Încarcă profilul"><button class="profile-picker-close" type="button" data-profile-close aria-label="Închide">×</button><h2>Încarcă profilul</h2><p>Alegeți un profil ca să continuați de unde ați rămas.</p><div class="profile-picker-track">${profiles.map(name => `<button type="button" class="profile-card" data-profile-name="${esc(name)}"><span>👤</span><strong>${esc(name)}</strong><small>Continuă progresul</small></button>`).join('')}<button type="button" class="profile-card profile-card-new" data-profile-new><span>＋</span><strong>Începe un nou profil</strong><small>Pornește de la început</small></button></div></section>`;
  root.append(modal);
  modal.querySelector('[data-profile-close]').onclick = () => modal.remove();
  modal.querySelectorAll('[data-profile-name]').forEach(button => button.onclick = async () => { modal.remove(); const username = button.dataset.profileName; const previous = parentProfileUsername; try { if (previous && previous !== username) await saveParentProgress(previous, parentProgressSnapshot()); } catch { /* loading the selected profile can continue */ } parentProfileUsername = username; localStorage.setItem(PARENT_PROFILE_KEY, username); try { const row = await getParentProgress(username); if (row.progress) applyParentProgress(row.progress); else resetLocalProfileState(); } catch { /* local state remains available */ } renderLibrary(); });
  modal.querySelector('[data-profile-new]').onclick = () => { const entered = window.prompt('Cum vrei să se numească noul profil?'); if (!entered?.trim()) return; const username = entered.trim().replace(/\s+/g, ' '); rememberParentProfile(username); parentProfileUsername = username; localStorage.setItem(PARENT_PROFILE_KEY, username); resetLocalProfileState(); renderLibrary(); };
}

function renderLibrary() {
  stopMusicGame();
  const galleryActivities = activities.filter(item => (item.illustration || item.cardIcon) && ACTIVE_ACTIVITY_ORDER.includes(item.id) && supportsGroupSize(item) && (activityIsVisible(item) || item.id === completionReturnId)).sort(compareActivitiesForGroup);
  const progressMarkup = activityProgressMarkup();
  const progressStages = selectedGroupSize === 'large'
    ? [['Dezmăț', '🤩'], ['Provocări', '✨'], ['Relax', '☁️']]
    : [['Relax', '☁️'], ['Provocări', '✨'], ['Dezmăț', '🤩']];
  const galleryMarkup = `<section class="activity-slider" aria-label="Alegeți o activitate"><div class="slider-viewport"><div class="slider-track">${galleryActivities.map(item => `<button type="button" class="activity-card${isActivityLocked(item) ? ' is-locked' : ''}" data-id="${esc(item.id)}" ${isActivityLocked(item) ? 'disabled aria-disabled="true"' : ''}>${activityLockMarkup(item)}${activityCompletionBadge(item)}${item.illustration ? `<img class="activity-illustration" src="${esc(item.illustration)}" alt="" loading="lazy">` : `<span class="activity-icon-illustration" aria-hidden="true">${esc(item.cardIcon || '✦')}</span>`}<h2 class="${item.title.trim().includes(' ') ? 'has-multiple-words' : ''}">${cardTitleMarkup(item.title)}</h2></button>`).join('')}</div></div></section>`;
  root.innerHTML = `<div class="parents-shell"><header class="parents-top"><span class="brand"><img src="/assets/logo_sun.png" alt="Becky’s Garden"></span>${groupSizeToggleMarkup()}<div class="parents-settings"><button class="parents-settings-button" type="button" data-settings-toggle aria-expanded="false" aria-label="Setări">⚙</button><div class="parents-settings-panel" data-settings-panel hidden><div class="settings-profile">${parentProfileUsername ? `Profil: <strong>${esc(parentProfileUsername)}</strong>` : 'Niciun profil salvat'}</div><button type="button" class="settings-action" data-save-progress>Salvează progresul</button><button type="button" class="settings-action" data-load-profile>Încarcă profilul</button><button type="button" class="settings-action settings-reset" data-reset-progress>Resetează progresul</button><label><input type="checkbox" data-hide-completed ${hideCompletedActivities() ? 'checked' : ''}> Ascunde activitățile completate</label><small class="settings-status" data-settings-status></small></div></div></header>${progressMarkup}${galleryMarkup}</div>`;
  root.querySelectorAll('.parents-shell:not(.voice-shell) .parents-top').forEach((header, index) => { if (index > 0) header.remove(); });
  const brand = root.querySelector('.parents-shell:not(.voice-shell) .parents-top .brand');
  if (brand) brand.replaceChildren(Object.assign(document.createElement('img'), { src: '/assets/logo_sun.png', alt: 'Becky’s Garden' }));
  const viewport = root.querySelector('.slider-viewport');
  if (!viewport) return;
  if (completionReturnId) {
    const completedId = completionReturnId;
    requestAnimationFrame(() => {
      const card = root.querySelector(`.activity-card[data-id="${completedId}"]`);
      if (!card) { completionReturnId = null; return; }
      const targetScrollLeft = Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2));
      viewport.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
      const remaining = [...root.querySelectorAll('.activity-card')].filter(value => value !== card);
      const firstRects = new Map(remaining.map(value => [value, value.getBoundingClientRect()]));
      card.classList.add('is-completing');
      setTimeout(() => {
        if (!hideCompletedActivities()) { completionReturnId = null; card.classList.remove('is-completing'); return; }
        card.remove();
        remaining.filter(value => value.isConnected).forEach(value => {
          const first = firstRects.get(value);
          const last = value.getBoundingClientRect();
          value.classList.add('is-reflowing');
          const reflow = value.animate([{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: 'translate(0, 0)' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' });
          reflow.onfinish = () => value.classList.remove('is-reflowing');
        });
        completionReturnId = null;
      }, 920);
    });
  }
  bindGroupSizeToggle(root, renderLibrary);
  const settingsToggle = root.querySelector('[data-settings-toggle]');
  const settingsPanel = root.querySelector('[data-settings-panel]');
  settingsToggle.onclick = () => { const isOpen = settingsPanel.hidden; settingsPanel.hidden = !isOpen; settingsToggle.setAttribute('aria-expanded', String(isOpen)); };
  root.querySelector('[data-hide-completed]').onchange = event => { localStorage.setItem(HIDE_COMPLETED_ACTIVITIES_KEY, String(event.currentTarget.checked)); renderLibrary(); };
  const settingsStatus = root.querySelector('[data-settings-status]');
  root.querySelector('[data-save-progress]').onclick = async () => {
    const entered = window.prompt('Cum vrei să se numească acest profil?', parentProfileUsername || '');
    if (!entered?.trim()) return;
    parentProfileUsername = entered.trim().replace(/\s+/g, ' '); localStorage.setItem(PARENT_PROFILE_KEY, parentProfileUsername); rememberParentProfile(parentProfileUsername);
    try { const existing = await getParentProgress(parentProfileUsername); if (existing.progress) applyParentProgress(existing.progress); await saveParentProgress(parentProfileUsername, parentProgressSnapshot()); settingsStatus.textContent = 'Progres salvat.'; renderLibrary(); } catch { settingsStatus.textContent = 'Nu s-a putut salva acum. Progresul local rămâne păstrat.'; }
  };
  root.querySelector('[data-load-profile]').onclick = showProfilePicker;
  root.querySelector('[data-reset-progress]').onclick = async () => {
    if (!window.confirm('Ștergem tot progresul și revenim la începutul fiecărei activități?')) return;
    if (parentProfileUsername) { try { await deleteParentProgress(parentProfileUsername); } catch { /* continue with local reset */ } }
    stopMusicGame();
    if (animalAudio) { animalAudio.pause(); animalAudio.removeAttribute('src'); animalAudio.load(); animalAudio = null; }
    localStorage.removeItem(COMPLETED_ACTIVITIES_KEY);
    localStorage.removeItem(ACTIVITY_PROGRESS_KEY);
    localStorage.removeItem(HIDE_COMPLETED_ACTIVITIES_KEY);
    localStorage.removeItem(GROUP_SIZE_KEY);
    localStorage.removeItem('becky-parents-last-activity:v1');
    active = null;
    completionReturnId = null;
    animalQueueActivityId = null;
    animalRoundQueue = [];
    animalScore = { correct: 0, wrong: 0 };
    musicGameQueue = [];
    lastMusicTrackId = null;
    selectedGroupSize = 'small';
    renderLibrary();
  };
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartScroll = 0;
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragStartX = event.clientX;
    dragStartScroll = viewport.scrollLeft;
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!dragging) return;
    const delta = event.clientX - dragStartX;
    if (Math.abs(delta) > 5) dragMoved = true;
    viewport.scrollLeft = dragStartScroll - delta;
  });
  const stopDragging = event => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (dragMoved) {
      viewport.dataset.dragged = 'true';
      setTimeout(() => delete viewport.dataset.dragged, 80);
    }
  };
  viewport.addEventListener('pointerup', stopDragging);
  viewport.addEventListener('pointercancel', stopDragging);
  const progressFill = root.querySelector('[data-slider-progress-fill]');
  const progressAvatar = root.querySelector('[data-slider-progress-avatar]');
  const progressLine = root.querySelector('[data-slider-progress-line]');
  const milestones = [...root.querySelectorAll('[data-milestone]')];
  const updateSliderProgress = () => {
    const maxScroll = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
    const progress = Math.min(1, viewport.scrollLeft / maxScroll);
    const vertical = window.matchMedia('(orientation: landscape) and (min-aspect-ratio: 3/2) and (max-height: 720px)').matches;
    progressFill.style.width = `${progress * 100}%`;
    const verticalProgress = selectedGroupSize === 'small' ? 1 - progress : progress;
    progressLine.dataset.direction = selectedGroupSize;
    progressFill.style.height = vertical ? `${progress * 100}%` : '';
    const activeMilestone = Math.round(progress * (milestones.length - 1));
    progressAvatar.style.left = `${progress * 100}%`;
    progressAvatar.style.top = vertical ? `${verticalProgress * 100}%` : '';
    if (vertical) progressAvatar.style.left = '50%';
    const visualStage = selectedGroupSize === 'large' ? milestones.length - 1 - activeMilestone : activeMilestone;
    progressAvatar.textContent = progressStages[activeMilestone]?.[1] || '✨';
    progressAvatar.dataset.stage = String(visualStage);
    progressLine.dataset.stage = String(visualStage);
    milestones.forEach((milestone, index) => {
      milestone.classList.toggle('is-reached', index <= activeMilestone);
      milestone.classList.toggle('is-current', index === activeMilestone);
      if (vertical) { milestone.style.left = '50%'; milestone.style.top = `${(selectedGroupSize === 'small' ? 1 - index / (milestones.length - 1) : index / (milestones.length - 1)) * 100}%`; }
    });
  };
  viewport.addEventListener('scroll', updateSliderProgress, { passive: true });
  requestAnimationFrame(updateSliderProgress);
  root.querySelectorAll('[data-id]').forEach(button => button.onclick = () => {
    const item = activities.find(value => value.id === button.dataset.id);
    openActivity(item);
  });
}

function activityGuide(item) {
  const guides = {
    'recunoaste-ti-animalul': {
      who: 'Alegeți împreună sau lăsați fiecare persoană să răspundă pe rând.',
      how: 'Ascultați sunetul, apoi alegeți animalul corect dintre trei variante.',
      options: 'Atingeți simbolul difuzorului pentru a auzi sunetul din nou. După răspuns, continuați cu următorul animal.'
    },
    'ai-prefera': {
      who: 'Toată lumea răspunde, pe rând, la aceeași dilemă.',
      how: 'Primiți șase dileme. Fiecare alege una dintre cele două variante.',
      options: 'Puteți spune doar alegerea sau puteți povesti de ce ați ales-o.'
    },
    'intrebari-amuzante': {
      who: 'Pe rând, fiecare persoană alege întrebarea la care are chef să răspundă.',
      how: 'Apar trei întrebări: una foarte accesibilă, una medie și una mai neașteptată.',
      options: 'Alegeți una sau apăsați „Pas” pentru alte trei. Întrebările nealese pot reveni mai târziu.'
    },
    'intrebari-profunde': {
      who: 'Pe rând, fiecare persoană alege o întrebare și răspunde fără grabă.',
      how: 'Apar trei întrebări: una ușoară, una medie și una care invită la mai multă reflecție.',
      options: 'Alegeți una sau apăsați „Pas” pentru alte trei. Nu este nevoie să răspundeți la ceva prea personal.'
    }
  };
  if (guides[item.id]) return guides[item.id];
  return {
    who: item.participants || 'Participă toată lumea care are chef.',
    how: item.steps?.[0] || item.prompt,
    options: item.steps?.slice(1).join(' ') || 'Continuați în ritmul vostru.'
  };
}

function renderActivityIntro(item) {
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  const guide = activityGuide(item);
  track('activity_info_viewed');
  root.innerHTML = `<main class="activity-info-experience"><button class="question-back" type="button" data-activity-info-back>← Activități</button><section class="activity-info-card"><header>${item.illustration ? `<img src="${esc(item.illustration)}" alt="">` : `<span aria-hidden="true">${esc(item.cardIcon || '✦')}</span>`}<div><small>CUM SE JOACĂ</small><h1>${esc(item.title)}</h1></div></header><div class="activity-info-rules"><div><strong>Cine răspunde</strong><p>${esc(guide.who)}</p></div><div><strong>Cum jucați</strong><p>${esc(guide.how)}</p></div><div><strong>Ce puteți alege</strong><p>${esc(guide.options)}</p></div></div><button class="primary activity-info-start" type="button" data-activity-info-start>Începe activitatea</button></section></main>`;
  root.querySelector('[data-activity-info-back]').onclick = renderLibrary;
  root.querySelector('[data-activity-info-start]').onclick = () => {
    track('activity_started_from_info');
    startActivity(item);
  };
}

function openActivity(item) {
  if (isActivityLocked(item)) return;
  localStorage.setItem('becky-parents-last-activity:v1', item.id);
  renderActivityIntro(item);
}

function startActivity(item) {
  if (item.musicGame) renderMusicGame(item);
  else if ((Array.isArray(item.questionSets) && item.questionSets.length) || item.questionPool) renderFunnyQuestions(item);
  else if (Array.isArray(item.questions) && item.questions.length) renderQuestionExperience(item, activityResumeIndex(item.id));
  else if (item.animalSound) renderAnimalExperience(item);
  else if (item.id === 'mini-quiz-general') renderMiniQuiz(item);
  else renderManualActivity(item);
}

function renderAnimalExperience(item) {
  stopMusicGame();
  if (animalAudio) {
    animalAudio.pause();
    animalAudio.removeAttribute('src');
    animalAudio.load();
    animalAudio = null;
  }
  active = item;
  root.classList.remove('activity-picker-open');
  const rounds = Array.isArray(item.animalRounds) ? item.animalRounds : [];
  if (animalQueueActivityId !== item.id) {
    animalQueueActivityId = item.id;
    const saved = animalSavedProgress(item.id);
    const answered = new Set(Array.isArray(saved.answered_rounds) ? saved.answered_rounds : []);
    animalRoundQueue = rounds.filter(roundItem => !answered.has(roundItem.label));
    animalScore = { correct: Number(saved.correct) || 0, wrong: Number(saved.wrong) || 0 };
    for (let index = animalRoundQueue.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [animalRoundQueue[index], animalRoundQueue[swapIndex]] = [animalRoundQueue[swapIndex], animalRoundQueue[index]];
    }
  }
  const round = animalRoundQueue.shift();
  if (!round) return transitionToAnimalCelebration(item);
  const broadHabitat = value => {
    const text = `${value.habitat} ${value.climate}`.toLowerCase();
    if (/apă|ocean|mare|lac|râu|coast|lagun/.test(text)) return 'acvatic';
    if (/deșert|savană|cald/.test(text)) return 'cald';
    if (/rece|munte|pădure|temperat/.test(text)) return 'temperat';
    return 'uscat';
  };
  const plausibleOptions = rounds.filter(value => value.label !== round.label).sort((first, second) => {
    const score = value => (value.type === round.type ? 8 : 0) + (broadHabitat(value) === broadHabitat(round) ? 5 : 0) + (value.climate === round.climate ? 2 : 0);
    return score(second) - score(first) || Math.random() - .5;
  });
  const customOptions = Array.isArray(round.options) ? round.options.slice(0, 2) : null;
  const optionLabels = [round, ...(customOptions && customOptions.length === 2 ? customOptions : plausibleOptions.slice(0, 2))].sort(() => Math.random() - .5);
  const answerVisual = round.image
    ? `<img class="animal-answer-image" src="${esc(round.image)}" alt="${esc(round.label)}">`
    : `<span class="animal-answer-emoji" aria-hidden="true">${esc(round.emoji || '🐾')}</span>`;
  const optionVisual = option => option.image
    ? `<img class="animal-option-image" src="${esc(option.image)}" alt="">`
    : `<span class="animal-option-emoji" aria-hidden="true">${esc(option.emoji || '🐾')}</span>`;
  track('animal_sound_view_manual', { animal_round: round.label });
  root.innerHTML = `<main class="animal-experience"><button class="question-back" type="button" data-animal-back>← Activități</button><div class="animal-instruction">Ascultați și ghiciți pe rând</div><button class="animal-flip" type="button" data-animal-flip aria-label="Redă din nou sunetul"><span class="animal-card-inner"><span class="animal-card-face animal-card-front"><img class="animal-speaker" src="/assets/Iconuri/volume.png" alt=""><strong>Ce animal este?</strong></span><span class="animal-card-face animal-card-back">${answerVisual}<strong data-animal-result></strong><small>${esc(round.type)} · ${esc(round.habitat)}</small></span></span></button><div class="animal-score" data-animal-score><span class="is-correct">✓ ${animalScore.correct} corecte</span><span class="is-wrong">✕ ${animalScore.wrong} greșite</span><span class="is-remaining">• ${animalRoundQueue.length} rămase</span></div><div class="animal-actions" data-animal-actions><div class="animal-options" data-animal-options hidden>${optionLabels.map(option => `<button type="button" class="animal-option" data-animal-option="${esc(option.label)}">${optionVisual(option)}<strong>${esc(option.label)}</strong></button>`).join('')}</div></div><button class="primary animal-next" type="button" data-animal-next hidden>Următorul</button>${activityDockMarkup(item)}</main>`;
  const savedAnswered = new Set(Array.isArray(animalSavedProgress(item.id).answered_rounds) ? animalSavedProgress(item.id).answered_rounds : []);
  root.querySelector('[data-animal-back]').onclick = () => { track('animal_sound_exit'); animalQueueActivityId = null; animalRoundQueue = []; renderLibrary(); };
  bindActivityDock(item);
  const playbackSource = round.sound.replace('/assets/mp3s/Effects/animale/', '/assets/mp3s/Effects/animale/trimmed/').normalize('NFC');
  const sound = new Audio(playbackSource);
  animalAudio = sound;
  sound.loop = false;
  sound.volume = .85;
  let endFallback = null;
  const showOptions = () => {
    clearTimeout(endFallback);
    sound.pause();
    const options = root.querySelector('[data-animal-options]');
    if (!options) return;
    options.hidden = false;
  };
  const scheduleEndFallback = () => {
    clearTimeout(endFallback);
    if (Number.isFinite(sound.duration)) endFallback = setTimeout(showOptions, (sound.duration + .2) * 1000);
  };
  sound.addEventListener('loadedmetadata', scheduleEndFallback, { once: true });
  sound.addEventListener('ended', showOptions, { once: true });
  sound.addEventListener('error', showOptions, { once: true });
  endFallback = setTimeout(showOptions, 11000);
  const playSound = () => { clearTimeout(endFallback); sound.currentTime = 0; sound.play().then(() => { scheduleEndFallback(); track('animal_sound_play', { animal_round: round.label }); }).catch(() => { showOptions(); }); };
  playSound();
  root.querySelector('[data-animal-flip]').onclick = playSound;
  const chooseAnswer = event => {
    const selected = event.currentTarget.dataset.animalOption;
    const correct = selected === round.label;
    root.querySelectorAll('[data-animal-option]').forEach(button => { button.disabled = true; button.classList.toggle('is-correct', button.dataset.animalOption === round.label); button.classList.toggle('is-wrong', button === event.currentTarget && !correct); });
    const card = root.querySelector('[data-animal-flip]');
    root.querySelector('[data-animal-result]').textContent = correct ? 'Corect!' : `Nu, era ${round.label}`;
    animalScore[correct ? 'correct' : 'wrong'] += 1;
    savedAnswered.add(round.label);
    saveAnimalProgress(item.id, { answered_rounds: [...savedAnswered], correct: animalScore.correct, wrong: animalScore.wrong });
    root.querySelector('[data-animal-score]').innerHTML = `<span class="is-correct">✓ ${animalScore.correct} corecte</span><span class="is-wrong">✕ ${animalScore.wrong} greșite</span><span class="is-remaining">• ${animalRoundQueue.length} rămase</span>`;
    card.classList.add('is-flipped');
    card.onclick = null;
    root.querySelector('[data-animal-actions]').hidden = true;
    root.querySelector('[data-animal-next]').hidden = false;
    track(correct ? 'animal_answer_correct' : 'animal_answer_wrong', { animal_round: round.label, answer: selected });
  };
  root.querySelectorAll('[data-animal-option]').forEach(button => button.onclick = chooseAnswer);
  root.querySelector('[data-animal-flip]').onclick = playSound;
  root.querySelector('[data-animal-next]').onclick = () => renderAnimalExperience(item);
}

function transitionToAnimalCelebration(item) {
  const currentExperience = root.querySelector('.animal-experience');
  if (!currentExperience) return renderAnimalCelebration(item);
  currentExperience.classList.add('is-animal-final-leaving');
  setTimeout(() => renderAnimalCelebration(item), 300);
}

function renderAnimalCelebration(item) {
  stopMusicGame();
  if (animalAudio) {
    animalAudio.pause();
    animalAudio.removeAttribute('src');
    animalAudio.load();
    animalAudio = null;
  }
  root.classList.remove('activity-picker-open');
  root.innerHTML = `<main class="animal-celebration"><button class="question-back" type="button" data-animal-celebration-back>← Activități</button><div class="animal-celebration-stage"><video class="animal-celebration-video" autoplay muted playsinline preload="auto"><source src="/assets/ilustratii_aplicatie_parinti/celebrating_duck_transparent.webm" type="video/webm"><source src="/assets/ilustratii_aplicatie_parinti/celebrating_duck.mp4" type="video/mp4"></video><button class="primary animal-celebration-activities" type="button" data-celebration-activities>Înapoi la activități</button></div>${activityDockMarkup(item)}</main>`;
  const video = root.querySelector('.animal-celebration-video');
  video.addEventListener('ended', () => video.pause(), { once: true });
  root.querySelector('[data-animal-celebration-back]').onclick = () => { animalQueueActivityId = null; animalRoundQueue = []; renderLibrary(); };
  root.querySelector('[data-celebration-activities]').onclick = () => {
    markActivityComplete(item.id);
    completionReturnId = item.id;
    renderLibrary();
  };
  bindActivityDock(item);
  track('animal_sound_round_complete', { animal_rounds: Array.isArray(item.animalRounds) ? item.animalRounds.length : 0 });
}

function renderQuestionExperience(item, questionIndex = 0, transition = null) {
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  const isWouldYouRather = item.id === 'ai-prefera';
  const questions = isWouldYouRather ? wouldYouRatherBatch(item) : (item.questions || []);
  const questionLimit = questions.length;
  const index = ((questionIndex % questionLimit) + questionLimit) % questionLimit;
  if (isWouldYouRather) { const saved = activityProgress()[item.id] || {}; saveActivityProgress(item.id, { ...saved, batch_index: index, completed_at: null }); } else saveActivityResumeIndex(item.id, index);
  track('question_view_manual', { question_index: index });
  const enterClass = transition?.from ? ` is-entering-from-${transition.from}` : '';
  root.innerHTML = `<main class="question-experience" tabindex="0" aria-label="${esc(item.title)}"><button class="question-back" type="button" data-question-back>← Activități</button><div class="question-content${enterClass}"><small class="question-count">${index + 1} din ${questionLimit}</small><div class="question-copy ${responsiveTextClass(questions[index])}">${esc(questions[index])}</div><div class="question-rating" role="group" aria-label="Cât de mult v-a plăcut întrebarea?"><span class="question-rating-label">V-a plăcut?</span><div class="question-stars">${[1,2,3,4,5].map(value => `<button type="button" class="question-star" data-question-rating="${value}" aria-label="${value} din 5 stele">☆</button>`).join('')}</div></div><button class="question-next" type="button" data-question-next>Următoarea</button></div>${activityDockMarkup(item)}</main>`;
  root.querySelector('[data-question-back]').onclick = () => { track('question_exit_manual'); renderLibrary(); };
  requestAnimationFrame(() => fitQuestionText(root.querySelector('.question-copy')));
  bindActivityDock(item);
  let rating = 0;
  const updateRating = value => { rating = value; root.querySelectorAll('[data-question-rating]').forEach(star => { const activeStar = Number(star.dataset.questionRating) <= value; star.textContent = activeStar ? '★' : '☆'; star.classList.toggle('is-selected', activeStar); }); };
  root.querySelectorAll('[data-question-rating]').forEach(star => star.onclick = () => { updateRating(Number(star.dataset.questionRating)); track('question_rating_selected', { question_index: index, rating: rating }); });
  let moving = false;
  const next = direction => {
    if (moving) return;
    moving = true;
    if (rating) saveParentQuestionFeedback({ session_id: sessionId, activity_id: item.id, question_index: index, question_text: questions[index], rating, group_size: selectedGroupSize });
    const screen = root.querySelector('.question-experience');
    screen.querySelector('.question-content').classList.add(`is-leaving-to-${direction}`);
    screen.querySelector('[data-question-next]').disabled = true;
    if (index >= questionLimit - 1) {
      if (isWouldYouRather) { const saved = activityProgress()[item.id] || {}; saveActivityProgress(item.id, { ...saved, batch_index: questionLimit, completed_at: new Date().toISOString() }); } else clearActivityResumeIndex(item.id);
      track('activity_questions_completed', { question_count: questionLimit });
      setTimeout(() => renderAnimalCelebration(item), 330);
    } else setTimeout(() => renderQuestionExperience(item, index + 1, { from: oppositeDirection(direction) }), 330);
  };
  root.querySelector('[data-question-next]').onclick = () => next('left');
  let startX = 0;
  let startY = 0;
  let swipeStartedInQuestion = false;
  const screen = root.querySelector('.question-experience');
  screen.addEventListener('pointerdown', event => {
    swipeStartedInQuestion = !event.target.closest('.activity-dock, .question-back, .question-next');
    if (!swipeStartedInQuestion) return;
    startX = event.clientX;
    startY = event.clientY;
  }, true);
  screen.addEventListener('pointerup', event => {
    if (!swipeStartedInQuestion) return;
    swipeStartedInQuestion = false;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.hypot(deltaX, deltaY) > 35) next(Math.abs(deltaX) >= Math.abs(deltaY) ? (deltaX < 0 ? 'left' : 'right') : (deltaY < 0 ? 'up' : 'down'));
  }, true);
  screen.addEventListener('pointercancel', () => { swipeStartedInQuestion = false; }, true);
  root.querySelector('.question-experience').addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      next('left');
    }
  });
  root.querySelector('.question-experience').focus({ preventScroll: true });
}

function activityDockMarkup(currentItem) {
  const items = activities.filter(item => (item.illustration || item.cardIcon) && ACTIVE_ACTIVITY_ORDER.includes(item.id) && activityIsVisible(item)).sort(compareActivitiesForGroup);
  return `<aside class="activity-dock" data-activity-dock><button class="activity-dock-toggle" type="button" data-open-activity-dock aria-expanded="false">Alegeți altă activitate <span>⌃</span></button><div class="activity-dock-panel"><span class="activity-picker-brand"><img src="/assets/logo_sun.png" alt="Becky’s Garden"></span>${activityProgressMarkup()}<div class="activity-dock-track">${items.map(item => `<button type="button" class="activity-dock-card${isActivityLocked(item) ? ' is-locked' : ''}" data-dock-id="${esc(item.id)}" data-group-sizes="${esc((item.groupSizes || ['small','large']).join(','))}" ${supportsGroupSize(item) ? '' : 'hidden'} ${isActivityLocked(item) ? 'disabled aria-disabled="true"' : ''}>${activityLockMarkup(item)}${activityCompletionBadge(item)}${item.illustration ? `<img src="${esc(item.illustration)}" alt="" loading="lazy">` : `<span>${esc(item.cardIcon || '✦')}</span>`}<strong class="${item.title.trim().includes(' ') ? 'has-multiple-words' : ''}">${cardTitleMarkup(item.title)}</strong></button>`).join('')}</div>${groupSizeToggleMarkup()}</div></aside>`;
}

function bindActivityDock(currentItem) {
  const dock = root.querySelector('[data-activity-dock]');
  if (!dock) return;
  const dockTrack = dock.querySelector('.activity-dock-track');
  const progressFill = dock.querySelector('[data-slider-progress-fill]');
  const progressAvatar = dock.querySelector('[data-slider-progress-avatar]');
  const progressLine = dock.querySelector('[data-slider-progress-line]');
  const milestones = [...dock.querySelectorAll('[data-milestone]')];
  const updateDockProgress = () => {
    const maxScroll = Math.max(1, dockTrack.scrollWidth - dockTrack.clientWidth);
    const progress = Math.min(1, dockTrack.scrollLeft / maxScroll);
    progressFill.style.width = `${progress * 100}%`;
    const activeMilestone = Math.round(progress * (milestones.length - 1));
    progressAvatar.style.left = `${progress * 100}%`;
    const visualStage = selectedGroupSize === 'large' ? milestones.length - 1 - activeMilestone : activeMilestone;
    const stages = selectedGroupSize === 'large' ? ['🤩', '✨', '☁️'] : ['☁️', '✨', '🤩'];
    progressAvatar.textContent = stages[activeMilestone] || '✨';
    progressAvatar.dataset.stage = String(visualStage);
    progressLine.dataset.stage = String(visualStage);
    milestones.forEach((milestone, index) => milestone.classList.toggle('is-reached', index <= activeMilestone));
  };
  dockTrack.addEventListener('scroll', updateDockProgress, { passive: true });
  requestAnimationFrame(updateDockProgress);
  dock.addEventListener('pointerdown', event => event.stopPropagation());
  dock.addEventListener('pointerup', event => event.stopPropagation());
  dock.querySelector('[data-open-activity-dock]').onclick = () => {
    const expanded = dock.classList.toggle('is-open');
    const toggle = dock.querySelector('[data-open-activity-dock]');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.firstChild.textContent = expanded ? 'Înapoi la activitate ' : 'Alegeți altă activitate ';
    root.classList.toggle('activity-picker-open', expanded);
    track(expanded ? 'activity_dock_opened' : 'activity_dock_closed');
  };
  bindGroupSizeToggle(dock, () => {
    const toggle = dock.querySelector('.group-size-toggle');
    toggle.classList.toggle('is-large', selectedGroupSize === 'large');
    toggle.querySelectorAll('[data-group-size]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.groupSize === selectedGroupSize)));
    const cards = [...dock.querySelectorAll('[data-dock-id]')];
    cards.sort((first, second) => compareActivitiesForGroup(
      activities.find(item => item.id === first.dataset.dockId),
      activities.find(item => item.id === second.dataset.dockId)
    )).forEach(card => dock.querySelector('.activity-dock-track').append(card));
    cards.forEach(button => {
      button.hidden = !button.dataset.groupSizes.split(',').includes(selectedGroupSize);
    });
    dockTrack.scrollLeft = 0;
    const stages = selectedGroupSize === 'large' ? [['Dezmăț', '🤩'], ['Provocări', '✨'], ['Relax', '☁️']] : [['Relax', '☁️'], ['Provocări', '✨'], ['Dezmăț', '🤩']];
    milestones.forEach((milestone, index) => {
      milestone.querySelector('i').textContent = stages[index][1];
      milestone.querySelector('small').textContent = stages[index][0];
    });
    updateDockProgress();
  });
  dock.querySelectorAll('[data-dock-id]').forEach(button => button.onclick = () => {
    const item = activities.find(value => value.id === button.dataset.dockId);
    if (!item) return;
    track('activity_changed_in_game', { from_experience_id: currentItem.id, to_experience_id: item.id });
    openActivity(item);
  });
}

function oppositeDirection(direction) {
  return { left: 'right', right: 'left', up: 'down', down: 'up' }[direction] || 'right';
}

function stopMusicGame() {
  musicGameAutoRunning = false;
  musicGameRunToken += 1;
  clearInterval(musicGameTimer);
  clearTimeout(musicGameTransition);
  musicGameTimer = null;
  musicGameTransition = null;
  if (musicGameAudio) {
    musicGameAudio.pause();
    musicGameAudio.removeAttribute('src');
    musicGameAudio.load();
    musicGameAudio = null;
  }
}

function shuffledMusicTracks() {
  const shuffled = [...musicTracks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled[0]?.id === lastMusicTrackId) [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  return shuffled;
}

function nextMusicTrack() {
  if (!musicGameQueue.length) musicGameQueue = shuffledMusicTracks();
  const trackItem = musicGameQueue.shift();
  lastMusicTrackId = trackItem?.id || null;
  return trackItem;
}

function renderMusicGame(item) {
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  const leaderGame = item.musicGame.type === 'leader-circle';
  const seconds = Number(item.musicGame.clipSeconds) || 20;
  track('music_game_viewed', { game_type: item.musicGame.type });
  root.innerHTML = `<main class="music-game-experience"><button class="question-back" type="button" data-music-back>← Activități</button><section class="music-game-stage"><span class="music-game-kicker">${leaderGame ? 'TOȚI COPIAZĂ LIDERUL' : 'O INTRARE · O MELODIE SURPRIZĂ'}</span><h1>${esc(item.title)}</h1><p>${esc(item.prompt)}</p><div class="music-game-clock" data-music-clock style="--round-progress:0deg"><span data-music-count>${seconds}</span><small>secunde</small></div><strong class="music-game-status" data-music-status>${leaderGame ? 'Alegeți primul lider' : 'Prima persoană poate ieși din aria vizuală'}</strong><button class="primary music-game-start" type="button" data-music-start>${leaderGame ? 'Pornește dansul' : 'Dă muzica'}</button></section>${activityDockMarkup(item)}</main>`;
  const startButton = root.querySelector('[data-music-start]');
  const status = root.querySelector('[data-music-status]');
  const count = root.querySelector('[data-music-count]');
  const clock = root.querySelector('[data-music-clock]');

  const playRound = async () => {
    const trackItem = nextMusicTrack();
    if (!trackItem) {
      status.textContent = 'Nu am găsit melodii pentru joc.';
      startButton.disabled = true;
      return;
    }
    const token = ++musicGameRunToken;
    clearInterval(musicGameTimer);
    clearTimeout(musicGameTransition);
    if (musicGameAudio) musicGameAudio.pause();
    const audio = new Audio(trackItem.src);
    musicGameAudio = audio;
    audio.preload = 'auto';
    audio.volume = 0;
    count.textContent = String(seconds);
    clock.style.setProperty('--round-progress', '0deg');
    status.textContent = leaderGame ? 'Liderul intră acum!' : 'Intrarea începe acum!';
    startButton.disabled = !leaderGame;
    if (leaderGame) startButton.textContent = 'Oprește jocul';

    const metadataReady = new Promise(resolve => {
      if (audio.readyState >= 1) resolve();
      else audio.addEventListener('loadedmetadata', resolve, { once: true });
      setTimeout(resolve, 2500);
    });
    try {
      await audio.play();
      await metadataReady;
      if (token !== musicGameRunToken) return;
      if (Number.isFinite(audio.duration) && audio.duration > seconds + 4) {
        const latestStart = Math.max(0, audio.duration - seconds - 2);
        const earliestStart = Math.min(8, latestStart);
        audio.currentTime = earliestStart + Math.random() * Math.max(0, latestStart - earliestStart);
      }
    } catch {
      if (token !== musicGameRunToken) return;
      status.textContent = 'Apăsați din nou pentru a porni muzica.';
      startButton.disabled = false;
      startButton.textContent = leaderGame ? 'Pornește dansul' : 'Dă muzica';
      musicGameAutoRunning = false;
      return;
    }

    const startedAt = performance.now();
    track('music_game_round_started', { game_type: item.musicGame.type, track_id: trackItem.id, clip_seconds: seconds });
    const updateRound = () => {
      if (token !== musicGameRunToken) return;
      const elapsed = (performance.now() - startedAt) / 1000;
      const remaining = Math.max(0, seconds - elapsed);
      count.textContent = String(Math.max(0, Math.ceil(remaining)));
      clock.style.setProperty('--round-progress', `${Math.min(360, elapsed / seconds * 360)}deg`);
      audio.volume = Math.min(.9, elapsed / .65 * .9, remaining / .85 * .9);
      if (remaining > 0) return;
      clearInterval(musicGameTimer);
      audio.pause();
      track('music_game_round_completed', { game_type: item.musicGame.type, track_id: trackItem.id });
      if (leaderGame && musicGameAutoRunning) {
        status.textContent = 'Schimb de lider!';
        musicGameTransition = setTimeout(playRound, 900);
      } else {
        status.textContent = 'Intrare reușită. Următoarea persoană!';
        startButton.disabled = false;
        startButton.textContent = 'Dă următoarea muzică';
      }
    };
    updateRound();
    musicGameTimer = setInterval(updateRound, 100);
  };

  startButton.onclick = () => {
    if (leaderGame && musicGameAutoRunning) {
      stopMusicGame();
      count.textContent = String(seconds);
      clock.style.setProperty('--round-progress', '0deg');
      status.textContent = 'Joc oprit. Reluați când sunteți gata.';
      startButton.textContent = 'Reia dansul';
      track('music_game_stopped', { game_type: item.musicGame.type });
      return;
    }
    musicGameAutoRunning = leaderGame;
    playRound();
  };
  root.querySelector('[data-music-back]').onclick = () => { track('music_game_exit'); renderLibrary(); };
  bindActivityDock(item);
}

function renderManualActivity(item) {
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  track('activity_view_manual');
  root.innerHTML = `<div class="parents-shell"><div class="detail"><button class="back" data-back>← Înapoi la idei</button>${item.illustration ? `<img class="detail-illustration" src="${esc(item.illustration)}" alt="" fetchpriority="high">` : ''}<span class="eyebrow">${esc(item.category)}</span><h1>${esc(item.title)}</h1><div class="detail-meta"><span class="meta-pill"><span aria-hidden="true">◷</span>${esc(item.duration)}</span><span class="meta-pill"><span aria-hidden="true">♧</span>${esc(item.participants)}</span></div><div class="detail-prompt">${esc(item.prompt)}</div>${Array.isArray(item.questions) ? `<section class="question-stack"><small>ÎNTREBĂRI DIN JOC</small>${item.questions.map((question, index) => `<div><b>${index + 1}</b><span>${esc(question)}</span></div>`).join('')}</section>` : ''}<ol class="steps">${item.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol><div class="detail-actions"><button class="primary" data-start>Începeți</button></div><p class="tip">Nu există un răspuns corect. Dacă nu vi se potrivește, alegeți altă idee.</p></div>${activityDockMarkup(item)}</div>`;
  root.querySelector('[data-back]').onclick = renderLibrary;
  bindActivityDock(item);
  root.querySelector('[data-start]').onclick = buttonEvent => { track('activity_engaged_manual'); buttonEvent.currentTarget.textContent = 'Continuați în ritmul vostru'; buttonEvent.currentTarget.disabled = true; };
}

function renderMiniQuiz(item, audience = 'general', categoryId = null, questionIndex = 0) {
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  const audiences = item.quizAudiences || {};
  const audienceEntries = Object.entries(audiences);
  const audienceData = audiences[audience] || audienceEntries[0]?.[1];
  const categories = audienceData?.categories || [];
  const category = categories.find(value => value.id === categoryId);
  const tabsMarkup = `<div class="quiz-audience-switch" role="tablist" aria-label="Alegeți pentru cine este quizul">${audienceEntries.map(([value, data]) => `<button type="button" role="tab" aria-selected="${value === audience}" class="${value === audience ? 'is-active' : ''}" data-quiz-audience="${esc(value)}">${esc(data.label)}</button>`).join('')}</div>`;
  track(category ? 'quiz_question_viewed' : 'quiz_view_manual', { audience, category: category?.id, question_index: questionIndex });
  if (category) {
    const questions = category.questions || [];
    const index = ((questionIndex % questions.length) + questions.length) % questions.length;
    const question = questions[index];
    root.innerHTML = `<main class="quiz-experience quiz-play"><button class="question-back" type="button" data-quiz-back>← Activități</button><div class="quiz-player"><button class="quiz-category-back" type="button" data-quiz-categories>← Categorii</button><div class="quiz-player-heading"><span>${esc(category.icon)}</span><strong>${esc(category.title)}</strong><small>${index + 1} / ${questions.length}</small></div><button class="quiz-flip-card" type="button" data-quiz-flip aria-label="Vezi răspunsul"><span class="quiz-flip-inner"><span class="quiz-face quiz-front"><small>ÎNTREBAREA ${index + 1}</small><strong>${esc(question.question)}</strong></span><span class="quiz-face quiz-back"><small>RĂSPUNS</small><strong>${esc(question.answer)}</strong></span></span></button><div class="quiz-player-actions"><button class="primary quiz-reveal" type="button" data-quiz-reveal>Vezi răspunsul</button><button class="primary quiz-next-question" type="button" data-quiz-next hidden>Următoarea</button></div></div>${activityDockMarkup(item)}</main>`;
    root.querySelector('[data-quiz-back]').onclick = () => { track('quiz_exit'); renderLibrary(); };
    root.querySelector('[data-quiz-categories]').onclick = () => renderMiniQuiz(item, audience);
    const flip = () => {
      const card = root.querySelector('[data-quiz-flip]');
      if (card.classList.contains('is-flipped')) return;
      card.classList.add('is-flipped');
      root.querySelector('[data-quiz-reveal]').hidden = true;
      root.querySelector('[data-quiz-next]').hidden = false;
      track('quiz_answer_revealed', { audience, category: category.id, question_index: index });
    };
    root.querySelector('[data-quiz-flip]').onclick = flip;
    root.querySelector('[data-quiz-reveal]').onclick = flip;
    root.querySelector('[data-quiz-next]').onclick = () => renderMiniQuiz(item, audience, category.id, index + 1);
    bindActivityDock(item);
    return;
  }
  root.innerHTML = `<main class="quiz-experience"><button class="question-back" type="button" data-quiz-back>← Activități</button><div class="quiz-content"><img class="quiz-illustration" src="${esc(item.illustration)}" alt=""><h1>${esc(item.title)}</h1>${tabsMarkup}<p class="quiz-hint">Alegeți o categorie</p><div class="quiz-category-grid">${categories.map(value => `<button type="button" class="quiz-category" data-quiz-category="${esc(value.id)}"><span>${esc(value.icon)}</span><strong>${esc(value.title)}</strong><small>10 întrebări</small></button>`).join('')}</div></div>${activityDockMarkup(item)}</main>`;
  root.querySelector('[data-quiz-back]').onclick = () => { track('quiz_exit'); renderLibrary(); };
  root.querySelectorAll('[data-quiz-audience]').forEach(button => button.onclick = () => renderMiniQuiz(item, button.dataset.quizAudience));
  root.querySelectorAll('[data-quiz-category]').forEach(button => button.onclick = () => renderMiniQuiz(item, audience, button.dataset.quizCategory));
  bindActivityDock(item);
}

window.addEventListener('pagehide', () => track('session_end'));

(async () => {
  registerParentsPwa();
  try {
    const response = await fetch('/api/parents/experiences');
    const payload = await response.json();
    activities = payload.experiences || [];
    musicTracks = payload.musicTracks || [];
    await restoreSavedParentProgress();
    track('session_start', { mode: 'manual' });
    renderLibrary();
    lockParentsLandscape();
    setTimeout(showInstallModal, 650);
  } catch {
    root.innerHTML = '<div class="parents-loading">Nu am putut încărca experiența. Reîncercați.</div>';
  }
})();
