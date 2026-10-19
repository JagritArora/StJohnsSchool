/* St. John's School — between home and school.
   Teacher remarks, consent forms, the parent check, the permanent chat record
   and voice messages. Shared by the parent and staff pages; loaded after
   data.js, classes.js and exams.js.

   Guardrails, in plain words:
   - A parent check (a 4-digit parent PIN) comes before signing a form, and
     before chatting or sending a voice note (it then holds for 10 minutes).
     The PIN is set by the parent and never shown in the app, so a child using
     the parent's phone cannot sign or write as the parent.
   - Every signature sends an SMS receipt to the registered number: if the
     child did get past the check, the parent hears about it at once.
   - Teachers see which messages came after a parent check, and voice notes
     let them hear who is speaking.
   - Chats are a permanent record: nothing can be edited or deleted, and each
     message is sealed to the one before it, so any later change shows up. */
(function () {
  const S = window.SJS;
  // S.state is read fresh each time: another tab's change replaces the whole object.
  const st = S.state;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const day = (n) => S.iso(S.addDays(S.today, n));
  const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  S.ICON_LOCK = LOCK;

  // ---------- Remarks ----------
  S.REMARK_KINDS = { praise: "Praise", progress: "Progress", concern: "Concern", conduct: "Conduct" };
  const remarkSeed = () => [
    { id: "r1", sec: "VII-B", roll: 1, kind: "praise", text: "Led Monday's class assembly with confidence and spoke clearly.", by: "Ms. Neha Mathew", cap: "Class teacher", share: true, at: day(-6) },
    { id: "r2", sec: "VII-B", roll: 1, kind: "concern", text: "Reading aloud in Hindi is hesitant. Ten minutes of reading at home each day will help.", by: "Mrs. Sunita Rawat", cap: "Hindi teacher", share: true, at: day(-3) },
    { id: "r3", sec: "VII-B", roll: 1, kind: "conduct", text: "Looked tired in the first period on two Mondays. Keep an eye on it.", by: "Ms. Neha Mathew", cap: "Class teacher", share: false, at: day(-2) },
    { id: "r4", sec: "VII-B", roll: 11, kind: "concern", text: "Mathematics has slipped since the unit test. Extra practice set given for integers.", by: "Ms. Neha Mathew", cap: "Mathematics teacher", share: true, at: day(-4) },
    { id: "r5", sec: "VIII-A", roll: 3, kind: "progress", text: "Much neater working in algebra this month.", by: "Ms. Neha Mathew", cap: "Mathematics teacher", share: true, at: day(-1) }
  ];
  if (!st.remarks) st.remarks = remarkSeed();
  S.remarksFor = (sec, roll, staff) => S.state.remarks.filter((r) => r.sec === sec && r.roll === roll && (staff || r.share)).sort((a, b) => (a.at < b.at ? 1 : -1));
  S.addRemark = (r) => { S.state.remarks.push(Object.assign({ id: "r" + Date.now().toString(36), at: S.todayKey }, r)); S.save(); };

  // ---------- Consent and acknowledgement forms ----------
  const formSeed = () => {
    const replies = {};
    [2, 3, 5, 6, 8, 9, 10, 12, 14, 15, 17, 19, 21, 23].forEach((r, i) => (replies[r] = { v: i === 6 ? "no" : "yes", at: day(-1 - (i % 3)), who: "Parent", check: "PIN" }));
    return [{ id: "f1", sec: "VII-B", title: "Photos on the school website", body: "May the school use photos of your child from Annual Day on the school website and social media? Children are never named in captions.", kind: "consent", due: day(10), by: "Ms. Neha Mathew", cap: "Class teacher", at: day(-2), replies }];
  };
  if (!st.forms) st.forms = formSeed();
  S.formsFor = (sec) => S.state.forms.filter((f) => f.sec === sec).sort((a, b) => (a.at < b.at ? 1 : -1));
  S.formAnswer = (f, roll) => f.replies[roll] || null;
  S.formLabel = (v) => ({ yes: "Agreed", no: "Did not agree", ack: "Read and noted" }[v] || "Waiting");

  // ---------- The permanent record: each message sealed to the one before ----------
  const fnv = (str) => { let a = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { a ^= str.charCodeAt(i); a = Math.imul(a, 16777619) >>> 0; } return a.toString(36); };
  const body = (m) => [m.from, m.text || "", m.voice ? m.voice.length + ":" + m.dur : "", m.at].join("|");
  S.sealThread = (t) => { let prev = "0"; t.forEach((m) => { if (!m.seal) m.seal = fnv(prev + body(m)); prev = m.seal; }); };
  S.threadIntact = (t) => { let prev = "0"; return t.every((m) => { const ok = !m.seal || m.seal === fnv(prev + body(m)); prev = m.seal || fnv(prev + body(m)); return ok; }); };
  S.post = (t, m) => { S.sealThread(t); const prev = t.length ? t[t.length - 1].seal : "0"; m.seal = fnv(prev + body(m)); t.push(m); };
  S.recordNote = (t, staff) => {
    const ok = S.threadIntact(t);
    return `<div class="rec-note${ok ? "" : " bad"}">${LOCK}<span>${ok ? "Kept by the school as a permanent record. Messages can't be edited or deleted." : "<b>This record has been changed</b> since it was written. Please tell the school office."}${staff && ok ? ` <b>Record intact</b> · ${t.length} message${t.length === 1 ? "" : "s"}` : ""}</span></div>`;
  };

  // ---------- Parent check ----------
  // Asked before a form is signed (every time) and before chatting (then good for 10 minutes).
  const HOLD = 10 * 60 * 1000;
  if (!st.pv) st.pv = {};
  S.parentChecked = (key) => Date.now() - ((S.state.pv || {})[key] || 0) < HOLD;
  let pc = null, done = null;
  const build = () => {
    pc = document.createElement("div");
    pc.className = "modal"; pc.id = "pc-modal";
    pc.innerHTML = `<div class="modal-card pc-card" role="dialog" aria-modal="true" aria-labelledby="pc-h">
      <span class="pc-ic">${LOCK}</span>
      <h3 id="pc-h">Parent check</h3>
      <p class="muted" id="pc-why"></p>
      <form id="pc-form" novalidate>
        <div class="otp pc-pin">${[1, 2, 3, 4].map((i) => `<input class="input" type="password" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="PIN digit ${i}" />`).join("")}</div>
        <p class="hint" style="margin-top:10px">Your parent PIN, set when you first opened the app. Keep it to yourself. Forgotten it? Reset it with an OTP to <b id="pc-phone"></b>.</p>
        <p class="hint pc-demo">Demo: any 4 digits work.</p>
        <p class="form-err" id="pc-err" role="alert" hidden>Enter all four digits.</p>
        <div class="pc-row"><button type="button" class="btn btn-ghost" id="pc-no">Cancel</button><button type="submit" class="btn btn-primary">Confirm</button></div>
      </form></div>`;
    document.body.append(pc);
    const ins = [...pc.querySelectorAll(".pc-pin input")];
    ins.forEach((inp, i) => {
      inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); });
      inp.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !inp.value && ins[i - 1]) ins[i - 1].focus(); });
    });
    const finish = (ok) => { pc.classList.remove("open"); const d = done; done = null; if (d) d(ok); };
    pc.querySelector("#pc-no").addEventListener("click", () => finish(false));
    pc.addEventListener("click", (e) => { if (e.target === pc) finish(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pc.classList.contains("open")) finish(false); });
    pc.querySelector("#pc-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (ins.some((x) => !x.value)) { pc.querySelector("#pc-err").hidden = false; pc.querySelector(".pc-pin").animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 260 }); return; }
      finish(true);
    });
  };
  S.parentCheck = ({ key, why, hold }) => new Promise((resolve) => {
    if (hold && S.parentChecked(key)) return resolve(true);
    if (!pc) build();
    pc.querySelector("#pc-why").textContent = why;
    pc.querySelector("#pc-phone").textContent = (S.kid(key) || {}).phone || "your registered number";
    pc.querySelector("#pc-err").hidden = true;
    pc.querySelectorAll(".pc-pin input").forEach((x) => (x.value = ""));
    done = (ok) => { if (ok) { (S.state.pv = S.state.pv || {})[key] = Date.now(); S.save(); } resolve(ok); };
    pc.classList.add("open");
    setTimeout(() => pc.querySelector(".pc-pin input").focus(), 60);
  });

  // ---------- Voice messages ----------
  S.canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
  S.voiceBubble = (m) => `<span class="vm"><button type="button" class="vm-play" aria-label="Play voice message, ${mmss(m.dur || 0)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="pl" d="M8 5.5v13l11-6.5z"/><path class="pa" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg></button><span class="vm-bar" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--h:${30 + ((i * 37 + (m.dur || 3) * 11) % 70)}%"></i>`).join("")}</span><span class="vm-t">${mmss(m.dur || 0)}</span><audio preload="none" src="${m.voice}"></audio></span>`;
  // One player at a time; the bars fill as it plays.
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".vm-play"); if (!b) return;
    const vm = b.closest(".vm"), a = vm.querySelector("audio");
    document.querySelectorAll(".vm.on audio").forEach((x) => { if (x !== a) { x.pause(); x.closest(".vm").classList.remove("on"); } });
    if (a.paused) {
      a.play().then(() => vm.classList.add("on"), () => S.toast && S.toast("This voice message can't be played here."));
      a.ontimeupdate = () => { const k = a.duration ? a.currentTime / a.duration : 0, bars = vm.querySelectorAll(".vm-bar i"); bars.forEach((x, i) => x.classList.toggle("p", i / bars.length < k)); vm.querySelector(".vm-t").textContent = mmss(a.currentTime || 0); };
      a.onended = () => { vm.classList.remove("on"); vm.querySelectorAll(".vm-bar i").forEach((x) => x.classList.remove("p")); vm.querySelector(".vm-t").textContent = mmss(a.duration || 0); };
    } else { a.pause(); vm.classList.remove("on"); }
  });
  // Adds a mic to a chat form. Tap to record, tap the tick to send, the cross to throw it away.
  // Up to 60 seconds, recorded small so the record stays light.
  S.bindVoice = (form, before, send) => {
    const mic = document.createElement("button");
    mic.type = "button"; mic.className = "vm-mic"; mic.setAttribute("aria-label", "Record a voice message");
    mic.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
    const rec = document.createElement("div");
    rec.className = "vm-rec"; rec.hidden = true;
    rec.innerHTML = '<i class="vm-dot"></i><span class="vm-clock">0:00</span><span class="vm-hint">Recording… up to 1 minute</span><button type="button" class="vm-x" aria-label="Discard">×</button><button type="button" class="vm-ok" aria-label="Send voice message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>';
    form.insertBefore(mic, form.querySelector("button[type=submit]"));
    form.append(rec);
    let mr = null, chunks = [], t0 = 0, tick = null, keep = false, stream = null;
    const stop = (k) => { keep = k; if (mr && mr.state !== "inactive") mr.stop(); clearInterval(tick); };
    mic.addEventListener("click", async () => {
      if (!S.canRecord) { S.toast("Voice messages need a microphone and a browser that can record."); return; }
      if (before && !(await before())) return;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { S.toast("The microphone is blocked. Allow it in the browser to send a voice message."); return; }
      chunks = []; keep = false;
      try { mr = new MediaRecorder(stream, { audioBitsPerSecond: 24000 }); } catch (e) { mr = new MediaRecorder(stream); }
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((x) => x.stop());
        form.classList.remove("recording"); rec.hidden = true;
        const dur = Math.max(1, Math.round((Date.now() - t0) / 1000));
        if (!keep || !chunks.length) return;
        const fr = new FileReader();
        fr.onload = () => send({ voice: fr.result, dur });
        fr.readAsDataURL(new Blob(chunks, { type: mr.mimeType || "audio/webm" }));
      };
      mr.start(); t0 = Date.now();
      form.classList.add("recording"); rec.hidden = false;
      tick = setInterval(() => { const s = (Date.now() - t0) / 1000; rec.querySelector(".vm-clock").textContent = mmss(s); if (s >= 60) stop(true); }, 250);
    });
    rec.querySelector(".vm-x").addEventListener("click", () => stop(false));
    rec.querySelector(".vm-ok").addEventListener("click", () => stop(true));
  };

  // ---------- A message as it shows in either chat ----------
  S.msgBody = (m) => (m.voice ? S.voiceBubble(m) : esc(m.text));
  S.save();
})();
