#!/usr/bin/env node
/* Builds the teaching plan for Classes VI to XII and writes js/ttplan.js.
   Run: node tools/ttplan.js
   - Each teacher takes 4 or 5 sections (the Computer and Physical Education teachers take
     every section, as their subjects have few periods), and 33 to 39 periods a week.
   - Each teacher has one or two free periods every day (Saturday has five periods).
   - No teacher is in two rooms at once; VII-B's timetable is fixed (js/data.js) and its
     Mathematics and Assembly periods are Ms. Neha Mathew's.
   - A subject comes at most twice a day in a section, and not twice in a row.
   - Labs: no two classes need the same lab at once. Computer and IT are always in the
     computer lab; two Science periods a week (VI to X) are practicals in the science lab;
     Physics, Chemistry and Biology (XI-A, XII-A) have two practicals each in their own lab.
   Teachers top up their week with Library, Value Education and (for class teachers)
   Assembly periods in their own sections. The output is fixed data, so every visit
   shows the same timetable. */
const fs = require("fs"), path = require("path");
// The rules and the solver live in js/ttsolve.js, shared with the academic planner's page.
const TT = require(path.join(__dirname, "..", "js", "ttsolve.js"));
const { SECS, weekOf, loadOf, NP, MIN, MAX } = TT;
const SLOTS = []; for (let d = 1; d <= 6; d++) for (let p = 0; p < NP(d); p++) SLOTS.push([d, p]);

// ---------- Who teaches what ----------
// [id, name, main subject, { section: subject }, class teacher of]
const T = [
  ["SJS-T-0412", "Ms. Neha Mathew", "Mathematics", { "VII-C": "Mathematics", "VIII-A": "Mathematics", "VIII-B": "Mathematics" }, null],
  ["SJS-T-0508", "Mr. Ajay Talwar", "Mathematics", { "IX-A": "Mathematics", "IX-B": "Mathematics", "X-A": "Mathematics", "XII-A": "Mathematics" }, "IX-A"],
  ["SJS-T-0514", "Mrs. Shalini Anand", "Mathematics", { "VI-A": "Mathematics", "VI-B": "Mathematics", "VI-C": "Mathematics", "VII-A": "Mathematics" }, "VI-B"],
  ["SJS-T-0527", "Mr. Deepak Kaul", "Applied Mathematics", { "XI-B": "Applied Mathematics", "XII-B": "Applied Mathematics", "XI-A": "Mathematics", "X-B": "Mathematics" }, "XI-A"],
  ["SJS-T-0501", "Ms. Priya Chopra", "English", { "VI-A": "English", "VI-B": "English", "VI-C": "English", "VII-A": "English", "VII-C": "English" }, "VI-A"],
  ["SJS-T-0506", "Mrs. Deepa Raina", "English", { "VIII-A": "English", "VIII-B": "English", "IX-A": "English", "IX-B": "English", "X-A": "English" }, "VIII-A"],
  ["SJS-T-0518", "Mrs. Anita Bhalla", "English", { "X-B": "English", "XI-A": "English", "XI-B": "English", "XII-A": "English", "XII-B": "English" }, "X-B"],
  ["SJS-T-0507", "Ms. Nisha Sethi", "Hindi", { "IX-A": "Hindi", "IX-B": "Hindi", "X-A": "Hindi", "X-B": "Hindi", "VIII-A": "Hindi", "VIII-B": "Hindi" }, "IX-B"],
  ["SJS-T-0502", "Mrs. Grace Menon", "Hindi", { "VI-A": "Hindi", "VI-B": "Hindi", "VI-C": "Hindi", "VII-A": "Hindi", "VII-C": "Hindi" }, "VII-C"],
  ["SJS-T-0509", "Mrs. Anita Narang", "Science", { "IX-A": "Science", "IX-B": "Science", "X-A": "Science", "X-B": "Science" }, "X-A"],
  ["SJS-T-0529", "Mrs. Mary Raina", "Physics", { "XI-A": "Physics", "XII-A": "Physics", "VIII-A": "Science", "VIII-B": "Science" }, "VIII-B"],
  ["SJS-T-0530", "Ms. Shweta Sethi", "Chemistry", { "XI-A": "Chemistry", "XII-A": "Chemistry", "VI-A": "Science", "VI-B": "Science" }, "XII-A"],
  ["SJS-T-0522", "Mrs. Ritu Prasad", "Biology", { "XI-A": "Biology", "XII-A": "Biology", "VI-C": "Science", "VII-A": "Science", "VII-C": "Science" }, "VII-A"],
  ["SJS-T-0504", "Mr. Manoj Kaul", "Social Science", { "VIII-A": "Social Science", "VIII-B": "Social Science", "IX-A": "Social Science", "IX-B": "Social Science" }, null],
  ["SJS-T-0536", "Ms. Sunanda Sehgal", "Economics", { "XI-B": "Economics", "XII-B": "Economics", "X-A": "Social Science", "X-B": "Social Science" }, "XII-B"],
  ["SJS-T-0524", "Ms. Seema Chopra", "Accountancy", { "XI-B": "Accountancy", "XII-B": "Accountancy", "VI-A": "Social Science", "VI-B": "Social Science" }, "XI-B"],
  ["SJS-T-0525", "Mrs. Monika Menon", "Business Studies", { "XI-B": "Business Studies", "XII-B": "Business Studies", "VI-C": "Social Science", "VII-A": "Social Science", "VII-C": "Social Science" }, "VI-C"],
  ["SJS-T-0505", "Mrs. Shalini Iyer", "Computer", Object.fromEntries(SECS.filter((k) => weekOf(k).Computer || weekOf(k)["Information Technology"]).map((k) => [k, weekOf(k).Computer ? "Computer" : "Information Technology"])), null],
  ["SJS-T-0523", "Mr. Manoj Datta", "Physical Education", { "XI-A": "Physical Education", "XI-B": "Physical Education", "XII-A": "Physical Education", "XII-B": "Physical Education" }, null]
];

