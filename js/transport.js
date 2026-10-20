/* Staff page, Transport (office and principal): every route, and one route at a time
   to edit: its stops in order, their times, the driver, and each child's stop.
   Saving reaches the driver's phone and the parents straight away. */
(function () {
  const S = window.SJS;
  if (!S.staff || !["principal", "admin"].includes(S.staff.role) || !S.$("#tr-top")) return;
  const esc = S.esc, $ = S.$;
  let sel = "Route 14", draft = null, dirty = false, path = null, map = null, found = [], q = "";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const drivers = () => Object.entries(S.STAFF).filter(([, v]) => v.role === "driver");
  const num = (id) => +String(id).replace(/\D/g, "") || 0;
  const pick = (id) => { sel = id; draft = clone(S.route(id)); dirty = false; path = null; found = []; q = ""; };
  const liveLine = (r) => { const v = S.busLive(r.id); if (!v) return ""; const L = S.tripStops(r, v.trip), n = Math.min(v.next, L.length); return n >= L.length ? "Trip finished" : `On the road · next ${L[n].n}`; };

  function renderList() {
    const rs = S.routes().slice().sort((a, b) => num(a.id) - num(b.id)), live = rs.filter((r) => S.busLive(r.id)).length;
    $("#tr-n").textContent = `${rs.length} routes${live ? ` · ${live} on the road` : ""}`;
    S.paint($("#tr-routes"), rs.map((r) => { const d = S.STAFF[r.driver], lv = liveLine(r); return `<button type="button" class="li tr-li${r.id === sel ? " on" : ""}" data-route="${esc(r.id)}"><span class="tr-num">${num(r.id)}</span><span class="li-t"><b>${esc(r.id)}</b><small>${r.stops.length} stop${r.stops.length === 1 ? "" : "s"}${r.stops[0] ? " from " + esc(r.stops[0].n) : ""} · ${d ? esc(d.name) : "no driver"}</small>${lv ? `<small class="tr-live"><i></i>${esc(lv)}</small>` : ""}${(r.pending || []).length ? `<small class="tr-sug">${r.pending.length} stop suggested</small>` : ""}</span></button>`; }).join(""));
  }

  function renderEd() {
    const r = draft, L = S.tripStops(r, "am"), riders = S.ridersOf(r), live = S.busLive(r.id);
    const taken = {}; S.routes().forEach((x) => { if (x.driver && x.id !== r.id) taken[x.driver] = x.id; });
    $("#tr-top").innerHTML = `
      <div class="card-h"><h2>${esc(r.id)}</h2><span class="right tr-acts">${dirty ? `<button class="btn btn-ghost btn-sm" type="button" data-tr="undo">Discard</button>` : ""}<button class="btn btn-primary btn-sm" type="button" data-tr="save" ${dirty ? "" : "disabled"}>Save route</button></span></div>
      ${live ? `<p class="tr-livebar"><i></i>${esc(liveLine(r))} · ${live.trip === "am" ? "morning" : "afternoon"} trip${live.sim ? " (demo drive)" : ""}</p>` : ""}
      <div class="row2 tr-meta">
        <div class="field"><label for="tr-bus">Bus</label><input id="tr-bus" value="${esc(r.bus)}" autocomplete="off" /></div>
        <div class="field"><label for="tr-reg">Registration <span class="opt">optional</span></label><input id="tr-reg" value="${esc(r.reg || "")}" placeholder="HR 51 …" autocomplete="off" /></div>
        <div class="field"><label for="tr-drv">Driver</label><select id="tr-drv"><option value="">No driver yet</option>${drivers().map(([k, v]) => `<option value="${k}" ${k === r.driver ? "selected" : ""}>${esc(v.name)} · ${k}${taken[k] ? ` (now ${esc(taken[k])})` : ""}</option>`).join("")}</select></div>
        <div class="field"><label for="tr-back">Leaves school after classes</label><input id="tr-back" type="time" value="${esc(r.back || "13:40")}" /></div>
      </div>
      <div class="tr-find"><input id="tr-q" class="input" type="search" value="${esc(q)}" placeholder="Find a place to add as a stop, e.g. Sector 21A" aria-label="Find a place" autocomplete="off" />${q.trim().length >= 2 || found.length ? `<div class="tr-found">${q.trim().length >= 2 ? `<button type="button" data-tr="addname"><b>Add “${esc(q.trim())}” as a stop</b><small>Goes before school; set its time below</small></button>` : ""}${found.map((f, i) => `<button type="button" data-found="${i}"><b>${esc(f.n)}</b><small>${esc(f.full)}</small></button>`).join("")}</div>` : ""}</div>
`;
    $("#tr-bot").innerHTML = `
      <p class="muted tr-hint">Type a stop's name above to add it. Use ↑ ↓ to put the stops in the order the bus reaches them, and set each time. The driver taps each stop as done, and parents see it.</p>
      <h3 class="d-sub">Stops, morning order</h3>
      <ol class="tr-stops">${r.stops.map((s, i) => `<li><span class="tr-i">${i + 1}</span><input class="input" data-sn="${i}" value="${esc(s.n)}" aria-label="Stop ${i + 1} name" /><input class="input" type="time" data-st="${i}" value="${esc(s.t)}" aria-label="Stop ${i + 1} time" /><span class="tr-k">${riders.filter((x) => x.stop === i).length || ""}</span><span class="tr-b"><button class="icon-btn" type="button" data-up="${i}" aria-label="Move up" ${i ? "" : "disabled"}>↑</button><button class="icon-btn" type="button" data-dn="${i}" aria-label="Move down" ${i < r.stops.length - 1 ? "" : "disabled"}>↓</button><button class="icon-btn" type="button" data-rm="${i}" aria-label="Remove ${esc(s.n)}">×</button></span></li>`).join("")}
        <li class="sch"><span class="tr-i"></span><span class="tr-sch">School</span><span class="tr-t">${S.ampm(L[L.length - 1].t)}</span></li></ol>
      ${(r.pending || []).length ? `<h3 class="d-sub">Suggested by the driver</h3><div class="list">${r.pending.map((p, i) => `<div class="li"><span class="li-t"><b>${esc(p.n)}</b><small>${esc(p.by)}${p.on ? ", " + esc(p.on) : ""} · passed at ${S.ampm(p.t)}</small></span><span class="right"><button class="btn btn-primary btn-sm" type="button" data-padd="${i}">Add as a stop</button><button class="btn btn-ghost btn-sm" type="button" data-pno="${i}">Dismiss</button></span></div>`).join("")}</div>` : ""}
      <h3 class="d-sub">Children on this route</h3>
      ${riders.length ? `<div class="list">${riders.map((x) => `<div class="li"><span class="li-t"><b>${esc(S.kidName(x.key))}</b></span><select class="input tr-rs" data-rider="${esc(x.key)}" aria-label="Stop for ${esc(S.kid(x.key).first)}">${r.stops.map((s, i) => `<option value="${i}" ${i === x.stop ? "selected" : ""}>${esc(s.n)}</option>`).join("")}</select></div>`).join("")}</div>` : `<p class="muted" style="font-size:14px">No demo family uses ${esc(r.id)}.</p>`}
      ${r.driver ? `<p class="muted tr-hint">${esc(S.STAFF[r.driver].name)} signs in with <b>${esc(r.driver)}</b> and sees only this route. <a href="driver.html?id=${esc(r.driver)}" target="_blank">Open the driver's view in a new tab</a></p>` : ""}`;
  }
  const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  // A new stop goes where it adds the least road: between the two stops it sits closest to.
  function addStop(s) {
    const st = draft.stops, all = st.concat([S.SCHOOL_AT]);
    let at = 0, best = Infinity;
    for (let i = 0; i < all.length; i++) { const extra = S.dist(i ? all[i - 1] : s, s) + S.dist(s, all[i]) - (i ? S.dist(all[i - 1], all[i]) : 0); if (extra < best) { best = extra; at = i; } }
    const before = st[at - 1], after = st[at];
    const t = before && after ? hhmm(Math.round((mins(before.t) + mins(after.t)) / 2)) : before ? hhmm(mins(before.t) + 5) : after ? hhmm(mins(after.t) - 6) : "07:10";
    st.splice(at, 0, { n: s.n, lat: Math.round(s.lat * 1e5) / 1e5, lng: Math.round(s.lng * 1e5) / 1e5, t });
    // Children keep their stop when the list shifts.
    Object.keys(draft.riders || {}).forEach((k) => { if (draft.riders[k] >= at) draft.riders[k]++; });
    changed(true);
    setTimeout(() => { const inp = document.querySelector(`[data-sn="${at}"]`); if (inp && s.n === "New stop") { inp.focus(); inp.select(); } }, 60);
  }
  function changed(road) { dirty = true; if (road) path = null; renderEd(); }

  let qt = null;
  async function search(text) {
    if (text.length < 3) { found = []; renderEd(); return; }
    try {
      const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=5&bounded=1&viewbox=77.22,28.52,77.42,28.30&q=" + encodeURIComponent(text + ", Faridabad"));
      found = (await res.json()).map((x) => ({ n: x.display_name.split(",")[0], full: x.display_name.split(",").slice(1, 3).join(",").trim(), lat: +x.lat, lng: +x.lon }));
    } catch (e) { found = []; S.toast("Couldn't search right now. Add the stop by name instead.", { nolog: true }); }
    renderEd(); const i = $("#tr-q"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest('[data-view="transport"]')) return;
    const b = e.target.closest("button"); if (!b) return;
    const d = b.dataset, st = draft.stops;
    if (d.route) { if (dirty && !confirm(`Discard the changes to ${draft.id}?`)) return; pick(d.route); renderList(); renderEd(); }
    else if (d.tr === "addname") { const st0 = draft.stops, last = st0[st0.length - 1] || S.SCHOOL_AT, n = q.trim(); found = []; q = ""; st0.push({ n, lat: last.lat, lng: last.lng, t: last.t ? hhmm(Math.min(mins(last.t) + 5, 23 * 60)) : "07:10" }); changed(true); }
    else if (d.found) { const f = found[+d.found]; found = []; q = ""; addStop(f); }
    else if (d.up || d.dn) { const i = d.up ? +d.up - 1 : +d.dn; swapR(i, i + 1); [st[i], st[i + 1]] = [st[i + 1], st[i]]; changed(true); }
    else if (d.rm) { const i = +d.rm; if (S.ridersOf(draft).some((x) => x.stop === i) && !confirm(`Children get on at ${st[i].n}. Remove it? They move to the stop before.`)) return; st.splice(i, 1); Object.keys(draft.riders).forEach((k) => { if (draft.riders[k] >= i) draft.riders[k] = Math.max(0, draft.riders[k] - 1); }); changed(true); }
    else if (d.padd) { const p = draft.pending.splice(+d.padd, 1)[0]; addStop({ n: p.n, lat: p.lat, lng: p.lng }); }
    else if (d.pno) { draft.pending.splice(+d.pno, 1); changed(false); }
    else if (d.tr === "unrec") { draft.rec = null; changed(true); }
    else if (d.tr === "undo") { pick(draft.id); renderEd(); }
    else if (d.tr === "save") save();
    else if (d.tr === "new") {
      if (dirty && !confirm(`Discard the changes to ${draft.id}?`)) return;
      const n = Math.max(...S.routes().map((r) => num(r.id))) + 1;
      S.routes().push({ id: "Route " + n, bus: "Bus " + n, reg: "", driver: "", back: "13:40", stops: [], riders: {}, path: null, rec: null });
      S.saveRoutes(); pick("Route " + n); renderList(); renderEd(); $("#tr-q").focus();
    }
  });
  // Moving a stop up or down takes its children with it.
  function swapR(a, b) { draft.riders = draft.riders || {}; S.ridersOf(draft).forEach((x) => { draft.riders[x.key] = x.stop === a ? b : x.stop === b ? a : x.stop; }); }
  document.addEventListener("input", (e) => {
    const t = e.target, d = t.dataset;
    if (!t.closest || !t.closest('[data-view="transport"]')) return;
    if (t.id === "tr-q") { q = t.value; clearTimeout(qt); qt = setTimeout(() => search(q.trim()), 450); return; }
    if (d.sn != null) { draft.stops[+d.sn].n = t.value; dirty = true; markDirty(); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target, d = t.dataset;
    if (!t.closest || !t.closest('[data-view="transport"]')) return;
    if (d.st != null && t.value) { draft.stops[+d.st].t = t.value; changed(false); }
    else if (d.rider) { draft.riders = draft.riders || {}; draft.riders[d.rider] = +t.value; changed(false); }
    else if (t.id === "tr-bus") { draft.bus = t.value.trim() || draft.bus; changed(false); }
    else if (t.id === "tr-reg") { draft.reg = t.value.trim().toUpperCase(); changed(false); }
    else if (t.id === "tr-drv") { draft.driver = t.value; changed(false); }
    else if (t.id === "tr-back" && t.value) { draft.back = t.value; changed(false); }
  });
  const markDirty = () => { const s = document.querySelector('[data-tr="save"]'); if (s) s.disabled = false; };

  function save() {
    const st = draft.stops;
    if (!st.length) { S.toast("Add at least one stop before saving.", { nolog: true }); return; }
    const bad = st.findIndex((s, i) => i && s.t <= st[i - 1].t);
    if (bad > 0) { S.toast(`${st[bad].n} is at or before ${st[bad - 1].n}. Morning times should go up stop by stop.`, { nolog: true }); return; }
    if (st.some((s) => !s.n.trim())) { S.toast("Every stop needs a name.", { nolog: true }); return; }
    const list = S.routes();
    // One driver, one route.
    if (draft.driver) list.forEach((x) => { if (x.id !== draft.id && x.driver === draft.driver) x.driver = ""; });
    list[list.findIndex((x) => x.id === draft.id)] = clone(draft);
    if (!S.saveRoutes(list)) { S.toast("Couldn't save: the browser's storage is full.", { nolog: true }); return; }
    dirty = false; renderList(); renderEd();
    S.toast(`Saved ${draft.id}: ${st.length} stops. The driver and parents see it now.`);
  }

  document.addEventListener("sjs:bus", () => { renderList(); if (!dirty && $('[data-view="transport"].active')) { pick(sel); renderEd(); } else if (map) { const v = S.busLive(draft.id); if (v) S.moveBus(map, v); } });
  document.addEventListener("sjs:view", (e) => { if (e.detail === "transport") { if (!draft) pick(sel); renderList(); renderEd(); } });
  // The office sees the bus move on the map while a trip is on.
  setInterval(() => { if (!$('[data-view="transport"].active')) return; renderList(); const v = draft && S.busLive(draft.id); if (v && map) S.moveBus(map, v); }, 3000);
  S.TRANSPORT = { line: () => { const rs = S.routes(), live = rs.filter((r) => S.busLive(r.id)).length, sug = rs.reduce((a, r) => a + (r.pending || []).length, 0); return `${rs.length} routes${live ? ` · ${live} on the road` : ""}${sug ? ` · ${sug} stop${sug === 1 ? "" : "s"} suggested` : ""}`; } };
})();
