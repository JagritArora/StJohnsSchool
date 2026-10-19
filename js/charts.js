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

  function setView(key, v, remember) {
    S.vt[key] = v;
    document.querySelectorAll(`[data-vt="${key}"] button[data-v]`).forEach((b) => { const on = b.dataset.v === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    document.querySelectorAll(`[data-vp="${key}"]`).forEach((p) => (p.hidden = p.dataset.v !== v));
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
