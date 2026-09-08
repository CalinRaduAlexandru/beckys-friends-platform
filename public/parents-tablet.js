import * as insights from './parents-analytics.js?v=1';
const root = document.getElementById('parents-app');
const MODERN_BRAND_LOGO = '/assets/logo/new_logo_horizontal.png';
function modernizeLegacyLogos() {
  root.querySelectorAll('img[src="/assets/logo_sun.png"], img[src="/assets/logo_sun_square.png"]').forEach(image => {
    image.src = MODERN_BRAND_LOGO;
    image.alt ||= 'Becky’s Garden';
  });
}
new MutationObserver(modernizeLegacyLogos).observe(root, { childList: true, subtree: true });
let lastInsightScreen = '';
new MutationObserver(() => {
  const main = root.querySelector('main');
  const screen = main?.className || '';
  if (screen && screen !== lastInsightScreen) insights.emit('screen_view', { screen });
  lastInsightScreen = screen;
}).observe(root, { childList: true });
const SESSION_KEY = 'becky-parents-session';
const EVENTS_KEY = 'becky-parents-events:v2';
const COMPLETED_ACTIVITIES_KEY = 'becky-parents-completed-activities:v1';
const ACTIVITY_PROGRESS_KEY = 'becky-parents-activity-progress:v1';
const HIDE_COMPLETED_ACTIVITIES_KEY = 'becky-parents-hide-completed:v1';
const PARENT_PROFILE_KEY = 'becky-parents-profile:v1';
const PARENT_PROFILES_KEY = 'becky-parents-profiles:v1';
const TV_INSTALL_DISMISSED_KEY = 'becky-parents-tv-install-dismissed:v1';
const GROUP_SIZE_KEY = 'becky-parents-group-size:v1';
const ACTIVE_ACTIVITY_ORDER = ['ghiceste-expresia', 'ai-prefera', 'intrebari-amuzante', 'intrebari-profunde', 'mini-quiz-general', 'reproduceti-sunetul', 'arata-mai-departe', 'dans', 'dans-schimbare-lider', 'karaoke'];
const LOCKED_ACTIVITY_START = ACTIVE_ACTIVITY_ORDER.indexOf('mini-quiz-general');
function isActivityLocked(item) { return !['mini-quiz-general', 'reproduceti-sunetul', 'arata-mai-departe', 'dans'].includes(item?.id) && ACTIVE_ACTIVITY_ORDER.indexOf(item?.id) > LOCKED_ACTIVITY_START; }
function activityLockMarkup(item) { return isActivityLocked(item) ? '<span class="activity-lock-overlay" aria-hidden="true"><span>🔒</span><small>În curând</small></span>' : ''; }
function makeSessionId() { return window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

let activities = [];
let musicTracks = [];
let dramaticMusicTracks = [];
let dramaticTrackIndex = 0;
let dramaticSession = { total: 1, current: 1 };
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
let soundSecretTimer = null;
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
    queueParentProgressSave();
    track('group_size_changed', { group_size: selectedGroupSize });
    onChange?.();
  });
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
}

