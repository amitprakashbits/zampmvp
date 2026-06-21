import type { LucideIcon } from "lucide-react";
import { C, MONO } from "../../theme";
import type { OutcomeKind, User } from "../../types";
import { CardShell, ChannelTag, ConfidenceChip, DraftToggle, Name } from "../shared";

const OUTCOME_LABEL: Record<OutcomeKind, string> = {
  recovered: "Recovered",
  ignored: "Ignored - no response",
  converted_anyway: "Converted anyway · uncredited",
};

const OUTCOME_COLOR: Record<OutcomeKind, string> = {
  recovered: C.recovered,
  ignored: C.skipped,
  converted_anyway: C.soft,
};

function ShiftedChannel({ u }: { u: User }) {
  const r = u.result;
  if (!r || r.channel === "-") return null;
  if (!r.base_channel || r.base_channel === r.channel) {
    return <ChannelTag channel={r.channel} />;
  }
  // Learning shifted the channel - show the move explicitly.
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

  let text: string;
  let color: string;
  let bg: string;
  let border: string;
  if (d.status === "held_out") {
    text = "CONTROL · held out";
    color = C.skipped;
    bg = C.surfaceAlt;
    border = C.line;
  } else if (d.mode === "shadow") {
    text = "WOULD SEND · dry-run";
    color = C.accent;
    bg = C.accentSoft;
    border = "#D4E2FB";
  } else {
    text = d.status === "noop" ? "LIVE · send stubbed" : "SENT · live";
    color = C.soft;
    bg = C.surfaceAlt;
    border = C.line;
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: MONO,
        fontSize: 9.5,
        letterSpacing: "0.07em",
        color,
        background: bg,
        border: `1px solid ${border}`,
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
        {u.heldOut ? "Record control outcome → lift" : "Record outcome → agent learns"}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {btn("recovered", u.heldOut ? "Came back" : "Recovered", C.recovered)}
        {btn("ignored", u.heldOut ? "Stayed away" : "Ignored", C.skipped)}
        {!u.heldOut && btn("converted_anyway", "Converted anyway", C.soft)}
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
  /** Only passed for the Actioned lane - enables outcome recording. */
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
        {r?.channel && r.channel !== "-" && <span style={{ color: C.line }}>·</span>}
        <ShiftedChannel u={u} />
        <DispatchPill u={u} />
        {r && <span style={{ marginLeft: "auto" }}><ConfidenceChip value={r.confidence} /></span>}
      </div>

      <div style={{ fontSize: 12.5, color: C.ink, marginTop: 7, lineHeight: 1.45 }}>
        <span style={{ color: C.soft }}>Root cause - </span>
        {r?.root_cause}
      </div>
      <div style={{ fontSize: 12, color: C.soft, marginTop: 5, lineHeight: 1.45 }}>{r?.reasoning}</div>

      {r?.learning_note && (
        <div
          style={{
            marginTop: 7,
            fontSize: 11.5,
            color: C.accent,
            background: C.accentSoft,
            border: "1px solid #D4E2FB",
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
          {u.heldOut && <span style={{ color: C.faint, fontWeight: 400 }}> · control (uncredited)</span>}
        </div>
      )}
    </CardShell>
  );
}
