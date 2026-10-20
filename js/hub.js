/* The welcome page and the pages behind it (round 16).
   Load it after charts.js and before the page's own script.
   - Pages: #view or #view/sub. Moving to another page adds a history step, so the
     browser's Back button returns to the welcome page; a sub-page (a tab under the
     page title) only updates the address.
   - Every page but the welcome page gets a "Home" link above its title.
   - The welcome page: a greeting sheet with the day as it happens, then the page tiles.
     "Needs you" sits behind an icon in the top bar, on every page (round 17).
   - S.explore: a chart you can pick through. One plain sentence says what it shows;
     picking a bar (tap, click or arrow keys) says what that bar means and what to do. */
(function () {
  const S = window.SJS;
  if (!S || !S.go || !document.querySelector("[data-view]")) return;
  const HOME = (document.querySelector('[data-view="home"], [data-view="overview"]') || document.querySelector("[data-view]")).dataset.view;
  S.HOME = HOME;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The greeting sheet's glow follows the time of day: marigold in the morning, teal after noon, blue in the evening.
  { const h = new Date().getHours(); document.documentElement.dataset.tod = h < 12 ? "am" : h < 17 ? "pm" : "eve"; }
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
    const pn = document.querySelector(".pbar-page"), h1 = document.querySelector(`[data-view="${v}"] > .topbar h1`);
    if (pn) pn.textContent = v === HOME || !h1 ? "" : h1.textContent;
    // Opening a page draws its thread in once, the way the welcome page does.
    const ph = h1 && h1.closest(".pg-head");
    if (ph && v !== was && !matchMedia("(prefers-reduced-motion: reduce)").matches) { ph.classList.remove("pg-in"); void ph.offsetWidth; ph.classList.add("pg-in"); }
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
    const box = tb.querySelector(":scope > :not(.pg-head-bg)");
    box.insertAdjacentHTML("afterbegin", `<button type="button" class="crumb" data-go="${HOME}">${BACK}Home</button>`);
  });
  // The school's name in the top bar always leads back to the welcome page; a shortcut
  // to a page this person doesn't have is taken away.
  document.querySelectorAll(".pbar-brand").forEach((a) => a.insertAdjacentHTML("afterend", '<span class="pbar-page" aria-hidden="true"></span>'));
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
  // "Needs you" lives behind an icon in the top bar, so it's one tap away on every page.
  // S.setNeeds(items, { empty }) fills it; the badge counts what's waiting.
  const TODO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9.5 4.5V3.2h5v1.3"/><path d="M8.8 12.6l2.2 2.2 4.4-4.6"/></svg>';
  const XI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const bar = document.querySelector(".pbar-r");
  let tray = null, trayBtn = null, nudged = false;
  if (bar) {
    bar.insertAdjacentHTML("afterbegin", `<button class="icon-btn needs-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="needs-tray" aria-label="Needs you">${TODO}<span class="badge" hidden></span></button>`);
    trayBtn = bar.querySelector(".needs-btn");
    document.body.insertAdjacentHTML("beforeend", `<div class="notif ntray" id="needs-tray" role="dialog" aria-labelledby="ntray-h" hidden>
      <div class="notif-h"><b id="ntray-h">Needs you</b><span class="ntray-n"></span><button class="icon-btn" type="button" data-tray-x aria-label="Close">${XI}</button></div>
      <div class="notif-list ntray-list"></div><p class="ntray-f">Only things to act on. Each one opens its page.</p></div>`);
    tray = document.getElementById("needs-tray");
  }
  const closeTray = (focus) => { if (!tray || tray.hidden) return; tray.hidden = true; trayBtn.setAttribute("aria-expanded", "false"); if (focus) trayBtn.focus(); };
  // anchor: open under something else (the parent home's "needs you" tag) instead of the top-bar icon.
  const openTray = (anchor) => {
    const r = (anchor && anchor.getBoundingClientRect ? anchor : trayBtn).getBoundingClientRect();
    tray.style.top = Math.round(r.bottom + 10) + "px";
    if (anchor && anchor.getBoundingClientRect) { tray.style.right = "auto"; tray.style.left = Math.max(12, Math.min(Math.round(r.left), innerWidth - tray.offsetWidth - 12, innerWidth - 400)) + "px"; }
    else { tray.style.left = ""; tray.style.right = Math.max(12, Math.round(innerWidth - r.right - 4)) + "px"; }
    tray.hidden = false; trayBtn.setAttribute("aria-expanded", "true"); trayBtn.classList.remove("nudge");
    (tray.querySelector(".need") || tray.querySelector("[data-tray-x]")).focus({ preventScroll: true });
  };
  S.openNeeds = (anchor) => tray && openTray(anchor);
  S.setNeeds = (items, { empty } = {}) => {
    if (!tray) return;
    S.paint(tray.querySelector(".ntray-list"), S.needsHTML(items, { empty, more: 6 }));
    const n = items.length, b = trayBtn.querySelector(".badge");
    b.hidden = !n; b.textContent = n > 9 ? "9+" : n;
    tray.querySelector(".ntray-n").textContent = n ? `${n} thing${n === 1 ? "" : "s"}` : "";
    trayBtn.setAttribute("aria-label", n ? `Needs you: ${n} thing${n === 1 ? "" : "s"}` : "Needs you: nothing right now");
    trayBtn.classList.toggle("has", n > 0);
    // A soft ring, once a visit, so the badge is noticed without shouting.
    if (n && !nudged && !reduce) { nudged = true; setTimeout(() => { trayBtn.classList.add("nudge"); setTimeout(() => trayBtn.classList.remove("nudge"), 2600); }, 900); }
  };
  document.addEventListener("click", (e) => {
    if (!tray) return;
    if (e.target.closest(".needs-btn")) { tray.hidden ? openTray() : closeTray(); return; }
    if (e.target.closest("[data-tray-x]")) { closeTray(true); return; }
    if (e.target.closest("#needs-tray .need")) { closeTray(); return; }
    if (!e.target.closest("#needs-tray, [data-open-needs]")) closeTray();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tray && !tray.hidden) closeTray(true); });
  addEventListener("resize", () => closeTray());

  // tiles: [{ go, icon, side (html beside the big figure), foot (html in place of the bar), name, line, tone (colour of the icon), flag (line needs a look), count, m (0–100: a thin bar under the line), mTip }]
  // Daily pages are wide tiles with a live figure or a week of bars (main: true, big, unit, bars, ref);
  // the rest sit under them as compact links, so every page stays one tap away.
  S.miniBars = (vals, { lo = 0, hi = 100, ref } = {}) => {
    const P = (v) => Math.max(4, Math.min(100, ((v - lo) / (hi - lo)) * 100)).toFixed(1);
    return `<span class="mb">${vals.map((v, i) => v === null || v === undefined ? `<i class="none"></i>` : `<i style="height:${P(v)}%;--i:${i}"${i === vals.length - 1 ? ' class="last"' : ""}></i>`).join("")}${ref !== undefined ? `<b style="bottom:${P(ref)}%"></b>` : ""}</span>`;
  };
  const meterOf = (t) => t.m !== undefined && t.m !== null ? `<span class="pg-m" aria-hidden="true"><i style="width:${Math.max(2, Math.min(100, t.m)).toFixed(1)}%"></i></span>` : "";
  const tileOf = (t, i) => `<button type="button" class="pg${t.main ? " main" : ""}${t.flag ? " flag" : ""}" data-go="${t.go}" style="--c:var(--${t.tone || "royal"});--mc:var(--${t.tone === "accent" ? "royal" : t.tone || "royal"});--i:${i}">
      <span class="pg-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg></span>
      ${t.count ? `<span class="count">${t.count}</span>` : ""}
      ${t.main && (t.big !== undefined || t.bars) ? `<span class="pg-v">${t.bars ? S.miniBars(t.bars, t.barsOpt || {}) : `<span class="pg-big">${t.big}${t.unit ? `<small>${t.unit}</small>` : ""}</span>`}${t.side ? `<span class="pg-side">${t.side}</span>` : ""}</span>` : ""}
      <b class="pg-n">${t.name}</b><span class="pg-l">${t.line || ""}</span>${t.foot || meterOf(t)}${CHEV}</button>`;
  const linkOf = (t, i) => `<button type="button" class="pgl-i${t.flag ? " flag" : ""}" data-go="${t.go}" style="--c:var(--${t.tone || "royal"});--i:${i}">
      <span class="pg-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg></span>
      <span class="pgl-t"><b>${t.name}</b><span>${t.line || ""}</span></span>${t.count ? `<span class="count">${t.count}</span>` : ""}${CHEV}</button>`;
  S.tilesHTML = (tiles) => {
    const main = tiles.filter((t) => t.main), rest = tiles.filter((t) => !t.main);
    if (!main.length) return `<div class="pgs">${tiles.map(tileOf).join("")}</div>`;
    return `<div class="pgs pgs-main" style="--n:${main.length}">${main.map(tileOf).join("")}</div>` +
      (rest.length ? `<h3 class="pgl-h">Also here</h3><div class="pgl">${rest.map((t, i) => linkOf(t, i + main.length)).join("")}</div>` : "");
  };

  // ---------- The school clock ----------
  // Periods are 40 minutes; break is 10:40 to 10:50; Saturday is a half day of five periods.
  S.ENDS = ["8:40", "9:20", "10:00", "10:40", "11:30", "12:10", "12:50", "1:30"];
  S.mins = (t) => { let [h, m] = t.split(":").map(Number); if (h < 7) h += 12; return h * 60 + m; };
  S.hhmm = (m) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}`;
  S.periodsOn = (d) => { const g = d.getDay(); return !g || S.HOLIDAYS[S.iso(d)] ? 0 : g === 6 ? 5 : 8; };
  // Where the school day stands: live only on the real date. cur is the period on now (or -1).
  S.schoolClock = () => {
    const real = new Date(); real.setHours(0, 0, 0, 0);
    const n = S.periodsOn(S.today), live = n > 0 && real.getTime() === S.today.getTime();
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const cur = live ? S.periodTimes.findIndex((t, p) => p < n && nowM >= S.mins(t) && nowM < S.mins(S.ENDS[p])) : -1;
    const brk = live && n > 4 && nowM >= S.mins(S.ENDS[3]) && nowM < S.mins(S.periodTimes[4]);
    const after = live && nowM >= S.mins(S.ENDS[n - 1]), before = !live || nowM < S.mins(S.periodTimes[0]);
    return { n, live, nowM, cur, brk, after, before, frac: cur >= 0 ? (nowM - S.mins(S.periodTimes[cur])) / 40 : brk ? (nowM - S.mins(S.ENDS[3])) / 10 : 0 };
  };
  // A small ring for a share, with the figure in the middle.
  S.ringHTML = (v, { tone = "var(--green)", text } = {}) => {
    const r = 23, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, v || 0));
    return `<span class="ring" style="--tone:${tone}"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="${r}" class="ring-bg"/><circle cx="28" cy="28" r="${r}" class="ring-fg" stroke-dasharray="${c.toFixed(2)}" style="--off:${(c * (1 - p / 100)).toFixed(2)};--c0:${c.toFixed(2)}"/></svg><b>${text ?? `<span data-up="${Math.round(p)}">${Math.round(p)}</span>%`}</b></span>`;
  };
  // The greeting sheet's satin ribbon: two layers of fine strands drifting against each other,
  // and a glint on the strands at the point of the school day we're in (left at 8:00, right
  // at home time), so the thread of the day is lit where "now" is.
  document.querySelectorAll(".hub-top.hero").forEach((h) => h.insertAdjacentHTML("afterbegin", '<div class="rib" aria-hidden="true"><i class="rib-a"></i><i class="rib-b"></i><span class="rib-g"><i class="rib-a"></i></span></div>'));
  // Every other page's title sits on the same sheet, with the same thread running through it.
  // The strands go in a clipped layer of their own, so menus inside the title bar aren't cut off.
  document.querySelectorAll(`[data-view]:not([data-view="${HOME}"]) > .topbar`).forEach((t) => { t.classList.add("pg-head"); t.insertAdjacentHTML("afterbegin", '<div class="pg-head-bg" aria-hidden="true"><div class="rib"><i class="rib-a"></i><i class="rib-b"></i><span class="rib-g"><i class="rib-a"></i></span></div></div>'); });
  // A light time mark at the sheet's right, where the glint is: the time, and where the school day stands.
  document.querySelectorAll(".hub-top.hero").forEach((h) => h.insertAdjacentHTML("beforeend", '<div class="hero-clock" aria-hidden="true"><b></b><span></span></div>'));
  const clock = () => {
    const c = S.schoolClock(), now = new Date(), t = S.hhmm(now.getHours() * 60 + now.getMinutes());
    const [big, small] = !c.live ? [S.fmt(S.today, { day: "numeric" }), S.fmt(S.today, { weekday: "long", month: "long" })]
      : [t, c.before ? `School starts at ${S.periodTimes[0]}` : c.after ? "School's over" : c.brk ? "Break" : c.cur >= 0 ? `Period ${c.cur + 1} of ${c.n}` : ""];
    document.querySelectorAll(".hero-clock").forEach((el) => { el.querySelector("b").textContent = big; el.querySelector("span").textContent = small; });
  };
  const glint = () => {
    clock();
    const c = S.schoolClock(), t0 = S.mins(S.periodTimes[0]), t1 = c.n ? S.mins(S.ENDS[c.n - 1]) : t0 + 1;
    const f = !c.live ? 0.08 : Math.max(0, Math.min(1, (c.nowM - t0) / (t1 - t0)));
    document.querySelectorAll(".hub-top.hero, .pg-head").forEach((h) => h.style.setProperty("--nx", (30 + f * 62).toFixed(1) + "%"));
  };
  glint(); setInterval(glint, 30000);

  // Figures that count up the first time the welcome page shows them.
  S.countUp = (root) => {
    if (reduce) return;
    root.querySelectorAll("[data-up]").forEach((el) => {
      const to = parseFloat(el.dataset.up), dp = (String(el.dataset.up).split(".")[1] || "").length, t0 = performance.now(), D = 900;
      const step = (t) => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dp); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  };
  // The welcome page plays its entrance once per visit to it, never on a refresh of its numbers.
  let played = false;
  const playHub = () => {
    if (reduce || played || !document.body.classList.contains("on-hub")) return;
    played = true; document.body.classList.add("hub-play"); setTimeout(() => document.body.classList.remove("hub-play"), 2200);
    const hub = document.querySelector(`[data-view="${HOME}"] .hub`); if (hub) S.countUp(hub);
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
