/* Shared bits: toast, reveal-on-scroll, mobile nav, portal views. */
(function () {
  const S = (window.SJS = window.SJS || {});

  // Toast
  let toastEl, toastT;
  S.toast = (msg) => {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.append(toastEl); }
    toastEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg><span></span>';
    toastEl.querySelector("span").textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add("show"));
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 3400);
  };

  // Reveal on scroll
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" }) : null;
  S.reveal = (root = document) => root.querySelectorAll(".reveal:not(.in)").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  S.reveal();

  // Mobile nav (public site)
  const tgl = document.getElementById("nav-toggle"), links = document.getElementById("nav-links");
  if (tgl && links) {
    tgl.addEventListener("click", () => links.classList.toggle("open"));
    links.addEventListener("click", (e) => { if (e.target.closest("a")) links.classList.remove("open"); });
  }

  // Portal views: buttons with data-go="name" show <section data-view="name">.
  S.ALIAS = { bus: "timetable" }; // the parent's Bus page now lives on Today, Bus and Timetable
  S.go = (name, push = true) => {
    name = (S.ALIAS || {})[name] || name; // old links to a view that was merged into another
    const v = document.querySelector(`[data-view="${name}"]`);
    if (!v) return;
    document.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("active", x === v));
    // data-also lets one menu entry stay lit for a view it shares (Results and the datesheets).
    document.querySelectorAll("[data-go]").forEach((b) => b.classList.toggle("active", b.dataset.go === name || (b.dataset.also || "").split(" ").includes(name)));
    if (push) history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "instant" }); // jump, never glide, when switching tabs
    document.dispatchEvent(new CustomEvent("sjs:view", { detail: name }));
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) { e.preventDefault(); S.go(b.dataset.go); } });

  // ---------- "i" buttons: the detail behind a number or a chart, in a small popup ----------
  // <button class="info-btn" data-info="id" data-info-t="Title">. The element with that id stays
  // hidden on the page and keeps being drawn into as usual; the popup shows a copy of it when opened.
  let pop = null;
  const reduceM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const closeInfo = (back) => {
    if (!pop || !pop.classList.contains("open")) return;
    pop.classList.remove("open");
    if (pop.opener) { pop.opener.setAttribute("aria-expanded", "false"); if (back) pop.opener.focus({ preventScroll: true }); }
  };
  const openInfo = (b) => {
    if (!pop) { pop = document.createElement("div"); pop.className = "info-pop"; pop.setAttribute("role", "dialog"); document.body.append(pop); }
    const src = document.getElementById(b.dataset.info), t = b.dataset.infoT || "More";
    pop.setAttribute("aria-label", t);
    pop.innerHTML = `<div class="info-h"><b>${S.esc(t)}</b><button type="button" class="info-x" aria-label="Close">×</button></div><div class="info-b">${src ? src.innerHTML.replace(/\sid="[^"]*"/g, "") : ""}</div>`;
    pop.opener = b; b.setAttribute("aria-expanded", "true");
    const phone = innerWidth < 640, r = b.getBoundingClientRect(), w = Math.min(380, innerWidth - 24);
    pop.classList.toggle("sheet", phone);
    if (!phone) {
      pop.style.width = w + "px";
      pop.style.left = Math.max(12, Math.min(r.right - w, innerWidth - w - 12)) + scrollX + "px";
      // Opens below the button; upwards only when it would not fit below but does fit above.
      const below = r.bottom + 10, h = Math.min(pop.scrollHeight, innerHeight * .6), up = below + h > innerHeight - 12 && r.top - 10 - h >= 12;
      pop.style.top = (up ? r.top - 10 - h : below) + scrollY + "px";
      pop.style.transformOrigin = `${r.left + r.width / 2 - (parseFloat(pop.style.left) - scrollX)}px ${up ? "100%" : "0"}`;
    } else { pop.style.width = pop.style.left = pop.style.top = ""; }
    requestAnimationFrame(() => pop.classList.add("open"));
    setTimeout(() => pop.querySelector(".info-x").focus({ preventScroll: true }), reduceM ? 0 : 60);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".info-btn");
    if (b) { e.preventDefault(); e.stopPropagation(); if (pop && pop.opener === b && pop.classList.contains("open")) closeInfo(true); else { closeInfo(false); openInfo(b); } return; }
    if (pop && (e.target.closest(".info-x") || !pop.contains(e.target))) closeInfo(!!e.target.closest(".info-x"));
  }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeInfo(true); });
  addEventListener("resize", () => closeInfo(false));
  document.addEventListener("sjs:view", () => closeInfo(false));
  S.infoBtn = (id, title) => `<button type="button" class="info-btn" data-info="${id}" data-info-t="${S.esc(title)}" aria-label="More about ${S.esc(title.toLowerCase())}" aria-haspopup="dialog" aria-expanded="false">i</button>`;
  if (document.querySelector("[data-view]")) {
    const first = document.querySelector("[data-view]").dataset.view;
    const h = (S.ALIAS || {})[location.hash.slice(1)] || location.hash.slice(1);
    S.go(h && document.querySelector(`[data-view="${h}"]`) ? h : first, false);
  }

  // Modal helpers
  S.openModal = (id) => document.getElementById(id).classList.add("open");
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal") || e.target.closest("[data-close]")) e.target.closest(".modal")?.classList.remove("open");
  });

  // Reset demo
  document.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", () => { if (confirm("Reset all demo data (attendance, homework, messages, enquiries)?")) S.reset(); }));

  // Add to home screen: Chrome and Edge offer an install prompt; iPhone and
  // iPad need Share, then Add to Home Screen. Hidden once installed or dismissed.
  const inst = document.getElementById("install");
  if (inst) {
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    let no = false; try { no = localStorage.getItem("sjs-install") === "no"; } catch (e) {}
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    let ask = null;
    // data-later: offer it from the second visit on, not to someone who has just arrived.
    let visits = 1; try { visits = +(localStorage.getItem("sjs-visits") || 0); if (!sessionStorage.getItem("sjs-v")) { visits++; localStorage.setItem("sjs-visits", visits); sessionStorage.setItem("sjs-v", "1"); } } catch (e) {}
    const show = () => { if (!standalone && !no && !(inst.dataset.later !== undefined && visits < 2)) inst.hidden = false; };
    addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); ask = e; show(); });
    addEventListener("appinstalled", () => (inst.hidden = true));
    if (ios) { document.getElementById("install-how").textContent = "Tap the Share button, then Add to Home Screen."; document.getElementById("install-go").hidden = true; show(); }
    document.getElementById("install-go").addEventListener("click", () => { if (!ask) return; ask.prompt(); ask.userChoice.then((c) => { if (c.outcome === "accepted") inst.hidden = true; ask = null; }); });
    document.getElementById("install-x").addEventListener("click", () => { inst.hidden = true; try { localStorage.setItem("sjs-install", "no"); } catch (e) {} });
  }

  S.$ = (sel, root = document) => root.querySelector(sel);
  S.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  S.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  S.greet = () => { const h = new Date().getHours(); return h < 4 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
})();