function completedActivityIds() { return readJson(COMPLETED_ACTIVITIES_KEY, []); }
function knownParentProfiles() { const stored = readJson(PARENT_PROFILES_KEY, []); const profiles = Array.isArray(stored) ? stored : []; return [...new Set([...profiles, parentProfileUsername].filter(name => typeof name === 'string' && name.trim()))]; }
function rememberParentProfile(username) { localStorage.setItem(PARENT_PROFILES_KEY, JSON.stringify([...new Set([...knownParentProfiles(), username].filter(Boolean))])); }
function renameKnownParentProfile(previous, next) { const stored = readJson(PARENT_PROFILES_KEY, []); const profiles = (Array.isArray(stored) ? stored : []).filter(name => name !== previous); localStorage.setItem(PARENT_PROFILES_KEY, JSON.stringify([...new Set([...profiles, next].filter(Boolean))])); }
function forgetKnownParentProfile(username) { const stored = readJson(PARENT_PROFILES_KEY, []); const profiles = (Array.isArray(stored) ? stored : []).filter(name => name !== username); localStorage.setItem(PARENT_PROFILES_KEY, JSON.stringify(profiles)); }
function activityProgress() { return readJson(ACTIVITY_PROGRESS_KEY, {}); }
function activityResumeIndex(id) { const saved = activityProgress()[id]; const index = Number(saved && typeof saved === 'object' ? saved.batch_index : saved); return Number.isInteger(index) && index >= 0 ? index : 0; }
function saveActivityResumeIndex(id, index) { localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify({ ...activityProgress(), [id]: index })); queueParentProgressSave(); }
function clearActivityResumeIndex(id) { const progress = activityProgress(); delete progress[id]; localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify(progress)); queueParentProgressSave(); }
function animalSavedProgress(id) { const saved = activityProgress()[id]; return saved && typeof saved === 'object' ? saved : {}; }
function saveAnimalProgress(id, progress) { localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify({ ...activityProgress(), [id]: progress })); queueParentProgressSave(); }
const WOULD_YOU_RATHER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
function shuffleList(list) { const result = [...list]; for (let index = result.length - 1; index > 0; index -= 1) { const swapIndex = Math.floor(Math.random() * (index + 1)); [result[index], result[swapIndex]] = [result[swapIndex], result[index]]; } return result; }
function saveActivityProgress(id, progress) { localStorage.setItem(ACTIVITY_PROGRESS_KEY, JSON.stringify({ ...activityProgress(), [id]: progress })); queueParentProgressSave(); }
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
function renderExpressionGuess(item) {
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  const rounds = Array.isArray(item.expressionRounds) ? item.expressionRounds : [];
  let roundIndex = 0;
  let revealDepth = 0;
  let answerRevealed = false;
  let busy = false;

  const render = () => {
    const round = rounds[roundIndex];
    if (!round) return;
    const reveal = revealDepth > 0 ? (round.reveals?.[revealDepth - 1] || '') : '';
    root.innerHTML = `<main class="expression-game">
      <button class="question-back" type="button" data-expression-back>← Activități</button>
      <div class="expression-game-content">
        <div class="expression-progress" aria-label="Progresul activității">${rounds.map((_, index) => `<span class="${index <= roundIndex ? 'is-active' : ''} ${index === roundIndex ? 'is-current' : ''}"></span>`).join('')}</div>
        <p class="expression-kicker">GHICEȘTE EXPRESIA</p>
        <h1>Ce expresie e?</h1>
        <div class="expression-puzzle" aria-label="Emoji-ul expresiei"><span>${esc(round.emoji)}</span>${answerRevealed ? `<strong class="expression-answer"><b aria-hidden="true">✓</b>${esc(round.answer)}</strong>` : reveal ? `<strong class="expression-reveal">${esc(reveal)}</strong>` : ''}</div>
        <div class="expression-actions">
          ${answerRevealed ? `<button class="primary expression-next" type="button" data-expression-next>${roundIndex === rounds.length - 1 ? 'Finalizați →' : 'Următoarea →'}</button>` : `<button class="primary" type="button" data-expression-answer>Vezi răspunsul</button>${revealDepth < (round.reveals?.length || 0) ? `<button class="secondary expression-reveal-button" type="button" data-expression-reveal>Dezvăluie o parte →</button>` : ''}`}
        </div>
      </div>
    </main>`;
    root.querySelector('[data-expression-back]').onclick = () => { if (!busy) renderLibrary(); };
    root.querySelector('[data-expression-answer]')?.addEventListener('click', () => { if (busy) return; answerRevealed = true; render(); });
    root.querySelector('[data-expression-reveal]')?.addEventListener('click', () => { if (busy) return; revealDepth = Math.min(revealDepth + 1, round.reveals.length); render(); });
    root.querySelector('[data-expression-next]')?.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      if (roundIndex === rounds.length - 1) {
        saveActivityProgress(item.id, { version: 1, completed_at: new Date().toISOString() });
        markActivityComplete(item.id);
        completionReturnId = item.id;
        renderLibrary();
        return;
      }
      roundIndex += 1;
      revealDepth = 0;
      answerRevealed = false;
      busy = false;
      render();
    });
  };
  render();
}
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
  const setId = makeSessionId();
  const options = current.map(question => ({ id: question.id, text: question.text, role: question.role || question.level || '' }));
  insights.emit('choice_view', { set_id: setId, options });
  const advance = selectedId => {
    if (funnyAdvancing) return;
    funnyAdvancing = true;
    const nextState = funnyState(item);
    const currentIds = current.map(question => question.id);
    const buttons = [...root.querySelectorAll('[data-funny-id]')];
    if (selectedId) {
      const selectedQuestion = byId.get(selectedId);
      if (selectedQuestion) insights.emit('choice_selected', { set_id: setId, question_id: selectedQuestion.id });
      const selectedIndex = buttons.findIndex(value => value.dataset.funnyId === selectedId);
      buttons.forEach((button, index) => button.classList.add(button.dataset.funnyId === selectedId ? 'is-selected-leaving' : index < selectedIndex ? 'is-fading-left' : 'is-fading-right'));
    } else {
      insights.emit('choice_skip', { set_id: setId });
      buttons.forEach((button, index) => button.classList.add(index % 2 ? 'is-fading-right' : 'is-fading-left'));
    }
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
  insights.completeVisit(id);
  const completed = completedActivityIds();
  if (!completed.includes(id)) { localStorage.setItem(COMPLETED_ACTIVITIES_KEY, JSON.stringify([...completed, id])); queueParentProgressSave(); }
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
let parentSaveQueue = Promise.resolve();
function queueParentProgressSave() {
  if (!parentProfileUsername) return parentSaveQueue;
  const username = parentProfileUsername;
  const snapshot = parentProgressSnapshot();
  parentSaveQueue = parentSaveQueue.catch(() => {}).then(() => saveParentProgress(username, snapshot));
  return parentSaveQueue;
}
async function deleteParentProgress(username) { const response = await fetch(`/api/parents/progress?username=${encodeURIComponent(username)}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Progresul nu a putut fi resetat'); }
async function restoreSavedParentProgress() { if (!parentProfileUsername) return; try { const row = await getParentProgress(parentProfileUsername); if (row.progress) applyParentProgress(row.progress); } catch { /* local progress remains available */ } }

function track(eventName, extra = {}) {
  insights.emit(eventName, extra);
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
    ? [['Dezlănțuire', '🤩'], ['Provocări', '✨'], ['Relax', '☁️']]
    : [['Relax', '☁️'], ['Provocări', '✨'], ['Dezlănțuire', '🤩']];
  return `<div class="slider-progress" aria-label="Progres de la relaxare spre distracție"><div class="slider-progress-line" data-slider-progress-line data-stage="0"><span class="slider-progress-fill" data-slider-progress-fill><span class="slider-progress-shimmer"></span></span><span class="slider-progress-sparkles" aria-hidden="true">${Array.from({ length: 12 }, (_, index) => `<i style="--spark:${index}">${index % 3 === 0 ? '✦' : index % 3 === 1 ? '·' : '✧'}</i>`).join('')}</span><span class="slider-progress-avatar" data-slider-progress-avatar>😌</span>${progressStages.map(([label, icon], index) => `<span class="slider-milestone" style="left:${index / (progressStages.length - 1) * 100}%" data-milestone="${index}"><i>${icon}<small>${label}</small></i></span>`).join('')}</div></div>`;
}
function resetLocalProfileState() { localStorage.removeItem(COMPLETED_ACTIVITIES_KEY); localStorage.removeItem(ACTIVITY_PROGRESS_KEY); localStorage.removeItem(HIDE_COMPLETED_ACTIVITIES_KEY); localStorage.removeItem(GROUP_SIZE_KEY); localStorage.removeItem('becky-parents-last-activity:v1'); active = null; completionReturnId = null; animalQueueActivityId = null; animalRoundQueue = []; animalScore = { correct: 0, wrong: 0 }; selectedGroupSize = 'small'; }
function showProfilePicker() {
  const fromOnboarding = Boolean(root.querySelector('[data-session-gate]'));
  return new Promise(async resolve => {
  let profiles = knownParentProfiles();
  try {
    const response = await fetch('/api/parents/progress?list=1');
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.profiles)) profiles = [...new Set([...profiles, ...payload.profiles.filter(Boolean)])];
    }
  } catch { /* profilurile locale rămân disponibile */ }
  const modal = document.createElement('div');
  modal.className = 'profile-picker-overlay';
  modal.innerHTML = `<section class="profile-picker" role="dialog" aria-modal="true" aria-label="Schimbă profilul"><button class="profile-picker-close" type="button" data-profile-close aria-label="Închide">×</button><div data-profile-list-view><h2>Schimbă profilul</h2><p>Alegeți un profil ca să continuați de unde ați rămas.</p><div class="profile-picker-track">${profiles.map(name => `<button type="button" class="profile-card" data-profile-name="${esc(name)}"><span>👤</span><strong>${esc(name)}</strong><small>Continuă progresul</small></button>`).join('')}<button type="button" class="profile-card profile-card-new" data-profile-new><span>＋</span><strong>Începe un nou profil</strong><small>Pornește de la început</small></button></div></div><form class="profile-create" data-profile-create-view hidden><span class="profile-create-icon" aria-hidden="true">👤</span><h2>Profil nou</h2><p>Alegeți un nume ușor de recunoscut data viitoare.</p><label for="parent-profile-name">Numele profilului</label><input id="parent-profile-name" name="profile-name" type="text" maxlength="40" autocomplete="off" placeholder="De exemplu: Seara cu prietenii"><small class="profile-create-error" data-profile-create-error aria-live="polite"></small><div class="profile-create-actions"><button type="button" class="secondary" data-profile-create-back>Înapoi</button><button type="submit" class="primary">Creează profilul</button></div></form></section>`;
  root.append(modal);
  const close = () => { modal.remove(); resolve(false); };
  modal.querySelector('[data-profile-close]').onclick = close;
  modal.querySelectorAll('[data-profile-name]').forEach(button => button.onclick = async () => {
    modal.querySelectorAll('button').forEach(control => { control.disabled = true; });
    const username = button.dataset.profileName;
    try {
      await parentSaveQueue.catch(() => {});
      if (!fromOnboarding && parentProfileUsername && parentProfileUsername !== username) {
        await saveParentProgress(parentProfileUsername, parentProgressSnapshot());
      }
      const row = await getParentProgress(username);
      resetLocalProfileState();
      if (row.progress) applyParentProgress(row.progress);
      parentProfileUsername = username;
      localStorage.setItem(PARENT_PROFILE_KEY, username);
      rememberParentProfile(username);
      if (!row.progress) await saveParentProgress(username, parentProgressSnapshot());
      modal.remove();
      if (!fromOnboarding) renderLibrary();
      resolve(true);
    } catch {
      modal.querySelector('[data-profile-list-view]>p').textContent = 'Profilul nu a putut fi încărcat. Încercați din nou.';
      modal.querySelectorAll('button').forEach(control => { control.disabled = false; });
    }
  });
  const listView = modal.querySelector('[data-profile-list-view]');
  const createView = modal.querySelector('[data-profile-create-view]');
  const nameInput = createView.querySelector('input');
  const createError = createView.querySelector('[data-profile-create-error]');
  const showList = () => { createView.hidden = true; listView.hidden = false; createError.textContent = ''; };
  modal.querySelector('[data-profile-new]').onclick = () => { listView.hidden = true; createView.hidden = false; setTimeout(() => nameInput.focus({ preventScroll: true }), 30); };
  modal.querySelector('[data-profile-create-back]').onclick = showList;
  createView.onsubmit = async event => {
    event.preventDefault();
    const username = nameInput.value.trim().replace(/\s+/g, ' ');
    if (!username) { createError.textContent = 'Scrieți un nume pentru profil.'; nameInput.focus(); return; }
    rememberParentProfile(username);
    parentProfileUsername = username;
    localStorage.setItem(PARENT_PROFILE_KEY, username);
    resetLocalProfileState();
    try { await saveParentProgress(username, parentProgressSnapshot()); } catch { /* profilul rămâne disponibil local și se va sincroniza la prima schimbare */ }
    modal.remove();
    if (!fromOnboarding) renderLibrary();
    resolve(true);
  };
  });
}

function showSessionGate() {
  const gate = root.querySelector('[data-session-gate]');
  const opening = root.querySelector('.parents-opening');
  if (!gate || !opening) return Promise.resolve('new');
  gate.hidden = false;
  opening.hidden = true;
  return new Promise(resolve => {
    const begin = mode => {
      const gateLogo = gate.querySelector('.session-gate-logo');
      const openingLogo = opening.querySelector('.opening-logo');
      if (gateLogo && openingLogo) {
        const rect = gateLogo.getBoundingClientRect();
        openingLogo.getAnimations().forEach(animation => animation.cancel());
        openingLogo.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;max-height:none;animation:none;opacity:1;transform:translate3d(0,0,0) scale(1);will-change:transform,opacity`;
      }
      gate.hidden = true;
      opening.hidden = false;
      void opening.offsetWidth;
      requestAnimationFrame(() => {
        if (!openingLogo) return;
        const rise = Math.min(112, Math.max(48, window.innerHeight * .08));
        const compactLandscape = window.matchMedia('(orientation: landscape) and (min-aspect-ratio: 3/2) and (max-height: 720px)').matches;
        const keyframes = compactLandscape ? [
          { opacity: 1, transform: 'translate3d(0,0,0) scale(1)', offset: 0, easing: 'cubic-bezier(.45,0,.55,1)' },
          { opacity: 1, transform: `translate3d(0,-${rise}px,0) scale(1)`, offset: .58, easing: 'cubic-bezier(.34,1.25,.64,1)' },
          { opacity: 1, transform: `translate3d(0,-${rise}px,0) scale(1.095)`, offset: .70, easing: 'ease-out' },
          { opacity: 1, transform: `translate3d(0,-${rise}px,0) scale(.99)`, offset: .78, easing: 'ease-in-out' },
          { opacity: 1, transform: `translate3d(0,-${rise}px,0) scale(1.035)`, offset: .84, easing: 'ease-in-out' },
          { opacity: 0, transform: `translate3d(-34px,-${rise + 28}px,0) scale(1.04)`, offset: 1 }
        ] : [
          { transform: 'translate3d(0,0,0) scale(1)', offset: 0, easing: 'cubic-bezier(.45,0,.55,1)' },
          { transform: `translate3d(0,-${rise}px,0) scale(1)`, offset: .68, easing: 'cubic-bezier(.34,1.4,.64,1)' },
          { transform: `translate3d(0,-${rise}px,0) scale(1.09)`, offset: .82, easing: 'ease-out' },
          { transform: `translate3d(0,-${rise}px,0) scale(.985)`, offset: .92, easing: 'ease-in-out' },
          { transform: `translate3d(0,-${rise}px,0) scale(1.035)`, offset: 1 }
        ];
        openingLogo.animate(keyframes, { duration: compactLandscape ? 1500 : 1380, fill: 'forwards' });
      });
      resolve(mode);
    };
    gate.querySelector('[data-start-session]').onclick = () => {
      resetLocalProfileState();
      parentProfileUsername = '';
      localStorage.removeItem(PARENT_PROFILE_KEY);
      begin('new');
    };
    gate.querySelector('[data-continue-profile]').onclick = async () => {
      gate.hidden = true;
      const loaded = await showProfilePicker();
      if (loaded) { gate.hidden = false; begin('profile'); return; }
      gate.hidden = false;
    };
  });
}

