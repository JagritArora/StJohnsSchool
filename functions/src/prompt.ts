// What Haiku is asked to do: give every line of the teacher's paper a role. It never rewrites a line;
// the page builds the paper from the teacher's own text, so no word can change.
export const ROLES = [
  "head", "time", "insthead", "inst", "chapter", "section", "note",
  "q", "qopts", "opt", "opts", "part", "sub", "stmt", "optlabel", "text", "cont", "or",
  "arintro", "archoice", "assert", "reason", "ar", "case", "caseq", "caseopt",
  "img", "tbl", "skip",
] as const;

export const LAYOUTS = { normal: "an exam paper", box: "an exam paper with a marks column", assignment: "a chapter-wise assignment" } as const;
export type Layout = keyof typeof LAYOUTS;

export function systemPrompt(layout: Layout) {
  return `You sort the lines of a school question paper written by a teacher at St. John's School, Faridabad (CBSE). The teacher's Word file has been read into numbered lines; it is being formatted as ${LAYOUTS[layout]}. Give every line exactly one role. Do not rewrite, merge, split or skip any line number.

Each input line is: number | auto-number | flags | text
- auto-number: the list number Word shows in front of the line (e.g. "1." "a)" "(i)") when it is not part of the text.
- flags: C = centred, B = bold, M3 = a marks cell beside it read "3".
- Long lines are cut short with "…". [picture] and [table: …] lines are pictures and tables.

Roles:
head      a heading line at the top: school name, exam name, class, subject, set, session, date
time      the line with the time allowed and/or the maximum marks ("Time: 3 hrs   M.M. 70")
insthead  the "General Instructions" heading itself
inst      one general instruction
chapter   a chapter title, e.g. "Ch-9 Biotechnology: Principles & Processes"${layout === "assignment" ? "" : " (if the paper has these)"}
section   any heading over a group of questions: "Section A", "SECTION – B", "Multiple Choice Questions", "Short Answer Questions", "Assertion & Reason", and also ones not listed here: "MAP WORK", "Competency Based Questions", "Case Based Question", "Source-Based Questions", "PART – II"
note      an un-numbered line that is not part of one question: under a section heading ("Choose the correct option.") or under a part (a list of terms the part refers to)
q         the first line of a new question, whether its number is typed, auto-numbered or missing
qopts     the first line of a new multiple-choice question that also carries all its options on the same line
opt       one multiple-choice option
opts      several multiple-choice options typed on one line ("(a) 48  (b) 24  (c) 8  (d) 12")
part      a sub-question (a), (b)… that needs a written answer
sub       a roman (i), (ii) sub-part under a part
stmt      a numbered statement (i), (ii)… inside a multiple-choice question, before its options
optlabel  the "Options:" line between statements and choices
text      any other un-numbered line inside a question: a passage, a food chain, "Answer the following questions:", an OR-alternative that has no parts
cont      the rest of the line above that wrapped onto a new line; it joins the line above
or        the word OR on its own, between two alternatives
arintro   the Assertion–Reason instruction paragraph ("two statements are given…")
archoice  one answer choice listed under that instruction ("Both A and R are true…")
assert    an Assertion line
reason    a Reason line
ar        one line holding both the Assertion and the Reason
case      a case-study passage that starts a case-based question ("Case:", "Read the passage…")
caseq     a question asked about a case passage
caseopt   an option of such a case question
img       a [picture] line
tbl       a [table: …] line
skip      only page numbers, "P.T.O.", "Turn over", end markers like "*** End of paper ***" and blank answer lines. Never a question, option, part or instruction.

How to tell them apart:
- Headings: a short line, often bold, centred, underlined or in capitals, with no question number and no question mark, standing between questions, is a section heading even when its wording is new to you. A heading is never a question.
- Bullets (•, ▪, ➢, -, ✓ or a Word bullet in the auto-number) in front of lines inside a question or a case are labels, like (a): part, sub or caseq, never text. Different bullet shapes in one question are still the same kind of line.
- Lettering that goes back to (a) or (i) after (c) or (d), with no OR between, means a new question has started. Its first line is the un-numbered line just above that (a) ("Give reasons for the following:"): label that line q. If there is no such line, the (a) line itself is the q.
- Options are short choices for a multiple-choice question (usually four); parts are sub-questions needing written answers.
- A line that starts with a question number (Q7, 7., 7), or a decimal auto-number such as "7.") begins a new question: q, qopts, assert, ar or case — never text, cont or note, even when it only says "Study the figure and answer the questions that follow".
- A line that starts with its own label — (a), a), (i), i. — is opt, part, sub, stmt, archoice, caseq or caseopt, never text.
- A question that starts straight with (a) and has no lead-in sentence is still a "q" for that first line.
- Statements (i), (ii) followed by "Options:" and choices: stmt, optlabel, then opt.
- When the choices repeat under every Assertion–Reason question, label them archoice each time.
- A line that only finishes the sentence of the line above is "cont".
- Keep the paper's order; never move a line.

m (marks): ${layout === "box"
    ? `for every line labelled q, qopts, assert, ar or case give that question's marks as a number ("2"), from marks printed beside it ([2], (2 marks), an M flag) or from the instructions ("Section B has 5 questions of 2 marks each"). Use "" for every other line, and "" when you cannot tell.`
    : `always "".`}

