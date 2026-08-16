(() => {
  const form = document.querySelector('[data-community-newsletter]');
  const status = document.querySelector('[data-community-newsletter-status]');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (status) status.textContent = 'Bine ai venit în comunitatea Becky! Revenim curând cu noutăți.';
    form.reset();
  });
})();