function showProfileNameForm(initialName = '') {
  return new Promise(resolve => {
    const editing = Boolean(initialName);
    const modal = document.createElement('div');
    modal.className = 'profile-picker-overlay';
    modal.innerHTML = `<section class="profile-picker profile-name-modal" role="dialog" aria-modal="true" aria-label="Numele profilului"><button class="profile-picker-close" type="button" data-profile-name-close aria-label="Închide">×</button><form class="profile-create" data-profile-name-form><span class="profile-create-icon" aria-hidden="true">👤</span><h2>${editing ? 'Editează numele profilului' : 'Salvează profilul'}</h2><p>${editing ? 'Alegeți numele sub care veți continua data viitoare.' : 'Scrieți un nume ca să puteți continua data viitoare de unde ați rămas.'}</p><label for="save-parent-profile-name">Numele profilului</label><input id="save-parent-profile-name" type="text" maxlength="40" autocomplete="off" value="${esc(initialName)}" placeholder="De exemplu: Seara cu prietenii"><small class="profile-create-error" data-profile-name-error aria-live="polite"></small><div class="profile-create-actions"><button type="button" class="secondary" data-profile-name-cancel>Anulează</button><button type="submit" class="primary">${editing ? 'Salvează schimbarea' : 'Salvează'}</button></div></form></section>`;
    root.append(modal);
    const close = () => { modal.remove(); resolve(''); };
    const input = modal.querySelector('input');
    const error = modal.querySelector('[data-profile-name-error]');
    modal.querySelector('[data-profile-name-close]').onclick = close;
    modal.querySelector('[data-profile-name-cancel]').onclick = close;
    modal.querySelector('[data-profile-name-form]').onsubmit = event => {
      event.preventDefault();
      const username = input.value.trim().replace(/\s+/g, ' ');
      if (!username) { error.textContent = 'Scrieți un nume pentru profil.'; input.focus(); return; }
      modal.remove();
      resolve(username);
    };
    setTimeout(() => input.focus({ preventScroll: true }), 30);
  });
}

function currentGalleryActivities() {
  return activities.filter(item => (item.illustration || item.cardIcon) && ACTIVE_ACTIVITY_ORDER.includes(item.id) && supportsGroupSize(item) && (activityIsVisible(item) || item.id === completionReturnId)).sort(compareActivitiesForGroup);
}

