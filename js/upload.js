/* Uploads, drafts and posting later, for every staff role.
   One flow for all seven uploads: download a template (already filled with names), fill it in
   Excel, upload it, check and change any value in the preview, then post now, keep as a draft,
   or post at a set time. Drafts and timed posts sit in the Drafts tray in the top bar, where they
   can be opened, changed, posted or deleted. Timed posts go out while the app is open. */
(() => {
  const S = window.SJS; if (!S || !S.staff) return;
  const $ = (q, el = document) => el.querySelector(q), $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const esc = S.esc, role = S.staff.role, T = S.staff, office = role === "principal" || role === "admin";
  const mine = role === "teacher" ? [...new Set([T.classOf, ...(T.sections || [])].filter(Boolean))] : [];
  const sec = (k) => S.sectionByKey(k), secName = (k) => S.secName ? S.secName(k) : k;
  const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IC = { up: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>', tray: '<path d="M4 13l2.5-8h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>' };
  S.state.queue = S.state.queue || [];
  S.state.over = S.state.over || { tt: {}, roster: {} };

  // ---------- Files: CSV, TSV or Excel ----------
  const parseCSV = (t) => { const out = []; let row = [], f = "", q = false; const sep = t.split("\n")[0].includes("\t") && !t.split("\n")[0].includes(",") ? "\t" : ","; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === sep) { row.push(f); f = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); out.push(row); row = []; f = ""; } else f += c; } if (f || row.length) { row.push(f); out.push(row); } return out.filter((r) => r.some((x) => String(x).trim())); };
  async function readRows(file) {
    if (/\.xlsx?$/i.test(file.name)) {
      if (!window.XLSX) await new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; sc.onload = ok; sc.onerror = no; document.head.append(sc); });
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "", dateNF: "yyyy-mm-dd" }).filter((r) => r.some((x) => String(x).trim()));
    }
    return parseCSV((await file.text()).replace(/^﻿/, ""));
  }
  const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const saveCSV = (rows, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv" })); a.download = name + ".csv"; document.body.append(a); a.click(); a.remove(); };
  // Dates as the school writes them: 2026-11-23, 23/11/2026, 23-11-26, 23 Nov 2026.
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const pad = (n) => String(n).padStart(2, "0");
  function day(t) {
    t = String(t || "").trim(); let m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
    if ((m = t.match(/^(\d{1,2})[\s-]([a-z]{3})[a-z]*[\s-,]*(\d{4})$/i)) && MON[m[2].toLowerCase()]) return `${m[3]}-${pad(MON[m[2].toLowerCase()])}-${pad(m[1])}`;
    return "";
  }

  // ---------- The kinds of upload ----------
  // Each: who can use it, where its button sits, the columns, the template, how a row is checked,
  // and what posting does. Rows are kept as plain values so a draft can be changed later.
  const K = {};
  const pickSec = (o) => (o.secs.length > 1 ? `<label class="up-f">Section<select data-up-opt="sec">${o.secs.map((k) => `<option value="${k}"${k === o.sec ? " selected" : ""}>${secName(k)}</option>`).join("")}</select></label>` : "");
  const stuOf = (k, r) => { const x = sec(k), roll = parseInt(r.roll, 10), nm = norm(r.name); return (nm && x.students.find((s) => norm(s.name) === nm)) || x.students.find((s) => s.roll === roll) || null; };

  K.att = {
    name: "Attendance for a missed day", views: ["attendance"], who: () => role === "teacher" && T.classOf,
    opts: () => ({ sec: T.classOf, secs: [T.classOf], date: S.iso(S.nextSchoolDay ? S.addDays(S.today, -1) : S.today) }),
    optsHTML: (o) => `<label class="up-f">Day<input type="date" data-up-opt="date" value="${o.date}" max="${S.todayKey}" /></label>`,
    cols: [["roll", "Roll"], ["name", "Student"], ["v", "Status (P, A, L or a reason)"]],
    template: (o) => sec(o.sec).students.map((s) => [s.roll, s.name, (((S.secState(o.sec).attendance[o.date] || {}).marks || {})[s.roll]) || "P"]),
    // P, A or L; any other words are taken as a leave with that reason ("Medical leave", "Wedding in the family").
    check: (r, o) => { const s = stuOf(o.sec, r); if (!s) return { skip: "not in " + secName(o.sec) }; const t = String(r.v || "P").trim(); const v = /^p(resent)?$/i.test(t) ? "P" : /^(a|ab|absent)$/i.test(t) ? "A" : /^(l|leave)$/i.test(t) ? "L" : /^m(l|edical( leave)?)$/i.test(t) ? "L:Medical leave" : t.length > 2 ? "L:" + t.slice(0, 60) : null; if (!v) return { bad: `“${t}” isn't P, A, L or a reason` }; return { ok: s.name, key: s.roll, v }; },
    post: (rows, o) => { const marks = {}, why = {}; rows.forEach((r) => { if (r.v === "P") return; const [v, w] = r.v.split(":"); marks[r.key] = v; if (w) why[r.key] = w; }); S.secState(o.sec).attendance[o.date] = { taken: true, at: S.timeNow(), marks, why, late: o.date !== S.todayKey }; return `Attendance for ${S.fmt(o.date)} posted · ${Object.keys(marks).length} away, parents notified`; },
    label: (o) => `Attendance · ${secName(o.sec)} · ${S.fmt(o.date)}`
  };
  K.roster = {
    name: "Class list", views: role === "teacher" ? ["class", "attendance"] : ["classes"], who: () => (role === "teacher" ? !!T.classOf : office),
    opts: () => { const secs = role === "teacher" ? [T.classOf] : S.allSections().map((x) => x.key || `${x.cls}-${x.sec}`); return { sec: secs[0], secs }; },
    optsHTML: pickSec,
    cols: [["roll", "Roll"], ["name", "Student"], ["parent", "Parent"], ["phone", "Parent's phone"]],
    template: (o) => sec(o.sec).students.map((s) => { const p = S.PARENTS.find((x) => x.sec === o.sec && x.roll === s.roll) || {}; return [s.roll, s.name, p.parent || "", p.phone || ""]; }),
    check: (r) => { const roll = parseInt(r.roll, 10); if (!roll) return { bad: "no roll number" }; if (!String(r.name).trim()) return { bad: "no name" }; const ph = String(r.phone || "").replace(/\D/g, ""); if (r.phone && !/^(91)?[6-9]\d{9}$/.test(ph) && !/x/i.test(r.phone)) return { bad: `phone “${r.phone}” isn't 10 digits` }; return { ok: String(r.name).trim(), key: roll, v: { name: String(r.name).trim(), parent: String(r.parent || "").trim(), phone: String(r.phone || "").trim() } }; },
    post: (rows, o) => { S.state.over.roster[o.sec] = rows.map((r) => Object.assign({ roll: r.key }, r.v)); applyRoster(); return `Class list for ${secName(o.sec)} saved · ${rows.length} students`; },
    label: (o) => `Class list · ${secName(o.sec)}`
  };
  K.marksAll = {
    name: "Marks for every subject", views: ["marks", "class"], who: () => role === "teacher" && T.classOf,
    opts: () => ({ sec: T.classOf, secs: [T.classOf] }),
    cols: (o) => [["roll", "Roll"], ["name", "Student"], ...sec(o.sec).subjects.map((x) => [x, x])],
    template: (o) => sec(o.sec).students.map((s) => [s.roll, s.name, ...sec(o.sec).subjects.map((x) => S.entry(o.sec, x).marks[s.roll] ?? "")]),
    check: (r, o) => { const s = stuOf(o.sec, r); if (!s) return { skip: "not in " + secName(o.sec) }; const v = {}, bad = []; sec(o.sec).subjects.forEach((x) => { const t = String(r[x] ?? "").trim(); if (t === "") return; const n = Number(t); if (!Number.isInteger(n) || n < 0 || n > S.ENTRY.max) bad.push(`${x} “${t}”`); else v[x] = n; }); if (bad.length) return { bad: bad.join(", ") + ` not out of ${S.ENTRY.max}`, key: s.roll }; return { ok: s.name, key: s.roll, v }; },
    post: (rows, o) => { sec(o.sec).subjects.forEach((x) => { const e = S.entry(o.sec, x); rows.forEach((r) => { if (r.v[x] != null) e.marks[r.key] = r.v[x]; }); e.published = true; }); return `${S.ENTRY.name} marks for ${secName(o.sec)} published in every subject`; },
    label: (o) => `${S.ENTRY.name} marks · ${secName(o.sec)} · all subjects`, max: () => S.ENTRY.max
  };
  K.remarks = {
    name: "Remarks", views: ["care"], who: () => role === "teacher",
    opts: () => ({ sec: mine[0], secs: mine }), optsHTML: pickSec,
    cols: [["roll", "Roll"], ["name", "Student"], ["kind", "Kind (Praise, Progress, Concern, Conduct)"], ["text", "Remark"], ["share", "Share with parents (Yes/No)"]],
    template: (o) => sec(o.sec).students.map((s) => [s.roll, s.name, "", "", "Yes"]),
    check: (r, o) => { if (!String(r.text || "").trim()) return { empty: true }; const s = stuOf(o.sec, r); if (!s) return { skip: "not in " + secName(o.sec) }; const k = Object.keys(S.REMARK_KINDS || {}).find((x) => norm(x) === norm(r.kind)) || (r.kind ? null : "progress"); if (!k) return { bad: `kind “${r.kind}” isn't one of Praise, Progress, Concern, Conduct` }; return { ok: s.name, key: s.roll, v: { kind: k, text: String(r.text).trim(), share: !/^n/i.test(String(r.share || "y")) } }; },
    post: (rows, o) => { rows.forEach((r) => S.addRemark({ sec: o.sec, roll: r.key, kind: r.v.kind, text: r.v.text, by: T.name, share: r.v.share })); return `${rows.length} remarks saved for ${secName(o.sec)}`; },
    label: (o) => `Remarks · ${secName(o.sec)}`
  };
  // Bank statement: each credit is matched to a family by the child's name or app key in the narration, then to an unpaid instalment of that amount.
  const kids = () => S.PARENTS.map((p) => S.kid(p.key)).filter(Boolean);
  K.bank = {
    name: "Fee payments from the bank statement", views: ["fees"], who: () => office, opts: () => ({}),
    cols: [["date", "Date"], ["ref", "Narration"], ["amount", "Credit"]],
    template: () => kids().slice(0, 3).map((k) => [S.todayKey, `UPI/${k.name.toUpperCase()}/${k.key}`, S.kidFees(k.key).find((f) => !f.paid)?.amount || ""]),
    check: (r) => {
      const amt = Number(String(r.amount).replace(/[₹,\s]/g, "")); if (!amt) return { empty: true };
      const d = day(r.date); if (!d) return { bad: `date “${r.date}” not understood` };
      const n = norm(r.ref), k = kids().find((x) => n.includes(norm(x.key))) || kids().find((x) => n.includes(norm(x.name)));
      if (!k) return { skip: `no child found in “${String(r.ref).slice(0, 40)}”` };
      const f = S.kidFees(k.key).find((x) => !x.paid && x.amount === amt);
      if (!f) return { bad: `${k.name}: no unpaid instalment of ${S.rupee(amt)}` };
      return { ok: `${k.name} · ${f.q.split(" · ")[0]}`, key: k.key + "|" + f.q, v: { kid: k.key, q: f.q, date: d } };
    },
    post: (rows) => { rows.forEach((r) => { const f = S.kidFees(r.v.kid).find((x) => x.q === r.v.q); if (f) f.paid = r.v.date; }); return `${rows.length} fee payments marked paid from the statement · receipts go to parents`; },
    label: () => "Fee payments from the bank"
  };
  K.tt = {
    name: "Timetable", views: ["classes"], who: () => office,
    opts: () => { const secs = S.allSections().map((x) => x.key || `${x.cls}-${x.sec}`); return { sec: secs[0], secs }; }, optsHTML: pickSec,
    cols: [["day", "Day"], ...S.periodTimes.map((t, i) => ["p" + i, `P${i + 1} ${t}`])],
    template: (o) => { const tt = S.timetableOf(o.sec); return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => [d, ...S.periodTimes.map((_, p) => (tt[i + 1] || [])[p] || "")]); },
    check: (r, o) => { const di = ["mon", "tue", "wed", "thu", "fri", "sat"].findIndex((d) => norm(r.day).startsWith(d)); if (di < 0) return { bad: `day “${r.day}” isn't Mon to Sat` }; const subs = sec(o.sec).subjects.concat(["Club Activities", "Library", "Games", "Assembly", "Value Education"]), row = [], bad = []; S.periodTimes.forEach((_, p) => { const t = String(r["p" + p] || "").trim(); if (!t) return; const m = subs.find((x) => norm(x) === norm(t) || norm(x).startsWith(norm(t))); if (m) row[p] = m; else bad.push(`P${p + 1} “${t}”`); }); if (bad.length) return { bad: bad.join(", ") + " isn't a subject of " + secName(o.sec) }; return { ok: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][di], key: di + 1, v: row }; },
    post: (rows, o) => { const tt = Object.assign({}, S.timetableOf(o.sec)); rows.forEach((r) => (tt[r.key] = r.v)); S.state.over.tt[o.sec] = tt; return `New timetable for ${secName(o.sec)} is live · parents and teachers see it now`; },
    label: (o) => `Timetable · ${secName(o.sec)}`
  };
  K.ds = {
    name: "Exam datesheet", views: ["exams"], who: () => office,
    opts: () => { const ex = S.state.exams.filter((e) => S.examStatus(e).k !== "done"); return { ex: (ex[0] || S.state.exams[0]).id, exs: ex.length ? ex : S.state.exams }; },
    optsHTML: (o) => `<label class="up-f">Exam<select data-up-opt="ex">${o.exs.map((e) => `<option value="${e.id}"${e.id === o.ex ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>`,
    cols: [["group", "Class"], ["subj", "Subject"], ["date", "Date"]],
    template: (o) => { const e = S.state.exams.find((x) => x.id === o.ex); return S.examGroups(e.classes).flatMap((g) => (e.papers[g] || []).map((p) => [S.groupLabel(g), p.subj, p.date])); },
    check: (r, o) => { const e = S.state.exams.find((x) => x.id === o.ex), gs = S.examGroups(e.classes), n = norm(String(r.group).replace(/^class/i, "")); const g = gs.find((x) => norm(S.groupLabel(x)) === norm(r.group) || norm(x) === n || norm(x.split("-")[0]) === n); if (!g) return { skip: `class “${r.group}” doesn't sit ${e.name}` }; const p = (e.papers[g] || []).find((x) => norm(x.subj) === norm(r.subj)); if (!p) return { bad: `${S.groupLabel(g)} has no ${r.subj} paper` }; const d = day(r.date); if (!d) return { bad: `date “${r.date}” not understood` }; if (!new Date(d + "T00:00").getDay() || S.HOLIDAYS[d]) return { bad: `${S.fmt(d)} is ${S.HOLIDAYS[d] || "a Sunday"}` }; return { ok: `${S.groupLabel(g)} · ${p.subj}`, key: g + "|" + p.subj, v: { g, subj: p.subj, date: d } }; },
    post: (rows, o) => { const e = S.state.exams.find((x) => x.id === o.ex); rows.forEach((r) => { const p = e.papers[r.v.g].find((x) => x.subj === r.v.subj); if (p) p.date = r.v.date; }); e.published = true; if (S.examNotice) { S.state.notices = S.state.notices.filter((n) => n.id !== "ex-" + e.id); S.state.notices.unshift(Object.assign(S.examNotice(e), { fresh: true })); } return `${e.name} datesheet published to parents · ${rows.length} dates set`; },
    label: (o) => `Datesheet · ${(S.state.exams.find((x) => x.id === o.ex) || {}).name}`
  };
  // Posting later also covers work made on the page itself, not only uploads.
  K.attToday = { post: (rows, o) => { S.secState(o.sec).attendance[o.date] = { taken: true, at: S.timeNow(), marks: o.marks, why: o.why || {} }; return `Attendance for ${secName(o.sec)} posted · parents notified`; }, label: (o) => `Attendance · ${secName(o.sec)} · ${S.fmt(o.date)}` };
  K.marksPub = { post: (rows, o) => { S.entry(o.sec, o.subj).published = true; return `${o.subj} marks for ${secName(o.sec)} published to parents`; }, label: (o) => `${o.subj} marks · ${secName(o.sec)} · publish` };

  // Uploaded class lists and timetables take the place of the sample ones.
  function applyRoster() { Object.entries(S.state.over.roster || {}).forEach(([k, list]) => { const x = sec(k); if (!x) return; list.forEach((r) => { const s = x.students.find((v) => v.roll === r.roll); if (s) { s.name = r.name; } else x.students.push({ roll: r.roll, name: r.name, initials: r.name.split(" ").map((w) => w[0]).join("").slice(0, 2) }); const p = S.PARENTS.find((v) => v.sec === k && v.roll === r.roll); if (p) { if (r.parent) p.parent = r.parent; if (r.phone) p.phone = r.phone; } }); }); }
  applyRoster();
  const ttOf = S.timetableOf; S.timetableOf = (k) => (S.state.over.tt || {})[k] || ttOf(k);

  // ---------- The upload window ----------
  let box = null, cur = null; // cur: { kind, o, rows (checked), raw (plain rows), draftId }
  function shell() {
    if (box) return box;
    box = document.createElement("div"); box.className = "up-modal"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.innerHTML = `<div class="up-card"><div class="up-h"><div><b class="up-t"></b><span class="up-s"></span></div><button type="button" class="up-x" aria-label="Close">×</button></div><div class="up-body"></div></div>`;
    document.body.append(box);
    box.addEventListener("click", onClick); box.addEventListener("change", onChange); box.addEventListener("input", onInput);
    box.addEventListener("mousedown", (e) => { if (e.target === box) close(); });
    return box;
  }
  const close = () => { if (box) box.classList.remove("on"); cur = null; };
  const colsOf = (k, o) => (typeof k.cols === "function" ? k.cols(o) : k.cols);
  function open(kind, o, raw, draftId) {
    const k = K[kind]; shell();
    cur = { kind, o: o || k.opts(), raw: raw || null, draftId: draftId || null };
    $(".up-t", box).textContent = (draftId ? "Draft · " : "Upload · ") + k.name;
    $(".up-s", box).textContent = k.label(cur.o);
    box.classList.add("on");
    raw ? preview() : start();
  }
  function start() {
    const k = K[cur.kind];
    $(".up-body", box).innerHTML = `${k.optsHTML ? `<div class="up-opts">${k.optsHTML(cur.o)}</div>` : ""}
      <ol class="up-steps"><li><b>Download the template</b><span>${k.template ? "It already has the names, so only the new values need filling." : ""}</span><button type="button" class="ez-act" data-up-tpl>${svg('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>')}Template (.csv)</button></li>
      <li><b>Fill it in Excel or Google Sheets</b><span>Keep the first row. Save as .xlsx or .csv.</span></li>
      <li><b>Upload it</b><span>Nothing changes until you check it on the next screen.</span><label class="up-drop">${svg(IC.up)}<span>Choose a file or drop it here</span><input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" data-up-file /></label></li></ol>`;
  }
  // Header row (if any) → named columns; a sheet without one is read in the template's order.
  function toRaw(rows) {
    const cols = colsOf(K[cur.kind], cur.o), h = rows[0].map((x) => norm(x));
    const hit = cols.map(([, label]) => h.findIndex((x) => x && (x === norm(label) || norm(label).startsWith(x) || x.startsWith(norm(label).slice(0, 5)))));
    const head = hit.filter((i) => i >= 0).length >= Math.min(2, cols.length);
    return (head ? rows.slice(1) : rows).map((r) => Object.fromEntries(cols.map(([key], i) => [key, String(r[head ? hit[i] : i] ?? "").trim()])));
  }
  function checkAll() {
    const k = K[cur.kind], seen = new Set();
    return cur.raw.map((r, i) => { const c = k.check(r, cur.o); if (c.ok && seen.has(String(c.key))) return Object.assign({ i, r }, { dup: true }); if (c.ok) seen.add(String(c.key)); return Object.assign({ i, r }, c); });
  }
  function preview() {
    const k = K[cur.kind], cols = colsOf(k, cur.o), res = checkAll(), ok = res.filter((x) => x.ok && !x.dup), bad = res.filter((x) => x.bad), skip = res.filter((x) => x.skip), dup = res.filter((x) => x.dup);
    const now = new Date(Date.now() + 36e5), local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
    $(".up-body", box).innerHTML = `${k.optsHTML ? `<div class="up-opts">${k.optsHTML(cur.o)}</div>` : ""}
      <div class="up-sum"><span class="ok">${ok.length} ready</span>${bad.length ? `<span class="warn">${bad.length} to fix</span>` : ""}${skip.length ? `<span>${skip.length} skipped</span>` : ""}${dup.length ? `<span>${dup.length} listed twice</span>` : ""}<em>Change any value below; rows are checked again as you type.</em></div>
      <div class="up-tbl"><table class="tbl"><thead><tr><th></th>${cols.map(([, l]) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${res.map((x) => `<tr class="${x.ok && !x.dup ? "ok" : x.bad ? "bad" : x.empty ? "empty" : "skip"}"><td class="up-st" title="${esc(x.bad || x.skip || (x.dup ? "Listed twice: the first row is kept" : x.empty ? "Nothing to post in this row" : "Ready"))}">${x.ok && !x.dup ? "✓" : x.bad ? "!" : "–"}</td>${cols.map(([key]) => `<td><input data-up-cell="${x.i}|${key}" value="${esc(x.r[key] ?? "")}" aria-label="${esc(key)}, row ${x.i + 1}" /></td>`).join("")}</tr>${x.bad || x.skip ? `<tr class="up-why"><td></td><td colspan="${cols.length}">${esc(x.bad || x.skip)}</td></tr>` : ""}`).join("")}</tbody></table></div>
      <div class="up-go"><div class="up-when"><label class="up-r"><input type="radio" name="up-mode" value="post" checked /> Post now</label><label class="up-r"><input type="radio" name="up-mode" value="draft" /> Keep as a draft</label><label class="up-r"><input type="radio" name="up-mode" value="later" /> Post at <input type="datetime-local" data-up-when value="${local}" min="${S.todayKey}T00:00" /></label></div>
      <div class="up-btns">${cur.draftId ? `<button type="button" class="btn btn-ghost btn-sm" data-up-del>Delete draft</button>` : `<button type="button" class="btn btn-ghost btn-sm" data-up-again>Choose another file</button>`}<button type="button" class="btn btn-primary btn-sm" data-up-go${ok.length ? "" : " disabled"}>Post ${ok.length}</button></div></div>`;
    syncGo();
  }
  function syncGo() {
    const m = ($('[name="up-mode"]:checked', box) || {}).value, b = $("[data-up-go]", box); if (!b) return;
    const n = checkAll().filter((x) => x.ok && !x.dup).length;
    b.textContent = m === "draft" ? `Save draft (${n} rows)` : m === "later" ? `Schedule ${n}` : `Post ${n} now`;
    b.disabled = !n && m !== "draft";
  }
  async function onChange(e) {
    const t = e.target;
    if (t.dataset.upOpt) { cur.o[t.dataset.upOpt] = t.value; $(".up-s", box).textContent = K[cur.kind].label(cur.o); if (cur.raw) preview(); return; }
    if (t.name === "up-mode") return syncGo();
    if (t.dataset.upFile != null) {
      const f = t.files[0]; if (!f) return;
      try { const rows = await readRows(f); if (!rows.length) throw 0; cur.raw = toRaw(rows); if (!cur.raw.length) throw 0; preview(); }
      catch (err) { S.toast(`Couldn't read ${f.name}. Use the template and save it as .xlsx or .csv.`, { done: false }); }
    }
  }
  let typing = 0;
  function onInput(e) {
    const t = e.target; if (!t.dataset.upCell) { if (t.dataset.upWhen != null) $('[name="up-mode"][value="later"]', box).checked = true, syncGo(); return; }
    const [i, key] = t.dataset.upCell.split("|"); cur.raw[+i][key] = t.value;
    clearTimeout(typing); typing = setTimeout(() => { const f = document.activeElement && document.activeElement.dataset.upCell; preview(); if (f) { const el = $(`[data-up-cell="${f}"]`, box); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } }, 500);
  }
  function onClick(e) {
    const t = e.target.closest("button, .up-x"); if (!t) return;
    if (t.classList.contains("up-x")) return close();
    const k = K[cur.kind];
    if (t.dataset.upTpl != null) { const cols = colsOf(k, cur.o); saveCSV([cols.map(([, l]) => l), ...k.template(cur.o)], k.label(cur.o).replace(/[^\w]+/g, "-")); return; }
    if (t.dataset.upAgain != null) { cur.raw = null; return start(); }
    if (t.dataset.upDel != null) { S.state.queue = S.state.queue.filter((q) => q.id !== cur.draftId); S.save(); close(); tray(); S.toast("Draft deleted", { done: false }); return; }
    if (t.dataset.upGo != null) {
      const m = $('[name="up-mode"]:checked', box).value, when = $("[data-up-when]", box).value;
      if (m === "later" && (!when || new Date(when) <= new Date())) { S.toast("Pick a time later than now", { done: false }); return; }
      const rows = checkAll().filter((x) => x.ok && !x.dup).map(({ key, v, ok }) => ({ key, v, ok }));
      S.state.queue = S.state.queue.filter((q) => q.id !== cur.draftId);
      if (m === "post") { const msg = k.post(rows, cur.o); S.save(); close(); tray(); redraw(); S.toast(msg.replace(/^/, "Posted · ")); return; }
      keep(cur.kind, cur.o, m === "later" ? when : null, cur.raw);
      close(); S.toast(m === "later" ? `Scheduled for ${fmtWhen(when)} · it's in the Drafts tray until then` : "Saved as a draft · open it from the Drafts tray to change or post it", { done: false });
    }
  }
  const fmtWhen = (w) => new Date(w).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  function keep(kind, o, when, raw) { S.state.queue.push({ id: "q" + Date.now().toString(36), kind, o: JSON.parse(JSON.stringify(o, (k, v) => (k === "exs" ? undefined : v))), when, raw, by: T.name, at: S.timeNow() }); S.save(); tray(); }
  S.keepForLater = keep; S.openUpload = open;
  const redraw = () => { document.dispatchEvent(new Event("sjs:sync")); if (S.renderAll) S.renderAll(); };

  // ---------- Timed posts go out when their time comes ----------
  function due() {
    const now = Date.now(), go = S.state.queue.filter((q) => q.when && new Date(q.when).getTime() <= now); if (!go.length) return;
    go.forEach((q) => { const k = K[q.kind]; let msg; if (q.raw) { cur = { kind: q.kind, o: Object.assign(k.opts ? k.opts() : {}, q.o), raw: q.raw }; msg = k.post(checkAll().filter((x) => x.ok && !x.dup).map(({ key, v, ok }) => ({ key, v, ok })), cur.o); cur = null; } else msg = k.post([], q.o); S.toast(`Scheduled post went out · ${msg}`); });
    S.state.queue = S.state.queue.filter((q) => !go.includes(q)); S.save(); tray(); redraw();
  }
  setInterval(due, 20000); setTimeout(due, 1500);

  // ---------- Drafts tray in the top bar ----------
  let tb = null, panel = null;
  function tray() {
    const n = S.state.queue.length, bar = $(".pbar-r"); if (!bar) return;
    if (!tb) {
      tb = document.createElement("button"); tb.type = "button"; tb.className = "icon-btn up-tray"; tb.innerHTML = svg(IC.tray) + `<span class="count" hidden></span>`;
      tb.addEventListener("click", () => (panel && panel.classList.contains("on") ? panel.classList.remove("on") : showTray()));
      const who = $(".pbar-who", bar); bar.insertBefore(tb, who || null);
    }
    tb.hidden = !n; tb.setAttribute("aria-label", `Drafts and scheduled posts: ${n}`); tb.title = `${n} draft${n === 1 ? "" : "s"} or scheduled post${n === 1 ? "" : "s"}`;
    $(".count", tb).hidden = !n; $(".count", tb).textContent = n;
    if (panel && panel.classList.contains("on")) showTray();
  }
  function showTray() {
    if (!panel) { panel = document.createElement("div"); panel.className = "up-tray-p"; document.body.append(panel); panel.addEventListener("click", trayClick); document.addEventListener("pointerdown", (e) => { if (panel.classList.contains("on") && !panel.contains(e.target) && !tb.contains(e.target)) panel.classList.remove("on"); }, true); }
    const r = tb.getBoundingClientRect(); panel.style.top = r.bottom + 8 + "px"; panel.style.right = Math.max(10, innerWidth - r.right) + "px";
    const q = [...S.state.queue].sort((a, b) => (a.when || "9") < (b.when || "9") ? -1 : 1);
    panel.innerHTML = `<p class="up-tray-h">Drafts and scheduled posts</p>${q.length ? q.map((x) => `<div class="up-tray-i"><span class="sq ${x.when ? "royal" : ""}">${svg(x.when ? IC.clock : IC.tray)}</span><div class="t"><b>${esc(K[x.kind].label(x.o))}</b><span>${x.when ? `Posts ${fmtWhen(x.when)}` : `Draft · saved ${x.at}`}${x.raw ? ` · ${x.raw.length} rows` : ""}</span></div><div class="up-tray-a">${x.raw ? `<button type="button" data-q-open="${x.id}">Open</button>` : ""}<button type="button" data-q-post="${x.id}">Post now</button><button type="button" data-q-del="${x.id}" aria-label="Delete">×</button></div></div>`).join("") : `<p class="muted">Nothing waiting.</p>`}`;
    panel.classList.add("on");
  }
  function trayClick(e) {
    const b = e.target.closest("button"); if (!b) return;
    const id = b.dataset.qOpen || b.dataset.qPost || b.dataset.qDel, q = S.state.queue.find((x) => x.id === id); if (!q) return;
    if (b.dataset.qDel) { S.state.queue = S.state.queue.filter((x) => x !== q); S.save(); tray(); S.toast("Deleted", { done: false }); return; }
    if (b.dataset.qOpen) { panel.classList.remove("on"); open(q.kind, Object.assign(K[q.kind].opts(), q.o), q.raw, q.id); return; }
    q.when = new Date(Date.now() - 1000).toISOString(); due(); panel.classList.remove("on");
  }
  tray();

  // ---------- Buttons on the pages ----------
  function buttons() {
    Object.entries(K).forEach(([kind, k]) => {
      if (!k.views || !k.who || !k.who()) return;
      k.views.forEach((v) => {
        const bar = $(`[data-view="${v}"] .topbar`); if (!bar || $(`[data-upk="${kind}"]`, bar)) return;
        let r = $(":scope > .right", bar); if (!r) { r = document.createElement("div"); r.className = "right up-right"; bar.append(r); }
        const b = document.createElement("button"); b.type = "button"; b.className = "btn btn-ghost btn-sm up-btn"; b.dataset.upk = kind; b.title = `Upload: ${k.name}`;
        b.innerHTML = svg(IC.up) + `<span>${{ att: "Upload a day", roster: "Upload class list", marksAll: "Upload all subjects", remarks: "Upload remarks", bank: "Upload bank statement", tt: "Upload timetable", ds: "Upload datesheet" }[kind]}</span>`;
        r.prepend(b);
      });
    });
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-upk]"); if (b && K[b.dataset.upk]) open(b.dataset.upk); });
  buttons();
})();

