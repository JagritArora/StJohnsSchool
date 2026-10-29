/* हिन्दी for the parent's pages. Loaded from the head only when a parent picks Hindi, so it
   is never downloaded otherwise. As the page draws, menus, headings, buttons, labels, dates
   and short status lines are swapped; names, numbers and what teachers write stay as they are. */
(() => {
  const D = {
    // Pages and navigation
    "Home": "होम", "Timetable": "समय-सारणी", "Attendance": "हाज़िरी", "Homework": "होमवर्क", "Results": "परिणाम", "Fees": "फ़ीस",
    "Homework and Notices": "होमवर्क और सूचनाएँ", "Exams and Results": "परीक्षा और परिणाम", "Messages, Forms and Meetings": "संदेश, फ़ॉर्म और मीटिंग",
    "Today, Bus and Timetable": "आज, बस और समय-सारणी", "Today, the Bus and the Week": "आज, बस और यह हफ़्ता", "Messages": "संदेश", "Notices": "सूचनाएँ",
    "All notices": "सभी सूचनाएँ", "Bus Notices": "बस की सूचनाएँ", "Datesheet": "डेटशीट", "Datesheets": "डेटशीट", "Calendar": "कैलेंडर", "Profile": "प्रोफ़ाइल",
    "Search": "खोजें", "Parent": "अभिभावक", "Chat": "चैट", "Remarks": "टिप्पणियाँ", "Forms": "फ़ॉर्म", "Meetings": "मीटिंग", "Notifications": "नोटिफ़िकेशन",
    "Notice": "सूचना", "Event": "कार्यक्रम", "Exam": "परीक्षा", "Reminder": "रिमाइंडर", "Arrangement": "व्यवस्था", "Bus": "बस", "Driver": "ड्राइवर",
    // Time
    "Today": "आज", "Tomorrow": "कल", "today": "आज", "tomorrow": "कल", "Yesterday": "बीता कल", "This week": "इस हफ़्ते", "Week": "हफ़्ता", "Month": "महीना", "Session": "सत्र",
    "This session": "इस सत्र में", "this session": "इस सत्र में", "This session:": "इस सत्र में:", "Last year": "पिछला साल", "Since Last year": "पिछले साल से",
    "Coming up": "आने वाला", "Coming": "आने वाला", "Earlier": "पहले", "Morning": "सुबह", "Afternoon": "दोपहर", "A week": "एक हफ़्ता", "A quiet week": "शांत हफ़्ता",
    "tap a day": "किसी दिन पर टैप करें", "On the calendar": "कैलेंडर पर", "Coming holidays": "आने वाली छुट्टियाँ",
    "January": "जनवरी", "February": "फ़रवरी", "March": "मार्च", "April": "अप्रैल", "May": "मई", "June": "जून", "July": "जुलाई", "August": "अगस्त", "September": "सितंबर", "October": "अक्टूबर", "November": "नवंबर", "December": "दिसंबर",
    // Actions
    "See All": "सब देखें", "See all": "सब देखें", "See": "देखें", "Add": "जोड़ें", "Pay": "भुगतान करें", "Book": "बुक करें", "Sign": "हस्ताक्षर करें", "Read": "पढ़ें",
    "Call": "कॉल करें", "Change": "बदलें", "Cancel": "रद्द करें", "Send": "भेजें", "Save": "सेव करें", "Close": "बंद करें", "Open": "खोलें", "Back": "वापस", "Next": "आगे",
    "Mark as done": "हो गया", "Mark as read": "पढ़ लिया", "Mark all read": "सब पढ़ लिया", "Mark all as read": "सब पढ़ लिया", "All read": "सब पढ़ लिया", "Unread": "बिना पढ़ी",
    "Send to teacher": "शिक्षक को भेजें", "Apply for leave": "छुट्टी के लिए आवेदन करें", "Message the teacher": "शिक्षक को संदेश भेजें", "message the teacher": "शिक्षक को संदेश भेजें",
    "Pay now by UPI": "UPI से अभी भुगतान करें", "Pay by UPI": "UPI से भुगतान करें", "I've paid (demo)": "मैंने भुगतान कर दिया (डेमो)", "Receipt": "रसीद",
    "I agree": "मैं सहमत हूँ", "I don't agree": "मैं सहमत नहीं हूँ", "I've read this": "मैंने पढ़ लिया", "Show fewer": "कम दिखाएँ", "Show more": "और दिखाएँ",
    "See the full results": "पूरा परिणाम देखें", "See the report card →": "रिपोर्ट कार्ड देखें →", "Thank you!": "धन्यवाद!",
    // Attendance
    "Present": "उपस्थित", "Absent": "अनुपस्थित", "Leave": "छुट्टी", "Late": "देर से", "Holiday": "अवकाश", "Half day": "आधा दिन", "Off": "छुट्टी", "Holiday / Sunday": "अवकाश / रविवार",
    "Every School Day": "हर स्कूल दिवस", "Month by Month": "महीने-दर-महीने", "School days": "स्कूल के दिन", "days present": "दिन उपस्थित", "school days present": "स्कूल दिवस उपस्थित",
    "day absent": "दिन अनुपस्थित", "days on leave": "दिन छुट्टी पर", "Present on school days": "स्कूल के दिनों में उपस्थिति", "Present on": "उपस्थित",
    "Missed, away that day": "छूटा, उस दिन अनुपस्थित", "Attendance not marked yet.": "हाज़िरी अभी नहीं लगी।", "Never late": "कभी देर नहीं", "On time": "समय पर", "Early": "जल्दी",
    "Well above CBSE's 75%": "CBSE के 75% से काफ़ी ऊपर", "CBSE minimum 75%": "CBSE न्यूनतम 75%", "longest run this session": "इस सत्र का सबसे लंबा सिलसिला",
    "present in a row now": "अब लगातार उपस्थित", "best run": "सबसे अच्छा सिलसिला", "Tap a month to see its days.": "दिन देखने के लिए किसी महीने पर टैप करें।",
    "Every date this session, school days in colour": "इस सत्र की हर तारीख, स्कूल के दिन रंग में", "Points ahead (+) or behind (−) the class average, each month.": "हर महीने, कक्षा औसत से आगे (+) या पीछे (−) अंक।",
    // Homework and notices
    "Homework to do": "बाकी होमवर्क", "Past homework": "पिछला होमवर्क", "Homework due": "होमवर्क जमा करना है", "Done": "हो गया", "To do": "करना है", "to do": "करना है", "Not done": "नहीं हुआ",
    "Handed in on time": "समय पर जमा", "Handed in late": "देर से जमा", "Next notice": "अगली सूचना", "High": "ज़्यादा", "Medium": "मध्यम", "Low": "कम", "New": "नया", "All": "सभी",
    "Needs you": "आपके लिए", "need you": "आपके लिए", "Needs attention": "ध्यान चाहिए", "All caught up.": "सब देख लिया।", "Important": "ज़रूरी",
    // Subjects and the day
    "Mathematics": "गणित", "Maths": "गणित", "Science": "विज्ञान", "English": "अंग्रेज़ी", "Hindi": "हिंदी", "Social Science": "सामाजिक विज्ञान", "Computer": "कंप्यूटर",
    "Value Education": "मूल्य शिक्षा", "Club Activities": "क्लब गतिविधियाँ", "Library": "पुस्तकालय", "Games": "खेल", "Music": "संगीत", "Art": "कला", "Clubs": "क्लब",
    "Assembly": "प्रार्थना सभा", "Break": "ब्रेक", "Period": "पीरियड", "Subject": "विषय", "Teacher": "शिक्षक", "Teachers": "शिक्षक", "Class": "कक्षा", "Class teacher": "कक्षा अध्यापक",
    "School": "स्कूल", "School's over": "आज का स्कूल खत्म", "School's over for today": "आज का स्कूल खत्म", "School's over for today.": "आज का स्कूल खत्म।",
    "Pick-up": "पिक-अप", "Drop": "छोड़ना", "Stop": "स्टॉप", "Live": "लाइव", "Not on the road": "अभी सड़क पर नहीं", "Morning pick-up.": "सुबह का पिक-अप।", "Own transport.": "अपना साधन।",
    "Each stop gets a tick here as the driver marks it.": "ड्राइवर के निशान लगाते ही हर स्टॉप पर यहाँ टिक लगता है।", "No changes to the bus coming up.": "बस में कोई बदलाव नहीं होने वाला।",
    "Point at a period for the teacher": "शिक्षक का नाम देखने के लिए पीरियड पर जाएँ", "Who teaches what, and how many periods a week": "कौन क्या पढ़ाता है, और हफ़्ते में कितने पीरियड",
    "House teachers, by club": "हाउस शिक्षक, क्लब के अनुसार",
    // Results
    "Final": "फ़ाइनल", "Final exams": "फ़ाइनल परीक्षा", "Half-yearly": "अर्धवार्षिक", "Half-yearly exams": "अर्धवार्षिक परीक्षा", "Unit test": "यूनिट टेस्ट",
    "Unit tests": "यूनिट टेस्ट", "All tests": "सभी टेस्ट", "All subjects": "सभी विषय", "Reset view": "रीसेट करें", "Hide table": "तालिका छिपाएँ", "Every mark": "हर अंक", "Next test": "अगला टेस्ट", "Average": "औसत", "Class average": "कक्षा औसत", "class average": "कक्षा औसत",
    "Class avg": "कक्षा औसत", "Overall": "कुल मिलाकर", "overall": "कुल मिलाकर", "Total": "कुल", "Grade": "ग्रेड", "grade": "ग्रेड", "Trend": "रुझान", "Table": "तालिका", "Timeline": "समय-रेखा",
    "Report card so far": "अब तक का रिपोर्ट कार्ड", "Subject by subject": "विषयवार", "Against the class": "कक्षा की तुलना में", "At or above the class": "कक्षा के बराबर या ऊपर",
    "Below it": "उससे नीचे", "Ahead of": "आगे", "Just below": "थोड़ा नीचे", "More than 5 below": "5 से ज़्यादा नीचे", "class rank": "कक्षा में स्थान", "Result out": "परिणाम आ गया",
    "Marks coming": "अंक आने वाले हैं", "Being marked": "जाँच चल रही है", "Every test, in order": "हर टेस्ट, क्रम से", "Every test this session, in order.": "इस सत्र का हर टेस्ट, क्रम से।",
    "Tap a bar": "किसी बार पर टैप करें", "What the numbers say": "आँकड़े क्या कहते हैं", "Last result": "पिछला परिणाम", "Marked out of 100 per paper": "हर पेपर 100 में से",
    "CBSE grade bands": "CBSE ग्रेड सीमाएँ", "Very good, excellent": "बहुत अच्छा, उत्कृष्ट", "Good, fair": "अच्छा, ठीक", "Weak, needs help": "कमज़ोर, मदद चाहिए", "very good": "बहुत अच्छा",
    "getting better": "सुधार हो रहा है", "strongest": "सबसे मज़बूत", "This session's exams": "इस सत्र की परीक्षाएँ", "The datesheet isn't out yet.": "डेटशीट अभी नहीं आई है।",
    "Datesheet not out yet": "डेटशीट अभी नहीं आई", "Result expected in May": "परिणाम मई में आने की उम्मीद", "Class teacher's remark.": "कक्षा अध्यापक की टिप्पणी।",
    "The black tick is the class average": "काला निशान कक्षा का औसत है", "Tap a row to see what it means.": "मतलब देखने के लिए किसी पंक्ति पर टैप करें।",
    "Tests are marked out of 20, 25 or 100, so marks are shown as a percentage to compare them fairly.": "टेस्ट 20, 25 या 100 में से जाँचे जाते हैं, इसलिए सही तुलना के लिए अंक प्रतिशत में दिखाए गए हैं।",
    "Values": "मूल्य", "Praise": "प्रशंसा", "Concern": "चिंता", "Half-yearly · marks by subject": "अर्धवार्षिक · विषयवार अंक",
    // Fees
    "Instalment": "किस्त", "Due date": "अंतिम तिथि", "Amount": "राशि", "Status": "स्थिति", "Declared This Session": "इस सत्र में घोषित", "Paid on Time?": "समय पर भुगतान?",
    "Paid this session": "इस सत्र में भुगतान", "Last payment": "पिछला भुगतान", "Fees due": "बकाया फ़ीस", "Nothing to pay right now": "अभी कोई भुगतान बाकी नहीं", "All paid": "सब चुका दिया",
    "amounts are samples": "राशियाँ नमूना हैं", "By UPI, with a receipt on WhatsApp": "UPI से, रसीद WhatsApp पर", "Scan with any UPI app — GPay, PhonePe, Paytm, BHIM.": "किसी भी UPI ऐप से स्कैन करें — GPay, PhonePe, Paytm, BHIM।",
    // Messages, forms and meetings
    "Reason": "कारण", "From": "से", "To": "तक", "Parent–Teacher Meeting": "अभिभावक–शिक्षक मीटिंग", "PTM": "PTM", "Ten minutes with each teacher": "हर शिक्षक के साथ दस मिनट",
    "Book your times for the parent–teacher meeting": "अभिभावक–शिक्षक मीटिंग के लिए समय बुक करें", "My child was unwell today.": "मेरा बच्चा आज अस्वस्थ था।",
    "Noted, will do.": "ठीक है, कर देंगे।", "Thank you ma'am, will do.": "धन्यवाद मैम, कर देंगे।", "Can we talk for a few minutes?": "क्या हम कुछ मिनट बात कर सकते हैं?",
    "Something else? Ask the school office": "कुछ और? स्कूल ऑफ़िस से पूछें", "Recording… up to 1 minute": "रिकॉर्डिंग… 1 मिनट तक", "Only a parent can sign; it asks for your PIN": "सिर्फ़ अभिभावक हस्ताक्षर कर सकते हैं; यह आपका PIN पूछेगा",
    "Kept by the school as a permanent record. Messages can't be edited or deleted.": "स्कूल इसे स्थायी रिकॉर्ड के रूप में रखता है। संदेश बदले या मिटाए नहीं जा सकते।",
    "Times other families have booked are left out. The teacher sees your booking at once.": "दूसरे परिवारों के बुक किए समय नहीं दिखते। शिक्षक को आपकी बुकिंग तुरंत दिख जाती है।",
    // Home, help and install
    "Only things to act on. Each one opens its page.": "सिर्फ़ वे काम जिन पर कुछ करना है। हर एक अपना पेज खोलता है।", "Answers from your records": "आपके रिकॉर्ड से जवाब",
    "free, instant, private": "मुफ़्त, तुरंत, निजी", "What should we work on?": "हमें किस पर ध्यान देना चाहिए?", "What to pack tomorrow?": "कल के लिए बैग में क्या रखें?",
    "Something not right? Call the school office on": "कुछ ठीक नहीं? स्कूल ऑफ़िस को फ़ोन करें:", "Keep St. John's on Your Home Screen": "St. John's को अपनी होम स्क्रीन पर रखें",
    "Calendar file": "कैलेंडर फ़ाइल",
    // Added for ease of use
    "Text size": "अक्षरों का आकार", "Standard": "सामान्य", "Large": "बड़ा", "Larger": "और बड़ा", "Sign out": "साइन आउट", "Add to my calendar": "मेरे कैलेंडर में जोड़ें",
    "Print for the fridge": "प्रिंट करें", "Add due dates to my calendar": "अंतिम तिथियाँ कैलेंडर में जोड़ें", "No connection.": "इंटरनेट नहीं है।", "Text size and language": "अक्षरों का आकार और भाषा",
    "Menus, headings, buttons and dates are in Hindi. Notes from teachers stay as they wrote them.": "मेन्यू, शीर्षक, बटन और तारीखें हिन्दी में हैं। शिक्षकों के नोट वैसे ही रहते हैं जैसे उन्होंने लिखे।"
  };
  const MON = { January: "जनवरी", February: "फ़रवरी", March: "मार्च", April: "अप्रैल", May: "मई", June: "जून", July: "जुलाई", August: "अगस्त", September: "सितंबर", October: "अक्टूबर", November: "नवंबर", December: "दिसंबर",
    Jan: "जन॰", Feb: "फ़र॰", Mar: "मार्च", Apr: "अप्रै॰", Jun: "जून", Jul: "जुला॰", Aug: "अग॰", Sept: "सित॰", Sep: "सित॰", Oct: "अक्टू॰", Nov: "नव॰", Dec: "दिस॰" };
  const DAY = { Monday: "सोमवार", Tuesday: "मंगलवार", Wednesday: "बुधवार", Thursday: "गुरुवार", Friday: "शुक्रवार", Saturday: "शनिवार", Sunday: "रविवार",
    Mon: "सोम", Tue: "मंगल", Wed: "बुध", Thu: "गुरु", Fri: "शुक्र", Sat: "शनि", Sun: "रवि" };
  Object.assign(D, DAY, MON);
  const MK = Object.keys(MON).join("|"), DK = Object.keys(DAY).join("|");
  // Dates: a month next to a number, a weekday before a comma or a number.
  const dates = (t) => t
    .replace(new RegExp(`(\\d{1,2})\\s(${MK})\\b`, "g"), (m, d, k) => `${d} ${MON[k]}`)
    .replace(new RegExp(`\\b(${MK})\\s(\\d{1,4})\\b`, "g"), (m, k, d) => `${MON[k]} ${d}`)
    .replace(new RegExp(`\\b(${MK})([–-])(${MK})\\b`, "g"), (m, a, d, b) => `${MON[a]}${d}${MON[b]}`)
    .replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g, (k) => DAY[k])
    .replace(new RegExp(`\\b(${DK})(?=,|\\s\\d)`, "g"), (k) => DAY[k]);
  const part = (x) => tr(x) || dates(x);
  const P = [
    [/^Good (morning|afternoon|evening), (.+)$/, (m) => `${{ morning: "सुप्रभात", afternoon: "नमस्ते", evening: "शुभ संध्या" }[m[1]]}, ${m[2]}`],
    [/^(Today|Yesterday|Tomorrow), (.+)$/, (m) => `${D[m[1]]}, ${m[2]}`],
    [/^(\d+) things?$/, (m) => `${m[1]} काम`],
    [/^(\d+) of (\d+)$/, (m) => `${m[2]} में से ${m[1]}`],
    [/^In (\d+) days?$/, (m) => `${m[1]} दिन में`],
    [/^(\d+) days?$/, (m) => `${m[1]} दिन`],
    [/^(\d+) ?d(?:ays?)? left$/, (m) => `${m[1]} दिन बाकी`], [/^days left$/, () => "दिन बाकी"],
    [/^(\d+) ?d(?:ays?)? early$/, (m) => `${m[1]} दिन पहले`], [/^(\d+) days? late$/, (m) => `${m[1]} दिन देर से`],
    [/^(\d+) days in a row$/, (m) => `लगातार ${m[1]} दिन`],
    [/^(\d+) (papers|tests|periods)$/, (m) => `${m[1]} ${{ papers: "पेपर", tests: "टेस्ट", periods: "पीरियड" }[m[2]]}`],
    [/^(\d+) instalments?$/, (m) => `${m[1]} किस्तें`],
    [/^(\d+) new to read$/, (m) => `${m[1]} नई, पढ़नी हैं`], [/^(\d+) still to do$/, (m) => `${m[1]} अभी बाकी`],
    [/^(\d+) forms? to sign$/, (m) => `${m[1]} फ़ॉर्म पर हस्ताक्षर बाकी`], [/^(\d+) to sign$/, (m) => `${m[1]} पर हस्ताक्षर बाकी`],
    [/^(\d+) (?:important )?notices? (?:still )?to read$/, (m) => `${m[1]} सूचनाएँ पढ़नी बाकी`],
    [/^(\d+) things? coming up$/, (m) => `${m[1]} चीज़ें आने वाली`],
    [/^All (\d+) periods done\.$/, (m) => `सभी ${m[1]} पीरियड हो गए।`],
    [/^Due (today|tomorrow)$/i, (m) => (m[1].toLowerCase() === "today" ? "आज देय" : "कल तक जमा")],
    [/^Due in (\d+) days?$/i, (m) => `${m[1]} दिन में देय`],
    [/^[Dd]ue (.+)$/, (m) => `${dates(m[1])} तक`],
    [/^Paid (.+)$/, (m) => `भुगतान ${dates(m[1])}`],
    [/^from (.+)$/, (m) => `${dates(m[1])} से`],
    [/^Unit Test (\d)$/, (m) => `यूनिट टेस्ट ${m[1]}`], [/^Unit Test (\d): datesheet$/, (m) => `यूनिट टेस्ट ${m[1]}: डेटशीट`],
    [/^Unit Test (\d) begins (.+)$/, (m) => `यूनिट टेस्ट ${m[1]} ${dates(m[2])} से शुरू`],
    [/^Class ([IVX]+(?:-[A-Z])?)$/, (m) => `कक्षा ${m[1]}`], [/^Class teacher (.+)$/, (m) => `कक्षा अध्यापक ${m[1]}`],
    [/^Bus (\d+)$/, (m) => `बस ${m[1]}`],
    [/^Roll (\d+)$/, (m) => `रोल ${m[1]}`], [/^Route (\d+)$/, (m) => `रूट ${m[1]}`], [/^Session (.+)$/, (m) => `सत्र ${m[1]}`],
    [/^For Classes? (.+)$/, (m) => `कक्षा ${m[1]} के लिए`], [/^For Bus route (\d+)$/, (m) => `बस रूट ${m[1]} के लिए`],
    [/^(\d+)%, grade (\w+)$/, (m) => `${m[1]}%, ग्रेड ${m[2]}`], [/^grade (\w+)$/i, (m) => `ग्रेड ${m[1]}`], [/^class average (\d+)%$/, (m) => `कक्षा औसत ${m[1]}%`],
    [/^(.+) to (.+), then regular classes$/, (m) => `${dates(m[1])} से ${dates(m[2])}, फिर सामान्य कक्षाएँ`],
    [/^(.+?) to (.+)$/, (m) => (/\d/.test(m[1]) && /\d/.test(m[2]) ? `${dates(m[1])} से ${dates(m[2])}` : null)],
    [/^(.+): (.+) in (\d+) days?$/, (m) => `${part(m[1])}: ${part(m[2])}, ${m[3]} दिन में`],
    [/^(.+)'s Pages$/, (m) => `${m[1]} के पेज`],
    [/^Ask about (.+)$/, (m) => `${m[1]} के बारे में पूछें`], [/^Time with (.+)$/, (m) => `${m[1]} के साथ समय`], [/^Message from (.+)$/, (m) => `${m[1]} का संदेश`],
    [/^From (.+)$/, (m) => `${m[1]} की ओर से`], [/^Set by (.+)$/, (m) => `${m[1]} ने दिया`], [/^Goes straight to (.+)\.$/, (m) => `सीधे ${m[1]} तक पहुँचता है।`],
    [/^With (.+), class teacher (.+)$/, (m) => `${m[1]} के साथ, कक्षा अध्यापक ${m[2]}`],
    [/^(.+)'s year so far$/, (m) => `${m[1]} का साल, अब तक`], [/^Where (.+) stands$/, (m) => `${m[1]} की स्थिति`], [/^How is (.+) doing\?$/, (m) => `${m[1]} की प्रगति कैसी है?`],
    [/^Sees only (.+)'s records$/, (m) => `सिर्फ़ ${m[1]} के रिकॉर्ड दिखते हैं`], [/^(.+) handed in$/, (m) => `${m[1]} ने जमा किया`],
    [/^(.+) is in school today\.$/, (m) => `${m[1]} आज स्कूल में है।`],
    [/^Who Meets (.+) at (.+)$/, (m) => `${m[2]} पर ${m[1]} से कौन मिलता है`],
    [/^It opens straight to (.+)'s day, like an app\.$/, (m) => `यह ऐप की तरह सीधे ${m[1]} का दिन खोलता है।`],
    [/^From (.+)'s teachers and the school, all in one place$/, (m) => `${m[1]} के शिक्षकों और स्कूल से, सब एक जगह`],
    [/^For (.+)'s class, bus and school$/, (m) => `${m[1]} की कक्षा, बस और स्कूल के लिए`],
    [/^Tomorrow begins with (.+) at (.+)\.$/, (m) => `कल की शुरुआत ${part(m[1])} से, ${m[2]} बजे।`],
    [/^Back tomorrow at (.+)$/, (m) => `कल ${m[1]} बजे फिर`], [/^Next pick-up (.+), next school day$/, (m) => `अगला पिक-अप ${m[1]}, अगले स्कूल दिवस`],
    [/^Try: (.+)$/, (m) => `आज़माएँ: ${part(m[1])}`],
    [/^(Homework|Exam|Event|Holiday|Notice|Sign|Important): (.+)$/, (m) => `${D[m[1]]}: ${part(m[2])}`],
    [/^(.+) homework due$/, (m) => (D[m[1]] ? `${D[m[1]]} का होमवर्क जमा करना है` : null)],
    [/^(.+) paper$/, (m) => (D[m[1]] ? `${D[m[1]]} का पेपर` : null)],
    [/^(.+) · tomorrow$/, (m) => `${part(m[1])} · कल`]
  ];
  const memo = new Map();
  function tr(t) {
    if (memo.has(t)) return memo.get(t);
    let r = D[t] || null;
    if (!r && t.includes(" · ")) { const ps = t.split(" · "), out = ps.map(part); if (out.some((x, i) => x !== ps[i])) r = out.join(" · "); }
    if (!r) for (const [re, f] of P) { const m = t.match(re); if (m) { r = f(m); if (r) break; } }
    if (!r) { const d = dates(t); if (d !== t) r = d; }
    if (memo.size < 4000) memo.set(t, r);
    return r;
  }

  // Swap text as the page draws it; skip the demo bar, form fields and anything marked not to translate.
  const SKIP = "script, style, textarea, code, pre, [translate='no'], .proto-bar, [data-demo], .dm";
  const done = new WeakMap();
  function text(n) {
    const p = n.parentElement; if (!p || done.get(n) === n.data) return;
    if (p.closest(SKIP)) return;
    const m = n.data.match(/^(\s*)([\s\S]*?)(\s*)$/), t = m[2];
    if (!t || !/[A-Za-z]/.test(t) || t.length > 140) return;
    const r = tr(t);
    if (r && r !== t) { n.data = m[1] + r + m[3]; done.set(n, n.data); }
  }
  function walk(el) {
    if (el.nodeType === 3) return text(el);
    if (el.nodeType !== 1 || el.closest(SKIP)) return;
    if (el.placeholder && /[A-Za-z]/.test(el.placeholder)) { const r = tr(el.placeholder); if (r) el.placeholder = r; }
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) text(n);
  }
  new MutationObserver((rs) => rs.forEach((r) => { if (r.type === "characterData") text(r.target); else r.addedNodes.forEach(walk); }))
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  // Devanagari in a face that sits well beside Figtree.
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700;800&display=swap";
  const st = document.createElement("style");
  st.textContent = `html[lang="hi"]{--sans:"Figtree","Mukta",system-ui,-apple-system,sans-serif;--serif:"Figtree","Mukta",system-ui,sans-serif}html[lang="hi"] h1,html[lang="hi"] h2{line-height:1.35}`;
  document.head.append(l, st);
})();
