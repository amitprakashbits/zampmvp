import {
  CHANNELS,
  type AgentDecision,
  type Channel,
  type ChannelStat,
  type LearningStats,
  type OutcomeKind,
  type User,
} from "../types";

/* ────────────────────────────────────────────────────────────────────────
   The outcome feedback loop. The agent keeps a running tally of which channel
   recovers which kind of drop-off, and lets that shift future channel picks.
   This is intentionally simple and legible — a viewer can read the stats and
   predict the agent's next move.
   ──────────────────────────────────────────────────────────────────────── */

/** Minimum touches on a (reason, channel) before we trust its recovery rate. */
export const MIN_SAMPLES = 3;
/** A learned channel must beat the chosen one by this margin to force a shift. */
export const SHIFT_MARGIN = 0.2;

const EMPTY: ChannelStat = { acted: 0, recovered: 0, convertedAnyway: 0 };

/** recovery rate = recovered / touches-with-a-response. */
export const rateOf = (s?: ChannelStat) =>
  s && s.acted > 0 ? s.recovered / s.acted : 0;

/** Best-performing channel for a reason, among those with enough samples. */
export function bestChannel(
  learning: LearningStats,
  reason: string,
): { channel: Channel; rate: number; n: number } | null {
  const byChannel = learning[reason];
  if (!byChannel) return null;
  let best: { channel: Channel; rate: number; n: number } | null = null;
  for (const ch of CHANNELS) {
    const s = byChannel[ch];
    if (s && s.acted >= MIN_SAMPLES) {
      const r = rateOf(s);
      if (!best || r > best.rate) best = { channel: ch, rate: r, n: s.acted };
    }
  }
  return best;
}

const pct = (r: number) => Math.round(r * 100) + "%";

/**
 * Apply learned channel effectiveness to a fresh decision.
 * - On ACT, if another channel recovers this drop-off reason meaningfully
 *   better than the one the agent picked, shift the channel and explain why.
 * - If the picked channel is already the learned best, attach a confirming note.
 * Non-ACT decisions pass through untouched.
 */
export function applyLearning(
  decision: AgentDecision,
  user: User,
  learning: LearningStats,
): AgentDecision {
  if (decision.action !== "ACT" || decision.channel === "—") return decision;

  const reason = user.dropOff;
  const best = bestChannel(learning, reason);
  if (!best) return decision;

  const chosen = decision.channel as Channel;
  const chosenStat = learning[reason]?.[chosen];
  const chosenRate =
    chosenStat && chosenStat.acted >= MIN_SAMPLES ? rateOf(chosenStat) : null;

  const beatsByMargin =
    chosenRate === null || best.rate - chosenRate >= SHIFT_MARGIN;

  if (best.channel !== chosen && beatsByMargin) {
    const vs =
      chosenRate === null
        ? `${chosen} has too little history`
        : `${chosen} (${pct(chosenRate)})`;
    return {
      ...decision,
      channel: best.channel,
      base_channel: chosen,
      learning_note: `Learned: '${reason}' recovers better on ${best.channel} (${pct(
        best.rate,
      )} over ${best.n}) than ${vs} → shifting channel ${chosen}→${best.channel}.`,
    };
  }

  if (best.channel === chosen) {
    return {
      ...decision,
      learning_note: `Learned: ${chosen} leads for '${reason}' (${pct(
        best.rate,
      )} recovery over ${best.n}) → keeping channel.`,
    };
  }

  return decision;
}

/** Immutably fold a recorded outcome into the learning tally. */
export function recordOutcome(
  learning: LearningStats,
  reason: string,
  channel: Channel | "—",
  outcome: OutcomeKind,
): LearningStats {
  if (channel === "—") return learning;
  const prev = learning[reason]?.[channel] ?? EMPTY;
  const next: ChannelStat = {
    acted: prev.acted + (outcome === "converted_anyway" ? 0 : 1),
    recovered: prev.recovered + (outcome === "recovered" ? 1 : 0),
    convertedAnyway: prev.convertedAnyway + (outcome === "converted_anyway" ? 1 : 0),
  };
  return {
    ...learning,
    [reason]: { ...(learning[reason] ?? {}), [channel]: next },
  };
}

/** Compact human-readable summary fed into the live prompt so the LLM can
 *  reference what's been learned when it chooses a channel. */
export function learningPromptSummary(learning: LearningStats): string {
  const lines: string[] = [];
  for (const reason of Object.keys(learning)) {
    const parts: string[] = [];
    for (const ch of CHANNELS) {
      const s = learning[reason]?.[ch];
      if (s && s.acted > 0) parts.push(`${ch} ${pct(rateOf(s))} (n=${s.acted})`);
    }
    if (parts.length) lines.push(`- ${reason}: ${parts.join(", ")}`);
  }
  return lines.length
    ? lines.join("\n")
    : "(no outcome history yet — use channel preference and judgement)";
}

/* ── view model for the "What the agent has learned" panel ─────────────── */

export interface LearningRow {
  reason: string;
  channels: { channel: Channel; rate: number; n: number; isBest: boolean }[];
  totalActed: number;
}

export function learningView(learning: LearningStats): LearningRow[] {
  return Object.keys(learning)
    .map((reason) => {
      const best = bestChannel(learning, reason);
      const channels = CHANNELS.flatMap((channel) => {
        const s = learning[reason]?.[channel];
        if (!s || s.acted === 0) return [];
        return [
          {
            channel,
            rate: rateOf(s),
            n: s.acted,
            isBest: best?.channel === channel,
          },
        ];
      }).sort((a, b) => b.rate - a.rate);
      const totalActed = channels.reduce((sum, c) => sum + c.n, 0);
      return { reason, channels, totalActed };
    })
    .filter((r) => r.channels.length > 0)
    .sort((a, b) => b.totalActed - a.totalActed);
}