/* A small menu under a ⋯ button: the extra choices stay out of the way until asked for. */
(() => {
  const S = window.SJS; if (!S || !S.staff) return;
  let pop = null, onPick = null, anchor = null;
  S.pop = (a, html, cb) => {
    if (!pop) {
      pop = document.createElement("div"); pop.className = "dot-pop"; pop.setAttribute("role", "menu"); document.body.append(pop);
      pop.addEventListener("click", (e) => { const b = e.target.closest("[data-pick]"); if (!b) return; const f = pop.querySelector("[data-pick-text]"); const keep = onPick(b.dataset.pick, f ? f.value.trim() : "", pop); if (keep !== true) S.closePop(); });
      pop.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("input")) { e.preventDefault(); const b = pop.querySelector("[data-pick-enter]"); if (b) b.click(); } if (e.key === "Escape") S.closePop(); });
      document.addEventListener("pointerdown", (e) => { if (pop.classList.contains("on") && !pop.contains(e.target) && e.target !== anchor && !(anchor && anchor.contains(e.target))) S.closePop(); }, true);
      addEventListener("resize", () => S.closePop()); addEventListener("scroll", (e) => { if (pop.classList.contains("on") && !pop.contains(e.target)) S.closePop(); }, true);
    }
    anchor = a; onPick = cb; pop.innerHTML = html; pop.classList.add("on"); a.setAttribute("aria-expanded", "true");
    const r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px";
    pop.style.top = (innerHeight - r.bottom < h + 12 && r.top > h + 12 ? r.top - h - 6 : r.bottom + 6) + "px";
    const f = pop.querySelector("input"); if (f && !f.dataset.noFocus) setTimeout(() => f.focus(), 30);
  };
  S.closePop = () => { if (!pop || !pop.classList.contains("on")) return; pop.classList.remove("on"); if (anchor) anchor.setAttribute("aria-expanded", "false"); anchor = null; };
  // "Post at…" for anything a page can hold back: returns the chosen time through cb.
  S.laterPop = (a, label, cb) => {
    const t = new Date(Date.now() + 36e5), p = (n) => String(n).padStart(2, "0"), v = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:00`;
    S.pop(a, `<p class="dot-h">${S.esc(label)}</p><button type="button" data-pick="draft">Keep as a draft</button><div class="dot-when"><input type="datetime-local" value="${v}" data-pick-text data-no-focus="1" aria-label="When to post" /><button type="button" class="dot-ok" data-pick="later" data-pick-enter>Schedule</button></div>`,
      (k, when) => { if (k === "later" && (!when || new Date(when) <= new Date())) { S.toast("Pick a time later than now", { done: false }); return true; } cb(k === "later" ? when : null); });
  };
})();
