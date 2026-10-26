/* Demo data + a tiny shared store.
   Everything a teacher, parent or the principal does is saved in
   localStorage under one key, so the three portals see the same school. */
(function () {
  const S = (window.SJS = window.SJS || {});
  const KEY = "sjs-demo-v1";

  // ---- Session stage (demo only) ------------------------------------------
  // The portals can show the school at three points of session 2026–27: the
  // first week of April, the middle of the year, and results day in March.
  // The public website always runs in the middle of the year.
  const PORTAL = /(parent|staff|login|demo)\.html$/.test(location.pathname);
  let phase = "mid";
  try { if (PORTAL) phase = localStorage.getItem("sjs-phase") || "mid"; } catch (e) {}
  if (!["start", "mid", "end"].includes(phase)) phase = "mid";
  S.PHASE = phase;
  S.PHASES = {
    start: { label: "New session", when: "First week of April", short: "April" },
    mid: { label: "Mid-session", when: "October, after the half-yearly", short: "October" },
    end: { label: "End of session", when: "Results day in March", short: "March" }
  };
  S.setPhase = (p) => { try { localStorage.setItem("sjs-phase", p); } catch (e) {} location.reload(); };

  // ---- Dates -------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const HOLIDAYS = {
    "2026-08-15": "Independence Day", "2026-10-02": "Gandhi Jayanti", "2026-10-20": "Dussehra",
    "2026-11-06": "Diwali break", "2026-11-09": "Diwali break", "2026-11-10": "Diwali break",
    "2026-11-24": "Guru Nanak Jayanti", "2026-12-25": "Christmas", "2027-01-26": "Republic Day", "2027-03-22": "Holi"
  };
  const span = (a, b, name) => { for (let d = new Date(a + "T00:00"); iso(d) <= b; d.setDate(d.getDate() + 1)) if (d.getDay()) HOLIDAYS[iso(d)] = name; };
  span("2026-05-16", "2026-06-30", "Summer break");
  span("2027-01-01", "2027-01-09", "Winter break");
  // Monday to Saturday; Saturday is a half day (five periods, home by 11:30).
  const isSchoolDay = (d) => d.getDay() !== 0 && !HOLIDAYS[iso(d)];
  // Demo "today". Mid-session is the real date (kept inside the middle of the
  // year); the other two stages are fixed days. Moved forward to a school day.
  const midToday = new Date(); midToday.setHours(0, 0, 0, 0);
  if (iso(midToday) < "2026-07-15" || iso(midToday) > "2027-02-14") midToday.setTime(new Date(2026, 9, 19).getTime());
  while (!isSchoolDay(midToday)) midToday.setDate(midToday.getDate() + 1);
  const today = phase === "start" ? new Date(2026, 3, 8) : phase === "end" ? new Date(2027, 2, 26) : new Date(midToday);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const nextSchoolDay = (d, n = 1) => { let x = new Date(d); while (n > 0) { x = addDays(x, 1); if (isSchoolDay(x)) n--; } return x; };
  const fmt = (d, o = { day: "numeric", month: "short" }) => new Date(d).toLocaleDateString("en-IN", o);
  const fmtLong = (d) => fmt(d, { weekday: "long", day: "numeric", month: "long" });
  Object.assign(S, { iso, pad, fmt, fmtLong, addDays, nextSchoolDay, isSchoolDay, HOLIDAYS, today, todayKey: iso(today) });
  S.SESSION_START = "2026-04-01";
  // Every school day of the session before today: the days attendance exists for.
  S.schoolDays = [];
  for (let d = new Date(S.SESSION_START + "T00:00"); d < today; d = addDays(d, 1)) if (isSchoolDay(d)) S.schoolDays.push(iso(d));

  // Exams this session, and which ones have happened by the stage shown.
  S.EXAMS = { ly: "Last year's final", ut1: "Unit Test 1", hy: "Half-yearly", fin: "Final exam" };
  S.EX = { start: { list: ["ly"], cur: "ly", prev: null }, mid: { list: ["hy", "ut1"], cur: "hy", prev: "ut1" }, end: { list: ["fin", "hy", "ut1"], cur: "fin", prev: "hy" } }[phase];
  // Classes X and XII sit the CBSE board exam, so their school final is the pre-board.
  S.exLabel = (k, cls) => (k === "fin" && /^(X|XII)$/.test(cls || "") ? "Pre-board" : S.EXAMS[k]);
  S.CALENDAR = [
    ["2026-04-01", "Session begins"], ["2026-04-18", "Meet the class teacher"], ["2026-07-20", "Unit Test 1"], ["2026-09-14", "Half-yearly exams"], ["2026-10-05", "Unit Test 2"],
    ["2026-10-31", "PTM: half-yearly answer sheets"], ["2026-11-23", "Unit Test 3"], ["2026-12-01", "Pre-board 1 (X, XII)"], ["2027-01-11", "Pre-board 2 (X, XII)"], ["2027-02-15", "CBSE board exams (X, XII) begin"], ["2027-02-22", "Final exams"], ["2027-03-26", "Results"], ["2027-03-27", "Report-card PTM"]
  ];
  // What a teacher enters marks for, at each stage.
  S.ENTRY = { start: { name: "Baseline test", max: 20 }, mid: { name: "Unit Test 2", max: 20 }, end: { name: "Final exam", max: 100 } }[phase];

  // ---- Deterministic randomness -----------------------------------------
  function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function hash(a, b) { // 0..1, well mixed for neighbouring inputs
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // ---- School ------------------------------------------------------------
  S.school = {
    name: "St. John's School", place: "Sector 7A, Faridabad", founded: 1965, founder: "Shri T.I. John",
    trust: "Idicula Trust Society (Regd.)", board: "CBSE", campus: "4 acres", motto: "Learn to serve",
    vision: "Vision with action can build the future"
  };

  S.subjects = ["English", "Hindi", "Mathematics", "Science", "Social Science", "Computer"];

  // ---- Class VII-B -------------------------------------------------------
  const names = ["Aarav Sharma", "Aditi Rao", "Arjun Mehta", "Avni Gupta", "Ayaan Siddiqui", "Dev Khanna", "Diya Bansal", "Farhan Qureshi",
    "Gurleen Kaur", "Harshit Chauhan", "Ishita Verma", "Jasmine Thomas", "Kabir Malhotra", "Krish Arora", "Lavanya Iyer", "Manav Joshi",
    "Meher Sethi", "Mehak Grover", "Naina Bhatia", "Nikhil Rawat", "Pari Saxena", "Pranav Nair", "Riya Dsouza", "Rohan Yadav",
    "Saanvi Mittal", "Sahil Dagar", "Sara George", "Shaurya Tanwar", "Tanvi Goyal", "Vihaan Bhardwaj", "Yash Chaudhary", "Zoya Khan"];
  const absentRate = { "Kabir Malhotra": 0.27, "Rohan Yadav": 0.15, "Aarav Sharma": 0.05 };
  const r = rng(1965);
  S.students = names.map((name, i) => {
    const base = 58 + r() * 34;
    const ut1 = {}, hy = {};
    S.subjects.forEach((s) => {
      ut1[s] = Math.round(Math.min(98, Math.max(38, base + (r() - 0.5) * 18)));
      hy[s] = Math.round(Math.min(98, Math.max(35, ut1[s] + (r() - 0.5) * 12)));
    });
    return { roll: i + 1, name, first: name.split(" ")[0], initials: name.split(" ").map((p) => p[0]).join(""), ut1, hy, absentRate: absentRate[name] ?? 0.035 };
  });
  const by = (n) => S.students.find((s) => s.name === n);
  Object.assign(by("Aarav Sharma"), {
    ut1: { English: 82, Hindi: 70, Mathematics: 78, Science: 88, "Social Science": 80, Computer: 92 },
    hy: { English: 85, Hindi: 64, Mathematics: 84, Science: 91, "Social Science": 78, Computer: 94 },
    parent: "Rohit Sharma", phone: "98xxxxxx10", bus: "Route 14"
  });
  by("Ishita Verma").ut1.Mathematics = 81; by("Ishita Verma").hy.Mathematics = 56;
  by("Ishita Verma").ut1.Science = 79; by("Ishita Verma").hy.Science = 63;
  Object.assign(by("Rohan Yadav").ut1, { Mathematics: 52, Science: 55, English: 60 });
  Object.assign(by("Rohan Yadav").hy, { Mathematics: 41, Science: 46, English: 52 });
  // Last year's final and this year's final, for every VII-B student.
  const r2 = rng(2027), cl = (v) => Math.round(Math.min(98, Math.max(35, v)));
  S.students.forEach((s) => { s.ly = {}; s.fin = {}; S.subjects.forEach((x) => { s.ly[x] = cl(s.ut1[x] + (r2() - 0.5) * 12); s.fin[x] = Math.round(Math.min(98, Math.max(24, s.hy[x] + (r2() - 0.4) * 10 - (s.hy[x] < 50 ? 12 : 0)))); }); });
  Object.assign(by("Aarav Sharma"), {
    ly: { English: 80, Hindi: 72, Mathematics: 76, Science: 85, "Social Science": 79, Computer: 90 },
    fin: { English: 87, Hindi: 70, Mathematics: 86, Science: 92, "Social Science": 81, Computer: 95 }
  });
  S.student = (roll) => S.students.find((s) => s.roll === +roll);
  S.me = by("Aarav Sharma"); // the parent demo logs in as Aarav's parent

  // Attendance history: every school day from 1 April up to yesterday.
  S.history = {};
  for (const k of S.schoolDays) {
    const d = new Date(k + "T00:00"), day = {};
    S.students.forEach((s) => {
      const x = hash(s.roll, Math.round(d.getTime() / 864e5));
      if (x < s.absentRate) day[s.roll] = x < s.absentRate * 0.25 ? "L" : "A";
    });
    S.history[k] = day;
  }

  S.hash = hash; S.rng = rng;
  S.classAvg = (exam, subj) => Math.round(S.students.reduce((a, s) => a + s[exam][subj], 0) / S.students.length);
  S.avgOf = (marks) => Math.round(Object.values(marks).reduce((a, b) => a + b, 0) / Object.values(marks).length);

  // Timetable (VII-B)
  S.timetable = {
    1: ["Mathematics", "English", "Science", "Hindi", "Games", "Social Science", "Computer", "Art"],
    2: ["English", "Mathematics", "Hindi", "Science", "Library", "Social Science", "Music", "Mathematics"],
    3: ["Science", "Hindi", "Mathematics", "English", "Computer", "Social Science", "Games", "Value Education"],
    4: ["Hindi", "Science", "English", "Mathematics", "Art", "Social Science", "Mathematics", "Library"],
    5: ["Mathematics", "Social Science", "Science", "English", "Hindi", "Computer", "Assembly Activity", "Games"],
    6: ["English", "Mathematics", "Science", "Hindi", "Club Activities"]
  };
  S.periodTimes = ["8:00", "8:40", "9:20", "10:00", "10:50", "11:30", "12:10", "12:50"];
  // Who teaches what in VII-B (sample names), for the timetable's hover.
  S.ttTeachers = {
    Mathematics: "Ms. Neha Mathew", English: "Mrs. Rekha Menon", Hindi: "Mrs. Sunita Rawat", Science: "Mr. Joseph Varghese",
    "Social Science": "Mr. Vikram Chauhan", Computer: "Mr. Rahul Kapoor", Games: "Mr. Satish Malik", Art: "Ms. Farah Ahmed",
    Library: "Mrs. Kavita Bedi", Music: "Mr. Paul D'Cruz", "Value Education": "Mrs. Lalitha Krishnan", "Assembly Activity": "Ms. Neha Mathew", "Club Activities": "House teachers, by club"
  };

  // Whole-school attendance today (sample); VII is filled in from VII-B's live register.
  S.sample = { classes: ["Nur", "LKG", "UKG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"], attendance: [91, 89, 94, 95, 96, 93, 95, 94, 92, 0, 94, 86, 95, 92, 90] };

  S.teacher = { name: "Ms. Neha Mathew", initials: "NM", role: "Class Teacher · VII-B", subject: "Mathematics" };
  // Staff sign-in: one staff page, and the ID decides what it shows.
  S.STAFF = {
    "SJS-T-0412": { role: "teacher", name: "Ms. Neha Mathew", first: "Neha", initials: "NM", title: "Class teacher · VII-B", tone: "green" },
    "SJS-A-0107": { role: "admin", name: "Mrs. Anita Joseph", first: "Anita", initials: "AJ", title: "School office", tone: "" },
    "SJS-P-0001": { role: "principal", name: "The Principal", first: "", initials: "P", title: "Principal", tone: "" }
  };
  S.ROLE_LABEL = { teacher: "Teacher", admin: "Office admin", principal: "Principal" };
  S.sibling = { name: "Ananya Sharma", initials: "AS", cls: "III-A", teacher: "Mrs. Priya Nair" };

  // ---- Shared, mutable state --------------------------------------------
  // Each stage of the session keeps its own demo records; the website's
  // settings and photos are shared by all three.
  const seed = (p = phase) => {
    const t = p === phase ? today : midToday, nd = (n) => iso(nextSchoolDay(t, n));
    const base = {
      attendance: {}, // { "YYYY-MM-DD": { taken: true, at: "08:42", marks: { roll: "A"|"L" } } }
      leaves: [], entries: {}, secs: {}, threads: {}, kidFees: {}, checks: {}, readNotes: []
    };
    if (p === "start") return Object.assign(base, {
      homework: [
        { id: "h1", subj: "Mathematics", title: "Number system — warm-up sheet", detail: "A one-page recap of Class VI: fractions, decimals and integers. No marks; it helps me plan the first chapter.", due: nd(1), by: "Ms. Neha Mathew", done: false },
        { id: "h2", subj: "English", title: "All about me, in 150 words", detail: "Write a short paragraph about yourself, your hobbies and one goal for this year. Bring it on a single sheet.", due: nd(3), by: "Mrs. Rekha Menon", done: false },
        { id: "h3", subj: "Science", title: "Cover and label every notebook", detail: "Brown cover, name label with class, section and roll number on each notebook.", due: nd(2), by: "Mr. Joseph Varghese", done: true }
      ],
      messages: [
        { from: "teacher", text: "Welcome to VII-B! I'm Neha Mathew, Aarav's class teacher this year. The book list, timetable and the first fee date are on the app. See you at Meet the Teacher on Saturday, 18 April.", at: "Wed 1 Apr, 2:10 PM" },
        { from: "parent", text: "Thank you ma'am. Looking forward to the year.", at: "Wed 1 Apr, 7:30 PM" }
      ],
      notices: [
        { id: "n1", title: "Welcome to session 2026–27", text: "Classes began on Wednesday, 1 April. Every class's timetable and class teacher are on the app.", date: "2026-04-01", tag: "Notice", level: "low" },
        { id: "n2", title: "Q1 fees due", text: "First-quarter fees are due by Friday, 10 April. Pay by UPI from the app; the receipt comes at once.", date: "2026-04-10", tag: "Notice", level: "high" },
        { id: "n3", title: "Bookshop and uniform counter", text: "The school bookshop is open 8:00 AM to 1:00 PM until Saturday, 11 April. Book lists for every class are on the app.", date: "2026-04-11", tag: "Notice", level: "medium" },
        { id: "n4", title: "Meet the class teacher", text: "Saturday, 18 April, 9:00 AM to 11:30 AM. Meet your child's class teacher and subject teachers.", date: "2026-04-18", tag: "PTM", level: "high" },
        { id: "n5", title: "Summer break", text: "School is closed from Saturday, 16 May. It reopens on Wednesday, 1 July.", date: "2026-05-16", tag: "Holiday", level: "medium" },
        { id: "n6", title: "Bus passes for the new session", text: "Collect this session's bus pass from the transport desk by Saturday, 11 April. Routes and stops are unchanged.", date: "2026-04-11", tag: "Notice", level: "medium", to: { bus: "bus" }, web: false }
      ],
      enquiries: [
        { child: "Advik Malhotra", cls: "Class IV", parent: "Nitin Malhotra", phone: "98xxxxxx63", at: "2026-04-07", status: "New", note: "Transfer from Gurugram" },
        { child: "Sara Thomas", cls: "Class IX", parent: "Binu Thomas", phone: "99xxxxxx20", at: "2026-04-06", status: "Visit booked", note: "Family moved to Sector 9" },
        { child: "Hridaan Gupta", cls: "Class II", parent: "Megha Gupta", phone: "97xxxxxx31", at: "2026-04-03", status: "Called" }
      ],
      fees: [
        { q: "Q1 · Apr–Jun", amount: 14850, due: "2026-04-10", paid: null },
        { q: "Q2 · Jul–Sep", amount: 14850, due: "2026-07-10", paid: null },
        { q: "Q3 · Oct–Dec", amount: 14850, due: "2026-10-10", paid: null },
        { q: "Q4 · Jan–Mar", amount: 14850, due: "2027-01-10", paid: null }
      ]
    });
    if (p === "end") return Object.assign(base, {
      homework: [
        { id: "h1", subj: "Mathematics", title: "Bridge worksheet for Class VIII", detail: "Ten questions on integers, fractions and simple equations, to keep the basics fresh over the break.", due: "2027-04-03", by: "Ms. Neha Mathew", done: false },
        { id: "h2", subj: "English", title: "Read one storybook and review it", detail: "Any storybook from the library list. Write a review of 200 words: what happens, and what you liked.", due: "2027-04-06", by: "Mrs. Rekha Menon", done: false },
        { id: "h3", subj: "Science", title: "Return the lab manual", detail: "Hand the Class VII lab manual back to the science lab before the break.", due: "2027-03-25", by: "Mr. Joseph Varghese", done: true }
      ],
      messages: [
        { from: "teacher", text: "Congratulations! Aarav is promoted to Class VIII. His report card will be given out at the PTM on Saturday, 27 March. It's been a lovely year with him.", at: "Today, 9:30 AM" },
        { from: "parent", text: "Thank you so much ma'am, for everything this year. See you on Saturday.", at: "Today, 10:05 AM" }
      ],
      notices: [
        { id: "n1", title: "Final results are out", text: "Results for Classes Nursery to IX and XI are on the app today. Report cards are given out at the PTM.", date: "2027-03-26", tag: "Notice", level: "high" },
        { id: "n2", title: "Report-card PTM", text: "Saturday, 27 March, 9:00 AM to 12:30 PM. Collect the report card and meet the teachers.", date: "2027-03-27", tag: "PTM", level: "high" },
        { id: "n3", title: "New session begins", text: "Session 2027–28 begins on Thursday, 1 April. Book lists for every class are on the app.", date: "2027-04-01", tag: "Notice", level: "medium" },
        { id: "n4", title: "CBSE board exams", text: "Class X and XII board exams continue until 4 April. Results are expected in May.", date: "2027-04-04", tag: "Exam", level: "high", to: { cls: ["X", "XII"] } }
      ],
      enquiries: [
        { child: "Myra Aggarwal", cls: "Nursery", parent: "Kunal Aggarwal", phone: "98xxxxxx41", at: "2026-10-16", status: "Admitted" },
        { child: "Reyansh Bhatia", cls: "Nursery", parent: "Pooja Bhatia", phone: "99xxxxxx07", at: "2026-10-15", status: "Admitted" },
        { child: "Aditya Singh", cls: "Class XI", parent: "Ravinder Singh", phone: "97xxxxxx92", at: "2026-10-14", status: "Form given", note: "Waiting for the Class X result" },
        { child: "Kiara Jain", cls: "Nursery", parent: "Mansi Jain", phone: "98xxxxxx55", at: "2026-10-12", status: "Admitted" },
        { child: "Om Prakash", cls: "Class XI", parent: "Sanjay Prakash", phone: "93xxxxxx18", at: "2026-10-10", status: "Visit booked" },
        { child: "Anvi Kapoor", cls: "LKG", parent: "Rahul Kapoor", phone: "98xxxxxx77", at: "2027-03-20", status: "New" },
        { child: "Ishaan Rana", cls: "Class XI", parent: "Deepak Rana", phone: "99xxxxxx58", at: "2027-03-18", status: "Called" }
      ],
      fees: [
        { q: "Q1 · Apr–Jun", amount: 14850, due: "2026-04-10", paid: "2026-04-06" },
        { q: "Q2 · Jul–Sep", amount: 14850, due: "2026-07-10", paid: "2026-07-08" },
        { q: "Q3 · Oct–Dec", amount: 14850, due: "2026-10-31", paid: "2026-10-27" },
        { q: "Q4 · Jan–Mar", amount: 14850, due: "2027-01-10", paid: "2027-01-07" }
      ]
    });
    return Object.assign(base, {
      homework: [
        { id: "h1", subj: "Mathematics", title: "Integers — Worksheet 3", detail: "Questions 1–15 on adding and subtracting integers. Show working in the notebook.", due: nd(1), by: "Ms. Neha Mathew", done: false },
        { id: "h2", subj: "Science", title: "Project: Nutrition in Plants", detail: "A chart (A3) on photosynthesis with a labelled leaf diagram. Group of 3.", due: nd(4), by: "Mr. Joseph Varghese", done: false },
        { id: "h3", subj: "Hindi", title: "Chapter 5 — Questions and answers", detail: "Write the answers to questions 1 to 6 of chapter 5, 'Mithaiwala', in the Hindi notebook.", due: nd(2), by: "Mrs. Sunita Rawat", done: true }
      ],
      messages: [
        { from: "teacher", text: "Good afternoon! Aarav did very well in today's Maths quiz — 9/10. Please make sure the Integers worksheet is completed.", at: "Yesterday, 3:10 PM" },
        { from: "parent", text: "Thank you ma'am, will do.", at: "Yesterday, 6:45 PM" }
      ],
      notices: [
        { id: "n1", title: "Parent–Teacher Meeting", text: "PTM for Classes VI–VIII on Saturday, 31 October, 9:00 AM – 12:30 PM. Half-yearly answer sheets will be shown.", date: "2026-10-31", tag: "PTM", level: "high", to: { cls: ["VI", "VII", "VIII"] } },
        { id: "n2", title: "Dussehra holiday", text: "School remains closed on Tuesday, 20 October for Dussehra.", date: "2026-10-20", tag: "Holiday", level: "medium" },
        { id: "n3", title: "Children's Day celebrations", text: "Special assembly and teachers' performance on Saturday, 14 November. Students may come in colour dress.", date: "2026-11-14", tag: "Event", level: "low" },
        { id: "n4", title: "Diwali break", text: "School closed 6–10 November. Reopens Wednesday, 11 November.", date: "2026-11-06", tag: "Holiday", level: "medium" },
        { id: "n5", title: "Route 14: earlier pick-up", text: "From Monday, 26 October, the Route 14 bus reaches Sector 9 at 7:05 AM, ten minutes earlier, while the road at Sector 8 market is repaired.", date: "2026-10-26", tag: "Notice", level: "medium", to: { bus: "bus", route: "Route 14" }, web: false },
        { id: "n6", title: "Cricket trials, under-14 boys", text: "Trials for the school's under-14 cricket team on Wednesday, 28 October, after school on the main ground. Bring whites and sports shoes.", date: "2026-10-28", tag: "Event", level: "low", to: { cls: ["VI", "VII", "VIII"], gender: "boys" }, web: false },
        { id: "n7", title: "Basketball trials, senior girls", text: "Trials for the girls' basketball team on Thursday, 29 October, after school on the court. Open to Classes IX to XII.", date: "2026-10-29", tag: "Event", level: "low", to: { cls: ["IX", "X", "XI", "XII"], gender: "girls" }, web: false },
        { id: "n8", title: "Practical files for the board exam", text: "Science practical files must be complete and signed by Friday, 20 November. Labs are open after school on Tuesdays and Thursdays.", date: "2026-11-20", tag: "Exam", level: "high", to: { cls: ["X", "XII"] }, web: false }
      ],
      enquiries: [
        { child: "Myra Aggarwal", cls: "Nursery", parent: "Kunal Aggarwal", phone: "98xxxxxx41", at: "2026-10-16", status: "Visit booked" },
        { child: "Reyansh Bhatia", cls: "Nursery", parent: "Pooja Bhatia", phone: "99xxxxxx07", at: "2026-10-15", status: "New" },
        { child: "Aditya Singh", cls: "Class XI", parent: "Ravinder Singh", phone: "97xxxxxx92", at: "2026-10-14", status: "Form given" },
        { child: "Kiara Jain", cls: "Nursery", parent: "Mansi Jain", phone: "98xxxxxx55", at: "2026-10-12", status: "Visit booked" },
        { child: "Om Prakash", cls: "Class XI", parent: "Sanjay Prakash", phone: "93xxxxxx18", at: "2026-10-10", status: "New" }
      ],
      fees: [
        { q: "Q1 · Apr–Jun", amount: 14850, due: "2026-04-10", paid: "2026-04-06" },
        { q: "Q2 · Jul–Sep", amount: 14850, due: "2026-07-10", paid: "2026-07-08" },
        { q: "Q3 · Oct–Dec", amount: 14850, due: iso(addDays(t, 12)), paid: null },
        { q: "Q4 · Jan–Mar", amount: 14850, due: "2027-01-10", paid: null }
      ]
    });
  };
  S.seed = seed;

  // ---- Website content --------------------------------------------------
  // What the principal's Website tab changes on the public site. Uploaded
  // photos live apart from the content (state.photos, by id) so the undo
  // history stays small; content refers to them as "up:<id>".
  S.LIBRARY = [
    { src: "assets/photos/slide-6.webp", alt: "The school band in red berets on the campus walk" },
    { src: "assets/photos/slide-1.webp", alt: "The school choir on stage" },
    { src: "assets/photos/slide-3.webp", alt: "Folk dance from the North-East" },
    { src: "assets/photos/slide-9.webp", alt: "Junior students smiling for the camera" },
    { src: "assets/photos/slide-4.webp", alt: "Students performing Garba" },
    { src: "assets/photos/slide-10.webp", alt: "Students receiving a trophy" },
    { src: "assets/photos/slide-2.webp", alt: "Folk dance in green and pink" },
    { src: "assets/photos/slide-5.webp", alt: "Students singing on stage with live musicians" },
    { src: "assets/photos/slide-7.webp", alt: "Junior band members on the campus path" },
    { src: "assets/photos/slide-8.webp", alt: "Pre-primary children in red tracksuits on an outing" },
    { src: "assets/photos/slide-11.webp", alt: "Students and teachers holding up a trophy on stage" }
  ];
  S.ADM_CLASSES = [["Nursery"], ["LKG"], ["UKG"], ["Class I"], ["Classes II to IX, where seats are free"], ["Class XI"]];
  // Facts the school still has to give us. Each one fills every "to be added" marked data-fact="key".
  S.FACTS = [
    ["phone", "Office phone", "0129 224 2097, 0129 224 8895"], ["email", "Office email", "stjohnsschool@rediffmail.com"], ["hours", "Office hours", "8:00 AM to 2:00 PM, Monday to Saturday"],
    ["pin", "PIN code", "121006"], ["affil", "CBSE affiliation number", "530048"], ["code", "CBSE school code", ""],
    ["principal", "Principal's name and qualification", "Mrs Aparna Gautam Panda"], ["chair", "Chairperson and manager", "Ms. A. John, President"],
    ["tPreS", "Pre-primary timings, summer", "8:35 AM to 12:55 PM"], ["tPreW", "Pre-primary timings, winter", "9:00 AM to 1:20 PM"],
    ["tSchS", "Classes I to XII timings, summer", "7:35 AM to 1:45 PM"], ["tSchW", "Classes I to XII timings, winter", "8:05 AM to 2:15 PM"]
  ];
  S.siteSeed = () => ({
    adm: { open: true, session: "2027–28", classes: ["Nursery", "Class XI"] },
    slides: S.LIBRARY.map((p, i) => ({ src: p.src, alt: p.alt, on: i < 6, pos: "50% 50%" })),
    gallery: [], facts: {}, log: [], undo: [], routes: "", jobs: []
  });
  const listJoin = (a, and) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " " + and + " " + a[a.length - 1];
  // The admissions wording, from the Website tab's settings.
  S.admText = () => {
    const a = S.state.site.adm, list = listJoin(a.classes, "and");
    return a.open ? {
      open: true, session: a.session, list,
      btn: `Admissions ${a.session}`,
      title: `Admissions for ${a.session} are open.`,
      text: `Enquiries are open for ${list}. Tell us a little about your child and pick a day to see the campus.`,
      lead: `Admissions for ${a.session} are open for ${list}. Here is how it works, from your first question to your child's first day.`
    } : {
      open: false, session: a.session, list,
      btn: "How admission works",
      title: `Admissions for ${a.session} are closed for now.`,
      text: "Leave your number and the office will call you when registration opens. You are welcome to visit the campus at any time.",
      lead: `Admissions for ${a.session} are closed for now. Here is how it works, so you are ready when registration opens.`
    };
  };
  // An enquiry's reference number, for checking its status on the website.
  S.enqRef = (e) => e.ref || "SJS-27-" + String(1000 + ([...(e.child + e.phone)].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7) % 9000));
  S.photo = (src) => (src && src.startsWith("up:") ? (S.state.photos[src.slice(3)] || "") : src);

  const PKEY = phase === "mid" ? KEY : KEY + ":" + phase, SHARED = ["site", "photos", "applications"];
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const fix = (st) => {
    if (!st.site) st.site = S.siteSeed();
    if (!st.photos) st.photos = {};
    if (st.site.routes == null) st.site.routes = "";
    if (!st.site.jobs) st.site.jobs = [];
    if (!st.applications) st.applications = [];
    // Older demo data kept VII-B's Unit Test 2 marks on their own.
    if (!st.entries) { st.entries = {}; if (st.ut2 && Object.keys(st.ut2).length) st.entries.Mathematics = { marks: st.ut2, published: !!st.ut2Published }; }
    ["secs", "threads", "kidFees", "checks"].forEach((k) => (st[k] = st[k] || {}));
    if (!st.readNotes) st.readNotes = [];
    return st;
  };
  const load = () => {
    const main = read(KEY);
    if (phase === "mid") return fix(main || seed());
    const mine = read(PKEY) || seed();
    if (main) SHARED.forEach((k) => main[k] && (mine[k] = main[k]));
    return fix(mine);
  };
  S.state = load();
  // Returns false when the browser's storage is full (big photos), so the caller can say so.
  S.save = () => {
    try {
      S._ver = (S._ver || 0) + 1;
      localStorage.setItem(PKEY, JSON.stringify(S.state));
      if (phase !== "mid") { const main = fix(read(KEY) || seed("mid")); SHARED.forEach((k) => (main[k] = S.state[k])); localStorage.setItem(KEY, JSON.stringify(main)); }
      return true;
    } catch (e) { return false; }
  };
  S.reset = () => { try { [KEY, KEY + ":start", KEY + ":end"].forEach((k) => localStorage.removeItem(k)); } catch (e) {} location.reload(); };
  // Other tabs (teacher in one, parent in another) update live; a change of
  // stage in another tab reloads this one.
  window.addEventListener("storage", (e) => {
    if (e.key === "sjs-phase") { if (PORTAL) location.reload(); return; }
    if (e.key !== PKEY && e.key !== KEY) return;
    S.state = load(); S._ver = (S._ver || 0) + 1;
    document.dispatchEvent(new CustomEvent("sjs:sync"));
  });

  // The live records of one class section: today's register, homework, leave
  // and marks. VII-B's sit at the top of the state; every other section's are
  // made when first opened (classes.js knows how).
  S.secState = (key) => {
    if (!key || key === "VII-B") return S.state;
    return S.state.secs[key] || (S.state.secs[key] = S.seedSec ? S.seedSec(key) : { attendance: {}, homework: [], leaves: [], entries: {} });
  };
  // The section this page is looking at; classes.js moves it.
  S.focusKey = "VII-B";
  Object.defineProperty(S, "cs", { get: () => S.secState(S.focusKey), configurable: true });
  // Marks a teacher enters for one subject in one section.
  S.entry = (key, subj) => {
    const st = S.secState(key);
    st.entries = st.entries || {};
    if (!st.entries[subj]) st.entries[subj] = S.seedEntry ? S.seedEntry(key, subj) : { marks: {}, published: false };
    return st.entries[subj];
  };

  // Attendance status for a student on a date: "P" | "A" | "L" | "H" (holiday) | null (not taken yet)
  S.statusOn = (roll, key) => {
    const d = new Date(key + "T00:00");
    if (!isSchoolDay(d)) return "H";
    if (key === S.todayKey) { const t = S.cs.attendance[key]; return t ? (t.marks[roll] || "P") : null; }
    if (key > S.todayKey) return null;
    return (S.history[key] || {})[roll] || "P";
  };
  S.attendancePct = (roll) => {
    let days = 0, present = 0;
    Object.keys(S.history).forEach((k) => { days++; if (!S.history[k][roll]) present++; });
    const t = S.cs.attendance[S.todayKey];
    if (t) { days++; if (!t.marks[roll]) present++; }
    return days ? Math.round((present / days) * 1000) / 10 : 100;
  };
  S.rupee = (n) => "₹" + n.toLocaleString("en-IN");
  S.timeNow = () => new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  // Students a teacher should look at, with the reason.
  // Uses the latest exam of the stage shown, and the one before it.
  // only: the subjects to judge on (a subject teacher sees just their own).
  S.atRisk = (only) => S.students.map((s) => {
    const why = [], pct = S.attendancePct(s.roll), C = S.EX.cur, P = S.EX.prev, subs = only || S.subjects;
    if (pct < 85 && S.schoolDays.length >= 20) why.push(`attendance ${pct}%`); // too few days early on to judge
    if (P) subs.forEach((sub) => { const drop = s[P][sub] - s[C][sub]; if (drop >= 15) why.push(`${sub} fell ${drop} points (${s[P][sub]}% → ${s[C][sub]}%)`); });
    const low = subs.filter((sub) => s[C][sub] < 50);
    if (low.length) why.push(`below 50% in ${low.join(", ")}`);
    return { s, why, pct };
  }).filter((x) => x.why.length);
})();
