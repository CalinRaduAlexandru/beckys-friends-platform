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

  const load = async () => {
    let entries = [];
    try {
      const response = await fetch("/api/calendar", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Calendar unavailable");
      entries = (await response.json()).entries || [];
    } catch {
      document.querySelector("[data-public-calendar]")?.classList.add("is-fallback");
    }

    const week = renderer.getWeek(entries, new Date());
    rangeNodes.forEach((node) => (node.textContent = week.label));
    renderMobile(week.days);

    try {
      const canvas = await renderer.createCanvas(week.weekStart, week.days);
      canvas.className = "public-calendar-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Programul Becky’s Garden, ${week.label}`);
      desktopHost.replaceChildren(canvas);
    } catch {
      desktopHost.innerHTML = '<p class="public-calendar-error">Programul nu a putut fi afișat momentan.</p>';
    }
  };

  load();
})();
