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

// ---------- Weekly periods ----------
const MID = { English: 7, Hindi: 6, Mathematics: 7, Science: 7, "Social Science": 6, Computer: 3, Games: 2, Library: 2, Art: 1, Music: 1, "Value Education": 1, "Assembly Activity": 1, "Club Activities": 1 };
const SEC = { English: 7, Hindi: 6, Mathematics: 8, Science: 8, "Social Science": 7, "Information Technology": 3, Games: 2, Library: 1, "Value Education": 1, "Assembly Activity": 1, "Club Activities": 1 };
const SCI = { English: 6, Physics: 8, Chemistry: 8, Mathematics: 8, Biology: 7, "Physical Education": 4, Library: 2, "Assembly Activity": 1, "Club Activities": 1 };
const COM = { English: 6, Accountancy: 8, "Business Studies": 7, Economics: 8, "Applied Mathematics": 8, "Physical Education": 4, Library: 2, "Assembly Activity": 1, "Club Activities": 1 };
const SECS = ["VI-A", "VI-B", "VI-C", "VII-A", "VII-C", "VIII-A", "VIII-B", "IX-A", "IX-B", "X-A", "X-B", "XI-A", "XI-B", "XII-A", "XII-B"];
const weekOf = (k) => /^(VI|VII|VIII)-/.test(k) ? MID : /^(IX|X)-/.test(k) ? SEC : /-A$/.test(k) ? SCI : COM;
for (const w of [MID, SEC, SCI, COM]) { const n = Object.values(w).reduce((a, b) => a + b, 0); if (n !== 45) throw new Error("week is " + n); }

// VII-B, fixed (js/data.js): Ms. Neha Mathew's periods there.
const VIIB = {
  1: ["Mathematics", "English", "Science", "Hindi", "Games", "Social Science", "Computer", "Art"],
  2: ["English", "Mathematics", "Hindi", "Science", "Library", "Social Science", "Music", "Mathematics"],
  3: ["Science", "Hindi", "Mathematics", "English", "Computer", "Social Science", "Games", "Value Education"],
  4: ["Hindi", "Science", "English", "Mathematics", "Art", "Social Science", "Mathematics", "Library"],
  5: ["Mathematics", "Social Science", "Science", "English", "Hindi", "Computer", "Assembly Activity", "Games"],
  6: ["English", "Mathematics", "Science", "Hindi", "Club Activities"]
};

// ---------- Labs ----------
// A practical is kept as "Subject*" while solving; it comes out as the subject, with its room in plan.rooms.
const PRAC = { Science: 2, Physics: 2, Chemistry: 2, Biology: 2 };
const LAB_OF = (x) => x === "Computer" || x === "Information Technology" ? "Computer lab" : x === "Science*" ? "Science lab" : /\*$/.test(x) ? x.slice(0, -1) + " lab" : null;
const base = (x) => x.replace(/\*$/, "");
// VII-B's fixed week: its Computer periods, and two of its Science periods as practicals.
const VIIB_LAB = { "2|3": "Science lab", "4|1": "Science lab" };
Object.entries(VIIB).forEach(([d, row]) => row.forEach((x, p) => { if (x === "Computer") VIIB_LAB[d + "|" + p] = "Computer lab"; }));
if (VIIB[2][3] !== "Science" || VIIB[4][1] !== "Science") throw new Error("VII-B practicals moved");

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
const teachers = T.map(([id, name, subject, teach, classOf]) => ({ id, name, subject, teach, classOf, top: {} }));
// The PE teacher also takes Games, wherever the week has it.
const PE = teachers.find((t) => t.subject === "Physical Education");
SECS.filter((k) => weekOf(k).Games).forEach((k) => (PE.top[k] = ["Games"]));
// Every section's subjects are taught by exactly one person.
SECS.forEach((k) => Object.keys(weekOf(k)).forEach((x) => {
  if (["Games", "Library", "Art", "Music", "Value Education", "Assembly Activity", "Club Activities"].includes(x)) return;
  const n = teachers.filter((t) => t.teach[k] === x).length;
  if (n !== 1) throw new Error(`${k} ${x}: ${n} teachers`);
}));
SECS.forEach((k) => { const n = teachers.filter((t) => t.classOf === k).length; if (n !== 1) throw new Error(`${k}: ${n} class teachers`); });
teachers.forEach((t) => { if (t.classOf && !t.teach[t.classOf]) throw new Error(`${t.name} is class teacher of ${t.classOf} but doesn't teach it`); });

