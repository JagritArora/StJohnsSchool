/* Exams, datesheets and who a notice is for.
   Loaded after classes.js on the portal pages. The exam calendar lives in the
   demo state, so the office can edit and publish a datesheet and parents see it.
   Pre-primary has no exams; the test series and pre-boards are for X and XII. */
(function () {
  const S = window.SJS;
  const CLS = S.sample.classes; // Nur … XII
  const ci = (c) => CLS.indexOf(c);
  const EXAM_CLASSES = CLS.slice(3); // Classes I to XII
  S.EXAM_CLASSES = EXAM_CLASSES;

  // ---------- Kinds of exam ----------
  S.EXAM_KINDS = {
    ut: { name: "Unit test", tone: "royal" },
    ts: { name: "Test series", tone: "teal" },
    hy: { name: "Half-yearly", tone: "gold" },
    pb: { name: "Pre-board", tone: "accent" },
    fin: { name: "Final exam", tone: "green" }
  };

  // ---------- Who sits a paper ----------
  // A datesheet is per class; XI and XII have one per stream (A Science, B Commerce).
  S.examGroups = (classes) => classes.flatMap((c) => (c === "XI" || c === "XII" ? [c + "-A", c + "-B"] : [c]));
  S.groupLabel = (g) => { const [c, s] = g.split("-"); return s ? `Class ${c} · ${S.STREAM(c, s)}` : S.classLabel(c); };
  S.groupOf = (kid) => (kid.cls === "XI" || kid.cls === "XII" ? kid.sec.key : kid.cls);
  S.groupSubjects = (g) => {
    const [c, s] = g.split("-"), i = ci(c);
    if (s) return S.section(c, s).subjects;
    if (i >= 8 && i <= 10) return S.VIIB.subjects; // VI to VIII share VII-B's six subjects
    return S.section(c, "A").subjects;
  };
  // "I–XII", "X and XII", "VI, VII and IX"
  S.classRange = (list) => {
    const xs = [...new Set(list)].sort((a, b) => ci(a) - ci(b));
    if (!xs.length) return "";
    const runs = []; xs.forEach((c) => { const r = runs[runs.length - 1]; if (r && ci(c) === ci(r[r.length - 1]) + 1) r.push(c); else runs.push([c]); });
    const parts = runs.flatMap((r) => (r.length >= 3 ? [`${r[0]}–${r[r.length - 1]}`] : r));
    return parts.length < 2 ? parts[0] : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
  };
  S.classesText = (list) => { const xs = [...new Set(list)]; return xs.length === 1 ? S.classLabel(xs[0]) : "Classes " + S.classRange(xs).replace(/\bNur\b/g, "Nursery"); };

  // ---------- Building a datesheet ----------
  const day = (k) => new Date(k + "T00:00");
  const ok = (d) => S.isSchoolDay(d);
  // Papers on school days from `from`: every day (gap 1), every other school day (gap 2).
  const spread = (subjects, from, gap) => {
    let d = day(from); while (!ok(d)) d = S.addDays(d, 1);
    return subjects.map((x, i) => { if (i) d = S.nextSchoolDay(d, gap); return { date: S.iso(d), subj: x }; });
  };
  // Saturdays only, skipping holidays and the weeks other exams sit in.
  const saturdays = (subjects, from, to, avoid = []) => {
    const out = []; let d = day(from); while (d.getDay() !== 6) d = S.addDays(d, 1);
    for (let i = 0; S.iso(d) <= to; d = S.addDays(d, 7)) {
      const k = S.iso(d);
      if (!ok(d) || avoid.some(([a, b]) => k >= a && k <= b)) continue;
      out.push({ date: k, subj: subjects[i++ % subjects.length] });
    }
    return out;
  };
  S.buildPapers = (classes, from, how, until, avoid) => {
    const papers = {};
    S.examGroups(classes).forEach((g) => {
      const subs = S.groupSubjects(g);
      papers[g] = how === "sat" ? saturdays(subs, from, until || S.iso(S.addDays(day(from), 7 * subs.length * 2)), avoid) : spread(subs, from, how === "alt" ? 2 : 1);
    });
    return papers;
  };

  // ---------- This session's exams (sample calendar) ----------
  const ALL = EXAM_CLASSES, BOARD = ["X", "XII"], NOT_BOARD = ALL.filter((c) => !BOARD.includes(c));
  const TS_AVOID = [["2026-09-12", "2026-09-26"], ["2026-10-31", "2026-10-31"], ["2026-11-14", "2026-11-14"], ["2026-11-28", "2026-12-12"], ["2027-01-09", "2027-01-23"]];
  const PLAN = [
    { id: "ut1", name: "Unit Test 1", kind: "ut", classes: ALL, from: "2026-07-20", how: "day", time: "8:00 to 9:30 AM, then regular classes", note: "One paper a day in the first two periods. Syllabus: the chapters taught in April and July." },
    { id: "ts", name: "Board test series", kind: "ts", classes: BOARD, from: "2026-08-01", until: "2027-01-30", how: "sat", time: "Saturdays, 8:00 to 9:30 AM", note: "One subject every Saturday, on the CBSE pattern. Papers are marked out of 25 and shown in class the next week." },
    { id: "hy", name: "Half-yearly exams", kind: "hy", classes: ALL, from: "2026-09-14", how: "alt", time: "8:30 to 11:30 AM (Classes I to V till 10:30)", note: "A study day between papers. Reach school by 8:15 AM. School closes after the paper on exam days." },
    { id: "ut2", name: "Unit Test 2", kind: "ut", classes: ALL, from: "2026-10-05", how: "day", time: "8:00 to 9:30 AM, then regular classes", note: "Syllabus: the chapters taught after the half-yearly." },
    { id: "ut3", name: "Unit Test 3", kind: "ut", classes: NOT_BOARD, from: "2026-11-23", how: "day", time: "8:00 to 9:30 AM, then regular classes", note: "Syllabus: the chapters taught in October and November. Classes X and XII sit their first pre-board instead." },
    { id: "pb1", name: "Pre-board 1", kind: "pb", classes: BOARD, from: "2026-12-01", how: "alt", time: "8:30 to 11:30 AM", note: "Full syllabus, on the CBSE board pattern. Admit cards from the class teacher a week before." },
    { id: "pb2", name: "Pre-board 2", kind: "pb", classes: BOARD, from: "2027-01-11", how: "alt", time: "8:30 to 11:30 AM", note: "The last practice before the board exam, on the CBSE timetable pattern." },
    { id: "fin", name: "Final exams", kind: "fin", classes: NOT_BOARD, from: "2027-02-22", how: "alt", time: "8:30 to 11:30 AM (Classes I to V till 10:30)", note: "Full syllabus. Results on Friday, 26 March." }
  ];
  S.examSeed = () => PLAN.map((p) => {
    const papers = S.buildPapers(p.classes, p.from, p.how, p.until, TS_AVOID);
    const dates = Object.values(papers).flat().map((x) => x.date).sort();
    // Datesheets go out about six weeks ahead; later ones are still drafts.
    const published = dates[0] <= S.iso(S.addDays(S.today, 42));
    return { id: p.id, name: p.name, kind: p.kind, classes: [...p.classes], time: p.time, note: p.note, papers, published };
  });
  S.examSpan = (e, g) => { const ds = (g ? e.papers[g] || [] : Object.values(e.papers).flat()).map((x) => x.date).sort(); return { from: ds[0], to: ds[ds.length - 1] }; };
  // Done, on now, or coming up, for one group (or the whole exam).
  S.examStatus = (e, g) => {
    const { from, to } = S.examSpan(e, g);
    if (!from) return { k: "none" };
    if (to < S.todayKey) return { k: "done", label: "Done" };
    if (from <= S.todayKey) return { k: "on", label: "On now" };
    const n = Math.round((day(from) - S.today) / 864e5);
    return { k: "next", n, label: n === 1 ? "Tomorrow" : `In ${n} days` };
  };
  S.examsFor = (kid) => { const g = S.groupOf(kid); return S.state.exams.filter((e) => e.classes.includes(kid.cls) && (e.papers[g] || []).length); };

  // Marks for one paper: real ones where the demo has them, else a steady sample.
  const KEY = { ut1: "ut1", hy: "hy", fin: "fin", pb2: "fin" };
  S.paperMark = (kid, e, p) => {
    if (p.date >= S.todayKey) return null;
    const k = KEY[e.id];
    if (k && S.EX.list.includes(k) && kid[k] && kid[k][p.subj] != null) return { v: kid[k][p.subj], of: 100 };
    if (e.id === "ut2" && S.PHASE === "mid") { const en = S.entry(kid.sec.key, p.subj); return en.published && en.marks[kid.roll] != null ? { v: +en.marks[kid.roll], of: S.ENTRY.max } : { wait: true }; }
    const base = (kid.hy && kid.hy[p.subj]) || 70, h = S.hash(kid.roll * 97 + p.subj.length * 13, +p.date.replace(/-/g, "") % 100000);
    const v = Math.min(97, Math.max(30, base - 4 + (h - 0.5) * 22));
    return e.kind === "ts" ? { v: Math.floor(v / 4), of: 25 } : e.kind === "ut" ? { v: Math.floor(v / 5), of: 20 } : { v: Math.round(v), of: 100 };
  };

  // ---------- Notices: how important, and who they are for ----------
  S.LEVELS = { high: { label: "High", tone: "accent", n: 3 }, medium: { label: "Medium", tone: "gold", n: 2 }, low: { label: "Low", tone: "slate", n: 1 } };
  S.levelOf = (n) => (S.LEVELS[n.level] ? n.level : "medium");
  S.levelBadge = (n) => { const l = S.levelOf(n), L = S.LEVELS[l]; return `<span class="lvl ${l}" title="${L.label} importance"><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>${L.label}</span>`; };
  // Girls in the sample names (everyone else is a boy).
  const GIRLS = new Set(["Aanya", "Akshara", "Ananya", "Anika", "Avika", "Bhavya", "Gauri", "Inaya", "Ira", "Jiya", "Kavya", "Khushi", "Mahira", "Mira", "Myra", "Nitya", "Prisha", "Riya", "Ruhi", "Sanya", "Siya", "Tara", "Vanya", "Zara", "Aisha", "Elena", "Anna", "Tanya", "Sneha", "Diya", "Navya", "Saanvi",
    "Aditi", "Avni", "Gurleen", "Ishita", "Jasmine", "Lavanya", "Meher", "Mehak", "Naina", "Pari", "Sara", "Tanvi", "Zoya"]);
  S.genderOf = (st) => (GIRLS.has(st.first || st.name.split(" ")[0]) ? "girls" : "boys");
  // Bus or own transport for every student: the demo parents' own answer, else a steady sample.
  S.busOf = (x, st) => {
    const p = S.PARENTS.find((v) => v.sec === x.key && v.roll === st.roll);
    if (p) return p.bus;
    const h = S.hash(x.ci * 131 + st.roll, x.key.length * 7 + x.key.charCodeAt(x.key.length - 1));
    return h < 0.36 ? "Own transport" : `Route ${1 + Math.floor(S.hash(st.roll * 7 + x.ci, 3) * 22)}`;
  };
  S.ROUTES = Array.from({ length: 22 }, (_, i) => `Route ${i + 1}`);
  // to: { cls: [] = every class, sec: [] = every section, bus: "" | "bus" | "own", route: "" | "Route 14", gender: "" | "girls" | "boys", staff: true = staff only }
  S.toOf = (n) => Object.assign({ cls: [], sec: [], bus: "", route: "", gender: "" }, n.to || {});
  S.isEveryone = (n) => { const t = S.toOf(n); return !t.staff && !t.cls.length && !t.sec.length && !t.bus && !t.gender; };
  const matches = (t, cls, sec, bus, gender) =>
    !t.staff && (!t.cls.length || t.cls.includes(cls)) && (!t.sec.length || t.sec.includes(sec)) &&
    (!t.bus || (t.bus === "own" ? bus === "Own transport" : bus !== "Own transport" && (!t.route || t.route === bus))) &&
    (!t.gender || t.gender === gender);
  S.noticeFor = (n, kid) => matches(S.toOf(n), kid.cls, kid.sec.sec, kid.bus, S.genderOf(kid));
  S.noticesFor = (kid) => S.state.notices.filter((n) => S.noticeFor(n, kid));
  S.noticeReachesClass = (n, cls) => { const t = S.toOf(n); return !t.staff && (!t.cls.length || t.cls.includes(cls)); };
  // How many students (one family each) a notice reaches.
  S.reach = (to) => {
    const t = Object.assign({ cls: [], sec: [], bus: "", route: "", gender: "" }, to);
    if (t.staff) return 0;
    let n = 0;
    CLS.forEach((c) => {
      if (t.cls.length && !t.cls.includes(c)) return;
      S.SECTIONS[c].forEach((s) => {
        if (t.sec.length && !t.sec.includes(s)) return;
        const x = S.section(c, s);
        if (!t.bus && !t.gender) { n += x.students.length; return; }
        x.students.forEach((st) => { if (matches(t, c, s, S.busOf(x, st), S.genderOf(st))) n++; });
      });
    });
    return n;
  };
  S.audienceText = (n) => {
    const t = S.toOf(n);
    if (t.staff) return "Staff only";
    const parts = t.cls.length ? [S.classesText(t.cls)] : [];
    if (t.sec.length) parts.push((t.sec.length > 1 ? "Sections " : "Section ") + t.sec.join(", "));
    if (t.bus === "bus") parts.push(t.route ? `Bus ${t.route.replace("Route ", "route ")}` : "Bus students");
    if (t.bus === "own") parts.push("Own transport");
    if (t.gender) parts.push(t.gender === "girls" ? "Girls" : "Boys");
    return parts.length ? parts.join(" · ") : "Everyone";
  };

  // ---------- Put it in the demo state ----------
  const st = S.state;
  if (!st.exams) st.exams = S.examSeed();
  // Older demo data: give its notices an importance and an audience, and add new sample notices.
  if (!st.nv) {
    S.seed().notices.forEach((n) => { const o = st.notices.find((x) => x.id === n.id); if (!o) st.notices.push(n); else { if (!o.level) o.level = n.level; if (!o.to && n.to) o.to = n.to; } });
    st.nv = 1;
  }
  // Every published datesheet that is still to come has its notice to the classes sitting it.
  S.examNotice = (e) => {
    const { from, to } = S.examSpan(e);
    return { id: "ex-" + e.id, title: `${e.name}: datesheet`, text: `${e.name} for ${S.classesText(e.classes)}, ${S.fmt(from, { day: "numeric", month: "long" })} to ${S.fmt(to, { day: "numeric", month: "long" })}. The full datesheet is in the app, under Exams.`, date: from, tag: "Exam", level: "high", to: { cls: [...e.classes] }, web: false, exam: e.id };
  };
  st.exams.forEach((e) => { if (e.published && e.kind !== "ts" && S.examSpan(e).to >= S.todayKey && !st.notices.some((n) => n.id === "ex-" + e.id)) st.notices.push(S.examNotice(e)); });

  // For the assistants: one child's exams in plain words.
  S.examsTxt = (kid) => {
    const g = S.groupOf(kid);
    return S.examsFor(kid).map((e) => {
      const s = S.examStatus(e, g), sp = S.examSpan(e, g);
      if (!e.published) return `- ${e.name}: datesheet not published yet (expected ${S.fmt(sp.from, { month: "long" })})`;
      const ps = e.papers[g].filter((p) => e.kind !== "ts" || p.date >= S.todayKey).slice(0, e.kind === "ts" ? 3 : 99);
      return `- ${e.name} (${s.label}; ${e.time}): ` + ps.map((p) => `${S.fmt(p.date, { weekday: "short", day: "numeric", month: "short" })} ${p.subj}`).join(", ");
    }).join("\n") || "No exams for this class (pre-primary has none).";
  };
})();
