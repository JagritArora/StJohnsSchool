/* The welcome page and the pages behind it (round 16).
   Load it after charts.js and before the page's own script.
   - Pages: #view or #view/sub. Moving to another page adds a history step, so the
     browser's Back button returns to the welcome page; a sub-page (a tab under the
     page title) only updates the address.
   - Every page but the welcome page gets a "Home" link above its title.
   - The welcome page's two pieces: a short "needs you" list and the page tiles.
   - S.explore: a chart you can pick through. One plain sentence says what it shows;
     picking a bar (tap, click or arrow keys) says what that bar means and what to do. */
(function () {
  const S = window.SJS;
  if (!S || !S.go || !document.querySelector("[data-view]")) return;
  const HOME = (document.querySelector('[data-view="home"], [data-view="overview"]') || document.querySelector("[data-view]")).dataset.view;
  S.HOME = HOME;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';

  // ---------- Pages ----------
  const plain = S.go;
  const viewOf = (h) => String(h || "").replace(/^#/, "").split("/");
  S.go = (name, push = true) => {
    const [v, sub] = viewOf(name);
    if (!document.querySelector(`[data-view="${v}"]`)) return;
    const was = viewOf(location.hash)[0] || HOME;
    plain(v, false);
    if (sub) { const b = document.querySelector(`[data-view="${v}"] .ptabs [data-vt] button[data-v="${sub}"], [data-view="${v}"] [data-vt] button[data-v="${sub}"]`); if (b && !b.classList.contains("on")) b.click(); }
    // Menu buttons that open a sub-page stay lit for the page.
    document.querySelectorAll("[data-go]").forEach((b) => { if (viewOf(b.dataset.go)[0] === v) b.classList.add("active"); });
    if (push) {
      const h = "#" + v + (sub ? "/" + sub : "");
      if (h !== location.hash) history[v !== was ? "pushState" : "replaceState"](null, "", h);
    }
    document.body.classList.toggle("on-hub", v === HOME);
  };
  addEventListener("popstate", () => S.go(location.hash || HOME, false));
  // A page's own tabs keep the address in step, so a reload or a shared link opens the same tab.
  document.addEventListener("sjs:vt", (e) => {
    const bar = document.querySelector(`.ptabs [data-vt="${e.detail.key}"]`); if (!bar) return;
    const v = bar.closest("[data-view]"); if (!v || !v.classList.contains("active")) return;
    const first = bar.querySelector("button[data-v]"), h = "#" + v.dataset.view + (first && first.dataset.v === e.detail.v ? "" : "/" + e.detail.v);
    if (h !== location.hash) history.replaceState(null, "", h);
  });

  // "Home" above every page title.
  const crumbs = () => document.querySelectorAll(`[data-view]:not([data-view="${HOME}"]) > .topbar`).forEach((tb) => {
    if (tb.querySelector(".crumb")) return;
    const box = tb.firstElementChild;
    box.insertAdjacentHTML("afterbegin", `<button type="button" class="crumb" data-go="${HOME}">${BACK}Home</button>`);
  });
  // The school's name in the top bar always leads back to the welcome page; a shortcut
  // to a page this person doesn't have is taken away.
  document.querySelectorAll("[data-go-home]").forEach((a) => { a.dataset.go = HOME; a.setAttribute("href", "#" + HOME); });
  document.querySelectorAll(".pbar [data-go]").forEach((b) => { if (!document.querySelector(`[data-view="${viewOf(b.dataset.go)[0]}"]`)) b.remove(); });
  // Loaded before the page's own script; the first page opens once that script has drawn.
  document.addEventListener("DOMContentLoaded", () => {
    crumbs();
    S.go(location.hash || HOME, false);
    if (!location.hash) history.replaceState(null, "", "#" + HOME);
  });

  // ---------- Welcome page pieces ----------
  // needs: [{ tone, icon (svg paths) | n, t, sub, when, act, go, attrs }]
  S.needsHTML = (items, { empty = "Nothing needs you right now.", more = 4 } = {}) => {
    if (!items.length) return `<div class="needs needs-clear"><span class="sq green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><b>${empty}</b></div>`;
    const row = (x, i) => `<button type="button" class="need${i >= more ? " need-x" : ""}"${x.go ? ` data-go="${x.go}"` : ""}${x.attrs || ""}${i >= more ? " hidden" : ""}>
      <span class="sq ${x.tone || ""}">${x.icon ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${x.icon}</svg>` : S.esc(x.n)}</span>
      <span class="need-t"><b>${x.t}</b>${x.sub ? `<span>${x.sub}</span>` : ""}</span>
      ${x.when ? `<span class="need-w">${x.when}</span>` : "<span></span>"}
      <span class="need-a">${x.act || "Open"}${CHEV}</span></button>`;
    return `<div class="needs">${items.map(row).join("")}${items.length > more ? `<button type="button" class="link-btn need-more" data-need-more>Show ${items.length - more} more</button>` : ""}</div>`;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-need-more]"); if (!b) return;
    const box = b.closest(".needs"), open = b.dataset.open !== "1";
    box.querySelectorAll(".need-x").forEach((x) => (x.hidden = !open));
    b.dataset.open = open ? "1" : ""; b.textContent = open ? "Show fewer" : `Show ${box.querySelectorAll(".need-x").length} more`;
  });
  // tiles: [{ go, icon, name, line, tone (colour of the icon), flag (line needs a look), count }]
  S.tilesHTML = (tiles) => `<div class="pgs">${tiles.map((t, i) => `<button type="button" class="pg${t.flag ? " flag" : ""}" data-go="${t.go}" style="--c:var(--${t.tone || "royal"});--i:${i}">
      <span class="pg-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg></span>
      ${t.count ? `<span class="count">${t.count}</span>` : ""}
      <b class="pg-n">${t.name}</b><span class="pg-l">${t.line || ""}</span>${CHEV}</button>`).join("")}</div>`;
  // The welcome page plays its entrance once per visit to it, never on a refresh of its numbers.
  let played = false;
  const playHub = () => {
    if (reduce || played || !document.body.classList.contains("on-hub")) return;
    played = true; document.body.classList.add("hub-play"); setTimeout(() => document.body.classList.remove("hub-play"), 1400);
  };
  document.addEventListener("sjs:view", (e) => { if (e.detail === HOME) { played = false; requestAnimationFrame(playHub); } });
  requestAnimationFrame(playHub);

  // ---------- Charts you can explore ----------
  // o: { kind: "bars" | "cols", items: [{ k, label, short, v, ref, tone, note, acts }], lo, hi, unit,
  //      head (the takeaway, html), figs: [[value, label]], line: { v, label }, key (legend html), sel, label }
  // tone: good | watch | low | base | wait. note and acts are html. Picking keeps across redraws.
  const fmtV = (v, u) => (v === null || v === undefined ? "–" : v + u);
  const detail = (x, o) => !x ? "" : `<div class="x-d-h"><b>${S.esc(x.label)}</b><span class="x-d-v">${x.vText || fmtV(x.v, o.unit ?? "%")}</span></div>${x.note ? `<p>${x.note}</p>` : ""}${x.acts ? `<div class="x-acts">${x.acts}</div>` : ""}`;
  S.explore = (el, o) => {
    if (!el) return;
    el.classList.add("xp");
    const keys = o.items.map((x) => x.k);
    const sel = keys.includes(el._xsel) ? el._xsel : o.sel !== undefined && keys.includes(o.sel) ? o.sel : keys[0];
    el._xo = o; el._xsel = sel;
    const lo = o.lo ?? 0, hi = o.hi ?? 100, u = o.unit ?? "%";
    const P = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)).toFixed(2);
    const pressed = (x) => ` data-xk="${S.esc(x.k)}" aria-pressed="${x.k === sel}"`;
    let plot;
    if (o.kind === "cols") {
      const dense = o.items.length > 8;
      plot = `<div class="xc${dense ? " dense" : ""}" role="group" aria-label="${S.esc(o.label || "")}">` +
        `<div class="xc-guide" aria-hidden="true">${o.line ? `<span class="xc-line" style="bottom:${P(o.line.v)}%"></span>` : ""}</div>` +
        o.items.map((x, i) => `<button type="button" class="xc-col t-${x.tone || "base"}${x.k === sel ? " on" : ""}"${pressed(x)} style="--i:${i}" aria-label="${S.esc(x.label)}: ${fmtV(x.v, u)}">
          <span class="xc-plot">${x.v === null || x.v === undefined ? `<span class="xc-bar xc-none"></span>` : `<span class="xc-bar" style="height:${P(x.v)}%"><b>${x.short ?? x.v}</b></span>`}</span>
          <span class="xc-l">${S.esc(x.axis || x.label)}</span></button>`).join("") + `</div>`;
    } else {
      plot = `<div class="xb" role="group" aria-label="${S.esc(o.label || "")}">` + o.items.map((x, i) => `<button type="button" class="xb-row t-${x.tone || "base"}${x.k === sel ? " on" : ""}"${pressed(x)} style="--i:${i}">
          <span class="xb-l">${S.esc(x.axis || x.label)}</span>
          <span class="xb-t">${x.v === null || x.v === undefined ? "" : `<i class="xb-f" style="width:${P(x.v)}%"></i>`}${x.ref !== null && x.ref !== undefined ? `<b class="xb-ref" style="left:${P(x.ref)}%"></b>` : ""}</span>
          <span class="xb-v">${x.short ?? fmtV(x.v, u)}</span></button>`).join("") + `</div>`;
    }
    const cur = o.items.find((x) => x.k === sel);
    S.paint(el, (o.head ? `<p class="x-head">${o.head}</p>` : "") +
      (o.figs ? `<div class="x-figs">${o.figs.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}</div>` : "") +
      plot + (o.key || o.line ? `<div class="legend x-key">${o.key || ""}${o.line ? `<span><i class="dash"></i>${S.esc(o.line.label)}</span>` : ""}</div>` : "") +
      `<div class="x-detail t-${cur ? cur.tone || "base" : "base"}" aria-live="polite">${detail(cur, o)}</div>` +
      `<p class="x-hint">${o.hint || (o.kind === "cols" ? "Tap a bar to see what it means." : "Tap a row to see what it means.")}</p>`);
  };
  const pick = (el, k, focus) => {
    const o = el._xo; if (!o) return;
    const x = o.items.find((i) => String(i.k) === String(k)); if (!x) return;
    el._xsel = x.k;
    el.querySelectorAll("[data-xk]").forEach((b) => { const on = b.dataset.xk === String(x.k); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); if (on && focus) b.focus(); });
    const d = el.querySelector(".x-detail");
    d.className = `x-detail t-${x.tone || "base"}`; d.innerHTML = detail(x, o);
    if (!reduce && d.animate) d.animate([{ opacity: 0.35, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" });
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-xk]"); if (b) pick(b.closest(".xp"), b.dataset.xk); });
  // A chart's "ask" buttons hand the question to the assistant.
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-x-ask]"); if (b && S.ask) S.ask(b.dataset.xAsk); });
  document.addEventListener("keydown", (e) => {
    const b = e.target.closest && e.target.closest("[data-xk]"); if (!b) return;
    const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!next) return;
    e.preventDefault();
    const all = [...b.parentElement.querySelectorAll("[data-xk]")], i = all.indexOf(b), to = all[(i + next + all.length) % all.length];
    pick(b.closest(".xp"), to.dataset.xk, true);
  });
})();
