(() => {
  const filters = [...document.querySelectorAll('[data-event-filter]')];
  const cards = [...document.querySelectorAll('[data-event-category]')];
  const emptyState = document.querySelector('[data-events-empty]');

  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.eventFilter;
    let visibleCount = 0;
    filters.forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    cards.forEach(card => {
      const visible = filter === 'all' || card.dataset.eventCategory.split(' ').includes(filter);
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (emptyState) emptyState.hidden = visibleCount !== 0;
  }));

  const form = document.querySelector('[data-events-newsletter]');
  const status = document.querySelector('[data-newsletter-status]');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (status) status.textContent = 'Mulțumim! Te-am trecut pe lista de noutăți Becky.';
    form.reset();
  });
})();
