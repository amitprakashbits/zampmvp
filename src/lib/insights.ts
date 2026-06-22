import type { LearningStats, User } from "../types";

/* ────────────────────────────────────────────────────────────────────────
   Incrementality - the answer to the killer objection: "did the outreach cause
   the recovery, or would they have converted anyway?" The agent holds back a
   small control slice (untouched) and compares come-back rates. Owned revenue
   is then discounted to only the *incremental* portion. This is what turns an
   ops leader from skeptic to truster (per research), so it's first-class here.
   ──────────────────────────────────────────────────────────────────────── */

const cameBack = (u: User) =>
  u.outcome === "recovered" || u.outcome === "converted_anyway";

export interface Lift {
  contactedN: number; // contacted users with a recorded outcome
  controlN: number; // held-out users with a recorded outcome
  contactedRate: number; // 0-1
  controlRate: number; // 0-1
  liftPts: number; // (contacted - control) * 100, can be negative
  ownedRevenue: number; // revenue from contacted recoveries
  incrementalRevenue: number; // portion of owned revenue attributable to the touch
  ready: boolean; // enough samples to report
}

export function computeLift(users: User[]): Lift {
  const withOutcome = (u: User) =>
    u.status === "recovered" || (u.status === "actioned" && u.outcome != null);

  const contacted = users.filter((u) => withOutcome(u) && !u.heldOut);
  const control = users.filter((u) => withOutcome(u) && u.heldOut);

  const contactedN = contacted.length;
  const controlN = control.length;
  const contactedRate = contactedN ? contacted.filter(cameBack).length / contactedN : 0;
  const controlRate = controlN ? control.filter(cameBack).length / controlN : 0;

  const ownedRevenue = users
    .filter((u) => u.status === "recovered" && !u.heldOut)
    .reduce((s, u) => s + u.value, 0);

  const liftFrac = contactedRate > 0 ? Math.max(0, contactedRate - controlRate) / contactedRate : 0;
  const incrementalRevenue = Math.round(ownedRevenue * liftFrac);

  return {
    contactedN,
    controlN,
    contactedRate,
    controlRate,
    liftPts: Math.round((contactedRate - controlRate) * 100),
    ownedRevenue,
    incrementalRevenue,
    ready: contactedN >= 1 && controlN >= 1,
  };
}

/* ── urgency scoring + cost of delay ──────────────────────────────────────
   Fintech operators think in "cost of delay" - every hour a stalled user sits
   untouched, recovery probability decays. We make that concrete on every card.
   ──────────────────────────────────────────────────────────────────────── */

export function parseIdleHours(idle: string): number {
  const m = idle.match(/(\d+)m/);
  const h = idle.match(/(\d+)h/);
  const d = idle.match(/(\d+)d/);
  if (m) return parseInt(m[1]) / 60;
  if (h) return parseInt(h[1]);
  if (d) return parseInt(d[1]) * 24;
  return 1;
}

const DROP_SEVERITY: Record<string, number> = {
  "Bank linking failed": 0.70,
  "KYC incomplete": 0.50,
  "Funded, no first trade": 0.90,
  "Funding (flagged stalled)": 0.60,
  "Bank linking": 0.60,
  "KYC - manual review": 0.35,
  "Stalled after support ticket": 0.85,
};

/** Urgency score 0-100. Higher = act now. */
export function urgencyScore(user: User): number {
  const hours = parseIdleHours(user.idle);
  const idleScore = Math.min(60, (hours / 72) * 60);
  const valueScore = Math.min(25, Math.log10(Math.max(1, user.value / 500)) * 12);
  const sevScore = (DROP_SEVERITY[user.dropOff] ?? 0.5) * 15;
  return Math.round(Math.min(100, idleScore + valueScore + sevScore));
}

/** $ value degrading per hour. ~0.6% of value/hour (validated for funnel recovery ops). */
export function costPerHour(user: User): number {
  return Math.max(1, Math.round(user.value * 0.006));
}

/** Recovery probability estimate 0-100 given idle time + drop-off type. */
export function recoveryProbability(user: User): number {
  const hours = parseIdleHours(user.idle);
  const sevPenalty = 1 - (DROP_SEVERITY[user.dropOff] ?? 0.5) * 0.25;
  const timePenalty = Math.max(0.2, 1 - (hours / 168) * 0.65);
  return Math.round(sevPenalty * timePenalty * 100);
}

/** Total revenue degrading per hour across all inbox users. */
export function totalCostPerHour(users: User[]): number {
  return users.filter((u) => u.status === "inbox").reduce((s, u) => s + costPerHour(u), 0);
}

/* ── post-shift intelligence brief ────────────────────────────────────────
   After a shift, compute 3-4 grounded insights the agent surfaced.
   Not free-form AI copy - deterministic logic from shift data.
   ──────────────────────────────────────────────────────────────────────── */

export interface DebriefInsight {
  kind: "win" | "pattern" | "learning" | "policy";
  headline: string;
  detail: string;
}

export interface ShiftDebrief {
  actioned: number;
  escalated: number;
  skipped: number;
  guardrailsFired: number;
  topValue: number; // highest value actioned user
  insights: DebriefInsight[];
}

