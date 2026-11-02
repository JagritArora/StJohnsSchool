// The formatter's test round, run inside staff.html by tools/paper-round.sh.
// Every paper in tools/papers/ goes through all three layouts with the live AI, exactly as a teacher's
// would; each result is checked (js/qpaper.js verify + claims) and held against tools/papers/expect.json.
addEventListener("load", () => setTimeout(async () => {
  const out = [], put = (o) => out.push(JSON.stringify(o));
  try {
    const Q = SJS.qp, PD = PaperDoc, files = window.ROUND_FILES, expect = await (await fetch("tools/papers/expect.json")).json().catch(() => ({}));
    let calls = 0; const real = window.fetch;
    window.fetch = (u, o) => { if (o && o.method === "POST") calls++; return real(u, o); };
    for (const f of files) for (const layout of ["normal", "box", "assignment"]) {
      const t0 = Date.now(); calls = 0;
      try {
        // "sample": the built-in sample, pasted as text the way a teacher would.
        const read = f === "sample" ? Q.fromPaste(Q.SAMPLE) : await PD.read(await (await real("tools/papers/" + encodeURIComponent(f))).arrayBuffer());
        const s = await Q.sort(read, layout, () => {});
        const r = Q.assemble(read, s.labels, layout);
        const v = await Q.verify(read, r.paper, s.labels, r, layout);
        const checks = Q.claims(r, layout).concat(v.checks);
        const e = expect[f] || {}, want = [];
        if (e.questions != null && e.questions !== r.count) want.push(`expected ${e.questions} questions, got ${r.count}`);
        const known = (t) => (e.known || []).some((k) => t.includes(k));
        if (e.sections != null && layout !== "assignment" && e.sections !== r.sections) want.push(`expected ${e.sections} sections, got ${r.sections}`);
        const b = new Uint8Array(await v.blob.arrayBuffer()); let bin = ""; for (const x of b) bin += String.fromCharCode(x);
        put({ f, layout, by: s.by, why: s.why || "", calls, ms: Date.now() - t0, q: r.count, secs: r.sections,
          bad: checks.filter((c) => !c.ok && !known(c.text)).map((c) => c.text), knownBad: checks.filter((c) => !c.ok && known(c.text)).map((c) => c.text), ok: checks.filter((c) => c.ok).map((c) => c.text), want,
          outline: (layout === "assignment" ? r.paper.chapters.flatMap((c) => c.sections) : r.paper.sections).map((x) => (x.title || "—") + ": " + x.items.filter((y) => y.type !== "ar_intro").map((y) => String(y.q || y.assertion || y.passage || (y.blocks && y.blocks[0] && y.blocks[0].parts && y.blocks[0].parts[0].text) || "").replace(/[*_^~\\]/g, "").slice(0, 28)).join(" | ")),
          problems: r.problems.map((p) => (p.i >= 0 ? `line ${p.i + 1}: ` : "") + p.msg), warnings: r.warnings, docx: btoa(bin) });
      } catch (err) { put({ f, layout, error: String(err && err.stack || err) }); }
    }
    // The check on itself: a paper spoilt on purpose (an option gone, a word changed, a question twice) must be caught.
    try {
      const read = await PD.read(await (await real("tools/papers/" + encodeURIComponent(files.find((x) => /\.docx$/i.test(x)) || "messy.docx"))).arrayBuffer());
      const labels = Q.rules(read.lines, "normal"), r = Q.assemble(read, labels, "normal"), P = JSON.parse(JSON.stringify(r.paper));
      const items = P.sections.flatMap((x) => x.items).filter((x) => x.q);
      const withOpts = items.find((x) => (x.blocks || []).some((b) => b.options && b.options.length > 1));
      if (withOpts) withOpts.blocks.find((b) => b.options).options.pop();
      items[1].q = items[1].q.replace(/[A-Za-z]{4,}/, "Changed");
      P.sections[P.sections.length - 1].items.push(JSON.parse(JSON.stringify(items[0])));
      const v = await Q.verify(read, P, labels, r, "normal"), bad = v.checks.filter((c) => !c.ok).map((c) => c.text);
      const caught = bad.some((t) => /missing/.test(t)) && bad.some((t) => /aren't in your file|twice/.test(t));
      put({ selftest: true, caught, bad });
    } catch (err) { put({ selftest: true, caught: false, bad: [String(err)] }); }
  } catch (err) { put({ error: String(err && err.stack || err) }); }
  const pre = document.createElement("pre"); pre.id = "ROUND"; pre.textContent = out.join("\n"); document.body.append(pre);
}, 1500));
setTimeout(() => { try { SJS.go("corner/paper"); } catch (e) {} }, 1000);