function renderLibrary() {
  insights.closeVisit();
  stopMusicGame();
  const galleryActivities = currentGalleryActivities();
  const progressMarkup = activityProgressMarkup();
  const progressStages = selectedGroupSize === 'large'
    ? [['Dezlănțuire', '🤩'], ['Provocări', '✨'], ['Relax', '☁️']]
    : [['Relax', '☁️'], ['Provocări', '✨'], ['Dezlănțuire', '🤩']];
  const galleryMarkup = `<section class="activity-slider" aria-label="Alegeți o activitate"><div class="slider-viewport"><div class="slider-track">${galleryActivities.map(item => `<button type="button" class="activity-card${isActivityLocked(item) ? ' is-locked' : ''}" data-id="${esc(item.id)}" ${isActivityLocked(item) ? 'disabled aria-disabled="true"' : ''}>${activityLockMarkup(item)}${activityCompletionBadge(item)}${item.illustration ? `<img class="activity-illustration" src="${esc(item.illustration)}" alt="" loading="lazy">` : `<span class="activity-icon-illustration" aria-hidden="true">${esc(item.cardIcon || '✦')}</span>`}<h2 class="${item.title.trim().includes(' ') ? 'has-multiple-words' : ''}">${cardTitleMarkup(item.title)}</h2></button>`).join('')}</div></div></section>`;
  root.innerHTML = `<div class="parents-shell"><header class="parents-top"><span class="brand"><img src="${MODERN_BRAND_LOGO}" alt="Becky’s Garden"></span>${groupSizeToggleMarkup()}<div class="parents-settings"><button class="parents-settings-button" type="button" data-settings-toggle aria-expanded="false" aria-label="Setări">⚙</button><div class="parents-settings-panel" data-settings-panel hidden><div class="settings-profile">${parentProfileUsername ? `Profil: <strong>${esc(parentProfileUsername)}</strong>` : 'Niciun profil salvat'}</div>${parentProfileUsername ? '' : '<button type="button" class="settings-action" data-create-profile>Creează profil</button>'}<button type="button" class="settings-action" data-edit-profile ${parentProfileUsername ? '' : 'disabled'}>Editează numele profilului</button>${parentProfileUsername ? '<button type="button" class="settings-action settings-delete" data-delete-profile>Șterge profilul</button>' : ''}<button type="button" class="settings-action" data-load-profile>Schimbă profilul</button><button type="button" class="settings-action settings-reset" data-reset-progress>Resetează progresul</button><label><input type="checkbox" data-hide-completed ${hideCompletedActivities() ? 'checked' : ''}> Ascunde activitățile completate</label><small class="settings-status" data-settings-status></small></div></div></header>${progressMarkup}${galleryMarkup}</div>`;
  root.querySelectorAll('.parents-shell:not(.voice-shell) .parents-top').forEach((header, index) => { if (index > 0) header.remove(); });
  const brand = root.querySelector('.parents-shell:not(.voice-shell) .parents-top .brand');
  if (brand) brand.replaceChildren(Object.assign(document.createElement('img'), { src: MODERN_BRAND_LOGO, alt: 'Becky’s Garden' }));
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
  const shellElement = root.querySelector('.parents-shell');
  const setSettingsOpen = isOpen => {
    settingsPanel.hidden = !isOpen;
    settingsToggle.textContent = isOpen ? '×' : '⚙';
    settingsToggle.setAttribute('aria-label', isOpen ? 'Închide setările' : 'Setări');
    settingsToggle.setAttribute('aria-expanded', String(isOpen));
    shellElement?.classList.toggle('is-settings-open', isOpen);
  };
  settingsToggle.onclick = () => setSettingsOpen(settingsPanel.hidden);
  const progressSurface = root.querySelector('.parents-shell>.slider-progress');
  let settingsPressTimer = null;
  const cancelSettingsPress = () => { if (settingsPressTimer) { clearTimeout(settingsPressTimer); settingsPressTimer = null; } };
  progressSurface?.addEventListener('pointerdown', event => {
    event.preventDefault();
    cancelSettingsPress();
    settingsPressTimer = setTimeout(() => { settingsPressTimer = null; setSettingsOpen(true); }, 3000);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => progressSurface?.addEventListener(type, cancelSettingsPress));
  progressSurface?.addEventListener('contextmenu', event => event.preventDefault());
  root.querySelector('[data-hide-completed]').onchange = event => { localStorage.setItem(HIDE_COMPLETED_ACTIVITIES_KEY, String(event.currentTarget.checked)); queueParentProgressSave(); renderLibrary(); };
  const settingsStatus = root.querySelector('[data-settings-status]');
  root.querySelector('[data-create-profile]')?.addEventListener('click', async () => {
    if (!parentProfileUsername) {
      const entered = await showProfileNameForm();
      if (!entered) return;
      parentProfileUsername = entered;
      localStorage.setItem(PARENT_PROFILE_KEY, parentProfileUsername);
      rememberParentProfile(parentProfileUsername);
    }
    try { await queueParentProgressSave(); renderLibrary(); } catch { settingsStatus.textContent = 'Profilul nu a putut fi creat acum. Progresul local rămâne păstrat.'; }
  });
  root.querySelector('[data-edit-profile]').onclick = async () => {
    const previous = parentProfileUsername;
    if (!previous) return;
    const next = await showProfileNameForm(previous);
    if (!next || next === previous) return;
    const snapshot = parentProgressSnapshot();
    try {
      await saveParentProgress(next, snapshot);
      try { await deleteParentProgress(previous); } catch { /* noul profil este deja salvat; evităm să pierdem progresul */ }
      renameKnownParentProfile(previous, next);
      parentProfileUsername = next;
      localStorage.setItem(PARENT_PROFILE_KEY, next);
      const profileLabel = root.querySelector('.settings-profile');
      if (profileLabel) profileLabel.innerHTML = `Profil: <strong>${esc(next)}</strong>`;
      settingsStatus.textContent = 'Numele profilului a fost schimbat.';
    } catch { settingsStatus.textContent = 'Numele nu a putut fi schimbat acum. Profilul vechi rămâne activ.'; }
  };
  root.querySelector('[data-load-profile]').onclick = showProfilePicker;
  root.querySelector('[data-delete-profile]')?.addEventListener('click', async event => {
    const username = parentProfileUsername;
    if (!username || !window.confirm(`Ștergeți profilul „${username}” și tot progresul lui?`)) return;
    event.currentTarget.disabled = true;
    try {
      await deleteParentProgress(username);
      forgetKnownParentProfile(username);
      resetLocalProfileState();
      localStorage.removeItem(PARENT_PROFILE_KEY);
      parentProfileUsername = '';
      renderLibrary();
    } catch { event.currentTarget.disabled = false; settingsStatus.textContent = 'Profilul nu a putut fi șters acum. Progresul rămâne păstrat.'; }
  });
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
    'ghiceste-expresia': {
      who: 'Jucați împreună: spuneți cu voce tare expresia care vă vine în minte.',
      how: 'Priviți emoji-urile și încercați să recunoașteți expresia românească.',
      options: 'Verificați răspunsul sau dezvăluiți o parte, apoi continuați cu următoarea.'
    },
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
      who: 'Pe rând, fiecare persoană alege una dintre cele trei întrebări.',
      how: 'Răspundeți în ritmul vostru sau apăsați „Pas” pentru alte trei.',
      options: 'O întrebare bună nu cere răspuns pe loc: îi puteți face o fotografie și puteți reveni la ea mai târziu.'
    },
    'intrarea-dramatica': {
      who: 'Un participant iese puțin din aria vizuală a grupului.',
      how: 'Când începe muzica, aplaudați-l până ajunge înapoi la voi. 👏',
      options: 'Pentru câteva secunde, scena este a lui. Revine exact așa cum îi vine natural.'
    },
    'dans': {
      who: 'Poate dansa o singură persoană sau puteți dansa împreună.',
      how: 'Alegeți un dans din listă și începeți când sunteți gata.',
      options: 'Macarena merge și solo; fiecare variantă arată numărul minim de participanți.'
    },
    'mini-quiz-general': {
      who: 'Pentru 2–9, persoana cu tableta coordonează runda și introduce răspunsul grupului.',
      how: 'Grupul se consultă, verificați răspunsul, apoi dați tableta spre stânga. La 10+, răspundeți mai organic, împreună.',
      options: 'Alegeți răspunsul final ca grup. Voi sau Quizul primiți câte un punct.'
    },
    'reproduceti-sunetul': {
      who: 'Cine are tableta memorează secretul și îl reproduce fără cuvinte.',
      how: 'Pentru 2–9 persoane, fiecare primește un sunet. La 10+, grupul decide natural cine urmează.',
      options: 'Începeți doar cu sunetul. Deblocați mima și indiciile până când grupul ghicește.'
    },
    'arata-mai-departe': {
      who: 'Stați în șir, cu spatele la ecran. Primul vede scena și o arată următoarei persoane.',
      how: 'Fără cuvinte și o singură dată. Fiecare dă mai departe ce a înțeles.',
      options: 'La final, ultima persoană arată ce a ajuns, apoi primul arată scena originală.'
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
  insights.openVisit(item.id);
  lastInsightScreen = '';
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  const guide = activityGuide(item);
  track('activity_info_viewed');
  root.innerHTML = `<main class="activity-info-experience"><button class="question-back" type="button" data-activity-info-back>← Activități</button><section class="activity-info-card"><header>${item.illustration ? `<img src="${esc(item.illustration)}" alt="">` : `<span aria-hidden="true">${esc(item.cardIcon || '✦')}</span>`}<div><small>CUM SE JOACĂ</small><h1>${esc(item.title)}</h1></div></header><div class="activity-info-rules"><div class="activity-info-rule"><img src="/assets/ilustratii_aplicatie_parinti/cine%20raspunde.png" alt=""><div><strong>Cine răspunde</strong><p>${esc(guide.who)}</p></div></div><div class="activity-info-rule"><img src="/assets/ilustratii_aplicatie_parinti/ce%20puteti%20alege.png" alt=""><div><strong>Ce puteți alege</strong><p>${esc(guide.options)}</p></div></div><div class="activity-info-rule"><img src="/assets/ilustratii_aplicatie_parinti/cum%20jucati.png" alt=""><div><strong>Cum jucați</strong><p>${esc(guide.how)}</p></div></div></div><button class="primary activity-info-start" type="button" data-activity-info-start>Începe activitatea</button></section></main>`;
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

function renderPassAlong(item, initialPhase = 'setup') {
  stopMusicGame();
  active = item;
  root.classList.remove('activity-picker-open');
  const scene = Array.isArray(item.passAlongScene?.steps) ? item.passAlongScene.steps : [];
  let phase = initialPhase;
  let busy = false;
  const sceneMarkup = () => `<div class="pass-along-scene">${scene.map((step, index) => `<div class="pass-along-scene-step"><span class="pass-along-emoji">${esc(step.emoji)}</span><div><strong>${esc(step.text)}</strong><small>${esc(step.caption)}</small></div>${index < scene.length - 1 ? '<span class="pass-along-arrow" aria-hidden="true">↓</span>' : ''}</div>`).join('')}</div>`;
  const shell = (body, className = '') => `<main class="pass-along-experience ${className}"><button class="question-back" type="button" data-pass-back>← Activități</button><section class="pass-along-stage">${body}</section></main>`;
  const render = () => {
    let body = '';
    if (phase === 'setup') body = `<span class="music-game-kicker">ARATĂ MAI DEPARTE</span><h1>Telefonul fără fir.<br>Dar fără cuvinte.</h1><p>Stați în șir, cu spatele la ecran.</p><p>Primul vede o scenă și o arată următorului. Apoi fiecare dă mai departe ce a înțeles.</p><span class="pass-along-people">3+ persoane</span><button class="primary pass-along-cta" type="button" data-pass-next>Ne-am așezat →</button>`;
    if (phase === 'rules') body = `<span class="music-game-kicker">ARATĂ MAI DEPARTE</span><h1>Țineți minte trei lucruri.</h1><div class="pass-along-rules"><div><strong>FĂRĂ CUVINTE</strong><small>Doar gesturi.</small></div><div><strong>O SINGURĂ DATĂ</strong><small>Arată scena o dată.</small></div><div><strong>NU TE UITA ÎNAPOI</strong><small>Fiecare dă mai departe ce a înțeles.</small></div></div><button class="primary pass-along-cta" type="button" data-pass-next>Ne-am așezat →</button>`;
    if (phase === 'privacy' || phase === 'peek-privacy') body = `<p class="pass-along-privacy-emoji">🙈</p><span class="music-game-kicker">${phase === 'peek-privacy' ? 'CEILALȚI CU SPATELE LA ECRAN' : 'DOAR PRIMUL SE UITĂ'}</span><h1>${phase === 'peek-privacy' ? 'Ceilalți rămân cu spatele la ecran.' : 'Doar primul se uită la ecran.'}</h1><p>Primul participant vede scena și o memorează.</p><button class="primary pass-along-cta" type="button" data-pass-next>Mă uit doar eu →</button>`;
    if (phase === 'secret') body = `<span class="music-game-kicker">SITUAȚIA TA</span>${sceneMarkup()}<p class="pass-along-no-words">Fără cuvinte.</p><button class="primary pass-along-cta" type="button" data-pass-next>Am ținut-o minte →</button>`;
    if (phase === 'chain') body = `<span class="music-game-kicker">ARATĂ MAI DEPARTE</span><h1>Arată scena următoarei persoane.</h1><p>O singură dată.<br>Fără cuvinte.</p><p class="pass-along-chain-note">Apoi întoarce-te.</p><strong class="pass-along-resting">TRIMITEȚI-O PÂNĂ LA CAPĂT 😏</strong><button class="primary pass-along-cta" type="button" data-pass-next>A ajuns →</button><button class="pass-along-forgot pass-along-chain-forgot" type="button" data-pass-forgot>👀 Am uitat ce să reproduc</button>`;
    if (phase === 'arrived') body = `<span class="music-game-kicker">ASTA A AJUNS</span><h1>Ultima persoană se întoarce acum cu fața spre tot grupul.</h1><p>Arată tuturor scena care a ajuns la tine.</p><button class="primary pass-along-cta" type="button" data-pass-next>A arătat-o →</button>`;
    if (phase === 'original') body = `<span class="music-game-kicker">ASTA A PLECAT</span>${sceneMarkup()}<p class="pass-along-original-instruction"><strong>PRIMA PERSOANĂ:</strong><br>Arată acum tuturor scena originală.</p><div class="pass-along-final-line">ASTA A AJUNS.<br>ASTA A PLECAT.</div><button class="primary pass-along-cta" type="button" data-pass-complete>Înapoi la activități →</button>`;
    if (phase === 'complete') body = `<div class="pass-along-complete-mark" aria-hidden="true">✨</div><h1>ASTA A PLECAT.<br>ASTA A AJUNS.</h1><button class="primary pass-along-cta" type="button" data-pass-complete>Înapoi la activități →</button>`;
    root.innerHTML = shell(body, `is-pass-${phase}`);
    root.querySelector('[data-pass-back]').onclick = () => { if (!busy) renderLibrary(); };
    root.querySelector('[data-pass-forgot]')?.addEventListener('click', () => { if (!busy) { phase = 'peek-privacy'; render(); } });
    root.querySelector('[data-pass-next]')?.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      const next = { setup: 'rules', rules: 'privacy', privacy: 'secret', 'peek-privacy': 'secret', secret: 'chain', chain: 'arrived', arrived: 'original', original: 'complete' }[phase];
      phase = next || phase;
      busy = false;
      render();
    });
    root.querySelector('[data-pass-complete]')?.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      saveActivityProgress(item.id, { version: 1, completed_at: new Date().toISOString() });
      markActivityComplete(item.id);
      completionReturnId = item.id;
      renderLibrary();
    });
  };
  render();
}

function startActivity(item) {
  insights.startVisit(item.id, Boolean(activityProgress()[item.id] && !activityProgress()[item.id].completed_at));
  if (item.id === 'ghiceste-expresia') renderExpressionGuess(item);
  else if (item.id === 'arata-mai-departe') renderPassAlong(item);
  else if (item.id === 'intrarea-dramatica') renderDramaticSetup(item);
  else if (item.id === 'dans') renderDanceOptions(item);
  else if (item.musicGame) renderMusicGame(item);
  else if ((Array.isArray(item.questionSets) && item.questionSets.length) || item.questionPool) renderFunnyQuestions(item);
  else if (Array.isArray(item.questions) && item.questions.length) renderQuestionExperience(item, activityResumeIndex(item.id));
  else if (item.animalSound) renderAnimalExperience(item);
  else if (item.id === 'mini-quiz-general') renderMiniQuiz(item);
  else if (item.id === 'reproduceti-sunetul') renderReproduceSound(item);
  else renderManualActivity(item);
}

