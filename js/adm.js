/* Admissions page: rotating "a seat is waiting for…", open classes, a day at school by stage
   (real timings from the prospectus, with a "now" marker), and the subjects and streams explorer. */
(function () {
  const S = window.SJS || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // "A seat is waiting for a little dancer…"
  const word = $(".ao-word");
  if (word && !reduce) {
    const spans = $$("span", word);
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      const a = spans[i]; i = (i + 1) % spans.length; const b = spans[i];
      a.classList.remove("on"); a.classList.add("out");
      b.classList.remove("out"); b.classList.add("on");
      setTimeout(() => a.classList.remove("out"), 700);
    }, 2600);
  }

  // Open classes, from the Website tab's admissions settings.
  const chips = $(".ao-chips");
  if (chips) {
    let open = ["Nursery", "Class XI"], session = "2027–28";
    try { const a = S.state.site.adm; if (a) { open = a.open ? a.classes : []; session = a.session; } } catch (e) { /* defaults */ }
    const all = ["Nursery", "LKG", "UKG", "Class I", "Classes II to X", "Class XI"];
    chips.innerHTML = all.map((c, n) => `<li style="--i:${n}"${open.includes(c) ? ' class="hot"' : ""}>${esc(c)}${open.includes(c) ? " · open" : ""}</li>`).join("");
    $$("[data-ao-session]").forEach((el) => (el.textContent = session));
    if (!open.length) { const st = $(".ao-st"); if (st) st.textContent = `Registration for ${session} opens soon`; }
  }

  // A day at school, by stage.
  const H0 = 7, H1 = 15; // the bar runs 7 AM to 3 PM
  const pos = (h, m) => ((h + m / 60 - H0) / (H1 - H0) * 100).toFixed(2) + "%";
  const span = (a, b) => ({ a: pos(a[0], a[1]), w: (((b[0] + b[1] / 60) - (a[0] + a[1] / 60)) / (H1 - H0) * 100).toFixed(2) + "%" });
  const BIG = { days: "Monday to Saturday", sum: [[7, 35], [13, 45]], win: [[8, 5], [14, 15]], sT: "7:35 AM – 1:45 PM", wT: "8:05 AM – 2:15 PM" };
  const STAGES = [
    { k: "Nursery & KG", h: "Little ones, big days", p: "A bright, air-conditioned pre-primary wing of their own, a toy train and a play area made for small feet.", days: "Monday to Friday",
      sum: [[8, 35], [12, 55]], win: [[9, 0], [13, 20]], sT: "8:35 AM – 12:55 PM", wT: "9:00 AM – 1:20 PM",
      love: ["Air-conditioned classrooms", "Attractive toy train", "Kids play area", "Huge amphitheatre", "Audio visual room", "Indoor fun activities", "Smart boards"],
      pics: [["pp-room", "The air-conditioned pre-primary wing"], ["pp-firstday", "First day of school"], ["pp-slide", "The kids play area"]] },
    { k: "Classes I – V", h: "Learning by doing", p: "Digital classrooms and experiential learning, with dance, music and craft woven into every week.", ...BIG,
      love: ["Digital classrooms", "Experiential learning", "Dance", "Music", "Clay modelling", "Craft activities", "Chess", "Excursions"],
      pics: [["pp-comp", "In the computer lab"], ["pp-play", "Out on the play area"]] },
    { k: "Classes VI – VIII", h: "Finding what they love", p: "Labs, the stage and the playing field: the years when a child discovers what they are good at.", ...BIG,
      love: ["Science and computer labs", "Drama and mime", "Theatre", "Badminton", "Basketball", "Football", "Yoga", "Composting and Swachh Abhiyaan"],
      pics: [["pp-dance", "On stage at the annual function"], ["pp-chess", "A game of chess"]] },
    { k: "Classes IX – X", h: "Ready for the boards", p: "Five main subjects plus a skill subject of their choice, from Artificial Intelligence to painting.", ...BIG,
      love: ["Artificial Intelligence", "Introduction to Financial Markets", "Information Technology", "Hindustani Music", "Painting", "Physical Activity Trainer", "Full-time counsellor"],
      pics: [["pp-lab", "In the biology lab"]] },
    { k: "Classes XI – XII", h: "Four streams, one future", p: "Medical, Non-Medical, Commerce or Humanities, with a well-stocked senior library and two air-conditioned seminar auditoriums.", ...BIG,
      love: ["Medical", "Non-Medical", "Commerce", "Humanities", "Senior library", "Seminars and workshops", "Skills training"],
      pics: [["p-seniors", "Seniors on campus"]] }
  ];
  const tabs = $(".dy-tabs"), body = $(".dy-body"), pic = $(".dy-pic");
  if (tabs && body && pic) {
    tabs.innerHTML = STAGES.map((s, n) => `<button type="button" role="tab" aria-selected="${!n}" data-n="${n}">${esc(s.k)}</button>`).join("");
    let rot;
    const show = (n) => {
      const s = STAGES[n], su = span(...s.sum), wi = span(...s.win);
      $$("button", tabs).forEach((b) => b.setAttribute("aria-selected", b.dataset.n == n));
      const d = new Date(), hh = d.getHours() + d.getMinutes() / 60;
      const now = hh > H0 && hh < H1 ? `<u style="--now:${pos(d.getHours(), d.getMinutes())}" title="Now"></u>` : "";
      body.innerHTML = `<h3>${esc(s.h)}</h3><p>${esc(s.p)}</p>
        <div class="dy-clock"><p class="gk"><span>School day</span><b>${esc(s.days)}</b></p>
          <div class="dy-bar" role="img" aria-label="Summer ${esc(s.sT)}, winter ${esc(s.wT)}"><i class="sum" style="--a:${su.a};--w:${su.w}"></i><i class="win" style="--a:${wi.a};--w:${wi.w}"></i>${now}</div>
          <div class="dy-axis"><span>7 AM</span><span>9</span><span>11</span><span>1 PM</span><span>3 PM</span></div>
          <div class="dy-key"><span>Summer ${esc(s.sT)}</span><span>Winter ${esc(s.wT)}</span></div></div>
        <p class="note mt-m">What they'll love</p>
        <ul class="dy-love">${s.love.map((l, i) => `<li style="--i:${i}">${esc(l)}</li>`).join("")}</ul>`;
      pic.innerHTML = s.pics.map(([f, c], i) => `<img src="assets/photos/${f}.webp" alt="${esc(c)}"${i ? "" : ' class="on"'} loading="lazy" decoding="async" />`).join("") + `<span>${esc(s.pics[0][1])}</span>`;
      clearInterval(rot);
      if (s.pics.length > 1 && !reduce) {
        let j = 0; const imgs = $$("img", pic), cap = $("span", pic);
        rot = setInterval(() => { imgs[j].classList.remove("on"); j = (j + 1) % imgs.length; imgs[j].classList.add("on"); cap.textContent = s.pics[j][1]; }, 3200);
      }
    };
    tabs.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(+b.dataset.n); });
    show(0);
  }

  // Subjects and streams for Class XI, from the prospectus.
  const OPT = ["Informatics Practices", "Mathematics", "Psychology", "Hindustani Music Vocal", "Fine Arts (Painting)", "Physical Education", "Entrepreneurship", "Typography and Computer Application"];
  const STREAMS = [
    { k: "Medical", c: "var(--hedge)", must: ["English Core", "Physics", "Chemistry", "Biology / Biotechnology"], opt: OPT },
    { k: "Non-Medical", c: "var(--royal)", must: ["English Core", "Physics", "Chemistry", "Mathematics"], opt: ["Computer Science / Informatics Practices", ...OPT.slice(2)] },
    { k: "Commerce", c: "var(--marigold)", must: ["English Core", "Economics", "Business Studies", "Accountancy"], opt: OPT },
    { k: "Humanities", c: "var(--brick)", must: ["English Core", "Economics", "History", "Political Science"], opt: OPT }
  ];
  const grid = $(".st-grid"), out = $(".st-out");
  if (grid && out) {
    const pick = (n) => {
      const s = STREAMS[n];
      $$(".st", grid).forEach((b) => b.setAttribute("aria-pressed", b.dataset.n == n));
      out.style.setProperty("--c", s.c);
      out.innerHTML = `<div class="st-box"><h4>${esc(s.k)} · compulsory</h4><ul>${s.must.map((m, i) => `<li style="--i:${i}">${esc(m)}</li>`).join("")}</ul></div>
        <div class="st-box"><h4>Optional subject · choose one</h4><ul>${s.opt.map((m, i) => `<li style="--i:${i}">${esc(m)}</li>`).join("")}</ul></div>`;
    };
    grid.addEventListener("click", (e) => { const b = e.target.closest(".st"); if (b) pick(+b.dataset.n); });
    pick(0);
  }
})();
