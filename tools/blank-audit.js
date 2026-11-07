// Blank-space audit, run inside each page by tools/blank-audit.sh: opens every view and every
// tab inside it, and records (1) switch rows that stop short of the page width and (2) holes:
// a card or column in a side-by-side row whose content ends well before the row does.
(() => {
  const ph = new URLSearchParams(location.search).get("ph");
  try { if (ph) localStorage.setItem("sjs-phase", ph); } catch (e) {}
  addEventListener("load", () => setTimeout(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)), out = [];
    const vis = (el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0;
    const name = (el) => { const id = el.id ? "#" + el.id : ""; const c = [...el.classList].slice(0, 3).map((x) => "." + x).join(""); return el.tagName.toLowerCase() + id + c; };
    const contentBottom = (el) => { let b = el.getBoundingClientRect().top; const pad = parseFloat(getComputedStyle(el).paddingBottom) || 0;
      [...el.children].forEach((c) => { if (vis(c) && getComputedStyle(c).position !== "absolute") b = Math.max(b, c.getBoundingClientRect().bottom); }); return b + pad; };
    function scan(where) {
      const root = [...document.querySelectorAll("section[data-view]")].find(vis) || document.body;
      root.querySelectorAll(".ptabs.hn-swrap").forEach((row) => { if (!vis(row)) return; const seg = row.querySelector(".seg"); if (!seg) return;
        const used = [...row.children].filter(vis).reduce((a, c) => a + c.getBoundingClientRect().width, 0), gap = row.getBoundingClientRect().width - used;
        if (gap > 120) out.push(`${where} | tabs end ${Math.round(gap)}px short`); });
      root.querySelectorAll("*").forEach((g) => {
        if (!vis(g)) return; const cs = getComputedStyle(g); if (cs.display !== "grid" && cs.display !== "flex") return;
        if (cs.display === "flex" && cs.flexDirection.startsWith("column")) return;
        const kids = [...g.children].filter((c) => vis(c) && getComputedStyle(c).position !== "absolute"); if (kids.length < 2) return;
        const rows = {}; kids.forEach((c) => { const t = Math.round(c.getBoundingClientRect().top / 8); (rows[t] = rows[t] || []).push(c); });
        Object.values(rows).forEach((r) => { if (r.length < 2) return;
          const bottom = Math.max(...r.map((c) => c.getBoundingClientRect().bottom));
          r.forEach((c) => { const w = c.getBoundingClientRect().width; if (w < 240) return; const hole = bottom - contentBottom(c);
            if (hole > 140) out.push(`${where} | ${name(c)} in ${name(g)} | hole ${Math.round(hole)}px`); }); });
      });
    }
    const views = [...new Set([...document.querySelectorAll("[data-view]")].map((v) => v.dataset.view))];
    for (const v of views) {
      try { SJS.go(v); } catch (e) { continue; } await wait(350);
      const sec = [...document.querySelectorAll(`section[data-view="${v}"]`)].find(vis);
      const bars = sec ? [...sec.querySelectorAll(".ptabs [data-vt]")].filter(vis) : [];
      if (!bars.length) { scan(v); continue; }
      for (const b of bars) for (const btn of [...b.querySelectorAll("button[data-v]")]) { btn.click(); await wait(350); scan(`${v}/${btn.dataset.v}`); }
    }
    const pre = document.createElement("pre"); pre.id = "AUDIT"; pre.textContent = JSON.stringify([...new Set(out)]); document.body.append(pre);
  }, 2500));
})();
