(() => {
  const form = document.querySelector('[data-community-interest-form]');
  const status = document.querySelector('[data-community-form-status]');

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      motivation: String(data.get('motivation') || '').trim(),
      consent: data.get('consent') === 'on',
      website: String(data.get('website') || '').trim()
    };

    if (button) button.disabled = true;
    if (status) {
      status.classList.remove('is-error');
      status.textContent = 'Trimitem datele…';
    }

    try {
      const response = await fetch('/api/community-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Datele nu au putut fi trimise.');
      form.reset();
      if (status) status.textContent = 'Mulțumim! Datele tale au ajuns la noi. Revenim când avem un pas concret.';
    } catch (error) {
      if (status) {
        status.classList.add('is-error');
        status.textContent = error.message || 'A apărut o problemă. Te rugăm să încerci din nou.';
      }
    } finally {
      if (button) button.disabled = false;
    }
  });
})();