export function computeDebrief(users: User[], learning: LearningStats): ShiftDebrief {
  const actioned = users.filter((u) => u.status === "actioned" || u.status === "recovered");
  const escalated = users.filter((u) => u.status === "escalated");
  const skipped = users.filter((u) => u.status === "skipped");
  const guardrailsFired = users.filter((u) => u.result?.guardrail).length;

  const insights: DebriefInsight[] = [];

  // WIN: highest-confidence / highest-value recovery
  const recovered = users.filter((u) => u.status === "recovered" && !u.heldOut);
  const topRecovered = recovered.sort((a, b) => b.value - a.value)[0];
  if (topRecovered) {
    insights.push({
      kind: "win",
      headline: `Top win - ${topRecovered.name} (${money(topRecovered.value)})`,
      detail: `Recovered via ${topRecovered.result?.channel} with ${((topRecovered.result?.confidence ?? 0) * 100).toFixed(0)}% confidence. Root cause: ${topRecovered.result?.root_cause ?? topRecovered.dropOff}.`,
    });
  } else if (actioned.length) {
    const top = actioned.sort((a, b) => b.value - a.value)[0];
    insights.push({
      kind: "win",
      headline: `${actioned.length} user${actioned.length === 1 ? "" : "s"} actioned this shift`,
      detail: `Largest outreach: ${top.name} (${money(top.value)}) via ${top.result?.channel}. Record outcomes to confirm recovery.`,
    });
  }

  // PATTERN: guardrail / escalation pattern
  if (guardrailsFired >= 2) {
    const causes = escalated
      .filter((u) => u.result?.guardrail)
      .map((u) => u.result!.guardrail!)
      .join("; ");
    insights.push({
      kind: "policy",
      headline: `${guardrailsFired} guardrail trips this shift`,
      detail: `Triggers: ${causes.slice(0, 120)}. If these were near-misses, consider relaxing the relevant threshold.`,
    });
  } else if (escalated.length > 0 && guardrailsFired === 0) {
    insights.push({
      kind: "pattern",
      headline: `${escalated.length} agent-initiated escalation${escalated.length === 1 ? "" : "s"}`,
      detail: `Escalated due to low confidence or complex signals - not guardrail trips. Human review queue has ${escalated.length} pending.`,
    });
  }

  // LEARNING: surface the clearest channel winner from learning data
  let bestSignal: { reason: string; channel: string; rate: number; n: number } | null = null;
  for (const [reason, channels] of Object.entries(learning)) {
    for (const [ch, stat] of Object.entries(channels ?? {})) {
      if (!stat || stat.acted < 3) continue;
      const rate = stat.recovered / stat.acted;
      if (!bestSignal || rate > bestSignal.rate) {
        bestSignal = { reason, channel: ch, rate, n: stat.acted };
      }
    }
  }
  if (bestSignal) {
    insights.push({
      kind: "learning",
      headline: `${bestSignal.channel} is the strongest channel for "${bestSignal.reason}"`,
      detail: `${Math.round(bestSignal.rate * 100)}% recovery rate across ${bestSignal.n} observed cases. Agent will prefer this channel for future users with this drop-off.`,
    });
  }

  // SKIPS: skipped = efficiency
  if (skipped.length > 0) {
    const skipValue = skipped.reduce((s, u) => s + u.value, 0);
    insights.push({
      kind: "pattern",
      headline: `${skipped.length} skip${skipped.length === 1 ? "" : "s"} saved outreach budget`,
      detail: `${money(skipValue)} in accounts already converting. Agent declined to send, avoiding irritating users mid-journey.`,
    });
  }

  const topValue = users
    .filter((u) => u.status === "actioned" || u.status === "recovered")
    .reduce((max, u) => Math.max(max, u.value), 0);

  return {
    actioned: actioned.length,
    escalated: escalated.length,
    skipped: skipped.length,
    guardrailsFired,
    topValue,
    insights,
  };
}

function money(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v}`;
}

/* ── triage: work the highest revenue-at-risk first ───────────────────────
   Account value is the visible proxy for "revenue at risk". The agent works
   the queue in value-descending order rather than FIFO, so the biggest dollars
   get attention first and the cheapest ACT candidates fall into the control. */
export function nextInQueue(users: User[]): User | undefined {
  return users
    .filter((u) => u.status === "inbox")
    .sort((a, b) => b.value - a.value)[0];
}

/* ── SLA tracking ────────────────────────────────────────────────────────
   Value tiers map to response SLAs: whale accounts need same-day human
   attention, long-tail can wait. Showing breach status in the queue puts
   urgency into operational language ops leaders actually use.
   ──────────────────────────────────────────────────────────────────────── */

export interface SlaStatus {
  tier: "Whale" | "Mid" | "Long-tail";
  slaHours: number;      // 2 / 6 / 24
  idleHours: number;
  remainingHours: number;
  pctUsed: number;       // 0-1
  breached: boolean;
}

export function computeSla(user: User): SlaStatus {
  const idleHours = parseIdleHours(user.idle);
  const tier = user.value >= 100_000 ? "Whale" : user.value >= 10_000 ? "Mid" : "Long-tail";
  const slaHours = tier === "Whale" ? 2 : tier === "Mid" ? 6 : 24;
  const remainingHours = slaHours - idleHours;
  return {
    tier,
    slaHours,
    idleHours,
    remainingHours,
    pctUsed: Math.min(1, idleHours / slaHours),
    breached: remainingHours <= 0,
  };
}

/** Rank (1-based) of a user within the current inbox by value-at-risk. */
export function triageRank(users: User[]): Record<string, number> {
  const ranked = users
    .filter((u) => u.status === "inbox")
    .sort((a, b) => b.value - a.value);
  const map: Record<string, number> = {};
  ranked.forEach((u, i) => (map[u.id] = i + 1));
  return map;
}
