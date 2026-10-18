/* St. John's School — public website behaviour.
   Renders the footer, then wires up whatever each page has. The header
   comes from shell.js, which runs before the page content. */
(function () {
  const S = (window.SJS = window.SJS || {});
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const I = S.ICONS || { x: "×" };

  // ---------- Footer ----------
  const ftr = document.createElement("footer");
  ftr.className = "ftr";
  ftr.innerHTML = `<div class="tartan ftr-check" aria-hidden="true"></div>
    <div class="wrap ftr-in">
      <div><p class="motto">Learn<br />to serve.</p><p>St. John's School, Sector 7A, Faridabad, Haryana.<br />A CBSE school for Nursery to Class XII, founded in 1965 by Shri T.I. John and run by the Idicula Trust Society (Regd.).</p></div>
      <div><h4>The school</h4><ul><li><a href="about.html">About us</a></li><li><a href="academics.html">Academics</a></li><li><a href="campus.html">Campus</a></li><li><a href="life.html">Student life</a></li></ul></div>
      <div><h4>Families</h4><ul><li><a href="admissions.html">Admissions</a></li><li><a href="parents.html">Parent corner</a></li><li><a href="news.html">News and events</a></li><li><a href="login.html">Parent app login</a></li></ul></div>
      <div><h4>Information</h4><ul><li><a href="disclosure.html">Mandatory public disclosure</a></li><li><a href="contact.html">Contact</a></li><li><a href="contact.html#careers">Careers</a></li><li><a href="plan.html">About this prototype</a></li></ul></div>
    </div>
    <div class="wrap ftr-base"><span>© ${new Date().getFullYear()} St. John's School, Faridabad</span><span>Facebook, Instagram, YouTube</span></div>`;
  document.body.append(ftr);

  // ---------- Phones: admissions stay one tap away ----------
  // A slim bar along the bottom once you're past the first screen. The Ask
  // button sits in its right end. It steps aside wherever the visit form or
  // the admissions band is already on screen.
  const bar = document.createElement("div");
  bar.className = "mbar";
  bar.innerHTML = `<span><b>Admissions 2027–28</b><small>Nursery and Class XI</small></span><a class="btn btn--sm" href="admissions.html#enquire">Book a visit</a>`;
  document.body.append(bar);
  const covers = $$("#enquire, #admissions");
  const inView = new Set();
  const barTick = () => {
    const heroEl = $(".hero");
    const past = heroEl ? scrollY > heroEl.offsetHeight - innerHeight : scrollY > innerHeight * 0.5;
    bar.classList.toggle("on", past && !inView.size);
  };
  if ("IntersectionObserver" in window) { const bio = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? inView.add(e.target) : inView.delete(e.target))); barTick(); }); covers.forEach((c) => bio.observe(c)); }
  addEventListener("scroll", barTick, { passive: true }); barTick();

  // ---------- Toast ----------
  let toastEl, toastT;
  S.toast = (msg) => {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.append(toastEl); }
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add("show"));
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 3200);
  };

  // ---------- Photos fade in once loaded (the head script catches most) ----------
  const markLoaded = (img) => img.classList.add("is-loaded");
  $$("main img").forEach((img) => { if (img.complete) markLoaded(img); else { img.addEventListener("load", () => markLoaded(img), { once: true }); img.addEventListener("error", () => markLoaded(img), { once: true }); } });

  // ---------- Arched photos open as they scroll in ----------
  const io = "IntersectionObserver" in window && !reduce ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -5% 0px" }) : null;
  $$(".clip").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

  // ---------- Gentle reveal for content below the first screen ----------
  const RV = ".sec-title, .sec h2, .sec .lead, .trio > div, .facgrid > div, .process li, .news li, .kv > div, .faq details, .ticks li, .story, .fac, .docs li, .paths li, .letter, .form, .tbl-wrap, .facts > div, .cta .row, .gal button, .filters, .pill-row";
  if (io) {
    const seen = new Set();
    $$(RV, $("main")).forEach((el) => {
      if (seen.has(el) || el.closest(".hero, .year, .stairs, .rv, [data-words]") || el.getBoundingClientRect().top < innerHeight) return;
      seen.add(el); el.classList.add("rv");
      const sibs = [...el.parentElement.children].filter((c) => c.matches(RV));
      el.style.setProperty("--rv-i", Math.max(0, sibs.indexOf(el)));
      io.observe(el);
    });
  }

  // ---------- Audience paths: the frame shows the photo for the row in focus ----------
  const pathsWrap = $(".paths-wrap");
  if (pathsWrap) {
    const links = $$(".paths a", pathsWrap), pics = $$(".paths-pic img", pathsWrap);
    const show = (i) => { links.forEach((l, k) => l.classList.toggle("on", k === i)); pics.forEach((p, k) => p.classList.toggle("on", k === i)); };
    links.forEach((a, i) => { a.addEventListener("mouseenter", () => show(i)); a.addEventListener("focus", () => show(i)); });
    pathsWrap.addEventListener("mouseleave", () => links.forEach((l) => l.classList.remove("on")));
  }

  // ---------- News lists (from the same notices the app uses) ----------
  $$("[data-news]").forEach((ul) => {
    const limit = +ul.dataset.limit || 99;
    const items = [...(S.state ? S.state.notices : [])].sort((a, b) => (a.date < b.date ? -1 : 1)).filter((n) => n.date >= (S.todayKey || "")).slice(0, limit);
    const tone = { Holiday: "", PTM: "tag--brick", Event: "tag--hedge", Notice: "tag--gold" };
    ul.innerHTML = items.map((n) => { const d = new Date(n.date + "T00:00"); return `<li><div class="day">${d.getDate()}<small>${d.toLocaleDateString("en-IN", { month: "long" })}, ${d.toLocaleDateString("en-IN", { weekday: "short" })}</small></div><div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></div><span class="tag ${tone[n.tag] || ""}">${esc(n.tag)}</span></li>`; }).join("");
  });

  // ---------- Gallery: filters + lightbox ----------
  const gal = $(".gal");
  if (gal) {
    const items = $$("button", gal);
    $$(".filters button").forEach((b) => b.addEventListener("click", () => {
      $$(".filters button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      const f = b.dataset.f;
      // Fade the grid out, re-flow it while it's invisible, fade it back in.
      gal.classList.add("swap");
      setTimeout(() => { items.forEach((it) => it.classList.toggle("out", f !== "all" && !it.dataset.cat.split(" ").includes(f))); gal.classList.remove("swap"); }, reduce ? 0 : 250);
    }));
    const lb = document.createElement("div");
    lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", "Photo");
    lb.innerHTML = `<button class="ibtn" type="button" aria-label="Close">${I.x}</button><button class="ibtn nav-l" type="button" aria-label="Previous photo">‹</button><button class="ibtn nav-r" type="button" aria-label="Next photo">›</button><figure><img alt="" /><figcaption></figcaption></figure>`;
    document.body.append(lb);
    let cur = 0;
    const visible = () => items.filter((i) => !i.classList.contains("out"));
    const lbImg = $("img", lb);
    lbImg.addEventListener("load", () => (lbImg.style.opacity = 1));
    const show = (i) => { const v = visible(); cur = (i + v.length) % v.length; const it = v[cur]; const src = $("img", it).src; if (lbImg.src !== src) { lbImg.style.opacity = 0; lbImg.src = src; } lbImg.alt = $("img", it).alt; $("figcaption", lb).textContent = $("figcaption", it)?.textContent || ""; };
    items.forEach((it) => it.addEventListener("click", () => { show(visible().indexOf(it)); lb.classList.add("open"); $(".ibtn", lb).focus(); }));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".ibtn:not(.nav-l):not(.nav-r)")) lb.classList.remove("open"); });
    $(".nav-l", lb).addEventListener("click", () => show(cur - 1));
    $(".nav-r", lb).addEventListener("click", () => show(cur + 1));
    document.addEventListener("keydown", (e) => { if (!lb.classList.contains("open")) return; if (e.key === "Escape") lb.classList.remove("open"); if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });
  }

  // ---------- Campus-visit slots: next eight working days ----------
  const slots = $(".slots");
  if (slots && S.today) {
    let d = new Date(S.today), html = "", n = 0;
    while (n < 8) { d = S.addDays(d, 1); if (d.getDay() === 0 || S.HOLIDAYS[S.iso(d)]) continue; html += `<button type="button" class="slot" aria-pressed="${n === 0}" data-date="${S.iso(d)}"><span>${d.toLocaleDateString("en-IN", { weekday: "short" })}</span><b>${d.getDate()}</b><span>${d.toLocaleDateString("en-IN", { month: "short" })}</span></button>`; n++; }
    slots.innerHTML = html;
    slots.addEventListener("click", (e) => { const b = e.target.closest(".slot"); if (!b) return; $$(".slot", slots).forEach((x) => x.setAttribute("aria-pressed", x === b)); });
  }

  // ---------- Forms ----------
  $$("form[data-form]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const kind = f.dataset.form, val = (n) => (f.elements[n] ? f.elements[n].value.trim() : "");
    if (kind === "enquiry" && S.state) {
      const slot = $(".slot[aria-pressed='true']", f);
      S.state.enquiries.unshift({ child: val("child"), cls: val("cls"), parent: val("parent"), phone: val("phone"), note: [slot ? "Visit " + S.fmt(slot.dataset.date) : "", val("note")].filter(Boolean).join(" — "), at: S.todayKey, status: slot ? "Visit booked" : "New", fresh: true });
      S.save();
    }
    const done = f.nextElementSibling;
    if (done && done.classList.contains("done")) {
      if (kind === "enquiry") { const slot = $(".slot[aria-pressed='true']", f); $("[data-slot-msg]", done).textContent = slot ? `Your campus visit is pencilled in for ${new Date(slot.dataset.date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}. The office will call to confirm the time.` : "The admissions office will call you, usually the same working day."; }
      f.hidden = true; done.hidden = false; done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    } else S.toast("Sent. The office will get back to you.");
  }));

  // ---------- AI assistant ----------
  if (S.mountAI) { S.mountAI("public"); $$("[data-ask]").forEach((b) => b.addEventListener("click", () => S.ask(b.dataset.ask))); }

  // ---------- Hero slideshow (behind the motto) ----------
  // Moves on only to a photo that has loaded, and holds still once the visitor
  // starts scrolling, so the zoom never lands on two photos mid-crossfade.
  const hero = $(".hero");
  if (hero) {
    // Measure the intro line so the motto can size itself to the space above it.
    const intro = $(".hero-intro", hero);
    const fit = () => { hero.style.setProperty("--intro-h", intro.offsetHeight + "px"); hero.classList.add("sized"); };
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(intro); else addEventListener("resize", fit);
    const imgs = $$(".hero-media img", hero); let k = 0, seen = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => (seen = e.isIntersecting)).observe(hero);
    // Only the first photo loads with the page; the rest follow once it has settled.
    const later = () => setTimeout(() => imgs.forEach((im) => { if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute("data-src"); } }), 1200);
    if (!reduce) { if (document.readyState === "complete") later(); else addEventListener("load", later, { once: true }); }
    if (imgs.length > 1 && !reduce) setInterval(() => {
      if (!seen || document.hidden || scrollY > 40) return;
      const n = (k + 1) % imgs.length;
      if (!imgs[n].getAttribute("src") || !imgs[n].complete || !imgs[n].naturalWidth) return;
      imgs[k].classList.remove("on"); imgs[n].classList.add("on"); k = n;
    }, 5200);
  }

  // ---------- Scroll choreography (GSAP, loaded with defer) ----------
  const choreograph = () => {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const canAnimate = gsap && ST && !reduce;
  if (!canAnimate) {
    if (hero) hero.classList.add("hero--static");
    $$(".year").forEach((y) => y.classList.add("year--scroll"));
    return;
  }
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  if (hero) {
    const knock = $(".knock", hero), after = $(".hero-after", hero), intro = $(".hero-intro", hero), zoom = $(".zoom", hero);
    const origin = () => `${zoom.offsetLeft + zoom.offsetWidth * 0.3}px ${zoom.offsetTop + zoom.offsetHeight * 0.55}px`;
    gsap.set(after.children, { y: 40 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom bottom", scrub: 1, invalidateOnRefresh: true,
        onUpdate: (st) => after.classList.toggle("live", st.progress > 0.7) },
      defaults: { ease: "none" }
    });
    tl.to(intro, { opacity: 0, y: 30, duration: 0.12 }, 0)
      .fromTo(knock, { scale: 1, transformOrigin: origin }, { scale: 110, ease: "power2.in", duration: 0.62 }, 0.04)
      .to(knock, { opacity: 0, duration: 0.06 }, 0.6)
      .to(after, { opacity: 1, duration: 0.18 }, 0.64)
      .to(after.children, { y: 0, stagger: 0.03, duration: 0.2, ease: "power2.out" }, 0.64);
  }

  $$(".year").forEach((year) => {
    const pin = $(".year-pin", year), track = $(".year-track", year);
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: pin, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
  });

  $$(".stairs").forEach((st) => {
    if (innerWidth < 900) return;
    gsap.fromTo($$(".step", st), { clipPath: "inset(100% 0% 0% 0% round 22px 22px 6px 6px)" }, { clipPath: "inset(0% 0% 0% 0% round 22px 22px 6px 6px)", duration: 1.3, ease: "power3.out", stagger: 0.08, scrollTrigger: { trigger: st, start: "top 78%" } });
  });

  // Big quote words light up as you read
  $$("[data-words]").forEach((q) => {
    const words = q.firstChild.textContent.trim().split(/\s+/);
    q.firstChild.replaceWith(...words.flatMap((w, i) => { const s = document.createElement("span"); s.textContent = w; s.style.opacity = ".18"; return i < words.length - 1 ? [s, " "] : [s]; }));
    gsap.to($$("span", q), { opacity: 1, stagger: 0.08, ease: "none", scrollTrigger: { trigger: q, start: "top 80%", end: "bottom 45%", scrub: true } });
  });

  addEventListener("load", () => ST.refresh());
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", choreograph); else choreograph();
})();
