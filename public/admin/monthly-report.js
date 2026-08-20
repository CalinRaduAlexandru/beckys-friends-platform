(function () {
  const roles = [
    ["experienta-copilului", "Experiența copilului"],
    ["relatia-cu-parintii", "Relația cu părinții"],
    ["design-pedagogic", "Design pedagogic"],
    ["cultura-experienta-becky", "Cultura & experiența Becky"],
    ["marketing-comunicare", "Marketing & comunicare"],
    ["sisteme-tehnologie", "Sisteme & tehnologie"],
    ["operatiuni-logistica", "Operațiuni & logistică"],
    ["strategie-dezvoltare", "Strategie & dezvoltare"],
  ];
  const sections = [
    ["objectives", "OBIECTIVELE LUNII", "Ce mi-am propus concret."],
    ["metrics", "METRICI", "Cum voi urmări concret progresul."],
    ["done", "CE AM FĂCUT", "Acțiuni și implementări."],
    [
      "evidence",
      "DOVEZI / REZULTATE",
      "Numere, feedback, observații, livrabile, teste.",
    ],
    [
      "learned",
      "CE AM ÎNVĂȚAT",
      "Ce a funcționat / nu a funcționat și de ce cred asta.",
    ],
    ["next_step", "URMĂTORUL PAS", "Ce rezultă logic pentru luna următoare."],
  ];
  sections.unshift([
    "scope",
    "SCOP",
    "Direcția și rolul acestui domeniu în luna curentă.",
  ]);
  const statuses = [
    "În parametri",
    "Necesită atenție",
    "În urmă",
    "Fără suficiente date",
  ];
  const entryTypes = [
    ["done", "Făcut"],
    ["evidence", "Dovadă"],
    ["learned", "Învățare"],
  ];
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c],
    );
  const api = (url, options) =>
    fetch(url, { credentials: "same-origin", ...options });
  const filled = (role) =>
    sections.filter(([key]) => String(role.sections?.[key] || "").trim())
      .length;
  const today = () => new Date().toISOString().slice(0, 10);
  function daysUntil(date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(`${date}T00:00:00`) - now) / 86400000);
  }
  function roleFromQuery(report) {
    const id = new URLSearchParams(location.search).get("role");
    return (
      report.roles.find((role) => role.id === id)?.id || report.roles[0]?.id
    );
  }
  const repertoireStages = [
    ["welcome", "Întâmpin"],
    ["surprise_connect", "Surprind & conectez"],
    ["activities", "Activități"],
    ["next_visit_thread", "Fir pentru data viitoare"],
    ["memorable_close", "Final memorabil"],
  ];
  const repertoireAges = [["age_2", "2 ani"], ["age_3", "3–4 ani"], ["age_4_5", "5–6 ani"], ["age_6_7", "7–8 ani"], ["age_8_plus", "9+ ani"]];
  const repertoireStageLabels = Object.fromEntries(repertoireStages.map(([id, label]) => [id, label]));
  const repertoireCoverage = (ideaCount, validatedCount) => ideaCount === 0 ? ["Gol", "empty"] : validatedCount === 0 ? ["Nevalidat", "unvalidated"] : validatedCount <= 2 ? ["Începe să se lege", "partial"] : ["Bine validat", "validated"];
  const overlayFor = (item, age) => (item.age_overlays || []).find(overlay => overlay.age_group === age) || { validation_status: "idea" };
  function repertoireCell(items, age, stage, activityCount, previews, coverage, activityCoverage) {
    if (stage === "activities") { const activityValidated = activityCoverage?.validated ?? 0; const activityIdeas = activityCoverage?.idea ?? activityCount; const [activityLabel, activityTone] = repertoireCoverage(activityIdeas, activityValidated); return `<div class="experience-repertoire-cell experience-repertoire-activities coverage-${activityTone}"><header><strong>💡 ${activityIdeas} · ✓ ${activityValidated}</strong><small>${activityLabel}</small></header><span>${activityCount} ${activityCount === 1 ? "activitate" : "activități"} din Biblioteca Copii</span><a href="/admin/biblioteca-activitati-copii">Deschide Biblioteca →</a>${previews.length ? `<span>${previews.map(item => esc(item.title)).join(" · ")}</span>` : ""}</div>`; }
    const relevant = items.filter(item => item.age_groups?.includes(age) && item.stage === stage); const ideaCount = coverage?.[stage]?.idea ?? relevant.filter(item => overlayFor(item, age).validation_status !== "validated").length; const validatedCount = coverage?.[stage]?.validated ?? relevant.filter(item => overlayFor(item, age).validation_status === "validated").length; const total = ideaCount + validatedCount; const [coverageLabel, tone] = repertoireCoverage(total, validatedCount);
    return `<div class="experience-repertoire-cell coverage-${tone}" data-repertoire-cell data-age="${age}" data-stage="${stage}"><header><strong>💡 ${ideaCount} · ✓ ${validatedCount}</strong><small>${coverageLabel}</small></header><div class="experience-repertoire-chips">${relevant.slice(0, 3).map(item => `<button type="button" data-repertoire-edit="${esc(item.id)}">${overlayFor(item, age).validation_status === "validated" ? "✓" : "💡"} ${esc(item.title)}</button>`).join("")}</div><footer><button type="button" data-repertoire-view data-age="${age}" data-stage="${stage}">Vezi toate${relevant.length > 3 ? ` · +${relevant.length - 3}` : ""}</button><button type="button" data-repertoire-add data-age="${age}" data-stage="${stage}">＋</button></footer></div>`;
  }
  function experienceRepertoireMarkup() { return `<section class="experience-repertoire" id="experience-repertoire"><header class="experience-repertoire-head"><div><small>EXPERIENȚA COPILULUI</small><h3>Repertoriul experienței copilului</h3><p>Opțiuni reutilizabile pentru fiecare vârstă, nu un protocol rigid.</p><details class="experience-repertoire-legend"><summary aria-label="Cum se citește acoperirea">?</summary><span>○ Gol · 🔴 0 validate · 🟡 1–2 validate · 🟢 3+ validate</span></details></div><button type="button" data-repertoire-add>＋ Adaugă idee</button></header><div class="experience-repertoire-matrix" data-repertoire-matrix><p class="monthly-report-empty">Se încarcă repertoriul…</p></div><div class="experience-repertoire-modal" data-repertoire-modal hidden></div></section>`; }
  async function loadExperienceRepertoire(app) {
    if (!document.querySelector('link[data-experience-repertoire-css]')) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/admin/experience-repertoire.css?v=20260820-2'; link.dataset.experienceRepertoireCss = 'true'; document.head.appendChild(link); }
    const host = app.querySelector("[data-repertoire-matrix]"); if (!host) return;
    const response = await api("/api/admin/experience-repertoire"); if (!response.ok) { host.innerHTML = '<p class="monthly-report-empty">Repertoriul nu este disponibil momentan.</p>'; return; }
    const data = await response.json(); const items = data.items || []; host.innerHTML = `<div class="experience-repertoire-grid-head"><span>VÂRSTĂ</span>${repertoireStages.map(([, label]) => `<span>${label}</span>`).join("")}</div>${repertoireAges.map(([age, label]) => `<div class="experience-repertoire-row"><strong class="experience-repertoire-age">${label}</strong>${repertoireStages.map(([stage]) => repertoireCell(items, age, stage, data.activity_counts?.[age] || 0, data.activity_previews?.[age] || [], data.coverage?.[age], data.activity_coverage?.[age])).join("")}</div>`).join("")}`;
    const openForm = (item, age, stage) => { const modal = app.querySelector("[data-repertoire-modal]"); const selectedAges = item?.age_groups || (age ? [age] : []); const overlay = (id) => (item?.age_overlays || []).find(value => value.age_group === id) || {}; modal.hidden = false; modal.innerHTML = `<div class="experience-repertoire-dialog"><button type="button" data-repertoire-close>×</button><small>${item ? "EDITEAZĂ IDEEA" : "IDEE NOUĂ"}</small><h4>${item ? "Editează idee" : "Adaugă idee în repertoriu"}</h4><form><label>Etapă<select name="stage">${repertoireStages.filter(([id]) => id !== "activities").map(([id, label]) => `<option value="${id}" ${(item?.stage || stage) === id ? "selected" : ""}>${label}</option>`).join("")}</select></label><label>Titlu<input required maxlength="180" name="title" value="${esc(item?.title || "")}"></label><label>Descriere<textarea maxlength="5000" name="description">${esc(item?.description || "")}</textarea></label><label>Familie / concept<input maxlength="80" name="family" value="${esc(item?.family || "")}" placeholder="ex. emotional_interest"></label><fieldset><legend>Vârste și validare</legend>${repertoireAges.map(([id, label]) => { const value = overlay(id); return `<div class="experience-repertoire-age-form"><label><input type="checkbox" name="age_groups" value="${id}" ${selectedAges.includes(id) ? "checked" : ""}>${label}</label><select name="validation_${id}"><option value="idea" ${(value.validation_status || "idea") === "idea" ? "selected" : ""}>💡 Idee</option><option value="validated" ${value.validation_status === "validated" ? "selected" : ""}>✓ Validată</option></select><input name="note_${id}" maxlength="1000" placeholder="Adaptare / notă pentru vârstă" value="${esc(value.age_specific_note || "")}"><input name="restriction_${id}" maxlength="1000" placeholder="Restricție / siguranță (opțional)" value="${esc(value.restriction || "")}"></div>`; }).join("")}</fieldset><div class="experience-repertoire-form-actions">${item ? '<button type="button" data-repertoire-archive>Arhivează</button>' : ""}<button type="button" data-repertoire-close>Anulează</button><button class="primary" type="submit">Salvează</button></div></form></div>`;
      modal.querySelector("[data-repertoire-close]")?.addEventListener("click", () => { modal.hidden = true; }); modal.querySelector("form").onsubmit = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const age_groups = form.getAll("age_groups"); const payload = { stage: form.get("stage"), title: String(form.get("title") || "").trim(), description: String(form.get("description") || "").trim(), family: String(form.get("family") || "").trim() || null, age_groups, age_overlays: age_groups.map(id => ({ age_group: id, validation_status: form.get(`validation_${id}`) || "idea", age_specific_note: String(form.get(`note_${id}`) || "").trim() || null, restriction: String(form.get(`restriction_${id}`) || "").trim() || null })) }; const result = await api(item ? `/api/admin/experience-repertoire/${encodeURIComponent(item.id)}` : "/api/admin/experience-repertoire", { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); if (result.ok) { modal.hidden = true; await loadExperienceRepertoire(app); } }; modal.querySelector("[data-repertoire-archive]")?.addEventListener("click", async () => { const result = await api(`/api/admin/experience-repertoire/${encodeURIComponent(item.id)}`, { method: "DELETE" }); if (result.ok) { modal.hidden = true; await loadExperienceRepertoire(app); } }); };
    const openList = (age, stage) => { const modal = app.querySelector("[data-repertoire-modal]"); const relevant = items.filter(item => item.age_groups?.includes(age) && item.stage === stage); const help = stage === "next_visit_thread" ? '<aside class="experience-repertoire-help"><strong>Fir pentru data viitoare</strong><span>DESCOPĂR CE ÎI PLACE → AVEM UN MOMENT BUN ÎMPREUNĂ → CREEZ O CONTINUARE → RIDIC PUȚIN ȘTACHETA → ÎI SPUN CĂ DATA VIITOARE CONTINUĂM</span><small>Scop: anticipare + continuitate relațională.</small></aside>' : stage === "surprise_connect" ? '<aside class="experience-repertoire-help"><strong>Vrei să vezi un truc de magie?</strong><small>Un mecanism scurt de surpriză și conectare, adaptat vârstei.</small></aside>' : ""; modal.hidden = false; modal.innerHTML = `<div class="experience-repertoire-dialog"><button type="button" data-repertoire-close>×</button><small>${esc(repertoireAges.find(item => item[0] === age)?.[1] || "VÂRSTĂ")} · ${esc(repertoireStageLabels[stage] || "ETAPĂ")}</small><h4>${relevant.length ? "Idei din această celulă" : "Celula este goală"}</h4>${help}${relevant.map(item => { const value = overlayFor(item, age); const fallback = item.fallback_item_id ? items.find(candidate => candidate.id === item.fallback_item_id) : null; return `<article class="experience-repertoire-list-item"><strong>${value.validation_status === "validated" ? "✓" : "💡"} ${esc(item.title)}</strong><p>${esc(item.description)}</p>${item.family ? `<small>Familie: ${esc(item.family)}</small>` : ""}${value.age_specific_note ? `<small>Adaptare: ${esc(value.age_specific_note)}</small>` : ""}${value.restriction ? `<small class="repertoire-restriction">Siguranță: ${esc(value.restriction)}</small>` : ""}${fallback ? `<small>Fallback dacă nu răspunde: ${esc(fallback.title)}</small>` : ""}${item.source_type || item.source_id ? `<small>Sursă: ${esc(item.source_type || "")} ${esc(item.source_id || "")}</small>` : ""}<button type="button" data-repertoire-list-edit="${esc(item.id)}">Editează</button></article>`; }).join("") || '<p class="monthly-report-empty">Adaugă prima idee pentru această combinație.</p>'}<button type="button" class="primary" data-repertoire-list-add data-age="${age}" data-stage="${stage}">＋ Adaugă idee</button></div>`; modal.querySelector("[data-repertoire-close]")?.addEventListener("click", () => { modal.hidden = true; }); modal.querySelector("[data-repertoire-list-add]")?.addEventListener("click", () => openForm(null, age, stage)); modal.querySelectorAll("[data-repertoire-list-edit]").forEach(button => button.addEventListener("click", () => openForm(items.find(item => item.id === button.dataset.repertoireListEdit), age, stage))); };
    app.querySelector("[data-repertoire-add]")?.addEventListener("click", () => openForm()); app.querySelectorAll("[data-repertoire-add][data-stage]").forEach(button => button.addEventListener("click", () => openForm(null, button.dataset.age, button.dataset.stage))); app.querySelectorAll("[data-repertoire-edit]").forEach(button => button.addEventListener("click", () => openForm(items.find(item => item.id === button.dataset.repertoireEdit)))); app.querySelectorAll("[data-repertoire-view]").forEach(button => button.addEventListener("click", () => openList(button.dataset.age, button.dataset.stage)));
  }
  const pedagogicAges = ["1–2 ani", "3–4 ani", "5–6 ani", "7–8 ani", "9+ ani"];
  const pedagogicParticipants = ["Individual", "2–3 copii", "4–9 copii", "10+ copii"];
  const pedagogicDomains = ["Gândește", "Simte", "Colaborează", "Devine independent", "Creează", "Se mișcă"];
  const coverageTone = (ideas, validated) => ideas === 0 ? "empty" : validated === 0 ? "unvalidated" : validated <= 2 ? "partial" : "validated";
  function pedagogicCoverageMarkup() { return `<section class="pedagogic-coverage" id="pedagogic-coverage"><header class="experience-repertoire-head"><div><small>DESIGN PEDAGOGIC</small><h3>Matrici de acoperire</h3><p>Vezi unde avem idei și ce este validat în practică.</p></div><button type="button" data-themed-add>＋ Adaugă activitate tematică</button></header><div class="pedagogic-coverage-controls"><label>Domeniu<select data-pedagogic-domain><option value="all">Toate</option>${pedagogicDomains.map(domain => `<option>${esc(domain)}</option>`).join("")}</select></label><span>💡 idei · ✓ validări</span></div><div data-pedagogic-source="library"></div><div data-pedagogic-source="themed"></div><div class="experience-repertoire-modal" data-themed-modal hidden></div></section>`; }
  function pedagogicMatrix(source, data, domain) {
    const rows = data[source] || [];
    const title = source === "library" ? "Biblioteca Copii" : "Activități tematice Becky";
    const note = source === "library" ? "Sursă read-only. Biblioteca nu are încă validare canonică pe combinația vârstă × participanți; validările afișate rămân 0." : "Activități create pentru facilitatori, cu validare separată pentru fiecare combinație.";
    const findActivities = (age, participant) => (source === "library" ? (data.library_activities || []) : (data.themed_activities || [])).filter(item => (item.age_categories || []).includes(age) && (item.participant_categories || []).includes(participant) && (domain === "all" || (item.category || "") === domain));
    return `<section class="pedagogic-matrix-section"><div class="pedagogic-matrix-heading"><div><small>${title}</small><h4>${source === "library" ? "Acoperire din activitățile existente" : "Catalog separat pentru activități tematice"}</h4><p>${note}</p></div>${source === "themed" ? `<button type="button" data-themed-add>＋ Activitate</button>` : ""}</div><div class="pedagogic-matrix"><div class="pedagogic-matrix-row pedagogic-matrix-header"><span>VÂRSTĂ</span>${pedagogicParticipants.map(p => `<span>${p}</span>`).join("")}</div>${rows.map(row => `<div class="pedagogic-matrix-row"><strong>${row.age}</strong>${row.cells.map(cell => { const domains = cell.domains.filter(item => domain === "all" || item.category === domain); const ideas = domains.reduce((sum,item) => sum + item.ideas, 0); const validated = domains.reduce((sum,item) => sum + item.validated, 0); const activities = findActivities(row.age, cell.participant); return `<button type="button" class="pedagogic-cell coverage-${coverageTone(ideas, validated)}" data-pedagogic-cell data-source="${source}" data-age="${esc(row.age)}" data-participant="${esc(cell.participant)}"><b>💡 ${ideas} · ✓ ${validated}</b><small>${activities.slice(0,2).map(item => esc(item.title)).join(" · ") || "Fără activități"}</small></button>`; }).join("")}</div>`).join("")}</div></section>`;
  }
  async function loadPedagogicCoverage(app) {
    if (!document.querySelector('link[data-experience-repertoire-css]')) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/admin/experience-repertoire.css?v=20260820-3'; link.dataset.experienceRepertoireCss = 'true'; document.head.appendChild(link); }
    const response = await api('/api/admin/pedagogic-coverage'); const host = app.querySelector('#pedagogic-coverage'); if (!host) return; if (!response.ok) { host.innerHTML += '<p class="monthly-report-empty">Matricile nu sunt disponibile momentan.</p>'; return; }
    const data = await response.json(); const renderMatrices = () => { const domain = app.querySelector('[data-pedagogic-domain]').value; app.querySelector('[data-pedagogic-source="library"]').innerHTML = pedagogicMatrix('library', data, domain); app.querySelector('[data-pedagogic-source="themed"]').innerHTML = pedagogicMatrix('themed', data, domain); bind(); };
    const modal = app.querySelector('[data-themed-modal]');
    const openEditor = (item = null) => { const validations = item?.validations || []; const validation = (age, participant) => validations.find(v => v.age_category === age && v.participant_category === participant)?.validation_status || 'idea'; modal.hidden = false; modal.innerHTML = `<div class="experience-repertoire-dialog"><button type="button" data-themed-close>×</button><small>${item ? 'EDITEAZĂ ACTIVITATEA' : 'ACTIVITATE TEMATICĂ NOUĂ'}</small><h4>${item ? 'Editează activitate' : 'Adaugă activitate tematică'}</h4><form><label>Titlu<input required name="title" value="${esc(item?.title || '')}"></label><label>Descriere<textarea name="subtitle">${esc(item?.subtitle || '')}</textarea></label><label>Categorie<select name="category">${pedagogicDomains.map(v => `<option ${v === item?.category ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label><label>Implementare<input required name="implementation" value="${esc(item?.implementation || 'Fără echipament')}"></label><fieldset><legend>Vârste</legend>${pedagogicAges.map(age => `<label><input type="checkbox" name="ages" value="${age}" ${(item?.age_categories || []).includes(age) ? 'checked' : ''}>${age}</label>`).join('')}</fieldset><fieldset><legend>Participanți</legend>${pedagogicParticipants.map(p => `<label><input type="checkbox" name="participants" value="${p}" ${(item?.participant_categories || []).includes(p) ? 'checked' : ''}>${p}</label>`).join('')}</fieldset><fieldset><legend>Validare pentru combinații selectate</legend><div class="themed-validation-grid">${pedagogicAges.map(age => pedagogicParticipants.map(p => `<label>${age} · ${p}<select data-validation-age="${age}" data-validation-participant="${p}"><option value="idea" ${validation(age,p)==='idea'?'selected':''}>💡 Idee</option><option value="validated" ${validation(age,p)==='validated'?'selected':''}>✓ Validată</option></select></label>`).join('')).join('')}</div></fieldset><div class="experience-repertoire-form-actions">${item ? '<button type="button" data-themed-delete>Șterge</button>' : ''}<button type="button" data-themed-close>Anulează</button><button class="primary" type="submit">Salvează</button></div></form></div>`; modal.querySelectorAll('[data-themed-close]').forEach(b => b.onclick = () => { modal.hidden = true; }); modal.querySelector('form').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const ages = form.getAll('ages'); const participants = form.getAll('participants'); const payload = { title: form.get('title'), subtitle: form.get('subtitle'), category: form.get('category'), implementation: form.get('implementation'), age_categories: ages, participant_categories: participants, validations: ages.flatMap(age => participants.map(participant => ({ age_category: age, participant_category: participant, validation_status: modal.querySelector(`[data-validation-age="${age}"][data-validation-participant="${participant}"]`)?.value || 'idea' }))) }; const result = await api(item ? `/api/admin/becky-themed-activities/${encodeURIComponent(item.id)}` : '/api/admin/becky-themed-activities', { method: item ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if (result.ok) { modal.hidden = true; const refreshed = await api('/api/admin/pedagogic-coverage'); Object.assign(data, await refreshed.json()); renderMatrices(); } }; modal.querySelector('[data-themed-delete]')?.addEventListener('click', async () => { if ((await api(`/api/admin/becky-themed-activities/${encodeURIComponent(item.id)}`, {method:'DELETE'})).ok) { modal.hidden = true; const refreshed = await api('/api/admin/pedagogic-coverage'); Object.assign(data, await refreshed.json()); renderMatrices(); } }); };
    const bind = () => { app.querySelectorAll('[data-themed-add]').forEach(button => button.onclick = () => openEditor()); app.querySelectorAll('[data-pedagogic-cell]').forEach(button => button.onclick = () => { if (button.dataset.source === 'themed') { const item = (data.themed_activities || []).find(candidate => (candidate.age_categories || []).includes(button.dataset.age) && (candidate.participant_categories || []).includes(button.dataset.participant)); if (item) openEditor(item); } else window.location.href = '/admin/biblioteca-activitati-copii'; }); };
    app.querySelector('[data-pedagogic-domain]').addEventListener('change', renderMatrices); renderMatrices();
  }
  function renderNotes(report) {
    const app =
      document.querySelector("#app") || document.querySelector("main");
    app.innerHTML = `<section class="monthly-report-shell"><div class="monthly-report-header"><div><small class="monthly-report-eyebrow">ADMIN · RAPORT LUNAR V1</small><h1>Note zilnice</h1><p>Un jurnal comun pentru toate rolurile. Poți folosi <strong>@rol</strong> ca să marchezi contextul unei note.</p></div><a class="monthly-report-back" href="/admin?view=monthly-report">← Înapoi la roluri</a></div><div class="monthly-report-notes-layout"><form class="monthly-report-editor monthly-report-note-form"><label>Data<input id="daily-note-date" type="date" value="${today()}"></label><label>Notă zilnică<textarea id="daily-note-text" placeholder="Ex. @design-pedagogic Am testat..."></textarea></label><div id="daily-note-analysis-state"></div><div class="monthly-report-actions"><span id="daily-note-message"></span><button type="button" id="daily-note-analyze">✨ Analizează nota</button><button class="primary" type="submit">Salvează nota</button></div></form><section class="monthly-report-editor"><div class="monthly-report-editor-head"><h2>Jurnal</h2><a class="monthly-report-tab-link" href="/admin?view=becky-inbox">Deschide Becky Inbox →</a></div><div class="monthly-report-notes-list">${
      Object.entries(report.notes || {})
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(
          ([date, text]) =>
            `<article tabindex="0" data-note-date="${esc(date)}"><time>${esc(date)}</time><p>${esc(text)}</p></article>`,
        )
        .join("") || '<p class="monthly-report-empty">Nu există încă note.</p>'
    }</div></section></div></section>`;
    let memorySignals = [],
      attentionCandidates = [];
    const refreshAnalysisState = (date) => {
      const host = app.querySelector("#daily-note-analysis-state");
      const button = app.querySelector("#daily-note-analyze");
      if (!host || !button) return;
      const signals = memorySignals.filter(
        (item) => item.source_note_id === date && !item.stale,
      );
      const relevantAttention = attentionCandidates.filter((item) =>
        (item.evidence_signal_ids || []).some((id) => signals.some((signal) => signal.id === id)),
      );
      if (!signals.length) {
        host.innerHTML = "";
        button.hidden = false;
        button.textContent = "✨ Procesează nota";
        return;
      }
      host.innerHTML = `<div class="monthly-note-analysis-summary"><strong>✓ ${signals.length} ${signals.length === 1 ? "semnal păstrat" : "semnale păstrate"} în memoria Becky</strong><span>${relevantAttention.length ? `${relevantAttention.length} lucru${relevantAttention.length === 1 ? "" : "ri"} merită atenție.` : "Nimic nu necesită atenția ta acum."}</span><a href="/admin?view=becky-inbox&source_id=${encodeURIComponent(date)}">Vezi memoria →</a></div>`;
      button.hidden = true;
    };
    const loadNote = (date) => {
      app.querySelector("#daily-note-date").value = date;
      app.querySelector("#daily-note-text").value = report.notes?.[date] || "";
      refreshAnalysisState(date);
      app.querySelector("#daily-note-text").focus();
    };
    app.querySelector("#daily-note-text").value = report.notes?.[today()] || "";
    app
      .querySelector("#daily-note-date")
      .addEventListener("change", (e) => loadNote(e.target.value));
    app.querySelectorAll("[data-note-date]").forEach((note) => {
      note.addEventListener("click", () => loadNote(note.dataset.noteDate));
      note.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          loadNote(note.dataset.noteDate);
        }
      });
    });
    app
      .querySelector(".monthly-report-note-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const date = app.querySelector("#daily-note-date").value;
        const text = app.querySelector("#daily-note-text").value;
        const response = await api("/api/admin/monthly-report/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, text }),
        });
        if (!response.ok) return;
        report.notes = (await response.json()).notes || report.notes;
        renderNotes(report);
      });
    app
      .querySelector("#daily-note-analyze")
      .addEventListener("click", async () => {
        const button = app.querySelector("#daily-note-analyze");
        const message = app.querySelector("#daily-note-message");
        const date = app.querySelector("#daily-note-date").value;
        const text = app.querySelector("#daily-note-text").value.trim();
        if (!text) {
          message.textContent = "Scrie nota înainte de analiză.";
          return;
        }
        button.disabled = true;
        message.textContent = "Salvez și analizez nota…";
        const saved = await api("/api/admin/monthly-report/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, text }),
        });
        if (!saved.ok) {
          message.textContent = "Nota nu a putut fi salvată.";
          button.disabled = false;
          return;
        }
        const response = await api("/api/admin/becky-memory/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date }),
        });
        const result = await response.json();
        if (!response.ok) {
          message.textContent = result.error || "Analiza nu a reușit.";
          button.disabled = false;
          return;
        }
        location.href = `/admin?view=becky-inbox&source_id=${encodeURIComponent(date)}`;
      });
    Promise.all([
      api("/api/admin/becky-memory/signals"),
      api("/api/admin/becky-memory/attention"),
    ]).then(async ([signalsResponse, attentionResponse]) => {
      memorySignals = signalsResponse.ok
        ? (await signalsResponse.json()).signals || []
        : [];
      attentionCandidates = attentionResponse.ok
        ? (await attentionResponse.json()).candidates || []
        : [];
      refreshAnalysisState(app.querySelector("#daily-note-date").value);
    });
  }
  function entryRolesHtml(selectedIds) {
    return roles
      .map(
        ([id, label]) =>
          `<label class="monthly-entry-role"><input type="checkbox" name="monthly-entry-role" value="${id}" ${selectedIds.includes(id) ? "checked" : ""}><span>${esc(label)}</span></label>`,
      )
      .join("");
  }
  function entryTypeLabel(type) {
    return entryTypes.find((item) => item[0] === type)?.[1] || type;
  }
  async function renderEntries(app, report, selected) {
    const host = app.querySelector(".monthly-report-entries");
    if (!host) return;
    host.innerHTML =
      '<p class="monthly-report-empty">Se încarcă intrările…</p>';
    const response = await api(
      `/api/admin/monthly-report/entries?month_key=${encodeURIComponent(report.month_key)}&role_id=${encodeURIComponent(selected.id)}`,
    );
    if (!response.ok) {
      host.innerHTML =
        '<p class="monthly-report-empty">Intrările nu sunt disponibile momentan.</p>';
      return;
    }
    const entries = (await response.json()).entries || [];
    host.innerHTML = `<div class="monthly-report-entries-head"><div><span>INTRĂRI ALE LUNII</span><small>Memorie granulară, separată de sinteza rolului.</small></div><button class="monthly-entry-add" type="button">＋ Adaugă intrare</button></div>${
      entries.length
        ? `<div class="monthly-report-entry-list">${entries
            .map((entry) => {
              const others = entry.role_ids
                .filter((id) => id !== selected.id)
                .map((id) => roles.find((role) => role[0] === id)?.[1])
                .filter(Boolean);
              return `<article class="monthly-report-entry" data-entry-id="${esc(entry.id)}"><div class="monthly-entry-meta"><time>${esc(entry.entry_date)}</time><b class="entry-type-${esc(entry.type)}">${esc(entryTypeLabel(entry.type))}</b>${others.length ? `<span>Și: ${esc(others.join(", "))}</span>` : ""}</div><p>${esc(entry.text)}</p><div class="monthly-entry-actions"><button type="button" data-entry-edit="${esc(entry.id)}">Editează</button><button type="button" data-entry-delete="${esc(entry.id)}">Șterge</button></div></article>`;
            })
            .join("")}</div>`
        : '<p class="monthly-report-empty">Nu există încă intrări pentru acest rol.</p>'
    }`;
    const openForm = (entry) => {
      const editing = Boolean(entry);
      const selectedIds = entry?.role_ids || [selected.id];
      const modal = document.createElement("div");
      modal.className = "monthly-entry-modal";
      modal.innerHTML = `<div class="monthly-entry-dialog" role="dialog" aria-modal="true"><div class="monthly-entry-dialog-head"><h3>${editing ? "Editează intrarea" : "Adaugă intrare"}</h3><button type="button" data-entry-close aria-label="Închide">×</button></div><form><label>Data<input required type="date" name="entry_date" value="${esc(entry?.entry_date || today())}"></label><label>Tip<select name="type">${entryTypes.map(([value, label]) => `<option value="${value}" ${entry?.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><fieldset><legend>Roluri</legend>${entryRolesHtml(selectedIds)}</fieldset><label>Text<textarea required name="text" maxlength="5000" placeholder="Scrie o intrare clară și datată…">${esc(entry?.text || "")}</textarea></label><div class="monthly-report-actions"><span class="monthly-entry-form-message"></span><button class="primary" type="submit">Salvează</button></div></form></div>`;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal
        .querySelector("[data-entry-close]")
        .addEventListener("click", close);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
      });
      modal.querySelector("form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const roleIds = [
          ...form.querySelectorAll('input[name="monthly-entry-role"]:checked'),
        ].map((input) => input.value);
        const message = form.querySelector(".monthly-entry-form-message");
        if (!roleIds.length) {
          message.textContent = "Alege cel puțin un rol.";
          return;
        }
        const payload = {
          month_key: report.month_key,
          entry_date: form.querySelector('[name="entry_date"]').value,
          type: form.querySelector('[name="type"]').value,
          role_ids: roleIds,
          text: form.querySelector('[name="text"]').value,
        };
        const response = await api(
          editing
            ? `/api/admin/monthly-report/entries/${encodeURIComponent(entry.id)}`
            : "/api/admin/monthly-report/entries",
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) {
          message.textContent = "Nu am putut salva intrarea.";
          return;
        }
        close();
        renderEntries(app, report, selected);
      });
    };
    host
      .querySelector(".monthly-entry-add")
      .addEventListener("click", () => openForm());
    host
      .querySelectorAll("[data-entry-edit]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          openForm(
            entries.find((entry) => entry.id === button.dataset.entryEdit),
          ),
        ),
      );
    host.querySelectorAll("[data-entry-delete]").forEach((button) =>
      button.addEventListener("click", async () => {
        if (!window.confirm("Ștergi această intrare?")) return;
        const response = await api(
          `/api/admin/monthly-report/entries/${encodeURIComponent(button.dataset.entryDelete)}`,
          { method: "DELETE" },
        );
        if (response.ok) renderEntries(app, report, selected);
      }),
    );
  }
  function render(report, selectedId) {
    const total = report.roles.length * sections.length;
    const complete = report.roles.reduce((sum, role) => sum + filled(role), 0);
    const days = daysUntil(report.due_date);
    const selected =
      report.roles.find((role) => role.id === selectedId) || report.roles[0];
    document.body.dataset.workspace = "monthly-report";
    document
      .querySelectorAll(".sidebar .side-link")
      .forEach((link) =>
        link.classList.toggle(
          "active",
          link.classList.contains("monthly-report-link"),
        ),
      );
    const app =
      document.querySelector("#app") ||
      document.querySelector("main") ||
      document.body;
    app.innerHTML = `<section class="monthly-report-shell"><div class="monthly-report-header"><div><small class="monthly-report-eyebrow">ADMIN · RAPORT LUNAR V1</small><h1>Raport Lunar</h1><p>Un spațiu simplu pentru a nota ce ai urmărit, ce ai făcut și care este următorul pas.</p></div><div class="monthly-report-deadline"><strong>${days >= 0 ? `Mai sunt ${days} zile` : `Termen depășit cu ${Math.abs(days)} zile`}</strong><span>până la trimitere · 2 septembrie</span></div></div><div class="monthly-report-progress"><strong>${complete} / ${total} secțiuni completate</strong><div><i style="width:${total ? (complete / total) * 100 : 0}%"></i></div></div><div class="monthly-report-layout"><nav class="monthly-report-roles"><small>ROLURI</small>${report.roles.map((role) => `<a class="monthly-report-role ${role.id === selected.id ? "is-selected" : ""}" href="/admin?view=monthly-report&role=${encodeURIComponent(role.id)}"><span>${esc(role.label)}</span><em class="status-${statuses.indexOf(role.status)}">${esc(role.status)}</em><b>${filled(role)}/7</b></a>`).join("")}</nav><article class="monthly-report-editor"><div class="monthly-report-editor-head"><div><small>ROL SELECTAT</small><h2>${esc(selected.label)}</h2></div><label>Status<select id="monthly-status">${statuses.map((status) => `<option ${status === selected.status ? "selected" : ""}>${esc(status)}</option>`).join("")}</select></label></div><div class="monthly-report-fields">${sections.map(([key, label, hint]) => `<label><span>${label}</span><small>${hint}</small><textarea data-section="${key}" placeholder="Scrie aici..."></textarea></label>`).join("")}</div><div class="monthly-report-actions"><span id="monthly-save-message"></span><button class="primary" id="monthly-save">Salvează rolul</button></div><section class="monthly-report-entries" aria-labelledby="monthly-entries-title"></section>${selected.id === "experienta-copilului" ? experienceRepertoireMarkup() : selected.id === "design-pedagogic" ? pedagogicCoverageMarkup() : ""}</article></div></section>`;
    app
      .querySelector(".monthly-report-header")
      ?.insertAdjacentHTML(
        "beforeend",
        '<a class="monthly-report-tab-link" href="/admin?view=monthly-report&tab=notes">Note zilnice</a>',
      );
    sections.forEach(([key]) => {
      const field = app.querySelector(`[data-section="${key}"]`);
      if (field) field.value = selected.sections?.[key] || "";
    });
    app.querySelector("#monthly-save").addEventListener("click", async () => {
      const button = app.querySelector("#monthly-save");
      button.disabled = true;
      const body = {
        status: app.querySelector("#monthly-status").value,
        sections: Object.fromEntries(
          sections.map(([key]) => [
            key,
            app.querySelector(`[data-section="${key}"]`).value,
          ]),
        ),
      };
      try {
        const response = await api(
          `/api/admin/monthly-report/roles/${encodeURIComponent(selected.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!response.ok) throw new Error();
        const result = await response.json();
        render(
          {
            ...report,
            roles: report.roles.map((role) =>
              role.id === selected.id ? result.role : role,
            ),
          },
          selected.id,
        );
      } catch {
        const message = app.querySelector("#monthly-save-message");
        if (message)
          message.textContent = "Nu am putut salva. Încearcă din nou.";
        button.disabled = false;
      }
    });
    renderEntries(app, report, selected);
    if (selected.id === "experienta-copilului") loadExperienceRepertoire(app);
    if (selected.id === "design-pedagogic") loadPedagogicCoverage(app);
  }
  window.renderMonthlyReportAdmin = async function () {
    const app =
      document.querySelector("#app") || document.querySelector("main");
    if (app) app.classList.add("monthly-report-app");
    const response = await api("/api/admin/monthly-report");
    if (!response.ok) {
      if (app)
        app.innerHTML =
          '<section class="monthly-report-error">Raportul lunar nu este disponibil momentan.</section>';
      return;
    }
    const data = await response.json();
    if (new URLSearchParams(location.search).get("tab") === "notes")
      renderNotes(data.report);
    else render(data.report, roleFromQuery(data.report));
  };
})();
