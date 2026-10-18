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

    teacher(q, ctx) {
      const st = studentIn(q);
      if (ctx.topic && has(q, /answer|key|solution/)) {
        const t = ctx.topic;
        return `Answer key — <b>${topicName[t]}</b>\n` + KEY[t].slice(0, 6).map((x, i) => `${i + 1}. ${x}`).join("\n");
      }
      if (has(q, /remark|report card|comment|feedback/)) {
        if (!st) return "Which student? Try: “Remarks for Ishita” — or use the Report-card remarks tool in AI Assist to draft all 32 at once.";
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

  // ---------- Live answers from Claude ----------
  // The prototype calls Claude straight from the browser with a key the
  // presenter pastes in once; it stays in this browser's storage. In the live
  // build the call goes through the school's server, which holds the key and
  // only passes Claude the records that user is allowed to see.
  const LS_KEY = "sjs-claude-key", MODEL = "claude-sonnet-5-5";
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  };
  S.claude = {
    get on() { return !!store.get(LS_KEY); },
    connect: (k) => store.set(LS_KEY, k),
    disconnect: () => store.set(LS_KEY, null),
    async stream({ system, messages, max = 700, onText }) {
      const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 30000);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", signal: ac.signal,
          headers: { "content-type": "application/json", "x-api-key": store.get(LS_KEY), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: MODEL, max_tokens: max, stream: true, system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }], messages })
        });
        if (!res.ok) { const err = new Error("HTTP " + res.status); err.status = res.status; throw err; }
        const rd = res.body.getReader(), dec = new TextDecoder();
        let buf = "", out = "";
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const line = buf.slice(0, i).split("\n").find((l) => l.startsWith("data:")); buf = buf.slice(i + 2);
            if (!line) continue;
            const d = JSON.parse(line.slice(5));
            if (d.type === "content_block_delta" && d.delta.type === "text_delta") { out += d.delta.text; onText && onText(out); }
            else if (d.type === "error") throw new Error(d.error.message);
          }
        }
        return out.trim();
      } finally { clearTimeout(timer); }
    }
  };

  // What each assistant may see. The parent's assistant gets only Aarav's
  // records; the teacher's only VII-B; the website's only public facts.
  const marksLine = (s, ex) => S.subjects.map((x) => `${x} ${s[ex][x]}`).join(", ");
  const noticesTxt = () => S.state.notices.map((n) => `- ${n.title} (${S.fmt(n.date, { weekday: "short", day: "numeric", month: "short" })}): ${n.text}`).join("\n");
  const holidaysTxt = () => Object.entries(S.HOLIDAYS).filter(([k]) => k >= S.todayKey).map(([k, v]) => `${S.fmt(k, { weekday: "short", day: "numeric", month: "short" })} ${v}`).join("; ");
  const todayAtt = () => { const t = S.state.attendance[S.todayKey]; return t ? `marked at ${t.at}; away: ${Object.keys(t.marks).map((r) => `${S.student(r).name} (${t.marks[r] === "L" ? "leave" : "absent"})`).join(", ") || "nobody"}` : "not marked yet"; };
  const timetableTxt = () => { const nd = S.nextSchoolDay(S.today, 1); return `Today (${S.fmtLong(S.today)}): ${(S.timetable[S.today.getDay()] || []).join(", ")}\nNext school day (${S.fmtLong(nd)}): ${S.timetable[nd.getDay()].join(", ")}\nPeriods start at ${S.periodTimes.join(", ")}`; };
  const SCHOOL = `St. John's School, Sector 7A, Faridabad, Haryana. Founded 1965 by Shri T.I. John; run by the Idicula Trust Society (Regd.). CBSE, Nursery to Class XII, on a 4-acre campus. Motto: "Learn to serve". Vision: nurture each child's potential and create lifelong learners and global citizens with innovation and strong values ("Vision with action can build the future"). Mission: honesty, compassion, secularism, tolerance and respect, with pride in the nation's heritage.`;

  const ROLE = {
    public: () => `You are talking to a visitor on the school website, usually a parent thinking about admission.
SCHOOL
${SCHOOL}
Life at school: school band, choir and music, Indian and folk dance, sports and the Fit India programme, annual day and inter-house events.
ADMISSIONS
- Enquiries open for Nursery and Class XI. Admission is on merit and is valid once all documents are submitted.
- Nursery: selected students are listed on the notice board at the school reception.
- Class XI: provisional on the Class IX result; confirmed when the Class X CBSE result and pass certificate are submitted. If the student does not pass Class X, the provisional seat is cancelled. Streams on offer this year: the office confirms on the call back.
- Documents: date of birth certificate, residence proof, 1 passport photo of the child and 1 of each parent with the child; Class XI also needs the original Transfer Certificate and the Class IX result, then the Class X mark sheet. Bring originals and photocopies.
- How to apply: fill the enquiry form on the Admissions page and pick a day; the office calls back to confirm the campus visit.
- Fees follow CBSE norms; the office shares the fee structure for the class after an enquiry.
NOT PUBLISHED YET (say the office will confirm): fee amounts, phone number, email, school and office timings, bus routes and stops.
WEBSITE PAGES: Home, About, Academics, Admissions, Campus, Student life, News, Parents, Mandatory disclosure, Contact (map, message form, careers, alumni).
UPCOMING NOTICES
${noticesTxt()}
Upcoming holidays: ${holidaysTxt()}`,

    parent: () => {
      const s = S.me, month = Object.keys(S.history).filter((k) => k.slice(0, 7) === S.todayKey.slice(0, 7) && S.history[k][s.roll]);
      return `You are talking to ${s.parent}, parent of ${s.name}, Class VII-B, Roll ${s.roll}. You can see only Aarav's records and school notices. If asked about another child, say you can only see Aarav's records. Be encouraging and practical; suggest simple things to do at home. For leave, complaints or anything needing a person, point to the Messages tab or the class teacher.
AARAV
Class teacher: ${S.teacher.name} (also teaches Maths). Bus: ${s.bus}; the Home tab shows the bus live and a notification comes two stops before.
Attendance this session: ${S.attendancePct(s.roll)}% (CBSE needs 75% to sit the Class X board exam). Away this month: ${month.map((k) => `${S.fmt(k)} (${S.history[k][s.roll] === "L" ? "leave" : "absent"})`).join(", ") || "none"}. Today: ${({ P: "present", A: "absent", L: "on leave" })[S.statusOn(s.roll, S.todayKey)] || "not marked yet"}.
Unit Test 1 (%): ${marksLine(s, "ut1")}
Half-yearly (%): ${marksLine(s, "hy")}
Class average, half-yearly (%): ${S.subjects.map((x) => `${x} ${S.classAvg("hy", x)}`).join(", ")}
${S.state.ut2Published ? `Unit Test 2 Maths (just published): ${S.state.ut2[s.roll] ?? "—"}/20` : "Unit Test 2 marks are not published yet."}
Homework: ${S.state.homework.map((h) => `${h.subj}: ${h.title}, due ${S.fmt(h.due)}${h.done ? " (done)" : " (pending)"} — ${h.detail}`).join(" | ")}
Fees: ${S.state.fees.map((f) => `${f.q} ${S.rupee(f.amount)} due ${S.fmt(f.due)} ${f.paid ? "paid " + S.fmt(f.paid) : "unpaid"}`).join("; ")}. Pay by UPI from the Fees tab; receipt is instant.
Timetable, VII-B:
${timetableTxt()}
Sibling at school: ${S.sibling.name}, Class ${S.sibling.cls} (class teacher ${S.sibling.teacher}); those records are not loaded in this demo.
Next PTM: Saturday 31 October, 9:00 AM–12:30 PM; half-yearly answer sheets will be shown.
NOTICES
${noticesTxt()}
Upcoming holidays: ${holidaysTxt()}`;
    },

    teacher: () => `You are talking to ${S.teacher.name}, class teacher of VII-B and Maths teacher. You can see VII-B only. You draft report-card remarks, CBSE/NCERT Class VII practice sets with answer keys, lesson plans, notes to parents and Hindi translations — always as drafts the teacher checks. Remarks: 2–3 sentences, specific (cite marks or attendance), kind, with one concrete next step.
VII-B ROSTER (attendance %, Unit Test 1 %, Half-yearly %; subjects: ${S.subjects.join(", ")})
${S.students.map((s) => `${s.roll}. ${s.name} — att ${S.attendancePct(s.roll)}; UT1 ${S.subjects.map((x) => s.ut1[x]).join("/")}; HY ${S.subjects.map((x) => s.hy[x]).join("/")}`).join("\n")}
Class averages, half-yearly: ${S.subjects.map((x) => `${x} ${S.classAvg("hy", x)}`).join(", ")}
Flagged for attention: ${S.atRisk().map((x) => `${x.s.name} (${x.why.join("; ")})`).join(" | ") || "nobody"}
Today's attendance: ${todayAtt()}
${Object.keys(S.state.ut2).length ? `Unit Test 2 Maths (out of 20): ${Object.entries(S.state.ut2).map(([r, v]) => `${S.student(r).first} ${v}`).join(", ")}${S.state.ut2Published ? " — published" : " — not published yet"}` : "Unit Test 2 marks not entered yet."}
Homework set: ${S.state.homework.map((h) => `${h.subj}: ${h.title}, due ${S.fmt(h.due)}`).join(" | ")}
Timetable:
${timetableTxt()}
Next PTM: Saturday 31 October, 9:00 AM–12:30 PM.
NOTICES
${noticesTxt()}`,

    principal: () => {
      const enq = S.state.enquiries, cls = S.sample.classes, att = S.sample.attendance;
      return `You are talking to the Principal. Whole-school figures below are samples for the demo (say "sample" when quoting them); VII-B and admissions are live from the demo. Be crisp, lead with the number, and suggest one action when useful.
WHOLE SCHOOL (sample)
Present today: 93.4%. By class: ${cls.map((c, i) => `${c} ${c === "VII" ? "VII-B live: " + todayAtt() : att[i] + "%"}`).join(", ")}. Lowest section: IX-C at 86%. 4 sections not marked yet.
Staff: 84 of 88 present; 2 on leave, 2 at the CBSE zonal meet; 6 periods substituted.
Q3 fees: ₹1.92 Cr collected of ₹2.74 Cr (70%); 612 families yet to pay; due ${S.fmt(S.state.fees[2].due)}; 58% of payments by UPI; reminders go 7 days and 1 day before.
Flagged students school-wide: 46 (19 attendance under 85%, 27 dropped 15+ points since Unit Test 1).
VII-B (live): flagged — ${S.atRisk().map((x) => `${x.s.name} (${x.why.join("; ")})`).join(" | ")}. Class averages, half-yearly: ${S.subjects.map((x) => `${x} ${S.classAvg("hy", x)}`).join(", ")}.
ADMISSION ENQUIRIES (live)
${enq.map((e) => `- ${e.child}, ${e.cls}; parent ${e.parent}; received ${S.fmt(e.at)}; status ${e.status}${e.note ? "; note: " + e.note : ""}`).join("\n")}
NOTICES SENT
${noticesTxt()}
Upcoming holidays: ${holidaysTxt()}`;
    }
  };

  S.aiSystem = (mode) => `You are "${META[mode].title}", the AI assistant in the St. John's School app. Today is ${S.fmtLong(S.today)}.
This is a prototype shown to the school with sample data. Answer only from the data below. If the answer isn't there, say so plainly and say who at school can confirm. Never invent numbers, names, fees, phone numbers or dates.
Reply in the person's language: Hindi in Devanagari if they write Hindi, simple Hinglish if they write Hinglish, otherwise Indian English.
Keep it short and warm: usually 2–6 short lines. Use "• " for list items and **bold** for the key number or name. No headings, tables or links.

${ROLE[mode]()}`;

  // Claude writes **bold** and "• " lists; everything else is shown as text.
  const fmtAI = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s+/gm, "• ");
  const plain = (h) => h.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "");

  // ---------- Widget ----------
  const ICON = {
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
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
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

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
      <form class="ai-form"><input type="text" placeholder="Type a question…" aria-label="Your question" autocomplete="off" />${SR ? `<button type="button" class="ai-mic" aria-label="Ask by voice" aria-pressed="false">${ICON.mic}</button>` : ""}<button type="submit" aria-label="Send">${ICON.send}</button></form>
      <div class="ai-foot"></div>`;
    document.body.append(fab, panel);
    const log = panel.querySelector(".ai-log"), input = panel.querySelector("input"), foot = panel.querySelector(".ai-foot");
    let greeted = false, busy = false;
    const hist = [], ctx = {}; // conversation so far, and what the built-in answers remember

    const add = (html, who) => { const d = document.createElement("div"); d.className = "msg " + who; d.innerHTML = html; log.append(d); log.scrollTop = log.scrollHeight; return d; };
    const open = () => { panel.classList.add("open"); fab.classList.add("hide"); if (!greeted) { add(m.hello, "bot"); greeted = true; } setTimeout(() => input.focus({ preventScroll: true }), 250); };
    const close = () => { panel.classList.remove("open"); fab.classList.remove("hide"); };

    // Footer: which engine is answering, the switch, and the voice language.
    let vlang = store.get("sjs-voice") || "en-IN";
    const renderFoot = () => {
      foot.innerHTML = (S.claude.on ? `<span class="seg"><span class="ai-live"><i></i>Live answers from Claude</span> · <button type="button" data-k="off">Disconnect</button></span>` : `<span class="seg">Built-in answers from sample data</span> · <span class="seg"><button type="button" data-k="on">Connect Claude</button></span>`) +
        (SR ? ` · <span class="seg">Voice <button type="button" data-k="lang" aria-label="Voice language">${vlang === "hi-IN" ? "हिंदी" : "English"}</button></span>` : "");
    };
    renderFoot();
    foot.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return;
      if (b.dataset.k === "lang") { vlang = vlang === "hi-IN" ? "en-IN" : "hi-IN"; store.set("sjs-voice", vlang); renderFoot(); return; }
      if (b.dataset.k === "off") { S.claude.disconnect(); renderFoot(); add("Disconnected. Answers now come from the built-in sample data.", "bot"); return; }
      if (b.dataset.k === "cancel") { renderFoot(); return; }
      if (b.dataset.k === "on") {
        foot.innerHTML = `<form class="ai-key"><input type="password" placeholder="Paste an Anthropic API key" aria-label="Anthropic API key" autocomplete="off" spellcheck="false" /><button type="submit">Connect</button><button type="button" data-k="cancel">Cancel</button></form><span>The key stays in this browser only.</span>`;
        foot.querySelector("input").focus();
      }
    });
    foot.addEventListener("submit", (e) => {
      e.preventDefault();
      const k = foot.querySelector("input").value.trim();
      if (!/^sk-ant-/.test(k)) { foot.querySelector("input").setCustomValidity("An Anthropic key starts with sk-ant-"); foot.querySelector("input").reportValidity(); return; }
      S.claude.connect(k); renderFoot(); open();
      add("Connected. I'll now answer live with Claude, from the same sample records.", "bot");
    });
    foot.addEventListener("input", (e) => e.target.setCustomValidity(""));

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

    const ask = async (text) => {
      text = text.trim();
      if (busy || !text) return;
      open(); busy = true;
      add(esc(text), "me");
      const bubble = add('<span class="typing"><i></i><i></i><i></i></span>', "bot");
      bubble.style.padding = "0";
      hist.push({ role: "user", content: text });
      let answer = null, note = "";
      if (S.claude.on) {
        try {
          answer = await S.claude.stream({
            system: S.aiSystem(mode), messages: hist.slice(-11),
            onText: (t) => { bubble.style.padding = ""; bubble.innerHTML = fmtAI(t); log.scrollTop = log.scrollHeight; }
          });
          if (!answer) throw new Error("empty");
          bubble.innerHTML = fmtAI(answer);
        } catch (e) {
          answer = null;
          note = e.status === 401 ? "Claude didn't accept the key, so this is the built-in answer." : "Couldn't reach Claude, so this is the built-in answer.";
        }
      }
      if (answer === null) {
        const html = brains[mode](lower(text), ctx);
        await reveal(bubble, html, note);
        answer = plain(html);
      }
      hist.push({ role: "assistant", content: answer });
      busy = false;
    };

    // Voice: speak the question; it is sent when you stop talking.
    const mic = panel.querySelector(".ai-mic");
    let rec = null;
    if (mic) mic.addEventListener("click", () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = vlang; rec.interimResults = true;
      let said = "";
      rec.onresult = (e) => { said = [...e.results].map((r) => r[0].transcript).join(""); input.value = said; };
      rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") add("The microphone is blocked for this page. Allow it in the browser's site settings, then tap the mic again.", "bot"); };
      rec.onend = () => { rec = null; mic.classList.remove("rec"); mic.setAttribute("aria-pressed", "false"); if (said.trim() && !busy) { input.value = ""; ask(said); } };
      rec.start(); mic.classList.add("rec"); mic.setAttribute("aria-pressed", "true");
    });

    fab.addEventListener("click", open);
    panel.querySelector(".ai-head .icon-btn").addEventListener("click", close);
    panel.querySelectorAll(".ai-chips button").forEach((b) => b.addEventListener("click", () => ask(b.textContent)));
    panel.querySelector(".ai-form").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; ask(v); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
    S.ask = ask; S.openAI = open;
  };
})();