/* Motion that answers a change: numbers count up the first time a screen shows them, a
   confirmed action ticks (and the button that did it gives one soft ring), and a row that
   was just added lands in its list. Nothing loops; reduced motion turns all of it off. */
(function () {
  const S = window.SJS; if (!S || !S.toast) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NUM = /\d[\d,]*(\.\d+)?/;
  const count = (el) => {
    el._counted = true;
    const tn = [...el.childNodes].find((n) => n.nodeType === 3 && NUM.test(n.nodeValue)); if (!tn) return;
    const raw = tn.nodeValue, m = raw.match(NUM), end = parseFloat(m[0].replace(/,/g, "")), dp = m[1] ? m[1].length - 1 : 0;
    if (!(end >= 3)) return;
    const fmt = (v) => (m[0].includes(",") ? v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp }) : v.toFixed(dp));
    const t0 = performance.now(), dur = 800;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); tn.nodeValue = k < 1 ? raw.replace(m[0], fmt(end * (1 - Math.pow(1 - k, 3)))) : raw; if (k < 1) requestAnimationFrame(step); };
    tn.nodeValue = raw.replace(m[0], fmt(0)); requestAnimationFrame(step);
  };
  const countIn = () => { if (reduce) return; document.querySelectorAll("[data-view].active .stat .num, [data-view].active .hm-n").forEach((el) => { if (!el._counted && el.offsetParent && !el.closest(".info-src")) count(el); }); };
  document.addEventListener("sjs:view", () => setTimeout(countIn, 40));
  setTimeout(countIn, 40);

  let lastBtn = null, lastAt = 0;
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("button, .btn"); if (b) { lastBtn = b; lastAt = Date.now(); } }, true);
  const DONE = (S.DONE_RE = /^(Saved|Sent|Posted|Published|Signed|Approved|Assigned|Added|Handed|Booked|Marked|Leave approved|Leave request sent|Paid|Payment received|Undone)|It's live/);
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const plain = S.toast;
  S.toast = (msg, o = {}) => {
    plain(msg);
    const el = document.querySelector(".toast"), done = o.done !== undefined ? o.done : DONE.test(msg);
    el.classList.toggle("note", !done);
    if (!done) return;
    restart(el, "tick");
    const b = lastBtn;
    if (!reduce && b && b.isConnected && Date.now() - lastAt < 1500) { restart(b, "ok-pulse"); setTimeout(() => b.classList.remove("ok-pulse"), 900); }
  };
  S.landed = (el) => { if (!el || reduce) return; restart(el, "landed"); setTimeout(() => el.classList.remove("landed"), 1700); };
})();

/* Pointer light: cards with a glow layer read --mx/--my from here. */
(function () {
  if (!matchMedia("(hover: hover)").matches) return;
  const SEL = ".step, .card, .hm-tile, .role-tab";
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest(SEL); if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", Math.round(e.clientX - r.left) + "px"); el.style.setProperty("--my", Math.round(e.clientY - r.top) + "px");
  }, { passive: true });
})();
