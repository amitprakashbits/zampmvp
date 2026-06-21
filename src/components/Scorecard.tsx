import type { ReactNode } from "react";
import { C, MONO, R, SHADOW } from "../theme";
import { money } from "../lib/utils";
import type { Lift } from "../lib/insights";

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
  atRisk: number;
  avg: number;
}

const labelStyle = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: C.soft,
};

const num = { fontFamily: MONO, fontWeight: 600, lineHeight: 1, color: C.ink };

function Cell({
  label,
  children,
  sub,
  accent,
  flex = "1 1 150px",
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  accent?: string;
  flex?: string;
}) {
  return (
    <div
      style={{
        flex,
        minWidth: 150,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderLeft: accent ? `2px solid ${accent}` : `1px solid ${C.line}`,
        borderRadius: R.lg,
        padding: "13px 15px",
        boxShadow: SHADOW,
      }}
    >
      <div style={labelStyle}>{label}</div>
      <div style={{ marginTop: 8 }}>{children}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.soft, marginTop: 7, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

export function Scorecard({
  m,
  revDisplay,
  lift,
}: {
  m: Metrics;
  revDisplay: number;
  lift: Lift;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 11, marginBottom: 14 }}>
      {/* primary - the one number it owns. Solid dark card, no gradient/glow. */}
      <div
        style={{
          flex: "2 1 280px",
          minWidth: 250,
          background: C.ink,
          borderRadius: R.lg,
          padding: "15px 18px",
          color: "#fff",
          boxShadow: SHADOW,
        }}
      >
        <div style={{ ...labelStyle, color: "rgba(255,255,255,0.55)" }}>
          Recovered this shift · revenue owned
        </div>
        <div style={{ ...num, fontSize: 40, color: "#fff", marginTop: 10 }}>{money(revDisplay)}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginTop: 10 }}>
          {m.recovered} recovered · <span style={{ color: "rgba(255,255,255,0.85)" }}>{money(m.atRisk)} still at risk</span>
        </div>
      </div>

      {/* the differentiator: incremental lift vs an untouched control */}
      <Cell
        label="Incremental lift vs control"
        accent={C.accent}
        flex="1 1 210px"
        sub={
          lift.ready ? (
            <>
              contacted <b style={{ color: C.ink }}>{Math.round(lift.contactedRate * 100)}%</b> vs
              control <b style={{ color: C.ink }}>{Math.round(lift.controlRate * 100)}%</b> ·{" "}
              {money(lift.incrementalRevenue)} truly incremental
            </>
          ) : (
            "Holds back a small untouched control to prove the touch caused the recovery. Record outcomes to populate."
          )
        }
      >
        {lift.ready ? (
          <div style={{ ...num, fontSize: 30, color: lift.liftPts >= 0 ? C.recovered : C.danger }}>
            {lift.liftPts >= 0 ? "+" : ""}
            {lift.liftPts}
            <span style={{ fontSize: 15, color: C.soft }}> pts</span>
          </div>
        ) : (
          <div style={{ ...num, fontSize: 22, color: C.faint }}>
            -<span style={{ fontSize: 13, color: C.faint }}> gathering</span>
          </div>
        )}
      </Cell>

      <Cell label="Processed">
        <div style={{ ...num, fontSize: 28 }}>
          {m.decided}
          <span style={{ fontSize: 14, color: C.soft }}> / {m.total}</span>
        </div>
      </Cell>

      <Cell label="Auto-actioned vs escalated">
        <div style={{ ...num, fontSize: 22, color: C.accent }}>
          {m.autoPct}%<span style={{ color: C.faint, fontSize: 14 }}> · {m.escPct}%</span>
        </div>
        <div
          style={{
            display: "flex",
            height: 6,
            borderRadius: 4,
            overflow: "hidden",
            marginTop: 9,
            background: C.lineSoft,
          }}
        >
          <div style={{ width: `${m.autoPct}%`, background: C.accent, transition: "width .5s ease" }} />
          <div style={{ width: `${m.escPct}%`, background: C.escalated, transition: "width .5s ease" }} />
        </div>
      </Cell>

      <Cell label="Avg decision time">
        <div style={{ ...num, fontSize: 28, display: "flex", alignItems: "baseline", gap: 3 }}>
          {m.avg ? m.avg.toFixed(1) : "-"}
          <span style={{ fontSize: 14, color: C.soft }}>s</span>
        </div>
      </Cell>

      <Cell
        label="Skipped · already converting"
        accent={C.skipped}
        sub="Declined to chase recoveries already in motion."
      >
        <div style={{ ...num, fontSize: 28, color: C.skipped }}>{m.skipped}</div>
      </Cell>
    </div>
  );
}
