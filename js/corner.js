/* Teachers' Corner: the things a teacher reaches for while teaching, in one place.
   A card for each on the welcome page; the page itself has three tabs:
   - In class: a name picker (no repeats until everyone has had a turn), groups (random or
     mixed ability, from the latest marks) and a timer that fills the screen for the projector.
   - Planning: a 40- or 80-minute lesson plan on any topic, and the drafting tools already
     on Writing help.
   - Question paper (js/qpaper.js), Staff room and Tasks (js/staffroom.js) have tabs of their own here.
   - References: CBSE, NCERT and DIKSHA, and the school's own datesheets.
   Load after the staff page's own script; it does nothing for other roles. */
(() => {
  const S = window.SJS, T = S && S.staff;
  if (!T || T.role !== "teacher" || !document.querySelector('[data-view="corner"]')) return;
  const $ = (q, el = document) => el.querySelector(q), esc = S.esc;
  const mine = T.sections, home = T.classOf || mine[0], SUBJ = T.subject, C = S.EX.cur;
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    pick: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/><path d="M18.5 3.5l1 1.5 1.5 1-1.5 1-1 1.5-1-1.5-1.5-1 1.5-1z"/>',
    groups: '<circle cx="7" cy="8" r="2.6"/><circle cx="17" cy="8" r="2.6"/><circle cx="12" cy="15" r="2.6"/><path d="M3 20c.4-2 1.9-3 4-3M21 20c-.4-2-1.9-3-4-3"/>',
    timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 3h4M18.5 7l1.2-1.2"/>',
    plan: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2.5v3M16 2.5v3M8 11h8M8 15h5"/>',
    ref: '<path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z"/><path d="M12 6v13"/>',
    write: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    paper: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h5"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    task: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9.5 4.5V3.2h5v1.3"/><path d="M8.8 12.6l2.2 2.2 4.4-4.6"/>'
  };
  const secOpts = (sel) => mine.map((k) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(S.secName(k))} · ${S.sectionByKey(k).students.length}</option>`).join("");
  const studs = (k) => S.sectionByKey(k).students;
  const avg = (s) => (s[C] ? S.avgOf(s[C]) : 0);

  // ---------- On the welcome page ----------
  const CARDS = [
    ["corner/class", "pick", "royal", "Name picker", "A student at random, no repeats"],
    ["corner/class", "groups", "green", "Student groups", "Random or mixed ability, in a tap"],
    ["corner/class", "timer", "gold", "Class timer", "A countdown for the projector"],
    ["corner/room", "chat", "royal", "Staff room", "Chat with teachers, one-to-one or in groups", "room"],
    ["corner/tasks", "task", "accent", "Tasks and reminders", "Assign, tick off, remind", "tasks"],
    ["corner/paper", "paper", "slate", "Question paper", "Upload a Word file, get the school's layout"],
    ["corner/plan", "plan", "teal", "Lesson plan", "40 or 80 minutes on any topic"],
    ["assist", "write", "accent", "Remarks and practice sets", "Ready-made drafts on Writing help"],
    ["corner/ref", "ref", "green", "References", "CBSE, NCERT, DIKSHA and datesheets"]
  ];
  const box = $("#t-corner");
  if (box) box.innerHTML = `<div class="pgl tc-cards">${CARDS.map(([go, ic, tone, n, l, c], i) => `<button type="button" class="pgl-i" data-go="${go}" style="--c:var(--${tone});--i:${i}"><span class="pg-ic">${svg(IC[ic])}</span><span class="pgl-t"><b>${n}</b><span>${l}</span></span>${c ? `<span class="count" data-tc-count="${c}" hidden></span>` : ""}</button>`).join("")}</div>`;
  if (S.staffCounts) S.staffCounts();

  // ---------- Name picker ----------
  // Everyone gets a turn before anyone is picked twice; the round starts again on its own.
  const picked = {};
  let pkSec = home;
  function paintPick(name) {
    const all = studs(pkSec), done = picked[pkSec] || [];
    $("#tc-pk-sec").innerHTML = secOpts(pkSec);
    $("#tc-pk-n").textContent = `${done.length} of ${all.length} picked this round`;
    if (name !== undefined) { const o = $("#tc-pk-out"); o.textContent = name; o.classList.remove("tc-pop"); void o.offsetWidth; o.classList.add("tc-pop"); }
  }
  $("#tc-pk-sec").addEventListener("change", (e) => { pkSec = e.target.value; $("#tc-pk-out").textContent = "Tap “Pick a Name”"; paintPick(); });
  $("#tc-pk-go").addEventListener("click", () => {
    const all = studs(pkSec); let done = picked[pkSec] || (picked[pkSec] = []);
    if (done.length >= all.length) done = picked[pkSec] = [];
    const left = all.filter((s) => !done.includes(s.roll)), s = left[Math.floor(Math.random() * left.length)];
    done.push(s.roll); paintPick(s.name);
  });
  $("#tc-pk-reset").addEventListener("click", () => { picked[pkSec] = []; $("#tc-pk-out").textContent = "Tap “Pick a Name”"; paintPick(); });
  paintPick();

  // ---------- Groups ----------
  // Mixed ability deals students out in order of their latest average, so each group gets
  // a spread; random shuffles. Either way, sizes differ by one at most.
  function makeGroups() {
    const k = $("#tc-gp-sec").value, size = +$("#tc-gp-size").value, mode = $("#tc-gp-mode").value;
    const list = [...studs(k)], n = Math.max(1, Math.round(list.length / size));
    if (mode === "mixed") list.sort((a, b) => avg(b) - avg(a)); else for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    const gs = Array.from({ length: n }, () => []);
    list.forEach((s, i) => { const r = Math.floor(i / n), c = i % n; gs[r % 2 ? n - 1 - c : c].push(s); }); // snake order keeps groups even
    S.paint($("#tc-gp-out"), gs.map((g, i) => `<div class="tc-g" style="--i:${i}"><b>Group ${i + 1}<small>${g.length}</small></b><ul>${g.map((s) => `<li>${esc(s.name)}</li>`).join("")}</ul></div>`).join(""));
  }
  $("#tc-gp-sec").innerHTML = secOpts(home);
  $("#tc-gp-go").addEventListener("click", makeGroups);

  // ---------- Class timer ----------
  let total = 300, left = 300, run = null, endAt = 0;
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function paintTimer() {
    $("#tc-tm-t").textContent = mmss(Math.max(0, Math.ceil(left)));
    $("#tc-tm").style.setProperty("--p", total ? (left / total) * 100 : 0);
    $("#tc-tm").classList.toggle("done", left <= 0);
    $("#tc-tm-go").textContent = run ? "Pause" : left < total && left > 0 ? "Resume" : "Start";
    document.querySelectorAll("[data-tm]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.tm * 60 === total));
  }
  // A soft two-note chime when time is up; no sound file to load.
  function chime() {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + i * 0.28;
        o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + 1); });
    } catch (e) {}
  }
  function tick() {
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; clearInterval(run); run = null; chime(); }
    paintTimer();
  }
  const setTotal = (sec) => { clearInterval(run); run = null; total = left = sec; paintTimer(); };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-tm]"); if (b) setTotal(+b.dataset.tm * 60); });
  $("#tc-tm-add").addEventListener("click", () => { total += 60; left += 60; if (run) endAt += 60000; paintTimer(); });
  $("#tc-tm-go").addEventListener("click", () => {
    if (run) { clearInterval(run); run = null; paintTimer(); return; }
    if (left <= 0) left = total;
    endAt = Date.now() + left * 1000; run = setInterval(tick, 250); paintTimer();
  });
  $("#tc-tm-reset").addEventListener("click", () => setTotal(total));
  $("#tc-tm-full").addEventListener("click", () => { const c = $("#tc-tm-card"); if (document.fullscreenElement) document.exitFullscreen(); else if (c.requestFullscreen) c.requestFullscreen(); });
  paintTimer();

  // ---------- Lesson plan ----------
  // A plain structure the teacher fills in: aim, the period minute by minute, support and stretch, homework.
  const FLAVOUR = [
    [/Math/, "two worked examples on the board, one done together", "a real-life problem (prices, sharing, distances)"],
    [/Science|Physics|Chemistry|Biology/, "a quick demonstration or a labelled diagram", "a 'why does this happen?' question from daily life"],
    [/English|Hindi|Sanskrit/, "a short passage read aloud, with the key words on the board", "a two-line response in their own words"],
    [/Social|History|Geography|Civics|Economics/, "a map or timeline on the board", "a 'what would you have done?' question"],
    [/Account|Business/, "one worked entry or case, step by step", "a case from a local shop or business"],
    [/./, "a clear explanation with one worked example", "a question that links it to daily life"]
  ];
  function makePlan() {
    const topic = $("#tc-lp-t").value.trim() || ($("#tc-lp-t").placeholder.replace(/^e\.g\. /, ""));
    const k = $("#tc-lp-sec").value, mins = +$("#tc-lp-len").value, x = mins / 40;
    const [, teach, hook] = FLAVOUR.find(([re]) => re.test(SUBJ));
    const steps = [
      [5 * x, "Warm-up", `Start with ${hook}. Recall the last lesson in one or two questions.`],
      [10 * x, "Teach", `Introduce <b>${esc(topic)}</b> through ${teach}. Put the key terms on the board.`],
      ...(x > 1 ? [[20, "Activity", "Groups work on a short task and share one answer each with the class."]] : []),
      [(x > 1 ? 25 : 15), "Practice", "Pairs solve four or five questions, easy to harder, while you go round the room."],
      [5, "Check", "An exit ticket: two quick questions on a slip, collected at the door."],
      [5, "Wrap-up", "Sum up in three lines with the class; set the homework."]
    ];
    S.paint($("#tc-lp-out"), `<div class="tc-lp" contenteditable="true" spellcheck="true" aria-label="Lesson plan, editable">
      <h3>${esc(topic)} · ${esc(SUBJ)} · ${esc(S.secName(k))}</h3>
      <p><b>Aim:</b> by the end of the period, students can explain ${esc(topic.toLowerCase())} and use it in a new question.</p>
      <p><b>You need:</b> board, the textbook, ${x > 1 ? "task cards for the groups, " : ""}exit-ticket slips.</p>
      <ol>${steps.map(([m, h, t]) => `<li><b>${Math.round(m)} min · ${h}.</b> ${t}</li>`).join("")}</ol>
      <p><b>Support:</b> sit those who found the last test hard near the front and give them the first two questions worked halfway.</p>
      <p><b>Stretch:</b> one harder question for those who finish early.</p>
      <p><b>Homework:</b> five questions on ${esc(topic.toLowerCase())}, due the next class.</p></div>`);
    $("#tc-lp-print").hidden = false;
  }
  $("#tc-lp-sec").innerHTML = secOpts(home);
  $("#tc-lp-t").placeholder = `e.g. ${{ Mathematics: "Linear equations", Science: "Light: reflection", English: "Letter writing", Physics: "Ohm's law", Chemistry: "Chemical bonding", Economics: "Demand and supply" }[SUBJ] || "Today's topic"}`;
  $("#tc-lp-go").addEventListener("click", makePlan);
  $("#tc-lp-t").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); makePlan(); } });
  $("#tc-lp-print").addEventListener("click", () => {
    const p = $("#tc-lp-out .tc-lp"); if (!p) return;
    const h = p.querySelector("h3"), body = p.cloneNode(true); body.querySelector("h3")?.remove();
    S.showDoc("Lesson plan", S.docPage("Lesson plan", [`<h2>${esc(h ? h.textContent : "Lesson plan")}</h2>${S.rich(body.innerHTML)}`]));
  });

  // ---------- References and the drafting tools: links only ----------
  const link = ([href, ic, tone, n, l, ext]) => `<${ext ? `a href="${href}" target="_blank" rel="noopener"` : `button type="button" data-go="${href}"`} class="pgl-i" style="--c:var(--${tone})"><span class="pg-ic">${svg(IC[ic])}</span><span class="pgl-t"><b>${n}</b><span>${l}</span></span>${ext ? `<span class="tc-ext">${svg(IC.out)}</span>` : ""}</${ext ? "a" : "button"}>`;
  $("#tc-more").innerHTML = [
    ["assist/rm", "write", "accent", "Report-card remarks", "From each student's marks and attendance"],
    ["assist/ps", "paper", "royal", "Practice set", "Questions on a topic, sent as homework"],
    ["assist/tr", "write", "green", "Note to parents", "From a school notice, for your class"],
    ["corner/paper", "paper", "slate", "Question paper", "Upload a Word file, get the school's layout"]
  ].map(link).join("");
  $("#tc-ref").innerHTML = [
    ["https://cbseacademic.nic.in/", "ref", "royal", "CBSE Academic", "Curriculum, sample papers and marking schemes", 1],
    ["https://ncert.nic.in/textbook.php", "ref", "green", "NCERT textbooks", "Every class and subject, free to read", 1],
    ["https://diksha.gov.in/", "ref", "gold", "DIKSHA", "Lessons, videos and practice from the government", 1],
    ["exams", "plan", "slate", "School datesheets", "This session's exams, class by class"]
  ].map(link).join("");
})();
