import type { LearningStats, User } from "../types";

/* ── seed: 7 stalled users across a US-equities onboarding/funnel ──────────
   `propensity` is hidden warmth used ONLY to simulate whether an actioned user
   actually comes back. The agent never sees it.

   The mix is deliberate so all behaviours fire in a demo:
     • clear ACT candidates ...... Priya, Marcus, Dev
     • SKIP (already converting) .. Aisha, Tom
     • ESCALATE (sensitive/high) .. Rohan, Sara
*/
type Seed = Omit<
  User,
  "status" | "result" | "resolvedBy" | "dispatch" | "outcome"
>;

export const SEED: Seed[] = [
  {
    id: "u-priya",
    name: "Priya Nair",
    dropOff: "Bank linking failed",
    idle: "6h ago",
    pref: "WhatsApp",
    value: 6400,
    propensity: 0.72,
    signals: ["Opened app 4× in 48h", "Retried bank link 2×", "Email verified"],
  },
  {
    id: "u-marcus",
    name: "Marcus Lee",
    dropOff: "KYC incomplete",
    idle: "2d ago",
    pref: "Email",
    value: 3200,
    propensity: 0.55,
    signals: ["Exited KYC at ID upload", "Opened app 2×"],
  },
  {
    id: "u-dev",
    name: "Dev Sharma",
    dropOff: "Funded, no first trade",
    idle: "18h ago",
    pref: "Call",
    value: 9000,
    propensity: 0.81,
    signals: [
      "Funded $2,000",
      "Built a 9-stock watchlist",
      "Opened app 5×",
      "Viewed AAPL order ticket",
    ],
  },
  {
    id: "u-aisha",
    name: "Aisha Khan",
    dropOff: "Funding (flagged stalled)",
    idle: "9m ago",
    pref: "WhatsApp",
    value: 5000,
    propensity: 0.0,
    signals: [
      "Active 9 min ago",
      "On funding screen now",
      "Linked bank 4 min ago",
      "Entered a deposit amount",
    ],
  },
  {
    id: "u-tom",
    name: "Tom Becker",
    dropOff: "Bank linking",
    idle: "7m ago",
    pref: "Email",
    value: 4100,
    propensity: 0.0,
    signals: [
      "Completed bank link 7 min ago",
      "Re-opened funding screen 2× in last 5 min",
      "Push enabled",
    ],
  },
  {
    id: "u-rohan",
    name: "Rohan Mehta",
    dropOff: "KYC — manual review",
    idle: "1d ago",
    pref: "Call",
    value: 180000,
    propensity: 0.4,
    signals: [
      "Intended deposit $180,000",
      "KYC flagged: name / PAN mismatch",
      "Opened app 3×",
      "No reply to comms",
    ],
  },
  {
    id: "u-sara",
    name: "Sara Williams",
    dropOff: "Stalled after support ticket",
    idle: "3d ago",
    pref: "Email",
    value: 42000,
    propensity: 0.35,
    signals: [
      "Ticket: 'fees unclear, may close account'",
      "$42,000 ready to fund",
      "Opened app 1× since ticket",
      "Negative sentiment",
    ],
  },
];

export const fresh = (): User[] =>
  SEED.map((u) => ({
    ...u,
    status: "inbox",
    result: null,
    resolvedBy: null,
    dispatch: null,
    outcome: null,
  }));

/* ── seeded prior learning ─────────────────────────────────────────────────
   Outcomes from "earlier shifts" so the learning panel isn't empty and the
   agent demonstrably references what it knows on the very first run. The
   numbers below make ONE shift visible immediately:

     • KYC incomplete → Call (80%, n=5) clearly beats Email (20%, n=5),
       so Marcus (who prefers Email) gets his channel shifted to Call.
     • Bank linking failed → WhatsApp leads, confirming Priya's WhatsApp.
     • Funded, no first trade → Call leads, confirming Dev's Call.
*/
export const seedLearning = (): LearningStats => ({
  "KYC incomplete": {
    Call: { acted: 5, recovered: 4, convertedAnyway: 0 },
    Email: { acted: 5, recovered: 1, convertedAnyway: 1 },
    WhatsApp: { acted: 3, recovered: 2, convertedAnyway: 0 },
  },
  "Bank linking failed": {
    WhatsApp: { acted: 6, recovered: 5, convertedAnyway: 0 },
    Email: { acted: 5, recovered: 2, convertedAnyway: 0 },
    Call: { acted: 3, recovered: 2, convertedAnyway: 0 },
  },
  "Funded, no first trade": {
    Call: { acted: 7, recovered: 6, convertedAnyway: 0 },
    WhatsApp: { acted: 5, recovered: 3, convertedAnyway: 1 },
  },
});
