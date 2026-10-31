/* Presenter controls for the demo: which stage of the session to show, and
   whose view to open. Lives in the prototype bar of every portal page. */
(function () {
  const S = window.SJS;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  
  // The demo cast: a few people to open, so the picker stays short. The whole
  // school's data still exists behind them for the principal and office views.
  S.CAST = {
    parents: ["IX-A-4", "IX-A-30", "IX-B-15", "XII-A-6", "XII-B-6"],
    teachers: ["SJS-T-0508", "SJS-T-0507", "SJS-T-0509", "SJS-T-0530", "SJS-T-0536", "SJS-T-0529"]
  };
  const tLabel = (t) => `${t.name} · ${t.subject}${t.classOf ? ", class teacher " + t.classOf : ", " + t.sections.join(", ")}`;
  S.demoPeople = () => {
    const ts = S.CAST.teachers.map((id) => S.STAFF[id]).filter(Boolean);
    const ps = S.CAST.parents.map((k) => S.PARENTS.find((p) => p.key === k)).filter(Boolean);
    return [
      { label: "School leadership", items: [["staff:SJS-P-0001", "Principal"], ["staff:SJS-A-0107", "Office admin · Mrs. Anita Joseph"]] },
      { label: "Teachers", items: ts.map((t) => [`staff:${t.id}`, tLabel(t)]) },
      { label: "Parents", items: ps.map((p) => { const k = S.kid(p.key); return [`kid:${p.key}`, `${p.parent} · parent of ${k.name}, ${k.label}`]; }) }
    ];
  };
  S.openAs = (v) => {
    const [kind, id] = v.split(":");
    try { localStorage.setItem(kind === "kid" ? "sjs-kid" : "sjs-staff", id); } catch (e) {}
    location.href = kind === "kid" ? "parent.html?kid=" + encodeURIComponent(id) : "staff.html?id=" + encodeURIComponent(id);
  };
  S.demoSelects = (current) => {
    const phases = Object.entries(S.PHASES).map(([k, p]) => `<option value="${k}" ${k === S.PHASE ? "selected" : ""}>${p.label} · ${p.short}</option>`).join("");
    const people = S.demoPeople().map((g) => `<optgroup label="${esc(g.label)}">${g.items.map(([v, l]) => `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>`).join("");
    return `<label class="dm"><span>Session</span><select data-demo="phase" aria-label="Stage of the session to show">${phases}</select></label>` +
      `<label class="dm dm-who"><span>View as</span><select data-demo="who" aria-label="Whose view to open">${current ? "" : '<option value="" selected>Pick a person…</option>'}${people}</select></label>`;
  };
  document.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-demo]"); if (!sel) return;
    if (sel.dataset.demo === "phase") S.setPhase(sel.value);
    else if (sel.value) S.openAs(sel.value);
  });
  // Mount into the prototype bar, after the page has said who is viewing.
  S.mountDemo = (current) => {
    const bar = document.querySelector(".proto-bar"); if (!bar || bar.querySelector(".demo-ctl")) return;
    bar.insertAdjacentHTML("beforeend", `<div class="demo-ctl">${S.demoSelects(current)}<a href="demo.html">All demo people and data</a></div>`);
  };
})();
