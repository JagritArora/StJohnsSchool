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
  ftr.innerHTML = `<div class="wrap ftr-in">
      <div><p class="motto">Learn to serve</p><p>St. John's School, Sector 7A, Faridabad, Haryana.<br />A CBSE school for Nursery to Class XII, founded in 1965 by Shri T.I. John and run by the Idicula Trust Society (Regd.).</p></div>
      <div><h4>The school</h4><ul><li><a href="about.html">About us</a></li><li><a href="academics.html">Academics</a></li><li><a href="campus.html">Campus</a></li><li><a href="life.html">Student life</a></li></ul></div>
      <div><h4>Families</h4><ul><li><a href="admissions.html">Admissions</a></li><li><a href="parents.html">Parent corner</a></li><li><a href="news.html">News and events</a></li><li><a href="login.html">Parent app login</a></li></ul></div>
      <div><h4>Information</h4><ul><li><a href="disclosure.html">Mandatory public disclosure</a></li><li><a href="contact.html">Contact</a></li><li><a href="contact.html#careers">Careers</a></li><li><a href="privacy.html">Privacy</a></li><li><a href="plan.html">About this prototype</a></li></ul></div>
    </div>
    <div class="wrap ftr-base"><span>© ${new Date().getFullYear()} St. John's School, Faridabad</span><span>Facebook, Instagram, YouTube</span></div>`;
  document.body.append(ftr);

  // ---------- Content from the principal's Website tab ----------
  const site = S.state && S.state.site, hi = S.lang === "hi";
  // Text written here is already in the page's language, so the Hindi pass leaves it alone.
  const put = (el, html) => { el.innerHTML = html; if (hi) el.dataset.noTr = ""; };
  const adm = site ? S.admText(S.lang) : null;
  if (adm) {
    $$("[data-site]").forEach((el) => { const k = el.dataset.site.replace("adm-", ""); if (adm[k]) put(el, esc(adm[k]).replace(esc(adm.session), `<span class="nw">${esc(adm.session)}</span>`)); });
    if (!adm.open) $$('[data-site="adm-btn"]').forEach((a) => (a.href = "admissions.html#process"));
  }
  if (site) {
    $$("[data-fact]").forEach((el) => {
      const k = el.dataset.fact, v = (site.facts[k] || "").trim();
      if (!v) return;
      el.classList.remove("tbc"); el.removeAttribute("title");
      if (k === "phone") put(el, `<a href="tel:${esc(v.replace(/[^0-9+]/g, ""))}">${esc(v)}</a>`);
      else if (k === "email") put(el, `<a href="mailto:${esc(v)}">${esc(v)}</a>`);
      else put(el, esc(v));
    });
    // Home page photos: rebuilt only when the Website tab has changed them.
    const media = $(".hero-media");
    const shown = site.slides.filter((p) => p.on && S.photo(p.src));
    const dflt = S.siteSeed().slides.filter((p) => p.on);
    const same = shown.length === dflt.length && shown.every((p, i) => p.src === dflt[i].src && (p.pos || "50% 50%") === "50% 50%");
    if (media && shown.length && !same) media.innerHTML = shown.map((p, i) => `<img ${i ? "data-src" : 'class="on" fetchpriority="high" src'}="${esc(S.photo(p.src))}" alt="" style="object-position:${esc(p.pos || "50% 50%")}" />`).join("");
    // Gallery uploads go first, newest at the top.
    const galEl = $(".gal");
    if (galEl && site.gallery.length) galEl.insertAdjacentHTML("afterbegin", site.gallery.filter((g) => S.photo(g.src)).map((g) => `<button data-cat="${esc(g.cat)}"${hi ? " data-no-tr" : ""}><img src="${esc(S.photo(g.src))}" alt="${esc(g.alt || g.caption)}" loading="lazy" decoding="async" /><figcaption>${esc(g.caption)}</figcaption></button>`).join(""));
  }

  // ---------- Phones: admissions stay one tap away ----------
  // A slim bar along the bottom once you're past the first screen. The Ask
  // button sits in its right end. It steps aside wherever the visit form or
  // the admissions band is already on screen.
  const bar = document.createElement("div");
  bar.className = "mbar";
  bar.innerHTML = adm ? `<span><b>${esc(adm.btn)}</b><small>${esc(adm.list)}</small></span><a class="btn btn--sm" href="admissions.html#enquire">${hi ? "कैंपस देखें" : "Book a visit"}</a>` : "";
  if (hi) bar.dataset.noTr = "";
  document.body.append(bar);
  const covers = $$("#enquire, #admissions");
  const inView = new Set();
  const barTick = () => {
    const heroEl = $(".hero");
    const past = scrollY > (heroEl ? heroEl.offsetHeight * 0.7 : innerHeight * 0.5);
    bar.classList.toggle("on", past && !inView.size && !!adm && adm.open);
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

  // ---------- Photos below the first screen fade in as they scroll in ----------
  const io = "IntersectionObserver" in window && !reduce ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -5% 0px" }) : null;
  $$(".clip").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

  // ---------- Gentle reveal for content below the first screen ----------
  const RV = ".sec-title, .sec h2, .sec .lead, .stairs, .month, .year-head, .trio > div, .facgrid > div, .process li, .news li, .kv > div, .faq details, .ticks li, .story, .fac, .docs li, .paths li, .letter, .form, .tbl-wrap, .facts > div, .cta .row, .gal button, .filters, .pill-row";
  if (io) {
    const seen = new Set();
    $$(RV, $("main")).forEach((el) => {
      if (seen.has(el) || el.closest(".hero, .rv") || el.getBoundingClientRect().top < innerHeight) return;
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
    const items = [...(S.state ? S.state.notices : [])].sort((a, b) => (a.date < b.date ? -1 : 1)).filter((n) => n.web !== false && n.date >= (S.todayKey || "")).slice(0, limit);
    const tone = { Holiday: "", PTM: "tag--brick", Event: "tag--hedge", Notice: "tag--gold" };
    const tagHi = { Holiday: "छुट्टी", PTM: "अभिभावक बैठक", Event: "कार्यक्रम", Notice: "सूचना" };
    const loc = S.locale || "en-IN";
    if (hi) ul.dataset.noTr = "";
    ul.innerHTML = items.map((n) => { const d = new Date(n.date + "T00:00"); return `<li><div class="day">${d.getDate()}<small>${d.toLocaleDateString(loc, { month: "long" })}, ${d.toLocaleDateString(loc, { weekday: "short" })}</small></div><div><h3>${esc(hi && n.titleHi ? n.titleHi : n.title)}</h3><p>${esc(hi && n.textHi ? n.textHi : n.text)}</p></div><span class="tag ${tone[n.tag] || ""}">${esc(hi ? tagHi[n.tag] || n.tag : n.tag)}</span></li>`; }).join("") || `<li><div></div><p class="muted">${hi ? "अभी कोई आने वाला कार्यक्रम नहीं है।" : "Nothing coming up right now. New events appear here as the school posts them."}</p></li>`;
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
    while (n < 8) { d = S.addDays(d, 1); if (d.getDay() === 0 || S.HOLIDAYS[S.iso(d)]) continue; html += `<button type="button" class="slot" aria-pressed="${n === 0}" data-date="${S.iso(d)}"><span>${d.toLocaleDateString(S.locale || "en-IN", { weekday: "short" })}</span><b>${d.getDate()}</b><span>${d.toLocaleDateString(S.locale || "en-IN", { month: "short" })}</span></button>`; n++; }
    slots.innerHTML = html; if (hi) slots.dataset.noTr = "";
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
      if (kind === "enquiry") { const slot = $(".slot[aria-pressed='true']", f); const msg = $("[data-slot-msg]", done), when = slot ? new Date(slot.dataset.date + "T00:00").toLocaleDateString(S.locale || "en-IN", { weekday: "long", day: "numeric", month: "long" }) : "";
        msg.textContent = hi ? (slot ? `आपका कैंपस विज़िट ${when} के लिए तय कर लिया गया है। समय पक्का करने के लिए दफ़्तर से फ़ोन आएगा।` : "दाख़िला दफ़्तर से आपको फ़ोन आएगा, आम तौर पर उसी कामकाजी दिन।") : (slot ? `Your campus visit is pencilled in for ${when}. The office will call to confirm the time.` : "The admissions office will call you, usually the same working day.");
        if (hi) msg.dataset.noTr = ""; }
      f.hidden = true; done.hidden = false; done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    } else S.toast(hi ? "भेज दिया गया। दफ़्तर आपसे संपर्क करेगा।" : "Sent. The office will get back to you.");
  }));

  // ---------- AI assistant ----------
  if (S.mountAI) { S.mountAI("public"); $$("[data-ask]").forEach((b) => b.addEventListener("click", () => S.ask(b.dataset.ask, b.textContent))); }

  // ---------- Hero slideshow ----------
  // Moves on only to a photo that has loaded. The dots jump to a photo; the
  // pause button stops it for good (moving pictures must be stoppable).
  const hero = $(".hero");
  if (hero) {
    const imgs = $$(".hero-media img", hero), ctl = $(".hero-ctl", hero), dots = $(".hero-dots", hero), pause = $(".hero-pause", hero);
    let k = 0, seen = true, paused = reduce;
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => (seen = e.isIntersecting)).observe(hero);
    // Only the first photo loads with the page; the rest follow once it has settled.
    const later = () => setTimeout(() => imgs.forEach((im) => { if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute("data-src"); } }), reduce ? 0 : 1200);
    if (document.readyState === "complete") later(); else addEventListener("load", later, { once: true });
    const ready = (im) => im.getAttribute("src") && im.complete && im.naturalWidth;
    const go = (n) => { if (n === k || !ready(imgs[n])) return; imgs[k].classList.remove("on"); imgs[n].classList.add("on"); k = n; $$("button", dots).forEach((d, i) => d.setAttribute("aria-current", i === k)); };
    if (imgs.length > 1 && ctl) {
      dots.innerHTML = imgs.map((_, i) => `<button type="button" aria-label="${hi ? `${imgs.length} में से फ़ोटो ${i + 1}` : `Photo ${i + 1} of ${imgs.length}`}" aria-current="${i === 0}"></button>`).join("");
      $$("button", dots).forEach((d, i) => d.addEventListener("click", () => { if (!ready(imgs[i])) { imgs[i].addEventListener("load", () => go(i), { once: true }); return; } go(i); }));
      const setPause = (p) => { paused = p; pause.setAttribute("aria-pressed", p); pause.setAttribute("aria-label", hi ? (p ? "स्लाइडशो चलाएँ" : "स्लाइडशो रोकें") : (p ? "Play the slideshow" : "Pause the slideshow")); };
      setPause(paused);
      pause.addEventListener("click", () => setPause(!paused));
      ctl.hidden = false;
      setInterval(() => { if (!paused && seen && !document.hidden) go((k + 1) % imgs.length); }, 6000);
    }
  }

  // ---------- The year: swipe, scroll or step through the months ----------
  $$(".year").forEach((year) => {
    const track = $(".year-track", year), head = $(".year-head", year);
    if (!track || !head) return;
    const nav = document.createElement("div");
    nav.className = "year-nav";
    nav.innerHTML = `<button class="ibtn" type="button" aria-label="Earlier months"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button><button class="ibtn" type="button" aria-label="Later months"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>`;
    head.append(nav);
    const [prev, next] = $$("button", nav);
    const step = () => { const m = $(".month", track); return m ? (m.offsetWidth + 18) * Math.max(1, Math.floor((track.clientWidth - 40) / (m.offsetWidth + 18))) : track.clientWidth * 0.8; };
    const sync = () => { prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8; };
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));
    track.addEventListener("scroll", sync, { passive: true }); addEventListener("resize", sync); sync();
  });
})();
