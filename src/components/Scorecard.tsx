import type { ReactNode } from "react";
import { C, MONO, R, SHADOW } from "../theme";
import { money, useCountUp } from "../lib/utils";
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
  atRiskPerHour,
}: {
  m: Metrics;
  revDisplay: number;
  lift: Lift;
  atRiskPerHour: number;
}) {
  const decidedAnim  = useCountUp(m.decided);
  const autoPctAnim  = useCountUp(m.autoPct);
  const escPctAnim   = useCountUp(m.escPct);
  const skippedAnim  = useCountUp(m.skipped);
  const cphAnim      = useCountUp(atRiskPerHour);
  const recoveredAnim = useCountUp(m.recovered);
  const liftPtsAnim  = useCountUp(lift.liftPts);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 11, marginBottom: 14 }}>
      {/* primary - the one number it owns */}
      <div
        className="rcv-card"
        style={{
          flex: "2 1 280px",
          minWidth: 250,
          background: C.ink,
          borderRadius: R.lg,
          padding: "15px 18px",
          color: "#fff",
          boxShadow: SHADOW,
          border: "1px solid transparent",
        }}
      >
        <div style={{ ...labelStyle, color: "rgba(255,255,255,0.55)" }}>
          Recovered this shift · revenue owned
        </div>
        <div className="rcv-num" style={{ ...num, fontSize: 40, color: "#fff", marginTop: 10 }}>{money(revDisplay)}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginTop: 10 }}>
          <span className="rcv-num">{Math.round(recoveredAnim)}</span> recovered ·{" "}
          <span style={{ color: "rgba(255,255,255,0.85)" }}>{money(m.atRisk)} still at risk</span>
        </div>
      </div>

      {/* incremental lift */}
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
            <span className="rcv-num">{liftPtsAnim >= 0 ? "+" : ""}{Math.round(liftPtsAnim)}</span>
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
          <span className="rcv-num">{Math.round(decidedAnim)}</span>
          <span style={{ fontSize: 14, color: C.soft }}> / {m.total}</span>
        </div>
      </Cell>

      <Cell label="Auto-actioned vs escalated">
        <div style={{ ...num, fontSize: 22, color: C.accent }}>
          <span className="rcv-num">{Math.round(autoPctAnim)}%</span>
          <span style={{ color: C.faint, fontSize: 14 }}> · {Math.round(escPctAnim)}%</span>
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
          <div style={{ width: `${autoPctAnim}%`, background: C.accent, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
          <div style={{ width: `${escPctAnim}%`, background: C.escalated, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
        </div>
      </Cell>

      <Cell label="Avg decision time">
        <div style={{ ...num, fontSize: 28, display: "flex", alignItems: "baseline", gap: 3 }}>
          <span className="rcv-num">{m.avg ? m.avg.toFixed(1) : "-"}</span>
          <span style={{ fontSize: 14, color: C.soft }}>s</span>
        </div>
      </Cell>

      <Cell
        label="Skipped · already converting"
        accent={C.skipped}
        sub="Declined to chase recoveries already in motion."
      >
        <div style={{ ...num, fontSize: 28, color: C.skipped }}>
          <span className="rcv-num">{Math.round(skippedAnim)}</span>
        </div>
      </Cell>

      <Cell
        label="Cost of delay · inbox"
        accent={atRiskPerHour > 0 ? "#DC2626" : C.faint}
        flex="1 1 180px"
        sub={atRiskPerHour > 0 ? "Revenue degrading per hour while inbox users sit untouched." : "No inbox users - no active cost of delay."}
      >
        <div
          style={{
            ...num,
            fontSize: 26,
            color: atRiskPerHour > 0 ? "#DC2626" : C.faint,
            display: "flex",
            alignItems: "baseline",
            gap: 3,
          }}
        >
          <span className="rcv-num">{atRiskPerHour > 0 ? money(Math.round(cphAnim)) : "-"}</span>
          {atRiskPerHour > 0 && <span style={{ fontSize: 13, color: C.soft }}>/hr</span>}
        </div>
      </Cell>
    </div>
  );
}