function reproduceSoundState(item) { return activityProgress()[item.id] || {}; }
function reproduceSoundRound(item, count) {
  const plans = { 2: [0, 6], 3: [0, 2, 4], 4: [0, 1, 4, 6], 5: [0, 1, 2, 4, 6], 6: [0, 1, 2, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6], 8: [0, 1, 2, 3, 4, 5, 6, 7], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8], 10: [0, 1, 2, 4, 5, 6] };
  const pool = Array.isArray(item.soundRounds) ? item.soundRounds : [];
  return (plans[count] || plans[10]).map(index => pool[index]).filter(Boolean).map(round => round.id);
}
function renderReproduceSoundReady(item, phase = 'sound') {
  clearTimeout(soundSecretTimer);
  const state = { ...reproduceSoundState(item), phase };
  saveActivityProgress(item.id, state);
  renderReproduceSound({ ...item, __peek: false, __peekPhase: undefined });
}
function renderReproduceSound(item) {
  stopMusicGame(); active = item; root.classList.remove('activity-picker-open'); clearTimeout(soundSecretTimer);
  const pool = Array.isArray(item.soundRounds) ? item.soundRounds : [];
  let state = reproduceSoundState(item);
  if (item.__peek) state = { ...state, phase: 'peek' };
  if (state.completed_at || completedActivityIds().includes(item.id)) { renderLibrary(); return; }
  if (!Array.isArray(state.round_ids) || !state.round_ids.length || !Number.isInteger(state.player_count)) {
    root.innerHTML = `<main class="sound-game sound-game-setup"><button class="question-back" type="button" data-sound-back>← Activități</button><div class="sound-game-content"><img class="sound-game-illustration" src="${esc(item.illustration)}" alt=""><p class="sound-game-kicker">GHICIȚI ÎMPREUNĂ</p><h1>${esc(item.title || 'Grupul ghicește sunetul')}</h1><p class="sound-game-question">Câți jucați?</p><div class="sound-player-grid">${[2,3,4,5,6,7,8,9].map(count => `<button type="button" data-sound-count="${count}">${count}</button>`).join('')}<button type="button" data-sound-count="10">10+</button></div></div></main>`;
    root.querySelector('[data-sound-back]').onclick = renderLibrary;
    root.querySelectorAll('[data-sound-count]').forEach(button => button.onclick = () => { const count = Number(button.dataset.soundCount); saveActivityProgress(item.id, { version: 1, player_count: count, round_ids: reproduceSoundRound(item, count), index: 0, phase: 'secret', completed_rounds: [], completed_at: null }); renderReproduceSound(item); });
    return;
  }
  const roundsById = new Map(pool.map(round => [round.id, round]));
  const index = Math.min(Math.max(Number(state.index) || 0, 0), state.round_ids.length);
  if (index >= state.round_ids.length) {
    state.completed_at = new Date().toISOString(); saveActivityProgress(item.id, state); markActivityComplete(item.id); completionReturnId = item.id;
    root.innerHTML = `<main class="sound-game sound-game-complete"><div class="sound-game-content"><div class="sound-celebration" aria-hidden="true">🎉</div><h1>Le-ați ghicit pe toate!</h1><p>${state.player_count < 10 ? 'Fiecare a avut momentul lui.' : 'Ați reușit împreună.'}</p><button class="primary" type="button" data-sound-complete-back>Înapoi la activități</button></div></main>`;
    root.querySelector('[data-sound-complete-back]').onclick = renderLibrary; return;
  }
  const round = roundsById.get(state.round_ids[index]);
  if (!round) { state.index = index + 1; saveActivityProgress(item.id, state); renderReproduceSound(item); return; }
  const phase = state.phase || 'secret';
  const phaseContent = phase === 'mime'
    ? '<p class="sound-phase-title">🎭 ACUM POȚI ȘI MIMA</p><p>Sunet + mimă. Fără cuvinte.</p>'
    : phase === 'hint1'
      ? `<p class="sound-phase-title">💡 INDICIU</p><strong class="sound-hint">${esc(round.hint1)}</strong><p>Sunet + mimă. Fără cuvinte.</p>`
      : phase === 'hint2'
        ? `<p class="sound-phase-title">💡 ÎNCĂ UN INDICIU</p><strong class="sound-hint">${esc(round.hint2)}</strong><p>Sunet + mimă. Fără cuvinte.</p>`
        : '<p class="sound-phase-title">🎙️ FĂ-I SĂ GHICEASCĂ</p><p>Doar din sunet. Fără cuvinte.</p>';
  if (phase === 'secret' || phase === 'peek') {
    const duration = phase === 'peek' ? 2000 : 4000;
    root.innerHTML = `<main class="sound-game sound-secret"><button class="question-back" type="button" data-sound-back>← Activități</button><div class="sound-game-content"><p class="sound-secret-eyebrow">🙈 OCHII DE LA ECRAN</p><h1>Doar cel cu tableta se uită la ecran.</h1><p>Confirmați când sunteți gata.</p><button class="primary sound-secret-confirm" type="button" data-sound-secret-confirm>Sunt gata →</button></div></main>`;
    root.querySelector('[data-sound-back]').onclick = () => { clearTimeout(soundSecretTimer); renderLibrary(); };
    root.querySelector('[data-sound-secret-confirm]').onclick = () => {
      root.innerHTML = `<main class="sound-game sound-secret sound-secret-reveal"><div class="sound-game-content"><p class="sound-secret-eyebrow">SUNETUL TĂU ESTE</p><h1>${esc(round.label)}</h1><p>Memorează-l.</p></div></main>`;
      soundSecretTimer = setTimeout(() => renderReproduceSoundReady(item, item.__peekPhase || 'sound'), duration);
    };
    return;
  }
  root.innerHTML = `<main class="sound-game sound-round"><button class="question-back" type="button" data-sound-back>← Activități</button><div class="sound-game-content"><p class="sound-round-count">${index + 1} din ${state.round_ids.length}</p><p class="sound-round-audience">${state.player_count >= 10 ? 'Grup organic' : 'Cercul'}</p><section class="sound-phase-card">${phaseContent}</section><button class="primary sound-guessed" type="button" data-sound-guessed>✓ Au ghicit!</button><div class="sound-help-actions">${phase === 'sound' ? '<button type="button" data-sound-mime>Ajută-mă puțin →</button>' : phase === 'mime' ? '<button type="button" data-sound-hint1>Dă-ne un indiciu →</button>' : phase === 'hint1' ? '<button type="button" data-sound-hint2>Încă un indiciu →</button>' : ''}<button type="button" class="sound-forgot" data-sound-forgot>👀 Am uitat sunetul</button></div></div></main>`;
  root.querySelector('[data-sound-back]').onclick = () => { clearTimeout(soundSecretTimer); renderLibrary(); };
  const advancePhase = nextPhase => { state.phase = nextPhase; saveActivityProgress(item.id, state); renderReproduceSound(item); };
  root.querySelector('[data-sound-mime]')?.addEventListener('click', () => advancePhase('mime'));
  root.querySelector('[data-sound-hint1]')?.addEventListener('click', () => advancePhase('hint1'));
  root.querySelector('[data-sound-hint2]')?.addEventListener('click', () => advancePhase('hint2'));
  root.querySelector('[data-sound-forgot]').onclick = () => { state.phase = phase; saveActivityProgress(item.id, state); renderReproduceSound({ ...item, __peek: true, __peekPhase: phase }); };
  root.querySelector('[data-sound-guessed]').onclick = () => { state.completed_rounds = [...(state.completed_rounds || []), round.id]; state.index = index + 1; state.phase = 'secret'; saveActivityProgress(item.id, state); if (state.index >= state.round_ids.length) renderReproduceSound(item); else { root.innerHTML = `<main class="sound-game sound-next"><div class="sound-game-content"><p class="sound-secret-eyebrow">✓ AU GHICIT!</p><h1>${state.player_count < 10 ? 'Dă tableta spre stânga →' : 'Următorul sunet →'}</h1><button class="primary" type="button" data-sound-next>Continuă</button></div></main>`; root.querySelector('[data-sound-next]').onclick = () => renderReproduceSound(item); } };
  if (item.__peek) { state.phase = phase; root.querySelector('[data-sound-forgot]').click = null; renderReproduceSound({ ...item, __peek: false }); }
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
  return `<aside class="activity-dock" data-activity-dock><button class="activity-dock-toggle" type="button" data-open-activity-dock aria-expanded="false">Alegeți altă activitate <span>⌃</span></button><div class="activity-dock-panel"><span class="activity-picker-brand"><img src="${MODERN_BRAND_LOGO}" alt="Becky’s Garden"></span>${activityProgressMarkup()}<div class="activity-dock-track">${items.map(item => `<button type="button" class="activity-dock-card${isActivityLocked(item) ? ' is-locked' : ''}" data-dock-id="${esc(item.id)}" data-group-sizes="${esc((item.groupSizes || ['small','large']).join(','))}" ${supportsGroupSize(item) ? '' : 'hidden'} ${isActivityLocked(item) ? 'disabled aria-disabled="true"' : ''}>${activityLockMarkup(item)}${activityCompletionBadge(item)}${item.illustration ? `<img src="${esc(item.illustration)}" alt="" loading="lazy">` : `<span>${esc(item.cardIcon || '✦')}</span>`}<strong class="${item.title.trim().includes(' ') ? 'has-multiple-words' : ''}">${cardTitleMarkup(item.title)}</strong></button>`).join('')}</div>${groupSizeToggleMarkup()}</div></aside>`;
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
    const stages = selectedGroupSize === 'large' ? [['Dezlănțuire', '🤩'], ['Provocări', '✨'], ['Relax', '☁️']] : [['Relax', '☁️'], ['Provocări', '✨'], ['Dezlănțuire', '🤩']];
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

function renderDanceOptions(item) {
  stopMusicGame(); active = item; root.classList.remove('activity-picker-open');
  const options = Array.isArray(item.danceOptions) ? item.danceOptions : [];
  root.innerHTML = `<main class="music-game-experience dance-options-experience"><button class="question-back" type="button" data-dance-back>← Activități</button><section class="music-game-stage"><span class="music-game-kicker">DANSURI DE GRUP</span><h1>Alegeți dansul.</h1><p>Unele merg și solo. Alegeți unul și începeți când sunteți gata.</p><div class="dance-options-grid">${options.map(option => option.youtubeVideoId ? `<button type="button" class="dance-option" data-dance-name="${esc(option.name)}"><strong>${esc(option.name)}</strong><small>${esc(option.participants)}</small></button>` : `<button type="button" class="dance-option dance-option-locked" disabled aria-disabled="true"><span class="dance-option-lock" aria-hidden="true">🔒</span><strong>${esc(option.name)}</strong><small>În curând</small></button>`).join('')}</div><p class="dance-selection" data-dance-selection>Alegeți o variantă.</p></section></main>`;
  root.querySelector('[data-dance-back]').onclick = renderLibrary;
  root.querySelectorAll('[data-dance-name]').forEach(button => button.onclick = () => {
    const option = options.find(value => value.name === button.dataset.danceName);
    if (option?.youtubeVideoId) renderDanceVideo(item, option);
  });
}
function renderDanceVideo(item, option) {
  const origin = encodeURIComponent(window.location.origin);
  const videoUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(option.youtubeVideoId)}?autoplay=1&start=10&controls=1&rel=0&playsinline=1&origin=${origin}`;
  root.innerHTML = `<main class="music-game-experience dance-video-experience"><button class="question-back" type="button" data-dance-video-back>← Activități</button><section class="music-game-stage"><div class="dance-video-frame"><iframe src="${videoUrl}" title="${esc(option.name)}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></div></section></main>`;
  root.querySelector('[data-dance-video-back]').onclick = () => renderDanceOptions(item);
}