// Load: main subjects + Assembly for class teachers + Neha's VII-B.
const loadOf = (t) => Object.entries(t.teach).reduce((a, [k, x]) => a + weekOf(k)[x], 0)
  + Object.entries(t.top).reduce((a, [k, xs]) => a + xs.reduce((b, x) => b + weekOf(k)[x], 0), 0)
  + (t.classOf ? 1 : 0) + (t.id === "SJS-T-0412" ? 9 : 0);
// Top-ups: Library and Value Education periods in a teacher's own sections, to the lightest-loaded first.
const taken = {}; // "k|subject" → teacher
const TOPS = ["Library", "Value Education"];
for (let round = 0; round < 40; round++) {
  const low = teachers.filter((t) => t !== PE && t.subject !== "Computer" && loadOf(t) < 33).sort((a, b) => loadOf(a) - loadOf(b));
  if (!low.length) break;
  let moved = false;
  for (const t of low) {
    const k = Object.keys(t.teach).find((k) => TOPS.some((x) => weekOf(k)[x] && !taken[k + "|" + x]));
    if (!k) continue;
    const x = TOPS.find((x) => weekOf(k)[x] && !taken[k + "|" + x]);
    taken[k + "|" + x] = t; (t.top[k] = t.top[k] || []).push(x); moved = true; break;
  }
  if (!moved) break;
}
// Repair: hand a top-up from a teacher with periods to spare to one still short, where both teach that section.
for (let round = 0; round < 40; round++) {
  const short = teachers.find((t) => t !== PE && loadOf(t) < 33);
  if (!short) break;
  let done = false;
  for (const [key, from] of Object.entries(taken)) {
    const [k, x] = key.split("|");
    if (from === short || !short.teach[k] || loadOf(from) - weekOf(k)[x] < 33) continue;
    from.top[k].splice(from.top[k].indexOf(x), 1); if (!from.top[k].length) delete from.top[k];
    (short.top[k] = short.top[k] || []).push(x); taken[key] = short; done = true; break;
  }
  if (!done) break;
}
teachers.forEach((t) => {
  const secs = new Set(Object.keys(t.teach)); if (t.id === "SJS-T-0412") secs.add("VII-B");
  console.log(`${t.name.padEnd(22)} ${t.subject.padEnd(20)} ${String(secs.size).padStart(2)} sections  ${loadOf(t)} periods`);
});
const bad = teachers.filter((t) => loadOf(t) < 33 || loadOf(t) > 39);
if (bad.length) { console.error("Out of range:", bad.map((t) => t.name + " " + loadOf(t)).join(", ")); process.exit(1); }

// ---------- Timetables ----------
// owner(k, subject) → teacher index, or -1 for people outside the plan (Art, Music, ...).
const ownerIx = {};
teachers.forEach((t, i) => {
  Object.entries(t.teach).forEach(([k, x]) => (ownerIx[k + "|" + x] = i));
  Object.entries(t.top).forEach(([k, xs]) => xs.forEach((x) => (ownerIx[k + "|" + x] = i)));
  if (t.classOf) ownerIx[t.classOf + "|Assembly Activity"] = i;
});
const own = (k, x) => (ownerIx[k + "|" + base(x)] ?? -1);
const NEHA = teachers.findIndex((t) => t.id === "SJS-T-0412");
const NP = (d) => (d === 6 ? 5 : 8);
const SLOTS = []; for (let d = 1; d <= 6; d++) for (let p = 0; p < NP(d); p++) SLOTS.push([d, p]);

// Seeded random numbers.
let seed = 20261107;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// Initial fill: each section's cells in random order; Club Activities fixed at Saturday P5.
const TT = {};
SECS.forEach((k) => {
  const bag = []; Object.entries(weekOf(k)).forEach(([x, n]) => { if (x !== "Club Activities") for (let i = 0; i < n; i++) bag.push(i < (PRAC[x] || 0) ? x + "*" : x); });
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  const tt = {}; let n = 0;
  for (let d = 1; d <= 6; d++) { tt[d] = []; for (let p = 0; p < NP(d); p++) tt[d][p] = d === 6 && p === 4 ? "Club Activities" : bag[n++]; }
  TT[k] = tt;
});

