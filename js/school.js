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
      <div><h4>The school</h4><ul><li><a href="about.html">About us</a></li><li><a href="academics.html">Academics</a></li><li><a href="achievements.html">Toppers and achievements</a></li><li><a href="campus.html">Campus</a></li><li><a href="life.html">Student life</a></li></ul></div>
      <div><h4>Families</h4><ul><li><a href="admissions.html">Admissions</a></li><li><a href="parents.html">Parent corner</a></li><li><a href="news.html">News and events</a></li><li><a href="login.html">Parent app login</a></li></ul></div>
      <div><h4>Information</h4><ul><li><a href="disclosure.html">Mandatory public disclosure</a></li><li><a href="contact.html">Contact</a></li><li><a href="contact.html#careers">Careers</a></li><li><a href="privacy.html">Privacy</a></li><li><a href="plan.html">About this prototype</a></li></ul></div>
    </div>
    <div class="wrap ftr-base"><span>© ${new Date().getFullYear()} St. John's School, Faridabad</span><span class="tbc" title="Links to be added">Facebook, Instagram, YouTube</span>${S.textSizeHTML ? S.textSizeHTML() : ""}</div>`;
  document.body.append(ftr);

  // ---------- Content from the principal's Website tab ----------
  const site = S.state && S.state.site;
  const put = (el, html) => { el.innerHTML = html; };
  const adm = site ? S.admText() : null;
  if (adm) {
    $$("[data-site]").forEach((el) => { const k = el.dataset.site.replace("adm-", ""); if (adm[k]) put(el, esc(adm[k]).replace(esc(adm.session), `<span class="nw">${esc(adm.session)}</span>`)); });
    if (!adm.open) $$('[data-site="adm-btn"]').forEach((a) => (a.href = "admissions.html#process"));
    $$(".adm-tag").forEach((t) => { if (!adm.open) t.remove(); else $(".adm-s", t).textContent = adm.session; });
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
    if (media && shown.length && !same) { media.innerHTML = shown.map((p, i) => `<img ${i ? "data-src" : 'class="on" fetchpriority="high" src'}="${esc(S.photo(p.src))}" alt="" data-cap="${esc(p.alt || "")}" style="object-position:${esc(p.pos || "50% 50%")}" />`).join(""); const c = $(".hero-cap"); if (c) { c.textContent = shown[0].alt || ""; c.classList.toggle("none", !shown[0].alt); } }
    // Gallery uploads go first, newest at the top.
    const galEl = $(".gal");
    if (galEl && site.gallery.length) galEl.insertAdjacentHTML("afterbegin", site.gallery.filter((g) => S.photo(g.src)).map((g) => `<button data-cat="${esc(g.cat)}"><img src="${esc(S.photo(g.src))}" alt="${esc(g.alt || g.caption)}" loading="lazy" decoding="async" /><figcaption>${esc(g.caption)}</figcaption></button>`).join(""));
  }

  // ---------- Phones: admissions stay one tap away ----------
  // A slim bar along the bottom once you're past the first screen. The Ask
  // button sits in its right end. It steps aside wherever the visit form or
  // the admissions band is already on screen.
  const bar = document.createElement("div");
  bar.className = "mbar";
  bar.innerHTML = adm ? `<span><b>${esc(adm.btn)}</b><small>${esc(adm.list)}</small></span><a class="btn btn--sm" href="admissions.html#enquire">Book a visit</a>` : "";
  document.body.append(bar);
  const covers = $$("#enquire, #admissions");
  const inView = new Set();
  const barTick = () => {
    const heroEl = $(".hero");
    const past = scrollY > (heroEl ? heroEl.offsetHeight * 0.7 : innerHeight * 0.5);
    bar.classList.toggle("on", past && !inView.size && !!adm && adm.open);
    // The header's admissions tag hands over to the bar while it is up.
    document.documentElement.classList.toggle("mbar-on", bar.classList.contains("on"));
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

  // ---------- Headings rise in word by word ----------
  // Each word slides up out of its own line, one after another: on load for
  // the page title, and as they arrive for section headings further down.
  const words = (h) => {
    let i = 0;
    [...h.childNodes].forEach((n) => {
      if (n.nodeType !== 3) { if (n.nodeType === 1) { const w = document.createElement("span"); w.className = "w"; n.replaceWith(w); const inner = document.createElement("span"); inner.style.setProperty("--wi", i++); inner.append(n); w.append(inner); } return; }
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((t) => { if (!t) return; if (/^\s+$/.test(t)) { frag.append(t); return; } const w = document.createElement("span"); w.className = "w"; w.innerHTML = `<span style="--wi:${i++}">${esc(t)}</span>`; frag.append(w); });
      n.replaceWith(frag);
    });
    h.classList.add("words");
  };
  if (!reduce) {
    $$(".phero h1").forEach((h) => { words(h); requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add("in"))); });
    if (io) $$("main :is(.sec, .year) h2").forEach((h) => { if (h.closest(".hero") || h.getBoundingClientRect().top < innerHeight) return; words(h); io.observe(h); });
  }

  // ---------- Photos unveil as they arrive ----------
  // A mounted photo opens out from its middle, like a print being laid down.
  if (io) $$("main :is(figure.arch, .duo, .fac .arch, .fac .frame, .story .ph, .letter .arch, .mount)").forEach((el) => {
    if (el.closest(".hero, .month, .duo .duo, .unveil") || el.parentElement.closest(".duo") || el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add("unveil"); io.observe(el);
  });

  // ---------- Depth: tilted prints and inset photos drift with the scroll ----------
  const par = reduce ? [] : $$(".hero-frame, .phero .arch, .duo");
  if (par.length) {
    let q = false;
    const drift = () => { q = false; const vh = innerHeight; par.forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return; el.style.setProperty("--py", (((r.top + r.height / 2) - vh / 2) / vh).toFixed(3)); }); };
    addEventListener("scroll", () => { if (!q) { q = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();
  }

  // ---------- Numbers count up the first time they are seen ----------
  const counters = $$(".hero-stats b, .facts dd").filter((el) => el.childNodes.length && el.firstChild.nodeType === 3 && /^\d+/.test(el.firstChild.textContent));
  const countUp = (el) => {
    const t = el.firstChild, m = t.textContent.match(/^(\d+)(.*)$/s), to = +m[1], from = to > 1000 ? to - 60 : 0, t0 = performance.now(), dur = 1500;
    el.classList.add("counting");
    const step = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); t.textContent = Math.round(from + (to - from) * e) + m[2]; if (k < 1) requestAnimationFrame(step); else el.classList.remove("counting"); };
    requestAnimationFrame(step);
  };
  if (!reduce && counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { cio.unobserve(e.target); setTimeout(() => countUp(e.target), e.target.closest(".hero") ? 500 : 0); } }), { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  // ---------- Gentle reveal for content below the first screen ----------
  const RV = ".sec-title, .sec h2, .sec .lead, .stairs, .month, .fcard, .duo, .house, .year-head, .trio > div, .facgrid > div, .process li, .news li, .kv > div, .faq details, .ticks li, .story, .fac, .docs li, .paths li, .letter, .form, .tbl-wrap, .facts > div, .cta .row, .gal, .filters, .pill-row";
  if (io) {
    const seen = new Set();
    $$(RV, $("main")).forEach((el) => {
      if (seen.has(el) || el.closest(".hero, .rv") || el.classList.contains("words") || el.getBoundingClientRect().top < innerHeight) return;
      seen.add(el); el.classList.add("rv");
      const sibs = [...el.parentElement.children].filter((c) => c.matches(RV));
      el.style.setProperty("--rv-i", Math.max(0, sibs.indexOf(el)));
      io.observe(el);
    });
  }

  if (io) $$(".ftr-in > div").forEach((el, i) => { el.classList.add("rv"); el.style.setProperty("--rv-i", i); io.observe(el); });

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
    // data-all keeps to notices for the whole school (no class picked), for the home page.
    const all = "all" in ul.dataset;
    const items = [...(S.state ? S.state.notices : [])].sort((a, b) => (a.date < b.date ? -1 : 1)).filter((n) => n.web !== false && !(n.to && (n.to.staff || n.to.bus || n.to.gender)) && !(all && n.to && n.to.cls && n.to.cls.length) && n.date >= (S.todayKey || "")).slice(0, limit);
    const tone = { Holiday: "", PTM: "tag--brick", Exam: "tag--brick", Event: "tag--hedge", Notice: "tag--gold" };
    const loc = "en-IN";
    ul.innerHTML = items.map((n) => { const d = new Date(n.date + "T00:00"); return `<li><div class="day">${d.getDate()}<small>${d.toLocaleDateString(loc, { month: "long" })}, ${d.toLocaleDateString(loc, { weekday: "short" })}</small></div><div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></div><span class="tag ${tone[n.tag] || ""}">${esc(n.tag)}</span></li>`; }).join("") || `<li><div></div><p class="muted">${"Nothing coming up right now. New events appear here as the school posts them."}</p></li>`;
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
    let cur = 0, closeAnim = null;
    const visible = () => items.filter((i) => !i.classList.contains("out"));
    const lbImg = $("img", lb);
    lbImg.addEventListener("load", () => (lbImg.style.opacity = 1));
    // quick: the thumbnail's own file, already on screen, so the zoom starts at once; the full photo swaps in when it arrives.
    const show = (i, quick) => { const v = visible(); cur = (i + v.length) % v.length; const it = v[cur]; const src = $("img", it).src; const first = quick || src;
      if (lbImg.src !== first) { lbImg.style.opacity = quick ? 1 : 0; lbImg.src = first; }
      if (quick && quick !== src) { const pre = new Image(); pre.onload = () => { if (visible()[cur] === it) lbImg.src = src; }; pre.src = src; }
      lbImg.alt = $("img", it).alt; $("figcaption", lb).textContent = $("figcaption", it)?.textContent || ""; };
    // The photo grows out of its thumbnail and shrinks back into it (FLIP: measure both, animate the difference).
    lb.classList.add("fx");
    const flip = (it, opening) => {
      const a = $("img", it).getBoundingClientRect(), b = lbImg.getBoundingClientRect();
      if (reduce || !a.width || !b.width || a.bottom < 0 || a.top > innerHeight) return null;
      const k = a.width / b.width, at = { transform: `translate(${a.left + a.width / 2 - b.left - b.width / 2}px, ${a.top + a.height / 2 - b.top - b.height / 2}px) scale(${k})`, borderRadius: `${16 / k}px` }, home = { transform: "none", borderRadius: "14px" };
      return lbImg.animate(opening ? [at, home] : [home, at], { duration: opening ? 520 : 380, easing: "cubic-bezier(.2,.8,.2,1)", fill: opening ? "none" : "forwards" });
    };
    const open = async (it) => {
      if (closeAnim) { closeAnim.cancel(); closeAnim = null; }
      const th = $("img", it); show(visible().indexOf(it), th.currentSrc || th.src);
      try { await lbImg.decode(); } catch (e) {}
      lb.classList.add("open"); flip(it, true); $(".ibtn", lb).focus({ preventScroll: true });
    };
    const close = () => {
      if (!lb.classList.contains("open")) return;
      const it = visible()[cur];
      closeAnim = (it && flip(it, false)) || lbImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
      lb.classList.remove("open");
      if (it) it.focus({ preventScroll: true });
    };
    items.forEach((it) => it.addEventListener("click", () => open(it)));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".ibtn:not(.nav-l):not(.nav-r)")) close(); });
    $(".nav-l", lb).addEventListener("click", () => show(cur - 1));
    $(".nav-r", lb).addEventListener("click", () => show(cur + 1));
    document.addEventListener("keydown", (e) => { if (!lb.classList.contains("open")) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });
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
      const en = { child: val("child"), cls: val("cls"), parent: val("parent"), phone: val("phone"), note: [slot ? "Visit " + S.fmt(slot.dataset.date) : "", val("note")].filter(Boolean).join(" — "), at: S.todayKey, status: slot ? "Visit booked" : "New", fresh: true };
      en.ref = S.enqRef(en);
      S.state.enquiries.unshift(en);
      S.save();
      const rl = $("[data-ref-msg]"); if (rl) rl.innerHTML = `Your reference number is <b>${esc(en.ref)}</b>. Keep it to see where your application stands, below.`;
    }
    if (kind === "job" && S.state) {
      const cv = f.elements.cv && f.elements.cv.files[0];
      S.state.applications.push({ name: val("name"), phone: val("phone"), post: val("post"), exp: val("exp"), cv: cv ? cv.name : "", at: S.todayKey });
      S.save();
    }
    const done = f.nextElementSibling;
    if (done && done.classList.contains("done")) {
      if (kind === "enquiry") { const slot = $(".slot[aria-pressed='true']", f); const msg = $("[data-slot-msg]", done), when = slot ? new Date(slot.dataset.date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "";
        msg.textContent = slot ? `Your campus visit is pencilled in for ${when}. The office will call to confirm the time.` : "The admissions office will call you, usually the same working day."; }
      f.hidden = true; done.hidden = false; done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    } else S.toast("Sent. The office will get back to you.");
  }));

  // ---------- Admissions: the age check ----------
  // Age on 31 March of the admission year, against the bands in the table above it.
  const ageF = $("#age-chk");
  if (ageF && S.state) ageF.addEventListener("submit", (e) => {
    e.preventDefault();
    const dobEl = $("#age-dob"), v = dobEl.dataset.iso || dobEl.value; if (!v) return;
    const a = S.state.site.adm, yr = parseInt(a.session, 10) || 2027, on = new Date(yr, 2, 31), dob = new Date(v + "T00:00");
    let m = (on.getFullYear() - dob.getFullYear()) * 12 + on.getMonth() - dob.getMonth(); if (on.getDate() < dob.getDate()) m--;
    const y = Math.floor(m / 12), mo = m % 12, age = `${y} year${y === 1 ? "" : "s"}${mo ? ` ${mo} month${mo === 1 ? "" : "s"}` : ""}`;
    const fit = y < 3 ? null : y < 4 ? "Nursery" : y < 5 ? "LKG" : y < 6 ? "UKG" : y < 7 ? "Class I" : "older";
    let msg = `On 31 March ${yr}, your child will be <b>${age}</b>. `;
    if (m < 0) msg = "That date is after the session begins. Please check the date of birth.";
    else if (!fit) msg += `That is under the age for Nursery in ${esc(a.session)}, so the year after is the one to apply for.`;
    else if (fit === "older") msg += `Class I needs six years or more, so the class depends on the last class your child passed. Choose "Other class" in the visit form and the office will tell you if a seat is free.`;
    else msg += `That fits <b>${fit}</b>. ` + (a.open && a.classes.includes(fit) ? `Admission to ${fit} is open now.` : `Seats in ${fit} open only when a family moves; ask in the visit form.`);
    $("#age-out").innerHTML = msg;
  });

  // ---------- Admissions: where an enquiry stands ----------
  // The reference from the visit form plus the mobile number. (The demo's numbers are masked,
  // so only their last two digits are compared.)
  const stF = $("#st-form");
  if (stF && S.state) stF.addEventListener("submit", (e) => {
    e.preventDefault();
    const ref = $("#st-ref").value.trim().toUpperCase(), ph = $("#st-ph").value.replace(/\D/g, "");
    const en = S.state.enquiries.find((x) => S.enqRef(x) === ref), out = $("#st-out");
    if (!en || ph.length < 10 || ph.slice(-2) !== en.phone.replace(/\D/g, "").slice(-2)) { out.innerHTML = `<p class="st-bad">No enquiry matches that reference and mobile number. Check both, or call the office.</p>`; return; }
    const STEPS = [["New", "Enquiry received"], ["Called", "The office called you"], ["Visit booked", "Campus visit booked"], ["Form given", "Admission form given"], ["Admitted", "Admitted"]];
    const i = STEPS.findIndex(([k]) => k === en.status);
    out.innerHTML = `<p class="st-h"><b>${esc(en.child)}</b> · ${esc(en.cls)}</p><ol class="st-steps">${STEPS.map(([, l], k) => `<li class="${k < i ? "st-done" : k === i ? "st-now" : ""}">${l}</li>`).join("")}</ol>`;
  });

  // ---------- Parent corner: the calendar, with "add to my phone" ----------
  const ics = (events, name) => {
    const d = (k) => k.replace(/-/g, ""), next = (k) => { const x = new Date(k + "T00:00"); x.setDate(x.getDate() + 1); return d(S.iso(x)); };
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//St. John's School//EN", ...events.flatMap((e, i) => ["BEGIN:VEVENT", `UID:${d(e.date)}-${i}-sjs@stjohns`, `DTSTAMP:${d(S.todayKey)}T000000Z`, `DTSTART;VALUE=DATE:${d(e.date)}`, `DTEND;VALUE=DATE:${next(e.end || e.date)}`, `SUMMARY:${e.title.replace(/[,;]/g, "\\$&")}`, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" })); a.download = name + ".ics"; document.body.append(a); a.click(); a.remove();
  };
  const calL = $("#cal-list");
  if (calL && S.CALENDAR) {
    const ev = S.CALENDAR.map(([d, t]) => ({ date: d, title: t, kind: /PTM|teacher/.test(t) ? "Meeting" : /Unit|Half|board|Final|Results/i.test(t) ? "Exam" : "School" }));
    const hs = Object.keys(S.HOLIDAYS).sort();
    for (let i = 0; i < hs.length;) { const name = S.HOLIDAYS[hs[i]]; let j = i; while (j + 1 < hs.length && S.HOLIDAYS[hs[j + 1]] === name && (new Date(hs[j + 1]) - new Date(hs[j])) / 864e5 <= 3) j++; ev.push({ date: hs[i], end: hs[j], title: name, kind: "Holiday" }); i = j + 1; }
    const up = ev.filter((e) => (e.end || e.date) >= S.todayKey).sort((a, b) => (a.date < b.date ? -1 : 1));
    // The next six show; the rest of the year folds under one button.
    const more = up.length - 6;
    calL.insertAdjacentHTML("afterend", more > 0 ? `<button class="cal-more" type="button" aria-expanded="false">Show ${more} more dates</button>` : "");
    const mb = calL.nextElementSibling && calL.nextElementSibling.classList.contains("cal-more") ? calL.nextElementSibling : null;
    if (mb) { calL.classList.add("folded"); mb.addEventListener("click", () => { const o = calL.classList.toggle("folded"); mb.setAttribute("aria-expanded", !o); mb.textContent = o ? `Show ${more} more dates` : "Show fewer"; }); }
    calL.innerHTML = up.map((e, k) => `<li class="k-${e.kind.toLowerCase()}"><time datetime="${e.date}"><b>${new Date(e.date + "T00:00").getDate()}</b>${S.fmt(e.date, { month: "short" })}</time><div><b>${esc(e.title)}</b><span>${e.kind} · ${S.fmt(e.date, { weekday: "long" })}${e.end && e.end !== e.date ? `, until ${S.fmt(e.end, { day: "numeric", month: "short" })}` : ""}</span></div><button class="cal-add" type="button" data-cal="${k}" aria-label="Add ${esc(e.title)} to my calendar">Add</button></li>`).join("");
    // Beside the list: the next date, counted down, and how many of each kind are left this session.
    const nu = $("#nextup"), n0 = up[0];
    if (nu && n0) {
      const days = Math.round((new Date(n0.date + "T00:00") - new Date(S.todayKey + "T00:00")) / 864e5);
      const cnt = (k) => up.filter((e) => e.kind === k).length;
      nu.innerHTML = `<small>Next up</small><b class="nu-t">${esc(n0.title)}</b><span class="nu-d">${days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`} · ${S.fmt(n0.date, { weekday: "long", day: "numeric", month: "long" })}</span><ul class="nu-c"><li class="k-exam"><b>${cnt("Exam")}</b>exams</li><li class="k-meeting"><b>${cnt("Meeting")}</b>meetings</li><li class="k-holiday"><b>${cnt("Holiday")}</b>holidays</li></ul>`;
      nu.hidden = false;
    }
    calL.addEventListener("click", (e) => { const b = e.target.closest("[data-cal]"); if (b) { const x = up[+b.dataset.cal]; ics([x], x.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")); } });
    $("#cal-all").addEventListener("click", () => ics(up, "st-johns-2026-27"));
  }

  // ---------- Campus: find your bus stop ----------
  const rtQ = $("#rt-q");
  if (rtQ && site) {
    const stops = (site.routes || "").split("\n").map((l) => l.split(/\s*[·|]\s*/)).filter((a) => a[0] && a[0].trim());
    const out = $("#rt-out");
    const show = () => {
      const q = rtQ.value.trim().toLowerCase();
      if (!stops.length) { out.innerHTML = `<p class="note"><span class="tbc" title="To be provided by the school">Stops are to be added by the transport office.</span> Until then, the office tells you the route when you apply.</p>`; return; }
      if (!q) { out.innerHTML = ""; return; }
      const hit = stops.filter((a) => a.join(" ").toLowerCase().includes(q));
      out.innerHTML = hit.length ? `<ul class="rt-list">${hit.slice(0, 6).map((a) => `<li><b>${esc(a[0])}</b><span>${esc(a[1] || "")}</span><small>${esc(a[2] || "")}</small></li>`).join("")}</ul>` : `<p class="note">No stop matches "${esc(rtQ.value.trim())}". The office can tell you the nearest one.</p>`;
    };
    rtQ.addEventListener("input", show); $("#rt-find").addEventListener("submit", (e) => { e.preventDefault(); show(); }); show();
  }

  // ---------- Contact: openings from the Website tab ----------
  const jobsEl = $("#jobs");
  if (jobsEl && site && site.jobs.length) {
    jobsEl.innerHTML = site.jobs.map((j) => `<li><div class="row"><div><b>${esc(j.title)}</b><span>${esc(j.text)} Apply by ${S.fmt(j.by, { day: "numeric", month: "long", year: "numeric" })}.</span></div></div></li>`).join("");
    $("#j-post").innerHTML = site.jobs.map((j) => `<option>${esc(j.title)}</option>`).join("") + "<option>Future openings</option>";
  }

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
    const cap = $(".hero-cap", hero);
    const go = (n) => { if (n === k || !ready(imgs[n])) return; imgs[k].classList.remove("on"); imgs[n].classList.add("on"); k = n; $$("button", dots).forEach((d, i) => d.setAttribute("aria-current", i === k)); if (cap) { cap.classList.add("swap"); setTimeout(() => { cap.textContent = imgs[k].dataset.cap || ""; cap.classList.toggle("none", !imgs[k].dataset.cap); cap.classList.remove("swap"); }, 260); } };
    if (imgs.length > 1 && ctl) {
      dots.innerHTML = imgs.map((_, i) => `<button type="button" aria-label="Photo ${i + 1} of ${imgs.length}" aria-current="${i === 0}"></button>`).join("");
      $$("button", dots).forEach((d, i) => d.addEventListener("click", () => { if (!ready(imgs[i])) { imgs[i].addEventListener("load", () => go(i), { once: true }); return; } go(i); }));
      const setPause = (p) => { paused = p; pause.setAttribute("aria-pressed", p); pause.setAttribute("aria-label", p ? "Play the slideshow" : "Pause the slideshow"); };
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
    // The row sits in a reel: round arrows on either side, and a dot for each month below.
    const reel = document.createElement("div");
    reel.className = "reel";
    track.before(reel); reel.append(track);
    const arrow = (cls, label, d) => `<button class="reel-btn ${cls}" type="button" aria-label="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></button>`;
    reel.insertAdjacentHTML("beforeend", arrow("prev", "Earlier months", "M15 6l-6 6 6 6") + arrow("next", "Later months", "M9 6l6 6-6 6"));
    const [prev, next] = $$(".reel-btn", reel);
    const cards = $$(".month", track);
    const dots = document.createElement("div");
    dots.className = "reel-dots"; dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = cards.map(() => "<i></i>").join("");
    reel.after(dots);
    const gap = () => parseFloat(getComputedStyle(track).columnGap) || 18;
    const step = () => { const m = cards[0]; return m ? m.offsetWidth + gap() : track.clientWidth * 0.8; }; // one month per click
    const sync = () => {
      prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
      const w = cards[0] ? cards[0].offsetWidth + gap() : 1, i = next.disabled ? cards.length - 1 : Math.round(track.scrollLeft / w);
      $$("i", dots).forEach((d, k) => d.classList.toggle("on", k === i));
    };
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));
    track.addEventListener("scroll", sync, { passive: true }); addEventListener("resize", sync); sync();
  });

  // ---------- The five stages: one opens at a time, under its own row ----------
  $$("[data-stages]").forEach((stg) => {
    const tiles = $$("button.step", stg), panel = $(".stage-panel", stg), sps = $$(".sp", panel);
    const EASE = "cubic-bezier(.22, 1, .36, 1)";
    let cur = -1, anim = null;
    const cols = () => getComputedStyle(stg).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
    // The panel sits after the last tile of the chosen tile's row, so on a phone it opens right below the tile.
    const place = () => {
      if (cur < 0) return;
      const c = cols();
      tiles.forEach((t, i) => (t.style.order = i));
      panel.style.order = Math.min(tiles.length - 1, Math.floor(cur / c) * c + c - 1);
      const t = tiles[cur];
      panel.style.setProperty("--nx", Math.round(t.offsetLeft + t.offsetWidth / 2 - panel.offsetLeft) + "px");
    };
    const rowOf = (i) => (i < 0 ? -1 : Math.floor(i / cols()));
    const show = (i, how = {}) => {
      if (anim) anim.cancel();
      const was = cur, h0 = was < 0 || panel.hidden ? 0 : panel.offsetHeight;
      const sameRow = was >= 0 && rowOf(was) === rowOf(i);
      cur = i;
      tiles.forEach((t, k) => t.setAttribute("aria-expanded", String(k === cur)));
      stg.classList.toggle("has-open", cur >= 0);
      if (cur < 0) {
        if (reduce || !h0) { panel.hidden = true; return; }
        panel.style.overflow = "clip";
        anim = panel.animate([{ height: h0 + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 320, easing: EASE });
        anim.onfinish = () => { panel.hidden = true; panel.style.overflow = ""; anim = null; };
        return;
      }
      panel.hidden = false; panel.style.overflow = ""; panel.dataset.s = cur;
      sps.forEach((p, k) => (p.hidden = k !== cur));
      place();
      if (!reduce && how.animate !== false) {
        const h1 = panel.offsetHeight, from = sameRow ? h0 : 0;
        if (from !== h1) {
          panel.style.overflow = "clip";
          anim = panel.animate([{ height: from + "px" }, { height: h1 + "px" }], { duration: 420, easing: EASE });
          anim.onfinish = () => { panel.style.overflow = ""; anim = null; };
        }
      }
      // If the tile ran off screen (a panel above it just closed), bring it back into view.
      if (how.scroll !== false) {
        const r = tiles[cur].getBoundingClientRect();
        if (r.top < 80 || r.top > innerHeight * 0.62) tiles[cur].scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      }
    };
    tiles.forEach((t, i) => t.addEventListener("click", () => {
      stg.classList.add("is-live");
      show(cur === i ? -1 : i);
      if (cur >= 0) history.replaceState(null, "", "#" + tiles[cur].id);
    }));
    // A link from the home page names the stage: open it, glow the tile once, and
    // show the section heading too when the tile and its panel still fit on screen.
    const hashed = () => tiles.findIndex((t) => "#" + t.id === location.hash);
    const frame = (i) => {
      const t = tiles[i], sec = stg.closest("section");
      const fits = t.getBoundingClientRect().bottom - sec.getBoundingClientRect().top + 260 < innerHeight;
      (fits ? sec : t).scrollIntoView({ block: "start" });
    };
    const land = (i) => {
      stg.classList.add("is-live");
      show(i, { scroll: false });
      const t = tiles[i];
      t.classList.remove("arrive"); void t.offsetWidth; t.classList.add("arrive");
      t.addEventListener("animationend", () => t.classList.remove("arrive"), { once: true });
      requestAnimationFrame(() => frame(i));
    };
    const first = hashed();
    if (first >= 0) land(first); else show(0, { animate: false, scroll: false });
    addEventListener("hashchange", () => { const i = hashed(); if (i >= 0) land(i); });
    // The browser jumps to the tile again once the page has loaded; settle on our framing.
    addEventListener("load", () => { place(); const i = hashed(); if (i >= 0 && i === cur) frame(i); });
    addEventListener("resize", place);
  });
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

// Campus: the dotted path between facilities draws itself as the page scrolls past it.
(() => {
  const walk = document.querySelector(".fac-walk"); if (!walk) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let raf = 0;
  const draw = () => { raf = 0; const r = walk.getBoundingClientRect(), f = (innerHeight * 0.75 - r.top) / r.height; walk.style.setProperty("--walk", (1 - Math.max(0, Math.min(1, f))).toFixed(3)); };
  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(draw); }, { passive: true });
  addEventListener("resize", draw); draw();
})();

