(function () {
  const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));
  const api = (path, options) => (window.adminApiFetch || fetch)(path, options);
  const dateTime = value => new Intl.DateTimeFormat('ro-RO', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
  const firstAnswer = answers => { for (const value of Object.values(answers || {})) { const text = Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value ?? '').trim(); if (text) return text; } return 'Răspuns primit'; };

  async function renderInboxAdmin() {
    const demo = document.getElementById('workspace-demo');
    if (!demo) return;
    document.body.dataset.workspace = 'inbox';
    document.querySelector('.workspace')?.classList.add('hidden');
    document.getElementById('css-workspace')?.classList.add('hidden');
    document.getElementById('empty')?.classList.add('hidden');
    document.getElementById('editor')?.classList.add('hidden');
    document.querySelector('.top-actions')?.classList.add('overview-actions-hidden');
    document.querySelectorAll('.sidebar .side-link').forEach(link => link.classList.toggle('active', link.href.includes('view=inbox')));
    document.querySelector('.topbar h1').textContent = 'Inbox';
    document.querySelector('.topbar .subtitle').textContent = 'Răspunsuri recente din sursele Becky existente.';
    demo.className = 'workspace-demo inbox-workspace';
    demo.classList.remove('hidden');
    demo.innerHTML = '<div class="inbox-loading">Se încarcă intrările…</div>';
    try {
      const [eventResponse, playgroundResponse] = await Promise.all([api('/api/event-survey/results'), api('/api/playground-survey/results')]);
      if (!eventResponse.ok || !playgroundResponse.ok) throw new Error('Inbox unavailable');
      const [eventPayload, playgroundPayload] = await Promise.all([eventResponse.json(), playgroundResponse.json()]);
      const rows = [
        ...(Array.isArray(eventPayload.responses) ? eventPayload.responses : []).map(row => ({ id:`event-${row.id}`, date:row.submitted_at || row.submittedAt, source:'🎈 Evenimente', summary:firstAnswer(row.answers), href:'/admin?view=events' })),
        ...(Array.isArray(playgroundPayload.responses) ? playgroundPayload.responses : []).map(row => ({ id:`playground-${row.id}`, date:row.submitted_at || row.submittedAt, source:'🛝 Experiență Becky', summary:firstAnswer(row.answers), href:'/admin?view=playground' }))
      ].filter(row => row.date && !Number.isNaN(new Date(row.date).getTime())).sort((a, b) => new Date(b.date) - new Date(a.date));
      demo.innerHTML = `<div class="inbox-head"><div><span class="eyebrow">SOURCES EXISTENTE · READ-ONLY</span><h2>Inbox</h2><p>Răspunsurile sunt citite direct din dashboardurile sursă.</p></div><a class="inbox-back" href="/admin?view=overview">← Înapoi la Overview</a></div><div class="inbox-list">${rows.map(row => `<article class="inbox-row"><time>${safe(dateTime(row.date))}</time><strong>${safe(row.source)}</strong><p>${safe(row.summary)}</p><a href="${row.href}">Vezi în dashboard →</a></article>`).join('') || '<div class="inbox-empty">Nu există încă date.</div>'}</div>`;
    } catch {
      demo.innerHTML = '<div class="inbox-empty">Inbox-ul nu este disponibil momentan.</div>';
    }
  }
  window.renderInboxAdmin = renderInboxAdmin;
})();
