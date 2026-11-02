// The portal audit, run inside each page by tools/stage-audit.sh: sets the session stage, then opens
// every view and records script errors and anything wider than the screen.
(() => {
  const ph = new URLSearchParams(location.search).get("ph");
  try { if (ph) localStorage.setItem("sjs-phase", ph); } catch (e) {}
  const errs = [];
  addEventListener("error", (e) => errs.push(e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno));
  addEventListener("unhandledrejection", (e) => errs.push("promise: " + (e.reason && e.reason.message || e.reason)));
  addEventListener("load", () => setTimeout(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)), out = [];
    const wide = (where) => { const o = document.documentElement.scrollWidth - innerWidth; if (o > 1) out.push(`${where}: ${o}px wider than the screen`); };
    const views = [...new Set([...document.querySelectorAll("[data-view]")].map((v) => v.dataset.view))];
    wide("first view");
    for (const v of views) { try { SJS.go(v); } catch (e) { out.push(`${v}: ${e.message}`); } await wait(250); wide(v); }
    const pre = document.createElement("pre"); pre.id = "AUDIT";
    pre.textContent = JSON.stringify({ views: views.length, errs: [...new Set(errs)], out });
    document.body.append(pre);
  }, 2500));
})();
