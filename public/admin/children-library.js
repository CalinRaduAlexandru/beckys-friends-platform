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
  const implementations = ['Fără echipament', 'Cu o recuzită la îndemână', 'Cu o recuzită specială', 'Cu set de materiale dedicate'];
  const iconBase = '/assets/activity-library-icons/final/';
  const filterIcons = {
    age: ['age-1-2.png','age-2-4.png','age-4-6.png','age-6-8.png','age-8-plus.png'],
    participants: ['group-individual-v2.png','group-2-3.png','group-4-9.png','group-10-plus.png'],
    implementation: ['prep-none.png','prep-everyday.png','prep-special.png','prep-kit.png']
  };
  const steps = ['category', 'age', 'participants', 'implementation', 'results', 'activity'];
  let activities = [];
  let step = 'category';
  let selectedActivity = null;
  let activityObservations = [];
  let editingObservation = null;
  let filters = { category: '', age: '', participants: '', implementation: '' };

  const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
  const api = (url, options) => (window.adminApiFetch || fetch)(url, options);
  const complete = activity => activity && activity.title && activity.title !== 'Activitate nouă' && (activity.steps || activity.image);
  const all = () => activities.filter(complete);
  const parseRange = value => { const values = String(value || '').match(/\d+/g)?.map(Number) || []; return values.length > 1 ? [values[0], values[1]] : values.length ? [values[0], /\+/.test(value) ? 99 : values[0]] : [0, 99]; };
  const ageMatches = (value, filter) => { const [a, b] = parseRange(value); const [c, d] = parseRange(filter); return a <= d && b >= c; };
  const normalizedActivityAges = activity => {
    const source = Array.isArray(activity.ageCategories) && activity.ageCategories.length ? activity.ageCategories : [activity.age];
    return ages.filter(filter => source.some(value => ageMatches(value, filter)));
  };
  const activityAgeMatches = (activity, filter) => normalizedActivityAges(activity).includes(filter);
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
    (!filters.participants || activityParticipantMatches(activity, filters.participants)) &&
    (!filters.implementation || activity.difficulty === filters.implementation)
  );
  const optionCount = (key, value) => { const before = filters[key]; filters[key] = value; const count = matches().length; filters[key] = before; return count; };
  const countLabel = count => `${count} ${count === 1 ? 'activitate' : 'activități'}`;
  const choiceIcon = (key, value) => {
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

  async function apiFetch(path) {
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem('becky-admin-session') || 'null'); } catch {}
    const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
    return fetch(path, { headers });
  }

  function breadcrumb() {
    const labels = { category: 'Categorie', age: 'Vârstă', participants: 'Număr copii', implementation: 'Implementare', results: 'Activități', activity: 'Activitate' };
    const current = steps.indexOf(step);
    return `<div class="library-progress">${steps.slice(0, 5).map((id, index) => `<span class="${index < current ? 'is-done' : index === current ? 'is-current' : ''}"><i></i>${labels[id]}</span>`).join('')}</div>`;
  }

  function option(value, icon, key, tone) {
    const count = optionCount(key, value);
    return `<button class="library-option tone-${tone}" data-choice="${key}" data-value="${safe(value)}" ${count === 0 ? 'disabled' : ''}><span><img src="${iconBase}${safe(icon)}" alt=""></span><div><strong>${safe(value)}</strong><small>${countLabel(count)}</small></div><i>→</i></button>`;
  }

  function categoryView() {
    return `<div class="library-intro"><small>BIBLIOTECA BECKY - ACTIVITĂȚI CU COPIII</small><h1>Ce dorești să prioritizeze activitatea?</h1><p>Alege o prioritate, iar noi te ghidăm către activitatea potrivită.</p></div><div class="library-categories">${categories.map(([label, icon, tone]) => { const count = optionCount('category', label); return `<button class="tone-${tone}" data-choice="category" data-value="${safe(label)}" ${count === 0 ? 'disabled' : ''}><span><img src="${iconBase}${safe(icon)}" alt=""></span><strong>${safe(categoryTitles[label] || label)}</strong><small>${countLabel(count)}</small></button>`; }).join('')}</div>`;
  }

  function choiceView() {
    const config = {
      age: ['Pentru ce vârstă?', ages, filterIcons.age, ['purple','green','orange','blue','purple']],
      participants: ['Câți copii participă?', groups, filterIcons.participants, ['coral','green','orange','blue']],
      implementation: ['Amploarea pregătirii activității', implementations, filterIcons.implementation, ['blue','green','orange','purple']]
    }[step];
    return `<div class="library-step-copy"><small>PASUL ${step === 'age' ? '1' : step === 'participants' ? '2' : '3'} DIN 3</small><h1>${config[0]}</h1><p>Alege o singură opțiune pentru a continua.</p></div><div class="library-options library-options-${step}">${config[1].map((value,index) => option(value,config[2][index],step,config[3][index])).join('')}</div>`;
  }

  function resultsView() {
    const activities = matches();
    const development = categoryDevelopment[filters.category] || 'dezvoltarea copilului';
    return `<div class="library-step-copy"><small>ACTIVITĂȚI</small><h1>Activități recomandate pentru ${safe(development)}</h1><p>${countLabel(activities.length)} după filtrele alese.</p></div><div class="library-results-grid">${activities.map(activity => { const [icon, tone] = categoryPresentation[activity.category] || ['✦', 'teal']; const artwork = activity.displayImage || activity.image; const age = filters.age || activity.age; const participants = filters.participants || groupKind(activity.participants); const implementation = filters.implementation || activity.difficulty; return `<button class="tone-${tone}" data-activity="${activity.id}"><div class="library-card-art">${artwork ? `<img src="${safe(artwork)}" alt="">` : '<span class="library-result-placeholder">✦</span>'}</div><div class="library-result-copy"><small><b>${icon}</b>${safe(activity.category || 'Activitate')}</small><strong>${safe(activity.title)}</strong><p>${safe(activity.subtitle || '')}</p></div><div class="library-card-choices">${cardChoice('age', age)}${cardChoice('participants', participants)}${cardChoice('implementation', implementation)}</div></button>`; }).join('') || '<div class="library-empty"><strong>Nicio activitate potrivită</strong><p>Întoarce-te și schimbă unul dintre filtre.</p></div>'}</div>`;
  }

  function activityView() {
    const activity = selectedActivity;
    const list = value => String(value || '').split(/\n+/).filter(Boolean).map(item => `<li>${safe(item)}</li>`).join('');
    const artwork = activity.displayImage || activity.image;
    const [, tone] = categoryPresentation[activity.category] || ['✦', 'teal'];
    const variants = activity.easier || activity.harder;
    return `<div class="library-detail-view"><button class="library-back-to-results" data-results-back>← Înapoi la activități</button><article class="library-activity-detail tone-${tone}"><header class="library-detail-hero"><div class="library-detail-copy"><small>${safe(categoryTitles[activity.category] || activity.category || 'Activitate Becky')}</small><h1>${safe(activity.title)}</h1><p>${safe(activity.subtitle || '')}</p></div>${artwork ? `<figure><img src="${safe(artwork)}" alt=""></figure>` : ''}<div class="library-detail-meta">${detailMeta('age', 'Vârstă', activityAgeLabel(activity))}${detailMeta('duration', 'Timp', activity.duration)}${detailMeta('participants', 'Participanți', activityParticipantLabel(activity))}${detailMeta('implementation', 'Materiale', activity.difficulty)}</div></header>${activity.skills ? `<section class="library-detail-skills">${detailPanelIcon('detail-skills.png')}<div><b>CE EXERSĂM</b><p>${safe(activity.skills)}</p></div></section>` : ''}<div class="library-detail-sections">${activity.materials ? `<section class="library-detail-panel is-materials">${detailPanelIcon('detail-materials.png')}<div><small>PREGĂTEȘTE</small><h3>Materiale</h3><ul>${list(activity.materials)}</ul></div></section>` : ''}${activity.steps ? `<section class="library-detail-panel is-steps">${detailPanelIcon('detail-steps.png')}<div><small>PAS CU PAS</small><h3>Cum se joacă</h3><ol>${list(activity.steps)}</ol></div></section>` : ''}${activity.rules ? `<section class="library-detail-panel is-rules">${detailPanelIcon('detail-rules.png')}<div><small>REPER CLAR</small><h3>Reguli</h3><ul>${list(activity.rules)}</ul></div></section>` : ''}${activity.facilitator ? `<section class="library-detail-panel is-facilitator">${detailPanelIcon('detail-facilitator.png')}<div><small>POȚI SPUNE</small><h3>Replica facilitatorului</h3><p>„${safe(activity.facilitator.replace(/^[„"]|[”"]$/g, ''))}”</p></div></section>` : ''}${variants ? `<section class="library-detail-panel is-variants">${detailPanelIcon('detail-adapt.png')}<div><small>REGLEAZĂ PROVOCAREA</small><h3>Adaptează activitatea</h3>${activity.easier ? `<p><b>Mai ușor:</b> ${safe(activity.easier)}</p>` : ''}${activity.harder ? `<p><b>Mai greu:</b> ${safe(activity.harder)}</p>` : ''}</div></section>` : ''}${activity.caution ? `<section class="library-detail-panel is-caution">${detailPanelIcon('detail-caution.png')}<div><small>DE ȚINUT MINTE</small><h3>Atenție</h3><p>${safe(activity.caution)}</p></div></section>` : ''}</div>${activity.reflection ? `<footer class="library-detail-reflection">${detailPanelIcon('detail-reflection.png')}<div><small>LA FINAL</small><strong>${safe(activity.reflection)}</strong></div></footer>` : ''}</article></div>`;
  }

  const observationResultIcon = result => result === 'A mers bine' ? '🟢' : result === 'Nu a mers' ? '🔴' : '🟡';
  function observationsMarkup() { return `<section class="library-observations"><header><div><small>MEMORIE EMPIRICĂ</small><h2>Testări & observații</h2><p>Ce s-a întâmplat în realitate, separat de designul activității.</p></div><button type="button" data-add-observation>＋ Notează o testare</button></header><div class="library-observation-list">${activityObservations.map(item => `<article class="library-observation-card" data-observation-id="${safe(item.id)}"><button class="library-observation-summary" type="button" data-expand-observation><span><strong>${safe(item.tested_at)}</strong><small>${safe((item.age_categories || []).join(' · ') || 'Vârstă nespecificată')} · ${safe(item.participants)} · ${observationResultIcon(item.result)} ${safe(item.result)}</small></span><b>⌄</b></button><div class="library-observation-body"><div><small>AM OBSERVAT</small><p>${safe(item.observed)}</p></div>${item.interpreted ? `<div><small>CRED CĂ ÎNSEAMNĂ</small><p>${safe(item.interpreted)}</p></div>` : ''}${item.hypothesized ? `<div><small>VREAU SĂ VERIFIC</small><p>${safe(item.hypothesized)}</p></div>` : ''}${item.action ? `<div><small>DATA VIITOARE</small><p>${safe(item.action)}</p></div>` : ''}${item.capacity ? `<div><small>CAPACITATE URMĂRITĂ</small><p>${safe(item.capacity)}${item.behavior_observed === true ? ' · Observat' : item.behavior_observed === false ? ' · Nu a fost observat' : ''}</p></div>` : ''}<footer><button type="button" data-edit-observation>Editează</button><button type="button" data-delete-observation>Șterge</button></footer></div></article>`).join('') || '<p class="library-observations-empty">Nu există încă testări înregistrate.</p>'}</div></section>`; }
  function renderObservationBehaviors() { root.querySelectorAll('.library-observation-card').forEach(card => { const item = activityObservations.find(entry => entry.id === card.dataset.observationId); if (!item || !Array.isArray(item.behaviors) || !item.behaviors.length) return; const body = card.querySelector('.library-observation-body'); if (!body || body.querySelector('.library-observation-behaviors')) return; const block = document.createElement('div'); block.className = 'library-observation-behaviors'; block.innerHTML = `<small>CAPACITĂȚI / COMPORTAMENTE URMĂRITE</small>${item.behaviors.map(behavior => `<p class="library-observation-behavior"><span>${safe(behavior.label)}</span><b>${safe(behavior.status || '—')}</b></p>`).join('')}`; body.insertBefore(block, body.querySelector('footer')); }); }
  function mountObservations() { const host = root.querySelector('.library-detail-view'); if (!host || host.querySelector('.library-observations')) return; host.insertAdjacentHTML('beforeend', observationsMarkup()); bindObservationEvents(); renderObservationBehaviors(); }
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
  function body() { if (step === 'category') return categoryView(); if (['age','participants','implementation'].includes(step)) return choiceView(); if (step === 'results') return resultsView(); return activityView(); }

  function render(direction = 'forward') {
    root.innerHTML = `<section class="library-shell"><header><button data-back ${step === 'category' ? 'disabled' : ''}>← Înapoi</button>${breadcrumb()}<button data-reset>Începe din nou</button></header><div class="library-viewport"><div class="library-screen enter-${direction}">${body()}</div></div></section>`;
    bind();
    requestAnimationFrame(() => root.querySelector('.library-screen')?.classList.remove(`enter-${direction}`));
  }

  function move(next, update, direction = 'forward') {
    const screen = root.querySelector('.library-screen');
    screen?.classList.add(`leave-${direction}`);
    setTimeout(() => { update?.(); step = next; render(direction); }, 220);
  }

  function bind() {
    if (step === 'activity') { mountObservations(); loadObservations(); }
    root.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.choice;
      const next = { category: 'age', age: 'participants', participants: 'implementation', implementation: 'results' }[key];
      move(next, () => { filters[key] = button.dataset.value; });
    }));
    root.querySelectorAll('[data-activity]').forEach(button => button.addEventListener('click', () => move('activity', () => { selectedActivity = all().find(activity => activity.id === button.dataset.activity) || null; activityObservations = []; })));
    root.querySelector('[data-results-back]')?.addEventListener('click', () => move('results', null, 'back'));
    root.querySelector('[data-reset]')?.addEventListener('click', () => move('category', () => { filters = { category:'',age:'',participants:'',implementation:'' }; selectedActivity = null; }, 'back'));
    root.querySelector('[data-back]')?.addEventListener('click', () => { const previous = { age:'category',participants:'age',implementation:'participants',results:'implementation',activity:'results' }[step]; if (previous) move(previous, null, 'back'); });
  }

  (async () => {
    const response = await apiFetch('/api/workspaces');
    if (response.status === 401) return location.replace('/admin?view=children');
    const data = await response.json();
    const workspace = data.workspaces?.find(item => item.id === 'children') || {};
    const legacyActivities = Array.isArray(workspace.activityPages) ? workspace.activityPages.flatMap(page => page.activities || []) : [];
    activities = Array.isArray(workspace.activities) && workspace.activities.length ? workspace.activities : legacyActivities;
    await Promise.all(activities.map(async activity => { activity.displayImage = await removeConnectedLightBackground(activity.image); }));
    render();
  })().catch(() => { root.innerHTML = '<div class="library-loading">Biblioteca nu a putut fi încărcată.</div>'; });
})();