function renderDramaticSetup(item) {
  stopMusicGame(); active = item; dramaticTrackIndex = 0; dramaticSession = { total: 1, current: 1 };
  root.innerHTML = `<main class="music-game-experience dramatic-entry-experience dramatic-setup"><button class="question-back" type="button" data-dramatic-back>← Activități</button><section class="music-game-stage"><span class="music-game-kicker">MOMENTUL TĂU</span><h1>Câți participanți intră pe rând?</h1><p>Alegeți între 2 și 9 persoane. Fiecare își pregătește scena și este primit în aplauze.</p><div class="dramatic-participant-grid">${Array.from({ length: 8 }, (_, index) => `<button type="button" data-dramatic-participants="${index + 2}">${index + 2}</button>`).join('')}</div><button class="primary music-game-start" type="button" data-dramatic-setup-start>Pregătiți scena</button></section></main>`;
  root.querySelector('[data-dramatic-back]').onclick = renderLibrary;
  root.querySelectorAll('[data-dramatic-participants]').forEach(button => button.onclick = () => { root.querySelectorAll('[data-dramatic-participants]').forEach(option => option.classList.remove('is-selected')); button.classList.add('is-selected'); dramaticSession.total = Number(button.dataset.dramaticParticipants); });
  root.querySelector('[data-dramatic-participants="2"]').click();
  root.querySelector('[data-dramatic-setup-start]').onclick = () => renderDramaticEntry(item);
}

function renderDramaticEntry(item, advanceTrack = false) {
  stopMusicGame(); active = item; root.classList.remove('activity-picker-open');
  if (advanceTrack && dramaticMusicTracks.length) dramaticTrackIndex = (dramaticTrackIndex + 1) % dramaticMusicTracks.length;
  const trackItem = dramaticMusicTracks[dramaticTrackIndex % Math.max(1, dramaticMusicTracks.length)];
  if (!trackItem) {
    root.innerHTML = `<main class="music-game-experience dramatic-entry-experience"><button class="question-back" type="button" data-dramatic-back>← Activități</button><section class="music-game-stage"><span class="music-game-kicker">MOMENTUL TĂU</span><h1>Momentan nu avem o melodie pregătită.</h1><p>Adăugați un fragment audio în folderul activităților pentru părinți.</p></section></main>`;
    root.querySelector('[data-dramatic-back]').onclick = renderLibrary;
    return;
  }
  track('dramatic_entry_viewed');
    root.innerHTML = `<main class="music-game-experience dramatic-entry-experience"><button class="question-back" type="button" data-dramatic-back>← Activități</button><section class="music-game-stage"><span class="music-game-kicker">MOMENTUL TĂU</span><h1>Pentru câteva secunde, scena e a ta.</h1><p>Ieși puțin din aria vizuală. Când începe muzica, revino la grup.<br>Atât. Restul vine de la sine.</p><strong class="music-game-status" data-dramatic-status>Când începe muzica, aplaudați-l până ajunge înapoi la voi. 👏</strong><button class="primary music-game-start" type="button" data-dramatic-start>E gata. Dă-i drumul →</button></section></main>`;
  const startButton = root.querySelector('[data-dramatic-start]');
  const status = root.querySelector('[data-dramatic-status]');
  const audio = new Audio(trackItem.src); audio.preload = 'auto';
  const crowdAudio = new Audio('/assets/mp3s/Activitati%20parinti%20mp3s/Podium%20walk%20songs/clips/crowd-cheer-start.mp3'); crowdAudio.preload = 'auto'; crowdAudio.volume = 0.72;
  let started = false;
  const stopCrowd = () => { crowdAudio.pause(); crowdAudio.currentTime = 0; };
  const leave = () => { audio.pause(); stopCrowd(); audio.removeAttribute('src'); audio.load(); renderLibrary(); };
  root.querySelector('[data-dramatic-back]').onclick = leave;
  startButton.onclick = async () => {
    if (started) return;
    started = true; startButton.disabled = true; status.textContent = 'Aplaudați până ajunge înapoi la voi. 👏'; root.querySelector('.music-game-stage h1').textContent = '👏 APLAUZE, APLAUZE!'; root.querySelector('.music-game-stage p').textContent = 'Până ajunge înapoi la voi.';
    const token = ++musicGameRunToken;
    try {
      if (audio.readyState < 1) await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Audio metadata timeout')), 4000); audio.addEventListener('loadedmetadata', () => { clearTimeout(timeout); resolve(); }, { once: true }); audio.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Audio load error')); }, { once: true }); });
      if (!Number.isFinite(audio.duration) || trackItem.start < 0 || trackItem.end <= trackItem.start || trackItem.end > audio.duration + .15) throw new Error('Interval audio invalid');
      audio.pause();
      audio.currentTime = trackItem.start;
      if (trackItem.start > 0 && Math.abs(audio.currentTime - trackItem.start) > 0.25) {
        await new Promise(resolve => {
          const finishSeek = () => { audio.removeEventListener('seeked', finishSeek); resolve(); };
          audio.addEventListener('seeked', finishSeek, { once: true });
          setTimeout(finishSeek, 1200);
        });
      }
      await audio.play();
      crowdAudio.currentTime = 0; crowdAudio.play().catch(() => {});
      startButton.outerHTML = '<div class="dramatic-playing" data-dramatic-playing role="status" aria-live="polite"><div class="dramatic-now-playing"><span class="dramatic-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><strong>Muzica rulează…</strong></div><div class="dramatic-time-left"><b data-dramatic-countdown>23</b><small>secunde rămase</small></div><button class="secondary dramatic-stop" type="button" data-dramatic-stop>Oprește muzica</button></div>';
      const playingIndicator = root.querySelector('[data-dramatic-playing]');
      saveActivityProgress(item.id, { version: 1, track_id: trackItem.id, started_at: new Date().toISOString(), completed_at: null });
      const stopAtEnd = () => {
        if (token !== musicGameRunToken || !started) return;
        const countdown = playingIndicator?.querySelector('[data-dramatic-countdown]');
        if (countdown) countdown.textContent = Math.max(0, Math.ceil(trackItem.end - audio.currentTime));
        if (audio.ended && audio.currentTime < trackItem.end) { clearInterval(musicGameTimer); started = false; stopCrowd(); status.textContent = 'Fragmentul audio nu are intervalul complet.'; playingIndicator?.remove(); return; }
        if (audio.currentTime < trackItem.end) return;
        clearInterval(musicGameTimer); audio.pause(); stopCrowd(); started = false; status.textContent = '👏 Bine ai venit înapoi!';
        saveActivityProgress(item.id, { version: 1, track_id: trackItem.id, participant: dramaticSession.current, participant_count: dramaticSession.total, completed_at: new Date().toISOString() });
        playingIndicator?.remove();
        if (dramaticSession.current < dramaticSession.total) {
          status.textContent = `👏 Participantul ${dramaticSession.current} a revenit. Pregătiți scena pentru următorul.`;
          const nextButton = document.createElement('button'); nextButton.className = 'primary music-game-start'; nextButton.type = 'button'; nextButton.textContent = `Următorul participant · ${dramaticSession.current + 1}/${dramaticSession.total}`; nextButton.onclick = () => { dramaticSession.current += 1; renderDramaticEntry(item, true); }; root.querySelector('.music-game-stage').append(nextButton);
        } else {
          markActivityComplete(item.id); completionReturnId = item.id;
          const returnButton = document.createElement('button'); returnButton.className = 'primary music-game-start'; returnButton.type = 'button'; returnButton.textContent = 'Înapoi la activități'; returnButton.onclick = renderLibrary; root.querySelector('.music-game-stage').append(returnButton);
        }
      };
      const wireStopControl = () => {
        playingIndicator.querySelector('[data-dramatic-stop]')?.addEventListener('click', () => {
          clearInterval(musicGameTimer); audio.pause(); stopCrowd(); started = false; status.textContent = 'Poate intra următorul participant.';
          playingIndicator.innerHTML = '<strong>Muzica este oprită.</strong><div class="dramatic-paused-actions"><button class="primary music-game-start" type="button" data-dramatic-resume>Continuă muzica</button><button class="secondary music-game-start" type="button" data-dramatic-next>Următorul participant</button></div>';
          playingIndicator.querySelector('[data-dramatic-resume]').onclick = async () => { started = true; status.textContent = 'Aplaudați până ajunge înapoi la voi. 👏'; playingIndicator.innerHTML = '<div class="dramatic-now-playing"><span class="dramatic-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><strong>Muzica rulează…</strong></div><div class="dramatic-time-left"><b data-dramatic-countdown>23</b><small>secunde rămase</small></div><button class="secondary dramatic-stop" type="button" data-dramatic-stop>Oprește muzica</button>'; wireStopControl(); await audio.play(); musicGameTimer = setInterval(stopAtEnd, 50); stopAtEnd(); };
          playingIndicator.querySelector('[data-dramatic-next]').onclick = () => { dramaticSession.current = Math.min(dramaticSession.total, dramaticSession.current + 1); renderDramaticEntry(item, true); };
        });
      };
      wireStopControl();
      musicGameTimer = setInterval(stopAtEnd, 50); stopAtEnd();
    } catch { started = false; startButton.disabled = false; status.textContent = 'Melodia nu a putut fi pornită. Încercați din nou.'; }
  };
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

