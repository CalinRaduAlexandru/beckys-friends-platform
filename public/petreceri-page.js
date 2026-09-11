(() => {
  const page = document.querySelector('.party-hero');
  if (!page) return;
  document.querySelectorAll('.party-extra-link[href="/invitatii-petrecere"]').forEach(link => link.remove());

  const status = document.querySelector('[data-reservation-status]');

  const gallery = document.querySelector('[data-party-gallery]');
  const galleryMain = gallery?.querySelector('[data-party-gallery-main]');
  const galleryTitle = gallery?.querySelector('[data-party-gallery-title]');
  const galleryDetail = gallery?.querySelector('[data-party-gallery-detail]');
  const galleryButtons = [...(gallery?.querySelectorAll('[data-party-gallery-src]') || [])];

  galleryButtons.forEach(button => {
    button.addEventListener('click', () => {
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
      button.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    });
  });

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
  if (foodLead) foodLead.outerHTML = '<ul class="party-food-bullets"><li>Platou rece <strong>250 lei</strong></li><li>Platou cald <strong>275 lei</strong></li><li>Cafeaua și băuturile se comandă la noi</li></ul>';
  food.insertAdjacentHTML('beforeend', '<div class="party-food-quantities"><label>Platouri reci · 250 lei<input type="number" min="0" step="1" value="0" data-food="rece" aria-label="Număr de platouri reci"></label><label>Platouri calde · 275 lei<input type="number" min="0" step="1" value="0" data-food="cald" aria-label="Număr de platouri calde"></label></div>');
  document.querySelector('.party-price-note').insertAdjacentHTML('afterend', '<a class="party-extra-link" href="#extra">Adaugă animator, temă sau alte surprize ↓</a><details class="party-detail party-calculation"><summary>Vezi calculul costului</summary><div class="party-answer" data-price-breakdown></div></details>');
  const getCount = (input, min) => {
    const value = Number(input.value);
    return Number.isSafeInteger(value) && value >= min ? value : min;
  };
  const updatePrice = () => {
    const count = getCount(childInput, 1);
    const exclusive = document.querySelector('[name="party-mode"]:checked').value === 'exclusive';
    const base = exclusive ? 1275 + Math.max(0, count - 10) * 105 : count * 105;
    const selected = extras.filter(extra => document.querySelector(`[data-extra="${extra.id}"]`).checked);
    const rows = [{ label: `Pachet · ${count} copii · ${exclusive ? 'exclusivitate' : 'fără exclusivitate'}`, price: base, target: '#pachete' }, ...selected.map(extra => ({ ...extra, target: `#${extra.id}` }))];
    document.querySelectorAll('[data-food]').forEach(input => {
      const quantity = getCount(input, 0);
      if (quantity) rows.push({ label: `${quantity} × platou ${input.dataset.food}`, price: quantity * (input.dataset.food === 'rece' ? 250 : 275), target: '#masa-adultilor' });
    });
    const total = rows.reduce((sum, row) => sum + row.price, 0);
    document.querySelector('[data-party-total]').innerHTML = `${money(total)} <small>lei</small>`;
    document.querySelector('.party-estimate > span').textContent = rows.length > 1 ? 'Pachet + opțiunile alese' : 'Costul pachetului';
    document.querySelector('[data-party-formula]').textContent = exclusive
      ? count <= 10 ? 'Până la 10 copii incluși · apoi 105 lei/copil în plus.' : `1.275 lei + ${count - 10} copii × 105 lei.`
      : `${count} copii × 105 lei · fără număr minim.`;
    document.querySelector('[data-price-breakdown]').innerHTML = rows.map(row => `<p class="party-cost-row"><span>${row.label}</span><strong>${money(row.price)} lei</strong></p>`).join('') + '<p>Avans pentru rezervare: 200 lei. Tortul, băuturile adulților și eventualele prelungiri nu intră în acest calcul.</p>';
    if (mobileBreakdown) mobileBreakdown.innerHTML = `<span class="party-mobile-breakdown-title">Opțiunile alese</span>${rows.map(row => `<a class="party-mobile-breakdown-row" href="${row.target}" data-mobile-breakdown-link><span class="party-mobile-eye" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg></span><span class="party-mobile-breakdown-label">${row.label}</span><b>${money(row.price)} lei</b></a>`).join('')}<span class="party-mobile-breakdown-total"><span>Total estimat</span><b>${money(total)} lei</b></span>`;
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
  };
  document.querySelectorAll('[data-count-step]').forEach(button => button.addEventListener('click', () => {
    childInput.value = Math.max(1, getCount(childInput, 1) + Number(button.dataset.countStep));
    updatePrice();
  }));
  document.querySelectorAll('[name="party-mode"], #party-children, [data-extra], [data-food]').forEach(input => {
    input.addEventListener('input', updatePrice);
    input.addEventListener('change', () => {
      if (input.type === 'number') input.value = getCount(input, input === childInput ? 1 : 0);
      updatePrice();
    });
  });
  document.querySelectorAll('[data-food]').forEach(input => input.addEventListener('focus', () => {
    if (input.value === '0') input.select();
  }));
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
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      jumps.forEach(link => {
        if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-20% 0px -55% 0px' });
  jumps.forEach(link => observer.observe(document.querySelector(link.hash)));

  const headerCta = document.querySelector('.site-header .nav-cta');
  if (headerCta) headerCta.href = '#rezerva';
})();
