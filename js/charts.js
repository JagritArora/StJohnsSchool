/* Charts and view toggles, shared by the parent and staff pages.
   Toggle: <div class="seg vt" data-vt="key"><button data-v="a">…</button>…</div>
   Panes:  <div class="vp" data-vp="key" data-v="a">…</div>
   Each viewer's choice is remembered on their device. Any element with
   data-tip (and an optional bold first line in data-tip-t) gets a tooltip. */
(function () {
  const S = window.SJS;
  const KEY = "sjs-vt";
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  S.vt = {};

  // A soft thumb slides behind the chosen option; the card eases to the new
  // pane's height and the pane slides in from the side it was picked from.
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const thumb = (bar) => {
    if (bar.classList.contains("lv-seg")) return; // the importance picker keeps its own colours
    let th = bar.querySelector(":scope > .seg-th");
    if (!th) { th = document.createElement("i"); th.className = "seg-th"; th.setAttribute("aria-hidden", "true"); bar.prepend(th); }
    const b = bar.querySelector("button[data-v].on, button.on");
    if (!b || !b.offsetWidth) { if (bar.classList.contains("th-ok")) bar.classList.remove("th-ok"); return; }
    // Long toggles wrap on phones, so the thumb follows the row as well as the column.
    const w = b.offsetWidth + "px", hh = b.offsetHeight + "px", x = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
    if (th.style.width !== w) th.style.width = w;
    if (th.style.height !== hh) th.style.height = hh;
    if (th.style.transform !== x) th.style.transform = x;
    if (!bar.classList.contains("th-ok")) requestAnimationFrame(() => bar.classList.add("th-ok"));
  };
  S.segThumbs = (root = document) => root.querySelectorAll(".seg").forEach(thumb);
  S.paneSwap = (show, hide, dir) => {
    const box = show.parentElement, h0 = box.offsetHeight;
    hide.forEach((p) => (p.hidden = true)); show.hidden = false;
    if (reduce || !box.animate) return;
    const h1 = box.offsetHeight;
    if (Math.abs(h1 - h0) > 2) { const was = box.style.overflow; box.style.overflow = "clip"; box.animate([{ height: h0 + "px" }, { height: h1 + "px" }], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" }).finished.then(() => (box.style.overflow = was), () => (box.style.overflow = was)); }
    show.animate([{ opacity: 0, transform: `translateX(${dir * 22}px)` }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.16,1,.3,1)" });
  };
  addEventListener("resize", () => S.segThumbs());
  // Toggles that pages drive themselves (filters, exam pickers) follow along too.
  let segQ = false;
  const segSoon = () => { if (!segQ) { segQ = true; requestAnimationFrame(() => { segQ = false; S.segThumbs(); }); } };
  new MutationObserver((ms) => { if (ms.some((m) => m.target.closest && m.target.closest(".seg") && !(m.target.classList && m.target.classList.contains("seg-th")))) segSoon(); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden"] });
  addEventListener("load", segSoon); if (document.fonts) document.fonts.ready.then(segSoon);
  document.addEventListener("sjs:view", () => requestAnimationFrame(() => S.segThumbs()));

  function setView(key, v, remember) {
    const bars = document.querySelectorAll(`[data-vt="${key}"]`);
    const opts = bars[0] ? [...bars[0].querySelectorAll("button[data-v]")].map((b) => b.dataset.v) : [];
    const dir = Math.sign(opts.indexOf(v) - opts.indexOf(S.vt[key])) || 1;
    S.vt[key] = v;
    bars.forEach((bar) => { bar.querySelectorAll("button[data-v]").forEach((b) => { const on = b.dataset.v === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); thumb(bar); });
    const panes = [...document.querySelectorAll(`[data-vp="${key}"]`)];
    if (remember) {
      // Panes are grouped by their parent, so a key can drive panes in more than one card.
      new Set(panes.map((p) => p.parentElement)).forEach((box) => { const mine = panes.filter((p) => p.parentElement === box), show = mine.find((p) => p.dataset.v === v); if (show && show.hidden) S.paneSwap(show, mine.filter((p) => p !== show), dir); else mine.forEach((p) => (p.hidden = p.dataset.v !== v)); });
    } else panes.forEach((p) => (p.hidden = p.dataset.v !== v));
    if (remember) { saved[key] = v; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }
    document.dispatchEvent(new CustomEvent("sjs:vt", { detail: { key, v } }));
  }
  S.vtInit = (root = document) => root.querySelectorAll("[data-vt]").forEach((bar) => {
    const key = bar.dataset.vt, opts = [...bar.querySelectorAll("button[data-v]")].map((b) => b.dataset.v);
    if (!bar.hasAttribute("role")) bar.setAttribute("role", "group");
    bar.querySelectorAll("button").forEach((b) => (b.type = "button"));
    setView(key, opts.includes(saved[key]) ? saved[key] : opts[0], false);
  });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-vt] button[data-v]"); if (b) setView(b.closest("[data-vt]").dataset.vt, b.dataset.v, true); });

  // Only touch the DOM when the markup changed, so a refresh never replays a chart's entrance.
  // Phones get a narrower drawing so chart text stays readable.
  S.narrow = () => innerWidth < 640;
  addEventListener("resize", () => { const n = S.narrow(); if (n !== S._narrow) { S._narrow = n; document.dispatchEvent(new CustomEvent("sjs:redraw")); } });
  S._narrow = innerWidth < 640;
  S.paint = (el, html) => { if (el && el._html !== html) { el.innerHTML = html; el._html = html; } };

  // ---------- One tooltip for every chart ----------
  const tip = document.createElement("div");
  tip.className = "tt-tip ctip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
  document.body.append(tip);
  let cur = null;
  function show(el) {
    cur = el;
    tip.innerHTML = (el.dataset.tipT ? `<b>${S.esc(el.dataset.tipT)}</b>` : "") + `<span>${S.esc(el.dataset.tip)}</span>`;
    tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
    tip.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + "px";
  }
  function hide() { cur = null; tip.hidden = true; }
  document.addEventListener("pointerover", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) { if (el !== cur) show(el); } else if (cur) hide(); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el) show(el); });
  document.addEventListener("focusout", hide);
  addEventListener("scroll", hide, { passive: true, capture: true });
  document.addEventListener("sjs:view", hide);

  const esc = (s) => S.esc(s);
  const tipAttr = (t, b) => ` data-tip="${esc(t)}"${b ? ` data-tip-t="${esc(b)}"` : ""}`;
  S.tipAttr = tipAttr;

  // ---------- Small pieces ----------
  // Ring gauge, with an optional threshold tick (e.g. CBSE's 75%).
  S.ring = (pct, { size = 72, w = 7, tone = "var(--green)", mark = null, label = "" } = {}) => {
    const c = size / 2, r = c - w / 2 - 1, L = 2 * Math.PI * r, f = Math.max(0, Math.min(100, pct)) / 100;
    let m = "";
    if (mark != null) {
      const a = (mark / 100) * 2 * Math.PI - Math.PI / 2, i = r - w / 2 - 2, o = r + w / 2 + 2;
      m = `<line class="ring-mark" x1="${(c + i * Math.cos(a)).toFixed(1)}" y1="${(c + i * Math.sin(a)).toFixed(1)}" x2="${(c + o * Math.cos(a)).toFixed(1)}" y2="${(c + o * Math.sin(a)).toFixed(1)}" />`;
    }
    return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(label)}"><circle class="ring-bg" cx="${c}" cy="${c}" r="${r}" stroke-width="${w}" /><circle class="ring-fg" cx="${c}" cy="${c}" r="${r}" stroke-width="${w}" stroke="${tone}" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - f)).toFixed(1)}" style="--len:${L.toFixed(1)}" transform="rotate(-90 ${c} ${c})" />${m}</svg>`;
  };
  // Thin progress meter with an optional marker.
  S.meter = (pct, { tone = "var(--accent)", mark = null, tip = "" } = {}) =>
    `<span class="meter"${tip ? tipAttr(tip) : ""} style="--v:${Math.max(0, Math.min(100, pct))}%;--t:${tone}"><i></i>${mark != null ? `<b style="left:${mark}%"></b>` : ""}</span>`;
  // Segments of one whole, with 2px gaps: [{v, tone, tip}]
  S.stack = (parts, total) => {
    const sum = total || parts.reduce((a, p) => a + p.v, 0) || 1;
    return `<span class="stackbar">${parts.filter((p) => p.v > 0).map((p) => `<i style="flex:${p.v / sum};--t:${p.tone}"${p.tip ? tipAttr(p.tip, p.tipT) : ""}></i>`).join("")}</span>`;
  };

  // ---------- Reading the numbers ----------
  // A one-line read of what a chart says, worked out from the same data.
  const SPARKLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z"/></svg>';
  S.read = (html) => (html ? `<p class="read">${SPARKLE}<span>${html}</span></p>` : "");
  // Change since last time. "better" says which way is good, so the colour means good or bad, not up or down.
  S.delta = (d, { unit = "", dp = 0, better = "up", tip = "", flat = "Level" } = {}) => {
    if (d === null || d === undefined || isNaN(d)) return "";
    const r = Math.round(d * 10 ** dp) / 10 ** dp;
    if (r === 0) return `<span class="delta eq"${tip ? tipAttr(tip) : ""}>${flat}</span>`;
    const good = (r > 0) === (better === "up");
    return `<span class="delta ${good ? "good" : "bad"}"${tip ? tipAttr(tip) : ""}><svg viewBox="0 0 10 10" aria-hidden="true"><path d="${r > 0 ? "M5 1.5l4 6.5H1z" : "M5 8.5L1 2h8z"}"/></svg>${Math.abs(r).toFixed(dp)}${unit}<span class="sr-only">${r > 0 ? " up" : " down"}</span></span>`;
  };
  // Sparkline: the run of a figure, last point marked. Optional dashed reference (a target).
  S.spark = (vals, { w = 88, h = 28, tone = "var(--royal)", ref = null, lo = null, hi = null, label = "" } = {}) => {
    const pts = vals.map((v, i) => [i, v]).filter(([, v]) => v !== null && v !== undefined && !isNaN(v));
    if (pts.length < 2) return "";
    const ys = pts.map((q) => q[1]).concat(ref !== null ? [ref] : []);
    let a = lo ?? Math.min(...ys), b = hi ?? Math.max(...ys); if (b - a < 2) { a -= 1; b += 1; }
    const p = 3.5, X = (i) => p + (i * (w - 2 * p)) / (vals.length - 1), Y = (v) => p + ((b - v) / (b - a)) * (h - 2 * p);
    const d = pts.map(([i, v], k) => `${k ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
    const [li, lv] = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="--s:${tone}" role="img" aria-label="${esc(label)}">` +
      (ref !== null ? `<line class="sp-ref" x1="0" x2="${w}" y1="${Y(ref).toFixed(1)}" y2="${Y(ref).toFixed(1)}" />` : "") +
      `<path class="sp-area" d="${d}L${X(li).toFixed(1)},${h}L${X(pts[0][0]).toFixed(1)},${h}Z" /><path class="sp-line" pathLength="1" d="${d}" /><circle class="sp-dot" cx="${X(li).toFixed(1)}" cy="${Y(lv).toFixed(1)}" r="2.8" /></svg>`;
  };
  // A class at a glance: one dot per student along the marks line. Dots that would
  // touch move up or down, so every student stays visible.
  // pts: [{ v, cls: "" | "flag" | "me", tip, tipT }]; marks: [{ v, label }] reference lines.
  S.swarm = (pts, { lo = 0, hi = 100, W = 600, R = 5.5, marks = [], zone = null, zoneLabel = "", label = "" } = {}) => {
    const pl = 10, pr = 10, gap = 2 * R + 1.5, X = (v) => pl + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W - pl - pr);
    const order = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6];
    const placed = [];
    [...pts].sort((a, b) => a.v - b.v).forEach((q) => {
      const x = X(q.v); let row = 0;
      for (const o of order) { if (!placed.some((z) => z.row === o && Math.abs(z.x - x) < gap)) { row = o; break; } }
      placed.push({ x, row, q });
    });
    const span = Math.max(1, ...placed.map((z) => Math.abs(z.row))), top = marks.length ? 22 : 8, mid = top + span * gap + R, base = mid + span * gap + R + 6, H = base + 20;
    let g = "";
    if (zone !== null) g += `<rect class="sw-zone" x="${pl}" y="${top - 4}" width="${X(zone) - pl}" height="${base - top + 4}" rx="6" />` + (zoneLabel ? `<text class="zone-t" x="${pl + 6}" y="${base - 6}">${esc(zoneLabel)}</text>` : "");
    g += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${base}" y2="${base}" />`;
    const step = hi - lo > 50 ? 20 : 10;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) g += `<text x="${X(v)}" y="${base + 15}" text-anchor="middle">${v}</text>`;
    marks.forEach((m, i) => { const x = X(m.v); g += `<line class="ref-l" x1="${x}" x2="${x}" y1="${top - 6}" y2="${base}" /><text class="ref-t" x="${x + (i % 2 ? -6 : 6)}" y="${top - 10}" text-anchor="${i % 2 ? "end" : "start"}">${esc(m.label)}</text>`; });
    g += placed.map((z, i) => { const y = mid + z.row * gap; return `<circle class="sw-dot ${z.q.cls || ""}" cx="${z.x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}" style="animation-delay:${Math.min(i * 12, 500)}ms" /><circle class="hit" cx="${z.x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R + 3}"${z.q.tip ? tipAttr(z.q.tip, z.q.tipT) : ""} />`; }).join("");
    return `<svg class="chart swarm" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg>`;
  };

  // ---------- Radar: a profile across subjects, one polygon per series ----------
  // series: [{ name, values: [], cls: "s1" | "s2" }]; labels: short axis names.
  S.radar = (labels, series, { max = 100, min = 0, W = 420, H = 300, R = 104 } = {}) => {
    const cx = W / 2, cy = H / 2 + 2, n = labels.length;
    const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const pt = (i, v) => { const k = (Math.max(min, v) - min) / (max - min); return [cx + R * k * Math.cos(ang(i)), cy + R * k * Math.sin(ang(i))]; };
    const poly = (k) => labels.map((_, i) => [cx + R * k * Math.cos(ang(i)), cy + R * k * Math.sin(ang(i))].map((x) => x.toFixed(1)).join(",")).join(" ");
    let g = [0.25, 0.5, 0.75, 1].map((k) => `<polygon class="rd-grid" points="${poly(k)}" />`).join("");
    g += labels.map((_, i) => `<line class="rd-axis" x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(ang(i))).toFixed(1)}" y2="${(cy + R * Math.sin(ang(i))).toFixed(1)}" />`).join("");
    // Scale numbers along the top spoke.
    g += [0.5, 1].map((k) => `<text class="rd-scale" x="${cx + 4}" y="${(cy - R * k + 11).toFixed(1)}">${Math.round(min + (max - min) * k)}</text>`).join("");
    const shapes = series.map((s) => `<polygon class="rd-shape ${s.cls}" points="${s.values.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ")}" />`).join("");
    const dots = series.map((s) => s.values.map((v, i) => { const [x, y] = pt(i, v); return `<circle class="rd-dot ${s.cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" /><circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12"${tipAttr(`${s.name}: ${v}%`, labels[i])} tabindex="-1" />`; }).join("")).join("");
    const lab = labels.map((l, i) => {
      const a = ang(i), x = cx + (R + 16) * Math.cos(a), y = cy + (R + 16) * Math.sin(a);
      const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
      const dy = Math.sin(a) < -0.9 ? -4 : Math.sin(a) > 0.9 ? 12 : 4;
      return `<text class="rd-label" x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}">${esc(l)}<tspan class="rd-v"> ${series[0].values[i]}</tspan></text>`;
    }).join("");
    return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map((s) => s.name).join(" and "))} by subject">${g}${shapes}${dots}${lab}</svg>`;
  };
})();
