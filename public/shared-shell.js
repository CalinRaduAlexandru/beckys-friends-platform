(() => {
  const headerMarkup = `
    <a class="brand-lockup" href="/" aria-label="Becky’s Garden — acasă">
      <img class="nav-logo-full" src="/assets/logo/new_logo_horizontal.png" alt="Becky’s Garden">
      <img class="nav-logo" src="/assets/logo/new_logo_horizontal.png" alt="Becky’s Garden">
      <img class="brand-heart" src="/assets/heart_little.png" alt="">
      <span>Becky’s Garden</span>
      <img class="brand-heart" src="/assets/heart_little.png" alt="">
    </a>
    <nav class="site-nav" aria-label="Navigare principală">
      <a data-nav-page="overview" href="/#overview">Privire de ansamblu</a>
      <a data-nav-page="parties" href="/petreceri">Petreceri</a>
      <a data-nav-page="events" href="/evenimente">Evenimente</a>
      <a data-nav-page="community" href="/comunitate">Comunitate</a>
    </nav>
    <a class="whatsapp-link" href="https://wa.me/40752155115" target="_blank" rel="noopener" aria-label="Scrie pe WhatsApp la 0752 155 115">
      <svg class="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a9.7 9.7 0 0 0-8.4 14.6L2 22l5.6-1.5A9.7 9.7 0 1 0 12 2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3.3.9.9-3.2-.2-.3A8 8 0 1 1 12 19.7Zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.2 7.2 0 0 1-1.3-1.6c-.1-.2 0-.3.1-.4l.4-.5c.1-.1.1-.3.2-.4 0-.1 0-.3-.1-.4l-.7-1.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3a2.5 2.5 0 0 0-.8 1.9c0 1.1.8 2.2.9 2.3.1.2 1.6 2.5 3.9 3.5.5.2.9.4 1.2.5.5.2 1 .2 1.4.1.4-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2Z"/></svg>
      <span>0752 155 115</span>
    </a>
    <a class="nav-cta primary-cta" href="/#contact">Rezervă <span class="calendar-icon" aria-hidden="true"></span></a>
    <img class="nav-flags" src="/assets/long_flags.png" alt="">
  `;

  const headers = document.querySelectorAll('[data-shared-header]');
  headers.forEach(header => {
    header.classList.add('site-header');
    header.innerHTML = headerMarkup;
  });

  const syncHeaders = () => {
    headers.forEach(header => header.classList.toggle('is-scrolled', window.scrollY > 42));
  };

  const syncActiveNavigation = () => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    let activePage = 'overview';
    if (path === '/petreceri' || path === '/petreceri.html') activePage = 'parties';
    else if (path === '/evenimente' || path === '/evenimente.html' || hash === '#events') activePage = 'events';
    else if (path === '/comunitate' || hash === '#community') activePage = 'community';
    headers.forEach(header => header.querySelectorAll('[data-nav-page]').forEach(link => {
      const isActive = link.dataset.navPage === activePage;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }));
  };

  syncHeaders();
  syncActiveNavigation();
  window.addEventListener('scroll', syncHeaders, { passive: true });
  window.addEventListener('hashchange', syncActiveNavigation);
})();
