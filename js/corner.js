/* Teachers' Corner: the things a teacher reaches for while teaching, in one place.
   A card for each on the welcome page; the page itself has these tabs:
   - In class: a name picker (no repeats until everyone has had a turn), groups (random or
     mixed ability, from the latest marks) and a timer that fills the screen for the projector.
   - Question paper (js/qpaper.js), Staff room and Tasks (js/staffroom.js) have tabs of their own here.
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
    paper: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h5"/>',
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
    ["messages", "chat", "royal", "Messages", "Parents, colleagues and class groups", "room"],
    ["corner/tasks", "task", "accent", "Tasks and reminders", "Assign, tick off, remind", "tasks"],
    ["corner/paper", "paper", "slate", "Question paper", "Upload a Word file, get the school's layout"]
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
})();