const problems = TT.problems(T.map(([id, name, subject, teach, classOf]) => ({ id, name, subject, teach, classOf })));
if (problems.length) throw new Error(problems.map((p) => p.text).join("; "));
const teachers = TT.prepare(T.map(([id, name, subject, teach, classOf]) => ({ id, name, subject, teach, classOf })));
teachers.forEach((t) => {
  const secs = new Set(Object.keys(t.teach)); if (t.id === TT.NEHA_ID) secs.add("VII-B");
  console.log(`${t.name.padEnd(22)} ${t.subject.padEnd(20)} ${String(secs.size).padStart(2)} sections  ${loadOf(t)} periods`);
});
const bad = teachers.filter((t) => loadOf(t) < MIN || loadOf(t) > MAX);
if (bad.length) { console.error("Out of range:", bad.map((t) => t.name + " " + loadOf(t)).join(", ")); process.exit(1); }

// ---------- Timetables ----------
const R = TT.solve(teachers), OUT = R.timetables, rooms = R.rooms, rnd = R.rnd;
console.log("Final cost:", R.cost);
console.log("Lab clashes:", R.labClash);
if (R.labClash) { console.error("Lab clash; not writing."); process.exit(1); }
teachers.forEach((t, i) => console.log(`${t.name.padEnd(22)} free: ${R.free[i].join(" ")}`));
console.log(`Clashes: ${R.clashes} · section shape penalty: ${R.shape}`);
if (R.clashes || R.cost > 0) { console.error("Not clean; not writing."); process.exit(1); }

// ---------- Nursery to Class V ----------
// The class teacher takes most periods, so only the shape matters: a subject at most twice a day
// (three times for the main subjects in pre-primary) and never twice in a row.
const PRE = { English: 9, Hindi: 7, Numbers: 9, Environment: 6, Art: 4, Games: 4, Music: 3, Library: 1, "Assembly Activity": 1, "Club Activities": 1 };
const PRI = { English: 8, Hindi: 7, Mathematics: 8, EVS: 7, Computer: 2, Games: 3, Art: 2, Music: 2, Library: 2, "Value Education": 2, "Assembly Activity": 1, "Club Activities": 1 };
for (const w of [PRE, PRI]) { const n = Object.values(w).reduce((a, b) => a + b, 0); if (n !== 45) throw new Error("junior week is " + n); }
const JUN = [...["Nur", "LKG", "UKG"].flatMap((c) => ["A", "B"].map((x) => [c + "-" + x, PRE])), ...["I", "II", "III", "IV", "V"].flatMap((c) => ["A", "B", "C"].map((x) => [c + "-" + x, PRI]))];
const shapeOf = (row, cap) => { let s = 0; const cnt = {}; row.forEach((x, p) => { cnt[x] = (cnt[x] || 0) + 1; if (p && row[p - 1] === x && x !== "Club Activities") s++; }); Object.values(cnt).forEach((c) => { if (c > cap) s += c - cap; }); return s; };
JUN.forEach(([k, wk]) => {
  const cap = wk === PRE ? 3 : 2, bag = [];
  Object.entries(wk).forEach(([x, n]) => { if (x !== "Club Activities") for (let i = 0; i < n; i++) bag.push(x); });
  const tt = {}; let n = 0;
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  for (let d = 1; d <= 6; d++) { tt[d] = []; for (let p = 0; p < NP(d); p++) tt[d][p] = d === 6 && p === 4 ? "Club Activities" : bag[n++]; }
  let c = 0; for (let d = 1; d <= 6; d++) c += shapeOf(tt[d], cap);
  for (let it = 0; it < 4e5 && c > 0; it++) {
    const [d1, p1] = SLOTS[Math.floor(rnd() * SLOTS.length)], [d2, p2] = SLOTS[Math.floor(rnd() * SLOTS.length)];
    const a = tt[d1][p1], b = tt[d2][p2]; if (a === b || a === "Club Activities" || b === "Club Activities") continue;
    const before = shapeOf(tt[d1], cap) + (d2 !== d1 ? shapeOf(tt[d2], cap) : 0);
    tt[d1][p1] = b; tt[d2][p2] = a;
    const after = shapeOf(tt[d1], cap) + (d2 !== d1 ? shapeOf(tt[d2], cap) : 0);
    if (after <= before || rnd() < 0.02) c += after - before; else { tt[d1][p1] = a; tt[d2][p2] = b; }
  }
  if (c) { console.error(k + ": junior week not clean"); process.exit(1); }
  OUT[k] = tt;
});
console.log("Junior weeks:", JUN.length);

// ---------- Write js/ttplan.js ----------
const plan = { teachers: teachers.map((t) => ({ id: t.id, name: t.name, subject: t.subject, teach: t.teach, top: t.top, classOf: t.classOf })), timetables: OUT, rooms };
const body = `/* Generated by tools/ttplan.js: who teaches what in Classes VI to XII, each section's week
   (Nursery to XII), and the lab each practical is in.
   Edit the plan there and run \`node tools/ttplan.js\`; don't edit this file by hand. */
window.SJS = window.SJS || {};
window.SJS.PLAN = ${JSON.stringify(plan)};
`;
fs.writeFileSync(path.join(__dirname, "..", "js", "ttplan.js"), body);
console.log("Wrote js/ttplan.js");
