(() => {
  const api = (path, options) => (window.adminApiFetch || fetch)(path, options);
  let enhancing = false;

  async function enhanceFamilies() {
    if (enhancing) return;
    const demo = document.getElementById('workspace-demo');
    const panel = demo?.querySelector('.crm-children-panel');
    const lists = panel?.querySelectorAll(':scope > .crm-child-list');
    if (!panel || lists?.length !== 2 || panel.dataset.familyNested === 'true') return;
    enhancing = true;
    try {
      const companionRows = [...lists[0].querySelectorAll('[data-companion]')];
      const childRows = [...lists[1].querySelectorAll('[data-child]')];
      const profiles = await Promise.all(companionRows.map(async row => {
        const response = await api(`/api/admin/crm/companions/${encodeURIComponent(row.dataset.companion)}`);
        return { row, payload: response.ok ? await response.json() : { companion: { children: [] } } };
      }));
      if (!panel.isConnected || panel.dataset.familyNested === 'true') return;
      const childrenById = new Map(childRows.map(row => [row.dataset.child, row]));
      const associated = new Set();
      const fragment = document.createDocumentFragment();
      const heading = document.createElement('div');
      heading.className = 'crm-panel-title crm-family-title';
      heading.innerHTML = '<div><span class="eyebrow">ÎNSOȚITORI & COPII</span><h3>Familii</h3></div>';
      fragment.append(heading);
      const familyList = document.createElement('div');
      familyList.className = 'crm-family-list';
      profiles.forEach(({ row, payload }) => {
        const children = payload.companion?.children || [];
        const card = document.createElement('article');
        card.className = 'crm-family-card';
        row.classList.remove('crm-child-row'); row.classList.add('crm-family-head');
        const main = row.querySelector('.crm-child-main');
        if (main) {
          const label = document.createElement('small'); label.textContent = 'ÎNSOȚITOR'; main.prepend(label);
          const count = document.createElement('em'); count.textContent = children.length === 1 ? '1 copil' : `${children.length} copii`; main.append(count);
        }
        card.append(row);
        const nested = document.createElement('div'); nested.className = 'crm-family-children';
        children.forEach(child => {
          const childRow = childrenById.get(child.id); if (!childRow) return;
          associated.add(child.id); childRow.classList.remove('crm-child-row'); childRow.classList.add('crm-family-child'); childRow.querySelector('.crm-child-last')?.remove(); nested.append(childRow);
        });
        if (!nested.children.length) nested.innerHTML = '<p class="crm-empty-line">Poți asocia copii din profilul lor.</p>';
        card.append(nested); familyList.append(card);
      });
      fragment.append(familyList);
      const unassigned = childRows.filter(row => !associated.has(row.dataset.child));
      if (unassigned.length) {
        const title = document.createElement('div'); title.className = 'crm-panel-title crm-unassigned-title'; title.innerHTML = `<div><span class="eyebrow">FĂRĂ ÎNSOȚITOR ALES</span><h3>${unassigned.length} ${unassigned.length === 1 ? 'copil' : 'copii'}</h3></div>`;
        const list = document.createElement('div'); list.className = 'crm-family-children crm-unassigned';
        unassigned.forEach(row => { row.classList.remove('crm-child-row'); row.classList.add('crm-family-child'); list.append(row); });
        fragment.append(title, list);
      }
      panel.replaceChildren(fragment); panel.dataset.familyNested = 'true';
    } finally { enhancing = false; }
  }

  function hideCompanionVisits() {
    const profile = document.querySelector('[data-profile]');
    const profileType = profile?.querySelector('.crm-profile-head .eyebrow')?.textContent?.trim();
    profile?.classList.toggle('is-companion-profile', profileType === 'ÎNSOȚITOR');
    const modal = document.querySelector('[data-modal]');
    const modalType = modal?.querySelector('.crm-form-card .eyebrow')?.textContent?.trim();
    if (modalType === 'OBSERVAȚIE DESPRE ÎNSOȚITOR') modal.querySelector('select[name="visit_id"]')?.closest('label')?.remove();
  }

  const original = window.renderCrmAdmin;
  if (original) window.renderCrmAdmin = async (...args) => { const result = await original(...args); enhanceFamilies(); return result; };
  new MutationObserver(() => { enhanceFamilies(); hideCompanionVisits(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
