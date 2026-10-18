/* St. John's School — the public site in Hindi.
   English is the source. js/hi.js holds the Hindi for each piece of text,
   keyed by the English exactly as the page shows it, and loads only when a
   visitor picks हिंदी. A piece is either a run of text with inline markup
   (a paragraph with a bold name or a link: swapped whole, so Hindi word order
   can differ), a lone text node, or an attribute people read (alt, title,
   aria-label, placeholder). Text added later by scripts is caught as it
   appears. Switching language reloads the page in place with a crossfade.
   Loaded right after shell.js, before the page content. */
(function () {
  const S = (window.SJS = window.SJS || {});
  const root = document.documentElement;
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "hi" || q === "en") store.set("sjs-lang", q);
  const lang = (q || store.get("sjs-lang")) === "hi" ? "hi" : "en";
  S.lang = lang;
  S.locale = lang === "hi" ? "hi-IN" : "en-IN";

  const INLINE = new Set(["B", "STRONG", "I", "EM", "SPAN", "A", "BR", "SMALL", "ABBR", "CITE", "SUP", "SUB", "TIME", "MARK", "U", "S", "Q"]);
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "svg", "IMG", "IFRAME", "INPUT"]);
  // The motto knock-out, the logo and the footer motto stay in English: they are the school's mark.
  const KEEP = "[data-no-tr], .logo-t > b, .logo-t .where, .ftr .motto, .ai-log, .lang-btn, [lang]:not(html)";
  const ATTRS = ["aria-label", "placeholder", "title", "alt"];
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const hasLatin = (s) => /[A-Za-z]/.test(s);

  const isUnit = (el) => {
    let text = false;
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { if (n.data.trim()) text = true; }
      else if (n.nodeType === 1 && (!INLINE.has(n.tagName) || n.querySelector("svg, img, button, input, select, textarea"))) return false;
    }
    return text;
  };
  // Visit every translatable piece under el. fn returns true when it handled a
  // unit; otherwise the walk goes on into the unit's children.
  const walk = (el, fn) => {
    if (el.nodeType !== 1 || el.matches(KEEP)) return;
    // Attributes first: inputs and photos have no text to walk, but do have placeholders and alt text.
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && hasLatin(v)) fn("attr", el, norm(v), a); }
    if (SKIP.has(el.tagName)) return;
    if (el !== document.body && isUnit(el) && fn("unit", el, norm(el.innerHTML))) return;
    for (const n of [...el.childNodes]) {
      if (n.nodeType === 3) { const k = norm(n.data); if (k && hasLatin(k)) fn("text", n, k); }
      else if (n.nodeType === 1) walk(n, fn);
    }
  };
  // For building the dictionary: every piece on the page, English as keys.
  S.trCollect = () => { const out = []; walk(document.body, (kind, t, key, a) => { out.push([kind, key, a || ""]); return true; }); return out; };

  // ---------- Switch ----------
  const sw = () => {
    const to = lang === "hi" ? "en" : "hi";
    store.set("sjs-lang", to);
    try { sessionStorage.setItem("sjs-lang-y", String(Math.round(scrollY))); } catch (e) {}
    location.replace(location.pathname + (to === "hi" ? "?lang=hi" : ""));
  };
  const addButtons = () => {
    const label = lang === "hi" ? "English" : "हिंदी", tl = lang === "hi" ? "en" : "hi", tip = lang === "hi" ? "Read in English" : "हिंदी में पढ़ें";
    const act = document.querySelector(".hdr-act"), foot = document.querySelector(".sheet-foot");
    if (act) act.insertAdjacentHTML("afterbegin", `<button class="lang-btn hide-m" type="button" lang="${tl}" title="${tip}" aria-label="${tip}"><span class="l-long">${label}</span><span class="l-short" aria-hidden="true">${lang === "hi" ? "EN" : "हि"}</span></button>`);
    if (foot) foot.insertAdjacentHTML("beforeend", `<button class="btn btn--ghost lang-btn" type="button" lang="${tl}">${tip}</button>`);
    document.querySelectorAll(".lang-btn").forEach((b) => b.addEventListener("click", sw));
  };
  addButtons();

  if (lang !== "hi") { S.langReady = Promise.resolve(); return; }

  // ---------- Hindi ----------
  root.lang = "hi";
  let D = {};
  const missing = (S.trMissing = new Set());
  const apply = (kind, t, key, attr) => {
    const hi = D[key];
    if (hi == null) { missing.add(key); return false; }
    if (kind === "attr") t.setAttribute(attr, hi);
    else if (kind === "unit") t.innerHTML = hi;
    else { const m = t.data.match(/^(\s*)[\s\S]*?(\s*)$/); t.data = m[1] + hi + m[2]; }
    return true;
  };
  const translate = (node) => {
    if (node.nodeType === 3) {
      const p = node.parentElement, k = norm(node.data);
      if (p && k && hasLatin(k) && !p.closest(KEEP) && !SKIP.has(p.tagName)) apply("text", node, k);
    } else if (node.nodeType === 1 && !(node.parentElement && node.parentElement.closest(KEEP))) walk(node, apply);
  };
  const watch = () => new MutationObserver((recs) => recs.forEach((r) => {
    if (r.type === "attributes") { const v = r.target.getAttribute(r.attributeName); if (v && hasLatin(v) && !r.target.closest(KEEP)) apply("attr", r.target, norm(v), r.attributeName); }
    else r.addedNodes.forEach(translate);
  })).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATTRS });

  const dict = new Promise((res) => { const s = document.createElement("script"); s.src = "js/hi.js"; s.onload = s.onerror = res; document.head.append(s); });
  const dom = document.readyState === "loading" ? new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true })) : Promise.resolve();
  S.langReady = Promise.all([dict, dom]).then(() => {
    D = S.HI || {};
    document.title = D[document.title] || document.title;
    walk(document.body, apply);
    watch();
    root.classList.remove("tr-wait");
    // Back to where the reader was before switching.
    let y = null; try { y = sessionStorage.getItem("sjs-lang-y"); sessionStorage.removeItem("sjs-lang-y"); } catch (e) {}
    if (y) setTimeout(() => scrollTo({ top: +y, behavior: "instant" }), 60);
  });
})();
