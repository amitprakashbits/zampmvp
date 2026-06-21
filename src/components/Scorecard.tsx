import { Clock, TrendingUp } from "lucide-react";
import { C, MONO } from "../theme";
import { money } from "../lib/utils";
import { Eyebrow, Stat } from "./shared";

export interface Metrics {
  acted: number;
  recovered: number;
  escalated: number;
  skipped: number;
  decided: number;
  total: number;
  autoPct: number;
  escPct: number;
  revenue: number;
  avg: number;
}

export function Scorecard({ m, revDisplay }: { m: Metrics; revDisplay: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
      {/* hero: the number it owns */}
      <div
        style={{
          flex: "2 1 280px",
          minWidth: 250,
          background: C.ink,
          borderRadius: 18,
          padding: "18px 20px",
          color: "#fff",
        }}
      >
        <Eyebrow style={{ color: "#B9B9B0" }}>Recovered this shift · revenue owned</Eyebrow>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 42,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginTop: 8,
            lineHeight: 1,
          }}
        >
          {money(revDisplay)}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#B9B9B0",
            marginTop: 9,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <TrendingUp size={14} /> {m.recovered} user{m.recovered === 1 ? "" : "s"} re-engaged after
          the agent acted
        </div>
      </div>

      <Stat label="Processed">
        <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600 }}>
          {m.decided}
          <span style={{ fontSize: 14, color: C.soft }}> / {m.total}</span>
        </div>
      </Stat>

      <Stat label="Auto-actioned vs escalated">
        <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: C.actioned }}>
          {m.autoPct}%<span style={{ color: C.faint, fontSize: 15 }}> · {m.escPct}%</span>
        </div>
        <div
          style={{
            display: "flex",
            height: 5,
            borderRadius: 3,
            overflow: "hidden",
            marginTop: 8,
            background: C.line,
          }}
        >
          <div style={{ width: `${m.autoPct}%`, background: C.actioned }} />
          <div style={{ width: `${m.escPct}%`, background: C.escalated }} />
        </div>
      </Stat>

      <Stat label="Avg decision time">
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            fontWeight: 600,
            display: "flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <Clock size={16} color={C.soft} style={{ alignSelf: "center" }} />
          {m.avg ? m.avg.toFixed(1) : "—"}
          <span style={{ fontSize: 14, color: C.soft }}>s</span>
        </div>
      </Stat>

      <Stat
        label="Skipped · already converting"
        accent={C.skipped}
        sub="Declined to chase recoveries already in motion."
      >
        <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: C.skipped }}>
          {m.skipped}
        </div>
      </Stat>
    </div>
  );
}
