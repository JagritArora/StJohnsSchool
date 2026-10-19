/* Day-to-day tools shared by the parent and staff pages:
   - who may collect a child, one-time gate codes and the visitor log
   - PTM slots with each teacher
   - "I've read this" on important notices, and read counts for the office
   - a teacher's office hours for chat
   - chapter plan against exam dates
   - report cards and a student's summary sheet, as printable pages
   - notices from the office wait for the principal's approval
   - cover for teachers on leave, fee follow-up, the activity log and the weekly summary
   Everything is kept in the demo's shared state, like the rest of the prototype. */
(function () {
  const S = window.SJS;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const day = (n) => S.iso(S.addDays(S.today, n));
  const dayNum = (k) => Math.round(new Date(k + "T00:00").getTime() / 864e5);
  const seedOf = (t) => [...t].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 2166136261);

  // ---------- Ananya: the demo family's second child ----------
  // Rohit Sharma's daughter in III-A. Her record already exists in III-A; she takes the name.
  (function () {
    const x = S.sectionByKey("III-A");
    if (!x.students.some((s) => s.name === "Ananya Sharma")) {
      const s = x.students.find((v) => v.name > "Ananya Sharma") || x.students[0];
      Object.assign(s, { name: "Ananya Sharma", first: "Ananya", initials: "AS" });
    }
    const s = x.students.find((v) => v.name === "Ananya Sharma");
    if (!S.PARENTS.some((p) => p.key === "III-A-" + s.roll)) S.PARENTS.push({ key: "III-A-" + s.roll, sec: "III-A", roll: s.roll, parent: "Rohit Sharma", relation: "Father", phone: "98xxxxxx10", bus: "Route 14" });
  })();
  // Children with the same parent (name and phone number) are one login.
  S.siblingsOf = (key) => { const p = S.PARENTS.find((v) => v.key === key); return p ? S.PARENTS.filter((v) => v.phone === p.phone && v.parent === p.parent) : []; };

  // ---------- State ----------
  const ensure = () => {
    const s = S.state;
    if (!s.pickups) s.pickups = { "VII-B-1": [
      { id: "pk1", name: "Rohit Sharma", rel: "Father", phone: "98xxxxxx10", at: S.SESSION_START, by: "School office" },
      { id: "pk2", name: "Meera Sharma", rel: "Mother", phone: "98xxxxxx11", at: S.SESSION_START, by: "School office" }
    ] };
    if (!s.passes) s.passes = [{ code: "482915", kid: S.PARENTS[3].key, name: "Suresh Kumar", rel: "Uncle", date: S.todayKey, by: "Parent, after a parent check", used: null }];
    if (!s.visitors) s.visitors = {};
    if (!s.visitors[S.todayKey]) s.visitors[S.todayKey] = [
      { name: "Courier, parcel for the office", phone: "", whom: "School office", why: "Delivery", in: "9:10 AM", out: "9:18 AM" },
      { name: "Mrs. Kavita Arora", phone: "98xxxxxx27", whom: "Admissions desk", why: "Admission enquiry, Nursery", in: "10:05 AM", out: null }
    ];
    if (!s.ptm) s.ptm = {};
    if (!s.acks) s.acks = {};
    if (!s.hours) s.hours = {};
    if (!s.syl) s.syl = {};
    if (!s.pending) s.pending = [];
    if (!s.feeFollow) s.feeFollow = {};
    if (!s.cover) s.cover = {};
    if (!s.staffLeave) s.staffLeave = {};
    if (!s.weekly) s.weekly = { on: true };
    if (!s.activity) {
      s.activity = [];
      [["Mrs. Anita Joseph", "Website: added the Annual Day photos to the gallery", "8:05 AM"], ["Ms. Neha Mathew", "Attendance VII-B: saved · 2 parents notified", "8:41 AM"],
        ["Mr. Anil Bhalla", "Marks IX-B, Science: published Unit Test 2 to parents", "9:30 AM"], ["Mrs. Anita Joseph", "Admissions: Kiara Jain moved to visit booked", "10:12 AM"]]
        .forEach(([who, what, t]) => S.post(s.activity, { from: who, text: what, at: S.fmt(S.todayKey) + ", " + t }));
    }
  };
  ensure();
  document.addEventListener("sjs:sync", ensure);

  // ---------- Activity log ----------
  // Every confirmed action by staff is written down with who and when. Sealed like the chat,
  // so a quiet edit later shows.
  S.logAct = (what, who) => { ensure(); S.post(S.state.activity, { from: who || (S.staff ? S.staff.name : "A parent"), text: what, at: S.fmt(S.todayKey) + ", " + S.timeNow() }); S.save(); };
  const VIEW = { attendance: "Attendance", homework: "Homework", marks: "Marks", care: "Remarks and forms", messages: "Messages", assist: "AI assist", home: "Home", overview: "Overview", classes: "Classes", admissions: "Admissions", website: "Website", exams: "Exams", notices: "Notices", day: "School day" };
  if (S.toast && /staff\.html$/.test(location.pathname)) {
    const plain = S.toast;
    S.toast = (msg, o = {}) => {
      plain(msg, o);
      const done = o.done !== undefined ? o.done : S.DONE_RE && S.DONE_RE.test(msg);
      if (done && S.staff && !o.nolog) { const v = location.hash.slice(1); S.logAct(`${VIEW[v] || "Staff"}: ${msg.charAt(0).toLowerCase() + msg.slice(1)}`); }
    };
  }

  // ---------- Printable pages ----------
  // One preview window for report cards and summary sheets; "Print" also saves as PDF.
  const CSS = `*{box-sizing:border-box}body{font:13.5px/1.5 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1d2228;margin:28px}
    h1{font-size:19px;margin:0}h2{font-size:16px;margin:18px 0 6px}.muted{color:#5b6068}.hd{display:flex;gap:14px;align-items:center;border-bottom:2px solid #9E2A22;padding-bottom:12px;margin-bottom:14px}
    table{border-collapse:collapse;width:100%;margin-top:6px}th,td{border-bottom:1px solid #dfe1e4;padding:6px 8px;text-align:left;vertical-align:top}th{font-size:12px;color:#5b6068;font-weight:600}
    .n{text-align:right;font-variant-numeric:tabular-nums}.kv{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}.kv div{border:1px solid #dfe1e4;border-radius:8px;padding:8px 10px}.kv b{display:block;font-size:17px}
    .sig{display:flex;justify-content:space-between;margin-top:46px}.sig span{border-top:1px solid #1d2228;padding-top:4px;width:200px;text-align:center}
    .tag{display:inline-block;font-size:11px;border:1px solid #c9ccd1;border-radius:20px;padding:0 7px;margin-left:6px;color:#5b6068}
    .page{page-break-after:always}.page:last-child{page-break-after:auto}.foot{margin-top:18px;font-size:11.5px;color:#5b6068}@page{margin:14mm}`;
  const crest = new URL("assets/crest.svg", location.href).href;
  const head = (sub) => `<div class="hd"><img src="${crest}" width="46" height="46" alt=""><div><h1>${esc(S.school.name)}, ${esc(S.school.place)}</h1><div class="muted">${sub}</div></div></div>`;
  S.docHead = head;
  S.docPage = (title, pages) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${pages.map((p) => `<section class="page">${p}</section>`).join("")}</body></html>`;
  let docEl = null;
  S.showDoc = (title, html) => {
    if (!docEl) {
      docEl = document.createElement("div");
      docEl.className = "modal doc-modal"; docEl.id = "doc-modal";
      docEl.innerHTML = `<div class="modal-card doc-card" role="dialog" aria-modal="true" aria-labelledby="doc-t"><div class="doc-h"><h3 id="doc-t"></h3><button class="btn btn-primary btn-sm" type="button" id="doc-print">Print or save as PDF</button><button class="icon-btn" type="button" data-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><iframe id="doc-f" title="Preview"></iframe></div>`;
      document.body.append(docEl);
      docEl.querySelector("#doc-print").addEventListener("click", () => docEl.querySelector("#doc-f").contentWindow.print());
    }
    docEl.querySelector("#doc-t").textContent = title;
    docEl.querySelector("#doc-f").srcdoc = html;
    docEl.classList.add("open");
  };

  // Exams so far this session, oldest first, and last year's final for the year-on-year view.
  const ORDER = ["ut1", "hy", "fin"];
  S.examsSoFar = () => ORDER.filter((k) => S.EX.list.includes(k));
  // kid: a student with marks by exam; x: their section.
  S.reportCard = (kid, x, o = {}) => {
    const subs = x.subjects, ex = S.examsSoFar(), last = ex[ex.length - 1];
    const avg = (k) => Math.round(subs.reduce((a, s) => a + kid[k][s], 0) / subs.length);
    const att = o.att != null ? o.att : S.attOf(x, kid.roll);
    const rows = subs.map((s) => `<tr><td>${esc(s)}</td><td class="n muted">${kid.ly[s]}</td>${ex.map((k) => `<td class="n">${kid[k][s]}</td>`).join("")}<td class="n"><b>${last ? S.grade(kid[last][s]) : "–"}</b></td></tr>`).join("");
    return head(`Report card · Session 2026–27 · ${esc(S.PHASES[S.PHASE].when)}`) +
      `<table><tr><td><b>${esc(kid.name)}</b><br><span class="muted">Class ${esc(x.label)}${x.stream ? " · " + esc(x.stream) : ""} · Roll ${String(kid.roll).padStart(2, "0")}</span></td><td class="n">Class teacher<br><b>${esc(x.teacher)}</b></td></tr></table>` +
      `<div class="kv"><div><b>${last ? avg(last) + "%" : "–"}</b>${last ? esc(S.exLabel(last, x.cls)) : "No exams yet"} average</div><div><b>${last ? S.grade(avg(last)) : "–"}</b>Overall grade</div><div><b>${att}%</b>Attendance</div><div><b>${avg("ly")}%</b>Last year's final</div></div>` +
      `<h2>Marks by subject (%)</h2><table><thead><tr><th>Subject</th><th class="n">Last year</th>${ex.map((k) => `<th class="n">${esc(S.exLabel(k, x.cls))}</th>`).join("")}<th class="n">Grade</th></tr></thead><tbody>${rows}</tbody></table>` +
      (o.remark ? `<h2>Class teacher's remark</h2><p>${esc(o.remark)}</p>` : "") +
      `<div class="sig"><span>Class teacher</span><span>Principal</span><span>Parent</span></div>` +
      `<p class="foot">Grades on the CBSE eight-point scale. Made from the marks entered in the school app on ${S.fmt(S.todayKey, { day: "numeric", month: "long", year: "numeric" })}. Prototype: sample marks.</p>`;
  };
  // Everything about one student on one page, for a parent meeting.
  S.summarySheet = (kid, x, o = {}) => {
    const subs = x.subjects, ex = ["ly", ...S.examsSoFar()];
    const away = Object.entries(x.history).filter(([, d]) => d[kid.roll]).map(([k, d]) => [k, d[kid.roll]]);
    const rem = S.remarksFor(x.key, kid.roll, true), forms = S.formsFor(x.key);
    const leaves = (S.secState(x.key).leaves || []).filter((l) => l.roll === kid.roll);
    const booking = Object.entries(S.state.ptm).find(([k, b]) => b.kid === `${x.key}-${kid.roll}` && (!o.teacher || k.includes("|" + o.teacher + "|")));
    return head(`Student summary · for the parent-teacher meeting · ${S.fmt(S.todayKey, { day: "numeric", month: "long", year: "numeric" })}`) +
      `<table><tr><td><b>${esc(kid.name)}</b><br><span class="muted">Class ${esc(x.label)} · Roll ${String(kid.roll).padStart(2, "0")}</span></td><td class="n">Prepared by<br><b>${esc(o.by || x.teacher)}</b>${o.cap ? `<br><span class="muted">${esc(o.cap)}</span>` : ""}</td></tr></table>` +
      `<div class="kv"><div><b>${S.attOf(x, kid.roll)}%</b>Attendance</div><div><b>${away.filter(([, v]) => v === "A").length}</b>Days absent</div><div><b>${away.filter(([, v]) => v === "L").length}</b>Days on leave</div><div><b>${booking ? booking[0].split("|")[2] : "–"}</b>PTM slot</div></div>` +
      `<h2>Marks (%)</h2><table><thead><tr><th>Subject</th>${ex.map((k) => `<th class="n">${k === "ly" ? "Last year" : esc(S.exLabel(k, x.cls))}</th>`).join("")}</tr></thead><tbody>${subs.map((s) => `<tr><td>${esc(s)}</td>${ex.map((k) => `<td class="n">${kid[k][s]}</td>`).join("")}</tr>`).join("")}</tbody></table>` +
      `<h2>Remarks</h2>${rem.length ? `<table><tbody>${rem.map((r) => `<tr><td style="width:110px">${S.fmt(r.at)}</td><td>${esc(S.REMARK_KINDS[r.kind])}${r.share ? "" : '<span class="tag">Staff only</span>'}<br>${esc(r.text)}<br><span class="muted">${esc(r.by)}</span></td></tr>`).join("")}</tbody></table>` : '<p class="muted">None yet.</p>'}` +
      `<h2>Forms</h2>${forms.length ? `<table><tbody>${forms.map((f) => { const a = S.formAnswer(f, kid.roll); return `<tr><td>${esc(f.title)}</td><td class="n">${a ? esc(S.formLabel(a.v)) + " · " + S.fmt(a.at) : "Waiting"}</td></tr>`; }).join("")}</tbody></table>` : '<p class="muted">None.</p>'}` +
      (leaves.length ? `<h2>Leave asked for</h2><table><tbody>${leaves.map((l) => `<tr><td>${S.fmt(l.from)} to ${S.fmt(l.to)}</td><td>${esc(l.why)}</td><td class="n">${esc(l.status)}</td></tr>`).join("")}</tbody></table>` : "") +
      `<h2>Notes from the meeting</h2><div style="border:1px solid #dfe1e4;border-radius:8px;height:120px"></div>` +
      `<p class="foot">Staff-only remarks are marked; take this sheet out of the meeting only if they are removed. Prototype: sample data.</p>`;
  };

  // ---------- Pick-up and the gate ----------
  S.pickupsOf = (kidKey) => (S.state.pickups[kidKey] || (S.state.pickups[kidKey] = []));
  S.passFor = (code) => S.state.passes.find((p) => p.code === code && p.date === S.todayKey);
  S.newPass = (kid, name, rel) => {
    let code; do { code = String(100000 + Math.floor(Math.random() * 900000)); } while (S.passFor(code));
    S.state.passes.push({ code, kid, name, rel, date: S.todayKey, by: "Parent, after a parent check", used: null });
    return code;
  };
  S.kidName = (kidKey) => { const k = S.kid(kidKey); return `${k.name} · ${k.label}`; };

  // ---------- PTM slots ----------
  // The next PTM on the notice board, ten-minute slots from 9:00 to 12:30.
  S.nextPtm = () => S.state.notices.filter((n) => n.tag === "PTM" && n.date >= S.todayKey).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
  S.PTM_SLOTS = Array.from({ length: 21 }, (_, i) => { const m = 9 * 60 + i * 10, h = Math.floor(m / 60), mm = m % 60; return `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; });
  // Other families already in a slot (sample), so the picker looks like a real morning.
  S.ptmTaken = (date, teacher, slot) => {
    const b = S.state.ptm[`${date}|${teacher}|${slot}`]; if (b) return b;
    return S.hash(seedOf(teacher + slot), dayNum(date)) < 0.42 ? { kid: null, other: true } : null;
  };
  S.ptmBook = (date, teacher, slot, kid, who) => {
    Object.keys(S.state.ptm).forEach((k) => { if (k.startsWith(`${date}|${teacher}|`) && S.state.ptm[k].kid === kid) delete S.state.ptm[k]; });
    S.state.ptm[`${date}|${teacher}|${slot}`] = { kid, who, at: S.todayKey };
  };
  S.ptmOfKid = (date, kid) => Object.entries(S.state.ptm).filter(([k, b]) => k.startsWith(date + "|") && b.kid === kid).map(([k]) => { const [, t, s] = k.split("|"); return { teacher: t, slot: s }; });
  S.ptmOfTeacher = (date, teacher) => Object.entries(S.state.ptm).filter(([k]) => k.startsWith(`${date}|${teacher}|`)).map(([k, b]) => ({ slot: k.split("|")[2], kid: b.kid, who: b.who })).sort((a, b) => S.PTM_SLOTS.indexOf(a.slot) - S.PTM_SLOTS.indexOf(b.slot));
  S.ics = (events, name) => {
    const d = (k) => k.replace(/-/g, ""), next = (k) => d(S.iso(S.addDays(new Date(k + "T00:00"), 1)));
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//St. John's School//EN", ...events.flatMap((e, i) => ["BEGIN:VEVENT", `UID:${d(e.date)}-${i}-${seedOf(e.title)}@stjohns`, `DTSTAMP:${d(S.todayKey)}T000000Z`, `DTSTART;VALUE=DATE:${d(e.date)}`, `DTEND;VALUE=DATE:${next(e.date)}`, `SUMMARY:${e.title.replace(/[,;]/g, "\\$&")}`, e.note ? `DESCRIPTION:${e.note.replace(/[,;]/g, "\\$&")}` : "", "END:VEVENT"].filter(Boolean)), "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" })); a.download = name + ".ics"; document.body.append(a); a.click(); a.remove();
  };

  // ---------- Notices: "I've read this" ----------
  S.ackOf = (id, kid) => (S.state.acks[id] || {})[kid] || null;
  S.ack = (id, kid) => { (S.state.acks[id] || (S.state.acks[id] = {}))[kid] = S.todayKey; };
  // Families who have read a high-importance notice: the demo's own, plus a sample share of the rest.
  S.ackCount = (n) => {
    const fam = S.reach(S.toOf(n)), own = Object.keys(S.state.acks[n.id] || {}).length;
    const days = Math.max(0, dayNum(S.todayKey) - dayNum(n.sent || n.date) + 6);
    const share = Math.min(0.97, 0.38 + Math.min(days, 10) * 0.05 + S.hash(seedOf(n.id), 7) * 0.08);
    return { read: Math.min(fam, Math.round(fam * share) + own), of: fam };
  };

  // ---------- Office hours for chat ----------
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const t12 = (t) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
  S.hoursOf = (teacher) => S.state.hours[teacher] || { from: "08:00", to: "18:00" };
  S.hoursText = (teacher) => { const h = S.hoursOf(teacher); return `${t12(h.from)} to ${t12(h.to)}`; };
  S.inHours = (teacher, now = new Date()) => { const h = S.hoursOf(teacher), m = now.getHours() * 60 + now.getMinutes(); return now.getDay() !== 0 && m >= toMin(h.from) && m < toMin(h.to); };
  S.nextOpen = (teacher, now = new Date()) => {
    const h = S.hoursOf(teacher), m = now.getHours() * 60 + now.getMinutes();
    const later = now.getDay() !== 0 && m < toMin(h.from);
    const next = new Date(now); if (!later) next.setDate(next.getDate() + 1); if (next.getDay() === 0) next.setDate(next.getDate() + 1);
    return `${later ? "today" : next.getDay() === (now.getDay() + 1) % 7 ? "tomorrow" : next.toLocaleDateString("en-IN", { weekday: "long" })} at ${t12(h.from)}`;
  };

  // ---------- Chapter plan against exam dates ----------
  // A sample plan the teacher can tick through; the school's real plan replaces it.
  const CHAPTERS = {
    "VII|Mathematics": ["Integers", "Fractions and decimals", "Data handling", "Simple equations", "Lines and angles", "The triangle and its properties", "Comparing quantities", "Rational numbers", "Perimeter and area", "Algebraic expressions", "Exponents and powers", "Symmetry", "Visualising solid shapes"],
    "VIII|Mathematics": ["Rational numbers", "Linear equations in one variable", "Understanding quadrilaterals", "Data handling", "Squares and square roots", "Cubes and cube roots", "Comparing quantities", "Algebraic expressions and identities", "Mensuration", "Exponents and powers", "Direct and inverse proportions", "Factorisation", "Introduction to graphs"]
  };
  S.chaptersOf = (cls, subj) => CHAPTERS[cls + "|" + subj] || Array.from({ length: 12 }, (_, i) => `Unit ${i + 1}`);
  const TEACH_FROM = "2026-04-01", TEACH_TO = "2027-02-13"; // the plan ends a week before the finals
  const teachDays = (a, b) => { let n = 0; for (let d = new Date(a + "T00:00"); S.iso(d) < b; d = S.addDays(d, 1)) if (S.isSchoolDay(d)) n++; return n; };
  const TOTAL = teachDays(TEACH_FROM, TEACH_TO);
  // Chapters that should be done by a date, on an even pace.
  S.chaptersDueBy = (n, k) => Math.min(n, Math.round((teachDays(TEACH_FROM, k) / TOTAL) * n));
  S.sylDone = (sec, subj) => {
    const key = sec + "|" + subj;
    if (!S.state.syl[key]) { const n = S.chaptersOf(sec.split("-")[0], subj).length, due = S.chaptersDueBy(n, S.todayKey), lag = S.hash(seedOf(key), 3) < 0.4 ? 1 : 0; S.state.syl[key] = Array.from({ length: Math.max(0, S.PHASE === "end" ? n : due - lag) }, (_, i) => i); }
    return S.state.syl[key];
  };
  S.examDates = () => S.CALENDAR.filter(([, t]) => /Unit Test|Half-yearly|Final exams/.test(t)).map(([d, t]) => ({ date: d, title: t }));

  // ---------- Cover for teachers on leave ----------
  // Who teaches what, when: from every timetable the demo builds (VII-B and VIII to XII).
  let busy = null;
  const busyMap = () => {
    if (busy) return busy;
    busy = {};
    const keys = ["VII-B", ...["VIII", "IX", "X", "XI", "XII"].flatMap((c) => S.SECTIONS[c].map((s) => `${c}-${s}`))];
    keys.forEach((key) => {
      const x = S.sectionByKey(key), tt = S.timetableOf(key), who = key === "VII-B" ? S.VIIB.ttTeachers : x.subjTeachers;
      Object.entries(tt).forEach(([d, row]) => row.forEach((subj, p) => { const t = who[subj]; if (t && S.TEACHERS.some((v) => v.name === t)) busy[`${t}|${d}|${p}`] = { key, subj }; }));
    });
    return busy;
  };
  S.leaveToday = () => {
    if (!S.state.staffLeave[S.todayKey]) {
      const pool = S.TEACHERS.filter((t) => t.id !== "SJS-T-0412"), r = S.rng(dayNum(S.todayKey));
      const a = pool[Math.floor(r() * pool.length)]; let b; do { b = pool[Math.floor(r() * pool.length)]; } while (b === a);
      S.state.staffLeave[S.todayKey] = [{ name: a.name, why: "Sick leave" }, { name: b.name, why: "Personal leave" }];
    }
    return S.state.staffLeave[S.todayKey];
  };
  // Every period today that a teacher on leave would have taught, with free teachers to suggest.
  S.coverToday = () => {
    const d = S.today.getDay(); if (!d) return [];
    const m = busyMap(), away = S.leaveToday().map((l) => l.name), n = d === 6 ? 5 : 8, rows = [];
    away.forEach((t) => {
      for (let p = 0; p < n; p++) {
        const b = m[`${t}|${d}|${p}`]; if (!b) continue;
        const subj = (S.TEACHERS.find((v) => v.name === t) || {}).subject;
        const load = (v) => Array.from({ length: n }, (_, q) => (m[`${v.name}|${d}|${q}`] ? 1 : 0)).reduce((a, c) => a + c, 0);
        const free = S.TEACHERS.filter((v) => !away.includes(v.name) && !m[`${v.name}|${d}|${p}`])
          .map((v) => ({ name: v.name, subject: v.subject, same: v.subject === subj, load: load(v) }))
          .sort((a, b2) => (b2.same - a.same) || (a.load - b2.load) || a.name.localeCompare(b2.name));
        rows.push({ id: `${t}|${p}`, teacher: t, p, time: S.periodTimes[p], key: b.key, subj: b.subj, free: free.slice(0, 4) });
      }
    });
    return rows.sort((a, b) => a.p - b.p);
  };

  // ---------- Fee follow-up (sample families) ----------
  S.feeFamilies = () => {
    const r = S.rng(seedOf("fees" + S.PHASE)), out = [], secs = S.allSections();
    for (let i = 0; i < 14; i++) {
      const x = secs[Math.floor(r() * secs.length)], s = x.students[Math.floor(r() * x.students.length)];
      const key = `${x.key}-${s.roll}`; if (out.some((o) => o.key === key) || S.PARENTS.some((p) => p.key === key)) continue;
      out.push({ key, name: s.name, label: x.label, amount: S.FEE_Q(x.ci), late: Math.floor(r() * 3) });
    }
    return out;
  };
  S.feeStateOf = (key) => S.state.feeFollow[key] || {};

  // ---------- Notices waiting for approval ----------
  S.pendingNotices = () => S.state.pending.filter((p) => p.status === "waiting");
})();
