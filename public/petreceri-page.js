(() => {
  const page = document.querySelector('.party-hero');
  if (!page) return;
  document.querySelectorAll('.party-extra-link[href="/invitatii-petrecere"]').forEach(link => link.remove());

  const partyReturnKey = 'becky-party-return-scroll';
  const getNavigationType = () => performance.getEntriesByType?.('navigation')?.[0]?.type || '';
  const restorePartyScroll = event => {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(partyReturnKey) || 'null'); } catch {}
    if (!pending) return;
    const isHistoryReturn = event?.persisted || getNavigationType() === 'back_forward';
    if (!isHistoryReturn) {
      try { sessionStorage.removeItem(partyReturnKey); } catch {}
      return;
    }
    const restore = () => {
      const target = pending.targetId ? document.getElementById(pending.targetId) : null;
      if (target && Number.isFinite(Number(pending.targetViewportTop))) {
        const currentTop = target.getBoundingClientRect().top;
        const targetScroll = window.scrollY + currentTop - Number(pending.targetViewportTop);
        window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'auto' });
      } else {
        window.scrollTo({ top: Number(pending.top) || 0, behavior: 'auto' });
      }
      try { sessionStorage.removeItem(partyReturnKey); } catch {}
    };
    requestAnimationFrame(() => requestAnimationFrame(restore));
  };
  restorePartyScroll();
  window.addEventListener('pageshow', event => restorePartyScroll(event), { once: true });
  document.addEventListener('click', event => {
    const rulesLink = event.target.closest('.party-rules-link');
    if (!rulesLink) return;
    try {
      const rect = rulesLink.getBoundingClientRect();
      sessionStorage.setItem(partyReturnKey, JSON.stringify({
        top: window.scrollY,
        targetId: rulesLink.id || '',
        targetViewportTop: rect.top,
        at: Date.now()
      }));
    } catch {}
  });

  const status = document.querySelector('[data-reservation-status]');

  const gallery = document.querySelector('[data-party-gallery]');
  const galleryMain = gallery?.querySelector('[data-party-gallery-main]');
  const galleryTitle = gallery?.querySelector('[data-party-gallery-title]');
  const galleryDetail = gallery?.querySelector('[data-party-gallery-detail]');
  const galleryButtons = [...(gallery?.querySelectorAll('[data-party-gallery-src]') || [])];
  const galleryVisual = gallery?.querySelector('.party-visual');
  const galleryDots = gallery && galleryButtons.length ? document.createElement('div') : null;
  if (galleryDots && galleryVisual) {
    galleryDots.className = 'party-gallery-dots';
    galleryDots.setAttribute('aria-hidden', 'true');
    galleryDots.innerHTML = galleryButtons.map((_, index) => `<span class="${index === 0 ? 'is-active' : ''}"></span>`).join('');
    galleryVisual.insertAdjacentElement('afterend', galleryDots);
  }

  const selectGalleryImage = (button, shouldScrollThumb = true) => {
    if (!galleryMain) return;
    galleryMain.src = button.dataset.partyGallerySrc;
    galleryMain.alt = button.dataset.partyGalleryAlt;
    if (galleryTitle) galleryTitle.textContent = button.dataset.partyGalleryTitle;
    if (galleryDetail) galleryDetail.textContent = button.dataset.partyGalleryDetail;
    galleryButtons.forEach(item => {
      const isActive = item === button;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
    galleryDots?.querySelectorAll('span').forEach((dot, index) => dot.classList.toggle('is-active', galleryButtons[index] === button));
    if (shouldScrollThumb) {
      button.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  };
  galleryButtons.forEach(button => button.addEventListener('click', () => selectGalleryImage(button)));
  if (galleryVisual && galleryButtons.length > 1) {
    let pointerStartX = null;
    let pointerStartY = null;
    galleryVisual.addEventListener('pointerdown', event => {
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      galleryVisual.setPointerCapture?.(event.pointerId);
    });
    galleryVisual.addEventListener('pointerup', event => {
      if (pointerStartX === null) return;
      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;
      pointerStartX = null;
      pointerStartY = null;
      if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      const activeIndex = galleryButtons.findIndex(button => button.classList.contains('is-active'));
      const nextIndex = Math.max(0, Math.min(galleryButtons.length - 1, activeIndex + (deltaX < 0 ? 1 : -1)));
      if (nextIndex !== activeIndex) selectGalleryImage(galleryButtons[nextIndex]);
    });
    galleryVisual.addEventListener('pointercancel', () => { pointerStartX = null; pointerStartY = null; });
  }

  // Only these descriptions are provisional. Preview them with ?demo=1.
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  document.querySelectorAll('[data-food-demo]').forEach(node => { node.hidden = !demo; });
  document.querySelectorAll('[data-food-confirmed]').forEach(node => { node.hidden = demo; });
  document.querySelectorAll('.party-art img').forEach(image => {
    const show = () => { if (image.naturalWidth) image.parentElement.classList.add('has-art'); };
    image.addEventListener('load', show);
    show();
  });

  const childInput = document.getElementById('party-children');
  const reservationDate = document.querySelector('[data-reservation-date]');
  const mobileDetails = document.querySelector('[data-mobile-details]');
  const mobileDetailsToggle = document.querySelector('[data-mobile-details-toggle]');
  const mobileBreakdown = document.querySelector('[data-mobile-breakdown]');
  const money = value => new Intl.NumberFormat('ro-RO').format(value);
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const adultPlatters = [
    { id: 'platou-1', category: 'rece', name: 'Platoul rece 1', price: 250, weight: 'aprox. 1,9 kg', items: ['Rulou de șuncă presată cu salată de crudități – 6 × 50 g', 'Bruschete – 5 × 60 g', 'Coșulețe cu cremă de brânză cu spanac – 6 × 35 g', 'Chec aperitiv de pui – 6 × 35 g', 'Frigărui capresse – 8 × 50 g', 'Ouă umplute – 6 × 40 g', 'Ruladă de pui – 8 × 35 g'] },
    { id: 'platou-2', category: 'rece', name: 'Platoul rece 2', price: 250, weight: 'aprox. 1,5 kg', items: ['Bărcuțe de ardei cu cremă de brânză – 5 × 50 g', 'Doboș – 8 × 35 g', 'Coșulețe cu icre de crap – 6 × 35 g', 'Tartine cu somon – 5 × 50 g', 'Bărcuță de castravete cu salată de surimi – 5 × 50 g', 'Rulou de șuncă cu salată à la russe – 6 × 35 g'] },
    { id: 'platou-3', category: 'rece', name: 'Platoul rece 3', price: 250, weight: 'aprox. 1,6 kg', items: ['Rulou de șuncă presată cu salată de crudități – 6 × 50 g', 'Doboș – 6 × 35 g', 'Bărcuță de ardei cu cremă de brânză – 3 × 50 g', 'Coșulețe cu vinete – 5 × 35 g', 'Frigărui de legume – 3 × 50 g', 'Frigărui de roșii cherry cu telemea – 6 × 50 g', 'Flori din salam crud-uscat – 5 × 30 g', 'Flori din cașcaval – 5 × 30 g'] },
    { id: 'platou-4', category: 'cald', name: 'Platoul cald 4', price: 250, weight: 'aprox. 2,1 kg', items: ['Piept de pui la grătar – 5 × 70 g', 'Bulete de cașcaval – 12 × 15 g', 'Chifteluțe de pui cu susan – 10 × 30 g', 'Cartofi prăjiți / wedges – 400 g', 'Ciuperci cu bacon gratinate – 6 × 35 g', 'Degețele de pui în pesmet cu susan – 12 × 25 g', 'Pulpe inferioare de pui (ciocănele) – 5 × 80 g'] },
    { id: 'platou-5', category: 'cald', name: 'Platoul cald 5', price: 240, weight: 'aprox. 1,9 kg', items: ['Frigărui de pui – 6 × 60 g', 'Chifteluțe de pui cu susan – 7 × 25 g', 'Degețele de pui crocante – 9 × 25 g', 'Cartofi prăjiți / wedges – 400 g', 'Degețele de porc cu susan – 9 × 25 g', 'Chifteluțe de porc – 7 × 25 g', 'Frigărui de porc – 6 × 60 g'] },
    { id: 'platou-6', category: 'cald', name: 'Platoul cald 6', price: 250, weight: 'aprox. 2,1 kg', items: ['Frigărui de pui – 5 × 80 g', 'Mici vită-porc – 7 × 50 g', 'Cartofi prăjiți / wedges – 500 g', 'Bulete de cașcaval – 15 × 15 g', 'Ceafă de porc la grătar – 5 × 70 g', 'Chifteluțe de pui cu susan – 10 × 30 g'] },
    { id: 'platou-7', category: 'cald', name: 'Platoul cald 7', price: 310, weight: 'aprox. 2,3 kg', items: ['Pui rotisat la cuptor – 1 × 1000 g', 'Cotlet de porc la grătar – 4 × 70 g', 'Cârnați de porc la cuptor – 400 g', 'Clătite de pui gratinate – 5 × 60 g', 'Cartofi prăjiți / wedges – 400 g'] },
    { id: 'platou-8', category: 'vegetarian', name: 'Platoul vegetarian 8', price: 250, weight: 'aprox. 1,8 kg', items: ['Legume la grătar (dovlecel, ardei gras, vânătă) – 400 g', 'Bărcuțe de ardei cu fasole făcăluită – 5 × 60 g', 'Roșii cherry cu vinete – 8 × 35 g', 'Chifteluțe de legume – 7 × 50 g', 'Conopidă pane – 7 × 35 g', 'Ruladă cu varză călită – 5 × 60 g'] },
    { id: 'platou-9', category: 'vegetarian', name: 'Platoul vegetarian 9', price: 250, weight: 'aprox. 1,8 kg', items: ['Ruladă cu legume – 5 × 60 g', 'Ciuperci la grătar – 8 × 25 g', 'Crochete de dovlecei – 12 × 20 g', 'Frigăruie cu legume proaspete – 5 × 60 g', 'Chifteluțe de legume – 7 × 50 g', 'Conopidă pane – 7 × 35 g', 'Roșii cherry cu vinete – 6 × 35 g'] },
    { id: 'platou-10', category: 'vegetarian', name: 'Platoul vegetarian 10', price: 260, weight: 'aprox. 1,6 kg', items: ['Ruladă cu legume – 5 × 60 g', 'Bruschete – 5 × 60 g', 'Inele de ceapă – 15 × 10 g', 'Chifteluțe de legume – 7 × 50 g', 'Conopidă pane – 7 × 35 g', 'Roșii cherry cu vinete – 8 × 35 g'] },
    { id: 'platou-11', category: 'fructe-de-mare', name: 'Platoul de fructe de mare 11', price: 260, weight: 'aprox. 1,2 kg', items: ['Tartine cu somon fume – 5 × 50 g', 'Muslitos – 5 × 30 g', 'Gujoane de șalău cu susan – 10 × 25 g', 'Inele de calamar pane – 10 × 15 g', 'Creveți în cartofi – 5 × 30 g', 'Tartine cu anșoa – 5 × 50 g'] },
    { id: 'platou-12', category: 'fructe-de-mare', name: 'Platoul de fructe de mare 12', price: 300, weight: 'aprox. 1,6 kg', items: ['Frigărui de creveți – 7 × 40 g', 'Tartine de icre colorate – 5 × 50 g', 'Coșulețe cu icre de crap – 5 × 35 g', 'Surimi pane cu susan – 10 × 25 g', 'Tartine cu somon fume – 5 × 50 g', 'Gujoane de șalău crocante – 10 × 25 g', 'Creveți în cartof – 5 × 30 g'] },
    { id: 'platou-13', category: 'fructe-de-mare', name: 'Platoul de fructe de mare 13', price: 275, weight: 'aprox. 1,5 kg', items: ['Midii pane – 200 g', 'Coșulețe cu icre de crap – 5 × 35 g', 'Creveți în cartof – 10 × 30 g', 'Inele de ceapă cu susan – 15 × 10 g', 'Surimi pane crocanți – 10 × 25 g', 'Bărcuțe de castravete cu salată de surimi – 5 × 50 g', 'Tartine cu anșoa – 5 × 50 g'] }
  ];
  const childrenSimple = [
    'Șnițel de pui: bechamel (parizian) sau pesmet (vienez) – 120 g + garnitură la alegere – 120 g',
    'Degețele de pui: bechamel, pesmet, pesmet cu susan sau crocante cu fulgi de porumb – 120 g + garnitură la alegere – 120 g',
    'Piept de pui la grătar – 100 g + garnitură la alegere – 120 g',
    'Chifteluțe de pui simple sau cu susan – 120 g + garnitură la alegere – 120 g',
    'Pulpă inferioară (ciocănel) de pui – 1 bucată + garnitură la alegere – 120 g',
    'Aripioare de pui la cuptor – 2 bucăți + garnitură la alegere – 120 g',
    'Frigăruie de pui – 120 g + garnitură la alegere – 120 g',
    'Ficăței de pui la tigaie – 120 g + garnitură la alegere – 120 g'
  ];
  const childrenMix = [
    ['Meniu 1', 'Pulpă inferioară de pui (ciocănel) – 1 buc.; chifteluțe din piept de pui – 2 × 25 g; bulete de cașcaval – 4 × 15 g; cartofi prăjiți sau wedges – 70 g; telemea rasă – 30 g; roșie – 1/2 buc.'],
    ['Meniu 2', 'Frigăruie de pui – 1 × 70 g; degețele de pui crocante – 2 × 25 g; crochete de cartofi – 2 × 20 g; cartofi prăjiți sau wedges – 70 g; telemea rasă – 30 g; bărcuță de ardei gras cu cremă de brânză – 1 × 50 g.'],
    ['Meniu 3', 'Piept de pui la grătar julienne – 1 × 70 g; degețele de pui cu susan – 2 × 25 g; cașcaval – 30 g; cartofi prăjiți sau wedges – 70 g; telemea rasă – 30 g; castravete în oțet / proaspăt – 40 g.'],
    ['Meniu 4', 'Trio de degețele de pui (bechamel, pesmet cu susan, crocant) – câte 2 din fiecare – 150 g; mozzarella fingers – 4 × 20 g; salată de varză albă / roșie – 50 g.']
  ];
  const extras = [
    { id: 'animator', label: 'Animator', price: 250 },
    { id: 'magician', label: 'Magician', price: 350 },
    { id: 'tematica', label: 'Tematică personalizată', price: 150 },
    { id: 'pinata', label: 'Piñata', price: 250 }
  ];
  extras.forEach(extra => {
    const card = document.getElementById(extra.id);
    const label = document.createElement('label');
    label.className = 'party-extra-select';
    label.innerHTML = `<input type="checkbox" data-extra="${extra.id}"><span>Adaugă la petrecere</span><b>+${extra.price} lei</b>`;
    card.append(label);
  });
  const food = document.getElementById('masa-adultilor');
  const foodLead = food.querySelector('.party-topic-lead');
  if (foodLead) foodLead.outerHTML = '<div class="party-food-summary"><ul class="party-food-bullets"><li>Platouri pentru adulți · aproximativ <strong>5 persoane / platou</strong></li><li><strong>240–310 lei / platou</strong> · cafeaua și băuturile se comandă la noi</li></ul><button class="party-food-open" type="button" data-party-platter-open>Vezi platourile și alege →</button></div>';
  food.querySelectorAll('details').forEach(detail => detail.remove());
  const platterCategories = [
    ['rece', '<span class="party-menu-emoji" aria-hidden="true">🥗</span><span>Platou rece</span>'],
    ['cald', '<span class="party-menu-emoji" aria-hidden="true">🍗</span><span>Platou cald</span>'],
    ['vegetarian', '<span class="party-menu-emoji" aria-hidden="true">🥦</span><span>Vegetarian / de post</span>'],
    ['fructe-de-mare', '<span class="party-menu-emoji" aria-hidden="true">🦐</span><span>Fructe de mare</span>']
  ];
  const catalogCategories = platterCategories.map(([category, label]) => {
    const entries = adultPlatters.filter(platter => platter.category === category).map(platter => `<details class="party-menu-item" id="party-platter-detail-${platter.id}"><summary><span>${escapeHtml(platter.name)}</span><b>${money(platter.price)} lei</b></summary><div class="party-answer"><p class="party-menu-meta">${escapeHtml(platter.weight)} · recomandat pentru aproximativ 5 persoane</p><ul>${platter.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="party-platter-pick"><button type="button" data-platter-add data-platter-id="${platter.id}">Adaugă platoul</button><div class="party-platter-stepper" role="group" aria-label="Număr de ${escapeHtml(platter.name)}"><button type="button" data-platter-step="-1" data-platter-id="${platter.id}" aria-label="Scade un platou">−</button><output data-platter-count="${platter.id}">0</output><button type="button" data-platter-step="1" data-platter-id="${platter.id}" aria-label="Adaugă încă un platou">+</button></div><input class="party-platter-quantity-input" type="number" min="0" step="1" value="0" data-platter-quantity="${platter.id}" aria-label="Număr de ${escapeHtml(platter.name)}"></div></div></details>`).join('');
    return `<details class="party-menu-group"><summary>${label} <small>${adultPlatters.filter(platter => platter.category === category).length} variante</small></summary><div class="party-menu-group-body">${entries}</div></details>`;
  }).join('');
  const childrenCatalog = `<details class="party-menu-group"><summary><span class="party-menu-emoji" aria-hidden="true">🧒</span><span>Meniuri pentru copii</span><small>2 variante de meniu</small></summary><div class="party-menu-group-body"><details class="party-menu-item"><summary>Meniu simplu · alegi preparatul și garnitura</summary><div class="party-answer"><ul>${childrenSimple.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p><strong>Garnituri:</strong> cartofi prăjiți, cartofi wedges, cartofi piure, orez sârbesc sau crochete de cartofi.</p></div></details>${childrenMix.map(([name, content]) => `<details class="party-menu-item"><summary>${name}</summary><div class="party-answer"><p>${escapeHtml(content)}</p></div></details>`).join('')}</div></details>`;
  const platterModal = document.createElement('div');
  platterModal.className = 'party-platter-modal';
  platterModal.hidden = true;
  platterModal.innerHTML = `<div class="party-platter-backdrop" data-party-platter-close></div><section class="party-platter-panel" role="dialog" aria-modal="true" aria-labelledby="party-platter-title"><div class="party-platter-panel-head"><div class="party-platter-heading"><span class="party-platter-icon" aria-hidden="true">🍽️</span><div><p class="party-platter-kicker">MASA ADULȚILOR</p><h4 id="party-platter-title">Platouri, pe îndelete</h4><p>Descoperiți variantele, apoi alegeți ce vi se potrivește.</p></div></div><button class="party-platter-close" type="button" data-party-platter-close aria-label="Închide platourile">×</button></div><details class="party-menu-catalog" open><summary>Vezi ce conține fiecare platou</summary><div class="party-answer"><p class="party-menu-note">Gramajele și ingredientele sunt afișate pentru fiecare variantă. Detaliile finale se confirmă la rezervare.</p>${childrenCatalog}${catalogCategories}</div></details><section class="party-platter-summary" data-platter-summary aria-live="polite"><h5>Ce ați ales</h5><p>Nu ați ales încă niciun platou.</p></section><button class="party-platter-done" type="button" data-party-platter-close>Salvează și revino la pagina anterioară</button></section>`;
  document.body.append(platterModal);
  let platterReturnContext = null;
  const openPlatterModal = returnContext => {
    platterReturnContext = returnContext || null;
    platterModal.hidden = false;
    document.body.classList.add('party-platter-modal-open');
    platterModal.querySelector('.party-platter-close')?.focus();
  };
  const closePlatterModal = () => {
    const returnContext = platterReturnContext;
    platterReturnContext = null;
    platterModal.hidden = true;
    document.body.classList.remove('party-platter-modal-open');
    requestAnimationFrame(() => {
      if (returnContext) {
        window.scrollTo({ top: returnContext.top, behavior: 'smooth' });
        returnContext.focus?.focus();
      } else {
        food.querySelector('[data-party-platter-open]')?.focus();
      }
    });
  };
  const showPlatterDetail = (id, returnContext = null) => {
    const detail = document.getElementById(`party-platter-detail-${id}`);
    if (!detail) return;
    openPlatterModal(returnContext);
    detail.open = true;
    requestAnimationFrame(() => detail.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  food.querySelector('[data-party-platter-open]')?.addEventListener('click', openPlatterModal);
  platterModal.querySelectorAll('[data-party-platter-close]').forEach(button => button.addEventListener('click', closePlatterModal));
  mobileBreakdown?.addEventListener('click', event => {
    const link = event.target.closest('[data-mobile-breakdown-link][data-platter-revisit]');
    if (!link) return;
    event.preventDefault();
    showPlatterDetail(link.dataset.platterRevisit, { top: window.scrollY, focus: link });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !platterModal.hidden) closePlatterModal();
  });
  document.querySelector('.party-price-note').insertAdjacentHTML('afterend', '<p class="party-extra-note">Animatorul, tema și alte surprize pot fi adăugate mai jos, dacă vă doriți.</p><details class="party-detail party-calculation"><summary>Vezi calculul costului</summary><div class="party-answer" data-price-breakdown></div></details>');
  const getCount = (input, min) => {
    const value = Number(input.value);
    return Number.isSafeInteger(value) && value >= min ? value : min;
  };
  const partyStateKey = 'becky-party-configuration';
  const savePartyState = () => {
    try {
      localStorage.setItem(partyStateKey, JSON.stringify({
        children: childInput?.value || '',
        mode: document.querySelector('[name="party-mode"]:checked')?.value || '',
        date: reservationDate?.value || '',
        extras: extras.filter(extra => document.querySelector(`[data-extra="${extra.id}"]`)?.checked).map(extra => extra.id),
        platters: [...document.querySelectorAll('[data-platter-quantity]')].reduce((state, input) => {
          state[input.dataset.platterQuantity] = getCount(input, 0);
          return state;
        }, {})
      }));
    } catch {}
  };
  const restorePartyState = () => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(partyStateKey) || 'null'); } catch {}
    if (!saved) return;
    if (childInput && Number.isSafeInteger(Number(saved.children)) && Number(saved.children) >= 1) childInput.value = saved.children;
    if (saved.mode) {
      const mode = document.querySelector(`[name="party-mode"][value="${CSS.escape(saved.mode)}"]`);
      if (mode) mode.checked = true;
    }
    if (reservationDate && saved.date) reservationDate.value = saved.date;
    const savedExtras = new Set(Array.isArray(saved.extras) ? saved.extras : []);
    extras.forEach(extra => {
      const checkbox = document.querySelector(`[data-extra="${extra.id}"]`);
      if (checkbox) checkbox.checked = savedExtras.has(extra.id);
    });
    Object.entries(saved.platters || {}).forEach(([id, value]) => {
      const input = document.querySelector(`[data-platter-quantity="${id}"]`);
      const output = document.querySelector(`[data-platter-count="${id}"]`);
      const quantity = Math.max(0, Math.floor(Number(value) || 0));
      if (input) input.value = quantity;
      if (output) output.textContent = String(quantity);
    });
  };
  const updatePrice = () => {
    const count = getCount(childInput, 1);
    const exclusive = document.querySelector('[name="party-mode"]:checked').value === 'exclusive';
    const base = exclusive ? 1275 + Math.max(0, count - 10) * 105 : count * 105;
    const selected = extras.filter(extra => document.querySelector(`[data-extra="${extra.id}"]`).checked);
    const rows = [{ label: `Pachet · ${count} copii · ${exclusive ? 'exclusivitate' : 'fără exclusivitate'}`, price: base, target: '#pachete' }, ...selected.map(extra => ({ ...extra, target: `#${extra.id}` }))];
    const platterRows = [];
    document.querySelectorAll('[data-platter-quantity]').forEach(quantityInput => {
      const platter = adultPlatters.find(item => item.id === quantityInput.dataset.platterQuantity);
      const quantity = getCount(quantityInput, 0);
      if (platter && quantity) platterRows.push({ label: `${quantity} × ${platter.name}`, price: quantity * platter.price, target: `#party-platter-detail-${platter.id}`, id: platter.id });
    });
    rows.push(...platterRows);
    const total = rows.reduce((sum, row) => sum + row.price, 0);
    document.querySelector('[data-party-total]').innerHTML = `${money(total)} <small>lei</small>`;
    document.querySelector('.party-estimate > span').textContent = rows.length > 1 ? 'Pachet + opțiunile alese' : 'Costul pachetului';
    document.querySelector('[data-party-formula]').textContent = exclusive
      ? count <= 10 ? 'Până la 10 copii incluși · apoi 105 lei/copil în plus.' : `1.275 lei + ${count - 10} copii × 105 lei.`
      : `${count} copii × 105 lei · fără număr minim.`;
    document.querySelector('[data-price-breakdown]').innerHTML = rows.map(row => `<p class="party-cost-row"><span>${row.label}</span><strong>${money(row.price)} lei</strong></p>`).join('') + '<p>Avans pentru rezervare: 200 lei. Tortul, băuturile adulților și eventualele prelungiri nu intră în acest calcul.</p>';
    const platterSummary = document.querySelector('[data-platter-summary]');
    if (platterSummary) platterSummary.innerHTML = platterRows.length
      ? `<h5>Ce ați ales</h5>${platterRows.map(row => `<button type="button" class="party-platter-summary-row" data-platter-revisit="${row.id}"><span>${row.label}</span><b>${money(row.price)} lei</b><i aria-hidden="true">↗</i></button>`).join('')}`
      : '<h5>Ce ați ales</h5><p>Nu ați ales încă niciun platou.</p>';
    if (mobileBreakdown) mobileBreakdown.innerHTML = `<span class="party-mobile-breakdown-title">Opțiunile alese</span>${rows.map(row => `<a class="party-mobile-breakdown-row" href="${row.target}" data-mobile-breakdown-link${row.id ? ` data-platter-revisit="${row.id}"` : ''}><span class="party-mobile-eye" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg></span><span class="party-mobile-breakdown-label">${row.label}</span><b>${money(row.price)} lei</b></a>`).join('')}<span class="party-mobile-breakdown-total"><span>Total estimat</span><b>${money(total)} lei</b></span>`;
    document.querySelector('[data-count-step="-1"]').disabled = count <= 1;
    selected.forEach(extra => document.getElementById(extra.id).classList.add('is-added'));
    extras.filter(extra => !selected.includes(extra)).forEach(extra => document.getElementById(extra.id).classList.remove('is-added'));
    if (status) status.textContent = `${count} copii · ${exclusive ? 'exclusivitate' : 'fără exclusivitate'} · total estimat ${money(total)} lei`;
    const reservationLink = document.querySelector('[data-reservation-link]');
    const selectedDate = reservationDate?.value || '';
    const formattedDate = selectedDate ? new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selectedDate + 'T12:00:00')) : '';
    const message = `Bună! Aș dori să verific disponibilitatea pentru o petrecere la Becky’s Garden.\nData dorită: ${formattedDate}\n${rows.map(row => `${row.label}: ${money(row.price)} lei`).join('\n')}\nTotal estimat: ${money(total)} lei.\nPutem confirma detaliile?`;
    reservationLink.href = selectedDate ? 'https://wa.me/40752155115?text=' + encodeURIComponent(message) : '#reservation-date';
    reservationLink.classList.toggle('is-disabled', !selectedDate);
    reservationLink.setAttribute('aria-disabled', String(!selectedDate));
    document.querySelector('[data-mobile-total]').textContent = `${money(total)} lei`;
    document.querySelector('[data-mobile-details-label]').textContent = `${count} copii${rows.length > 1 ? ' · opțiuni incluse' : ' · pachet'}`;
    savePartyState();
  };
  document.querySelectorAll('[data-count-step]').forEach(button => button.addEventListener('click', () => {
    childInput.value = Math.max(1, getCount(childInput, 1) + Number(button.dataset.countStep));
    updatePrice();
  }));
  document.querySelectorAll('[name="party-mode"], #party-children, [data-extra], [data-platter-quantity]').forEach(input => {
    input.addEventListener('input', updatePrice);
    input.addEventListener('change', () => {
      if (input.type === 'number') input.value = getCount(input, input === childInput ? 1 : 0);
      updatePrice();
    });
  });
  document.querySelectorAll('[data-platter-quantity]').forEach(input => input.addEventListener('focus', () => {
    if (input.value === '0') input.select();
  }));
  const setPlatterQuantity = (id, nextValue) => {
    const input = document.querySelector(`[data-platter-quantity="${id}"]`);
    const output = document.querySelector(`[data-platter-count="${id}"]`);
    if (!input) return;
    const value = Math.max(0, Math.floor(Number(nextValue) || 0));
    input.value = value;
    if (output) output.textContent = String(value);
    updatePrice();
  };
  document.querySelectorAll('[data-platter-add]').forEach(button => button.addEventListener('click', () => {
    const input = document.querySelector(`[data-platter-quantity="${button.dataset.platterId}"]`);
    setPlatterQuantity(button.dataset.platterId, getCount(input, 0) + 1);
  }));
  document.querySelectorAll('[data-platter-step]').forEach(button => button.addEventListener('click', () => {
    const input = document.querySelector(`[data-platter-quantity="${button.dataset.platterId}"]`);
    setPlatterQuantity(button.dataset.platterId, getCount(input, 0) + Number(button.dataset.platterStep));
  }));
  document.querySelectorAll('[data-platter-quantity]').forEach(input => input.addEventListener('input', () => {
    const value = getCount(input, 0);
    const output = document.querySelector(`[data-platter-count="${input.dataset.platterQuantity}"]`);
    if (output) output.textContent = String(value);
    updatePrice();
  }));
  document.querySelector('[data-platter-summary]')?.addEventListener('click', event => {
    const button = event.target.closest('[data-platter-revisit]');
    if (!button) return;
    showPlatterDetail(button.dataset.platterRevisit);
  });
  reservationDate?.addEventListener('input', updatePrice);
  document.querySelector('[data-reservation-link]')?.addEventListener('click', event => {
    if (!reservationDate?.value) {
      event.preventDefault();
      reservationDate?.focus();
    }
  });
  const toggleMobileDetails = () => {
    const expanded = mobileDetails.getAttribute('aria-expanded') === 'true';
    mobileDetails.setAttribute('aria-expanded', String(!expanded));
    mobileDetailsToggle?.setAttribute('aria-expanded', String(!expanded));
    mobileDetails.classList.toggle('is-expanded', !expanded);
    if (mobileBreakdown) mobileBreakdown.hidden = expanded;
  };
  mobileDetailsToggle?.addEventListener('click', toggleMobileDetails);
  mobileBreakdown?.addEventListener('click', event => {
    const link = event.target.closest('[data-mobile-breakdown-link]');
    if (!link) return;
    mobileDetails?.classList.remove('is-expanded');
    mobileDetails?.setAttribute('aria-expanded', 'false');
    mobileDetailsToggle?.setAttribute('aria-expanded', 'false');
    mobileBreakdown.hidden = true;
  });
  restorePartyState();
  updatePrice();

  const jumps = [...document.querySelectorAll('.party-jumps a')];
  const jumpNav = document.querySelector('.party-jumps');
  const jumpShell = document.createElement('div');
  jumpShell.className = 'party-jump-shell';
  jumpNav.before(jumpShell);
  jumpShell.innerHTML = '<span class="party-jump-label">Pe această pagină</span><div class="party-jump-controls"><button type="button" data-jump-prev aria-label="Secțiuni anterioare">‹</button><button type="button" data-jump-next aria-label="Mai multe secțiuni">›</button></div>';
  jumpShell.querySelector('[data-jump-next]').before(jumpNav);
  const updateJumpEdges = () => {
    jumpShell.querySelector('[data-jump-prev]').disabled = jumpNav.scrollLeft < 2;
    jumpShell.querySelector('[data-jump-next]').disabled = jumpNav.scrollLeft >= jumpNav.scrollWidth - jumpNav.clientWidth - 2;
  };
  jumpShell.querySelectorAll('button').forEach(button => button.onclick = () => {
    jumpNav.scrollBy({ left: (button.hasAttribute('data-jump-prev') ? -1 : 1) * jumpNav.clientWidth * .75, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth' });
  });
  jumpNav.addEventListener('scroll', updateJumpEdges, { passive:true });
  new ResizeObserver(updateJumpEdges).observe(jumpNav);
  updateJumpEdges();
  let activeJumpHash = '';
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const activeHash = '#' + entry.target.id;
      if (activeJumpHash === activeHash) return;
      activeJumpHash = activeHash;
      const activeLink = jumps.find(link => link.hash === activeHash);
      jumps.forEach(link => link.toggleAttribute('aria-current', link === activeLink));
      activeLink?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    });
  }, { rootMargin: '-20% 0px -55% 0px' });
  jumps.forEach(link => observer.observe(document.querySelector(link.hash)));

  const headerCta = document.querySelector('.site-header .nav-cta');
  if (headerCta) headerCta.href = '#rezerva';
})();
