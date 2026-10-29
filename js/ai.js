/* "Ask St. John's" and the portal helpers: quick answers, worked out in the browser from the
   school's own records and the question bank in faq.js. No AI service is called, so nothing
   here costs anything to run, and no record leaves the page. */
(function () {
  const S = window.SJS;
  const has = (q, re) => re.test(q);
  const lower = (s) => s.toLowerCase();
  const pct = (n) => n + "%";
  const subjIn = (q) => S.subjects.find((s) => q.includes(lower(s)) || (s === "Mathematics" && /\bmaths?\b/.test(q)) || (s === "Social Science" && /\bsst\b|social/.test(q)) || (s === "Science" && /\bsci\b/.test(q) && !/social/.test(q)));
  const studentIn = (q) => S.students.find((s) => q.includes(lower(s.first)) || q.includes(lower(s.name)));
  // The child, class and stage the page is showing.
  const C = () => S.EX.cur, P = () => S.EX.prev, LB = (k) => S.exLabel(k, (S.me && S.me.cls) || (S.focus && S.focus.cls));
  const cls = () => (S.focus ? S.focus.label : "VII-B");
  const myFees = () => (S.kidKey && S.kidFees ? S.kidFees(S.kidKey) : S.state.fees);
  const PTM = () => S.PHASE === "start" ? "Meet the Teacher on Saturday, 18 April, 9:00 AM – 11:30 AM" : S.PHASE === "end" ? "the report-card PTM on Saturday, 27 March, 9:00 AM – 12:30 PM" : "the PTM on Saturday, 31 October, 9:00 AM – 12:30 PM (half-yearly answer sheets will be shown)";
  const attLine = () => { const a = S.attSummary ? S.attSummary() : null; return a ? `<b>${a.pct}% present</b> school-wide (sample). Lowest: ${a.low ? a.low.label + " at " + a.lowPct + "%" : "none"}. ${a.waiting.length} section${a.waiting.length === 1 ? " has" : "s have"} not marked yet${a.waiting.length ? ": " + a.waiting.map((x) => x.label).join(", ") : ""}.` : ""; };
  const upcomingHolidays = () => Object.entries(S.HOLIDAYS).filter(([k]) => k >= S.todayKey).slice(0, 3);

  // ---------- Shared helpers ----------
  S.weekly = () => {
    const s = S.me, hy = s[C()];
    const sorted = [...S.subjects].sort((a, b) => hy[b] - hy[a]);
    const weak = S.subjects.map((x) => ({ x, gap: S.classAvg(C(), x) - hy[x] })).sort((a, b) => b.gap - a.gap)[0];
    const pending = S.cs.homework.filter((h) => !h.done);
    const fee = myFees().find((f) => !f.paid);
    // Last five school days (including today, if taken)
    let present = 0, days = 0, d = new Date(S.today);
    for (let i = 0; i < 12 && days < 5; i++, d = S.addDays(d, -1)) {
      const st = S.statusOn(s.roll, S.iso(d)); if (st === "H" || st === null) continue; days++; if (st === "P") present++;
    }
    return `${s.first} was present <b>${present} of ${days} days</b> this week.\n` +
      `${LB(C())} results are strongest in <b>${sorted[0]} (${hy[sorted[0]]}%)</b> and <b>${sorted[1]} (${hy[sorted[1]]}%)</b>.\n` +
      (weak.gap > 0 ? `<b>${weak.x} (${hy[weak.x]}%)</b> is below the class average of ${S.classAvg(C(), weak.x)}% — 15 minutes of reading aloud each day would help.\n` : "") +
      (pending.length ? `Still to do: ${pending.map((h) => `${h.subj} — ${h.title} (due ${S.fmt(h.due)})`).join("; ")}.\n` : "All homework is done.\n") +
      (fee ? `The ${fee.q.split(" ·")[0]} fee of <b>${S.rupee(fee.amount)}</b> is due on ${S.fmt(fee.due)}.` : "All fees are paid. Thank you!");
  };

  S.remarkFor = (s) => {
    const hy = s[C()], ut = P() ? s[P()] : hy, att = S.attendancePct(s.roll);
    const best = [...S.subjects].sort((a, b) => hy[b] - hy[a]).slice(0, 2);
    const worst = [...S.subjects].sort((a, b) => hy[a] - hy[b])[0];
    const up = S.subjects.filter((x) => hy[x] - ut[x] >= 5).sort((a, b) => (hy[b] - ut[b]) - (hy[a] - ut[a]))[0];
    const down = S.subjects.filter((x) => ut[x] - hy[x] >= 10)[0];
    const openers = ["is a sincere and attentive learner", "brings curiosity and steady effort to class", "is a cheerful member of the class who works with care", "participates well and is keen to learn"];
    let t = `${s.first} ${openers[s.roll % openers.length]}, doing especially well in ${best[0]} (${hy[best[0]]}%) and ${best[1]} (${hy[best[1]]}%). `;
    if (up) t += `Good progress in ${up} this term (${ut[up]}% → ${hy[up]}%). `;
    if (down) t += `${down} slipped after the ${LB(P() || C()).toLowerCase()} (${ut[down]}% → ${hy[down]}%); revising each chapter's exercises at home will help. `;
    else if (hy[worst] < 70) t += `More regular practice in ${worst} will help reach full potential. `;
    t += att >= 92 ? `Attendance is excellent (${att}%).` : att >= 85 ? `Attendance is satisfactory (${att}%).` : `Attendance (${att}%) needs to improve; frequent absence is affecting continuity.`;
    return t;
  };

  const BANK = {
    integers: ["Add: (−17) + 9", "Subtract: 12 − (−8)", "Find the product: (−6) × (−7) × 2", "The temperature at 6 AM was −4 °C and rose by 9 °C by noon. What was the noon temperature?", "Fill in: (−48) ÷ ___ = 6", "Arrange in ascending order: −3, 5, −11, 0, 2", "A lift goes 3 floors down from the ground floor, then 7 floors up. Which floor is it on?", "True or false: the product of three negative integers is positive. Explain."],
    fractions: ["Simplify: 3/4 + 5/6", "Find 2/3 of 45", "Which is greater: 5/8 or 7/12?", "Multiply: 2¼ × 1⅓", "Riya ate 3/8 of a pizza and Dev ate 1/4. How much is left?", "Divide: 7/9 ÷ 14/27", "Convert 2.35 into a fraction in lowest terms.", "A rope 7½ m long is cut into pieces of ¾ m. How many pieces?"],
    equations: ["Solve: 3x + 7 = 22", "Solve: x/4 − 2 = 5", "Write an equation: 'Five more than twice a number is 19.' Solve it.", "Solve: 2(y − 3) = 14", "The sum of three consecutive numbers is 51. Find them.", "Check whether x = 4 is a solution of 5x − 3 = 17."],
    triangles: ["Two angles of a triangle are 48° and 67°. Find the third.", "Can a triangle have sides 3 cm, 4 cm and 8 cm? Why?", "Find the hypotenuse of a right triangle with legs 6 cm and 8 cm.", "An exterior angle of a triangle is 110° and one interior opposite angle is 45°. Find the other.", "Name the triangle whose all angles are less than 90°.", "Draw a triangle and mark its medians and centroid."]
  };
  const KEY = {
    integers: ["−8", "20", "84", "5 °C", "−8", "−11, −3, 0, 2, 5", "4th floor (−3 + 7 = 4)", "False — three negatives give a negative product, e.g. (−1)(−1)(−1) = −1"],
    fractions: ["19/12 = 1 7/12", "30", "5/8 (0.625 > 0.583)", "3", "3/8", "3/2 = 1½", "47/20", "10 pieces"],
    equations: ["x = 5", "x = 28", "2x + 5 = 19, so x = 7", "y = 10", "16, 17, 18", "Yes: 5 × 4 − 3 = 17"],
    triangles: ["65°", "No — 3 + 4 is less than 8", "10 cm", "65°", "An acute-angled triangle", "The centroid is where the three medians meet"]
  };
  const topicIn = (q) => /fraction|decimal/.test(q) ? "fractions" : /equation|solve|algebra/.test(q) ? "equations" : /triangle|angle|pythag/.test(q) ? "triangles" : "integers";
  const topicName = { integers: "Integers", fractions: "Fractions & Decimals", equations: "Simple Equations", triangles: "Triangles & their Properties" };
  S.practice = (topic, n) => { const t = topicIn(lower(topic)); return { name: topicName[t], qs: BANK[t].slice(0, n) }; };

  // ---------- Brains by role ----------
  const brains = {
    public(q) {
      if (has(q, /alum|old student|studied (here|at)|ex-student|passed out/))
        return "Welcome back! Send the school your name, the year you finished and what you're doing now, from the Contact page. The office will add you to the alumni list and invite you to Annual Day.";
      if (has(q, /document|certificate|paper|proof|tc\b|transfer/))
        return "Documents needed for admission:\n• Date of birth certificate\n• Residence proof\n• 1 passport photo of the child, and 1 of each parent with the child\n• Class XI: original Transfer Certificate and Class IX result (provisional), then the Class X mark sheet once CBSE results are out\nPlease bring originals for verification along with photocopies.";
      if (has(q, /xi\b|11|eleven|stream|commerce|humanities|science stream/))
        return "Class XI admission is <b>provisional</b>, based on the Class IX result. It is confirmed once the Class X CBSE result and pass certificate are submitted — if a student does not pass Class X, the provisional seat is cancelled automatically.\nFor the streams on offer this year, the admissions office will confirm when they call you back.";
      if (has(q, /admi|seat|apply|enquir|form|join|nursery|vacanc/))
        return "Admissions for <b>Nursery</b> and <b>Class XI</b> are open for enquiry.\n• Nursery: selected students are listed on the notice board at the school reception.\n• Admission is on merit, and is valid once all documents are submitted.\n• Fill the enquiry form on the Admissions page and pick a day — the office calls you back to confirm your campus visit.";
      if (has(q, /fee|cost|charges|expens/))
        return "St. John's follows <b>CBSE norms for fees</b>. The office shares the current fee structure for your child's class when they call you after an enquiry.\n(Once the school uploads the fee schedule, I will answer this with exact amounts.)";
      if (has(q, /cbse|board|affiliat|icse/)) return "St. John's School is a <b>CBSE</b> school, from Nursery to Class XII.";
      if (has(q, /found|histor|since|1965|old|who start|trust|t\.?i\.? john/))
        return "St. John's was founded in <b>1965</b> by <b>Shri T.I. John</b> and is run by the <b>Idicula Trust Society (Regd.)</b>. Sixty years on, it sits on a green <b>4-acre campus</b> in Sector 7A, Faridabad. Motto: <i>Learn to serve.</i>";
      if (has(q, /where|address|locat|reach|map|direction/))
        return "We're in <b>Sector 7A, Faridabad</b>, Haryana. The Contact page has a map and directions.";
      if (has(q, /facilit|campus|sport|lab|library|music|band|dance|activit|fit india/))
        return "Life at St. John's goes well beyond the classroom: a green 4-acre campus, school band, choir and music, Indian and folk dance, sports and the <b>Fit India</b> programme, plus annual day and inter-house events. Have a look at the photos on the Student life page.";
      if (has(q, /time|timing|hour|open|close|when does/))
        return "School timings:\n• Nursery & KG (Mon–Fri): summer 8:35 AM – 12:55 PM, winter 9:00 AM – 1:20 PM\n• Classes I – XII (Mon–Sat): summer 7:35 AM – 1:45 PM, winter 8:05 AM – 2:15 PM\n• Fee counter: Mon–Fri 8:15 AM – 12:00 PM, Sat 8:15 – 10:30 AM";
      if (has(q, /bus|transport|van|route/))
        return "School transport covers routes across Faridabad. The route list and stops will appear here once the school adds them; parents already enrolled can see their child's bus live in the parent app.";
      if (has(q, /contact|phone|call|email|number/)) return "You can reach the school office through the Contact page, or leave your number in the admissions form and the office will call you back.";
      if (has(q, /vision|mission|motto|value/))
        return "Motto: <b>Learn to serve.</b>\nVision: nurture each child's potential and create lifelong learners and global citizens with innovation and strong values — <i>\"Vision with action can build the future.\"</i>\nMission: honesty, compassion, secularism, tolerance and respect, with pride in the nation's heritage.";
      if (has(q, /^(hi|hello|hey|namaste)/)) return "Hello! Ask me anything about admissions, documents, the campus or school life at St. John's.";
      return "I don't have that answer yet. Send your question from the <b>Contact</b> page, or the <b>admissions form</b> for admission questions, and the school office will get back to you.";
    },

    parent(q) {
      const s = S.me;
      if (has(q, /week|summary|overall|how is|how's|doing/)) return S.weekly();
      if (has(q, /attend|absent|present|leave|miss/)) {
        const t = S.statusOn(s.roll, S.todayKey);
        const month = Object.keys(S.history).filter((k) => k.slice(0, 7) === S.todayKey.slice(0, 7) && S.history[k][s.roll]);
        return `Overall attendance this session: <b>${S.attendancePct(s.roll)}%</b> (CBSE needs 75% to sit the board exam in Class X; ${S.attendancePct(s.roll) >= 75 ? s.first + " is well above it" : s.first + " is below it"}).\n` +
          `This month: ${month.length ? month.length + " day(s) away — " + month.map((k) => S.fmt(k)).join(", ") : "no absences"}.\n` +
          `Today: ${t === null ? "the class teacher has not marked attendance yet" : t === "P" ? "<b>present</b>" : t === "L" ? "<b>on leave</b>" : "<b>marked absent</b>"}.`;
      }
      const subj = subjIn(q);
      if (subj) {
        const e = S.entry(S.focusKey, subj), u2 = S.PHASE !== "end" && e.published && e.marks[s.roll] != null && !isNaN(+e.marks[s.roll]) ? `\n${S.ENTRY.name} (just published): <b>${e.marks[s.roll]}/${S.ENTRY.max}</b>.` : "";
        return `${subj}: ${P() ? `${LB(P())} <b>${s[P()][subj]}%</b> → ` : ""}${LB(C())} <b>${s[C()][subj]}%</b> (class average ${S.classAvg(C(), subj)}%).${u2}\n` +
          (s[C()][subj] >= S.classAvg(C(), subj) ? s.first + " is above the class average here. 👍" : "This is below the class average. A short daily practice and a chat with the subject teacher at " + PTM() + " would help.");
      }
      if (has(q, /weak|improve|help|struggl|focus|concern|work on/)) {
        const w = S.subjects.map((x) => ({ x, gap: S.classAvg(C(), x) - s[C()][x] })).sort((a, b) => b.gap - a.gap)[0];
        return `The subject to focus on is <b>${w.x}</b> — ${s[C()][w.x]}% against a class average of ${S.classAvg(C(), w.x)}%${P() ? `, after ${s[P()][w.x]}% in the ${LB(P()).toLowerCase()}` : ""}.\nSuggestions:\n• 15 minutes with the ${w.x} textbook each evening\n• Practise the end-of-chapter exercises\n• Raise it with the teacher at ${PTM()}`;
      }
      if (has(q, /mark|result|score|exam|grade|perform|report/)) {
        const avg = S.avgOf(s[C()]);
        return `${LB(C())} average: <b>${avg}%</b>${P() ? ` (${LB(P())}: ${S.avgOf(s[P()])}%)` : ""}.\n` + S.subjects.map((x) => `• ${x}: ${s[C()][x]}%`).join("\n");
      }
      if (has(q, /bag|pack|timetable|period|tomorrow.*(class|subject)|subjects tomorrow/)) {
        const nd = S.nextSchoolDay(S.today, 1), tt = S.timetable[nd.getDay()];
        return `${S.fmtLong(nd)} — pack for:\n` + [...new Set(tt)].filter((x) => !/Games|Library|Assembly/.test(x)).map((x) => "• " + x).join("\n") + (tt.includes("Games") ? "\n(Games period — sports shoes.)" : "");
      }
      if (has(q, /homework|assign|due|project|worksheet|tomorrow/)) {
        const p = S.cs.homework.filter((h) => !h.done);
        return p.length ? "Pending homework:\n" + p.map((h) => `• <b>${h.subj}</b> — ${h.title} (due ${S.fmt(h.due, { weekday: "short", day: "numeric", month: "short" })})`).join("\n") : "All homework is done. 🎉";
      }
      if (has(q, /fee|pay|due amount|instal/)) {
        const f = myFees().find((x) => !x.paid);
        return f ? `The <b>${f.q}</b> instalment of <b>${S.rupee(f.amount)}</b> is due on ${S.fmt(f.due)}. You can pay by UPI from the Fees tab and get the receipt instantly.` : "All fee instalments due so far are paid. Thank you!";
      }
      if (has(q, /bus|van|transport|where is|reach/)) return s.bus === "Own transport" ? `${s.first} comes to school by your own transport. The office keeps the names of the adults who may pick up.` : `${s.first}'s bus is <b>${s.bus}</b>. On school days you can watch it move stop by stop on the Home tab, and you get a notification two stops before yours.`;
      if (has(q, /ptm|meeting|teacher|class teacher/)) return `Class teacher: <b>${S.teacher.name}</b>. Coming up: <b>${PTM()}</b>. You can message the teacher from the Messages tab.`;
      if (has(q, /holiday|closed|off|chutti|vacation/)) return "Coming holidays:\n" + upcomingHolidays().map(([k, v]) => `• ${S.fmt(k, { weekday: "short", day: "numeric", month: "short" })} — ${v}`).join("\n");
      return "I can tell you about " + s.first + "'s attendance, marks, homework, fees, bus, timetable and school notices. For anything else, I'll pass your question to " + S.teacher.name + ".";
    },

    teacher(q, ctx) {
      const st = studentIn(q);
      if (ctx.topic && has(q, /answer|key|solution/)) {
        const t = ctx.topic;
        return `Answer key — <b>${topicName[t]}</b>\n` + KEY[t].slice(0, 6).map((x, i) => `${i + 1}. ${x}`).join("\n");
      }
      if (has(q, /remark|report card|comment|feedback/)) {
        if (!st) return `Which student? Try: “Remarks for ${S.students[0].first}” — or use the Report-card remarks tool in Writing help to draft all ${S.students.length} at once.`;
        return `Draft remark for <b>${st.name}</b> (edit before saving):\n\n${S.remarkFor(st)}`;
      }
      if (has(q, /quiz|question|paper|worksheet|test|practice/)) {
        const t = (ctx.topic = topicIn(q));
        return `Practice set — <b>Class VII Maths: ${topicName[t]}</b>\n` + BANK[t].slice(0, 6).map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n\nWant the answer key?";
      }
      if (has(q, /lesson|plan|teach/)) {
        const t = topicName[topicIn(q)];
        return `40-minute plan — <b>${t}</b>\n• 5 min: warm-up question on the board\n• 10 min: concept with a number-line / real-life example\n• 15 min: pairs solve 4 questions from the practice set\n• 7 min: two pairs present; correct common mistakes\n• 3 min: exit ticket — one question in the notebook`;
      }
      if (has(q, /note|parents|notice|ptm|meeting/)) return `Draft note to ${cls()} parents:\n\nDear parents, please come to <b>${PTM()}</b>. If you can't come, reply here and we'll find another time.\n— ${(S.staff ? S.staff.name : S.teacher.name).replace(/^(Mr|Mrs|Ms)\.\s*/, "")}\n\nEdit it, then send it from AI assist → Note to parents.`;
      if (has(q, /risk|attention|struggl|weak|concern|worr|follow/)) {
        const list = S.atRisk();
        return `<b>${list.length} students</b> need attention in ${cls()}:\n` + list.map((x) => `• <b>${x.s.name}</b> — ${x.why.join("; ")}`).join("\n") + "\n\nI can draft a note to each parent, or book them first at the PTM.";
      }
      if (has(q, /absent|attendance|present/)) {
        const t = S.cs.attendance[S.todayKey];
        const chronic = S.students.filter((s) => S.attendancePct(s.roll) < 85);
        return (t ? `Today: ${S.students.length - Object.keys(t.marks).length}/${S.students.length} present.` + (Object.keys(t.marks).length ? " Away: " + Object.keys(t.marks).map((r) => S.student(r).name).join(", ") + "." : "") : "Today's attendance is not marked yet.") +
          `\nBelow 85% this session: ${chronic.map((s) => `${s.name} (${S.attendancePct(s.roll)}%)`).join(", ") || "nobody"}.`;
      }
      if (st) return `<b>${st.name}</b> (Roll ${st.roll}) — attendance ${S.attendancePct(st.roll)}%, ${LB(C()).toLowerCase()} average ${S.avgOf(st[C()])}%.\nBest: ${[...S.subjects].sort((a, b) => st[C()][b] - st[C()][a])[0]}. Weakest: ${[...S.subjects].sort((a, b) => st[C()][a] - st[C()][b])[0]}.`;
      if (has(q, /average|top|class perform|rank|best/)) {
        const top = [...S.students].sort((a, b) => S.avgOf(b[C()]) - S.avgOf(a[C()])).slice(0, 3);
        return LB(C()) + " class averages:\n" + S.subjects.map((x) => `• ${x}: ${S.classAvg(C(), x)}%`).join("\n") + `\nTop three: ${top.map((s) => `${s.name} (${S.avgOf(s[C()])}%)`).join(", ")}.`;
      }
      return "I can draft report-card remarks, make practice sets and lesson plans, draft notes to parents, and tell you who needs attention. Try: “Quiz on fractions” or “Remarks for Kabir”.";
    },

    principal(q) {
      const enq = S.state.enquiries;
      if (has(q, /admi|enquir|nursery|xi/)) {
        const byCls = enq.reduce((m, e) => ((m[e.cls] = (m[e.cls] || 0) + 1), m), {});
        return `<b>${enq.length} admission enquiries</b> so far: ` + Object.entries(byCls).map(([k, v]) => `${k} ${v}`).join(", ") + `.\n${enq.filter((e) => e.status === "New").length} are new and waiting for a call from the office.`;
      }
      if (has(q, /fee|collect|pending|defaul|due/)) { const f = S.FEE_NOW; return `${f.q} fees (sample): <b>${f.got} collected of ${f.of}</b> (${f.pct}%). ${f.families} families still to pay; due date ${S.fmt(f.due)}. Reminders go out automatically 7 days and 1 day before.`; }
      if (has(q, /risk|attention|concern|struggl/)) return `Across the school (sample), <b>46 students</b> are flagged — 19 for attendance below 85%, 27 for a drop of 15+ points since Unit Test 1. In VII-B: ${S.atRisk().map((x) => x.s.first).join(", ")}.`;
      if (has(q, /attend|absent|present/)) return "Today: " + attLine();
      if (has(q, /staff|teacher/)) return "Staff today (sample): 84 of 88 present. 2 on leave, 2 on duty at the CBSE zonal meet. Substitutions are arranged for 6 periods.";
      return S.brief().replace(/<li>/g, "• ").replace(/<\/li>/g, "\n").replace(/<\/?ul>/g, "");
    }
  };

  S.brief = () => {
    const a = S.attSummary(), f = S.FEE_NOW, enq = S.state.enquiries, enqNew = enq.filter((e) => e.status === "New").length;
    const att = `<li><b>Attendance</b> is ${a.pct}% school-wide (sample); ${a.low ? a.low.label + " is lowest at " + a.lowPct + "%" : "every section is in"}. ${a.waiting.length ? a.waiting.map((x) => x.label).join(", ") + (a.waiting.length > 1 ? " have" : " has") + " not marked yet." : "Every section has marked."}</li>`;
    const fee = `<li><b>${f.q} fees</b> are ${f.pct}% collected; ${f.families} families still to pay${S.PHASE === "end" ? "" : ", due " + S.fmt(f.due)}.</li>`;
    if (S.PHASE === "start") return `<ul>${att}<li><b>The session is a week old.</b> Every section has a class teacher and a timetable; ${enq.length} transfer enquiries are open.</li>${fee}<li><b>Meet the class teacher</b> is on Saturday, 18 April. ${S.atRisk().length} VII-B students carry a flag from last session.</li></ul>`;
    if (S.PHASE === "end") {
      const all = S.allSections().filter((x) => x.ci >= 3), st = all.map(S.secStats);
      const pass = Math.round((st.reduce((t, v) => t + v.pass * v.n, 0) / st.reduce((t, v) => t + v.n, 0)) * 10) / 10;
      return `<ul><li><b>Results are out today.</b> ${pass}% of students in Classes I to XII passed every subject (sample); report cards go out at the PTM tomorrow.</li><li><b>Board exams</b> for Classes X and XII run until 4 April; results come in May.</li>${fee}<li><b>Admissions 2027–28:</b> ${enq.filter((e) => e.status === "Admitted").length} admitted, ${enqNew} new enquiries to call back. The new session begins on 1 April.</li></ul>`;
    }
    return `<ul>${att}<li><b>${enqNew} new admission enquiries</b> waiting for a call — ${enq.filter((e) => e.cls === "Nursery").length} of all enquiries are for Nursery.</li>${fee}<li><b>${S.atRisk().length} students in VII-B</b> are flagged by the class teacher's assistant — worth a look before the PTM on 31 Oct.</li></ul>`;
  };

  const plain = (h) => h.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "");

  // ---------- Widget ----------
  const ICON = {
    ask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M9.8 7.7a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.4v.3M12 13.6v.01"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  S.ICON = Object.assign(S.ICON || {}, ICON);

  const META = {
    public: { title: "Ask St. John's", sub: "Admissions, campus, school life", hello: "Hello! Pick a question below about admissions, documents, the campus or school life.", chips: ["How do I apply for Nursery?", "Documents needed", "Class XI admission", "Fees", "School timings", "Is it CBSE?", "Bus service", "Where is the school?", "Contact the office"] },
    parent: { title: "Ask about Aarav", sub: "Sees only Aarav's records", hello: "Hello! Pick a question below about Aarav — attendance, marks, homework, fees or holidays.", chips: ["How is Aarav doing?", "What should we work on?", "Homework due", "What to pack tomorrow?", "Attendance", "Maths marks", "Fees due", "Coming holidays"] },
    teacher: { title: "Ask about your class", sub: "VII-B · your classes only", hello: "Pick a question below: who needs attention, remarks, quizzes and notes to parents, all from your class records.", chips: ["Who needs attention?", "Quiz on fractions", "Remarks for Ishita", "Lesson plan: integers", "Note about the PTM"] },
    principal: { title: "Ask about the school", sub: "Whole-school view", hello: "Pick a question below: today's brief, attendance, fees or admissions, from the school's records.", chips: ["Today's brief", "Admission enquiries", "Fee collection", "Who needs attention?", "Staff today"] }
  };

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  S.mountAI = (mode) => {
    const m = JSON.parse(JSON.stringify(META[mode]).split("Aarav").join(S.me ? S.me.first : "Aarav").split("VII-B").join(cls()).split("Ishita").join(S.students[0] ? S.students[10 % S.students.length].first : "Ishita"));
    const fab = document.createElement("button");
    fab.className = "ai-fab"; fab.type = "button";
    fab.innerHTML = ICON.ask + `<span>${m.title}</span>`;
    fab.setAttribute("aria-label", m.title);
    const panel = document.createElement("div");
    panel.className = "ai-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", m.title);
    const pub = mode === "public", TOP = S.FAQ_TOPICS || [];
    const FAQ = S.FAQ || [];
    // What the search box can find: this portal's own questions first, then the whole-website bank.
    const pool = (pub ? [] : m.chips.map((c) => ({ q: c, k: "", own: true }))).concat(FAQ);
    const sparks = Array.from({ length: 7 }, (_, i) => `<i style="--x:${8 + i * 13}%;--d:${(i * 0.9) % 5}s;--s:${0.6 + (i % 3) * 0.25}"></i>`).join("");
    panel.innerHTML = `<div class="ai-head"><span class="ai-sparks" aria-hidden="true">${sparks}</span><span class="av">${ICON.ask}<u></u></span><div><b>${m.title}</b><span class="ai-sub"><span class="ai-dot"></span><span class="ai-rot">${m.sub}</span></span></div><button class="icon-btn" type="button" aria-label="Close">${ICON.x}</button></div>
      <div class="ai-log" aria-live="polite"></div>
      <div class="ai-sugg" role="listbox" aria-label="Matching questions"></div>
      <div class="ai-topics">${pub ? TOP.map(([t, e], i) => `<button type="button" data-t="${esc(t)}" style="--i:${i}"><span>${e}</span>${esc(t)}</button>`).join("") : m.chips.map((c, i) => `<button type="button" data-q="${esc(c)}" style="--i:${i}">${esc(c)}</button>`).join("")}</div>
      <label class="ai-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" aria-label="Search questions" autocomplete="off" enterkeyhint="search" /><span class="ai-ph" aria-hidden="true"></span></label>
      <a class="ai-more" href="${pub ? "contact.html#message" : "#"}" data-more>Something else? Ask the school office ${ICON.send}</a>
      <div class="ai-foot"></div>`;
    // A little "psst" bubble by the button, once per visit, with a question people often ask.
    const tease = document.createElement("button");
    tease.type = "button"; tease.className = "ai-tease";
    const teaseQs = pub ? ["What are the fees?", "Which streams are offered in Class XI?", "Does the school have buses?", "What is the age for Nursery, LKG, UKG and Class I?"] : m.chips.slice(0, 3);
    tease.innerHTML = `<b>Psst… 👋</b> <span>${esc(teaseQs[0])}</span>`;
    document.body.append(fab, panel, tease);
    const log = panel.querySelector(".ai-log"), foot = panel.querySelector(".ai-foot");
    let greeted = false, busy = false;
    const hist = [], ctx = {}; // conversation so far, and what the built-in answers remember

    const add = (html, who) => { const d = document.createElement("div"); d.className = "msg " + who; d.innerHTML = html; log.append(d); log.scrollTop = log.scrollHeight; return d; };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sugg = panel.querySelector(".ai-sugg"), input = panel.querySelector(".ai-search input"), ph = panel.querySelector(".ai-ph");
    const hour = new Date().getHours(), hi = hour < 4 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const welcome = () => {
      const w = document.createElement("div"); w.className = "ai-hello";
      w.innerHTML = `<span class="wave" aria-hidden="true">👋</span><h4>${hi}!</h4><p>${m.hello}</p>` +
        (pub ? `<p class="ai-count"><b>${FAQ.length}</b> answers ready · pick a topic or just start typing</p><div class="ai-tiles">${TOP.slice(0, 6).map(([t, e], i) => `<button type="button" data-t="${esc(t)}" style="--i:${i}"><span>${e}</span>${esc(t)}</button>`).join("")}</div>` : "");
      log.append(w);
    };
    const open = () => { panel.classList.add("open"); fab.classList.add("hide"); tease.classList.remove("on"); if (!greeted) { welcome(); greeted = true; } };
    const close = () => { panel.classList.remove("open"); fab.classList.remove("hide"); hideSugg(); };

    // Footer: where the answers come from.
    foot.innerHTML = `${pub ? "Answers from the school's own information" : "Answers from your records"} · free, instant, private`;

    // Built-in answer, revealed a couple of words at a time, keeping tags whole.
    const reveal = (el, answer, note) => new Promise((done) => {
      setTimeout(() => {
        el.style.padding = ""; el.innerHTML = "";
        const parts = answer.split(/(<[^>]+>|\s+)/).filter(Boolean);
        let i = 0, html = "";
        const step = () => {
          for (let k = 0; k < 2 && i < parts.length; k++) html += parts[i++];
          el.innerHTML = html + (i >= parts.length && note ? `<span class="note">${note}</span>` : ""); log.scrollTop = log.scrollHeight;
          if (i < parts.length) setTimeout(step, 26); else done();
        };
        step();
      }, note ? 0 : 650 + Math.random() * 400);
    });

    // text is what gets answered; shown is what the visitor sees they asked (a translated chip, say).
    const ask = async (text, shown) => {
      text = text.trim();
      if (busy || !text) return;
      open(); busy = true;
      add(esc((shown || text).trim()), "me");
      const bubble = add('<span class="typing"><i></i><i></i><i></i></span>', "bot");
      bubble.style.padding = "0";
      hist.push({ role: "user", content: text });
      let answer = null, note = "";
      let item = null;
      {
        // A question from the bank answers from the bank; this portal's own questions from its records.
        item = FAQ.find((f) => f.q === text);
        const own = !pub && !item;
        const html = item ? S.faqAnswer(item) : own ? brains[mode](lower(text), ctx) : notFound();
        await reveal(bubble, html, note);
        answer = plain(html);
        if (item || own) related(item, bubble); else bubble.classList.add("miss");
      }
      hist.push({ role: "assistant", content: answer });
      busy = false;
    };
    const notFound = () => `Sorry, that information isn't available here yet. 🙏\nPlease reach out to the school office:\n• 📞 <b>${S.FAQ_PHONE ? S.FAQ_PHONE() : "0129 224 2097"}</b>\n• ✉️ ${S.FAQ_EMAIL ? S.FAQ_EMAIL() : "stjohnsschool@rediffmail.com"}\n<a class="ai-go" href="contact.html#message">Send the office a message →</a>`;
    // After an answer: a quick "helpful?" and three more from the same topic.
    const related = (item, bubble) => {
      const more = item ? FAQ.filter((f) => f.g === item.g && f !== item).sort(() => Math.random() - 0.5).slice(0, 3) : [];
      const d = document.createElement("div"); d.className = "ai-after";
      d.innerHTML = `<span class="ai-react">Helpful? <button type="button" data-r="up" aria-label="Yes">👍</button><button type="button" data-r="down" aria-label="No">👎</button></span>` +
        (more.length ? `<div class="ai-rel"><small>${esc(item.g)} · people also ask</small>${more.map((f, i) => `<button type="button" data-q="${esc(f.q)}" style="--i:${i}">${esc(f.q)}</button>`).join("")}</div>` : "");
      bubble.after(d); log.scrollTop = log.scrollHeight;
    };
    const confetti = (at) => {
      if (reduce) return;
      const r = at.getBoundingClientRect(), box = document.createElement("span"); box.className = "ai-confetti";
      box.style.left = r.left + r.width / 2 + "px"; box.style.top = r.top + "px";
      box.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 26}deg;--c:${["#C0392B", "#E2A53B", "#3B5BA5", "#3E8E5E"][i % 4]}"></i>`).join("");
      document.body.append(box); setTimeout(() => box.remove(), 900);
    };
    // Show a topic's questions as a bot message.
    const topic = (t) => {
      open(); hideSugg();
      const qs = FAQ.filter((f) => f.g === t), e = (TOP.find(([x]) => x === t) || [])[1] || "";
      add(esc(`${e} ${t}`), "me");
      const d = add(`Here's what I can tell you about <b>${esc(t.toLowerCase())}</b>:<div class="ai-rel">${qs.map((f, i) => `<button type="button" data-q="${esc(f.q)}" style="--i:${i}">${esc(f.q)}</button>`).join("")}</div>`, "bot");
      d.classList.add("pick");
    };

    fab.addEventListener("click", open);
    tease.addEventListener("click", () => { const q = tease.querySelector("span").textContent; open(); ask(q); });
    panel.querySelector(".ai-head .icon-btn").addEventListener("click", close);
    // Every button inside the chat: topics, suggested questions, reactions.
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || !panel.contains(b)) return;
      if (b.dataset.t) { topic(b.dataset.t); return; }
      if (b.dataset.q) { input.value = ""; hideSugg(); ask(b.dataset.q); return; }
      if (b.dataset.r) {
        const box = b.parentElement; if (box.classList.contains("done")) return;
        box.classList.add("done"); b.classList.add("on");
        if (b.dataset.r === "up") { confetti(b); box.insertAdjacentHTML("beforeend", "<em>Glad it helped!</em>"); }
        else box.insertAdjacentHTML("beforeend", `<em>Sorry! <a href="contact.html#message">Ask the office</a></em>`);
      }
    });
    // No AI behind the box: it searches the question bank as you type, so every answer is free.
    // Anything the bank can't answer goes to a person, the contact form here, the school office in the portals.
    panel.querySelector("[data-more]").addEventListener("click", (e) => { if (!pub) { e.preventDefault(); add("For anything else, message the school office from the <b>Messages</b> tab and they'll reply the same school day.", "bot"); } });

    // ---- The search box ----
    let hits = [], sel = 0;
    const mark = (q, typed) => { let h = esc(q); typed.toLowerCase().split(/\s+/).filter((w) => w.length > 1).forEach((w) => { h = h.replace(new RegExp(`(^|[\\s(])(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[a-z]*)`, "gi"), "$1<mark>$2</mark>"); }); return h; };
    function hideSugg() { sugg.classList.remove("on"); sugg.innerHTML = ""; hits = []; }
    const showSugg = () => {
      const v = input.value.trim();
      ph.classList.toggle("off", !!input.value);
      if (v.length < 2) { hideSugg(); return; }
      hits = S.faqSearch ? S.faqSearch(v, pool).slice(0, 5) : []; sel = 0;
      sugg.innerHTML = hits.length
        ? hits.map((h, i) => `<button type="button" role="option" data-q="${esc(h.item.q)}" style="--i:${i}"${i ? "" : ' class="sel"'}>${h.item.g ? `<span>${(TOP.find(([x]) => x === h.item.g) || [, "💬"])[1]}</span>` : "<span>💬</span>"}<em>${mark(h.item.q, v)}</em></button>`).join("")
        : `<p class="none">🤔 No match yet. Press Enter and I'll tell you who can help.</p>`;
      sugg.classList.add("on");
    };
    input.addEventListener("input", showSugg);
    input.addEventListener("focus", () => { ph.classList.add("off"); showSugg(); });
    input.addEventListener("blur", () => { if (!input.value) ph.classList.remove("off"); });
    input.addEventListener("keydown", (e) => {
      const btns = [...sugg.querySelectorAll("button")];
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && btns.length) {
        e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length;
        btns.forEach((b, i) => b.classList.toggle("sel", i === sel)); return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
      const v = input.value.trim(); if (!v) return;
      const pick = hits[sel] || (S.faqSearch ? S.faqSearch(v, pool)[0] : null);
      input.value = ""; hideSugg(); ph.classList.remove("off");
      if (pick) ask(pick.item.q);
      else { open(); add(esc(v), "me"); const d = add('<span class="typing"><i></i><i></i><i></i></span>', "bot"); d.style.padding = "0"; reveal(d, notFound()).then(() => d.classList.add("miss")); }
    });
    // The placeholder types out example questions, one after another.
    const EX = pub ? ["What are the fees?", "Is there a school bus?", "Age for Nursery", "Class XI streams", "School timings", "How do I get a TC?"] : m.chips;
    if (reduce) ph.textContent = "Search: " + EX[0];
    else { let n = 0, c = 0, back = false; const tick = () => { const w = EX[n]; if (!back) { c++; if (c > w.length) { back = true; return setTimeout(tick, 1600); } } else { c--; if (c === 0) { back = false; n = (n + 1) % EX.length; } } ph.textContent = "Try: " + w.slice(0, c); setTimeout(tick, back ? 28 : 65); }; tick(); }
    // The subtitle under the name rotates through what it can help with.
    const rot = panel.querySelector(".ai-rot"), subs = pub ? [m.sub, `${FAQ.length} answers, instantly`, "Fees · timings · buses · streams", "Free, and always here"] : [m.sub, "Answers from your records"];
    if (!reduce) { let r = 0; setInterval(() => { if (!panel.classList.contains("open")) return; r = (r + 1) % subs.length; rot.classList.add("swap"); setTimeout(() => { rot.textContent = subs[r]; rot.classList.remove("swap"); }, 250); }, 3800); }
    // The teaser bubble: shows once after a while, cycles a few questions, then goes.
    if (!reduce) setTimeout(() => {
      if (panel.classList.contains("open")) return;
      let t = 0; tease.classList.add("on");
      const iv = setInterval(() => { t++; if (t >= teaseQs.length || !tease.classList.contains("on")) { clearInterval(iv); tease.classList.remove("on"); return; } const sp = tease.querySelector("span"); sp.classList.add("swap"); setTimeout(() => { sp.textContent = teaseQs[t]; sp.classList.remove("swap"); }, 250); }, 3200);
    }, 7000);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
    S.ask = ask; S.openAI = open;
  };
})();