function miniQuizQuestions(item) { return Array.isArray(item.miniQuizQuestions) ? item.miniQuizQuestions : []; }
function miniQuizRound(questionCount, pool) {
  const plans = {
    2: [0, 7], 3: [0, 5, 7], 4: [0, 1, 5, 7], 5: [0, 1, 2, 5, 7],
    6: [0, 1, 2, 3, 5, 7], 7: [0, 1, 2, 3, 4, 5, 7], 8: [0, 1, 2, 3, 4, 5, 7, 8],
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8], 10: [0, 1, 2, 3, 4, 5]
  };
  return (plans[questionCount] || plans[10]).filter(index => pool[index]).map(index => pool[index].id);
}
function miniQuizState(item) { return activityProgress()[item.id] || {}; }
function renderMiniQuiz(item, mode = 'setup') {
  stopMusicGame(); active = item; root.classList.remove('activity-picker-open');
  const pool = miniQuizQuestions(item);
  let state = miniQuizState(item);
  if (state.completed_at || completedActivityIds().includes(item.id)) { renderLibrary(); return; }
  if (!Array.isArray(state.question_ids) || !state.question_ids.length || !Number.isInteger(state.player_count)) {
    root.innerHTML = `<main class="quiz-experience mini-quiz-setup"><button class="question-back" type="button" data-quiz-back>← Activități</button><div class="quiz-content"><img class="quiz-illustration" src="${esc(item.illustration)}" alt=""><p class="quiz-kicker">VOI vs QUIZ</p><h1>${esc(item.title || 'MINI-QUIZ de grup')}</h1><p class="quiz-intro">Câți jucați?</p><div class="mini-quiz-player-grid">${[2,3,4,5,6,7,8,9].map(count => `<button type="button" data-mini-count="${count}">${count}</button>`).join('')}<button type="button" data-mini-count="10">10+</button></div><p class="quiz-hint">Alegeți răspunsul împreună, apoi verificați-l.</p></div></main>`;
    root.querySelector('[data-quiz-back]').onclick = renderLibrary;
    root.querySelectorAll('[data-mini-count]').forEach(button => button.onclick = () => {
      const count = Number(button.dataset.miniCount); const round = miniQuizRound(count, pool);
      saveActivityProgress(item.id, { version: 1, player_count: count, question_ids: round, index: 0, you_score: 0, quiz_score: 0, answered: [], skipped: [], completed_at: null });
      renderMiniQuiz(item, 'play');
    });
    return;
  }
  const questionsById = new Map(pool.map(question => [question.id, question]));
  const index = Math.min(Math.max(Number(state.index) || 0, 0), state.question_ids.length);
  if (index >= state.question_ids.length) {
    state.completed_at = new Date().toISOString(); saveActivityProgress(item.id, state); markActivityComplete(item.id); completionReturnId = item.id;
    const you = Number(state.you_score) || 0; const quiz = Number(state.quiz_score) || 0;
    const result = you > quiz ? 'Ați bătut Quizul.' : you === quiz ? 'Egalitate. Quizul cere revanșa.' : 'Quizul a luat runda.';
    root.innerHTML = `<main class="quiz-experience mini-quiz-complete"><div class="quiz-content"><p class="quiz-kicker">RUNDĂ COMPLETATĂ</p><h1>VOI ${you} — QUIZ ${quiz}</h1><p class="quiz-complete-result">${result}</p><button class="primary" type="button" data-quiz-complete-back>Înapoi la activități</button></div></main>`;
    root.querySelector('[data-quiz-complete-back]').onclick = renderLibrary; return;
  }
  const question = questionsById.get(state.question_ids[index]);
  if (!question) { state.index = index + 1; saveActivityProgress(item.id, state); renderMiniQuiz(item, 'play'); return; }
  track('mini_quiz_question_viewed', { question_id: question.id, question_index: index, player_count: state.player_count });
  const miniQuizGroupNote = state.player_count >= 10 && index === 0 ? '<div class="mini-quiz-group-note">Oricine poate răspunde. Hotărâți-vă împreună, apoi verificați răspunsul.</div>' : '';
    const turnMessage = state.player_count >= 10
      ? 'Oricine poate răspunde. Hotărâți împreună răspunsul final.'
      : index === 0
        ? 'Cine are tableta coordonează prima întrebare.'
        : 'După răspuns, dă tableta spre stânga →';
    root.innerHTML = `<main class="quiz-experience quiz-play mini-quiz-play"><button class="question-back" type="button" data-quiz-back>← Activități</button><div class="quiz-player"><div class="mini-quiz-score"><strong>VOI ${state.you_score || 0}</strong><span>—</span><strong>QUIZ ${state.quiz_score || 0}</strong></div><div class="quiz-player-heading"><strong>${index + 1} / ${state.question_ids.length}</strong><small>${state.player_count >= 10 ? 'Grup organic' : 'Cercul'}</small></div><div class="mini-quiz-turn">${turnMessage}</div>${miniQuizGroupNote}<button class="quiz-flip-card" type="button" data-quiz-flip aria-label="Vezi răspunsul"><span class="quiz-flip-inner"><span class="quiz-face quiz-front"><small>ÎNTREBAREA</small><strong>${esc(question.question)}</strong></span><span class="quiz-face quiz-back"><small>${esc(question.answer)}</small><strong>${esc(question.funFact)}</strong></span></span></button><div class="quiz-player-actions"><button class="primary quiz-reveal" type="button" data-quiz-reveal>Verificați răspunsul</button><div class="mini-quiz-scoring" hidden><p>Ați nimerit-o?</p><button type="button" data-score="you">Ați nimerit-o ✓</button><button type="button" data-score="quiz">N-ați nimerit-o</button></div><button class="primary quiz-next-question" type="button" data-quiz-next hidden>${state.player_count >= 10 ? 'Următoarea întrebare' : 'Dă tableta spre stânga →'}</button></div><button class="quiz-skip" type="button" data-quiz-skip>Altă întrebare</button></div></main>`;
  const miniQuizQuestionText = root.querySelector('.quiz-front strong');
  const miniQuizTextClass = responsiveTextClass(question.question) || (question.question.length > 75 ? 'is-text-medium' : '');
  if (miniQuizQuestionText && miniQuizTextClass) miniQuizQuestionText.classList.add(miniQuizTextClass);
  root.querySelector('[data-quiz-back]').onclick = () => { track('mini_quiz_exit'); renderLibrary(); };
  root.querySelector('[data-quiz-skip]').onclick = () => {
    const replacement = pool.find(candidate => !state.question_ids.includes(candidate.id) && !(state.skipped || []).includes(candidate.id));
    track('mini_quiz_question_skipped', { question_id: question.id, question_index: index });
    if (!replacement) { root.querySelector('[data-quiz-skip]').textContent = 'Nu mai există o întrebare de rezervă'; root.querySelector('[data-quiz-skip]').disabled = true; return; }
    state.question_ids[index] = replacement.id; state.skipped = [...(state.skipped || []), question.id]; saveActivityProgress(item.id, state); renderMiniQuiz(item, 'play');
  };
  const flip = () => { const card = root.querySelector('[data-quiz-flip]'); if (card.classList.contains('is-flipped')) return; card.classList.add('is-flipped'); root.querySelector('[data-quiz-reveal]').hidden = true; root.querySelector('[data-quiz-skip]').hidden = true; root.querySelector('.mini-quiz-scoring').hidden = false; track('mini_quiz_answer_revealed', { question_id: question.id, question_index: index }); };
  root.querySelector('[data-quiz-flip]').onclick = flip; root.querySelector('[data-quiz-reveal]').onclick = flip;
  root.querySelectorAll('[data-score]').forEach(button => button.onclick = () => {
    if (root.querySelector('[data-score].is-selected')) return;
    insights.emit('mini_quiz_result', { question_id: question.id, result: button.dataset.score });
    const result = button.dataset.score; state.you_score = Number(state.you_score) || 0; state.quiz_score = Number(state.quiz_score) || 0; state[result === 'you' ? 'you_score' : 'quiz_score'] += 1; state.answered = [...(state.answered || []), { question_id: question.id, result }]; saveActivityProgress(item.id, state); button.classList.add('is-selected'); root.querySelectorAll('[data-score]').forEach(control => { control.disabled = true; }); root.querySelector('.mini-quiz-score').innerHTML = `<strong>VOI ${state.you_score}</strong><span>—</span><strong>QUIZ ${state.quiz_score}</strong>`; const scoring = root.querySelector('.mini-quiz-scoring'); const next = root.querySelector('[data-quiz-next]'); scoring.classList.add('is-complete'); setTimeout(() => { next.hidden = false; }, 360);
  });
  root.querySelector('[data-quiz-next]').onclick = () => { state.index = index + 1; saveActivityProgress(item.id, state); renderMiniQuiz(item, 'play'); };
}

window.addEventListener('pagehide', () => track('session_end'));

