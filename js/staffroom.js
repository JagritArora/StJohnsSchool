/* The staff room and tasks, in Teachers' Corner.
   - Chat: one-to-one with any teacher, and groups a teacher makes (a class's teachers,
     a department…). Every teacher sees the same record (S.state.staffroom), so two tabs
     signed in as two teachers talk to each other live.
   - Tasks: sent to a teacher or a group; each teacher ticks it off, the sender sees who
     has and can remind the rest in one tap (it arrives in their chat). A reminder is a
     one-off note with a date, sent to a chat.
   - S.tasksFor(id) and S.staffUnread() feed the teacher's "Needs you" and the Corner's counts.
   Load after more.js and before the staff page's own script. */
(() => {
  const S = window.SJS, ME = S && S.staff;
  if (!ME || ME.role !== "teacher") return;
  const $ = (q, el = document) => el.querySelector(q), esc = S.esc;
  const who = (id) => S.STAFF[id] || { name: "A teacher", first: "A teacher", initials: "?", sections: [], subject: "" };
  // Full names without the title: two Deepas and two Nishas teach IX-A, so a first name alone is not enough.
  const nm = (id) => who(id).name.replace(/^(Mr|Mrs|Ms|Dr)\.\s+/, "");
  const now = () => `${S.fmt(S.todayKey, { day: "numeric", month: "short" })}, ${S.timeNow()}`;
  const day = (k) => S.fmt(k, { weekday: "short", day: "numeric", month: "short" });
  const dmId = (a, b) => "dm:" + [a, b].sort().join("|");
  const teaches = (sec) => S.TEACHERS.filter((t) => t.sections.includes(sec)).map((t) => t.id);

  // ---------- The shared record, with a few chats to start from ----------
  function seed() {
    const has = (id) => !!S.STAFF[id], ixa = teaches("IX-A");
    const maths = S.TEACHERS.filter((t) => t.subject === "Mathematics").map((t) => t.id), d = (n) => S.iso(S.nextSchoolDay(S.today, n));
    const th = {}, ts = Date.now();
    th["g:ix-a"] = { id: "g:ix-a", kind: "group", name: "IX-A teachers", by: "SJS-T-0508", members: ixa, ts: ts - 2, msgs: [
      { from: "SJS-T-0508", text: "Unit Test 2 marks for IX-A by Friday, please. Report cards go to parents next week.", at: "Yesterday, 3:40 PM" },
      { from: "SJS-T-0509", text: "Science is nearly done. I'll finish it tomorrow.", at: "Yesterday, 4:05 PM" }] };
    th["g:maths"] = { id: "g:maths", kind: "group", name: "Mathematics department", by: "SJS-T-0508", members: maths, ts: ts - 3, msgs: [
      { from: "SJS-T-0508", text: "I'll share the Pre-board 1 blueprint on Monday. Please bring your chapter-wise question counts.", at: "Mon, 3:15 PM" }] };
    if (has("SJS-T-0507")) th[dmId("SJS-T-0508", "SJS-T-0507")] = { id: dmId("SJS-T-0508", "SJS-T-0507"), kind: "dm", members: ["SJS-T-0508", "SJS-T-0507"], ts: ts - 1, msgs: [
      { from: "SJS-T-0507", text: "Can you take my period 6 on Thursday? I'm at the PTM planning meeting.", at: "Today, 9:12 AM" }] };
    const tasks = [
      { id: "t1", kind: "task", title: "Enter Unit Test 2 marks for IX-A", note: "Report cards go to parents next week.", by: "SJS-T-0508", to: ixa.filter((id) => id !== "SJS-T-0508"), toLabel: "IX-A teachers", gid: "g:ix-a", due: d(3), at: "Yesterday", done: { "SJS-T-0509": "Today, 8:50 AM" }, nudges: 0 },
      ...(has("SJS-T-0530") ? [{ id: "t2", kind: "task", title: "Send the list of XII-A students without practical files", note: "", by: "SJS-T-0530", to: ["SJS-T-0508"], toLabel: who("SJS-T-0508").name, due: d(5), at: "Today", done: {}, nudges: 0 }] : [])
    ];
    return { threads: th, tasks, seen: {} };
  }
  const R = () => { if (!S.state.staffroom) { S.state.staffroom = seed(); S.save(); } return S.state.staffroom; };
  R();
  const mine = () => Object.values(R().threads).filter((t) => t.members.includes(ME.id));
  const seenOf = () => (R().seen[ME.id] = R().seen[ME.id] || {});
  const unread = (t) => t.msgs.slice(seenOf()[t.id] || 0).filter((m) => m.from !== ME.id && !m.old).length;
  S.staffUnread = () => mine().reduce((a, t) => a + unread(t), 0);
  S.tasksFor = (id) => R().tasks.filter((k) => k.to.includes(id) && !k.done[id]);
  const titleOf = (t) => (t.kind === "group" ? t.name : who(t.members.find((m) => m !== ME.id)).name);
  const avatarOf = (t) => t.kind === "group" ? `<span class="avatar sr-gav" aria-hidden="true">${t.members.length}</span>` : (() => { const o = who(t.members.find((m) => m !== ME.id)); return `<span class="avatar ${o.tone || ""}" aria-hidden="true">${esc(o.initials)}</span>`; })();
  const post = (t, m) => { t.msgs.push(Object.assign({ from: ME.id, at: now() }, m)); t.ts = Date.now(); };
  const dm = (id) => { const k = dmId(ME.id, id), th = R().threads; return th[k] || (th[k] = { id: k, kind: "dm", members: [ME.id, id], ts: Date.now(), msgs: [] }); };
  // Colleagues first: those who teach the same sections.
  const colleagues = () => S.TEACHERS.filter((t) => t.id !== ME.id && t.sections.some((s) => ME.sections.includes(s)));
  const others = () => { const c = new Set(colleagues().map((t) => t.id)); return S.TEACHERS.filter((t) => t.id !== ME.id && !c.has(t.id)); };
  const tOpt = (t) => `<option value="${t.id}">${esc(t.name)} · ${esc(t.subject)}</option>`;

  // ---------- Counts on the Corner's tabs, its cards and the menu ----------
  function counts() {
    const n = S.staffUnread(), k = S.tasksFor(ME.id).length;
    const set = (sel, v) => document.querySelectorAll(sel).forEach((c) => { c.hidden = !v; c.textContent = v; });
    set('[data-tc-count="room"]', n); set('[data-tc-count="tasks"]', k); set('[data-count="corner"]', k); if (S.talkCounts) S.talkCounts();
    const rt = $("#tc-room-t"), tt = $("#tc-tasks-t");
    if (rt) rt.textContent = n ? `${n} new message${n === 1 ? "" : "s"}` : "Chat and groups";
    if (tt) tt.textContent = k ? `${k} for you` : "Assign and remind";
  }
  S.staffCounts = counts;
  // Saved, then the counts and the teacher's "Needs you" drawn again.
  const saved = () => { S.save(); counts(); if (S.refreshHome) S.refreshHome(); };

  // ---------- Chat ----------
  let open = null;
  const shown = () => { const v = $('[data-view="corner"]'), p = $('[data-vp="corner"][data-v="room"]'); return v.classList.contains("active") && !p.hidden && !$("#sr-chat").hidden; };
  function renderList() {
    const ts = mine().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (!open || !R().threads[open]) open = ts[0] ? ts[0].id : null;
    $("#sr-list").innerHTML = ts.map((t) => {
      const n = unread(t), last = t.msgs[t.msgs.length - 1];
      const line = !last ? "No messages yet" : (last.from === ME.id ? "You: " : t.kind === "group" ? nm(last.from) + ": " : "") + (last.kind === "reminder" ? "Reminder: " : last.kind === "task" ? "Task: " : "") + last.text;
      return `<button type="button" class="sr-i${t.id === open ? " on" : ""}${n ? " new" : ""}" data-sr="${t.id}">${avatarOf(t)}<span class="sr-t"><b>${esc(titleOf(t))}</b><span>${esc(line)}</span></span>${n ? `<span class="count">${n}</span>` : ""}</button>`;
    }).join("") || `<p class="muted">No chats yet. Pick a teacher above, or make a group.</p>`;
    $("#sr-to").innerHTML = `<option value="">Pick a teacher…</option><optgroup label="Teach your classes">${colleagues().map(tOpt).join("")}</optgroup><optgroup label="Everyone else">${others().map(tOpt).join("")}</optgroup>`;
  }
  function renderThread(focus) {
    const t = R().threads[open];
    $("#sr-form").hidden = !t;
    if (!t) { $("#sr-head").innerHTML = "<h2>No chat open</h2>"; $("#sr-thread").innerHTML = ""; return; }
    const o = t.kind === "dm" ? who(t.members.find((m) => m !== ME.id)) : null;
    const sub = o ? `${o.subject} · ${o.sections.join(", ")}${o.classOf ? " · class teacher " + o.classOf : ""}` : t.members.map((m) => (m === ME.id ? "You" : nm(m))).join(", ");
    $("#sr-head").innerHTML = `<div class="sr-h">${avatarOf(t)}<div><h2>${esc(titleOf(t))}</h2><span class="muted">${esc(sub)}</span></div></div>`;
    S.paint($("#sr-thread"), t.msgs.map((m) => m.kind === "info" ? `<p class="sr-info">${esc(m.text)}</p>` :
      `<div class="msg ${m.from === ME.id ? "me" : "bot"}${m.kind ? " sr-" + m.kind : ""}">${m.kind === "reminder" ? '<b class="sr-tag">Reminder</b>' : m.kind === "task" ? '<b class="sr-tag">Task</b>' : ""}${esc(m.text)}<span class="when">${m.from === ME.id ? "" : esc(who(m.from).name) + " · "}${esc(m.at)}</span></div>`).join("") || `<p class="sr-info">Say hello to start the chat.</p>`);
    const box = $("#sr-thread"); box.scrollTop = box.scrollHeight;
    if (shown() && unread(t)) { seenOf()[t.id] = t.msgs.length; saved(); } // read only once it's on screen
    if (focus) $("#sr-msg").focus();
    renderList(); counts();
  }
  const openChat = (id, focus) => { open = id; showGroupForm(false); renderThread(focus); };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-sr]"); if (b) openChat(b.dataset.sr, true); });
  $("#sr-to").addEventListener("change", (e) => { if (!e.target.value) return; const t = dm(e.target.value); saved(); openChat(t.id, true); });
  $("#sr-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = R().threads[open], v = $("#sr-msg").value.trim(); if (!t || !v) return;
    post(t, { text: v }); seenOf()[t.id] = t.msgs.length; saved(); $("#sr-msg").value = ""; renderThread(true);
  });

  // ---------- Groups ----------
  function showGroupForm(on) {
    $("#sr-group").hidden = !on; $("#sr-chat").hidden = on;
    if (!on) return;
    $("#sr-g-name").value = ""; $("#sr-g-find").value = "";
    $("#sr-quick").innerHTML = ME.sections.map((k) => `<button type="button" class="chip" data-sr-q="${k}">Teachers of ${esc(S.secName(k))}</button>`).join("") + `<button type="button" class="chip" data-sr-q="subj">${esc(ME.subject)} teachers</button>`;
    const row = (t, on2) => `<label class="sr-m"><input type="checkbox" value="${t.id}"${on2 ? " checked" : ""} /><span class="avatar ${t.tone || ""}" aria-hidden="true">${esc(t.initials)}</span><span><b>${esc(t.name)}</b><small>${esc(t.subject)} · ${esc(t.sections.join(", "))}</small></span></label>`;
    $("#sr-members").innerHTML = colleagues().map((t) => row(t)).join("") + others().map((t) => row(t)).join("");
    groupCount(); $("#sr-g-name").focus();
  }
  const groupCount = () => { const n = $("#sr-members").querySelectorAll("input:checked").length; $("#sr-g-n").textContent = n ? `${n} teacher${n === 1 ? "" : "s"} and you` : ""; };
  $("#sr-new").addEventListener("click", () => showGroupForm(true));
  $("#sr-g-x").addEventListener("click", () => { showGroupForm(false); renderThread(); });
  $("#sr-members").addEventListener("change", groupCount);
  $("#sr-g-find").addEventListener("input", (e) => { const q = e.target.value.trim().toLowerCase(); $("#sr-members").querySelectorAll(".sr-m").forEach((l) => (l.hidden = !!q && !l.textContent.toLowerCase().includes(q))); });
  $("#sr-quick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sr-q]"); if (!b) return;
    const ids = b.dataset.srQ === "subj" ? S.TEACHERS.filter((t) => t.subject === ME.subject).map((t) => t.id) : teaches(b.dataset.srQ);
    $("#sr-members").querySelectorAll("input").forEach((c) => { if (ids.includes(c.value)) c.checked = true; });
    if (!$("#sr-g-name").value.trim()) $("#sr-g-name").value = b.textContent.replace(/^Teachers of (.+)$/, "$1 teachers");
    groupCount();
  });
  $("#sr-group").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#sr-g-name").value.trim(), ids = [...$("#sr-members").querySelectorAll("input:checked")].map((c) => c.value);
    if (!name) { $("#sr-g-name").focus(); S.toast("Give the group a name", { done: false }); return; }
    if (!ids.length) { S.toast("Pick at least one teacher", { done: false }); return; }
    const id = "g:" + Date.now().toString(36), t = { id, kind: "group", name, by: ME.id, members: [ME.id, ...ids], ts: Date.now(), msgs: [] };
    post(t, { kind: "info", text: `${ME.name} made the group with ${ids.length} teacher${ids.length === 1 ? "" : "s"}.` });
    R().threads[id] = t; saved(); fillTo();
    S.toast(`Group made · ${name}`);
    openChat(id, true);
  });

  // ---------- Tasks and reminders ----------
  let kind = "task";
  function fillTo() {
    const v = $("#tk-to").value, gs = mine().filter((t) => t.kind === "group");
    $("#tk-to").innerHTML = `<option value="">Pick a teacher or a group…</option>${gs.length ? `<optgroup label="Groups">${gs.map((g) => `<option value="${g.id}">${esc(g.name)} · ${g.members.length - 1}</option>`).join("")}</optgroup>` : ""}<optgroup label="Teach your classes">${colleagues().map(tOpt).join("")}</optgroup><optgroup label="Everyone else">${others().map(tOpt).join("")}</optgroup>`;
    if (v) $("#tk-to").value = v;
  }
  function setKind(k) {
    kind = k;
    $("#tk-form").querySelectorAll("[data-k]").forEach((b) => { const on = b.dataset.k === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    $("#tk-t-l").textContent = k === "task" ? "Task" : "Remind them about";
    $("#tk-t").placeholder = k === "task" ? "e.g. Enter Unit Test 2 marks" : "e.g. PTM on Saturday at 9:00";
    $("#tk-due-l").textContent = k === "task" ? "Due" : "On";
    $("#tk-go").textContent = k === "task" ? "Assign the task" : "Send the reminder";
    $("#tk-help").textContent = k === "task" ? "Each teacher ticks it off; you see who has, and can remind the rest in one tap." : "It goes to their chat at once. Nothing to tick off.";
  }
  $("#tk-form").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) setKind(b.dataset.k); });
  $("#tk-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const to = $("#tk-to").value, title = $("#tk-t").value.trim(), due = $("#tk-due").value, note = $("#tk-note").value.trim();
    if (!to || !title) return;
    const g = to.startsWith("g:") ? R().threads[to] : null, ids = g ? g.members.filter((m) => m !== ME.id) : [to];
    const chat = g || dm(to), text = `${title}${due ? ` · ${kind === "task" ? "due " : ""}${day(due)}` : ""}${note ? `\n${note}` : ""}`;
    if (kind === "task") R().tasks.unshift({ id: "t" + Date.now().toString(36), kind: "task", title, note, by: ME.id, to: ids, toLabel: g ? g.name : who(to).name, gid: g ? g.id : null, due, at: now(), done: {}, nudges: 0 });
    post(chat, { kind: kind === "task" ? "task" : "reminder", text });
    seenOf()[chat.id] = chat.msgs.length; saved();
    e.target.reset(); $("#tk-due").value = S.iso(S.nextSchoolDay(S.today, 3)); fillTo(); renderTasks(); renderList(); counts();
    S.toast(kind === "task" ? `Task sent to ${ids.length === 1 ? who(ids[0]).name : ids.length + " teachers"}` : `Reminder sent to ${g ? g.name : who(to).name}`);
  });
  function renderTasks() {
    const all = R().tasks, forMe = all.filter((k) => k.to.includes(ME.id)).sort((a, b) => !!a.done[ME.id] - !!b.done[ME.id]), sent = all.filter((k) => k.by === ME.id);
    const open2 = forMe.filter((k) => !k.done[ME.id]).length;
    $("#tk-mine-n").textContent = forMe.length ? (open2 ? `${open2} to do` : "All done") : "";
    const due = (k) => k.due ? `due ${day(k.due)}` : "no date";
    $("#tk-mine").innerHTML = forMe.map((k) => { const d = k.done[ME.id];
      return `<div class="li tk-i${d ? " done" : ""}"><span class="sq ${d ? "green" : "royal"}">${d ? "✓" : "!"}</span><div class="t"><b>${esc(k.title)}</b><span>From ${esc(who(k.by).name)} · ${due(k)}${k.nudges ? ` · reminded ${k.nudges}×` : ""}</span>${k.note ? `<span class="tk-note">${esc(k.note)}</span>` : ""}</div>
        <button type="button" class="end btn btn-${d ? "ghost" : "primary"} btn-sm" data-tk-done="${k.id}">${d ? "Undo" : "Mark done"}</button></div>`; }).join("") || `<p class="muted">Nothing for you right now.</p>`;
    $("#tk-sent").innerHTML = sent.map((k) => { const left = k.to.filter((id) => !k.done[id]), n = k.to.length - left.length;
      return `<div class="li tk-i"><span class="sq ${left.length ? "gold" : "green"}">${n}/${k.to.length}</span><div class="t"><b>${esc(k.title)}</b><span>To ${esc(k.toLabel)} · ${due(k)} · ${left.length ? `waiting on ${esc(left.map(nm).join(", "))}` : "everyone's done"}</span></div>
        ${left.length ? `<button type="button" class="end btn btn-ghost btn-sm" data-tk-nudge="${k.id}">Send reminder</button>` : ""}</div>`; }).join("") || `<p class="muted">Tasks you send show here, with who has done them.</p>`;
  }
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-tk-done]"), r = e.target.closest("[data-tk-nudge]");
    if (d) { const k = R().tasks.find((x) => x.id === d.dataset.tkDone); if (!k) return;
      if (k.done[ME.id]) delete k.done[ME.id]; else { k.done[ME.id] = now(); post(dm(k.by), { kind: "info", text: `${ME.name} finished: ${k.title}` }); }
      saved(); renderTasks(); renderList(); if (k.done[ME.id]) S.toast(`Done · ${who(k.by).name} can see it`); }
    if (r) { const k = R().tasks.find((x) => x.id === r.dataset.tkNudge); if (!k) return;
      const left = k.to.filter((id) => !k.done[id]);
      left.forEach((id) => post(dm(id), { kind: "reminder", text: `${k.title}${k.due ? ` is due ${day(k.due)}` : ""}` }));
      k.nudges = (k.nudges || 0) + 1; saved(); renderTasks(); renderList();
      S.toast(`Reminder sent to ${left.length === 1 ? who(left[0]).name : left.length + " teachers"}`); }
  });

  function renderAll() { renderList(); renderThread(); renderTasks(); counts(); }
  $("#tk-due").value = S.iso(S.nextSchoolDay(S.today, 3));
  fillTo(); setKind("task"); renderAll();
  document.addEventListener("sjs:vt", (e) => { if (e.detail.key === "corner" && e.detail.v === "room") renderThread(); });
  document.addEventListener("sjs:view", (e) => { if (e.detail === "corner") setTimeout(() => shown() && renderThread()); });
  // Another tab (another teacher) wrote: draw it again, keeping a half-typed message.
  document.addEventListener("sjs:sync", () => { if (!S.state.staffroom) return; fillTo(); renderAll(); });
})();
