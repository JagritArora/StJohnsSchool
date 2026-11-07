/* Attendance → Students: track attendance student by student, in any of the teacher's classes.
   - A list of the class, lowest first, with each student's month-by-month strip and session %.
     Find by name, filter (under 85%, 85–90%, slipping, away today) and tick several students.
   - Beside it, the ticked students month by month against the class average and the 85% line,
     with what stands out for each: the weekday they miss most, their longest run away,
     the last four weeks against the session, and the last day away.
   - Nothing ticked: the class's own month-by-month line and the students worth a look.
   Load after the staff page's own script; it does nothing for other roles. */
(() => {
  const S = window.SJS, T = S && S.staff;
  if (!T || T.role !== "teacher" || !T.classOf || !document.getElementById("at-rows")) return;
  const $ = (q) => document.querySelector(q), esc = S.esc;
  const secs = [T.classOf, ...T.sections.filter((k) => k !== T.classOf)];
  const TONES = ["var(--royal)", "var(--accent)", "var(--teal)", "var(--gold)", "var(--slate)", "var(--green)"], MAX = TONES.length;
  const WD = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  const pad = (n) => String(n).padStart(2, "0"), r1 = (v) => Math.round(v * 10) / 10;
  let sec = T.classOf, filt = "all", sort = "low", q = "";
  const picked = {}; // section → [rolls], in the order ticked (that order gives each line its colour)
  const pk = () => picked[sec] || (picked[sec] = []);

  // ---------- One student's session, worked out from the register ----------
  function dataOf(key) {
    const x = S.sectionByKey(key), today = S.todayRec(x);
    const days = Object.keys(x.history).filter((k) => k < S.todayKey).sort(); if (today) days.push(S.todayKey);
    const st = (roll, k) => (k === S.todayKey ? today.marks[roll] : x.history[k][roll]) || "P";
    const months = [...new Set(days.map((k) => k.slice(0, 7)))];
    const cut = S.iso(S.addDays(S.today, -28)), recent = days.filter((k) => k > cut);
    const rows = x.students.map((s) => {
      const by = days.map((k) => st(s.roll, k)), away = days.filter((k, i) => by[i] !== "P");
      const absent = by.filter((v) => v === "A").length, leave = by.filter((v) => v === "L").length;
      const pct = days.length ? r1(((days.length - away.length) / days.length) * 100) : 100;
      const mon = months.map((m) => { const ds = days.filter((k) => k.startsWith(m)); return ds.length ? r1((ds.filter((k) => st(s.roll, k) === "P").length / ds.length) * 100) : null; });
      const rec = recent.length ? r1((recent.filter((k) => st(s.roll, k) === "P").length / recent.length) * 100) : pct;
      // Longest run of school days away in a row.
      let run = 0, best = 0, from = null, bestFrom = null, bestTo = null;
      days.forEach((k, i) => { if (by[i] !== "P") { if (!run) from = k; run++; if (run > best) { best = run; bestFrom = from; bestTo = k; } } else run = 0; });
      // The weekday missed most, when it stands out.
      const wd = [0, 0, 0, 0, 0, 0, 0]; away.forEach((k) => wd[new Date(k + "T00:00").getDay()]++);
      const top = wd.indexOf(Math.max(...wd));
      return { s, pct, absent, leave, mon, rec, away, best, bestFrom, bestTo, wd: away.length >= 4 && wd[top] / away.length >= 0.34 ? { d: top, n: wd[top] } : null,
        todaySt: today ? st(s.roll, S.todayKey) : null };
    });
    const cls = months.map((m, i) => { const v = rows.map((r) => r.mon[i]).filter((v) => v !== null); return v.length ? r1(v.reduce((a, b) => a + b, 0) / v.length) : null; });
    const avg = rows.length ? r1(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 100;
    return { x, days, months, rows, cls, avg, today };
  }
  const slipping = (r) => r.rec <= r.pct - 5;
  const toneOf = (v) => (v < 85 ? "low" : v < 90 ? "watch" : "good");
  const FILTERS = [
    ["all", "All", () => true],
    ["low", "Under 85%", (r) => r.pct < 85],
    ["watch", "85–90%", (r) => r.pct >= 85 && r.pct < 90],
    ["slip", "Slipping", slipping],
    ["away", "Away today", (r) => r.todaySt && r.todaySt !== "P"]
  ];

  // ---------- The month-by-month chart ----------
  function chart(D, lines) {
    const n = D.months.length, nar = S.narrow(), W = nar ? 360 : 620, H = nar ? 210 : 230, pl = 34, pr = 12, pt = 12, pb = 26;
    const all = lines.flatMap((l) => l.vals).concat(D.cls).filter((v) => v !== null);
    const lo = Math.max(0, Math.min(80, Math.floor((Math.min(...all, 85) - 3) / 10) * 10)), hi = 100;
    const X = (i) => pl + (n < 2 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1)), Y = (v) => pt + ((hi - v) / (hi - lo)) * (H - pt - pb);
    const path = (vals) => vals.map((v, i) => (v === null ? null : [X(i), Y(v)])).filter(Boolean).map(([a, b], k) => `${k ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join("");
    let g = "";
    for (let v = lo; v <= hi; v += 10) g += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    g += `<line class="at-85" x1="${pl}" x2="${W - pr}" y1="${Y(85)}" y2="${Y(85)}"/><text class="at-85t" x="${W - pr}" y="${Y(85) - 5}" text-anchor="end">85% needed</text>`;
    D.months.forEach((m, i) => { if (!nar || i % 2 === (n - 1) % 2) g += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${S.fmt(m + "-01", { month: "short" })}</text>`; });
    g += `<path class="at-cls" d="${path(D.cls)}"/>`;
    lines.forEach((l) => {
      g += `<path class="at-ln" style="--s:${l.tone}" d="${path(l.vals)}"/>`;
      l.vals.forEach((v, i) => { if (v !== null) g += `<circle class="at-dot" style="--s:${l.tone}" cx="${X(i)}" cy="${Y(v)}" r="${lines.length > 3 ? 3 : 3.6}"${S.tipAttr(`${v}% present`, `${l.name} · ${S.fmt(D.months[i] + "-01", { month: "long" })}`)}/>`; });
    });
    if (!lines.length) D.cls.forEach((v, i) => { if (v !== null) g += `<circle class="at-dot" style="--s:var(--ink)" cx="${X(i)}" cy="${Y(v)}" r="3.4"${S.tipAttr(`${v}% present on average`, `${S.secName(sec)} · ${S.fmt(D.months[i] + "-01", { month: "long" })}`)}/>`; });
    return `<svg class="chart at-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Attendance month by month">${g}</svg>`;
  }

  // ---------- What stands out for one student ----------
  const day = (k) => S.fmt(k, { weekday: "short", day: "numeric", month: "short" }), dShort = (k) => S.fmt(k, { day: "numeric", month: "short" });
  function notes(r, D) {
    const out = [];
    const d = r1(r.rec - r.pct);
    out.push(`Last four weeks <b>${r.rec}%</b>${Math.abs(d) >= 2 ? `, ${d < 0 ? "down" : "up"} ${Math.abs(d)} on the session` : ", about the same as the session"}`);
    if (r.wd) out.push(`Most often away on <b>${WD[r.wd.d]}</b> (${r.wd.n} of ${r.away.length} days)`);
    if (r.best >= 2) out.push(`Longest time away: <b>${r.best} school days</b>, ${dShort(r.bestFrom)} to ${dShort(r.bestTo)}`);
    if (r.away.length) out.push(`Last away <b>${day(r.away[r.away.length - 1])}</b>`);
    else out.push("Not missed a day this session");
    if (r.pct < 85) { const need = Math.ceil((0.85 * D.days.length - (D.days.length - r.away.length)) / 0.15); out.push(`Needs about <b>${need} more days</b> without a miss to reach 85%`); }
    return out;
  }

  function render() {
    const D = dataOf(sec), f = FILTERS.find((v) => v[0] === filt) || FILTERS[0];
    const sel = pk().filter((roll) => D.rows.some((r) => r.s.roll === roll));
    picked[sec] = sel;
    // Header and tools
    $("#at-h").textContent = `${S.secName(sec)} · ${D.rows.length} students`;
    const ss = $("#at-sec"); if (ss) { ss.hidden = secs.length < 2; if (!ss.options.length) ss.innerHTML = secs.map((k) => `<option value="${k}">${esc(S.secName(k))}${k === T.classOf ? " · my class" : ""}</option>`).join(""); ss.value = sec; }
    $("#at-filt").innerHTML = FILTERS.map(([k, lab, fn]) => { const c = D.rows.filter(fn).length; return `<button type="button" class="at-f${k === filt ? " on" : ""}" data-atf="${k}" aria-pressed="${k === filt}"${k !== "all" && !c ? " disabled" : ""}>${lab} <span>${c}</span></button>`; }).join("");
    // The list
    let rows = D.rows.filter(f[2]).filter((r) => !q || r.s.name.toLowerCase().includes(q) || String(r.s.roll) === q);
    rows = [...rows].sort(sort === "roll" ? (a, b) => a.s.roll - b.s.roll : sort === "away" ? (a, b) => b.away.length - a.away.length || a.s.roll - b.s.roll : (a, b) => a.pct - b.pct || a.s.roll - b.s.roll);
    const lo = 60;
    const strip = (r) => `<span class="at-strip" aria-hidden="true">${r.mon.map((v, i) => v === null ? "" : `<i class="${toneOf(v)}" style="height:${Math.max(12, ((v - lo) / (100 - lo)) * 100)}%"${S.tipAttr(`${v}%`, S.fmt(D.months[i] + "-01", { month: "long" }))}></i>`).join("")}</span>`;
    S.paint($("#at-rows"), rows.length ? rows.map((r) => { const i = sel.indexOf(r.s.roll), on = i >= 0;
      return `<label class="at-r${on ? " on" : ""}"${on ? ` style="--s:${TONES[i]}"` : ""}><input type="checkbox" data-atr="${r.s.roll}"${on ? " checked" : ""}><span class="at-box" aria-hidden="true"></span><span class="at-roll">${pad(r.s.roll)}</span><span class="at-n"><b>${esc(r.s.name)}</b><span>${r.absent} absent${r.leave ? ` · ${r.leave} leave` : ""}${slipping(r) ? ` · <em>slipping</em>` : ""}${r.todaySt && r.todaySt !== "P" ? ` · <em>${r.todaySt === "L" ? "on leave" : "away"} today</em>` : ""}</span></span>${strip(r)}<span class="at-pc ${toneOf(r.pct)}">${r.pct}%</span></label>`; }).join("")
      : `<p class="muted at-none">No student matches.</p>`);
    // Selection bar
    const shown = rows.map((r) => r.s.roll), room = MAX - sel.length;
    $("#at-sel").innerHTML = sel.length
      ? `<span><b>${sel.length}</b> ticked${sel.length >= MAX ? ` · up to ${MAX} at a time` : ""}</span><button type="button" class="link-btn" data-atgo>See them</button><button type="button" class="link-btn" data-atclear>Clear</button>`
      : `<span class="muted">Tick students to compare them, up to ${MAX}.</span>${shown.length && shown.length <= MAX && filt !== "all" ? `<button type="button" class="link-btn" data-atall>Tick all ${shown.length}</button>` : ""}`;
    // The tracking card
    const box = $("#at-track");
    if (!sel.length) {
      const watch = D.rows.filter((r) => r.pct < 85 || slipping(r)).sort((a, b) => a.pct - b.pct).slice(0, MAX);
      const last = D.cls.filter((v) => v !== null), lastV = last[last.length - 1], prevV = last[last.length - 2];
      S.paint(box, `<div class="card-h"><h2>${esc(S.secName(sec))} month by month</h2><span class="right muted at-sub">Class average</span></div>
        <p class="at-head">${esc(S.secName(sec))} is at <b>${D.avg}%</b> this session${lastV != null && prevV != null ? `; ${S.fmt(D.months[D.months.length - 1] + "-01", { month: "long" })} so far <b>${lastV}%</b>, ${lastV >= prevV ? "up" : "down"} from ${prevV}%` : ""}.</p>
        ${chart(D, [])}
        <div class="legend"><span><i class="at-key cls"></i>Class average</span><span><i class="at-key t85"></i>85% needed</span></div>
        <div class="at-watch"><div class="at-wh"><b>Worth a look</b>${watch.length ? `<button type="button" class="btn btn-ghost btn-sm" data-atwatch>Compare these ${watch.length}</button>` : ""}</div>
        ${watch.length ? `<div class="at-wl">${watch.map((r) => `<button type="button" class="at-wi" data-atpick="${r.s.roll}"><b>${esc(r.s.name)}</b><span class="${toneOf(r.pct)}">${r.pct}%</span><small>${r.pct < 85 ? "Under 85%" : `Slipping: ${r.rec}% in the last four weeks`}</small></button>`).join("")}</div>` : `<p class="muted" style="margin:6px 0 0">Everyone is at 85% or more and holding steady.</p>`}</div>`);
      return;
    }
    const chosen = sel.map((roll, i) => ({ r: D.rows.find((v) => v.s.roll === roll), tone: TONES[i] }));
    S.paint(box, `<div class="card-h"><h2>${sel.length === 1 ? esc(chosen[0].r.s.name) : `${sel.length} students`} month by month</h2><span class="right muted at-sub">${esc(S.secName(sec))}</span></div>
      <div class="at-keys">${chosen.map(({ r, tone }) => `<button type="button" class="at-k" style="--s:${tone}" data-atr-off="${r.s.roll}" aria-label="Remove ${esc(r.s.name)}"><i></i>${esc(r.s.first || r.s.name.split(" ")[0])} <b>${r.pct}%</b><span aria-hidden="true">×</span></button>`).join("")}<span class="at-k cls"><i></i>Class ${D.avg}%</span></div>
      ${chart(D, chosen.map(({ r, tone }) => ({ name: r.s.name, tone, vals: r.mon })))}
      <div class="at-cards">${chosen.map(({ r, tone }) => `<div class="at-c" style="--s:${tone}"><div class="at-ch"><i></i><b>${esc(r.s.name)}</b><span class="at-pc ${toneOf(r.pct)}">${r.pct}%</span></div>
        <div class="at-cs">Roll ${pad(r.s.roll)} · ${D.days.length - r.away.length} of ${D.days.length} days in · ${r.absent} absent${r.leave ? `, ${r.leave} leave` : ""}</div>
        <ul>${notes(r, D).map((t) => `<li>${t}</li>`).join("")}</ul></div>`).join("")}</div>`);
  }
  S.attTrack = () => { if (S.vt.reg === "students") render(); };

  // ---------- Taps ----------
  const toggle = (roll, on) => {
    const sel = pk(), i = sel.indexOf(roll);
    if (on && i < 0) { if (sel.length >= MAX) { S.toast(`Up to ${MAX} students at a time. Untick one first.`); render(); return; } sel.push(roll); }
    if (!on && i >= 0) sel.splice(i, 1);
    render();
  };
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-atr]"); if (c) return toggle(+c.dataset.atr, c.checked);
    if (e.target.id === "at-sec") { sec = e.target.value; filt = "all"; render(); }
    if (e.target.id === "at-sort") { sort = e.target.value; render(); }
  });
  document.addEventListener("input", (e) => { if (e.target.id === "at-q") { q = e.target.value.trim().toLowerCase(); render(); } });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-atf],[data-atr-off],[data-atpick],[data-atwatch],[data-atclear],[data-atall],[data-atgo]"); if (!t) return;
    if (t.dataset.atf) { filt = t.dataset.atf; render(); }
    else if (t.dataset.atrOff) toggle(+t.dataset.atrOff, false);
    else if (t.dataset.atpick) toggle(+t.dataset.atpick, true);
    else if (t.hasAttribute("data-atwatch")) { const D = dataOf(sec); picked[sec] = D.rows.filter((r) => r.pct < 85 || slipping(r)).sort((a, b) => a.pct - b.pct).slice(0, MAX).map((r) => r.s.roll); render(); }
    else if (t.hasAttribute("data-atclear")) { picked[sec] = []; render(); }
    else if (t.hasAttribute("data-atall")) { const D = dataOf(sec), f = FILTERS.find((v) => v[0] === filt); picked[sec] = D.rows.filter(f[2]).sort((a, b) => a.pct - b.pct).slice(0, MAX).map((r) => r.s.roll); render(); }
    else if (t.hasAttribute("data-atgo")) $("#at-track").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.addEventListener("sjs:vt", (e) => { if (e.detail.key === "reg" && e.detail.v === "students") render(); });
  document.addEventListener("sjs:view", () => S.attTrack());
  addEventListener("resize", () => { clearTimeout(render.t); render.t = setTimeout(S.attTrack, 200); });
  S.attTrack();
})();
