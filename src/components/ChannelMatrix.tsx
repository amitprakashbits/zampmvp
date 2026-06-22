import { C, MONO, R, SHADOW } from "../theme";
import type { LearningStats } from "../types";
import { Eyebrow } from "./shared";
import { Phone, MessageCircle, Mail } from "lucide-react";

const CHANNELS = ["Call", "WhatsApp", "Email"] as const;

const CH_ICON = {
  Call: Phone,
  WhatsApp: MessageCircle,
  Email: Mail,
};

function rateLabel(n: number, total: number) {
  if (total === 0) return null;
  return Math.round((n / total) * 100);
}

export function ChannelMatrix({ learning }: { learning: LearningStats }) {
  const reasons = Object.keys(learning);

  if (reasons.length === 0) {
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
        <Eyebrow style={{ marginBottom: 8 }}>Channel intelligence</Eyebrow>
        <div style={{ fontSize: 12.5, color: C.faint }}>
          Record outcomes to populate channel effectiveness data.
        </div>
      </div>
    );
  }

  // For each reason, find the best channel
  const bestChannel: Record<string, string | null> = {};
  for (const reason of reasons) {
    let best: string | null = null;
    let bestRate = -1;
    for (const ch of CHANNELS) {
      const stat = learning[reason]?.[ch];
      if (!stat || stat.acted < 2) continue;
      const rate = stat.recovered / stat.acted;
      if (rate > bestRate) {
        bestRate = rate;
        best = ch;
      }
    }
    bestChannel[reason] = best;
  }

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
      <div style={{ marginBottom: 12 }}>
        <Eyebrow>Channel intelligence matrix</Eyebrow>
        <div style={{ fontSize: 11.5, color: C.soft, marginTop: 4, lineHeight: 1.4 }}>
          Recovery rate by drop-off reason and outreach channel. Best performer highlighted.
          Agent auto-routes toward the leader.
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: C.faint,
                  padding: "6px 10px 6px 0",
                  borderBottom: `1px solid ${C.line}`,
                  whiteSpace: "nowrap",
                  minWidth: 160,
                }}
              >
                Drop-off reason
              </th>
              {CHANNELS.map((ch) => {
                const Icon = CH_ICON[ch];
                return (
                  <th
                    key={ch}
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: C.soft,
                      padding: "6px 12px",
                      borderBottom: `1px solid ${C.line}`,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon size={11} strokeWidth={2} />
                      {ch}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {reasons.map((reason, ri) => {
              const isLast = ri === reasons.length - 1;
              return (
                <tr key={reason}>
                  <td
                    style={{
                      padding: "10px 10px 10px 0",
                      borderBottom: isLast ? "none" : `1px solid ${C.lineSoft}`,
                      color: C.ink,
                      fontSize: 12,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {reason}
                  </td>
                  {CHANNELS.map((ch) => {
                    const stat = learning[reason]?.[ch];
                    const rate = stat && stat.acted > 0 ? rateLabel(stat.recovered, stat.acted) : null;
                    const isBest = bestChannel[reason] === ch && rate !== null;
                    const n = stat?.acted ?? 0;

                    return (
                      <td
                        key={ch}
                        style={{
                          padding: "10px 12px",
                          borderBottom: isLast ? "none" : `1px solid ${C.lineSoft}`,
                          textAlign: "center",
                        }}
                      >
                        {rate === null ? (
                          <span style={{ color: C.faint, fontFamily: MONO, fontSize: 11 }}>-</span>
                        ) : (
                          <div
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                              background: isBest ? "#F0FDF4" : C.surfaceAlt,
                              border: `1px solid ${isBest ? "#86EFAC" : C.line}`,
                              borderRadius: R.sm,
                              padding: "5px 10px",
                              minWidth: 52,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: MONO,
                                fontSize: 13,
                                fontWeight: 600,
                                color: isBest ? C.recovered : C.ink,
                                lineHeight: 1,
                              }}
                            >
                              {rate}%
                              {isBest && (
                                <span style={{ fontSize: 9, marginLeft: 2, color: C.recovered }}>
                                  ★
                                </span>
                              )}
                            </span>
                            <span
                              style={{
                                fontFamily: MONO,
                                fontSize: 9.5,
                                color: C.faint,
                                lineHeight: 1,
                              }}
                            >
                              n={n}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${C.lineSoft}`,
          fontSize: 11,
          color: C.faint,
          fontFamily: MONO,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <span>★ = highest recovery rate for this drop-off reason</span>
        <span>n = observed cases with recorded outcome</span>
      </div>
    </div>
  );
}
