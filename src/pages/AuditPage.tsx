import { C, MONO, R, SHADOW } from "../theme";
import type { AuditEntry, AuditKind } from "../types";
import { AuditTrail } from "../components/AuditTrail";

const KIND_GROUPS: { label: string; kinds: AuditKind[]; color: string }[] = [
  { label: "Diagnoses", kinds: ["diagnosed", "learning"], color: C.processing },
  { label: "Actions", kinds: ["actioned", "human"],       color: C.actioned },
  { label: "Outcomes", kinds: ["outcome", "recovered", "skipped"], color: C.recovered },
  { label: "Escalations", kinds: ["escalated", "guardrail", "error"], color: C.escalated },
];

export function AuditPage({
  log,
  onExport,
  registerExport,
}: {
  log: AuditEntry[];
  onExport?: () => void;
  registerExport?: (fn: () => void) => void;
}) {
  const countOf = (kinds: AuditKind[]) => log.filter((e) => kinds.includes(e.kind)).length;

  const stats = [
    {
      label: "Total entries",
      value: log.length,
      color: C.ink,
      bg: C.surface,
    },
    ...KIND_GROUPS.map((g) => ({
      label: g.label,
      value: countOf(g.kinds),
      color: g.color,
      bg: C.surface,
    })),
  ];

  return (
    <>
      {/* stats bar */}
      <div
        style={{
          display: "flex",
          gap: 11,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: "1 1 110px",
              minWidth: 100,
              background: s.bg,
              border: `1px solid ${C.line}`,
              borderRadius: R.lg,
              padding: "12px 14px",
              boxShadow: SHADOW,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.soft,
                marginBottom: 7,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 700,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* rate bar */}
      {log.length > 0 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: R.lg,
            padding: "12px 16px",
            marginBottom: 14,
            boxShadow: SHADOW,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.soft,
              marginBottom: 10,
            }}
          >
            Event breakdown
          </div>
          <div
            style={{
              display: "flex",
              height: 8,
              borderRadius: 5,
              overflow: "hidden",
              marginBottom: 10,
              background: C.lineSoft,
            }}
          >
            {KIND_GROUPS.map((g) => {
              const n = countOf(g.kinds);
              if (!n) return null;
              return (
                <div
                  key={g.label}
                  title={`${g.label}: ${n}`}
                  style={{
                    width: `${(n / log.length) * 100}%`,
                    background: g.color,
                    transition: "width .4s ease",
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
            {KIND_GROUPS.map((g) => (
              <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{ width: 7, height: 7, borderRadius: 2, background: g.color, flexShrink: 0 }}
                />
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.soft }}>{g.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C.ink }}>
                  {countOf(g.kinds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AuditTrail log={log} onExport={onExport} registerExport={registerExport} maxHeight={600} />
    </>
  );
}
