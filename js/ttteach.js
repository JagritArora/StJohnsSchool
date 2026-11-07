/* My timetable (teachers): the week period by period, and follow-ups planned against real classes.
   - The week Mon–Sat: each period the teacher takes, coloured by section; free periods quiet;
     holidays and Sundays shown as such; today's column marked. Back and forward a week at a time.
   - Tap a class to plan for it: what's due from that section that day (homework set by this
     teacher), follow-ups for that very period, quick ideas, and a jump to the section's next class.
   - Nothing picked: what's coming up (follow-ups by date) and the next class with each section.
   Follow-ups are saved in the demo's own state, so they stay put on refresh.
   Phones: one day at a time, with the days as tabs. Load after the staff page's own script. */
(() => {
  const S = window.SJS, T = S && S.staff;
  if (!T || T.role !== "teacher" || !document.getElementById("ttt-view")) return;
  const $ = (q) => document.querySelector(q), esc = S.esc, SUBJ = T.subject;
  const mine = [T.classOf, ...T.sections.filter((k) => k !== T.classOf)].filter(Boolean);
  const TONE = {}; ["var(--accent)", "var(--royal)", "var(--teal)", "var(--gold)", "var(--slate)"].forEach((c, i) => mine[i] && (TONE[mine[i]] = c));
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const IDEAS = ["Collect homework", "Check corrections", "Re-test the ones who missed", "Remind about the test", "Return answer sheets", "Finish the chapter"];
  const store = () => { const f = S.state.follow || (S.state.follow = {}); return f[T.id] || (f[T.id] = []); };
  let week = 0, sel = null, dayIx = null; // sel: { k: dateKey, p, sec }

  const monday = (w) => { const d = new Date(S.today); const g = d.getDay() || 7; return S.addDays(d, 1 - g + w * 7); };
  const daysOf = (w) => DAYS.map((_, i) => S.addDays(monday(w), i));
  // Every period the teacher takes, from the school's plan: their subject, and any Library, Value Education or Assembly periods.
  let WK = null; const wk = () => WK || (WK = S.teachWeek(T));
  const at = (d, p) => wk()[d.getDay() + "|" + p] || null;
  const secAt = (d, p) => { const x = at(d, p); return x ? x.k : null; };
  // A small line under the section: the period's subject when it isn't the teacher's main one, and "Your class".
  // One short line: the other subject if it's not the main one, else "Your class".
  const SHORTS = { "Assembly Activity": "Assembly", "Value Education": "Value Ed.", "Information Technology": "IT", "Social Science": "Social Sc.", "Business Studies": "Business St.", "Physical Education": "PE" };
  // A lab, where the period is a practical (the computer teacher is always in the lab, so not for them).
  const noteAt = (d, p, sec) => { const x = at(d, p), lab = SUBJ !== "Computer" && S.roomOf ? S.roomOf(sec, d.getDay(), p) : null;
    const n = x && x.subj !== SUBJ ? SHORTS[x.subj] || x.subj : sec === T.classOf ? "Your class" : "";
    return lab ? (n && n !== "Your class" ? n + " · lab" : lab) : n; };
  const hwDue = (key, sec) => S.secState(sec).homework.filter((h) => h.by === T.name && h.due === key);
  const fuOf = (key, p, sec) => store().filter((f) => f.k === key && f.p === p && f.sec === sec);
  const nextClass = (sec, after) => { // the next period with this section after date key `after` (exclusive of that period)
    let d = new Date(after.k + "T00:00");
    for (let n = 0; n < 40; n++) { const key = S.iso(d), lim = S.periodsOn(d);
      for (let p = 0; p < lim; p++) { if (key === after.k && p <= after.p) continue; if (after.live && isOver(key, p)) continue; if (secAt(d, p) === sec) return { k: key, p, sec }; }
      d = S.addDays(d, 1); }
    return null;
  };
  // Periods already over: earlier days, and today's periods whose end time has passed.
  const mins = (t) => { let [h, m] = t.split(":").map(Number); if (h < 7) h += 12; return h * 60 + m; };
  const isOver = (k, p) => { if (k !== S.todayKey) return k < S.todayKey; const n = new Date(); return S.iso(n) !== S.todayKey || n.getHours() * 60 + n.getMinutes() >= mins(S.ENDS[p]); };
  const when = (k, p) => `${S.fmt(k, { weekday: "short", day: "numeric", month: "short" })} · P${p + 1}, ${S.periodTimes[p]}`;

  function grid(days) {
    const maxP = Math.max(...days.map((d) => S.periodsOn(d)), 5);
    const head = days.map((d, i) => { const key = S.iso(d), hol = S.HOLIDAYS[key];
      return `<div class="ttt-dh${key === S.todayKey ? " today" : ""}${hol ? " off" : ""}"><b>${DAYS[i]}</b><span>${S.fmt(key, { day: "numeric", month: "short" })}</span></div>`; }).join("");
    let cells = "";
    for (let p = 0; p < maxP; p++) {
      if (p === 4) { cells += `<div class="ttt-pt brk"><b>Break</b><span>10:40</span></div>`; days.forEach((d) => { if (!S.HOLIDAYS[S.iso(d)]) cells += `<div class="ttt-bc"></div>`; }); }
      cells += `<div class="ttt-pt"><b>P${p + 1}</b><span>${S.periodTimes[p]}</span></div>`;
      days.forEach((d) => {
        const key = S.iso(d), hol = S.HOLIDAYS[key], lim = S.periodsOn(d), past = isOver(key, p);
        if (hol) { cells += p === 0 ? `<div class="ttt-hol" style="grid-row: span ${maxP + (maxP > 4 ? 1 : 0)}"><span>${esc(hol)}</span></div>` : ""; return; }
        if (p >= lim) { cells += `<div class="ttt-c none"></div>`; return; }
        const sec = secAt(d, p);
        if (!sec) { cells += `<div class="ttt-c free${past ? " past" : ""}"><span>Free</span></div>`; return; }
        const fu = fuOf(key, p, sec), hw = hwDue(key, sec), on = sel && sel.k === key && sel.p === p;
        const open = fu.filter((f) => !f.done).length;
        cells += `<button type="button" class="ttt-c mine${past ? " past" : ""}${on ? " on" : ""}${key === S.todayKey ? " today" : ""}" style="--s:${TONE[sec] || "var(--slate)"}" data-tt="${key}|${p}|${sec}" aria-label="${esc(S.secName(sec))}, ${when(key, p)}${fu.length ? `, ${fu.length} follow-up${fu.length === 1 ? "" : "s"}` : ""}">
          <b>${esc(S.secName(sec))}</b>${noteAt(d, p, sec) ? `<small>${esc(noteAt(d, p, sec))}</small>` : ""}
          <span class="ttt-tags">${hw.length ? `<i class="hw">Homework due</i>` : ""}${fu.length ? `<i class="fu${open ? "" : " done"}">${open ? `${open} to follow up` : "✓ followed up"}</i>` : ""}</span></button>`;
      });
    }
    return `<div class="ttt-grid" style="--days:${days.length}"><div class="ttt-corner"></div>${head}${cells}</div>`;
  }

  // Phones: one day, the periods down the page.
  function dayList(days) {
    if (dayIx === null) { const t = days.findIndex((d) => S.iso(d) === S.todayKey); dayIx = t >= 0 ? t : 0; }
    const d = days[dayIx], key = S.iso(d), hol = S.HOLIDAYS[key], lim = S.periodsOn(d);
    const tabs = `<div class="ttt-days" role="tablist">${days.map((x, i) => { const k = S.iso(x), n = Array.from({ length: S.periodsOn(x) }, (_, p) => secAt(x, p)).filter(Boolean).length;
      return `<button type="button" role="tab" aria-selected="${i === dayIx}" class="${i === dayIx ? "on" : ""}${k === S.todayKey ? " today" : ""}" data-ttday="${i}"><b>${DAYS[i]}</b><span>${S.fmt(k, { day: "numeric" })}</span><small>${S.HOLIDAYS[k] ? "Off" : `${n} class${n === 1 ? "" : "es"}`}</small></button>`; }).join("")}</div>`;
    if (hol) return tabs + `<div class="ttt-off">${esc(hol)}: no school.</div>`;
    const rows = Array.from({ length: lim }, (_, p) => { const sec = secAt(d, p);
      if (!sec) return `<div class="ttt-r free"><span class="ttt-pt"><b>P${p + 1}</b><span>${S.periodTimes[p]}</span></span><span>Free</span></div>`;
      const fu = fuOf(key, p, sec), hw = hwDue(key, sec), open = fu.filter((f) => !f.done).length;
      return `<button type="button" class="ttt-r mine${sel && sel.k === key && sel.p === p ? " on" : ""}" style="--s:${TONE[sec] || "var(--slate)"}" data-tt="${key}|${p}|${sec}"><span class="ttt-pt"><b>P${p + 1}</b><span>${S.periodTimes[p]}</span></span><b>${esc(S.secName(sec))}${noteAt(d, p, sec) ? ` <small>${esc(noteAt(d, p, sec))}</small>` : ""}</b><span class="ttt-tags">${hw.length ? `<i class="hw">Homework due</i>` : ""}${fu.length ? `<i class="fu${open ? "" : " done"}">${open ? `${open} to follow up` : "✓"}</i>` : ""}</span></button>`; }).join("");
    return tabs + `<div class="ttt-rows">${rows}</div>`;
  }

  function side() {
    if (sel) {
      const { k, p, sec } = sel, fu = fuOf(k, p, sec), hw = hwDue(k, sec), nx = nextClass(sec, sel);
      return `<div class="card-h"><h2><i class="ttt-sw" style="--s:${TONE[sec] || "var(--slate)"}"></i>${esc(S.secName(sec))}</h2><button type="button" class="right link-btn" data-ttclose>Back to the week</button></div>
        <p class="ttt-when">${when(k, p)} to ${S.ENDS[p]}</p>
        ${hw.length ? `<div class="ttt-due">${hw.map((h) => `<div><b>Homework due</b><span>${esc(h.title)}</span></div>`).join("")}</div>` : ""}
        <div class="ttt-k">Follow-ups for this class</div>
        <div class="ttt-fl">${fu.length ? fu.map((f) => `<label class="ttt-f${f.done ? " done" : ""}"><input type="checkbox" data-ttdone="${f.id}"${f.done ? " checked" : ""}><span>${esc(f.text)}</span><button type="button" class="ttt-x" data-ttdel="${f.id}" aria-label="Remove">×</button></label>`).join("") : `<p class="muted ttt-none">Nothing planned for this class yet.</p>`}</div>
        <form class="ttt-add" id="ttt-add"><input class="input" id="ttt-in" autocomplete="off" placeholder="e.g. Collect Exercise 4.2" aria-label="New follow-up" /><button class="btn btn-primary btn-sm" type="submit">Add</button></form>
        <div class="ttt-ideas">${IDEAS.map((t) => `<button type="button" class="ttt-idea" data-ttidea="${esc(t)}">${esc(t)}</button>`).join("")}</div>
        ${nx ? `<button type="button" class="ttt-next" data-tt="${nx.k}|${nx.p}|${nx.sec}"><span>Next ${esc(S.secName(sec))} class</span><b>${when(nx.k, nx.p)}</b><i aria-hidden="true">→</i></button>` : ""}`;
    }
    const up = store().filter((f) => !f.done && f.k >= S.todayKey).sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.p - b.p));
    const now = { k: S.todayKey, p: -1, live: true };
    const nexts = mine.map((sec) => ({ sec, n: nextClass(sec, now) })).filter((x) => x.n);
    const days = daysOf(week), cnt = days.reduce((a, d) => a + Array.from({ length: S.periodsOn(d) }, (_, p) => secAt(d, p)).filter(Boolean).length, 0);
    const slots = days.reduce((a, d) => a + S.periodsOn(d), 0);
    return `<div class="card-h"><h2>Coming up</h2><span class="right muted ttt-sub">${cnt} classes, ${slots - cnt} free this week</span></div>
      <div class="ttt-k">Next class with each section</div>
      <div class="ttt-nx">${nexts.map(({ sec, n }) => `<button type="button" class="ttt-nxi" style="--s:${TONE[sec] || "var(--slate)"}" data-tt="${n.k}|${n.p}|${n.sec}"><i></i><b>${esc(S.secName(sec))}</b><span>${when(n.k, n.p)}</span></button>`).join("")}</div>
      <div class="ttt-k">Follow-ups to do</div>
      <div class="ttt-up">${up.length ? up.map((f) => `<button type="button" class="ttt-ui" style="--s:${TONE[f.sec] || "var(--muted)"}" data-tt="${f.k}|${f.p}|${f.sec}"><i></i><span><b>${esc(f.text)}</b><small>${esc(S.secName(f.sec))} · ${when(f.k, f.p)}</small></span></button>`).join("")
        : `<div class="ttt-empty"><b>Nothing to follow up yet</b><span>Tap any class in the week to plan for it: collect homework, a re-test, a reminder.</span></div>`}</div>`;
  }

  function render() {
    WK = null;
    const days = daysOf(week), a = days[0], b = days[days.length - 1];
    $("#ttt-wk").textContent = week === 0 ? "This week" : week === 1 ? "Next week" : week === -1 ? "Last week" : `${S.fmt(S.iso(a), { day: "numeric", month: "short" })} to ${S.fmt(S.iso(b), { day: "numeric", month: "short" })}`;
    $("#ttt-range").textContent = `${S.fmt(S.iso(a), { day: "numeric", month: "short" })} to ${S.fmt(S.iso(b), { day: "numeric", month: "short" })}`;
    $("#ttt-today").style.display = week === 0 ? "none" : "";
    S.paint($("#ttt-week"), S.narrow() ? dayList(days) : grid(days));
    S.paint($("#ttt-side"), side());
    const others = Object.values(wk()).some((x) => !TONE[x.k]);
    $("#ttt-key").innerHTML = mine.filter((k) => TONE[k]).map((k) => `<span><i style="background:${TONE[k]}"></i>${esc(S.secName(k))}${k === T.classOf ? " · your class" : ""}</span>`).join("") + (others ? `<span><i style="background:var(--slate)"></i>Other sections</span>` : "") + `<span><i class="fr"></i>Free</span>`;
  }
  S.ttRender = render;

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#ttt-view")) return;
    const t = e.target.closest("[data-tt]");
    if (t) { const [k, p, sec] = t.dataset.tt.split("|"); sel = { k, p: +p, sec };
      const d = daysOf(week).map(S.iso); if (!d.includes(k)) { const diff = Math.round((new Date(k + "T00:00") - monday(0)) / 864e5); week = Math.floor(diff / 7); }
      dayIx = daysOf(week).map(S.iso).indexOf(k); render(); if (S.narrow()) $("#ttt-side").scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => { const i = $("#ttt-in"); if (i && !S.narrow()) i.focus({ preventScroll: true }); }, 50); return; }
    if (e.target.closest("[data-ttclose]")) { sel = null; render(); return; }
    const w = e.target.closest("[data-ttw]"); if (w) { week = w.dataset.ttw === "0" ? 0 : week + +w.dataset.ttw; dayIx = null; render(); return; }
    const dd = e.target.closest("[data-ttday]"); if (dd) { dayIx = +dd.dataset.ttday; render(); return; }
    const idea = e.target.closest("[data-ttidea]"); if (idea && sel) { add(idea.dataset.ttidea); return; }
    const del = e.target.closest("[data-ttdel]"); if (del) { e.preventDefault(); const f = S.state.follow[T.id]; S.state.follow[T.id] = f.filter((x) => x.id !== del.dataset.ttdel); S.save(); render(); }
  });
  document.addEventListener("change", (e) => { const c = e.target.closest("[data-ttdone]"); if (!c) return; const f = store().find((x) => x.id === c.dataset.ttdone); if (f) { f.done = c.checked; S.save(); render(); } });
  const add = (text) => { text = (text || "").trim(); if (!text || !sel) return; store().push({ id: "f" + Date.now(), k: sel.k, p: sel.p, sec: sel.sec, text, done: false }); S.save(); render(); S.toast(`Added for ${S.secName(sel.sec)}, ${S.fmt(sel.k, { weekday: "short", day: "numeric", month: "short" })}`); };
  document.addEventListener("submit", (e) => { if (e.target.id !== "ttt-add") return; e.preventDefault(); add($("#ttt-in").value); });
  document.addEventListener("sjs:view", (e) => { if (e.detail === "timetable") render(); });
  addEventListener("resize", () => { clearTimeout(render.t); render.t = setTimeout(render, 200); });
  render();
})();
