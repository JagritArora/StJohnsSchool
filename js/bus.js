/* School buses: routes the office sets up, a driver's phone that shares where the
   bus is, and what parents see. Stops sit on real Faridabad sectors; the road path
   between them comes from OpenStreetMap routing, or from a trip the driver recorded.
   Prototype: the live position travels between tabs of one browser through
   localStorage. The real app sends it through the school's server. */
(function () {
  const S = (window.SJS = window.SJS || {});
  const SCHOOL = { n: "School", lat: 28.36563, lng: 77.32492 };
  S.SCHOOL_AT = SCHOOL;

  // ---------- Routes as the session began (sample drivers; stops on real sectors) ----------
  const SEED = [[1,[["Sector 28",28.4382,77.30906,"06:46"],["Sector 18",28.42151,77.32372,"06:58"],["Sector 15",28.39836,77.3231,"07:11"],["Sector 6",28.36126,77.31907,"07:30"]]],[2,[["Sector 19",28.42225,77.31446,"06:48"],["Sector 17",28.4116,77.32868,"06:57"],["NIT 1",28.3847,77.30259,"07:15"],["Sector 6",28.36126,77.31907,"07:30"]]],[3,[["Sector 86",28.40682,77.34253,"07:02"],["Sector 14",28.39369,77.33157,"07:11"],["Sector 9",28.37596,77.33332,"07:21"],["Sector 8 Market",28.36321,77.33384,"07:29"]]],[4,[["Ballabgarh",28.32861,77.32389,"07:00"],["Sector 4",28.35117,77.31956,"07:12"],["Sector 8 Market",28.36321,77.33384,"07:22"],["Sector 6",28.36126,77.31907,"07:30"]]],[5,[["NIT 1",28.3847,77.30259,"07:05"],["Sector 12",28.38555,77.32324,"07:15"],["Sector 10",28.37857,77.32594,"07:20"],["Sector 6",28.36126,77.31907,"07:30"]]],[6,[["Surajkund",28.48367,77.28301,"06:07"],["Sector 31",28.44557,77.31481,"06:30"],["Sector 21D",28.41792,77.29027,"06:48"],["Sector 3",28.35153,77.33555,"07:25"]]],[7,[["Sector 37",28.47973,77.31186,"06:29"],["Sector 31",28.44557,77.31481,"06:47"],["Sector 21C",28.43016,77.29561,"06:59"],["Sector 21A",28.42318,77.29982,"07:05"]]],[8,[["Sector 21C",28.43016,77.29561,"06:43"],["Sector 15",28.39836,77.3231,"07:03"],["NIT 1",28.3847,77.30259,"07:15"],["Sector 10",28.37857,77.32594,"07:27"]]],[9,[["Sector 18",28.42151,77.32372,"06:58"],["Sector 16A",28.40962,77.31478,"07:06"],["Sector 16",28.40904,77.32233,"07:11"],["Sector 10",28.37857,77.32594,"07:27"]]],[10,[["Sector 16",28.40904,77.32233,"06:55"],["Sector 15A",28.39529,77.31586,"07:04"],["Sector 8 Market",28.36321,77.33384,"07:22"],["Sector 6",28.36126,77.31907,"07:30"]]],[11,[["Sector 55",28.34431,77.29543,"07:00"],["Sector 4",28.35117,77.31956,"07:12"],["Sector 8 Market",28.36321,77.33384,"07:22"],["Sector 6",28.36126,77.31907,"07:30"]]],[12,[["Sector 12",28.38555,77.32324,"07:10"],["Sector 10",28.37857,77.32594,"07:15"],["Sector 9",28.37596,77.33332,"07:20"],["Sector 11",28.37593,77.31854,"07:28"]]],[13,[["Surajkund",28.48367,77.28301,"06:10"],["Sector 37",28.47973,77.31186,"06:24"],["Sector 21C",28.43016,77.29561,"06:49"],["Sector 29",28.43313,77.32251,"07:02"]]],[14,[["Sector 16",28.40904,77.32233,"06:52"],["Sector 15",28.39836,77.3231,"06:59"],["Sector 10",28.37857,77.32594,"07:08"],["Sector 9",28.37596,77.33332,"07:15"],["Sector 8 Market",28.36321,77.33384,"07:23"]]],[15,[["Sector 29",28.43313,77.32251,"06:35"],["Sector 21D",28.41792,77.29027,"06:52"],["Sector 15",28.39836,77.3231,"07:10"],["Sector 8 Market",28.36321,77.33384,"07:29"]]],[16,[["Old Faridabad",28.41089,77.31142,"06:55"],["NIT 5",28.39967,77.30235,"07:03"],["Sector 14",28.39369,77.33157,"07:17"],["Sector 9",28.37596,77.33332,"07:27"]]],[17,[["NIT 3",28.39607,77.29026,"07:02"],["NIT 1",28.3847,77.30259,"07:11"],["Sector 11",28.37593,77.31854,"07:21"],["Sector 6",28.36126,77.31907,"07:30"]]],[18,[["Sector 15",28.39836,77.3231,"07:03"],["Sector 10",28.37857,77.32594,"07:14"],["Sector 9",28.37596,77.33332,"07:19"],["Sector 6",28.36126,77.31907,"07:30"]]],[19,[["Surajkund",28.48367,77.28301,"06:12"],["Sector 37",28.47973,77.31186,"06:26"],["Sector 16A",28.40962,77.31478,"07:00"],["Sector 86",28.40682,77.34253,"07:13"]]],[20,[["Surajkund",28.48367,77.28301,"06:18"],["Sector 37",28.47973,77.31186,"06:32"],["Sector 21A",28.42318,77.29982,"07:00"],["Sector 14",28.39369,77.33157,"07:20"]]],[21,[["Sector 31",28.44557,77.31481,"06:41"],["Sector 21A",28.42318,77.29982,"06:55"],["Sector 19",28.42225,77.31446,"07:03"],["Sector 9",28.37596,77.33332,"07:27"]]],[22,[["Sector 21A",28.42318,77.29982,"06:43"],["Sector 86",28.40682,77.34253,"07:04"],["Sector 14",28.39369,77.33157,"07:13"],["Sector 8 Market",28.36321,77.33384,"07:29"]]]];
  const DRIVERS = ["Ramesh Kumar", "Suresh Yadav", "Mahesh Chand", "Rajbir Singh", "Om Prakash", "Satbir Rawat", "Dinesh Sharma", "Mukesh Tanwar", "Pawan Kumar", "Jagdish Prasad", "Naresh Bhati", "Ravinder Singh", "Ashok Kumar", "Harish Chauhan", "Sunil Dagar", "Vinod Kumar", "Kishan Lal", "Rakesh Nagar", "Ajay Singh", "Manoj Kumar", "Devender Rana", "Sanjay Gupta"];
  const pad = (n) => String(n).padStart(2, "0");
  S.driverIdOf = (n) => "SJS-D-01" + pad(n);
  // Drivers sign in with their own staff ID; the route they drive is found from it.
  SEED.forEach(([n], i) => {
    const name = DRIVERS[i], [f, l] = name.split(" ");
    S.STAFF = S.STAFF || {};
    S.STAFF[S.driverIdOf(n)] = { role: "driver", name, first: f, initials: f[0] + l[0], title: "Driver", tone: "", phone: `9${8 - (i % 3)}xxxxxx${pad(30 + i)}` };
  });
  if (S.ROLE_LABEL) S.ROLE_LABEL.driver = "Bus driver";
  const seedRoutes = () => SEED.map(([n, st]) => ({ id: "Route " + n, bus: "Bus " + n, reg: "", driver: S.driverIdOf(n), back: "13:40", stops: st.map(([nm, lat, lng, t]) => ({ n: nm, lat, lng, t })), riders: {}, path: null, rec: null }));

  // ---------- Store: the routes (office) and the live trips (drivers) ----------
  const RK = "sjs-routes", LK = "sjs-bus-live", PK = "sjs-paths";
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  let routes = read(RK, null) || seedRoutes();
  S.routes = () => routes;
  S.route = (id) => routes.find((r) => r.id === id) || null;
  S.routeOfDriver = (sid) => routes.find((r) => r.driver === sid) || null;
  S.saveRoutes = (list) => { routes = list || routes; return write(RK, routes); };
  S.resetRoutes = () => { routes = seedRoutes(); write(RK, routes); };
  S.busLive = (id) => { const all = read(LK, {}), v = all[id]; return v && Date.now() - v.at < 3 * 3600e3 && !v.ended ? v : null; };
  S.busLiveAll = () => read(LK, {});
  S.setBusLive = (id, v) => { const all = read(LK, {}); if (v) all[id] = v; else delete all[id]; write(LK, all); };
  // Families on a route, with the stop each one uses (the office can change it).
  S.ridersOf = (r) => (S.PARENTS || []).filter((p) => p.bus === r.id).map((p) => ({ key: p.key, stop: S.stopOf(r, p.key) }));
  S.stopOf = (r, kidKey) => {
    const v = r.riders && r.riders[kidKey];
    if (v != null && v < r.stops.length) return v;
    if (kidKey === "VII-B-1" && r.id === "Route 14") return Math.max(0, r.stops.findIndex((s) => s.n === "Sector 9"));
    return S.hash ? Math.floor(S.hash(kidKey.length * 31 + kidKey.charCodeAt(kidKey.length - 1), 5) * r.stops.length) % r.stops.length : 0;
  };
  window.addEventListener("storage", (e) => {
    if (e.key === RK) routes = read(RK, routes);
    if (e.key === RK || e.key === LK) document.dispatchEvent(new CustomEvent("sjs:bus"));
  });

  // ---------- Times ----------
  const mins = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + m; };
  const hhmm = (m) => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  S.ampm = (t) => { const m = mins(t), h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${pad(m % 60)} ${h < 12 ? "AM" : "PM"}`; };
  S.schoolAt = (r) => { const last = r.stops[r.stops.length - 1]; return last ? hhmm(mins(last.t) + Math.max(8, Math.round(dist(last, SCHOOL) / 300) + 3)) : "07:35"; };
  // A trip in the order it is driven: the morning ends at school, the afternoon starts there.
  // Afternoon times mirror the morning's gaps from the school's leaving time.
  S.tripStops = (r, trip) => {
    const at = mins(S.schoolAt(r));
    const am = r.stops.map((s, i) => Object.assign({ i }, s)).concat([Object.assign({ i: -1, school: true }, SCHOOL, { t: hhmm(at) })]);
    if (trip === "am") return am;
    const b = mins(r.back || "13:40");
    return am.slice().reverse().map((s) => Object.assign({}, s, { t: hhmm(b + (at - mins(s.t))) }));
  };
  // Which trip is next, or on, by the clock.
  S.tripNow = (r) => { const d = new Date(), m = d.getHours() * 60 + d.getMinutes(), am = S.tripStops(r, "am"), pm = S.tripStops(r, "pm");
    if (m < mins(am[am.length - 1].t) + 20) return "am"; if (m < mins(pm[pm.length - 1].t) + 30) return "pm"; return "am"; };

  // ---------- Geometry ----------
  function dist(a, b) {
    const R = 6371e3, t = Math.PI / 180, dLa = (b.lat - a.lat) * t, dLo = (b.lng - a.lng) * t;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  S.dist = dist;
  const sig = (r) => r.stops.map((s) => s.lat.toFixed(5) + "," + s.lng.toFixed(5)).join(";");
  // The road path of the morning trip, stops to school. A recorded drive wins; otherwise
  // OpenStreetMap routing, kept per set of stops; straight lines if that can't be reached.
  S.routePath = async (r) => {
    if (r.rec && r.rec.path && r.rec.sig === sig(r)) return r.rec.path;
    const cache = read(PK, {}), k = sig(r);
    if (cache[k]) return cache[k];
    const pts = r.stops.concat([SCHOOL]);
    try {
      const url = "https://router.project-osrm.org/route/v1/driving/" + pts.map((p) => p.lng.toFixed(5) + "," + p.lat.toFixed(5)).join(";") + "?overview=full&geometries=geojson";
      const res = await fetch(url), j = await res.json();
      const path = j.routes[0].geometry.coordinates.map(([lng, lat]) => [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]);
      cache[k] = path; const keys = Object.keys(cache); if (keys.length > 40) delete cache[keys[0]];
      write(PK, cache);
      return path;
    } catch (e) { return pts.map((p) => [p.lat, p.lng]); }
  };
  S.pathSig = sig;
  // Distance along a path (metres) to the point on it nearest p.
  S.along = (path, p) => {
    let best = Infinity, at = 0, run = 0;
    for (let i = 1; i < path.length; i++) {
      const a = { lat: path[i - 1][0], lng: path[i - 1][1] }, b = { lat: path[i][0], lng: path[i][1] }, seg = dist(a, b);
      const kx = Math.cos(a.lat * Math.PI / 180), ax = (p.lng - a.lng) * kx, ay = p.lat - a.lat, bx = (b.lng - a.lng) * kx, by = b.lat - a.lat;
      const u = Math.max(0, Math.min(1, (ax * bx + ay * by) / ((bx * bx + by * by) || 1)));
      const q = { lat: a.lat + (b.lat - a.lat) * u, lng: a.lng + (b.lng - a.lng) * u }, d = dist(q, p);
      if (d < best) { best = d; at = run + seg * u; }
      run += seg;
    }
    return at;
  };
  S.pathLen = (path) => { let run = 0; for (let i = 1; i < path.length; i++) run += dist({ lat: path[i - 1][0], lng: path[i - 1][1] }, { lat: path[i][0], lng: path[i][1] }); return run; };
  S.pointAt = (path, m) => {
    let run = 0;
    for (let i = 1; i < path.length; i++) {
      const a = { lat: path[i - 1][0], lng: path[i - 1][1] }, b = { lat: path[i][0], lng: path[i][1] }, seg = dist(a, b);
      if (run + seg >= m) { const u = seg ? (m - run) / seg : 0; return { lat: a.lat + (b.lat - a.lat) * u, lng: a.lng + (b.lng - a.lng) * u, head: Math.atan2((b.lng - a.lng) * Math.cos(a.lat * Math.PI / 180), b.lat - a.lat) * 180 / Math.PI }; }
      run += seg;
    }
    const z = path[path.length - 1]; return { lat: z[0], lng: z[1], head: 0 };
  };

  // ---------- Where the bus is, for one family ----------
  // Returns { live, trip, list, mine, next, away, mins, line, state }.
  const SPEED = 330; // metres a minute: about 20 km/h through town traffic
  S.busFor = (r, kidKey, path) => {
    const live = S.busLive(r.id), trip = live ? live.trip : S.tripNow(r), list = S.tripStops(r, trip);
    const myI = S.stopOf(r, kidKey), mine = list.findIndex((s) => s.i === myI), me = list[mine];
    const out = { live, trip, list, mine, me };
    if (!live) {
      const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
      const amT = S.tripStops(r, "am").find((s) => s.i === myI).t, pmT = S.tripStops(r, "pm").find((s) => s.i === myI).t;
      out.state = "off"; out.amT = amT; out.pmT = pmT;
      out.line = d.getDay() === 0 ? `No bus today · Monday's pick-up ${S.ampm(amT)}` : m < mins(amT) ? `Pick-up at ${me.n} at ${S.ampm(amT)}` : m < mins(pmT) ? `Drop at ${me.n} at ${S.ampm(pmT)}` : `Next pick-up ${S.ampm(amT)}, next school day`;
      return out;
    }
    const next = Math.min(live.next || 0, list.length);
    out.next = next;
    const reached = (live.reached || {})[mine];
    if (next <= mine) {
      out.away = mine - next;
      let m = 1;
      if (path) {
        const pl = trip === "am" ? path : path.slice().reverse();
        const at = S.along(pl, live), to = S.along(pl, me);
        m = Math.max(1, Math.round((to - at) / SPEED) + out.away);
      } else m = Math.max(1, mins(me.t) - mins(list[next] ? list[next].t : me.t));
      out.mins = m;
      const near = dist(live, me) < 120;
      out.state = near ? "here" : out.away <= 1 ? "soon" : "coming";
      out.line = near ? `At ${me.n} now` : out.away === 0 ? `Next stop is yours · about ${m} min` : `${out.away} stop${out.away === 1 ? "" : "s"} away · about ${m} min`;
    } else if (next >= list.length) {
      out.state = "done";
      out.line = trip === "am" ? `Reached school at ${live.reached && live.reached[list.length - 1] || "time"}` : `Dropped at ${me.n} at ${reached || "the stop"}`;
    } else {
      out.state = "past";
      out.line = trip === "am" ? `Picked up at ${reached || me.n} · on the way to school` : `Dropped at ${me.n}${reached ? " at " + reached : ""}`;
    }
    return out;
  };

  // ---------- The map (Leaflet + OpenStreetMap tiles, loaded only when a map opens) ----------
  let lp = null;
  S.leaflet = () => lp || (lp = new Promise((ok, no) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.append(css);
    const js = document.createElement("script"); js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; js.onload = () => ok(window.L); js.onerror = no; document.head.append(js);
  }));
  S.busMap = async (el, o = {}) => {
    if (el._mp) { const m = await el._mp; m.invalidateSize(); return m; }
    return (el._mp = make(el, o));
  };
  const make = async (el, o) => {
    const L = await S.leaflet();
    const map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: !!o.wheel }).setView([SCHOOL.lat, SCHOOL.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    el._map = map; map._lay = L.layerGroup().addTo(map);
    return map;
  };
  const pin = (L, cls, html = "") => L.divIcon({ className: "bm-pin " + cls, html, iconSize: null, iconAnchor: null });
  // Draws one route: the road, the stops (yours larger), the school, and the bus if it's out.
  S.drawRoute = (map, r, path, o = {}) => {
    const L = window.L, g = map._lay; g.clearLayers();
    L.polyline(path, { color: "#5c6a7a", weight: 6, opacity: 0.22, lineJoin: "round" }).addTo(g);
    L.polyline(path, { color: "#2f6f8f", weight: 3, opacity: 0.9, lineJoin: "round" }).addTo(g);
    r.stops.forEach((s, i) => {
      const m = L.marker([s.lat, s.lng], { icon: pin(L, i === o.mine ? "mine" : "stop", i === o.mine ? `<span>${S.esc(s.n)}</span>` : ""), title: s.n, draggable: !!o.drag, keyboard: false }).addTo(g);
      m.bindTooltip(`${S.esc(s.n)} · ${S.ampm(s.t)}`, { direction: "top", offset: [0, -8] });
      if (o.drag) m.on("dragend", () => { const p = m.getLatLng(); o.drag(i, p.lat, p.lng); });
    });
    L.marker([SCHOOL.lat, SCHOOL.lng], { icon: pin(L, "school", "<span>School</span>"), title: "St. John's School", keyboard: false }).addTo(g);
    if (o.bus) map._bus = L.marker([o.bus.lat, o.bus.lng], { icon: pin(L, "bus", BUS_SVG), zIndexOffset: 1000, keyboard: false }).addTo(g); else map._bus = null;
    if (o.fit !== false) map.fitBounds(L.latLngBounds(path.concat([[SCHOOL.lat, SCHOOL.lng]])), { padding: [28, 28] });
  };
  S.moveBus = (map, p) => { if (!map || !window.L) return; if (map._bus) map._bus.setLatLng([p.lat, p.lng]); else map._bus = window.L.marker([p.lat, p.lng], { icon: pin(window.L, "bus", BUS_SVG), zIndexOffset: 1000, keyboard: false }).addTo(map._lay); };
  const BUS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3.5" width="14" height="14" rx="2.5"/><path d="M5 11h14M8.5 20.5v-3M15.5 20.5v-3"/></svg>';
  S.BUS_SVG = BUS_SVG;
})();
