import { C, MONO, R, SHADOW } from "../theme";
import type { LearningStats, User } from "../types";
import { AutopilotReadiness } from "../components/AutopilotReadiness";
import { ConfidenceCalibration } from "../components/ConfidenceCalibration";
import { PipelineForecast } from "../components/PipelineForecast";
import { Phone, MessageCircle, Mail, Activity, type LucideIcon } from "lucide-react";
import { Eyebrow } from "../components/shared";

const CH_ICON: Record<string, LucideIcon> = {
  Call: Phone,
  WhatsApp: MessageCircle,
  Email: Mail,
};

function DecisionBreakdown({ users }: { users: User[] }) {
  const processed = users.filter((u) => u.result != null);
  const actioned = users.filter((u) => u.status === "actioned" || u.status === "recovered").length;
  const escalated = users.filter((u) => u.status === "escalated").length;
  const skipped = users.filter((u) => u.status === "skipped").length;
  const total = actioned + escalated + skipped || 1;

  const channelMap: Record<string, number> = {};
  for (const u of processed) {
    const ch = u.result?.channel;
    if (ch && ch !== "-") channelMap[ch] = (channelMap[ch] ?? 0) + 1;
  }
  const channels = Object.entries(channelMap).sort((a, b) => b[1] - a[1]);
  const totalCh = channels.reduce((s, [, n]) => s + n, 0) || 1;

  const rows = [
    { label: "Auto-actioned", count: actioned, color: C.accent, pct: Math.round((actioned / total) * 100) },
    { label: "Escalated", count: escalated, color: C.escalated, pct: Math.round((escalated / total) * 100) },
    { label: "Skipped", count: skipped, color: C.skipped, pct: Math.round((skipped / total) * 100) },
  ];

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: R.lg,
        padding: 18,
        boxShadow: SHADOW,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <Activity size={14} color={C.ink} />
        <Eyebrow>Decision breakdown</Eyebrow>
      </div>
      <div style={{ fontSize: 11.5, color: C.soft, marginBottom: 14, lineHeight: 1.4 }}>
        How the agent resolved the current queue - what it acted on, escalated, and skipped.
      </div>

      {processed.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.faint }}>Run a shift to populate decision data.</div>
      ) : (
        <>
          {/* stacked bar */}
          <div
            style={{
              display: "flex",
              height: 8,
              borderRadius: 5,
              overflow: "hidden",
              marginBottom: 14,
              background: C.lineSoft,
            }}
          >
            {rows
              .filter((r) => r.count > 0)
              .map((r) => (
                <div
                  key={r.label}
                  style={{
                    width: `${r.pct}%`,
                    background: r.color,
                    transition: "width .4s ease",
                  }}
                />
              ))}
          </div>

          {/* rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {rows.map((r) => (
              <div
                key={r.label}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: r.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: C.soft, flex: 1 }}>{r.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: C.ink }}>
                  {r.count}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint, width: 36, textAlign: "right" }}>
                  {r.pct}%
                </span>
              </div>
            ))}
          </div>

          {/* channel split */}
          {channels.length > 0 && (
            <>
              <div
                style={{
                  borderTop: `1px solid ${C.lineSoft}`,
                  paddingTop: 12,
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.faint,
                  marginBottom: 10,
                }}
              >
                Channel distribution
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {channels.map(([ch, n]) => {
                  const Icon = CH_ICON[ch];
                  const pct = Math.round((n / totalCh) * 100);
                  return (
                    <div key={ch} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {Icon && <Icon size={12} color={C.soft} />}
                      <span style={{ fontSize: 12, color: C.soft, width: 74 }}>{ch}</span>
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 3,
                          background: C.lineSoft,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: C.accent,
                            transition: "width .4s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: 11,
                          color: C.ink,
                          width: 44,
                          textAlign: "right",
                        }}
                      >
                        {n} · {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function IntelligencePage({
  users,
}: {
  users: User[];
  learning: LearningStats;
}) {
  return (
    <>
      {/* full-width readiness */}
      <div style={{ marginBottom: 14 }}>
        <AutopilotReadiness users={users} />
      </div>

      {/* two-col: calibration + decision breakdown */}
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div style={{ flex: "1 1 300px", minWidth: 280 }}>
          <ConfidenceCalibration users={users} />
        </div>
        <div style={{ flex: "1 1 300px", minWidth: 280 }}>
          <DecisionBreakdown users={users} />
        </div>
      </div>

      {/* full-width pipeline forecast */}
      <PipelineForecast users={users} />
    </>
  );
}
