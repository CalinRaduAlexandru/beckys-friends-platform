(() => {
  const root = document.getElementById('children-library-app');
  const categories = [
    ['Gândește', 'category-think.png', 'blue'], ['Simte', 'category-feel-v2.png', 'coral'], ['Colaborează', 'category-collaborate.png', 'orange'],
    ['Devine independent', 'category-independent-v3.png', 'green'], ['Creează', 'category-create.png', 'purple'], ['Se mișcă', 'category-move.png', 'teal']
  ];
  const categoryTitles = {
    'Gândește': 'Gândirea',
    'Simte': 'Simțirea',
    'Colaborează': 'Colaborarea',
    'Devine independent': 'Independența',
    'Creează': 'Creativitatea',
    'Se mișcă': 'Mișcarea'
  };
  const categoryDevelopment = {
    'Gândește': 'dezvoltarea cognitivă & funcțiile executive',
    'Simte': 'dezvoltarea emoțională',
    'Colaborează': 'dezvoltarea socială & relațională',
    'Devine independent': 'autonomie & autoreglare',
    'Creează': 'creativitate & expresie',
    'Se mișcă': 'dezvoltarea motrică & senzorială'
  };
  const categoryPresentation = {
    'Gândește': ['🧠', 'blue'],
    'Simte': ['♥', 'coral'],
    'Colaborează': ['🤝', 'orange'],
    'Devine independent': ['🍃', 'green'],
    'Creează': ['★', 'purple'],
    'Se mișcă': ['🏃', 'teal']
  };
  const ages = ['1–2 ani', '3–4 ani', '5–6 ani', '7–8 ani', '9+ ani'];
  const groups = ['Individual', '2–3 copii', '4–9 copii', '10+ copii'];
  const durations = ['5 min', '10 min', '15 min', '30 min', '1 oră'];
  const implementations = ['Fără echipament', 'Cu o recuzită la îndemână', 'Cu o recuzită specială', 'Cu set de materiale dedicate'];
  const physicalLevels = ['De învățat', 'Exersez', 'Sigur pe mine'];
  const magicLevels = ['De învățat', 'Exersez', 'Pot performa'];
  const iconBase = '/assets/activity-library-icons/final/';
  const filterIcons = {
    age: ['age-1-2.png','age-2-4.png','age-4-6.png','age-6-8.png','age-8-plus.png'],
    participants: ['group-individual-v2.png','group-2-3.png','group-4-9.png','group-10-plus.png'],
    implementation: ['prep-none.png','prep-everyday.png','prep-special.png','prep-kit.png']
  };
  let activities = [];
  let physicalInteractions = [];
  let magicTricks = [];
  let libraryMode = '';
  let step = 'hub';
  let selectedActivity = null;
  let selectedSpecialItem = null;
  let activityObservations = [];
  let activityPlaylists = [];
  let workspacePayload = null;
  let draggedActivityId = '';
  let editingObservation = null;
  let filters = { category: '', age: '', ageRange: null, participants: '', duration: '', implementation: '', learningStatus: '' };

  const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
  const api = (url, options) => (window.adminApiFetch || fetch)(url, options);
  const complete = activity => activity && activity.title && activity.title !== 'Activitate nouă' && (activity.steps || activity.image);
  const allActivities = () => activities.filter(complete);
  const activityLibraryType = activity => activity?.libraryType === 'internal' ? 'internal' : 'public';
  const all = () => allActivities().filter(activity => activityLibraryType(activity) === libraryMode);
  const parseRange = value => { const values = String(value || '').match(/\d+/g)?.map(Number) || []; return values.length > 1 ? [values[0], values[1]] : values.length ? [values[0], /\+/.test(value) ? 99 : values[0]] : [0, 99]; };
  const ageMatches = (value, filter) => { const [a, b] = parseRange(value); const [c, d] = parseRange(filter); return a <= d && b >= c; };
  const normalizedActivityAges = activity => {
    const source = Array.isArray(activity.ageCategories) && activity.ageCategories.length ? activity.ageCategories : [activity.age];
    return ages.filter(filter => source.some(value => ageMatches(value, filter)));
  };
  const activityAgeMatches = (activity, filter) => normalizedActivityAges(activity).includes(filter);
  const normalizedActivityDurations = activity => {
    const source = Array.isArray(activity.durationCategories) && activity.durationCategories.length ? activity.durationCategories : [activity.duration, activity.durationPreset];
    return durations.filter(duration => source.some(value => String(value || '').includes(duration)));
  };
  const ageRangeIndexes = activity => normalizedActivityAges(activity).map(value => ages.indexOf(value)).filter(index => index >= 0);
  const activityMatchesAgeRange = (activity, range) => {
    if (!range) return true;
    const supported = new Set(ageRangeIndexes(activity));
    for (let index = range.min; index <= range.max; index += 1) if (!supported.has(index)) return false;
    return true;
  };
  const ageRangeLabel = (min, max) => min === max ? ages[min] : `${ages[min].match(/^\d+/)?.[0] || ages[min]}–${ages[max].includes('+') ? '9+' : ages[max].match(/\d+/g)?.at(-1)} ani`;
  const rangeLabel = (values, options, firstFallback, lastPlus, suffix) => {
    const ordered = options.filter(value => values.includes(value));
    if (!ordered.length) return '';
    if (ordered.length === 1) return ordered[0];
    const start = ordered[0] === 'Individual' ? firstFallback : ordered[0].match(/\d+/)?.[0];
    const end = ordered.at(-1).includes('+') ? lastPlus : ordered.at(-1).match(/\d+/g)?.at(-1);
    return `${start}–${end} ${suffix}`;
  };
  const activityAgeLabel = activity => rangeLabel(normalizedActivityAges(activity), ages, '1', '9+', 'ani') || activity.age;
  const groupKind = value => { const text = String(value || '').toLowerCase(); if (text.includes('individual') || text === '1 copil') return 'Individual'; if (text.includes('mare')) return '10+ copii'; if (text.includes('mediu')) return '4–9 copii'; if (text.includes('mic')) return '2–3 copii'; const [, max] = parseRange(text); return max <= 1 ? 'Individual' : max <= 3 ? '2–3 copii' : max <= 9 ? '4–9 copii' : '10+ copii'; };
  const activityParticipantMatches = (activity, filter) => Array.isArray(activity.participantCategories) && activity.participantCategories.length ? activity.participantCategories.includes(filter) : groupKind(activity.participants) === filter;
  const normalizedActivityParticipants = activity => {
    const matched = Array.isArray(activity.participantCategories) && activity.participantCategories.length ? groups.filter(value => activity.participantCategories.includes(value)) : [groupKind(activity.participants)];
    return matched.length ? groups.slice(groups.indexOf(matched[0]), groups.indexOf(matched.at(-1)) + 1) : [];
  };
  const activityParticipantLabel = activity => rangeLabel(normalizedActivityParticipants(activity), groups, '1', '10+', 'copii') || groupKind(activity.participants);
  const matches = () => all().filter(activity =>
    (!filters.category || (activity.category || 'Gândește') === filters.category) &&
    (!filters.age || activityAgeMatches(activity, filters.age)) &&
    activityMatchesAgeRange(activity, filters.ageRange) &&
    (!filters.participants || activityParticipantMatches(activity, filters.participants)) &&
    (!filters.duration || normalizedActivityDurations(activity).includes(filters.duration)) &&
    (!filters.implementation || activity.difficulty === filters.implementation)
  );
  const optionCount = (key, value) => { const before = filters[key]; filters[key] = value; const count = matches().length; filters[key] = before; return count; };
  const countLabel = count => `${count} ${count === 1 ? 'activitate' : 'activități'}`;
  const selectedValidationAges = activity => {
    const supported = normalizedActivityAges(activity);
    if (filters.age) return supported.includes(filters.age) ? [filters.age] : [];
    if (filters.ageRange) return ages.slice(filters.ageRange.min, filters.ageRange.max + 1).filter(age => supported.includes(age));
    return supported;
  };
  const activityIsValidated = activity => {
    const selectedAges = selectedValidationAges(activity);
    if (!selectedAges.length || !filters.participants) return false;
    return selectedAges.every(age => (activity.validations || []).some(validation =>
      validation.age_category === age &&
      validation.participant_category === filters.participants &&
      validation.validation_status === 'validated'
    ));
  };
  const validationBadge = activity => {
    const validated = activityIsValidated(activity);
    return `<span class="library-card-validation ${validated ? 'is-validated' : 'is-untested'}" aria-label="${validated ? 'Activitate testată pentru selecția curentă' : 'Activitate netestată pentru selecția curentă'}"><b aria-hidden="true">${validated ? '✓' : '×'}</b><span>${validated ? 'Testată' : 'Netestată'}</span><small>pentru selecția ta</small></span>`;
  };
  const choiceIcon = (key, value) => {
    if (key === 'implementation' && value === 'Set dedicat Becky') return 'prep-kit.png';
    const values = { age: ages, participants: groups, implementation: implementations }[key] || [];
    const icons = filterIcons[key] || [];
    return icons[values.indexOf(value)] || icons[0] || '';
  };
  const cardChoice = (key, value) => {
    const icon = choiceIcon(key, value);
    return `<span class="library-card-choice">${icon ? `<img src="${iconBase}${safe(icon)}" alt="">` : ''}<b>${safe(value)}</b></span>`;
  };

  const detailMetaIcons = { age: 'detail-age.png', duration: 'meta-duration.png', participants: 'detail-participants.png', implementation: 'detail-preparation.png' };
  const detailMeta = (kind, label, value) => value ? `<article class="library-detail-meta-card is-${kind}"><span class="library-detail-meta-art"><img src="${iconBase}${detailMetaIcons[kind]}" alt=""></span><div><small>${safe(label)}</small><strong>${safe(value)}</strong></div></article>` : '';

  const detailPanelIcon = (icon, alt = '') => `<span class="library-detail-panel-art"><img src="${iconBase}${safe(icon)}" alt="${safe(alt)}"></span>`;

  function removeConnectedLightBackground(source) {
    return new Promise(resolve => {
      if (!source || !source.startsWith('data:image/')) return resolve(source);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = frame;
        const width = canvas.width;
        const height = canvas.height;
        const corners = [[0,0],[width-1,0],[0,height-1],[width-1,height-1]];
        const sample = corners.reduce((sum,[x,y]) => { const i=(y*width+x)*4; return [sum[0]+data[i],sum[1]+data[i+1],sum[2]+data[i+2]]; },[0,0,0]).map(value => value/4);
        if (Math.min(...sample) < 225) return resolve(source);
        const seen = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;
        const enqueue = index => { if (!seen[index]) { seen[index] = 1; queue[tail++] = index; } };
        for (let x=0;x<width;x++) { enqueue(x); enqueue((height-1)*width+x); }
        for (let y=0;y<height;y++) { enqueue(y*width); enqueue(y*width+width-1); }
        while (head < tail) {
          const pixel = queue[head++];
          const offset = pixel * 4;
          const distance = Math.hypot(data[offset]-sample[0],data[offset+1]-sample[1],data[offset+2]-sample[2]);
          if (distance > 82) continue;
          data[offset+3] = Math.max(0, Math.min(255, Math.round((distance - 8) / 74 * 255)));
          const x = pixel % width;
          const y = Math.floor(pixel / width);
          if (x) enqueue(pixel-1);
          if (x<width-1) enqueue(pixel+1);
          if (y) enqueue(pixel-width);
          if (y<height-1) enqueue(pixel+width);
        }
        context.putImageData(frame,0,0);
        resolve(canvas.toDataURL('image/webp',.9));
      };
      image.onerror = () => resolve(source);
      image.src = source;
    });
  }

  async function apiFetch(path, options = {}) {
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem('becky-admin-session') || 'null'); } catch {}
    const headers = new Headers(options.headers || {});
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
    return fetch(path, { ...options, headers });
  }

  function applyValidationCoverage(payload) {
    const byActivity = new Map((payload?.library_activities || []).map(activity => [activity.id, activity.validations || []]));
    activities.forEach(activity => { activity.validations = byActivity.get(activity.id) || []; });
  }

  async function refreshValidationCoverage() {
    try {
      const response = await apiFetch('/api/admin/pedagogic-coverage');
      if (!response.ok) return;
      applyValidationCoverage(await response.json());
      if (step === 'results') root.querySelectorAll('[data-activity]').forEach(card => {
        const activity = activities.find(item => item.id === card.dataset.activity);
        const current = card.querySelector('.library-card-validation');
        if (activity && current) current.outerHTML = validationBadge(activity);
      });
    } catch {}
  }

  const libraryDefinitions = {
    public: { title: 'Activități publice', description: 'Jocuri și activități care pot fi explorate și din afara echipei Becky.', icon: '☀', tone: 'teal' },
    internal: { title: 'Activități interne Becky', description: 'Activități facilitate cu seturi și resurse dedicate Becky.', icon: '✦', tone: 'purple' },
    physical: { title: 'Interacțiuni fizice', description: 'Poziții, jocuri și mișcări ghidate între facilitator și copil.', icon: '↔', tone: 'coral' },
    magic: { title: 'Magie', description: 'Trucuri și momente de spectacol pregătite pentru copii.', icon: '★', tone: 'orange' },
  };
  const currentItems = () => libraryMode === 'physical' ? physicalInteractions : libraryMode === 'magic' ? magicTricks : all();
  const libraryCount = mode => mode === 'physical' ? physicalInteractions.length : mode === 'magic' ? magicTricks.length : allActivities().filter(activity => activityLibraryType(activity) === mode).length;
  const resetFilters = () => { filters = { category:'', age:'', ageRange:null, participants:'', duration:'', implementation:'', learningStatus:'' }; selectedActivity = null; selectedSpecialItem = null; };
  const itemAges = item => ages.filter(age => (item.ageCategories || []).some(value => ageMatches(value, age)));
  const itemParticipants = item => groups.filter(group => (item.participantCategories || []).includes(group));
  const itemDurationMatches = (item, value) => String(item.approximateDuration || '').includes(value);
  const magicUsesDuration = () => magicTricks.some(item => durations.some(duration => itemDurationMatches(item, duration)));
  const specialMatches = () => currentItems().filter(item =>
    (!filters.age || itemAges(item).includes(filters.age)) &&
    (!filters.participants || itemParticipants(item).includes(filters.participants)) &&
    (!filters.learningStatus || item.learningStatus === filters.learningStatus) &&
    (!filters.duration || itemDurationMatches(item, filters.duration))
  );
  const specialOptionCount = (key, value) => { const before = filters[key]; filters[key] = value; const count = specialMatches().length; filters[key] = before; return count; };
  const linesMarkup = (value, ordered = false) => {
    const items = Array.isArray(value) ? value : String(value || '').split(/\n+/);
    const clean = items.map(item => String(item).trim()).filter(Boolean);
    if (!clean.length) return '';
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag}>${clean.map(item => `<li>${safe(item)}</li>`).join('')}</${tag}>`;
  };

  function hubView() {
    return `<div class="library-hub"><div class="library-intro"><small>BIBLIOTECA BECKY</small><h1>Patru biblioteci, patru moduri de a lucra</h1><p>Alege spațiul potrivit. Filtrele apar abia după ce intri.</p></div><div class="library-hub-grid">${Object.entries(libraryDefinitions).map(([id, definition]) => `<button class="library-hub-card tone-${definition.tone}" data-library-mode="${id}"><span>${definition.icon}</span><div><small>${libraryCount(id)} ${libraryCount(id) === 1 ? 'resursă' : 'resurse'}</small><strong>${definition.title}</strong><p>${definition.description}</p></div><i>Intră în bibliotecă →</i></button>`).join('')}</div>${activityPlaylistsMarkup()}</div>`;
  }

  function activityPlaylistsMarkup() {
    return `<section class="activity-playlists"><header><div><small>SCURTĂTURI PENTRU ECHIPĂ</small><h2>Listele mele de activități</h2><p>Organizează activitățile fără să le duplici în Bibliotecă.</p></div><button type="button" data-new-activity-playlist>＋ Listă</button></header><div class="activity-playlist-grid">${activityPlaylists.map(list => `<button type="button" class="activity-playlist-card" data-open-activity-playlist="${safe(list.id)}" data-drop-playlist="${safe(list.id)}"><strong>${safe(list.title)}</strong><small>${(list.activityIds || []).length} ${(list.activityIds || []).length === 1 ? 'activitate' : 'activități'}</small><i>Deschide →</i></button>`).join('') || '<div class="library-empty"><strong>Încă nu ai liste</strong><p>Trage o activitate aici sau creează o listă.</p></div>'}</div></section>`;
  }

  function playlistView() {
    const list = activityPlaylists.find(item => item.id === selectedSpecialItem?.id) || selectedSpecialItem;
    const items = (list?.activityIds || []).map(id => allActivities().find(activity => activity.id === id)).filter(Boolean);
    return `<div class="activity-playlist-view"><button type="button" class="library-back-to-results" data-playlists-back>← Înapoi la liste</button><header><small>LISTĂ DE ACTIVITĂȚI</small><h1>${safe(list?.title || 'Listă')}</h1><p>${items.length} ${items.length === 1 ? 'activitate' : 'activități'} · Trage pentru a schimba ordinea.</p></header><div class="activity-playlist-items">${items.map((activity, index) => `<article class="activity-playlist-item" draggable="true" data-playlist-item="${safe(activity.id)}" data-playlist-index="${index}"><span class="playlist-drag">☷</span><div><strong>${safe(activity.title)}</strong><small>${safe(activity.category || 'Activitate')}</small></div><button type="button" data-playlist-open="${safe(activity.id)}">Citește →</button><button type="button" data-playlist-remove="${safe(activity.id)}" aria-label="Elimină">×</button></article>`).join('') || '<div class="library-empty"><strong>Lista este goală</strong><p>Adaugă activități din Biblioteca Becky.</p></div>'}</div><button type="button" class="playlist-delete" data-delete-activity-playlist="${safe(list?.id || '')}">Șterge lista</button></div>`;
  }

  async function saveActivityPlaylists() {
    if (!workspacePayload) return false;
    const children = workspacePayload.workspaces?.find(item => item.id === 'children');
    if (!children) return false;
    children.activityPlaylists = activityPlaylists;
    const response = await api('/api/workspaces', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workspacePayload) });
    if (!response.ok) { window.alert('Lista nu a putut fi salvată.'); return false; }
    workspacePayload = await response.json();
    const savedChildren = workspacePayload.workspaces?.find(item => item.id === 'children');
    activityPlaylists = savedChildren?.activityPlaylists || activityPlaylists;
    return true;
  }

  function createActivityPlaylist() {
    const title = window.prompt('Cum se numește lista?');
    if (!title?.trim()) return;
    const list = { id: `activity-playlist-${Date.now()}`, title: title.trim(), activityIds: [] };
    activityPlaylists.push(list);
    saveActivityPlaylists().then(() => { selectedSpecialItem = list; step = 'playlists'; render('forward'); });
  }

  function chooseActivityPlaylist(activityId) {
    if (!activityPlaylists.length) { createActivityPlaylist(); return; }
    const options = activityPlaylists.map((list, index) => `${index + 1}. ${list.title}`).join('\n');
    const choice = window.prompt(`Adaugă activitatea în ce listă?\n${options}\n\nScrie numărul listei sau „nou”.`);
    if (!choice) return;
    if (choice.trim().toLowerCase() === 'nou') { createActivityPlaylist(); return; }
    const list = activityPlaylists[Number(choice) - 1];
    if (list) addToActivityPlaylist(list.id, activityId);
  }

  function addToActivityPlaylist(listId, activityId) {
    const list = activityPlaylists.find(item => item.id === listId);
    if (!list || !activityId || list.activityIds.includes(activityId)) return;
    list.activityIds.push(activityId);
    saveActivityPlaylists();
  }

  function updateActivityPlaylist(activityId, action) {
    if (action !== 'remove' || !selectedSpecialItem) return;
    selectedSpecialItem.activityIds = selectedSpecialItem.activityIds.filter(id => id !== activityId);
    activityPlaylists = activityPlaylists.map(item => item.id === selectedSpecialItem.id ? selectedSpecialItem : item);
    saveActivityPlaylists().then(() => render('back'));
  }

  function reorderActivityPlaylist(fromId, toId) {
    if (!selectedSpecialItem || !fromId || !toId || fromId === toId) return;
    const ids = [...selectedSpecialItem.activityIds]; const from = ids.indexOf(fromId); const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1); ids.splice(to, 0, fromId); selectedSpecialItem.activityIds = ids;
    activityPlaylists = activityPlaylists.map(item => item.id === selectedSpecialItem.id ? selectedSpecialItem : item);
    saveActivityPlaylists().then(() => render());
  }

  function emptyLibraryView() {
    const definition = libraryDefinitions[libraryMode];
    return `<div class="library-empty-library"><span>${definition.icon}</span><small>${safe(definition.title)}</small><h1>Biblioteca este pregătită</h1><p>Structura există, dar nu are încă resurse publicate.</p><button type="button" data-hub-back>← Înapoi la Biblioteca Becky</button></div>`;
  }

  function specialChoiceView() {
    const isPhysical = libraryMode === 'physical';
    const key = step.endsWith('age') ? 'age' : step.endsWith('participants') ? 'participants' : step.endsWith('duration') ? 'duration' : 'learningStatus';
    const values = key === 'age' ? ages : key === 'participants' ? groups : key === 'duration' ? durations : (isPhysical ? physicalLevels : magicLevels);
    const headings = { age: 'Pentru ce vârstă?', participants: 'Cu câți copii lucrezi?', learningStatus: 'Care este nivelul tău?', duration: 'Cât durează momentul?' };
    return `<div class="library-step-copy"><small>${safe(libraryDefinitions[libraryMode].title.toUpperCase())}</small><h1>${headings[key]}</h1><p>Alege o opțiune pentru a continua.</p></div><div class="library-options library-options-special">${values.map((value, index) => { const count = specialOptionCount(key, value); return `<button class="library-option tone-${['purple','green','orange','blue','teal'][index % 5]}" data-special-choice="${key}" data-value="${safe(value)}" ${count ? '' : 'disabled'}><span>${key === 'learningStatus' ? '◎' : key === 'duration' ? '◷' : index + 1}</span><div><strong>${safe(value)}</strong><small>${count} ${count === 1 ? 'resursă' : 'resurse'}</small></div><i>→</i></button>`; }).join('')}</div>`;
  }

  function specialResultsView() {
    const items = specialMatches();
    const isPhysical = libraryMode === 'physical';
    return `<div class="library-step-copy"><small>${safe(libraryDefinitions[libraryMode].title.toUpperCase())}</small><h1>${isPhysical ? 'Interacțiuni potrivite' : 'Trucuri potrivite'}</h1><p>${items.length} ${items.length === 1 ? 'resursă găsită' : 'resurse găsite'}.</p></div><div class="library-special-results">${items.map(item => { const image = item.image || ''; return `<button data-special-item="${safe(item.id)}" class="tone-${isPhysical ? 'coral' : 'orange'}">${image ? `<span class="library-special-media"><img src="${safe(image)}" alt=""></span>` : `<span class="library-special-symbol">${item.video || item.mediaReference ? '▶' : isPhysical ? '↔' : '★'}</span>`}<div><small>${safe(item.learningStatus || '')}</small><strong>${safe(item.title)}</strong><p>${safe(item.subtitle || '')}</p><footer>${isPhysical ? `<b>${safe((item.participantCategories || []).join(' · '))}</b><b>${safe(item.facilitatorDifficulty || '')}</b>` : `<b>${safe(item.approximateDuration || '')}</b><b>${safe(item.props || 'Recuzită de completat')}</b>`}</footer></div><i>Deschide →</i></button>`; }).join('') || '<div class="library-empty"><strong>Nicio resursă potrivită</strong><p>Întoarce-te și schimbă unul dintre filtre.</p></div>'}</div>`;
  }

  function specialDetailSection(kicker, title, value, ordered = false, className = '') {
    if (!value || (Array.isArray(value) && !value.length)) return '';
    return `<section class="library-special-detail-section ${className}"><small>${safe(kicker)}</small><h3>${safe(title)}</h3>${linesMarkup(value, ordered) || `<p>${safe(value)}</p>`}</section>`;
  }

  function specialDetailView() {
    const item = selectedSpecialItem;
    const isPhysical = libraryMode === 'physical';
    if (!item) return specialResultsView();
    const image = item.image || '';
    const video = item.video || '';
    const mediaReference = item.mediaReference || '';
    const media = image ? `<figure><img src="${safe(image)}" alt=""></figure>` : video ? `<figure><video src="${safe(video)}" controls preload="metadata"></video></figure>` : '';
    return `<div class="library-detail-view"><button class="library-back-to-results" data-special-results-back>← Înapoi la rezultate</button><article class="library-special-detail tone-${isPhysical ? 'coral' : 'orange'}"><header><div><small>${safe(libraryDefinitions[libraryMode].title)}</small><h1>${safe(item.title)}</h1><p>${safe(item.subtitle || '')}</p><div class="library-special-meta"><span>${safe((item.ageCategories || []).join(' · '))}</span>${isPhysical ? `<span>${safe((item.participantCategories || []).join(' · '))}</span><span>${safe(item.facilitatorDifficulty || '')}</span>` : `<span>${safe(item.approximateDuration || '')}</span>`}<span>${safe(item.learningStatus || '')}</span></div>${mediaReference ? `<a class="library-special-media-link" href="${safe(mediaReference)}" target="_blank" rel="noopener">Deschide referința media ↗</a>` : ''}</div>${media}</header><div class="library-special-detail-grid">${isPhysical ? `${specialDetailSection('PREGĂTIRE', 'Cum ne așezăm', item.setup, true)}${specialDetailSection('EXECUȚIE', 'Cum facem mișcarea', item.execution, true)}${specialDetailSection('IEȘIRE', 'Cum ieșim în siguranță', item.exit, true, 'is-safety')}${specialDetailSection('SIGURANȚĂ', 'Repere de siguranță', item.safety, false, 'is-safety')}${specialDetailSection('ADAPTARE', 'Variații', item.variations)}${specialDetailSection('DACĂ ESTE CAZUL', 'Materiale', item.materials)}` : `${specialDetailSection('EFECT', 'Ce vede copilul', item.effectSeenByChild)}${specialDetailSection('RECUZITĂ', 'Ce pregătești', item.props)}${specialDetailSection('PREGĂTIRE SECRETĂ', 'Setup', item.setup, true)}${specialDetailSection('SECRET', 'Metodă', item.method, true)}${specialDetailSection('PREZENTARE', 'Ce spune facilitatorul', item.patter)}${specialDetailSection('PERFORMANȚĂ', 'Pașii momentului', item.performanceSteps, true)}${specialDetailSection('DUPĂ TRUC', 'Reset', item.reset)}${specialDetailSection('SIGURANȚĂ', 'De ținut minte', item.safety, false, 'is-safety')}`}</div></article></div>`;
  }

  function breadcrumb() {
    if (step === 'hub') return '<div class="library-progress library-progress-home"><strong>Biblioteca Becky</strong></div>';
    const activitySteps = libraryMode === 'internal' ? ['category','participants','age','duration','results','activity'] : ['category','participants','age','implementation','results','activity'];
    const specialSteps = libraryMode === 'physical' ? ['physical-age','physical-participants','physical-level','physical-results','physical-detail'] : magicUsesDuration() ? ['magic-age','magic-level','magic-duration','magic-results','magic-detail'] : ['magic-age','magic-level','magic-results','magic-detail'];
    const steps = libraryMode === 'public' || libraryMode === 'internal' ? activitySteps : specialSteps;
    const labels = { category:'Categorie', age:'Vârstă', participants:'Număr copii', duration:'Durată', implementation:'Recuzită', results:'Rezultate', activity:'Activitate', 'physical-age':'Vârstă', 'physical-participants':'Număr copii', 'physical-level':'Nivelul meu', 'physical-results':'Rezultate', 'physical-detail':'Interacțiune', 'magic-age':'Vârstă', 'magic-level':'Nivelul meu', 'magic-duration':'Durată', 'magic-results':'Rezultate', 'magic-detail':'Truc' };
    const current = steps.indexOf(step);
    return `<div class="library-progress">${steps.slice(0, -1).map((id, index) => `<span class="${index < current ? 'is-done' : index === current ? 'is-current' : ''}"><i></i>${labels[id]}</span>`).join('')}</div>`;
  }

  function option(value, icon, key, tone) {
    const count = optionCount(key, value);
    return `<button class="library-option tone-${tone}" data-choice="${key}" data-value="${safe(value)}" ${count === 0 ? 'disabled' : ''}><span>${icon ? `<img src="${iconBase}${safe(icon)}" alt="">` : '◷'}</span><div><strong>${safe(value)}</strong><small>${countLabel(count)}</small></div><i>→</i></button>`;
  }

  function categoryView() {
    return `<div class="library-intro"><small>BIBLIOTECA BECKY - ACTIVITĂȚI CU COPIII</small><h1>Ce dorești să prioritizeze activitatea?</h1><p>Alege o prioritate, iar noi te ghidăm către activitatea potrivită.</p></div><div class="library-categories">${categories.map(([label, icon, tone]) => { const count = optionCount('category', label); return `<button class="tone-${tone}" data-choice="category" data-value="${safe(label)}" ${count === 0 ? 'disabled' : ''}><span><img src="${iconBase}${safe(icon)}" alt=""></span><strong>${safe(categoryTitles[label] || label)}</strong><small>${countLabel(count)}</small></button>`; }).join('')}</div>`;
  }

  function choiceView() {
    const config = {
      age: ['Pentru ce vârstă?', ages, filterIcons.age, ['purple','green','orange','blue','purple']],
      participants: ['Câți copii participă?', groups, filterIcons.participants, ['coral','green','orange','blue']],
      duration: ['Cât timp ai la dispoziție?', durations, [], ['teal','green','orange','blue','purple']],
      implementation: ['Amploarea pregătirii activității', implementations, filterIcons.implementation, ['blue','green','orange','purple']]
    }[step];
    const position = libraryMode === 'internal' ? { participants:1, age:2, duration:3 }[step] : { participants:1, age:2, implementation:3 }[step];
    const total = 3;
    return `<div class="library-step-copy"><small>PASUL ${position} DIN ${total}</small><h1>${config[0]}</h1><p>Alege o singură opțiune pentru a continua.</p></div><div class="library-options library-options-${step}">${config[1].map((value,index) => option(value,config[2][index],step,config[3][index])).join('')}</div>`;
  }

  function ageRangeView() {
    const candidates = all().filter(activity =>
      (!filters.category || (activity.category || 'Gândește') === filters.category) &&
      (!filters.participants || activityParticipantMatches(activity, filters.participants)),
    );
    const available = ages.map((age, index) => ({
      age,
      index,
      count: candidates.filter(activity => normalizedActivityAges(activity).includes(age)).length,
    }));
    const availableIndexes = available.filter(item => item.count > 0).map(item => item.index);
    const firstAvailable = availableIndexes[0] ?? 0;
    const lastAvailable = availableIndexes.at(-1) ?? ages.length - 1;
    const commonCount = (min, max) => candidates.filter(activity => activityMatchesAgeRange(activity, { min, max })).length;
    const validRanges = availableIndexes.flatMap(min => availableIndexes
      .filter(max => max >= min && commonCount(min, max) > 0)
      .map(max => ({ min, max, count: commonCount(min, max) })))
      .sort((left, right) => (right.max - right.min) - (left.max - left.min) || right.count - left.count || left.min - right.min);
    const widestValid = validRanges[0] || { min: firstAvailable, max: lastAvailable };
    const requested = filters.ageRange || {
      min: filters.age ? Math.max(0, ages.indexOf(filters.age)) : widestValid.min,
      max: filters.age ? Math.max(0, ages.indexOf(filters.age)) : widestValid.max,
    };
    const clamped = {
      min: availableIndexes.find(index => index >= requested.min) ?? lastAvailable,
      max: [...availableIndexes].reverse().find(index => index <= requested.max) ?? firstAvailable,
    };
    if (clamped.min > clamped.max) clamped.max = clamped.min;
    const active = commonCount(clamped.min, clamped.max) > 0 ? clamped : widestValid;
    const label = ageRangeLabel(active.min, active.max);
    const tones = ['purple','green','orange','blue','purple'];
    const cards = available.map((item, index) => `<button type="button" class="library-option tone-${tones[index]}" data-age-card="${item.index}" ${item.count ? '' : 'disabled'}><span><img src="${iconBase}${safe(filterIcons.age[index])}" alt=""></span><div><strong>${safe(item.age)}</strong><small>${item.count ? countLabel(item.count) : 'Fără activități'}</small></div><i>→</i></button>`).join('');
    return `<div class="library-step-copy"><small>PASUL 2 DIN ${libraryMode === 'internal' ? '3' : '4'}</small><h1>Pentru ce vârste?</h1><p>Alege un card pentru a continua imediat cu o singură vârstă.</p></div><div class="library-options library-options-age library-age-cards">${cards}</div><div class="library-age-custom-divider"><span>sau alege un interval personalizat</span></div><section class="library-age-range" aria-label="Filtru personalizat de vârstă"><div class="library-age-range-heading"><div><small>INTERVAL SELECTAT</small><strong data-age-range-label>${safe(label)}</strong></div><span data-age-range-count>${countLabel(candidates.filter(activity => activityMatchesAgeRange(activity, active)).length)}</span></div><div class="library-age-range-track"><div class="library-age-range-fill" data-age-range-fill></div><input type="range" min="0" max="4" step="1" value="${active.min}" data-age-range="min" aria-label="Vârsta minimă"><input type="range" min="0" max="4" step="1" value="${active.max}" data-age-range="max" aria-label="Vârsta maximă"></div><div class="library-age-range-ticks">${available.map(item => `<button type="button" class="${item.count ? 'has-activities' : ''}" data-age-pick="${item.index}" ${item.count ? '' : 'disabled'}><b>${safe(item.age)}</b><small>${item.count ? countLabel(item.count) : 'Fără activități'}</small></button>`).join('')}</div><button type="button" class="library-age-range-continue" data-age-range-continue>Continuă cu acest interval <span aria-hidden="true">→</span></button></section>`;
  }

  function resultsView() {
    const activities = matches();
    const development = categoryDevelopment[filters.category] || 'dezvoltarea copilului';
    return `<div class="library-step-copy"><small>${libraryMode === 'internal' ? 'ACTIVITĂȚI INTERNE BECKY' : 'ACTIVITĂȚI PUBLICE'}</small><h1>Activități recomandate pentru ${safe(development)}</h1><p>${countLabel(activities.length)} după filtrele alese.</p></div><div class="library-results-grid">${activities.map(activity => { const [icon, tone] = categoryPresentation[activity.category] || ['✦', 'teal']; const artwork = activity.displayImage || activity.image; const age = filters.age || (filters.ageRange ? ageRangeLabel(filters.ageRange.min, filters.ageRange.max) : activityAgeLabel(activity)); const participants = filters.participants || groupKind(activity.participants); const implementation = libraryMode === 'internal' ? 'Set dedicat Becky' : (filters.implementation || activity.difficulty); return `<button class="tone-${tone}" data-activity="${activity.id}">${validationBadge(activity)}<div class="library-card-art">${artwork ? `<img src="${safe(artwork)}" alt="">` : '<span class="library-result-placeholder">✦</span>'}</div><div class="library-result-copy"><small><b>${icon}</b>${safe(activity.category || 'Activitate')}</small><strong>${safe(activity.title)}</strong><p>${safe(activity.subtitle || '')}</p></div><div class="library-card-choices">${cardChoice('age', age)}${cardChoice('participants', participants)}${cardChoice('implementation', implementation)}</div></button>`; }).join('') || '<div class="library-empty"><strong>Nicio activitate potrivită</strong><p>Întoarce-te și schimbă unul dintre filtre.</p></div>'}</div>`;
  }

  function activityRoundsMarkup(rounds, activityId = '') {
    if (!Array.isArray(rounds) || !rounds.length) return '';
    return `<section class="library-detail-panel is-rounds"><div><small>8 REPRIZE DE TESTARE</small><h3>Cum testezi statuile</h3><ol>${rounds.map(round => `<li><strong>${safe(round.test)}</strong>${round.punishment ? `<span><b>Pedeapsă:</b> ${safe(round.punishment)}</span>` : ''}</li>`).join('')}</ol><a class="library-rounds-app-link" href="/shake-test?activity_id=${encodeURIComponent(activityId)}">Deschide jocul în aplicația de facilitare →</a></div></section>`;
  }

  const materialAliases = [['pahare', ['pahar']], ['mingi', ['minge', 'mingiuță', 'mingiuta', 'bilă', 'bila']], ['baloane', ['balon']], ['cărți', ['carte', 'cărți', 'carti']], ['pai', ['pai']], ['zar', ['zar']], ['masă', ['masă', 'masa']], ['bandă adezivă', ['bandă', 'banda']]];
  const activityMaterials = activity => {
    if (Array.isArray(activity.materialTags) && activity.materialTags.length) return activity.materialTags;
    const text = String(activity.materials || '').toLowerCase();
    return materialAliases.filter(([, aliases]) => aliases.some(alias => text.includes(alias))).map(([name]) => name);
  };
  const materialKind = material => ['pahare', 'mingi', 'baloane', 'cărți', 'pai', 'zar', 'masă', 'bandă adezivă'].includes(material) ? 'generic' : 'special';
  function relatedActivities(activity) {
    const current = new Set(activityMaterials(activity));
    if (!current.size) return [];
    return allActivities().filter(item => item.id !== activity.id && activityLibraryType(item) === activityLibraryType(activity) && activityMaterials(item).length).map(item => {
      const materials = activityMaterials(item);
      const shared = materials.filter(material => current.has(material));
      const missing = materials.filter(material => !current.has(material));
      const genericMissing = missing.filter(material => materialKind(material) === 'generic');
      const specialMissing = missing.filter(material => materialKind(material) === 'special');
      const tier = shared.length === materials.length ? 0 : genericMissing.length && shared.length ? 1 : specialMissing.length && shared.length ? 2 : 3;
      return { item, shared, missing, tier, score: tier * 100 + missing.length * 10 - shared.length };
    }).sort((a, b) => a.score - b.score || a.item.title.localeCompare(b.item.title, 'ro')).slice(0, 6);
  }
  function relatedActivitiesMarkup(activity) {
    const related = relatedActivities(activity);
    if (!related.length) return '';
    const reason = entry => {
      if (!entry.missing.length) return 'Ai deja toată recuzita';
      if (entry.shared.length && entry.missing.length === 1) return `Îți mai trebuie doar ${entry.missing[0]}`;
      if (entry.shared.length) return `Folosește ${entry.shared.join(' și ')}`;
      return 'Alt joc cu recuzită asemănătoare';
    };
    return `<section class="library-related-activities"><header><div><small>CONTINUĂ CU CE AI PREGĂTIT</small><h2>Mai poți încerca</h2><p>Jocuri ordonate după cât de ușor refolosești materialele.</p></div></header><div class="library-related-carousel">${related.map(({ item, shared, missing, tier }) => `<button type="button" class="library-related-card tone-${categoryPresentation[item.category]?.[1] || 'teal'}" data-related-activity="${safe(item.id)}"><span class="library-related-tier">${tier === 0 ? 'Aceleași materiale' : tier === 1 ? 'Mai trebuie ceva generic' : tier === 2 ? 'Cu recuzită specială' : 'Altă variantă'}</span><strong>${safe(item.title)}</strong><small>${safe(reason({ shared, missing }))}</small><i>Deschide →</i></button>`).join('')}</div></section>`;
  }
  function injectRelatedStyles() {
    if (document.getElementById('library-related-styles')) return;
    const style = document.createElement('style');
    style.id = 'library-related-styles';
    style.textContent = `.library-detail-collection{max-width:920px;margin:-8px auto 18px;padding:10px 15px;border-radius:12px;background:#f4faf9;color:#66808b;font-size:12px}.library-detail-collection b{color:#168f9f}.library-open-facilitator{display:grid;min-height:58px;place-items:center;margin:18px 26px 26px;border-radius:18px;background:#233448;box-shadow:0 7px 0 #e16c7e;color:#fff;font-weight:900;text-decoration:none}.library-related-activities{max-width:920px;margin:26px auto 0;padding:22px 0 8px}.library-related-activities header{margin-bottom:14px}.library-related-activities header small{color:#8263b5;font-size:10px;font-weight:900;letter-spacing:.13em}.library-related-activities h2{margin:5px 0;color:#26384c;font:700 24px/1.15 Mali,sans-serif}.library-related-activities p{margin:0;color:#6f8298;font-size:13px}.library-related-carousel{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 14px;scroll-snap-type:x proximity}.library-related-card{display:grid;min-width:220px;min-height:132px;align-content:start;gap:7px;padding:16px;border:1px solid color-mix(in srgb,var(--tone) 28%,#d7e5e8);border-radius:18px;background:#fff;color:var(--ink);text-align:left;cursor:pointer;scroll-snap-align:start;box-shadow:0 8px 20px rgba(35,52,72,.06)}.library-related-card:hover{transform:translateY(-2px);box-shadow:0 13px 25px rgba(35,52,72,.11)}.library-related-card strong{font-size:16px}.library-related-card small{color:#6f8298;font-weight:800;line-height:1.35}.library-related-card i{margin-top:auto;color:var(--tone);font-size:11px;font-style:normal;font-weight:900}.library-related-tier{color:var(--tone);font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}`;
    document.head.appendChild(style);
  }
  function injectPlaylistStyles() {
    if (document.getElementById('activity-playlist-styles')) return;
    const style = document.createElement('style'); style.id = 'activity-playlist-styles';
    style.textContent = `.activity-playlists{max-width:1100px;margin:30px auto 0;padding:24px;border:1px solid #b4dbde;border-radius:24px;background:#fffdfa}.activity-playlists header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:16px}.activity-playlists header small,.activity-playlist-view>header small{color:#198e9f;font-size:10px;font-weight:900;letter-spacing:.12em}.activity-playlists h2,.activity-playlist-view h1{margin:5px 0;color:#233448;font:600 27px Mali,sans-serif}.activity-playlists header p,.activity-playlist-view>header p{margin:0;color:#6f8298;font-size:13px}.activity-playlists header button{padding:10px 14px;border:0;border-radius:12px;background:#198e9f;color:#fff;font-weight:900}.activity-playlist-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.activity-playlist-card{display:grid;min-height:112px;align-content:start;gap:7px;padding:16px;border:1px solid #b4dbde;border-radius:18px;background:#f7fcfb;color:#233448;text-align:left}.activity-playlist-card small{color:#6f8298}.activity-playlist-card i{margin-top:auto;color:#198e9f;font-size:11px;font-style:normal;font-weight:900}.activity-playlist-card.is-drop-target{background:#fff0d9;border-color:#e99562}.activity-playlist-view{max-width:900px;margin:0 auto;padding:20px}.activity-playlist-view>header{margin:20px 0}.activity-playlist-items{display:grid;gap:10px}.activity-playlist-item{display:grid;grid-template-columns:32px 1fr auto auto;align-items:center;gap:10px;padding:12px 14px;border:1px solid #b4dbde;border-radius:16px;background:#fff}.playlist-drag{color:#198e9f;font-size:20px;cursor:grab}.activity-playlist-item strong,.activity-playlist-item small{display:block}.activity-playlist-item small{margin-top:3px;color:#6f8298;font-size:11px}.activity-playlist-item button{border:0;border-radius:9px;background:#eef7f6;color:#198e9f;padding:8px;font-size:11px;font-weight:900}.activity-playlist-item button:last-child{background:transparent;color:#c45d55;font-size:18px}.playlist-delete{margin-top:20px;border:0;background:transparent;color:#c45d55;font-size:12px;font-weight:900}@media(max-width:600px){.activity-playlists{padding:18px}.activity-playlists header{align-items:flex-start}.activity-playlist-grid{grid-template-columns:1fr}.activity-playlist-item{grid-template-columns:28px 1fr auto}.activity-playlist-item button:last-child{grid-column:3}.activity-playlist-item button[data-playlist-open]{grid-column:3}.activity-playlist-item button[data-playlist-remove]{grid-column:3}`;
    document.head.appendChild(style);
  }

  function activityView() {
    const activity = selectedActivity;
    const list = value => String(value || '').split(/\n+/).filter(Boolean).map(item => `<li>${safe(item)}</li>`).join('');
    const artwork = activity.displayImage || activity.image;
    const [, tone] = categoryPresentation[activity.category] || ['✦', 'teal'];
    const variants = activity.easier || activity.harder;
    return `<div class="library-detail-view"><button class="library-back-to-results" data-results-back>← Înapoi la activități</button><article class="library-activity-detail tone-${tone}"><header class="library-detail-hero"><div class="library-detail-copy"><small>${safe(categoryTitles[activity.category] || activity.category || 'Activitate Becky')}</small><h1>${safe(activity.title)}</h1><p>${safe(activity.subtitle || '')}</p></div>${artwork ? `<figure><img src="${safe(artwork)}" alt=""></figure>` : ''}<div class="library-detail-meta">${detailMeta('age', 'Vârstă', activityAgeLabel(activity))}${detailMeta('duration', 'Timp', activity.duration)}${detailMeta('participants', 'Participanți', activityParticipantLabel(activity))}${detailMeta('implementation', 'Materiale', activity.difficulty)}</div></header>${activity.collection ? `<div class="library-detail-collection">Colecție: <b>${safe(activity.collection)}</b></div>` : ''}${activity.skills ? `<section class="library-detail-skills">${detailPanelIcon('detail-skills.png')}<div><b>CE EXERSĂM</b><p>${safe(activity.skills)}</p></div></section>` : ''}<div class="library-detail-sections">${activity.materials ? `<section class="library-detail-panel is-materials">${detailPanelIcon('detail-materials.png')}<div><small>PREGĂTEȘTE</small><h3>Materiale</h3><ul>${list(activity.materials)}</ul></div></section>` : ''}${activityRoundsMarkup(activity.rounds, activity.id)}${activity.steps ? `<section class="library-detail-panel is-steps">${detailPanelIcon('detail-steps.png')}<div><small>PAS CU PAS</small><h3>Cum se joacă</h3><ol>${list(activity.steps)}</ol></div></section>` : ''}${activity.rules ? `<section class="library-detail-panel is-rules">${detailPanelIcon('detail-rules.png')}<div><small>REPER CLAR</small><h3>Reguli</h3><ul>${list(activity.rules)}</ul></div></section>` : ''}${activity.facilitator ? `<section class="library-detail-panel is-facilitator">${detailPanelIcon('detail-facilitator.png')}<div><small>POȚI SPUNE</small><h3>Replica facilitatorului</h3><p>„${safe(activity.facilitator.replace(/^[„"]|[”"]$/g, ''))}”</p></div></section>` : ''}${variants ? `<section class="library-detail-panel is-variants">${detailPanelIcon('detail-adapt.png')}<div><small>REGLEAZĂ PROVOCAREA</small><h3>Adaptează activitatea</h3>${activity.easier ? `<p><b>Mai ușor:</b> ${safe(activity.easier)}</p>` : ''}${activity.harder ? `<p><b>Mai greu:</b> ${safe(activity.harder)}</p>` : ''}</div></section>` : ''}${activity.caution ? `<section class="library-detail-panel is-caution">${detailPanelIcon('detail-caution.png')}<div><small>DE ȚINUT MINTE</small><h3>Atenție</h3><p>${safe(activity.caution)}</p></div>` : ''}</div>${activity.reflection ? `<footer class="library-detail-reflection">${detailPanelIcon('detail-reflection.png')}<div><small>LA FINAL</small><strong>${safe(activity.reflection)}</strong></div></footer>` : ''}</article>${relatedActivitiesMarkup(activity)}</div>`;
  }

  const observationResultIcon = result => result === 'A mers bine' ? '🟢' : result === 'Nu a mers' ? '🔴' : '🟡';
  function observationsMarkup() { return `<section class="library-observations" id="testari-observatii"><header><div><small>MEMORIE EMPIRICĂ</small><h2>Testări & observații</h2><p>Ce s-a întâmplat în realitate, separat de designul activității.</p></div><button type="button" data-add-observation>＋ Notează o testare</button></header><div class="library-observation-list">${activityObservations.map(item => `<article class="library-observation-card" data-observation-id="${safe(item.id)}"><button class="library-observation-summary" type="button" data-expand-observation><span><strong>${safe(item.tested_at)}</strong><small>${safe((item.age_categories || []).join(' · ') || 'Vârstă nespecificată')} · ${safe(item.participants)} · ${observationResultIcon(item.result)} ${safe(item.result)}</small></span><b>⌄</b></button><div class="library-observation-body"><div><small>AM OBSERVAT</small><p>${safe(item.observed)}</p></div>${item.interpreted ? `<div><small>CRED CĂ ÎNSEAMNĂ</small><p>${safe(item.interpreted)}</p></div>` : ''}${item.hypothesized ? `<div><small>VREAU SĂ VERIFIC</small><p>${safe(item.hypothesized)}</p></div>` : ''}${item.action ? `<div><small>DATA VIITOARE</small><p>${safe(item.action)}</p></div>` : ''}${item.capacity ? `<div><small>CAPACITATE URMĂRITĂ</small><p>${safe(item.capacity)}${item.behavior_observed === true ? ' · Observat' : item.behavior_observed === false ? ' · Nu a fost observat' : ''}</p></div>` : ''}<footer><button type="button" data-edit-observation>Editează</button><button type="button" data-delete-observation>Șterge</button></footer></div></article>`).join('') || '<p class="library-observations-empty">Nu există încă testări înregistrate.</p>'}</div></section>`; }
  function renderObservationBehaviors() { root.querySelectorAll('.library-observation-card').forEach(card => { const item = activityObservations.find(entry => entry.id === card.dataset.observationId); if (!item || !Array.isArray(item.behaviors) || !item.behaviors.length) return; const body = card.querySelector('.library-observation-body'); if (!body || body.querySelector('.library-observation-behaviors')) return; const block = document.createElement('div'); block.className = 'library-observation-behaviors'; block.innerHTML = `<small>CAPACITĂȚI / COMPORTAMENTE URMĂRITE</small>${item.behaviors.map(behavior => `<p class="library-observation-behavior"><span>${safe(behavior.label)}</span><b>${safe(behavior.status || '—')}</b></p>`).join('')}`; body.insertBefore(block, body.querySelector('footer')); }); }
  function mountObservations() { const host = root.querySelector('.library-detail-view'); if (!host || host.querySelector('.library-observations')) return; host.insertAdjacentHTML('beforeend', observationsMarkup()); bindObservationEvents(); renderObservationBehaviors(); }
  function mountFacilitatorLaunch() { const article = root.querySelector('.library-activity-detail'); if (!article || article.querySelector('.library-open-facilitator') || !selectedActivity) return; article.insertAdjacentHTML('beforeend', `<a class="library-open-facilitator" href="/joaca?activity_id=${encodeURIComponent(selectedActivity.id)}">Pornește în aplicația de facilitare →</a>`); }
  async function loadObservations() { if (!selectedActivity) return; try { const response = await api(`/api/admin/activity-observations?activity_id=${encodeURIComponent(selectedActivity.id)}`); activityObservations = response.ok ? ((await response.json()).observations || []) : []; } catch { activityObservations = []; } const section = root.querySelector('.library-observations'); if (section) { section.outerHTML = observationsMarkup(); bindObservationEvents(); renderObservationBehaviors(); } }
  function observationModal(item = null) {
    const modal = document.createElement('div');
    modal.className = 'library-observation-modal';
    const selectedAges = item?.age_categories || [];
    modal.innerHTML = `<form class="library-observation-form"><button type="button" class="library-observation-close" data-close-observation>×</button><small>TESTARE NOUĂ</small><h2>${item ? 'Editează testarea' : 'Notează o testare'}</h2><label>Data testării<input name="tested_at" type="date" value="${safe(item?.tested_at || new Date().toISOString().slice(0,10))}" required></label><fieldset><legend>Categorii de vârstă testate</legend><div>${ages.map(age => `<label><input type="checkbox" name="age_categories" value="${safe(age)}" ${selectedAges.includes(age) ? 'checked' : ''}>${safe(age)}</label>`).join('')}</div></fieldset><label>Configurația participanților<select name="participants">${groups.map(group => `<option ${group === (item?.participants || '') ? 'selected' : ''}>${safe(group)}</option>`).join('')}</select></label><label>Rezultat general<select name="result">${['A mers bine','Mixt','Nu a mers'].map(result => `<option ${result === (item?.result || 'Mixt') ? 'selected' : ''}>${result}</option>`).join('')}</select></label><label>OBSERVAȚIE <span>(obligatoriu)</span><textarea name="observed" required>${safe(item?.observed || '')}</textarea></label><label>INTERPRETARE <span>(opțional)</span><textarea name="interpreted">${safe(item?.interpreted || '')}</textarea></label><label>IPOTEZĂ <span>(opțional)</span><textarea name="hypothesized">${safe(item?.hypothesized || '')}</textarea></label><label>ACȚIUNE / NEXT TEST <span>(opțional)</span><textarea name="action">${safe(item?.action || '')}</textarea></label><div class="library-observation-form-actions"><button type="button" data-close-observation>Anulează</button><button type="submit">Salvează testarea</button></div></form>`;
    const behaviors = Array.isArray(item?.behaviors) && item.behaviors.length ? item.behaviors : (item?.capacity ? [{ label: item.capacity, status: item.behavior_observed === true ? 'Da' : item.behavior_observed === false ? 'Nu' : '' }] : []);
    const actions = modal.querySelector('.library-observation-form-actions');
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'library-behaviors-fieldset';
    fieldset.innerHTML = '<legend>CAPACITĂȚI / COMPORTAMENTE URMĂRITE <span>(opțional)</span></legend><div class="library-behavior-rows"></div><button type="button" class="library-behavior-add">＋ Adaugă comportament</button>';
    actions.before(fieldset);
    const rows = fieldset.querySelector('.library-behavior-rows');
    const addRow = (behavior = {}) => { const row = document.createElement('div'); row.className = 'library-behavior-row'; row.innerHTML = `<input data-behavior-label placeholder="Ex. implicare" value="${safe(behavior.label || '')}"><select data-behavior-status><option value="">Alege</option><option ${behavior.status === 'Da' ? 'selected' : ''}>Da</option><option ${behavior.status === 'Parțial' ? 'selected' : ''}>Parțial</option><option ${behavior.status === 'Nu' ? 'selected' : ''}>Nu</option></select><button type="button" data-remove-behavior aria-label="Șterge rândul">×</button>`; row.querySelector('[data-remove-behavior]').onclick = () => { if (rows.children.length > 1) row.remove(); else row.querySelector('[data-behavior-label]').value = ''; }; rows.appendChild(row); };
    (behaviors.length ? behaviors : [{}]).forEach(addRow);
    fieldset.querySelector('.library-behavior-add').onclick = () => addRow();
    root.appendChild(modal);
    modal.querySelectorAll('[data-close-observation]').forEach(button => button.onclick = () => modal.remove());
    modal.querySelector('form').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const payload = { activity_id: selectedActivity.id, tested_at: form.get('tested_at'), age_categories: form.getAll('age_categories'), participants: form.get('participants'), result: form.get('result'), observed: String(form.get('observed') || '').trim(), interpreted: String(form.get('interpreted') || '').trim(), hypothesized: String(form.get('hypothesized') || '').trim(), action: String(form.get('action') || '').trim(), behaviors: [...modal.querySelectorAll('.library-behavior-row')].map(row => ({ label: row.querySelector('[data-behavior-label]').value.trim(), status: row.querySelector('[data-behavior-status]').value })).filter(item => item.label) }; const response = await api(item ? `/api/admin/activity-observations/${encodeURIComponent(item.id)}` : '/api/admin/activity-observations', { method: item ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if (!response.ok) return; modal.remove(); await loadObservations(); };
  }
  function bindObservationEvents() { const section = root.querySelector('.library-observations'); if (!section) return; section.querySelector('[data-add-observation]')?.addEventListener('click', () => observationModal()); section.querySelectorAll('[data-expand-observation]').forEach(button => button.addEventListener('click', () => button.closest('.library-observation-card').classList.toggle('is-expanded'))); section.querySelectorAll('[data-edit-observation]').forEach(button => button.addEventListener('click', () => { const item = activityObservations.find(item => item.id === button.closest('[data-observation-id]').dataset.observationId); if (item) observationModal(item); })); section.querySelectorAll('[data-delete-observation]').forEach(button => button.addEventListener('click', async () => { const id = button.closest('[data-observation-id]').dataset.observationId; if (!window.confirm('Ștergi această testare?')) return; const response = await api(`/api/admin/activity-observations/${encodeURIComponent(id)}`, { method: 'DELETE' }); if (response.ok) await loadObservations(); })); }
  function body() {
    if (step === 'hub') return hubView();
    if (step === 'playlists') return playlistView();
    if (!currentItems().length) return emptyLibraryView();
    if (libraryMode === 'physical' || libraryMode === 'magic') {
      if (step.endsWith('results')) return specialResultsView();
      if (step.endsWith('detail')) return specialDetailView();
      return specialChoiceView();
    }
    if (step === 'category') return categoryView();
    if (step === 'age') return ageRangeView();
    if (['participants','duration','implementation'].includes(step)) return choiceView();
    if (step === 'results') return resultsView();
    return activityView();
  }

  function render(direction = 'forward') {
    root.innerHTML = `<section class="library-shell"><header><button data-back ${step === 'hub' ? 'disabled' : ''}>← Înapoi</button>${breadcrumb()}<button data-reset ${step === 'hub' ? 'disabled' : ''}>Biblioteca Becky</button></header><div class="library-viewport"><div class="library-screen enter-${direction}">${step === 'results' ? activityPlaylistsMarkup() : ''}${body()}</div></div></section>`;
    bind();
    requestAnimationFrame(() => root.querySelector('.library-screen')?.classList.remove(`enter-${direction}`));
  }

  function move(next, update, direction = 'forward') {
    const screen = root.querySelector('.library-screen');
    screen?.classList.add(`leave-${direction}`);
    setTimeout(() => { update?.(); step = next; render(direction); }, 220);
  }

  function bind() {
    root.querySelector('[data-new-activity-playlist]')?.addEventListener('click', createActivityPlaylist);
    root.querySelectorAll('[data-open-activity-playlist]').forEach(button => button.addEventListener('click', () => { selectedSpecialItem = activityPlaylists.find(item => item.id === button.dataset.openActivityPlaylist); step = 'playlists'; render('forward'); }));
    root.querySelector('[data-playlists-back]')?.addEventListener('click', () => { selectedSpecialItem = null; step = 'hub'; render('back'); });
    root.querySelectorAll('[data-playlist-open]').forEach(button => button.addEventListener('click', () => { selectedActivity = allActivities().find(item => item.id === button.dataset.playlistOpen) || null; libraryMode = activityLibraryType(selectedActivity); step = 'activity'; render('forward'); }));
    root.querySelectorAll('[data-playlist-remove]').forEach(button => button.addEventListener('click', () => updateActivityPlaylist(button.closest('[data-playlist-item]').dataset.playlistItem, 'remove')));
    root.querySelector('[data-delete-activity-playlist]')?.addEventListener('click', () => { const id = root.querySelector('[data-delete-activity-playlist]').dataset.deleteActivityPlaylist; if (window.confirm('Ștergi această listă? Activitățile rămân în Bibliotecă.')) { activityPlaylists = activityPlaylists.filter(item => item.id !== id); saveActivityPlaylists().then(() => { step = 'hub'; selectedSpecialItem = null; render('back'); }); } });
    root.querySelectorAll('[data-playlist-item]').forEach(item => { item.addEventListener('dragstart', () => { draggedActivityId = item.dataset.playlistItem; }); item.addEventListener('dragover', event => event.preventDefault()); item.addEventListener('drop', () => reorderActivityPlaylist(draggedActivityId, item.dataset.playlistItem)); });
    if (step === 'activity') { mountFacilitatorLaunch(); mountObservations(); loadObservations(); }
    root.querySelectorAll('[data-library-mode]').forEach(button => button.addEventListener('click', () => move(
      button.dataset.libraryMode === 'physical' ? 'physical-age' : button.dataset.libraryMode === 'magic' ? 'magic-age' : 'category',
      () => { libraryMode = button.dataset.libraryMode; resetFilters(); }
    )));
    root.querySelector('[data-hub-back]')?.addEventListener('click', () => move('hub', () => { libraryMode = ''; resetFilters(); }, 'back'));
    root.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.choice;
      const next = { category:'participants', participants:'age', duration:libraryMode === 'internal' ? 'results' : 'implementation', implementation:'results' }[key];
      move(next, () => { filters[key] = button.dataset.value; });
    }));
    if (step === 'age') {
      const minInput = root.querySelector('[data-age-range="min"]');
      const maxInput = root.querySelector('[data-age-range="max"]');
      const label = root.querySelector('[data-age-range-label]');
      const count = root.querySelector('[data-age-range-count]');
      const fill = root.querySelector('[data-age-range-fill]');
      const continueButton = root.querySelector('[data-age-range-continue]');
      const candidates = all().filter(activity => (!filters.category || (activity.category || 'Gândește') === filters.category) && (!filters.participants || activityParticipantMatches(activity, filters.participants)));
      const availableIndexes = ages.map((age, index) => candidates.some(activity => normalizedActivityAges(activity).includes(age)) ? index : -1).filter(index => index >= 0);
      let previousMin = Number(minInput.value);
      let previousMax = Number(maxInput.value);
      const nearestAvailable = (value, previous) => {
        if (availableIndexes.includes(value)) return value;
        if (value > previous) return availableIndexes.find(index => index > value) ?? availableIndexes.at(-1);
        return [...availableIndexes].reverse().find(index => index < value) ?? availableIndexes[0];
      };
      const refreshRange = changedInput => {
        let min = Number(minInput.value); let max = Number(maxInput.value);
        if (changedInput === minInput) min = nearestAvailable(min, previousMin);
        if (changedInput === maxInput) max = nearestAvailable(max, previousMax);
        if (min > max) { if (document.activeElement === minInput) min = max; else max = min; }
        let matching = candidates.filter(activity => activityMatchesAgeRange(activity, { min, max }));
        if (changedInput && matching.length === 0) {
          if (changedInput === minInput) min = previousMin;
          if (changedInput === maxInput) max = previousMax;
          matching = candidates.filter(activity => activityMatchesAgeRange(activity, { min, max }));
        }
        minInput.value = min; maxInput.value = max;
        label.textContent = ageRangeLabel(min, max);
        const matchCount = matching.length;
        count.textContent = countLabel(matchCount);
        continueButton.disabled = matchCount === 0;
        fill.style.left = `${min * 25}%`; fill.style.right = `${(4 - max) * 25}%`;
        previousMin = min; previousMax = max;
      };
      minInput?.addEventListener('input', event => refreshRange(event.currentTarget)); maxInput?.addEventListener('input', event => refreshRange(event.currentTarget)); refreshRange();
      root.querySelectorAll('[data-age-card]').forEach(button => button.addEventListener('click', () => {
        const value = Number(button.dataset.ageCard);
        move(libraryMode === 'internal' ? 'duration' : 'implementation', () => { filters.age = ages[value]; filters.ageRange = null; });
      }));
      root.querySelectorAll('[data-age-pick]').forEach(button => button.addEventListener('click', () => {
        const value = Number(button.dataset.agePick);
        minInput.value = value; maxInput.value = value; refreshRange();
      }));
      root.querySelector('[data-age-range-continue]')?.addEventListener('click', () => move(libraryMode === 'internal' ? 'duration' : 'implementation', () => { filters.age = ''; filters.ageRange = { min: Number(minInput.value), max: Number(maxInput.value) }; }));
    }
    root.querySelectorAll('[data-activity]').forEach(button => { button.draggable = true; button.addEventListener('dragstart', () => { draggedActivityId = button.dataset.activity; }); button.addEventListener('click', () => move('activity', () => { selectedActivity = all().find(activity => activity.id === button.dataset.activity) || null; activityObservations = []; })); let startX = 0; button.addEventListener('touchstart', event => { startX = event.changedTouches[0].screenX; }, { passive: true }); button.addEventListener('touchend', event => { if (event.changedTouches[0].screenX - startX > 70) { event.preventDefault(); chooseActivityPlaylist(button.dataset.activity); } }); });
    root.querySelectorAll('[data-drop-playlist]').forEach(button => { button.addEventListener('dragover', event => event.preventDefault()); button.addEventListener('drop', event => { event.preventDefault(); addToActivityPlaylist(button.dataset.dropPlaylist, draggedActivityId); }); });
    root.querySelectorAll('[data-related-activity]').forEach(button => button.addEventListener('click', () => { selectedActivity = all().find(activity => activity.id === button.dataset.relatedActivity) || null; activityObservations = []; render('forward'); }));
    root.querySelector('[data-results-back]')?.addEventListener('click', () => move('results', null, 'back'));
    root.querySelectorAll('[data-special-choice]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.specialChoice;
      const next = libraryMode === 'physical'
        ? { age:'physical-participants', participants:'physical-level', learningStatus:'physical-results' }[key]
        : { age:'magic-level', learningStatus:magicUsesDuration() ? 'magic-duration' : 'magic-results', duration:'magic-results' }[key];
      move(next, () => { filters[key] = button.dataset.value; });
    }));
    root.querySelectorAll('[data-special-item]').forEach(button => button.addEventListener('click', () => move(`${libraryMode}-detail`, () => { selectedSpecialItem = currentItems().find(item => item.id === button.dataset.specialItem) || null; })));
    root.querySelector('[data-special-results-back]')?.addEventListener('click', () => move(`${libraryMode}-results`, null, 'back'));
    root.querySelector('[data-reset]')?.addEventListener('click', () => move('hub', () => { libraryMode = ''; resetFilters(); }, 'back'));
    root.querySelector('[data-back]')?.addEventListener('click', () => {
      const previous = {
        category:'hub', participants:'category', age:'participants', duration:'age', implementation:libraryMode === 'internal' ? 'duration' : 'age',
        results:libraryMode === 'internal' ? 'duration' : 'implementation', activity:'results',
        'physical-age':'hub', 'physical-participants':'physical-age', 'physical-level':'physical-participants', 'physical-results':'physical-level', 'physical-detail':'physical-results',
        'magic-age':'hub', 'magic-level':'magic-age', 'magic-duration':'magic-level', 'magic-results':magicUsesDuration() ? 'magic-duration' : 'magic-level', 'magic-detail':'magic-results'
      }[step];
      if (previous) move(previous, () => { if (previous === 'hub') { libraryMode = ''; resetFilters(); } }, 'back');
    });
  }

  (async () => {
    const [response, coverageResponse] = await Promise.all([apiFetch('/api/workspaces'), apiFetch('/api/admin/pedagogic-coverage').catch(() => null)]);
    if (response.status === 401) return location.replace('/admin?view=children');
    const data = await response.json();
    workspacePayload = data;
    const workspace = data.workspaces?.find(item => item.id === 'children') || {};
    activityPlaylists = Array.isArray(workspace.activityPlaylists) ? workspace.activityPlaylists : [];
    const legacyActivities = Array.isArray(workspace.activityPages) ? workspace.activityPages.flatMap(page => page.activities || []) : [];
    activities = (Array.isArray(workspace.activities) && workspace.activities.length ? workspace.activities : legacyActivities).map(activity => ({ ...activity, libraryType: activity.libraryType === 'internal' ? 'internal' : 'public' }));
    physicalInteractions = Array.isArray(workspace.physicalInteractions) ? workspace.physicalInteractions.map((item, index) => ({ ...item, id:item.id || `physical-${index + 1}` })) : [];
    magicTricks = Array.isArray(workspace.magicTricks) ? workspace.magicTricks.map((item, index) => ({ ...item, id:item.id || `magic-${index + 1}` })) : [];
    if (coverageResponse?.ok) applyValidationCoverage(await coverageResponse.json());
    await Promise.all(activities.map(async activity => { activity.displayImage = await removeConnectedLightBackground(activity.image); }));
    const requestedActivity = new URLSearchParams(location.search).get('activity_id');
    selectedActivity = activities.find(activity => activity.id === requestedActivity) || null;
    if (selectedActivity) { libraryMode = activityLibraryType(selectedActivity); step = 'activity'; }
    const requestedLibrary = new URLSearchParams(location.search).get('library');
    if (!selectedActivity && libraryDefinitions[requestedLibrary]) { libraryMode = requestedLibrary; step = requestedLibrary === 'physical' ? 'physical-age' : requestedLibrary === 'magic' ? 'magic-age' : 'category'; }
    window.addEventListener('focus', refreshValidationCoverage);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshValidationCoverage(); });
    injectRelatedStyles();
    injectPlaylistStyles();
    render();
    if (selectedActivity && location.hash === '#testari-observatii') setTimeout(() => document.getElementById('testari-observatii')?.scrollIntoView({ behavior:'smooth', block:'start' }), 300);
  })().catch(() => { root.innerHTML = '<div class="library-loading">Biblioteca nu a putut fi încărcată.</div>'; });
})();
