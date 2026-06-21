import { Brain } from "lucide-react";
import { C, MONO } from "../theme";
import type { LearningStats } from "../types";
import { learningView } from "../lib/learning";
import { CHANNEL_ICON, Eyebrow } from "./shared";

function Bar({ rate, isBest }: { rate: number; isBest: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        height: 5,
        borderRadius: 3,
        background: C.line,
        overflow: "hidden",
        minWidth: 40,
      }}
    >
      <div
        style={{
          width: `${Math.round(rate * 100)}%`,
          height: "100%",
          background: isBest ? C.recovered : C.faint,
          transition: "width .4s ease",
        }}
      />
    </div>
  );
}

export function LearningPanel({ learning }: { learning: LearningStats }) {
  const rows = learningView(learning);
  const totalOutcomes = rows.reduce((sum, r) => sum + r.totalActed, 0);

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <Brain size={15} color={C.brand} />
        <Eyebrow style={{ color: C.brand }}>What the agent has learned</Eyebrow>
      </div>
      <div style={{ fontSize: 11.5, color: C.soft, marginBottom: 14, lineHeight: 1.4 }}>
        Channel effectiveness by drop-off reason, from {totalOutcomes} recorded outcome
        {totalOutcomes === 1 ? "" : "s"}. The agent shifts future channel picks toward the leader
        (highlighted) for each reason.
      </div>

      {rows.length === 0 && (
        <div style={{ fontSize: 12.5, color: C.faint }}>
          No outcomes recorded yet. Action some users, then record outcomes (or hit “Simulate
          outcomes”) to watch the agent learn.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((row) => (
          <div key={row.reason}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.ink,
                marginBottom: 7,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{row.reason}</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint, fontWeight: 400 }}>
                n={row.totalActed}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {row.channels.map((ch) => {
                const Icon = CHANNEL_ICON[ch.channel];
                return (
                  <div
                    key={ch.channel}
                    style={{ display: "flex", alignItems: "center", gap: 9 }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        width: 92,
                        fontSize: 11.5,
                        color: ch.isBest ? C.recovered : C.soft,
                        fontWeight: ch.isBest ? 600 : 400,
                      }}
                    >
                      <Icon size={12} strokeWidth={2} /> {ch.channel}
                    </span>
                    <Bar rate={ch.rate} isBest={ch.isBest} />
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 11,
                        color: ch.isBest ? C.recovered : C.soft,
                        width: 64,
                        textAlign: "right",
                      }}
                    >
                      {Math.round(ch.rate * 100)}% · {ch.n}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
