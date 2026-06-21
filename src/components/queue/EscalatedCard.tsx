import { Flag, ShieldCheck } from "lucide-react";
import { C, MONO } from "../../theme";
import type { User } from "../../types";
import { CardShell, ConfidenceChip, DraftToggle, Name } from "../shared";

export function EscalatedCard({
  u,
  onApprove,
  onOverride,
}: {
  u: User;
  onApprove: (u: User) => void;
  onOverride: (u: User) => void;
}) {
  if (u.resolvedBy) {
    return (
      <CardShell accent={C.escalated}>
        <Name name={u.name} value={u.value} />
        <div style={{ fontSize: 12, color: C.soft, marginTop: 6 }}>
          {u.resolvedBy === "approved"
            ? u.dispatch?.mode === "shadow"
              ? "Human approved — would send (shadow)."
              : "Human approved — outreach dispatched."
            : "Human overrode — closed without outreach."}
        </div>
      </CardShell>
    );
  }
  return (
    <CardShell accent={C.escalated}>
      <Name name={u.name} value={u.value} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.06em",
            color: C.escalated,
            textTransform: "uppercase",
          }}
        >
          <Flag size={12} strokeWidth={2.2} /> awaiting you
        </span>
        {u.result && <span style={{ marginLeft: "auto" }}><ConfidenceChip value={u.result.confidence} /></span>}
      </div>
      {u.result?.guardrail && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 8,
            fontSize: 11.5,
            color: C.escalated,
            background: "#FBEFE2",
            border: "1px solid #F0DBC4",
            borderRadius: 7,
            padding: "6px 9px",
            lineHeight: 1.4,
          }}
        >
          <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <b style={{ fontWeight: 600 }}>Guardrail tripped — </b>
            {u.result.guardrail}
          </span>
        </div>
      )}
      <div style={{ fontSize: 12.5, color: C.ink, marginTop: 7, lineHeight: 1.45 }}>
        <span style={{ color: C.soft }}>Root cause — </span>
        {u.result?.root_cause}
      </div>
      <div style={{ fontSize: 12, color: C.soft, marginTop: 5, lineHeight: 1.45 }}>
        {u.result?.reasoning}
      </div>
      <DraftToggle message={u.result?.draft_message} channel={u.result?.channel} accent={C.escalated} />
      <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
        <button
          onClick={() => onApprove(u)}
          style={{
            all: "unset",
            cursor: "pointer",
            flex: 1,
            textAlign: "center",
            padding: "7px 0",
            background: C.escalated,
            color: "#fff",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Approve &amp; act
        </button>
        <button
          onClick={() => onOverride(u)}
          style={{
            all: "unset",
            cursor: "pointer",
            flex: 1,
            textAlign: "center",
            padding: "7px 0",
            background: C.surface,
            color: C.ink,
            border: `1px solid ${C.line}`,
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Override
        </button>
      </div>
    </CardShell>
  );
}
