import { X, TrendingUp, AlertTriangle, BookOpen, Zap } from "lucide-react";
import { C, MONO, R, SHADOW_POP } from "../theme";
import type { ShiftDebrief as DebriefData } from "../lib/insights";
import { money } from "../lib/utils";

const KIND_META = {
  win: { icon: TrendingUp, color: C.recovered, bg: "#F0FDF4", border: "#BBF7D0" },
  pattern: { icon: Zap, color: C.escalated, bg: "#FFFBEB", border: "#FDE68A" },
  learning: { icon: BookOpen, color: C.accent, bg: C.accentSoft, border: "#BFDBFE" },
  policy: { icon: AlertTriangle, color: C.escalated, bg: "#FFFBEB", border: "#FDE68A" },
};

export function ShiftDebrief({ data, onDismiss }: { data: DebriefData; onDismiss: () => void }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: R.lg,
        padding: 20,
        marginBottom: 14,
        boxShadow: SHADOW_POP,
        animation: "rcv-rise .22s ease",
        position: "relative",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.soft,
              marginBottom: 6,
            }}
          >
            Shift Intelligence Brief
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "actioned", val: data.actioned, color: C.accent },
              { label: "escalated", val: data.escalated, color: C.escalated },
              { label: "skipped", val: data.skipped, color: C.skipped },
            ].map(({ label, val, color }) => (
              <span
                key={label}
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  background: C.surfaceAlt,
                  border: `1px solid ${C.line}`,
                  borderRadius: R.pill,
                  padding: "3px 9px",
                  color,
                }}
              >
                {val} {label}
              </span>
            ))}
            {data.guardrailsFired > 0 && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: R.pill,
                  padding: "3px 9px",
                  color: C.escalated,
                }}
              >
                {data.guardrailsFired} guardrail{data.guardrailsFired !== 1 ? "s" : ""} fired
              </span>
            )}
            {data.topValue > 0 && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  background: C.surfaceAlt,
                  border: `1px solid ${C.line}`,
                  borderRadius: R.pill,
                  padding: "3px 9px",
                  color: C.ink,
                }}
              >
                top deal {money(data.topValue)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{
            all: "unset",
            cursor: "pointer",
            color: C.faint,
            padding: 4,
            borderRadius: 6,
            flexShrink: 0,
          }}
          aria-label="Dismiss brief"
        >
          <X size={14} />
        </button>
      </div>

      {/* insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {data.insights.map((ins, i) => {
          const meta = KIND_META[ins.kind];
          const Icon = meta.icon;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 11,
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                borderRadius: R.md,
                padding: "10px 12px",
              }}
            >
              <Icon size={14} color={meta.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 3 }}>
                  {ins.headline}
                </div>
                <div style={{ fontSize: 12, color: C.soft, lineHeight: 1.5 }}>{ins.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
