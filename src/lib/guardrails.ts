import type { AgentDecision, Policy, User } from "../types";
import { money } from "./utils";

/* ────────────────────────────────────────────────────────────────────────
   Operator guardrails. The agent is autonomous, but it runs inside limits the
   operator sets — exactly the "delegate the work, keep the controls" posture.
   Guardrails run AFTER the agent's own decision (and the learning layer) and
   can only ever make a decision MORE conservative (ACT → ESCALATE), never less.
   ──────────────────────────────────────────────────────────────────────── */

export const DEFAULT_POLICY: Policy = {
  maxAutoValue: 100000,
  escalateNegativeSentiment: true,
  minConfidence: 0.55,
};

const NEGATIVE_HINTS = [
  "negative sentiment",
  "may close account",
  "close account",
  "fees unclear",
  "complaint",
  "angry",
  "unhappy",
];

const hasNegative = (u: User) =>
  u.signals.some((s) => NEGATIVE_HINTS.some((h) => s.toLowerCase().includes(h)));

/**
 * Enforce operator policy on a decision. Returns the decision unchanged unless
 * a guardrail trips on an ACT, in which case it's escalated with an explicit,
 * auditable reason.
 */
export function applyGuardrails(
  decision: AgentDecision,
  user: User,
  policy: Policy,
): AgentDecision {
  if (decision.action !== "ACT") return decision;

  const trip = (guardrail: string): AgentDecision => ({
    ...decision,
    action: "ESCALATE",
    guardrail,
    reasoning: `${decision.reasoning} · Guardrail: ${guardrail}`,
  });

  if (user.value >= policy.maxAutoValue) {
    return trip(
      `account value ${money(user.value)} ≥ ${money(policy.maxAutoValue)} auto-action ceiling → human sign-off`,
    );
  }
  if (policy.escalateNegativeSentiment && hasNegative(user)) {
    return trip("negative sentiment detected → human handles the relationship");
  }
  if (decision.confidence < policy.minConfidence) {
    return trip(
      `confidence ${decision.confidence.toFixed(2)} below ${policy.minConfidence.toFixed(
        2,
      )} floor → human review`,
    );
  }
  return decision;
}

/** Short labels for the guardrails panel. */
export function policyRules(policy: Policy): { label: string; value: string; on: boolean }[] {
  return [
    {
      label: "Escalate high-value accounts",
      value: `≥ ${money(policy.maxAutoValue)}`,
      on: true,
    },
    {
      label: "Escalate on negative sentiment",
      value: policy.escalateNegativeSentiment ? "on" : "off",
      on: policy.escalateNegativeSentiment,
    },
    {
      label: "Min confidence to auto-act",
      value: policy.minConfidence.toFixed(2),
      on: true,
    },
  ];
}
