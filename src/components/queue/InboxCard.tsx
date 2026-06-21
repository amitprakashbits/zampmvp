import { C, MONO } from "../../theme";
import type { User } from "../../types";
import { CardShell, Chip, Name } from "../shared";

export function InboxCard({ u, rank }: { u: User; rank?: number }) {
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
        {u.signals.map((s, i) => (
          <Chip key={i}>{s}</Chip>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Chip>prefers {u.pref}</Chip>
      </div>
    </CardShell>
  );
}
