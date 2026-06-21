import type { LucideIcon } from "lucide-react";
import { C, MONO } from "../../theme";
import type { OutcomeKind, User } from "../../types";
import { CardShell, ChannelTag, DraftToggle, Name } from "../shared";

const OUTCOME_LABEL: Record<OutcomeKind, string> = {
  recovered: "Recovered",
  ignored: "Ignored — no response",
  converted_anyway: "Converted anyway · uncredited",
};

const OUTCOME_COLOR: Record<OutcomeKind, string> = {
  recovered: C.recovered,
  ignored: C.skipped,
  converted_anyway: C.soft,
};

function ShiftedChannel({ u }: { u: User }) {
  const r = u.result;
  if (!r || r.channel === "—") return null;
  if (!r.base_channel || r.base_channel === r.channel) {
    return <ChannelTag channel={r.channel} />;
  }
  // Learning shifted the channel — show the move explicitly.
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
      <span style={{ color: C.faint, textDecoration: "line-through" }}>{r.base_channel}</span>
      <span style={{ color: C.faint }}>→</span>
      <ChannelTag channel={r.channel} />
    </span>
  );
}

function DispatchPill({ u }: { u: User }) {
  const d = u.dispatch;
  if (!d) return null;
  const isShadow = d.mode === "shadow";
  const text = isShadow
    ? "WOULD SEND · dry-run"
    : d.status === "noop"
      ? "LIVE · send stubbed (no-op)"
      : "SENT · live";
  const color = isShadow ? C.brand : C.actioned;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: MONO,
        fontSize: 9.5,
        letterSpacing: "0.08em",
        color,
        background: isShadow ? "#F3EEFE" : "#EFF4FE",
        border: `1px solid ${isShadow ? "#E2D6FB" : "#D7E3FC"}`,
        borderRadius: 5,
        padding: "2px 6px",
      }}
    >
      {text}
    </span>
  );
}

function OutcomeButtons({
  u,
  onOutcome,
}: {
  u: User;
  onOutcome: (u: User, outcome: OutcomeKind) => void;
}) {
  const btn = (outcome: OutcomeKind, label: string, color: string) => (
    <button
      onClick={() => onOutcome(u, outcome)}
      style={{
        all: "unset",
        cursor: "pointer",
        flex: 1,
        textAlign: "center",
        padding: "6px 0",
        background: C.surface,
        color,
        border: `1px solid ${C.line}`,
        borderRadius: 7,
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10.5, color: C.faint, marginBottom: 6, fontFamily: MONO, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Record outcome → agent learns
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {btn("recovered", "Recovered", C.recovered)}
        {btn("ignored", "Ignored", C.skipped)}
        {btn("converted_anyway", "Converted anyway", C.soft)}
      </div>
    </div>
  );
}

export function DecisionCard({
  u,
  accent,
  badge,
  BadgeIcon,
  onOutcome,
}: {
  u: User;
  accent: string;
  badge: string;
  BadgeIcon: LucideIcon;
  /** Only passed for the Actioned lane — enables outcome recording. */
  onOutcome?: (u: User, outcome: OutcomeKind) => void;
}) {
  const r = u.result;
  const awaitingOutcome = !!onOutcome && !u.outcome;
  return (
    <CardShell accent={accent}>
      <Name name={u.name} value={u.value} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.06em",
            color: accent,
            textTransform: "uppercase",
          }}
        >
          <BadgeIcon size={12} strokeWidth={2.2} /> {badge}
        </span>
        {r?.channel && r.channel !== "—" && <span style={{ color: C.line }}>·</span>}
        <ShiftedChannel u={u} />
        <DispatchPill u={u} />
      </div>

      <div style={{ fontSize: 12.5, color: C.ink, marginTop: 7, lineHeight: 1.45 }}>
        <span style={{ color: C.soft }}>Root cause — </span>
        {r?.root_cause}
      </div>
      <div style={{ fontSize: 12, color: C.soft, marginTop: 5, lineHeight: 1.45 }}>{r?.reasoning}</div>

      {r?.learning_note && (
        <div
          style={{
            marginTop: 7,
            fontSize: 11.5,
            color: C.brand,
            background: "#F3EEFE",
            border: "1px solid #E2D6FB",
            borderRadius: 7,
            padding: "6px 9px",
            lineHeight: 1.45,
          }}
        >
          {r.learning_note}
        </div>
      )}

      <DraftToggle
        message={r?.draft_message}
        channel={r?.channel}
        accent={accent}
        label={u.dispatch?.mode === "shadow" ? "payload" : "draft"}
      />

      {awaitingOutcome && onOutcome && <OutcomeButtons u={u} onOutcome={onOutcome} />}

      {u.outcome && (
        <div
          style={{
            marginTop: 9,
            fontSize: 11.5,
            fontWeight: 600,
            color: OUTCOME_COLOR[u.outcome],
          }}
        >
          Outcome: {OUTCOME_LABEL[u.outcome]}
        </div>
      )}
    </CardShell>
  );
}
