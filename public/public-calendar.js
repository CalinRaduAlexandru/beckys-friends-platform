(function () {
  const desktopHost = document.querySelector("[data-public-calendar-poster]");
  const mobileHost = document.querySelector("[data-public-calendar-mobile]");
  const rangeNodes = document.querySelectorAll("[data-public-calendar-range]");
  const renderer = window.BeckyCalendarPoster;
  if (!desktopHost || !mobileHost || !renderer) return;

  const safe = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character],
    );

  const renderMobile = (days) => {
    mobileHost.innerHTML = days
      .map(
        (day, index) =>
          `<article class="public-calendar-day">
            <header>
              <span>${safe(renderer.dayNames[index])}</span>
              <time datetime="${safe(day.date)}">${safe(
                new Intl.DateTimeFormat("ro-RO", {
                  day: "2-digit",
                  month: "short",
                }).format(new Date(`${day.date}T12:00:00`)),
              )}</time>
            </header>
            <div class="public-calendar-intervals">
              ${day.entries
                .map(
                  (entry) =>
                    `<div class="public-calendar-interval public-calendar-interval-${safe(entry.type)}">
                      <span class="public-calendar-status-dot" aria-hidden="true"></span>
                      <span><strong>${safe(renderer.entryTimeLabel(entry))}</strong><small>${safe(
                        entry.type === "open" ? "Deschis pentru joacă" : renderer.typeLabel(entry.type),
                      )}</small></span>
                    </div>`,
                )
                .join("")}
            </div>
          </article>`,
      )
      .join("");
  };

  let lastCalendarSignature = "";
  let loading = false;
  let refreshPending = false;

  const load = async () => {
    if (loading) { refreshPending = true; return; }
    loading = true;
    try {
    let entries = [];
    try {
      const response = await fetch(`/api/calendar?_=${Date.now()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Calendar unavailable");
      entries = (await response.json()).entries;
      if (!Array.isArray(entries)) throw new Error("Invalid calendar");
    } catch {
      document.querySelector("[data-public-calendar]")?.classList.add("is-fallback");
      if (!lastCalendarSignature) {
        const message = '<p class="public-calendar-error">Programul nu este disponibil momentan. Reîncercăm automat…</p>';
        desktopHost.innerHTML = message;
        mobileHost.innerHTML = message;
      }
      return;
    }

    document.querySelector("[data-public-calendar]")?.classList.remove("is-fallback");
    const bucharestDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const week = renderer.getWeek(entries, new Date(`${bucharestDate}T12:00:00`));
    const signature = JSON.stringify([week.days, week.label]);
    if (signature === lastCalendarSignature) return;

    rangeNodes.forEach((node) => (node.textContent = week.label));
    renderMobile(week.days);

    try {
      const canvas = await renderer.createCanvas(week.weekStart, week.days);
      canvas.className = "public-calendar-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Programul Becky’s Garden, ${week.label}`);
      desktopHost.replaceChildren(canvas);
      lastCalendarSignature = signature;
    } catch {
      desktopHost.innerHTML = '<p class="public-calendar-error">Programul nu a putut fi afișat momentan.</p>';
    }
    } finally {
      loading = false;
      if (refreshPending) { refreshPending = false; load(); }
    }
  };

  load();
  window.addEventListener("storage", (event) => {
    if (event.key === "becky-calendar-updated") load();
  });
  window.addEventListener("focus", load);
  window.addEventListener("pageshow", load);
  window.addEventListener("online", load);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
  window.setInterval(() => { if (!document.hidden) load(); }, 5000);
})();