// Occupancy: occ[t][d][p] = how many rooms teacher t is in; VII-B's Neha periods fixed.
const nT = teachers.length;
const occ = Array.from({ length: nT }, () => Array.from({ length: 7 }, () => new Array(8).fill(0)));
const dayLoad = Array.from({ length: nT }, () => new Array(7).fill(0));
Object.entries(VIIB).forEach(([d, row]) => row.forEach((x, p) => { if (x === "Mathematics" || x === "Assembly Activity") { occ[NEHA][d][p]++; dayLoad[NEHA][d]++; } }));
SECS.forEach((k) => { for (const [d, p] of SLOTS) { const i = own(k, TT[k][d][p]); if (i >= 0) { occ[i][d][p]++; dayLoad[i][d]++; } } });
// Labs in use: labOcc[lab][d][p].
const LABS = ["Science lab", "Physics lab", "Chemistry lab", "Biology lab", "Computer lab"];
const labOcc = Object.fromEntries(LABS.map((l) => [l, Array.from({ length: 7 }, () => new Array(8).fill(0))]));
Object.entries(VIIB_LAB).forEach(([dp, l]) => { const [d, p] = dp.split("|").map(Number); labOcc[l][d][p]++; });
SECS.forEach((k) => { for (const [d, p] of SLOTS) { const l = LAB_OF(TT[k][d][p]); if (l) labOcc[l][d][p]++; } });

// Cost pieces.
const dayPen = (t, d, n) => { const lo = d === 6 ? 3 : 6, hi = d === 6 ? 4 : 7; return n < lo ? (lo - n) * 40 : n > hi ? (n - hi) * 40 : 0; };
const clashPen = (c) => (c > 1 ? (c - 1) * 1000 : 0);
// Section shape: per day, subject twice at most, never back to back (Club excepted).
const secDayPen = (row) => {
  let s = 0; const cnt = {};
  row.forEach((y, p) => { const x = base(y); cnt[x] = (cnt[x] || 0) + 1; if (p && base(row[p - 1]) === x) s += 60; });
  Object.values(cnt).forEach((c) => { if (c > 2) s += (c - 2) * 200; });
  return s;
};
const total = () => {
  let s = 0;
  for (let t = 0; t < nT; t++) for (let d = 1; d <= 6; d++) { s += dayPen(t, d, dayLoad[t][d]); for (let p = 0; p < NP(d); p++) s += clashPen(occ[t][d][p]); }
  SECS.forEach((k) => { for (let d = 1; d <= 6; d++) s += secDayPen(TT[k][d]); });
  LABS.forEach((l) => { for (const [d, p] of SLOTS) s += clashPen(labOcc[l][d][p]); });
  return s;
};

