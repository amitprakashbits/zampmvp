import type { AgentDecision, Channel, User } from "../types";

/* ────────────────────────────────────────────────────────────────────────
   Mock reasoning. Returns realistic, deterministic decisions so the whole app
   works with ZERO setup (no API key). The rules mirror what a competent
   recovery agent would conclude from each user's signals, and reproduce all
   four behaviours: ACT, ESCALATE, SKIP, and the fail-safe.

   This is the BASE decision only - the learning layer (applyLearning) may then
   shift the channel, exactly as it does for live LLM output.
   ──────────────────────────────────────────────────────────────────────── */

const has = (signals: string[], needle: string) =>
  signals.some((s) => s.toLowerCase().includes(needle.toLowerCase()));

const hasAny = (signals: string[], needles: string[]) =>
  needles.some((n) => has(signals, n));

const firstName = (name: string) => name.split(" ")[0];

function draftFor(user: User, channel: Channel, rootCause: string): string {
  const fn = firstName(user.name);
  if (channel === "Call") {
    return `Call script - ${fn}: "Hi ${fn}, this is Recover from your investing app. I noticed you got held up at ${rootCause.toLowerCase()}. I've got two minutes to sort it with you right now if that works?"`;
  }
  if (channel === "WhatsApp") {
    return `Hi ${fn} - saw your setup stalled at ${rootCause.toLowerCase()}. Want me to fix it for you? Reply here and I'll walk you through it in under 2 minutes. - Recover`;
  }
  return `Hi ${fn},\n\nYou were almost there - it looks like things stalled at ${rootCause.toLowerCase()}. I can clear it in a couple of minutes; just reply and I'll take it from here.\n\n- Recover, your investing app`;
}

export function mockDecision(user: User): AgentDecision {
  const sig = user.signals;

  /* ── SKIP: actively converting right now - don't waste a touch ── */
  const convertingNow =
    hasAny(sig, [
      "active 9 min",
      "active 5 min",
      "min ago",
      "on funding screen now",
      "entered a deposit",
      "completed bank link",
    ]) &&
    !has(sig, "no reply") &&
    user.propensity === 0;

  if (convertingNow) {
    return {
      root_cause: `${user.dropOff} - but the user is mid-conversion, not stalled`,
      channel: "-",
      action: "SKIP",
      reasoning:
        "Signals show active progress in the last few minutes (just linked a bank / on the funding screen). A disciplined skip beats a wasted touch and a vanity recovery.",
      draft_message: "",
      confidence: 0.93,
    };
  }

  /* ── ESCALATE: sensitive, high-value, or negative - wrong for a template ── */
  const sensitive =
    hasAny(sig, [
      "name / pan mismatch",
      "manual review",
      "negative sentiment",
      "may close account",
      "fees unclear",
      "no reply to comms",
    ]) || user.value >= 100000;

  if (sensitive) {
    const isCompliance = hasAny(sig, ["pan mismatch", "manual review"]);
    return {
      root_cause: isCompliance
        ? "KYC blocked in manual review - identity/PAN mismatch needs a human"
        : "High-value account with negative sentiment - outreach is delicate",
      channel: user.pref,
      action: "ESCALATE",
      reasoning: isCompliance
        ? `Compliance-gated and high-value (${"$" + user.value.toLocaleString()}). A templated nudge can't clear a manual KYC review - routing to a human.`
        : `High-value (${"$" + user.value.toLocaleString()}) and explicitly unhappy (mentions closing / unclear fees). A canned message risks the account - a human should own this.`,
      draft_message: "",
      confidence: isCompliance ? 0.71 : 0.66,
    };
  }

  /* ── ACT: clear recovery candidate ── */
  const rootCause = (() => {
    if (has(sig, "retried bank link"))
      return "Bank link failing repeatedly - likely a credential or institution mismatch";
    if (has(sig, "exited kyc at id upload"))
      return "Stuck at KYC ID upload - probably a document/format issue";
    if (has(sig, "viewed") && has(sig, "order ticket"))
      return "Funded and engaged but hasn't placed the first trade - needs a confident nudge";
    return `Stalled at ${user.dropOff.toLowerCase()} - recoverable with a timely touch`;
  })();

  const channel = user.pref;
  const confidence = Math.min(0.9, 0.72 + Math.min(sig.length, 6) * 0.025);
  return {
    root_cause: rootCause,
    channel,
    action: "ACT",
    reasoning: `Warm, recoverable signals and no red flags. Reaching out on ${channel} (their preference) while intent is still fresh.`,
    draft_message: draftFor(user, channel, rootCause),
    confidence: Math.round(confidence * 100) / 100,
  };
}
