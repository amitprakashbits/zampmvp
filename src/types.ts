/* ── domain types ─────────────────────────────────────────────────────── */

export type Channel = "Call" | "WhatsApp" | "Email";
export const CHANNELS: Channel[] = ["Call", "WhatsApp", "Email"];

export type ActionKind = "ACT" | "ESCALATE" | "SKIP";

export type Status =
  | "inbox"
  | "processing"
  | "actioned"
  | "recovered"
  | "escalated"
  | "skipped";

/** How the agent runs: dry-run (decides, doesn't send) vs live (would dispatch). */
export type RunMode = "shadow" | "live";

/** Where the agent's reasoning comes from. */
export type ApiMode = "live" | "mock";

/** Outcomes a human (or the simulator) can record on an actioned user. */
export type OutcomeKind = "recovered" | "ignored" | "converted_anyway";

/** A single decision returned by the agent (live LLM or mock), post-parse. */
export interface AgentDecision {
  root_cause: string;
  channel: Channel | "—";
  action: ActionKind;
  reasoning: string;
  draft_message: string;
  /** Channel before the learning layer shifted it, if it did. */
  base_channel?: Channel | "—";
  /** Human-readable note explaining a learning-driven channel shift / confirmation. */
  learning_note?: string;
}

/** What the agent would (shadow) or did (live stub) dispatch. */
export interface DispatchRecord {
  channel: Channel | "—";
  message: string;
  mode: RunMode;
  status: "would_send" | "sent" | "noop";
  at: string;
}

export interface User {
  id: string;
  name: string;
  dropOff: string;
  idle: string;
  pref: Channel;
  value: number;
  /** Hidden warmth used ONLY by the outcome simulator. The agent never sees it. */
  propensity: number;
  signals: string[];
  status: Status;
  result: AgentDecision | null;
  resolvedBy: "approved" | "overridden" | null;
  dispatch: DispatchRecord | null;
  outcome: OutcomeKind | null;
}

/** Raw user fields a human can add from the UI. */
export interface NewUserInput {
  name: string;
  dropOff: string;
  idle: string;
  pref: Channel;
  value: number;
  signals: string[];
}

export type AuditKind =
  | "diagnosed"
  | "actioned"
  | "recovered"
  | "escalated"
  | "skipped"
  | "human"
  | "outcome"
  | "learning"
  | "error";

export interface AuditEntry {
  time: string;
  who: string;
  text: string;
  kind: AuditKind;
}

/* ── learning / outcome feedback loop ─────────────────────────────────── */

export interface ChannelStat {
  acted: number; // touches that got a definitive response (recovered + ignored)
  recovered: number;
  convertedAnyway: number; // converted on their own; excluded from effectiveness
}

/** keyed: dropOff reason → channel → stats */
export type LearningStats = Record<string, Partial<Record<Channel, ChannelStat>>>;

/* ── chat / delegation surface ────────────────────────────────────────── */

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  ts: string;
  /** marks a message that triggered a real action (rendered with an accent). */
  action?: boolean;
}

/** Actions the chat can actually trigger on the running employee. */
export type ChatAction =
  | { type: "none" }
  | { type: "run_shift" }
  | { type: "simulate" }
  | { type: "set_mode"; mode: RunMode }
  | { type: "reset" };