// Simulated annealing: swap two cells within a section.
let cost = total(), best = cost, bestTT = JSON.stringify(TT);
const ITER = 6e6;
for (let it = 0; it < ITER && cost > 0; it++) {
  const temp = 60 * Math.pow(0.0005, it / ITER);
  const k = SECS[Math.floor(rnd() * SECS.length)], tt = TT[k];
  const [d1, p1] = SLOTS[Math.floor(rnd() * SLOTS.length)], [d2, p2] = SLOTS[Math.floor(rnd() * SLOTS.length)];
  const a = tt[d1][p1], b = tt[d2][p2];
  if (a === b || a === "Club Activities" || b === "Club Activities") continue;
  const ta = own(k, a), tb = own(k, b), la = LAB_OF(a), lb = LAB_OF(b);
  const labs = new Set([la, lb].filter(Boolean));
  const labCost = () => { let s = 0; labs.forEach((l) => { s += clashPen(labOcc[l][d1][p1]) + clashPen(labOcc[l][d2][p2]); }); return s; };
  const lmv = (l, d, p, v) => { if (l) labOcc[l][d][p] += v; };
  // Cost before.
  const touched = new Set(); [ta, tb].forEach((t) => t >= 0 && touched.add(t));
  let before = 0, after = 0;
  const secBefore = secDayPen(tt[d1]) + (d2 !== d1 ? secDayPen(tt[d2]) : 0);
  touched.forEach((t) => { before += clashPen(occ[t][d1][p1]) + clashPen(occ[t][d2][p2]) + dayPen(t, d1, dayLoad[t][d1]) + (d2 !== d1 ? dayPen(t, d2, dayLoad[t][d2]) : 0); });
  before += labCost();
  // Apply.
  const mv = (t, d, p, v) => { if (t >= 0) { occ[t][d][p] += v; dayLoad[t][d] += v; } };
  mv(ta, d1, p1, -1); mv(tb, d2, p2, -1); mv(ta, d2, p2, 1); mv(tb, d1, p1, 1);
  lmv(la, d1, p1, -1); lmv(lb, d2, p2, -1); lmv(la, d2, p2, 1); lmv(lb, d1, p1, 1);
  tt[d1][p1] = b; tt[d2][p2] = a;
  const secAfter = secDayPen(tt[d1]) + (d2 !== d1 ? secDayPen(tt[d2]) : 0);
  touched.forEach((t) => { after += clashPen(occ[t][d1][p1]) + clashPen(occ[t][d2][p2]) + dayPen(t, d1, dayLoad[t][d1]) + (d2 !== d1 ? dayPen(t, d2, dayLoad[t][d2]) : 0); });
  after += labCost();
  const delta = after - before + secAfter - secBefore;
  if (delta <= 0 || rnd() < Math.exp(-delta / temp)) {
    cost += delta;
    if (cost < best) { best = cost; bestTT = JSON.stringify(TT); }
  } else { // undo
    tt[d1][p1] = a; tt[d2][p2] = b;
    mv(ta, d2, p2, -1); mv(tb, d1, p1, -1); mv(ta, d1, p1, 1); mv(tb, d2, p2, 1);
    lmv(la, d2, p2, -1); lmv(lb, d1, p1, -1); lmv(la, d1, p1, 1); lmv(lb, d2, p2, 1);
  }
}
const OUT = JSON.parse(bestTT);
console.log("Final cost:", best);

// Check the result from scratch.
const busy = {}; let clashes = 0, shape = 0; const perDay = teachers.map(() => ({}));
Object.entries(VIIB).forEach(([d, row]) => row.forEach((x, p) => { if (x === "Mathematics" || x === "Assembly Activity") { busy[`${NEHA}|${d}|${p}`] = "VII-B"; perDay[NEHA][d] = (perDay[NEHA][d] || 0) + 1; } }));
SECS.forEach((k) => { for (const [d, p] of SLOTS) { const i = own(k, OUT[k][d][p]); if (i < 0) continue; if (busy[`${i}|${d}|${p}`]) clashes++; busy[`${i}|${d}|${p}`] = k; perDay[i][d] = (perDay[i][d] || 0) + 1; } });
SECS.forEach((k) => { for (let d = 1; d <= 6; d++) shape += secDayPen(OUT[k][d]); });
// Labs, from scratch; then the practical marks come off the subjects and go into rooms.
const inLab = {}; let labClash = 0; const rooms = { "VII-B": VIIB_LAB };
Object.entries(VIIB_LAB).forEach(([dp, l]) => (inLab[l + "|" + dp] = "VII-B"));
SECS.forEach((k) => { rooms[k] = {}; for (const [d, p] of SLOTS) { const x = OUT[k][d][p], l = LAB_OF(x); if (l) { if (inLab[l + "|" + d + "|" + p]) labClash++; inLab[l + "|" + d + "|" + p] = k; rooms[k][d + "|" + p] = l; } OUT[k][d][p] = base(x); } });
console.log("Lab clashes:", labClash);
if (labClash) { console.error("Lab clash; not writing."); process.exit(1); }
teachers.forEach((t, i) => console.log(`${t.name.padEnd(22)} free: ${[1, 2, 3, 4, 5, 6].map((d) => NP(d) - (perDay[i][d] || 0)).join(" ")}`));
console.log(`Clashes: ${clashes} · section shape penalty: ${shape}`);
if (clashes || best > 0) { console.error("Not clean; not writing."); process.exit(1); }

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
