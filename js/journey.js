/* Session journey: every assessment of the session, in order, on one card.
   Built only from the school's exam calendar (S.examsFor) and the mark for each paper
   (S.paperMark), so it follows whatever the school sets up: any number of exams, in any order,
   of any kind, marked out of any total. A test series that runs one subject a week is split
   into rounds (TS 1, TS 2 …), one round being one paper in every subject.
   Marks are shown as percentages so a 25-mark test and a 100-mark exam sit on one scale;
   the raw mark is always one tap away. */
(function () {
  const S = window.SJS;
  const KIND = {
    ly: { name: "Last year", one: "Last year", c: "slate" }, ut: { name: "Unit tests", one: "Unit test", c: "royal" }, ts: { name: "Test series", one: "Test series", c: "teal" },
    hy: { name: "Half-yearly", one: "Half-yearly", c: "gold" }, pb: { name: "Pre-boards", one: "Pre-board", c: "accent" }, fin: { name: "Final", one: "Final", c: "green" }, board: { name: "Board exam", one: "Board exam", c: "plum" }
  };
  const kindOf = (k) => KIND[k] || { name: k, one: k, c: "slate" };
  const num = (s) => (String(s).match(/\d+/) || [""])[0];
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  // Grades in plain words, with the CBSE grade beside them.
  S.word = (v) => v >= 91 ? { w: "Excellent", e: "🌟", t: "a" } : v >= 81 ? { w: "Very good", e: "😊", t: "a" } : v >= 71 ? { w: "Good", e: "🙂", t: "b" } : v >= 61 ? { w: "Fair", e: "🙂", t: "b" } : v >= 51 ? { w: "Average", e: "😐", t: "c" } : v >= 41 ? { w: "Below average", e: "😟", t: "c" } : v >= 33 ? { w: "Weak", e: "😟", t: "d" } : { w: "Needs help", e: "⚠️", t: "d" };
  const pctOf = (m) => (m && m.v != null && m.of ? Math.round((m.v / m.of) * 100) : null);

  // ---------- The model: one node per thing that gets (or will get) a result ----------
  // o.noCls skips the class averages (the class view works them out once for everyone).
  // o.only keeps just those subjects (a subject teacher sees only what they teach).
  S.journey = (me, o = {}) => {
    const G = S.groupOf(me), subs = o.only ? me.sec.subjects.filter((x) => o.only.includes(x)) : me.sec.subjects, today = S.todayKey;
    const mates = o.noCls ? [] : me.sec.students.map((st) => Object.assign(Object.create(st), st, { sec: me.sec, cls: me.cls }));
    const nodes = [];
    if (me.ly) nodes.push({ id: "ly", kind: "ly", name: "Last year's final", short: "Last year", date: S.SESSION_START, papers: [], status: "done",
      marks: Object.fromEntries(subs.filter((x) => me.ly[x] != null).map((x) => [x, { v: me.ly[x], of: 100 }])), cls: null });
    const exams = S.examsFor(me).map((e) => ({ e, ps: [...(e.papers[G] || [])].filter((p) => subs.includes(p.subj)).sort((a, b) => (a.date < b.date ? -1 : 1)) })).filter((x) => x.ps.length);
    exams.forEach(({ e, ps }) => {
      // A rolling test series becomes rounds; everything else is one node.
      const per = new Set(ps.map((p) => p.subj)).size || 1;
      const chunks = e.kind === "ts" ? Array.from({ length: Math.ceil(ps.length / per) }, (_, i) => ps.slice(i * per, i * per + per)) : [ps];
      chunks.forEach((chunk, i) => {
        const short = e.kind === "ts" ? `TS ${i + 1}` : e.kind === "ut" ? `UT ${num(e.name)}` : e.kind === "pb" ? `PB ${num(e.name)}` : e.kind === "hy" ? "Half-yearly" : e.kind === "fin" ? (/^(X|XII)$/.test(me.cls) ? "Pre-board" : "Final") : e.name;
        const marks = {}, clsM = {};
        chunk.forEach((p) => {
          const m = S.paperMark(me, e, p);
          if (m) marks[p.subj] = m;
          if (m && m.v != null && !o.noCls) { const xs = mates.map((st) => pctOf(S.paperMark(st, e, p))).filter((v) => v != null); clsM[p.subj] = avg(xs); }
        });
        const from = chunk[0].date, to = chunk[chunk.length - 1].date, sat = chunk.filter((p) => p.date < today).length;
        const got = Object.values(marks).filter((m) => m.v != null || m.ab).length;
        const status = !e.published && sat === 0 ? "draft" : sat === 0 ? "next" : sat < chunk.length ? "on" : got < chunk.length ? "pending" : "done";
        nodes.push({ id: e.id + (e.kind === "ts" ? "-" + (i + 1) : ""), exam: e, kind: e.kind, name: e.kind === "ts" ? `${e.name} · round ${i + 1}` : e.name, short, date: to, from, papers: chunk, status, marks, clsM });
      });
    });
    // Classes X and XII end with the CBSE board exam: shown ahead, filled when the result comes.
    if (/^(X|XII)$/.test(me.cls)) nodes.push({ id: "board", kind: "board", name: "CBSE board exam", short: "Boards", date: "2027-02-15", from: "2027-02-15", papers: [], status: today >= "2027-02-15" ? "pending" : "next", marks: {}, clsM: {}, note: "Results are expected in May." });
    nodes.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    nodes.forEach((n) => {
      n.pct = {}; subs.forEach((x) => { n.pct[x] = pctOf(n.marks[x]); });
      const got = subs.map((x) => n.pct[x]).filter((v) => v != null);
      n.overall = got.length ? avg(got) : null;
      const cg = subs.map((x) => (n.clsM || {})[x]).filter((v) => v != null);
      n.clsOverall = cg.length ? avg(cg) : null;
    });
    return { nodes, subs };
  };

  // One student of a section, shaped like a parent's child (S.kid) so every view above works for them.
  S.studentIn = (sec, roll) => { const s = sec.students.find((v) => v.roll === +roll); return Object.assign(Object.create(s), s, { key: `${sec.key}-${s.roll}`, sec, cls: sec.cls, label: sec.label }); };
  // The whole class as one journey: each test's mark is the class average, and each node keeps
  // every student's overall so a teacher can see who needs a look.
  S.journeyClass = (sec, only) => {
    const kids = sec.students.map((s) => S.studentIn(sec, s.roll)), per = kids.map((k) => S.journey(k, { noCls: true, only }));
    const { nodes, subs } = per[0];
    return { subs, nodes: nodes.map((n, i) => {
      const marks = {}, pct = {};
      subs.forEach((x) => { const v = avg(per.map((p) => p.nodes[i].pct[x]).filter((v) => v != null)); pct[x] = v; if (v != null) marks[x] = { v, of: 100 }; else if (n.marks[x]) marks[x] = n.marks[x]; });
      const got = subs.map((x) => pct[x]).filter((v) => v != null);
      return Object.assign({}, n, { marks, pct, clsM: {}, overall: got.length ? avg(got) : null, clsOverall: null,
        kids: per.map((p, j) => ({ s: kids[j], v: p.nodes[i].overall })).filter((k) => k.v != null).sort((a, b) => a.v - b.v) });
    }) };
  };

  // ---------- The card ----------
  const esc = (t) => S.esc(String(t));
  const SH = { Mathematics: "Maths", "Social Science": "SSt", "Information Technology": "IT", "Business Studies": "Business", "Applied Mathematics": "App. Maths", "Physical Education": "Phys. Ed.", Accountancy: "Accounts", Economics: "Eco.", "Computer Science": "Comp. Sci.", "Political Science": "Pol. Sci." };
  const short = (x) => SH[x] || x;
  const band = (v) => (v == null ? "" : v >= 91 ? "b8" : v >= 81 ? "b7" : v >= 71 ? "b6" : v >= 61 ? "b5" : v >= 51 ? "b4" : v >= 41 ? "b3" : v >= 33 ? "b2" : "b1");
  const val = (n, subj) => (subj === "all" ? n.overall : n.pct[subj]);
  const cval = (n, subj) => (subj === "all" ? n.clsOverall : (n.clsM || {})[subj]);
  const has = (n) => n.status === "done" || n.status === "on" || (n.status === "pending" && n.overall != null);
  const STATUS = { done: ["Result out", "green"], on: ["On now", "warn"], pending: ["Marks coming", "gold"], next: ["Coming up", "royal"], draft: ["On the calendar", ""] };

  let st = { kinds: null, subj: "all", sel: null, grid: false };
  // o (teachers): data (S.journeyClass), cls (the class view), title, sub, head and foot (extra html), subj (subject to open on).
  S.renderJourney = (box, me, o = {}) => {
    if (!box) return;
    box._j = { me, o };
    const { nodes, subs } = o.data || S.journey(me);
    if (!nodes.length) { box.innerHTML = ""; return; }
    const kinds = [...new Set(nodes.map((n) => n.kind))];
    if (!st.kinds || st.me !== me.key) st = { kinds: new Set(kinds), subj: subs.includes(o.subj) ? o.subj : "all", sel: st.sel || null, grid: false, me: me.key };
    const shown = nodes.filter((n) => st.kinds.has(n.kind));
    const done = shown.filter(has);
    const sel = shown.find((n) => n.id === st.sel) || done[done.length - 1] || shown[0];
    const subj = st.subj;

    // Headline numbers.
    const first = done.find((n) => val(n, subj) != null), last = [...done].reverse().find((n) => val(n, subj) != null);
    const best = done.filter((n) => val(n, subj) != null).sort((a, b) => val(b, subj) - val(a, subj))[0];
    const next = nodes.find((n) => n.status === "next" || n.status === "on" || n.status === "draft");
    const days = next ? Math.max(0, Math.round((new Date(next.from + "T00:00") - S.today) / 864e5)) : 0;
    const d = first && last && first !== last ? val(last, subj) - val(first, subj) : null;
    // Plain words first: a one-line story, then three big tiles. Everything else is a tap away.
    const lw = last ? S.word(val(last, subj)) : null, who = subj === "all" ? "" : ` in ${short(subj)}`;
    const trend = d == null ? "" : d >= 3 ? `. Marks are <b class="up">getting better</b> (▲ ${d} since ${esc(first.short)})` : d <= -3 ? `. Marks have <b class="dn">gone down</b> (▼ ${-d} since ${esc(first.short)})` : `. Marks are <b>steady</b> since ${esc(first.short)}`;
    const nextTxt = next ? `${esc(next.name)} ${next.status === "on" ? "is <b>on now</b>" : days === 0 ? "is <b>today</b>" : days === 1 ? "is <b>tomorrow</b>" : `is in <b>${days} days</b>`}` : "All tests this session are done";
    const story = last ? `<div class="sj-story t-${lw.t}"><span class="face" aria-hidden="true">${lw.e}</span><p><b>${esc(me.first)}</b>'s ${o.cls ? "class average" : "latest result"}${who} is <b>${lw.w.toLowerCase()}</b>: <b>${val(last, subj)}%</b> in the ${esc(last.name.replace(/ exams?$/i, ""))}${trend}.<span>${nextTxt}.</span></p></div>` : `<div class="sj-story"><span class="face" aria-hidden="true">📅</span><p>No results yet this session.<span>${nextTxt}.</span></p></div>`;
    const tiles = `<div class="sj-tiles">
      <div class="tl-last t-${lw ? lw.t : "n"}"><small>Last result${last ? " · " + esc(last.short) : ""}</small><b>${last ? val(last, subj) + "%" : "–"}</b><span>${lw ? `${lw.e} ${lw.w} · ${S.grade(val(last, subj))}` : ""}</span></div>
      <div class="tl-trend ${d > 0 ? "t-up" : d < 0 ? "t-dn" : ""}"><small>Since ${first ? esc(first.short) : "the start"}</small><b>${d == null ? "–" : (d > 0 ? "▲ " : d < 0 ? "▼ " : "") + Math.abs(d)}</b><span>${d == null ? "" : d > 0 ? "marks more" : d < 0 ? "marks less" : "same as before"}${best ? ` · best ${val(best, subj)}% in ${esc(best.short)}` : ""}</span></div>
      <div class="tl-next"><small>Next test</small><b class="sm">${next ? esc(next.short) : "None"}</b><span>${next ? (next.status === "on" ? "On now" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days · ${S.fmt(next.from, { day: "numeric", month: "short" })}`) : "All done"} · ${nodes.filter(has).length} of ${nodes.length} results out</span></div>
    </div>`;
    const filters = `<details class="sj-fd"><summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>${st.kinds.size < kinds.length ? `Tests <em>${st.kinds.size} of ${kinds.length}</em>` : "All tests"}</summary><div class="sj-f" role="group" aria-label="Which kinds of test">${kinds.map((k) => { const n = nodes.filter((x) => x.kind === k).length; return `<button type="button" class="k-${kindOf(k).c}${st.kinds.has(k) ? " on" : ""}" data-jk="${k}" aria-pressed="${st.kinds.has(k)}"><i></i>${esc(kindOf(k).name)}<small>${n}</small></button>`; }).join("")}</div></details>`;
    const subjBar = subs.length < 2 ? "" : `<label class="sj-fld sj-sub"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z"/></svg><select data-jsel aria-label="Subject"><option value="all">All subjects</option>${subs.map((x) => `<option value="${esc(x)}"${subj === x ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;

    // Reset view: every kind of test, the subject it opened on, the latest result, no table.
    const allDone = nodes.filter(has), defSel = (allDone[allDone.length - 1] || nodes[0]).id;
    const moved = st.kinds.size < kinds.length || subj !== (subs.includes(o.subj) ? o.subj : "all") || st.grid || (st.sel && st.sel !== defSel);
    const reset = `<button type="button" class="sj-reset" data-jreset${moved ? "" : " disabled"} title="All tests, ${subs.includes(o.subj) ? short(o.subj) : "all subjects"} and the latest result"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4.2h4.2"/></svg>Reset view</button>`;
    // The title and the filters share one header that stays in view while the card scrolls past.
    S.paint(box, `<div class="card sj">
      <div class="sj-top"><div class="sj-h"><div><h2>${esc(o.title || me.first + "'s year so far")}</h2><p>${o.sub || "Every test this session, in order."}</p></div></div>
      <div class="sj-bar">${o.head || ""}<div class="sj-tools">${subjBar}${filters}${o.foot || ""}<button type="button" class="sj-more${st.grid ? " on" : ""}" data-jgrid aria-expanded="${st.grid}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15"/></svg>${st.grid ? "Hide table" : "Every mark"}<span>${done.length} × ${subs.length}</span></button>${reset}</div></div></div>
      ${story}${tiles}
      <div class="sj-main">
        <div class="sj-pane"><p class="sj-step"><b>1</b> Every test, in order <span>Tap a bar</span></p>${bars(shown, subj, sel, me, o)}</div>
        <div class="sj-pane sj-detail"><p class="sj-step"><b>2</b> Subject by subject</p>${detail(sel, subs, me, nodes, o)}</div>
      </div>
      ${st.grid ? grid(done, subs, sel) : ""}
      <p class="sj-note">Tests are marked out of 20, 25 or 100, so marks are shown as a percentage to compare them fairly.</p>
    </div>`);
    const rl = box.querySelector(".sj-bars .on"); if (rl) rl.parentElement.scrollLeft = rl.offsetLeft - rl.parentElement.clientWidth / 2 + rl.clientWidth / 2;
    box._sel = sel && sel.id;
    stick();
  };

  // While the header is pinned it slims down (no subtitle); a matching margin keeps the page from jumping.
  function stick() {
    const pb = document.querySelector(".pbar"), h = pb ? pb.offsetHeight : 0;
    document.documentElement.style.setProperty("--pbar-h", h + "px");
    document.querySelectorAll(".sj-top").forEach((t) => {
      const card = t.parentElement, r = card.getBoundingClientRect(), on = r.top < h - 2 && r.bottom > h + 90;
      if (on === t.classList.contains("stuck")) return;
      const before = t.offsetHeight; t.classList.toggle("stuck", on); t.style.marginBottom = "";
      if (on) t.style.marginBottom = parseFloat(getComputedStyle(t).marginBottom) + before - t.offsetHeight + "px";
    });
  }
  addEventListener("scroll", stick, { passive: true });
  addEventListener("resize", stick);

  // One bar per test, coloured by how good the mark is. Tap a bar to open that test.
  function bars(shown, subj, sel, me, o) {
    let todayDone = false;
    const cols = shown.map((n, i) => {
      const v = val(n, subj), c = cval(n, subj), ok = has(n) && v != null, w = ok ? S.word(v) : null;
      const prev = [...shown.slice(0, i)].reverse().find((p) => has(p) && val(p, subj) != null), dl = ok && prev ? v - val(prev, subj) : null;
      let sep = "";
      if (!ok && !todayDone && shown.slice(0, i).some(has)) { todayDone = true; sep = `<div class="sj-today" aria-hidden="true"><span>Today</span></div>`; }
      const [lab] = STATUS[n.status];
      return sep + `<button type="button" class="sj-col${ok ? " t-" + w.t : " fut"}${n === sel ? " on" : ""}" data-jn="${n.id}" style="--i:${i}" aria-label="${esc(n.name)}${ok ? ": " + v + "%" : ", " + lab}">
        <span class="top">${ok ? `<b>${v}%</b>` : `<small>${esc(lab)}</small>`}</span>
        <span class="well">${ok ? `<i style="--h:${v}%"><em>${w.e}</em></i>` : ""}${c != null && ok ? `<u style="--c:${c}%" title="Class average ${c}%"></u>` : ""}</span>
        <span class="nm"><i class="k-${kindOf(n.kind).c}"></i>${esc(n.short)}</span>
        <span class="dt">${dl != null && dl !== 0 ? `<em class="${dl > 0 ? "up" : "dn"}">${dl > 0 ? "▲" : "▼"} ${Math.abs(dl)}</em>` : S.fmt(n.date, { day: "numeric", month: "short" })}</span>
      </button>`;
    }).join("");
    return `<div class="sj-bars" role="list">${cols}</div>
      <div class="sj-key"><span><i class="t-a"></i>Very good, excellent</span><span><i class="t-b"></i>Good, fair</span><span><i class="t-c"></i>Average</span><span><i class="t-d"></i>Weak, needs help</span>${o.cls ? "" : "<span><u></u>Class average</span>"}</div>`;
  }

  function detail(n, subs, me, all, o) {
    if (!n) return "";
    const [lab, tone] = STATUS[n.status], k = kindOf(n.kind);
    const when = n.from && n.from !== n.date ? `${S.fmt(n.from, { day: "numeric", month: "short" })} – ${S.fmt(n.date, { day: "numeric", month: "short", year: "numeric" })}` : S.fmt(n.date, { day: "numeric", month: "short", year: "numeric" });
    let h = `<div class="sj-dh"><span class="sj-tag k-${k.c}"><i></i>${esc(k.one)}</span><h3>${esc(n.name)}</h3><span class="muted">${when}</span><span class="pill ${tone}">${lab}</span></div>`;
    if (n.status === "draft" || n.status === "next" || (n.kind === "board" && n.overall == null)) {
      const ps = n.papers || [];
      return h + `<div class="sj-wait">${n.note ? `<p>${esc(n.note)}</p>` : ""}${n.status === "draft" ? "<p>The datesheet isn't out yet. It appears here, paper by paper, when the school publishes it.</p>" : ps.length ? `<ul class="sj-ds">${ps.map((p) => `<li><b>${S.fmt(p.date, { weekday: "short", day: "numeric", month: "short" })}</b>${esc(p.subj)}</li>`).join("")}</ul>` : ""}</div>`;
    }
    const prev = all.slice(0, all.indexOf(n)).reverse().find((p) => has(p) && p.overall != null);
    const same = all.slice(0, all.indexOf(n)).reverse().find((p) => p.kind === n.kind && has(p) && p.overall != null);
    const cmp = (p, w) => (p && n.overall != null ? `<span class="${n.overall - p.overall >= 0 ? "up" : "dn"}">${n.overall - p.overall >= 0 ? "▲ +" : "▼ −"}${Math.abs(n.overall - p.overall)}</span> vs ${w} ${esc(p.short)}` : "");
    const ofs = [...new Set(Object.values(n.marks).map((m) => m.of).filter(Boolean))];
    h += `<div class="sj-sum"><div class="big"><b>${n.overall != null ? n.overall + "%" : "–"}</b><span>${n.overall != null ? `${S.word(n.overall).e} ${S.word(n.overall).w} · grade ${S.grade(n.overall)}` : ""}${n.clsOverall != null ? ` · class average ${n.clsOverall}%` : ""}</span></div><div class="cmp">${[cmp(prev, "the last test,"), same && same !== prev ? cmp(same, "the last " + k.one.toLowerCase() + ",") : ""].filter(Boolean).map((t) => `<p>${t}</p>`).join("")}${ofs.length ? `<p class="muted">Marked out of ${ofs.join(" and ")} per paper</p>` : ""}</div></div>`;
    h += `<div class="sj-subs">${subs.map((x) => {
      const m = n.marks[x], v = n.pct[x], c = (n.clsM || {})[x];
      if (!m) return `<div class="sj-r ${(n.papers || []).some((p) => p.subj === x) ? "wait" : "na"}"><span>${esc(x)}</span><em>${(n.papers || []).some((p) => p.subj === x) ? "Paper still to come" : "Not in this test"}</em></div>`;
      if (m.ab) return `<div class="sj-r ab"><span>${esc(x)}</span><em>Absent</em></div>`;
      if (m.v == null) return `<div class="sj-r wait"><span>${esc(x)}</span><em>${m.wait ? "Being marked" : "Paper still to come"}</em></div>`;
      return `<div class="sj-r${c != null && v < c - 5 ? " low" : ""}"><span>${esc(x)}${c != null && v < c - 5 ? '<em class="flag">Needs attention</em>' : ""}</span><div class="bar"><i class="t-${S.word(v).t}" style="width:${v}%"></i>${c != null ? `<u style="left:${c}%" title="Class average ${c}%"></u>` : ""}</div><b>${m.v}<small>/${m.of}</small></b><span class="g t-${S.word(v).t}" title="${S.word(v).w}">${S.grade(v)}</span></div>`;
    }).join("")}</div>`;
    // The class view: who to look at after this test. Tap a name for that student's year.
    if (o.cls && n.kids && n.kids.length) {
      const low = n.kids.filter((k) => k.v < 50), top = [...n.kids].reverse().slice(0, 3);
      const chip = (k) => `<button type="button" class="sj-kid t-${S.word(k.v).t}" data-jstu="${k.s.roll}"><b>${esc(k.s.name)}</b><span>${k.v}%</span></button>`;
      h += `<div class="sj-kids"><p><b>${low.length ? `${low.length} under 50%` : "Nobody under 50% · lowest three"}</b><span>Tap a name to open their year</span></p><div>${(low.length ? low : n.kids.slice(0, 3)).map(chip).join("")}</div><p><b>Top of the class</b></p><div>${top.map(chip).join("")}</div></div>`;
    }
    return h;
  }

  function grid(done, subs, sel) {
    if (!done.length) return "";
    const row = (lbl, f) => `<tr><th>${lbl}</th>${done.map((n) => { const v = f(n), m = n; return `<td class="${band(v)}${n === sel ? " on" : ""}">${v == null ? "·" : v}</td>`; }).join("")}<td class="sp">${S.spark ? S.spark(done.map(f).map((v) => (v == null ? null : v)).filter((v) => v != null), { tone: "var(--royal)", w: 64, h: 20, label: lbl }) : ""}</td></tr>`;
    return `<div class="sj-grid"><table><thead><tr><th>Subject</th>${done.map((n) => `<th class="k-${kindOf(n.kind).c}${n === sel ? " on" : ""}" data-jn="${n.id}"><i></i>${esc(n.short)}</th>`).join("")}<th>Trend</th></tr></thead><tbody>
      ${subs.map((x) => row(esc(short(x)), (n) => n.pct[x])).join("")}${subs.length > 1 ? row("<b>Overall</b>", (n) => n.overall) : ""}</tbody></table>
      <p class="sj-legend">${["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"].map((b, i) => `<span class="${b}">${["E", "D", "C2", "C1", "B2", "B1", "A2", "A1"][i]}</span>`).join("")}<small>Each cell is the mark as a percentage, coloured by CBSE grade</small></p></div>`;
  }

  // The report card a parent downloads: every test of the session, in plain words and colour.
  S.reportCardFull = (me, o = {}) => {
    const { nodes, subs } = S.journey(me), done = nodes.filter((n) => has(n) && n.overall != null);
    const last = done[done.length - 1], lw = last ? S.word(last.overall) : null, att = S.attendancePct(me.roll);
    const C = { a: "#1E9A52", b: "#2F6FD6", c: "#C98A0B", d: "#D2412F" }, F = { a: "#E3F5EA", b: "#E5EEFC", c: "#FBF1DC", d: "#FBE5E2" };
    const cell = (v) => v == null ? `<td class="n" style="color:#9aa0a6">–</td>` : `<td class="n" style="background:${F[S.word(v).t]};color:${C[S.word(v).t]};font-weight:700">${v}</td>`;
    const final = last && S.PHASE === "end";
    const hero = `<div style="display:flex;gap:14px;align-items:center;margin:14px 0;padding:14px 16px;border-radius:12px;background:${lw ? F[lw.t] : "#f3f4f6"};border:1px solid ${lw ? C[lw.t] : "#dfe1e4"}33">
      <div style="font-size:30px">${lw ? lw.e : "📅"}</div><div><div style="font-size:18px;font-weight:800;color:${lw ? C[lw.t] : "#1d2228"}">${o.result ? S.esc(o.result) : last ? `${lw.w}: ${last.overall}% in the ${S.esc(last.name)}` : "No results yet"}</div>
      <div class="muted">${last ? `Grade ${S.grade(last.overall)}${last.clsOverall != null ? ` · class average ${last.clsOverall}%` : ""} · attendance ${att}%` : ""}</div></div></div>`;
    const kv = `<div class="kv"><div><b style="color:${lw ? C[lw.t] : "inherit"}">${last ? last.overall + "%" : "–"}</b>${last ? S.esc(last.short) : "Latest"} overall</div><div><b>${last ? S.grade(last.overall) : "–"}</b>Overall grade</div><div><b>${att}%</b>Attendance</div><div><b>${done.length} of ${nodes.length}</b>Tests with results</div></div>`;
    const table = `<h2>Marks in every test (%)</h2><table style="font-size:12px"><thead><tr><th>Subject</th>${done.map((n) => `<th class="n">${S.esc(n.short)}<br><span style="font-weight:400">${S.fmt(n.date, { day: "numeric", month: "short" })}</span></th>`).join("")}<th class="n">Grade</th></tr></thead><tbody>` +
      subs.map((x) => `<tr><td>${S.esc(x)}</td>${done.map((n) => cell(n.pct[x])).join("")}<td class="n"><b>${last && last.pct[x] != null ? S.grade(last.pct[x]) : "–"}</b></td></tr>`).join("") +
      `<tr><td><b>Overall</b></td>${done.map((n) => cell(n.overall)).join("")}<td class="n"><b>${last ? S.grade(last.overall) : "–"}</b></td></tr></tbody></table>`;
    const latest = last ? `<h2>${S.esc(last.name)}, subject by subject</h2><table><thead><tr><th>Subject</th><th class="n">Marks</th><th class="n">%</th><th class="n">Class avg</th><th>How it went</th></tr></thead><tbody>${subs.map((x) => { const m = last.marks[x], v = last.pct[x]; if (v == null) return `<tr><td>${S.esc(x)}</td><td class="n muted" colspan="4">–</td></tr>`; const w = S.word(v), c = (last.clsM || {})[x]; return `<tr><td>${S.esc(x)}</td><td class="n">${m.v}/${m.of}</td><td class="n"><b>${v}</b></td><td class="n muted">${c != null ? c : "–"}</td><td><span style="display:inline-block;padding:1px 8px;border-radius:20px;background:${F[w.t]};color:${C[w.t]};font-weight:700">${w.e} ${w.w} · ${S.grade(v)}</span>${c != null && v < c - 5 ? ' <span style="color:#D2412F;font-weight:700">Needs attention</span>' : ""}</td></tr>`; }).join("")}</tbody></table>` : "";
    const key = `<p class="foot">${["a", "b", "c", "d"].map((k, i) => `<span style="display:inline-block;margin-right:10px"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${C[k]};vertical-align:-1px"></span> ${["Very good, excellent (A1, A2)", "Good, fair (B1, B2)", "Average (C1, C2)", "Weak, needs help (D, E)"][i]}</span>`).join("")}<br>Tests are marked out of 20, 25 or 100, so every mark is shown as a percentage.</p>`;
    return S.docHead(`Report card · Session 2026–27${final ? " · Final result" : " · so far"}`) +
      `<table><tr><td><b style="font-size:15px">${S.esc(me.name)}</b><br><span class="muted">Class ${S.esc(me.sec.label)}${me.sec.stream ? " · " + S.esc(me.sec.stream) : ""} · Roll ${String(me.roll).padStart(2, "0")}</span></td><td class="n">Class teacher<br><b>${S.esc(me.sec.teacher)}</b></td></tr></table>` +
      hero + kv + table + latest +
      (o.remark ? `<h2>Class teacher's remark</h2><p>${S.esc(o.remark)}</p>` : "") +
      `<div class="sig"><span>Class teacher</span><span>Principal</span><span>Parent</span></div>` + key +
      `<p class="foot">Grades on the CBSE eight-point scale. Made from the marks in the school app on ${S.fmt(S.todayKey, { day: "numeric", month: "long", year: "numeric" })}. Prototype: sample marks.</p>`;
  };

  // One listener for the whole card.
  document.addEventListener("click", (e) => {
    const box = e.target.closest("#sj"); if (!box) return;
    const t = e.target.closest("[data-jk],[data-js],[data-jn],[data-jgrid],[data-jstu],[data-jreset]"); if (!t) return;
    const j = box._j || { me: S.me, o: {} };
    if (t.dataset.jreset != null) { st.kinds = null; st.sel = null; S.renderJourney(box, j.me, j.o); if (S.onJourneyPick && box._sel) S.onJourneyPick(box._sel); return; }
    if (t.dataset.jstu) { if (j.o.onStudent) j.o.onStudent(+t.dataset.jstu); return; }
    if (t.dataset.jk) { const k = t.dataset.jk; if (st.kinds.has(k) && st.kinds.size > 1) st.kinds.delete(k); else st.kinds.add(k); }
    else if (t.dataset.js) st.subj = t.dataset.js;
    else if (t.dataset.jn) { st.sel = t.dataset.jn; if (S.onJourneyPick) S.onJourneyPick(st.sel); }
    else st.grid = !st.grid;
    S.renderJourney(box, j.me, j.o);
  });
  document.addEventListener("change", (e) => { const t = e.target; if (!t.matches || !t.matches("#sj [data-jsel]")) return; const box = t.closest("#sj"), j = box._j || { me: S.me, o: {} }; st.subj = t.value; S.renderJourney(box, j.me, j.o); });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.closest && e.target.closest("#sj [data-jn]")) e.target.closest("[data-jn]").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
})();
