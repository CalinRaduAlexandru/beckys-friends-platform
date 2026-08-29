(() => {
  const emptyActivity = () => ({
    id: `activity-${crypto.randomUUID().slice(0, 8)}`,
    libraryType: 'public',
    title: 'Activitate nouă',
    subtitle: '',
    age: '5–6 ani · 7–8 ani',
    ageCategories: ['5–6 ani', '7–8 ani'],
    duration: '10 min',
    durationPreset: '10 min',
    durationRange: '',
    durationCategories: ['10 min'],
    participants: '1–4 copii',
    participantCategories: ['Individual', '2–3 copii', '4–9 copii'],
    category: 'Gândește',
    difficulty: 'Fără echipament',
    skills: 'atenție, coordonare, colaborare',
    materials: '',
    steps: '',
    rules: '',
    facilitator: '',
    easier: '',
    harder: '',
    caution: '',
    reflection: '',
    illustrationStyle: 'activity',
    illustrationPrompt: '',
    image: ''
  });

  const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
  const lines = value => String(value || '').split(/\n+/).map(item => item.replace(/^\s*(?:[-•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
  const api = (...args) => window.adminApiFetch ? window.adminApiFetch(...args) : fetch(...args);

  let payload = null;
  let workspace = null;
  let activities = [];
  let selectedActivityId = '';
  let saveState = 'Salvat';
  let saveTimer = null;
  let imageBusy = '';
  let resizeBound = false;
  let activeFormTab = 'essential';
  let libraryStep = 'categories';
  let libraryFilters = { category: '', age: '', participants: '', implementation: '' };

  const activityCategories = [
    ['Gândește', 'category-think.png', 'blue'], ['Simte', 'category-feel-v2.png', 'coral'], ['Colaborează', 'category-collaborate.png', 'orange'],
    ['Devine independent', 'category-independent-v3.png', 'green'], ['Creează', 'category-create.png', 'purple'], ['Se mișcă', 'category-move.png', 'teal']
  ];
  const categoryDevelopment = {
    'Gândește': 'dezvoltarea cognitivă & funcțiile executive',
    'Simte': 'dezvoltarea emoțională',
    'Colaborează': 'dezvoltarea socială & relațională',
    'Devine independent': 'autonomie & autoreglare',
    'Creează': 'creativitate & expresie',
    'Se mișcă': 'dezvoltarea motrică & senzorială'
  };
  const categoryPriorityTitles = {
    'Gândește': 'Gândirea', 'Simte': 'Simțirea', 'Colaborează': 'Colaborarea',
    'Devine independent': 'Independența', 'Creează': 'Creativitatea', 'Se mișcă': 'Mișcarea'
  };
  const ageFilters = ['1–2 ani', '3–4 ani', '5–6 ani', '7–8 ani', '9+ ani'];
  const durationPresets = ['5 min', '10 min', '15 min', '30 min', '1 oră'];
  const participantFilters = ['Individual', '2–3 copii', '4–9 copii', '10+ copii'];
  const implementationFilters = ['Fără echipament', 'Cu o recuzită la îndemână', 'Cu o recuzită specială', 'Cu set de materiale dedicate'];
  const filterIconBase = '/assets/activity-library-icons/final/';
  const filterIcons = {
    age: ['age-1-2.png','age-2-4.png','age-4-6.png','age-6-8.png','age-8-plus.png'],
    participants: ['group-individual-v2.png','group-2-3.png','group-4-9.png','group-10-plus.png'],
    implementation: ['prep-none.png','prep-everyday.png','prep-special.png','prep-kit.png']
  };

  function selectedActivity() { return activities.find(activity => activity.id === selectedActivityId) || activities[0]; }

  function activityIsComplete(activity) {
    const title = String(activity?.title || '').trim();
    return Boolean(title && title !== 'Activitate nouă' && (String(activity.steps || '').trim() || String(activity.image || '').trim()));
  }

  function normalizeActivity(activity = {}) {
    const legacyDifficulty = ['Foarte ușor', 'Ușor', 'Mediu', 'Provocator'].includes(activity.difficulty);
    const difficulty = legacyDifficulty ? (String(activity.materials || '').trim() ? 'Cu o recuzită la îndemână' : 'Fără echipament') : activity.difficulty;
    const sourceAges = Array.isArray(activity.ageCategories) && activity.ageCategories.length ? activity.ageCategories : [activity.age];
    const matchedAges = ageFilters.filter(value => sourceAges.some(source => ageMatches(source, value)));
    const ageCategories = matchedAges.length ? ageFilters.slice(ageFilters.indexOf(matchedAges[0]), ageFilters.indexOf(matchedAges.at(-1)) + 1) : [];
    const legacyDuration = String(activity.durationRange || activity.duration || activity.durationPreset || '').trim();
    const durationCategories = normalizeDurationCategories(activity.durationCategories, legacyDuration);
    const durationPreset = durationCategories[0];
    const durationRange = durationCategories.length > 1 ? durationSelectionLabel(durationCategories) : '';
    const matchedParticipants = Array.isArray(activity.participantCategories) && activity.participantCategories.length
      ? activity.participantCategories.filter(value => participantFilters.includes(value))
      : participantFilters.filter(value => participantRangeMatches(activity.participants, value));
    const participantCategories = matchedParticipants.length ? participantFilters.slice(participantFilters.indexOf(matchedParticipants[0]), participantFilters.indexOf(matchedParticipants.at(-1)) + 1) : [];
    const libraryType = activity.libraryType === 'internal' ? 'internal' : 'public';
    return { ...emptyActivity(), ...activity, libraryType, ageCategories: ageCategories.length ? ageCategories : ['5–6 ani'], age: ageSelectionLabel(ageCategories.length ? ageCategories : ['5–6 ani']), durationCategories, durationPreset, durationRange, duration: durationSelectionLabel(durationCategories), participantCategories: participantCategories.length ? participantCategories : [participantKind(activity.participants)], participants: participantSelectionLabel(participantCategories.length ? participantCategories : [participantKind(activity.participants)]), category: activity.category || 'Gândește', difficulty: libraryType === 'internal' ? 'Set dedicat Becky' : (difficulty || 'Fără echipament'), id: activity.id || `activity-${crypto.randomUUID().slice(0, 8)}` };
  }
  function setCurrent(activityId) { selectedActivityId = activities.some(item => item.id === activityId) ? activityId : activities[0]?.id || ''; }

  function scheduleSave() {
    saveState = 'Modificări nesalvate';
    updateSaveLabel();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);
  }

  async function save() {
    if (!payload || !workspace) return;
    saveState = 'Se salvează…';
    updateSaveLabel();
    workspace.activities = activities;
    delete workspace.activityPages;
    workspace.activityEditorVersion = 3;
    workspace.physicalInteractions ||= [];
    workspace.magicTricks ||= [];
    payload.updatedAt = new Date().toISOString();
    try {
      const response = await api('/api/workspaces', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('Salvarea nu a reușit');
      payload = await response.json();
      workspace = payload.workspaces.find(item => item.id === 'children');
      activities = (workspace.activities || []).map(normalizeActivity);
      saveState = 'Salvat acum';
    } catch { saveState = 'Salvarea nu a reușit'; }
    updateSaveLabel();
  }

  function updateSaveLabel() {
    const label = document.querySelector('[data-activity-save-state]');
    if (label) label.textContent = saveState;
  }

  function ageLabel(activity) { return ageSelectionLabel(activity.ageCategories || []) || activity.age || ''; }
  function durationLabel(activity) { return durationSelectionLabel(activity.durationCategories || normalizeDurationCategories([], activity.duration)); }
  function participantLabel(activity) { return participantSelectionLabel(activity.participantCategories || [participantKind(activity.participants)]); }
  function categoryTone(activity) { return activityCategories.find(([label]) => label === activity.category)?.[2] || 'teal'; }
  function metaChip(label, value) { return value ? `<span><b>${safe(label)}</b>${safe(value)}</span>` : ''; }
  function listSection(kicker, title, value, ordered = false, className = '') {
    const items = lines(value);
    if (!items.length) return '';
    const tag = ordered ? 'ol' : 'ul';
    return `<section class="activity-sheet-section ${className}"><small>${safe(kicker)}</small><h4>${safe(title)}</h4><${tag}>${items.map(item => `<li>${safe(item)}</li>`).join('')}</${tag}></section>`;
  }

  function activityCard(activity, count) {
    const hasVariants = activity.easier || activity.harder;
    const tone = categoryTone(activity);
    return `<article class="activity-sheet-card tone-${tone} ${activity.image ? 'has-image' : ''}" data-preview-activity="${safe(activity.id)}">
      <header class="activity-sheet-hero">
        <div class="activity-sheet-card-head"><small>${activity.libraryType === 'internal' ? 'ACTIVITATE INTERNĂ BECKY · ' : ''}${safe(activity.category || 'Activitate Becky')}</small><h2>${safe(activity.title)}</h2>${activity.subtitle ? `<p>${safe(activity.subtitle)}</p>` : ''}<div class="activity-sheet-meta">${metaChip('VÂRSTĂ', ageLabel(activity))}${metaChip('DURATĂ', durationLabel(activity))}${metaChip('GRUP', participantLabel(activity))}${metaChip('IMPLEMENTARE', activity.difficulty)}</div></div>
        <div class="activity-sheet-illustration ${activity.image ? '' : 'is-empty'}">${activity.image ? `<img src="${safe(activity.image)}" alt="">` : '<span>✦</span>'}</div>
      </header>
      ${activity.skills ? `<section class="activity-sheet-skills"><b>CE EXERSĂM</b><span>${safe(activity.skills)}</span></section>` : ''}
      <div class="activity-sheet-columns ${count > 1 ? 'is-compact' : ''}">
        ${listSection('PREGĂTEȘTE', 'Materiale', activity.materials, false, 'is-materials')}
        ${listSection('PAS CU PAS', 'Cum se joacă', activity.steps, true, 'is-steps')}
        ${listSection('REPER CLAR', 'Reguli', activity.rules, false, 'is-rules')}
        ${activity.facilitator ? `<section class="activity-sheet-section is-callout"><small>POȚI SPUNE</small><h4>Replica facilitatorului</h4><p>„${safe(activity.facilitator.replace(/^[„\"]|[”\"]$/g, ''))}”</p></section>` : ''}
        ${hasVariants ? `<section class="activity-sheet-section is-variants"><small>REGLEAZĂ PROVOCAREA</small><h4>Adaptează activitatea</h4>${activity.easier ? `<p><b>Mai ușor:</b> ${safe(activity.easier)}</p>` : ''}${activity.harder ? `<p><b>Mai greu:</b> ${safe(activity.harder)}</p>` : ''}</section>` : ''}
        ${activity.caution ? `<section class="activity-sheet-section is-caution"><small>DE ȚINUT MINTE</small><h4>Atenție</h4><p>${safe(activity.caution)}</p></section>` : ''}
      </div>
      ${activity.reflection ? `<footer class="activity-sheet-reflection"><b>LA FINAL</b><span>${safe(activity.reflection)}</span></footer>` : ''}
    </article>`;
  }

  function activityPreview(activity) {
    return `<div class="activity-sheet-page count-1" data-activity-sheet-page>
      <main>${activityCard(activity, 1)}</main>
    </div>`;
  }

  function field(label, key, value, options = {}) {
    if (options.select) return `<label>${safe(label)}<select data-activity-field="${key}">${options.select.map(item => { const optionValue = typeof item === 'object' ? item.value : item; const optionLabel = typeof item === 'object' ? item.label : item; return `<option value="${safe(optionValue)}" ${optionValue === value ? 'selected' : ''}>${safe(optionLabel)}</option>`; }).join('')}</select></label>`;
    const placeholder = options.placeholder ? ` placeholder="${safe(options.placeholder)}"` : '';
    const control = options.long
      ? `<textarea data-activity-field="${key}"${placeholder}>${safe(value)}</textarea>`
      : `<input data-activity-field="${key}" value="${safe(value)}"${placeholder}>`;
    return `<label class="${options.wide ? 'is-wide' : ''}">${safe(label)}${control}</label>`;
  }

  function ageCategoryField(activity) {
    const selected = activity.ageCategories || [];
    return `<fieldset class="activity-age-categories is-wide"><legend>Categorii de vârstă</legend><div>${ageFilters.map((value, index) => `<button type="button" class="${selected.includes(value) ? 'is-active' : ''}" data-activity-age="${safe(value)}" aria-pressed="${selected.includes(value)}"><img src="${filterIconBase}${filterIcons.age[index]}" alt=""><span>${safe(value)}</span></button>`).join('')}</div></fieldset>`;
  }

  function durationField(activity) {
    const selected = activity.durationCategories || ['10 min'];
    return `<fieldset class="activity-duration-options is-wide"><legend>Durată</legend><div class="activity-duration-presets">${durationPresets.map(value => `<button type="button" class="${selected.includes(value) ? 'is-active' : ''}" data-activity-duration="${safe(value)}" aria-pressed="${selected.includes(value)}"><span>◷</span><b>${safe(value)}</b></button>`).join('')}</div></fieldset>`;
  }

  function durationSelectionLabel(selected = []) {
    const ordered = durationPresets.filter(value => selected.includes(value));
    if (!ordered.length) return '10 min';
    return ordered.length === 1 ? ordered[0] : `${ordered[0]} – ${ordered.at(-1)}`;
  }

  function ageSelectionLabel(selected = []) {
    const ordered = ageFilters.filter(value => selected.includes(value));
    if (!ordered.length) return '';
    if (ordered.length === 1) return ordered[0];
    const start = ordered[0].match(/\d+/)?.[0] || '1';
    const end = ordered.at(-1).includes('+') ? '9+' : ordered.at(-1).match(/\d+/g)?.at(-1);
    return `${start}–${end} ani`;
  }

  function participantSelectionLabel(selected = []) {
    const ordered = participantFilters.filter(value => selected.includes(value));
    if (!ordered.length) return '';
    if (ordered.length === 1) return ordered[0];
    const start = ordered[0] === 'Individual' ? '1' : ordered[0].match(/\d+/)?.[0];
    const end = ordered.at(-1).includes('+') ? '10+' : ordered.at(-1).match(/\d+/g)?.at(-1);
    return `${start}–${end} copii`;
  }

  function contiguousChoice(options, current, value) {
    const selected = options.filter(option => current.includes(option));
    const clickedIndex = options.indexOf(value);
    const startIndex = options.indexOf(selected[0]);
    const endIndex = options.indexOf(selected.at(-1));
    if (clickedIndex < 0 || !selected.length) return [value];
    if (selected.length === 1 && selected[0] === value) return [value];
    if (clickedIndex < startIndex) return options.slice(clickedIndex, endIndex + 1);
    if (clickedIndex > endIndex) return options.slice(startIndex, clickedIndex + 1);
    return [value];
  }

  function normalizeDurationCategories(selected, legacyValue = '') {
    const valid = Array.isArray(selected) ? durationPresets.filter(value => selected.includes(value)) : [];
    if (valid.length) {
      const start = durationPresets.indexOf(valid[0]);
      const end = durationPresets.indexOf(valid.at(-1));
      return durationPresets.slice(start, end + 1);
    }
    const value = String(legacyValue || '').toLowerCase();
    const minutePart = value.replace(/\d+\s*(?:oră|ora|ore|hours?|h)/g, '');
    const minutes = [...minutePart.matchAll(/\d+/g)].map(match => Number(match[0]));
    if (/\d+\s*(?:oră|ora|ore|hours?|h)/.test(value)) minutes.push(60);
    if (!minutes.length) return ['10 min'];
    const points = [5, 10, 15, 30, 60];
    const closestIndex = number => points.reduce((best, point, index) => Math.abs(point - number) < Math.abs(points[best] - number) ? index : best, 0);
    const start = closestIndex(minutes[0]);
    const end = closestIndex(minutes.at(-1));
    return durationPresets.slice(Math.min(start, end), Math.max(start, end) + 1);
  }

  function participantCategoryField(activity) {
    const selected = activity.participantCategories || [];
    return `<fieldset class="activity-participant-categories is-wide"><legend>Număr de copii</legend><div>${participantFilters.map((value, index) => `<button type="button" class="${selected.includes(value) ? 'is-active' : ''}" data-activity-participants="${safe(value)}" aria-pressed="${selected.includes(value)}"><img src="${filterIconBase}${filterIcons.participants[index]}" alt=""><span>${safe(value)}</span></button>`).join('')}</div></fieldset>`;
  }

  function parseRange(value) {
    const numbers = String(value || '').match(/\d+/g)?.map(Number) || [];
    return numbers.length > 1 ? [numbers[0], numbers[1]] : numbers.length ? [numbers[0], /\+/.test(value) ? 99 : numbers[0]] : [0, 99];
  }

  function ageMatches(activityAge, filter) {
    const [activityMin, activityMax] = parseRange(activityAge);
    const [filterMin, filterMax] = parseRange(filter);
    return activityMin <= filterMax && activityMax >= filterMin;
  }

  function activityAgeMatches(activity, filter) {
    return Array.isArray(activity.ageCategories) && activity.ageCategories.length
      ? activity.ageCategories.includes(filter)
      : ageMatches(activity.age, filter);
  }

  function participantKind(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('individual') || normalized === '1 copil') return 'Individual';
    if (normalized.includes('mare')) return '10+ copii';
    if (normalized.includes('mediu')) return '4–9 copii';
    if (normalized.includes('mic')) return '2–3 copii';
    const [, max] = parseRange(normalized);
    return max <= 1 ? 'Individual' : max <= 3 ? '2–3 copii' : max <= 9 ? '4–9 copii' : '10+ copii';
  }

  function participantRangeMatches(activityParticipants, filter) {
    const normalized = String(activityParticipants || '').toLowerCase();
    if (/individual|1 copil/.test(normalized)) return filter === 'Individual';
    if (/grup mic/.test(normalized)) return filter === '2–3 copii';
    if (/grup mediu/.test(normalized)) return filter === '4–9 copii';
    if (/grup mare/.test(normalized)) return filter === '10+ copii';
    const [min, max] = parseRange(normalized);
    const ranges = { 'Individual': [1, 1], '2–3 copii': [2, 3], '4–9 copii': [4, 9], '10+ copii': [10, 99] };
    const [filterMin, filterMax] = ranges[filter] || [0, 99];
    return min <= filterMax && max >= filterMin;
  }

  function activityParticipantMatches(activity, filter) {
    return Array.isArray(activity.participantCategories) && activity.participantCategories.length
      ? activity.participantCategories.includes(filter)
      : participantRangeMatches(activity.participants, filter);
  }

  function completedActivities() { return activities.filter(activityIsComplete); }
  function matchingActivities(includeCurrentStep = true) {
    return completedActivities().filter(activity =>
      (!libraryFilters.category || activity.category === libraryFilters.category) &&
      (!libraryFilters.age || activityAgeMatches(activity, libraryFilters.age)) &&
      (!libraryFilters.participants || activityParticipantMatches(activity, libraryFilters.participants)) &&
      (!libraryFilters.implementation || activity.difficulty === libraryFilters.implementation)
    );
  }

  function optionCount(type, value) {
    const previous = libraryFilters[type];
    libraryFilters[type] = value;
    const count = matchingActivities().length;
    libraryFilters[type] = previous;
    return count;
  }

  function libraryOption(value, icon, type, tone = '') {
    const count = optionCount(type, value);
    return `<button class="activity-filter-option tone-${tone}" data-library-choice="${type}" data-library-value="${safe(value)}"><span><img src="${filterIconBase}${safe(icon)}" alt=""></span><div><strong>${safe(value)}</strong><small>${count} ${count === 1 ? 'activitate' : 'activități'}</small></div><i>›</i></button>`;
  }

  function libraryBody() {
    if (libraryStep === 'categories') return `<div class="activity-library-categories">${activityCategories.map(([label, icon, tone], index) => `<button class="tone-${tone}" data-library-category="${safe(label)}"><span><img src="${filterIconBase}${safe(icon)}" alt=""></span><b>${String(index + 1).padStart(2, '0')}</b><strong>${safe(categoryPriorityTitles[label] || label)}</strong><small>${optionCount('category', label)} activități</small></button>`).join('')}</div>`;
    const headings = { age: 'Alege vârsta', participants: 'Alege numărul de copii', implementation: 'Alege implementarea', results: `Activități recomandate pentru ${categoryDevelopment[libraryFilters.category] || 'dezvoltarea copilului'}` };
    let options = '';
    if (libraryStep === 'age') options = ageFilters.map((value,index) => libraryOption(value, filterIcons.age[index], 'age', 'purple')).join('');
    if (libraryStep === 'participants') options = participantFilters.map((value, index) => libraryOption(value, filterIcons.participants[index], 'participants', 'coral')).join('');
    if (libraryStep === 'implementation') options = implementationFilters.map((value, index) => libraryOption(value, filterIcons.implementation[index], 'implementation', ['blue', 'green', 'orange', 'purple'][index])).join('');
    if (libraryStep === 'results') {
      const matches = matchingActivities();
      options = matches.length ? `<div class="activity-library-results">${matches.map((activity, index) => `<button data-library-activity="${activity.id}">${activity.image ? `<img src="${safe(activity.image)}" alt="">` : `<span>${String(index + 1).padStart(2, '0')}</span>`}<div><strong>${safe(activity.title)}</strong><small>${safe(ageLabel(activity))} · ${safe(participantLabel(activity))}</small></div><i>Editează →</i></button>`).join('')}</div>` : '<div class="activity-library-no-results"><span>○</span><strong>Nicio activitate nu corespunde încă</strong><p>Întoarce-te și schimbă unul dintre filtre.</p></div>';
    }
    return `<div class="activity-library-step-head"><button data-library-back>←</button><div><small>PASUL ${libraryStep === 'age' ? '1 DIN 3' : libraryStep === 'participants' ? '2 DIN 3' : libraryStep === 'implementation' ? '3 DIN 3' : 'FINAL'}</small><h3>${headings[libraryStep]}</h3></div><button data-library-reset>Resetează</button></div><div class="activity-library-options">${options}</div>`;
  }

  function renderLibrary() {
    return `<aside class="activity-library"><header><div><small>BIBLIOTECA BECKY</small><h2>Editor de activități</h2></div><div class="activity-library-head-actions"><a href="/admin/biblioteca-activitati-copii">Deschide hub-ul</a><button data-activity-add title="Activitate nouă">＋</button></div></header><div class="activity-library-stage" data-library-stage>${libraryBody()}</div></aside>`;
  }

  function nextLibraryStep(type) {
    return ({ age: 'participants', participants: 'implementation', implementation: 'results' })[type] || 'age';
  }

  function previousLibraryStep() {
    return ({ age: 'categories', participants: 'age', implementation: 'participants', results: 'implementation' })[libraryStep] || 'categories';
  }

  function transitionLibrary(nextStep, update) {
    const stage = document.querySelector('[data-library-stage]');
    if (!stage) return;
    stage.classList.remove('is-entering');
    stage.classList.add('is-leaving');
    setTimeout(() => {
      update?.();
      libraryStep = nextStep;
      stage.innerHTML = libraryBody();
      stage.classList.remove('is-leaving');
      stage.classList.add('is-entering');
      bindLibrary();
      setTimeout(() => stage.classList.remove('is-entering'), 320);
    }, 220);
  }

  function bindLibrary() {
    document.querySelectorAll('[data-library-category]').forEach(button => button.addEventListener('click', () => {
      transitionLibrary('age', () => { libraryFilters.category = button.dataset.libraryCategory; });
    }));
    document.querySelectorAll('[data-library-choice]').forEach(button => button.addEventListener('click', () => {
      const type = button.dataset.libraryChoice;
      transitionLibrary(nextLibraryStep(type), () => { libraryFilters[type] = button.dataset.libraryValue; });
    }));
    document.querySelector('[data-library-back]')?.addEventListener('click', () => transitionLibrary(previousLibraryStep()));
    document.querySelector('[data-library-reset]')?.addEventListener('click', () => transitionLibrary('categories', () => { libraryFilters = { category: '', age: '', participants: '', implementation: '' }; }));
    document.querySelectorAll('[data-library-activity]').forEach(button => button.addEventListener('click', () => { setCurrent(button.dataset.libraryActivity); render(); }));
  }

  function renderEditor(activity) {
    const formTabs = [
      ['essential', '1. Esențial'],
      ['play', '2. Cum se joacă'],
      ['adapt', '3. Adaptări'],
      ['image', '4. Ilustrație']
    ];
    const formFields = activeFormTab === 'essential' ? `
          ${field('Bibliotecă', 'libraryType', activity.libraryType, { select: [{ value:'public', label:'Activități publice' }, { value:'internal', label:'Activități interne Becky' }] })}
          ${field('Titlu', 'title', activity.title, { wide: true })}
          ${field('Subtitlu', 'subtitle', activity.subtitle, { wide: true })}
          ${ageCategoryField(activity)}
          ${durationField(activity)}
          ${participantCategoryField(activity)}
          ${field('Categorie', 'category', activity.category, { select: activityCategories.map(item => item[0]) })}
          ${field('Implementare', 'difficulty', activity.difficulty, { select: activity.libraryType === 'internal' ? ['Set dedicat Becky'] : ['Fără echipament', 'Cu o recuzită la îndemână', 'Cu o recuzită specială', 'Cu set de materiale dedicate'] })}
          ${field('Ce exersăm', 'skills', activity.skills, { long: true, wide: true })}` : activeFormTab === 'play' ? `
          ${field('Materiale · câte unul pe rând', 'materials', activity.materials, { long: true, wide: true })}
          ${field('Pași · câte unul pe rând', 'steps', activity.steps, { long: true, wide: true })}
          ${field('Reguli', 'rules', activity.rules, { long: true, wide: true })}
          ${field('Replica facilitatorului', 'facilitator', activity.facilitator, { long: true, wide: true })}` : activeFormTab === 'adapt' ? `
          ${field('Mai ușor', 'easier', activity.easier, { long: true })}
          ${field('Mai greu', 'harder', activity.harder, { long: true })}
          ${field('Atenționări', 'caution', activity.caution, { long: true })}
          ${field('Întrebare / reflecție finală', 'reflection', activity.reflection, { long: true })}` : '';
    return `<section class="activity-editor-panel">
      <header><div><small>EDITOR DE ACTIVITATE</small><h2>${safe(activity.title)}</h2></div><span data-activity-save-state>${safe(saveState)}</span></header>
      <div class="activity-form">
        <nav class="activity-form-tabs" aria-label="Secțiunile activității">${formTabs.map(([id, label]) => `<button class="${activeFormTab === id ? 'is-active' : ''}" data-activity-form-tab="${id}">${label}</button>`).join('')}</nav>
        ${activeFormTab !== 'image' ? `<div class="activity-form-grid">${formFields}</div>` : `<div class="activity-image-editor">
          <div><small>PRESET STIL BECKY</small><strong>Ce tip de imagine generăm?</strong><p>Tu descrii subiectul. Presetul adaugă automat stilul vizual al caruselelor și fundalul transparent.</p></div>
          <div class="activity-image-styles">
            <button class="${activity.illustrationStyle !== 'icon' ? 'is-active' : ''}" data-illustration-style="activity" type="button"><span>🐥</span><strong>Ilustrație de activitate</strong><small>Personajul arată clar acțiunea.</small></button>
            <button class="${activity.illustrationStyle === 'icon' ? 'is-active' : ''}" data-illustration-style="icon" type="button"><span>✦</span><strong>Iconografie</strong><small>Un obiect sau simbol foarte simplu.</small></button>
          </div>
          <label class="activity-image-prompt">Descrie doar ce vrei să apară<textarea data-activity-field="illustrationPrompt" placeholder="Ex: un copil urmărește o minge mare și moale">${safe(activity.illustrationPrompt)}</textarea></label>
          <div><label class="activity-upload">Încarcă imagine<input type="file" accept="image/*" data-activity-upload></label><button data-activity-generate ${imageBusy === activity.id ? 'disabled' : ''}>${imageBusy === activity.id ? 'Generez…' : '✦ Generează'}</button>${activity.image ? '<button class="is-danger" data-activity-remove-image>Elimină</button>' : ''}</div>
        </div>`}
        <footer><button class="is-danger" data-activity-delete ${activities.length <= 1 ? 'disabled' : ''}>Șterge activitatea</button><button class="activity-save-button" data-activity-save>Salvează acum</button></footer>
      </div>
    </section>`;
  }

  function renderPreviewPanel(activity) {
    return `<aside class="activity-preview-panel"><header><div><small>PREVIEW ACTIVITATE</small><h2>Exact ca în bibliotecă</h2></div><div><button data-activity-png>↓ PNG</button><button class="is-primary" data-activity-print>Print / PDF</button></div></header><div class="activity-fit-status" data-activity-fit-status hidden></div><div class="activity-preview-stage">${activityPreview(activity)}</div></aside>`;
  }

  function render() {
    const root = document.getElementById('workspace-demo');
    const activity = selectedActivity();
    if (!root || !activity) return;
    document.body.dataset.workspace = 'children';
    document.querySelector('.workspace')?.classList.add('hidden');
    document.getElementById('css-workspace')?.classList.add('hidden');
    document.getElementById('empty')?.classList.add('hidden');
    document.getElementById('editor')?.classList.add('hidden');
    document.querySelector('.top-actions')?.classList.add('overview-actions-hidden');
    document.querySelector('.topbar h1').textContent = 'Biblioteca Becky';
    document.querySelector('.topbar .subtitle').textContent = 'Creează și salvează activități care intră direct în filtrarea bibliotecii.';
    document.querySelectorAll('.sidebar .side-link').forEach(link => link.classList.toggle('active',link.href.includes('view=children')));
    root.className = 'workspace-demo children-activity-workspace';
    root.classList.remove('hidden');
    root.innerHTML = `<div class="activity-builder">${renderLibrary()}${renderEditor(activity)}${renderPreviewPanel(activity)}</div>`;
    bind();
    requestAnimationFrame(() => { scalePreview(); checkFit(); });
  }

  function mutateActivity(key, value) {
    const activity = selectedActivity();
    if (!activity) return;
    activity[key] = value;
    scheduleSave();
    refreshPreviewOnly();
  }

  function toggleAgeCategory(value) {
    const activity = selectedActivity();
    if (!activity) return;
    activity.ageCategories = contiguousChoice(ageFilters, activity.ageCategories || [], value);
    activity.age = ageSelectionLabel(activity.ageCategories);
    scheduleSave();
    render();
  }

  function selectDurationPreset(value) {
    const activity = selectedActivity();
    if (!activity || !durationPresets.includes(value)) return;
    const current = activity.durationCategories || ['10 min'];
    const clickedIndex = durationPresets.indexOf(value);
    let next;
    const startIndex = durationPresets.indexOf(current[0]);
    const endIndex = durationPresets.indexOf(current.at(-1));
    if (current.length === 1 && current[0] === value) next = [value];
    else if (clickedIndex < startIndex) next = durationPresets.slice(clickedIndex, endIndex + 1);
    else if (clickedIndex > endIndex) next = durationPresets.slice(startIndex, clickedIndex + 1);
    else if (current.length === 1) next = durationPresets.slice(Math.min(startIndex, clickedIndex), Math.max(startIndex, clickedIndex) + 1);
    else next = [value];
    activity.durationCategories = next;
    activity.durationPreset = next[0];
    activity.durationRange = next.length > 1 ? durationSelectionLabel(next) : '';
    activity.duration = durationSelectionLabel(next);
    scheduleSave();
    render();
  }

  function toggleParticipantCategory(value) {
    const activity = selectedActivity();
    if (!activity) return;
    activity.participantCategories = contiguousChoice(participantFilters, activity.participantCategories || [], value);
    activity.participants = participantSelectionLabel(activity.participantCategories);
    scheduleSave();
    render();
  }

  function refreshPreviewOnly() {
    const panel = document.querySelector('.activity-preview-panel');
    if (!panel) return;
    const stage = panel.querySelector('.activity-preview-stage');
    if (stage) stage.innerHTML = activityPreview(selectedActivity());
    requestAnimationFrame(() => { scalePreview(); checkFit(); });
  }

  function scalePreview() {
    const stage = document.querySelector('.activity-preview-stage');
    const sheet = stage?.querySelector('[data-activity-sheet-page]');
    if (!stage || !sheet) return;
    const scale = Math.min(1, Math.max(.35, (stage.clientWidth - 32) / 794));
    sheet.style.transform = `scale(${scale})`;
    stage.style.height = `${1123 * scale + 32}px`;
  }

  function checkFit() {
    const sheet = document.querySelector('[data-activity-sheet-page]');
    const status = document.querySelector('[data-activity-fit-status]');
    if (!sheet || !status) return;
    const overflowing = [...sheet.querySelectorAll('.activity-sheet-card')].filter(card => card.scrollHeight > card.clientHeight + 2);
    status.hidden = !overflowing.length;
    status.className = 'activity-fit-status is-warning';
    status.textContent = overflowing.length ? `${overflowing.length} ${overflowing.length === 1 ? 'activitate are' : 'activități au'} prea mult conținut pentru această pagină.` : '';
  }

  async function generateImage() {
    const activity = selectedActivity();
    if (!activity?.illustrationPrompt.trim()) return document.querySelector('[data-activity-field="illustrationPrompt"]')?.focus();
    imageBusy = activity.id;
    render();
    const subject = activity.illustrationPrompt.trim();
    const sharedStyle = `Match the established Becky’s Garden carousel illustration family: delicate storybook watercolor with soft hand-painted edges, subtle paper-like pigment texture within the painted shapes, rounded friendly forms, warm expressive character design, polished children's editorial quality. Use the Becky palette: teal, coral, warm yellow, pale blue and soft lavender. Keep generous breathing room and a clean, instantly readable silhouette. Transparent background with no white rectangle, no floor, no room, no scenery and no cast shadow. No text, letters, numbers, borders, badges, logos or decorative filler. Follow the requested subject literally; do not add people, objects or symbols that were not requested.`;
    const modeStyle = activity.illustrationStyle === 'icon'
      ? `Create one compact isolated iconographic illustration. Show only the essential object or symbol, centered, with very few details and no character unless the subject explicitly asks for one.`
      : `Create one isolated activity illustration showing the action clearly. Use one main child character and at most two essential props unless the subject explicitly requires otherwise. Expressive, natural pose; avoid a full scene.`;
    const prompt = `${modeStyle} ${sharedStyle} Requested subject: “${subject}”.`;
    try {
      const response = await api('/api/content/carousel/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, quality: 'medium', transparent: true }) });
      const result = await response.json();
      if (!response.ok || !result.image) throw new Error(result.error || 'Imaginea nu a putut fi generată.');
      activity.image = await optimizeImage(`data:${result.mimeType || 'image/webp'};base64,${result.image}`);
      scheduleSave();
    } catch (error) { alert(error.message); }
    imageBusy = '';
    render();
  }

  function optimizeImage(source, maxSize = 720) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', .8));
      };
      image.onerror = () => resolve(source);
      image.src = source;
    });
  }

  function bind() {
    bindLibrary();
    document.querySelectorAll('[data-activity-form-tab]').forEach(button => button.addEventListener('click', () => { activeFormTab = button.dataset.activityFormTab; render(); }));
    document.querySelectorAll('[data-activity-age]').forEach(button => button.addEventListener('click', () => toggleAgeCategory(button.dataset.activityAge)));
    document.querySelectorAll('[data-activity-duration]').forEach(button => button.addEventListener('click', () => selectDurationPreset(button.dataset.activityDuration)));
    document.querySelectorAll('[data-activity-participants]').forEach(button => button.addEventListener('click', () => toggleParticipantCategory(button.dataset.activityParticipants)));
    document.querySelectorAll('[data-illustration-style]').forEach(button => button.addEventListener('click', () => { mutateActivity('illustrationStyle', button.dataset.illustrationStyle); render(); }));
    document.querySelector('[data-activity-add]')?.addEventListener('click', () => { const activity = emptyActivity(); activities.push(activity); setCurrent(activity.id); scheduleSave(); render(); });
    document.querySelectorAll('[data-activity-field]:not([data-activity-field="libraryType"])').forEach(input => input.addEventListener('input', () => mutateActivity(input.dataset.activityField, input.value)));
    document.querySelector('[data-activity-field="libraryType"]')?.addEventListener('change', event => {
      const activity = selectedActivity();
      if (!activity) return;
      activity.libraryType = event.target.value === 'internal' ? 'internal' : 'public';
      if (activity.libraryType === 'internal') activity.difficulty = 'Set dedicat Becky';
      scheduleSave();
      render();
    });
    document.querySelector('[data-activity-field="difficulty"]')?.addEventListener('change', event => mutateActivity('difficulty', event.target.value));
    document.querySelector('[data-activity-delete]')?.addEventListener('click', () => { if (activities.length <= 1 || !confirm('Ștergi această activitate?')) return; activities = activities.filter(item => item.id !== selectedActivityId); setCurrent(activities[0].id); scheduleSave(); render(); });
    document.querySelector('[data-activity-save]')?.addEventListener('click', save);
    document.querySelector('[data-activity-generate]')?.addEventListener('click', generateImage);
    document.querySelector('[data-activity-remove-image]')?.addEventListener('click', () => { mutateActivity('image', ''); render(); });
    document.querySelector('[data-activity-upload]')?.addEventListener('change', event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = async () => { mutateActivity('image', await optimizeImage(reader.result)); render(); }; reader.readAsDataURL(file); });
    document.querySelector('[data-activity-print]')?.addEventListener('click', printPage);
    document.querySelector('[data-activity-png]')?.addEventListener('click', exportPng);
    if (!resizeBound) {
      window.addEventListener('resize', scalePreview);
      resizeBound = true;
    }
  }

  function printPage() {
    const sheet = document.querySelector('[data-activity-sheet-page]');
    if (!sheet) return;
    const popup = window.open('', '_blank');
    if (!popup) return alert('Browserul a blocat fereastra de print. Permite ferestrele pop-up și încearcă din nou.');
    const clone = sheet.cloneNode(true);
    clone.style.transform = 'none';
    const styles = [...document.querySelectorAll('link[rel="stylesheet"],style')].map(node => node.outerHTML).join('');
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8">${styles}<style>@page{size:A4;margin:0}body{margin:0;background:#fff}.activity-sheet-page{width:210mm!important;height:297mm!important;box-shadow:none!important;transform:none!important}</style></head><body>${clone.outerHTML}<script>onload=()=>setTimeout(()=>print(),400)<\/script></body></html>`);
    popup.document.close();
  }

  function blobToDataUrl(blob) {
    return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
  }

  async function inlineCloneImages(clone) {
    await Promise.all([...clone.querySelectorAll('img')].map(async image => {
      if (image.src.startsWith('data:')) return;
      try { image.src = await blobToDataUrl(await fetch(image.src).then(response => response.blob())); } catch {}
    }));
  }

  async function exportPng() {
    const sheet = document.querySelector('[data-activity-sheet-page]');
    if (!sheet) return;
    const clone = sheet.cloneNode(true);
    clone.style.width = '794px'; clone.style.height = '1123px'; clone.style.margin = '0'; clone.style.transform = 'none';
    await inlineCloneImages(clone);
    const css = [...document.styleSheets].flatMap(styleSheet => { try { return [...styleSheet.cssRules].map(rule => rule.cssText); } catch { return []; } }).join('\n');
    const html = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style>${html}</div></foreignObject></svg>`;
    const image = new Image();
    const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = 1588; canvas.height = 2246; const context = canvas.getContext('2d'); context.scale(2, 2); context.drawImage(image, 0, 0); URL.revokeObjectURL(source); canvas.toBlob(blob => { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${selectedActivity().title.replace(/[^a-z0-9ăâîșț]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'activitate-becky'}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 5000); }, 'image/png'); };
    image.onerror = () => { URL.revokeObjectURL(source); alert('Exportul PNG nu a putut fi pregătit. Poți folosi Print / PDF.'); };
    image.src = source;
  }

  window.renderChildrenActivityEditor = async () => {
    const response = await api('/api/workspaces');
    payload = await response.json();
    workspace = payload.workspaces.find(item => item.id === 'children');
    if (!workspace) return;
    const hasActivityCollection = Array.isArray(workspace.activities) && workspace.activities.length > 0;
    const legacyActivities = Array.isArray(workspace.activityPages) ? workspace.activityPages.flatMap(page => page.activities || []) : [];
    activities = (hasActivityCollection ? workspace.activities : legacyActivities).map(normalizeActivity);
    if (!activities.length) activities = [emptyActivity()];
    setCurrent(selectedActivityId || activities[0].id);
    render();
    if (!hasActivityCollection && legacyActivities.length) scheduleSave();
  };
})();
