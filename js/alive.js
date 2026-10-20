/* The website, alive: the portal ribbon on every page head, the time of day on the
   home page, a "today at school" strip, and buttons that lean towards the pointer. */
(function () {
  const S = window.SJS || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RIB = '<div class="rib"><i class="rib-a"></i><i class="rib-b"></i><span class="rib-g"><i class="rib-a"></i></span></div>';

  // Morning gold, afternoon teal, evening blue: the same light the portals use.
  const h = new Date().getHours();
  root.dataset.tod = h < 12 ? "am" : h < 17 ? "pm" : "eve";

  // The ribbon behind every page head and the home hero; its glint follows the pointer.
  const heads = $$(".phero, .hero-panel");
  heads.forEach((el) => { el.classList.add("has-rib"); el.insertAdjacentHTML("afterbegin", `<div class="site-rib" aria-hidden="true">${RIB}</div>`); });
  $$(".hero-panel").forEach((el) => el.insertAdjacentHTML("afterbegin", '<i class="tod-glow" aria-hidden="true"></i>'));
  if (heads.length && !reduce) document.addEventListener("pointermove", (e) => {
    heads.forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; el.style.setProperty("--nx", Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)) + "%"); });
  }, { passive: true });

  // The footer ends on the ribbon too.
  const ftr = $(".ftr"); if (ftr) ftr.insertAdjacentHTML("afterbegin", `<div class="ftr-rib" aria-hidden="true">${RIB}</div>`);

  // Today at school (home page): open or closed, the timings, and what's next.
  const slot = $("[data-today]");
  if (slot && S.isSchoolDay) {
    const fact = (k) => ((S.FACTS || []).find((f) => f[0] === k) || [])[2] || "";
    const draw = () => {
      const now = new Date(), d0 = new Date(now); d0.setHours(0, 0, 0, 0);
      const key = S.iso(d0), m = now.getMonth(), winter = m >= 10 || m <= 2, sat = now.getDay() === 6;
      const tSch = fact(winter ? "tSchW" : "tSchS"), tPre = fact(winter ? "tPreW" : "tPreS");
      const toMin = (t) => { const x = t.match(/(\d+):(\d+)\s*(AM|PM)/i); return x ? ((+x[1] % 12) + (/pm/i.test(x[3]) ? 12 : 0)) * 60 + +x[2] : 0; };
      const [a, b] = tSch.split(/\s+to\s+/), start = toMin(a), end = sat ? 11 * 60 + 30 : toMin(b), mins = now.getHours() * 60 + now.getMinutes();
      const open = S.isSchoolDay(d0), why = now.getDay() === 0 ? "Sunday" : S.HOLIDAYS[key];
      const state = !open ? ["off", "Closed Today", why] : mins < start ? ["soon", "School Opens Soon", `Classes I to XII start at ${a}`] : mins < end ? ["live", "School Is in Session", sat ? "Saturday half day, home by 11:30 AM" : `Classes I to XII, ${tSch}`] : ["done", "Over for the Day", "See You Tomorrow"];
      const nx = (S.CALENDAR || []).find(([d]) => d > key), days = nx ? Math.round((new Date(nx[0] + "T00:00") - d0) / 864e5) : 0;
      slot.innerHTML = `<div class="wrap"><div class="today-in">
        <div class="today-a"><i class="today-dot ${state[0]}"></i><span><b>${state[1]}</b><small>${S.fmt(d0, { weekday: "long", day: "numeric", month: "long" })}${state[2] ? ` · ${state[2]}` : ""}</small></span></div>
        <div class="today-b"><span><small>Timings${winter ? " (Winter)" : " (Summer)"}</small><b>${tSch}</b></span><span><small>Pre-Primary</small><b>${tPre}</b></span></div>
        ${nx ? `<a class="today-c" href="life.html#calendar"><small>Coming Up${days ? ` in ${days} Day${days > 1 ? "s" : ""}` : ""}</small><b>${nx[1]}</b><span>${S.fmt(nx[0], { weekday: "short", day: "numeric", month: "short" })}</span></a>` : ""}
      </div></div>`;
    };
    draw(); setInterval(draw, 60000);
  }

  // Buttons lean a few pixels towards the pointer (mouse only).
  if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", (e) => {
      const b = e.target.closest && e.target.closest(".btn, .adm-go, .ai-fab");
      $$(".is-lean").forEach((x) => { if (x !== b) { x.classList.remove("is-lean"); x.style.removeProperty("--lx"); x.style.removeProperty("--ly"); } });
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.classList.add("is-lean");
      b.style.setProperty("--lx", ((e.clientX - r.left) / r.width - .5) * 6 + "px");
      b.style.setProperty("--ly", ((e.clientY - r.top) / r.height - .5) * 4 + "px");
    }, { passive: true });
  }

  // Photos in page heads drift a little as you scroll.
  const drift = $$(".phero .arch img, .hero-media img");
  if (drift.length && !reduce) {
    let raf = 0;
    const go = () => { raf = 0; const y = Math.min(scrollY, 600); drift.forEach((im) => (im.style.translate = `0 ${y * .06}px`)); };
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(go); }, { passive: true });
  }

  // Title Case for headings, menus, buttons and labels. Full sentences (ending in . ? !)
  // stay as written, and so do words already set with capitals (XII, CBSE, T.I.).
  const SMALL = new Set("a an the and but or nor for so yet as at by in of on to up via with from into per vs".split(" "));
  const tc = (str, first = true, last = true) => {
    const words = str.split(/(\s+)/), real = words.filter((w) => w.trim()).length; let n = 0;
    return words.map((w) => {
      if (!w.trim()) return w;
      const i = n++, core = w.replace(/^[^A-Za-z]+/, "");
      if (!core || /[A-Z0-9]/.test(core.slice(1)) || /[a-z]\.[a-z]/i.test(core) || /^(https?|www)/.test(core)) return w;
      const lw = core.toLowerCase().replace(/[^a-z']/g, "");
      if ((i || !first) && (i < real - 1 || !last) && SMALL.has(lw)) return w;
      return w.replace(/[a-z]+(?:'[a-z]+)?/gi, (m, off, all) => (off && all[off - 1] === "'" ? m : m[0].toUpperCase() + m.slice(1)));
    }).join("");
  };
  const SEL = "h1, h2, h3, h4, .month p, .month-ph, .facts dd, .nav > li > a, .nav .sub a, .chips a, .sheet a, .btn, .adm-go, .crumbs a, .ftr li a, .today-in b:not(.today-a b), .tab, .filters button, .here, .menu-btn span, .textlink, figcaption, .fac figcaption, .tag, summary, .kv dt, .gcard .gk, .gcard dt, .fac-k dt, .fac-k dd, .req-k, .req-chips li, .req-flow b, .nu-t, .app-feats b, .rcpt-h b, .rcpt dt, .yr-tabs button, .club-tags li, .dl-sum b + span, .house b, .fcard b, .step b, .docs b, figcaption b, caption, thead th, .tsz-row > span, .nextup small, .cal-list b, .process li > b, .cal-more, .docs em";
  const titleCase = (scope = document) => $$(SEL, scope).forEach((el) => {
    if (el.closest(".ai-panel, .srch-res, [contenteditable]")) return;
    const txt = el.textContent.trim();
    if (!txt || /[.?!]["')]?$/.test(txt) || txt.split(/\s+/).length > 9) return;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = []; let t;
    while ((t = walk.nextNode())) if (t.nodeValue.trim() && !t.parentElement.closest("small, .sub a span, time")) nodes.push(t);
    nodes.forEach((t, k) => { const lead = k === 0 || /[:—–]\s*$/.test(nodes[k - 1].nodeValue), v = tc(t.nodeValue, lead && !/^\s/.test(t.nodeValue) || k === 0, k === nodes.length - 1); if (v !== t.nodeValue) t.nodeValue = v; });
  });
  titleCase(); setTimeout(titleCase, 400); setTimeout(titleCase, 1500);
  S.titleCase = titleCase;

  // ---------- Admissions: the page that should feel most alive ----------
  if (document.body.dataset.page === "admissions") {
    // Hero: who it's open for, live; and the photos take turns.
    const lead = $(".phero .lead");
    if (lead) lead.insertAdjacentHTML("afterend", '<p class="adm-now"><i class="live" aria-hidden="true"></i><span>Open Now for 2027–28</span><b>Nursery</b><b>Class XI</b></p>');
    const fig = $(".phero .arch");
    if (fig) {
      ["slide-3", "slide-10"].forEach((n) => fig.insertAdjacentHTML("beforeend", `<img class="adm-alt" src="assets/photos/${n}.webp" alt="" loading="lazy" />`));
      const imgs = $$("img", fig); imgs[0].classList.add("on"); let k = 0;
      if (!reduce) setInterval(() => { if (document.hidden) return; imgs[k].classList.remove("on"); k = (k + 1) % imgs.length; imgs[k].classList.add("on"); }, 6000);
    }
    // How to apply: a journey line draws across the steps as you scroll, lighting each in turn.
    const proc = $(".process");
    if (proc) {
      proc.insertAdjacentHTML("afterbegin", '<i class="pj" aria-hidden="true"><i></i></i>');
      const steps = $$("li", proc);
      const run = () => {
        const r = proc.getBoundingClientRect(), p = Math.max(0, Math.min(1, (innerHeight * .85 - r.top) / (r.height + innerHeight * .25)));
        proc.style.setProperty("--pj", reduce ? 1 : p);
        steps.forEach((li, i) => li.classList.toggle("lit", reduce || p >= (i + .3) / steps.length));
      };
      run(); addEventListener("scroll", run, { passive: true }); addEventListener("resize", run);
    }
    // Documents: a checklist families can tick, kept on their own phone.
    const ticks = $("#documents .ticks");
    if (ticks) {
      let saved = []; try { saved = JSON.parse(localStorage.getItem("sjs-docs") || "[]"); } catch (e) {}
      const items = $$("li", ticks);
      ticks.classList.add("doc-chk");
      items.forEach((li, i) => { li.innerHTML = `<label><input type="checkbox" ${saved.includes(i) ? "checked" : ""} /><span>${li.innerHTML}</span></label>`; });
      ticks.insertAdjacentHTML("beforebegin", '<div class="doc-prog" aria-live="polite"><div><b></b><small>Tick each one as you keep it ready. Saved on this device.</small></div><i><i></i></i></div>');
      const prog = $("#documents .doc-prog");
      const upd = () => {
        const on = items.map((li, i) => ($("input", li).checked ? i : -1)).filter((i) => i >= 0);
        try { localStorage.setItem("sjs-docs", JSON.stringify(on)); } catch (e) {}
        $("b", prog).textContent = on.length === items.length ? "All Documents Ready" : `${on.length} of ${items.length} Ready`;
        prog.style.setProperty("--dp", on.length / items.length); prog.classList.toggle("done", on.length === items.length);
      };
      ticks.addEventListener("change", upd); upd();
    }
    // Book a visit: the ribbon closes the page.
    const enq = $("#enquire");
    if (enq) { enq.classList.add("has-rib", "adm-close"); enq.insertAdjacentHTML("afterbegin", `<div class="site-rib" aria-hidden="true">${RIB}</div>`); heads.push(enq); }
  }

  // ---------- Themed pickers: our own calendar and dropdowns instead of the browser's ----------
  const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const pad2 = (n) => String(n).padStart(2, "0"), isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  let openPop = null;
  const closePop = (focusBack) => { if (!openPop) return; const p = openPop; openPop = null; p.el.classList.remove("open"); p.anchor.setAttribute("aria-expanded", "false"); setTimeout(() => p.el.remove(), 200); if (focusBack) p.anchor.focus(); };
  const place = (pop, anchor) => {
    const r = anchor.getBoundingClientRect(), h = pop.offsetHeight, below = innerHeight - r.bottom;
    pop.style.minWidth = r.width + "px";
    const left = Math.min(r.left, innerWidth - pop.offsetWidth - 12);
    pop.style.left = Math.max(12, left) + scrollX + "px";
    pop.style.top = (below < h + 16 && r.top > h + 16 ? r.top - h - 8 : r.bottom + 8) + scrollY + "px";
  };
  const showPop = (anchor, html, cls) => {
    closePop();
    const el = document.createElement("div"); el.className = "tpop " + cls; el.innerHTML = html; document.body.append(el);
    openPop = { el, anchor }; anchor.setAttribute("aria-expanded", "true");
    place(el, anchor); requestAnimationFrame(() => el.classList.add("open"));
    return el;
  };
  document.addEventListener("pointerdown", (e) => { if (openPop && !openPop.el.contains(e.target) && !openPop.anchor.contains(e.target) && !e.target.closest(".tdate-btn")) closePop(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openPop) { e.preventDefault(); closePop(true); } });
  addEventListener("resize", () => closePop());

  // Dates: type DD/MM/YYYY, or pick from a calendar that opens on the year first (for birthdays).
  $$('input[type="date"]').forEach((inp) => {
    const min = inp.min, max = inp.max || isoOf(new Date());
    inp.type = "text"; inp.placeholder = "DD/MM/YYYY"; inp.inputMode = "numeric"; inp.autocomplete = "off"; inp.classList.add("tdate");
    inp.setAttribute("pattern", "\\d{1,2}/\\d{1,2}/\\d{4}");
    const wrap = document.createElement("span"); wrap.className = "tdate-wrap"; inp.before(wrap); wrap.append(inp);
    wrap.insertAdjacentHTML("beforeend", '<button type="button" class="tdate-btn" aria-label="Open calendar" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></button>');
    const btn = $(".tdate-btn", wrap);
    const setISO = (iso) => { inp.dataset.iso = iso || ""; if (iso) { const [y, m, d] = iso.split("-"); inp.value = `${d}/${m}/${y}`; } inp.setCustomValidity(""); };
    inp.addEventListener("input", () => {
      const m = inp.value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) { inp.dataset.iso = ""; return; }
      const d = new Date(+m[3], +m[2] - 1, +m[1]);
      inp.dataset.iso = d.getMonth() === +m[2] - 1 ? isoOf(d) : "";
      inp.setCustomValidity(inp.dataset.iso ? "" : "Enter a real date, like 14/03/2023");
    });
    let view = "years", cur = new Date(), sel = null;
    const draw = (pop) => {
      const y = cur.getFullYear(), mo = cur.getMonth(), minY = min ? +min.slice(0, 4) : y - 20, maxY = +max.slice(0, 4);
      let body = "";
      if (view === "years") {
        const ys = []; for (let k = maxY; k >= minY; k--) ys.push(k);
        body = `<div class="tp-head"><b>Choose the Year</b></div><div class="tp-grid tp-years">${ys.map((k) => `<button type="button" data-y="${k}" class="${k === y ? "on" : ""}">${k}</button>`).join("")}</div>`;
      } else if (view === "months") {
        body = `<div class="tp-head"><button type="button" class="tp-title" data-v="years">${y}</button></div><div class="tp-grid tp-months">${MON.map((n, k) => `<button type="button" data-m="${k}" class="${k === mo && sel && sel.getFullYear() === y ? "on" : ""}">${n.slice(0, 3)}</button>`).join("")}</div>`;
      } else {
        const first = new Date(y, mo, 1), off = (first.getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate(), today = isoOf(new Date());
        let cells = ""; for (let k = 0; k < off; k++) cells += "<span></span>";
        for (let d = 1; d <= days; d++) { const iso = isoOf(new Date(y, mo, d)), out = (min && iso < min) || iso > max; cells += `<button type="button" data-d="${iso}" ${out ? "disabled" : ""} class="${sel && isoOf(sel) === iso ? "on" : ""}${iso === today ? " today" : ""}">${d}</button>`; }
        body = `<div class="tp-head"><button type="button" class="tp-nav" data-step="-1" aria-label="Previous month">‹</button><button type="button" class="tp-title" data-v="months">${MON[mo]} ${y}</button><button type="button" class="tp-nav" data-step="1" aria-label="Next month">›</button></div><div class="tp-dow">${["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => `<span>${d}</span>`).join("")}</div><div class="tp-grid tp-days">${cells}</div>`;
      }
      pop.innerHTML = body + (view === "days" ? "" : `<p class="tp-hint">${view === "years" ? "Then the month, then the day." : "Now the month."}</p>`);
      const on = $(".on", pop) || $(".today", pop) || $("button", pop); if (view === "years" && on) on.scrollIntoView({ block: "center" });
      if (on) on.focus({ preventScroll: true });
    };
    const open = () => {
      if (openPop && openPop.anchor === btn) return closePop();
      sel = inp.dataset.iso ? new Date(inp.dataset.iso + "T00:00") : null;
      cur = sel ? new Date(sel) : new Date(new Date().getFullYear() - 4, 0, 1); view = sel ? "days" : "years";
      const pop = showPop(btn, "", "tp-date"); pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Choose a date");
      draw(pop); place(pop, wrap);
      pop.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.y) { cur = new Date(+b.dataset.y, cur.getMonth(), 1); view = "months"; }
        else if (b.dataset.m) { cur = new Date(cur.getFullYear(), +b.dataset.m, 1); view = "days"; }
        else if (b.dataset.v) view = b.dataset.v;
        else if (b.dataset.step) cur = new Date(cur.getFullYear(), cur.getMonth() + +b.dataset.step, 1);
        else if (b.dataset.d) { setISO(b.dataset.d); closePop(); inp.focus(); return; }
        draw(pop); place(pop, wrap);
      });
      pop.addEventListener("keydown", (e) => {
        const bs = $$(".tp-grid button:not(:disabled)", pop), i = bs.indexOf(document.activeElement); if (i < 0) return;
        const cols = view === "days" ? 7 : view === "months" ? 4 : 4, mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
        if (mv) { e.preventDefault(); (bs[Math.max(0, Math.min(bs.length - 1, i + mv))]).focus(); }
      });
    };
    btn.addEventListener("click", open);
    inp.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" && e.altKey) { e.preventDefault(); open(); } });
  });

  // Dropdowns: the native select stays for the form; a themed button and list sit over it.
  $$("main select, .ai-panel select").forEach((selEl) => {
    if (selEl.multiple || selEl.closest(".tsel")) return;
    const wrap = document.createElement("span"); wrap.className = "tsel"; selEl.before(wrap); wrap.append(selEl);
    selEl.tabIndex = -1; selEl.setAttribute("aria-hidden", "true");
    const lab = selEl.id && $(`label[for="${selEl.id}"]`);
    wrap.insertAdjacentHTML("beforeend", `<button type="button" class="tsel-btn" aria-haspopup="listbox" aria-expanded="false"><span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>`);
    const btn = $(".tsel-btn", wrap);
    if (lab) { btn.id = selEl.id + "-btn"; lab.htmlFor = btn.id; btn.setAttribute("aria-label", lab.textContent.trim()); }
    const sync = () => { const o = selEl.options[selEl.selectedIndex]; $("span", btn).textContent = o ? o.text : ""; };
    sync(); selEl.addEventListener("change", sync);
    const choose = (i) => { selEl.selectedIndex = i; selEl.dispatchEvent(new Event("change", { bubbles: true })); selEl.dispatchEvent(new Event("input", { bubbles: true })); closePop(true); };
    const open = () => {
      if (openPop && openPop.anchor === btn) return closePop();
      const html = `<ul role="listbox">${[...selEl.options].map((o, i) => `<li role="option" tabindex="-1" data-i="${i}" aria-selected="${i === selEl.selectedIndex}"${o.disabled ? ' aria-disabled="true"' : ""}>${esc(o.text)}</li>`).join("")}</ul>`;
      const pop = showPop(btn, html, "tp-sel"); place(pop, btn);
      const items = $$("li", pop); (items[selEl.selectedIndex] || items[0]).focus();
      pop.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li && li.getAttribute("aria-disabled") !== "true") choose(+li.dataset.i); });
      pop.addEventListener("keydown", (e) => {
        const i = items.indexOf(document.activeElement);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))].focus(); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (i >= 0) choose(i); }
        else if (e.key === "Tab") closePop();
      });
    };
    btn.addEventListener("click", open);
    btn.addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); open(); } });
    // Forms that reset put the button text back too.
    const f = selEl.form; if (f) f.addEventListener("reset", () => setTimeout(sync));
  });

  // ---------- Toppers and achievements: the school's own list, from js/results.js ----------
  const TOP = S.TOPPERS || [], AW = S.AWARDS || [];
  const pic = (f) => f ? S.PHOTO_BASE + f.split("/").map(encodeURIComponent).join("/") : "";
  const initials = (n) => String(n).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const face = (n, f) => `<span class="tp-face"><i>${esc(initials(n))}</i>${f ? `<img src="${esc(pic(f))}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />` : ""}</span>`;
  const pc = (p) => (+p).toFixed(+p % 1 ? 1 : 0) + "%";
  const card = (t, i, sub) => `<li class="tp-card${i === 0 ? " is-first" : ""}">${face(t[2], t[6])}<b>${esc(t[2])}</b><span class="tp-pct">${pc(t[3])}</span>${sub || t[5] || t[4] ? `<small>${esc(sub || t[5] || t[4])}</small>` : ""}</li>`;
  const chip = (t) => `<li>${face(t[2], t[6])}<span><b>${esc(t[2])}</b><small>${pc(t[3])}${t[4] ? ", " + esc(t[4]) : ""}</small></span></li>`;
  const years = [...new Set(TOP.map((t) => t[0]))].sort((a, b) => b - a);
  const latest = years[0] || 0;
  const of = (y, c) => TOP.filter((t) => t[0] === y && t[1] === c).sort((a, b) => b[3] - a[3]);

  // A moving wall of every 90%+ student: two rows drifting opposite ways, paused on hover or focus.
  const wall = (l) => {
    if (l.length < 8) return `<ol class="tp-chips">${l.map(chip).join("")}</ol>`;
    const h = Math.ceil(l.length / 2);
    const row = (part, rev) => `<div class="mq${rev ? " mq--rev" : ""}" style="--d:${Math.max(30, part.length * 3.2)}s"><ol class="mq-track">${part.map(chip).join("")}</ol><ol class="mq-track" aria-hidden="true">${part.map(chip).join("")}</ol></div>`;
    return `<div class="mq-wall">${row(l.slice(0, h))}${row(l.slice(h), 1)}</div>`;
  };
  // Podium: second, first, third, with the score counting up when it comes into view.
  const podium = (l) => `<ol class="podium">${[1, 0, 2].filter((k) => l[k]).map((k) => `<li class="pd pd--${k + 1}">${face(l[k][2], l[k][6])}<b>${esc(l[k][2])}</b><span class="tp-pct" data-count="${l[k][3]}">${pc(l[k][3])}</span>${l[k][5] || l[k][4] ? `<small>${esc(l[k][5] || l[k][4])}</small>` : ""}<i class="pd-step">${k + 1}</i></li>`).join("")}</ol>`;
  const yearView = (y) => ["XII", "X"].map((c) => {
    const l = of(y, c); if (!l.length) return "";
    return `<div class="ach-cls"><h4>Class ${c}<span>${l.length} students at 90% and above</span></h4>${podium(l)}${l.length > 3 ? wall(l) : ""}${l.length > 3 ? `<details class="tp-all"><summary>See all ${l.length} as a list</summary><ol class="tp-chips">${l.map(chip).join("")}</ol></details>` : ""}</div>`;
  }).join("");
  const countUp = (root) => {
    const els = $$("[data-count]", root);
    if (reduce || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 1100), v = to * (1 - Math.pow(1 - k, 3)); el.textContent = (k < 1 ? v.toFixed(1) : pc(to).slice(0, -1)) + "%"; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: .6 });
    els.forEach((el) => io.observe(el));
  };
  const tEl = $("[data-toppers]");
  if (tEl && years.length) {
    tEl.innerHTML = `<div class="yr-tabs" role="tablist" aria-label="Board exam year">${years.map((y, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-y="${y}">${y}</button>`).join("")}</div><div class="yr-view" role="tabpanel" aria-live="polite">${yearView(latest)}</div>`;
    const view = $(".yr-view", tEl);
    countUp(view);
    $(".yr-tabs", tEl).addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      $$(".yr-tabs button", tEl).forEach((x) => x.setAttribute("aria-selected", x === b));
      view.classList.remove("in"); void view.offsetWidth;
      view.innerHTML = yearView(+b.dataset.y); view.classList.add("in"); countUp(view);
    });
  }
  const rEl = $("[data-results]");
  if (rEl && years.length) {
    // Year by year: a bar per class sized by how many scored 90%+, with that class's topper beside it.
    const max = Math.max(...years.flatMap((y) => ["XII", "X"].map((c) => of(y, c).length)));
    const lane = (y, c) => { const l = of(y, c); if (!l.length) return `<div class="gl-lane gl-lane--none"><span class="gl-cls">Class ${c}</span><span class="gl-nil">Not in the school's list</span></div>`;
      return `<div class="gl-lane gl-lane--${c.toLowerCase()}"><span class="gl-cls">Class ${c}</span><span class="gl-track"><i class="gl-bar" style="--w:${(l.length / max * 100).toFixed(1)}%"></i><b class="gl-n">${l.length}</b></span><span class="gl-top">${face(l[0][2], l[0][6])}<span><b>${pc(l[0][3])}</b><small>${esc(l[0][2])}</small></span></span></div>`; };
    rEl.innerHTML = `<div class="glance">${years.map((y) => `<div class="gl-year"><h3>${y}</h3><div>${lane(y, "XII")}${lane(y, "X")}</div></div>`).join("")}</div><p class="note mt-s">Bars show how many students scored 90% and above in the CBSE board exams, from the toppers list the school publishes. Beside each bar is that class's top score.</p>`;
    const g = $(".glance", rEl);
    if (reduce || !("IntersectionObserver" in window)) g.classList.add("in");
    else { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .4 }); $$(".gl-year", g).forEach((r) => io.observe(r)); }
  }
  const aEl = $("[data-awards]");
  if (aEl && AW.length) {
    // The headline number of each achievement, set large: a rank, a percentile, or a position.
    const big = (t) => { let m;
      if ((m = t.match(/All India Rank (\d+)/))) return [m[1], "All India Rank" + (/IAS/.test(t) ? ", IAS" : /UPSC (\d{4})/.test(t) ? ", UPSC " + t.match(/UPSC (\d{4})/)[1] : /CLAT/.test(t) ? ", CLAT 2025" : / percentile/.test(t) ? ", " + t.match(/([\d.]+) percentile/)[1] + " percentile" : "")];
      if ((m = t.match(/([\d.]+) percentile/))) return [m[1], "percentile" + (/Session 2/.test(t) ? ", Session 2" : "")];
      if (/Second/.test(t)) return ["2nd", "in Faridabad district"];
      return ["CA", "Qualified as a Chartered Accountant"]; };
    const ORDER = ["Civil Services", "CLAT", "Chartered Accountancy", "JEE Main"];
    const list = AW.slice().sort((a, b) => ORDER.indexOf(a[1]) - ORDER.indexOf(b[1]) || b[0] - a[0]);
    const star = list[0], [sn, sl] = big(star[3]);
    const medal = (a) => { const [n, l] = big(a[3]); return `<li class="medal">${face(a[2], a[4])}<span class="md-n">${esc(n)}</span><span class="md-l">${esc(l)}</span><b>${esc(a[2])}</b><small>${esc(a[1])}, ${a[0]}</small></li>`; };
    aEl.innerHTML = `<article class="plaque">${face(star[2], star[4])}<div><span class="pl-k">${esc(star[1])}, ${star[0]}</span><p class="pl-n"><span>${esc(sn)}</span>${esc(sl)}</p><h3>${esc(star[2])}</h3><p class="pl-s">A former St. John's student who cleared the civil services exam, one of the hardest in India, with an All India Rank of ${esc(sn)}.</p></div></article>`
      + ORDER.map((ar) => { const l = list.filter((a) => a[1] === ar && a !== star); return l.length ? `<div class="hon-grp"><h4>${esc(ar)}<span>${l.length}</span></h4><ul class="medals">${l.map(medal).join("")}</ul></div>` : ""; }).join("");
    if (reduce || !("IntersectionObserver" in window)) $$(".medal, .plaque", aEl).forEach((m) => m.classList.add("in"));
    else { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .5 }); $$(".medal, .plaque", aEl).forEach((m, i) => { m.style.setProperty("--i", i % 6); io.observe(m); }); }
  }
  const cEl = $("[data-cosch]"), CS = S.COSCH || [];
  if (cEl && CS.length) {
    // Medals and prizes outside the exam hall, one session at a time, newest first.
    const yrs = [...new Set(CS.map((c) => c[0]))];
    const who = (t) => t.split(/,| of | from | - | got | won | secured | bagged /i)[0].trim().slice(0, 40);
    const view = (y) => { const l = CS.filter((c) => c[0] === y); return `<p class="cs-n">${l.length} achievements in ${esc(y.replace("-", "–"))}</p><ul class="cs-list">${l.map((c) => `<li>${face(who(c[1]), c[2])}<p>${esc(c[1])}</p></li>`).join("")}</ul>`; };
    cEl.innerHTML = `<div class="yr-tabs" role="tablist" aria-label="Session">${yrs.map((y, i) => `<button type="button" role="tab" aria-selected="${!i}" data-y="${y}">${esc(y.replace("-", "–"))}</button>`).join("")}</div><div class="cs-view">${view(yrs[0])}</div>`;
    cEl.addEventListener("click", (e) => { const b = e.target.closest("[data-y]"); if (!b) return; $$("[data-y]", cEl).forEach((x) => x.setAttribute("aria-selected", x === b)); $(".cs-view", cEl).innerHTML = view(b.dataset.y); });
  }

  // Previews: home under the today strip, admissions under the hero.
  if (latest) {
    const xii = of(latest, "XII"), x = of(latest, "X");
    const today = $("[data-today]");
    const top = [[xii[0], "Class XII"], [x[0], "Class X"]].filter((p) => p[0]);
    if (today) today.insertAdjacentHTML("afterend", `<section class="wins" aria-label="Board toppers ${latest}"><div class="wrap wins-in"><div><h2>Our Toppers ${latest}</h2><p class="note">${xii.length + x.length} students scored 90% and above in the CBSE boards.</p><a class="adm-go" href="achievements.html">See All Results</a></div><ol class="tp-row tp-row--sm">${top.map(([t, s], i) => card(t, i, s)).join("")}</ol></div>${wall([...xii, ...x].sort((a, b) => b[3] - a[3]))}</section>`);
    const now = $(".adm-now");
    if (now) now.insertAdjacentHTML("afterend", `<p class="adm-proof"><a href="achievements.html">${latest} boards: ${xii.length} in Class XII and ${x.length} in Class X scored 90% and above</a></p>`);
  }
})();

/* Facilities: figures count up and their small visuals fill in once, when the panel comes into view. */
(() => {
  const p = document.querySelector(".campus-n");
  if (!p) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nums = [...p.querySelectorAll(".cn-num")];
  const fmt = (v, n) => n.includes(".") ? v.toFixed(2) : Math.round(v).toLocaleString("en-IN");
  const go = () => {
    p.classList.add("is-in");
    if (still) return;
    nums.forEach((el, i) => {
      const n = el.dataset.n, to = +n, t0 = performance.now() + i * 90, dur = 1100;
      const step = t => {
        const k = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(to * e, n);
        if (k < 1) requestAnimationFrame(step);
      };
      el.textContent = fmt(0, n); requestAnimationFrame(step);
    });
  };
  if (!("IntersectionObserver" in window)) return go();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { threshold: .35 });
  io.observe(p);
})();
