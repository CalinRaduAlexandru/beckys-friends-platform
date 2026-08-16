(() => {
  const stage = document.getElementById('surveyStage');
  const storageKey = 'becky-playground-survey-v1';
  const sessionKey = 'becky-playground-survey-session-v1';
  let testingMode = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const sessionId = sessionStorage.getItem(sessionKey) || crypto.randomUUID();
  sessionStorage.setItem(sessionKey, sessionId);

  const defaults = { step: 0, answers: {}, submitted: false };
  let state = (() => {
    try { return { ...defaults, ...JSON.parse(sessionStorage.getItem(storageKey) || '{}') }; }
    catch { return { ...defaults }; }
  })();

  const choiceSets = {
    childAges: ['0–2 ani', '3–5 ani', '6–8 ani', '9–12 ani', '13+ ani'],
    choiceFirst: ['Am primit o recomandare', 'Copilul și-a dorit să venim', 'Ne-au atras spațiul și activitățile', 'Am văzut Becky online', 'Am venit împreună cu prieteni', 'Programul ni s-a potrivit', 'Locația ne-a fost la îndemână', 'Alt motiv'],
    choiceRepeat: ['Copilul cere să revenim', 'Ne simțim în siguranță aici', 'Atmosfera este plăcută', 'Echipa ne face să ne simțim bineveniți', 'Avem activități potrivite pentru copil', 'Adultul se poate relaxa', 'Mâncarea și băuturile completează ieșirea', 'Venim împreună cu oameni cunoscuți'],
    favorites: ['Spațiul de joacă', 'Activitățile pentru copii', 'Atmosfera', 'Echipa', 'Curățenia și siguranța', 'Mâncarea și băuturile', 'Confortul pentru adulți', 'Faptul că putem veni cu alte familii'],
    missing: ['Mai multe activități ghidate', 'Activități mai bine diferențiate pe vârste', 'Mai multe experiențe creative sau senzoriale', 'Mai mult confort pentru adulți', 'Mai multe opțiuni de mâncare și băutură', 'Mai multă claritate despre activitățile disponibile', 'Mai mult spațiu în momentele aglomerate', 'Nu simțim că lipsește ceva important'],
    returnDrivers: ['Copilul cere să revenim', 'Găsim mereu ceva nou de făcut', 'Spațiul rămâne curat și sigur', 'Echipa ne face să ne simțim bineveniți', 'Adultul se simte confortabil', 'Mâncarea și servirea sunt bune', 'Putem petrece timp cu alte familii', 'Există activități și evenimente potrivite vârstei']
  };
  const ratingRows = [
    ['staff', 'Interacțiunea cu echipa'],
    ['cleanliness', 'Curățenia și senzația de siguranță'],
    ['adultComfort', 'Confortul adultului'],
    ['foodService', 'Mâncarea, băuturile și servirea']
  ];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const save = () => sessionStorage.setItem(storageKey, JSON.stringify(state));
  const isFirst = () => state.answers.visitFrequency === 'Este prima noastră vizită';
  const seeded = (key, values) => {
    let seed = 0;
    for (const char of `${sessionId}-${key}`) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
    return values.map((value, index) => ({ value, rank: Math.sin(seed + index * 997) })).sort((a,b) => a.rank - b.rank).map(item => item.value);
  };
  const trackingSteps = new Set();
  function track(eventType, step = state.step) {
    const signature = `${eventType}-${step}`;
    if (trackingSteps.has(signature) && eventType === 'step') return;
    trackingSteps.add(signature);
    fetch('/api/playground-survey/funnel', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ sessionId, eventType, step, section: sectionFor(step) }), keepalive:true }).catch(() => {});
  }
  function sectionFor(step) { return step <= 3 ? 1 : step <= 6 ? 2 : 3; }
  function updateProgress() {
    const progress = state.step === 0 ? 0 : Math.min(100, Math.round(state.step / 9 * 100));
    const current = sectionFor(Math.max(1, state.step));
    const stageNames = { 1: 'Vizita voastră', 2: 'Experiența Becky', 3: 'Ce urmează' };
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressPercent').textContent = `${progress}%`;
    document.getElementById('progressLabel').textContent = state.step === 0 ? 'Începem împreună · 3 etape' : state.submitted ? 'Chestionar completat' : `Etapa ${current} · ${stageNames[current]} · Întrebarea ${state.step} din 9`;
    document.querySelectorAll('[data-stage]').forEach(item => {
      const value = Number(item.dataset.stage);
      item.classList.toggle('active', value === current && !state.submitted);
      item.classList.toggle('done', value < current || state.submitted);
      item.querySelector('b').textContent = value < current || state.submitted ? '✓' : value;
    });
  }
  function card(kicker, title, lead, body, actions = '') {
    return `<article class="ps-card"><div class="ps-kicker"><img src="/assets/heart_little.png" alt="">${kicker}</div>${title}<p class="ps-lead">${lead}</p>${body}${actions}</article>`;
  }
  function actions(nextLabel = 'Continuă', back = true) {
    return `<div class="ps-error" id="formError" role="alert"></div><div class="ps-actions">${back ? '<button class="ps-button ps-secondary" type="button" data-back>← Înapoi</button>' : ''}<button class="ps-button ps-primary" type="button" data-next>${nextLabel} →</button></div>`;
  }
  function optionsMarkup(key, values, { single = false, ordered = false, random = true, lastValue = '' } = {}) {
    const selected = Array.isArray(state.answers[key]) ? state.answers[key] : state.answers[key] ? [state.answers[key]] : [];
    let orderedValues = random ? seeded(key, values) : values;
    if (lastValue && orderedValues.includes(lastValue)) orderedValues = [...orderedValues.filter(value => value !== lastValue), lastValue];
    return `<div class="ps-options ${single ? 'single' : ''} ${ordered ? 'ordered' : ''}" data-options="${key}" data-single="${single}" data-ordered="${ordered}">${orderedValues.map(value => {
      const index = selected.indexOf(value);
      return `<button class="ps-option ${index >= 0 ? 'selected' : ''}" type="button" data-value="${esc(value)}"><span class="order">${index + 1}</span><span>${esc(value)}</span></button>`;
    }).join('')}</div>`;
  }
  function bindOptions(key, max = Infinity) {
    const wrap = stage.querySelector(`[data-options="${key}"]`);
    if (!wrap) return;
    const single = wrap.dataset.single === 'true';
    const ordered = wrap.dataset.ordered === 'true';
    wrap.querySelectorAll('.ps-option').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.value;
      let values = Array.isArray(state.answers[key]) ? [...state.answers[key]] : state.answers[key] ? [state.answers[key]] : [];
      if (single) values = [value];
      else if (values.includes(value)) values = values.filter(item => item !== value);
      else if (values.length < max) values.push(value);
      else return showError(`Poți alege cel mult ${max} răspunsuri.`);
      state.answers[key] = single ? values[0] : values;
      save();
      wrap.classList.remove('invalid');
      wrap.querySelectorAll('.ps-option').forEach(option => {
        const index = values.indexOf(option.dataset.value);
        option.classList.toggle('selected', index >= 0);
        const badge = option.querySelector('.order');
        if (badge) badge.textContent = index + 1;
      });
      if (!ordered) stage.querySelector('#formError')?.classList.remove('visible');
      if (key === 'choiceReasons') {
        stage.querySelector('[data-custom-choice="choiceReasons"]')?.classList.toggle('visible', values.includes('Alt motiv'));
      }
    }));
  }
  function showError(message) {
    const error = stage.querySelector('#formError');
    if (!error) return;
    error.textContent = message;
    error.classList.add('visible');
    stage.querySelector('.ps-options')?.classList.add('invalid');
    error.scrollIntoView({ block:'nearest', behavior:'smooth' });
  }
  function renderCover() {
    stage.innerHTML = `<article class="ps-card"><div class="ps-cover"><div><div class="ps-kicker"><img src="/assets/heart_little.png" alt="">CHESTIONAR PENTRU FAMILII</div><h1>Ajută-ne să facem<br><em>experiența Becky și mai bună.</em></h1><p class="ps-lead">Ne interesează ce ai trăit aici: ce îți place, ce lipsește și ce face o familie să revină. Nu căutăm răspunsuri perfecte.</p><div class="ps-prize"><span>🎁</span><div><strong>Poți câștiga o zi de joacă cu consumație inclusă.</strong><small>Înscrierea la extragere este opțională și separată de răspunsurile anonime.</small></div></div><div class="ps-info"><b>i</b><span>9 întrebări · aproximativ 3–4 minute · răspunsuri anonime</span></div><div class="ps-actions"><button class="ps-button ps-primary" type="button" data-next>Începem →</button></div></div><div class="ps-cover-art ps-happy-duck-stage"><video class="ps-duck-source" id="playgroundHappyDuckVideo" src="/assets/duck-happy.mp4" muted playsinline preload="auto" loop></video><canvas class="ps-happy-duck-canvas" id="playgroundHappyDuckCanvas" role="img" aria-label="Rățușca Becky dansează"></canvas></div></div></article>`;
    playHappyDuck();
  }
  function renderQuestion() {
    const step = state.step;
    if (step === 1) stage.innerHTML = card('1 · VIZITA VOASTRĂ', '<h2>Cât de bine<br><em>cunoașteți Becky?</em></h2>', 'Răspunsul schimbă perspectiva întrebărilor următoare: experiența de astăzi la prima vizită sau experiența generală dacă ați revenit.', optionsMarkup('visitFrequency', ['Este prima noastră vizită', 'Am mai fost de 2–3 ori', 'Revenim din când în când', 'Venim frecvent'], { single:true, random:false }), actions());
    if (step === 2) stage.innerHTML = card('2 · COPIII', '<h2>Ce vârste au copiii<br><em>care sunt cu voi?</em></h2>', 'Bifează toate intervalele potrivite. Ne ajută să vedem dacă nevoile diferă între etapele de dezvoltare.', optionsMarkup('childAges', choiceSets.childAges, { random:false }), actions());
    if (step === 3) {
      const key = isFirst() ? 'choiceFirst' : 'choiceRepeat';
      if (Array.isArray(state.answers.choiceReasons)) {
        const validReasons = state.answers.choiceReasons.filter(value => choiceSets[key].includes(value));
        if (validReasons.length !== state.answers.choiceReasons.length) {
          state.answers.choiceReasons = validReasons;
          save();
        }
      }
      const customChoice = key === 'choiceFirst' ? `<div class="ps-custom-choice ${state.answers.choiceReasons?.includes('Alt motiv') ? 'visible' : ''}" data-custom-choice="choiceReasons"><label class="ps-field">Care a fost motivul?<input name="choiceOtherReason" maxlength="160" value="${esc(state.answers.choiceOtherReason || '')}" placeholder="Scrie motivul tău..."></label></div>` : '';
      stage.innerHTML = card('3 · ALEGEREA', `<h2>${isFirst() ? 'Ce v-a făcut să alegeți Becky' : 'Ce vă face să alegeți Becky'}<br><em>${isFirst() ? 'astăzi?' : 'când ieșiți la joacă?'}</em></h2>`, 'Alege cel mult trei motive care au contat cel mai mult.', `<div class="ps-info"><b>i</b><span>Nu trebuie bifate toate. Căutăm motivele care chiar au influențat alegerea.</span></div>${optionsMarkup('choiceReasons', choiceSets[key], { lastValue: key === 'choiceFirst' ? 'Alt motiv' : '' })}${customChoice}`, actions());
    }
    if (step === 4) stage.innerHTML = card('4 · CE FUNCȚIONEAZĂ', `<h2>Ce vă place cel mai mult<br><em>${isFirst() ? 'din experiența de astăzi?' : 'la Becky?'}</em></h2>`, 'Poți alege toate răspunsurile care se potrivesc.', optionsMarkup('favorites', choiceSets.favorites), actions());
    if (step === 5) stage.innerHTML = card('5 · EXPERIENȚA', `<h2>Cum evaluați<br><em>${isFirst() ? 'vizita de astăzi?' : 'experiența generală?'}</em></h2>`, 'Alege câte un răspuns pentru fiecare aspect.', `<div class="ps-rating-list">${ratingRows.map(([key,label]) => `<div class="ps-rating-row" data-rating="${key}"><strong>${label}</strong>${[['😕','Slab',1],['😐','Acceptabil',2],['🙂','Bine',3],['😍','Excelent',4]].map(([icon,labelText,score]) => `<button type="button" title="${labelText}" aria-label="${labelText}" data-score="${score}">${icon}</button>`).join('')}</div>`).join('')}</div>`, actions());
    if (step === 6) stage.innerHTML = card('6 · CE LIPSEȘTE', '<h2>Ce ar îmbunătăți<br><em>cel mai mult experiența?</em></h2>', 'Alege lucrurile care ar conta cu adevărat pentru familia voastră.', optionsMarkup('missing', choiceSets.missing), actions());
    if (step === 7) stage.innerHTML = card('7 · REVENIREA', '<h2>Ce v-ar face<br><em>să reveniți?</em></h2>', 'Alege până la trei motive, în ordinea importanței. Primul răspuns ales va conta cel mai mult.', `<div class="ps-info"><b>i</b><span>Alege doar motivele relevante; nu trebuie să completezi toate cele trei poziții.</span></div>${optionsMarkup('returnDrivers', choiceSets.returnDrivers, { ordered:true })}`, actions());
    if (step === 8) stage.innerHTML = card('8 · ALTE LOCURI · OPȚIONAL', '<h2>Există un loc de joacă<br><em>pe care îl preferați în Constanța?</em></h2>', 'Ne ajută să înțelegem ce experiențe apreciază familiile, nu să copiem un alt loc.', `<span class="ps-optional">OPȚIONAL · CÂMPURILE POT RĂMÂNE GOALE</span><div class="ps-fields"><label class="ps-field">Numele locului<input name="favoritePlace" maxlength="100" value="${esc(state.answers.favoritePlace || '')}" placeholder="Locul de joacă preferat"></label><label class="ps-field">Ce vă place cel mai mult acolo?<textarea name="favoritePlaceReason" maxlength="600" placeholder="Un lucru concret care face experiența reușită...">${esc(state.answers.favoritePlaceReason || '')}</textarea></label></div>`, actions());
    if (step === 9) stage.innerHTML = card('9 · IDEEA TA · OPȚIONAL', '<h2>Dacă ai putea schimba un singur lucru,<br><em>ce ai îmbunătăți la Becky?</em></h2>', 'Poate fi despre spațiu, activități, echipă, servire sau un detaliu pe care noi nu îl vedem.', `<span class="ps-optional">OPȚIONAL · POȚI TRIMITE FĂRĂ SĂ COMPLETEZI</span><div class="ps-fields"><label class="ps-field">Sugestia ta<textarea name="improvement" maxlength="1000" placeholder="Mi-ar plăcea ca...">${esc(state.answers.improvement || '')}</textarea></label></div>`, actions('Trimite răspunsurile'));
  }
  function bindRatings() {
    stage.querySelectorAll('[data-rating]').forEach(row => {
      const key = row.dataset.rating;
      row.querySelectorAll('button').forEach(button => {
        button.classList.toggle('selected', Number(button.dataset.score) === Number(state.answers.ratings?.[key]));
        button.addEventListener('click', () => {
          state.answers.ratings = { ...(state.answers.ratings || {}), [key]:Number(button.dataset.score) };
          save();
          row.querySelectorAll('button').forEach(item => item.classList.toggle('selected', item === button));
        });
      });
    });
  }
  function syncFields() {
    stage.querySelectorAll('input[name],textarea[name]').forEach(field => field.addEventListener('input', () => { state.answers[field.name] = field.value; save(); }));
  }
  function validStep() {
    const required = { 1:'visitFrequency', 2:'childAges', 3:'choiceReasons', 4:'favorites', 6:'missing', 7:'returnDrivers' };
    if (required[state.step]) {
      const value = state.answers[required[state.step]];
      if (!value || Array.isArray(value) && !value.length) { showError('Alege cel puțin un răspuns pentru a putea continua.'); return false; }
    }
    if (state.step === 3 && state.answers.choiceReasons?.includes('Alt motiv') && !state.answers.choiceOtherReason?.trim()) {
      showError('Completează motivul ales sau debifează „Alt motiv”.');
      stage.querySelector('[name="choiceOtherReason"]')?.focus();
      return false;
    }
    if (state.step === 5 && ratingRows.some(([key]) => !Number.isInteger(state.answers.ratings?.[key]))) { showError('Alege câte un răspuns pentru fiecare rând.'); return false; }
    return true;
  }
  async function submitSurvey(button) {
    button.disabled = true; button.textContent = 'Se trimit răspunsurile…';
    try {
      const response = await fetch('/api/playground-survey', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ answers:state.answers }) });
      if (!response.ok) throw new Error('Răspunsurile nu au putut fi trimise.');
      state.submitted = true; state.step = 10; save(); track('complete', 10); render();
    } catch (error) { button.disabled = false; button.textContent = 'Trimite răspunsurile →'; showError(error.message); }
  }
  function renderSuccess() {
    stage.innerHTML = `<article class="ps-card ps-success"><div class="ps-success-duck-stage"><video class="ps-duck-source" id="playgroundSuccessDuckVideo" src="/assets/animated_characters/duck_throwing_conffetti.mp4" muted playsinline preload="auto"></video><canvas class="ps-success-duck-canvas" id="playgroundSuccessDuckCanvas" aria-hidden="true"></canvas></div><div class="ps-kicker" style="justify-content:center"><img src="/assets/heart_little.png" alt="">RĂSPUNSURI TRIMISE</div><h2>Mulțumim că ne-ai ajutat<br><em>să vedem Becky prin ochii familiei tale.</em></h2><p class="ps-lead">Răspunsurile au fost salvate anonim.</p>${testingMode ? '<button class="ps-button ps-secondary" type="button" data-restart>Completează din nou</button>' : ''}<section class="ps-raffle"><h3>🎁 Participă la extragere</h3><p>Poți câștiga o zi de joacă cu consumație inclusă. Datele de contact sunt salvate separat și nu sunt asociate răspunsurilor tale.</p><form id="raffleForm" class="ps-raffle-grid"><label>Prenume<input type="text" name="firstName" required maxlength="60" autocomplete="given-name"></label><label>Telefon<input type="tel" name="phone" required maxlength="24" autocomplete="tel"></label><label class="ps-consent"><input type="checkbox" name="consent" required><span>Sunt de acord să fiu contactat exclusiv în legătură cu această extragere.</span></label><button class="ps-button ps-primary" type="submit">Înscrie-mă la extragere</button><div class="ps-raffle-status" aria-live="polite"></div></form></section></article>`;
    stage.querySelector('[data-restart]')?.addEventListener('click', () => {
      state = { ...defaults, answers: {}, submitted: false };
      sessionStorage.removeItem(storageKey);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    stage.querySelector('#raffleForm').addEventListener('submit', submitRaffle);
    playSuccessAnimation();
  }

  function removeEdgeBlack(image) {
    const { data, width, height } = image;
    const count = width * height;
    const seen = new Uint8Array(count);
    const queue = new Int32Array(count);
    let head = 0;
    let tail = 0;
    const isBackground = index => {
      const offset = index * 4;
      const red = data[offset], green = data[offset + 1], blue = data[offset + 2];
      const bright = Math.max(red, green, blue), dark = Math.min(red, green, blue);
      return bright < 184 && bright - dark < 82;
    };
    const add = index => {
      if (seen[index] || !isBackground(index)) return;
      seen[index] = 1;
      queue[tail++] = index;
    };
    for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      if (x) add(index - 1);
      if (x + 1 < width) add(index + 1);
      if (y) add(index - width);
      if (y + 1 < height) add(index + width);
    }
    const componentSeen = new Uint8Array(count);
    const componentQueue = new Int32Array(count);
    const componentPixels = new Int32Array(count);
    for (let start = 0; start < count; start++) {
      if (componentSeen[start] || !isBackground(start)) continue;
      let componentHead = 0, componentTail = 0, pixelCount = 0, maxY = 0;
      componentSeen[start] = 1;
      componentQueue[componentTail++] = start;
      while (componentHead < componentTail) {
        const index = componentQueue[componentHead++], x = index % width, y = Math.floor(index / width);
        componentPixels[pixelCount++] = index;
        maxY = Math.max(maxY, y);
        const neighbors = [x ? index - 1 : -1, x + 1 < width ? index + 1 : -1, y ? index - width : -1, y + 1 < height ? index + width : -1];
        neighbors.forEach(next => {
          if (next >= 0 && !componentSeen[next] && isBackground(next)) {
            componentSeen[next] = 1;
            componentQueue[componentTail++] = next;
          }
        });
      }
      if (pixelCount >= 120 && maxY >= height * .52) {
        for (let pixel = 0; pixel < pixelCount; pixel++) data[componentPixels[pixel] * 4 + 3] = 0;
      }
    }
    for (let index = 0; index < count; index++) if (seen[index]) data[index * 4 + 3] = 0;
    return image;
  }

  function playHappyDuck() {
    const video = stage.querySelector('#playgroundHappyDuckVideo');
    const canvas = stage.querySelector('#playgroundHappyDuckCanvas');
    const holder = stage.querySelector('.ps-happy-duck-stage');
    if (!video || !canvas || !holder) return;
    const context = canvas.getContext('2d', { willReadFrequently:true });
    let framePending = false;
    const renderFrame = () => {
      framePending = false;
      if (!canvas.isConnected || !video.isConnected || video.paused || video.ended) return;
      if (video.readyState < 2 || !video.videoWidth) return scheduleFrame();
      if (!canvas.dataset.sized) {
        canvas.width = 360;
        canvas.height = Math.round(360 * video.videoHeight / video.videoWidth);
        canvas.dataset.sized = 'true';
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = frame.data;
      const background = new Uint8Array(canvas.width * canvas.height);
      const queue = new Int32Array(canvas.width * canvas.height);
      let queueStart = 0, queueEnd = 0;
      const isDark = index => Math.max(pixels[index * 4], pixels[index * 4 + 1], pixels[index * 4 + 2]) < 36;
      const add = index => {
        if (background[index] || !isDark(index)) return;
        background[index] = 1;
        queue[queueEnd++] = index;
      };
      for (let x = 0; x < canvas.width; x++) { add(x); add((canvas.height - 1) * canvas.width + x); }
      for (let y = 1; y < canvas.height - 1; y++) { add(y * canvas.width); add(y * canvas.width + canvas.width - 1); }
      while (queueStart < queueEnd) {
        const index = queue[queueStart++], x = index % canvas.width, y = Math.floor(index / canvas.width);
        if (x) add(index - 1);
        if (x + 1 < canvas.width) add(index + 1);
        if (y) add(index - canvas.width);
        if (y + 1 < canvas.height) add(index + canvas.width);
      }
      const watermarkLeft = Math.floor(canvas.width * .6);
      const watermarkBottom = Math.ceil(canvas.height * .15);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = y * canvas.width + x, offset = index * 4;
          if (background[index] || (x >= watermarkLeft && y <= watermarkBottom)) pixels[offset + 3] = 0;
        }
      }
      context.putImageData(frame, 0, 0);
      holder.classList.add('is-animating');
      scheduleFrame();
    };
    const scheduleFrame = () => {
      if (framePending || !canvas.isConnected || video.paused || video.ended) return;
      framePending = true;
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(renderFrame);
      else requestAnimationFrame(renderFrame);
    };
    video.addEventListener('play', scheduleFrame);
    const start = () => { video.currentTime = 0; video.play().then(scheduleFrame).catch(() => {}); };
    if (video.readyState >= 2) start();
    else video.addEventListener('loadeddata', start, { once:true });
  }

  function playSuccessAnimation() {
    const video = stage.querySelector('#playgroundSuccessDuckVideo');
    const canvas = stage.querySelector('#playgroundSuccessDuckCanvas');
    const holder = stage.querySelector('.ps-success-duck-stage');
    if (!video || !canvas || !holder) return launchConfetti();
    const context = canvas.getContext('2d', { willReadFrequently:true });
    const processingCanvas = document.createElement('canvas');
    const processingContext = processingCanvas.getContext('2d', { willReadFrequently:true });
    const confettiAt = .7;
    let confettiStarted = false, animationFinished = false;
    const startConfetti = () => {
      if (confettiStarted) return;
      confettiStarted = true;
      launchConfetti();
    };
    const scheduleFrame = () => {
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw);
      else requestAnimationFrame(draw);
    };
    const draw = () => {
      if (animationFinished || !canvas.isConnected || !video.videoWidth || !video.videoHeight) return;
      if (!canvas.dataset.sized) {
        canvas.width = 240;
        canvas.height = Math.round(240 * video.videoHeight / video.videoWidth);
        processingCanvas.width = canvas.width;
        processingCanvas.height = canvas.height;
        canvas.dataset.sized = 'true';
      }
      processingContext.clearRect(0, 0, processingCanvas.width, processingCanvas.height);
      processingContext.drawImage(video, 0, 0, processingCanvas.width, processingCanvas.height);
      context.putImageData(removeEdgeBlack(processingContext.getImageData(0, 0, processingCanvas.width, processingCanvas.height)), 0, 0);
      holder.classList.add('is-animating');
      if (video.currentTime >= confettiAt) startConfetti();
      if (!video.paused && !video.ended) scheduleFrame();
    };
    const start = () => {
      draw();
      video.play().then(scheduleFrame).catch(startConfetti);
    };
    if (video.readyState >= 2) start();
    else video.addEventListener('loadeddata', start, { once:true });
    video.addEventListener('timeupdate', () => { if (video.currentTime >= confettiAt) startConfetti(); });
    video.addEventListener('ended', () => {
      draw();
      animationFinished = true;
      startConfetti();
      video.pause();
      holder.classList.add('is-animating');
    }, { once:true });
  }

  function launchConfetti() {
    const colors = ['#FB7176', '#FDCB4B', '#33A9BA', '#CBBAD8', '#6CAE78'];
    for (let index = 0; index < 90; index++) {
      const piece = document.createElement('i');
      piece.className = 'ps-confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty('--duration', `${2.6 + Math.random() * 2.2}s`);
      piece.style.setProperty('--drift', `${-120 + Math.random() * 240}px`);
      piece.style.animationDelay = `${Math.random() * .7}s`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 5600);
    }
  }
  async function submitRaffle(event) {
    event.preventDefault();
    const form = event.currentTarget, button = form.querySelector('button'), status = form.querySelector('.ps-raffle-status');
    button.disabled = true; button.textContent = 'Se salvează…'; status.textContent = '';
    try {
      const response = await fetch('/api/playground-survey/raffle', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ firstName:form.firstName.value.trim(), phone:form.phone.value.trim(), consent:form.consent.checked }) });
      if (!response.ok) throw new Error('Înscrierea nu a putut fi salvată.');
      form.innerHTML = '<div class="ps-raffle-status"><strong>Te-ai înscris. Mult succes! ✨</strong></div>';
    } catch (error) { button.disabled = false; button.textContent = 'Înscrie-mă la extragere'; status.textContent = error.message; }
  }
  function render() {
    updateProgress();
    if (state.submitted || state.step === 10) renderSuccess();
    else if (state.step === 0) renderCover();
    else renderQuestion();
    if (state.step > 0 && state.step < 10) track('step');
    bindOptions('visitFrequency'); bindOptions('childAges'); bindOptions('choiceReasons', 3); bindOptions('favorites'); bindOptions('missing'); bindOptions('returnDrivers', 3);
    bindRatings(); syncFields();
    stage.querySelector('[data-next]')?.addEventListener('click', event => {
      if (!validStep()) return;
      if (state.step === 9) return submitSurvey(event.currentTarget);
      state.step += 1; save(); render(); window.scrollTo({ top:0, behavior:'smooth' });
    });
    stage.querySelector('[data-back]')?.addEventListener('click', () => { state.step = Math.max(0, state.step - 1); save(); render(); window.scrollTo({ top:0, behavior:'smooth' }); });
  }
  async function initialize() {
    try {
      const response = await fetch('/api/runtime', { cache: 'no-store' });
      if (response.ok) testingMode = (await response.json()).testingMode === true;
    } catch {}
    track('open', 0);
    render();
  }
  initialize();
})();
