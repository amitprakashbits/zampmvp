import type { ActionKind, AgentDecision, ApiMode, Channel, LearningStats, User } from "../types";
import { CHANNELS } from "../types";
import { learningPromptSummary } from "./learning";
import { mockDecision } from "./mockAgent";
import { sleep } from "./utils";

/* ────────────────────────────────────────────────────────────────────────
   The agent's reasoning. Two interchangeable backends behind one call:
     • LIVE  — claude-sonnet-4-6 via the Anthropic API (needs a key).
     • MOCK  — deterministic local rules (zero setup; default).
   Both return the SAME shape; the learning layer is applied on top in App.
   ──────────────────────────────────────────────────────────────────────── */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1000;

const apiKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)?.trim();

/** Live when a key is present, otherwise mock. Decided once at load. */
export const API_MODE: ApiMode = apiKey ? "live" : "mock";

/** Defensive JSON parse: strip fences, locate the object, validate fields. */
export function parseAgentJSON(text: string): AgentDecision {
  let t = (text || "").trim();
  t = t.replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("no json object found");
  const obj = JSON.parse(t.slice(a, b + 1));

  const action = String(obj.action || "").toUpperCase().trim() as ActionKind;
  if (!["ACT", "ESCALATE", "SKIP"].includes(action)) {
    throw new Error("bad action: " + action);
  }
  let channel = String(obj.channel || "").trim() as Channel | "—";
  if (!CHANNELS.includes(channel as Channel)) channel = "—";

  return {
    root_cause: String(obj.root_cause || "").trim() || "Unspecified",
    channel,
    action,
    reasoning: String(obj.reasoning || "").trim(),
    draft_message: String(obj.draft_message || "").trim(),
  };
}

function buildPrompt(user: User, learning: LearningStats): string {
  const profile = {
    name: user.name,
    dropped_off_at: user.dropOff,
    time_since_last_activity: user.idle,
    prior_signals: user.signals,
    channel_preference: user.pref,
    estimated_account_value_usd: user.value,
  };

  return `You are an autonomous recovery agent working a conversion funnel for a US-stock investing app. You own one number: recovered revenue. You work a queue of stalled users one at a time and decide the single best next move for each — no human prompts you.

You also LEARN from outcomes. Here is what recent outcomes show about which channel recovers which drop-off reason (recovery rate and sample size):
${learningPromptSummary(learning)}

Use this evidence when choosing a channel: prefer the channel that has been recovering this kind of drop-off best, and say so in your reasoning when the evidence is meaningful. Otherwise respect the user's channel preference.

For the user below, decide:
1. root_cause — the most likely specific reason they stalled (never just "they dropped off").
2. channel — exactly one of "Call", "WhatsApp", "Email".
3. action — exactly one of "ACT", "ESCALATE", "SKIP".
   • ACT = reach out now on the chosen channel.
   • ESCALATE = hand to a human when the case is ambiguous, high-value and sensitive, negative-sentiment, or when a templated outreach is the wrong move.
   • SKIP = the user has very likely ALREADY converted or is actively converting right now (e.g. active minutes ago, on the funding screen, just linked a bank). Do NOT spend an outreach chasing a recovery already in motion. A disciplined skip beats a wasted touch and a vanity recovery.
4. reasoning — 1–2 tight sentences a teammate could audit; reference the learned evidence if it influenced the channel.
5. draft_message — the actual personalized outreach copy for the chosen channel, in the user's name, short and human. Empty string if action is SKIP.

User profile:
${JSON.stringify(profile, null, 2)}

Return ONLY strict minified JSON with exactly these keys: root_cause, channel, action, reasoning, draft_message. No markdown, no code fences, no preamble, no trailing text.`;
}

async function callLiveAgent(user: User, learning: LearningStats): Promise<AgentDecision> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey as string,
      "anthropic-version": "2023-06-01",
      // Required to call the Anthropic API directly from a browser.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: buildPrompt(user, learning) }],
    }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "api error");
  const text = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
  return parseAgentJSON(text);
}

/** Single entry point used by the queue worker. Picks backend by API_MODE. */
export async function getDecision(
  user: User,
  learning: LearningStats,
): Promise<AgentDecision> {
  if (API_MODE === "live") {
    return callLiveAgent(user, learning);
  }
  // Mock: a touch of latency so the "working…" state reads like real work,
  // and the avg-decision-time metric is meaningful.
  await sleep(700 + Math.floor(Math.random() * 700));
  return mockDecision(user);
}
