/* Staff page: exams and datesheets (everyone), and notices (office and principal).
   The office and the principal edit and publish datesheets; teachers read them. */
(function () {
  const S = window.SJS;
  if (!S.staff) return;
  const role = S.staff.role, editor = role === "principal" || role === "admin";
  const CLS = S.sample.classes, EXC = S.EXAM_CLASSES;
  const esc = S.esc, fmt = S.fmt;
  const dLong = (k) => fmt(k, { weekday: "short", day: "numeric", month: "short" });
  const toneOf = (e) => S.EXAM_KINDS[e.kind].tone;
  const pillOf = (st) => (st.k === "on" ? "warn" : st.k === "done" ? "green" : "royal");

  // ======================= Exams =======================
  const box = S.$("#xs-main");
  if (box) {
    const mineCls = role === "teacher" ? S.sectionByKey(S.staff.classOf || S.staff.sections[0]).cls : "";
    let fCls = mineCls, sel = null, grp = null;
    S.$("#xs-cls").innerHTML = `<option value="">All classes</option>` + EXC.map((c) => `<option value="${c}">${S.classLabel(c)}</option>`).join("");
    S.$("#xs-cls").value = fCls;
    if (!editor) S.$("#xs-sub").textContent = "Datesheets for your classes. The school office publishes them to parents.";
    const list = () => S.state.exams.filter((e) => !fCls || e.classes.includes(fCls)).sort((a, b) => (S.examSpan(a).from < S.examSpan(b).from ? -1 : 1));
    const spanTxt = (e, g) => { const { from, to } = S.examSpan(e, g); if (!from) return "No papers"; if (e.kind === "ts") return `Saturdays, ${fmt(from, { month: "short" })} to ${fmt(to, { month: "short" })}`; return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`; };
    // What's wrong with a paper's date, if anything.
    const issue = (ps, p) => {
      const d = new Date(p.date + "T00:00");
      if (!p.date) return "No date";
      if (d.getDay() === 0) return "Sunday";
      if (S.HOLIDAYS[p.date]) return S.HOLIDAYS[p.date];
      if (ps.filter((q) => q.date === p.date).length > 1) return "Two papers this day";
      return "";
    };
    const groupsOf = (e) => S.examGroups(e.classes).filter((g) => !fCls || g.split("-")[0] === fCls);

    function renderExams() {
      const xs = list();
      if (!xs.some((e) => e.id === sel)) { const on = xs.find((e) => S.examStatus(e).k !== "done"); sel = (on || xs[xs.length - 1] || {}).id || null; }
      const e = xs.find((x) => x.id === sel);
      S.$("#xs-count").textContent = `${xs.length} exam${xs.length === 1 ? "" : "s"}${fCls ? " · " + S.classLabel(fCls) : ""}`;
      S.paint(S.$("#xs-list"), xs.map((x) => {
        const st = S.examStatus(x);
        return `<button type="button" class="ex-row t-${toneOf(x)}${x === e ? " on" : ""}" data-xs="${x.id}" aria-pressed="${x === e}"><i class="ex-dot"></i><span class="t"><b>${esc(x.name)}</b><span>${S.classesText(x.classes)} · ${spanTxt(x)}</span></span><span class="xs-pills"><span class="pill ${pillOf(st)}">${st.label || "–"}</span>${x.published ? "" : `<span class="pill">Draft</span>`}</span></button>`;
      }).join("") || `<p class="chart-empty">No exams for ${S.classLabel(fCls)} this session.</p>`);
      if (!e) { S.paint(box, `<p class="chart-empty">${fCls ? `${S.classLabel(fCls)} has no exams this session.` : "No exams yet."}</p>`); return; }
      const gs = groupsOf(e);
      if (!gs.includes(grp)) grp = gs[0];
      const ps = e.papers[grp] || [], st = S.examStatus(e, grp);
      let h = `<div class="ex-h t-${toneOf(e)}"><span class="ex-k">${S.EXAM_KINDS[e.kind].name}</span><h2>${esc(e.name)}</h2><p>${S.classesText(e.classes)} · ${spanTxt(e)}</p></div>`;
      h += `<div class="xs-bar">` + (gs.length > 1 ? `<label class="xs-g">Datesheet for <select id="xs-grp">${gs.map((g) => `<option value="${g}"${g === grp ? " selected" : ""}>${esc(S.groupLabel(g))}</option>`).join("")}</select></label>` : `<span class="xs-g"><b>${esc(S.groupLabel(grp))}</b></span>`) +
        `<span class="pill ${pillOf(st)}">${st.label}</span>` +
        (e.published ? `<span class="pill green">Published to parents</span>` : `<span class="pill">Draft · parents can't see it</span>`) + `</div>`;
      if (editor) {
        h += `<div class="ds ds-edit">` + ps.map((p, i) => { const bad = issue(ps, p); return `<div class="ds-row${bad ? " bad" : ""}"><input type="date" value="${p.date}" data-pi="${i}" aria-label="Date of the ${esc(p.subj)} paper" /><span class="ds-s"><b>${esc(p.subj)}</b><span>${p.date ? fmt(p.date, { weekday: "long" }) : ""}</span></span>${bad ? `<span class="pill red">${esc(bad)}</span>` : ""}</div>`; }).join("") + `</div>`;
        h += `<div class="row2 xs-meta"><div class="field"><label for="xs-time">Time</label><input id="xs-time" value="${esc(e.time)}" /></div><div class="field"><label for="xs-name">Name</label><input id="xs-name" value="${esc(e.name)}" /></div></div>`;
        h += `<div class="field"><label for="xs-note">What parents should know</label><textarea id="xs-note" style="min-height:76px">${esc(e.note || "")}</textarea></div>`;
        const bad = S.examGroups(e.classes).flatMap((g) => (e.papers[g] || []).filter((p) => issue(e.papers[g], p)).map(() => g));
        h += `<div class="xs-act">${e.published ? `<button type="button" class="btn btn-ghost btn-sm" id="xs-unpub">Take it back to draft</button>` : `<button type="button" class="btn btn-primary btn-sm" id="xs-pub"${bad.length ? " disabled" : ""}>Publish to parents</button>${bad.length ? `<span class="muted">Fix ${bad.length} date${bad.length === 1 ? "" : "s"} first${[...new Set(bad)].length < S.examGroups(e.classes).length ? ": " + [...new Set(bad)].map(S.groupLabel).join(", ") : ""}</span>` : `<span class="muted">Sends a high-importance notice to ${S.classesText(e.classes)}.</span>`}<button type="button" class="link-btn xs-del" id="xs-del">Delete this draft</button>`}</div>`;
      } else {
        h += `<div class="ex-meta"><span>${esc(e.time)}</span><span>${ps.length} papers</span></div><ol class="ds">` + ps.map((p) => `<li class="${p.date < S.todayKey ? "past" : ""}${p.date === S.todayKey ? " today" : ""}"><time datetime="${p.date}"><b>${fmt(p.date, { day: "numeric" })}</b><span>${fmt(p.date, { month: "short" })}</span></time><span class="ds-s"><b>${esc(p.subj)}</b><span>${fmt(p.date, { weekday: "long" })}</span></span></li>`).join("") + `</ol>` + (e.note ? `<p class="ex-note">${esc(e.note)}</p>` : "");
      }
      S.paint(box, h);
    }
    S.renderExams = renderExams;

    // Saving: a published exam's notice follows its new dates.
    const touch = (e, msg) => {
      if (e.published) { const i = S.state.notices.findIndex((n) => n.id === "ex-" + e.id); if (i >= 0) S.state.notices[i] = Object.assign(S.examNotice(e), { fresh: true }); }
      S.save(); renderExams(); if (msg) S.toast(msg);
    };
    const cur = () => S.state.exams.find((x) => x.id === sel);
    S.$("#xs-list").addEventListener("click", (ev) => { const b = ev.target.closest("[data-xs]"); if (!b) return; sel = b.dataset.xs; grp = null; renderExams(); if (S.narrow && S.narrow()) box.scrollIntoView({ block: "start" }); });
    S.$("#xs-cls").addEventListener("change", (ev) => { fCls = ev.target.value; grp = null; renderExams(); });
    box.addEventListener("change", (ev) => {
      const e = cur(); if (!e) return;
      const t = ev.target;
      if (t.id === "xs-grp") { grp = t.value; renderExams(); return; }
      if (!editor) return;
      if (t.dataset.pi != null) {
        const p = e.papers[grp][+t.dataset.pi], was = p.date;
        p.date = t.value;
        // A published datesheet only takes school days; a draft keeps the date and flags it.
        const bad = issue(e.papers[grp], p);
        if (bad && e.published) { p.date = was; const typed = t.value; t.value = was; S.toast(`${typed ? fmt(typed, { weekday: "short", day: "numeric", month: "short" }) : "That date"}: ${bad}. Pick a school day.`); return; }
        e.papers[grp].sort((a, b) => (a.date < b.date ? -1 : 1));
        touch(e, e.published ? "Date changed. Parents see the new datesheet at once." : bad ? `Saved in the draft. ${bad}: fix it before publishing.` : "Date changed in the draft"); return;
      }
      if (t.id === "xs-time") { e.time = t.value.trim(); touch(e, "Time saved"); }
      if (t.id === "xs-name") { e.name = t.value.trim() || e.name; touch(e, "Name saved"); }
      if (t.id === "xs-note") { e.note = t.value.trim(); touch(e, "Saved"); }
    });
    box.addEventListener("click", (ev) => {
      const e = cur(); if (!e || !editor) return;
      if (ev.target.closest("#xs-pub")) {
        e.published = true;
        S.state.notices = S.state.notices.filter((n) => n.id !== "ex-" + e.id);
        S.state.notices.push(Object.assign(S.examNotice(e), { fresh: true }));
        S.save(); renderExams(); if (S.renderNotices) S.renderNotices();
        S.toast(`Published. ${S.reach({ cls: e.classes }).toLocaleString("en-IN")} families get a high-importance notice.`);
      }
      if (ev.target.closest("#xs-unpub")) {
        e.published = false; S.state.notices = S.state.notices.filter((n) => n.id !== "ex-" + e.id);
        S.save(); renderExams(); if (S.renderNotices) S.renderNotices(); S.toast("Back to draft. Parents no longer see it.");
      }
      if (ev.target.closest("#xs-del") && confirm(`Delete the draft "${e.name}"?`)) {
        S.state.exams = S.state.exams.filter((x) => x !== e); sel = null; S.save(); renderExams(); S.toast("Draft deleted");
      }
    });

    // New exam: a draft from each class's subjects.
    if (editor) {
      const pick = new Set(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "XI"]);
      const chips = () => (S.$("#xf-cls").innerHTML = `<button type="button" class="tchip all${pick.size === EXC.length ? " on" : ""}" data-c="*" aria-pressed="${pick.size === EXC.length}">All</button><button type="button" class="tchip all" data-c="board" aria-pressed="false">X and XII</button>` + EXC.map((c) => `<button type="button" class="tchip${pick.has(c) ? " on" : ""}" data-c="${c}" aria-pressed="${pick.has(c)}">${c}</button>`).join(""));
      S.$("#xf-kind").innerHTML = Object.entries(S.EXAM_KINDS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
      S.$("#xs-new").addEventListener("click", () => {
        S.$("#xf-from").value = S.iso(S.nextSchoolDay(S.addDays(S.today, 27), 1)); S.$("#xf-err").hidden = true; chips(); S.openModal("xs-modal"); S.$("#xf-name").focus();
      });
      S.$("#xf-cls").addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-c]"); if (!b) return; const c = b.dataset.c;
        if (c === "*") { if (pick.size === EXC.length) pick.clear(); else EXC.forEach((x) => pick.add(x)); }
        else if (c === "board") { pick.clear(); pick.add("X"); pick.add("XII"); }
        else pick.has(c) ? pick.delete(c) : pick.add(c);
        chips();
      });
      S.$("#xf-kind").addEventListener("change", (ev) => {
        const k = ev.target.value, T = { ut: ["day", "8:00 to 9:30 AM, then regular classes"], ts: ["sat", "Saturdays, 8:00 to 9:30 AM"], hy: ["alt", "8:30 to 11:30 AM (Classes I to V till 10:30)"], pb: ["alt", "8:30 to 11:30 AM"], fin: ["alt", "8:30 to 11:30 AM (Classes I to V till 10:30)"] }[k];
        S.$("#xf-how").value = T[0]; S.$("#xf-time").value = T[1];
        if (k === "pb" || k === "ts") { pick.clear(); pick.add("X"); pick.add("XII"); chips(); }
      });
      S.$("#xs-form").addEventListener("submit", (ev) => {
        ev.preventDefault();
        const name = S.$("#xf-name").value.trim(), from = S.$("#xf-from").value, err = S.$("#xf-err");
        const why = !name ? "Give the exam a name." : !from ? "Pick the date of the first paper." : !pick.size ? "Pick at least one class." : "";
        if (why) { err.textContent = why; err.hidden = false; return; }
        const classes = EXC.filter((c) => pick.has(c)), how = S.$("#xf-how").value, kind = S.$("#xf-kind").value;
        const e = { id: "x" + Date.now(), name, kind, classes, time: S.$("#xf-time").value.trim(), note: "", papers: S.buildPapers(classes, from, how), published: false };
        S.state.exams.push(e); sel = e.id; grp = null; if (fCls && !classes.includes(fCls)) { fCls = ""; S.$("#xs-cls").value = ""; }
        S.save(); S.$("#xs-modal").classList.remove("open"); renderExams();
        S.toast(`Draft made for ${S.classesText(classes)}. Check the dates, then publish.`);
      });
    }
    renderExams();
    document.addEventListener("sjs:view", (ev) => { if (ev.detail === "exams") renderExams(); });
    document.addEventListener("sjs:sync", renderExams);
  }

  // ======================= Notices =======================
  const form = S.$("#nt-form");
  if (!form || !editor) return;
  const LV_HINT = { high: "Pinned on the parent's Home, and sent by SMS as well as in the app.", medium: "In the app and on WhatsApp.", low: "In the app only, no alert." };
  const aud = { level: "medium", staff: false, cls: new Set(), sec: new Set(), gender: "" };
  const secsFor = () => { const cs = aud.cls.size ? [...aud.cls] : CLS; return ["A", "B", "C"].filter((s) => cs.some((c) => S.SECTIONS[c].includes(s))); };
  const seg = (el, v) => el.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.v === v); b.setAttribute("aria-pressed", String(b.dataset.v === v)); });
  S.$("#nt-route").innerHTML = `<option value="">All routes</option>` + S.ROUTES.map((r) => `<option>${r}</option>`).join("");
  const toNow = () => aud.staff ? { staff: true } : { cls: CLS.filter((c) => aud.cls.has(c)), sec: [...aud.sec].sort(), bus: S.$("#nt-bus").value, route: S.$("#nt-bus").value === "bus" ? S.$("#nt-route").value : "", gender: aud.gender };
  function renderForm() {
    S.$("#nt-cls").innerHTML = `<button type="button" class="tchip all${aud.cls.size ? "" : " on"}" data-c="" aria-pressed="${!aud.cls.size}">Every class</button>` + CLS.map((c) => `<button type="button" class="tchip${aud.cls.has(c) ? " on" : ""}" data-c="${c}" aria-pressed="${aud.cls.has(c)}">${c === "Nur" ? "Nursery" : c}</button>`).join("");
    const ok = secsFor(); [...aud.sec].forEach((s) => { if (!ok.includes(s)) aud.sec.delete(s); });
    S.$("#nt-sec").innerHTML = `<button type="button" class="tchip all${aud.sec.size ? "" : " on"}" data-s="" aria-pressed="${!aud.sec.size}">Every section</button>` + ok.map((s) => `<button type="button" class="tchip${aud.sec.has(s) ? " on" : ""}" data-s="${s}" aria-pressed="${aud.sec.has(s)}">${s}</button>`).join("");
    S.$("#nt-route").disabled = S.$("#nt-bus").value !== "bus";
    const narrow = [S.$("#nt-bus").value === "bus" ? (S.$("#nt-route").value || "Bus students") : S.$("#nt-bus").value === "own" ? "Own transport" : "", aud.gender ? aud.gender[0].toUpperCase() + aud.gender.slice(1) : ""].filter(Boolean);
    S.$("#nt-more-s").textContent = narrow.join(", ");
    if (narrow.length) S.$("#nt-more").open = true;
    S.$("#nt-aud").hidden = aud.staff;
    S.$("#nt-lvl-hint").textContent = LV_HINT[aud.level];
    const to = toNow(), n = { to }, fam = S.reach(to);
    S.$("#nt-reach").innerHTML = aud.staff ? `<b>All staff</b><span>Teachers and the office, in the staff app.</span>` : `<b>${fam.toLocaleString("en-IN")} ${fam === 1 ? "family" : "families"}</b><span>${esc(S.audienceText(n))}</span>`;
    // Only notices for whole classes go on the public website.
    const priv = aud.staff || to.bus || to.gender, web = S.$("#nt-web");
    web.disabled = !!priv; if (priv) web.checked = false;
    S.$("#nt-web-hint").textContent = priv ? "Not for notices to a group of families or to staff." : "";
  }
  S.$("#nt-lvl").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (!b) return; aud.level = b.dataset.v; seg(S.$("#nt-lvl"), aud.level); renderForm(); });
  S.$("#nt-who").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (!b) return; aud.staff = b.dataset.v === "staff"; seg(S.$("#nt-who"), b.dataset.v); if (!aud.staff) S.$("#nt-web").checked = true; renderForm(); });
  S.$("#nt-gen").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (!b) return; aud.gender = b.dataset.v; seg(S.$("#nt-gen"), aud.gender); renderForm(); });
  S.$("#nt-cls").addEventListener("click", (ev) => { const b = ev.target.closest("[data-c]"); if (!b) return; const c = b.dataset.c; if (!c) aud.cls.clear(); else aud.cls.has(c) ? aud.cls.delete(c) : aud.cls.add(c); renderForm(); });
  S.$("#nt-sec").addEventListener("click", (ev) => { const b = ev.target.closest("[data-s]"); if (!b) return; const s = b.dataset.s; if (!s) aud.sec.clear(); else aud.sec.has(s) ? aud.sec.delete(s) : aud.sec.add(s); renderForm(); });
  S.$("#nt-bus").addEventListener("change", renderForm);
  S.$("#nt-route").addEventListener("change", renderForm);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const title = S.$("#nt-title").value.trim(), text = S.$("#nt-text").value.trim();
    if (!title || !text) { (title ? S.$("#nt-text") : S.$("#nt-title")).focus(); S.toast("Add a title and a message first"); return; }
    const to = toNow(), fam = S.reach(to);
    if (!aud.staff && !fam) { S.toast("No families match. Widen the classes or groups."); return; }
    const nn = { id: "n" + Date.now(), title, text, date: S.$("#nt-date").value || S.todayKey, tag: S.$("#nt-tag").value, level: aud.level, to, fresh: true, web: S.$("#nt-web").checked, sent: S.todayKey };
    // The office's notices wait for the principal; the principal's go straight out.
    if (S.staff && S.staff.role === "admin") {
      S.state.pending.push({ id: "pa" + Date.now().toString(36), by: S.staff.name, at: S.fmt(S.todayKey) + ", " + S.timeNow(), status: "waiting", note: "", n: nn });
      S.save(); if (S.renderPending) S.renderPending();
      S.landed(S.$("#nt-pending .ap:last-child"));
      S.toast(`Sent to the principal for approval. It goes to ${aud.staff ? "staff" : fam.toLocaleString("en-IN") + " families"} once approved.`);
      return;
    }
    S.state.notices.push(nn);
    S.save(); renderList();
    S.landed(S.$$("#nt-list .ns-li").find((li) => li.querySelector("b").textContent === title));
    S.toast(aud.staff ? "Sent to all staff" : `Sent to ${fam.toLocaleString("en-IN")} ${fam === 1 ? "family" : "families"} · ${aud.level === "high" ? "app and SMS" : aud.level === "medium" ? "app and WhatsApp" : "app"}`);
  });

  // The sent list, with filters.
  const f = { lv: "", cls: "", sec: "", cat: "" };
  S.$("#ns-cls").innerHTML = `<option value="">All</option>` + CLS.map((c) => `<option value="${c}">${S.classLabel(c)}</option>`).join("");
  S.$("#ns-sec").innerHTML = `<option value="">All</option>` + ["A", "B", "C"].map((s) => `<option>${s}</option>`).join("");
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3l6 4V6L7 10z"/></svg>';
  function renderList() {
    const all = S.state.notices, t = (n) => S.toOf(n);
    const xs = [...all].reverse().filter((n) => (!f.lv || S.levelOf(n) === f.lv) &&
      (!f.cls || S.noticeReachesClass(n, f.cls)) && (!f.sec || (!t(n).staff && (!t(n).sec.length || t(n).sec.includes(f.sec)))) &&
      (!f.cat || (f.cat === "staff" ? t(n).staff : f.cat === "bus" ? t(n).bus === "bus" : f.cat === "own" ? t(n).bus === "own" : t(n).gender === f.cat)));
    S.$("#ns-count").textContent = xs.length === all.length ? `${all.length} notices` : `${xs.length} of ${all.length}`;
    S.paint(S.$("#nt-list"), xs.map((n) => `<div class="li ns-li lv-${S.levelOf(n)}"><span class="sq ${S.levelOf(n) === "high" ? "red" : n.fresh ? "gold" : ""}">${ICON}</span><div class="t"><b>${esc(n.title)}</b><span>${dLong(n.date)} · ${esc(S.audienceText(n))}${n.web === false || t(n).staff || t(n).bus || t(n).gender ? "" : " · website"}</span></div><div class="end ns-end">${S.levelBadge(n)}<span class="pill">${esc(n.tag)}</span>${S.levelOf(n) === "high" && !t(n).staff && S.ackCount ? (() => { const a = S.ackCount(n); return `<span class="ns-read"${S.tipAttr ? S.tipAttr("Families who tapped \"I've read this\". Sample figures, plus the demo family.", "Read") : ""}>Read by ${a.read.toLocaleString("en-IN")} of ${a.of.toLocaleString("en-IN")}</span>`; })() : ""}</div></div>`).join("") || `<p class="chart-empty">No notices match these filters.</p>`);
  }
  S.renderNotices = renderList;
  S.$("#ns-lv").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (!b) return; f.lv = b.dataset.v; seg(S.$("#ns-lv"), f.lv); renderList(); });
  [["#ns-cls", "cls"], ["#ns-sec", "sec"], ["#ns-cat", "cat"]].forEach(([q, k]) => S.$(q).addEventListener("change", (ev) => { f[k] = ev.target.value; renderList(); }));
  renderForm(); renderList();
  document.addEventListener("sjs:sync", renderList);
})();
