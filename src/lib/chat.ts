import type {
  ApiMode,
  ChatAction,
  ChatMessage,
  LearningStats,
  Policy,
  RunMode,
  User,
} from "../types";
import type { Metrics } from "../components/Scorecard";
import { API_MODE, liveChatComplete } from "./agent";
import { learningView } from "./learning";
import { policyRules } from "./guardrails";
import { money } from "./utils";

/* ────────────────────────────────────────────────────────────────────────
   The delegation surface. Recover is an employee you *delegate to* and
   *interrogate* - not a chatbot you re-prompt for every action. So the chat:
     • turns plain instructions into real actions (run the shift, simulate
       outcomes, switch shadow/live, reset) - deterministically, in any mode;
     • answers questions grounded in the LIVE state (queue, decisions,
       metrics, what it has learned) - mock heuristics with no key, or
       claude-sonnet-4-6 when a key is set.
   ──────────────────────────────────────────────────────────────────────── */

export interface ChatContext {
  mode: RunMode;
  apiMode: ApiMode;
  metrics: Metrics;
  inbox: number;
  users: User[];
  learning: LearningStats;
  policy: Policy;
}

export interface ChatReply {
  reply: string;
  action: ChatAction;
}

const has = (t: string, ...needles: string[]) => needles.some((n) => t.includes(n));

