(() => {
  const page = document.querySelector('.party-hero');
  if (!page) return;

  const cards = [...document.querySelectorAll('[data-package]')];
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

  cards.forEach(card => {
    card.querySelector('.package-cta')?.addEventListener('click', () => {
      const packageName = card.dataset.package;
      cards.forEach(item => item.classList.toggle('is-selected', item === card));
      if (status) status.textContent = `${packageName} selectat. Scrie-ne pe WhatsApp pentru disponibilitate și detalii.`;
    });
  });

  const headerCta = document.querySelector('.site-header .nav-cta');
  if (headerCta) headerCta.href = '#rezerva';
})();
