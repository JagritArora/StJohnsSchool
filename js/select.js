/* Themed dropdowns. The real <select> stays in the page (it shows the choice and keeps every
   listener working); on a mouse or trackpad, its list opens as a themed menu instead of the
   browser's. Phones keep their own picker. The demo bar keeps the plain one. */
(() => {
  if (!matchMedia("(pointer: fine)").matches) return;
  let menu = null, sel = null, hi = -1, q = "", qT = 0;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const skip = (s) => s.disabled || s.multiple || s.closest("[data-demo], .dm, .no-xs");
  const close = () => { if (!menu) return; menu.remove(); menu = null; if (sel) sel.classList.remove("xs-open"); sel = null; };
  const opts = () => [...sel.options].filter((o) => !o.hidden);
  const mark = (i) => { const it = menu.querySelectorAll(".xs-o"); it.forEach((e, j) => e.classList.toggle("hi", j === i)); hi = i; if (it[i]) it[i].scrollIntoView({ block: "nearest" }); };
  const pick = (i) => { const o = opts()[i]; if (!o || o.disabled) return; const s = sel; close(); s.focus(); if (s.value !== o.value) { s.value = o.value; s.dispatchEvent(new Event("input", { bubbles: true })); s.dispatchEvent(new Event("change", { bubbles: true })); } };
  function open(s) {
    close(); sel = s; s.classList.add("xs-open");
    const r = s.getBoundingClientRect(), list = opts();
    menu = document.createElement("div"); menu.className = "xs-menu"; menu.setAttribute("role", "listbox");
    let h = "", grp = null;
    list.forEach((o, i) => {
      const g = o.parentElement.tagName === "OPTGROUP" ? o.parentElement.label : null;
      if (g && g !== grp) h += `<div class="xs-g">${esc(g)}</div>`; grp = g;
      h += `<div class="xs-o${o.selected ? " on" : ""}${o.disabled ? " off" : ""}" role="option" aria-selected="${o.selected}" data-i="${i}"><span>${esc(o.textContent)}</span>${o.selected ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ""}</div>`;
    });
    q = ""; menu.innerHTML = `<div class="xs-q" hidden></div>` + h; document.body.appendChild(menu);
    const w = Math.max(r.width, 180), below = innerHeight - r.bottom - 12, mh = Math.min(320, menu.scrollHeight);
    menu.style.minWidth = w + "px"; menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 12) + "px";
    if (below < mh && r.top > below) { menu.style.bottom = innerHeight - r.top + 6 + "px"; menu.style.maxHeight = Math.min(320, r.top - 12) + "px"; }
    else { menu.style.top = r.bottom + 6 + "px"; menu.style.maxHeight = Math.min(320, below) + "px"; }
    mark(list.findIndex((o) => o.selected));
  }
  document.addEventListener("mousedown", (e) => {
    const s = e.target.closest && (e.target.closest("select") || (e.target.closest(".sj-fld") || { querySelector: () => null }).querySelector("select")); // the whole pill opens it, icon and arrow too
    if (menu && !e.target.closest(".xs-menu")) { const was = sel; close(); if (s === was) { e.preventDefault(); return; } }
    if (!s || skip(s) || e.button) return;
    e.preventDefault(); s.focus(); open(s);
  }, true);
  document.addEventListener("click", (e) => { const o = e.target.closest(".xs-menu .xs-o"); if (o) pick(+o.dataset.i); });
  document.addEventListener("mousemove", (e) => { const o = e.target.closest(".xs-menu .xs-o"); if (o && +o.dataset.i !== hi) mark(+o.dataset.i); });
  document.addEventListener("keydown", (e) => {
    if (!menu) { const s = e.target; if (s.tagName === "SELECT" && !skip(s) && (e.key === " " || e.key === "Enter" || (e.altKey && e.key === "ArrowDown"))) { e.preventDefault(); open(s); } return; }
    const n = opts().length;
    if (e.key === "Escape" || e.key === "Tab") { const s = sel; close(); if (e.key === "Escape") { e.preventDefault(); s.focus(); } }
    else if (e.key === "ArrowDown") { e.preventDefault(); mark(Math.min(n - 1, hi + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); mark(Math.max(0, hi - 1)); }
    else if (e.key === "Home" || e.key === "End") { e.preventDefault(); mark(e.key === "Home" ? 0 : n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(hi); }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      // Type to search: letters build up for a moment; a match at the start of any word wins, then anywhere.
      clearTimeout(qT); q += e.key.toLowerCase(); qT = setTimeout(() => { q = ""; }, 900);
      const t = opts().map((o) => o.textContent.trim().toLowerCase());
      let i = t.findIndex((x) => x.split(/[\s·.,-]+/).some((w) => w.startsWith(q)));
      if (i < 0) i = t.findIndex((x) => x.includes(q));
      if (i >= 0) mark(i);
      const b = menu.querySelector(".xs-q"); if (b) { b.textContent = q; b.hidden = false; b.classList.toggle("miss", i < 0); }
    }
  }, true);
  addEventListener("resize", close);
  addEventListener("scroll", (e) => { if (menu && !menu.contains(e.target)) close(); }, true);
})();
