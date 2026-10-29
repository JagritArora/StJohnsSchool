/* Ease of use, shared by the parent, staff and driver pages:
   your name in the top bar opens a small menu (text size, and Hindi on the parent's side);
   when the connection drops, work is kept on this device and goes out when it's back;
   the section and filters you picked last time come back; every staff table downloads
   for Excel; and the pages are kept on the device so they open at once, even offline. */
(() => {
  const S = window.SJS; if (!S) return;
  const $ = (q, el = document) => el.querySelector(q), $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { v == null || v === "" ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const drv = document.body.classList.contains("drv"), parent = !!S.me && !S.staff, root = document.documentElement;
  const hi = root.lang === "hi";

  // ---------- Your name opens settings: text size, language ----------
  const who = $(".pbar-who"), out = $('.pbar-r a[href*="login"]');
  // Shared with the school website's own text-size buttons (shell.js), so one choice carries across.
  const SIZES = [["1", "Standard", 14], ["1.1", "Large", 17], ["1.2", "Larger", 20]], ATTR = { "1.1": "l", "1.2": "xl" };
  let menu = null;
  const size = () => get("sjs-zoom") || "1";
  function setSize(v) { put("sjs-zoom", v === "1" ? null : v); if (ATTR[v]) root.dataset.text = ATTR[v]; else delete root.dataset.text; if (menu) $$("[data-size]", menu).forEach((b) => b.setAttribute("aria-pressed", b.dataset.size === v)); }
  function openMenu() {
    if (!menu) {
      const name = ($(".pbar-wt b", who) || {}).textContent || "", role = ($(".pbar-wt small", who) || {}).textContent || "";
      menu = document.createElement("div"); menu.className = "ez-menu"; menu.setAttribute("role", "dialog"); menu.setAttribute("aria-label", "Settings");
      menu.innerHTML = `<div class="ez-me"><span class="avatar">${esc(($(".avatar", who) || {}).textContent || "")}</span><span><b>${esc(name)}</b><small>${esc(role)}</small></span></div>
        <p class="ez-k">Text size</p><div class="ez-seg" role="group" aria-label="Text size">${SIZES.map(([v, l, px]) => `<button type="button" data-size="${v}" aria-pressed="${v === size()}"><span style="font-size:${px}px">A</span><small>${l}</small></button>`).join("")}</div>
        ${parent ? `<p class="ez-k">Language · भाषा</p><div class="ez-seg two" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="${!hi}" translate="no"><span>English</span></button><button type="button" data-lang="hi" aria-pressed="${hi}" lang="hi"><span>हिन्दी</span></button></div>
        <p class="ez-note">${hi ? "Menus, headings, buttons and dates are in Hindi. Notes from teachers stay as they wrote them." : "Hindi covers menus, headings, buttons and dates. Notes from teachers stay as they wrote them."}</p>` : ""}
        ${out ? `<a class="ez-out" href="${esc(out.getAttribute("href"))}">${svg('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>')}Sign out</a>` : ""}`;
      document.body.append(menu);
      menu.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.size != null) setSize(b.dataset.size);
        if (b.dataset.lang) { if ((b.dataset.lang === "hi") !== hi) { put("sjs-lang", b.dataset.lang === "hi" ? "hi" : null); location.reload(); } }
      });
    }
    const r = who.getBoundingClientRect();
    menu.style.top = r.bottom + 8 + "px"; menu.style.right = Math.max(10, innerWidth - r.right) + "px";
    menu.classList.add("on"); who.setAttribute("aria-expanded", "true");
    const first = $("[aria-pressed=true]", menu) || $("button", menu); if (first) first.focus({ preventScroll: true });
  }
  const closeMenu = () => { if (!menu || !menu.classList.contains("on")) return; menu.classList.remove("on"); who.setAttribute("aria-expanded", "false"); };
  if (who && !drv) {
    who.classList.add("ez-who"); who.setAttribute("role", "button"); who.tabIndex = 0;
    who.setAttribute("aria-haspopup", "dialog"); who.setAttribute("aria-expanded", "false"); who.setAttribute("aria-label", "Settings: text size" + (parent ? " and language" : ""));
    who.insertAdjacentHTML("beforeend", `<i class="ez-chev" aria-hidden="true"></i>`);
    who.addEventListener("click", () => (menu && menu.classList.contains("on") ? closeMenu() : openMenu()));
    who.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); who.click(); } });
    document.addEventListener("pointerdown", (e) => { if (menu && !menu.contains(e.target) && !who.contains(e.target)) closeMenu(); }, true);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu && menu.classList.contains("on")) { closeMenu(); who.focus(); } });
    addEventListener("resize", closeMenu);
  }
  S.openSettings = () => who && openMenu();

  // ---------- No connection: keep the work here, send it when it's back ----------
  const OUT = "sjs-outbox";
  const box = () => { try { return JSON.parse(get(OUT) || "[]"); } catch (e) { return []; } };
  let net = null;
  function paintNet() {
    const n = box().length, off = !navigator.onLine;
    if (!off && !n) { if (net) net.hidden = true; return; }
    if (!net) { net = document.createElement("div"); net.className = "ez-net"; net.setAttribute("role", "status"); const m = $("main"); if (!m) return; m.prepend(net); }
    net.hidden = false; net.classList.toggle("off", off);
    net.innerHTML = off ? `${svg('<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><path d="M3 3l18 18"/>')}<span><b>No connection.</b> ${n ? `${n} saved on this ${S.narrow && S.narrow() ? "phone" : "device"}, waiting to send.` : `Keep working: what you save stays on this ${S.narrow && S.narrow() ? "phone" : "device"} and goes out when you're back online.`}</span>`
      : `${svg('<path d="M12 4v10M8 10l4 4 4-4M5 19h14"/>')}<span>Sending ${n} saved…</span>`;
  }
  // Every "done" message (Saved, Posted, Published, Sent…) is the moment work would leave the device.
  const plain = S.toast;
  if (plain) {
    S.toast = (msg, o = {}) => {
      const done = o.done !== undefined ? o.done : S.DONE_RE && S.DONE_RE.test(msg);
      if (!done || navigator.onLine) return plain(msg, o);
      const b = box(); b.push({ msg, at: Date.now() }); put(OUT, JSON.stringify(b.slice(-40)));
      plain(msg, o); // logged as usual
      plain(`Saved on this ${S.narrow && S.narrow() ? "phone" : "device"}. It goes out by itself when you're back online.`, { done: false, nolog: true });
      paintNet();
    };
  }
  addEventListener("offline", paintNet);
  function flush() {
    const b = box(); paintNet();
    if (!b.length) return;
    setTimeout(() => {
      put(OUT, null); paintNet();
      plain && plain(`Back online. Sent ${b.length === 1 ? "what you saved" : `all ${b.length} things you saved`} while offline.`, { done: true, nolog: true });
    }, 900);
  }
  addEventListener("online", flush);
  if (navigator.onLine) flush(); else paintNet(); // saved before the page was closed: send it now

  // ---------- Your last section and filters come back ----------
  // Only pickers that choose what to look at; never form fields with meaning of their own.
  const KEEP = ["m-sec", "hw-cls", "sj-sec", "xs-cls", "xs-sec", "cr-sec", "c-cls", "c-sec"];
  const me = S.staff ? S.staff.id : null, keyOf = (id) => `sjs-pick:${me}:${id}`, done = new Set();
  function restore() {
    if (!me) return;
    KEEP.forEach((id) => {
      const s = document.getElementById(id); if (!s || done.has(id) || s.disabled) return;
      done.add(id);
      const v = get(keyOf(id));
      if (v == null || s.value === v || ![...s.options].some((o) => o.value === v)) return;
      s.value = v; s.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  document.addEventListener("change", (e) => { const t = e.target; if (me && t && KEEP.includes(t.id)) put(keyOf(t.id), t.value); });

  // ---------- Every staff table downloads for Excel ----------
  const cellText = (c) => {
    const k = c.cloneNode(true), live = $$("input, select, textarea", c);
    $$("input, select, textarea", k).forEach((f, i) => { const o = live[i]; f.replaceWith(document.createTextNode(!o ? "" : o.tagName === "SELECT" ? (o.selectedOptions[0] || {}).textContent || "" : o.value)); });
    $$(".avatar, svg, .sr-only, [aria-hidden=true], .tip", k).forEach((x) => x.remove());
    const t = k.textContent.replace(/\s+/g, " ").trim();
    return /^₹\s?[\d,]+(\.\d+)?$|^-?[\d,]+(\.\d+)?$/.test(t) ? t.replace(/[₹,\s]/g, "") : t; // numbers stay numbers in Excel
  };
  const csv = (t) => [...t.rows].filter((r) => !r.hidden && r.offsetParent !== null || r.closest("thead")).map((r) => [...r.cells].map((c) => { const v = cellText(c); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(",")).join("\r\n");
  function download(t) {
    const card = t.closest(".card"), view = t.closest("[data-view]");
    const name = (($(".card-h h2", card || document.body) || {}).textContent || ($("h1", view || document.body) || {}).textContent || "Table").trim();
    const file = `${name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-")}-${S.todayKey || new Date().toISOString().slice(0, 10)}.csv`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv(t)], { type: "text/csv;charset=utf-8" })); a.download = file;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    plain && plain(`Downloaded ${file}. It opens in Excel or Google Sheets.`, { done: false, nolog: true });
  }
  function xlButtons() {
    if (!S.staff) return;
    $$("table.tbl").forEach((t) => {
      if (t._xl || !t.tBodies[0] || t.tBodies[0].rows.length < 3) return;
      const card = t.closest(".card"); if (!card) return;
      t._xl = 1;
      const b = document.createElement("button"); b.type = "button"; b.className = "ez-xl"; b.title = "Download for Excel"; b.setAttribute("aria-label", "Download this table for Excel");
      b.innerHTML = svg('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>') + "<span>Excel</span>";
      b.addEventListener("click", () => download(t));
      const h = [...card.children].find((x) => x.classList.contains("card-h"));
      if (h && !$(".ez-xl", h)) h.append(b);
      else { const w = t.closest(".tbl-wrap") || t, bar = w.parentElement.querySelector(":scope > .tbl-bar"); if (bar && bar.classList.contains("tbl-bar")) { ($(".m-tools", bar) || bar).append(b); return; } const row = document.createElement("div"); row.className = "ez-xl-row"; row.append(b); w.before(row); }
    });
  }

  // ---------- Watch what the pages draw ----------
  let q = 0;
  const pass = () => { q = 0; restore(); xlButtons(); };
  const m = $("main"); if (m) new MutationObserver(() => { if (!q) q = requestAnimationFrame(pass); }).observe(m, { childList: true, subtree: true });
  setTimeout(pass, 0);

  // ---------- Kept on the device: opens at once next time, and without a connection ----------
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
    // This page and what it loaded, kept now, so the very next visit works offline too.
    navigator.serviceWorker.ready.then((reg) => {
      const same = (u) => { try { return new URL(u).origin === location.origin; } catch (e) { return false; } };
      const urls = [location.href.split("#")[0], ...performance.getEntriesByType("resource").map((r) => r.name)].filter(same).filter((u) => !/\.pdf($|\?)/.test(u));
      if (reg.active) reg.active.postMessage({ keep: [...new Set(urls)] });
    });
  });
})();
