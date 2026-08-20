/* Legacy proposal copy retained for archival links: ✓ Adaugă în CRM · ✓ Adaugă testarea · ✓ Adaugă în raport · ✓ Adăugat în CRM-ul lui · ✓ Testare adăugată la · ✓ Adăugat în Raportul Lunar · CE AM GĂSIT · UNDE VA AJUNGE · CE SE VA ÎNTÂMPLA · De verificat · Păstrate · Ignorate · Necesită atenție · Anulează schimbarea · Vezi în Bibliotecă · Vezi în CRM · Vezi în Raport · BECKY BRIEF · DE CE CONTEAZĂ · CE MERITĂ ÎNCERCAT · Vezi dovezile · Vezi schimbările propuse */
(function () {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const api = (url, options) => fetch(url, { credentials: "same-origin", ...options });
  const targets = [
    ["operational_manual", "Manualul Operațional"],
    ["puieti_de_oameni", "Puieți de Oameni"],
    ["community_guide", "Ghidul Comunității"],
    ["strategic_plan", "Planul Strategic"],
  ];
  let signals = [], attention = [], context = { children: [] }, layer = "summary";
  const sourceId = new URLSearchParams(location.search).get("source_id") || "";
  const date = (value) => {
    const parts = String(value || "").slice(0, 10).split("-");
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : "";
  };
  const currentSignals = () => sourceId ? signals.filter((signal) => signal.source_note_id === sourceId) : signals;
  const candidateSignals = (candidate) => signals.filter((signal) => (candidate.evidence_signal_ids || []).includes(signal.id));
  const relevantAttention = () => {
    if (!sourceId) return attention;
    const ids = new Set(currentSignals().map((signal) => signal.id));
    return attention.filter((candidate) => (candidate.evidence_signal_ids || []).some((id) => ids.has(id)));
  };
  const entityName = (signal) => (signal.entities || []).filter((entity) => entity.resolution === "resolved").map((entity) => entity.label).join(" · ");
  function signalCard(signal) {
    const child = (signal.entities || []).find((entity) => entity.type === "child");
    const select = child ? `<label>Persoană<select data-child-resolution="${esc(signal.id)}"><option value="">Fără asociere sigură</option>${context.children.map((item) => `<option value="${esc(item.id)}" ${child.id === item.id ? "selected" : ""}>${esc(item.first_name)}</option>`).join("")}</select></label>` : "";
    return `<article class="becky-memory-signal ${signal.stale ? "is-stale" : ""}" data-signal-id="${esc(signal.id)}"><div><small>${esc(date(signal.source_date))}${entityName(signal) ? ` · ${esc(entityName(signal))}` : ""}</small><strong>${esc(signal.normalized_observation)}</strong><span>${esc(signal.epistemic_type === "direct_quote" ? "Citat direct" : "Observație factuală")}</span></div><details><summary>Inspectează fragmentul</summary><blockquote>„${esc(signal.exact_source_excerpt)}”</blockquote>${select}<div class="becky-memory-actions">${child ? '<button type="button" data-save-entity>Corectează asocierea</button>' : ""}<button type="button" data-delete-signal>Elimină semnalul</button></div></details></article>`;
  }
  function attentionCard(candidate) {
    const evidence = candidateSignals(candidate);
    const counter = signals.filter((signal) => (candidate.counter_evidence_signal_ids || []).includes(signal.id));
    return `<article class="becky-memory-attention" data-attention-id="${esc(candidate.id)}"><header><small>MERITĂ ATENȚIE</small><h2>${esc(candidate.title)}</h2></header><p>${esc(candidate.summary)}</p><div class="becky-memory-stats"><span>${candidate.independent_evidence_count} semnale</span><span>${candidate.date_count} zile</span><span>${candidate.entity_count} entități</span></div><details><summary>Vezi de ce</summary><p><strong>De ce contează:</strong> ${esc(candidate.why_it_matters)}</p><p><strong>Următorul pas:</strong> ${esc(candidate.suggested_next_step)}</p><ul>${evidence.map((signal) => `<li>${esc(date(signal.source_date))}: „${esc(signal.normalized_observation)}”</li>`).join("")}</ul>${counter.length ? `<p class="becky-memory-counter"><strong>Semnalele sunt mixte.</strong> ${counter.map((signal) => `„${esc(signal.normalized_observation)}”`).join(" · ")}</p>` : ""}</details><footer><button type="button" data-investigate>${candidate.status === "investigating" ? "În investigare" : "Investigăm"}</button><label>Păstrează ca<select data-promote-target><option value="">Alege destinația</option>${targets.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label><button type="button" data-promote disabled>Knowledge Candidate</button></footer></article>`;
  }
  function summaryView() {
    const viewed = currentSignals(); const candidates = relevantAttention();
    return `<header class="becky-inbox-head becky-memory-head"><div><small>✦ BECKY MEMORY</small><h1>${sourceId ? `Nota din ${esc(date(sourceId))}` : "Memoria Becky"}</h1><p>Becky păstrează semnalele factuale. Îți cere atenția doar când dovezile se acumulează.</p></div><a href="/admin?view=monthly-report&tab=notes">← Note zilnice</a></header><main class="becky-memory-summary"><section class="becky-memory-status"><strong>✓ ${viewed.length} ${viewed.length === 1 ? "semnal păstrat" : "semnale păstrate"}</strong><span>${candidates.length ? `${candidates.length} lucru${candidates.length === 1 ? "" : "ri"} merită atenție` : "Nimic nu necesită atenția ta acum."}</span></section>${candidates.length ? `<section class="becky-memory-attention-list">${candidates.map(attentionCard).join("")}</section>` : ""}${viewed.length ? `<section class="becky-memory-recent"><h2>Semnale din această notă</h2>${viewed.slice(0, 4).map(signalCard).join("")}</section>` : '<section class="becky-inbox-empty"><strong>Încă nu există semnale pentru această notă.</strong><span>O analiză fără insight sau atenționare este un rezultat valid.</span></section>'}</main><footer class="becky-brief-footer"><button class="primary" type="button" data-show-memory>Vezi memoria</button></footer>`;
  }
  function memoryView() {
    const viewed = currentSignals();
    return `<header class="becky-inbox-head becky-memory-head"><div><small>✦ BECKY MEMORY</small><h1>Auditul memoriei</h1><p>Verifică fragmentul original, corectează o asociere sau elimină un semnal greșit.</p></div><button type="button" data-show-summary>← Rezumat</button></header><main class="becky-memory-list">${viewed.map(signalCard).join("") || '<p class="becky-inbox-empty">Nu există semnale de afișat.</p>'}</main>`;
  }
  function paint() {
    const root = document.querySelector("#becky-inbox-root");
    if (!root) return;
    root.innerHTML = layer === "memory" ? memoryView() : summaryView();
    bind();
  }
  async function refresh() {
    const query = sourceId ? `?source_note_id=${encodeURIComponent(sourceId)}` : "";
    const [signalsResponse, attentionResponse, contextResponse] = await Promise.all([api(`/api/admin/becky-memory/signals${query}`), api("/api/admin/becky-memory/attention"), api("/api/admin/becky-inbox/context")]);
    signals = signalsResponse.ok ? (await signalsResponse.json()).signals || [] : [];
    attention = attentionResponse.ok ? (await attentionResponse.json()).candidates || [] : [];
    context = contextResponse.ok ? await contextResponse.json() : context;
    paint();
  }
  function bind() {
    document.querySelector("[data-show-memory]")?.addEventListener("click", () => { layer = "memory"; paint(); });
    document.querySelector("[data-show-summary]")?.addEventListener("click", () => { layer = "summary"; paint(); });
    document.querySelectorAll("[data-signal-id]").forEach((node) => {
      const signal = signals.find((item) => item.id === node.dataset.signalId);
      node.querySelector("[data-delete-signal]")?.addEventListener("click", async () => { if (!confirm("Elimini acest semnal din memoria Becky?")) return; const response = await api(`/api/admin/becky-memory/signals/${encodeURIComponent(signal.id)}`, { method: "DELETE" }); if (!response.ok) alert("Semnalul nu a putut fi eliminat."); await refresh(); });
      node.querySelector("[data-save-entity]")?.addEventListener("click", async () => { const selected = node.querySelector("[data-child-resolution]"); const child = context.children.find((item) => item.id === selected.value); const entities = (signal.entities || []).map((entity) => entity.type === "child" ? { ...entity, id: child?.id || null, label: child?.first_name || entity.label, resolution: child ? "resolved" : "not_found" } : entity); const response = await api(`/api/admin/becky-memory/signals/${encodeURIComponent(signal.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entities }) }); if (!response.ok) alert("Asocierea nu a putut fi actualizată."); await refresh(); });
    });
    document.querySelectorAll("[data-attention-id]").forEach((node) => {
      const candidate = attention.find((item) => item.id === node.dataset.attentionId);
      node.querySelector("[data-investigate]")?.addEventListener("click", async () => { await api(`/api/admin/becky-memory/attention/${encodeURIComponent(candidate.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "investigating" }) }); await refresh(); });
      const select = node.querySelector("[data-promote-target]"); const promote = node.querySelector("[data-promote]");
      if (select && promote) { select.onchange = () => { promote.disabled = !select.value; }; promote.onclick = async () => { const response = await api(`/api/admin/becky-memory/attention/${encodeURIComponent(candidate.id)}/promote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: select.value }) }); if (!response.ok) alert("Candidatul nu a putut fi păstrat."); await refresh(); }; }
    });
  }
  window.renderBeckyInboxAdmin = async function () {
    document.body.dataset.workspace = "becky-inbox";
    document.querySelector(".workspace")?.classList.add("hidden");
    document.getElementById("css-workspace")?.classList.add("hidden");
    document.getElementById("empty")?.classList.add("hidden");
    document.getElementById("editor")?.classList.add("hidden");
    const app = document.querySelector("#app") || document.querySelector("main");
    app.innerHTML = '<section id="becky-inbox-root" class="becky-inbox-shell"><p>Se încarcă memoria Becky…</p></section>';
    await refresh();
  };
})();