// The admissions tag never hides. If an open menu would cover it, it slides aside; if there's no
// room beside, it goes just below the menu; failing that, it docks at the foot of the screen.
(() => {
  const set = (tag, x, y) => { tag.style.setProperty("--adx", x + "px"); tag.style.setProperty("--ady", y + "px"); };
  const place = () => {
    const tag = document.querySelector(".adm-tag"), hdr = tag && (tag.closest(".hdr") || document.querySelector(".hdr")); if (!tag || !hdr) return;
    const o = document.querySelector(".sheet-open") ? document.querySelector(".sheet")
      : [...document.querySelectorAll(".nav > li")].filter((li) => li.matches(":hover, :focus-within")).map((li) => li.querySelector(".sub")).find(Boolean);
    if (!o) return set(tag, 0, 0);
    // Measure from where the tag rests (layout box, centred), not where it is mid-slide.
    const P = tag.offsetParent.getBoundingClientRect(), w = tag.offsetWidth, h = tag.offsetHeight;
    const l0 = P.left + tag.offsetLeft - w / 2, t0 = P.top + tag.offsetTop;
    const t = { left: l0, right: l0 + w, top: t0, bottom: t0 + h, width: w, height: h }, m = o.getBoundingClientRect(), gap = 12;
    if (t.right <= m.left - 4 || t.left >= m.right + 4 || t.bottom <= m.top || t.top >= m.bottom) return set(tag, 0, 0);
    if (m.left - gap - 12 >= t.width) return set(tag, m.left - gap - t.right, 0);
    if (innerWidth - m.right - gap - 12 >= t.width) return set(tag, m.right + gap - t.left, 0);
    // Never under the assistant button either: the floor is its top when it shares the tag's row.
    const fab = document.querySelector(".ai-fab"), fr = fab && fab.getBoundingClientRect();
    const floor = fr && fr.width && fr.left < t.right ? fr.top - 10 : innerHeight - 12;
    const below = m.bottom + gap;
    if (below + t.height <= floor) return set(tag, 0, below - t.top);
    set(tag, 0, floor - t.height - t.top);
  };
  let raf = 0; const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); setTimeout(place, 320); setTimeout(place, 600); };
  ["mouseover", "focusin", "focusout", "click", "keydown"].forEach((e) => document.addEventListener(e, soon, true));
  addEventListener("resize", soon); addEventListener("scroll", () => { if (document.querySelector(".hdr.sheet-open")) soon(); }, { passive: true });
})();
