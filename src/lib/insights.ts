import type { User } from "../types";

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

/* ── triage: work the highest revenue-at-risk first ───────────────────────
   Account value is the visible proxy for "revenue at risk". The agent works
   the queue in value-descending order rather than FIFO, so the biggest dollars
   get attention first and the cheapest ACT candidates fall into the control. */
export function nextInQueue(users: User[]): User | undefined {
  return users
    .filter((u) => u.status === "inbox")
    .sort((a, b) => b.value - a.value)[0];
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
