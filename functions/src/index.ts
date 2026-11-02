import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";
import { LAYOUTS, Layout, SCHEMA, systemPrompt, userPrompt } from "./prompt";

initializeApp();
const db = getFirestore();

// Set once with: firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MODEL = "claude-haiku-5-5";
// Pages allowed to call it: the live site and the local preview.
const ORIGINS: (string | RegExp)[] = ["https://jagritarora.github.io", /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
// A day's ceiling on AI calls, so a runaway page can't run up the bill (about ₹0.50 a call at most).
const DAILY_CAP = () => Number(process.env.PAPER_DAILY_CAP) || 300;
const MAX_LINES = 1500;
const MAX_CHARS = 150_000;

let client: Anthropic | undefined;

// POST { layout, lines, prev?, problems? } → { labels: [{ i, r, m }] }
// lines: the paper read into numbered lines by the page (js/paperdoc.js); prev + problems: a second
// try after the page's own checks found something wrong with the first labels.
export const paper = onRequest(
  { region: "asia-south1", secrets: [ANTHROPIC_API_KEY], cors: ORIGINS, timeoutSeconds: 120, memory: "256MiB", maxInstances: 3 },
  async (req, res) => {
    try {
      const origin = req.get("origin") || "";
      if (!ORIGINS.some((o) => (typeof o === "string" ? o === origin : o.test(origin)))) {
        res.status(403).json({ error: "Not allowed from here" });
        return;
      }
      if (req.method !== "POST") {
        res.status(405).json({ error: "POST only" });
        return;
      }
      const { layout, lines, prev, problems } = req.body || {};
      if (!(layout in LAYOUTS) || typeof lines !== "string" || !lines.trim()) {
        res.status(400).json({ error: "Send layout and lines" });
        return;
      }
      const count = lines.split("\n").length;
      if (count > MAX_LINES || lines.length + String(prev || "").length > MAX_CHARS) {
        res.status(413).json({ error: "This paper is too long for one go" });
        return;
      }
      const fixes = Array.isArray(problems) ? problems.filter((p) => typeof p === "string").slice(0, 40).map((p) => p.slice(0, 300)) : [];

      const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const usage = db.doc(`usage/${day}`);
      const allowed = await db.runTransaction(async (t) => {
        const calls = (await t.get(usage)).get("calls") || 0;
        if (calls >= DAILY_CAP()) return false;
        t.set(usage, { calls: calls + 1 }, { merge: true });
        return true;
      });
      if (!allowed) {
        res.status(429).json({ error: "The formatter has used today's limit. It works again tomorrow." });
        return;
      }

      client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const msg = await client.messages
        .stream({
          model: MODEL,
          max_tokens: 32000,
          output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
          system: systemPrompt(layout as Layout),
          messages: [{ role: "user", content: userPrompt(layout as Layout, lines, typeof prev === "string" ? prev : undefined, fixes) }],
        })
        .finalMessage();

      await usage.set(
        { input: FieldValue.increment(msg.usage.input_tokens), output: FieldValue.increment(msg.usage.output_tokens) },
        { merge: true },
      );
      const text = msg.content.find((b) => b.type === "text");
      if (msg.stop_reason !== "end_turn" || !text || text.type !== "text") {
        res.status(502).json({ error: `The AI stopped early (${msg.stop_reason})` });
        return;
      }
      const { labels } = JSON.parse(text.text);
      res.json({ labels, usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: (e as Error).message });
    }
  },
);
