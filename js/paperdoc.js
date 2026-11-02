/* Word files for the question paper formatter (js/qpaper.js).
   - PaperDoc.build(paper, extras): the school's three house layouts — "normal", "box" and
     "assignment" — as a .docx. A line-for-line port of the school's build_paper.py: same fonts,
     sizes, indents, spacing, numbering, borders and page; for the same paper.json it writes the
     same XML. Added for papers that come from Word: equations and other inline objects copied as
     they were (\u0005n\u0006 in text), pictures in any format, and un-numbered note lines.
   - PaperDoc.read(arrayBuffer): the teacher's .docx as lines of text with their bold, italics,
     underline, superscripts and subscripts (as **, *, __, ^, ~ markup), list numbers, pictures,
     tables and equations, in order.
   No AI here: build and read are plain code. */
(function (root) {
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const int = Math.trunc;

  // ============================================================================ inline markup
  // **bold**  *italic*  __underline__  ^superscript^  ~subscript~ .  Literal characters: \*  \^  \~  \_
  const TOK = /(\*\*|__|\*|\^|~)/;
  const ESC = [["\\*", "\x01"], ["\\^", "\x02"], ["\\~", "\x03"], ["\\_", "\x04"]];
  const UNESC = [["\x01", "*"], ["\x02", "^"], ["\x03", "~"], ["\x04", "_"]];
  const RAW = /\u0005(\d+)\u0006/;

  function Builder(extras) {
    const raw = (extras && extras.raw) || [], media = (extras && extras.media) || {};
    const nums = [], images = [], rawUsed = new Map(), extraParts = [];

    function runs(text, base, size = 24) {
      for (const [k, v] of ESC) text = text.split(k).join(v);
      base = Object.assign({}, base || {});
      const st = Object.assign({ b: false, i: false, u: false, sup: false, sub: false }, base);
      const out = [];
      for (const part of text.split(TOK)) {
        if (part === "**") { if (!("b" in base)) st.b = !st.b; continue; }
        if (part === "__") { if (!("u" in base)) st.u = !st.u; continue; }
        if (part === "*") { st.i = !st.i; continue; }
        if (part === "^") { st.sup = !st.sup; continue; }
        if (part === "~") { st.sub = !st.sub; continue; }
        if (!part) continue;
        part.split("\t").forEach((seg0, j) => {
          if (j) out.push(`<w:r><w:rPr><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:tab/></w:r>`);
          if (!seg0) return;
          // An equation or other object from the teacher's file sits in the text as \u0005n\u0006.
          seg0.split(RAW).forEach((seg, r) => {
            if (r % 2) { out.push(rawRun(+seg)); return; }
            if (!seg) return;
            for (const [k, v] of UNESC) seg = seg.split(k).join(v);
            const pr = (st.b ? "<w:b/><w:bCs/>" : "") + (st.i ? "<w:i/><w:iCs/>" : "") + `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` +
              (st.u ? '<w:u w:val="single"/>' : "") + (st.sup ? '<w:vertAlign w:val="superscript"/>' : "") + (st.sub ? '<w:vertAlign w:val="subscript"/>' : "");
            out.push(`<w:r><w:rPr>${pr}</w:rPr><w:t xml:space="preserve">${esc(seg)}</w:t></w:r>`);
          });
        });
      }
      return out.join("");
    }
    // Copy an inline object (equation, MathType object, small inline picture) with the files it points to.
    function rawRun(k) {
      const o = raw[k];
      if (!o) return "";
      let xml = o.xml;
      for (const rel of o.rels || []) {
        let id = rawUsed.get(rel);
        if (!id) {
          const n = rawUsed.size + 1;
          id = "rIdX" + n;
          rawUsed.set(rel, id);
          const dir = /\/oleObject$|\/package$/.test(rel.type) ? "embeddings" : "media";
          extraParts.push({ id, type: rel.type, target: `${dir}/x${n}.${rel.ext}`, bytes: rel.bytes, ext: rel.ext });
        }
        xml = xml.replace(new RegExp(`(\\w+:(?:id|embed|link|pict|relid))="${rel.id}"`, "g"), `$1="${id}"`);
      }
      return /^<(?:\w+:)?(?:r|oMath)[\s>]/.test(xml) ? xml : `<w:r>${xml}</w:r>`;
    }
    const strong = (label) => `<w:r><w:rPr><w:rStyle w:val="Strong"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${esc(label)}</w:t></w:r>`;
    const MARK = '<w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>';

    // ========================================================================== paragraph
    function P(body, o = {}) {
      const { style = null, num = null, lvl = 0, tabs = null, before = null, after = null, line = null, ind = null, jc = null, keep = false, keeplines = false } = o;
      const mark = "mark" in o ? o.mark : MARK;
      let x = "<w:p><w:pPr>";
      if (style) x += `<w:pStyle w:val="${style}"/>`;
      if (keep) x += "<w:keepNext/>";
      if (keeplines) x += "<w:keepLines/>";
      if (num) x += `<w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="${num}"/></w:numPr>`;
      if (tabs && tabs.length) x += "<w:tabs>" + tabs.map((t) => `<w:tab w:val="${t[0]}" w:pos="${t[1]}"/>`).join("") + "</w:tabs>";
      let sp = "";
      if (before != null) sp += ` w:before="${before}"`;
      if (after != null) sp += ` w:after="${after}"`;
      if (line) sp += ` w:line="${line}" w:lineRule="auto"`;
      if (sp) x += `<w:spacing${sp}/>`;
      if (ind && Object.keys(ind).length) x += `<w:ind ${Object.entries(ind).map(([k, v]) => `w:${k}="${v}"`).join(" ")}/>`;
      if (jc) x += `<w:jc w:val="${jc}"/>`;
      return x + (mark || "") + "</w:pPr>" + body + "</w:p>";
    }

    // ========================================================================== numbering
    // abstract id -> levels [format, text, left, hanging, justification, bold]
    const ABS = {
      1: [["decimal", "%1.", 1080, 359, "left", 0]],
      2: [["decimal", "%1.", 1080, 359, "left", 0]],
      3: [["lowerLetter", "%1.", 1441, 359, "left", 0]],
      4: [["lowerRoman", "%1.", 1441, 420, "left", 0]],
      5: [["lowerRoman", "%1.", 1843, 360, "left", 0]],
      6: [["lowerLetter", "%1)", 1418, 425, "left", 0]],
      7: [["lowerLetter", "%1.", 720, 360, "left", 0]],
      8: [["lowerRoman", "%1.", 1080, 360, "left", 0]],
      9: [["lowerLetter", "%1)", 720, 360, "left", 0]],
      10: [["lowerRoman", "%1.", 720, 360, "left", 0]],
      11: [["upperLetter", "%1.", 630, 359, "left", 1], ["decimal", "%2.", 1080, 359, "left", 0],
        ["lowerLetter", "%3.", 1441, 359, "left", 0], ["lowerLetter", "%4)", 1843, 425, "left", 0]],
      12: [["lowerRoman", "%1.", 1081, 360, "right", 0], ["decimal", "%2.", 1440, 360, "left", 0],
        ["lowerLetter", "%3.", 1442, 360, "left", 0], ["lowerLetter", "%4)", 1843, 425, "left", 0]],
    };
    const newnum = (absId, start = 1) => { const n = 100 + nums.length; nums.push([n, absId, start]); return n; };
    function numberingXml() {
      let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
      for (const [a, levels] of Object.entries(ABS)) {
        x += `<w:abstractNum w:abstractNumId="${a}"><w:nsid w:val="${(0x4A1B0000 + +a).toString(16).toUpperCase().padStart(8, "0")}"/><w:multiLevelType w:val="${levels.length > 1 ? "multilevel" : "hybridMultilevel"}"/>`;
        levels.forEach(([fmt, txt, left, hang, jc, bold], il) => {
          x += `<w:lvl w:ilvl="${il}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${txt}"/><w:lvlJc w:val="${jc}"/>` +
            `<w:pPr><w:ind w:left="${left}" w:hanging="${hang}"/></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>${bold ? "<w:b/><w:bCs/>" : '<w:b w:val="0"/>'}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:lvl>`;
        });
        x += "</w:abstractNum>";
      }
      for (const [n, a, start] of nums) {
        x += `<w:num w:numId="${n}"><w:abstractNumId w:val="${a}"/>`;
        x += ABS[a].map((_, il) => `<w:lvlOverride w:ilvl="${il}"><w:startOverride w:val="${il === 0 ? start : 1}"/></w:lvlOverride>`).join("");
        x += "</w:num>";
      }
      return x + "</w:numbering>";
    }

    // ========================================================================== images
    function imgSize(d) {
      if (d[0] === 0x89 && d[1] === 0x50 && d[2] === 0x4e && d[3] === 0x47) return [(d[16] << 24 >>> 0) + (d[17] << 16) + (d[18] << 8) + d[19], (d[20] << 24 >>> 0) + (d[21] << 16) + (d[22] << 8) + d[23]];
      if (d[0] === 0xff && d[1] === 0xd8) {
        let i = 2;
        while (i < d.length) {
          if (d[i] !== 0xff) { i++; continue; }
          const m = d[i + 1];
          if (m === 0xc0 || m === 0xc1 || m === 0xc2) return [(d[i + 7] << 8) + d[i + 8], (d[i + 5] << 8) + d[i + 6]];
          i += 2 + ((d[i + 2] << 8) + d[i + 3]);
        }
      }
      return null;
    }
    function drawing(key, widthIn) {
      const m = media[key];
      if (!m) throw new Error("Missing picture: " + key);
      const [w, h] = imgSize(m.bytes) || [m.w, m.h];
      const k = images.length + 1, ext = String(m.ext || "png").toLowerCase().replace("jpeg", "jpg");
      images.push([k, m.bytes, ext]);
      const cx = int(widthIn * 914400), cy = int(cx * h / w);
      const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
      return `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
        `<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${k}" name="Picture ${k}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${A}" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
        `<a:graphic xmlns:a="${A}"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
        `<pic:nvPicPr><pic:cNvPr id="${k}" name="image${k}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${k}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    }

    // ========================================================================== data table (inside a question)
    function tableXml(t, total = 9000, indent = 1080) {
      const header = t.header, rows = t.rows, ncol = header.length, labels = "row_labels" in t ? t.row_labels : true;
      let widths;
      if (t.widths && t.widths.length) { const s = t.widths.reduce((a, b) => a + b, 0); widths = t.widths.map((w) => int(w * total / s)); }
      else if (labels) { const first = int(650 * total / 9000); widths = [first, ...Array(ncol - 1).fill(int((total - first) / (ncol - 1)))]; }
      else widths = Array(ncol).fill(int(total / ncol));
      widths[widths.length - 1] += total - widths.reduce((a, b) => a + b, 0);
      const b = ["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="${["top", "left", "bottom", "right"].includes(s) ? 8 : 6}" w:space="0" w:color="000000"/>`).join("");
      const cell = (w, text, shade, bold) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${shade ? '<w:shd w:val="clear" w:color="auto" w:fill="E7E6E6"/>' : ""}<w:vAlign w:val="center"/></w:tcPr>` +
        P(runs(text, bold ? { b: true } : null), { keep: true, before: 50, after: 50, jc: "center" }) + "</w:tc>";
      const zip = (a, c) => a.slice(0, Math.min(a.length, c.length)).map((w, j) => [w, c[j], j]);
      let x = `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblInd w:w="${indent}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
        '<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>' +
        `<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
      x += "<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>" + zip(widths, header).map(([w, h]) => cell(w, h, true, true)).join("") + "</w:tr>";
      for (const r of rows) x += "<w:tr><w:trPr><w:cantSplit/></w:trPr>" + zip(widths, r).map(([w, c, j]) => cell(w, c, false, j === 0 && labels)).join("") + "</w:tr>";
      return x + "</w:tbl>";
    }

    const LP = "ListParagraph";
    // paras: [body, kwargs]. All but the last keep with the next; the last gets `gap` after (if gap is not null).
    function finish(paras, gap, keepLast = false, keepAll = true) {
      const out = [];
      paras.forEach(([body, kw], k) => {
        const last = k === paras.length - 1;
        if (kw.raw) { delete kw.raw; out.push(body); return; }
        const nokeep = !!kw.nokeep; delete kw.nokeep;
        if (last && gap != null) kw.after = Math.max(kw.after || 0, gap);
        out.push(P(body, Object.assign({}, kw, { keep: last ? keepLast : keepAll && !nokeep })));
      });
      return out;
    }
    // Un-numbered lines the teacher wrote that have no place of their own in the layout (added for Word input).
    const notes = (lines, ind) => (lines || []).map((t) => P(runs(t), { style: LP, before: 0, after: 60, line: 276, ind: { left: ind, firstLine: 0 } })).join("");

    // ========================================================================== exam header (normal + box)
    function examHeader(paper, gap = 120) {
      const out = [], hdr = paper.header || [];
      hdr.forEach((line, k) => {
        const size = k === 0 ? 28 : 24;
        out.push(P(runs(line, { b: true }, size), { keep: true, line: 276, after: k === hdr.length - 1 ? gap : null, jc: "center", mark: `<w:rPr><w:b/><w:sz w:val="${size}"/></w:rPr>` }));
      });
      out.push(P(runs("**Time:** " + (paper.time || "") + "\t**MM:** " + (paper.marks || "")), { tabs: [["right", 10086]], after: 120, line: 276 }));
      out.push(P(runs("**__General Instructions__**", null, 28) + runs("**:**"), { keep: true, after: 60, line: 276, ind: { left: 271 }, mark: "<w:rPr><w:b/><w:sz w:val=\"24\"/></w:rPr>" }));
      const gi = newnum(2), ins = paper.instructions || [];
      ins.forEach((t, k) => out.push(P(runs(t), { style: LP, num: gi, tabs: [["left", 1080]], before: 0, after: k === ins.length - 1 ? 240 : null, line: 276, ind: { left: 1080, hanging: 359 } })));
      if (paper.notes && paper.notes.length) out.push(notes(paper.notes, 271));
      return out;
    }

    // ========================================================================== NORMAL layout
    function Adder() { const f = (body, kw = {}) => f.paras.push([body, kw]); f.paras = []; return f; }
    const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);
    const asObj = (o) => (typeof o === "string" ? { text: o } : o);

    // Blocks under a question for the 'normal' and 'assignment' layouts (indents relative to the page).
    function blocksFlow(blocks, add, mode) {
      let prev = null;
      for (const blk of blocks) {
        const afterTable = (k) => (k === 0 && prev && has(prev, "table") ? 120 : 0);
        if (has(blk, "table")) {
          if (add.paras.length) add.paras[add.paras.length - 1][1].after = 100;
          add(tableXml(blk.table), { raw: true });
        } else if (has(blk, "text")) {
          add(runs(blk.text), { style: LP, before: 0, line: mode === "normal" ? 276 : null, ind: { firstLine: 0 } });
        } else if (has(blk, "image")) {
          add(drawing(blk.image, blk.width || 3.0), { style: LP, before: 100, after: 100, ind: { firstLine: 0 }, jc: "center" });
        } else if (has(blk, "options") || (has(blk, "parts") && mode === "assignment")) {
          const n = newnum(3, blk._lifted ? 2 : 1), seq = (blk.options && blk.options.length ? blk.options : blk.parts) || [];
          seq.forEach((o0, k) => {
            const o = asObj(o0);
            if (k === 0 && blk._lifted) { subAndNotes(o, add, mode); return; }
            add(runs(o.text), { style: LP, num: n, tabs: [["left", 1441]], before: afterTable(k), ind: { left: 1441, hanging: 359 } });
            subAndNotes(o, add, mode);
          });
        } else if (has(blk, "parts")) {
          const n = newnum(3, blk._lifted ? 2 : 1);
          blk.parts.forEach((p0, k) => {
            const p = asObj(p0);
            if (k === 0 && blk._lifted) { subAndNotes(p, add, mode); return; }
            add(runs(p.text), { style: LP, num: n, tabs: [["left", 1441]], before: afterTable(k), line: 276, ind: { left: 1441, hanging: 359 } });
            subAndNotes(p, add, mode);
          });
        } else if (has(blk, "statements")) {
          const n = newnum(4);
          for (const s of blk.statements) add(runs(s), { style: LP, num: n, before: 0, ind: { left: 1441, hanging: 420 } });
        } else if (has(blk, "label")) {
          add(runs("**__" + blk.label + "__**:"), { style: LP, before: 40, after: 20, ind: { firstLine: 0 } });
        } else if (has(blk, "pairs")) {
          const n = newnum(3), tabs = [["left", 1441], ["right", 4400]];
          for (const [[l1, r1], [l2, r2]] of blk.pairs) {
            add(runs(l1 + "\t" + r1), { style: LP, num: n, tabs, before: 0, ind: { left: 1441, hanging: 359 } });
            add(runs(l2 + "\t" + r2), { style: LP, tabs, before: 0, after: 60, ind: { left: 1441, firstLine: 0 } });
          }
        } else if (has(blk, "or")) {
          add(runs("**OR**"), { style: LP, before: 120, after: 120, line: 276, ind: { left: 0, firstLine: 0 }, jc: "center", mark: '<w:rPr><w:b/><w:sz w:val="24"/></w:rPr>' });
        } else throw new Error("Unknown block: " + JSON.stringify(blk));
        prev = blk;
      }
    }
    function subAndNotes(p, add, mode) {
      if (p.sub && p.sub.length) {
        const r = newnum(5);
        for (const s of p.sub) add(runs(s), { style: LP, num: r, before: 0, line: mode === "normal" ? 276 : null, ind: { left: 1843, hanging: 360 } });
      }
      for (const note of p.notes || []) add(runs(note), { style: LP, before: 0, line: mode === "normal" ? 276 : null, ind: { left: 1441, firstLine: 0 } });
    }
    // Question text for the numbered line. A question that starts straight with its parts (no stem) gets its
    // first part on the number line as 'a.<tab>text', and the rest of the lettering continues at b.
    function stem(it) {
      if (it.q) return [it.q, it.blocks || []];
      const blocks = (it.blocks || []).map((b) => Object.assign({}, b));
      if (!blocks.length || !((blocks[0].parts && blocks[0].parts.length) || (blocks[0].options && blocks[0].options.length)))
        throw new Error('A question needs "q" text (or must start with a parts/options block)');
      const b0 = blocks[0], first = ((b0.parts && b0.parts.length ? b0.parts : null) || b0.options)[0];
      b0._lifted = true;
      return ["a.\t" + (typeof first === "string" ? first : first.text), blocks];
    }

    function buildNormal(paper) {
      const out = examHeader(paper), qnum = newnum(1);
      (paper.sections || []).forEach((sec, si) => {
        if (sec.title) out.push(P(`<w:r><w:rPr><w:bCs w:val="0"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${esc(sec.title)}</w:t></w:r>`,
          { style: "Heading1", keep: true, before: si === 0 ? 120 : 240, after: 240, line: 276, ind: { left: 47, right: 45, firstLine: 0 }, jc: "center", mark: '<w:rPr><w:bCs w:val="0"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:u w:val="single"/></w:rPr>' }));
        if (sec.notes && sec.notes.length) out.push(notes(sec.notes, 629));
        const items = sec.items || [];
        items.forEach((it, ii) => {
          const last = ii === items.length - 1, nxt = !last ? items[ii + 1] : {};
          const big = last || it.type === "ar_intro" || nxt.type === "ar_intro";
          const chain = (it.type === "ar_intro" || it.type === "ar") && nxt.type === "ar";
          const add = Adder();
          if (it.type === "ar_intro") {
            add(runs(it.text, { u: true }), { style: LP, tabs: [["left", 629]], before: 120, after: 120, ind: { left: 629, firstLine: 0 }, nokeep: true });
            const n = newnum(6);
            for (const c of it.choices) add(runs(c), { style: LP, num: n, tabs: [["left", 1418]], before: 0, ind: { left: 1418, hanging: 425 } });
          } else if (it.type === "ar") {
            add(strong("Assertion (A):") + runs(" " + it.assertion), { style: LP, num: qnum, tabs: [["left", 1080]], before: 0, line: 276, ind: { left: 1080, hanging: 359 } });
            add(strong("Reason (R):") + runs(" " + it.reason), { style: LP, before: 0, ind: { left: 1077, firstLine: 0 } });
          } else {
            const [q, blocks] = stem(it);
            add(runs(q), { style: LP, num: qnum, tabs: [["left", 1080]].concat(blocks.length && blocks[0]._lifted ? [["left", 1441]] : []), before: 0, line: 276, ind: { left: 1080, hanging: 359 } });
            blocksFlow(blocks, add, "normal");
          }
          out.push(...finish(add.paras, big ? 240 : 120, chain));
        });
      });
      return out.join("");
    }

    // ========================================================================== BOX layout
    const COLS = [900, 8700, 1200];
    function buildBox(paper) {
      const out = examHeader(paper, null), rows = [];
      const B = ["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="000000"/>`).join("");
      const tc = (w, inner, span = 1) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}<w:vAlign w:val="top"/></w:tcPr>${inner}</w:tc>`;
      const small = (text, bold) => P(text ? runs(text, bold ? { b: true } : null) : "", { before: 80, after: 80, line: 240, jc: "center" });
      rows.push("<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>" + tc(COLS[0], small("Q.No.", true)) + tc(COLS[1], small("")) + tc(COLS[2], small("Marks", true)) + "</w:tr>");
      let q = 0;
      for (const sec of paper.sections || []) {
        if (sec.title || (sec.notes && sec.notes.length))
          rows.push("<w:tr><w:trPr><w:cantSplit/></w:trPr>" + tc(COLS[0] + COLS[1] + COLS[2], (sec.title ? P(runs(sec.title.toUpperCase(), { b: true }), { keep: true, before: 100, after: 100, line: 240, jc: "center", mark: '<w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>' }) : "") +
            (sec.notes || []).map((t) => P(runs(t), { before: 0, after: 80, line: 276, jc: "center" })).join(""), 3) + "</w:tr>");
        for (const it of sec.items || []) {
          const add = Adder();
          let qn, mk;
          if (it.type === "ar_intro") {
            add(runs(it.text, { u: true }), { line: 276 });
            const n = newnum(9);
            for (const c of it.choices) add(runs(c), { num: n });
            qn = ""; mk = "";
          } else {
            q += 1; qn = "Q" + q; mk = has(it, "marks") ? it.marks : (sec.marks || "");
            if (it.type === "ar") {
              add(strong("Assertion (A):") + runs(" " + it.assertion), { line: 276 });
              add(strong("Reason (R):") + runs(" " + it.reason), { line: 276 });
            } else {
              if (it.q) add(runs(it.q), { line: 276 });
              blocksBox(it.blocks || [], add);
            }
          }
          const cell = [], ps = add.paras.filter((p) => !p[1].raw), lastKw = add.paras.length ? add.paras[add.paras.length - 1][1] : {};
          for (const [body, kw] of add.paras) {
            if (kw.raw) { delete kw.raw; cell.push(body); continue; }
            if (kw.before == null) kw.before = 0;
            if (kw.after == null) kw.after = 0;
            if (kw.line == null) kw.line = 276;
            if (kw === ps[0][1]) kw.before = Math.max(kw.before, 80);
            if (kw === ps[ps.length - 1][1] && lastKw === kw) kw.after = Math.max(kw.after, 80);
            const o = Object.assign({}, kw); delete o.raw_last;
            cell.push(P(body, Object.assign(o, { keeplines: true })));
          }
          if (lastKw.raw_last) cell.push('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="160" w:lineRule="exact"/></w:pPr></w:p>');
          rows.push("<w:tr><w:trPr><w:cantSplit/></w:trPr>" + tc(COLS[0], small(qn)) + tc(COLS[1], cell.join("")) + tc(COLS[2], small(mk)) + "</w:tr>");
        }
      }
      out.push(`<w:tbl><w:tblPr><w:tblW w:w="10800" w:type="dxa"/><w:tblBorders>${B}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
        '<w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>' +
        '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>' +
        `<w:tblGrid>${COLS.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`);
      out.push(P("", { before: 0, after: 0, line: 240 }));
      return out.join("");
    }
    // Blocks inside the Question cell of the box layout (indents relative to the cell).
    function blocksBox(blocks, add) {
      let prev = null;
      for (const blk of blocks) {
        const afterTable = (k) => (k === 0 && prev && has(prev, "table") ? 100 : 0);
        if (has(blk, "table")) {
          if (add.paras.length) add.paras[add.paras.length - 1][1].after = 100;
          add(tableXml(blk.table, 8400, 0), { raw: true });
        } else if (has(blk, "text")) {
          add(runs(blk.text), { line: 276 });
        } else if (has(blk, "image")) {
          add(drawing(blk.image, blk.width || 3.0), { before: 100, after: 100, jc: "center", line: 240 });
        } else if (has(blk, "options")) {
          const n = newnum(7);
          blk.options.forEach((o, k) => add(runs(o), { num: n, line: 240, before: afterTable(k) }));
        } else if (has(blk, "parts")) {
          const n = newnum(7);
          blk.parts.forEach((p0, k) => {
            const p = asObj(p0);
            add(runs(p.text), { num: n, line: 276, before: afterTable(k) });
            if (p.sub && p.sub.length) { const r = newnum(8); for (const s of p.sub) add(runs(s), { num: r, line: 276 }); }
            for (const note of p.notes || []) add(runs(note), { line: 276, ind: { left: 720 } });
          });
        } else if (has(blk, "statements")) {
          const n = newnum(10);
          for (const s of blk.statements) add(runs(s), { num: n, line: 240 });
        } else if (has(blk, "label")) {
          add(runs("**__" + blk.label + "__**:"), { line: 240, before: 40 });
        } else if (has(blk, "pairs")) {
          const n = newnum(7), tabs = [["right", 4000]];
          for (const [[l1, r1], [l2, r2]] of blk.pairs) {
            add(runs(l1 + "\t" + r1), { num: n, tabs, line: 240 });
            add(runs(l2 + "\t" + r2), { tabs, line: 240, after: 60, ind: { left: 720 } });
          }
        } else if (has(blk, "or")) {
          add(runs("**OR**"), { jc: "center", line: 240, before: 80, after: 80 });
        } else throw new Error("Unknown block: " + JSON.stringify(blk));
        prev = blk;
      }
      if (blocks.length && has(blocks[blocks.length - 1], "table")) add.paras[add.paras.length - 1][1].raw_last = true; // the table ends the cell: a tiny closing paragraph follows
    }

    // ========================================================================== ASSIGNMENT layout
    function buildAssignment(paper) {
      const out = [], hdr = paper.header || [];
      hdr.forEach((line, k) => out.push(P(runs(line, { b: true, u: true }, 28), { keep: true, after: k === hdr.length - 1 ? 240 : null, jc: "center", mark: '<w:rPr><w:b/><w:sz w:val="28"/></w:rPr>' })));
      if (paper.notes && paper.notes.length) out.push(notes(paper.notes, 0));
      (paper.chapters || []).forEach((ch, ci) => {
        if (ch.title) out.push(P(`<w:r><w:rPr><w:bCs w:val="0"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${esc(ch.title)}</w:t></w:r>`,
          { style: "Heading1", keep: true, before: ci === 0 ? null : 240, after: 240, ind: { left: 47, right: 45, firstLine: 0 }, jc: "center", mark: '<w:rPr><w:bCs w:val="0"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:u w:val="single"/></w:rPr>' }));
        const main = newnum(11);
        for (const sec of ch.sections || []) {
          if (sec.title) out.push(P(runs(sec.title, { b: true }), { style: LP, num: main, lvl: 0, tabs: [["left", 630]], keep: true, before: 0, line: 276, ind: { left: 630, hanging: 359 }, mark: '<w:rPr><w:b/><w:sz w:val="24"/></w:rPr>' }));
          if (sec.notes && sec.notes.length) out.push(notes(sec.notes, 630));
          const items = sec.items || [];
          let caseNum = null;
          items.forEach((it, ii) => {
            const last = ii === items.length - 1;
            const kind = it.type || ((it.blocks || []).some((b) => has(b, "options")) ? "mcq" : "q");
            const add = Adder();
            let gap;
            if (kind === "ar_intro") {
              add(runs(it.text), { style: LP, tabs: [["left", 629]], before: 120, after: 120, ind: { left: 629, firstLine: 0 }, mark: '<w:rPr><w:b/><w:sz w:val="24"/></w:rPr>' });
              const n = newnum(6);
              for (const c of it.choices) add(runs(c), { num: n, tabs: [["left", 629]], ind: { left: 1418, hanging: 425 }, mark: '<w:rPr><w:sz w:val="24"/></w:rPr>' });
              gap = last ? 240 : 120;
            } else if (kind === "ar") {
              add(strong("Assertion (A):") + runs(" " + it.assertion), { style: LP, num: main, lvl: 1, tabs: [["left", 629]], before: 214, ind: { left: 1080, hanging: 359 } });
              add(strong("Reason (R):") + runs(" " + it.reason), { style: LP, tabs: [["left", 629]], before: 0, ind: { left: 1082, firstLine: 0 } });
              gap = last ? 240 : null;
            } else if (kind === "case") {
              if (caseNum == null) caseNum = newnum(12);
              add(runs("**Case**: " + it.passage), { style: LP, num: caseNum, lvl: 0, tabs: [["left", 629]], before: 214, after: 240 });
              const qs = it.questions || [];
              qs.forEach((cq0, qi) => {
                const cq = typeof cq0 === "string" ? { q: cq0 } : cq0, lastq = qi === qs.length - 1, opts = cq.options || [];
                add(runs(cq.q), { style: LP, num: caseNum, lvl: 2, tabs: [["left", 629]], before: 0 });
                opts.forEach((o, oi) => add(runs(o), { style: LP, num: caseNum, lvl: 3, tabs: [["left", 629]], before: 0, ind: { left: 1843, hanging: 425 }, after: oi === opts.length - 1 ? (!lastq ? 120 : null) : null }));
              });
              gap = 240;
            } else {
              const first = { style: LP, num: main, lvl: 1, tabs: [["left", 1080]], ind: { left: 1080, hanging: 359 } };
              if (kind === "q") first.before = 0;
              const [q, blocks] = stem(it);
              if (blocks.length && blocks[0]._lifted) first.tabs = [["left", 1080], ["left", 1441]];
              add(runs(q), first);
              blocksFlow(blocks, add, "assignment");
              gap = kind === "mcq" ? (last ? 240 : 120) : (last ? 240 : null);
            }
            out.push(...finish(add.paras, gap, false, kind !== "q" || !!(it.blocks && it.blocks.length)));
          });
        }
      });
      return out.join("");
    }

    // ========================================================================== package
    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:eastAsia="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:widowControl w:val="0"/><w:autoSpaceDE w:val="0"/><w:autoSpaceDN w:val="0"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Cambria" w:eastAsia="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="688" w:hanging="327"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="49"/><w:ind w:left="1080" w:hanging="359"/></w:pPr></w:style>' +
      '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>' +
      '<w:style w:type="character" w:styleId="Strong"><w:name w:val="Strong"/><w:basedOn w:val="DefaultParagraphFont"/><w:qFormat/><w:rPr><w:b/><w:bCs/></w:rPr></w:style>' +
      "</w:styles>";
    const SETTINGS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat>' +
      '<w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>' +
      '<w:compatSetting w:name="overrideTableStyleFontSizeAndJustification" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>' +
      '<w:compatSetting w:name="enableOpenTypeFeatures" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>' +
      '<w:compatSetting w:name="doNotFlipMirrorIndents" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>' +
      "</w:compat></w:settings>";
    const SECT = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>' +
      '<w:cols w:space="720"/><w:docGrid w:linePitch="299"/></w:sectPr>';
    // Content types for pictures and objects copied from the teacher's file (png and jpg are always there).
    const TYPES = { gif: "image/gif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff", emf: "image/x-emf", wmf: "image/x-wmf", svg: "image/svg+xml", webp: "image/webp", bin: "application/vnd.openxmlformats-officedocument.oleObject" };

    function files(paper) {
      const layout = paper.layout || "normal";
      let body = { normal: buildNormal, box: buildBox, assignment: buildAssignment }[layout](paper);
      if (layout !== "box") body += "<w:p/>";
      // Equations and Word objects bring their own namespace declarations, so the root stays as the script writes it.
      const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}${SECT}</w:body></w:document>`;
      const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rIdSet" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
        '<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
        images.map(([k, , e]) => `<Relationship Id="rIdImg${k}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${k}.${e}"/>`).join("") +
        extraParts.map((p) => `<Relationship Id="${p.id}" Type="${p.type}" Target="${p.target}"/>`).join("") +
        "</Relationships>";
      const exts = [...new Set(images.map((i) => i[2]).concat(extraParts.map((p) => p.ext)))].filter((e) => e !== "png" && e !== "jpg" && TYPES[e]);
      const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/>' +
        exts.map((e) => `<Default Extension="${e}" ContentType="${TYPES[e]}"/>`).join("") +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>';
      const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
      const f = [["[Content_Types].xml", ct], ["_rels/.rels", rootRels], ["word/document.xml", doc], ["word/styles.xml", STYLES], ["word/settings.xml", SETTINGS],
        ["word/numbering.xml", numberingXml()], ["word/_rels/document.xml.rels", rels]];
      for (const [k, bytes, ext] of images) f.push([`word/media/image${k}.${ext}`, bytes]);
      for (const p of extraParts) f.push(["word/" + p.target, p.bytes]);
      return f;
    }
    return { files };
  }

  // The parts of the .docx, in the script's order, as [path, string | Uint8Array].
  const files = (paper, extras) => Builder(extras).files(paper);

  // ============================================================================ zip (JSZip, loaded when needed)
  const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  function zipLib() {
    if (root.JSZip) return Promise.resolve(root.JSZip);
    return new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = JSZIP; s.onload = () => ok(root.JSZip); s.onerror = () => no(new Error("Couldn't load the Word file tools. Check the internet and try again."));
      document.head.append(s);
    });
  }
  async function build(paper, extras) {
    const Z = await zipLib(), z = new Z();
    for (const [p, data] of files(paper, extras)) z.file(p, data, { createFolders: false });
    return z.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  // ============================================================================ reading the teacher's .docx
  // Symbol-font characters Word stores as w:sym (Greek letters and maths signs teachers type from Insert > Symbol).
  const SYMBOL = {};
  ("41Α42Β43Χ44Δ45Ε46Φ47Γ48Η49Ι4Aϑ4BΚ4CΛ4DΜ4EΝ4FΟ50Π51Θ52Ρ53Σ54Τ55Υ56ς57Ω58Ξ59Ψ5AΖ61α62β63χ64δ65ε66φ67γ68η69ι6Aϕ6Bκ6Cλ6Dμ6Eν6Fο70π71θ72ρ73σ74τ75υ76ϖ77ω78ξ79ψ7Aζ" +
    "22∀24∃27∋2D−5E⊥A2′A3≤A5∞AB↔AC←AD↑AE→AF↓B0°B1±B2″B3≥B4×B5∝B6∂B7•B8÷B9≠BA≡BB≈BC…C6∅C7∩C8∪CC⊂CE∈D0∠D1∇D6√DB⇔DE⇒E5∑F2∫")
    .replace(/([0-9A-F]{2})(.)/gu, (_, k, c) => { SYMBOL[k] = c; return ""; });
  const FMT = { b: 1, i: 2, u: 4, sup: 8, sub: 16 };
  const BOX = "￼"; // stands for an equation or object in plain text

  async function read(buf) {
    const Z = await zipLib(), z = await Z.loadAsync(buf);
    const text = async (p) => (z.file(p) ? z.file(p).async("string") : null);
    const docXml = await text("word/document.xml");
    if (!docXml) throw new Error("This doesn't look like a Word (.docx) file.");
    const parse = (s) => new DOMParser().parseFromString(s, "application/xml");
    const doc = parse(docXml), numDoc = (await text("word/numbering.xml")) && parse(await text("word/numbering.xml")), stDoc = (await text("word/styles.xml")) && parse(await text("word/styles.xml"));
    const relDoc = parse((await text("word/_rels/document.xml.rels")) || "<Relationships/>");
    const rels = {};
    for (const r of relDoc.getElementsByTagName("Relationship")) rels[r.getAttribute("Id")] = { type: r.getAttribute("Type"), target: r.getAttribute("Target"), external: r.getAttribute("TargetMode") === "External" };
    const relBytes = async (id) => {
      const r = rels[id]; if (!r || r.external) return null;
      const path = r.target.startsWith("/") ? r.target.slice(1) : "word/" + r.target.replace(/^\.\//, "");
      const f = z.file(path.replace(/[^/]+\/\.\.\//g, ""));
      if (!f) return null;
      return { bytes: await f.async("uint8array"), ext: (path.match(/\.(\w+)$/) || [, "bin"])[1].toLowerCase(), type: r.type };
    };
    const kids = (el, name) => [...el.childNodes].filter((n) => n.nodeType === 1 && (!name || n.localName === name));
    const kid = (el, name) => (el ? kids(el, name)[0] : null);
    const wv = (el, attr = "val") => (el ? el.getAttributeNS(W, attr) ?? el.getAttribute("w:" + attr) : null);
    const on = (el) => !!el && !/^(0|false|off|none)$/.test(wv(el) || "");

    // ---- styles: what a paragraph style says about numbering, centring and bold
    const styles = {};
    if (stDoc) for (const s of stDoc.getElementsByTagNameNS(W, "style")) {
      const pPr = kid(s, "pPr"), rPr = kid(s, "rPr"), np = kid(pPr, "numPr");
      styles[wv(s, "styleId")] = { based: wv(kid(s, "basedOn")), numId: wv(kid(np, "numId")), ilvl: wv(kid(np, "ilvl")), jc: wv(kid(pPr, "jc")), b: rPr ? on(kid(rPr, "b")) : null };
    }
    const styleProp = (id, k) => { for (let i = 0, s = styles[id]; s && i < 8; i++, s = styles[s.based]) if (s[k] != null) return s[k]; return null; };

    // ---- numbering: the list numbers Word shows but doesn't store in the text
    const nums = {}, abs = {};
    if (numDoc) {
      for (const a of numDoc.getElementsByTagNameNS(W, "abstractNum")) {
        const lv = {};
        for (const l of kids(a, "lvl")) lv[wv(l, "ilvl")] = { start: +(wv(kid(l, "start")) || 1), fmt: wv(kid(l, "numFmt")) || "decimal", text: wv(kid(l, "lvlText")) ?? "%1." };
        abs[wv(a, "abstractNumId")] = lv;
      }
      for (const n of numDoc.getElementsByTagNameNS(W, "num")) {
        const over = {};
        for (const o of kids(n, "lvlOverride")) { const so = kid(o, "startOverride"); if (so) over[wv(o, "ilvl")] = +wv(so); }
        nums[wv(n, "numId")] = { abs: wv(kid(n, "abstractNumId")), over };
      }
    }
    const counters = {};
    const roman = (n) => { let s = ""; for (const [v, r] of [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]]) while (n >= v) { s += r; n -= v; } return s; };
    const letter = (n) => { let s = ""; while (n > 0) { s = String.fromCharCode(97 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26); } return s; };
    const fmtNum = (n, f) => f === "lowerLetter" ? letter(n) : f === "upperLetter" ? letter(n).toUpperCase() : f === "lowerRoman" ? roman(n) : f === "upperRoman" ? roman(n).toUpperCase() : f === "bullet" ? "•" : f === "none" ? "" : String(n);
    function listLabel(numId, ilvl) {
      const nm = nums[numId]; if (!nm || numId === "0") return "";
      const lv = abs[nm.abs] || {}, L = lv[ilvl]; if (!L) return "";
      const c = (counters[numId] ||= {});
      const startOf = (l) => (nm.over[l] != null ? nm.over[l] : (lv[l] || {}).start || 1);
      c[ilvl] = c[ilvl] == null ? startOf(ilvl) : c[ilvl] + 1;
      for (const k of Object.keys(c)) if (+k > +ilvl) delete c[k];
      if (L.fmt === "bullet") return "•";
      return L.text.replace(/%(\d)/g, (_, d) => { const l = String(+d - 1); return fmtNum(l === String(ilvl) ? c[ilvl] : c[l] != null ? c[l] : startOf(l), (lv[l] || L).fmt); }).trim();
    }

    // ---- the lines
    const lines = [], raw = [], media = {};
    let picN = 0;
    const ser = new XMLSerializer();
    async function picture(blipId, extent, inline) {
      const got = await relBytes(blipId);
      if (!got) return null;
      const key = "p" + ++picN;
      const cx = extent ? +extent.getAttribute("cx") : 0, cy = extent ? +extent.getAttribute("cy") : 0;
      media[key] = { bytes: got.bytes, ext: got.ext, w: cx || 1, h: cy || 1, widthIn: cx ? cx / 914400 : 3, inline };
      return key;
    }
    // A run of text in one style: segs are [{t, f}] with f the FMT bits; raw objects are {t: BOX, raw: n}.
    function newLine(base) { return Object.assign({ segs: [], n: "", c: false, pics: [] }, base); }

    async function paragraph(p, ctx) {
      const pPr = kid(p, "pPr"), np = kid(pPr, "numPr"), sid = wv(kid(pPr, "pStyle"));
      const numId = np ? wv(kid(np, "numId")) : styleProp(sid, "numId"), ilvl = (np && wv(kid(np, "ilvl"))) || styleProp(sid, "ilvl") || "0";
      const jc = wv(kid(pPr, "jc")) || styleProp(sid, "jc");
      const styleBold = styleProp(sid, "b");
      const base = { n: numId ? listLabel(numId, ilvl) : "", c: jc === "center", ...ctx };
      let cur = newLine(base);
      const out = [cur];
      const brk = () => { cur = newLine({ c: base.c, ...ctx }); out.push(cur); };
      const add = (t, f) => { if (!t) return; const last = cur.segs[cur.segs.length - 1]; if (last && last.f === f && last.raw == null) last.t += t; else cur.segs.push({ t, f }); };
      const addRaw = (xml, relIds) => { const n = raw.length; raw.push({ xml, rels: relIds }); cur.segs.push({ t: BOX, f: 0, raw: n }); };
      async function relsOf(el) {
        const ids = new Set();
        for (const n of el.getElementsByTagName("*")) for (const a of n.attributes) if (a.namespaceURI === R && rels[a.value]) ids.add(a.value);
        const out2 = [];
        for (const id of ids) { const got = await relBytes(id); if (got) out2.push({ id, type: got.type, bytes: got.bytes, ext: got.ext }); }
        return out2;
      }
      async function run(r) {
        const rPr = kid(r, "rPr");
        let f = 0;
        const b = kid(rPr, "b"), i = kid(rPr, "i"), u = kid(rPr, "u"), va = wv(kid(rPr, "vertAlign"));
        if (b ? on(b) : styleBold) f |= FMT.b;
        if (on(i)) f |= FMT.i;
        if (u && on(u)) f |= FMT.u;
        if (va === "superscript") f |= FMT.sup; else if (va === "subscript") f |= FMT.sub;
        const caps = on(kid(rPr, "caps"));
        for (const c of kids(r)) {
          const ln = c.localName;
          if (ln === "t") add(caps ? c.textContent.toUpperCase() : c.textContent, f);
          else if (ln === "tab" || ln === "ptab") add("\t", f);
          else if (ln === "br" || ln === "cr") { const t = wv(c, "type"); if (t !== "page" && t !== "column") brk(); }
          else if (ln === "noBreakHyphen") add("-", f);
          else if (ln === "sym") { const ch = (wv(c, "char") || "").toUpperCase(), code = ch.replace(/^F0/, ""); add((/symbol/i.test(wv(c, "font") || "") && SYMBOL[code]) || String.fromCharCode(parseInt(code, 16) || 63), f); }
          else if (ln === "drawing" || ln === "pict" || ln === "AlternateContent") await graphic(c, f);
          else if (ln === "object") addRaw(ser.serializeToString(c), await relsOf(c));
        }
      }
      async function graphic(el, f) {
        const blip = el.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/main", "blip")[0];
        const vimg = [...el.getElementsByTagName("*")].find((n) => n.localName === "imagedata");
        const id = blip ? blip.getAttributeNS(R, "embed") || blip.getAttributeNS(R, "link") : vimg ? vimg.getAttributeNS(R, "id") : null;
        const ext = [...el.getElementsByTagName("*")].find((n) => n.localName === "extent");
        if (!id) {
          // A shape or text box: keep any text written inside it.
          const tx = [...el.getElementsByTagName("*")].filter((n) => n.localName === "txbxContent")[0];
          if (tx) for (const tp of kids(tx, "p")) { brk(); for (const r of tp.getElementsByTagNameNS(W, "r")) await run(r); }
          else cur.lost = (cur.lost || 0) + 1;
          return;
        }
        const key = await picture(id, ext, true);
        if (key) cur.pics.push(key);
      }
      async function walk(el) {
        for (const c of kids(el)) {
          const ln = c.localName;
          if (ln === "r") await run(c);
          else if (ln === "hyperlink" || ln === "smartTag" || ln === "ins" || ln === "fldSimple" || ln === "customXml" || ln === "bdo" || ln === "dir") await walk(c);
          else if (ln === "sdt") await walk(kid(c, "sdtContent") || c);
          else if (ln === "oMath") addRaw(ser.serializeToString(c), []);
          else if (ln === "oMathPara") for (const m of kids(c, "oMath")) addRaw(ser.serializeToString(m), []);
          // ln === "del": deleted text in tracked changes is left out, as Word shows it.
        }
      }
      await walk(p);
      return out;
    }

    // ---- tables: a data table, or the paper itself laid out in a table (Q.No | Question | Marks), or options in a grid
    const plain = (L) => L.segs.map((s) => s.t).join("");
    async function table(tbl, ctx) {
      const rows = [];
      for (const tr of kids(tbl, "tr")) {
        const cells = [];
        for (const tc of kids(tr, "tc")) {
          const ls = [];
          for (const c of kids(tc)) {
            if (c.localName === "p") ls.push(...(await paragraph(c, ctx)));
            else if (c.localName === "tbl") ls.push(...(await table(c, ctx)));
          }
          cells.push(ls);
        }
        rows.push(cells);
      }
      const txt = (cell) => cell.map(plain).join(" ").replace(/\s+/g, " ").trim();
      const QNO = /^\s*(?:Q\s*\.?\s*(?:No\.?)?\s*)?\d+\s*[.)]?\s*$/i, MK = /^\s*[[(]?\s*\d+(?:\.5)?\s*[\])]?\s*(?:marks?|m)?\s*$/i, OPT = /^\s*\(?[a-eA-E][.)]\s*\S/;
      const multi = rows.filter((r) => r.length >= 2);
      const qRows = multi.filter((r) => QNO.test(txt(r[0]))).length;
      const head = rows[0] ? rows[0].map(txt).join(" ") : "";
      const allCells = rows.flat().filter((c) => txt(c));
      const isPaper = (multi.length && qRows >= Math.max(2, multi.length * 0.4)) || /\bQ\.?\s*No\b/i.test(head) && /marks/i.test(head);
      const isOptions = allCells.length >= 2 && allCells.length <= 8 && allCells.every((c) => OPT.test(txt(c)));
      const flat = (cells) => cells.flat();
      if (isPaper) {
        const out = [];
        rows.forEach((r, ri) => {
          if (ri === 0 && /\bQ\.?\s*No\b/i.test(head)) return; // the old header row: the layout draws its own
          if (r.length < 2) { out.push(...flat(r)); return; }
          const first = txt(r[0]), lastCell = r.length > 2 ? txt(r[r.length - 1]) : "";
          const mid = r.slice(QNO.test(first) ? 1 : 0, lastCell && MK.test(lastCell) ? -1 : undefined);
          const body = flat(mid).filter((L) => plain(L).trim() || L.pics.length || L.tbl);
          if (body[0]) {
            if (QNO.test(first) && first) { if (body[0].n) body[0].qn = first.trim(); else body[0].n = first.trim(); }
            if (lastCell && MK.test(lastCell)) body[0].mk = lastCell.replace(/[^\d.]/g, "");
          }
          out.push(...body);
        });
        return out;
      }
      if (isOptions || !rows.length) return flat(rows.map(flat));
      // A data table inside a question: its text as **bold**/~sub~ markup, one string per cell.
      const width = Math.max(...rows.map((r) => r.length));
      const cellText = (cell) => cell.map((L) => markup(L.segs, true)).join(" ").trim();
      const t = { header: rows[0].map(cellText), rows: rows.slice(1).map((r) => r.map(cellText)) };
      t.header = t.header.concat(Array(width - t.header.length).fill(""));
      t.rows = t.rows.map((r) => r.concat(Array(width - r.length).fill("")));
      const firstCol = t.rows.map((r) => r[0]);
      // A first column of short labels under an empty corner cell — (a) (b) (c) — is printed narrow and bold.
      t.row_labels = firstCol.length > 0 && !t.header[0] && firstCol.every((c) => c.replace(/\*/g, "").length <= 5);
      return [newLine({ tbl: t, ...ctx })];
    }

    const body = doc.getElementsByTagNameNS(W, "body")[0];
    async function block(el) {
      for (const c of kids(el)) {
        if (c.localName === "p") lines.push(...(await paragraph(c, {})));
        else if (c.localName === "tbl") lines.push(...(await table(c, {})));
        else if (c.localName === "sdt") await block(kid(c, "sdtContent") || c);
        else if (c.localName === "customXml") await block(c);
      }
    }
    if (body) await block(body);

    // Pictures: a line that is only a picture becomes a picture line; pictures beside text follow the text as their own lines.
    const outLines = [];
    for (const L of lines) {
      const txt0 = plain(L).trim();
      if (L.tbl) { outLines.push(L); continue; }
      if (txt0 || !L.pics.length) outLines.push(L);
      for (const key of L.pics) outLines.push(newLine({ img: key }));
    }
    return { lines: outLines.filter((L) => L.tbl || L.img || plain(L).trim() || L.n), raw, media };
  }

  // ============================================================================ line text
  // segs → the script's markup: **bold** *italic* __underline__ ^sup^ ~sub~, objects as \u0005n\u0006,
  // and the script's own marker characters escaped so a "______" blank stays a blank.
  function markup(segs, flat) {
    let out = "", f = 0;
    const toggle = (from, to) => {
      let s = "";
      if ((from ^ to) & FMT.b) s += "**";
      if ((from ^ to) & FMT.u) s += "__";
      if ((from ^ to) & FMT.i) s += "*";
      if ((from ^ to) & FMT.sup) s += "^";
      if ((from ^ to) & FMT.sub) s += "~";
      return s;
    };
    let ws = ""; // spaces wait until the next word, so they sit outside bold, underline and subscript
    for (const s of segs) {
      if (s.raw != null) { out += toggle(f, 0) + ws + `\u0005${s.raw}\u0006`; f = 0; ws = ""; continue; }
      let t = s.t.replace(/[*^~_]/g, (c) => "\\" + c);
      if (flat) t = t.replace(/\t+/g, " ");
      if (!t) continue;
      const lead = t.match(/^\s*/)[0], trail = t.slice(lead.length).match(/\s*$/)[0], core = t.slice(lead.length, t.length - trail.length);
      if (!core) { ws += t; continue; }
      const keep = f & s.f;
      out += toggle(f, keep) + ws + lead + toggle(keep, s.f) + core; f = s.f; ws = trail;
    }
    return out + toggle(f, 0) + ws;
  }
  const plainOf = (segs) => segs.map((s) => s.t).join("");
  // Cut segs to the characters [a, b) of their plain text.
  function slice(segs, a, b = Infinity) {
    const out = []; let pos = 0;
    for (const s of segs) {
      const len = s.t.length, from = Math.max(a, pos), to = Math.min(b, pos + len);
      if (to > from) out.push(s.raw != null ? s : { t: s.t.slice(from - pos, to - pos), f: s.f });
      pos += len;
    }
    return out;
  }
  // Trim spaces and tabs from both ends.
  function trim(segs) {
    const p = plainOf(segs), a = p.length - p.replace(/^\s+/, "").length, b = p.replace(/\s+$/, "").length;
    return slice(segs, a, b);
  }

  root.PaperDoc = { files, build, read, markup, plainOf, slice, trim, BOX };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PaperDoc;
})(typeof window !== "undefined" ? window : globalThis);
