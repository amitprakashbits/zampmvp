import { C, MONO, R, SHADOW } from "../theme";
import type { LearningStats, User } from "../types";
import { ChannelMatrix } from "../components/ChannelMatrix";
import { LearningPanel } from "../components/LearningPanel";
import { learningView } from "../lib/learning";

function LearningStats({ learning, users }: { learning: LearningStats; users: User[] }) {
  const rows = learningView(learning);
  const totalOutcomes = rows.reduce((s, r) => s + r.totalActed, 0);

  // best channel overall
  type ChannelAgg = { wins: number; total: number };
  const chAgg: Record<string, ChannelAgg> = {};
  for (const row of rows) {
    for (const ch of row.channels) {
      if (!chAgg[ch.channel]) chAgg[ch.channel] = { wins: 0, total: 0 };
      chAgg[ch.channel].total += ch.n;
      if (ch.isBest) chAgg[ch.channel].wins += 1;
    }
  }
  const bestChannel =
    Object.entries(chAgg)
      .sort((a, b) => b[1].wins - a[1].wins)[0]?.[0] ?? null;

  const withOutcomes = users.filter((u) => !u.heldOut && u.outcome != null);
  const recovered = withOutcomes.filter((u) => u.outcome === "recovered").length;
  const avgRecovery = withOutcomes.length > 0 ? Math.round((recovered / withOutcomes.length) * 100) : null;

  const totalDecisions = users.filter((u) => u.result != null).length;
  const samplePct = Math.min(100, Math.round((totalDecisions / 50) * 100));
  const sampleColor =
    totalDecisions >= 50 ? C.recovered : totalDecisions >= 20 ? C.escalated : C.faint;

  const stats = [
    {
      label: "Outcomes recorded",
      value: String(totalOutcomes),
      sub: totalOutcomes < 10 ? "Record more to improve routing" : "Enough to route confidently",
      color: totalOutcomes >= 10 ? C.recovered : C.soft,
    },
    {
      label: "Avg recovery rate",
      value: avgRecovery !== null ? `${avgRecovery}%` : "-",
      sub: avgRecovery !== null ? (avgRecovery >= 50 ? "Above baseline" : "Below 50% baseline") : "Record outcomes to populate",
      color: avgRecovery !== null ? (avgRecovery >= 50 ? C.recovered : C.escalated) : C.faint,
    },
    {
      label: "Best channel overall",
      value: bestChannel ?? "-",
      sub: bestChannel ? "Winning most drop-off reasons" : "Not enough data yet",
      color: bestChannel ? C.ink : C.faint,
    },
    {
      label: "Sample depth",
      value: `${samplePct}%`,
      sub: `${totalDecisions} / 50 decisions for full confidence`,
      color: sampleColor,
    },
  ];

  return (
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
            flex: "1 1 160px",
            minWidth: 150,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: R.lg,
            padding: "13px 15px",
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
              marginBottom: 8,
            }}
          >
            {s.label}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 700,
              color: s.color,
              lineHeight: 1,
              marginBottom: 5,
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: 11.5, color: C.soft, lineHeight: 1.4 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

export function LearningPage({
  learning,
  users,
}: {
  learning: LearningStats;
  users: User[];
}) {
  return (
    <>
      <LearningStats learning={learning} users={users} />

      <div style={{ marginBottom: 14 }}>
        <ChannelMatrix learning={learning} />
      </div>

      <LearningPanel learning={learning} />
    </>
  );
}
