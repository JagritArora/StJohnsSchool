/* Shared bits: toast, reveal-on-scroll, mobile nav, portal views. */
(function () {
  const S = (window.SJS = window.SJS || {});

  // Toast
  let toastEl, toastT;
  S.toast = (msg) => {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.append(toastEl); }
    toastEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span></span>';
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
  S.go = (name, push = true) => {
    const v = document.querySelector(`[data-view="${name}"]`);
    if (!v) return;
    document.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("active", x === v));
    document.querySelectorAll("[data-go]").forEach((b) => b.classList.toggle("active", b.dataset.go === name));
    if (push) history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "instant" }); // jump, never glide, when switching tabs
    document.dispatchEvent(new CustomEvent("sjs:view", { detail: name }));
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) { e.preventDefault(); S.go(b.dataset.go); } });
  if (document.querySelector("[data-view]")) {
    const first = document.querySelector("[data-view]").dataset.view;
    S.go(location.hash.slice(1) && document.querySelector(`[data-view="${location.hash.slice(1)}"]`) ? location.hash.slice(1) : first, false);
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
    const show = () => { if (!standalone && !no) inst.hidden = false; };
    addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); ask = e; show(); });
    addEventListener("appinstalled", () => (inst.hidden = true));
    if (ios) { document.getElementById("install-how").textContent = "Tap the Share button, then Add to Home Screen."; document.getElementById("install-go").hidden = true; show(); }
    document.getElementById("install-go").addEventListener("click", () => { if (!ask) return; ask.prompt(); ask.userChoice.then((c) => { if (c.outcome === "accepted") inst.hidden = true; ask = null; }); });
    document.getElementById("install-x").addEventListener("click", () => { inst.hidden = true; try { localStorage.setItem("sjs-install", "no"); } catch (e) {} });
  }

  S.$ = (sel, root = document) => root.querySelector(sel);
  S.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  S.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  S.greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
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
