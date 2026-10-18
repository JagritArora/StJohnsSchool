/* Demo data + a tiny shared store.
   Everything a teacher, parent or the principal does is saved in
   localStorage under one key, so the three portals see the same school. */
(function () {
  const S = (window.SJS = window.SJS || {});
  const KEY = "sjs-demo-v1";

  // ---- Dates -------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const HOLIDAYS = {
    "2026-08-15": "Independence Day", "2026-10-02": "Gandhi Jayanti", "2026-10-20": "Dussehra",
    "2026-11-06": "Diwali break", "2026-11-09": "Diwali break", "2026-11-10": "Diwali break",
    "2026-12-25": "Christmas"
  };
  const isSchoolDay = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS[iso(d)];
  // Demo "today": the real date, moved forward to the next school day.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  while (!isSchoolDay(today)) today.setDate(today.getDate() + 1);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const nextSchoolDay = (d, n = 1) => { let x = new Date(d); while (n > 0) { x = addDays(x, 1); if (isSchoolDay(x)) n--; } return x; };
  const fmt = (d, o = { day: "numeric", month: "short" }) => new Date(d).toLocaleDateString("en-IN", o);
  const fmtLong = (d) => fmt(d, { weekday: "long", day: "numeric", month: "long" });
  Object.assign(S, { iso, pad, fmt, fmtLong, addDays, nextSchoolDay, isSchoolDay, HOLIDAYS, today, todayKey: iso(today) });

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
  S.subjectsHi = { English: "अंग्रेज़ी", Hindi: "हिंदी", Mathematics: "गणित", Science: "विज्ञान", "Social Science": "सामाजिक विज्ञान", Computer: "कंप्यूटर" };

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
  S.student = (roll) => S.students.find((s) => s.roll === +roll);
  S.me = by("Aarav Sharma"); // the parent demo logs in as Aarav's parent

  // Attendance history: every school day from 1 July up to yesterday.
  S.history = {};
  const start = new Date(today.getFullYear(), 6, 1);
  for (let d = new Date(start); d < today; d = addDays(d, 1)) {
    if (!isSchoolDay(d)) continue;
    const k = iso(d), day = {};
    S.students.forEach((s) => {
      const x = hash(s.roll, Math.round(d.getTime() / 864e5));
      if (x < s.absentRate) day[s.roll] = x < s.absentRate * 0.25 ? "L" : "A";
    });
    S.history[k] = day;
  }

  S.classAvg = (exam, subj) => Math.round(S.students.reduce((a, s) => a + s[exam][subj], 0) / S.students.length);
  S.avgOf = (marks) => Math.round(Object.values(marks).reduce((a, b) => a + b, 0) / Object.values(marks).length);

  // Timetable (VII-B)
  S.timetable = {
    1: ["Mathematics", "English", "Science", "Hindi", "Games", "Social Science", "Computer", "Art"],
    2: ["English", "Mathematics", "Hindi", "Science", "Library", "Social Science", "Music", "Mathematics"],
    3: ["Science", "Hindi", "Mathematics", "English", "Computer", "Social Science", "Games", "Value Education"],
    4: ["Hindi", "Science", "English", "Mathematics", "Art", "Social Science", "Mathematics", "Library"],
    5: ["Mathematics", "Social Science", "Science", "English", "Hindi", "Computer", "Assembly Activity", "Games"]
  };
  S.periodTimes = ["8:00", "8:40", "9:20", "10:00", "10:50", "11:30", "12:10", "12:50"];
  // Who teaches what in VII-B (sample names), for the timetable's hover.
  S.ttTeachers = {
    Mathematics: "Ms. Neha Mathew", English: "Mrs. Rekha Menon", Hindi: "Mrs. Sunita Rawat", Science: "Mr. Joseph Varghese",
    "Social Science": "Mr. Vikram Chauhan", Computer: "Mr. Rahul Kapoor", Games: "Mr. Satish Malik", Art: "Ms. Farah Ahmed",
    Library: "Mrs. Kavita Bedi", Music: "Mr. Paul D'Cruz", "Value Education": "Mrs. Lalitha Krishnan", "Assembly Activity": "Ms. Neha Mathew"
  };

  // Whole-school attendance today (sample); VII is filled in from VII-B's live register.
  S.sample = { classes: ["Nur", "LKG", "UKG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"], attendance: [91, 89, 94, 95, 96, 93, 95, 94, 92, 0, 94, 86, 95, 92, 90] };

  S.teacher = { name: "Ms. Neha Mathew", initials: "NM", role: "Class Teacher · VII-B", subject: "Mathematics" };
  S.sibling = { name: "Ananya Sharma", initials: "AS", cls: "III-A", teacher: "Mrs. Priya Nair" };

  // ---- Shared, mutable state --------------------------------------------
  const seed = () => ({
    attendance: {}, // { "YYYY-MM-DD": { taken: true, at: "08:42", marks: { roll: "A"|"L" } } }
    homework: [
      { id: "h1", subj: "Mathematics", title: "Integers — Worksheet 3", detail: "Questions 1–15 on adding and subtracting integers. Show working in the notebook.", due: iso(nextSchoolDay(today, 1)), by: "Ms. Neha Mathew", done: false },
      { id: "h2", subj: "Science", title: "Project: Nutrition in Plants", detail: "A chart (A3) on photosynthesis with a labelled leaf diagram. Group of 3.", due: iso(nextSchoolDay(today, 4)), by: "Mr. Joseph Varghese", done: false },
      { id: "h3", subj: "Hindi", title: "पाठ 5 — प्रश्न-उत्तर", detail: "पाठ 5 'मिठाईवाला' के प्रश्न 1 से 6 लिखें।", due: iso(nextSchoolDay(today, 2)), by: "Mrs. Sunita Rawat", done: true }
    ],
    leaves: [],
    messages: [
      { from: "teacher", text: "Good afternoon! Aarav did very well in today's Maths quiz — 9/10. Please make sure the Integers worksheet is completed.", at: "Yesterday, 3:10 PM" },
      { from: "parent", text: "Thank you ma'am, will do.", at: "Yesterday, 6:45 PM" }
    ],
    notices: [
      { id: "n1", title: "Parent–Teacher Meeting", text: "PTM for Classes VI–VIII on Saturday, 31 October, 9:00 AM – 12:30 PM. Half-yearly answer sheets will be shown.", date: "2026-10-31", tag: "PTM" },
      { id: "n2", title: "Dussehra holiday", text: "School remains closed on Tuesday, 20 October for Dussehra.", date: "2026-10-20", tag: "Holiday" },
      { id: "n3", title: "Children's Day celebrations", text: "Special assembly and teachers' performance on Saturday, 14 November. Students may come in colour dress.", date: "2026-11-14", tag: "Event" },
      { id: "n4", title: "Diwali break", text: "School closed 6–10 November. Reopens Wednesday, 11 November.", date: "2026-11-06", tag: "Holiday" }
    ],
    enquiries: [
      { child: "Myra Aggarwal", cls: "Nursery", parent: "Kunal Aggarwal", phone: "98xxxxxx41", at: "2026-10-16", status: "Visit booked" },
      { child: "Reyansh Bhatia", cls: "Nursery", parent: "Pooja Bhatia", phone: "99xxxxxx07", at: "2026-10-15", status: "New" },
      { child: "Aditya Singh", cls: "Class XI", parent: "Ravinder Singh", phone: "97xxxxxx92", at: "2026-10-14", status: "Form given" },
      { child: "Kiara Jain", cls: "Nursery", parent: "Mansi Jain", phone: "98xxxxxx55", at: "2026-10-12", status: "Visit booked" },
      { child: "Om Prakash", cls: "Class XI", parent: "Sanjay Prakash", phone: "93xxxxxx18", at: "2026-10-10", status: "New" }
    ],
    ut2: {}, ut2Published: false,
    fees: [
      { q: "Q1 · Apr–Jun", amount: 14850, due: "2026-04-10", paid: "2026-04-06" },
      { q: "Q2 · Jul–Sep", amount: 14850, due: "2026-07-10", paid: "2026-07-08" },
      { q: "Q3 · Oct–Dec", amount: 14850, due: iso(addDays(today, 12)), paid: null },
      { q: "Q4 · Jan–Mar", amount: 14850, due: "2027-01-10", paid: null }
    ]
  });

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
  S.ADM_CLASSES = [["Nursery", "नर्सरी"], ["LKG", "एलकेजी"], ["UKG", "यूकेजी"], ["Class I", "कक्षा I"], ["Classes II to IX, where seats are free", "कक्षा II से IX, जहाँ सीटें ख़ाली हों"], ["Class XI", "कक्षा XI"]];
  // Facts the school still has to give us. Each one fills every "to be added" marked data-fact="key".
  S.FACTS = [
    ["phone", "Office phone", "0129 xxx xxxx"], ["email", "Office email", "office@stjohnsschool.co.in"], ["hours", "Office hours", "8:00 AM to 2:00 PM, Monday to Saturday"],
    ["pin", "PIN code", "121006"], ["affil", "CBSE affiliation number", ""], ["code", "CBSE school code", ""],
    ["principal", "Principal's name and qualification", ""], ["chair", "Chairperson and manager", ""],
    ["tPreS", "Pre-primary timings, summer", "8:00 AM to 12:00 PM"], ["tPreW", "Pre-primary timings, winter", "8:30 AM to 12:30 PM"],
    ["tSchS", "Classes I to XII timings, summer", "7:50 AM to 1:50 PM"], ["tSchW", "Classes I to XII timings, winter", "8:20 AM to 2:20 PM"]
  ];
  S.siteSeed = () => ({
    adm: { open: true, session: "2027–28", classes: ["Nursery", "Class XI"] },
    slides: S.LIBRARY.map((p, i) => ({ src: p.src, alt: p.alt, on: i < 6, pos: "50% 50%" })),
    gallery: [], facts: {}, log: [], undo: []
  });
  const listJoin = (a, and) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " " + and + " " + a[a.length - 1];
  // The admissions wording, in either language, from the Website tab's settings.
  S.admText = (lang) => {
    const a = S.state.site.adm, hi = lang === "hi";
    const list = listJoin(a.classes.map((c) => { const m = S.ADM_CLASSES.find((x) => x[0] === c); return m ? m[hi ? 1 : 0] : c; }), hi ? "और" : "and");
    return a.open ? {
      open: true, session: a.session, list,
      btn: hi ? `दाख़िले ${a.session}` : `Admissions ${a.session}`,
      title: hi ? `${a.session} के लिए दाख़िले शुरू हैं।` : `Admissions for ${a.session} are open.`,
      text: hi ? `${list} के लिए पूछताछ शुरू है। अपने बच्चे के बारे में थोड़ा बताइए और कैंपस देखने का दिन चुनिए।` : `Enquiries are open for ${list}. Tell us a little about your child and pick a day to see the campus.`,
      lead: hi ? `${a.session} के लिए ${list} में दाख़िले शुरू हैं। पहले सवाल से लेकर बच्चे के स्कूल के पहले दिन तक, पूरा तरीक़ा यहाँ है।` : `Admissions for ${a.session} are open for ${list}. Here is how it works, from your first question to your child's first day.`
    } : {
      open: false, session: a.session, list,
      btn: hi ? "दाख़िला कैसे होता है" : "How admission works",
      title: hi ? `${a.session} के दाख़िले अभी बंद हैं।` : `Admissions for ${a.session} are closed for now.`,
      text: hi ? "अपना नंबर छोड़ दीजिए, अगला पंजीकरण शुरू होते ही स्कूल का दफ़्तर आपको फ़ोन करेगा। कैंपस देखने कभी भी आ सकते हैं।" : "Leave your number and the office will call you when registration opens. You are welcome to visit the campus at any time.",
      lead: hi ? `${a.session} के दाख़िले अभी बंद हैं। नीचे पूरा तरीक़ा है, ताकि अगली बार आप तैयार रहें।` : `Admissions for ${a.session} are closed for now. Here is how it works, so you are ready when registration opens.`
    };
  };
  S.photo = (src) => (src && src.startsWith("up:") ? (S.state.photos[src.slice(3)] || "") : src);

  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { state = seed(); }
  if (!state.site) state.site = S.siteSeed();
  if (!state.photos) state.photos = {};
  // Notices from before the event date and Hindi existed.
  const HI_SEED = {
    n1: ["अभिभावक–शिक्षक बैठक", "कक्षा VI–VIII की अभिभावक–शिक्षक बैठक शनिवार, 31 अक्टूबर को सुबह 9:00 से 12:30 बजे तक। अर्धवार्षिक उत्तर-पुस्तिकाएँ दिखाई जाएँगी।"],
    n2: ["दशहरे की छुट्टी", "दशहरे के कारण मंगलवार, 20 अक्टूबर को स्कूल बंद रहेगा।"],
    n3: ["बाल दिवस समारोह", "शनिवार, 14 नवंबर को विशेष सभा और शिक्षकों की प्रस्तुति। विद्यार्थी रंगीन कपड़ों में आ सकते हैं।"],
    n4: ["दिवाली की छुट्टियाँ", "6 से 10 नवंबर तक स्कूल बंद। बुधवार, 11 नवंबर को फिर खुलेगा।"]
  };
  state.notices.forEach((n) => { if (HI_SEED[n.id] && !n.titleHi) [n.titleHi, n.textHi] = HI_SEED[n.id]; });
  S.state = state;
  // Returns false when the browser's storage is full (big photos), so the caller can say so.
  S.save = () => { try { localStorage.setItem(KEY, JSON.stringify(S.state)); return true; } catch (e) { return false; } };
  S.reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
  // Other tabs (teacher in one, parent in another) update live.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try { S.state = JSON.parse(e.newValue) || seed(); } catch (err) { S.state = seed(); }
    if (!S.state.site) S.state.site = S.siteSeed();
    if (!S.state.photos) S.state.photos = {};
    document.dispatchEvent(new CustomEvent("sjs:sync"));
  });

  // Attendance status for a student on a date: "P" | "A" | "L" | "H" (holiday) | null (not taken yet)
  S.statusOn = (roll, key) => {
    const d = new Date(key + "T00:00");
    if (!isSchoolDay(d)) return "H";
    if (key === S.todayKey) { const t = S.state.attendance[key]; return t ? (t.marks[roll] || "P") : null; }
    if (key > S.todayKey) return null;
    return (S.history[key] || {})[roll] || "P";
  };
  S.attendancePct = (roll) => {
    let days = 0, present = 0;
    Object.keys(S.history).forEach((k) => { days++; if (!S.history[k][roll]) present++; });
    const t = S.state.attendance[S.todayKey];
    if (t) { days++; if (!t.marks[roll]) present++; }
    return days ? Math.round((present / days) * 1000) / 10 : 100;
  };
  S.rupee = (n) => "₹" + n.toLocaleString("en-IN");
  S.timeNow = () => new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  // Students a teacher should look at, with the reason.
  S.atRisk = () => S.students.map((s) => {
    const why = [], pct = S.attendancePct(s.roll);
    if (pct < 85) why.push(`attendance ${pct}%`);
    S.subjects.forEach((sub) => { const drop = s.ut1[sub] - s.hy[sub]; if (drop >= 15) why.push(`${sub} fell ${drop} points (${s.ut1[sub]}% → ${s.hy[sub]}%)`); });
    const low = S.subjects.filter((sub) => s.hy[sub] < 50);
    if (low.length) why.push(`below 50% in ${low.join(", ")}`);
    return { s, why, pct };
  }).filter((x) => x.why.length);
})();
