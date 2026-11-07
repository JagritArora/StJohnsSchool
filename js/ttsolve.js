/* The timetable solver for Classes VI to XII. One copy, used in two places:
   - tools/ttplan.js (Node) builds the plan that ships in js/ttplan.js;
   - the academic planner's page runs it in a Web Worker when who-teaches-what changes.
   Rules it keeps:
   - No teacher in two rooms at once; VII-B's week is fixed and its Mathematics and Assembly
     periods are Ms. Neha Mathew's.
   - Every teacher has one or two free periods every day (Saturday has five periods).
   - A subject comes at most twice a day in a section, and not twice in a row.
   - Labs: no two classes need the same lab at once. Computer and IT are always in the computer
     lab; two Science periods a week (VI to X) are practicals in the science lab; Physics,
     Chemistry and Biology (XI-A, XII-A) have two practicals each in their own lab.
   Teachers top up a light week with Library and Value Education periods in their own sections,
   and class teachers take their section's Assembly. Seeded, so the same input gives the same week.
   In a worker: post { teachers, start?, seed?, iter? } and it posts { tick } then { done: result }. */
(function (root) {
  // ---------- Weekly periods ----------
  const MID = { English: 7, Hindi: 6, Mathematics: 7, Science: 7, "Social Science": 6, Computer: 3, Games: 2, Library: 2, Art: 1, Music: 1, "Value Education": 1, "Assembly Activity": 1, "Club Activities": 1 };
  const SEC = { English: 7, Hindi: 6, Mathematics: 8, Science: 8, "Social Science": 7, "Information Technology": 3, Games: 2, Library: 1, "Value Education": 1, "Assembly Activity": 1, "Club Activities": 1 };
  const SCI = { English: 6, Physics: 8, Chemistry: 8, Mathematics: 8, Biology: 7, "Physical Education": 4, Library: 2, "Assembly Activity": 1, "Club Activities": 1 };
  const COM = { English: 6, Accountancy: 8, "Business Studies": 7, Economics: 8, "Applied Mathematics": 8, "Physical Education": 4, Library: 2, "Assembly Activity": 1, "Club Activities": 1 };
  const SECS = ["VI-A", "VI-B", "VI-C", "VII-A", "VII-C", "VIII-A", "VIII-B", "IX-A", "IX-B", "X-A", "X-B", "XI-A", "XI-B", "XII-A", "XII-B"];
  const weekOf = (k) => /^(VI|VII|VIII)-/.test(k) ? MID : /^(IX|X)-/.test(k) ? SEC : /-A$/.test(k) ? SCI : COM;
  for (const w of [MID, SEC, SCI, COM]) { const n = Object.values(w).reduce((a, b) => a + b, 0); if (n !== 45) throw new Error("week is " + n); }
  // Periods nobody in the plan is named for (or that are shared out as top-ups).
  const SHARED = ["Games", "Library", "Art", "Music", "Value Education", "Assembly Activity", "Club Activities"];
  // The subjects one teacher takes in a section: everything in its week but the shared periods.
  const subjectsOf = (k) => Object.keys(weekOf(k)).filter((x) => !SHARED.includes(x));
  const MIN = 33, MAX = 39;

  // VII-B, fixed (js/data.js): Ms. Neha Mathew's periods there.
  const NEHA_ID = "SJS-T-0412";
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
  const LABS = ["Science lab", "Physics lab", "Chemistry lab", "Biology lab", "Computer lab"];
  // VII-B's fixed week: its Computer periods, and two of its Science periods as practicals.
  const VIIB_LAB = { "2|3": "Science lab", "4|1": "Science lab" };
  Object.entries(VIIB).forEach(([d, row]) => row.forEach((x, p) => { if (x === "Computer") VIIB_LAB[d + "|" + p] = "Computer lab"; }));
  if (VIIB[2][3] !== "Science" || VIIB[4][1] !== "Science") throw new Error("VII-B practicals moved");
  const NP = (d) => (d === 6 ? 5 : 8);
  const SLOTS = []; for (let d = 1; d <= 6; d++) for (let p = 0; p < NP(d); p++) SLOTS.push([d, p]);

  // ---------- Who teaches what ----------
  // Load: main subjects + top-ups + Assembly for class teachers + Neha's VII-B.
  const loadOf = (t) => Object.entries(t.teach).reduce((a, [k, x]) => a + weekOf(k)[x], 0)
    + Object.entries(t.top || {}).reduce((a, [k, xs]) => a + xs.reduce((b, x) => b + weekOf(k)[x], 0), 0)
    + (t.classOf ? 1 : 0) + (t.id === NEHA_ID ? 9 : 0);
  // What's wrong with a plan before it is solved: a subject with no teacher (or two), a section
  // without one class teacher, a class teacher who doesn't teach their class.
  const problems = (teachers) => {
    const out = [];
    SECS.forEach((k) => subjectsOf(k).forEach((x) => {
      const n = teachers.filter((t) => t.teach[k] === x).length;
      if (n !== 1) out.push({ kind: n ? "two" : "none", k, x, text: n ? `${k} ${x}: ${n} teachers` : `${k} ${x}: no teacher` });
    }));
    SECS.forEach((k) => { const n = teachers.filter((t) => t.classOf === k).length; if (n !== 1) out.push({ kind: "ct", k, text: n ? `${k}: ${n} class teachers` : `${k}: no class teacher` }); });
    teachers.forEach((t) => { if (t.classOf && !t.teach[t.classOf]) out.push({ kind: "ctx", k: t.classOf, id: t.id, text: `${t.name} is class teacher of ${t.classOf} but doesn't teach it` }); });
    return out;
  };
  // Games for the PE teacher, then Library and Value Education periods to whoever is light.
  // keep: { id: top } from the plan in use. Each teacher keeps the top-ups they had where they
  // still teach that class (and aren't over the most a week holds), so a change moves little.
  const prepare = (list, keep = null) => {
    const teachers = list.map((t) => ({ id: t.id, name: t.name, subject: t.subject, teach: Object.assign({}, t.teach), classOf: t.classOf || null, top: {} }));
    // The PE teacher also takes Games, wherever the week has it.
    const PE = teachers.find((t) => t.subject === "Physical Education");
    if (PE) SECS.filter((k) => weekOf(k).Games).forEach((k) => (PE.top[k] = ["Games"]));
    // Top-ups: Library and Value Education periods in a teacher's own sections, to the lightest-loaded first.
    const taken = {}; // "k|subject" → teacher
    const TOPS = ["Library", "Value Education"];
    if (keep) teachers.forEach((t) => {
      if (t === PE) return;
      Object.entries(keep[t.id] || {}).forEach(([k, xs]) => { if (!t.teach[k]) return;
        xs.forEach((x) => { if (!TOPS.includes(x) || taken[k + "|" + x] || loadOf(t) + weekOf(k)[x] > MAX) return; taken[k + "|" + x] = t; (t.top[k] = t.top[k] || []).push(x); }); });
    });
    for (let round = 0; round < 40; round++) {
      const low = teachers.filter((t) => t !== PE && t.subject !== "Computer" && loadOf(t) < MIN).sort((a, b) => loadOf(a) - loadOf(b));
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
      const short = teachers.find((t) => t !== PE && loadOf(t) < MIN);
      if (!short) break;
      let done = false;
      for (const [key, from] of Object.entries(taken)) {
        const [k, x] = key.split("|");
        if (from === short || !short.teach[k] || loadOf(from) - weekOf(k)[x] < MIN) continue;
        from.top[k].splice(from.top[k].indexOf(x), 1); if (!from.top[k].length) delete from.top[k];
        (short.top[k] = short.top[k] || []).push(x); taken[key] = short; done = true; break;
      }
      if (!done) break;
    }
    return teachers;
  };

  // ---------- Timetables ----------
  // teachers: from prepare(). start: { k: { d: [subject…] } } and rooms, to begin from a week that
  // exists (the fewest periods move); otherwise a seeded shuffle.
  const solve = (teachers, { seed = 20261107, iter = 6e6, start = null, startRooms = null, onTick = null } = {}) => {
    const ownerIx = {};
    teachers.forEach((t, i) => {
      Object.entries(t.teach).forEach(([k, x]) => (ownerIx[k + "|" + x] = i));
      Object.entries(t.top).forEach(([k, xs]) => xs.forEach((x) => (ownerIx[k + "|" + x] = i)));
      if (t.classOf) ownerIx[t.classOf + "|Assembly Activity"] = i;
    });
    const own = (k, x) => (ownerIx[k + "|" + base(x)] ?? -1);
    const NEHA = teachers.findIndex((t) => t.id === NEHA_ID);
    // Seeded random numbers.
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    // Initial fill: each section's cells in random order; Club Activities fixed at Saturday P5.
    const TT = {};
    SECS.forEach((k) => {
      if (start && start[k]) {
        const R = (startRooms && startRooms[k]) || {}, tt = {};
        for (let d = 1; d <= 6; d++) tt[d] = start[k][d].map((x, p) => (PRAC[x] && R[d + "|" + p] && R[d + "|" + p] !== "Computer lab" ? x + "*" : x));
        TT[k] = tt; return;
      }
      const bag = []; Object.entries(weekOf(k)).forEach(([x, n]) => { if (x !== "Club Activities") for (let i = 0; i < n; i++) bag.push(i < (PRAC[x] || 0) ? x + "*" : x); });
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      const tt = {}; let n = 0;
      for (let d = 1; d <= 6; d++) { tt[d] = []; for (let p = 0; p < NP(d); p++) tt[d][p] = d === 6 && p === 4 ? "Club Activities" : bag[n++]; }
      TT[k] = tt;
    });
    const FROM = JSON.stringify(TT), S0 = start ? JSON.parse(FROM) : null;
    // From a week that exists, each period away from where it was costs a little, so the rest stay put.
    const W = S0 ? 1 : 0, off = (k, d, p) => (S0 && base(TT[k][d][p]) !== base(S0[k][d][p]) ? 1 : 0);

    // Occupancy: occ[t][d][p] = how many rooms teacher t is in; VII-B's Neha periods fixed.
    const nT = teachers.length;
    const occ = Array.from({ length: nT }, () => Array.from({ length: 7 }, () => new Array(8).fill(0)));
    const dayLoad = Array.from({ length: nT }, () => new Array(7).fill(0));
    if (NEHA >= 0) Object.entries(VIIB).forEach(([d, row]) => row.forEach((x, p) => { if (x === "Mathematics" || x === "Assembly Activity") { occ[NEHA][d][p]++; dayLoad[NEHA][d]++; } }));
    SECS.forEach((k) => { for (const [d, p] of SLOTS) { const i = own(k, TT[k][d][p]); if (i >= 0) { occ[i][d][p]++; dayLoad[i][d]++; } } });
    // Labs in use: labOcc[lab][d][p].
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

    // The least the free-period rule can cost: a teacher with fewer than 33 periods, or more than
    // 39, can't have one or two free every day. The search stops when it gets there.
    const floor = dayLoad.reduce((a, row) => { const L = row.reduce((x, y) => x + y, 0); return a + (L < 33 ? (33 - L) * 40 : L > 39 ? (L - 39) * 40 : 0); }, 0);
    // Simulated annealing: swap two cells within a section. From a week that exists, start cool
    // and warm up only if needed, so only what has to move moves.
    let cost = total(), best = cost, bestTT = JSON.stringify(TT), moves = 0, bestMoves = 0;
    const STAGES = start ? [[0.6, iter * 0.25], [4, iter * 0.3], [60, iter * 0.45]] : [[60, iter]];
    let done = 0;
    for (const [T0, ITER] of STAGES) {
      for (let it = 0; it < ITER && cost > floor; it++) {
        if (onTick && (done + it) % 200000 === 0) onTick((done + it) / iter, best);
        const temp = T0 * Math.pow(0.0005, it / ITER);
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
        const secBefore = secDayPen(tt[d1]) + (d2 !== d1 ? secDayPen(tt[d2]) : 0), offBefore = W ? off(k, d1, p1) + off(k, d2, p2) : 0;
        touched.forEach((t) => { before += clashPen(occ[t][d1][p1]) + clashPen(occ[t][d2][p2]) + dayPen(t, d1, dayLoad[t][d1]) + (d2 !== d1 ? dayPen(t, d2, dayLoad[t][d2]) : 0); });
        before += labCost();
        // Apply.
        const mv = (t, d, p, v) => { if (t >= 0) { occ[t][d][p] += v; dayLoad[t][d] += v; } };
        mv(ta, d1, p1, -1); mv(tb, d2, p2, -1); mv(ta, d2, p2, 1); mv(tb, d1, p1, 1);
        lmv(la, d1, p1, -1); lmv(lb, d2, p2, -1); lmv(la, d2, p2, 1); lmv(lb, d1, p1, 1);
        tt[d1][p1] = b; tt[d2][p2] = a;
        const secAfter = secDayPen(tt[d1]) + (d2 !== d1 ? secDayPen(tt[d2]) : 0), offAfter = W ? off(k, d1, p1) + off(k, d2, p2) : 0;
        touched.forEach((t) => { after += clashPen(occ[t][d1][p1]) + clashPen(occ[t][d2][p2]) + dayPen(t, d1, dayLoad[t][d1]) + (d2 !== d1 ? dayPen(t, d2, dayLoad[t][d2]) : 0); });
        after += labCost();
        const delta = after - before + secAfter - secBefore, dm = offAfter - offBefore;
        if (delta + W * dm <= 0 || rnd() < Math.exp(-(delta + W * dm) / temp)) {
          cost += delta; moves += dm;
          if (cost < best || (cost === best && moves < bestMoves)) { best = cost; bestMoves = moves; bestTT = JSON.stringify(TT); }
        } else { // undo
          tt[d1][p1] = a; tt[d2][p2] = b;
          mv(ta, d2, p2, -1); mv(tb, d1, p1, -1); mv(ta, d1, p1, 1); mv(tb, d2, p2, 1);
          lmv(la, d2, p2, -1); lmv(lb, d1, p1, -1); lmv(la, d1, p1, 1); lmv(lb, d2, p2, 1);
        }
      }
      done += ITER;
    }
    const OUT = JSON.parse(bestTT);

    // Check the result from scratch.
    const busy = {}; let clashes = 0, shape = 0; const perDay = teachers.map(() => ({}));
    if (NEHA >= 0) Object.entries(VIIB).forEach(([d, row]) => row.forEach((x, p) => { if (x === "Mathematics" || x === "Assembly Activity") { busy[`${NEHA}|${d}|${p}`] = "VII-B"; perDay[NEHA][d] = (perDay[NEHA][d] || 0) + 1; } }));
    SECS.forEach((k) => { for (const [d, p] of SLOTS) { const i = own(k, OUT[k][d][p]); if (i < 0) continue; if (busy[`${i}|${d}|${p}`]) clashes++; busy[`${i}|${d}|${p}`] = k; perDay[i][d] = (perDay[i][d] || 0) + 1; } });
    SECS.forEach((k) => { for (let d = 1; d <= 6; d++) shape += secDayPen(OUT[k][d]); });
    // Periods that moved from the starting week (only meaningful with a start).
    const was = JSON.parse(FROM); let moved = 0;
    SECS.forEach((k) => { for (const [d, p] of SLOTS) if (base(was[k][d][p]) !== base(OUT[k][d][p])) moved++; });
    // Labs, from scratch; then the practical marks come off the subjects and go into rooms.
    const inLab = {}; let labClash = 0; const rooms = { "VII-B": VIIB_LAB };
    Object.entries(VIIB_LAB).forEach(([dp, l]) => (inLab[l + "|" + dp] = "VII-B"));
    SECS.forEach((k) => { rooms[k] = {}; for (const [d, p] of SLOTS) { const x = OUT[k][d][p], l = LAB_OF(x); if (l) { if (inLab[l + "|" + d + "|" + p]) labClash++; inLab[l + "|" + d + "|" + p] = k; rooms[k][d + "|" + p] = l; } OUT[k][d][p] = base(x); } });
    // Free periods a day, for each teacher; and anyone left without one (or with too many).
    const free = teachers.map((t, i) => [1, 2, 3, 4, 5, 6].map((d) => NP(d) - (perDay[i][d] || 0)));
    const tight = teachers.map((t, i) => ({ id: t.id, name: t.name, days: [1, 2, 3, 4, 5, 6].filter((d) => free[i][d - 1] < 1 || free[i][d - 1] > 2) })).filter((x) => x.days.length);
    return { teachers, timetables: OUT, rooms, cost: best, clashes, labClash, shape, free, tight, moved, rnd,
      loads: Object.fromEntries(teachers.map((t) => [t.id, loadOf(t)])) };
  };

  const API = { MID, SEC, SCI, COM, SECS, SHARED, MIN, MAX, NEHA_ID, VIIB, NP, weekOf, subjectsOf, loadOf, problems, prepare, solve };
  root.SJS_TT = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  // As a worker: solve and post back (the random-number function stays behind).
  if (typeof WorkerGlobalScope !== "undefined" && root instanceof WorkerGlobalScope) {
    root.onmessage = (e) => {
      const m = e.data || {}, t0 = Date.now();
      const r = solve(prepare(m.teachers, m.keep), { seed: m.seed, iter: m.iter, start: m.start, startRooms: m.rooms, onTick: (f, best) => root.postMessage({ tick: f, best }) });
      delete r.rnd; r.ms = Date.now() - t0;
      root.postMessage({ done: r });
    };
  }
})(typeof self !== "undefined" ? self : globalThis);
