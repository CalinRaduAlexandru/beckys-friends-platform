(function () {
  const TYPES = [
    ['open', 'Program deschis'],
    ['party', 'Petrecere'],
    ['event', 'Eveniment'],
    ['reservation', 'Rezervare / acces doar cu rezervare'],
    ['private', 'Petrecere privată / spațiu indisponibil'],
    ['closed', 'Închis']
  ];
  const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));
  const api = (path, options) => (window.adminApiFetch || fetch)(path, options);
  const typeLabel = type => TYPES.find(item => item[0] === type)?.[1] || type;
  const dateLabel = value => new Intl.DateTimeFormat('ro-RO', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date(`${value}T12:00:00`));

  async function renderCalendarAdmin() {
    const demo = document.getElementById('workspace-demo');
    if (!demo) return;
    document.body.dataset.workspace = 'calendar';
    document.querySelector('.workspace')?.classList.add('hidden');
    document.getElementById('css-workspace')?.classList.add('hidden');
    document.getElementById('empty')?.classList.add('hidden');
    document.getElementById('editor')?.classList.add('hidden');
    document.querySelector('.top-actions')?.classList.add('overview-actions-hidden');
    document.querySelectorAll('.sidebar .side-link').forEach(link => link.classList.toggle('active', link.href.includes('view=calendar')));
    document.querySelector('.topbar h1').textContent = 'Calendar Becky';
    document.querySelector('.topbar .subtitle').textContent = 'Programul important al spațiului, introdus manual.';
    demo.className = 'workspace-demo calendar-admin-workspace';
    demo.classList.remove('hidden');
    demo.innerHTML = '<div class="calendar-admin-loading">Se încarcă calendarul…</div>';
    let entries = [];
    try {
      const response = await api('/api/admin/calendar');
      if (!response.ok) throw new Error('Calendar unavailable');
      entries = (await response.json()).entries || [];
    } catch {
      demo.innerHTML = '<div class="calendar-admin-empty">Calendarul nu este disponibil momentan.</div>';
      return;
    }
    const render = () => {
      const sorted = [...entries].sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`));
      demo.innerHTML = `<div class="calendar-admin-head"><div><span class="eyebrow">PROGRAM BECKY · V1</span><h2>Calendar Becky</h2><p>Adaugă manual momentele care schimbă programul și accesul spațiului.</p></div><button class="primary calendar-add" data-calendar-add>＋ Adaugă intrare</button></div><div class="calendar-admin-list">${sorted.map(entry => `<article class="calendar-admin-entry"><div class="calendar-entry-date"><strong>${safe(entry.date)}</strong><small>${safe(dateLabel(entry.date))}</small></div><div class="calendar-entry-main"><div><span class="calendar-type calendar-type-${safe(entry.type)}">${safe(typeLabel(entry.type))}</span><h3>${safe(entry.title)}</h3></div><p>${safe(entry.start_time)}–${safe(entry.end_time)}${entry.note ? ` · ${safe(entry.note)}` : ''}</p></div><div class="calendar-entry-actions"><button data-calendar-edit="${safe(entry.id)}">Editează</button><button class="danger-link" data-calendar-delete="${safe(entry.id)}">Șterge</button></div></article>`).join('') || '<div class="calendar-admin-empty">Nu există încă date.</div>'}</div><div class="calendar-modal hidden" id="calendar-modal"><form class="calendar-modal-card" id="calendar-form"><div class="calendar-modal-head"><div><span class="eyebrow">CALENDAR BECKY</span><h3 id="calendar-modal-title">Intrare nouă</h3></div><button type="button" class="overview-close" data-calendar-close>×</button></div><label>Titlu<input name="title" required maxlength="120"></label><label>Tip<select name="type">${TYPES.map(([value, label]) => `<option value="${value}">${safe(label)}</option>`).join('')}</select></label><div class="calendar-form-grid"><label>Data<input name="date" type="date" required></label><label>Ora început<input name="start_time" type="time" required></label><label>Ora sfârșit<input name="end_time" type="time" required></label></div><label>Notă opțională<textarea name="note" maxlength="280"></textarea></label><div class="calendar-modal-actions"><button type="button" class="secondary" data-calendar-close>Anulează</button><button class="primary" type="submit">Salvează</button></div></form></div>`;
      let editing = null;
      const modal = document.getElementById('calendar-modal');
      const form = document.getElementById('calendar-form');
      const open = entry => { editing = entry || null; modal.classList.remove('hidden'); form.title.value = entry?.title || ''; form.type.value = entry?.type || 'open'; form.date.value = entry?.date || new Date().toISOString().slice(0, 10); form.start_time.value = entry?.start_time || '10:00'; form.end_time.value = entry?.end_time || '18:00'; form.note.value = entry?.note || ''; document.getElementById('calendar-modal-title').textContent = entry ? 'Editează intrarea' : 'Intrare nouă'; form.title.focus(); };
      document.querySelector('[data-calendar-add]')?.addEventListener('click', () => open());
      document.querySelectorAll('[data-calendar-close]').forEach(button => button.addEventListener('click', () => modal.classList.add('hidden')));
      document.querySelectorAll('[data-calendar-edit]').forEach(button => button.addEventListener('click', () => open(entries.find(entry => entry.id === button.dataset.calendarEdit))));
      document.querySelectorAll('[data-calendar-delete]').forEach(button => button.addEventListener('click', async () => { const entry = entries.find(item => item.id === button.dataset.calendarDelete); if (!entry || !confirm(`Ștergi „${entry.title}”?`)) return; const response = await api(`/api/admin/calendar/${encodeURIComponent(entry.id)}`, { method:'DELETE' }); if (response.ok) { entries = entries.filter(item => item.id !== entry.id); render(); } }));
      form.addEventListener('submit', async event => { event.preventDefault(); const body = Object.fromEntries(new FormData(form)); const response = await api(editing ? `/api/admin/calendar/${encodeURIComponent(editing.id)}` : '/api/admin/calendar', { method: editing ? 'PATCH' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }); if (!response.ok) return; const saved = await response.json(); entries = editing ? entries.map(item => item.id === editing.id ? saved : item) : [...entries, saved]; render(); });
    };
    render();
  }
  window.renderCalendarAdmin = renderCalendarAdmin;
})();
