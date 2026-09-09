(() => {
  const root = document.querySelector('[data-space-guide]');
  if (!root) return;
  const cards = [...root.querySelectorAll('[data-space-ages]')];
  const tabs = [...root.querySelectorAll('[data-space-filter]')];
  const matches = (card, filter) => filter === 'all' || card.dataset.spaceAges.split(',').includes(filter);
  const apply = filter => {
    tabs.forEach(tab => {
      const active = tab.dataset.spaceFilter === filter;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    cards.forEach(card => card.classList.toggle('is-hidden', !matches(card, filter)));
  };
  tabs.forEach(tab => tab.addEventListener('click', () => apply(tab.dataset.spaceFilter)));
  apply('all');
})();
