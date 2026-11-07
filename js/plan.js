/* The academic planner's page: who teaches which subject in which class, class teachers, each
   teacher's responsibilities and the pages they see.
   - Teachers: one teacher at a time. Hand a class over to someone else or take one on, pick the
     class they're class teacher of, tick their responsibilities and the pages they get.
   - Classes: every section's subjects in a grid, with the teacher for each and the class teacher.
   - Responsibilities: every teacher's duties in one list; who is on invigilation and cover.
   - Changes: teaching changes wait in a draft. "Build the timetable" runs js/ttsolve.js in a
     worker from the week in use, so only what has to move moves; it checks every rule (no
     teacher in two rooms, labs, a free period every day). Publish, and every teacher's page,
     every class's week and the parents' timetables change together.
   Responsibilities and pages save at once; they don't change the timetable.
   State: S.state.plan = { draft: { teachers, built }, pub, log } and S.state.staffRoles (both shared). */
(() => {
  const S = window.SJS, TT = window.SJS_TT, ME = S && S.staff;
  if (!ME || ME.role !== "planner" || !TT || !document.getElementById("pl")) return;
  const esc = S.esc, $ = (q, el = document) => el.querySelector(q);
  const hon = (n) => String(n || "").replace(/^(Mr|Mrs|Ms|Dr)\.\s+/, "");
  const secName = S.secName, SECS = TT.SECS, NEHA = TT.NEHA_ID;
  const SHORT = { Mathematics: "Maths", "Applied Mathematics": "Applied Maths", "Social Science": "Social Sc.", "Information Technology": "IT", "Business Studies": "Business St.", "Physical Education": "PE" };
  const sh = (x) => SHORT[x] || x;
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ui = { t: null, tab: "teachers", busy: false, prog: 0 };

  // ---------- The plan in use, and the draft ----------
  const copy = (ts) => ts.map((t) => ({ id: t.id, name: t.name, subject: t.subject, teach: Object.assign({}, t.teach), classOf: t.classOf || null }));
  const live = () => copy(S.livePlan.teachers);
  const P = () => S.state.plan || (S.state.plan = {});
  const draft = () => (P().draft ? P().draft.teachers : null);
  const work = () => draft() || live();
  const edit = () => { if (!P().draft) P().draft = { teachers: live(), by: ME.name }; return P().draft.teachers; };
  const sigOf = (ts) => JSON.stringify(ts.map((t) => [t.id, t.teach, t.classOf]));
  const built = () => { const d = P().draft; return d && d.built && d.built.sig === sigOf(d.teachers) ? d.built : null; };
  const byId = (ts, id) => ts.find((t) => t.id === id);
  const ownerOf = (ts, k, x) => ts.find((t) => t.teach[k] === x) || null;
  // Loads, with the Library and Value Education top-ups the solver would share out (keeping the ones in use).
  const KEEP = Object.fromEntries(S.livePlan.teachers.map((t) => [t.id, t.top || {}]));
  let LC = { sig: "", loads: {} };
  const loads = (ts = work()) => { const g = sigOf(ts); if (LC.sig !== g) LC = { sig: g, loads: Object.fromEntries(TT.prepare(ts, KEEP).map((t) => [t.id, TT.loadOf(t)])) }; return LC.loads; };
  const liveLoads = (() => { let L = null; return () => L || (L = Object.fromEntries(TT.prepare(live(), KEEP).map((t) => [t.id, TT.loadOf(t)]))); })();
  // What the draft changes: each class-subject that moves to someone else, and class teachers.
  const changes = () => {
    const a = live(), b = work(), out = [];
    SECS.forEach((k) => TT.subjectsOf(k).forEach((x) => { const o = ownerOf(a, k, x), n = ownerOf(b, k, x);
      if ((o && o.id) !== (n && n.id)) out.push({ k, x, from: o, to: n, text: `${secName(k)} ${x}: ${n ? n.name : "nobody"}${o ? ` (was ${o.name})` : ""}` }); }));
    SECS.forEach((k) => { const o = a.find((t) => t.classOf === k), n = b.find((t) => t.classOf === k);
      if ((o && o.id) !== (n && n.id)) out.push({ k, ct: true, from: o, to: n, text: `${secName(k)} class teacher: ${n ? n.name : "nobody"}${o ? ` (was ${o.name})` : ""}` }); });
    return out;
  };
  const changedIds = () => { const s = new Set(); changes().forEach((c) => { if (c.from) s.add(c.from.id); if (c.to) s.add(c.to.id); }); return s; };
  const problems = () => TT.problems(work());
  const isOut = (n) => n < TT.MIN || n > TT.MAX;
  const loadNote = (n) => n > TT.MAX ? `${n - TT.MAX} over the most a week can hold with a free period every day` : n < TT.MIN ? `${TT.MIN - n} under a full week` : "within 33 to 39";

  // ---------- Moving a class from one teacher to another ----------
  // Hand k's subject x to teacher `to`. A class teacher who no longer teaches their class stops being its class teacher.
  function hand(k, x, toId) {
    const ts = edit(), from = ownerOf(ts, k, x), to = byId(ts, toId); if (!to || (from && from.id === toId)) return;
    // One subject per teacher in a section.
    if (to.teach[k] && to.teach[k] !== x) { tidy(); S.toast(`${hon(to.name)} already teaches ${to.teach[k]} in ${secName(k)}. Hand that to someone else first.`); return; }
    if (from) { delete from.teach[k]; if (from.classOf === k && !from.teach[k]) from.classOf = null; }
    to.teach[k] = x;
    tidy(); S.save();
    S.toast(`${hon(to.name)} takes ${secName(k)} ${x}${from ? ` from ${hon(from.name)}` : ""}. Not published yet.`, { done: true });
  }
  // Class teacher of k: `id` (or nobody). Their old class loses its class teacher, and so does k's old one.
  function setCT(id, k) {
    const ts = edit(), t = byId(ts, id); if (!t) return;
    if (k) ts.forEach((o) => { if (o.classOf === k) o.classOf = null; });
    t.classOf = k || null; tidy(); S.save();
    S.toast(k ? `${hon(t.name)}: class teacher of ${secName(k)}. Not published yet.` : `${hon(t.name)} is no longer a class teacher. Not published yet.`, { done: true });
  }
  // A draft that ends up the same as the plan in use isn't a draft.
  const tidy = () => { if (P().draft && sigOf(P().draft.teachers) === sigOf(live())) P().draft = null; };

  // ---------- Responsibilities and pages (saved at once) ----------
  const R = () => S.state.staffRoles || (S.state.staffRoles = {});
  const rr = (id) => R()[id] || (R()[id] = {});
  function setRole(id, key, val) {
    const r = rr(id), t = S.STAFF[id];
    if (key === "duty") { const d = r.duties || (r.duties = []); const i = d.indexOf(val.d); if (val.on && i < 0) d.push(val.d); if (!val.on && i >= 0) d.splice(i, 1); }
    else if (key === "page") { const h = r.hide || (r.hide = []); const i = h.indexOf(val.v); if (val.on && i >= 0) h.splice(i, 1); if (!val.on && i < 0) h.push(val.v); }
    else r[key] = val ? undefined : false;
    Object.keys(r).forEach((x) => (r[x] === undefined || (Array.isArray(r[x]) && !r[x].length)) && delete r[x]);
    if (!Object.keys(r).length) delete R()[id];
    S.save();
    const what = key === "duty" ? `${val.d}: ${val.on ? "added" : "removed"}` : key === "page" ? `${(S.TEACHER_PAGES.find(([v]) => v === val.v) || [])[1]}: ${val.on ? "shown" : "hidden"}` : key === "inv" ? `invigilation ${val ? "on" : "off"}` : `cover periods ${val ? "on" : "off"}`;
    S.toast(`${hon(t.name)} · ${what}. They see it now.`, { done: true });
  }

  // ---------- Building the timetable ----------
  let worker = null;
  function build() {
    if (ui.busy || problems().length) return;
    const ts = work(), start = {}, rooms = {};
    SECS.forEach((k) => { start[k] = S.timetableOf(k); rooms[k] = S.roomsOf(k); });
    ui.busy = true; ui.prog = 0; ui.err = ""; drawChanges(); bar();
    const done = (r) => {
      ui.busy = false;
      if (!P().draft) return;
      P().draft.built = { sig: sigOf(ts), r: { teachers: r.teachers, timetables: r.timetables, rooms: r.rooms, cost: r.cost, clashes: r.clashes, labClash: r.labClash, shape: r.shape, free: r.free, tight: r.tight, moved: r.moved, loads: r.loads, ms: r.ms }, at: S.timeNow() };
      S.save(); draw();
      const ok = !r.clashes && !r.labClash;
      S.toast(ok ? `Timetable built: ${r.moved} period${r.moved === 1 ? "" : "s"} move, no clashes` : `The timetable still has clashes. Change the plan and build again.`, { done: ok });
    };
    const msg = { teachers: ts, keep: KEEP, start, rooms, seed: 20261107, iter: 6e6 };
    const src = (document.querySelector('script[src*="ttsolve.js"]') || {}).getAttribute ? document.querySelector('script[src*="ttsolve.js"]').getAttribute("src") : "js/ttsolve.js";
    try {
      worker = new Worker(src);
      worker.onmessage = (e) => { const m = e.data; if (m.tick !== undefined) { ui.prog = m.tick; const b = $("#pl-prog i"); if (b) b.style.width = Math.round(m.tick * 100) + "%"; } if (m.done) { worker.terminate(); worker = null; done(m.done); } };
      worker.onerror = () => { worker = null; local(msg, done); };
    } catch (e) { local(msg, done); }
    if (worker) worker.postMessage(msg);
  }
  // No worker (a file opened from disk): solve on the page, after it has painted.
  const local = (m, done) => setTimeout(() => { const t0 = Date.now(), r = TT.solve(TT.prepare(m.teachers, m.keep), { seed: m.seed, iter: m.iter, start: m.start, startRooms: m.rooms }); delete r.rnd; r.ms = Date.now() - t0; done(r); }, 60);

  function publish() {
    const b = built(); if (!b || b.r.clashes || b.r.labClash) return;
    const ch = changes(), r = b.r, rooms = Object.assign({}, r.rooms); delete rooms["VII-B"];
    P().pub = { teachers: r.teachers.map((t) => ({ id: t.id, name: t.name, subject: t.subject, teach: t.teach, top: t.top, classOf: t.classOf })), timetables: r.timetables, rooms, at: new Date().toISOString(), by: ME.name, n: ch.length, moved: r.moved };
    (P().log = P().log || []).unshift({ at: S.fmt(S.todayKey, { weekday: "short", day: "numeric", month: "short" }) + ", " + S.timeNow(), by: ME.name, lines: ch.map((c) => c.text), moved: r.moved });
    // The office's swaps were the starting week, so they're in the new week already.
    const E = S.state.ttEdit || {}; SECS.forEach((k) => delete E[k]);
    P().draft = null;
    const g = ((S.state.staffroom || {}).threads || {})["g:all"];
    if (g) S.post(g.msgs, { from: ME.id, kind: "notice", text: `Teaching plan updated:\n${ch.map((c) => "• " + c.text).join("\n")}\nEvery timetable has changed to match. Check yours under My timetable.`, at: "Today, " + S.timeNow(), ts: Date.now() });
    if (S.logAct) S.logAct(`Staff plan: published ${ch.length} change${ch.length === 1 ? "" : "s"}; ${r.moved} periods moved`);
    S.save();
    try { sessionStorage.setItem("sjs-flash", `Published. ${ch.length} change${ch.length === 1 ? "" : "s"} and the new timetable are live for every teacher, class and parent.`); } catch (e) {}
    location.reload();
  }

  // ---------- Pieces ----------
  const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const meter = (n) => { const lo = 28, hi = 44, pc = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)).toFixed(1);
    return `<span class="pl-m${isOut(n) ? " out" : ""}" aria-hidden="true"><b style="left:${pc(TT.MIN)}%;right:${100 - pc(TT.MAX)}%"></b><i style="left:${pc(n)}%"></i></span>`; };
  const avatar = (t) => `<span class="avatar ${(S.STAFF[t.id] || {}).tone || ""}">${esc((S.STAFF[t.id] || {}).initials || hon(t.name).split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>`;
  const teachList = (t) => { const ks = Object.keys(t.teach); return (t.id === NEHA ? ["VII-B", ...ks] : ks); };
  const SUBJ_ORDER = ["Mathematics", "Applied Mathematics", "English", "Hindi", "Science", "Physics", "Chemistry", "Biology", "Social Science", "Economics", "Accountancy", "Business Studies", "Computer", "Physical Education"];
  const sorted = (ts) => ts.slice().sort((a, b) => (SUBJ_ORDER.indexOf(a.subject) - SUBJ_ORDER.indexOf(b.subject)) || a.name.localeCompare(b.name));

  // ---------- The strip above the tabs: a draft waiting to be built or published ----------
  function bar() {
    const ch = changes(), pr = problems(), b = built(), el = $("#pl-bar");
    if (!ch.length) { const pub = P().pub;
      S.paint(el, `<div class="tts-msg good pl-strip"><b>The plan in use is live for everyone.</b><span>${pub ? `Last published by ${esc(pub.by)}${P().log && P().log[0] ? ", " + esc(P().log[0].at) : ""}.` : "The school's plan for 2026–27."} Changes to who teaches what wait here until you publish them; responsibilities and pages save at once.</span></div>`); return; }
    const n = `${ch.length} change${ch.length === 1 ? "" : "s"}`;
    if (pr.length) S.paint(el, `<div class="tts-msg bad pl-strip"><b>${n}, not published.</b><span>${pr.length} thing${pr.length === 1 ? "" : "s"} to settle first: ${esc(pr.slice(0, 2).map((p) => p.text).join("; "))}${pr.length > 2 ? "…" : ""}.</span><button type="button" class="link-btn" data-pl-tab="changes">See all</button></div>`);
    else if (ui.busy) S.paint(el, `<div class="tts-msg pick pl-strip"><b>Building the timetable…</b><span>Checking every teacher, class and lab, period by period.</span></div>`);
    else if (b && !b.r.clashes && !b.r.labClash) S.paint(el, `<div class="tts-msg good pl-strip"><b>${n}, timetable ready.</b><span>${b.r.moved} period${b.r.moved === 1 ? "" : "s"} move; no clashes, labs clear. Teachers still see the old plan until you publish.</span><button type="button" class="btn btn-primary btn-sm" data-pl-pub>Publish to everyone</button></div>`);
    else S.paint(el, `<div class="tts-msg pick pl-strip"><b>${n}, not published.</b><span>Teachers still see the plan in use. Build the timetable to check the changes, then publish.</span><button type="button" class="btn btn-primary btn-sm" data-pl-build>Build the timetable</button></div>`);
  }

  // ---------- Teachers ----------
  function drawTeachers() {
    const ts = work(), L = loads(ts), ch = changedIds();
    if (!ui.t || !byId(ts, ui.t)) ui.t = sorted(ts)[0].id;
    const list = sorted(ts).map((t) => { const n = L[t.id], ks = teachList(t), ct = t.id === NEHA ? "VII-B" : t.classOf;
      return `<button type="button" class="pl-ti${t.id === ui.t ? " on" : ""}" data-pl-t="${t.id}" aria-pressed="${t.id === ui.t}">${avatar(t)}<span class="pl-tt"><b>${esc(t.name)}${ch.has(t.id) ? `<i class="pl-dot" title="Changed in the draft"></i>` : ""}</b><small>${esc(sh(t.subject))} · ${ks.length} class${ks.length === 1 ? "" : "es"}${ct ? ` · class teacher ${esc(secName(ct))}` : ""}</small></span><span class="pl-tl${isOut(n) ? " out" : ""}"><em>${n}</em>${meter(n)}</span></button>`; }).join("");
    S.paint($("#pl-teachers"), `<div class="pl-two"><div class="card tts-card pl-list"><div class="card-h"><h2>Teachers</h2><span class="right muted">periods a week</span></div>${list}</div><div class="pl-det">${detail(byId(ts, ui.t), ts, L)}</div></div>`);
  }
  function detail(t, ts, L) {
    const n = L[t.id], was = liveLoads()[t.id], ro = S.rolesOf(t.id), neha = t.id === NEHA;
    const rows = Object.entries(t.teach).map(([k, x]) => {
      const others = sorted(ts.filter((o) => o.id !== t.id));
      return `<tr><th scope="row"><b>${esc(secName(k))}</b></th><td>${esc(x)}</td><td class="pl-n">${TT.weekOf(k)[x]}</td><td><label class="pl-sel"><span class="sr-only">Hand ${esc(secName(k))} ${esc(x)} to</span><select data-pl-hand="${k}|${esc(x)}"><option value="">Hand over to…</option>${others.map((o) => `<option value="${o.id}"${o.teach[k] ? " disabled" : ""}>${esc(hon(o.name))} · ${o.teach[k] ? `teaches ${esc(sh(o.teach[k]))} here` : `${esc(sh(o.subject))} · ${L[o.id]}${L[o.id] + TT.weekOf(k)[x] > TT.MAX ? " (would be over)" : ""}`}</option>`).join("")}</select></label></td></tr>`;
    }).join("");
    // Classes they could take on: any subject in a section that someone else teaches.
    const offer = SECS.map((k) => TT.subjectsOf(k).filter((x) => t.teach[k] !== x && !Object.keys(t.teach).includes(k)).map((x) => { const o = ownerOf(ts, k, x); return { k, x, o }; })).flat()
      .sort((a, b) => ((b.x === t.subject) - (a.x === t.subject)) || SECS.indexOf(a.k) - SECS.indexOf(b.k));
    const take = `<label class="pl-sel pl-take"><span class="sr-only">Take on a class</span><select data-pl-take="${t.id}"><option value="">Take on a class…</option>${offer.map((c) => `<option value="${c.k}|${esc(c.x)}">${esc(secName(c.k))} ${esc(c.x)} · ${TT.weekOf(c.k)[c.x]} a week${c.o ? ` · now ${esc(hon(c.o.name))}` : ""}</option>`).join("")}</select></label>`;
    const ctOpts = Object.keys(t.teach).map((k) => { const o = ts.find((x) => x.classOf === k && x.id !== t.id); return `<option value="${k}"${t.classOf === k ? " selected" : ""}>${esc(secName(k))}${o ? ` · now ${esc(hon(o.name))}` : ""}</option>`; }).join("");
    const ct = neha ? `<span class="pl-fix">VII-B · its week is fixed</span>` : `<label class="pl-sel"><span class="sr-only">Class teacher of</span><select data-pl-ct="${t.id}"><option value="">Not a class teacher</option>${ctOpts}</select></label>`;
    const head = `<div class="card tts-card pl-head"><div class="pl-hh">${avatar(t)}<div><h2>${esc(t.name)}</h2><span class="muted">${esc(t.subject)} · ${esc(t.id)}</span></div><a class="btn btn-ghost btn-sm pl-peek" href="staff.html?id=${encodeURIComponent(t.id)}&peek=1" target="_blank" rel="noopener">${ic('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')}See their view</a></div>
      <div class="pl-facts"><div><span>Periods a week</span><b class="${isOut(n) ? "bad" : ""}">${n}${was !== n ? `<small> was ${was}</small>` : ""}</b>${meter(n)}<small>${loadNote(n)}</small></div><div><span>Class teacher of</span>${ct}</div></div></div>`;
    const teach = `<div class="card tts-card"><div class="card-h"><h2>Teaches</h2><span class="right muted">Library and Value Education top up a light week</span></div>
      <table class="tts-dt pl-tt"><thead><tr><th scope="col">Class</th><th scope="col">Subject</th><th scope="col" class="pl-n">A week</th><th scope="col"><span class="sr-only">Hand over</span></th></tr></thead><tbody>${neha ? `<tr class="fix"><th scope="row"><b>VII-B</b></th><td>Mathematics</td><td class="pl-n">8</td><td><span class="pl-fix">Fixed week</span></td></tr>` : ""}${rows || `<tr><td colspan="4" class="muted">No classes yet.</td></tr>`}</tbody></table>${take}</div>`;
    const duties = `<div class="card tts-card"><div class="card-h"><h2>Responsibilities</h2><span class="right muted">saved at once</span></div>
      <div class="pl-chk">${S.DUTY_LIST.map((d) => `<label class="check sm"><input type="checkbox" data-pl-duty="${t.id}|${esc(d)}"${ro.duties.includes(d) ? " checked" : ""} /> ${esc(d)}</label>`).join("")}${ro.duties.filter((d) => !S.DUTY_LIST.includes(d)).map((d) => `<label class="check sm"><input type="checkbox" data-pl-duty="${t.id}|${esc(d)}" checked /> ${esc(d)}</label>`).join("")}</div>
      <form class="pl-add" data-pl-addf="${t.id}"><input class="input" name="d" maxlength="40" autocomplete="off" placeholder="Another responsibility, e.g. Science fair" aria-label="Another responsibility" /><button class="btn btn-ghost btn-sm" type="submit">Add</button></form>
      <div class="pl-chk pl-sw"><label class="check sm"><input type="checkbox" data-pl-flag="${t.id}|inv"${ro.inv ? " checked" : ""} /> Takes invigilation duty</label><label class="check sm"><input type="checkbox" data-pl-flag="${t.id}|cover"${ro.cover ? " checked" : ""} /> Takes cover periods</label></div>
      <p class="muted pl-note">Exam duty and cover only suggest teachers who take them.</p></div>`;
    const pages = `<div class="card tts-card"><div class="card-h"><h2>Pages they see</h2><span class="right muted">${S.TEACHER_PAGES.length - ro.hide.length} of ${S.TEACHER_PAGES.length}</span></div>
      <div class="pl-chk">${S.TEACHER_PAGES.map(([v, l]) => `<label class="check sm"><input type="checkbox" data-pl-page="${t.id}|${v}"${ro.hide.includes(v) ? "" : " checked"} /> ${esc(l)}</label>`).join("")}</div>
      <p class="muted pl-note">Home, My timetable and ${t.classOf || neha ? "My class" : "My sections"} always show${t.classOf || neha ? ", and Attendance, as a class teacher" : ""}.</p></div>`;
    return head + teach + duties + pages;
  }

  // ---------- Classes: who teaches what, section by section ----------
  const GROUPS = [["Classes VI to VIII", (k) => TT.weekOf(k) === TT.MID], ["Classes IX and X", (k) => TT.weekOf(k) === TT.SEC], ["XI and XII · Science", (k) => TT.weekOf(k) === TT.SCI], ["XI and XII · Commerce", (k) => TT.weekOf(k) === TT.COM]];
  function drawClasses() {
    const ts = work(), a = live(), L = loads(ts), all = sorted(ts);
    const cards = GROUPS.map(([h, f]) => {
      const ks = SECS.filter(f), subs = TT.subjectsOf(ks[0]);
      const rows = ks.map((k) => {
        const ct = ts.find((t) => t.classOf === k), cto = a.find((t) => t.classOf === k);
        const cell = (x) => { const o = ownerOf(ts, k, x), w = ownerOf(a, k, x), chg = (o && o.id) !== (w && w.id);
          return `<td class="${chg ? "chg" : ""}${o ? "" : " none"}"><label class="pl-cell"><span class="sr-only">${esc(secName(k))} ${esc(x)}</span><select data-pl-cell="${k}|${esc(x)}">${o ? "" : `<option value="" selected>Nobody</option>`}${all.map((t) => { const busy = t.teach[k] && t.teach[k] !== x; return `<option value="${t.id}"${o && o.id === t.id ? " selected" : ""}${busy ? " disabled" : ""}>${esc(hon(t.name))}${busy ? ` · teaches ${esc(sh(t.teach[k]))} here` : `${t.subject !== x && !(o && o.id === t.id) ? ` · ${esc(sh(t.subject))}` : ""} · ${L[t.id]}`}</option>`; }).join("")}</select></label></td>`; };
        const teachers = ts.filter((t) => t.teach[k] && t.id !== NEHA); // VII-B is Ms. Neha Mathew's, fixed
        return `<tr><th scope="row"><b>${esc(secName(k))}</b></th><td class="${(ct && ct.id) !== (cto && cto.id) ? "chg" : ""}${ct ? "" : " none"}"><label class="pl-cell"><span class="sr-only">Class teacher of ${esc(secName(k))}</span><select data-pl-cts="${k}">${ct ? "" : `<option value="" selected>Pick one…</option>`}${teachers.map((t) => `<option value="${t.id}"${ct && ct.id === t.id ? " selected" : ""}>${esc(hon(t.name))}</option>`).join("")}</select></label></td>${subs.map(cell).join("")}</tr>`;
      }).join("");
      return `<div class="card tts-card"><div class="card-h"><h2>${h}</h2><span class="right muted">${ks.map(secName).join(", ")}</span></div><div class="tts-scroll"><table class="pl-mx"><thead><tr><th scope="col">Class</th><th scope="col">Class teacher</th>${subs.map((x) => `<th scope="col">${esc(sh(x))}<small>${TT.weekOf(ks[0])[x]} a week</small></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }).join("");
    S.paint($("#pl-classes"), `<p class="muted pl-lead">Pick a teacher in any box to hand them that class. Each name shows their periods a week now; a changed box is marked until you publish. Games, Art, Music, Library and Value Education are shared out on their own. VII-B keeps its own fixed week.</p><div class="pl-grid">${cards}</div>`);
  }

  // ---------- Responsibilities: the whole staff at once ----------
  function drawDuties() {
    const ts = sorted(work());
    const rows = ts.map((t) => { const ro = S.rolesOf(t.id);
      return `<tr><th scope="row"><button type="button" class="link-btn pl-open" data-pl-open="${t.id}"><b>${esc(t.name)}</b></button><small>${esc(sh(t.subject))}${t.classOf || t.id === NEHA ? ` · class teacher ${esc(secName(t.id === NEHA ? "VII-B" : t.classOf))}` : ""}</small></th>
        <td>${ro.duties.length ? ro.duties.map((d) => `<span class="pl-chip">${esc(d)}<button type="button" data-pl-undo="${t.id}|${esc(d)}" aria-label="Remove ${esc(d)}">×</button></span>`).join("") : ""}<label class="pl-sel pl-addd"><span class="sr-only">Add a responsibility for ${esc(t.name)}</span><select data-pl-addd="${t.id}"><option value="">Add…</option>${S.DUTY_LIST.filter((d) => !ro.duties.includes(d)).map((d) => `<option>${esc(d)}</option>`).join("")}</select></label></td>
        <td class="pl-c"><input type="checkbox" data-pl-flag="${t.id}|inv"${ro.inv ? " checked" : ""} aria-label="${esc(t.name)} takes invigilation duty" /></td><td class="pl-c"><input type="checkbox" data-pl-flag="${t.id}|cover"${ro.cover ? " checked" : ""} aria-label="${esc(t.name)} takes cover periods" /></td>
        <td class="pl-c"><button type="button" class="link-btn" data-pl-open="${t.id}" data-pl-sub="pages">${S.TEACHER_PAGES.length - ro.hide.length} of ${S.TEACHER_PAGES.length}</button></td></tr>`; }).join("");
    const by = [...new Set([...S.DUTY_LIST, ...ts.flatMap((t) => S.rolesOf(t.id).duties)])].map((d) => [d, ts.filter((t) => S.rolesOf(t.id).duties.includes(d))]);
    const side = `<div class="card tts-card tts-side"><div class="card-h"><h2>By responsibility</h2></div>${by.map(([d, xs]) => `<div class="tts-pt pl-by"><span><b>${esc(d)}</b><small>${xs.length ? xs.map((t) => esc(hon(t.name))).join(", ") : "Nobody yet"}</small></span><em>${xs.length || "–"}</em></div>`).join("")}
      <div class="tts-pt pl-by"><span><b>Not on invigilation</b><small>${ts.filter((t) => !S.rolesOf(t.id).inv).map((t) => esc(hon(t.name))).join(", ") || "Everyone takes it"}</small></span><em>${ts.filter((t) => !S.rolesOf(t.id).inv).length || "–"}</em></div>
      <div class="tts-pt pl-by"><span><b>Not on cover</b><small>${ts.filter((t) => !S.rolesOf(t.id).cover).map((t) => esc(hon(t.name))).join(", ") || "Everyone takes it"}</small></span><em>${ts.filter((t) => !S.rolesOf(t.id).cover).length || "–"}</em></div></div>`;
    S.paint($("#pl-duties"), `<div class="tts-two"><div class="card tts-card"><div class="card-h"><h2>Every teacher</h2><span class="right muted">saved at once · teachers see it straight away</span></div><div class="tts-scroll"><table class="tts-dt pl-dt"><thead><tr><th scope="col">Teacher</th><th scope="col">Responsibilities</th><th scope="col" class="pl-c">Invigilation</th><th scope="col" class="pl-c">Cover</th><th scope="col" class="pl-c">Pages</th></tr></thead><tbody>${rows}</tbody></table></div></div>${side}</div>`);
  }

  // ---------- Changes: build, check and publish ----------
  function drawChanges() {
    const ch = changes(), pr = problems(), b = built(), L = loads(), W = liveLoads();
    const log = (P().log || []).slice(0, 6);
    const hist = `<div class="card tts-card"><div class="card-h"><h2>Published</h2></div>${log.length ? log.map((l) => `<div class="tts-lg"><b>${esc(l.at)} · ${esc(l.by)}</b><small>${l.lines.map(esc).join("<br>")}${l.moved !== undefined ? `<br>${l.moved} periods moved in the timetable` : ""}</small></div>`).join("") : `<p class="muted tts-empty">Nothing published yet: the school's plan for 2026–27 is in use.</p>`}</div>`;
    if (!ch.length) { S.paint($("#pl-changes"), `<div class="tts-msg good"><b>No changes waiting.</b><span>Hand a class to someone else on Teachers or Classes; it waits here until you build and publish it.</span></div>${hist}`); return; }
    const moved = [...new Set(ch.flatMap((c) => [c.from, c.to]).filter(Boolean).map((t) => t.id))].map((id) => ({ t: byId(work(), id) || byId(live(), id), was: W[id], now: L[id] }));
    const list = `<div class="card tts-card"><div class="card-h"><h2>${ch.length} change${ch.length === 1 ? "" : "s"}</h2><button type="button" class="right link-btn" data-pl-discard>Discard all</button></div>${ch.map((c) => `<div class="tts-lg"><b>${esc(secName(c.k))} · ${c.ct ? "class teacher" : esc(c.x)}</b><small>${c.to ? esc(c.to.name) : "Nobody"}${c.from ? ` takes over from ${esc(c.from.name)}` : ""}</small></div>`).join("")}</div>`;
    const loadsC = `<div class="card tts-card"><div class="card-h"><h2>Periods a week</h2><span class="right muted">33 to 39 gives a free period every day</span></div>${moved.map((x) => `<div class="tts-pt pl-ld"><span><b>${esc(x.t.name)}</b><small>${x.was} → ${x.now} · ${loadNote(x.now)}</small></span>${meter(x.now)}<em class="${isOut(x.now) ? "bad" : ""}">${x.now}</em></div>`).join("")}</div>`;
    let res = "";
    if (pr.length) res = `<div class="tts-msg bad"><b>Settle ${pr.length === 1 ? "this" : "these"} first.</b><span>${pr.map((p) => esc(p.text)).join(" · ")}</span></div>`;
    else if (ui.busy) res = `<div class="card tts-card pl-build"><b>Building the timetable…</b><span class="muted">From the week in use, so only what has to move moves.</span><span class="pl-prog" id="pl-prog"><i style="width:${Math.round(ui.prog * 100)}%"></i></span></div>`;
    else if (b) {
      const r = b.r, ok = !r.clashes && !r.labClash, ix = (id) => r.teachers.findIndex((t) => t.id === id);
      const kp = [["Periods moved", r.moved, "in Classes VI to XII", ""], ["Teacher clashes", r.clashes || "None", "nobody in two rooms", r.clashes ? "bad" : "good"], ["Labs", r.labClash ? r.labClash + " clashes" : "Clear", "never double-booked", r.labClash ? "bad" : "good"], ["Free every day", r.tight.length ? r.tight.length + " short" : "Everyone", r.tight.length ? "see below" : "one or two free a day", r.tight.length ? "bad" : "good"]];
      res = `<div class="tts-kpis">${kp.map(([l, v, s, c]) => `<div class="tts-k ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`).join("")}</div>
        ${r.tight.length ? `<div class="tts-msg bad"><b>Not every teacher gets a free period every day.</b><span>${r.tight.map((x) => `${esc(x.name)}: ${x.days.map((d) => DAYS[d - 1] + " " + r.free[ix(x.id)][d - 1] + " free").join(", ")}`).join(" · ")}. You can still publish; or move a class so their week is 33 to 39 periods.</span></div>` : ""}
        <div class="tts-bar"><span class="muted tts-hint">Built at ${esc(b.at)}${r.ms ? ` in ${(r.ms / 1000).toFixed(1)} s` : ""}.</span><span class="tts-sp"></span><button type="button" class="btn btn-ghost btn-sm" data-pl-build>Build again</button>${ok ? `<button type="button" class="btn btn-primary btn-sm" data-pl-pub>Publish to everyone</button>` : ""}</div>
        ${ok ? `<p class="muted pl-note">Publishing changes every teacher's timetable and home page, every class's week, cover and exam-duty suggestions, and the parents' timetables, all at once. Staff get a notice in Messages.</p>` : `<div class="tts-msg bad"><b>This plan can't be timetabled without a clash.</b><span>Spread the classes more evenly, then build again.</span></div>`}`;
    } else res = `<div class="tts-bar"><span class="muted tts-hint">The solver starts from the week in use, office swaps included, and moves only what it must.</span><span class="tts-sp"></span><button type="button" class="btn btn-primary btn-sm" data-pl-build>Build the timetable</button></div>`;
    S.paint($("#pl-changes"), res + `<div class="tts-two"><div class="pl-col">${list}${loadsC}</div>${hist}</div>`);
  }

  // ---------- Rings on the tabs, and what needs the planner ----------
  const ring = (id, p, mid, txt) => { const r = $("#rg-" + id); if (!r) return; r.style.setProperty("--p", Math.max(0, Math.min(100, Math.round(p)))); r.classList.toggle("clear", mid === "✓"); r.firstElementChild.textContent = mid; $("#rg-" + id + "-t").textContent = txt; };
  function rings() {
    const ts = work(), L = loads(ts), out = ts.filter((t) => isOut(L[t.id])).length, pr = problems(), ch = changes(), b = built();
    ring("pl-teachers", ((ts.length - out) / ts.length) * 100, out || "✓", out ? `${out} outside 33–39` : `All ${ts.length} within limits`);
    const cells = SECS.reduce((a, k) => a + TT.subjectsOf(k).length + 1, 0);
    ring("pl-classes", ((cells - pr.length) / cells) * 100, pr.length || "✓", pr.length ? `${pr.length} to settle` : `${SECS.length} classes · all taught`);
    const nd = ts.reduce((a, t) => a + S.rolesOf(t.id).duties.length, 0), with_ = ts.filter((t) => S.rolesOf(t.id).duties.length).length;
    ring("pl-duties", (with_ / ts.length) * 100, nd || "–", nd ? `${with_} of ${ts.length} teachers have one` : "None given yet");
    ring("pl-changes", ch.length ? (b ? 100 : 50) : 100, ch.length || "✓", ch.length ? (b ? "ready to publish" : `${ch.length} to build`) : "Nothing waiting");
    const PI = S.NAV_ICONS || {}, N = [];
    if (ch.length) N.push({ tone: pr.length ? "red" : "gold", icon: PI.timetable, t: `${ch.length} plan change${ch.length === 1 ? "" : "s"} not published`, sub: pr.length ? `${pr.length} thing${pr.length === 1 ? "" : "s"} to settle first` : b ? "The timetable is built; publish when ready" : "Build the timetable to check them", act: b ? "Publish" : "Open", go: "plan/changes" });
    ts.filter((t) => isOut(L[t.id])).forEach((t) => N.push({ tone: "warn", icon: PI.staff, t: `${S.esc(t.name)}: ${L[t.id]} periods a week`, sub: loadNote(L[t.id]), act: "Open", go: "plan/teachers", attrs: ` data-pl-open="${t.id}"` }));
    if (S.setNeeds) S.setNeeds(N, { empty: "Nothing needs you right now." });
  }

  const draw = () => { const v = ($('[data-vt="pl"] button.on') || {}).dataset; ui.tab = (v && v.v) || "teachers";
    bar(); if (ui.tab === "teachers") drawTeachers(); else if (ui.tab === "classes") drawClasses(); else if (ui.tab === "duties") drawDuties(); else drawChanges(); rings(); };
  S.plDraw = draw;
  const tab = (v) => { const b = $(`[data-vt="pl"] button[data-v="${v}"]`); if (b && !b.classList.contains("on")) b.click(); else draw(); };

  // ---------- Events ----------
  const box = $('[data-view="plan"]');
  document.addEventListener("click", (e) => {
    const b = (q) => e.target.closest(q); let x;
    if ((x = b("[data-pl-open]"))) { ui.t = x.dataset.plOpen; if (!box.classList.contains("active")) S.go("plan"); tab("teachers"); if (x.dataset.plSub === "pages") requestAnimationFrame(() => { const c = [...document.querySelectorAll(".pl-det .card-h h2")].find((h) => h.textContent === "Pages they see"); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); }); return; }
    if (!e.target.closest('[data-view="plan"]')) return;
    if ((x = b("[data-pl-t]"))) { ui.t = x.dataset.plT; drawTeachers(); if (S.narrow && S.narrow()) $(".pl-det").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if ((x = b("[data-pl-tab]"))) { tab(x.dataset.plTab); return; }
    if (b("[data-pl-build]")) { tab("changes"); build(); return; }
    if (b("[data-pl-pub]")) { publish(); return; }
    if (b("[data-pl-discard]")) { P().draft = null; S.save(); draw(); S.toast("Draft discarded. The plan in use stays as it is.", { done: true }); return; }
    if ((x = b("[data-pl-undo]"))) { const [id, d] = x.dataset.plUndo.split("|"); setRole(id, "duty", { d, on: false }); draw(); return; }
  });
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t.closest || !t.closest('[data-view="plan"]')) return;
    const d = t.dataset;
    if (d.plHand && t.value) { const [k, x] = d.plHand.split("|"); hand(k, x, t.value); draw(); return; }
    if (d.plTake && t.value) { const [k, x] = t.value.split("|"); hand(k, x, d.plTake); draw(); return; }
    if (d.plCell && t.value) { const [k, x] = d.plCell.split("|"); hand(k, x, t.value); draw(); return; }
    if (d.plCt !== undefined) { setCT(d.plCt, t.value); draw(); return; }
    if (d.plCts && t.value) { setCT(t.value, d.plCts); draw(); return; }
    if (d.plDuty) { const [id, x] = d.plDuty.split("|"); setRole(id, "duty", { d: x, on: t.checked }); draw(); return; }
    if (d.plAddd && t.value) { setRole(d.plAddd, "duty", { d: t.value, on: true }); draw(); return; }
    if (d.plFlag) { const [id, k] = d.plFlag.split("|"); setRole(id, k, t.checked); draw(); return; }
    if (d.plPage) { const [id, v] = d.plPage.split("|"); setRole(id, "page", { v, on: t.checked }); draw(); return; }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-pl-addf]"); if (!f) return; e.preventDefault();
    const v = f.elements.d.value.trim().replace(/\s+/g, " "); if (!v) return;
    setRole(f.dataset.plAddf, "duty", { d: v.charAt(0).toUpperCase() + v.slice(1), on: true }); draw();
  });
  document.addEventListener("click", (e) => { if (e.target.closest('[data-vt="pl"] button')) requestAnimationFrame(draw); });
  document.addEventListener("sjs:sync", () => { if (!ui.busy) draw(); });
  document.addEventListener("sjs:view", (e) => { if (e.detail === "plan") draw(); });
  draw();
  // After publishing, the page reloads with the new plan; say what happened.
  try { const f = sessionStorage.getItem("sjs-flash"); if (f) { sessionStorage.removeItem("sjs-flash"); setTimeout(() => S.toast(f, { done: true }), 700); } } catch (e) {}
})();