g (group): which question the line belongs to, counting the questions of the whole paper 1, 2, 3… in order, by your own count and not the teacher's numbers. Every q, qopts, assert, ar and case line starts the next number; every line inside that question (its options, parts, sub-parts, text, pictures, OR and the alternative after it, case questions and their options) carries the same number. Lines that belong to no question (head, time, insthead, inst, chapter, section, note under a heading, arintro, archoice, skip) carry 0.

Examples of the hard cases (number | auto-number | flags | text  →  role, g):
  20 |  |  | Q4. Answer briefly:                      → q, 4
  21 |  |  | (c) What is a coalition government?      → part, 4
  22 |  |  | (d) Which language is spoken in Wallonia? → part, 4
  23 |  |  | Give reasons for the following:          → q, 5   (the lettering restarts below it)
  24 |  |  | (a) Sri Lanka adopted a majoritarian…    → part, 5
  25 |  | C | COMPETENCY BASED QUESTIONS               → section, 0
  26 |  | B | Case Based Question                      → section, 0
  27 |  |  | Read the passage and answer the questions that follow: → case, 6
  28 |  |  | The Gandhi–Irwin Pact was signed in…     → text, 6
  29 |  |  | • When was the pact signed?              → caseq, 6
  30 |  |  | ➢ What did Gandhiji agree to do?         → caseq, 6
  31 | ▪ |  | Name the city where it was held.          → caseq, 6
  32 |  | C B | MAP WORK                                → section, 0
  33 |  |  | Q9. On the outline map of India, locate: → q, 7

Reply with the labels for every line, in order.`;
}

export function userPrompt(layout: Layout, lines: string, prev?: string, problems?: string[]) {
  let s = `Layout: ${layout}\nLines (number | auto-number | flags | text):\n${lines}`;
  if (prev && problems?.length) {
    s += `\n\nYour last labels (number:role/group) were:\n${prev}\n\nThey have these problems:\n${problems.map((p) => "- " + p).join("\n")}\n\nFix them and reply with the full corrected list for every line.`;
  }
  return s;
}

export const SCHEMA = {
  type: "object",
  properties: {
    labels: {
      type: "array",
      items: {
        type: "object",
        properties: { i: { type: "integer" }, r: { type: "string", enum: [...ROLES] }, g: { type: "integer" }, m: { type: "string" } },
        required: ["i", "r", "g", "m"],
        additionalProperties: false,
      },
    },
  },
  required: ["labels"],
  additionalProperties: false,
};
