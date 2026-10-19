/* Every class and section, for the principal's and the office's class view.
   VII-B is live from the demo. Every other section is sample data, generated
   the same way on every visit so the numbers never jump around. */
(function () {
  const S = window.SJS;
  const CLS = S.sample.classes;
  const LONG = { Nur: "Nursery", LKG: "LKG", UKG: "UKG" };
  S.classLabel = (c) => LONG[c] || "Class " + c;
  S.SECTIONS = Object.fromEntries(CLS.map((c, i) => [c, i < 3 ? ["A", "B"] : ["A", "B", "C"]]));

  // Subjects by stage.
  const SUBJECTS = (ci) => ci < 3 ? ["English", "Hindi", "Numbers", "Environment", "Art"]
    : ci < 8 ? ["English", "Hindi", "Mathematics", "EVS", "Computer"]
    : ci < 11 ? S.subjects
    : ci < 13 ? ["English", "Hindi", "Mathematics", "Science", "Social Science", "IT"]
    : ["English", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"];
  const WING = (ci) => (ci < 3 ? 0 : ci < 8 ? 1 : ci < 11 ? 2 : ci < 13 ? 3 : 4);
  S.WING_NAMES = ["Pre-primary", "Primary", "Middle", "Secondary", "Senior secondary"];
  const WING_FEES = [76, 72, 69, 64, 70]; // Q3, share collected (sample)

  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const seedOf = (t) => [...t].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 2166136261);
  const FIRST = ["Aanya", "Advait", "Ahaan", "Akshara", "Ananya", "Anika", "Arnav", "Aryan", "Avika", "Bhavya", "Daksh", "Dhruv", "Eshaan", "Gauri", "Inaya", "Ira", "Ishaan", "Jiya", "Kavya", "Khushi", "Kiaan", "Lakshya", "Mahira", "Mira", "Mohit", "Myra", "Neel", "Nitya", "Ojas", "Prisha", "Reyansh", "Riya", "Ruhi", "Samar", "Sanya", "Shlok", "Siya", "Tara", "Tejas", "Vanya", "Ved", "Yuvraj", "Zara", "Aisha", "Elena", "Joel", "Ryan", "Anna", "Mehul", "Tanya", "Rehan", "Sneha"];
  const LAST = ["Agarwal", "Ahuja", "Arora", "Bhatia", "Chawla", "Dagar", "D'Souza", "Garg", "George", "Gupta", "Jain", "Joseph", "Kapoor", "Khan", "Kumar", "Malik", "Mathew", "Mehta", "Nagpal", "Nair", "Pillai", "Rana", "Rawat", "Saini", "Sharma", "Singh", "Sood", "Thomas", "Tyagi", "Verma", "Yadav"];
  const TF = ["Priya", "Shalini", "Meenu", "Ritu", "Deepa", "Anjali", "Grace", "Pooja", "Sunanda", "Kiran", "Nisha", "Rekha", "Sarita", "Lata", "Mary", "Seema", "Kavita", "Neelam", "Jyoti", "Asha"];
  const TM = ["Anil", "Sanjay", "Rakesh", "Vivek", "Ajay", "Manoj", "Paul", "Deepak"];
  // A teacher's name from a number: different numbers give different people.
  const teacher = (n) => n % 5 === 4 ? `Mr. ${TM[(n * 3) % TM.length]} ${LAST[(n * 11) % LAST.length]}` : `${n % 2 ? "Mrs." : "Ms."} ${TF[(n * 7) % TF.length]} ${LAST[(n * 11) % LAST.length]}`;

  // Sections that haven't marked today (sample), and the day's lowest, IX-C.
  const NOT_MARKED = { "II-C": 1, "VI-A": 1, "XI-B": 1 };
  const why = (st, subjects) => {
    const w = [];
    if (st.att < 85) w.push(`attendance ${st.att}%`);
    subjects.forEach((x) => { const d = st.ut1[x] - st.hy[x]; if (d >= 15) w.push(`${x} fell ${d} points`); });
    const low = subjects.filter((x) => st.hy[x] < 50);
    if (low.length) w.push(`below 50% in ${low.join(", ")}`);
    return w;
  };
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const r1 = (v) => Math.round(v * 10) / 10;

  // The last six school days, oldest first.
  S.lastDays = () => { const days = [S.todayKey]; let d = new Date(S.today); while (days.length < 6) { d = S.addDays(d, -1); if (S.isSchoolDay(d)) days.unshift(S.iso(d)); } return days; };

  const cache = {};
  function build(c, s) {
    const ci = CLS.indexOf(c), si = S.SECTIONS[c].indexOf(s), key = `${c}-${s}`, r = rng(seedOf(key));
    const subjects = SUBJECTS(ci), n = ci < 3 ? 26 + Math.floor(r() * 6) : 34 + Math.floor(r() * 8);
    const students = [];
    for (let i = 0; i < n; i++) {
      const base = (ci < 3 ? 72 : 61) + r() * (ci < 3 ? 24 : 32);
      const ut1 = {}, hy = {};
      subjects.forEach((x) => { ut1[x] = Math.round(Math.min(98, Math.max(40, base + (r() - 0.5) * 14))); hy[x] = Math.round(Math.min(98, Math.max(36, ut1[x] + (r() - 0.5) * 10 - (r() < 0.012 ? 18 : 0)))); });
      const away = r() < 0.05 ? 12 + r() * 12 : r() * 7;
      const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
      students.push({ name, ut1, hy, att: r1(100 - away) });
    }
    students.sort((a, b) => a.name.localeCompare(b.name)).forEach((st, i) => { st.roll = i + 1; st.initials = st.name.split(" ").map((p) => p[0]).join(""); st.avg = Math.round(avg(subjects.map((x) => st.hy[x]))); st.why = why(st, subjects); });
    let today = Math.max(87, Math.min(99, S.sample.attendance[ci] + ((seedOf(key) % 5) - 2)));
    if (c === "VII") today = 93 + si; // VII-A and VII-C; VII-B is live
    if (key === "IX-A") today = 87; if (key === "IX-B") today = 88; if (key === "IX-C") today = 86;
    if (NOT_MARKED[key]) today = null;
    const week = S.lastDays().map((k, i) => (i === 5 ? today : Math.max(82, Math.min(99, Math.round((today || S.sample.attendance[ci] || 93) + (r() - 0.5) * 7)))));
    const tIdx = ci * 3 + si + 3;
    const subjTeachers = Object.fromEntries(subjects.map((x, k) => [x, c === "VII" ? S.ttTeachers[x] : teacher(60 + ci * 7 + k)]));
    return {
      key, cls: c, sec: s, ci, live: false, subjects, students, subjTeachers,
      teacher: key === "III-A" ? "Mrs. Priya Nair" : teacher(tIdx),
      today, week, fees: Math.max(55, Math.min(90, WING_FEES[WING(ci)] + ((seedOf(key + "f") % 9) - 4))),
      wing: S.WING_NAMES[WING(ci)], homework: 3 + (seedOf(key + "h") % 5), leaves: seedOf(key + "l") % 3
    };
  }
  // VII-B, straight from the demo: the register, marks, homework and leave.
  function liveVIIB() {
    const rec = S.state.attendance[S.todayKey];
    const flagged = Object.fromEntries(S.atRisk().map((x) => [x.s.roll, x.why]));
    const students = S.students.map((s) => ({ roll: s.roll, name: s.name, initials: s.initials, ut1: s.ut1, hy: s.hy, att: S.attendancePct(s.roll), avg: S.avgOf(s.hy), why: flagged[s.roll] || [] }));
    const week = S.lastDays().map((k) => { if (k === S.todayKey) return rec ? Math.round(((32 - Object.keys(rec.marks).length) / 32) * 100) : null; const h = S.history[k] || {}; return Math.round(((32 - Object.keys(h).length) / 32) * 100); });
    const since = S.iso(S.addDays(S.today, -7));
    return {
      key: "VII-B", cls: "VII", sec: "B", ci: CLS.indexOf("VII"), live: true, subjects: S.subjects, students, subjTeachers: S.ttTeachers,
      teacher: "Ms. Neha Mathew", today: week[5], week, fees: 69, wing: "Middle",
      homework: S.state.homework.filter((h) => !h.cls || h.cls === "VII-B").length, leaves: S.state.leaves.filter((l) => l.status === "Waiting").length, since
    };
  }
  S.section = (c, s) => {
    if (c === "VII" && s === "B") return liveVIIB();
    const k = `${c}-${s}`; return cache[k] || (cache[k] = build(c, s));
  };
  S.allSections = () => CLS.flatMap((c) => S.SECTIONS[c].map((s) => S.section(c, s)));

  // Averages a class view needs.
  S.secStats = (x) => {
    const att = r1(avg(x.students.map((s) => s.att)));
    const hy = Math.round(avg(x.students.map((s) => s.avg)));
    const ut1 = Math.round(avg(x.students.map((s) => avg(x.subjects.map((k) => s.ut1[k])))));
    const subj = Object.fromEntries(x.subjects.map((k) => [k, { hy: Math.round(avg(x.students.map((s) => s.hy[k]))), ut1: Math.round(avg(x.students.map((s) => s.ut1[k]))) }]));
    return { att, hy, ut1, subj, support: x.students.filter((s) => s.why.length).length, n: x.students.length };
  };
})();
