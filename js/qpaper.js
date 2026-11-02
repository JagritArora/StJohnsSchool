/* Question paper, in Teachers' Corner: the teacher uploads their Word file (or pastes the questions)
   and downloads it as a Word file in one of the school's three house layouts — Exam (normal),
   Exam with a marks column (box) and Assignment (chapter-wise).
   How it stays word for word:
   1. js/paperdoc.js reads the file into lines, keeping bold, italics, sub/superscripts, list
      numbers, pictures, tables and equations.
   2. Each line gets one role (question, option, part, section…). Haiku does this when the school's
      formatter is connected (functions/src/index.ts); otherwise the rules below do it. Neither
      rewrites a line.
   3. The paper is put together here from the teacher's own text; only old numbers and labels such
      as "Q1." "(a)" "Assertion:" are taken off, because the layout numbers everything itself.
   4. The checks look for anything out of place (an option with no question, a Reason with no
      Assertion…). Haiku gets up to two more tries with the problems listed; what remains is shown.
   5. js/paperdoc.js writes the .docx exactly as the school's build_paper.py does. */
(() => {
  const S = window.SJS, T = S && S.staff, PD = window.PaperDoc;
  if (!T || T.role !== "teacher" || !PD || !document.getElementById("qp-file")) return;
  // The school's formatter (Firebase function "paper", functions/src/index.ts). Empty: the rules sort the lines, no AI.
  const API = "https://asia-south1-st-johns-school-e71e9.cloudfunctions.net/paper";
  const $ = (q) => document.querySelector(q), esc = S.esc;

  // ======================================================================= patterns
  const SEC = /^(?:section|part)\s*[-–—:]?\s*(?:[A-Z]|[IVX]+)\b/i;
  const SECWORD = /^(?:(?:[A-Z]|[IVX]+)\s*[.):–-]\s*)?(?:(?:very\s+)?short\s+answer|long\s+answer|multiple[- ]choice|objective(?:\s+type)?|assertion\s*(?:&|and|–|-|\/)\s*reason|case[- ]?(?:based|study)|competency[- ]based|source[- ]based|fill in the blanks?|true(?:\s+or\s+|\s*\/\s*)false|match the following|mcqs?)\b[^?]{0,50}$/i;
  const VERBS = /\b(?:has|have|contains?|consists?|comprises?|carry|carries)\b/i;
  const CHAP = /^(?:ch(?:apter)?\s*[-–.:]?\s*\d+|unit\s*[-–.:]?\s*\d+|lesson\s*[-–.:]?\s*\d+)\b/i;
  const INSTH = /^(?:general\s+)?instructions?\s*[:.-]?\s*$/i;
  const TIME = /^(?:time(?:\s*allowed)?\s*[:\-–]|max(?:imum)?\.?\s*marks?\s*[:\-–]|m\.\s*m\.|mm\s*[:\-–])|\btime\b.{0,40}\b(?:marks?|m\.?\s*m\.?)\b/i;
  const QNUM = /^(?:Q(?:ues(?:tion)?)?\s*\.?\s*(?:No\.?\s*)?(\d+)\s*[.:)\-–]?\s*|\((\d+)\)\s*|(\d+)\s*[.)](?!\d)\s*)/i;
  const LBL = /^(?:\(\s*([a-zA-Z]|[ivxIVX]{1,4}|\d{1,2})\s*\)|([a-zA-Z]|[ivxIVX]{1,4}|\d{1,2})\s*[.)](?!\d))\s*/;
  const LETTER = /^(?:\(\s*([a-hA-H])\s*\)|([a-hA-H])\s*[.)](?!\d))\s*/;
  const ROMAN = /^(?:\(\s*((?:i{1,3}|iv|vi{0,3}|ix|x))\s*\)|((?:i{1,3}|iv|vi{0,3}|ix|x))\s*[.)])\s*/i;
  const ASSERT = /^(?:assertion\s*(?:\(\s*A\s*\))?\s*[:\-–.]|A\s*:)\s*/i;
  const REASON = /^(?:reason\s*(?:\(\s*R\s*\))?\s*[:\-–.]|R\s*:)\s*/i;
  const REASON_IN = /\breason\s*(?:\(\s*R\s*\))?\s*[:\-–]\s*/i;
  const ARINTRO = /two statements|labell?ed\s+assertion|assertion\s*\(A\)\s*and|choose the correct (?:option|answer) from the (?:codes|options) given/i;
  const CASE = /^(?:(?:case(?:\s*study)?(?:\s*based\s*question)?)\s*(?:\d+|[IVX]+)?\s*[:\-–.]|read the (?:following )?(?:passage|case|text|extract|paragraph)|study the (?:following )?(?:passage|case))/i;
  const CASESTRIP = /^case(?:\s*study)?(?:\s*based\s*question)?\s*(?:\d+|[IVX]+)?\s*[:\-–.]\s*/i;
  const SKIP = /^(?:page\s*\d+(?:\s*(?:of|\/)\s*\d+)?|\d{1,3}|p\.?\s*t\.?\s*o\.?|turn over|[-_*=~.•]{3,}|\**\s*(?:all the best|best of luck|good luck)\s*!*\s*\**|\**\s*end of (?:the )?(?:question )?paper\s*\**|\*{2,}.*\*{2,})$/i;
  const SECNOTE = /^(?:choose|attempt|all|answer|read|this section|each|note|select|fill|write|questions?\b)/i;
  const OR = /^\(?\s*or\s*\)?$/i;
  const OPTLABEL = /^options?\s*[:\-]?\s*$/i;
  // Marks printed at the end of a line: [2] (2 marks) (2) "2 marks". A space before "(2)", so f(2) keeps its 2.
  const MARKT = /(?:\s*\[\s*(\d+(?:\.5)?)\s*(?:marks?|m)?\s*\]|\s*\(\s*(\d+(?:\.5)?)\s*(?:marks?|m)\s*\)|\s\(\s*(\d+(?:\.5)?)\s*\)|\s(\d+(?:\.5)?)\s*marks?)\s*$/i;
  const ROLES_ALL = ["head", "time", "insthead", "inst", "chapter", "section", "note", "q", "qopts", "opt", "opts", "part", "sub", "stmt", "optlabel", "text", "cont", "or", "arintro", "archoice", "assert", "reason", "ar", "case", "caseq", "caseopt", "img", "tbl", "skip"];

  // ======================================================================= lines
  const plainOf = (L) => PD.plainOf(L.segs || []).replace(/\s+/g, " ").trim();
  const isBold = (L) => { const s = (L.segs || []).filter((x) => x.t.trim()); return s.length > 0 && s.every((x) => x.f & 1); };
  const fromPaste = (src) => ({ lines: src.split(/\r?\n/).filter((l) => l.trim()).map((l) => ({ segs: [{ t: l, f: 0 }], n: "", c: false })), raw: [], media: {} });
  // What Haiku sees: one short line each; never the whole passage, and never pictures.
  function forAI(lines) {
    return lines.map((L, i) => {
      const flags = [L.c && "C", isBold(L) && "B", L.mk && "M" + L.mk].filter(Boolean).join(" ");
      let t = L.img ? "[picture]" : L.tbl ? `[table: ${L.tbl.header.join(" | ").replace(/[*^~_\\]/g, "").slice(0, 120)}]` : plainOf(L).replace(/￼/g, "[eq]");
      if (t.length > 240) t = t.slice(0, 240) + "…";
      return `${i} | ${[L.qn, L.n].filter(Boolean).join(" ")} | ${flags} | ${t}`;
    }).join("\n");
  }
  // Letters (a)(b)(c)… typed on one line, in order from a: where each one starts.
  function inlineOptions(p, min = 3) {
    const re = /(?:^|\s)(?:\(\s*([a-dA-D])\s*\)|([a-dA-D])[.)])\s*(?=\S)/g, at = [];
    let m, want = 0;
    while ((m = re.exec(p))) {
      const l = (m[1] || m[2]).toLowerCase().charCodeAt(0) - 97;
      if (l === want) { at.push(m.index + m[0].match(/^\s*/)[0].length); want++; }
    }
    return at.length >= min ? at : null;
  }
  // What kind of number starts a line: a question number, a letter or a roman numeral.
  const kindOf = (L, p) => {
    if (L.qn) return "num";
    const t = L.n ? L.n + " " : p;
    if (L.n && /^•/.test(L.n)) return "";
    if (QNUM.test(t) && !/^\(?[a-z]\)/i.test(t)) return "num";
    if (ROMAN.test(t)) return "rom";
    if (LETTER.test(t)) return "let";
    return "";
  };

  // ======================================================================= the rules (no AI)
  function rules(lines, layout) {
    const out = [];
    let phase = "top", sawInsth = false, lastInst = 0, inQ = false, inAR = false, inCase = false, caseStyle = null, prev = "";
    lines.forEach((L, i) => {
      const p = plainOf(L), k = kindOf(L, p);
      const set = (r) => { out[i] = { r, m: "" }; prev = r; };
      if (L.img) return set("img");
      if (L.tbl) return set("tbl");
      if (!p) return set("skip");
      if (SKIP.test(p) && !L.n) return set("skip");
      if (layout === "assignment" && CHAP.test(p) && p.length < 90) { phase = "body"; inQ = inAR = inCase = false; return set("chapter"); }
      const upper = /^(?:[A-Z]|[IVX]+)[.)]?$/.test(L.n || "");
      if ((!L.n || upper) && !L.qn && !VERBS.test(p) && ((SEC.test(p) && p.length < 90) || (SECWORD.test(p) && p.length < 70 && (isBold(L) || L.c || upper || /questions?|mcqs?/i.test(p))) || (upper && isBold(L) && p.length < 70 && !/\?$/.test(p)))) {
        phase = "body"; inQ = inAR = inCase = false;
        return set("section");
      }
      if (phase === "top") {
        if (TIME.test(p)) return set("time");
        if (INSTH.test(p) || /^general instructions/i.test(p)) { sawInsth = true; return set("insthead"); }
        if (sawInsth) {
          const m = p.match(QNUM) || [], n = +(m[1] || m[2] || m[3] || (L.n.match(/\d+/) || [])[0] || 0);
          if (!(n === 1 && lastInst >= 1)) { if (n) lastInst = n; return set("inst"); }
          phase = "body";
        } else if (k !== "num" && !CASE.test(p) && !ASSERT.test(p) && !ARINTRO.test(p)) return set("head");
        else phase = "body";
      }
      if (OR.test(p)) return set("or");
      if (OPTLABEL.test(p)) return set("optlabel");
      if (ARINTRO.test(p) && p.length > 50) { inAR = true; inQ = inCase = false; return set("arintro"); }
      const body = L.n ? p : p.replace(QNUM, "");
      if (ASSERT.test(body)) { inAR = inQ = true; inCase = false; return set(REASON_IN.test(p) ? "ar" : "assert"); }
      if (REASON.test(p) && (prev === "assert" || prev === "cont")) return set("reason");
      if (inAR && prev !== "assert" && (k === "let" || /^(?:both|a is|r is)\b/i.test(body)) && p.length < 120) return set("archoice");
      if (CASE.test(body) && (CASESTRIP.test(body) || p.length > 60)) { inCase = inQ = true; caseStyle = null; return set("case"); }
      if (inCase && (k === "num" || k === "let" || k === "rom")) {
        const shape = k + ((L.n || p).match(/^\s*\(?[0-9a-zA-Z]+\s*([.)])/) || [, ""])[1] + (/^\s*\(/.test(L.n || p) ? "(" : "");
        if (!caseStyle) caseStyle = shape;
        if (shape === caseStyle) return set("caseq");
        if (prev === "caseq" || prev === "caseopt") return set("caseopt");
        if (k === "num") inCase = false;
      }
      if (k === "num") {
        inQ = true; inAR = inCase = false;
        const opts = inlineOptions(body);
        return set(opts && opts[0] > 0 ? "qopts" : "q");
      }
      if (k === "let") return set(!L.n && inlineOptions(p) ? "opts" : "part"); // options or parts: decided below, once the group is known
      if (k === "rom") return set(prev === "part" || prev === "sub" || prev === "note" || prev === "caseq" ? "sub" : "stmt");
      // An un-numbered line: the rest of the line above, a note, a line of its own in the question, or a question with no number.
      const before = lines[i - 1] ? plainOf(lines[i - 1]) : "";
      if (/^[a-z(]/.test(p) && !/[.?:!]$/.test(before) && ["q", "part", "opt", "text", "cont", "case", "inst", "assert", "reason", "note", "sub"].includes(prev)) return set("cont");
      if (prev === "section" || (prev === "note" && !inQ)) return set(SECNOTE.test(p) && !/\?$/.test(p) ? "note" : (inQ = true, "q"));
      if (!inQ) { inQ = true; return set("q"); }
      return set(prev === "part" || prev === "sub" || prev === "note" ? (p.length < 90 && !/[?]$/.test(p) ? "note" : "text") : "text");
    });
    // (a) (b) lines: short choices under a question are options; anything else is a part.
    for (let i = 0; i < out.length;) {
      if (!out[i] || out[i].r !== "part") { i++; continue; }
      let j = i; while (j < out.length && out[j] && ["part", "sub", "cont", "note"].includes(out[j].r)) j++;
      const grp = []; for (let x = i; x < j; x++) if (out[x].r === "part") grp.push(x);
      let q = i - 1; while (q >= 0 && out[q] && !["q", "qopts", "section", "optlabel", "stmt", "or"].includes(out[q].r)) q--;
      const stemTxt = q >= 0 ? plainOf(lines[q]) : "";
      let sec = q; while (sec >= 0 && out[sec].r !== "section") sec--;
      const mcq = sec >= 0 && /multiple|mcq|objective|choose/i.test(plainOf(lines[sec]));
      const txt = grp.map((x) => plainOf(lines[x]).replace(LBL, ""));
      const plainChoice = txt.every((t) => !/\?$/.test(t) && !MARKT.test(" " + t) && !inlineOptions(t, 2));
      const short = txt.every((t) => t.length <= 75);
      const fromStmt = q >= 0 && ["optlabel", "stmt"].includes(out[q].r);
      const asks = /answer the following|explain|describe|give reasons|differentiate|define/i.test(stemTxt);
      if (fromStmt || (plainChoice && !asks && ((grp.length >= 3 && grp.length <= 5) || (mcq && short)))) for (const x of grp) out[x].r = "opt";
      i = j;
    }
    // (i) (ii) straight under a question are statements only when "Options:" or choices follow; otherwise they are its parts.
    for (let i = 0; i < out.length;) {
      if (!out[i] || out[i].r !== "stmt") { i++; continue; }
      let j = i; while (j < out.length && out[j] && ["stmt", "cont"].includes(out[j].r)) j++;
      if (!(out[j] && ["optlabel", "opt", "opts"].includes(out[j].r))) for (let x = i; x < j; x++) if (out[x].r === "stmt") out[x].r = "part";
      i = j;
    }
    return out;
  }

  // Marks for the box layout from the instructions: "Section B has 5 questions of 2 marks each".
  function sectionMarks(lines, labels) {
    const per = {};
    lines.forEach((L, i) => {
      if (!labels[i] || !["inst", "section", "note", "head"].includes(labels[i].r)) return;
      const p = plainOf(L);
      for (const m of p.matchAll(/section\s*[-–]?\s*([A-Z])\b(?:(?!section).)*?(\d+(?:\.5)?)\s*marks?\s*each/gi)) per[m[1].toUpperCase()] = m[2];
      if (labels[i].r === "section") { const each = p.match(/(\d+(?:\.5)?)\s*marks?\s*each/i), l = p.match(/(?:section|part)\s*[-–—:]?\s*([A-Z])\b/i); if (each && l) per[l[1].toUpperCase()] = each[1]; }
    });
    return per;
  }

  // ======================================================================= putting the paper together
  function assemble(read, labels, layout) {
    const { lines, media } = read;
    const box = layout === "box", assign = layout === "assignment";
    const paper = { layout, header: [], time: "", marks: "", instructions: [], notes: [] };
    if (assign) paper.chapters = []; else paper.sections = [];
    const problems = [], warnings = [], skipped = [];
    let ch = null, sec = null, it = null, blk = null, lastPart = null, caseQ = null, arIntro = null, target = null, pending = [];
    const segsOf = (L) => PD.trim(L.segs || []);
    const cut = (s, n) => PD.trim(PD.slice(s, n));
    const strip = (L, re) => { const s = segsOf(L), m = PD.plainOf(s).match(re); return m ? cut(s, m[0].length) : s; };
    const unlabel = (L) => (L.n ? segsOf(L) : strip(L, LBL));
    const mk = (segs) => PD.markup(segs);
    const lit = (segs) => PD.plainOf(segs).replace(/￼/g, "").replace(/\s+/g, " ").trim();
    const say = (i, msg) => problems.push({ i, msg });
    const secMarks = box ? sectionMarks(lines, labels) : {};
    let printed = []; // box: marks taken off the end of the current question's lines
    const takeMarks = (segs) => {
      if (!box) return segs;
      const m = PD.plainOf(segs).match(MARKT);
      if (!m) return segs;
      printed.push(+(m[1] || m[2] || m[3] || m[4]));
      return PD.trim(PD.slice(segs, 0, m.index));
    };
    const setTarget = (get, set, top) => { target = { get, set, top }; };
    const lastOf = (arr) => setTarget(() => arr[arr.length - 1], (v) => { arr[arr.length - 1] = v; }, arr === paper.header || arr === paper.instructions || arr === paper.notes);
    const onto = (o, key) => setTarget(() => o[key], (v) => { o[key] = v; });
    const isCase = () => it && (it.type === "case" || it._case);

    function newSec(title) {
      endItem();
      if (assign && !ch) { ch = { title: "", sections: [] }; paper.chapters.push(ch); }
      sec = { title, items: [] };
      const l = title.match(/(?:section|part)\s*[-–—:]?\s*([A-Z])\b/i);
      if (l && secMarks[l[1].toUpperCase()]) sec._marks = secMarks[l[1].toUpperCase()];
      (assign ? ch.sections : paper.sections).push(sec);
      it = blk = lastPart = caseQ = arIntro = null;
    }
    function endItem() {
      if (it && box && printed.length && it._m == null) it._m = printed.reduce((a, b) => a + b, 0);
      printed = [];
    }
    function newItem(o, i) {
      if (!sec) newSec("");
      endItem();
      sec.items.push(o); it = o; blk = lastPart = caseQ = null;
      Object.defineProperty(o, "_line", { value: i, enumerable: false, writable: true });
      if (pending.length) { (o.blocks ||= []).push(...pending); pending = []; }
    }
    // Something that belongs under a question. With no question to go under, it stays as a line of its own.
    function block(o, i, what) {
      if (it && (it.type === "ar" || it.type === "ar_intro" || it.type === "case")) {
        if (target && lines[i]) { target.set(target.get() + " " + mk(segsOf(lines[i]))); say(i, `${what} sits inside ${it.type === "case" ? "a case passage" : "an Assertion–Reason question"}`); }
        return false;
      }
      if (!it) {
        if (o.image || o.table) { pending.push(o); return false; }
        say(i, `${what} comes before any question`);
        if (!sec) newSec("");
        (sec.notes ||= []).push(mk(segsOf(lines[i]))); lastOf(sec.notes);
        return false;
      }
      (it.blocks ||= []).push(o); blk = o;
      return true;
    }

    const place = (L, i) => {
      const lab = labels[i] || { r: "text", m: "" };
      let r = L.img ? "img" : L.tbl ? "tbl" : lab.r;
      const p = plainOf(L);
      // A question line that only says "Q1.", with its text on the next line.
      if (it && it._needStem && (r === "text" || r === "cont")) { it.q = mk(takeMarks(segsOf(L))); delete it._needStem; onto(it, "q"); return; }
      if (it && it.type === "ar_intro" && (r === "opt" || r === "part")) r = "archoice";
      if (isCase() && (r === "opt" || r === "opts") && caseQ) r = "caseopt";
      if (isCase() && r === "part") r = "caseq";
      switch (r) {
        case "skip": skipped.push({ i, t: p }); return;
        case "head":
          if (sec && sec.items.length) { (sec.notes ||= []).push(mk(segsOf(L))); lastOf(sec.notes); }
          else { paper.header.push(mk(segsOf(L))); lastOf(paper.header); }
          return;
        case "time": {
          const t = p.match(/time(?:\s*allowed)?\s*[:\-–]?\s*(.+?)(?=\s{2,}|\t|\s*[|,;]?\s*\b(?:M\.?\s*M\.?|MM|max(?:imum)?\.?\s*marks?|total\s*marks|marks)\b|$)/i);
          const m = p.match(/(?:M\.?\s*M\.?|\bMM|max(?:imum)?\.?\s*marks?|total\s*marks|marks)\s*[:\-–.]?\s*(\d+(?:\.5)?)/i);
          if (t && !paper.time) paper.time = t[1].replace(/[\s:–-]+$/, "").trim();
          if (m && !paper.marks) paper.marks = m[1];
          const rest = PD.plainOf(L.segs || []).replace(/time(?:\s*allowed)?\s*[:\-–]?\s*.+?(?=\s{2,}|\t|$)/i, "").replace(/(?:M\.?\s*M\.?|\bMM|max(?:imum)?\.?\s*marks?|total\s*marks|marks)\s*[:\-–.]?\s*\d+(?:\.5)?/i, "").replace(/\s+/g, " ").trim();
          if (rest.replace(/[\s|,;:.-]/g, "").length > 2) paper.header.push(PD.markup([{ t: rest, f: 0 }]));
          if (!t && !m) paper.header.push(mk(segsOf(L)));
          if (assign) paper.notes.push(mk(segsOf(L)));
          return;
        }
        case "insthead": if (assign) { paper.notes.push(mk(segsOf(L))); lastOf(paper.notes); } return;
        case "inst": {
          const s = strip(L, /^(?:\d+\s*[.)]|\(\d+\)|[ivx]+[.)]|\([ivx]+\)|[•\-–*])\s*/i);
          const list = assign ? paper.notes : paper.instructions;
          list.push(mk(s)); lastOf(list);
          return;
        }
        case "chapter":
          endItem();
          if (assign) { ch = { title: lit(segsOf(L)), sections: [] }; paper.chapters.push(ch); sec = it = null; }
          else if (!sec) { paper.header.push(mk(segsOf(L))); lastOf(paper.header); }
          else newSec(lit(segsOf(L)));
          return;
        case "section": {
          let s = segsOf(L);
          if (assign) { const t = PD.plainOf(s), m = t.match(/^(?:(?:section|part)\s*[-–—]?\s*)?(?:[A-Z]|[IVX]+)\s*[.):\-–]\s*(?=\S)/); if (m) s = cut(s, m[0].length); }
          newSec(lit(s));
          return;
        }
        case "note":
          if (lastPart) { (lastPart.notes ||= []).push(mk(segsOf(L))); lastOf(lastPart.notes); }
          else if (!it) { if (!sec) newSec(""); (sec.notes ||= []).push(mk(segsOf(L))); lastOf(sec.notes); }
          else { const o = { text: mk(segsOf(L)) }; if (block(o, i, "A line")) { onto(o, "text"); blk = null; } }
          return;
        case "case":
          if (assign) {
            const o = { type: "case", passage: mk(strip(L, CASESTRIP)), questions: [] };
            newItem(o, i); onto(o, "passage");
            return;
          }
        // falls through: in an exam layout a case passage is a question with parts
        case "q": case "qopts": {
          let s = L.n ? segsOf(L) : strip(L, QNUM);
          if (r === "qopts") {
            const at = inlineOptions(PD.plainOf(s));
            if (at && at[0] > 0) {
              const opts = at.map((a, k) => { const x = PD.trim(PD.slice(s, a, at[k + 1] ?? Infinity)); return mk(cut(x, (PD.plainOf(x).match(LBL) || [""])[0].length)); });
              const o = { q: mk(takeMarks(PD.trim(PD.slice(s, 0, at[0])))), blocks: [{ options: opts }] };
              newItem(o, i); blk = o.blocks[0]; lastOf(blk.options);
              if (lab.m) o._lm = +lab.m;
              return;
            }
            say(i, "the options on this line couldn't be told apart");
          }
          s = takeMarks(s);
          const pl = PD.plainOf(s), lm = pl.match(LETTER);
          let o;
          if (!pl.trim()) { o = { q: "", blocks: [] }; newItem(o, i); o._needStem = true; }
          else if ((lm && !/^[A-H]\.\s/.test(pl)) || (L.qn && /^\(?[a-h][.)]/i.test(L.n || ""))) {
            // Starts straight with (a), no lead-in sentence: the script puts part a. on the number line.
            const part = { text: mk(L.qn && !lm ? s : cut(s, lm[0].length)) };
            o = { blocks: [{ parts: [part] }] };
            newItem(o, i); blk = o.blocks[0]; lastPart = part; onto(part, "text");
          } else { o = { q: mk(s), blocks: [] }; newItem(o, i); onto(o, "q"); }
          if (r === "case") Object.defineProperty(o, "_case", { value: true, enumerable: false });
          if (lab.m) o._lm = +lab.m;
          if (L.mk) o._lm = +L.mk;
          return;
        }
        case "caseopt":
          if (!caseQ) { say(i, "a case option comes before its question"); if (target) target.set(target.get() + " " + mk(segsOf(L))); return; }
          if (assign) { caseQ.options.push(mk(unlabel(L))); lastOf(caseQ.options); }
          else { (caseQ.sub ||= []).push(mk(unlabel(L))); lastOf(caseQ.sub); }
          return;
        case "caseq": {
          const text = mk(takeMarks(unlabel(L)));
          if (!isCase()) { say(i, "a case question comes before any case passage"); r = "part"; }
          else if (assign) { caseQ = { q: text, options: [] }; it.questions.push(caseQ); onto(caseQ, "q"); return; }
          else {
            caseQ = { text };
            if (!(blk && blk.parts)) { blk = { parts: [] }; (it.blocks ||= []).push(blk); }
            blk.parts.push(caseQ); lastPart = caseQ; onto(caseQ, "text");
            return;
          }
        }
        // falls through
        case "part": {
          const s = segsOf(L), at = !L.n ? inlineOptions(PD.plainOf(s), 2) : null;
          const texts = at && at[0] === 0 ? at.map((a, k) => { const x = PD.trim(PD.slice(s, a, at[k + 1] ?? Infinity)); return mk(takeMarks(cut(x, (PD.plainOf(x).match(LBL) || [""])[0].length))); }) : [mk(takeMarks(unlabel(L)))];
          if (!(blk && blk.parts) && !block({ parts: [] }, i, "A part")) return;
          for (const text of texts) { const part = { text }; blk.parts.push(part); lastPart = part; }
          onto(lastPart, "text");
          return;
        }
        case "opt": case "opts": {
          const s = segsOf(L), list = [], at = r === "opts" ? inlineOptions(PD.plainOf(s)) : null;
          if (at) at.forEach((a, k) => { const x = PD.trim(PD.slice(s, a, at[k + 1] ?? Infinity)); list.push(mk(cut(x, (PD.plainOf(x).match(LBL) || [""])[0].length))); });
          else { if (r === "opts") say(i, "the options on this line couldn't be told apart"); list.push(mk(unlabel(L))); }
          if (!(blk && blk.options) && !block({ options: [] }, i, "An option")) return;
          lastPart = null;
          blk.options.push(...list); lastOf(blk.options);
          return;
        }
        case "sub": {
          const text = mk(takeMarks(unlabel(L)));
          // (i) (ii) straight under a question with no (a) parts are its parts, lettered a. b. by the layout.
          if (lastPart && lastPart._roman && blk && blk.parts) { const part = { text }; Object.defineProperty(part, "_roman", { value: true }); blk.parts.push(part); lastPart = part; onto(part, "text"); return; }
          if (lastPart) { (lastPart.sub ||= []).push(text); lastOf(lastPart.sub); return; }
          if (blk && blk.options && blk.options.length && !box) {
            const k = blk.options.length - 1, o = typeof blk.options[k] === "string" ? { text: blk.options[k] } : blk.options[k];
            blk.options[k] = o; (o.sub ||= []).push(text); lastOf(o.sub); return;
          }
          const part = { text };
          Object.defineProperty(part, "_roman", { value: true });
          if (block({ parts: [part] }, i, "A sub-part")) { lastPart = part; onto(part, "text"); }
          return;
        }
        case "stmt":
          if (!(blk && blk.statements) && !block({ statements: [] }, i, "A statement")) return;
          blk.statements.push(mk(unlabel(L))); lastOf(blk.statements);
          return;
        case "optlabel": if (block({ label: lit(segsOf(L)).replace(/\s*[:\-]+$/, "") }, i, "The Options line")) blk = lastPart = null; return;
        case "or": if (block({ or: true }, i, "OR")) blk = lastPart = null; return;
        case "text": { const o = { text: mk(takeMarks(segsOf(L))) }; if (block(o, i, "A line")) { onto(o, "text"); blk = lastPart = null; } return; }
        case "cont":
          if (!target) { say(i, "a carried-on line has nothing above it"); paper.header.push(mk(segsOf(L))); return; }
          target.set(target.get() + " " + mk(takeMarks(segsOf(L))));
          return;
        case "arintro": { const o = { type: "ar_intro", text: mk(segsOf(L)), choices: [] }; newItem(o, i); arIntro = o; onto(o, "text"); return; }
        case "archoice": {
          const c = mk(unlabel(L));
          if (it && it.type === "ar_intro") { it.choices.push(c); lastOf(it.choices); return; }
          if (arIntro && arIntro.choices.includes(c)) { skipped.push({ i, t: p, dup: true }); return; } // the same choices again under the next question
          if (!arIntro && it && it.type === "ar") { const o = { type: "ar_intro", text: "", choices: [c] }; sec.items.splice(sec.items.indexOf(it), 0, o); arIntro = o; return; }
          if (arIntro) { arIntro.choices.push(c); return; }
          say(i, "an Assertion–Reason choice has no instruction or question with it");
          if (!sec) newSec(""); (sec.notes ||= []).push(mk(segsOf(L)));
          return;
        }
        case "assert": case "ar": {
          let s = L.n ? segsOf(L) : strip(L, QNUM);
          const am = PD.plainOf(s).match(ASSERT);
          if (am) s = cut(s, am[0].length);
          const o = { type: "ar", assertion: "", reason: "" };
          if (r === "ar") {
            const rm = PD.plainOf(s).match(REASON_IN);
            if (rm) { o.reason = mk(takeMarks(cut(s, rm.index + rm[0].length))); s = PD.trim(PD.slice(s, 0, rm.index)); }
            else say(i, "this line has no Reason in it");
          }
          o.assertion = mk(takeMarks(s));
          newItem(o, i); onto(o, o.reason ? "reason" : "assertion");
          if (lab.m) o._lm = +lab.m;
          return;
        }
        case "reason":
          if (!it || it.type !== "ar" || it.reason) { say(i, "a Reason comes without an Assertion just before it"); if (target) target.set(target.get() + " " + mk(segsOf(L))); return; }
          it.reason = mk(takeMarks(strip(L, REASON))); onto(it, "reason");
          return;
        case "img": {
          const m = media[L.img] || {};
          block({ image: L.img, width: Math.round(Math.min(box ? 5.8 : 6.0, Math.max(0.8, m.widthIn || 3)) * 100) / 100 }, i, "A picture");
          return;
        }
        case "tbl": block({ table: L.tbl }, i, "A table"); return;
        default: say(i, "this line has no role"); if (target) target.set(target.get() + " " + mk(segsOf(L)));
      }
    };
    // Lines that went into the top of the paper (header, time, instructions), for the last check.
    const top = new Set(), size = () => paper.header.length + paper.instructions.length + paper.notes.length;
    lines.forEach((L, i) => {
      const n = size(), onTop = target && target.top;
      place(L, i);
      if (size() > n || (onTop && target && target.top && (labels[i] || {}).r === "cont") || ["insthead", "time"].includes((labels[i] || {}).r)) top.add(i);
    });
    endItem();
    if (pending.length) { if (it && it.blocks) it.blocks.push(...pending); else warnings.push("A picture or table at the very end has no question to go with, so it was left out."); }

    // ---- tidy, number, and check
    const items = [];
    const allSecs = assign ? paper.chapters.flatMap((c) => c.sections) : paper.sections;
    allSecs.forEach((s) => {
      s.items = s.items.filter((x) => !(x.type === "ar_intro" && !x.text && !x.choices.length));
      let n = 0;
      s.items.forEach((x) => { if (x.type !== "ar_intro") items.push({ x, sec: s, n: ++n }); });
    });
    let qn = 0;
    for (const e of items) {
      const x = e.x, name = assign ? `${e.sec.title ? `“${e.sec.title}”` : "A section"} Q${e.n}` : `Q${++qn}`;
      e.name = name;
      if (x._needStem) { say(x._line, `${name} has a number but no question`); delete x._needStem; }
      if (x.type === "ar") { if (!x.reason) say(x._line, `${name} has an Assertion but no Reason`); }
      else if (x.type === "case") { if (!x.questions.length) say(x._line, `${name} is a case passage with no questions under it`); }
      else {
        const b0 = (x.blocks || [])[0];
        if (!x.q && !(b0 && ((b0.parts && b0.parts.length) || (b0.options && b0.options.length)))) {
          if (b0 && b0.text) { x.q = b0.text; x.blocks.shift(); } else { say(x._line, `${name} has no question text`); x.q = x.q || "…"; }
        }
        for (const b of (x.blocks || []).filter((b2) => b2.options)) if (b.options.length === 1) warnings.push(`${name} has only one option.`);
        if (!x.blocks || !x.blocks.length) delete x.blocks;
      }
      if (box) {
        const m = x._m != null ? x._m : x._lm != null ? x._lm : e.sec._marks != null ? +e.sec._marks : null;
        if (x._m != null && x._lm != null && x._m !== x._lm) warnings.push(`${name}: the marks printed beside it (${x._m}) and the instructions (${x._lm}) differ; the layout shows ${x._m}.`);
        if (m != null && !isNaN(m)) x.marks = `${m} mark${m === 1 ? "" : "s"}`;
        else warnings.push(`${name} has no marks. Write them in the file as [2], or add them in Word after downloading.`);
        e.marks = m;
      }
      delete x._m; delete x._lm;
    }
    allSecs.forEach((s) => delete s._marks);
    if (assign && paper.chapters.length && !paper.chapters.some((c) => c.title)) warnings.push("No chapter title was found, so the assignment starts straight with its sections.");
    if (!items.length) problems.push({ i: -1, msg: "no questions were found" });
    let total = 0;
    if (box) {
      total = items.reduce((a, e) => a + (e.marks || 0), 0);
      const ors = (JSON.stringify(paper.sections).match(/"or":true/g) || []).length;
      if (paper.marks && total && +paper.marks !== total) warnings.push(`The marks column adds up to ${total}; the paper says ${paper.marks}.${ors ? " OR choices can explain a difference." : ""}`);
    }
    return { paper, problems, warnings, skipped, top, count: items.length, sections: allSecs.length, total };
  }

  // ======================================================================= what the paper says about itself
  // "The paper has 9 questions", "Section B has 3 questions of 2 marks each": held against what was built.
  // MCQs: a question with 3 or 5 options when the rest have 4 has usually lost or gained a line.
  const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
  const numOf = (w) => (/^\d+$/.test(w) ? +w : NUMW[w.toLowerCase()]);
  const SECCLAIM = /\bsection(?!s)\s*[-–]?\s*([A-Z])\b((?:(?!\bsection\b).)*)/gi;
  function claims(r, layout) {
    const out = [];
    if (layout === "assignment") return out;
    const P = r.paper, secs = P.sections;
    const qsIn = (s) => s.items.filter((x) => x.type !== "ar_intro");
    const said = {}; let total = null, nsec = null;
    for (const line of P.instructions.map(plainMk).concat(secs.flatMap((s) => [s.title].concat((s.notes || []).map(plainMk))))) {
      let per = false;
      for (const m of line.matchAll(SECCLAIM)) {
        if (m[1] !== m[1].toUpperCase()) continue;
        const c = m[2].match(/\b(\d+|[a-z]+)\s+(?:questions|mcqs?|qs)\b/i), rg = m[2].match(/\b(\d+)\s*(?:to|-|–)\s*(\d+)\b/);
        const n = c ? numOf(c[1]) : rg ? +rg[2] - +rg[1] + 1 : null;
        if (n) { said[m[1]] = n; per = true; }
      }
      const ns = line.match(/\b(\d+|[a-z]+)\s+sections\b/i);
      if (ns && numOf(ns[1])) nsec = numOf(ns[1]);
      const t = !per && /\b(?:paper|consists|contains|comprises|has|have|there are)\b/i.test(line) && !/choice|internal|attempt|any\b/i.test(line) && line.match(/\b(\d+|[a-z]+)\s+questions\b/i);
      if (t && numOf(t[1])) total = numOf(t[1]);
    }
    const letterOf = (s) => ((s.title || "").match(/(?:section|part)\s*[-–—:]?\s*([A-Z])\b/i) || [])[1];
    const bad = [], fine = [];
    for (const [l, n] of Object.entries(said)) {
      const s = secs.find((x) => (letterOf(x) || "").toUpperCase() === l);
      if (!s) { bad.push({ text: `The instructions mention Section ${l}, but no Section ${l} heading was found.`, ai: `the instructions mention Section ${l} but no line is labelled as its section heading` }); continue; }
      const got = qsIn(s).length;
      if (got === n) fine.push(`${l} ${n}`);
      else bad.push({ text: `Section ${l} has ${got} question${got === 1 ? "" : "s"}; the instructions say ${n}.`, ai: `the instructions say Section ${l} has ${n} questions, but ${got} were built under "${s.title}"; check which lines start a new question there` });
    }
    if (total != null) {
      if (total === r.count) fine.push(`${total} in all`);
      else bad.push({ text: `The paper has ${r.count} question${r.count === 1 ? "" : "s"}; the instructions say ${total}.`, ai: `the instructions say the paper has ${total} questions, but ${r.count} were built; check which lines start a new question` });
    }
    if (nsec != null && nsec !== secs.filter((s) => s.title).length) bad.push({ text: `The paper has ${secs.filter((s) => s.title).length} section headings; the instructions say ${nsec}.`, ai: `the instructions say there are ${nsec} sections, but ${secs.filter((s) => s.title).length} lines are labelled section` });
    if (fine.length && !bad.length) out.push({ ok: true, text: `Question count matches the instructions (${fine.join(" · ")})` });
    out.push(...bad.map((b) => ({ ok: false, ...b })));
    // MCQs: 3 or 5 options where the rest have 4 (two choices, as in true/false or pairs, are left alone).
    let qn = 0; const opts = [];
    for (const s of secs) for (const x of qsIn(s)) { qn++; for (const b of x.blocks || []) if (b.options && b.options.length > 1) opts.push({ qn, n: b.options.length, i: x._line }); }
    const four = opts.filter((o) => o.n === 4).length;
    if (opts.length >= 3 && four >= opts.length / 2) {
      const odd = opts.filter((o) => o.n === 3 || o.n === 5);
      if (!odd.length) out.push({ ok: true, text: `Every multiple-choice question has 4 options` });
      for (const o of odd) out.push({ ok: false, text: `Q${o.qn} has ${o.n} options; the others have 4.`, ai: `line ${o.i}: Q${o.qn} has ${o.n} options while the other multiple-choice questions have 4; an option may be labelled as another role, or a line of the next question was put under it` });
    }
    return out;
  }

  const layoutIs = (l, x) => l === x;
  // ======================================================================= sorting: Haiku, with the rules to fall back on
  async function sort(read, layout, status) {
    const ruled = rules(read.lines, layout);
    const api = S.PAPER_API || API;
    if (!api) return { labels: ruled, by: "rules" };
    const lines = forAI(read.lines);
    let labels = null, prev = "", problems = [], why = "", best = null, tries = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      status(attempt ? `Checking and fixing (try ${attempt + 1} of 3)…` : "Sorting the lines with AI…");
      let res, data;
      // A dropped connection or a server hiccup gets one more go before the rules take over.
      for (let go = 0; go < 2; go++) {
        try {
          res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout, lines, prev: prev || undefined, problems: problems.length ? problems : undefined }) });
          data = await res.json().catch(() => ({}));
          if (res.status < 500) break;
        } catch { res = null; }
        if (!go) await new Promise((r) => setTimeout(r, 1500));
      }
      if (!res) { why = "The AI formatter isn't reachable right now."; break; }
      if (!res.ok || !Array.isArray(data.labels)) { why = data.error || "The AI formatter isn't reachable right now."; break; }
      const got = [];
      for (const l of data.labels) if (Number.isInteger(l.i) && ROLES_ALL.includes(l.r)) got[l.i] = { r: l.r, m: /^\d+(\.5)?$/.test(l.m || "") ? l.m : "" };
      labels = read.lines.map((L, i) => (L.img ? { r: "img", m: "" } : L.tbl ? { r: "tbl", m: "" } : got[i] || ruled[i]));
      const missing = read.lines.map((_, i) => i).filter((i) => !got[i]);
      // What the page can see for itself: a typed question number starts a question, and a line with its own label (i) (a) is never plain text.
      // A line whose question number follows the last question's (Q3, then "4.") starts the next question.
      let lastQ = 0;
      const qnOf = (L, p) => { const t = L.qn || (/^\d+[.)]?$/.test(L.n || "") ? L.n : "") || ((p.match(/^Q\s*\.?\s*(\d+)/i) || [])[1] || ""); return +(t.match(/\d+/) || [0])[0]; };
      const seen = read.lines.map((L, i) => {
        const p = plainOf(L), r = labels[i].r, qn = qnOf(L, p);
        if (["q", "qopts", "assert", "ar", "case"].includes(r)) { if (qn) lastQ = qn; else lastQ++; return ""; }
        if (["section", "chapter"].includes(r) && layoutIs(layout, "assignment")) lastQ = 0;
        if (qn && qn === lastQ + 1 && ["part", "sub", "opt", "stmt", "text", "cont", "note", "caseq"].includes(r)) { lastQ = qn; return `line ${i} has question number ${qn}, the next after the question above, but is labelled ${r}; it starts a new question (q), even when its text begins with (a)`; }
        if (["text", "cont", "note", "head"].includes(r) && /^Q\s*\.?\s*\d+/i.test(p)) return `line ${i} starts with a question number but is labelled ${r}; it starts a new question`;
        if (["text", "cont", "note"].includes(r) && (L.n || LBL.test(p)) && !/^\d/.test(L.n || "")) return `line ${i} starts with its own label (${(L.n || p.match(LBL)[0]).trim()}) but is labelled ${r}; use opt, part, sub, stmt, archoice, caseq or caseopt`;
        if (r === "skip" && !SKIP.test(p) && p.length > 30) return `line ${i} is labelled skip, but it is not a page number or end line; give it its real role`;
        return "";
      }).filter(Boolean);
      const out = assemble(read, labels, layout);
      const was = problems.join("\n");
      tries = attempt + 1;
      problems = out.problems.map((p) => (p.i >= 0 ? `line ${p.i}: ${p.msg}` : p.msg)).concat(missing.length ? [`no label for line${missing.length > 1 ? "s" : ""} ${missing.slice(0, 20).join(", ")}`] : []).concat(seen)
        .concat(claims(out, layout).filter((c) => !c.ok).map((c) => c.ai));
      // Keep the try with the fewest problems; stop when one comes back clean or no better than the last.
      if (!best || problems.length < best.n) best = { labels, n: problems.length };
      if (!problems.length || problems.join("\n") === was) break;
      prev = labels.map((l, i) => `${i}:${l.r}${l.m ? "/" + l.m : ""}`).join(" ");
    }
    return best ? { labels: best.labels, by: "ai", tries } : { labels: ruled, by: "rules", why };
  }

  // ======================================================================= the last check: the finished Word file, read back
  // Every word of the teacher's file must be in it, in the same order. Only labels the layout writes for
  // itself may differ: old numbers, (a) (i), "Assertion:", marks moved to the marks column, page numbers.
  const LABELISH = /^(?:q\d*|no|\d{1,3}|[a-hr]|[ivx]{1,4}|assertion|reason|case|study|based|question|questions|mark|marks|m|mm|max|maximum|options?|or|section|part|general|instructions?|time|allowed|hrs?|hours?)$/;
  const tokens = (t) => t.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  // The shortest list of words to drop and add to turn a into b (Myers); null when they differ by more than max.
  function wordDiff(a, b, max) {
    const n = a.length, m = b.length, off = max + 1, trace = [];
    let v = new Int32Array(2 * max + 3), end = -1;
    for (let d = 0; d <= max && end < 0; d++) {
      trace.push(v.slice());
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1, y = x - k;
        while (x < n && y < m && a[x] === b[y]) { x++; y++; }
        v[off + k] = x;
        if (x >= n && y >= m) { end = d; break; }
      }
    }
    if (end < 0) return null;
    const del = [], ins = [];
    let x = n, y = m;
    for (let d = trace.length - 1; d >= 0; d--) {
      const w = trace[d], k = x - y, pk = k === -d || (k !== d && w[off + k - 1] < w[off + k + 1]) ? k + 1 : k - 1, px = w[off + pk], py = px - pk;
      while (x > px && y > py) { x--; y--; }
      if (d > 0) { if (x === px) ins.push(py); else del.push(px); }
      x = px; y = py;
    }
    return { del: del.reverse(), ins: ins.reverse() };
  }
  const objects = (lines) => lines.reduce((t, L) => t + (L.segs || []).filter((s) => s.raw != null).length + (L.tbl ? (JSON.stringify(L.tbl).match(/\\u0005/g) || []).length : 0), 0);
  const tableText = (tbl) => tbl.header.concat(...tbl.rows).map(plainMk).join(" ");
  async function verify(read, P, labels, r, layout) {
    const blob = await PD.build(P, { media: read.media, raw: read.raw });
    const back = await PD.read(await blob.arrayBuffer());
    const checks = [], box = layout === "box";
    // The teacher's words: the top of the paper as it stands in the boxes, then every line that isn't left out.
    const gone = new Set(r.skipped.map((x) => x.i));
    const src = [];
    const add = (t, i) => { const w = tokens(t); w.forEach((x, k) => src.push({ w: x, i, k, last: w.length - 1 - k })); };
    const top = layout === "assignment" ? P.header.concat(P.notes) : P.header.concat([P.time, P.marks], P.instructions);
    top.forEach((t) => add(plainMk(t || ""), -1));
    read.lines.forEach((L, i) => {
      if (gone.has(i) || r.top.has(i)) return;
      if (L.tbl) add(tableText(L.tbl), i); else if (!L.img) add(plainOf(L), i);
    });
    const outW = back.lines.flatMap((L) => (L.tbl ? tokens(tableText(L.tbl)) : L.img ? [] : tokens(plainOf(L))));
    const d = wordDiff(src.map((x) => x.w), outW, 1500);
    if (!d) checks.push({ ok: false, text: "The Word file is too different from your file to compare word by word. Please read it through before using it." });
    else {
      // A word the layout takes off for itself: a label at the start of a line, marks at the end (marks column), (a) (i) letters.
      const benign = (x) => LABELISH.test(x.w) && (x.k <= 3 || /^(?:[a-h]|[ivx]{1,4})$/.test(x.w) || (box && x.last <= 2) || x.i < 0);
      const lost = {};
      for (const k of d.del) { const x = src[k]; if (!benign(x)) (lost[x.i] ||= []).push(x.w); }
      const added = d.ins.map((k) => outW[k]).filter((w) => !LABELISH.test(w));
      const lostAt = Object.keys(lost);
      if (!lostAt.length && !added.length) checks.push({ ok: true, text: `Every word of your file is in the Word file, in the same order (${src.length.toLocaleString("en-IN")} words)` });
      for (const i of lostAt) checks.push({ ok: false, text: i < 0 ? `At the top, these words are missing: “${lost[i].join(" ")}”.` : `Line ${+i + 1}, “${plainOf(read.lines[i]).slice(0, 60)}”: missing “${lost[i].slice(0, 12).join(" ")}${lost[i].length > 12 ? "…" : ""}”.` });
      if (added.length) checks.push({ ok: false, text: `The Word file has words that aren't in your file, or has them twice: “${added.slice(0, 12).join(" ")}${added.length > 12 ? "…" : ""}”.` });
    }
    // Pictures and equations: as many out as went in.
    const usedLines = read.lines.filter((L, i) => !gone.has(i));
    const pin = usedLines.filter((L) => L.img).length, pout = back.lines.filter((L) => L.img).length;
    const ein = objects(usedLines), eout = objects(back.lines);
    if (pin || pout) checks.push(pin === pout ? { ok: true, text: `All ${pin} picture${pin === 1 ? "" : "s"} carried over` } : { ok: false, text: `Your file has ${pin} picture${pin === 1 ? "" : "s"}; the Word file has ${pout}.` });
    if (ein || eout) checks.push(ein === eout ? { ok: true, text: `All ${ein} equation${ein === 1 ? "" : "s"} carried over` } : { ok: false, text: `Your file has ${ein} equation${ein === 1 ? "" : "s"}; the Word file has ${eout}.` });
    return { blob, checks };
  }

  // ======================================================================= the page
  const LAYOUTS = { normal: "Exam paper", box: "Exam with marks column", assignment: "Assignment" };
  let read = null, sorted = null, result = null, fileName = "", checked = null;
  const layoutNow = () => (document.querySelector("[name=qp-layout]:checked") || {}).value || "normal";
  const status = (html) => { $("#qp-sum").innerHTML = html; };
  // The header and instruction boxes show plain text; a line keeps its bold and italics unless the teacher edits it.
  const plainMk = (m) => m.replace(/\u0005\d+\u0006/g, "▢").replace(/\\([*^~_])/g, "\u0007$1").replace(/\*\*|__|\*|\^|~/g, "").replace(/\u0007(.)/g, "$1");

  async function load(src, name) {
    fileName = name; read = sorted = result = checked = null;
    $("#qp-go").disabled = true; $("#qp-details").hidden = true; $("#qp-outline").innerHTML = "";
    status(`<span class="qp-spin" aria-hidden="true"></span> Reading ${esc(name)}…`);
    try { read = typeof src === "string" ? fromPaste(src) : await PD.read(src); }
    catch (e) { status(`<span class="qp-warn">${esc(e.message || "This file couldn't be read.")}</span>`); return; }
    if (!read.lines.length) { status(`<span class="qp-warn">There's no text in this file.</span>`); return; }
    sorted = await sort(read, layoutNow(), (t) => status(`<span class="qp-spin" aria-hidden="true"></span> ${esc(t)}`));
    render(true);
  }
  function render(fresh) {
    if (!read || !sorted) return;
    const layout = layoutNow();
    result = assemble(read, sorted.labels, layout);
    const P = result.paper;
    if (fresh) {
      $("#qp-head").value = P.header.map(plainMk).join("\n");
      $("#qp-time").value = P.time; $("#qp-max").value = P.marks;
      $("#qp-ins").value = P.instructions.map(plainMk).join("\n");
    }
    $("#qp-details").hidden = false;
    document.querySelectorAll(".qp-exam").forEach((el) => (el.hidden = layout === "assignment"));
    const pics = Object.keys(read.media).length, eqs = read.raw.length, chs = layout === "assignment" ? P.chapters.filter((c) => c.title).length : 0;
    const bits = [`<b>${result.count} question${result.count === 1 ? "" : "s"}</b>`, chs ? `${chs} chapter${chs === 1 ? "" : "s"}` : "", `${result.sections} section${result.sections === 1 ? "" : "s"}`,
      layout === "box" && result.total ? `${result.total} marks` : "", pics ? `${pics} picture${pics === 1 ? "" : "s"}` : "", eqs ? `${eqs} equation${eqs === 1 ? "" : "s"}` : ""].filter(Boolean);
    status(bits.join(" · ") + `<span class="qp-by">${sorted.by === "ai" ? "Sorted by AI, built from your own words" : "Sorted by the formatter's rules, from your own words"}${sorted.why ? ` · ${esc(sorted.why)}` : ""}</span>`);
    $("#qp-go").disabled = !result.count;
    outline();
    if (result.count) check().catch(() => {});
  }
  // The paper as it will be downloaded: the boxes as the teacher left them.
  function paperNow() {
    const P = JSON.parse(JSON.stringify(result.paper)), layout = layoutNow();
    const keep = (el, orig) => { const v = el.value.split("\n").map((l) => l.trim()).filter(Boolean); return v.join("\n") === orig.map(plainMk).join("\n") ? orig : v.map((t) => PD.markup([{ t, f: 0 }])); };
    P.header = keep($("#qp-head"), result.paper.header);
    if (layout !== "assignment") { P.time = $("#qp-time").value.trim(); P.marks = $("#qp-max").value.trim(); P.instructions = keep($("#qp-ins"), result.paper.instructions); }
    return P;
  }
  // Build the Word file, read it back and check it; the download is that same file.
  function check() {
    const layout = layoutNow(), P = paperNow(), key = layout + JSON.stringify(P);
    if (checked && checked.key === key) return checked.done;
    const r = result, mine = { key, checks: claims(r, layout), pending: true };
    mine.done = verify(read, P, sorted.labels, r, layout).then((v) => {
      mine.blob = v.blob; mine.checks = mine.checks.concat(v.checks); mine.pending = false;
      if (checked === mine) outline();
      return mine;
    }, (e) => { mine.pending = false; mine.checks.push({ ok: false, text: `The Word file couldn't be checked (${e.message || e}).` }); if (checked === mine) outline(); throw e; });
    checked = mine; outline();
    return mine.done;
  }
  function outline() {
    const r = result, layout = layoutNow();
    const secs = layout === "assignment" ? r.paper.chapters.flatMap((c) => c.sections.map((s) => ({ s, ch: c.title }))) : r.paper.sections.map((s) => ({ s }));
    let n = 0, chap = null;
    const rows = secs.map(({ s, ch }) => {
      const qs = s.items.filter((x) => x.type !== "ar_intro").length, a = layout === "assignment" ? 1 : n + 1;
      if (layout !== "assignment") n += qs;
      const head = ch !== undefined && ch !== chap ? `<li class="qp-ch">${esc(ch || "Untitled chapter")}</li>` : "";
      chap = ch;
      const sum = layout === "box" ? s.items.reduce((t, x) => t + (parseFloat(x.marks) || 0), 0) : 0;
      return head + `<li><b>${esc(s.title || "Questions")}</b><span>${qs ? `Q${a}${qs > 1 ? "–" + (layout === "assignment" ? qs : n) : ""}` : "No questions"}${sum ? ` · ${sum} marks` : ""}</span></li>`;
    }).join("");
    const left = r.skipped.filter((x) => !x.dup);
    const warn = r.warnings.map(esc).concat(r.problems.map((p) => (p.i >= 0 ? `Line ${p.i + 1}, “${esc(plainOf(read.lines[p.i]).slice(0, 60))}”: ${esc(p.msg)}.` : esc(p.msg[0].toUpperCase() + p.msg.slice(1)) + ".")));
    const c = checked, list = c ? c.checks.map((x) => `<li class="${x.ok ? "ok" : "no"}">${esc(x.text)}</li>`).join("") + (c.pending ? `<li class="wait"><span class="qp-spin" aria-hidden="true"></span> Reading the Word file back to check it…</li>` : "") : "";
    $("#qp-outline").innerHTML = `<h3>In this ${layout === "assignment" ? "assignment" : "paper"}</h3><ul>${rows || "<li>Nothing yet</li>"}</ul>` +
      (list ? `<h3>Checked</h3><ul class="qp-checks">${list}</ul>` : "") +
      (warn.length ? `<h3>Have a look</h3><ul class="qp-warns">${warn.map((w) => `<li>${w}</li>`).join("")}</ul>` : `<p class="qp-ok">Every line has its place.</p>`) +
      (left.length ? `<h3>Left out</h3><p class="qp-note">Page numbers and end lines the layout doesn't need:</p><ul class="qp-left">${left.map((x) => `<li>${esc(x.t.slice(0, 90))}</li>`).join("")}</ul>` : "");
  }
  function download() {
    if (!result || !result.count) return;
    const layout = layoutNow();
    $("#qp-go").disabled = true;
    check().then(({ blob, checks }) => {
      const off = checks.filter((x) => !x.ok).length;
      const base = (fileName || "Question paper").replace(/\.docx$/i, "").replace(/[\\/:*?"<>|]+/g, " ").trim();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${base} (${LAYOUTS[layout]}).docx`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      S.toast(off ? `Downloaded “${a.download}”. ${off} check${off === 1 ? "" : "s"} need${off === 1 ? "s" : ""} a look.` : `Downloaded “${a.download}”`);
    }).catch((e) => S.toast(e.message || "Couldn't make the Word file", { done: false })).finally(() => { $("#qp-go").disabled = false; });
  }

  // ---- wiring
  const file = $("#qp-file"), drop = $("#qp-drop");
  const picked = (name) => { $("#qp-fname").textContent = name; drop.classList.add("has"); };
  const take = (f) => {
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) { status(`<span class="qp-warn">Choose a Word file ending in .docx. An older .doc file can be saved as .docx from Word (File › Save As).</span>`); return; }
    picked(f.name);
    f.arrayBuffer().then((b) => load(b, f.name));
  };
  file.addEventListener("change", () => { take(file.files[0]); file.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => take(e.dataTransfer.files[0]));
  document.querySelectorAll("[name=qp-layout]").forEach((r) => r.addEventListener("change", () => render(false)));
  $("#qp-paste-go").addEventListener("click", () => { const v = $("#qp-src").value; if (!v.trim()) { $("#qp-src").focus(); return; } picked("Pasted questions"); load(v, "Question paper"); });
  $("#qp-go").addEventListener("click", download);
  $("#qp-sample").addEventListener("click", () => { $("#qp-paste").open = true; $("#qp-src").value = SAMPLE; picked("Sample paper"); load(SAMPLE, "Sample paper"); });
  const SAMPLE = `ST. JOHN'S SCHOOL, SECTOR 7A, FARIDABAD
Pre Board 1 Examination (2026-27)
Subject: Biology    Class: XII
Time: 3 hours        M.M. 18
General Instructions:
1. The question paper has 3 sections and 9 questions. All questions are compulsory.
2. Section A has 4 questions of 1 mark each.
3. Section B has 3 questions of 2 marks each and Section C has 2 questions of 4 marks each.
SECTION – A
Q1. Restriction enzymes are also called:
(a) Molecular glue (b) Molecular pumps (c) Molecular markers (d) Molecular scissors
Q2. A snapdragon plant bearing pink flowers is crossed with a snapdragon plant bearing white flowers. Their F1 progeny will show:
a) 50% red : 50% white
b) 25% red : 50% white : 25% pink
c) 50% pink : 50% white
d) 50% red : 50% pink
For the following questions, two statements are given - one labelled Assertion (A) and the other labelled Reason (R). Read them carefully and choose the correct option from the following:
(a) Both A and R are True, and R is correct explanation of A
(b) Both A and R are True, but R is not the correct explanation of A
(c) A is True, R is False
(d) A is False, R is True
Q3. Assertion: NPP is always less than GPP.
Reason: A portion of GPP is used by plants for respiration.
Q4. Assertion (A): Plasmids are autonomously replicating circular extra-chromosomal DNA.
Reason (R): Plasmids are found in all eukaryotic cells.
SECTION – B
Q5. Explain brood parasitism using a suitable example.
Q6. (a) What is a genetic code?
(b) The genetic code is said to be 'Universal'. Why?
Q7. Fill in the blank: The enzyme that joins DNA fragments is __________.
SECTION – C
Q8. Answer the following:
(a) Expand the term ELISA. What is the principle of this test?
(b) Name two more techniques used in molecular diagnosis.
OR
(a) Arrange the following hormones in sequence of their secretion in a pregnant woman:
hCG, LH, FSH, Relaxin.
(b) Mention the source and the functions of the above mentioned hormones.
Q9. Explain with the help of diagrams, how lac operon operates in E. coli:
(a) In presence of an inducer
(b) In absence of an inducer
*** End of the paper ***`;

  // For the page tests: the steps on their own.
  S.qp = { rules, assemble, fromPaste, forAI, sort, inlineOptions, claims, verify, wordDiff, SAMPLE };
})();
