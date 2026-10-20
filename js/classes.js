/* Every class, section, teacher and demo parent.
   VII-B is the original live class. Classes VIII to XII have two sections each
   (XI and XII: A is Science, B is Commerce), a teacher for every subject, and
   five demo parents per class. Everything else is sample data, generated the
   same way on every visit so the numbers never jump around. */
(function () {
  const S = window.SJS;
  const CLS = S.sample.classes;
  const LONG = { Nur: "Nursery", LKG: "LKG", UKG: "UKG" };
  S.classLabel = (c) => LONG[c] || "Class " + c;
  const ciOf = (c) => CLS.indexOf(c);
  S.SECTIONS = Object.fromEntries(CLS.map((c, i) => [c, i < 3 ? ["A", "B"] : i < 10 ? ["A", "B", "C"] : ["A", "B"]]));
  S.STREAM = (c, s) => (c === "XI" || c === "XII" ? (s === "A" ? "Science" : "Commerce") : null);
  S.secName = (key) => key.replace(/^Nur-/, "Nursery-");

  // ---------- Subjects ----------
  const SCI = ["English", "Physics", "Chemistry", "Mathematics", "Biology", "Physical Education"];
  const COM = ["English", "Accountancy", "Business Studies", "Economics", "Applied Mathematics", "Physical Education"];
  const SUBJECTS = (ci, sec) => ci < 3 ? ["English", "Hindi", "Numbers", "Environment", "Art"]
    : ci < 8 ? ["English", "Hindi", "Mathematics", "EVS", "Computer"]
    : ci < 11 ? S.subjects
    : ci < 13 ? ["English", "Hindi", "Mathematics", "Science", "Social Science", "Information Technology"]
    : sec === "A" ? SCI : COM;
  // Periods a week (45: eight a day on weekdays, five on Saturday).
  const WEEK = (ci, sec) => {
    const sub = SUBJECTS(ci, sec);
    if (ci < 8) return null;
    if (ci < 11) return { [sub[0]]: 6, [sub[1]]: 5, [sub[2]]: 7, [sub[3]]: 6, [sub[4]]: 6, [sub[5]]: 3, Games: 3, Library: 2, Art: 2, Music: 2, "Value Education": 1, "Assembly Activity": 1, "Club Activities": 1 };
    if (ci < 13) return { [sub[0]]: 6, [sub[1]]: 5, [sub[2]]: 7, [sub[3]]: 7, [sub[4]]: 7, [sub[5]]: 4, Games: 3, Library: 2, "Value Education": 1, "Assembly Activity": 1, "Club Activities": 2 };
    return { [sub[0]]: 6, [sub[1]]: 7, [sub[2]]: 7, [sub[3]]: 7, [sub[4]]: 7, [sub[5]]: 4, Games: 2, Library: 2, "Value Education": 1, "Assembly Activity": 1, "Club Activities": 1 };
  };
  const CO = { Games: "Mr. Satish Malik", Library: "Mrs. Kavita Bedi", Art: "Ms. Farah Ahmed", Music: "Mr. Paul D'Cruz", "Value Education": "Mrs. Lalitha Krishnan", "Club Activities": "House teachers, by club" };
  const WING = (ci) => (ci < 3 ? 0 : ci < 8 ? 1 : ci < 11 ? 2 : ci < 13 ? 3 : 4);
  S.WING_NAMES = ["Pre-primary", "Primary", "Middle", "Secondary", "Senior secondary"];
  const WING_FEES = [76, 72, 69, 64, 70]; // Q3, share collected (sample)
  // Quarterly fee by class (sample).
  S.FEE_Q = (ci) => [11400, 11400, 11400, 12900, 12900, 12900, 12900, 12900, 14850, 14850, 14850, 16500, 16500, 18600, 18600][ci];

  const rng = S.rng, hash = S.hash;
  const seedOf = (t) => [...t].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 2166136261);
  const FIRST = ["Aanya", "Advait", "Ahaan", "Akshara", "Ananya", "Anika", "Arnav", "Aryan", "Avika", "Bhavya", "Daksh", "Dhruv", "Eshaan", "Gauri", "Inaya", "Ira", "Ishaan", "Jiya", "Kavya", "Khushi", "Kiaan", "Lakshya", "Mahira", "Mira", "Mohit", "Myra", "Neel", "Nitya", "Ojas", "Prisha", "Reyansh", "Riya", "Ruhi", "Samar", "Sanya", "Shlok", "Siya", "Tara", "Tejas", "Vanya", "Ved", "Yuvraj", "Zara", "Aisha", "Elena", "Joel", "Ryan", "Anna", "Mehul", "Tanya", "Rehan", "Sneha", "Kabir", "Diya", "Parth", "Navya", "Arjun", "Saanvi"];
  const LAST = ["Agarwal", "Ahuja", "Arora", "Bhatia", "Chawla", "Dagar", "D'Souza", "Garg", "George", "Gupta", "Jain", "Joseph", "Kapoor", "Khan", "Kumar", "Malik", "Mathew", "Mehta", "Nagpal", "Nair", "Pillai", "Rana", "Rawat", "Saini", "Sharma", "Singh", "Sood", "Thomas", "Tyagi", "Verma", "Yadav"];
  const TF = ["Priya", "Shalini", "Meenu", "Ritu", "Deepa", "Anjali", "Grace", "Pooja", "Sunanda", "Kiran", "Nisha", "Rekha", "Sarita", "Lata", "Mary", "Seema", "Kavita", "Neelam", "Jyoti", "Asha", "Shweta", "Monika", "Anita", "Rachna"];
  const TM = ["Anil", "Sanjay", "Rakesh", "Vivek", "Ajay", "Manoj", "Paul", "Deepak", "Arun", "Suresh"];
  const TL = ["Bhalla", "Chopra", "Dutta", "Fernandes", "Grover", "Iyer", "Kohli", "Luthra", "Menon", "Narang", "Oberoi", "Prasad", "Raina", "Sehgal", "Talwar", "Vohra", "Wadhwa", "Bakshi", "Kaul", "Sethi", "Anand", "Bedi", "Datta", "Gill"];
  const PF = ["Vikas", "Amit", "Rajesh", "Sunil", "Manish", "Gaurav", "Pankaj", "Harish", "Vinod", "Naveen", "Sandeep", "Rohit", "Ashok", "Tarun", "Lalit"];
  const PM = ["Sunita", "Rashmi", "Preeti", "Kavita", "Meena", "Anju", "Sonia", "Ritika", "Neetu", "Divya"];
  // A teacher's name from a number: different numbers give different people.
  const teacher = (n) => n % 5 === 4 ? `Mr. ${TM[(n * 3) % TM.length]} ${LAST[(n * 11) % LAST.length]}` : `${n % 2 ? "Mrs." : "Ms."} ${TF[(n * 7) % TF.length]} ${LAST[(n * 11) % LAST.length]}`;
  const initials = (name) => name.replace(/^(Mr|Mrs|Ms)\.\s*/, "").split(" ").map((p) => p[0]).join("").slice(0, 2);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const r1 = (v) => Math.round(v * 10) / 10;
  const cl = (v) => Math.round(Math.min(98, Math.max(33, v)));

  // ---------- Teachers of Classes VIII to XII ----------
  // One teacher per subject per class; in XI and XII, English and Physical
  // Education are shared by the Science and Commerce sections.
  const GRADES = ["VIII", "IX", "X", "XI", "XII"];
  const CLASS_TEACHER = { "VIII-A": "English", "VIII-B": "Science", "IX-A": "Mathematics", "IX-B": "Hindi", "X-A": "Science", "X-B": "Social Science", "XI-A": "Physics", "XI-B": "Accountancy", "XII-A": "Chemistry", "XII-B": "Economics" };
  const used = new Set(["Ms. Neha Mathew", ...Object.values(S.ttTeachers), ...Object.values(CO)]);
  let tn = 0, idn = 501;
  const freshName = (k) => {
    for (;;) {
      const n = tn++, male = n % 4 === 3;
      const name = male ? `Mr. ${TM[(n * 7 + k) % TM.length]} ${TL[(n * 5 + 3) % TL.length]}` : `${n % 3 ? "Mrs." : "Ms."} ${TF[(n * 5 + k) % TF.length]} ${TL[(n * 7 + 1) % TL.length]}`;
      if (!used.has(name)) { used.add(name); return name; }
    }
  };
  S.TEACHERS = [];
  const NEHA = Object.assign(S.STAFF["SJS-T-0412"], { id: "SJS-T-0412", subject: "Mathematics", sections: ["VII-B", "VIII-A", "VIII-B"], classOf: "VII-B" });
  S.TEACHERS.push(NEHA);
  const ownerOf = {}; // "VIII-A|English" → teacher
  GRADES.forEach((g, gi) => {
    const subs = [];
    S.SECTIONS[g].forEach((s) => SUBJECTS(ciOf(g), s).forEach((x) => { if (!subs.includes(x)) subs.push(x); }));
    subs.forEach((x, k) => {
      const secs = S.SECTIONS[g].filter((s) => SUBJECTS(ciOf(g), s).includes(x)).map((s) => `${g}-${s}`);
      let t;
      if (g === "VIII" && x === "Mathematics") { t = NEHA; }
      else {
        const name = freshName(gi * 3 + k), id = "SJS-T-0" + idn++;
        t = { id, role: "teacher", name, first: name.split(" ")[1], initials: initials(name), subject: x, sections: secs, classOf: null, tone: ["green", "", "royal", "gold"][k % 4] };
        S.TEACHERS.push(t); S.STAFF[id] = t;
      }
      secs.forEach((key) => { ownerOf[key + "|" + x] = t; if (CLASS_TEACHER[key] === x && t !== NEHA) t.classOf = key; });
    });
  });
  S.TEACHERS.forEach((t) => {
    if (t === NEHA) return;
    t.title = `${t.subject} · ${t.sections.join(", ")}` + (t.classOf ? ` · class teacher ${t.classOf}` : "");
  });

  // ---------- Timetables ----------
  // Greedy fill, day by day: no subject more than twice a day, never twice in a
  // row, and never at a time its teacher is busy in another section.
  const TT = {};
  const busy = {}; // "Teacher name|day|period" → section key
  const fillTT = (key, counts, who) => {
    const r = rng(seedOf(key + "tt")), left = Object.assign({}, counts), tt = {};
    const isBusy = (x, d, p) => { const t = who(x); return !!(t && busy[`${t}|${d}|${p}`]); };
    for (let d = 1; d <= 6; d++) {
      const n = d === 6 ? 5 : 8, day = [];
      for (let p = 0; p < n; p++) {
        if (d === 6 && p === 4 && left["Club Activities"]) { day.push("Club Activities"); left["Club Activities"]--; continue; }
        let best = null, bs = -Infinity;
        Object.keys(left).forEach((k) => {
          if (!left[k] || k === "Club Activities") return;
          const inDay = day.filter((x) => x === k).length;
          const sc = left[k] * 10 + r() * 8 - (inDay >= 2 ? 200 : inDay ? 30 : 0) - (day[p - 1] === k ? 80 : 0) - (d > 1 && tt[d - 1][p] === k ? 45 : 0) - (d > 2 && tt[d - 2][p] === k ? 20 : 0) - (isBusy(k, d, p) ? 1000 : 0);
          if (sc > bs) { bs = sc; best = k; }
        });
        if (!best) best = Object.keys(left).find((k) => left[k]) || "Library";
        left[best]--; day.push(best);
      }
      tt[d] = day;
    }
    // Repair: where a teacher would be in two rooms at once, swap with a free period.
    for (let d = 1; d <= 6; d++) tt[d].forEach((x, p) => {
      if (!isBusy(x, d, p)) return;
      for (let d2 = 1; d2 <= 6; d2++) for (let p2 = 0; p2 < tt[d2].length; p2++) {
        const y = tt[d2][p2];
        if (y === x || y === "Club Activities" || isBusy(x, d2, p2) || isBusy(y, d, p)) continue;
        tt[d2][p2] = x; tt[d][p] = y; return;
      }
    });
    for (let d = 1; d <= 6; d++) tt[d].forEach((x, p) => { const t = who(x); if (t) busy[`${t}|${d}|${p}`] = key; });
    return tt;
  };
  // VII-B's timetable is fixed; mark its Maths periods as Neha's.
  Object.entries(S.timetable).forEach(([d, day]) => day.forEach((x, p) => { if (x === "Mathematics") busy[`Ms. Neha Mathew|${d}|${p}`] = "VII-B"; }));
  S.timetableOf = (key) => {
    if (key === "VII-B") return S.VIIB ? S.VIIB.timetable : S.timetable;
    if (TT[key]) return TT[key];
    const [c, s] = key.split("-"), ci = ciOf(c), w = WEEK(ci, s);
    if (!w) return (TT[key] = S.timetable); // younger classes: VII-B's pattern stands in
    return (TT[key] = fillTT(key, w, (x) => (ownerOf[key + "|" + x] || {}).name));
  };
  // Build VIII to XII in order so later sections avoid earlier teachers' periods.
  GRADES.forEach((g) => S.SECTIONS[g].forEach((s) => S.timetableOf(`${g}-${s}`)));

  // ---------- Sections ----------
  const NOT_MARKED = { "II-C": 1, "VI-A": 1, "XI-B": 1 };
  const CLASS_TODAY = [91, 89, 94, 95, 96, 93, 95, 94, 92, 93, 94, 88, 95, 92, 90]; // sample, by class
  const dayNum = (k) => Math.round(new Date(k + "T00:00").getTime() / 864e5);
  const whyOf = (st, subjects, att) => {
    const w = [], C = S.EX.cur, P = S.EX.prev;
    if (att < 85 && S.schoolDays.length >= 20) w.push(`attendance ${att}%`);
    if (P) subjects.forEach((x) => { const d = st[P][x] - st[C][x]; if (d >= 15) w.push(`${x} fell ${d} points`); });
    const low = subjects.filter((x) => st[C][x] < 50);
    if (low.length) w.push(`below 50% in ${low.join(", ")}`);
    return w;
  };

  const cache = {};
  function build(c, s) {
    const ci = ciOf(c), si = S.SECTIONS[c].indexOf(s), key = `${c}-${s}`, seed = seedOf(key), r = rng(seed);
    const subjects = SUBJECTS(ci, s), n = ci < 3 ? 26 + Math.floor(r() * 6) : 34 + Math.floor(r() * 8);
    const students = [], names = new Set();
    for (let i = 0; i < n; i++) {
      const base = (ci < 3 ? 72 : 61) + r() * (ci < 3 ? 24 : 32);
      const ly = {}, ut1 = {}, hy = {}, fin = {};
      subjects.forEach((x) => {
        ly[x] = cl(base + (r() - 0.5) * 14);
        ut1[x] = cl(ly[x] + (r() - 0.5) * 10);
        hy[x] = cl(ut1[x] + (r() - 0.5) * 10 - (r() < 0.012 ? 18 : 0));
        fin[x] = Math.round(Math.min(98, Math.max(24, hy[x] + (r() - 0.4) * 8 - (hy[x] < 52 && r() < 0.55 ? 16 : 0))));
      });
      const absentRate = r() < 0.05 ? 0.12 + r() * 0.12 : 0.008 + r() * 0.05;
      let name; do { name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; } while (names.has(name)); names.add(name);
      students.push({ name, ly, ut1, hy, fin, absentRate });
    }
    students.sort((a, b) => a.name.localeCompare(b.name)).forEach((st, i) => { st.roll = i + 1; st.first = st.name.split(" ")[0]; st.initials = st.name.split(" ").map((p) => p[0]).join(""); });
    // Attendance, every school day so far.
    const history = {};
    S.schoolDays.forEach((k) => { const day = {}, dn = dayNum(k); students.forEach((st) => { const x = hash(seed + st.roll, dn); if (x < st.absentRate) day[st.roll] = x < st.absentRate * 0.25 ? "L" : "A"; }); history[k] = day; });
    const subjTeachers = {};
    subjects.forEach((x, k) => (subjTeachers[x] = (ownerOf[key + "|" + x] || {}).name || teacher(60 + ci * 7 + k)));
    const ct = Object.values(ownerOf).find((t) => t.classOf === key);
    // Every class teacher also teaches the class one subject: where no subject teacher holds the class, they take one of its main subjects.
    const ctName = ct ? ct.name : key === "III-A" ? "Mrs. Priya Nair" : teacher(ci * 3 + si + 3);
    if (!Object.values(subjTeachers).includes(ctName)) subjTeachers[subjects[seedOf(key + "ct") % Math.min(4, subjects.length)]] = ctName;
    return {
      key, cls: c, sec: s, ci, label: S.secName(key), stream: S.STREAM(c, s), live: false, subjects, students, history, subjTeachers,
      teacher: ctName, teacherId: ct ? ct.id : null,
      fees: Math.max(55, Math.min(90, WING_FEES[WING(ci)] + ((seedOf(key + "f") % 9) - 4))), wing: S.WING_NAMES[WING(ci)],
      target: key === "IX-B" ? 86 : key === "IX-A" ? 87 : Math.max(88, Math.min(99, CLASS_TODAY[ci] + ((seed % 5) - 2)))
    };
  }
  // VII-B, straight from the demo (kept aside before any page moves the focus).
  S.VIIB = { students: S.students, history: S.history, subjects: S.subjects, timetable: S.timetable, ttTeachers: S.ttTeachers };
  function viib() {
    const x = cache["VII-B"] || (cache["VII-B"] = {
      key: "VII-B", cls: "VII", sec: "B", ci: ciOf("VII"), label: "VII-B", stream: null, live: true, subjects: S.VIIB.subjects, students: S.VIIB.students, history: S.VIIB.history,
      subjTeachers: S.VIIB.ttTeachers, teacher: "Ms. Neha Mathew", teacherId: "SJS-T-0412", fees: 69, wing: "Middle", target: null
    });
    return x;
  }
  S.section = (c, s) => {
    if (c === "VII" && s === "B") return viib();
    const k = `${c}-${s}`; return cache[k] || (cache[k] = build(c, s));
  };
  S.sectionByKey = (key) => { const i = key.lastIndexOf("-"); return S.section(key.slice(0, i), key.slice(i + 1)); };
  S.allSections = () => CLS.flatMap((c) => S.SECTIONS[c].map((s) => S.section(c, s)));

  // Today's register for a section: the live one if the class teacher has marked
  // it in the demo, otherwise a sample marked at the start of the day.
  const liveRec = (key) => { const st = key === "VII-B" ? S.state : S.state.secs[key]; return st && st.attendance && st.attendance[S.todayKey]; };
  S.sampleToday = (x) => {
    if (x.live || NOT_MARKED[x.key]) return null;
    const n = x.students.length, k = n - Math.round((x.target / 100) * n), dn = dayNum(S.todayKey);
    const order = [...x.students].sort((a, b) => hash(seedOf(x.key) + a.roll, dn) - a.absentRate * 3 - (hash(seedOf(x.key) + b.roll, dn) - b.absentRate * 3));
    const marks = {}; order.slice(0, k).forEach((st, i) => (marks[st.roll] = i === 1 ? "L" : "A"));
    return { taken: true, at: `8:${String(5 + (seedOf(x.key) % 20)).padStart(2, "0")} AM`, marks };
  };
  S.todayRec = (x) => liveRec(x.key) || (S.state.secs[x.key] ? null : S.sampleToday(x));
  S.todayPct = (x) => { const rec = S.todayRec(x); return rec ? Math.round(((x.students.length - Object.keys(rec.marks).length) / x.students.length) * 100) : null; };
  // A student's attendance this session.
  S.attOf = (x, roll) => {
    let days = 0, present = 0;
    Object.keys(x.history).forEach((k) => { days++; if (!x.history[k][roll]) present++; });
    const t = S.todayRec(x); if (t) { days++; if (!t.marks[roll]) present++; }
    return days ? r1((present / days) * 100) : 100;
  };
  // The last six school days, oldest first.
  S.lastDays = () => { const days = [S.todayKey]; let d = new Date(S.today); while (days.length < 6) { d = S.addDays(d, -1); if (d < new Date(S.SESSION_START + "T00:00")) break; if (S.isSchoolDay(d)) days.unshift(S.iso(d)); } return days; };
  S.weekOf = (x) => S.lastDays().map((k) => {
    if (k === S.todayKey) return S.todayPct(x);
    const h = x.history[k] || {}; return Math.round(((x.students.length - Object.keys(h).length) / x.students.length) * 100);
  });

  // Averages a class view needs, for the latest exam of the stage shown.
  const statMemo = {};
  S.secStats = (x) => {
    const mk = x.key + "|" + (S._ver || 0);
    return statMemo[mk] || (statMemo[mk] = secStats(x));
  };
  const secStats = (x) => {
    const C = S.EX.cur, P = S.EX.prev;
    const studs = x.students.map((s) => {
      const att = S.attOf(x, s.roll), a = Math.round(avg(x.subjects.map((k) => s[C][k])));
      return { s, att, avg: a, why: whyOf(s, x.subjects, att) };
    });
    const subj = Object.fromEntries(x.subjects.map((k) => [k, { cur: Math.round(avg(x.students.map((s) => s[C][k]))), prev: P ? Math.round(avg(x.students.map((s) => s[P][k]))) : null }]));
    return {
      studs, subj, n: x.students.length,
      att: r1(avg(studs.map((v) => v.att))), cur: Math.round(avg(studs.map((v) => v.avg))),
      prev: P ? Math.round(avg(x.students.map((s) => avg(x.subjects.map((k) => s[P][k]))))) : null,
      support: studs.filter((v) => v.why.length).length,
      pass: Math.round((studs.filter((v) => x.subjects.every((k) => v.s[C][k] >= 33)).length / studs.length) * 1000) / 10
    };
  };
  // Whole-school attendance today, from every section that has marked.
  S.schoolToday = () => {
    let n = 0, p = 0;
    S.allSections().forEach((x) => { const rec = S.todayRec(x); if (!rec) return; n += x.students.length; p += x.students.length - Object.keys(rec.marks).length; });
    return n ? r1((p / n) * 100) : null;
  };
  S.sample.attendance = CLS.map((c) => { const v = S.SECTIONS[c].map((s) => S.section(c, s)).filter((x) => !x.live).map((x) => S.todayPct(x)).filter((v) => v !== null); return v.length ? Math.round(avg(v)) : null; });

  // School-wide fee collection for the quarter in progress (sample).
  S.FEE_NOW = {
    start: { q: "Q1", pct: 54, got: "₹1.48 Cr", of: "₹2.74 Cr", online: 90, counter: 58, left: "₹1.26 Cr", due: "2026-04-10", families: 1140, upi: 61 },
    mid: { q: "Q3", pct: 70, got: "₹1.92 Cr", of: "₹2.74 Cr", online: 111, counter: 81, left: "₹0.82 Cr", due: (S.state.fees[2] || {}).due || "2026-10-31", families: 612, upi: 58 },
    end: { q: "Q4", pct: 97, got: "₹2.66 Cr", of: "₹2.74 Cr", online: 168, counter: 98, left: "₹0.08 Cr", due: "2027-01-10", families: 58, upi: 63 }
  }[S.PHASE];
  // Today's attendance across the school, for briefs and assistants.
  S.attSummary = () => {
    const all = S.allSections(), marked = all.filter((x) => S.todayPct(x) !== null), waiting = all.filter((x) => S.todayPct(x) === null);
    const low = marked.length ? marked.reduce((a, b) => (S.todayPct(b) < S.todayPct(a) ? b : a)) : null;
    return { pct: S.schoolToday(), low, lowPct: low ? S.todayPct(low) : null, waiting };
  };

  // ---------- Live records for a section, made when first opened ----------
  const HW = {
    English: "Letter to the editor: plastic in our markets", Hindi: "Chapter 4: question and answer practice", Mathematics: "Linear equations: Exercise 4.2",
    Science: "Lab record: the simple pendulum", "Social Science": "Map work: the rivers of India", Computer: "Spreadsheet practical: a marks sheet with formulas",
    "Information Technology": "Spreadsheet practical: a marks sheet with formulas", Physics: "Numericals on the laws of motion, set 3", Chemistry: "Mole concept worksheet",
    Biology: "Diagram practice: the plant cell", Accountancy: "Journal entries, questions 1 to 12", "Business Studies": "Case study: principles of management",
    Economics: "Project: a demand schedule from your market", "Applied Mathematics": "Sets and relations, practice sheet", "Physical Education": "Fitness log for two weeks"
  };
  S.seedSec = (key) => {
    const x = S.sectionByKey(key), r = rng(seedOf(key + "hw")), subs = [...x.subjects].sort(() => r() - 0.5).slice(0, 3);
    const title = (k) => S.PHASE === "start" ? (k === subs[2] ? "Cover and label every notebook" : `${k}: first-week warm-up sheet`) : S.PHASE === "end" ? `${k}: holiday revision sheet` : HW[k] || `${k}: chapter exercises`;
    const detail = (k) => S.PHASE === "start" ? "A short, unmarked sheet so the teacher knows where the class stands." : S.PHASE === "end" ? "To keep the basics fresh over the break. Bring it on the first day of the new session." : "Do it in the subject notebook and show all working.";
    const rec = S.sampleToday(x);
    return {
      attendance: rec ? { [S.todayKey]: rec } : {},
      homework: subs.map((k, i) => ({ id: `${key}-h${i}`, subj: k, title: title(k), detail: detail(k), due: S.iso(S.nextSchoolDay(S.today, [1, 3, 2][i])), by: x.subjTeachers[k], done: i === 2, cls: key })),
      leaves: [], entries: {}
    };
  };
  // At the end of the session the finals are already entered and published.
  S.seedEntry = (key, subj) => {
    if (S.PHASE !== "end") return { marks: {}, published: false };
    const x = S.sectionByKey(key), marks = {}; x.students.forEach((s) => (marks[s.roll] = s.fin[subj]));
    return { marks, published: true };
  };

  // ---------- Demo parents: five in every class from VIII to XII ----------
  // Three children from section A and two from B: the top of the class, someone
  // the teachers are watching, and three in between.
  S.PARENTS = [{ key: "VII-B-1", sec: "VII-B", roll: 1, parent: "Rohit Sharma", relation: "Father", phone: "98xxxxxx10", bus: "Route 14" }];
  GRADES.forEach((g, gi) => S.SECTIONS[g].forEach((s, si) => {
    // Picked on the half-yearly, which every stage's data has, so the same families are
    // in the demo whatever the stage: the top student, the one who most needs help, then others.
    const x = S.section(g, s), hyAvg = (st) => x.subjects.reduce((a, k) => a + st.hy[k], 0) / x.subjects.length;
    const sorted = [...x.students].sort((a, b) => hyAvg(b) - hyAvg(a));
    const picks = [];
    const add = (v) => { if (v && !picks.includes(v)) picks.push(v); };
    add(sorted[0]); add(sorted[sorted.length - 1]);
    const pr = rng(seedOf(x.key + "par"));
    while (picks.length < (si === 0 ? 3 : 2)) add(x.students[Math.floor(pr() * x.students.length)]);
    picks.slice(0, si === 0 ? 3 : 2).forEach((st, k) => {
      const v = { s: st }, mum = (gi + si + k) % 3 === 1, last = v.s.name.split(" ").slice(1).join(" ");
      const pn = `${mum ? PM[(gi * 5 + si * 3 + k) % PM.length] : PF[(gi * 5 + si * 3 + k) % PF.length]} ${last}`;
      S.PARENTS.push({ key: `${x.key}-${v.s.roll}`, sec: x.key, roll: v.s.roll, parent: pn, relation: mum ? "Mother" : "Father", phone: `9${8 - ((gi + k) % 3)}xxxxxx${String(10 + ((gi * 17 + si * 7 + k * 5) % 89)).padStart(2, "0")}`, bus: (gi + k) % 4 === 3 ? "Own transport" : `Route ${3 + ((gi * 5 + si * 2 + k * 3) % 19)}` });
    });
  }));
  S.kid = (key) => {
    const p = S.PARENTS.find((x) => x.key === key) || S.PARENTS[0], x = S.sectionByKey(p.sec), s = x.students.find((v) => v.roll === p.roll);
    return Object.assign(Object.create(s), s, { key: p.key, sec: x, cls: x.cls, label: x.label, parent: p.parent, parentFirst: p.parent.split(" ")[0], relation: p.relation, phone: p.phone, bus: p.bus });
  };

  // Grades on the CBSE eight-point scale.
  S.grade = (v) => (v >= 91 ? "A1" : v >= 81 ? "A2" : v >= 71 ? "B1" : v >= 61 ? "B2" : v >= 51 ? "C1" : v >= 41 ? "C2" : v >= 33 ? "D" : "E");

  // ---------- Pointing a page at one section, or one child ----------
  S.useSection = (key) => {
    const x = S.sectionByKey(key);
    S.focusKey = key; S.focus = x;
    S.students = x.students; S.history = x.history; S.subjects = x.subjects;
    S.timetable = S.timetableOf(key);
    S.ttTeachers = Object.assign({}, CO, { "Assembly Activity": x.teacher }, x.key === "VII-B" ? S.VIIB.ttTeachers : x.subjTeachers);
    S.teacher = { name: x.teacher, initials: initials(x.teacher), id: x.teacherId };
    return x;
  };
  S.useKid = (key) => {
    const k = S.kid(key);
    S.useSection(k.sec.key);
    S.me = k; S.kidKey = k.key;
    return k;
  };
  // The child's fees and the thread with the class teacher.
  S.kidFees = (key) => {
    if (key === "VII-B-1") return S.state.fees;
    if (S.state.kidFees[key]) return S.state.kidFees[key];
    const k = S.kid(key), amt = S.FEE_Q(k.sec.ci), base = S.seed().fees;
    return (S.state.kidFees[key] = base.map((f) => Object.assign({}, f, { amount: amt })));
  };
  S.thread = (key) => {
    if (key === "VII-B-1") return S.state.messages;
    if (S.state.threads[key]) return S.state.threads[key];
    const k = S.kid(key), t = k.sec.teacher.replace(/^(Mr|Mrs|Ms)\.\s*/, "");
    const first = S.PHASE === "start" ? `Welcome to ${k.label}! I'm ${t}, ${k.first}'s class teacher this year. The timetable, book list and first fee date are on the app.`
      : S.PHASE === "end" ? `Congratulations! ${k.first} has finished the year well. The report card is given out at the PTM on Saturday, 27 March.`
      : `Good afternoon! ${k.first}'s half-yearly answer sheets will be shown at the PTM on Saturday, 31 October. Do come.`;
    return (S.state.threads[key] = [{ from: "teacher", text: first, at: S.PHASE === "start" ? "Wed 1 Apr, 2:30 PM" : "Yesterday, 3:20 PM" }]);
  };
})();
