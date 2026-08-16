(() => {
  const page = document.querySelector('.party-hero');
  if (!page) return;

  const cards = [...document.querySelectorAll('[data-package]')];
  const reservationLink = document.querySelector('[data-reservation-link]');
  const status = document.querySelector('[data-reservation-status]');
  const phone = '40752155115';

  cards.forEach(card => {
    card.querySelector('.package-cta')?.addEventListener('click', () => {
      const packageName = card.dataset.package;
      cards.forEach(item => item.classList.toggle('is-selected', item === card));
      if (reservationLink) {
        const message = `Bună! Aș dori detalii pentru ${packageName}.`;
        reservationLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      }
      if (status) status.textContent = `${packageName} selectat. Scrie-ne pe WhatsApp pentru disponibilitate și detalii.`;
    });
  });

  const headerCta = document.querySelector('.site-header .nav-cta');
  if (headerCta) headerCta.href = '#rezerva';
})();
