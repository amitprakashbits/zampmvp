import { C, MONO } from "../../theme";
import type { User } from "../../types";
import { CardShell, Chip, Name } from "../shared";
import { urgencyScore, costPerHour, recoveryProbability } from "../../lib/insights";

function UrgencyBar({ score }: { score: number }) {
  const color = score >= 70 ? "#DC2626" : score >= 40 ? "#D97706" : C.recovered;
  const label = score >= 70 ? "HIGH" : score >= 40 ? "MED" : "LOW";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      <div
        style={{
          flex: 1,
          height: 3,
          borderRadius: 2,
          background: C.lineSoft,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            transition: "width .4s ease",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 9.5,
          letterSpacing: "0.06em",
          color,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function InboxCard({ u, rank }: { u: User; rank?: number }) {
  const score = urgencyScore(u);
  const cph = costPerHour(u);
  const prob = recoveryProbability(u);

  return (
    <CardShell accent={C.inbox}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {rank != null && (
          <span
            title="Triage rank by revenue-at-risk"
            style={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 600,
              color: rank === 1 ? C.accent : C.soft,
              background: rank === 1 ? C.accentSoft : C.surfaceAlt,
              border: `1px solid ${rank === 1 ? "#D4E2FB" : C.line}`,
              borderRadius: 5,
              padding: "1px 5px",
              flexShrink: 0,
            }}
          >
            #{rank}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Name name={u.name} value={u.value} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: C.soft, marginTop: 3 }}>
        {u.dropOff} · {u.idle}
      </div>

      {/* cost of delay row */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 7,
          flexWrap: "wrap",
        }}
      >
        <span
          title="Estimated revenue degrading per hour of inaction"
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            color: score >= 70 ? "#DC2626" : C.soft,
            background: score >= 70 ? "#FEF2F2" : C.surfaceAlt,
            border: `1px solid ${score >= 70 ? "#FECACA" : C.line}`,
            borderRadius: 5,
            padding: "2px 7px",
          }}
        >
          ~${cph}/hr degrading
        </span>
        <span
          title="Estimated recovery probability if contacted now"
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            color: prob >= 60 ? C.recovered : prob >= 35 ? C.escalated : C.soft,
            background: C.surfaceAlt,
            border: `1px solid ${C.line}`,
            borderRadius: 5,
            padding: "2px 7px",
          }}
        >
          {prob}% recov. prob
        </span>
      </div>

      <UrgencyBar score={score} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
        {u.signals.map((s, i) => (
          <Chip key={i}>{s}</Chip>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <Chip>prefers {u.pref}</Chip>
      </div>
    </CardShell>
  );
}
