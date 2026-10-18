/* "Ask St. John's" — the AI assistant.
   Prototype: answers are worked out from the demo data in data.js, so the
   demo runs offline. In the live build the same widget calls Claude through
   the school's server, which only passes it what that user may see. */
(function () {
  const S = window.SJS;
  const has = (q, re) => re.test(q);
  const lower = (s) => s.toLowerCase();
  const pct = (n) => n + "%";
  const subjIn = (q) => S.subjects.find((s) => q.includes(lower(s)) || (s === "Mathematics" && /\bmaths?\b/.test(q)) || (s === "Social Science" && /\bsst\b|social/.test(q)) || (s === "Science" && /\bsci\b/.test(q) && !/social/.test(q)));
  const studentIn = (q) => S.students.find((s) => q.includes(lower(s.first)) || q.includes(lower(s.name)));
  const upcomingHolidays = () => Object.entries(S.HOLIDAYS).filter(([k]) => k >= S.todayKey).slice(0, 3);

  // ---------- Shared helpers ----------
  S.weekly = (lang) => {
    const s = S.me, hy = s.hy;
    const sorted = [...S.subjects].sort((a, b) => hy[b] - hy[a]);
    const weak = S.subjects.map((x) => ({ x, gap: S.classAvg("hy", x) - hy[x] })).sort((a, b) => b.gap - a.gap)[0];
    const pending = S.state.homework.filter((h) => !h.done);
    const fee = S.state.fees.find((f) => !f.paid);
    // Last five school days (including today, if taken)
    let present = 0, days = 0, d = new Date(S.today);
    for (let i = 0; i < 12 && days < 5; i++, d = S.addDays(d, -1)) {
      const st = S.statusOn(s.roll, S.iso(d)); if (st === "H" || st === null) continue; days++; if (st === "P") present++;
    }
    if (lang === "hi") {
      return `इस हफ़्ते आरव की उपस्थिति <b>${days} में से ${present} दिन</b> रही।\n` +
        `अर्धवार्षिक परीक्षा में सबसे अच्छे अंक <b>${S.subjectsHi[sorted[0]]} (${hy[sorted[0]]}%)</b> और <b>${S.subjectsHi[sorted[1]]} (${hy[sorted[1]]}%)</b> में आए।\n` +
        (weak.gap > 0 ? `<b>${S.subjectsHi[weak.x]} (${hy[weak.x]}%)</b> कक्षा के औसत (${S.classAvg("hy", weak.x)}%) से थोड़ा कम है — रोज़ 15 मिनट ज़ोर से पढ़ने का अभ्यास मदद करेगा।\n` : "") +
        (pending.length ? `बाकी गृहकार्य: ${pending.map((h) => `${S.subjectsHi[h.subj] || h.subj} (${S.fmt(h.due)})`).join(", ")}।\n` : "सारा गृहकार्य पूरा है।\n") +
        (fee ? `तीसरी किस्त <b>${S.rupee(fee.amount)}</b> की अंतिम तिथि ${S.fmt(fee.due)} है।` : "सभी फ़ीस जमा है। धन्यवाद!");
    }
    return `Aarav was present <b>${present} of ${days} days</b> this week.\n` +
      `Half-yearly results are strongest in <b>${sorted[0]} (${hy[sorted[0]]}%)</b> and <b>${sorted[1]} (${hy[sorted[1]]}%)</b>.\n` +
      (weak.gap > 0 ? `<b>${weak.x} (${hy[weak.x]}%)</b> is below the class average of ${S.classAvg("hy", weak.x)}% — 15 minutes of reading aloud each day would help.\n` : "") +
      (pending.length ? `Still to do: ${pending.map((h) => `${h.subj} — ${h.title} (due ${S.fmt(h.due)})`).join("; ")}.\n` : "All homework is done.\n") +
      (fee ? `The ${fee.q.split(" ·")[0]} fee of <b>${S.rupee(fee.amount)}</b> is due on ${S.fmt(fee.due)}.` : "All fees are paid. Thank you!");
  };

  S.remarkFor = (s) => {
    const hy = s.hy, ut = s.ut1, att = S.attendancePct(s.roll);
    const best = [...S.subjects].sort((a, b) => hy[b] - hy[a]).slice(0, 2);
    const worst = [...S.subjects].sort((a, b) => hy[a] - hy[b])[0];
    const up = S.subjects.filter((x) => hy[x] - ut[x] >= 5).sort((a, b) => (hy[b] - ut[b]) - (hy[a] - ut[a]))[0];
    const down = S.subjects.filter((x) => ut[x] - hy[x] >= 10)[0];
    const openers = ["is a sincere and attentive learner", "brings curiosity and steady effort to class", "is a cheerful member of the class who works with care", "participates well and is keen to learn"];
    let t = `${s.first} ${openers[s.roll % openers.length]}, doing especially well in ${best[0]} (${hy[best[0]]}%) and ${best[1]} (${hy[best[1]]}%). `;
    if (up) t += `Good progress in ${up} this term (${ut[up]}% → ${hy[up]}%). `;
    if (down) t += `${down} slipped after Unit Test 1 (${ut[down]}% → ${hy[down]}%); revising each chapter's exercises at home will help. `;
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
  const topicIn = (q) => /fraction|decimal/.test(q) ? "fractions" : /equation|solve|algebra/.test(q) ? "equations" : /triangle|angle|pythag/.test(q) ? "triangles" : "integers";
  const topicName = { integers: "Integers", fractions: "Fractions & Decimals", equations: "Simple Equations", triangles: "Triangles & their Properties" };
  S.practice = (topic, n) => { const t = topicIn(lower(topic)); return { name: topicName[t], qs: BANK[t].slice(0, n) }; };

  // ---------- Brains by role ----------
  const brains = {
    public(q) {
      if (has(q, /alum|old student|studied (here|at)|ex-student|passed out/))
        return "Welcome back! Send the school your name, the year you finished and what you're doing now, from the Contact page. The office will add you to the alumni list and invite you to Annual Day.";
      if (/[\u0900-\u097F]/.test(q) || /\b(kya|kaise|kab|hai|chahiye|admission kab)\b/.test(q))
        return "नमस्ते! सेंट जॉन्स स्कूल, सेक्टर 7A, फ़रीदाबाद में <b>नर्सरी</b> और <b>कक्षा XI</b> के लिए दाख़िले की पूछताछ शुरू है।\n• दाख़िला मेरिट के आधार पर होता है।\n• ज़रूरी दस्तावेज़: जन्म प्रमाण-पत्र, निवास प्रमाण, बच्चे और माता-पिता की फ़ोटो।\n• दाख़िला पेज पर फ़ॉर्म भरें, स्कूल ऑफ़िस आपको कॉल करेगा।";
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
        return "The office will publish school and office timings here. Until then, please call the school office (number on the Contact page).";
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
      if (/[\u0900-\u097F]/.test(q) || has(q, /hindi me|in hindi|hindi mein/)) return S.weekly("hi");
      if (has(q, /week|summary|overall|how is|how's|doing/)) return S.weekly("en");
      if (has(q, /attend|absent|present|leave|miss/)) {
        const t = S.statusOn(s.roll, S.todayKey);
        const month = Object.keys(S.history).filter((k) => k.slice(0, 7) === S.todayKey.slice(0, 7) && S.history[k][s.roll]);
        return `Overall attendance this session: <b>${S.attendancePct(s.roll)}%</b> (CBSE needs 75% to sit the board exam in Class X; ${S.attendancePct(s.roll) >= 75 ? "Aarav is well above it" : "Aarav is below it"}).\n` +
          `This month: ${month.length ? month.length + " day(s) away — " + month.map((k) => S.fmt(k)).join(", ") : "no absences"}.\n` +
          `Today: ${t === null ? "the class teacher has not marked attendance yet" : t === "P" ? "<b>present</b>" : t === "L" ? "<b>on leave</b>" : "<b>marked absent</b>"}.`;
      }
      const subj = subjIn(q);
      if (subj) {
        const u2 = S.state.ut2Published && subj === "Mathematics" ? `\nUnit Test 2 (just published): <b>${S.state.ut2[s.roll] ?? "—"}/20</b>.` : "";
        return `${subj}: Unit Test 1 <b>${s.ut1[subj]}%</b> → Half-yearly <b>${s.hy[subj]}%</b> (class average ${S.classAvg("hy", subj)}%).${u2}\n` +
          (s.hy[subj] >= S.classAvg("hy", subj) ? "Aarav is above the class average here. 👍" : "This is below the class average. A short daily practice and a chat with the subject teacher at the PTM (31 Oct) would help.");
      }
      if (has(q, /weak|improve|help|struggl|focus|concern|work on/)) {
        const w = S.subjects.map((x) => ({ x, gap: S.classAvg("hy", x) - s.hy[x] })).sort((a, b) => b.gap - a.gap)[0];
        return `The subject to focus on is <b>${w.x}</b> — ${s.hy[w.x]}% against a class average of ${S.classAvg("hy", w.x)}%, and down from ${s.ut1[w.x]}% in Unit Test 1.\nSuggestions:\n• 15 minutes of reading aloud from the ${w.x} textbook each evening\n• Practise the question–answer exercises of chapters 4–6\n• Raise it with the teacher at the PTM on Saturday, 31 October`;
      }
      if (has(q, /mark|result|score|exam|grade|perform|report/)) {
        const avg = S.avgOf(s.hy);
        return `Half-yearly average: <b>${avg}%</b> (Unit Test 1: ${S.avgOf(s.ut1)}%).\n` + S.subjects.map((x) => `• ${x}: ${s.hy[x]}%`).join("\n");
      }
      if (has(q, /bag|pack|timetable|period|tomorrow.*(class|subject)|subjects tomorrow/)) {
        const nd = S.nextSchoolDay(S.today, 1), tt = S.timetable[nd.getDay()];
        return `${S.fmtLong(nd)} — pack for:\n` + [...new Set(tt)].filter((x) => !/Games|Library|Assembly/.test(x)).map((x) => "• " + x).join("\n") + (tt.includes("Games") ? "\n(Games period — sports shoes.)" : "");
      }
      if (has(q, /homework|assign|due|project|worksheet|tomorrow/)) {
        const p = S.state.homework.filter((h) => !h.done);
        return p.length ? "Pending homework:\n" + p.map((h) => `• <b>${h.subj}</b> — ${h.title} (due ${S.fmt(h.due, { weekday: "short", day: "numeric", month: "short" })})`).join("\n") : "All homework is done. 🎉";
      }
      if (has(q, /fee|pay|due amount|instal/)) {
        const f = S.state.fees.find((x) => !x.paid);
        return f ? `The <b>${f.q}</b> instalment of <b>${S.rupee(f.amount)}</b> is due on ${S.fmt(f.due)}. You can pay by UPI from the Fees tab and get the receipt instantly.` : "All fee instalments due so far are paid. Thank you!";
      }
      if (has(q, /bus|van|transport|where is|reach/)) return "Aarav's bus is <b>Route 14</b>. On school days you can watch it move stop by stop on the Home tab, and you get a notification two stops before yours.";
      if (has(q, /ptm|meeting|teacher|class teacher/)) return `Class teacher: <b>${S.teacher.name}</b>. Next PTM: <b>Saturday, 31 October, 9:00 AM – 12:30 PM</b> (half-yearly answer sheets will be shown). You can message the teacher from the Messages tab.`;
      if (has(q, /holiday|closed|off|chutti|vacation/)) return "Coming holidays:\n" + upcomingHolidays().map(([k, v]) => `• ${S.fmt(k, { weekday: "short", day: "numeric", month: "short" })} — ${v}`).join("\n");
      return "I can tell you about Aarav's attendance, marks, homework, fees, bus, timetable and school notices. For anything else, I'll pass your question to " + S.teacher.name + ".";
    },

    teacher(q) {
      const st = studentIn(q);
      if (has(q, /remark|report card|comment|feedback/)) {
        if (!st) return "Which student? Try: “Remarks for Ishita” — or use the Report-card remarks tool in AI Assist to draft all 32 at once.";
        return `Draft remark for <b>${st.name}</b> (edit before saving):\n\n${S.remarkFor(st)}`;
      }
      if (has(q, /quiz|question|paper|worksheet|test|practice/)) {
        const t = topicIn(q);
        return `Practice set — <b>Class VII Maths: ${topicName[t]}</b>\n` + BANK[t].slice(0, 6).map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n\nWant an answer key, or a harder version for the top group?";
      }
      if (has(q, /lesson|plan|teach/)) {
        const t = topicName[topicIn(q)];
        return `40-minute plan — <b>${t}</b>\n• 5 min: warm-up question on the board\n• 10 min: concept with a number-line / real-life example\n• 15 min: pairs solve 4 questions from the practice set\n• 7 min: two pairs present; correct common mistakes\n• 3 min: exit ticket — one question in the notebook`;
      }
      if (has(q, /translat|hindi|हिंदी/)) return "Hindi version of the PTM notice:\n\n<b>अभिभावक–शिक्षक बैठक</b>\nकक्षा VI–VIII के लिए अभिभावक–शिक्षक बैठक शनिवार, 31 अक्टूबर को सुबह 9:00 बजे से दोपहर 12:30 बजे तक होगी। अर्धवार्षिक परीक्षा की उत्तर-पुस्तिकाएँ दिखाई जाएँगी।";
      if (has(q, /risk|attention|struggl|weak|concern|worr|follow/)) {
        const list = S.atRisk();
        return `<b>${list.length} students</b> need attention in VII-B:\n` + list.map((x) => `• <b>${x.s.name}</b> — ${x.why.join("; ")}`).join("\n") + "\n\nI can draft a note to each parent, or book them first at the PTM.";
      }
      if (has(q, /absent|attendance|present/)) {
        const t = S.state.attendance[S.todayKey];
        const chronic = S.students.filter((s) => S.attendancePct(s.roll) < 85);
        return (t ? `Today: ${32 - Object.keys(t.marks).length}/32 present.` + (Object.keys(t.marks).length ? " Away: " + Object.keys(t.marks).map((r) => S.student(r).name).join(", ") + "." : "") : "Today's attendance is not marked yet.") +
          `\nBelow 85% this session: ${chronic.map((s) => `${s.name} (${S.attendancePct(s.roll)}%)`).join(", ") || "nobody"}.`;
      }
      if (st) return `<b>${st.name}</b> (Roll ${st.roll}) — attendance ${S.attendancePct(st.roll)}%, half-yearly average ${S.avgOf(st.hy)}%.\nBest: ${[...S.subjects].sort((a, b) => st.hy[b] - st.hy[a])[0]}. Weakest: ${[...S.subjects].sort((a, b) => st.hy[a] - st.hy[b])[0]}.`;
      if (has(q, /average|top|class perform|rank|best/)) {
        const top = [...S.students].sort((a, b) => S.avgOf(b.hy) - S.avgOf(a.hy)).slice(0, 3);
        return "Half-yearly class averages:\n" + S.subjects.map((x) => `• ${x}: ${S.classAvg("hy", x)}%`).join("\n") + `\nTop three: ${top.map((s) => `${s.name} (${S.avgOf(s.hy)}%)`).join(", ")}.`;
      }
      return "I can draft report-card remarks, make practice sets and lesson plans, translate notices into Hindi, and tell you who needs attention. Try: “Quiz on fractions” or “Remarks for Kabir”.";
    },

    principal(q) {
      const enq = S.state.enquiries;
      if (has(q, /admi|enquir|nursery|xi/)) {
        const byCls = enq.reduce((m, e) => ((m[e.cls] = (m[e.cls] || 0) + 1), m), {});
        return `<b>${enq.length} admission enquiries</b> so far: ` + Object.entries(byCls).map(([k, v]) => `${k} ${v}`).join(", ") + `.\n${enq.filter((e) => e.status === "New").length} are new and waiting for a call from the office.`;
      }
      if (has(q, /fee|collect|pending|defaul|due/)) return "Q3 fees (sample): <b>₹1.92 Cr collected of ₹2.74 Cr</b> (70%). 612 families still to pay; due date is " + S.fmt(S.state.fees[2].due) + ". Reminders go out automatically 7 days and 1 day before.";
      if (has(q, /risk|attention|concern|struggl/)) return `Across the school (sample), <b>46 students</b> are flagged — 19 for attendance below 85%, 27 for a drop of 15+ points since Unit Test 1. In VII-B: ${S.atRisk().map((x) => x.s.first).join(", ")}.`;
      if (has(q, /attend|absent|present/)) return "Today (sample): <b>93.4% present</b> school-wide. Lowest: Class IX-C at 86%. 4 classes have not marked attendance yet." + (S.state.attendance[S.todayKey] ? "" : " VII-B is one of them.");
      if (has(q, /staff|teacher/)) return "Staff today (sample): 84 of 88 present. 2 on leave, 2 on duty at the CBSE zonal meet. Substitutions are arranged for 6 periods.";
      return S.brief().replace(/<li>/g, "• ").replace(/<\/li>/g, "\n").replace(/<\/?ul>/g, "");
    }
  };

  S.brief = () => {
    const t = S.state.attendance[S.todayKey];
    const enqNew = S.state.enquiries.filter((e) => e.status === "New").length;
    return `<ul><li><b>Attendance</b> is 93.4% school-wide (sample); IX-C is lowest at 86%. ${t ? "VII-B marked at " + t.at + "." : "VII-B and 3 other sections have not marked yet."}</li>` +
      `<li><b>${enqNew} new admission enquiries</b> waiting for a call — ${S.state.enquiries.filter((e) => e.cls === "Nursery").length} of all enquiries are for Nursery.</li>` +
      `<li><b>Q3 fees</b> are 70% collected; due date ${S.fmt(S.state.fees[2].due)}.</li>` +
      `<li><b>${S.atRisk().length} students in VII-B</b> are flagged by the class teacher's assistant — worth a look before the PTM on 31 Oct.</li></ul>`;
  };

  // ---------- Widget ----------
  const ICON = {
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  S.ICON = Object.assign(S.ICON || {}, ICON);

  const META = {
    public: { title: "Ask St. John's", sub: "Admissions, campus, school life", hello: "Namaste! I'm the St. John's assistant. Ask me about admissions, documents, the campus — in English or Hindi.", chips: ["How do I apply for Nursery?", "Documents needed", "Class XI admission", "Is it CBSE?", "दाख़िला कैसे होगा?"] },
    parent: { title: "Ask about Aarav", sub: "Sees only Aarav's records", hello: "Hello! Ask me anything about Aarav — attendance, marks, homework, fees or the bus.", chips: ["How is Aarav doing?", "What should we work on?", "Homework due", "What to pack tomorrow?", "Maths marks", "हिंदी में बताइए"] },
    teacher: { title: "Teaching assistant", sub: "VII-B · your classes only", hello: "Good morning! I can draft remarks, make practice sets, translate notices and spot who needs help.", chips: ["Who needs attention?", "Quiz on fractions", "Remarks for Ishita", "Lesson plan: integers", "Translate PTM notice"] },
    principal: { title: "School assistant", sub: "Whole-school view", hello: "Good morning. Ask for today's brief, attendance, fees or admissions.", chips: ["Today's brief", "Admission enquiries", "Fee collection", "Who needs attention?", "Staff today"] }
  };

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  S.mountAI = (mode) => {
    const m = META[mode];
    const fab = document.createElement("button");
    fab.className = "ai-fab"; fab.type = "button";
    fab.innerHTML = ICON.spark + `<span>${m.title}</span>`;
    fab.setAttribute("aria-label", m.title);
    const panel = document.createElement("div");
    panel.className = "ai-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", m.title);
    panel.innerHTML = `<div class="ai-head"><span class="av">${ICON.spark}</span><div><b>${m.title}</b><span>${m.sub}</span></div><button class="icon-btn" type="button" aria-label="Close">${ICON.x}</button></div>
      <div class="ai-log" aria-live="polite"></div>
      <div class="ai-chips">${m.chips.map((c) => `<button type="button">${c}</button>`).join("")}</div>
      <form class="ai-form"><input type="text" placeholder="Type a question…" aria-label="Your question" autocomplete="off" /><button type="submit" aria-label="Send">${ICON.send}</button></form>
      <div class="ai-foot">Prototype: answers come from sample data. Live version runs on Claude.</div>`;
    document.body.append(fab, panel);
    const log = panel.querySelector(".ai-log"), input = panel.querySelector("input");
    let greeted = false, busy = false;

    const add = (html, who) => { const d = document.createElement("div"); d.className = "msg " + who; d.innerHTML = html; log.append(d); log.scrollTop = log.scrollHeight; return d; };
    const open = () => { panel.classList.add("open"); fab.classList.add("hide"); if (!greeted) { add(m.hello, "bot"); greeted = true; } setTimeout(() => input.focus({ preventScroll: true }), 250); };
    const close = () => { panel.classList.remove("open"); fab.classList.remove("hide"); };

    const ask = (text) => {
      if (busy || !text.trim()) return;
      open(); busy = true;
      add(esc(text), "me");
      const typing = add('<span class="typing"><i></i><i></i><i></i></span>', "bot");
      typing.style.padding = "0";
      const answer = brains[mode](lower(text.trim()));
      setTimeout(() => {
        typing.style.padding = ""; typing.innerHTML = "";
        // Reveal word by word, keeping tags whole.
        const parts = answer.split(/(<[^>]+>|\s+)/).filter(Boolean);
        let i = 0, html = "";
        const step = () => {
          for (let k = 0; k < 2 && i < parts.length; k++) html += parts[i++];
          typing.innerHTML = html; log.scrollTop = log.scrollHeight;
          if (i < parts.length) setTimeout(step, 26); else busy = false;
        };
        step();
      }, 650 + Math.random() * 400);
    };

    fab.addEventListener("click", open);
    panel.querySelector(".ai-head .icon-btn").addEventListener("click", close);
    panel.querySelectorAll(".ai-chips button").forEach((b) => b.addEventListener("click", () => ask(b.textContent)));
    panel.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; ask(v); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
    S.ask = ask; S.openAI = open;
  };
})();
