/* Presenter controls for the demo: which stage of the session to show, and
   whose view to open. Lives in the prototype bar of every portal page. */
(function () {
  const S = window.SJS;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const GR = ["VII", "VIII", "IX", "X", "XI", "XII"];

  // Everyone the demo can open, grouped for the dropdown.
  S.demoPeople = () => {
    const groups = [{ label: "School leadership", items: [["staff:SJS-P-0001", "Principal"], ["staff:SJS-A-0107", "Office admin · Mrs. Anita Joseph"]] }];
    GR.forEach((g) => {
      const ts = S.TEACHERS.filter((t) => t.sections.some((k) => k.startsWith(g + "-")) && (g !== "VIII" || t.id !== "SJS-T-0412"));
      if (ts.length) groups.push({ label: `Teachers · Class ${g}`, items: ts.map((t) => [`staff:${t.id}`, `${t.name} · ${t.id === "SJS-T-0412" ? "Mathematics, class teacher VII-B" : t.subject + (t.classOf ? ", class teacher " + t.classOf : "")}`]) });
    });
    GR.forEach((g) => {
      const ps = S.PARENTS.filter((p) => p.sec.startsWith(g + "-"));
      if (ps.length) groups.push({ label: `Parents · Class ${g}`, items: ps.map((p) => { const k = S.kid(p.key); return [`kid:${p.key}`, `${p.parent} · parent of ${k.name}, ${k.label}`]; }) });
    });
    return groups;
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
