/* The school's timetable, for the principal and the office, and printable weeks for everyone.
   - Staff: every teacher's day in one grid (a column per period), their week's load and free periods.
     Tap a period to see who is free in it. Overloaded: more than 39 periods a week, or a day with none free.
   - Classes: any section's week with its teachers and labs; the labs period by period, never double-booked.
   - Edit (the office): tap a period, then where it should go. Each other period shows at once whether
     the swap keeps every rule: no teacher in two rooms, a free period every day for each teacher, a lab
     free, a subject at most twice a day and never twice in a row, Club Activities fixed. Edits sit over
     the plan in the shared record (S.state.ttEdit), so teachers and parents see them straight away.
   - Exam duty: the plan suggests one invigilator for each class sitting a paper, from teachers free then (or
     whose own class is sitting), never the subject's own teacher, nor the class teacher where it can be helped,
     spread evenly, with a reserve each day. The office assigns (a suggestion or anyone free); only assigned
     duties print as names or go to staff (S.state.duty).
   - Print: a clean week for a teacher or a class, one page each, for the notice board ([data-ttprint]).
   Load after classes.js, exams.js and more.js. */
(() => {
  const S = window.SJS;
  if (!S || !S.timetableOf) return;
  const esc = S.esc, $ = (q, el = document) => el.querySelector(q);
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], D3 = DAYS.map((d) => d.slice(0, 3));
  const NP = (g) => (g === 6 ? 5 : 8), MAXW = 39;
  const hon = (n) => String(n || "").replace(/^(Mr|Mrs|Ms|Dr)\.\s+/, "");
  const SHORT = { "Club Activities": "Clubs", Mathematics: "Maths", "Social Science": "Social Sc.", Computer: "Computer", "Value Education": "Value Ed.", "Assembly Activity": "Assembly", Chemistry: "Chemistry", "Business Studies": "Business St.", "Applied Mathematics": "Applied Maths", "Physical Education": "PE", "Information Technology": "IT" };
  const sh = (x) => SHORT[x] || x;
  const TONE = { Mathematics: "accent", "Applied Mathematics": "accent", Numbers: "accent", Accountancy: "accent", English: "royal", Hindi: "gold", Biology: "gold", Economics: "gold", Science: "green", Chemistry: "green", EVS: "green", Environment: "green", Physics: "teal", "Social Science": "teal", "Business Studies": "teal", Computer: "slate", "Information Technology": "slate", "Physical Education": "slate" };
  const tone = (x) => (TONE[x] ? `var(--${TONE[x]})` : "var(--muted)");
  const order = S.allSections().map((x) => x.key);
  const secName = S.secName;
  // Who takes a period in any section, as a name.
  const whoTakes = (key, x) => {
    if (key === "VII-B") return (S.VIIB.ttTeachers || {})[x] || (S.CO || {})[x] || "";
    const sec = S.sectionByKey(key);
    return S.periodTeacher(key, x) || sec.subjTeachers[x] || (sec.periodTeachers || {})[x] || (x === "Assembly Activity" ? sec.teacher : (S.CO || {})[x]) || "";
  };
  // Every plan teacher's week, kept until the record changes.
  let B = null, BV = -1;
  const busy = () => { if (B && BV === S._ver) return B; BV = S._ver; B = {}; S.TEACHERS.forEach((t) => (B[t.id] = S.teachWeek(t))); LM = null; return B; };
  const onDay = (w, g) => Object.keys(w).filter((k) => k.startsWith(g + "|")).length;
  // Which section is in each lab, period by period: "Science lab|2|3" → "IX-A".
  let LM = null;
  const labMap = () => {
    if (LM && BV === S._ver) return LM;
    LM = {}; LM.clash = 0;
    [...S.planSections(), "VII-B"].forEach((k) => Object.entries(S.roomsOf(k)).forEach(([dp, l]) => { const id = l + "|" + dp; if (LM[id]) LM.clash++; LM[id] = k; }));
    return LM;
  };

  // ---------- Printable weeks ----------
  const PCSS = `<style>@page{size:A4 landscape;margin:10mm}body{margin:12px}.wk{table-layout:fixed;margin-top:4px}.wk th,.wk td{border:1px solid #dfe1e4;padding:5px 6px;font-size:11.5px;vertical-align:top}
    .wk thead th{background:#f6f7f8;text-align:center}.wk th[scope=row]{width:70px;font-size:11px;color:#5b6068}.wk th[scope=row] b{display:block;color:#1d2228;font-size:12.5px}
    .wk td b{display:block;font-size:12.5px}.wk td small{color:#5b6068;display:block;line-height:1.3}.wk .brk td,.wk .brk th{background:#f3f4f6;text-align:center;font-size:10.5px;color:#5b6068;padding:2px}
    .wk .lab{font-size:9.5px;border:1px solid #9E2A22;color:#9E2A22;border-radius:9px;padding:0 5px;display:inline-block;margin-top:2px}.wk .fr{color:#9aa0a6;text-align:center}.wk .no{background:#fafafa}
    .who{columns:3;column-gap:22px;font-size:11.5px;margin-top:8px}.who div{break-inside:avoid;padding:2px 0;border-bottom:1px dotted #dfe1e4}.who b{font-weight:600}</style>`;
  const weekTable = (cell) => {
    let h = `<table class="wk"><thead><tr><th scope="col">Period</th>${DAYS.map((d) => `<th scope="col">${d}</th>`).join("")}</tr></thead><tbody>`;
    for (let p = 0; p < 8; p++) {
      if (p === 4) h += `<tr class="brk"><th scope="row">10:40</th><td colspan="6">Break</td></tr>`;
      h += `<tr><th scope="row"><b>${p + 1}</b>${S.periodTimes[p]}–${S.ENDS[p]}</th>` + [1, 2, 3, 4, 5, 6].map((g) => p >= NP(g) ? `<td class="no"></td>` : cell(g, p)).join("") + "</tr>";
    }
    return h + "</tbody></table>";
  };
  const labTag = (l) => (l ? `<span class="lab">${esc(l)}</span>` : "");
  const classPage = (key) => {
    const sec = S.sectionByKey(key), tt = S.timetableOf(key), cnt = {};
    Object.values(tt).flat().forEach((x) => (cnt[x] = (cnt[x] || 0) + 1));
    const table = weekTable((g, p) => { const x = tt[g][p]; return `<td><b>${esc(sh(x))}</b><small>${esc(hon(whoTakes(key, x)))}</small>${labTag(S.roomOf(key, g, p))}</td>`; });
    const who = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([x, n]) => `<div><b>${esc(x)}</b> · ${esc(whoTakes(key, x))} · ${n} a week</div>`).join("");
    return PCSS + S.docHead(`Timetable · ${esc(secName(key))}${sec.stream ? " · " + sec.stream : ""} · Class teacher ${esc(sec.teacher)} · Session 2026–27`) + table + `<div class="who">${who}</div>`;
  };
  const teacherPage = (t) => {
    const w = S.teachWeek(t), n = Object.keys(w).length;
    const table = weekTable((g, p) => { const o = w[g + "|" + p]; if (!o) return `<td class="fr">Free</td>`;
      return `<td><b>${esc(secName(o.k))}</b><small>${esc(o.subj)}${o.k === t.classOf ? " · your class" : ""}</small>${labTag(S.roomOf(o.k, g, p))}</td>`; });
    const free = [1, 2, 3, 4, 5, 6].map((g) => `${D3[g - 1]} ${NP(g) - onDay(w, g)}`).join(" · ");
    return PCSS + S.docHead(`${esc(t.name)} · ${esc(S.subjsOf(t).join(" and "))}${t.classOf ? " · Class teacher " + esc(secName(t.classOf)) : ""} · ${n} periods a week`) + table + `<p class="foot">Free periods: ${free}. Session 2026–27.</p>`;
  };
  S.printWeeks = (items, title) => {
    const pages = items.map(([kind, id]) => (kind === "class" ? classPage(id) : teacherPage(typeof id === "string" ? S.STAFF[id] : id)));
    S.showDoc(title, S.docPage(title, pages), { file: title.replace(/[^\w]+/g, "-").replace(/-+$/, "") + ".pdf" });
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ttprint]"); if (!b || !S.showDoc) return;
    const v = b.dataset.ttprint;
    if (v === "me" && S.staff) return S.printWeeks([["teacher", S.staff.id]], `Timetable ${S.staff.name}`);
    if (v === "kid" && S.me) return S.printWeeks([["class", S.me.sec.key]], `Timetable ${secName(S.me.sec.key)}`);
    if (v.startsWith("class:")) return S.printWeeks([["class", v.slice(6)]], `Timetable ${secName(v.slice(6))}`);
    if (v.startsWith("teacher:")) return S.printWeeks([["teacher", v.slice(8)]], `Timetable ${S.STAFF[v.slice(8)].name}`);
    if (v === "all-classes") return S.printWeeks(order.map((k) => ["class", k]), "Timetables every class");
    if (v === "all-teachers") return S.printWeeks(S.TEACHERS.map((t) => ["teacher", t.id]), "Timetables every teacher");
  });

  // ---------- Swapping two periods: does every rule still hold? ----------
  S.ttSwapCheck = (key, a, b) => {
    const [d1, p1] = a.split("|").map(Number), [d2, p2] = b.split("|").map(Number);
    const tt = S.timetableOf(key), x = tt[d1][p1], y = tt[d2][p2], why = [];
    if (a === b) return { ok: false, why: ["That's the period you picked."] };
    if (x === y) return { ok: false, why: [`Both are ${x}; nothing would change.`] };
    if (x === "Club Activities" || y === "Club Activities") return { ok: false, why: ["Club Activities stays on Saturday, period 5, for the whole school."] };
    const W = busy(), tx = S.periodOwnerOf(key, x), ty = S.periodOwnerOf(key, y);
    [[tx, d2, p2, d1], [ty, d1, p1, d2]].forEach(([t, d, p, from]) => {
      if (!t) return;
      const o = W[t.id][d + "|" + p];
      if (o && o.k !== key) why.push(`${t.name} teaches ${secName(o.k)} then.`);
      if (d !== from && !(tx && ty && tx.id === ty.id) && onDay(W[t.id], d) + 1 > NP(d) - 1) why.push(`${t.name} would have no free period on ${DAYS[d - 1]}.`);
    });
    const R = S.roomsOf(key), L = labMap();
    [[R[a], d2, p2], [R[b], d1, p1]].forEach(([l, d, p]) => { if (!l) return; const k = L[l + "|" + d + "|" + p]; if (k && k !== key) why.push(`The ${l.toLowerCase()} has ${secName(k)} then.`); });
    // The section's day after the swap.
    const rows = { [d1]: tt[d1].slice() }; rows[d2] = d2 === d1 ? rows[d1] : tt[d2].slice();
    rows[d1][p1] = y; rows[d2][p2] = x;
    [[x, d2], [y, d1]].forEach(([s, d]) => {
      const r = rows[d], n = r.filter((v) => v === s).length;
      if (n > 2) why.push(`${s} would come ${n} times on ${DAYS[d - 1]}.`);
      if (r.some((v, i) => i && v === s && r[i - 1] === s)) why.push(`${s} would come twice in a row on ${DAYS[d - 1]}.`);
    });
    return { ok: !why.length, why: [...new Set(why)], x, y, tx, ty };
  };

  // ---------- Exam duty as sent to staff, for one person ----------
  // [{ date, p, k, subj, exam, reserve }]: only what the office sent counts (the record's sig is
  // what went out), so a change still being made doesn't show on anyone's timetable.
  S.dutyOf = (id) => {
    const out = [];
    Object.entries(S.state.duty || {}).forEach(([eid, rec]) => {
      if (!rec || !rec.sent || !rec.sig) return;
      const e = (S.state.exams || []).find((x) => x.id === eid); if (!e) return;
      let sent; try { sent = JSON.parse(rec.sig); } catch (er) { return; }
      const win = e.kind === "ut" || e.kind === "ts" ? [0, 1] : [0, 1, 2, 3], [asg, res] = sent;
      const subjOf = (date, k) => { const x = S.sectionByKey(k), g = x.cls === "XI" || x.cls === "XII" ? k : x.cls; return ((e.papers[g] || []).find((q) => q.date === date) || {}).subj || ""; };
      Object.entries(asg || {}).forEach(([key, ids]) => { const [date, k] = key.split("|"); (ids || []).forEach((x, i) => { if (x === id) out.push({ date, p: win[i], k, subj: subjOf(date, k), exam: e.name }); }); });
      Object.entries(res || {}).forEach(([date, x]) => { if (x === id) win.forEach((p) => out.push({ date, p, k: null, subj: "", exam: e.name, reserve: true })); });
    });
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.p - b.p));
  };

  // ---------- The principal's, the office's and the academic planner's page ----------
  const box = document.getElementById("tts");
  if (!S.staff || !box || !["principal", "admin", "planner"].includes(S.staff.role)) return;
  const ME = S.staff;
  // The principal sees everything here; the office and the academic planner make the changes.
  const RO = ME.role === "principal";
  box.classList.toggle("tts-ro", RO);
  const editable = order.filter((k) => S.planSections().includes(k) && S.sectionByKey(k).ci >= 8);
  const schoolDay = () => { let d = S.today; if (!S.periodsOn(d)) d = S.nextSchoolDay(d, 1); return d; };
  const ui = { day: schoolDay().getDay(), spot: null, cls: "IX-A", cview: "week", ed: "IX-A", pick: null, msg: "", exam: null };
  const nowPeriod = () => {
    const c = S.schoolClock ? S.schoolClock() : null;
    if (c && c.live && S.iso(schoolDay()) === S.todayKey) { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); const i = S.ENDS.findIndex((t) => S.mins(t) > m); if (i >= 0) return i; }
    return 2;
  };
  const dayBtns = (cur) => `<div class="seg tts-days" role="group" aria-label="Day">${[1, 2, 3, 4, 5, 6].map((g) => `<button type="button" data-tts-day="${g}" class="${g === cur ? "on" : ""}" aria-pressed="${g === cur}">${D3[g - 1]}${g === schoolDay().getDay() ? '<i aria-hidden="true"></i>' : ""}</button>`).join("")}</div>`;
  const secOpts = (list, cur) => S.WING_NAMES.map((w) => { const ks = list.filter((k) => S.sectionByKey(k).wing === w); return ks.length ? `<optgroup label="${w}">${ks.map((k) => `<option value="${k}"${k === cur ? " selected" : ""}>${esc(secName(k))}${S.sectionByKey(k).stream ? " · " + S.sectionByKey(k).stream : ""}</option>`).join("")}</optgroup>` : ""; }).join("");
  const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const PR = ic('<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>');

  // Every teacher's numbers for the week.
  const stats = () => {
    const W = busy();
    return S.TEACHERS.map((t) => {
      const w = W[t.id], load = Object.keys(w).length, free = [1, 2, 3, 4, 5, 6].map((g) => NP(g) - onDay(w, g));
      const secs = new Set(Object.values(w).map((o) => o.k));
      return { t, w, load, free, secs: secs.size, over: load > MAXW || free.some((f) => f < 1) };
    });
  };

  // ----- Staff -----
  function drawStaff() {
    const g = ui.day, n = NP(g), rows = stats(), sp = ui.spot === null ? Math.min(nowPeriod(), n - 1) : Math.min(ui.spot, n - 1);
    const freeIn = rows.filter((r) => !r.w[g + "|" + sp]), over = rows.filter((r) => r.over);
    const loads = rows.map((r) => r.load), lo = Math.min(...loads), hi = Math.max(...loads);
    const isToday = g === schoolDay().getDay() && S.iso(schoolDay()) === S.todayKey;
    const dayWord = isToday ? "today" : "on " + DAYS[g - 1];
    const kpi = (lbl, num, foot, cls = "") => `<div class="tts-k${cls}"><span>${lbl}</span><b>${num}</b><small>${foot}</small></div>`;
    const head = `<div class="tts-kpis">${kpi("Teachers, VI to XII", rows.length, `${rows.filter((r) => r.secs <= 5).length} teach 4 or 5 classes; Computer and PE go round all`)}${kpi("Periods a week", `${lo}–${hi}`, `of 45 · the limit is ${MAXW}`)}${kpi("Overloaded", over.length || "None", over.length ? over.map((r) => hon(r.t.name)).join(", ") : "Everyone has a free period every day", over.length ? " bad" : " good")}${kpi(`Free in period ${sp + 1}`, freeIn.length, `${dayWord}, ${S.periodTimes[sp]}–${S.ENDS[sp]}`)}</div>`;
    const bar = `<div class="tts-bar sj-pick">${dayBtns(g)}<span class="muted tts-hint">Tap a period to see who's free in it</span><button type="button" class="btn btn-ghost btn-sm tts-pr" data-ttprint="all-teachers">${PR}Print every teacher's week</button></div>`;
    const freeBox = `<div class="tts-free" aria-live="polite"><b>Free in period ${sp + 1}, ${dayWord}</b><span class="muted">${S.periodTimes[sp]}–${S.ENDS[sp]}</span><div class="tts-chips">${freeIn.length ? freeIn.map((r) => `<span class="tts-chip"><i style="--s:${tone(r.t.subject)}"></i>${esc(hon(r.t.name))}<small>${esc(sh(r.t.subject))} · ${r.free[g - 1]} free ${dayWord}</small></span>`).join("") : '<span class="muted">Nobody in the plan is free then.</span>'}</div></div>`;
    const th = Array.from({ length: n }, (_, p) => `<th scope="col" class="${p === sp ? "sp" : ""}"><button type="button" data-tts-spot="${p}" aria-pressed="${p === sp}"><b>P${p + 1}</b><span>${S.periodTimes[p]}</span></button></th>`).join("");
    const body = rows.map((r) => {
      const cells = Array.from({ length: n }, (_, p) => { const o = r.w[g + "|" + p], l = o && S.roomOf(o.k, g, p);
        return o ? `<td class="on${p === sp ? " sp" : ""}" style="--s:${tone(o.subj)}" title="${esc(`${secName(o.k)} · ${o.subj}${l ? " · " + l : ""}`)}"><b>${esc(secName(o.k))}</b><small>${esc(l ? l.replace(" lab", " lab") : o.subj !== r.t.subject ? sh(o.subj) : "")}</small></td>` : `<td class="fr${p === sp ? " sp" : ""}">Free</td>`; }).join("");
      const today = n - r.free[g - 1];
      return `<tr class="${r.over ? "over" : ""}"><th scope="row"><button type="button" class="tts-who" data-ttprint="teacher:${r.t.id}" title="Print ${esc(r.t.name)}'s week"><b>${esc(r.t.name)}</b><small>${esc(S.subjsOf(r.t).map(sh).join(", "))}${r.t.classOf ? " · CT " + esc(secName(r.t.classOf)) : ""}</small></button></th>${cells}
        <td class="tts-n"><b>${today}</b><small>${r.free[g - 1]} free</small></td>
        <td class="tts-load"><span class="tts-m" title="${r.load} of 45 periods; the line is the ${MAXW}-period limit"><i style="width:${(r.load / 45) * 100}%"></i><u style="left:${(MAXW / 45) * 100}%"></u></span><b>${r.load}</b><small>${r.over ? "Overloaded" : `${r.secs} classes`}</small></td></tr>`;
    }).join("");
    S.paint($("#tts-staff"), head + bar + freeBox + `<div class="card tts-card"><div class="tts-scroll"><table class="tts-grid"><thead><tr><th scope="col" class="tts-c0">Teacher</th>${th}<th scope="col">${isToday ? "Today" : D3[g - 1]}</th><th scope="col">Week</th></tr></thead><tbody>${body}</tbody></table></div>
      <p class="chart-note">Tap a teacher's name to print their week. Art, Music, Games outside the plan and Classes Nursery to V are taken by their own teachers.</p></div>`);
  }

  // ----- Classes -----
  const weekGrid = (key, cellFn) => {
    const tt = S.timetableOf(key);
    let h = `<div class="tts-scroll"><table class="tts-week"><thead><tr><th scope="col" class="tts-c0">Period</th>${DAYS.map((d, i) => `<th scope="col" class="${i + 1 === schoolDay().getDay() ? "today" : ""}">${D3[i]}</th>`).join("")}</tr></thead><tbody>`;
    for (let p = 0; p < 8; p++) {
      if (p === 4) h += `<tr class="brk"><th scope="row">10:40</th><td colspan="6">Break</td></tr>`;
      h += `<tr><th scope="row"><b>P${p + 1}</b><span>${S.periodTimes[p]}</span></th>` + [1, 2, 3, 4, 5, 6].map((g) => (p >= NP(g) ? (p === 5 ? `<td class="half" rowspan="3">Half day</td>` : "") : cellFn(g, p, tt[g][p]))).join("") + "</tr>";
    }
    return h + "</tbody></table></div>";
  };
  const cellHTML = (key, g, p, x) => { const l = S.roomOf(key, g, p);
    return `<td class="cl" style="--s:${tone(x)}"><b>${esc(sh(x))}</b><small>${esc(hon(whoTakes(key, x)))}</small>${l ? `<em>${esc(l)}</em>` : ""}</td>`; };
  function drawClasses() {
    const key = ui.cls, sec = S.sectionByKey(key), tt = S.timetableOf(key), cnt = {};
    Object.values(tt).flat().forEach((x) => (cnt[x] = (cnt[x] || 0) + 1));
    const labsN = Object.keys(S.roomsOf(key)).length, L = labMap();
    const bar = `<div class="tts-bar sj-pick"><div class="seg" role="group" aria-label="A class or the labs"><button type="button" data-tts-cv="week" class="${ui.cview === "week" ? "on" : ""}" aria-pressed="${ui.cview === "week"}">A class</button><button type="button" data-tts-cv="labs" class="${ui.cview === "labs" ? "on" : ""}" aria-pressed="${ui.cview === "labs"}">The labs</button></div>
      ${ui.cview === "week" ? `<label class="sj-fld tts-sel">${ic('<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>')}<select id="tts-cls" aria-label="Class">${secOpts(order, key)}</select></label>` : dayBtns(ui.day)}
      <span class="tts-sp"></span>${ui.cview === "week" ? `<button type="button" class="btn btn-ghost btn-sm tts-pr" data-ttprint="class:${key}">${PR}Print this class</button>` : ""}<button type="button" class="btn btn-ghost btn-sm tts-pr" data-ttprint="all-classes">${PR}Print every class</button></div>`;
    if (ui.cview === "labs") {
      const g = ui.day, n = NP(g), used = S.LABS.map((l) => Array.from({ length: n }, (_, p) => L[l + "|" + g + "|" + p] || null));
      const tot = Object.keys(L).filter((k) => k !== "clash").length;
      const rows = S.LABS.map((l, i) => `<tr><th scope="row"><b>${esc(l)}</b></th>${used[i].map((k) => (k ? `<td class="cl" style="--s:${tone(S.timetableOf(k)[g][used[i].indexOf(k)] || "")}"><b>${esc(secName(k))}</b></td>` : `<td class="fr">—</td>`)).join("")}</tr>`).join("");
      S.paint($("#tts-classes"), bar + `<div class="card tts-card"><div class="card-h"><h2>The labs on ${DAYS[g - 1]}</h2><span class="right muted">${tot} lab periods a week · ${L.clash ? `<b class="bad">${L.clash} double-booked</b>` : "never double-booked"}</span></div>
        <div class="tts-scroll"><table class="tts-grid tts-labs"><thead><tr><th scope="col" class="tts-c0">Lab</th>${Array.from({ length: n }, (_, p) => `<th scope="col"><b>P${p + 1}</b><span>${S.periodTimes[p]}</span></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
        <p class="chart-note">Computer and IT are always in the computer lab. Two Science periods a week (VI to X) are practicals in the science lab; Physics, Chemistry and Biology in XI and XII have two practicals each in their own lab.</p></div>`);
      return;
    }
    const who = Object.entries(cnt).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([x, n]) => `<div class="tts-sr"><i style="--s:${tone(x)}"></i><span><b>${esc(x)}</b><small>${esc(whoTakes(key, x))}</small></span><em>${n}</em></div>`).join("");
    S.paint($("#tts-classes"), bar + `<div class="tts-two"><div class="card tts-card"><div class="card-h"><h2>${esc(secName(key))}${sec.stream ? " · " + sec.stream : ""}</h2><span class="right muted">Class teacher ${esc(sec.teacher)}${labsN ? ` · ${labsN} lab period${labsN === 1 ? "" : "s"}` : ""}</span></div>${weekGrid(key, (g, p, x) => cellHTML(key, g, p, x))}</div>
      <div class="card tts-card tts-side"><div class="card-h"><h2>Subjects and teachers</h2><span class="right muted">A week</span></div>${who}</div></div>`);
  }

  // ----- Edit -----
  const edits = () => S.state.ttEdit || (S.state.ttEdit = {});
  function drawEdit() {
    const key = ui.ed, tt = S.timetableOf(key), rec = edits()[key], log = rec ? rec.log : [];
    const checks = {};
    if (ui.pick) for (let g = 1; g <= 6; g++) for (let p = 0; p < NP(g); p++) { const id = g + "|" + p; if (id !== ui.pick) checks[id] = S.ttSwapCheck(key, ui.pick, id); }
    const okN = Object.values(checks).filter((c) => c.ok).length;
    const [pg, pp] = ui.pick ? ui.pick.split("|").map(Number) : [0, 0], px = ui.pick ? tt[pg][pp] : null;
    const all = Object.entries(edits()).filter(([, r]) => r.log.length);
    const bar = `<div class="tts-bar sj-pick"><label class="sj-fld tts-sel">${ic('<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>')}<select id="tts-ed" aria-label="Class to edit">${secOpts(editable, key)}</select></label>
      <span class="muted tts-hint">${ui.pick ? (okN ? `${okN} place${okN === 1 ? "" : "s"} ${esc(px)} can go` : `${esc(px)} can't move anywhere without breaking a rule. Try another period.`) : RO ? "Every class's week as it stands" : "Tap a period, then tap where it should go"}</span><span class="tts-sp"></span>
      ${log.length ? `<button type="button" class="btn btn-ghost btn-sm" data-tts-undo>Undo last</button><button type="button" class="btn btn-ghost btn-sm" data-tts-reset>Back to the plan</button>` : ""}</div>`;
    const msg = ui.pick ? `<div class="tts-msg pick"><b>${esc(px)} · ${DAYS[pg - 1]}, period ${pp + 1}</b><span>${esc(whoTakes(key, px) || "")}${S.roomOf(key, pg, pp) ? " · " + esc(S.roomOf(key, pg, pp)) : ""}. Green periods keep every rule; tap one to swap. Tap a grey one to see why not.</span><button type="button" class="link-btn" data-tts-unpick>Cancel</button></div>`
      : RO ? `<div class="tts-msg"><b>The office and the academic planner make swaps.</b><span>You see each class's week as it stands; every change is listed alongside, with who made it.</span></div>`
      : ui.msg ? `<div class="tts-msg${ui.msgBad ? " bad" : " good"}">${ui.msg}</div>` : `<div class="tts-msg"><b>The rules every swap keeps</b><span>No teacher in two rooms at once · every teacher keeps a free period each day · a lab is never double-booked · a subject at most twice a day, never twice in a row · Club Activities stays on Saturday.</span></div>`;
    const grid = weekGrid(key, (g, p, x) => {
      const id = g + "|" + p, c = checks[id], l = S.roomOf(key, g, p);
      const cls = id === ui.pick ? " picked" : c ? (c.ok ? " ok" : " no") : "";
      const lbl = `${DAYS[g - 1]} period ${p + 1}: ${x}${c ? (c.ok ? ". Swap allowed" : ". Can't swap: " + c.why.join(" ")) : ""}`;
      return `<td class="cl ed${cls}" style="--s:${tone(x)}"><button type="button" data-tts-cell="${id}" aria-label="${esc(lbl)}" title="${esc(c && !c.ok ? c.why.join(" ") : "")}"><b>${esc(sh(x))}</b><small>${esc(hon(whoTakes(key, x)))}</small>${l ? `<em>${esc(l)}</em>` : ""}</button></td>`;
    });
    const logBox = `<div class="card tts-card tts-side"><div class="card-h"><h2>Changes</h2><span class="right muted">${all.length ? `${all.reduce((a, [, r]) => a + r.log.length, 0)} in ${all.length} class${all.length === 1 ? "" : "es"}` : "Same as the plan"}</span></div>
      ${log.length ? log.slice().reverse().map((e) => `<div class="tts-lg"><b>${esc(e.x)} ⇄ ${esc(e.y)}</b><small>${D3[e.a.split("|")[0] - 1]} P${+e.a.split("|")[1] + 1} and ${D3[e.b.split("|")[0] - 1]} P${+e.b.split("|")[1] + 1} · ${esc(e.by)}, ${esc(e.at)}</small></div>`).join("") : `<p class="muted tts-empty">No changes to ${esc(secName(key))} yet.</p>`}
      ${all.filter(([k]) => k !== key).map(([k, r]) => `<button type="button" class="tts-lg tts-go" data-tts-goed="${k}"><b>${esc(secName(k))}</b><small>${r.log.length} change${r.log.length === 1 ? "" : "s"}</small></button>`).join("")}
      <p class="chart-note">A saved swap reaches the teachers' timetables, their day on the home page, cover suggestions and the parents' week at once.</p></div>`;
    S.paint($("#tts-edit"), bar + msg + `<div class="tts-two"><div class="card tts-card${ui.pick ? " picking" : ""}">${grid}</div>${logBox}</div>`);
  }
  function swap(key, a, b) {
    const c = S.ttSwapCheck(key, a, b);
    if (!c.ok) { ui.msg = `<b>Can't swap these.</b><span>${c.why.map(esc).join(" ")}</span>`; ui.msgBad = true; return false; }
    const E = edits(), rec = E[key] || (E[key] = { tt: JSON.parse(JSON.stringify(S.planTimetable(key))), rooms: Object.assign({}, S.roomsOf(key)), log: [] });
    const [d1, p1] = a.split("|").map(Number), [d2, p2] = b.split("|").map(Number);
    rec.tt[d1][p1] = c.y; rec.tt[d2][p2] = c.x;
    const ra = rec.rooms[a], rb = rec.rooms[b]; delete rec.rooms[a]; delete rec.rooms[b]; if (ra) rec.rooms[b] = ra; if (rb) rec.rooms[a] = rb;
    rec.log.push({ a, b, x: c.x, y: c.y, by: ME.name, at: S.fmt(S.todayKey, { day: "numeric", month: "short" }) + ", " + S.timeNow() });
    S.save();
    ui.msg = `<b>Swapped.</b><span>${esc(secName(key))}: ${esc(c.x)} moves to ${DAYS[d2 - 1]} period ${p2 + 1}, ${esc(c.y)} to ${DAYS[d1 - 1]} period ${p1 + 1}.${c.tx ? ` ${esc(c.tx.name)}` : ""}${c.ty && (!c.tx || c.ty.id !== c.tx.id) ? `${c.tx ? " and" : ""} ${esc(c.ty.name)}` : ""}${c.tx || c.ty ? " see it in their timetable now." : ""}</span>`; ui.msgBad = false;
    S.toast(`Timetable changed for ${secName(key)}`, { done: true });
    return true;
  }

  // ----- Exam duty -----
  // The plan only suggests. The office assigns: S.state.duty[examId] = { asg: { "date|key": [id per period] }, res: { date: id }, sent, sig }.
  const exams = () => (S.state.exams || []).filter((e) => e.classes.some((c) => S.sample.classes.indexOf(c) >= 8));
  const pickExam = () => { const xs = exams(); if (ui.exam && xs.some((e) => e.id === ui.exam)) return xs.find((e) => e.id === ui.exam);
    const up = xs.filter((e) => e.kind !== "ts" && S.examSpan(e).to >= S.todayKey).sort((a, b) => (S.examSpan(a).from < S.examSpan(b).from ? -1 : 1));
    return up[0] || xs[xs.length - 1]; };
  const hsh = (s) => [...s].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
  const dutyRec = (e, make) => { const all = S.state.duty || (make ? (S.state.duty = {}) : {}); return all[e.id] || (make ? (all[e.id] = { asg: {}, res: {} }) : { asg: {}, res: {} }); };
  const whoId = (id) => S.TEACHERS.find((t) => t.id === id) || S.LEADS.find((t) => t.id === id) || null;
  S.examDuty = (e) => {
    const W = busy(), win = e.kind === "ut" || e.kind === "ts" ? [0, 1] : [0, 1, 2, 3], rec = dutyRec(e), asg = rec.asg || {}, resv = rec.res || {};
    const secs = order.filter((k) => S.sectionByKey(k).ci >= 8), byDate = {};
    secs.forEach((k) => { const x = S.sectionByKey(k); if (!e.classes.includes(x.cls)) return; const g = x.cls === "XI" || x.cls === "XII" ? k : x.cls;
      (e.papers[g] || []).forEach((p) => (byDate[p.date] = byDate[p.date] || []).push({ k, subj: p.subj })); });
    const count = Object.fromEntries(S.TEACHERS.map((t) => [t.id, 0]));
    const days = Object.keys(byDate).sort().map((date) => {
      const g = new Date(date + "T00:00").getDay(), sitting = new Set(byDate[date].map((r) => r.k));
      // Free then (or their own class is sitting), and on invigilation (the academic planner can take someone off it).
      const freeAt = (p) => S.TEACHERS.filter((t) => { const o = W[t.id][g + "|" + p]; return (!o || sitting.has(o.k)) && S.rolesOf(t.id).inv; });
      const rank = (t) => (count[t.id] || 0) * 1000 + (hsh(t.id + date) % 997), byRank = (a, b) => rank(a) - rank(b);
      const rooms = byDate[date].map((r) => Object.assign({}, r, { setter: whoTakes(r.k, r.subj), slots: [], fix: [], warn: [] }));
      const usedDay = new Set(), taken = win.map(() => ({}));
      win.forEach((p, i) => {
        const pool = freeAt(p), used = new Set();
        const can = (t, r) => t && !used.has(t.id) && t.name !== r.setter && pool.some((x) => x.id === t.id);
        const pick = (r, t, fixed) => { r.slots[i] = t; r.fix[i] = !!fixed; if (t) { used.add(t.id); usedDay.add(t.id); taken[i][t.id] = r.k; count[t.id] = (count[t.id] || 0) + 1; } };
        // What the office has assigned comes first; the suggestions fill around it.
        rooms.forEach((r) => { const id = (asg[date + "|" + r.k] || [])[i], t = id && whoId(id); if (!t) return;
          if (!t.lead && !pool.some((x) => x.id === t.id)) r.warn[i] = "now teaches then"; pick(r, t, true); });
        rooms.forEach((r) => { const prev = r.slots[i - 1]; if (r.slots[i] === undefined && i && prev && !prev.lead && can(prev, r)) pick(r, prev); });
        rooms.forEach((r) => {
          if (r.slots[i] !== undefined) return;
          const run = (t) => { let n = 0; for (let j = i; j < win.length && freeAt(win[j]).some((x) => x.id === t.id); j++) n++; return n; };
          const sc = (t) => (count[t.id] || 0) - 2 * run(t), best = (a, b2) => sc(a) - sc(b2) || byRank(a, b2);
          const c = pool.filter((t) => can(t, r)), t = c.filter((x) => x.classOf !== r.k).sort(best)[0] || c.sort(best)[0];
          if (t) return pick(r, t);
          const prev = r.slots[i - 1], l = prev && prev.lead && !used.has(prev.id) ? prev : [S.LEADS.find((x) => x.lead === "coord" && x.wing === S.sectionByKey(r.k).wing), S.LEADS.find((x) => x.lead === "vp")].find((x) => x && !used.has(x.id));
          pick(r, l || null);
        });
      });
      rooms.forEach((r) => { r.runs = []; r.slots.forEach((t, i) => { const last = r.runs[r.runs.length - 1], f = r.fix[i];
          if (last && last.t === t && last.fixed === f) last.to = win[i]; else r.runs.push({ t, fixed: f, from: win[i], to: win[i] }); });
        r.inv = r.runs.length === 1 ? r.runs[0].t : null; r.short = r.slots.some((t) => !t); r.done = r.fix.length === win.length && r.fix.every(Boolean); r.part = r.fix.some(Boolean);
        // Who else could take this room: free for the whole paper first, then free for part of it.
        r.opts = [...S.TEACHERS, ...S.LEADS.filter((x) => x.lead === "vp" || (x.lead === "coord" && x.wing === S.sectionByKey(r.k).wing))].map((t) => {
          if (t.name === r.setter) return { t, no: `teaches ${r.subj}` };
          if (!t.lead && !S.rolesOf(t.id).inv) return { t, no: "not on invigilation" };
          const fr = win.map((p, i) => (t.lead || freeAt(p).some((x) => x.id === t.id)) && (!taken[i][t.id] || taken[i][t.id] === r.k) && !(rooms.some((o) => o !== r && o.fix[i] && o.slots[i] && o.slots[i].id === t.id)));
          const n = fr.filter(Boolean).length; if (!n) { const o = win.map((p, i) => taken[i][t.id]).find((k) => k && k !== r.k); return { t, no: o ? `on duty in ${secName(o)}` : "teaching then" }; }
          return { t, fr, n, note: t.lead ? (t.lead === "vp" ? "vice principal" : "coordinator") : n === win.length ? "free the whole paper" : `free ${win.filter((p, i) => fr[i]).map((p) => "P" + (p + 1)).join(", ")}` };
        }).sort((a, b) => (a.no ? 1 : 0) - (b.no ? 1 : 0) || (b.n || 0) - (a.n || 0) || (!!a.t.lead - !!b.t.lead) || (count[a.t.id] || 0) - (count[b.t.id] || 0) || a.t.name.localeCompare(b.t.name)); });
      const fixedRes = resv[date] && whoId(resv[date]);
      const allFree = S.TEACHERS.filter((t) => !usedDay.has(t.id) && win.every((p) => freeAt(p).some((x) => x.id === t.id))).sort(byRank);
      const spare = fixedRes || allFree[0] || null;
      return { date, g, rooms, spare, spareFix: !!fixedRes, spareOpts: allFree, freeN: freeAt(win[0]).length };
    });
    const nRooms = days.reduce((a, d) => a + d.rooms.length, 0), nDone = days.reduce((a, d) => a + d.rooms.filter((r) => r.done).length, 0);
    return { win, days, count, nRooms, nDone, all: nRooms > 0 && nDone === nRooms };
  };
  // Assigned periods only: a period still waiting on the office reads "to be named".
  const runTxt = (r, w, nm = (t) => t.name) => r.runs.map((x) => `${w.length > 1 && r.runs.length > 1 ? `P${x.from + 1}${x.to > x.from ? "–" + (x.to + 1) : ""} ` : ""}${x.t && x.fixed ? nm(x.t) : "to be named"}`).join(" · ");
  const dutyDoc = (e, D) => S.docHead(`Invigilation duty · ${esc(e.name)} · ${esc(e.time)}`) + D.days.map((d) =>
    `<h2>${S.fmt(d.date, { weekday: "long", day: "numeric", month: "long" })}</h2><table><thead><tr><th>Class</th><th>Paper</th><th>Invigilator</th><th>On call (the subject's teacher)</th></tr></thead><tbody>${d.rooms.map((r) => `<tr><td>${esc(secName(r.k))}</td><td>${esc(r.subj)}</td><td><b>${esc(runTxt(r, D.win))}</b></td><td>${esc(r.setter || "")}</td></tr>`).join("")}</tbody></table><p class="muted">Reserve: ${d.spareFix ? esc(d.spare.name) : "to be named"}</p>`).join("") +
    `<p class="foot">Classes I to V are invigilated by their own class teachers. Report 15 minutes before the paper; collect the question papers from the exam cell.</p>`;
  const sigOf = (rec) => JSON.stringify([rec.asg || {}, rec.res || {}]);
  function drawDuty() {
    const e = pickExam();
    if (!e) { S.paint($("#tts-duty"), `<div class="card"><p class="muted">No exams for Classes VI to XII in the calendar.</p></div>`); return; }
    const D = S.examDuty(e), rec = dutyRec(e), sent = rec.sent, fresh = sent && rec.sig === sigOf(rec), left = D.nRooms - D.nDone;
    const short = D.days.filter((d) => d.rooms.some((r) => r.short)).length;
    const per = S.TEACHERS.map((t) => { let n = 0, s = 0; D.days.forEach((d) => d.rooms.forEach((r) => r.slots.forEach((x, i) => { if (x && x.id === t.id) r.fix[i] ? n++ : s++; })));
      return { t, n, s, sp: D.days.filter((d) => d.spareFix && d.spare.id === t.id).length }; }).sort((a, b) => b.n - a.n || b.s - a.s || a.t.name.localeCompare(b.t.name));
    const mx = Math.max(1, ...per.map((x) => x.n + x.s));
    const sendLbl = !D.all ? `Send to all staff` : fresh ? "Sent to staff ✓" : sent ? "Send the changes" : "Send to all staff";
    const bar = `<div class="tts-bar sj-pick"><label class="sj-fld tts-sel">${ic('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>')}<select id="tts-exam" aria-label="Exam">${exams().map((x) => `<option value="${x.id}"${x.id === e.id ? " selected" : ""}>${esc(x.name)} · ${S.fmt(S.examSpan(x).from, { day: "numeric", month: "short" })}</option>`).join("")}</select></label>
      <span class="muted tts-hint">${esc(e.time)} · periods ${D.win[0] + 1} to ${D.win[D.win.length - 1] + 1}${e.published ? "" : " · datesheet still a draft"}</span><span class="tts-sp"></span>
      <button type="button" class="btn btn-ghost btn-sm tts-pr" data-tts-dprint>${PR}Print the duty list</button><button type="button" class="btn btn-primary btn-sm" data-tts-send${!D.all || fresh ? " disabled" : ""}${!D.all ? ` title="Assign every class first"` : ""}>${sendLbl}</button></div>`;
    const lead = D.days.reduce((a, d) => a + d.rooms.reduce((b, r) => b + r.slots.filter((x, i) => x && x.lead && !r.fix[i]).length, 0), 0);
    const how = `<div class="tts-msg${D.all ? " good" : ""}"><b>${D.all ? `All ${D.nRooms} papers assigned${fresh ? " and sent" : ""}.` : `${D.nDone} of ${D.nRooms} papers assigned.`}</b><span>${D.all ? (fresh ? "Change any name and send again." : "Check the list, then send it to the staff.") : `The plan suggests a teacher for each paper; nothing goes to staff until you assign it. Take a suggestion, or pick someone else from the list.`}</span>${left ? `<button type="button" class="btn btn-ghost btn-sm" data-tts-takeall>Assign all ${left} suggestions</button>` : `<button type="button" class="link-btn" data-tts-clearall>Clear all</button>`}</div>
      <details class="tts-why"><summary>How the suggestions are made</summary><p>One teacher for each class sitting a paper: someone free then, or whose own class is sitting. Never the subject's own teacher (they stay on call for questions), and not the class teacher where it can be helped.${D.win.length > 1 ? " Duty goes period by period, so a teacher with a class mid-paper hands over to one who is free." : ""} Duties are spread evenly, counting the ones you've already assigned, with a reserve each day.${lead ? ` Where every teacher is busy, the wing coordinator is suggested (${lead} period${lead === 1 ? "" : "s"}).` : ""}</p></details>`;
    // The principal's status line: what the office has done, without the buttons to do it.
    const roNote = RO ? `<div class="tts-msg${D.all ? " good" : ""}"><b>${D.all ? `All ${D.nRooms} papers assigned${fresh ? " and sent" : ""}.` : `${D.nDone} of ${D.nRooms} papers assigned.`}</b><span>The office assigns invigilators${D.all ? (fresh ? " and has sent the list to staff." : "; the list hasn't gone to staff yet.") : ". You see the list as it stands: grey names are the plan's suggestions, not yet assigned."}</span></div>` : "";
    const cell = (d, r) => {
      const runs = r.runs.map((x) => `<span class="${x.fixed ? "" : "tts-sug"}">${D.win.length > 1 && r.runs.length > 1 ? `<i>P${x.from + 1}${x.to > x.from ? "–" + (x.to + 1) : ""}</i>` : ""}${x.t ? `<b>${esc(hon(x.t.name))}</b>${x.t.lead ? `<small class="tts-ld">${x.t.lead === "vp" ? "Vice principal" : "Coordinator"}</small>` : ""}` : `<b class="bad">Nobody free</b>`}${x.fixed ? "" : `<small class="tts-st">Suggested</small>`}</span>`).join("");
      const warn = r.warn.some(Boolean) ? `<small class="tts-warn">An assigned teacher now has a class then. Pick again.</small>` : "";
      const pickL = `<label class="tts-who"><span class="sr-only">Someone else for ${esc(secName(r.k))}</span><select data-tts-who="${d.date}|${r.k}"><option value="">${r.part ? "Change…" : "Someone else…"}</option>${r.opts.map((o) => `<option value="${o.t.id}"${o.no ? " disabled" : ""}>${esc(hon(o.t.name))} · ${esc(o.no || o.note)}</option>`).join("")}</select></label>`;
      const acts = `<div class="tts-acts">${r.done ? `<span class="tts-ok">Assigned</span><button type="button" class="link-btn" data-tts-unasg="${d.date}|${r.k}">Clear</button>` : r.short ? "" : `<button type="button" class="btn btn-ghost btn-sm" data-tts-take="${d.date}|${r.k}">${r.part ? "Assign the rest" : "Assign"}</button>`}${pickL}${r.part && !r.done ? `<button type="button" class="link-btn" data-tts-unasg="${d.date}|${r.k}">Clear</button>` : ""}</div>`;
      return `<td class="tts-inv">${runs}${warn}${acts}</td>`;
    };
    const resRow = (d) => `<div class="tts-res">Reserve: ${d.spare ? `<b>${esc(hon(d.spare.name))}</b>${d.spareFix ? ` <span class="tts-ok">Assigned</span> <button type="button" class="link-btn" data-tts-unres="${d.date}">Clear</button>` : ` <small class="tts-st">Suggested</small> <button type="button" class="link-btn" data-tts-res="${d.date}|${d.spare.id}">Assign</button>`}` : `<b>nobody is free for the whole paper</b>`}</div>`;
    const days = D.days.map((d) => `<div class="card tts-card tts-dd"><div class="card-h"><h2>${S.fmt(d.date, { weekday: "short", day: "numeric", month: "short" })}</h2><span class="right muted">${d.rooms.filter((r) => r.done).length} of ${d.rooms.length} assigned · ${d.freeN} teachers free</span></div>
      <table class="tts-dt"><thead><tr><th scope="col">Class</th><th scope="col">Paper</th><th scope="col">Invigilator</th><th scope="col">On call</th></tr></thead><tbody>${d.rooms.map((r) => `<tr class="${r.done ? "is-done" : ""}"><td><b>${esc(secName(r.k))}</b></td><td><i class="tts-dot" style="--s:${tone(r.subj)}"></i>${esc(r.subj)}</td>${cell(d, r)}<td class="muted">${esc(hon(r.setter || ""))}</td></tr>`).join("")}</tbody></table>
      ${resRow(d)}</div>`).join("");
    const side = `<div class="card tts-card tts-side"><div class="card-h"><h2>Periods of duty</h2><span class="right muted">assigned · <span class="tts-sg">suggested</span></span></div>${per.map((x) => `<div class="tts-pt"><span><b>${esc(hon(x.t.name))}</b><small>${esc(sh(x.t.subject))}${x.sp ? ` · reserve ${x.sp}×` : ""}</small></span><span class="tts-m"><i style="width:${(x.n / mx) * 100}%"></i><i class="sg" style="width:${(x.s / mx) * 100}%"></i></span><em>${x.n}${x.s ? `<small>+${x.s}</small>` : ""}</em></div>`).join("")}</div>`;
    S.paint($("#tts-duty"), (RO ? roNote : "") + bar + (short ? `<div class="tts-msg bad"><b>${short} day${short === 1 ? "" : "s"} short of a teacher.</b><span>Move a period on the Edit tab, or name someone from outside the plan.</span></div>` : "") + (RO ? "" : how) + `<div class="tts-two"><div class="tts-days-l">${days || '<div class="card"><p class="muted">No papers for Classes VI to XII in this exam.</p></div>'}</div>${side}</div>`);
  }
  // Assign: the suggestion for every open period of a room, or one chosen teacher where they're free.
  function assign(e, id, who) {
    const D = S.examDuty(e), [date, k] = id.split("|"), d = D.days.find((x) => x.date === date), r = d && d.rooms.find((x) => x.k === k); if (!r) return;
    const rec = dutyRec(e, true), cur = (rec.asg[id] || []).slice();
    if (who) { const o = r.opts.find((x) => x.t.id === who); if (!o || o.no) return; D.win.forEach((p, i) => { if (o.fr[i]) cur[i] = who; }); }
    else D.win.forEach((p, i) => { if (!cur[i] && r.slots[i]) cur[i] = r.slots[i].id; });
    rec.asg[id] = D.win.map((p, i) => cur[i] || null);
    S.save(); const t = who && whoId(who); S.toast(t ? `${hon(t.name)} on duty in ${secName(k)}` : `Duty assigned for ${secName(k)}`, { done: true });
  }
  function takeAll(e) {
    // One room at a time, so each suggestion counts the ones already taken.
    for (let n = 0; n < 200; n++) { const D = S.examDuty(e); let r0 = null, d0 = null;
      D.days.some((d) => (r0 = d.rooms.find((r) => !r.done && !r.short)) && (d0 = d)); if (!r0) break;
      const rec = dutyRec(e, true), id = d0.date + "|" + r0.k, cur = rec.asg[id] || [];
      rec.asg[id] = D.win.map((p, i) => cur[i] || (r0.slots[i] && r0.slots[i].id) || null); }
    const D = S.examDuty(e), rec = dutyRec(e, true); D.days.forEach((d) => { if (!d.spareFix && d.spare) rec.res[d.date] = d.spare.id; });
    S.save(); S.toast(`All suggested duties assigned for ${e.name}`, { done: true });
  }
  function sendDuty() {
    const e = pickExam(), D = S.examDuty(e), th = (S.state.staffroom || {}).threads || {}, g = th["g:all"]; if (!D.all) return;
    const rec = dutyRec(e, true), again = !!rec.sent;
    const lines = D.days.map((d) => `${S.fmt(d.date, { weekday: "short", day: "numeric", month: "short" })}: ` + d.rooms.map((r) => `${secName(r.k)} ${runTxt(r, D.win, (t) => hon(t.name))}`).join(", ") + (d.spareFix ? `; reserve ${hon(d.spare.name)}` : "")).join("\n");
    if (g) S.post(g.msgs, { from: ME.id, kind: "notice", text: `Invigilation duty${again ? " (changed)" : ""}, ${e.name} (${e.time}):\n${lines}`, at: "Today, " + S.timeNow(), ts: Date.now() });
    Object.assign(rec, { sent: S.todayKey, by: ME.name, sig: sigOf(rec) });
    S.save(); S.toast(again ? `Changes to the duty list sent to all staff` : `Duty list sent to all staff`, { done: true }); drawDuty(); rings();
  }

  // ----- Rings on the tabs -----
  const ring = (id, p, mid, txt) => { const r = $("#rg-" + id); if (!r) return; r.style.setProperty("--p", Math.max(0, Math.min(100, Math.round(p)))); r.classList.toggle("clear", mid === "✓"); r.firstElementChild.textContent = mid; $("#rg-" + id + "-t").textContent = txt; };
  function rings() {
    const st = stats(), over = st.filter((r) => r.over).length;
    ring("tts-staff", ((st.length - over) / st.length) * 100, over || "✓", over ? `${over} overloaded` : `All ${st.length} within limits`);
    const L = labMap(); ring("tts-classes", 100, L.clash || "✓", L.clash ? `${L.clash} lab clashes` : `${order.length} classes · labs clear`);
    const n = Object.values(edits()).reduce((a, r) => a + r.log.length, 0); ring("tts-edit", n ? 100 : 0, n || "–", n ? `${n} change${n === 1 ? "" : "s"} from the plan` : "Same as the plan");
    const e = pickExam(); if (e) { const D = S.examDuty(e), rec = dutyRec(e), sent = rec.sent && rec.sig === sigOf(rec); ring("tts-duty", D.nRooms ? (D.nDone / D.nRooms) * 100 : 0, sent ? "✓" : D.nRooms - D.nDone, `${e.name} · ${sent ? "sent" : D.all ? "ready to send" : `${D.nRooms - D.nDone} to assign`}`); }
  }
  const draw = () => { const v = ($('[data-vt="tts"] button.on') || {}).dataset; const t = (v && v.v) || "staff";
    if (t === "staff") drawStaff(); else if (t === "classes") drawClasses(); else if (t === "edit") drawEdit(); else drawDuty(); rings(); };
  S.ttsDraw = draw;

  // View-only for the principal: nothing that changes the timetable or the duty list.
  const MUT = "[data-tts-cell], [data-tts-undo], [data-tts-reset], [data-tts-send], [data-tts-take], [data-tts-takeall], [data-tts-unasg], [data-tts-clearall], [data-tts-res], [data-tts-unres]";
  box.addEventListener("click", (e) => {
    const b = (q) => e.target.closest(q); let x;
    if (RO && b(MUT)) return;
    if ((x = b("[data-tts-day]"))) { ui.day = +x.dataset.ttsDay; draw(); return; }
    if ((x = b("[data-tts-spot]"))) { ui.spot = +x.dataset.ttsSpot; drawStaff(); return; }
    if ((x = b("[data-tts-cv]"))) { ui.cview = x.dataset.ttsCv; drawClasses(); return; }
    if ((x = b("[data-tts-cell]"))) { const id = x.dataset.ttsCell; ui.msg = "";
      if (!ui.pick) ui.pick = id; else if (ui.pick === id) ui.pick = null; else { swap(ui.ed, ui.pick, id); ui.pick = null; }
      drawEdit(); rings(); const nb = $(`[data-tts-cell="${id}"]`, box); if (nb) nb.focus({ preventScroll: true }); return; }
    if (b("[data-tts-unpick]")) { ui.pick = null; drawEdit(); return; }
    if (b("[data-tts-undo]")) { const r = edits()[ui.ed], last = r.log.pop(); const [d1, p1] = last.a.split("|").map(Number), [d2, p2] = last.b.split("|").map(Number);
      r.tt[d1][p1] = last.x; r.tt[d2][p2] = last.y; const ra = r.rooms[last.a], rb = r.rooms[last.b]; delete r.rooms[last.a]; delete r.rooms[last.b]; if (ra) r.rooms[last.b] = ra; if (rb) r.rooms[last.a] = rb;
      if (!r.log.length) delete edits()[ui.ed]; S.save(); ui.msg = `<b>Undone.</b><span>${esc(last.x)} and ${esc(last.y)} are back where they were.</span>`; ui.msgBad = false; draw(); return; }
    if (b("[data-tts-reset]")) { delete edits()[ui.ed]; S.save(); ui.pick = null; ui.msg = `<b>${esc(secName(ui.ed))} is back to the plan.</b><span>Every change to this class is undone.</span>`; ui.msgBad = false; S.toast(`${secName(ui.ed)} is back to the plan`, { done: true }); draw(); return; }
    if ((x = b("[data-tts-goed]"))) { ui.ed = x.dataset.ttsGoed; ui.pick = null; ui.msg = ""; drawEdit(); return; }
    if (b("[data-tts-dprint]")) { const ex = pickExam(); S.showDoc(`Invigilation duty · ${ex.name}`, S.docPage(`Invigilation duty ${ex.name}`, [dutyDoc(ex, S.examDuty(ex))]), { file: `Invigilation-${ex.name.replace(/\W+/g, "-")}.pdf` }); return; }
    if (b("[data-tts-send]")) { sendDuty(); return; }
    if ((x = b("[data-tts-take]"))) { assign(pickExam(), x.dataset.ttsTake); drawDuty(); rings(); return; }
    if (b("[data-tts-takeall]")) { takeAll(pickExam()); drawDuty(); rings(); return; }
    if ((x = b("[data-tts-unasg]"))) { delete dutyRec(pickExam(), true).asg[x.dataset.ttsUnasg]; S.save(); drawDuty(); rings(); return; }
    if (b("[data-tts-clearall]")) { const r = dutyRec(pickExam(), true); r.asg = {}; r.res = {}; S.save(); S.toast("Duty assignments cleared", { done: true }); drawDuty(); rings(); return; }
    if ((x = b("[data-tts-res]"))) { const [d, id] = x.dataset.ttsRes.split("|"); dutyRec(pickExam(), true).res[d] = id; S.save(); drawDuty(); rings(); return; }
    if ((x = b("[data-tts-unres]"))) { delete dutyRec(pickExam(), true).res[x.dataset.ttsUnres]; S.save(); drawDuty(); rings(); return; }
  });
  box.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "tts-cls") { ui.cls = t.value; drawClasses(); }
    if (t.id === "tts-ed") { ui.ed = t.value; ui.pick = null; ui.msg = ""; drawEdit(); }
    if (t.id === "tts-exam") { ui.exam = t.value; drawDuty(); rings(); }
    if (t.dataset.ttsWho && t.value && !RO) { assign(pickExam(), t.dataset.ttsWho, t.value); drawDuty(); rings(); }
  });
  document.addEventListener("click", (e) => { if (e.target.closest('[data-vt="tts"] button')) requestAnimationFrame(draw); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.pick && box.closest(".active")) { ui.pick = null; drawEdit(); } });
  document.addEventListener("sjs:sync", () => { if (!ui.pick) draw(); });
  document.addEventListener("sjs:view", (e) => { if (e.detail === "ttschool") draw(); });
  draw();
})();
