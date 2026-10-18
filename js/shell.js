/* St. John's School — the floating header.
   Loaded right after <body> so the header is there from the first frame.
   At the top of a page the pill carries the main links. Once you scroll into
   the page it turns into that page's sections, highlights the one you are
   reading and draws a reading-progress line along its bottom edge. On narrow
   screens it shows the section name and a "Menu" button that opens a sheet. */
(function () {
  const S = (window.SJS = window.SJS || {});
  const page = document.body.dataset.page || "";
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const NAV = [
    ["about", "About", "about.html", [["Our story", "#story", "Since 1965"], ["Vision and mission", "#vision", "What we stand for"], ["Principal's message", "#principal", ""], ["Management", "#management", "Idicula Trust Society"]]],
    ["academics", "Academics", "academics.html", [["Nursery to XII", "#stages", "Five stages, one school"], ["How we teach", "#approach", ""], ["Exams and assessment", "#assessment", ""], ["Senior secondary", "#senior", "Classes XI and XII"]]],
    ["admissions", "Admissions", "admissions.html", [["How to apply", "#process", "Five steps"], ["Age criteria", "#age", ""], ["Documents", "#documents", ""], ["Questions parents ask", "#faq", ""], ["Book a campus visit", "#enquire", ""]]],
    ["campus", "Campus", "campus.html", [["Facilities", "#facilities", "Four green acres"], ["Safety and wellbeing", "#safety", ""], ["School transport", "#transport", ""]]],
    ["life", "Student life", "life.html", [["Activities", "#activities", "Music, band, dance, sport"], ["Photo gallery", "#gallery", ""], ["The school year", "#calendar", ""]]],
    ["parents", "Parents", "parents.html", [["Timings", "#timings", ""], ["Uniform", "#uniform", ""], ["Fees and payment", "#fees", ""], ["Downloads", "#downloads", ""], ["The parent app", "#app", "Attendance, homework, marks"]]],
    ["news", "News", "news.html", []],
    ["contact", "Contact", "contact.html", []]
  ];
  const PAGES = [["home", "Home", "index.html"], ...NAV.map(([k, l, h]) => [k, l, h])];
  const pageName = page === "home" ? "St. John's" : (PAGES.find(([k]) => k === page) || [, "St. John's"])[1];
  const I = (S.ICONS = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5 5 5-5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  });

  const hdr = document.createElement("header");
  hdr.className = "hdr";
  hdr.innerHTML = `<div class="hdr-in">
    <div class="pill">
      <a class="logo" href="index.html" aria-label="St. John's School, home"><img src="assets/crest.svg" alt="" width="40" height="40" /><span class="logo-t"><b>St. John's School</b><small><span class="where">Sector 7A, Faridabad</span><span class="sec-now"></span></small></span></a>
      <button class="now" type="button" aria-haspopup="true" aria-expanded="false"><small>${pageName}</small><span class="now-t"><b></b></span></button>
      <div class="lanes">
        <nav class="lane lane-main" aria-label="Main"><i class="ind" aria-hidden="true"></i><ul class="nav">${NAV.map(([k, l, href, subs]) => `<li><a href="${href}"${k === page ? ' aria-current="page"' : ""}>${l}</a>${subs.length ? `<div class="sub">${subs.map(([t, h, d]) => `<a href="${href}${h}">${t}${d ? `<span>${d}</span>` : ""}</a>`).join("")}</div>` : ""}</li>`).join("")}</ul></nav>
        <nav class="lane lane-sec" aria-label="On this page" inert><button class="here" type="button" aria-haspopup="true" aria-expanded="false">${pageName}${I.down}</button><div class="chips"><i class="ind" aria-hidden="true"></i></div></nav>
      </div>
      <div class="hdr-act">
        <a class="ibtn hide-m" href="login.html" aria-label="Parent and staff login" title="Parent and staff login">${I.user}</a>
        <a class="btn btn--sm hide-m" href="admissions.html#enquire">Apply</a>
        <button class="menu-btn" type="button" aria-haspopup="true" aria-expanded="false"><span>Menu</span></button>
      </div>
      <i class="prog" aria-hidden="true"></i>
    </div>
    <div class="sheet" aria-hidden="true" inert>
      <div class="sheet-col"><h2>Pages</h2><ul class="sheet-pages">${PAGES.map(([k, l, h], i) => `<li style="--i:${i}"><a href="${h}"${k === page ? ' aria-current="page"' : ""}>${l}</a></li>`).join("")}</ul></div>
      <div class="sheet-col sheet-here" hidden><h2>On this page</h2><ul class="sheet-secs"></ul></div>
      <div class="sheet-foot"><a class="btn" href="admissions.html#enquire">Apply for admission</a><a class="btn btn--ghost" href="login.html">${I.user}Parent and staff login</a></div>
    </div>
  </div>`;
  const proto = document.createElement("div");
  proto.className = "proto";
  proto.innerHTML = `<span class="proto-long">Prototype of a new website for St. John's School. Dates, people and figures underlined in yellow are placeholders.</span><span class="proto-short">Prototype of St. John's new website.</span> <a href="plan.html">Read the proposal</a>`;
  const skip = document.createElement("a"); skip.className = "skip"; skip.href = "#main"; skip.textContent = "Skip to content";
  document.body.prepend(skip, proto, hdr);
  // The home hero sizes its first screen around the banner's real height.
  const protoH = () => root.style.setProperty("--proto-h", proto.offsetHeight + "px");
  protoH(); addEventListener("resize", protoH);

  const pill = $(".pill", hdr), sheet = $(".sheet", hdr), lanes = $(".lanes", hdr);
  const laneMain = $(".lane-main", hdr), laneSec = $(".lane-sec", hdr), chips = $(".chips", hdr);
  const openers = $$(".now, .here, .menu-btn", hdr);

  // A soft lozenge sits behind the current page, or the current section.
  const place = (ind, el) => {
    if (!el) { ind.style.opacity = 0; return; }
    ind.style.opacity = 1;
    const box = ind.parentElement;
    ind.style.width = el.offsetWidth + "px";
    ind.style.transform = `translateX(${el.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft}px)`;
  };
  const curPage = $(".nav > li > a[aria-current]", hdr);
  const placeMain = () => place($(".ind", laneMain), curPage);
  placeMain();
  if (document.fonts) document.fonts.ready.then(placeMain);

  // Width morph: the pill eases between its two sizes instead of jumping.
  const morph = (change) => {
    const w0 = pill.offsetWidth;
    change();
    const w1 = pill.offsetWidth;
    if (reduce || Math.abs(w1 - w0) < 2 || !pill.animate) return;
    pill.classList.add("morphing");
    pill.animate([{ width: w0 + "px" }, { width: w1 + "px" }], { duration: 560, easing: "cubic-bezier(.16, 1, .3, 1)" }).finished.then(() => pill.classList.remove("morphing"), () => pill.classList.remove("morphing"));
  };

  // ---------- Menu sheet ----------
  let open = false, lastOpener = null;
  const setSheet = (o, from) => {
    if (o === open) return;
    open = o;
    hdr.classList.toggle("sheet-open", o);
    sheet.setAttribute("aria-hidden", !o); sheet.inert = !o;
    openers.forEach((b) => b.setAttribute("aria-expanded", o));
    $(".menu-btn span", hdr).textContent = o ? "Close" : "Menu";
    if (o) { lastOpener = from; setTimeout(() => ($("a[aria-current]", sheet) || $("a", sheet)).focus({ preventScroll: true }), 60); }
    else if (lastOpener && sheet.contains(document.activeElement)) lastOpener.focus({ preventScroll: true });
  };
  openers.forEach((b) => b.addEventListener("click", () => setSheet(!open, b)));
  sheet.addEventListener("click", (e) => { if (e.target.closest("a")) setSheet(false); });
  document.addEventListener("click", (e) => { if (open && !hdr.contains(e.target)) setSheet(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) setSheet(false); });

  // ---------- Sections of this page ----------
  let secs = [], first = null;
  const build = () => {
    const src = $$(".subnav a[href^='#']");
    secs = src.map((a) => ({ id: a.getAttribute("href").slice(1), label: a.textContent.trim() })).map((s) => ({ ...s, el: document.getElementById(s.id) })).filter((s) => s.el);
    if (!secs.length) { hdr.classList.add("no-secs"); return; }
    chips.insertAdjacentHTML("beforeend", secs.map((s) => `<a href="#${s.id}">${s.label}</a>`).join(""));
    $(".sheet-secs", hdr).innerHTML = secs.map((s, i) => `<li style="--i:${i}"><a href="#${s.id}">${s.label}</a></li>`).join("");
    $(".sheet-here", hdr).hidden = false;
    hdr.classList.add("has-secs");
    first = secs[0].el;
    const edges = () => { const l = chips.scrollLeft; chips.classList.toggle("more-l", l > 2); chips.classList.toggle("more-r", l + chips.clientWidth < chips.scrollWidth - 2); };
    chips.addEventListener("scroll", edges, { passive: true }); addEventListener("resize", edges); edgesFn = edges;
  };
  let edgesFn = () => {};

  // ---------- Scroll: mode, current section, progress ----------
  let compact = false, cur = -1, queued = false;
  const label = $(".now-t", hdr);
  const setNow = (text) => {
    const old = $("b", label);
    // Compared by key, not by what it shows: the Hindi pass may have translated the shown text.
    if (old && old.dataset.k === text) return;
    const sn = $(".sec-now", hdr); if (sn) sn.textContent = text;
    const b = document.createElement("b"); b.textContent = text; b.dataset.k = text;
    if (old && !reduce && old.textContent) { old.classList.add("out"); b.classList.add("in"); setTimeout(() => old.remove(), 420); requestAnimationFrame(() => requestAnimationFrame(() => b.classList.remove("in"))); }
    else if (old) old.remove();
    label.append(b);
  };
  const setCompact = (c) => {
    if (c === compact) return;
    morph(() => {
      compact = c;
      hdr.classList.toggle("compact", c);
      laneMain.inert = c; laneSec.inert = !c;
    });
    if (c) { placeSec(); edgesFn(); }
  };
  const placeSec = () => {
    const a = cur >= 0 ? chips.querySelectorAll("a")[cur] : null;
    place($(".ind", chips), a);
    if (a && (a.offsetLeft < chips.scrollLeft || a.offsetLeft + a.offsetWidth > chips.scrollLeft + chips.clientWidth)) chips.scrollTo({ left: a.offsetLeft - 12, behavior: reduce ? "auto" : "smooth" });
  };
  const tick = () => {
    queued = false;
    const y = scrollY, max = root.scrollHeight - innerHeight;
    pill.style.setProperty("--p", max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : 0);
    if (!secs.length) return;
    setCompact(first.getBoundingClientRect().top < innerHeight * 0.5);
    // The section you are reading is the last one whose top has passed 40% of the screen.
    let n = -1;
    secs.forEach((s, i) => { if (s.el.getBoundingClientRect().top < innerHeight * 0.4) n = i; });
    if (y + innerHeight >= root.scrollHeight - 4) n = secs.length - 1;
    if (n !== cur) {
      cur = n;
      $$("a", chips).forEach((a, i) => a.classList.toggle("on", i === n));
      $$(".sheet-secs a", hdr).forEach((a, i) => a.classList.toggle("on", i === n));
      if (compact) placeSec();
    }
    setNow(compact && n >= 0 ? secs[n].label : "");
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", () => { placeMain(); if (compact) placeSec(); queue(); });

  const start = () => { build(); tick(); hdr.classList.add("ready"); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
