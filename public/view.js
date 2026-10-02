(() => {
  const $ = id => document.getElementById(id);
  const standaloneMode = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
  const photo = (time, variant = 0) => '/assets/Imagini-local/' + encodeURIComponent('WhatsApp Image 2026-08-08 at ' + time + (variant ? ' (' + variant + ')' : '') + '.jpeg');
  const batch = (time, variants) => variants.map(v => photo(time, v));
  // Levels and connections follow camera/view_360.html. This is a schematic, not a measured floor plan.
  const floors = [
    { id: 'mansarda', name: 'Mansardă', color: '#b896c2' },
    { id: 'etaj', name: 'Etajul 1', color: '#b3bd77' },
    { id: 'parter', name: 'Parter', color: '#7bb8a0' },
    { id: 'subsol', name: 'Subsol', color: '#dfa26f' },
    { id: 'exterior', name: 'Exterior', color: '#8cb9cf' }
  ];
  const rooms = [
    { id: 'ateliere', name: 'Ateliere', floor: 'mansarda', photos: ['/assets/camera%206.png'] },
    { id: 'playstation', name: 'PlayStation', floor: 'mansarda', photos: [photo('16.18.38')] },
    { id: 'catarat', name: 'Cățărare', floor: 'mansarda', photos: ['/assets/Imagini-local/zona%20de%20catarat.jpg'] },
    { id: 'constructii', name: 'Construcții cu nisip', short: 'Nisip', floor: 'etaj', photos: [photo('16.18.37')] },
    { id: 'lego', name: 'Camera LEGO', short: 'LEGO', floor: 'etaj', photos: [photo('16.16.59', 3)] },
    { id: 'roluri', name: 'Jocuri de rol', floor: 'etaj', photos: [photo('16.16.59', 1)] },
    { id: 'receptie', name: 'Recepție', floor: 'parter', photos: ['/assets/acces.png'] },
    { id: 'camera04', name: 'Camera 0–4 ani & salon', short: '0–4 ani & salon', floor: 'parter', photos: [photo('16.17.01', 2), '/assets/c87c7831-73b7-46d9-b55c-db79bcf582d9.png'] },
    { id: 'subsol', name: 'Tobogan, bile & petreceri', short: 'Tobogan, bile & petreceri', floor: 'subsol', photos: [photo('16.16.55', 4), '/assets/image%20516.png'] },
    { id: 'curte', name: 'Curtea & gonflabilul', short: 'Curtea', floor: 'exterior', photos: [photo('16.17.04', 2)] },
    { id: 'intrare', name: 'Intrarea din stradă', short: 'Intrarea', floor: 'exterior', photos: ['/view-assets/intrare-1.jpg'] }
  ];
  const presentationNames = new Map();
  let cameraNumber = 1;
  ['subsol', 'camera04', 'constructii', 'lego', 'roluri', 'ateliere', 'playstation', 'catarat'].forEach(roomId => {
    const room = rooms.find(item => item.id === roomId);
    if (room) presentationNames.set(room.id, 'Camera ' + cameraNumber++);
  });
  presentationNames.set('receptie', 'Acces');
  rooms.filter(room => room.floor === 'exterior').forEach((room, index) => {
    presentationNames.set(room.id, 'Exterior ' + (index + 1));
  });
  const presentationName = room => presentationNames.get(room.id) || 'Spațiu';
  const floorFor = room => floors.find(f => f.id === room.floor);
  let selected = null, currentPhotoIndex = 0, touch = null, lightboxTouch = null, lightboxItems = [], lightboxItemIndex = 0, animationToken = 0, presentationPromise = null, storyTouch = null, storyIndex = 0;
  const storySlides = [
    { image: '/assets/Poarta_cu_banner.png', kicker: 'DE AICI ÎNCEPE POVESTEA', title: 'Un loc pentru după școală.', description: 'Intrăm prin poarta Becky’s Garden într-un spațiu gândit pentru joacă, descoperire și timp bun după ore.' },
    { image: '/assets/Imagini-local/WhatsApp Image 2026-08-08 at 16.17.01 (2).jpeg', kicker: 'SPAȚII MULTIFUNCȚIONALE', title: 'Un singur spațiu, multiple posibilități', description: 'Toate zonele pot găzdui activități didactice, activități distractive, ateliere și opționale.' },
    { image: '/assets/Imagini-local/WhatsApp Image 2026-08-08 at 16.16.55 (4).jpeg', kicker: 'SPAȚII CARE SE TRANSFORMĂ', title: 'Fiecare colț este gândit pentru ceva nou.', description: 'De la joacă liberă la activități de grup, spațiul se poate adapta în funcție de zi, copii și idee.' },
    { images: [photo('16.16.59', 1), photo('16.16.59', 3)], kicker: 'DE LA UN NIVEL LA ALTUL', title: 'Loc pentru aventuri mari', description: 'Casa se desfășoară pe mai multe niveluri, fiecare cu o atmosferă și un ritm propriu.' },
    { images: ['/assets/Imagini-local/zona%20de%20catarat.jpg', photo('16.18.38')], kicker: 'ȘI PENTRU MOMENTE MAI LINIȘTITE', title: 'Joacă, descoperire și relaxare', description: 'Unele momente au multă energie. Altele au nevoie de o pauză, o conversație sau o activitate în ritm mai calm.' }
  ];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const imageCache = new Map();
  const loadedImages = new Set();
  let deferredInstallPrompt = null;

  function setupPwaInstall() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(async registrations => {
        const legacy = registrations.filter(registration => registration.scope === `${location.origin}/` && /\/(?:view-sw|prieten-becky-sw|prieteni-becky-sw)\.js$/.test(registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || ''));
        await Promise.all(legacy.map(registration => registration.unregister()));
        await navigator.serviceWorker.register('/view-sw.js', { scope: '/view' });
      }).catch(() => {});
    }
    if (standaloneMode) return;
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      if (!localStorage.getItem('becky-view-install-declined')) showInstallPrompt();
    });
    window.addEventListener('appinstalled', () => document.querySelector('.install-prompt')?.remove());
  }

  function showInstallPrompt() {
    if (document.querySelector('.install-prompt') || !deferredInstallPrompt) return;
    const prompt = document.createElement('aside');
    prompt.className = 'install-prompt';
    prompt.innerHTML = '<div><strong>Vrei Casa Becky la îndemână?</strong><p>Instalează prezentarea pe tabletă pentru acces rapid.</p></div><div class="install-actions"><button class="install-later" type="button">Mai târziu</button><button class="install-nope" type="button">Nu mă interesează</button><button class="install-now" type="button">Instalează</button></div>';
    document.body.append(prompt);
    prompt.querySelector('.install-later').addEventListener('click', () => prompt.remove());
    prompt.querySelector('.install-nope').addEventListener('click', () => { localStorage.setItem('becky-view-install-declined', '1'); prompt.remove(); });
    prompt.querySelector('.install-now').addEventListener('click', async () => { deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; prompt.remove(); });
  }

  function preloadImage(url) {
    const absoluteUrl = new URL(url, location.href).href;
    if (imageCache.has(absoluteUrl)) return imageCache.get(absoluteUrl);
    const image = new Image();
    const promise = new Promise((resolve, reject) => {
      image.onload = () => { loadedImages.add(absoluteUrl); resolve(image); };
      image.onerror = error => { imageCache.delete(absoluteUrl); reject(error); };
    });
    imageCache.set(absoluteUrl, promise);
    image.src = url;
    return promise;
  }

  function warmRoom(room) {
    room.photos.forEach(url => preloadImage(url).catch(() => {}));
  }

  function setNavigatorCollapsed(collapsed) {
    $('explorer').classList.toggle('is-nav-collapsed', collapsed);
    const toggle = $('nav-toggle');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Deschide navigatorul casei' : 'Strânge navigatorul casei');
    toggle.title = collapsed ? 'Deschide navigatorul casei' : 'Strânge navigatorul casei';
    toggle.querySelector('.nav-toggle-chevron').textContent = collapsed ? '›' : '‹';
  }

  function makeRoomButton(room, compact) {
    const button = document.createElement('button');
    button.className = 'room-button'; button.dataset.room = room.id;
    button.setAttribute('aria-label', presentationName(room) + ' · ' + floorFor(room).name);
    const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy';
    button.classList.add('is-loading');
    image.addEventListener('load', () => button.classList.remove('is-loading'));
    image.addEventListener('error', () => { button.classList.remove('is-loading'); image.alt = 'Deschide fotografia'; });
    image.src = room.photos[0];
    const title = document.createElement('span'); title.textContent = presentationName(room);
    button.append(image, title);
    button.addEventListener('click', () => openRoom(room));
    return button;
  }

  function buildMap() {
    for (const compact of [true, false]) {
      const target = compact ? $('house') : $('overview-rooms');
      floors.forEach(floor => {
        const group = document.createElement('section');
        group.className = compact ? 'floor' : 'overview-floor'; group.dataset.floor = floor.id;
        group.style.setProperty('--floor-color', floor.color);
        const heading = document.createElement('div'); heading.className = 'floor-heading';
        const title = document.createElement('h2'); title.textContent = floor.name; heading.append(title);
        if (compact) { const marker = document.createElement('span'); marker.className = 'you-are-here'; marker.textContent = '● EȘTI AICI'; marker.hidden = true; heading.append(marker); }
        const list = document.createElement('div'); list.className = 'room-list';
        rooms.filter(r => r.floor === floor.id).forEach(r => list.append(makeRoomButton(r, compact)));
        group.append(heading, list); target.append(group);
      });
    }
  }

  function markLocation() {
    document.querySelectorAll('[data-room]').forEach(button => {
      if (button.dataset.room === selected?.id) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    });
    $('house').querySelectorAll('[data-floor]').forEach(group => {
      const active = group.dataset.floor === selected?.floor;
      group.classList.toggle('is-current', active);
      group.querySelector('.you-are-here').hidden = !active;
    });
  }

  function openRoom(room, updateURL = true) {
    const changed = selected?.id !== room.id;
    selected = room;
    warmRoom(room);
    setNavigatorCollapsed(false);
    $('overview').hidden = true; $('gallery').hidden = false;
    $('room-title').textContent = presentationName(room);
    $('location').textContent = 'Becky’s Garden / ' + floorFor(room).name;
    $('gallery').style.setProperty('--floor-color', floorFor(room).color);
    $('thumbnails').replaceChildren(); $('photo-dots').replaceChildren();
    room.photos.forEach((url, index) => {
      const button = document.createElement('button'); button.setAttribute('aria-label', presentationName(room) + ', fotografia ' + (index + 1));
      const image = document.createElement('img'); image.src = url; image.alt = ''; image.loading = 'lazy';
      button.append(image); button.addEventListener('click', () => selectPhoto(index)); $('thumbnails').append(button);
      const dot = document.createElement('button'); dot.className = 'photo-dot'; dot.type = 'button'; dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Fotografia ' + (index + 1) + ' din ' + room.photos.length);
      dot.addEventListener('click', () => selectPhoto(index)); $('photo-dots').append(dot);
    });
    currentPhotoIndex = 0;
    markLocation(); showPhoto(0);
    if (changed && !reduced.matches) {
      $('photo-stage').classList.remove('is-changing'); void $('photo-stage').offsetWidth; $('photo-stage').classList.add('is-changing');
    }
    if (updateURL && location.hash !== '#' + room.id) history.pushState(null, '', '#' + room.id);
  }

  function setPhotoSource(url, alt, animate = false, direction = 1) {
    const stage = $('photo-stage');
    const current = $('photo');
    const absoluteUrl = new URL(url, location.href).href;
    animationToken++;
    if (!animate || current.hidden || !current.src || current.src === absoluteUrl || reduced.matches) {
      const ready = loadedImages.has(absoluteUrl);
      current.hidden = !ready; $('photo-loading').hidden = ready; stage.setAttribute('aria-busy', String(!ready));
      current.className = 'photo-layer'; current.alt = alt; current.src = url;
      return;
    }
    const token = animationToken;
    stage.querySelector('.photo-incoming')?.remove();
    current.className = 'photo-layer'; current.style.removeProperty('--leave-x'); current.hidden = false;
    $('photo-loading').hidden = true;
    preloadImage(url).then(cached => {
      if (token !== animationToken) return;
      const layer = cached.cloneNode(false);
      layer.id = 'photo-incoming'; layer.className = 'photo-layer photo-incoming'; layer.alt = alt; layer.draggable = false;
      layer.style.setProperty('--enter-x', direction > 0 ? '11%' : '-11%');
      current.className = 'photo-layer photo-leaving';
      current.style.setProperty('--leave-x', direction > 0 ? '-11%' : '11%');
      current.hidden = false; stage.append(layer);
      requestAnimationFrame(() => { layer.classList.add('is-visible'); current.classList.add('is-gone'); });
      window.setTimeout(() => {
        if (token !== animationToken) return;
        current.remove(); layer.id = 'photo'; layer.className = 'photo-layer'; layer.style.removeProperty('--enter-x');
      }, 580);
    }).catch(() => { if (token === animationToken) $('photo-error').hidden = false; });
  }

  function showPhoto(index, { animate = false, direction = 1 } = {}) {
    if (!selected) return;
    index = (index + selected.photos.length) % selected.photos.length;
    currentPhotoIndex = index;
    $('photo-error').hidden = true;
    setPhotoSource(selected.photos[index], presentationName(selected) + ' — fotografia ' + (index + 1), animate, direction);
    $('counter').textContent = (index + 1) + ' / ' + selected.photos.length;
    $('previous').disabled = false; $('next').disabled = false;
    $('previous').hidden = $('next').hidden = selected.photos.length === 1;
    $('photo-dots').hidden = selected.photos.length === 1;
    $('photo-help').textContent = selected.photos.length > 1 ? 'Glisează spre stânga pentru fotografia următoare' : 'Alege altă cameră direct din hartă';
    [...$('thumbnails').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    [...$('photo-dots').children].forEach((b, i) => { const active = i === index; b.classList.toggle('is-active', active); b.setAttribute('aria-selected', String(active)); b.tabIndex = active ? 0 : -1; });
    const thumb = $('thumbnails').children[index];
    if (thumb) $('thumbnails').scrollTo({ left: Math.max(0, thumb.offsetLeft - $('thumbnails').offsetLeft - $('thumbnails').clientWidth / 2 + thumb.clientWidth / 2), behavior: reduced.matches ? 'instant' : 'smooth' });
    $('viewer-status').textContent = floorFor(selected).name + ', ' + presentationName(selected) + '. Fotografia ' + (index + 1) + ' din ' + selected.photos.length;
    if (selected.photos[index + 1]) preloadImage(selected.photos[index + 1]).catch(() => {});
  }

  function step(direction) { if (selected) showPhoto(currentPhotoIndex + direction, { animate: true, direction }); }
  function selectPhoto(index) {
    if (!selected) return;
    const current = currentPhotoIndex;
    const direction = index === current ? 1 : (index > current ? 1 : -1);
    showPhoto(index, { animate: true, direction });
  }
  function updateLightbox() {
    const item = lightboxItems[lightboxItemIndex];
    if (!item) return;
    $('large-photo').src = item.url;
    $('large-photo').alt = presentationName(item.room) + ' — fotografia ' + (item.photoIndex + 1);
    $('lightbox-counter').textContent = presentationName(item.room);
    [...$('lightbox-dots').children].forEach((dot, index) => {
      const active = index === lightboxItemIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
    });
  }
  function updateLightboxLevels() {
    if ($('lightbox-levels').children.length !== floors.length) {
      $('lightbox-levels').replaceChildren();
      floors.forEach(floor => {
        const level = document.createElement('span');
        level.className = 'lightbox-level'; level.textContent = floor.name;
        $('lightbox-levels').append(level);
      });
    }
    [...$('lightbox-levels').children].forEach((level, index) => {
      level.classList.toggle('is-active', floors[index].id === selected?.floor);
    });
  }
  function renderLightboxItems() {
    $('lightbox-dots').replaceChildren();
    lightboxItems.forEach((item, index) => {
      const dot = document.createElement('button');
      dot.className = 'photo-dot'; dot.type = 'button'; dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', presentationName(item.room) + ', fotografia ' + (item.photoIndex + 1));
      dot.addEventListener('click', () => {
        const previousRoom = selected;
        lightboxItemIndex = index;
        if (previousRoom?.id !== item.room.id) openRoom(item.room, false);
        else showPhoto(item.photoIndex);
        history.replaceState(null, '', '#' + item.room.id);
        updateLightbox(); updateLightboxLevels();
      });
      $('lightbox-dots').append(dot);
    });
  }
  function itemsForFloor(floorId) {
    return rooms.filter(room => room.floor === floorId).flatMap(room => room.photos.map((url, photoIndex) => ({ room, url, photoIndex })));
  }
  async function openLightbox() {
    if (!selected) return;
    await enterPresentation();
    lightboxItems = itemsForFloor(selected.floor);
    lightboxItemIndex = Math.max(0, lightboxItems.findIndex(item => item.room.id === selected.id && item.photoIndex === currentPhotoIndex));
    renderLightboxItems();
    updateLightbox();
    updateLightboxLevels();
    $('lightbox').showModal();
  }
  function stepLightbox(direction) {
    if (!selected || !lightboxItems.length) return;
    lightboxItemIndex = (lightboxItemIndex + direction + lightboxItems.length) % lightboxItems.length;
    const item = lightboxItems[lightboxItemIndex];
    if (selected.id !== item.room.id) openRoom(item.room, false);
    else showPhoto(item.photoIndex);
    history.replaceState(null, '', '#' + item.room.id);
    updateLightbox(); updateLightboxLevels();
  }
  function stepLightboxLevel(direction) {
    if (!selected) return;
    const currentFloorIndex = floors.findIndex(floor => floor.id === selected.floor);
    const nextFloorIndex = Math.max(0, Math.min(floors.length - 1, currentFloorIndex + direction));
    if (nextFloorIndex === currentFloorIndex) return;
    const nextFloor = floors[nextFloorIndex];
    const nextItems = itemsForFloor(nextFloor.id);
    if (!nextItems.length) return;
    lightboxItems = nextItems;
    lightboxItemIndex = 0;
    openRoom(lightboxItems[0].room, false);
    history.replaceState(null, '', '#' + lightboxItems[0].room.id);
    renderLightboxItems();
    updateLightbox(); updateLightboxLevels();
  }
  function home(updateURL = true) {
    $('overview').hidden = false; $('gallery').hidden = true; selected = null; setNavigatorCollapsed(true); markLocation();
    if (updateURL && location.hash) history.pushState(null, '', location.pathname + location.search);
    $('viewer-status').textContent = 'Toată casa. Alege o cameră.';
  }
  let storyRenderToken = 0;
  async function renderStory() {
    const token = ++storyRenderToken;
    const slide = storySlides[storyIndex];
    const slideImages = slide.images || [slide.image];
    const isGrid = slideImages.length > 1;
    const compositions = [
      { position: '50% 58%', mobile: '50% 50%', text: 'bottom' },
      { position: '50% 62%', mobile: '50% 50%', text: 'bottom' },
      { position: '50% 50%', mobile: '65% 50%', text: 'bottom' },
      { position: '50% 50%', mobile: '50% 45%', text: 'bottom' },
      { position: '50% 50%', mobile: '58% 50%', text: 'top' }
    ];
    const composition = compositions[storyIndex];
    $('story-stage').dataset.textPosition = composition.text;
    $('story-stage').style.setProperty('--photo-position', composition.position);
    $('story-stage').style.setProperty('--photo-position-mobile', composition.mobile);
    $('story-photo').hidden = isGrid;
    $('story-grid').hidden = !isGrid;
    $('story-grid').replaceChildren(...(isGrid ? slideImages.map((image, index) => { const element = document.createElement('img'); element.className = 'story-grid-image'; element.alt = slide.title + ' · imaginea ' + (index + 1); element.src = image; return element; }) : []));
    $('story-loading').hidden = false;
    $('story-retry').hidden = true;
    $('story-stage').setAttribute('aria-busy', 'true');
    $('story-kicker').textContent = slide.kicker; $('story-title').textContent = slide.title; $('story-description').textContent = slide.description;
    $('story-counter').textContent = (storyIndex + 1) + ' / ' + storySlides.length;
    [...$('story-dots').children].forEach((dot, index) => { dot.classList.toggle('is-active', index === storyIndex); dot.setAttribute('aria-selected', String(index === storyIndex)); });
    if (!reduced.matches) {
      ['story-kicker', 'story-title', 'story-description'].forEach((id, index) => {
        $(id).getAnimations().forEach(animation => animation.cancel());
        $(id).animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, delay: index * 90, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' });
      });
    }
    try {
      const readyImages = await Promise.all(slideImages.map(image => preloadImage(image)));
      await Promise.all(readyImages.map(image => image.decode ? image.decode() : Promise.resolve()));
      if (token !== storyRenderToken) return;
      if (!isGrid) {
        $('story-photo').src = slide.image; $('story-photo').alt = slide.title; $('story-photo').hidden = false;
        if (!reduced.matches) $('story-photo').animate([{ opacity: 0, transform: 'scale(1.025)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
      } else {
        const gridImages = [...$('story-grid').querySelectorAll('.story-grid-image')];
        gridImages.forEach(image => { image.hidden = false; if (!reduced.matches) image.animate([{ opacity: 0, transform: 'translateY(12px) scale(1.015)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' }); });
      }
    } catch {
      if (token === storyRenderToken) $('story-retry').hidden = false;
    } finally {
      if (token === storyRenderToken) { $('story-loading').hidden = true; $('story-stage').setAttribute('aria-busy', 'false'); }
    }
    const nextSlide = storySlides[(storyIndex + 1) % storySlides.length];
    Promise.all((nextSlide.images || [nextSlide.image]).map(image => preloadImage(image))).catch(() => {});
  }
  function openStory() {
    if ($('story-dialog').open) return;
    if ($('lightbox').open) $('lightbox').close();
    storyIndex = 0;
    $('story-dots').replaceChildren(...storySlides.map((slide, index) => { const dot = document.createElement('button'); dot.className = 'photo-dot'; dot.type = 'button'; dot.setAttribute('aria-label', 'Slide-ul ' + (index + 1)); dot.addEventListener('click', () => { storyIndex = index; renderStory(); }); return dot; }));
    renderStory(); $('story-dialog').showModal();
  }
  function stepStory(direction) { storyIndex = (storyIndex + direction + storySlides.length) % storySlides.length; renderStory(); }
  function followURL() { const room = rooms.find(r => '#' + r.id === location.hash); if (room) openRoom(room, false); else home(false); }
  $('home')?.addEventListener('click', () => home());
  $('explore-house').addEventListener('click', () => $('overview-rooms').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' }));
  $('story-house').addEventListener('click', openStory);
  let choosingPath = false;
  function showChoices() {
    document.body.classList.add('entry-ready');
    if ($('entry-dialog').open) return;
    $('entry-dialog').showModal();
    $('entry-title').focus({ preventScroll: true });
  }
  async function choosePath(path, button) {
    if (choosingPath) return;
    choosingPath = true;
    // Request during the tap, before animation awaits consume user activation.
    const fullscreenReady = Math.min(screen.width, screen.height) >= 700
      ? enterPresentation()
      : Promise.resolve();
    if (path === 'story') document.body.classList.add('story-transitioning');
    else { home(); $('overview').scrollTop = 0; }
    try {
      if (path === 'explore') {
        if (!reduced.matches) await button.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.045)', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished;
        $('entry-dialog').close();
        fullscreenReady.catch(() => {});
        if (!reduced.matches) $('overview').animate([{ opacity: .35, transform: 'scale(.985) translateY(8px)' }, { opacity: 1, transform: 'scale(1) translateY(0)' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
        $('explore-house').focus({ preventScroll: true });
        document.body.classList.remove('story-transitioning');
        return;
      }
      if (!reduced.matches) {
        await Promise.all([
          button.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished,
          document.querySelector('.entry-panel').animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.035)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished
        ]);
      }
      await fullscreenReady;
      $('entry-dialog').close();
      if (path === 'story') openStory();
      else {
        if (!reduced.matches) $('overview').animate([{ opacity: 0, transform: 'scale(.975) translateY(12px)' }, { opacity: 1, transform: 'scale(1) translateY(0)' }], { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' });
        $('explore-house').focus({ preventScroll: true });
      }
      document.body.classList.remove('story-transitioning');
    } finally {
      $('entry-dialog').getAnimations({ subtree: true }).forEach(animation => animation.cancel());
      choosingPath = false;
    }
  }
  $('entry-explore').addEventListener('click', event => choosePath('explore', event.currentTarget));
  $('entry-story').addEventListener('click', event => choosePath('story', event.currentTarget));
  $('choose-path').addEventListener('click', showChoices);
  $('entry-dialog').addEventListener('cancel', event => { event.preventDefault(); choosePath('explore', $('entry-explore')); });
  $('story-retry').addEventListener('click', renderStory);
  $('nav-toggle').addEventListener('click', () => setNavigatorCollapsed(!$('explorer').classList.contains('is-nav-collapsed')));
  $('previous').addEventListener('click', () => step(-1)); $('next').addEventListener('click', () => step(1));
  // One owner for swipes; clicks on the image do not navigate.
  $('photo-stage').addEventListener('touchstart', e => {
    touch = e.touches.length === 1 && !e.target.closest('button') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  $('photo-stage').addEventListener('touchmove', e => { if (e.touches.length !== 1) touch = null; }, { passive: true });
  $('photo-stage').addEventListener('touchend', e => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y; touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  $('photo-stage').addEventListener('touchcancel', () => { touch = null; }, { passive: true });
  window.addEventListener('keydown', e => {
    if ($('story-dialog').open && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); stepStory(e.key === 'ArrowRight' ? 1 : -1); }
      return;
    }
    if (!selected || e.altKey || e.ctrlKey || e.metaKey) return;
    if ($('lightbox').open) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(e.key === 'ArrowRight' ? 1 : -1); }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });
  $('enlarge').addEventListener('click', openLightbox);
  $('lightbox-previous').addEventListener('click', () => stepLightbox(-1));
  $('lightbox-next').addEventListener('click', () => stepLightbox(1));
  $('lightbox-stage').addEventListener('touchstart', e => {
    lightboxTouch = e.touches.length === 1 && !e.target.closest('button') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  $('lightbox-stage').addEventListener('touchend', e => {
    if (!lightboxTouch) return;
    const dx = e.changedTouches[0].clientX - lightboxTouch.x, dy = e.changedTouches[0].clientY - lightboxTouch.y;
    lightboxTouch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) stepLightbox(dx < 0 ? 1 : -1);
    else if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.5) stepLightboxLevel(dy < 0 ? 1 : -1);
  }, { passive: true });
  $('close-lightbox').addEventListener('click', () => $('lightbox').close());
  $('close-story').addEventListener('click', () => $('story-dialog').close());
  $('story-dialog').addEventListener('close', () => { ++storyRenderToken; home(); $('overview').scrollTop = 0; $('story-house').focus({ preventScroll: true }); });
  $('story-stage').addEventListener('touchcancel', () => { storyTouch = null; }, { passive: true });
  $('story-previous').addEventListener('click', () => stepStory(-1)); $('story-next').addEventListener('click', () => stepStory(1));
  $('story-stage').addEventListener('touchstart', e => { storyTouch = e.touches.length === 1 && !e.target.closest('button') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  $('story-stage').addEventListener('touchend', e => { if (!storyTouch) return; const dx = e.changedTouches[0].clientX - storyTouch.x, dy = e.changedTouches[0].clientY - storyTouch.y; storyTouch = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) stepStory(dx < 0 ? 1 : -1); }, { passive: true });
  $('photo').addEventListener('error', () => { $('photo-error').hidden = false; $('photo-loading').hidden = true; $('photo-stage').setAttribute('aria-busy', 'false'); });
  $('photo').addEventListener('load', () => { $('photo-error').hidden = true; $('photo-loading').hidden = true; $('photo').hidden = false; $('photo-stage').setAttribute('aria-busy', 'false'); });
  $('retry').addEventListener('click', () => { $('photo').src = selected.photos[currentPhotoIndex] + '?retry=' + Date.now(); });
  async function enterPresentation() {
    if (document.fullscreenElement || !document.fullscreenEnabled) return;
    if (presentationPromise) return presentationPromise;
    presentationPromise = (async () => {
      try {
        await document.documentElement.requestFullscreen();
        const tabletLayout = Math.min(screen.width, screen.height) >= 700;
        if (tabletLayout && screen.orientation?.lock) await screen.orientation.lock('landscape').catch(() => {});
      } catch {}
    })().finally(() => { presentationPromise = null; });
    return presentationPromise;
  }
  $('fullscreen').addEventListener('click', async () => {
    if (!$('story-dialog').open) { openStory(); return; }
    $('story-dialog').close();
  });
  window.addEventListener('popstate', followURL);
  setupPwaInstall();
  buildMap(); rooms.forEach(room => preloadImage(room.photos[0]).catch(() => {})); setNavigatorCollapsed(true); followURL();
  $('entry-dialog').close();
  showChoices();
  preloadImage(storySlides[0].image).catch(() => {});
})();