/** Parse a dollar amount like "$100,000", "100k", "1m" from text. */
function parseAmount(t: string): number | null {
  const m = t.match(/\$?\s*([\d][\d,]*(?:\.\d+)?)\s*([km])?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const suffix = (m[2] || "").toLowerCase();
  if (suffix === "k") n *= 1000;
  if (suffix === "m") n *= 1_000_000;
  return n;
}

/** Map a free-text instruction to a real action (deterministic, both modes). */
function detectAction(t: string): ChatAction {
  if (has(t, "run the shift", "run shift", "start the shift", "start a shift", "work the queue", "work the inbox", "get to work", "start working"))
    return { type: "run_shift" };
  if (has(t, "simulate", "roll outcome", "record outcome", "mark outcome"))
    return { type: "simulate" };
  if (has(t, "go live", "live mode", "switch to live", "turn on live"))
    return { type: "set_mode", mode: "live" };
  if (has(t, "shadow mode", "go to shadow", "switch to shadow", "dry run", "dry-run", "stop sending"))
    return { type: "set_mode", mode: "shadow" };
  if (has(t, "reset", "clear the queue", "start over", "start fresh"))
    return { type: "reset" };

  // guardrail / policy controls
  if (has(t, "escalate") && has(t, "over", "above", "beyond", "ceiling", "more than", "greater than")) {
    const amt = parseAmount(t);
    if (amt != null) return { type: "set_policy", patch: { maxAutoValue: amt } };
  }
  if (has(t, "confidence")) {
    const m = t.match(/(\d+(?:\.\d+)?)\s*(%?)/);
    if (m) {
      let v = Number(m[1]);
      if (m[2] === "%" || v > 1) v = v / 100;
      v = Math.max(0.3, Math.min(0.95, v));
      return { type: "set_policy", patch: { minConfidence: v } };
    }
  }
  if (has(t, "stop escalating negative", "ignore sentiment", "don't escalate negative", "dont escalate negative"))
    return { type: "set_policy", patch: { escalateNegativeSentiment: false } };
  if (has(t, "escalate negative", "escalate on negative", "flag negative sentiment"))
    return { type: "set_policy", patch: { escalateNegativeSentiment: true } };

  return { type: "none" };
}

const policyLine = (p: Policy) => policyRules(p).map((r) => `${r.label}: ${r.value}`).join("; ");

/* ── grounded state helpers (shared by mock answers + the live prompt) ── */

const metricsLine = (m: Metrics) =>
  `Processed ${m.decided}/${m.total}. Recovered ${m.recovered} (${money(m.revenue)}). ` +
  `Auto-actioned vs escalated ${m.autoPct}%/${m.escPct}%. Skipped ${m.skipped}. ` +
  `Avg decision ${m.avg ? m.avg.toFixed(1) + "s" : "-"}.`;

const escalatedLines = (users: User[]) =>
  users
    .filter((u) => u.status === "escalated" && u.result)
    .map((u) => `• ${u.name} (${money(u.value)}) - ${u.result!.reasoning}`);

const skippedLines = (users: User[]) =>
  users
    .filter((u) => u.status === "skipped" && u.result)
    .map((u) => `• ${u.name} - ${u.result!.reasoning}`);

const learningLines = (learning: LearningStats) =>
  learningView(learning).map((row) => {
    const best = row.channels[0];
    return `• ${row.reason}: ${best.channel} leads (${Math.round(best.rate * 100)}% over ${best.n})`;
  });

const inboxLines = (users: User[]) =>
  users
    .filter((u) => u.status === "inbox")
    .map((u) => `• ${u.name} (${money(u.value)}) - ${u.dropOff}, prefers ${u.pref}`);

function stateSnapshot(ctx: ChatContext): string {
  const esc = escalatedLines(ctx.users);
  const skip = skippedLines(ctx.users);
  const learned = learningLines(ctx.learning);
  return [
    `Run mode: ${ctx.mode} (${ctx.mode === "shadow" ? "decides but does not send" : "routes through the (stubbed) live dispatch seam"}).`,
    `Scorecard: ${metricsLine(ctx.metrics)}`,
    `Inbox waiting: ${ctx.inbox}.`,
    esc.length ? `Escalated to a human:\n${esc.join("\n")}` : `Nothing escalated.`,
    skip.length ? `Skipped (already converting):\n${skip.join("\n")}` : `Nothing skipped yet.`,
    learned.length ? `What I've learned (channel leaders by drop-off reason):\n${learned.join("\n")}` : `No outcomes learned yet.`,
    `Operator guardrails I enforce: ${policyLine(ctx.policy)}.`,
  ].join("\n\n");
}

/* ── mock answers (no key) ─────────────────────────────────────────────── */

function mockAnswer(t: string, ctx: ChatContext): string {
  const m = ctx.metrics;

  if (has(t, "why", "escalat")) {
    const lines = escalatedLines(ctx.users);
    return lines.length
      ? `I escalated these because a templated touch was the wrong move - too sensitive or high-value to auto-action:\n\n${lines.join("\n")}`
      : "Nothing is escalated right now. I escalate when a case is high-value and sensitive, negative-sentiment, or compliance-gated - anything where a canned outreach could do harm.";
  }
  if (has(t, "skip", "already converting")) {
    const lines = skippedLines(ctx.users);
    return lines.length
      ? `I skipped these - they're already converting, so an outreach would be a wasted touch:\n\n${lines.join("\n")}`
      : "No skips yet. I skip users who are actively converting (active minutes ago, on the funding screen, just linked a bank) - a disciplined skip beats a vanity recovery.";
  }
  if (has(t, "learn", "working", "best channel", "what's working", "whats working", "channel")) {
    const lines = learningLines(ctx.learning);
    return `Here's what's working, by drop-off reason - I shift future channel picks toward each leader:\n\n${lines.join("\n")}\n\nThat's why, e.g., I move KYC-incomplete users off Email onto Call.`;
  }
  if (has(t, "queue", "inbox", "who's waiting", "whos waiting", "who is waiting", "left to")) {
    const lines = inboxLines(ctx.users);
    return lines.length
      ? `${ctx.inbox} in the inbox:\n\n${lines.join("\n")}\n\nSay "run the shift" and I'll work them one at a time.`
      : "Inbox is clear - I've worked everyone currently in the queue.";
  }
  if (has(t, "summar", "how's", "hows", "status", "how are we", "doing", "report", "recap")) {
    return `Shift so far - ${metricsLine(m)}\n\nI'm in ${ctx.mode} mode${
      ctx.mode === "shadow" ? " (deciding everything, sending nothing)" : " (routing through the stubbed live seam)"
    }. ${ctx.inbox ? `${ctx.inbox} still waiting in the inbox.` : "Inbox is clear."}`;
  }
  if (has(t, "live mode", "shadow", "what mode", "sending")) {
    return ctx.mode === "shadow"
      ? "I'm in shadow mode: I make every real decision and show the exact payload I'd send, but I don't send anything. It's the safe rollout posture. Say \"go live\" to route through the dispatch seam."
      : "I'm in live mode - actions route through the dispatch seam (currently a stub, so still nothing actually sends). Say \"switch to shadow\" for a pure dry-run.";
  }
  if (has(t, "guardrail", "policy", "rules", "limits", "controls", "allowed to")) {
    return `My operator guardrails right now - ${policyLine(ctx.policy)}. They only make me more conservative (auto-action → human), never less. Tell me e.g. "escalate over $50k" or "set confidence floor to 0.8" and I'll adopt it on the next shift.`;
  }
  if (has(t, "hello", "hi ", "hey", "who are you", "what can you", "help", "what do you")) {
    return "I'm Recover - I work your funnel's stalled users on my own: diagnose each one, pick a channel, act / escalate / skip, and learn from outcomes. You can delegate to me (\"run the shift\", \"simulate outcomes\", \"go live\") or ask about my calls (\"why did you escalate the big accounts?\", \"what's working best?\").";
  }
  // default: ground it in current state rather than waffle
  return `Here's where things stand - ${metricsLine(m)}\n\nAsk me why I made a specific call, what's working best by channel, or just tell me to "run the shift".`;
}

function actionReply(action: ChatAction, ctx: ChatContext): string {
  switch (action.type) {
    case "run_shift":
      return ctx.inbox
        ? `On it - starting a shift. I'll work the ${ctx.inbox} user${ctx.inbox === 1 ? "" : "s"} in the inbox one at a time: diagnose, pick a channel, then act, escalate, or skip. Watch the lanes.`
        : "The inbox is clear - nothing to work right now. Add a user or reset the queue and I'll get going.";
    case "simulate":
      return "Rolling outcomes for everyone I've actioned - I'll fold each result into what I've learned and shift future channel picks accordingly.";
    case "set_mode":
      return action.mode === "live"
        ? "Switching to live mode. Actions now route through the dispatch seam - which is a clearly-marked stub, so I still won't actually send anything."
        : "Back to shadow mode - I'll decide everything and show the exact payloads, but send nothing.";
    case "reset":
      return "Resetting the shift - fresh queue, cleared metrics. Say the word and I'll start working again.";
    case "set_policy": {
      const p = action.patch;
      if (p.maxAutoValue != null)
        return `Got it - I'll escalate any account at or above ${money(p.maxAutoValue)} for human sign-off instead of auto-actioning. Re-run the shift to apply it.`;
      if (p.minConfidence != null)
        return `Done - my confidence floor to auto-act is now ${p.minConfidence.toFixed(2)}. Anything I'm less sure about goes to a human. Re-run the shift to see it.`;
      if (p.escalateNegativeSentiment != null)
        return p.escalateNegativeSentiment
          ? "I'll escalate any negative-sentiment account to a human rather than send a templated touch."
          : "Understood - I'll no longer auto-escalate purely on negative sentiment.";
      return "Guardrail updated.";
    }
    default:
      return "";
  }
}

/* ── entry point ───────────────────────────────────────────────────────── */

export async function respondToChat(
  message: string,
  ctx: ChatContext,
  history: ChatMessage[],
): Promise<ChatReply> {
  const t = message.toLowerCase().trim();

  const action = detectAction(t);
  if (action.type !== "none") return { reply: actionReply(action, ctx), action };

  if (API_MODE === "live") {
    const system =
      "You are Recover, an autonomous recovery employee working a US-stock investing app's conversion funnel. " +
      "You work a queue of stalled users on your own: diagnose, pick a channel (Call/WhatsApp/Email), and ACT / ESCALATE / SKIP, then learn from outcomes. " +
      "You own one number: recovered revenue. You are NOT a generic chatbot - you speak as the employee who is already doing this work, in first person, concise and confident. " +
      "Answer the operator's question grounded ONLY in the live state below. Keep replies tight (2-5 sentences), reference specific users/numbers when relevant, and never invent data.\n\n" +
      "CURRENT STATE:\n" +
      stateSnapshot(ctx);
    const turns = history
      .slice(-6)
      .map((mm) => ({ role: (mm.role === "user" ? "user" : "assistant") as "user" | "assistant", content: mm.text }))
      .concat([{ role: "user", content: message }]);
    try {
      const reply = await liveChatComplete(system, turns);
      return { reply: reply || mockAnswer(t, ctx), action: { type: "none" } };
    } catch {
      return {
        reply:
          "I couldn't reach my reasoning backend just now, so here's the grounded read instead - " +
          metricsLine(ctx.metrics),
        action: { type: "none" },
      };
    }
  }

  return { reply: mockAnswer(t, ctx), action: { type: "none" } };
}
