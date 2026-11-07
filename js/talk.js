/* Messages: every conversation in the school in one place, for parents, teachers and leadership.
   Who can talk to whom
   - Parents and their child's teachers (class teacher, subject teachers) and the wing coordinator.
   - Parents never reach other parents, unless staff put them in a group together.
   - Staff and any staff, one to one or in groups.
   Groups the roster makes for everyone (members follow the timetable, so nobody adds anyone):
   - Class group: the class's parents and teachers. Teachers post; parents read, tap Noted and can
     reply privately. The class teacher can open it to parents' posts.
   - Class teachers, wing staff and all staff (staff only); wing parents (from the coordinator up).
   Anyone can make their own group: parents only with their child's teachers; staff with staff and
   the parents of the classes they teach (coordinators: their wing; the principal: anyone).
   Leadership (principal, vice principal, wing coordinators) is quiet by design:
   - Not put in class groups; they can look in on any group of their wings, with no notice either way.
   - Only messages to them and raised cases count as new; the rest waits in Pulse until they look.
   - A parent–teacher chat stays between the two until either raises it. Then the coordinator joins as a case.
   Files: photos are made smaller before they go; PDFs and documents go as they are, up to 10 MB each.
   Prototype: chats live in this browser (localStorage), files in its IndexedDB. The real app keeps both
   on the school's server (Firestore and Cloud Storage), so every phone sees them. */
