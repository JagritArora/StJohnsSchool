/* The question bank behind "Ask St. John's".
   Every answer the assistant can give lives here, grouped by page. The box in the chat searches
   these questions as you type; nothing is sent to an AI, so it costs nothing to run.
   Keeping it current: answers that depend on the Website tab (admissions, office details,
   timings) read those settings live, so they update themselves. Everything else is plain text —
   when a page changes, change the matching answer here too.
   Each entry: q (the question as shown), k (extra words people might type), a (answer: text or
   a function), go (optional link to the page that has more). */
(function () {
  const S = window.SJS || (window.SJS = {});
  const F = (k, fb) => { try { const v = (S.state.site.facts || {})[k]; if (v && v.trim()) return v.trim(); } catch (e) { /* not loaded */ } return fb; };
  const later = "not published yet; the school office will confirm";
  const adm = () => { try { return S.admText("en"); } catch (e) { return { open: true, session: "2027–28", list: "Nursery and Class XI" }; } };
  const phone = () => F("phone", "0129 224 2097, 0129 224 8895"), email = () => F("email", "stjohnsschool@rediffmail.com");

  const G = (g, list) => list.map((x) => Object.assign(x, { g }));
  S.FAQ_PHONE = phone; S.FAQ_EMAIL = email;
  S.FAQ = [].concat(
    G("Admissions", [
    { q: "Are admissions open?", k: "admission open seats vacancy session apply 2027", go: "admissions.html",
      a: () => { const a = adm(); return a.open ? `Yes. Admissions for <b>${a.session}</b> are open for <b>${a.list}</b>. Seats in other classes open only when families move.` : `Admissions for ${a.session} are closed for now. Leave an enquiry and the office will call you when seats open.`; } },
    { q: "How do I apply for admission?", k: "apply process procedure steps enquiry form join register how", go: "admissions.html#enquire",
      a: "Five steps:\n1. <b>Enquire</b> online (Admissions page) or at the office.\n2. <b>Visit</b> the campus and meet the team.\n3. <b>Register</b> with the birth certificate and residence proof.\n4. <b>Documents</b>: bring originals for verification.\n5. <b>Confirmation</b>: admission is on merit." },
    { q: "How do I apply for Nursery?", k: "nursery pre-primary playschool toddler kg", go: "admissions.html#enquire",
      a: "Fill the enquiry form on the Admissions page and pick a day to visit; the office calls back to confirm. Your child should be <b>3 years or more on 31 March 2027</b>. Selected children are listed on the notice board at the school reception." },
    { q: "What is the age for Nursery, LKG, UKG and Class I?", k: "age criteria eligibility years old birth date limit minimum lkg ukg", go: "admissions.html",
      a: "Age on <b>31 March 2027</b>:\n• Nursery: 3 years or more\n• LKG: 4 years or more\n• UKG: 5 years or more\n• Class I: 6 years or more" },
    { q: "What documents are needed for admission?", k: "documents papers certificate proof birth residence photo aadhaar required class xi tc", go: "admissions.html",
      a: "• Date of birth certificate\n• Residence proof\n• 1 passport photo of the child, and 1 of each parent with the child\n• Class XI: original Transfer Certificate and Class IX result, then the Class X mark sheet when CBSE results are out\nBring originals for verification along with photocopies." },
    { q: "How is registration done?", k: "registration register form copy", go: "admissions.html",
      a: "Registration is done on submitting a copy of the <b>date of birth certificate</b> and <b>residence proof</b>. Fill the name and date of birth exactly right and complete every field: no change is allowed afterwards. Registration does not guarantee admission." },
    { q: "Does registration guarantee admission?", k: "guarantee confirm seat sure selected", go: "admissions.html",
      a: "No. Registration does not guarantee admission. The school admits students only on merit, and admission stays valid once the documents the school asks for are submitted." },
    { q: "How are students selected?", k: "selection merit criteria interview test entrance list", go: "admissions.html",
      a: "Admission is on <b>merit</b>. For Nursery, selected children are listed on the notice board at the school reception and the office informs families." },
    { q: "Can I change the name or date of birth after registering?", k: "correction change name dob mistake edit", go: "admissions.html",
      a: "No. Please fill the name and date of birth exactly as on the birth certificate; no change is allowed afterwards." },
    { q: "Are admission charges refundable?", k: "refund refundable money back withdraw leave security deposit", go: "admissions.html",
      a: "Apart from the <b>security deposit</b>, charges paid at regular or provisional admission are not refunded when a child leaves." },
    { q: "Is there admission in classes other than Nursery and Class XI?", k: "mid session other class vacancy transfer seat class 2 3 4 5 6 7 8 9 10", go: "admissions.html#enquire",
      a: "Seats in other classes open only when families move. Leave an enquiry with the class you need and the office will call you if a seat opens." },
    { q: "How does Class XI admission work?", k: "class 11 xi eleventh provisional senior secondary", go: "academics.html",
      a: "Class XI admission is <b>provisional</b>, based on the Class IX result. It is confirmed once the Class X CBSE result and pass certificate are submitted. If a student does not pass Class X, the provisional seat is cancelled." },
    { q: "Can I visit the school before applying?", k: "visit tour campus see meet book appointment", go: "admissions.html#enquire",
      a: "Yes, please do. Book a visit from the Admissions page on any working day. Bring your questions, and your child." },
    { q: "Is there a prospectus?", k: "prospectus brochure pdf download booklet", go: "prospectus.html",
      a: "Yes. The <b>2027–28 prospectus</b> is on the website, and you can download it as a PDF from the same page." },

    ]),
    G("Fees", [
    { q: "What are the fees?", k: "fee fees cost charges amount structure tuition price expensive", go: "parents.html#fees",
      a: "Fees follow <b>CBSE norms</b> and are paid in instalments. The fee structure for 2027–28 is shared with every family that enquires, and published in Downloads on the Parent corner." },
    { q: "How can I pay the fees?", k: "pay payment upi online gpay phonepe paytm receipt", go: "parents.html#fees",
      a: "Parents pay by <b>UPI</b> (GPay, PhonePe, Paytm or any bank app) from the parent app, and get the receipt at once on WhatsApp and email. You can also pay at the fee counter." },
    { q: "What are the fee counter timings?", k: "fee counter hours accounts cash window", go: "parents.html#timings",
      a: "Fee counter: <b>Monday to Friday 8:15 AM – 12:00 PM</b>, <b>Saturday 8:15 – 10:30 AM</b>." },
    { q: "Are fees paid in instalments?", k: "instalment installment quarterly monthly due date", go: "parents.html#fees",
      a: () => `Yes, fees are paid in instalments. Instalment dates and amounts: ${later}. The parent app shows each instalment, its due date and what's been paid.` },

    ]),
    G("Timings and calendar", [
    { q: "What are the school timings?", k: "timing timings time hours start end summer winter bell", go: "parents.html#timings",
      a: () => `• Nursery & KG (Mon–Fri): summer ${F("tPreS", "8:35 AM to 12:55 PM")}, winter ${F("tPreW", "9:00 AM to 1:20 PM")}\n• Classes I – XII (Mon–Sat): summer ${F("tSchS", "7:35 AM to 1:45 PM")}, winter ${F("tSchW", "8:05 AM to 2:15 PM")}` },
    { q: "Is Saturday a school day?", k: "saturday weekend working days week", go: "parents.html#timings",
      a: "Classes I to XII come <b>Monday to Saturday</b>. Nursery and KG come <b>Monday to Friday</b>." },
    { q: "What are the office hours?", k: "office hours timings timing reception open admin", go: "contact.html",
      a: () => `School office hours: <b>${F("hours", "")}</b>`.replace("<b></b>", later) },
    { q: "When are the holidays?", k: "holiday holidays vacation break chutti summer winter closed", go: "parents.html#calendar",
      a: () => { try { const h = Object.entries(S.HOLIDAYS).filter(([d]) => d >= S.todayKey).slice(0, 4); if (h.length) return "Coming up:\n" + h.map(([d, v]) => `• ${S.fmt(d, { weekday: "short", day: "numeric", month: "short" })}: ${v}`).join("\n") + "\nThe full calendar is on the Parent corner."; } catch (e) {} return "The full holiday list is on the calendar in the Parent corner."; } },
    { q: "Where is the academic calendar?", k: "calendar exams dates schedule events year planner", go: "parents.html#calendar",
      a: "The calendar of exams, meetings and holidays is on the <b>Parent corner</b>, and you can add the dates to your phone's calendar." },
    { q: "What happens through the school year?", k: "events annual day sports day festivals year function celebration", go: "life.html",
      a: "A typical year: Investiture (July), Independence Day (Aug), Teachers' Day (Sep), Navratri and Dussehra (Oct), Children's Day (Nov), Annual Day and Christmas (Dec), Republic Day (Jan), <b>Sports Day</b> (Feb), results and prize day (March)." },

    ]),
    G("About", [
    { q: "Is it a CBSE school?", k: "cbse board affiliation icse state board", go: "about.html",
      a: () => `Yes. St. John's is a <b>CBSE</b> school from Nursery to Class XII, affiliation number <b>${F("affil", "530048")}</b>.` },
    { q: "What is the CBSE affiliation number?", k: "affiliation number code school code", go: "disclosure.html",
      a: () => `Affiliation number: <b>${F("affil", "530048")}</b>. School code: ${F("code", later)}.` },
    { q: "When was the school founded?", k: "founded history since 1965 old established age years started", go: "about.html",
      a: "In <b>1965</b>, by <b>Shri T.I. John</b>. It has been running for sixty years." },
    { q: "Who runs the school?", k: "management trust society owner chairperson director manager idicula", go: "about.html#management",
      a: () => `St. John's is run by the <b>Idicula Trust Society (Regd.)</b>. Chairperson and manager: ${F("chair", "Ms. A. John, President")}. Director: Mr Joseph John.` },
    { q: "Who is the principal?", k: "principal head headmistress name", go: "about.html",
      a: () => `The Principal is <b>${F("principal", "Mrs Aparna Gautam Panda")}</b>.` },
    { q: "What is the school's motto?", k: "motto slogan learn to serve", go: "about.html",
      a: "<b>Learn to serve.</b> It's on every crest, blazer and banner since 1965." },
    { q: "What are the vision and mission?", k: "vision mission values aims objectives philosophy", go: "about.html",
      a: "<b>Vision:</b> to nurture the potential in every child and bring up lifelong learners and global citizens with innovation and strong values. <i>Vision with action can build the future.</i>\n<b>Mission:</b> honesty, compassion, secularism, tolerance and respect for others, with pride in our country's heritage." },
    { q: "Is it a co-ed school?", k: "coed co-educational girls boys both", go: "about.html",
      a: "Yes, St. John's is <b>co-educational</b>." },
    { q: "Is it a religious school?", k: "christian religion faith religious minority secular", go: "about.html",
      a: "The school's mission includes <b>secularism and respect for every faith</b>. Festivals from Onam and Eid to Diwali and Christmas are celebrated as one school." },
    { q: "Where have past students gone?", k: "alumni old students former success career", go: "achievements.html",
      a: "Former students include bureaucrats, soldiers, educators, engineers, doctors, architects, chartered accountants and business people, plus artists and sportspeople. The Achievements page lists their civil services, CA, JEE and CLAT ranks." },

    ]),
    G("Academics", [
    { q: "What classes does the school have?", k: "classes stages levels grades nursery to 12 primary middle secondary", go: "academics.html",
      a: "Nursery to Class XII in five stages: <b>Pre-primary</b> (Nursery–UKG), <b>Primary</b> (I–V), <b>Middle</b> (VI–VIII), <b>Secondary</b> (IX–X) and <b>Senior secondary</b> (XI–XII)." },
    { q: "Which streams are offered in Class XI?", k: "stream streams medical non-medical commerce humanities arts science pcm pcb", go: "admissions.html#streams",
      a: "Four streams:\n• <b>Medical</b>: English Core, Physics, Chemistry, Biology / Biotechnology\n• <b>Non-Medical</b>: English Core, Physics, Chemistry, Mathematics\n• <b>Commerce</b>: English Core, Economics, Business Studies, Accountancy\n• <b>Humanities</b>: English Core, Economics, History, Political Science" },
    { q: "What optional subjects are there in Class XI?", k: "optional elective fifth subject additional psychology informatics practices computer science", go: "admissions.html#streams",
      a: "Pick one: Informatics Practices, Mathematics, Psychology, Hindustani Music Vocal, Fine Arts (Painting), Physical Education, Entrepreneurship, or Typography and Computer Application. Non-Medical students may take Computer Science or Informatics Practices." },
    { q: "What subjects are taught in Class IX?", k: "class 9 ix ninth subjects main", go: "admissions.html#streams",
      a: "Main subjects: English Language & Literature, Hindi Course-A or Sanskrit, Mathematics, Science and Social Science, plus <b>one skill subject</b>." },
    { q: "Which skill subjects can students take?", k: "skill subject artificial intelligence ai financial markets it music painting vocational", go: "admissions.html#streams",
      a: "From Class IX, one of: <b>Artificial Intelligence</b>, Introduction to Financial Markets, Information Technology, Hindustani Music Vocal, Painting, or Physical Activity Trainer." },
    { q: "Which languages are taught?", k: "language languages hindi sanskrit english third language", go: "academics.html",
      a: "English and Hindi from the start, a third language in the middle school, and Hindi Course-A or Sanskrit in Class IX." },
    { q: "How are students assessed?", k: "exam exams assessment tests report card evaluation marks grading", go: "academics.html#exams",
      a: "Pre-primary: observation and portfolios, no written exams. Classes I–VIII: periodic tests, half-yearly and annual exams, a report card each term. Classes IX–XII: the CBSE scheme with internal assessment, pre-boards and the board exams. Parents see every mark in the parent app." },
    { q: "Is there homework for small children?", k: "homework nursery kg pre-primary exams small kids", go: "academics.html",
      a: "Pre-primary children learn through play, stories, rhymes and music. <b>No homework, no exams.</b>" },
    { q: "What attendance is needed for board exams?", k: "attendance 75 percent minimum board eligibility", go: "academics.html#exams",
      a: "CBSE requires at least <b>75% attendance</b> to appear in the board exams." },
    { q: "How does the school teach?", k: "teaching method pedagogy nep activity learning approach smart digital", go: "academics.html",
      a: "Activity first in the early years (following NEP 2020), reading every day across all stages, <b>digital classrooms</b> and experiential learning in primary, labs and projects from the middle school." },
    { q: "What are the board results?", k: "board results toppers marks percentage class 10 12 pass", go: "achievements.html",
      a: "The <b>Achievements</b> page lists the Class X and XII board toppers, newest year first." },
    { q: "Is there a school counsellor?", k: "counsellor counselor career guidance wellbeing mental health", go: "campus.html",
      a: "Yes, a <b>full-time school counsellor</b>, plus seminars and workshops for senior students." },

    ]),
    G("Campus", [
    { q: "How big is the campus?", k: "campus size area acres building infrastructure big", go: "campus.html",
      a: "<b>3.97 acres</b> in Sector 7A, with 77,722 sq ft built up: 83 classrooms, 8 labs, 2 libraries, 2 auditoriums and 2 playgrounds." },
    { q: "What facilities does the school have?", k: "facilities infrastructure amenities campus features", go: "campus.html",
      a: "Science and computer labs, an air-conditioned pre-primary wing, two AC auditoriums, junior and senior libraries, a big playground and indoor sports room, a medicare centre with ambulance, RO water, a generator and CCTV across the campus." },
    { q: "Are there science and computer labs?", k: "lab labs laboratory science physics chemistry biology computer", go: "campus.html",
      a: "Yes, <b>8 labs</b>, including physics, chemistry, biology, maths and computer labs." },
    { q: "Is there a library?", k: "library books reading", go: "campus.html",
      a: "Two: an air-conditioned <b>junior library</b> and a well-stocked <b>senior library</b>, with 16,936 books between them." },
    { q: "Are the classrooms air-conditioned?", k: "ac air conditioned air-conditioning cooler fan classroom", go: "campus.html",
      a: "The <b>pre-primary wing</b>, the junior library and both seminar auditoriums are air-conditioned. For other rooms, the office will confirm." },
    { q: "Is the school safe?", k: "safety safe security cctv guard gate visitor", go: "campus.html#safety",
      a: "CCTV across the premises, visitor passes at the main gate, children handed over only to registered guardians, trained first-aid staff and fire drills, and a child-protection committee as CBSE requires." },
    { q: "Is there a doctor or medical room?", k: "medical doctor nurse first aid sick infirmary ambulance health", go: "campus.html",
      a: "Yes, a <b>medicare centre</b> with trained staff and an <b>ambulance</b>." },
    { q: "Is drinking water safe?", k: "water drinking ro purified toilets hygiene clean", go: "campus.html",
      a: "<b>RO water</b> in water coolers, and clean toilets on every floor." },
    { q: "Is there power backup?", k: "power backup generator electricity", go: "campus.html",
      a: "Yes, a <b>generator</b> for uninterrupted power." },
    { q: "Is there a play area for small children?", k: "play area kids zone toy train slide swings pre-primary", go: "admissions.html#day",
      a: "Yes. The pre-primary wing has a <b>kids play area</b>, an attractive toy train, a huge amphitheatre and an audio visual room." },

    ]),
    G("Transport", [
    { q: "Does the school have buses?", k: "bus buses transport van cab pick drop", go: "campus.html#transport",
      a: "Yes. School buses cover routes across Faridabad, with <b>CCTV, GPS, speed governors and female attendants</b>." },
    { q: "Which areas do the buses cover?", k: "route routes area areas stop stops sector cover", go: "campus.html#transport",
      a: () => `School buses cover routes across Faridabad. ${F("routes", "") ? "Routes: " + F("routes", "") : "The route list is shared by the transport office at admission."}` },
    { q: "Can I track the school bus?", k: "track tracking live gps bus location where", go: "parents.html",
      a: "Yes. In the parent app you can follow the bus stop by stop, and get a message two stops before home." },
    { q: "How do I change my child's bus stop?", k: "change route stop transport request", go: "parents.html#requests",
      a: "Send a <b>Bus route or stop change</b> request from Requests on the Parent corner. You'll get an SMS when it's done." },

    ]),
    G("Student life", [
    { q: "What activities are there?", k: "activities extracurricular co-curricular hobbies clubs dance music", go: "life.html",
      a: "Dance, music, drama, theatre, mime, clay modelling, craft and mono acting, plus the school band and choir, eight sports, environment programmes and excursions." },
    { q: "Which sports are offered?", k: "sports games badminton football basketball volleyball athletics yoga chess carrom", go: "life.html",
      a: "<b>Badminton, volleyball, basketball, athletics, football, yoga, chess and carrom</b>, on a huge playground and in an indoor sports room. Sports Day is in February." },
    { q: "Is there a school band and choir?", k: "band choir music singing instruments tabla sitar", go: "life.html",
      a: "Yes. The band leads the march-past on Independence and Republic Day; the choir sings at Annual Day and Christmas, with tabla and sitar for devotional music." },
    { q: "What clubs are there?", k: "club clubs eco reading debating elocution heritage", go: "life.html#clubs",
      a: "From Class III every student picks a club: Eco, Performing and Fine Arts, Health and Wellness, Heritage, Reading, Intellect, Integrity, or Elocution and Debating." },
    { q: "Does the school have houses?", k: "house houses captain inter-house red blue green yellow", go: "life.html#houses",
      a: "Yes. Every student from Class I to XII belongs to a house, led by junior and senior House Captains. Houses compete all year in sport, dramatics, quiz, music and art." },
    { q: "Is there a student council?", k: "student council prefect head boy girl leadership election", go: "life.html#clubs",
      a: "Yes, chosen each year through a democratic process. It carries students' ideas to the teachers and Principal, plans events and runs service projects." },
    { q: "Are there excursions and trips?", k: "excursion trip picnic outing tour field", go: "life.html",
      a: "Yes, regular <b>excursions</b> are part of school life, from pre-primary outings up." },
    { q: "Where can I see photos?", k: "photos gallery pictures images album", go: "life.html#gallery",
      a: "The <b>Photo gallery</b> on the Student life page. The office adds new albums regularly." },

    ]),
    G("Parents", [
    { q: "What is the school uniform?", k: "uniform dress tracksuit blazer tie sweater shoes", go: "parents.html#uniform",
      a: "Pre-primary: red tracksuit and cap in winter. Primary and middle: grey sweatshirt with the crest in winter, with ID card. Seniors: grey blazer, white shirt and school tie. The full list, with where to buy it, will be published by the school." },
    { q: "How do I get a transfer certificate?", k: "tc transfer certificate leaving school", go: "parents.html#requests",
      a: "Send a <b>Transfer certificate</b> request from Requests on the Parent corner. You'll get an SMS when it's ready to collect." },
    { q: "How do I get a bonafide or character certificate?", k: "bonafide character certificate letter", go: "parents.html#requests",
      a: "Ask from <b>Requests</b> on the Parent corner. The office prepares it and sends you an SMS." },
    { q: "How do I update my address or phone number?", k: "update change address phone mobile number details", go: "parents.html#requests",
      a: "Send a <b>Change of address or phone number</b> request from the Parent corner." },
    { q: "I lost my child's ID card. What do I do?", k: "id card lost duplicate identity", go: "parents.html#requests",
      a: "Ask for a <b>Duplicate ID card</b> from Requests on the Parent corner." },
    { q: "How do I tell the school my child is absent?", k: "absent absence leave sick inform class teacher", go: "parents.html",
      a: "Tell the class teacher through the parent app <b>before 8 in the morning</b>. You can apply for leave there too." },
    { q: "What is the parent app?", k: "parent app application login portal mobile", go: "parents.html#app",
      a: "One app for attendance alerts, homework and marks, the live school bus, UPI fee payments, messages to teachers, leave and a weekly summary. Sign in with the mobile number you gave the school." },
    { q: "Where can I download forms and lists?", k: "download downloads book list stationery rules form", go: "parents.html#downloads",
      a: "In <b>Downloads</b> on the Parent corner: the prospectus now, and the calendar, fee structure, book lists and rules as the school publishes them." },
    { q: "When is the next PTM?", k: "ptm parent teacher meeting", go: "news.html",
      a: () => { try { const n = (S.state.notices || []).find((x) => /ptm|parent.teacher/i.test(x.title)); if (n) return `${n.title}, ${S.fmt(n.date, { weekday: "short", day: "numeric", month: "short" })}.`; } catch (e) {} return "PTM dates are on the calendar in the Parent corner and in the parent app."; } },
    { q: "Where are the latest notices?", k: "notice notices news circular announcement updates", go: "news.html",
      a: "On the <b>News</b> page, and in the parent app and by SMS the moment the school posts them." },

    ]),
    G("Contact", [
    { q: "What is the school's phone number?", k: "phone number call contact telephone mobile", go: "contact.html",
      a: () => `Office phone: <b>${phone()}</b>.` },
    { q: "What is the school's email?", k: "email mail id", go: "contact.html",
      a: () => `Email: <b>${email()}</b>.` },
    { q: "Where is the school?", k: "address location where map directions reach pin sector 7", go: "contact.html",
      a: () => `St. John's School, <b>Sector 7, Block A (Sector 7A), Faridabad</b>, Haryana${F("pin", "") ? " " + F("pin", "") : ""}. The Contact page has a map and directions.` },
    { q: "Is the school on social media?", k: "instagram facebook youtube social media follow", go: "contact.html",
      a: "Instagram <b>@stjohnsschoolfaridabad</b>, Facebook: St. John's School Faridabad, YouTube: St. John's School, Sector-7A, Faridabad." },
    { q: "Are there teaching jobs?", k: "job jobs career careers vacancy teacher recruitment cv resume hiring", go: "contact.html#careers",
      a: () => { let n = 0; try { n = (S.state.site.jobs || []).length; } catch (e) {} return (n ? `There ${n === 1 ? "is 1 opening" : "are " + n + " openings"} on the Contact page. ` : "No openings are listed right now. ") + `You can still apply on the Contact page or send your CV to ${email()}.`; } },
    { q: "I studied here. How do I reconnect?", k: "alumni old student ex-student passed out reconnect", go: "contact.html#alumni",
      a: "Welcome back! Send your name, the year you finished and what you're doing now from the <b>Alumni</b> section of the Contact page. The office will invite you to Annual Day." },
    { q: "Where is the mandatory disclosure?", k: "mandatory disclosure cbse appendix documents certificates", go: "disclosure.html",
      a: "On the <b>Mandatory disclosure</b> page: general information, documents, results, staff and infrastructure, as CBSE requires." }
    ])
  );
  S.FAQ_TOPICS = [["Admissions", "🎒"], ["Fees", "💳"], ["Timings and calendar", "⏰"], ["About", "🏫"], ["Academics", "📚"], ["Campus", "🌳"], ["Transport", "🚌"], ["Student life", "🎭"], ["Parents", "👪"], ["Contact", "📞"]];

  // ---------- Search ----------
  const STOP = new Set("a an the is are am do does did i my me we our you your it its of to in on for at by and or can what which who how when where why there this that be will with from about any have has".split(" "));
  const words = (t) => t.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter((w) => w && !STOP.has(w)).map((w) => w.length > 4 && /[^s]es$/.test(w) && /(ch|sh|x|ss|us)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w);
  const roman = { "1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v", "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x", "11": "xi", "12": "xii" };
  // Best matches for what was typed. pool: [{ q, k }]. Returns [{ item, score }], best first.
  S.faqSearch = (text, pool) => {
    const qs = words(text).map((w) => roman[w] || w);
    if (!qs.length) return [];
    return pool.map((item) => {
      const qw = words(item.q).map((w) => roman[w] || w), kw = words(item.k || "").map((w) => roman[w] || w), hay = qw.concat(kw);
      let hit = 0, score = 0;
      qs.forEach((w) => {
        if (qw.includes(w)) { hit++; score += 3; }
        else if (kw.includes(w)) { hit++; score += 2; }
        else if (w.length >= 3 && hay.some((h) => h.startsWith(w) || (h.length >= 4 && w.startsWith(h)))) { hit++; score += 1; }
      });
      // more of the typed words found wins; on a tie, the shorter, more direct question
      return { item, score: hit * 10 + score - qw.length * 0.05, ok: hit / qs.length >= 0.5 };
    }).filter((r) => r.ok).sort((a, b) => b.score - a.score);
  };
  S.faqAnswer = (item) => (typeof item.a === "function" ? item.a() : item.a) + (item.go ? `\n<a class="ai-go" href="${item.go}">Open the page →</a>` : "");
})();
