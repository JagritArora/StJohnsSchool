/* The principal's and office's day: cover for teachers on leave, the gate (pick-ups and
   visitors), fee follow-up, the activity log, notices waiting for approval and the
   weekly summary. Runs on the staff page for the principal and the office only. */
(function () {
  const S = window.SJS;
  if (!S.staff || !/^(principal|admin)$/.test(S.staff.role)) return;
  const esc = S.esc, role = S.staff.role, me = S.staff.name;
  const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const short = (t) => t.replace(/^(Mr|Mrs|Ms)\.\s*/, "");
  const ini = (n) => short(n).split(" ").map((w) => w[0]).join("").slice(0, 2);

  // ---------- Cover ----------
  function renderCover() {
    const away = S.leaveToday(), rows = S.coverToday(), done = S.state.cover[S.todayKey] || (S.state.cover[S.todayKey] = {});
    const left = rows.filter((r) => !done[r.id]).length;
    S.paint(S.$("#d-cover"), `<div class="card-h"><h2>Periods to cover today</h2><span class="right pill ${left ? "warn" : "green"}">${left ? `${left} to assign` : "All covered"}</span></div>` +
      (rows.length ? `<div class="list">${rows.map((r) => { const a = done[r.id]; return `<div class="li cv-li${a ? " on" : ""}" data-cv-row="${esc(r.id)}"><span class="sq ${a ? "green" : "warn"} cv-p">P${r.p + 1}</span><div class="t"><b>${esc(S.secName(r.key))} · ${esc(r.subj)} · ${r.time}</b><span>${a ? `Covered by ${esc(a)}` : `Usually ${esc(r.teacher)}`}</span></div>
        <label class="cv-pick"><span class="sr-only">Cover teacher</span><select data-cv="${esc(r.id)}"><option value="">${a ? "Change" : "Assign"}</option>${r.free.map((f) => `<option value="${esc(f.name)}"${a === f.name ? " selected" : ""}>${esc(f.name)} · ${esc(f.subject)}${f.same ? ", same subject" : ""} · ${f.load} periods today</option>`).join("")}</select></label></div>`; }).join("")}</div>
        <p class="muted cv-note">Suggestions are teachers free in that period: the same subject first, then whoever has the lightest day.</p>` : `<p class="muted">No periods to cover today.</p>`));
    const pool = S.TEACHERS.filter((t) => !away.some((a) => a.name === t.name));
    S.paint(S.$("#d-leave"), `<div class="card-h"><h2>On leave today</h2></div><div class="list">${away.map((a) => `<div class="li"><span class="avatar soft">${ini(a.name)}</span><div class="t"><b>${esc(a.name)}</b><span>${esc(a.why)}</span></div></div>`).join("")}</div>
      <form id="lv-form" class="lv-form"><label class="sr-only" for="lv-t">Teacher</label><select id="lv-t" class="input">${pool.map((t) => `<option>${esc(t.name)}</option>`).join("")}</select><button class="btn btn-ghost btn-sm" type="submit">Mark on leave</button></form>`);
  }
  document.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-cv]"); if (!sel || !sel.value) return;
    const r = S.coverToday().find((x) => x.id === sel.dataset.cv); S.state.cover[S.todayKey][r.id] = sel.value; S.save(); renderCover();
    S.landed(S.$(`[data-cv-row="${CSS.escape(r.id)}"]`));
    S.toast(`Assigned: ${sel.value} takes ${S.secName(r.key)} ${r.subj}, period ${r.p + 1}. They have an app alert.`);
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "lv-form") return; e.preventDefault();
    const n = S.$("#lv-t").value; S.leaveToday().push({ name: n, why: "Leave marked by the office" }); S.save(); renderCover();
    S.toast(`Marked on leave: ${n}. Their periods are in the cover list.`);
  });

  // ---------- Gate: pick-ups and visitors ----------
  let gateQ = "", gateCode = "";
  function renderGate() {
    const pass = gateCode.length === 6 ? S.passFor(gateCode) : null;
    const today = S.state.passes.filter((p) => p.date === S.todayKey);
    const hits = gateQ.length > 1 ? S.PARENTS.filter((p) => S.kid(p.key).name.toLowerCase().includes(gateQ.toLowerCase())).slice(0, 4) : [];
    S.paint(S.$("#d-gate-out"), (gateCode.length === 6 ? (pass ? `<div class="gate-res ok"><b>${esc(pass.name)} · ${esc(pass.rel)}</b><span>May collect <b>${esc(S.kidName(pass.kid))}</b> today. Check a photo ID.</span>${pass.used ? `<span class="pill">Already used at ${esc(pass.used.at)}</span>` : `<button class="btn btn-primary btn-sm" type="button" data-hand="${pass.code}">Handed over</button>`}</div>` : `<div class="gate-res bad"><b>No pick-up with this code today</b><span>Call the parent on the number the school has before letting the child go.</span></div>`) : "") +
      (hits.length ? hits.map((p) => { const k = S.kid(p.key), ps = S.pickupsOf(p.key); return `<div class="gate-res"><b>${esc(k.name)} · ${esc(k.label)}</b><span>${ps.length ? ps.map((x) => `${esc(x.name)} (${esc(x.rel.toLowerCase())})`).join(", ") : `${esc(p.parent)} (${esc(p.relation.toLowerCase())}), from the admission form`}</span></div>`; }).join("") : gateQ.length > 1 ? `<p class="muted">No demo family matches. In the real app every student is here.</p>` : ""));
    S.paint(S.$("#d-gate-list"), today.length ? today.map((p) => `<div class="li"><span class="sq ${p.used ? "green" : "royal"}">${p.used ? TICK : "•"}</span><div class="t"><b>${esc(p.name)} for ${esc(S.kidName(p.kid))}</b><span>${p.used ? `Handed over at ${esc(p.used.at)}` : "Expected today · code given to them"}</span></div></div>`).join("") : `<p class="muted">No one-off pick-ups today.</p>`);
    const vs = S.state.visitors[S.todayKey] || [];
    S.paint(S.$("#d-vis-list"), vs.length ? vs.map((v, i) => `<div class="li"><span class="sq ${v.out ? "" : "gold"}">${v.out ? "Out" : "In"}</span><div class="t"><b>${esc(v.name)}</b><span>${esc(v.why)} · to ${esc(v.whom)} · in ${esc(v.in)}${v.out ? `, out ${esc(v.out)}` : ""}</span></div>${v.out ? "" : `<button class="link-btn end" type="button" data-vout="${i}">Mark out</button>`}</div>`).join("") : `<p class="muted">No visitors yet today.</p>`);
    S.$("#d-vis-n").textContent = `${vs.filter((v) => !v.out).length} on campus now`;
  }
  document.addEventListener("input", (e) => {
    if (e.target.id === "g-code") { gateCode = e.target.value.replace(/\D/g, "").slice(0, 6); e.target.value = gateCode; renderGate(); }
    if (e.target.id === "g-q") { gateQ = e.target.value.trim(); renderGate(); }
  });
  document.addEventListener("click", (e) => {
    const h = e.target.closest("[data-hand]");
    if (h) { const p = S.passFor(h.dataset.hand); p.used = { at: S.timeNow(), by: me }; S.save(); renderGate(); S.toast(`Handed over: ${S.kidName(p.kid)} to ${p.name}. The parent has an SMS.`); }
    const o = e.target.closest("[data-vout]");
    if (o) { const v = S.state.visitors[S.todayKey][+o.dataset.vout]; v.out = S.timeNow(); S.save(); renderGate(); S.toast(`Marked out: ${v.name}`); }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "vis-form") return; e.preventDefault();
    const f = e.target, v = { name: f["v-n"].value.trim(), phone: f["v-p"].value.trim(), whom: f["v-w"].value, why: f["v-y"].value.trim() || "Meeting", in: S.timeNow(), out: null };
    if (!v.name) return; (S.state.visitors[S.todayKey] = S.state.visitors[S.todayKey] || []).push(v); S.save(); f.reset(); renderGate();
    S.toast(`Added: ${v.name}, visiting ${v.whom}`);
  });

  // ---------- Fee follow-up ----------
  const FS = { none: ["Not contacted", ""], reminded: ["Reminded", "gold"], promised: ["Promised", "royal"], paid: ["Paid at the counter", "green"] };
  const stOf = (f) => { const s = S.feeStateOf(f.key); return s.paid ? "paid" : s.promise ? "promised" : (s.reminded || []).length || f.late ? "reminded" : "none"; };
  function renderFees() {
    const fs = S.feeFamilies(), F = S.FEE_NOW, n = (k) => fs.filter((f) => stOf(f) === k).length;
    S.paint(S.$("#d-fees"), `<div class="card-h"><h2>${F.q} fees: families yet to pay</h2><span class="right muted" style="font-size:13.5px">${F.families} families in all · ${fs.length} shown as a sample</span></div>
      <div class="ff-sum">${Object.entries(FS).map(([k, [l, t]]) => `<span><i class="sq ${t}">${n(k)}</i>${l}</span>`).join("")}</div>
      <div class="list">${fs.map((f) => { const s = S.feeStateOf(f.key), k = stOf(f), rem = (s.reminded || []).length + f.late;
        return `<div class="li ff-li" data-ff-row="${f.key}"><span class="avatar soft">${ini(f.name)}</span><div class="t"><b>${esc(f.name)} · ${esc(S.secName(f.label))} · ${S.rupee(f.amount)}</b><span><span class="pill ${FS[k][1]}">${FS[k][0]}${k === "promised" ? " by " + S.fmt(s.promise, { day: "numeric", month: "short" }) : ""}</span>${rem ? ` ${rem} reminder${rem > 1 ? "s" : ""} so far` : ""}${s.note ? " · " + esc(s.note) : ""}</span></div>
          ${k === "paid" ? "" : `<div class="ff-act"><button class="btn btn-ghost btn-sm" type="button" data-ff="remind" data-k="${f.key}">Remind</button><label class="ff-date"><span class="sr-only">Promised by</span><input type="date" data-ff-p="${f.key}" min="${S.todayKey}" value="${s.promise || ""}" title="Promised to pay by" /></label><button class="link-btn" type="button" data-ff="paid" data-k="${f.key}">Paid</button></div>`}</div>`; }).join("")}</div>
      <p class="muted cv-note">Reminders go by SMS and in the app. A promise date brings the family back to the top of this list the day after, if nothing has come in.</p>`);
  }
  const ff = (k) => S.state.feeFollow[k] || (S.state.feeFollow[k] = {});
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ff]"); if (!b) return;
    const k = b.dataset.k, f = S.feeFamilies().find((x) => x.key === k);
    if (b.dataset.ff === "remind") { (ff(k).reminded = ff(k).reminded || []).push(S.todayKey); S.save(); renderFees(); S.landed(S.$(`[data-ff-row="${k}"]`)); S.toast(`Sent a fee reminder to ${f.name}'s family`); }
    if (b.dataset.ff === "paid") { ff(k).paid = S.todayKey; S.save(); renderFees(); S.toast(`Marked paid at the counter: ${f.name}`); }
  });
  document.addEventListener("change", (e) => {
    const i = e.target.closest("[data-ff-p]"); if (!i || !i.value) return;
    const k = i.dataset.ffP, f = S.feeFamilies().find((x) => x.key === k); ff(k).promise = i.value; S.save(); renderFees();
    S.toast(`Saved: ${f.name}'s family promised to pay by ${S.fmt(i.value, { day: "numeric", month: "long" })}`);
  });

  // ---------- Activity log ----------
  let logQ = "";
  function renderLog() {
    const all = S.state.activity, ok = S.threadIntact(all), xs = [...all].reverse().filter((a) => !logQ || (a.from + " " + a.text).toLowerCase().includes(logQ.toLowerCase()));
    S.paint(S.$("#d-log-list"), (ok ? "" : `<p class="rec-note bad">${S.ICON_LOCK}This record has been changed since it was written. Please tell the school office.</p>`) +
      (xs.length ? xs.slice(0, 60).map((a) => `<div class="li log-li"><span class="avatar soft">${esc(ini(a.from))}</span><div class="t"><b>${esc(a.text)}</b><span>${esc(a.from)} · ${esc(a.at)}</span></div></div>`).join("") : `<p class="muted">Nothing matches.</p>`));
    S.$("#d-log-n").innerHTML = `${S.ICON_LOCK}${all.length} entries · ${ok ? "nothing changed or removed" : "changed"}`;
  }
  document.addEventListener("input", (e) => { if (e.target.id === "log-q") { logQ = e.target.value.trim(); renderLog(); } });

  // ---------- Notices waiting for approval ----------
  // Notices from the office go to the principal first; the principal's own go straight out.
  if (!S.state.pending.length && S.PHASE === "mid") {
    S.state.pending.push({ id: "pa1", by: "Mrs. Anita Joseph", at: S.fmt(S.todayKey) + ", 9:40 AM", status: "waiting", note: "",
      n: { title: "Inter-house quiz, Classes VI to VIII", text: "The inter-house quiz is on Friday, 6 November, in the assembly hall. Each house sends four students; class teachers will pick them by Monday.", date: "2026-11-06", tag: "Event", level: "low", to: { cls: ["VI", "VII", "VIII"] }, web: true } });
  }
  const submitBtn = S.$("#nt-form button[type=submit]");
  if (role === "admin" && submitBtn) submitBtn.textContent = "Send to the principal for approval";
  function renderPending() {
    const box = S.$("#nt-pending"); if (!box) return;
    const xs = S.state.pending.filter((p) => p.status !== "sent" && (role === "principal" ? p.status === "waiting" : true));
    S.paint(box, xs.length ? `<div class="card ap-card"><div class="card-h"><h2>${role === "principal" ? "Waiting for your approval" : "Sent for approval"}</h2><span class="right pill warn">${xs.filter((p) => p.status === "waiting").length} waiting</span></div>${xs.map((p) => `
      <div class="ap" data-ap-row="${p.id}"><div class="ap-top">${S.levelBadge(p.n)}<span class="pill">${esc(p.n.tag)}</span><span class="muted">${esc(S.audienceText(p.n))} · ${S.reach(S.toOf(p.n)).toLocaleString("en-IN")} families</span></div>
        <b>${esc(p.n.title)}</b><p>${esc(p.n.text)}</p><span class="muted ap-by">From ${esc(p.by)} · ${esc(p.at)}${p.status === "returned" ? ` · <b class="ap-ret">Returned: ${esc(p.note || "see the principal")}</b>` : ""}</span>
        <div class="ap-act">${role === "principal" ? `<button class="btn btn-primary btn-sm" type="button" data-ap="ok" data-id="${p.id}">Approve and send</button><input class="input ap-note" placeholder="Note for the office, if returning" aria-label="Note for the office" data-ap-note="${p.id}" /><button class="btn btn-ghost btn-sm" type="button" data-ap="back" data-id="${p.id}">Return</button>`
          : p.status === "returned" ? `<button class="btn btn-ghost btn-sm" type="button" data-ap="edit" data-id="${p.id}">Edit and send again</button>` : `<button class="link-btn" type="button" data-ap="pull" data-id="${p.id}">Withdraw</button>`}</div></div>`).join("")}</div>` : "");
    const w = S.pendingNotices();
    const ov = S.$("#p-approve");
    if (ov) S.paint(ov, role === "principal" && w.length ? `<button class="ap-banner" type="button" data-go="notices"><span class="sq warn">${w.length}</span><span><b>${w.length === 1 ? "A notice is" : w.length + " notices are"} waiting for your approval</b><span>${esc(w[0].n.title)}, from ${esc(w[0].by)}</span></span><span class="end">Review</span></button>` : "");
    document.querySelectorAll('[data-count="notices"]').forEach((c) => { c.hidden = role !== "principal" || !w.length; c.textContent = w.length; });
  }
  S.renderPending = renderPending;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ap]"); if (!b) return;
    const p = S.state.pending.find((x) => x.id === b.dataset.id); if (!p) return;
    if (b.dataset.ap === "ok") {
      S.state.notices.push(Object.assign({}, p.n, { id: "n" + Date.now(), fresh: true, sent: S.todayKey, approvedBy: me, from: p.by }));
      p.status = "sent"; S.save(); renderPending(); if (S.renderNotices) S.renderNotices();
      S.toast(`Approved and sent: ${p.n.title}`);
    }
    if (b.dataset.ap === "back") { p.status = "returned"; p.note = (S.$(`[data-ap-note="${p.id}"]`).value || "").trim(); S.save(); renderPending(); S.toast(`Returned to ${p.by}`, { done: true }); }
    if (b.dataset.ap === "pull") { S.state.pending.splice(S.state.pending.indexOf(p), 1); S.save(); renderPending(); S.toast("Withdrawn. The principal no longer sees it."); }
    if (b.dataset.ap === "edit") {
      S.$("#nt-title").value = p.n.title; S.$("#nt-text").value = p.n.text; S.$("#nt-date").value = p.n.date; S.$("#nt-tag").value = p.n.tag;
      S.state.pending.splice(S.state.pending.indexOf(p), 1); S.save(); renderPending(); S.$("#nt-title").focus();
      S.toast("Back in the form. Change it, then send it for approval again.");
    }
  });

  // ---------- Weekly summary ----------
  function weeklyText() {
    const a = S.attSummary(), F = S.FEE_NOW, enq = S.state.enquiries, wk = S.iso(S.addDays(S.today, -6));
    const newE = enq.filter((e) => e.at >= wk).length, adm = enq.filter((e) => e.status === "Admitted").length;
    const sent = S.state.notices.filter((n) => (n.sent || n.date) >= wk && (n.sent || n.date) <= S.todayKey).length;
    const cover = S.coverToday().length, w = S.pendingNotices().length;
    return [
      `<b>St. John's · week to ${S.fmt(S.todayKey, { day: "numeric", month: "short" })}</b>`,
      `Attendance today ${a.pct}%${a.low ? `; lowest ${S.secName(a.low.key)} at ${a.lowPct}%` : ""}.`,
      `Admissions: ${newE} new ${newE === 1 ? "enquiry" : "enquiries"} this week, ${adm} admitted so far.`,
      `${F.q} fees: ${F.pct}% in, ${F.families} families to go.`,
      `Today ${S.leaveToday().length} teachers are on leave, with ${cover} periods to cover.`,
      `${sent} notice${sent === 1 ? "" : "s"} went out this week${w ? `; ${w} waiting for your approval` : ""}.`
    ];
  }
  function weeklyModal() {
    let m = S.$("#wk-modal");
    if (!m) {
      m = document.createElement("div"); m.className = "modal"; m.id = "wk-modal";
      m.innerHTML = `<div class="modal-card"><h3>Weekly summary</h3><p class="muted">What reaches your phone on Saturday evening, made from the week's records.</p><div class="wk-phone" id="wk-body"></div>
        <label class="cr-chk" style="margin-top:16px"><input type="checkbox" id="wk-on" /> Send to my phone every Saturday at 6 PM</label>
        <div class="pc-row" style="margin-top:18px"><button type="button" class="btn btn-ghost" data-close>Close</button><button type="button" class="btn btn-primary" id="wk-test">Send a test now</button></div></div>`;
      document.body.append(m);
      m.querySelector("#wk-on").addEventListener("change", (e) => { S.state.weekly.on = e.target.checked; S.save(); S.toast(e.target.checked ? "Saved. It comes every Saturday at 6 PM." : "Saved. The weekly summary is off.", { nolog: true }); });
      m.querySelector("#wk-test").addEventListener("click", () => { m.classList.remove("open"); S.toast("Sent to your phone (demo)", { nolog: true }); });
    }
    m.querySelector("#wk-body").innerHTML = weeklyText().map((l) => `<p>${l}</p>`).join("");
    m.querySelector("#wk-on").checked = !!S.state.weekly.on;
    m.classList.add("open");
  }
  document.addEventListener("click", (e) => { if (e.target.closest("#wk-btn")) weeklyModal(); });

  // ---------- Website: bus stops and job openings ----------
  // (The editors are in the Website tab; saving goes through its change log, so it can be undone.)

  function renderDay() { renderCover(); renderGate(); renderFees(); renderLog(); }
  S.renderDay = renderDay;
  renderDay(); renderPending();
  document.addEventListener("sjs:view", (e) => { if (e.detail === "day") renderDay(); if (e.detail === "notices" || e.detail === "overview") renderPending(); });
  document.addEventListener("sjs:sync", () => { renderDay(); renderPending(); });
})();
