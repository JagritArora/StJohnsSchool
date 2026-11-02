/* Title case on the sign-in page and every page after it: page titles, headings, tiles,
   tabs, buttons, labels and short lines such as "Choose who you are", as the pages draw them.
   - Only lowercase words gain a capital, so names, classes (IX-A), UT 3 and ₹ figures stay as
     they are; short joining words (and, of, to…) stay small mid-title.
   - Anything longer than eight words is a sentence and is left alone, and so is what teachers
     and the school write: homework, notices, messages, remarks and the assistant's answers. */
(() => {
  const SMALL = new Set("a an the and but or nor for as at by in of on per to via vs with from into than".split(" "));
  const KEEP = new Set("am pm km kg min mins hrs".split(" "));
  // "Sign In", "Fill In", "Pick Up": after these verbs the little word is part of the verb.
  const VERB = /^(sign|signed|log|logged|check|checked|fill|filled|hand|handed|pick|picked|drop|dropped|set|turn|top|follow|look|opt|opted|mark|marked)$/;
  const BREAK = /[:·–—?!]$/;
  const up = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const hyph = (w, last) => w.split("-").map((p, j) => (j && SMALL.has(p) && !last ? p : up(p))).join("-");
  // first: the text starts a title; more: more of the title follows; glued: it carries on the word before it ("Ryan" + "'s").
  const titleCase = (t, { first = true, more = false, glued = false } = {}) => {
    const parts = t.split(/(\s+)/);
    let start = first, prev = "";
    return parts.map((w, i) => {
      if (!w.trim()) return w;
      if (i === 0 && glued) { prev = w.toLowerCase(); return w; }
      const last = !more && !parts.slice(i + 1).some((x) => /\S/.test(x)), lead = w.match(/^[("“‘']*/)[0], core = w.slice(lead.length);
      const tail = core.match(/[.,:;?!)”’…]*$/)[0], bare = core.slice(0, core.length - tail.length);
      let out = w;
      if (/^\d+-[a-z]+$/.test(bare)) out = lead + bare.replace(/-([a-z])/, (m, c) => "-" + c.toUpperCase()) + tail; // 6-day → 6-Day
      else if (/^[A-Z][a-z'’]*(-[a-z]+)+$/.test(bare)) out = lead + hyph(bare, last) + tail; // Half-yearly → Half-Yearly
      else if (/^[a-z][a-z'’-]*$/.test(bare) && !KEEP.has(bare)) {
        const big = start || last || !SMALL.has(bare) || (VERB.test(prev) && /^(in|on|up|out|off)$/.test(bare));
        out = lead + (big ? hyph(bare, last) : bare) + tail;
      }
      start = BREAK.test(w) || w === "&";
      prev = bare.toLowerCase();
      return out;
    }).join("");
  };
  if (window.SJS) window.SJS.titleCase = titleCase;

  const HEAD = "h1, h2, h3, h4, h5, h6, .lg-hi, .login-box > p.muted";
  const SEL = `h1, h2, h3, h4, h5, h6, button, summary, label, legend, th, option, a, b, strong, small, span, li, dt, dd, time, td.off, td[colspan],
    .lg-hi, .login-box > p.muted, .sj-step, .pbar-page, .notif-h b, .ez-k, .hub-date, .pt-date`;
  // Words written by people (homework, notices, forms, messages, remarks, the assistant's answers),
  // sentences the pages say, and anything typed.
  const NOT = `.hn-b > h3, .hn-b > p, .hn-d, .hn-item h3, .hc-it, .nt > h3, .ns-li b, .cf-h b, .msg, .ct-last, .rem, .pipe-card > b, .pipe-card > span,
    .li .t > b, .li .t > span, .nf-t, .vp > ol:not([class]), .ap > b, .wk-d em, select#tr-n, .ai-log, .ai-ph, .ai-search, .need-t, .toast, .tip,
    .x-head, .x-detail > p, .demo-ids span, .lg-help, #qp-fname, .qp-outline ul, textarea, input, [contenteditable], [translate=no], #HOUT`;
  // Running sentences; a button or link inside one is still a button ("Enter marks →").
  const PROSE = "p:not(.lg-hi, .login-box > p.muted, .sj-step, .tr-sum, .ez-k)";
  // The page's own words wherever they sit: status chips, and the "to watch" rows it writes from the figures.
  const CHIP = ".pill, .tag, .badge, #watch .t, #c-week .t";
  const SKIP = "small, .muted, .count, select, svg, input, textarea";
  const words = (t) => t.trim().split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;
  function caseIn(el) {
    if ((el.closest(NOT) && !el.closest(CHIP)) || (el.closest(PROSE) && !el.closest("button, a"))) return;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ns = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) { const p = n.parentElement, s = p.closest(SKIP); if (n.data.trim() && (!p.closest(NOT) || p.closest(CHIP)) && (!s || s === el || !el.contains(s))) ns.push(n); }
    // More than eight words in one run, or a line ending like a sentence, is a sentence: "Noted, will do."
    const all = ns.map((n) => n.data).join("").trim();
    if (words(all) > 16 || ns.some((n) => words(n.data) > 8) || (/[.?!]$/.test(all) && !el.matches(HEAD)) || all.includes(";")) return;
    const field = !!el.querySelector("select, input"); // "Datesheet for [Class X]": the title carries on into the field
    let first = true;
    ns.forEach((n, i) => {
      const glued = i > 0 && !/^\s/.test(n.data) && !/\s$/.test(ns[i - 1].data);
      const t = titleCase(n.data, { first, glued, more: field || ns.slice(i + 1).some((x) => /\S/.test(x.data)) });
      if (t !== n.data) n.data = t;
      first = BREAK.test(n.data.trimEnd());
    });
  }
  const pass = (root) => {
    if (root.nodeType !== 1) root = root.parentElement;
    if (!root || !root.isConnected) return;
    const own = root.closest(SEL); if (own) caseIn(own);
    root.querySelectorAll(SEL).forEach(caseIn);
  };
  // Straight after each change, before the page paints, so a lowercase title never shows.
  new MutationObserver((ms) => new Set(ms.map((m) => m.target)).forEach(pass)).observe(document.body, { childList: true, subtree: true, characterData: true });
  pass(document.body);
})();
