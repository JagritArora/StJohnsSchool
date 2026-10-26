/* Themed calendar for the portals. Every <input type="date"> keeps its real value (YYYY-MM-DD) and
   all its listeners; a click or tap opens this calendar instead of the browser's. Typing still works
   on a computer. Days first; tap the month to jump months, then years. */
(() => {
  const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const pad = (n) => String(n).padStart(2, "0"), isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let pop = null, inp = null, cur = null, view = "days";
  const close = () => { if (!pop) return; pop.remove(); pop = null; if (inp) inp.classList.remove("xs-open"); inp = null; };
  const set = (iso) => { const i = inp; close(); i.value = iso; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); };
  function draw() {
    const y = cur.getFullYear(), mo = cur.getMonth(), min = inp.min || "", max = inp.max || "", val = inp.value, today = isoOf(new Date());
    let h;
    if (view === "years") {
      const lo = min ? +min.slice(0, 4) : y - 10, hi = max ? +max.slice(0, 4) : y + 5, ys = [];
      for (let k = hi; k >= lo; k--) ys.push(k);
      h = `<div class="xdp-h"><b>Choose a year</b></div><div class="xdp-g xdp-y">${ys.map((k) => `<button type="button" data-y="${k}" class="${k === y ? "on" : ""}">${k}</button>`).join("")}</div>`;
    } else if (view === "months") {
      h = `<div class="xdp-h"><button type="button" class="xdp-nav" data-yr="-1" aria-label="Previous year">‹</button><button type="button" class="xdp-t" data-v="years">${y}</button><button type="button" class="xdp-nav" data-yr="1" aria-label="Next year">›</button></div><div class="xdp-g xdp-m">${MON.map((n, k) => `<button type="button" data-m="${k}" class="${k === mo ? "on" : ""}">${n.slice(0, 3)}</button>`).join("")}</div>`;
    } else {
      const off = (new Date(y, mo, 1).getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate();
      let c = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => `<i>${d}</i>`).join("") + "<span></span>".repeat(off);
      for (let d = 1; d <= days; d++) { const iso = `${y}-${pad(mo + 1)}-${pad(d)}`, out = (min && iso < min) || (max && iso > max); c += `<button type="button" data-d="${iso}"${out ? " disabled" : ""} class="${iso === val ? "on" : ""}${iso === today ? " today" : ""}">${d}</button>`; }
      const t = isoOf(new Date()), tOk = !(min && t < min) && !(max && t > max);
      h = `<div class="xdp-h"><button type="button" class="xdp-nav" data-step="-1" aria-label="Previous month">‹</button><button type="button" class="xdp-t" data-v="months">${MON[mo]} ${y}</button><button type="button" class="xdp-nav" data-step="1" aria-label="Next month">›</button></div><div class="xdp-g xdp-d">${c}</div>
        <div class="xdp-f">${inp.required ? "<span></span>" : `<button type="button" data-clear>Clear</button>`}${tOk ? `<button type="button" data-d="${t}" class="xdp-today">Today</button>` : ""}</div>`;
    }
    pop.innerHTML = h;
    const on = pop.querySelector(".xdp-g .on") || pop.querySelector(".xdp-g .today");
    if (view === "years" && on) on.scrollIntoView({ block: "center" });
  }
  function place() {
    const r = inp.getBoundingClientRect(), w = pop.offsetWidth, hgt = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
    pop.style.top = (innerHeight - r.bottom < hgt + 12 && r.top > hgt + 12 ? r.top - hgt - 6 : r.bottom + 6) + "px";
  }
  function open(i) {
    close(); inp = i; i.classList.add("xs-open");
    cur = i.value ? new Date(i.value + "T00:00") : i.min && isoOf(new Date()) < i.min ? new Date(i.min + "T00:00") : new Date(); cur.setDate(1); view = "days";
    pop = document.createElement("div"); pop.className = "xdp"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Choose a date");
    document.body.appendChild(pop); draw(); place();
    pop.addEventListener("mousedown", (e) => e.preventDefault());
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      if (b.dataset.d) return set(b.dataset.d);
      if (b.hasAttribute("data-clear")) return set("");
      if (b.dataset.y) { cur = new Date(+b.dataset.y, cur.getMonth(), 1); view = "months"; }
      else if (b.dataset.m) { cur = new Date(cur.getFullYear(), +b.dataset.m, 1); view = "days"; }
      else if (b.dataset.v) view = b.dataset.v;
      else if (b.dataset.step) cur = new Date(cur.getFullYear(), cur.getMonth() + +b.dataset.step, 1);
      else if (b.dataset.yr) cur = new Date(cur.getFullYear() + +b.dataset.yr, cur.getMonth(), 1);
      draw(); place();
    });
  }
  const isDate = (t) => t && t.matches && t.matches('input[type="date"]:not([disabled]):not([readonly])');
  // A tap opens ours (phones would otherwise show their own); a click opens it and still lets you type.
  document.addEventListener("pointerdown", (e) => {
    if (pop && !pop.contains(e.target) && e.target !== inp) close();
    if (!isDate(e.target)) return;
    e.preventDefault(); // no half-selected day/month/year: the calendar does the picking
    if (pop && e.target === inp) { close(); return; }
    open(e.target);
  }, true);
  // Stop the browser's own picker opening on click (Chrome, Edge, Safari).
  document.addEventListener("click", (e) => { if (isDate(e.target)) e.preventDefault(); }, true);
  document.addEventListener("keydown", (e) => {
    if (isDate(e.target) && (e.key === " " || (e.altKey && e.key === "ArrowDown"))) { e.preventDefault(); open(e.target); return; }
    if (!pop) return;
    if (e.key === "Escape") { const i = inp; close(); i.focus(); }
    else if (e.key === "Tab") close();
  }, true);
  document.addEventListener("input", (e) => { if (pop && e.target === inp && inp.value) { cur = new Date(inp.value + "T00:00"); cur.setDate(1); view = "days"; draw(); } });
  addEventListener("resize", close);
  addEventListener("scroll", (e) => { if (pop && !pop.contains(e.target)) close(); }, true);
})();
