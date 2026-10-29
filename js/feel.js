/* The feel of the signed-in pages, shared by every role:
   a "this week" ribbon on the home page, a role photo in the
   greeting, search across the portal (Ctrl/⌘ K or /), friendlier empty states, long tables
   with a header that stays put, a tick on finished actions, and the help button that tucks
   itself away while you scroll. All of it works from the records already in the page. */
(() => {
  const S = window.SJS; if (!S) return;
  const $ = (q, el = document) => el.querySelector(q), $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const drv = document.body.classList.contains("drv"), parent = !!S.me && !S.staff;
  const role = drv ? "driver" : S.staff ? S.staff.role : parent ? "parent" : "";
  const HOME = role === "principal" || role === "admin" ? "overview" : "home";
  const svg = (d, cls = "") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${d}</svg>`;
  const pad = (n) => String(n).padStart(2, "0"), isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  try { localStorage.removeItem("sjs-theme"); } catch (e) {} // dark mode was retired; forget any saved choice
  const bar = $(".pbar-r");

  // ---------- Search across the portal ----------
  const pages = () => {
    const seen = new Set();
    return $$("#nav-side .side-btn[data-go], #nav-bottom .side-btn[data-go]").map((b) => ({ go: b.dataset.go, label: [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() })).filter((p) => p.label && !seen.has(p.go) && seen.add(p.go));
  };
  const people = () => {
    if (role === "teacher") return (S.staff.sections || []).flatMap((k) => { const x = S.sectionByKey(k); return x ? x.students.map((s) => ({ t: s.name, sub: `${x.label || k} · Roll ${pad(s.roll)}`, sec: k, roll: s.roll })) : []; });
    if (role === "principal" || role === "admin") return S.allSections().map((x) => ({ t: `${x.label || x.cls + "-" + x.sec}`, sub: `Class teacher ${x.teacher || ""}`.trim(), cls: x.cls + "-" + x.sec }));
    return [];
  };
  const notices = () => (parent && S.noticesFor ? S.noticesFor(S.me) : S.state.notices || []).slice(0, 40).map((n) => ({ t: n.title, sub: n.date ? S.fmt(n.date, { day: "numeric", month: "short" }) : "", go: parent ? "homework" : role === "teacher" ? "home" : "notices" }));
  let pal = null, hits = [], sel = 0;
  function openPal() {
    if (drv) return;
    if (!pal) {
      pal = document.createElement("div"); pal.className = "pal"; pal.setAttribute("role", "dialog"); pal.setAttribute("aria-label", "Search");
      pal.innerHTML = `<div class="pal-card"><label class="pal-in">${svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>')}<input type="search" placeholder="${role === "teacher" ? "A student, a page or a notice" : parent ? "A page or a notice" : "A class, a page or a notice"}" aria-label="Search" autocomplete="off" /><kbd>Esc</kbd></label><div class="pal-list" role="listbox"></div><p class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span></p></div>`;
      document.body.append(pal);
      pal.addEventListener("mousedown", (e) => { if (e.target === pal) closePal(); });
      $("input", pal).addEventListener("input", draw);
      $("input", pal).addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % Math.max(1, hits.length); mark(); }
        else if (e.key === "Enter") { e.preventDefault(); if (hits[sel]) pick(hits[sel]); }
        else if (e.key === "Escape") closePal();
      });
      pal.addEventListener("click", (e) => { const r = e.target.closest("[data-i]"); if (r) pick(hits[+r.dataset.i]); });
      pal.addEventListener("mousemove", (e) => { const r = e.target.closest("[data-i]"); if (r && +r.dataset.i !== sel) { sel = +r.dataset.i; mark(); } });
    }
    pal.classList.add("on"); $("input", pal).value = ""; draw(); setTimeout(() => $("input", pal).focus(), 20);
  }
  const closePal = () => pal && pal.classList.remove("on");
  function draw() {
    const q = $("input", pal).value.trim().toLowerCase(), fit = (t) => !q || t.toLowerCase().split(/[\s·,-]+/).some((w) => w.startsWith(q)) || t.toLowerCase().includes(q);
    const P = pages().filter((p) => fit(p.label)).map((p) => ({ kind: "Pages", t: p.label, go: p.go }));
    const N = people().filter((p) => q && fit(p.t)).slice(0, 8).map((p) => Object.assign({ kind: role === "teacher" ? "Students" : "Classes" }, p));
    const T = notices().filter((n) => q && fit(n.t)).slice(0, 5).map((n) => Object.assign({ kind: "Notices" }, n));
    const SET = ["text size", "font", "bigger", "larger", "zoom", "settings"].concat(parent ? ["hindi", "language", "bhasha", "हिन्दी", "भाषा"] : []);
    const X = q && S.openSettings && SET.some((w) => w.startsWith(q) || q.startsWith(w.split(" ")[0])) ? [{ kind: "Settings", t: parent ? "Text size and language" : "Text size", sub: parent ? "Larger text, or switch to हिन्दी" : "Make the text larger", settings: true }] : [];
    hits = [...P.slice(0, q ? 6 : 12), ...N, ...T, ...X]; sel = 0;
    const IC = { Pages: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>', Students: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', Classes: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>', Notices: '<path d="M4 10v4l4 1 8 4V5L8 9z"/>', Settings: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>' };
    let last = "";
    $(".pal-list", pal).innerHTML = hits.length ? hits.map((h, i) => { const head = h.kind !== last ? `<p class="pal-g">${h.kind}</p>` : ""; last = h.kind; return `${head}<button type="button" role="option" data-i="${i}" class="${i ? "" : "on"}"><span class="pal-ic">${svg(IC[h.kind])}</span><span class="pal-t"><b>${esc(h.t)}</b>${h.sub ? `<small>${esc(h.sub)}</small>` : ""}</span><span class="pal-go">↵</span></button>`; }).join("")
      : `<p class="pal-none">Nothing matches “${esc(q)}”. Try a name, a class like VII-B, or a page.</p>`;
  }
  function mark() { $$("[data-i]", pal).forEach((b) => b.classList.toggle("on", +b.dataset.i === sel)); const on = $("[data-i].on", pal); if (on) on.scrollIntoView({ block: "nearest" }); }
  function pick(h) {
    closePal();
    if (h.settings) { S.openSettings && S.openSettings(); return; }
    if (h.kind === "Pages" || h.kind === "Notices") { S.go(h.go); return; }
    if (h.cls) { S.go("classes"); const b = document.createElement("button"); b.dataset.sec = h.cls; b.hidden = true; document.body.append(b); b.click(); b.remove(); return; }
    if (h.sec) { // a student: their year, on My class
      S.go("class/year");
      setTimeout(() => {
        const sec = $("#sj-sec"); if (sec && sec.value !== h.sec) { sec.value = h.sec; sec.dispatchEvent(new Event("change", { bubbles: true })); }
        const stu = $('[data-jmode="stu"]'); if (stu && !stu.classList.contains("on")) stu.click();
        const who = $("#sj-who"); if (who) { who.value = String(h.roll); who.dispatchEvent(new Event("change", { bubbles: true })); }
        const box = $("#sj"); if (box) box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }, 60);
    }
  }
  if (!drv && bar) {
    const b = document.createElement("button"); b.type = "button"; b.className = "icon-btn pal-btn"; b.setAttribute("aria-label", "Search (Ctrl K)");
    b.innerHTML = svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>') + `<span>Search</span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"} K</kbd>`;
    b.addEventListener("click", openPal); bar.insertBefore(b, bar.firstChild);
  }
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "") || (e.target || {}).isContentEditable;
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); pal && pal.classList.contains("on") ? closePal() : openPal(); }
    else if (e.key === "/" && !typing) { e.preventDefault(); openPal(); }
    else if (e.key === "Escape" && pal && pal.classList.contains("on")) closePal();
  });

  // ---------- This week, on the home page ----------
  function weekHTML() {
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(S.today); d.setDate(d.getDate() + i); return d; });
    const from = isoOf(days[0]), to = isoOf(days[6]), ev = {};
    const add = (iso, tone, t) => { if (iso < from || iso > to) return; (ev[iso] = ev[iso] || []).push({ tone, t }); };
    Object.entries(S.HOLIDAYS || {}).forEach(([k, v]) => add(k, "slate", v));
    (S.CALENDAR || []).forEach(([k, v]) => add(k, "royal", v));
    if (parent) {
      (S.examsFor ? S.examsFor(S.me) : []).forEach((e) => (e.papers[S.groupOf(S.me)] || []).forEach((p) => add(p.date, "accent", `${p.subj} paper`)));
      ((S.cs && S.cs.homework) || []).filter((h) => !h.done).forEach((h) => add(h.due, "gold", `${h.subj} homework due`));
      (S.state.fees || []).filter((f) => !f.paid).forEach((f) => add(f.due, "green", `${f.q.split(" ")[0]} fee due`));
    } else if (role === "teacher") {
      (S.staff.sections || []).forEach((k) => (S.secState(k).homework || []).filter((h) => h.by === S.staff.name).forEach((h) => add(h.due, "gold", `${k}: ${h.title}`)));
    } else if (S.FEE_NOW) add(S.FEE_NOW.due, "green", `${S.FEE_NOW.q} fees due`);
    (parent && S.noticesFor ? S.noticesFor(S.me) : S.state.notices || []).filter((n) => n.date && !(ev[n.date] || []).some((x) => x.t === n.title)).forEach((n) => add(n.date, "teal", n.title));
    const n = Object.values(ev).reduce((a, x) => a + x.length, 0), today = isoOf(S.today);
    const cal = parent || role === "teacher" ? `<button type="button" class="ez-act wk-cal" data-wk-cal aria-label="Add to my calendar" title="Holidays, events, ${parent ? "exam papers and fee dates" : "your exam papers"} for the rest of the session">${svg('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4M12 13v4M10 15h4"/>')}<span>Add to my calendar</span></button>` : "";
    return `<div class="wk"><div class="wk-h"><b>This week</b><span>${n ? `${n} thing${n === 1 ? "" : "s"} coming up` : "A quiet week"} · tap a day</span>${cal}</div><div class="wk-row" role="list">${days.map((d, i) => {
      const k = isoOf(d), xs = ev[k] || [], hol = (S.HOLIDAYS || {})[k], sun = !d.getDay();
      return `<button type="button" role="listitem" class="wk-d${k === today ? " today" : ""}${hol || sun ? " off" : ""}${xs.length ? " has" : ""}" data-wk="${k}" style="--i:${i}" aria-label="${S.fmt(d, { weekday: "long", day: "numeric", month: "long" })}: ${xs.length ? esc(xs.map((x) => x.t).join(", ")) : sun ? "Sunday" : "nothing planned"}">
        <small>${k === today ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" })}</small><b>${d.getDate()}</b>
        <span class="wk-dots">${xs.slice(0, 4).map((x) => `<i class="t-${x.tone}"></i>`).join("")}</span>
        <em>${xs.length ? esc(xs[0].t) : sun ? "Sunday" : ""}</em></button>`;
    }).join("")}</div><div class="wk-more" hidden></div></div>`;
  }
  function mountWeek() {
    const v = $(`[data-view="${HOME}"]`); if (!v) return;
    const hero = $(".hub-top.hero", v); if (!hero) return;
    let w = $(".wk", v); const html = weekHTML();
    if (w) w.outerHTML = html; else hero.insertAdjacentHTML("afterend", html);
  }
  // The rest of the session in the family (or teacher's) calendar: holidays as one event per break, school events, exam papers, fee dates.
  function sessionEvents() {
    const today = isoOf(S.today), ev = [], hol = Object.entries(S.HOLIDAYS || {}).filter(([k]) => k >= today).sort(([a], [b]) => (a < b ? -1 : 1));
    hol.forEach(([k, v]) => { const last = ev[ev.length - 1], gap = last && Math.round((new Date(k + "T00:00") - new Date((last.to || last.date) + "T00:00")) / 864e5); if (last && last.hol === v && gap <= 3) last.to = k; else ev.push({ date: k, title: `${v} · school closed`, hol: v }); });
    (S.CALENDAR || []).filter(([k, t]) => k >= today && !/Unit Test|Half-yearly|Final exams/.test(t)).forEach(([k, t]) => ev.push({ date: k, title: t }));
    if (parent) {
      (S.examsFor ? S.examsFor(S.me) : []).filter((x) => x.published).forEach((x) => (x.papers[S.groupOf(S.me)] || []).filter((p) => p.date >= today).forEach((p) => ev.push({ date: p.date, title: `${p.subj} paper · ${x.name} (${S.me.first})`, note: x.time, alarm: 1 })));
      (S.kidFees ? S.kidFees(S.kidKey) : []).filter((f) => !f.paid && f.due >= today).forEach((f) => ev.push({ date: f.due, title: `School fee due · ${f.q.split(" · ")[0]} (${S.me.first})`, alarm: 3 }));
    } else {
      const mine = [...new Set((S.staff.sections || []).map((k) => S.sectionByKey(k).cls))];
      (S.state.exams || []).filter((x) => x.published).forEach((x) => S.examGroups(x.classes).filter((g) => mine.includes(g.split("-")[0])).forEach((g) => (x.papers[g] || []).filter((p) => p.date >= today && p.subj === S.staff.subject).forEach((p) => ev.push({ date: p.date, title: `${S.groupLabel(g)} · ${p.subj} paper (${x.name})`, note: x.time, alarm: 1 }))));
    }
    return ev.sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-wk-cal]")) return;
    const ev = sessionEvents();
    S.ics(ev, `St-Johns-${parent ? S.me.first : "Calendar"}-2026-27`);
    S.toast(`Open the file to add ${ev.length} dates to your calendar: holidays, events${parent ? ", exam papers and fee dates" : " and your exam papers"}`, { done: false });
  });
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-wk]"); if (!d) return;
    const wk = d.closest(".wk"), more = $(".wk-more", wk), on = d.classList.contains("sel");
    $$(".wk-d", wk).forEach((x) => x.classList.remove("sel"));
    if (on) { more.hidden = true; return; }
    d.classList.add("sel");
    const items = d.getAttribute("aria-label").split(": ").slice(1).join(": ");
    more.innerHTML = `<b>${esc(d.getAttribute("aria-label").split(": ")[0])}</b><span>${esc(items.charAt(0).toUpperCase() + items.slice(1))}</span>`;
    more.hidden = false;
  });

  // ---------- A role photo in the greeting ----------
  function band() {
    const hero = $(`[data-view="${HOME}"] .hub-top.hero`); if (!hero || $(".hb", hero)) return;
    const lvl = parent ? (S.me.ci != null ? S.me.ci : 7) : 7;
    const pic = parent ? (lvl < 4 ? "pp-play" : lvl < 9 ? "pp-room" : "p-seniors") : role === "teacher" ? "pp-lab" : "campus";
    hero.insertAdjacentHTML("afterbegin", `<div class="hb" aria-hidden="true"><img src="assets/photos/${pic}.webp" alt="" loading="lazy" /></div>`);
  }

  // ---------- Empty states: an icon and, where it helps, the next step ----------
  const EMPTY = [
    [/mark/i, '<path d="M5 20V10M12 20V4M19 20v-7"/>', { teacher: ["Enter marks", "marks"] }],
    [/homework/i, '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', { teacher: ["Post homework", "homework"] }],
    [/message|repl|chat/i, '<path d="M4 5h16v11H8l-4 4z"/>', { parent: ["Write to the teacher", "messages"] }],
    [/notice/i, '<path d="M4 10v4l4 1 8 4V5L8 9z"/>', { principal: ["Send a notice", "notices"], admin: ["Send a notice", "notices"] }],
    [/leave/i, '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', {}],
    [/meet|ptm|book|slot/i, '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.4"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5"/>', { parent: ["Book a slot", "messages/ptm"] }],
    [/./, '<path d="M12 3c-4 4-7 7-7 11a7 7 0 0 0 14 0c0-4-3-7-7-11z"/><path d="M9 15c1 1.5 2 2 3 2"/>', {}]
  ];
  function empties(root) {
    $$("p.muted, p.chart-empty, p.none, .empty", root).forEach((p) => {
      if (p.dataset.es || p.closest(".ai-panel, .pal, td, .xs-menu, .xdp, .hint, .field, .wk")) return;
      const t = p.textContent.trim();
      if (t.length > 150 || !/^(no |nothing|none|not .{0,30} yet|you haven.t|there are no|no-one|nobody)/i.test(t)) return;
      p.dataset.es = 1;
      const [, ic, acts] = EMPTY.find(([re]) => re.test(t)), a = acts[role], here = (location.hash.slice(1) || HOME).split("/")[0];
      p.classList.add("es");
      p.insertAdjacentHTML("afterbegin", `<span class="es-ic">${svg(ic)}</span>`);
      if (a && a[1].split("/")[0] !== here) p.insertAdjacentHTML("beforeend", ` <button type="button" class="es-go" data-go="${a[1]}">${a[0]} →</button>`);
    });
  }

  // ---------- Long tables keep their header in view ----------
  function tables(root) { $$(".tbl-wrap", root).forEach((w) => { const n = $$("tbody tr", w).length; w.classList.toggle("tall", n > 14); }); }

  // ---------- Marks: each mark takes its grade colour as it's typed ----------
  const markBand = (inp) => { const max = (S.ENTRY && S.ENTRY.max) || 100, v = inp.value.trim(), p = v === "" ? null : (+v / max) * 100; inp.dataset.band = p === null || isNaN(p) ? "" : p > 100 ? "x" : p >= 80 ? "a" : p >= 60 ? "b" : p >= 40 ? "c" : "d"; };
  document.addEventListener("input", (e) => { if (e.target.matches && e.target.matches("input.mark")) markBand(e.target); });
  const bands = () => $$("input.mark").forEach(markBand);

  // ---------- Watch what the pages draw ----------
  let q = 0;
  const pass = () => { q = 0; empties(document.querySelector("main") || document); tables(document); bands(); };
  new MutationObserver(() => { if (!q) q = requestAnimationFrame(pass); }).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
  pass();

  // ---------- The help button tucks to a circle while you scroll down ----------
  let lastY = scrollY;
  addEventListener("scroll", () => { const y = scrollY; document.body.classList.toggle("fab-mini", y > 240 && y > lastY - 4); lastY = y; }, { passive: true });

  // ---------- Home: the week ribbon and the photo ----------
  if (!drv) { mountWeek(); band(); document.addEventListener("sjs:redraw", mountWeek); }
})();
