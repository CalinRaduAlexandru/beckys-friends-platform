(() => {
  const apiFetch = (path, options) => (window.adminApiFetch || fetch)(path, options);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  const formatDate = value => value ? new Intl.DateTimeFormat('ro-RO', { day:'numeric', month:'long', year:'numeric' }).format(new Date(`${value}T12:00:00`)) : '—';
  const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

  async function renderCrmAdmin() {
    const demo = document.getElementById('workspace-demo');
    if (!demo) return;
    document.body.dataset.workspace = 'crm';
    document.querySelector('.workspace')?.classList.add('hidden');
    document.getElementById('css-workspace')?.classList.add('hidden');
    document.getElementById('empty')?.classList.add('hidden');
    document.getElementById('editor')?.classList.add('hidden');
    document.querySelector('.top-actions')?.classList.add('overview-actions-hidden');
    document.querySelector('.topbar h1').textContent = 'Poate îi revăd';
    document.querySelector('.topbar .subtitle').textContent = 'Copii și istoricul simplu al vizitelor Becky.';
    document.querySelectorAll('.sidebar .side-link').forEach(link => link.classList.toggle('active', link.href.includes('view=crm')));
    demo.className = 'workspace-demo crm-workspace';
    demo.innerHTML = '<div class="crm-loading">Se încarcă…</div>';
    try {
      const response = await apiFetch('/api/admin/crm');
      if (!response.ok) throw new Error('Datele CRM nu sunt disponibile.');
      const payload = await response.json();
      const selectedId = new URLSearchParams(window.location.search).get('child') || '';
      paint(demo, Array.isArray(payload.children) ? payload.children : [], selectedId);
    } catch (error) {
      demo.innerHTML = `<section class="crm-empty"><h2>Nu am putut încărca CRM-ul.</h2><p>${escape(error.message)}</p></section>`;
    }
  }

  function paint(demo, children, selectedId = '') {
    const selected = children.find(child => child.id === selectedId) || null;
    demo.innerHTML = `<header class="crm-head"><div><span class="eyebrow">CRM COPII · V1</span><h2>Copiii pe care îi putem revedea</h2><p>Un istoric simplu, construit din vizitele înregistrate manual.</p></div><a class="crm-back" href="/admin?view=overview">← Înapoi la Overview</a></header><div class="crm-actions"><button class="primary" data-crm-add-child>＋ Adaugă copil</button><button class="crm-secondary" data-crm-add-visit>＋ Înregistrează vizită</button></div><div class="crm-layout"><section class="crm-children-panel"><div class="crm-panel-title"><div><span class="eyebrow">LISTĂ</span><h3>${children.length} ${children.length === 1 ? 'copil' : 'copii'}</h3></div></div><div class="crm-child-list">${children.map(child => `<button class="crm-child-row ${selected?.id === child.id ? 'is-selected' : ''}" data-crm-child="${escape(child.id)}"><span class="crm-child-avatar">${escape(child.first_name.slice(0, 1).toUpperCase())}</span><span class="crm-child-main"><strong>${escape(child.first_name)}</strong><small>${child.age} ${child.age === 1 ? 'an' : 'ani'} · ${child.visit_count} ${child.visit_count === 1 ? 'vizită' : 'vizite'}</small></span><span class="crm-child-last">${child.last_visit ? formatDate(child.last_visit) : 'Fără vizite'}</span><span class="crm-arrow">→</span></button>`).join('') || '<p class="crm-empty-line">Nu există încă copii.</p>'}</div></section><section class="crm-profile-panel" data-crm-profile>${selected ? profilePlaceholder(selected) : '<div class="crm-profile-empty"><span>♡</span><h3>Alege un copil</h3><p>Profilul și istoricul vizitelor apar aici.</p></div>'}</section></div><div class="crm-modal hidden" data-crm-modal></div>`;
    demo.querySelectorAll('[data-crm-child]').forEach(button => button.addEventListener('click', () => loadProfile(demo, children, button.dataset.crmChild)));
    demo.querySelector('[data-crm-add-child]').onclick = () => openChildModal(demo, children);
    demo.querySelector('[data-crm-add-visit]').onclick = () => openVisitModal(demo, children);
    if (selected) loadProfile(demo, children, selected.id);
  }

  function profilePlaceholder(child) { return `<div class="crm-profile-loading"><span class="crm-child-avatar">${escape(child.first_name.slice(0, 1).toUpperCase())}</span><p>Se încarcă istoricul…</p></div>`; }

  async function loadProfile(demo, children, childId) {
    const profile = demo.querySelector('[data-crm-profile]');
    const child = children.find(item => item.id === childId);
    if (!profile || !child) return;
    profile.innerHTML = profilePlaceholder(child);
    const response = await apiFetch(`/api/admin/crm/children/${encodeURIComponent(childId)}`);
    if (!response.ok) { profile.innerHTML = '<div class="crm-profile-empty"><h3>Profil indisponibil</h3></div>'; return; }
    const payload = await response.json();
    profile.innerHTML = `<div class="crm-profile-head"><div class="crm-profile-avatar">${escape(payload.child.first_name.slice(0, 1).toUpperCase())}</div><div class="crm-profile-identity"><span class="eyebrow">PROFIL COPIL</span><h3>${escape(payload.child.first_name)}</h3><p>${payload.child.age} ${payload.child.age === 1 ? 'an' : 'ani'} · ${payload.child.visit_count} ${payload.child.visit_count === 1 ? 'vizită' : 'vizite'}</p></div><button type="button" class="crm-edit-profile" data-crm-edit-profile>Editează profilul</button></div><div class="crm-profile-meta"><div><small>INTERESE</small><strong>${escape(payload.child.interests || 'Nu au fost notate')}</strong></div><div><small>ULTIMA VIZITĂ</small><strong>${formatDate(payload.child.last_visit)}</strong></div><div class="crm-continuity-meta"><small>DE UNDE CONTINUĂM DATA VIITOARE?</small><strong>${escape(payload.child.continuity || 'Nu este notat')}</strong></div></div><div class="crm-history"><div class="crm-section-label"><span class="eyebrow">ISTORIC</span><strong>${payload.visits.length} vizite</strong></div>${payload.visits.map(visit => `<article class="crm-visit"><time>${formatDate(visit.visit_date)}</time><p>${escape(visit.note || 'Fără notă.')}</p></article>`).join('') || '<p class="crm-empty-line">Nu există încă vizite.</p>'}</div>`;
    profile.querySelector('[data-crm-edit-profile]').onclick = () => openChildModal(demo, children, payload.child);
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'crm-delete-profile';
    deleteButton.textContent = 'Șterge copilul';
    deleteButton.onclick = async () => {
      if (!window.confirm(`Ștergi profilul lui ${payload.child.first_name}? Istoricul vizitelor va fi eliminat.`)) return;
      const response = await apiFetch(`/api/admin/crm/children/${encodeURIComponent(childId)}`, { method: 'DELETE' });
      if (!response.ok) return;
      const refreshed = await apiFetch('/api/admin/crm');
      const next = await refreshed.json();
      paint(demo, next.children || [], '');
    };
    profile.querySelector('.crm-profile-head')?.appendChild(deleteButton);
    demo.querySelectorAll('[data-crm-child]').forEach(button => button.classList.toggle('is-selected', button.dataset.crmChild === childId));
  }

  function openChildModal(demo, children, child = null) {
    const modal = demo.querySelector('[data-crm-modal]');
    modal.classList.remove('hidden');
    modal.innerHTML = `<form class="crm-form-card"><button type="button" class="crm-modal-close" data-crm-close>×</button><span class="eyebrow">${child ? 'PROFIL COPIL' : 'COPIL NOU'}</span><h3>${child ? 'Editează profilul' : 'Adaugă un copil'}</h3><label>Prenume<input name="first_name" maxlength="80" value="${escape(child?.first_name || '')}" required autofocus></label><label>Vârstă<input name="age" type="number" min="0" max="18" value="${child?.age ?? ''}" required></label><label>Interese <span>opțional</span><textarea name="interests" maxlength="240" placeholder="Ex. dinozauri, desen, mingi">${escape(child?.interests || '')}</textarea></label>${child ? `<label>De unde continuăm data viitoare? <span>opțional</span><textarea name="continuity" maxlength="500" placeholder="Ex. Continuăm podul mobil.">${escape(child.continuity || '')}</textarea></label>` : ''}<div class="crm-form-actions"><button type="button" class="crm-secondary" data-crm-close>Anulează</button><button class="primary">${child ? 'Salvează modificările' : 'Salvează copilul'}</button></div></form>`;
    modal.querySelectorAll('[data-crm-close]').forEach(button => button.onclick = () => modal.classList.add('hidden'));
    modal.querySelector('form').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await apiFetch(child ? `/api/admin/crm/children/${encodeURIComponent(child.id)}` : '/api/admin/crm/children', { method:child ? 'PATCH' : 'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ first_name:String(form.get('first_name')).trim(), age:Number(form.get('age')), interests:String(form.get('interests') || '').trim(), ...(child ? { continuity:String(form.get('continuity') || '').trim() } : {}) }) }); if (!response.ok) return; const savedChild = await response.json(); modal.classList.add('hidden'); const refreshed = await apiFetch('/api/admin/crm'); const payload = await refreshed.json(); paint(demo, payload.children || [], savedChild.id); };
  }

  function openVisitModal(demo, children) {
    if (!children.length) { window.alert('Adaugă mai întâi un copil.'); return; }
    const modal = demo.querySelector('[data-crm-modal]');
    modal.classList.remove('hidden');
    modal.innerHTML = `<form class="crm-form-card"><button type="button" class="crm-modal-close" data-crm-close>×</button><span class="eyebrow">VIZITĂ NOUĂ</span><h3>Înregistrează o vizită</h3><label>Copil<select name="child_id" required>${children.map(child => `<option value="${escape(child.id)}">${escape(child.first_name)}</option>`).join('')}</select></label><label>Data<input name="visit_date" type="date" value="${today()}" required></label><label>Notă <span>opțional</span><textarea name="note" maxlength="500" placeholder="Un detaliu scurt despre vizită"></textarea></label><div class="crm-form-actions"><button type="button" class="crm-secondary" data-crm-close>Anulează</button><button class="primary">Salvează vizita</button></div></form>`;
    modal.querySelectorAll('[data-crm-close]').forEach(button => button.onclick = () => modal.classList.add('hidden'));
    modal.querySelector('form').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await apiFetch('/api/admin/crm/visits', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ child_id:form.get('child_id'), visit_date:form.get('visit_date'), note:String(form.get('note') || '').trim() }) }); if (!response.ok) return; modal.classList.add('hidden'); const childId = form.get('child_id'); const refreshed = await apiFetch('/api/admin/crm'); const payload = await refreshed.json(); paint(demo, payload.children || [], childId); };
  }

  window.renderCrmAdmin = renderCrmAdmin;
})();