(() => {
  const S = window.SJS, root = document.getElementById("talk");
  if (!S || !root) return;
  const esc = S.esc, q = (s, el = root) => el.querySelector(s);
  const MAXB = 10 * 1024 * 1024, MAXN = 6;
  const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

  // ---------- Who is reading ----------
  const ST = S.staff;
  const ME = ST ? { id: ST.id, kind: ST.role === "teacher" ? "teacher" : ST.role === "admin" ? "office" : "lead", lead: ST.lead || null, wing: ST.wing || null, name: ST.name }
    : { id: "P:" + S.kidKey, kind: "parent", kid: S.kid(S.kidKey) };
  if (ME.kind === "parent") ME.name = ME.kid.parent;
  const isLead = ME.kind === "lead", side = ME.kind === "parent" ? "parent" : "teacher";

  // ---------- The roster ----------
  const sec = (k) => S.sectionByKey(k), wingOf = (k) => sec(k).wing, slug = (w) => w.toLowerCase().replace(/\s+/g, "-");
  const allSecs = Object.entries(S.SECTIONS).flatMap(([c, ss]) => ss.map((s) => `${c}-${s}`));
  const secsOfWing = (w) => allSecs.filter((k) => wingOf(k) === w);
  const teachersOf = (k) => S.TEACHERS.filter((t) => t.sections.includes(k) || t.classOf === k);
  const ctOf = (k) => S.TEACHERS.find((t) => t.classOf === k);
  const coordOf = (w) => S.LEADS.find((l) => l.lead === "coord" && l.wing === w);
  const VP = S.LEADS.find((l) => l.lead === "vp").id, PR = "SJS-P-0001", OFFICE = "SJS-A-0107";
  const parentsOf = (k) => sec(k).students.map((s) => `P:${k}-${s.roll}`);
  const mySecs = ME.kind === "teacher" ? [...new Set([...(ST.classOf ? [ST.classOf] : []), ...ST.sections])] : [];
  const myWings = isLead ? (ME.lead === "coord" ? [ME.wing] : S.WING_NAMES.slice()) : ME.kind === "teacher" ? [...new Set(mySecs.map(wingOf))] : ME.kind === "parent" ? [ME.kid.sec.wing] : [];
  const hon = (n) => n.replace(/^(Mr|Mrs|Ms|Dr)\.\s+/, "");
  const ini = (n) => hon(n).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = (n) => [8, 210, 150, 35, 265, 185, 330, 95][[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 8];
  const tidOf = (name) => (S.TEACHERS.find((t) => t.name === name) || {}).id || "N:" + name;
  const pcache = {};
  const person = (id) => pcache[id] || (pcache[id] = (() => {
    if (id.startsWith("P:")) {
      const key = id.slice(2), i = key.lastIndexOf("-"), k = key.slice(0, i), roll = +key.slice(i + 1);
      const p = S.PARENTS.find((x) => x.key === key), st = sec(k).students.find((s) => s.roll === roll), child = st ? st.name : "a student";
      const name = p ? p.parent : `Parent of ${child}`;
      return { id, kind: "parent", name, short: p ? p.parent.split(" ")[0] : `${child.split(" ")[0]}'s parent`, sub: `${p ? p.relation : "Parent"} of ${child} · ${S.secName(k)}`, sec: k, child, ini: ini(p ? name : child) };
    }
    if (id.startsWith("N:")) { const n = id.slice(2); return { id, kind: "teacher", name: n, short: hon(n), sub: "Teacher", ini: ini(n) }; }
    const s = S.STAFF[id] || { name: "A colleague", title: "" };
    return { id, kind: s.role === "teacher" ? "teacher" : s.role === "admin" ? "office" : "lead", name: s.name, short: hon(s.name), sub: s.title || "", ini: s.initials || ini(s.name), lead: s.lead };
  })());

  // ---------- Stores ----------
  // Parent–teacher chats keep the record they always had; staff chats stay in the staff room's record
  // (so tasks still reach them); class, wing and mixed groups, cases and other one-to-ones live in "talk".
  const TK = () => S.state.talk || (S.state.talk = { chats: {}, reads: {}, muted: {} });
  const ROOM = () => S.state.staffroom || (S.state.staffroom = { threads: {}, tasks: [], seen: {} });
  const now = () => ({ at: "Today, " + S.timeNow(), ts: Date.now() });
  const pair = (a, b) => "dm:" + [a, b].sort().join("|");

  // ---------- Groups the roster makes ----------
  const pdf = { url: "assets/prospectus.pdf", name: "St. John's prospectus 2026–27.pdf", type: "application/pdf", size: 2480000 };
  const photo = { url: "assets/photos/p-painting.jpg", name: "Class display.jpg", type: "image/jpeg", size: 412000, img: true };
  function staffGroups() {
    const th = ROOM().threads;
    const mk = (id, name, members, extra, seed) => { if (!th[id]) th[id] = Object.assign({ id, kind: "group", sys: true, name, by: null, members, ts: 0, msgs: seed ? seed() : [] }, extra); return th[id]; };
    const all = [...S.TEACHERS.map((t) => t.id), ...S.LEADS.map((l) => l.id), PR, OFFICE];
    mk("g:all", "All staff", all, { post: "admins", admins: [PR, VP, OFFICE, ...S.LEADS.map((l) => l.id)] }, () => [
      { from: PR, kind: "notice", text: "The prospectus for next year is out. Please read it before admissions week, so every family hears the same thing from us.", files: [pdf], at: "Mon, 9:05 AM", old: true }]);
    const wings = ME.kind === "teacher" ? myWings : isLead ? myWings : [];
    wings.forEach((w) => { const c = coordOf(w);
      mk("g:w-" + slug(w), `${w} wing staff`, [...new Set([...secsOfWing(w).flatMap((k) => teachersOf(k).map((t) => t.id)), c.id])], { admins: [c.id] }, () => [
        { from: c.id, text: `Wing meeting on Thursday after school in the library. Please bring the names of any child whose attendance worries you.`, at: "Tue, 3:10 PM", old: true }]); });
    mySecs.forEach((k) => { const id = "g:" + k.toLowerCase();
      if (!th[id]) mk(id, `${S.secName(k)} teachers`, [...new Set([...teachersOf(k).map((t) => t.id), coordOf(wingOf(k)).id])], { admins: [ctOf(k) ? ctOf(k).id : coordOf(wingOf(k)).id] }); });
  }
  const classRec = (k) => { const c = TK().chats, id = "cls:" + k; if (!c[id]) {
    const ct = ctOf(k), other = teachersOf(k).find((t) => t !== ct) || ct, fam = sec(k).students.length;
    c[id] = { id, kind: "class", sec: k, ts: 0, parentsPost: false, msgs: [
      other ? { from: other.id, text: "A look at this week's class display. Well done, everyone!", files: [photo], at: "Tue, 1:40 PM", old: true, seenN: Math.round(fam * 0.8) } : null,
      ct ? { from: ct.id, kind: "notice", text: "Please check the school diary every evening this week. Homework and any notes from teachers are written there too.", at: "Yesterday, 2:15 PM", old: true, seenN: Math.round(fam * 0.7), notedN: Math.round(fam * 0.45) } : null].filter(Boolean) };
  } return c[id]; };
  const wingRec = (w) => { const c = TK().chats, id = "wpa:" + slug(w); if (!c[id]) {
    const fam = secsOfWing(w).reduce((a, k) => a + sec(k).students.length, 0);
    c[id] = { id, kind: "wingp", wing: w, ts: 0, msgs: [{ from: coordOf(w).id, kind: "notice", text: `Dear parents of the ${w} wing: the school prospectus has the uniform, timings and fee dates for the year. Do keep it handy.`, files: [pdf], at: "Mon, 11:30 AM", old: true, seenN: Math.round(fam * 0.66), notedN: Math.round(fam * 0.31) }] };
  } return c[id]; };

  // ---------- A chat, whatever store it's in ----------
  const subsOf = (name) => Object.entries(S.ttTeachers || {}).filter(([sub, t]) => t === name && sub !== "Assembly Activity").map(([sub]) => sub);
  function ptChat(kidKey, tname) {
    const k = S.kid(kidKey), isCT = tname === k.sec.teacher, key = `${kidKey}|${tname}`;
    const arr = isCT ? S.thread(kidKey) : (S.state.threads[key] = S.state.threads[key] || []), pid = "P:" + kidKey, tid = tidOf(tname);
    const subs = ME.kind === "parent" ? subsOf(tname) : [];
    return { id: "pt:" + key, type: "pt", kind: "dm", arr, pid, tid, tname, kidKey, child: k.first, secKey: k.sec.key, members: () => [pid, tid],
      other: ME.kind === "parent" ? Object.assign({}, person(tid), { sub: (isCT ? "Class teacher" : "") + (subs.length ? (isCT ? " · " : "") + subs.join(", ") : isCT ? "" : "Teacher") }) : person(pid),
      ct: isCT, canPost: true };
  }
  function roomChat(t) {
    const dm = t.kind === "dm";
    return { id: "r:" + t.id, type: "room", raw: t, kind: dm ? "dm" : "staff", name: t.name, arr: t.msgs, members: () => t.members, admins: t.admins || [t.by].filter(Boolean),
      post: t.post || "all", other: dm ? person(t.members.find((m) => m !== ME.id) || ME.id) : null, sys: !!t.sys };
  }
  function talkChat(r) {
    const o = { id: "t:" + r.id, type: "talk", raw: r, kind: r.kind, arr: r.msgs, name: r.name, post: r.post || "all", admins: r.admins || [r.by].filter(Boolean), members: () => r.members };
    if (r.kind === "class") {
      const ct = ctOf(r.sec), staff = [...new Set([...teachersOf(r.sec).map((t) => t.id), coordOf(wingOf(r.sec)).id])];
      Object.assign(o, { name: `${S.secName(r.sec)} class group`, staff, members: () => [...staff, ...parentsOf(r.sec)], admins: staff, manager: [ct ? ct.id : null, coordOf(wingOf(r.sec)).id, VP, PR],
        post: r.parentsPost ? "all" : "admins", fam: sec(r.sec).students.length, seenBy: true });
    }
    if (r.kind === "wingp") {
      const c = coordOf(r.wing).id, fam = secsOfWing(r.wing).reduce((a, k) => a + sec(k).students.length, 0);
      Object.assign(o, { name: `${r.wing} wing parents`, staff: [c, VP, PR], members: () => [c, VP, PR, ...secsOfWing(r.wing).flatMap(parentsOf)], admins: [c, VP, PR], post: "admins", fam, seenBy: true });
    }
    if (r.kind === "dm") o.other = person(r.members.find((m) => m !== ME.id) || ME.id);
    return o;
  }
  const fromOf = (c, m) => c.type === "pt" ? (m.from === "parent" ? c.pid : m.from === "teacher" ? (m.by || c.tid) : m.from) : m.from;
  const mineM = (c, m) => c.type === "pt" ? m.from === side : m.from === ME.id;
  const canPost = (c) => {
    if (c.look) return false;
    if (c.kind === "case" && c.raw.status === "done") return false;
    if (c.type === "pt" || c.kind === "dm" || c.kind === "case") return true;
    return c.post === "all" ? c.members().includes(ME.id) : c.admins.includes(ME.id);
  };
  const manages = (c) => c.kind === "class" ? c.manager.includes(ME.id) : (c.admins || []).includes(ME.id);

  // ---------- Every chat this person has ----------
  function mine() {
    const out = [], seen = new Set(), add = (c) => { if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c); } };
    if (ME.kind === "parent") {
      const k = ME.kid, names = [k.sec.teacher, ...new Set(Object.values(S.ttTeachers || {}).filter((t) => /^(Mr|Mrs|Ms|Dr)\. /.test(t) && t !== k.sec.teacher))];
      names.forEach((n) => add(ptChat(k.key, n)));
      add(talkChat(classRec(k.sec.key))); add(talkChat(wingRec(k.sec.wing)));
    } else {
      staffGroups();
      Object.values(ROOM().threads).filter((t) => t.members.includes(ME.id)).forEach((t) => add(roomChat(t)));
      if (ME.kind === "teacher") {
        mySecs.forEach((k) => add(talkChat(classRec(k))));
        S.PARENTS.filter((p) => mySecs.includes(p.sec)).forEach((p) => {
          const k = S.kid(p.key);
          if (k.sec.teacher === ST.name) add(ptChat(p.key, ST.name));
          else if ((S.state.threads[`${p.key}|${ST.name}`] || []).length) add(ptChat(p.key, ST.name));
        });
      }
      if (ME.lead === "coord") add(talkChat(wingRec(ME.wing)));
    }
    Object.values(TK().chats).filter((r) => (r.kind === "group" || r.kind === "dm" || r.kind === "case") && r.members.includes(ME.id)).forEach((r) => add(talkChat(r)));
    return out;
  }
  // Look in: every group of their wings, read quietly.
  function lookIns() {
    if (!isLead) return [];
    const out = [];
    myWings.forEach((w) => {
      out.push(talkChat(wingRec(w)));
      secsOfWing(w).forEach((k) => out.push(Object.assign(talkChat(classRec(k)), { look: true })));
    });
    out.forEach((c) => { if (!c.members().includes(ME.id)) c.look = true; });
    const casesSeen = Object.values(TK().chats).filter((r) => r.kind === "case" && !r.members.includes(ME.id) && myWings.includes(wingOf(r.sec)));
    return [...casesSeen.map((r) => Object.assign(talkChat(r), { look: true })), ...out.filter((c) => c.look)];
  }
  const findChat = (id) => mine().find((c) => c.id === id) || lookIns().find((c) => c.id === id) || null;

  // ---------- New, read, muted ----------
  const mutedMap = () => (TK().muted[ME.id] = TK().muted[ME.id] || {});
  const isMuted = (c) => !!mutedMap()[c.id];
  function unread(c) {
    if (c.look) return 0;
    if (c.type === "pt") return c.arr.filter((m) => m.from !== side && m.fresh).length;
    const n = c.type === "room" ? ((ROOM().seen[ME.id] || {})[c.raw.id] || 0) : ((TK().reads[ME.id] || {})[c.raw.id] || 0);
    return c.arr.slice(n).filter((m) => !m.old && m.kind !== "info" && !mineM(c, m)).length;
  }
  function markRead(c) {
    if (c.type === "pt") c.arr.forEach((m) => { if (m.from !== side && m.fresh) m.fresh = false; });
    else if (!c.look) { const store = c.type === "room" ? ROOM().seen : TK().reads; (store[ME.id] = store[ME.id] || {})[c.raw.id] = c.arr.length; }
    if (c.seenBy && !c.look && ME.kind === "parent") c.arr.forEach((m) => { if (!mineM(c, m)) (m.seen = m.seen || {})[ME.id] = 1; });
  }
  S.talkUnread = () => mine().filter((c) => !isMuted(c)).reduce((a, c) => a + unread(c), 0);

  // ---------- Times and words ----------
  const atTs = (m) => {
    if (m.ts) return m.ts;
    const a = String(m.at || ""), t = a.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const mins = t ? ((+t[1] % 12) + (/pm/i.test(t[3]) ? 12 : 0)) * 60 + +t[2] : 0, d0 = new Date(S.today).setHours(0, 0, 0, 0);
    if (/^Today/.test(a)) return d0 + mins * 6e4;
    if (/^Yesterday/.test(a)) return d0 - 864e5 + mins * 6e4;
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(a.slice(0, 3));
    if (wd >= 0) { const back = (new Date(S.today).getDay() - wd + 7) % 7 || 7; return d0 - back * 864e5 + mins * 6e4; }
    return d0 - 30 * 864e5;
  };
  const lastOf = (c) => c.arr[c.arr.length - 1];
  const tsOf = (c) => { const m = lastOf(c); return m ? atTs(m) : 0; };
  const shortAt = (at) => { const a = String(at || ""); return /^Today, /.test(a) ? a.slice(7) : a.split(",")[0]; };
  const fmtSize = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const extOf = (n) => (n.split(".").pop() || "").slice(0, 4).toUpperCase();
  const fileWord = (fs) => { const im = fs.filter((f) => f.img).length, d = fs.length - im; return [im ? (im === 1 ? "Photo" : im + " photos") : "", d ? (d === 1 ? fs.find((f) => !f.img).name : d + " files") : ""].filter(Boolean).join(", "); };
  const titleOf = (c) => c.kind === "dm" ? c.other.name : c.name;
  const subOf = (c) => {
    if (c.kind === "dm") return c.other.sub;
    if (c.kind === "class") return `${c.fam} families · ${c.staff.length} teachers${c.post === "all" ? " · parents can post" : ""}`;
    if (c.kind === "wingp") return `${c.fam.toLocaleString("en-IN")} families · from the coordinator and the principal`;
    if (c.kind === "case") return c.raw.status === "done" ? "Resolved" : `Raised · ${c.members().map((id) => person(id).short).join(", ")}`;
    const n = c.members().length; return `${n} member${n === 1 ? "" : "s"}${c.post === "admins" ? " · announcements" : ""}`;
  };
  const IC = {
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.3a3 3 0 0 1 0 5.4M17.5 14.3c1.6.7 2.6 2.3 3 4.7"/>',
    meg: '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    staff: '<path d="M3 20.5h18M5 20.5V10l7-5 7 5v10.5"/><path d="M9.5 20.5v-5h5v5"/>',
    clip: '<path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
    send: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    bellx: '<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8"/><path d="M10 20a2 2 0 0 0 4 0M4 4l16 16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    reply: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'
  };
  const svg = (k, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
  const avatar = (c, big) => {
    const sz = big ? " tm-av-l" : "";
    if (c.kind === "dm") { const p = c.other; return `<span class="tm-av${sz}${p.kind === "parent" ? " par" : ""}" style="--h:${hue(p.name)}" aria-hidden="true">${esc(p.ini)}</span>`; }
    const [ic, tone] = c.kind === "class" ? ["users", "royal"] : c.kind === "wingp" ? ["meg", "gold"] : c.kind === "case" ? ["flag", "accent"] : c.sys ? ["staff", "teal"] : ["users", "slate"];
    return `<span class="tm-av tm-gav${sz}" style="--c:var(--${tone})" aria-hidden="true">${svg(ic)}</span>`;
  };
  const pAv = (p) => `<span class="tm-av tm-av-s${p.kind === "parent" ? " par" : ""}" style="--h:${hue(p.name)}" aria-hidden="true">${esc(p.ini)}</span>`;
  const preview = (c) => {
    const m = lastOf(c); if (!m) return c.kind === "dm" ? "No messages yet" : "Nothing posted yet";
    const who = mineM(c, m) ? "You: " : c.kind !== "dm" && m.kind !== "info" ? person(fromOf(c, m)).short + ": " : "";
    const body = m.voice ? "Voice message" : m.text ? m.text : m.files && m.files.length ? fileWord(m.files) : "";
    return who + (m.kind === "notice" ? "Notice · " : m.kind === "task" ? "Task · " : m.kind === "reminder" ? "Reminder · " : "") + body;
  };

  // ---------- Files: kept in this browser for the prototype ----------
  let dbp = null;
  const DB = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open("sjs-files", 1); r.onupgradeneeded = () => r.result.createObjectStore("f"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const putFile = async (id, blob) => { const db = await DB(); return new Promise((res, rej) => { const tx = db.transaction("f", "readwrite"); tx.objectStore("f").put(blob, id); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }); };
  const getFile = async (id) => { try { const db = await DB(); return await new Promise((res) => { const g = db.transaction("f").objectStore("f").get(id); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); }); } catch (e) { return null; } };
  const shrink = async (file, max, qual) => {
    const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", qual));
    return { blob, w: cv.width, h: cv.height, url: cv.toDataURL("image/jpeg", 0.6) };
  };
  async function stage(files) {
    for (const f of [...files]) {
      if (staged.length >= MAXN) { S.toast(`Up to ${MAXN} files at a time`, { done: false }); break; }
      const isImg = /^image\/(jpeg|png|webp|gif|bmp)$/.test(f.type);
      if (!isImg && f.size > MAXB) { S.toast(`${f.name} is over 10 MB`, { done: false }); continue; }
      try {
        if (isImg) {
          const full = await shrink(f, 1600, 0.82), th = await shrink(f, 360, 0.6);
          staged.push({ blob: full.blob, meta: { name: f.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", size: full.blob.size, img: true, w: full.w, h: full.h, thumb: th.url }, was: f.size });
        } else staged.push({ blob: f, meta: { name: f.name, type: f.type || "application/octet-stream", size: f.size } });
      } catch (e) { S.toast(`Couldn't read ${f.name}`, { done: false }); }
    }
    drawStaged();
  }
  async function openFile(f) {
    if (f.url) { if (f.img) return lightbox(f.url, f); return window.open(f.url, "_blank", "noopener"); }
    const b = await getFile(f.id);
    if (!b) { S.toast("This file is kept on the device that sent it (prototype). On the real app it opens anywhere."); return; }
    const u = URL.createObjectURL(b);
    if (f.img) return lightbox(u, f);
    if (f.type === "application/pdf") { window.open(u, "_blank", "noopener"); return; }
    const a = document.createElement("a"); a.href = u; a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4e4);
  }
  let lb = null;
  function lightbox(src, f) {
    if (!lb) { lb = document.createElement("div"); lb.className = "tm-lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); document.body.append(lb);
      lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest("[data-lb-x]")) lb.hidden = true; }); }
    lb.innerHTML = `<figure><img src="${src}" alt="${esc(f.name)}"><figcaption><span translate="no">${esc(f.name)}</span><a class="btn btn-ghost btn-sm" href="${src}" download="${esc(f.name)}">${svg("dl")}Save</a><button type="button" class="btn btn-ghost btn-sm" data-lb-x>Close</button></figcaption></figure>`;
    lb.hidden = false; lb.querySelector("[data-lb-x]").focus();
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lb && !lb.hidden) lb.hidden = true; });

  // ---------- The page ----------
  let open = null, mode = "chat", tab = "chats", filter = "all", query = "", info = false, staged = [], replyTo = null, raising = false, newKind = "dm", picked = new Set();
  root.className = "tm-app" + (isLead ? " tm-lead" : "");
  root.innerHTML = `
    <aside class="tm-side">
      <div class="tm-sh"><label class="tm-find">${svg("search")}<input type="search" id="tm-q" placeholder="Search people and messages" aria-label="Search chats" /></label>
        <button type="button" class="tm-new" id="tm-new" aria-label="New message or group" title="New message or group">${svg("plus")}</button></div>
      ${isLead ? `<div class="seg tm-tabs" role="tablist"><button type="button" data-tm-tab="chats" class="on">For you</button><button type="button" data-tm-tab="look">Look in</button><button type="button" data-tm-tab="pulse">Pulse</button></div>` : ""}
      <div class="tm-chips" id="tm-chips"></div>
      <div class="tm-list" id="tm-list"></div>
    </aside>
    <section class="tm-main" id="tm-main"></section>
    <aside class="tm-info" id="tm-info" hidden></aside>
    <input type="file" id="tm-file" accept="${ACCEPT}" multiple hidden />`;
  const CHIPS = ME.kind === "parent" ? [["all", "All"], ["new", "Unread"], ["dm", "Teachers"], ["groups", "Groups"]]
    : ME.kind === "teacher" ? [["all", "All"], ["new", "Unread"], ["parents", "Parents"], ["staff", "Staff"], ["groups", "Groups"]]
    : isLead ? [["all", "All"], ["new", "Unread"], ["cases", "Cases"], ["groups", "Groups"]] : [["all", "All"], ["new", "Unread"], ["groups", "Groups"]];
  const passes = (c) => {
    if (filter === "new" && !unread(c)) return false;
    if (filter === "dm" && c.kind !== "dm") return false;
    if (filter === "groups" && c.kind === "dm") return false;
    if (filter === "parents" && !(c.kind === "dm" && c.other.kind === "parent")) return false;
    if (filter === "staff" && !(c.kind === "dm" ? c.other.kind !== "parent" : c.type === "room")) return false;
    if (filter === "cases" && c.kind !== "case") return false;
    if (query) { const t = (titleOf(c) + " " + subOf(c) + " " + c.arr.map((m) => m.text || "").join(" ")).toLowerCase(); if (!t.includes(query)) return false; }
    return true;
  };
  const order = (a, b) => (unread(b) > 0) - (unread(a) > 0) || tsOf(b) - tsOf(a);

  function drawList() {
    const list = tab === "look" ? lookIns() : mine();
    q("#tm-chips").innerHTML = tab === "chats" ? CHIPS.map(([k, l]) => { const n = k === "new" ? list.filter((c) => !isMuted(c) && unread(c)).length : 0;
      return `<button type="button" class="tm-chip${k === filter ? " on" : ""}" data-tm-f="${k}">${l}${n ? ` <b>${n}</b>` : ""}</button>`; }).join("") : "";
    q("#tm-chips").hidden = tab !== "chats";
    if (tab === "pulse") { q("#tm-list").innerHTML = pulseSide(); return; }
    const rows = tab === "look" ? list.filter(passes) : list.filter(passes).sort(order);
    const row = (c) => { const n = unread(c), m = lastOf(c), mu = isMuted(c);
      return `<button type="button" class="tm-row${c.id === open && mode === "chat" ? " on" : ""}${n && !mu ? " new" : ""}" data-tm-open="${c.id}">${avatar(c)}
        <span class="tm-rt"><span class="tm-rn"><b>${esc(titleOf(c))}</b><time>${m ? esc(shortAt(m.at)) : ""}</time></span>
        <span class="tm-rl"><span translate="no">${esc(preview(c))}</span>${n ? `<span class="count${mu ? " mu" : ""}">${n}</span>` : mu ? svg("bellx", "tm-mu") : c.look ? svg("eye", "tm-mu") : ""}</span></span></button>`; };
    let html = "";
    if (tab === "look") {
      const byW = Object.fromEntries(myWings.map((w) => [w, []])); rows.forEach((c) => { const w = c.raw.wing || (c.raw.sec ? wingOf(c.raw.sec) : ""); (byW[w] = byW[w] || []).push(c); });
      html = `<p class="tm-hint">${svg("eye")}Read any group in ${ME.lead === "coord" ? "your wing" : "the school"}. Nobody is told, and nothing here counts as new for you.</p>` +
        Object.entries(byW).filter(([, cs]) => cs.length).map(([w, cs]) => `<h3 class="tm-lh">${esc(w)} wing</h3>${cs.map(row).join("")}`).join("");
    } else html = rows.map(row).join("");
    q("#tm-list").innerHTML = html || `<p class="tm-empty">${query ? "Nothing matches that." : filter === "new" ? "You're all caught up." : "No chats here yet."}</p>`;
  }

  // ---------- One chat ----------
  function drawMain(focus) {
    root.dataset.pane = mode === "chat" && !open ? "list" : "main";
    if (mode === "new") return drawNew();
    if (mode === "pulse") return drawPulse();
    if (mode === "announce") return drawAnnounce();
    const c = open && findChat(open);
    if (!c) { open = null; root.dataset.pane = "list"; q("#tm-main").innerHTML = welcome(); q("#tm-info").hidden = true; return; }
    markRead(c); S.save();
    const p = canPost(c);
    q("#tm-main").innerHTML = `
      <header class="tm-head"><button type="button" class="tm-ib tm-back" data-tm-back aria-label="Back to chats">${svg("back")}</button>${avatar(c)}
        <button type="button" class="tm-ht" data-tm-info><b>${esc(titleOf(c))}</b><span>${esc(subOf(c))}</span></button>
        <span class="tm-ha">${c.type === "pt" && c.kind === "dm" && !raising ? `<button type="button" class="btn btn-ghost btn-sm tm-raise" data-tm-raise>Raise</button>` : ""}
        ${!c.look ? `<button type="button" class="tm-ib" data-tm-mute aria-pressed="${isMuted(c)}" aria-label="${isMuted(c) ? "Unmute" : "Mute"}" title="${isMuted(c) ? "Muted: tap to hear it again" : "Mute this chat"}">${svg(isMuted(c) ? "bellx" : "bell")}</button>` : ""}
        <button type="button" class="tm-ib" data-tm-info aria-pressed="${info}" aria-label="About this chat" title="Members, files and settings">${svg("info")}</button></span></header>
      ${banner(c)}
      ${raising ? raiseForm(c) : ""}
      <div class="tm-thread" id="tm-thread" aria-live="polite">${c.raw && c.raw.ctx ? ctxBox(c) : ""}${thread(c)}</div>
      ${p ? composer(c) : `<p class="tm-ro">${roText(c)}</p>`}`;
    const box = q("#tm-thread"); box.scrollTop = box.scrollHeight;
    if (p) { const f = q("#tm-form"); S.bindVoice(f, before(c), (v) => send(c, v)); drawStaged(); if (focus && matchMedia("(min-width: 761px)").matches) q("#tm-in").focus(); }
    drawInfo(c);
  }
  const welcome = () => {
    const n = S.talkUnread();
    return `<div class="tm-hello"><span class="tm-hello-ic">${svg("users")}</span><h2>${n ? `${n} new message${n === 1 ? "" : "s"}` : "All caught up"}</h2>
      <p class="muted">${ME.kind === "parent" ? `Your chats with ${esc(ME.kid.first)}'s teachers, the class group and the wing's notices.` : isLead ? "Messages to you and raised cases. Every other group waits quietly under Look in." : "Parents, colleagues and your class groups, all here."}</p>
      <button type="button" class="btn btn-primary btn-sm" data-tm-newbtn>${svg("plus")}New message</button></div>`;
  };
  function banner(c) {
    if (c.look) return `<p class="tm-ban look">${svg("eye")}You're looking in. Members aren't told, and nothing here counts as new for you.</p>`;
    if (c.type === "pt" && ME.kind === "parent") { const o = S.inHours(c.tname); return `<p class="tm-ban${o ? " on" : ""}">${svg("bell")}${esc(hon(c.tname))} reads messages ${S.hoursText(c.tname)}, Monday to Saturday.${o ? "" : ` What you send now reaches them ${S.nextOpen(c.tname)}.`}</p>`; }
    if (c.type === "pt") return `<p class="tm-ban">${svg("lock")}Between you and ${esc(c.other.name)}. Kept by the school as a record; leadership sees it only if one of you raises it.</p>`;
    if (c.kind === "class" && ME.kind === "parent") return `<p class="tm-ban">${svg("users")}Teachers post here${c.post === "all" ? " and parents can too" : ""}. Phone numbers stay private: only names show.</p>`;
    if (c.kind === "case") return `<p class="tm-ban case">${svg("flag")}${c.raw.status === "done" ? `Resolved by ${esc(person(c.raw.doneBy).name)}.` : `Raised ${esc(c.raw.at)} by ${esc(person(c.raw.by).name)}.`}</p>`;
    return "";
  }
  const roText = (c) => c.look ? "You're reading quietly." : c.kind === "case" ? "This case is resolved. Raise it again from the chat if it comes back." : c.kind === "class" && ME.kind === "parent" ? "Only teachers post here. Tap Noted, or reply privately to a teacher." : "Only the group's admins post here.";
  const ctxBox = (c) => `<div class="tm-ctx"><b>From their chat</b>${c.raw.ctx.map((m) => `<p><span>${esc(person(m.from).short)} · ${esc(m.at)}</span><span translate="no">${esc(m.text)}</span></p>`).join("")}</div>`;
  function thread(c) {
    let prev = null;
    const html = c.arr.map((m, i) => {
      if (m.kind === "info") { prev = null; return `<p class="tm-sys" translate="no">${esc(m.text)}</p>`; }
      const f = fromOf(c, m), me = mineM(c, m), who = person(f), grp = c.kind !== "dm", first = prev !== f; prev = f;
      const files = (m.files || []).map((x, j) => x.img
        ? `<button type="button" class="tm-img" data-tm-file="${i}:${j}"><img src="${esc(x.thumb || x.url)}" alt="${esc(x.name)}" loading="lazy"></button>`
        : `<button type="button" class="tm-doc" data-tm-file="${i}:${j}"><span class="tm-ext">${esc(extOf(x.name))}</span><span class="tm-dn"><b translate="no">${esc(x.name)}</b><small>${fmtSize(x.size)}</small></span>${svg("dl")}</button>`).join("");
      const imgs = (m.files || []).filter((x) => x.img).length;
      const seen = c.seenBy && ME.kind !== "parent" ? (m.seenN || 0) + Object.keys(m.seen || {}).length : 0;
      const noted = (m.notedN || 0) + Object.keys(m.noted || {}).length, iNoted = !!(m.noted || {})[ME.id];
      const tag = m.kind === "notice" ? "Notice" : m.kind === "task" ? "Task" : m.kind === "reminder" ? "Reminder" : "";
      const acts = c.look ? "" : `<span class="tm-acts">${canPost(c) ? `<button type="button" data-tm-reply="${i}" aria-label="Reply" title="Reply">${svg("reply")}</button>` : ""}
        ${m.kind === "notice" && !me ? `<button type="button" data-tm-noted="${i}" class="${iNoted ? "on" : ""}" aria-pressed="${iNoted}">${svg("check")}${iNoted ? "Noted" : "Noted?"}</button>` : ""}
        ${grp && !me && privTo(c, f) ? `<button type="button" data-tm-priv="${f}">Reply privately</button>` : ""}</span>`;
      return `<div class="tm-m${me ? " me" : ""}${first ? " first" : ""}${m.kind === "notice" ? " notice" : ""}">
        ${grp && !me ? (first ? pAv(who) : `<span class="tm-av-gap"></span>`) : ""}
        <div class="tm-b" tabindex="-1">${grp && !me && first ? `<b class="tm-from">${esc(who.name)}<small>${esc(roleIn(c, f))}</small></b>` : ""}
          ${tag ? `<span class="tm-tag">${tag}</span>` : ""}
          ${m.reply ? `<span class="tm-q"><b>${esc(person(m.reply.from).short)}</b><span translate="no">${esc(m.reply.text)}</span></span>` : ""}
          ${files ? `<span class="tm-files${imgs > 1 ? " grid" : ""}">${files}</span>` : ""}
          ${m.voice ? S.msgBody(m) : m.text ? `<span class="tm-tx" translate="no">${esc(m.text)}</span>` : ""}
          <span class="tm-meta">${esc(m.at || "")}${m.after ? " · reaches them in office hours" : ""}${seen ? ` · seen by ${seen} of ${c.fam}` : ""}${noted && (me || ME.kind !== "parent") ? ` · ${noted} noted` : ""}${c.type === "pt" && me && ME.kind !== "parent" && m.fresh === false ? " · read" : ""}</span>
        </div>${acts}</div>`;
    }).join("");
    return html || `<p class="tm-sys">${c.kind === "dm" ? `Say hello to ${esc(c.other.short)}.` : "Nothing posted yet."}</p>`;
  }
  const roleIn = (c, id) => {
    const p = person(id);
    if (p.kind === "parent") return p.sub.split(" · ")[0];
    if (p.kind === "lead") return p.sub.split(" · ")[0];
    const t = S.STAFF[id]; if (!t) return "";
    const k = c.raw && c.raw.sec; if (k && t.classOf === k) return "Class teacher";
    return t.subject || "";
  };
  // Who a "Reply privately" can go to: a parent to their child's teachers or coordinator; staff to anyone.
  const privTo = (c, id) => { if (id === ME.id) return false; const p = person(id); if (ME.kind === "parent") return p.kind !== "parent" && !!dmTarget(id); return true; };
  const before = (c) => ME.kind === "parent" ? () => S.parentCheck({ key: ME.kid.key, hold: true, why: `Messages go out in your name. Confirm it's you, not ${ME.kid.first}.` }) : null;
  const composer = (c) => `<div class="tm-comp">
      ${replyTo !== null && c.arr[replyTo] ? `<div class="tm-rep"><span><b>Replying to ${esc(person(fromOf(c, c.arr[replyTo])).short)}</b><span translate="no">${esc(c.arr[replyTo].text || fileWord(c.arr[replyTo].files || []) || "Voice message")}</span></span><button type="button" class="tm-ib" data-tm-unreply aria-label="Cancel reply">${svg("x")}</button></div>` : ""}
      <div class="tm-staged" id="tm-staged" hidden></div>
      <form class="tm-form" id="tm-form"><button type="button" class="tm-ib tm-att" data-tm-attach aria-label="Attach photos or files" title="Photos, PDFs and documents">${svg("clip")}</button>
        <textarea id="tm-in" rows="1" placeholder="${c.kind === "dm" ? `Message ${esc(c.other.short)}…` : "Write to the group…"}" aria-label="Message"></textarea>
        <button type="submit" class="tm-send" aria-label="Send">${svg("send")}</button></form></div>`;
  function drawStaged() {
    const el = q("#tm-staged"); if (!el) return;
    el.hidden = !staged.length;
    el.innerHTML = staged.map((s, i) => `<span class="tm-st">${s.meta.img ? `<img src="${s.meta.thumb}" alt="">` : `<span class="tm-ext">${esc(extOf(s.meta.name))}</span>`}<span><b translate="no">${esc(s.meta.name)}</b><small>${fmtSize(s.meta.size)}${s.was && s.was > s.meta.size * 1.3 ? ` · made smaller from ${fmtSize(s.was)}` : ""}</small></span><button type="button" data-tm-unstage="${i}" aria-label="Remove">${svg("x")}</button></span>`).join("");
  }

  // ---------- Sending ----------
  async function send(c, extra) {
    const m = Object.assign(now(), extra);
    if (c.type === "pt") { m.from = side; m.fresh = true; if (ME.kind === "parent") { m.check = "PIN"; if (!S.inHours(c.tname)) m.after = true; } }
    else m.from = ME.id;
    S.post(c.arr, m);
    if (c.raw) c.raw.ts = Date.now();
    markRead(c); S.save(); refresh();
    if (m.after) S.toast(`Sent. ${hon(c.tname)} sees it ${S.nextOpen(c.tname)}.`);
  }
  async function submit(c) {
    const box = q("#tm-in"), text = box.value.trim();
    if (!text && !staged.length) return;
    const chk = before(c); if (chk && !(await chk())) return;
    const files = [];
    for (const s of staged) {
      const id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      try { await putFile(id, s.blob); files.push(Object.assign({ id }, s.meta)); } catch (e) { S.toast("This browser couldn't keep the file", { done: false }); return; }
    }
    const extra = {}; if (text) extra.text = text; if (files.length) extra.files = files;
    if (replyTo !== null && c.arr[replyTo]) { const r = c.arr[replyTo]; extra.reply = { from: fromOf(c, r), text: (r.text || fileWord(r.files || []) || "Voice message").slice(0, 140) }; }
    staged = []; replyTo = null;
    await send(c, extra);
    const i = q("#tm-in"); if (i) i.focus();
  }

  // ---------- Starting a chat ----------
  // Who this person may write to one to one, and the chat it opens.
  function dmTarget(id) {
    if (id === ME.id) return null;
    const p = person(id);
    if (ME.kind === "parent") {
      if (p.kind === "parent") return null;
      const k = ME.kid, names = [k.sec.teacher, ...Object.values(S.ttTeachers || {})];
      const n = names.find((x) => tidOf(x) === id); if (n) return ptChat(k.key, n);
      if (id === coordOf(k.sec.wing).id) return talkDm(id);
      return null;
    }
    if (p.kind === "parent") {
      if (ME.kind === "teacher" && !mySecs.includes(p.sec)) return null;
      if (isLead && !myWings.includes(wingOf(p.sec))) return null;
      if (ME.kind === "teacher" && S.PARENTS.some((x) => x.key === id.slice(2))) return ptChat(id.slice(2), ST.name);
      return talkDm(id);
    }
    const th = ROOM().threads, k = pair(ME.id, id);
    return roomChat(th[k] || (th[k] = { id: k, kind: "dm", members: [ME.id, id], ts: Date.now(), msgs: [] }));
  }
  const talkDm = (id) => { const c = TK().chats, k = pair(ME.id, id); return talkChat(c[k] || (c[k] = { id: k, kind: "dm", members: [ME.id, id], ts: Date.now(), msgs: [] })); };
  // Everyone this person may pick, in groups of people.
  function pickable() {
    const staffRow = (ids) => ids.filter((id) => id !== ME.id).map(person);
    if (ME.kind === "parent") {
      const k = ME.kid, t = [k.sec.teacher, ...new Set(Object.values(S.ttTeachers || {}).filter((x) => /^(Mr|Mrs|Ms|Dr)\. /.test(x) && x !== k.sec.teacher))];
      return [{ h: `${ME.kid.first}'s teachers`, ps: t.map((n) => Object.assign({}, person(tidOf(n)), { sub: n === k.sec.teacher ? "Class teacher" : subsOf(n).join(", ") || "Teacher" })) },
        { h: "Wing coordinator", ps: [person(coordOf(k.sec.wing).id)] }];
    }
    const gs = [];
    const col = ME.kind === "teacher" ? S.TEACHERS.filter((t) => t.id !== ME.id && t.sections.some((s) => mySecs.includes(s))).map((t) => t.id) : [];
    gs.push({ h: "Leadership and office", ps: staffRow([PR, VP, ...S.LEADS.filter((l) => l.lead === "coord").map((l) => l.id), OFFICE]) });
    if (col.length) gs.push({ h: "Teach your classes", ps: staffRow(col) });
    gs.push({ h: col.length ? "Other teachers" : "Teachers", ps: staffRow(S.TEACHERS.map((t) => t.id).filter((id) => !col.includes(id))), fold: true });
    const psecs = ME.kind === "teacher" ? mySecs : isLead ? myWings.flatMap(secsOfWing) : allSecs;
    psecs.forEach((k) => gs.push({ h: `Parents · ${S.secName(k)}`, ps: parentsOf(k).map(person), fold: true, sec: k }));
    return gs;
  }
  function drawNew() {
    const gs = pickable(), qv = (q("#tm-nq") || {}).value || "", qq = qv.trim().toLowerCase();
    const can = ME.kind === "parent" ? "Only your child's teachers and the wing coordinator. Parents can't message other parents."
      : "Parents of the classes you can reach, and any member of staff.";
    q("#tm-main").innerHTML = `<header class="tm-head"><button type="button" class="tm-ib tm-back" data-tm-back aria-label="Back">${svg("back")}</button><span class="tm-ht static"><b>${newKind === "dm" ? "New message" : "New group"}</b><span>${esc(can)}</span></span></header>
      <div class="tm-newb">
        <div class="seg tm-seg"><button type="button" data-tm-nk="dm" class="${newKind === "dm" ? "on" : ""}">Message</button><button type="button" data-tm-nk="group" class="${newKind === "group" ? "on" : ""}">Group</button></div>
        ${newKind === "group" ? `<div class="tm-gf"><label class="field"><span>Group name</span><input class="input" id="tm-gname" maxlength="60" placeholder="${ME.kind === "parent" ? "e.g. Science project" : "e.g. IX-A science fair team"}" /></label>
          ${ME.kind !== "parent" ? `<label class="tm-tog"><input type="checkbox" id="tm-gadm" /><span><b>Announcements only</b><small>Only you post; members read, tap Noted and reply privately.</small></span></label>` : ""}
          ${ME.kind === "teacher" ? `<div class="tm-quick">${mySecs.map((k) => `<button type="button" class="tm-chip" data-tm-all="${k}">All parents of ${esc(S.secName(k))}</button><button type="button" class="tm-chip" data-tm-allt="${k}">Teachers of ${esc(S.secName(k))}</button>`).join("")}</div>` : ""}</div>` : ""}
        <label class="tm-find">${svg("search")}<input type="search" id="tm-nq" value="${esc(qv)}" placeholder="Find someone" aria-label="Find someone" /></label>
        <div class="tm-pick">${gs.map((g) => { const ps = g.ps.filter((p) => !qq || (p.name + " " + p.sub).toLowerCase().includes(qq)); if (!ps.length) return "";
          const body = ps.map((p) => newKind === "dm"
            ? `<button type="button" class="tm-pr" data-tm-dm="${p.id}">${pAv(p)}<span><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></span></button>`
            : `<label class="tm-pr"><input type="checkbox" value="${p.id}"${picked.has(p.id) ? " checked" : ""} />${pAv(p)}<span><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></span></label>`).join("");
          return g.fold && !qq ? `<details class="tm-fold"><summary>${esc(g.h)} <small>${ps.length}</small></summary>${body}</details>` : `<h3 class="tm-lh">${esc(g.h)}</h3>${body}`; }).join("") || `<p class="tm-empty">Nobody by that name.</p>`}</div>
        ${newKind === "group" ? `<div class="tm-gfoot"><span id="tm-gn">${picked.size ? `${picked.size} picked and you` : "Pick who's in it"}</span><button type="button" class="btn btn-primary btn-sm" data-tm-make>Make the group</button></div>` : ""}
      </div>`;
    const nq = q("#tm-nq"); if (qv) { nq.focus(); nq.setSelectionRange(qv.length, qv.length); }
  }
  function makeGroup() {
    const name = q("#tm-gname").value.trim(), ids = [...picked];
    if (!name) { q("#tm-gname").focus(); S.toast("Give the group a name", { done: false }); return; }
    if (!ids.length) { S.toast("Pick at least one person", { done: false }); return; }
    const parents = ids.filter((id) => id.startsWith("P:")).length, adm = q("#tm-gadm") && q("#tm-gadm").checked;
    const id = "g" + Date.now().toString(36), rec = { id, kind: "group", name, by: ME.id, members: [ME.id, ...ids], admins: [ME.id], post: adm ? "admins" : "all", ts: Date.now(), msgs: [] };
    S.post(rec.msgs, Object.assign(now(), { from: ME.id, kind: "info", text: `${ME.name} made the group with ${ids.length} ${ids.length === 1 ? "person" : "people"}${parents ? `, ${parents} of them parent${parents === 1 ? "" : "s"}` : ""}.` }));
    let cid;
    if (!parents && ME.kind !== "parent") { rec.id = "g:" + id; ROOM().threads[rec.id] = rec; cid = "r:" + rec.id; } else { TK().chats[id] = rec; cid = "t:" + id; }
    S.save(); picked = new Set(); mode = "chat"; open = cid; S.toast(`Group made · ${name}`); refresh(true);
  }

  // ---------- Raising a chat to the coordinator ----------
  const raiseForm = (c) => `<form class="tm-raisef" id="tm-raisef"><b>Raise this with ${esc(coordOf(wingOf(c.secKey)).name)}, coordinator</b>
      <p class="muted">They join a new case with you both and see the last few messages. Your chat itself stays private.</p>
      <textarea class="input" id="tm-why" rows="2" placeholder="What needs their help?"></textarea>
      <div class="tm-row2"><button type="button" class="btn btn-ghost btn-sm" data-tm-unraise>Cancel</button><button type="submit" class="btn btn-primary btn-sm">Raise it</button></div></form>`;
  function raise(c, why) {
    const co = coordOf(wingOf(c.secKey)), id = "case" + Date.now().toString(36);
    const rec = { id, kind: "case", name: `About ${c.child}, ${S.secName(c.secKey)}`, by: ME.id, sec: c.secKey, members: [c.pid, c.tid, co.id].filter((x) => !x.startsWith("N:")), admins: [co.id, VP, PR],
      status: "open", from: c.id, at: "today", ts: Date.now(), msgs: [], ctx: c.arr.filter((m) => m.kind !== "info").slice(-4).map((m) => ({ from: fromOf(c, m), at: m.at, text: m.voice ? "Voice message" : m.text || fileWord(m.files || []) })) };
    S.post(rec.msgs, Object.assign(now(), { from: ME.id, kind: "info", text: `${ME.name} raised this with ${co.name}.` }));
    S.post(rec.msgs, Object.assign(now(), { from: ME.id, text: why }));
    TK().chats[id] = rec;
    S.post(c.arr, Object.assign(now(), { from: "info", kind: "info", text: `${ME.name} raised this chat with ${co.name}, coordinator.` }));
    S.save(); raising = false; open = "t:" + id; S.toast(`Raised with ${co.name}`); refresh(true);
  }

  // ---------- About this chat ----------
  function drawInfo(c) {
    const el = q("#tm-info"); el.hidden = !info; root.classList.toggle("tm-wide", info);
    if (!info) return;
    const ms = c.members(), staffIds = ms.filter((id) => !id.startsWith("P:")), fam = ms.length - staffIds.length;
    const files = c.arr.flatMap((m, i) => (m.files || []).map((f, j) => ({ f, k: `${i}:${j}` }))).reverse();
    const imgs = files.filter((x) => x.f.img), docs = files.filter((x) => !x.f.img);
    const showP = c.kind === "class" || c.kind === "wingp" ? [] : ms.filter((id) => id.startsWith("P:"));
    const ppl = [...staffIds, ...showP].map((id) => { const p = person(id); return `<li>${pAv(p)}<span><b>${esc(p.name)}${id === ME.id ? " (you)" : ""}</b><small>${esc(roleIn(c, id) || p.sub)}</small></span>${(c.admins || []).includes(id) && c.kind !== "class" ? `<em>Admin</em>` : ""}</li>`; });
    el.innerHTML = `<div class="tm-ih"><button type="button" class="tm-ib" data-tm-info aria-label="Close">${svg("x")}</button></div>
      <div class="tm-icard">${avatar(c, true)}<b>${esc(titleOf(c))}</b><span class="muted">${esc(subOf(c))}</span></div>
      ${manages(c) && c.kind === "class" ? `<label class="tm-tog"><input type="checkbox" data-tm-pp${c.raw.parentsPost ? " checked" : ""} /><span><b>Parents can post</b><small>Off: teachers post, parents read and reply privately. Phone numbers never show.</small></span></label>` : ""}
      ${manages(c) && (c.type === "room" || c.kind === "group") && !c.sys ? `<label class="tm-tog"><input type="checkbox" data-tm-adm${c.post === "admins" ? " checked" : ""} /><span><b>Announcements only</b><small>Only admins post.</small></span></label>` : ""}
      ${c.kind === "case" && manages(c) && c.raw.status !== "done" ? `<div class="tm-row2">${!c.raw.members.includes(VP) ? `<button type="button" class="btn btn-ghost btn-sm" data-tm-up>Bring in the vice principal</button>` : ""}<button type="button" class="btn btn-primary btn-sm" data-tm-done>Mark resolved</button></div>` : ""}
      <h3 class="tm-lh">${c.kind === "dm" ? "In this chat" : `Members · ${ms.length.toLocaleString("en-IN")}`}</h3>
      <ul class="tm-mem">${ppl.slice(0, 14).join("")}${ppl.length > 14 ? `<li class="more">and ${ppl.length - 14} more</li>` : ""}${fam && !showP.length ? `<li class="fam">${pAv({ name: "Families", ini: fam > 99 ? "99+" : String(fam), kind: "parent" })}<span><b>${fam.toLocaleString("en-IN")} families</b><small>Every parent of ${c.kind === "class" ? esc(S.secName(c.raw.sec)) : `the ${esc(c.raw.wing)} wing`}, kept up to date from the roster</small></span></li>` : ""}</ul>
      <h3 class="tm-lh">Photos and files · ${files.length}</h3>
      ${imgs.length ? `<div class="tm-igrid">${imgs.slice(0, 9).map((x) => `<button type="button" class="tm-img" data-tm-file="${x.k}"><img src="${esc(x.f.thumb || x.f.url)}" alt="${esc(x.f.name)}" loading="lazy"></button>`).join("")}</div>` : ""}
      ${docs.slice(0, 6).map((x) => `<button type="button" class="tm-doc" data-tm-file="${x.k}"><span class="tm-ext">${esc(extOf(x.f.name))}</span><span class="tm-dn"><b translate="no">${esc(x.f.name)}</b><small>${fmtSize(x.f.size)}</small></span>${svg("dl")}</button>`).join("")}
      ${files.length ? "" : `<p class="muted tm-small">Photos, PDFs and documents shared here collect in this list.</p>`}
      <div class="tm-rec">${S.recordNote(c.arr, ME.kind !== "parent")}</div>`;
  }

  // ---------- Leadership: Pulse and announcements ----------
  function pulseData() {
    const waiting = [];
    S.PARENTS.filter((p) => myWings.includes(wingOf(p.sec))).forEach((p) => {
      const k = S.kid(p.key), lists = [[k.sec.teacher, S.thread(p.key)], ...Object.keys(S.state.threads).filter((x) => x.startsWith(p.key + "|")).map((x) => [x.slice(p.key.length + 1), S.state.threads[x]])];
      lists.forEach(([tn, arr]) => { const m = arr[arr.length - 1]; if (m && m.from === "parent" && m.fresh) waiting.push({ p, tn, at: m.at, kid: k }); });
    });
    const cases = Object.values(TK().chats).filter((r) => r.kind === "case" && myWings.includes(wingOf(r.sec)));
    const groups = [...myWings.flatMap((w) => [wingRec(w), ...secsOfWing(w).map(classRec)])];
    const posts = groups.reduce((a, r) => a + r.msgs.filter((m) => m.ts && Date.now() - m.ts < 864e5).length, 0);
    return { waiting, open: cases.filter((r) => r.status !== "done"), done: cases.filter((r) => r.status === "done"), posts, groups: groups.length };
  }
  function pulseSide() {
    const d = pulseData();
    return `<div class="tm-pside"><button type="button" class="tm-row${mode === "pulse" ? " on" : ""}" data-tm-mode="pulse"><span class="tm-av tm-gav" style="--c:var(--teal)">${svg("pulse")}</span><span class="tm-rt"><span class="tm-rn"><b>Today in ${ME.lead === "coord" ? "your wing" : "the school"}</b></span><span class="tm-rl"><span>${d.open.length} open case${d.open.length === 1 ? "" : "s"} · ${d.waiting.length} parent${d.waiting.length === 1 ? "" : "s"} waiting</span></span></span></button>
      <button type="button" class="tm-row${mode === "announce" ? " on" : ""}" data-tm-mode="announce"><span class="tm-av tm-gav" style="--c:var(--gold)">${svg("meg")}</span><span class="tm-rt"><span class="tm-rn"><b>Announce</b></span><span class="tm-rl"><span>To staff or parents, a wing or the whole school</span></span></span></button>
      <div class="tm-quiet"><b>${svg("bell")}What reaches your phone</b><ul><li>Messages to you</li><li>Cases raised to you</li><li>One summary at 4 PM on school days</li></ul><p>Class and wing groups never ring. Read them under Look in when you choose.</p></div></div>`;
  }
  function drawPulse() {
    const d = pulseData(), card = (n, l, tone) => `<div class="tm-kpi" style="--c:var(--${tone})"><b>${n}</b><span>${l}</span></div>`;
    q("#tm-main").innerHTML = `<header class="tm-head"><button type="button" class="tm-ib tm-back" data-tm-back aria-label="Back">${svg("back")}</button><span class="tm-ht static"><b>Today in ${ME.lead === "coord" ? `the ${esc(ME.wing)} wing` : "the school"}</b><span>A quiet summary. Nothing here sent you an alert.</span></span></header>
      <div class="tm-pulse">
        <div class="tm-kpis">${card(d.open.length, "Open cases", "accent")}${card(d.waiting.length, "Parents waiting for a reply", "gold")}${card(d.posts, "Posts in groups today", "royal")}${card(d.groups, "Groups you can look in on", "teal")}</div>
        <h3 class="tm-lh">Cases</h3>
        ${d.open.length || d.done.length ? [...d.open, ...d.done.slice(0, 3)].map((r) => `<button type="button" class="tm-prow" data-tm-open="t:${r.id}"><span class="tm-dot${r.status === "done" ? " ok" : ""}"></span><span><b>${esc(r.name)}</b><small translate="no">${esc((r.msgs.filter((m) => m.kind !== "info")[0] || {}).text || "")}</small></span><em>${r.status === "done" ? "Resolved" : "Open"}</em></button>`).join("") : `<p class="muted tm-small">No cases raised. When a parent or teacher raises a chat, it shows here and with the coordinator.</p>`}
        <h3 class="tm-lh">Parents waiting for a reply</h3>
        ${d.waiting.length ? d.waiting.map((w, i) => `<div class="tm-prow"><span class="tm-dot warn"></span><span><b>${esc(w.p.parent)} → ${esc(w.tn)}</b><small>About ${esc(w.kid.name)}, ${esc(S.secName(w.p.sec))} · since ${esc(w.at)}</small></span>${tidOf(w.tn).startsWith("N:") ? "" : `<button type="button" class="btn btn-ghost btn-sm" data-tm-nudge="${i}">Remind the teacher</button>`}</div>`).join("") : `<p class="muted tm-small">Every parent has had a reply.</p>`}
        <p class="muted tm-small">You see who is waiting, not what they wrote: parent–teacher chats stay private unless raised.</p>
      </div>`;
  }
  function drawAnnounce() {
    const aud = [["r:g:all", "All staff"], ...myWings.flatMap((w) => [[`r:g:w-${slug(w)}`, `${w} wing staff`], [`t:wpa:${slug(w)}`, `${w} wing parents`]])];
    q("#tm-main").innerHTML = `<header class="tm-head"><button type="button" class="tm-ib tm-back" data-tm-back aria-label="Back">${svg("back")}</button><span class="tm-ht static"><b>Announce</b><span>Posted as a notice; people tap Noted, and you see how many have.</span></span></header>
      <form class="tm-ann" id="tm-ann">
        <fieldset><legend>Send to</legend><div class="tm-auds">${aud.map(([id, l]) => `<label class="tm-aud"><input type="checkbox" value="${id}" /><span>${esc(l)}</span></label>`).join("")}</div></fieldset>
        <label class="field"><span>Notice</span><textarea class="input" id="tm-atext" rows="5" placeholder="e.g. School closes at 11:30 on Friday for the inter-house finals."></textarea></label>
        <div class="tm-staged" id="tm-staged" hidden></div>
        <div class="tm-row2"><button type="button" class="btn btn-ghost btn-sm" data-tm-attach>${svg("clip")}Add photos or files</button><button type="submit" class="btn btn-primary btn-sm">Send the notice</button></div>
      </form>`;
    staged = staged || []; drawStaged();
  }
  async function announce() {
    const ids = [...root.querySelectorAll(".tm-aud input:checked")].map((x) => x.value), text = q("#tm-atext").value.trim();
    if (!ids.length) { S.toast("Pick who it goes to", { done: false }); return; }
    if (!text) { q("#tm-atext").focus(); return; }
    staffGroups();
    const files = [];
    for (const s of staged) { const id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await putFile(id, s.blob); files.push(Object.assign({ id }, s.meta)); }
    ids.forEach((id) => {
      const rec = id.startsWith("r:") ? ROOM().threads[id.slice(2)] : wingRec(S.WING_NAMES.find((w) => "wpa:" + slug(w) === id.slice(2)));
      if (!rec) return;
      S.post(rec.msgs, Object.assign(now(), { from: ME.id, kind: "notice", text }, files.length ? { files } : {})); rec.ts = Date.now();
    });
    staged = []; S.save(); mode = "pulse"; S.toast(`Notice sent to ${ids.length} group${ids.length === 1 ? "" : "s"}`); refresh();
  }

  // ---------- Drawing it all, and staying in step ----------
  function refresh(focus) { drawList(); drawMain(focus); counts(); }
  function counts() {
    const n = S.talkUnread();
    document.querySelectorAll('[data-count="messages"]').forEach((el) => { el.hidden = !n; el.textContent = n; });
  }
  S.talkCounts = counts;
  S.talkOpen = (id) => { mode = "chat"; open = id; S.go("messages"); refresh(true); };

  // ---------- What people do ----------
  root.addEventListener("click", async (e) => {
    const t = e.target, b = (s) => t.closest(s);
    let x;
    if ((x = b("[data-tm-open]"))) { mode = "chat"; open = x.dataset.tmOpen; info = false; replyTo = null; raising = false; staged = []; refresh(true); return; }
    if ((x = b("[data-tm-tab]"))) { tab = x.dataset.tmTab; root.querySelectorAll("[data-tm-tab]").forEach((y) => y.classList.toggle("on", y === x)); if (tab === "pulse") { mode = "pulse"; drawMain(); } drawList(); return; }
    if ((x = b("[data-tm-mode]"))) { mode = x.dataset.tmMode; staged = []; refresh(); return; }
    if ((x = b("[data-tm-f]"))) { filter = x.dataset.tmF; drawList(); return; }
    if (b("#tm-new") || b("[data-tm-newbtn]")) { mode = "new"; newKind = "dm"; picked = new Set(); refresh(); return; }
    if ((x = b("[data-tm-nk]"))) { newKind = x.dataset.tmNk; drawNew(); return; }
    if ((x = b("[data-tm-dm]"))) { const c = dmTarget(x.dataset.tmDm); if (!c) return; S.save(); mode = "chat"; open = c.id; refresh(true); return; }
    if ((x = b("[data-tm-all]")) || (x = b("[data-tm-allt]"))) { const k = x.dataset.tmAll || x.dataset.tmAllt; (x.dataset.tmAll ? parentsOf(k) : teachersOf(k).map((y) => y.id).filter((id) => id !== ME.id)).forEach((id) => picked.add(id)); if (!q("#tm-gname").value) q("#tm-gname").value = x.textContent.replace(/^All /, ""); const keep = q("#tm-gname").value; drawNew(); q("#tm-gname").value = keep; return; }
    if (b("[data-tm-make]")) { makeGroup(); return; }
    if (b("[data-tm-back]")) { mode = "chat"; open = null; info = false; refresh(); return; }
    if (b("[data-tm-info]")) { info = !info; drawMain(); return; }
    if (b("[data-tm-attach]")) { q("#tm-file").click(); return; }
    if ((x = b("[data-tm-unstage]"))) { staged.splice(+x.dataset.tmUnstage, 1); drawStaged(); return; }
    if ((x = b("[data-tm-file]"))) { const c = findChat(open), [i, j] = x.dataset.tmFile.split(":").map(Number); if (c && c.arr[i]) openFile(c.arr[i].files[j]); return; }
    if ((x = b("[data-tm-reply]"))) { replyTo = +x.dataset.tmReply; drawMain(true); return; }
    if (b("[data-tm-unreply]")) { replyTo = null; drawMain(true); return; }
    if ((x = b("[data-tm-noted]"))) { const c = findChat(open), m = c && c.arr[+x.dataset.tmNoted]; if (!m) return; m.noted = m.noted || {}; if (m.noted[ME.id]) delete m.noted[ME.id]; else m.noted[ME.id] = 1; S.save(); drawMain(); if (m.noted[ME.id]) S.toast("Marked as noted"); return; }
    if ((x = b("[data-tm-priv]"))) { const c = dmTarget(x.dataset.tmPriv); if (!c) return; S.save(); mode = "chat"; open = c.id; info = false; refresh(true); return; }
    if (b("[data-tm-mute]")) { const c = findChat(open), mm = mutedMap(); if (mm[c.id]) delete mm[c.id]; else mm[c.id] = 1; S.save(); refresh(); S.toast(mm[c.id] ? "Muted. New messages won't count or ring." : "You'll hear this chat again"); return; }
    if (b("[data-tm-raise]")) { raising = true; drawMain(); q("#tm-why").focus(); return; }
    if (b("[data-tm-unraise]")) { raising = false; drawMain(); return; }
    if (b("[data-tm-up]")) { const c = findChat(open); [VP].forEach((id) => { if (!c.raw.members.includes(id)) c.raw.members.push(id); }); S.post(c.arr, Object.assign(now(), { from: ME.id, kind: "info", text: `${ME.name} brought in ${person(VP).name}, vice principal.` })); S.save(); refresh(); return; }
    if (b("[data-tm-done]")) { const c = findChat(open); c.raw.status = "done"; c.raw.doneBy = ME.id; S.post(c.arr, Object.assign(now(), { from: ME.id, kind: "info", text: `${ME.name} marked this resolved.` })); S.save(); refresh(); S.toast("Case resolved"); return; }
    if ((x = b("[data-tm-nudge]"))) { const w = pulseData().waiting[+x.dataset.tmNudge]; if (!w) return; const c = dmTarget(tidOf(w.tn)); S.post(c.arr, Object.assign(now(), { from: ME.id, kind: "reminder", text: `${w.p.parent} (parent of ${w.kid.name}, ${S.secName(w.p.sec)}) has been waiting for a reply since ${w.at}.` })); S.save(); x.disabled = true; x.textContent = "Reminded"; S.toast(`Reminder sent to ${w.tn}`); return; }
  });
  root.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.id === "tm-file") { await stage(t.files); t.value = ""; return; }
    if (t.matches(".tm-pick input[type=checkbox]")) { if (t.checked) picked.add(t.value); else picked.delete(t.value); const n = q("#tm-gn"); if (n) n.textContent = picked.size ? `${picked.size} picked and you` : "Pick who's in it"; return; }
    if (t.matches("[data-tm-pp]")) { const c = findChat(open); c.raw.parentsPost = t.checked; S.post(c.arr, Object.assign(now(), { from: ME.id, kind: "info", text: `${ME.name} ${t.checked ? "let parents post here" : "made this teachers-only again"}.` })); S.save(); refresh(); return; }
    if (t.matches("[data-tm-adm]")) { const c = findChat(open); c.raw.post = t.checked ? "admins" : "all"; S.save(); refresh(); return; }
  });
  root.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "tm-q") { query = t.value.trim().toLowerCase(); drawList(); return; }
    if (t.id === "tm-nq") { drawNew(); return; }
    if (t.id === "tm-in") { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; }
  });
  root.addEventListener("keydown", (e) => {
    if (e.target.id === "tm-in" && e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(min-width: 761px)").matches) { e.preventDefault(); q("#tm-form").requestSubmit(); }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.id === "tm-form") { const c = findChat(open); if (c) submit(c); }
    if (e.target.id === "tm-raisef") { const why = q("#tm-why").value.trim(); if (!why) { q("#tm-why").focus(); return; } raise(findChat(open), why); }
    if (e.target.id === "tm-ann") announce();
  });
  // Drop files anywhere on the chat.
  root.addEventListener("dragover", (e) => { if (q("#tm-form") || q("#tm-ann")) { e.preventDefault(); root.classList.add("tm-drop"); } });
  root.addEventListener("dragleave", (e) => { if (e.target === root) root.classList.remove("tm-drop"); });
  root.addEventListener("drop", (e) => { root.classList.remove("tm-drop"); if (!(q("#tm-form") || q("#tm-ann")) || !e.dataTransfer.files.length) return; e.preventDefault(); stage(e.dataTransfer.files); });
  // Paste a screenshot straight in.
  root.addEventListener("paste", (e) => { if (e.target.id !== "tm-in") return; const fs = [...(e.clipboardData || {}).files || []]; if (fs.length) { e.preventDefault(); stage(fs); } });

  // Another tab wrote: draw again, keeping a half-typed message.
  document.addEventListener("sjs:sync", () => {
    const i = q("#tm-in"), v = i ? i.value : "";
    drawList(); if (mode === "chat" && !document.activeElement.closest("#tm-why, #tm-nq, #tm-gname")) { drawMain(); const j = q("#tm-in"); if (j && v) j.value = v; } counts();
  });
  document.addEventListener("sjs:view", (e) => { if (e.detail === "messages") { drawList(); if (mode === "chat" && open) drawMain(); counts(); } });

  // Start: on a wide screen the newest chat is open; on a phone, the list.
  if (ME.kind !== "parent") staffGroups();
  const first = mine().sort(order)[0];
  if (first && matchMedia("(min-width: 761px)").matches) open = first.id;
  S.save(); refresh();
  if (S.refreshHome) S.refreshHome();
})();