async function revealInitialLibrary(sessionMode = 'new') {
  const opening = root.querySelector('.parents-opening');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const openingItems = currentGalleryActivities().slice(0, 3);
  const openingDeck = opening?.querySelector('.opening-deck');
  if (openingDeck) {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const positions = openingItems.length === 1 ? [-50] : openingItems.length === 2 ? [-100, 0] : portrait ? [-108, -50, 8] : [-142, -50, 42];
    openingItems.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'opening-card opening-card-dynamic';
      card.dataset.openingId = item.id;
      card.style.setProperty('--opening-x', `${positions[index]}%`);
      card.style.setProperty('--opening-rotation', `${openingItems.length === 1 ? 0 : (index - (openingItems.length - 1) / 2) * 5}deg`);
      card.style.setProperty('--opening-delay', `${sessionMode === 'profile' ? 0 : .4 + index * .08}s`);
      card.style.zIndex = index === Math.floor(openingItems.length / 2) ? '2' : '1';
      card.innerHTML = item.illustration ? `<img src="${esc(item.illustration)}" alt="">` : `<span class="opening-card-icon">${esc(item.cardIcon || '✦')}</span>`;
      openingDeck.append(card);
    });
    opening.classList.add('has-dynamic-cards');
  }
  if (!reduceMotion && sessionMode !== 'profile') await new Promise(resolve => setTimeout(resolve, 1420));
  opening?.classList.add('is-opening-settled');
  if (!reduceMotion) await new Promise(resolve => setTimeout(resolve, 32));
  const openingCards = opening ? [...opening.querySelectorAll('.opening-card')] : [];
  const sourceCards = openingCards.map(card => {
    const visual = card.querySelector('img, .opening-card-icon');
    return { id: card.dataset.openingId, rect: card.getBoundingClientRect(), visual: visual?.cloneNode(true), visualRect: visual?.getBoundingClientRect() };
  });
  const openingLogo = opening?.querySelector('.opening-logo');
  const sourceLogo = openingLogo ? { node: openingLogo.cloneNode(true), rect: openingLogo.getBoundingClientRect() } : null;
  opening?.remove();
  renderLibrary();
  const shell = root.querySelector('.parents-shell');
  if (!opening || !shell) return;
  shell.classList.add('is-opening-hidden');
  root.append(opening);
  if (reduceMotion) {
    shell.classList.remove('is-opening-hidden');
    root.append(opening);
    opening.classList.add('is-leaving');
    await new Promise(resolve => setTimeout(resolve, 80));
    opening.remove();
    return;
  }
  const targetCards = sourceCards.map(source => root.querySelector(`.activity-card[data-id="${CSS.escape(source.id)}"]`));
  const targetLogo = root.querySelector('.parents-top .brand img');
  if (targetLogo && !targetLogo.complete) await targetLogo.decode().catch(() => {});
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const canBridge = sourceCards.length > 0 && targetCards.every(Boolean) && sourceCards.every(source => source.visual && source.visualRect);
  if (!canBridge) {
    shell.classList.remove('is-opening-hidden');
    shell.classList.add('is-opening-reveal');
    root.append(opening);
    setTimeout(() => { shell.classList.add('is-visible'); opening.classList.add('is-leaving'); }, 32);
    await new Promise(resolve => setTimeout(resolve, 820));
    opening.remove();
    shell.classList.remove('is-opening-reveal', 'is-visible');
    return;
  }
  const targetRects = targetCards.map(card => card.getBoundingClientRect());
  const targetLogoRect = targetLogo?.getBoundingClientRect();
  const targetCardSet = new Set(targetCards);
  const openingTitles = targetCards.map(card => card.querySelector('h2')).filter(Boolean);
  const remainingCards = [...shell.querySelectorAll('.activity-card')].filter(card => !targetCardSet.has(card));
  const progressElement = shell.querySelector(':scope > .slider-progress');
  openingTitles.forEach(title => { title.style.opacity = '0'; });
  remainingCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translate3d(18px,0,0)';
  });
  if (progressElement) {
    progressElement.style.opacity = '0';
    progressElement.style.transform = 'translate3d(10px,0,0)';
  }
  opening.classList.add('is-bridging');
  const bridgeNodes = [];
  sourceCards.forEach(({ rect, visual, visualRect }, index) => {
    const cardBridge = document.createElement('span');
    cardBridge.className = 'opening-bridge-card';
    const targetCardStyle = getComputedStyle(targetCards[index]);
    cardBridge.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:${targetCardStyle.background};border:${targetCardStyle.border};box-shadow:${targetCardStyle.boxShadow}`;
    opening.append(cardBridge);
    const target = targetRects[index];
    bridgeNodes.push(cardBridge.animate([
      { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: '26px' },
      { left: `${target.left}px`, top: `${target.top}px`, width: `${target.width}px`, height: `${target.height}px`, borderRadius: getComputedStyle(targetCards[index]).borderRadius }
    ], { duration: 920, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }));
    const targetVisual = targetCards[index].querySelector('.activity-illustration, .activity-icon-illustration');
    const targetVisualRect = targetVisual.getBoundingClientRect();
    visual.className = visual.tagName === 'IMG' ? 'opening-bridge-illustration' : 'opening-bridge-illustration is-icon';
    visual.style.cssText = `left:${visualRect.left}px;top:${visualRect.top}px;width:${visualRect.width}px;height:${visualRect.height}px`;
    opening.append(visual);
    bridgeNodes.push(visual.animate([
      { left: `${visualRect.left}px`, top: `${visualRect.top}px`, width: `${visualRect.width}px`, height: `${visualRect.height}px` },
      { left: `${targetVisualRect.left}px`, top: `${targetVisualRect.top}px`, width: `${targetVisualRect.width}px`, height: `${targetVisualRect.height}px` }
    ], { duration: 920, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }));
  });
  const hasVisibleTargetLogo = targetLogoRect && targetLogoRect.width > 1 && targetLogoRect.height > 1;
  if (sourceLogo && hasVisibleTargetLogo) {
    sourceLogo.node.className = 'opening-bridge-logo';
    sourceLogo.node.style.cssText = `left:${sourceLogo.rect.left}px;top:${sourceLogo.rect.top}px;width:${sourceLogo.rect.width}px;height:${sourceLogo.rect.height}px`;
    opening.append(sourceLogo.node);
    bridgeNodes.push(sourceLogo.node.animate([
      { left: `${sourceLogo.rect.left}px`, top: `${sourceLogo.rect.top}px`, width: `${sourceLogo.rect.width}px`, height: `${sourceLogo.rect.height}px`, opacity: 1 },
      { left: `${targetLogoRect.left}px`, top: `${targetLogoRect.top}px`, width: `${targetLogoRect.width}px`, height: `${targetLogoRect.height}px`, opacity: 1 }
    ], { duration: 820, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }));
  }
  opening.querySelector('.opening-world').style.opacity = '0';
  await Promise.race([
    Promise.allSettled(bridgeNodes.map(animation => animation.finished)),
    new Promise(resolve => setTimeout(resolve, 1100))
  ]);
  shell.classList.add('is-opening-handoff-ready');
  shell.classList.remove('is-opening-hidden');
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  opening.querySelectorAll('.opening-bridge-card').forEach(card => { card.style.visibility = 'hidden'; });
  const revealAnimations = [];
  openingTitles.forEach(title => {
    const animation = title.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      delay: 45,
      easing: 'ease-out',
      fill: 'forwards'
    });
    revealAnimations.push(animation);
    animation.finished.then(() => {
      title.style.opacity = '';
      animation.cancel();
    });
  });
  remainingCards.forEach((card, index) => {
    const animation = card.animate([
      { opacity: 0, transform: 'translate3d(18px,0,0)' },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], {
      duration: 420,
      delay: 100 + Math.min(index, 5) * 35,
      easing: 'cubic-bezier(.16,1,.3,1)',
      fill: 'forwards'
    });
    revealAnimations.push(animation);
    animation.finished.then(() => {
      card.style.opacity = '';
      card.style.transform = '';
      animation.cancel();
    });
  });
  if (progressElement) {
    const animation = progressElement.animate([
      { opacity: 0, transform: 'translate3d(10px,0,0)' },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], {
      duration: 420,
      delay: 150,
      easing: 'cubic-bezier(.16,1,.3,1)',
      fill: 'forwards'
    });
    revealAnimations.push(animation);
    animation.finished.then(() => {
      progressElement.style.opacity = '';
      progressElement.style.transform = '';
      animation.cancel();
    });
  }
  const visualHandoffs = [...opening.querySelectorAll('.opening-bridge-illustration, .opening-bridge-logo')].map(node => node.animate([
    { opacity: 1 },
    { opacity: 0 }
  ], { duration: 180, easing: 'ease-out', fill: 'forwards' }));
  await Promise.allSettled(visualHandoffs.map(animation => animation.finished));
  opening.remove();
  shell.classList.remove('is-opening-reveal', 'is-visible', 'is-opening-handoff-ready');
  await Promise.allSettled(revealAnimations.map(animation => animation.finished));
}

(async () => {
  registerParentsPwa();
  try {
    if (document.fonts?.load) {
      await Promise.race([
        Promise.all([
          document.fonts.load('700 24px Quicksand'),
          document.fonts.load('600 24px DynaPuff')
        ]),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]).catch(() => {});
    }
    document.documentElement.classList.remove('fonts-loading');
    document.documentElement.classList.add('fonts-ready');
    const response = await fetch('/api/parents/experiences');
    const payload = await response.json();
    activities = payload.experiences || [];
    musicTracks = payload.musicTracks || [];
    dramaticMusicTracks = payload.dramaticMusicTracks || [];
    track('session_start', { mode: 'manual' });
    const sessionMode = await showSessionGate();
    await revealInitialLibrary(sessionMode);
    lockParentsLandscape();
    setTimeout(showInstallModal, 650);
  } catch {
    root.innerHTML = '<div class="parents-loading">Nu am putut încărca experiența. Reîncercați.</div>';
  }
})();
