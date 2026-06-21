import type { ReactNode } from "react";
import { Clock, TrendingUp, SkipForward, Layers } from "lucide-react";
import { C, MONO } from "../theme";
import { money } from "../lib/utils";

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

const eyebrow = (color: string) => ({
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase" as const,
  color,
});

const bigNum = {
  fontFamily: MONO,
  fontSize: 26,
  fontWeight: 600,
  lineHeight: 1,
};

/** A vivid stat tile (zamp.ai-style colour blocking). */
function Tile({
  bg,
  fg,
  sub,
  label,
  icon,
  children,
  flex = "1 1 168px",
  border,
}: {
  bg: string;
  fg: string;
  sub: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  flex?: string;
  border?: string;
}) {
  return (
    <div
      className="rcv-card"
      style={{
        flex,
        minWidth: 168,
        background: bg,
        border: border ?? "1px solid transparent",
        borderRadius: 18,
        padding: "15px 17px",
        color: fg,
        boxShadow: "0 1px 2px rgba(10,10,10,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, ...eyebrow(sub) }}>
        {icon}
        {label}
      </div>
      <div style={{ marginTop: 9 }}>{children}</div>
    </div>
  );
}

export function Scorecard({ m, revDisplay }: { m: Metrics; revDisplay: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
      {/* hero: the one number it owns */}
      <div
        className="rcv-card"
        style={{
          position: "relative",
          overflow: "hidden",
          flex: "2 1 300px",
          minWidth: 270,
          background: "linear-gradient(135deg, #161320 0%, #0A0A0A 60%)",
          borderRadius: 20,
          padding: "20px 22px",
          color: "#fff",
          boxShadow: "0 24px 60px -28px rgba(91,51,224,0.7)",
        }}
      >
        {/* drifting glow */}
        <div
          style={{
            position: "absolute",
            width: 280,
            height: 280,
            right: -60,
            top: -90,
            background:
              "radial-gradient(circle, rgba(91,51,224,0.55), rgba(47,107,255,0.25) 45%, transparent 70%)",
            filter: "blur(18px)",
            animation: "rcv-drift 7s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={eyebrow("rgba(255,255,255,0.62)")}>Recovered this shift · revenue owned</div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 46,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginTop: 10,
              lineHeight: 1,
            }}
          >
            {money(revDisplay)}
          </div>
          {/* animated underline */}
          <div
            style={{
              height: 4,
              borderRadius: 4,
              marginTop: 14,
              width: "100%",
              backgroundImage:
                "linear-gradient(90deg, #5B33E0, #2F6BFF, #5B33E0)",
              backgroundSize: "200% 100%",
              animation: "rcv-shimmer 3s linear infinite",
            }}
          />
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.72)",
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <TrendingUp size={14} /> {m.recovered} user{m.recovered === 1 ? "" : "s"} re-engaged ·{" "}
            <span style={{ color: "rgba(255,255,255,0.92)" }}>{money(m.atRisk)} still at risk</span>
          </div>
        </div>
      </div>

      {/* processed — cobalt */}
      <Tile
        bg={C.actioned}
        fg="#fff"
        sub="rgba(255,255,255,0.7)"
        label="Processed"
        icon={<Layers size={12} />}
      >
        <div style={{ ...bigNum, fontSize: 30, color: "#fff" }}>
          {m.decided}
          <span style={{ fontSize: 15, color: "rgba(255,255,255,0.6)" }}> / {m.total}</span>
        </div>
      </Tile>

      {/* auto vs escalated — white, bold split bar */}
      <Tile bg={C.surface} fg={C.ink} sub={C.soft} label="Auto-actioned vs escalated" border={`1px solid ${C.line}`}>
        <div style={{ ...bigNum, fontSize: 24, color: C.actioned }}>
          {m.autoPct}%<span style={{ color: C.faint, fontSize: 15 }}> · {m.escPct}%</span>
        </div>
        <div
          style={{
            display: "flex",
            height: 8,
            borderRadius: 5,
            overflow: "hidden",
            marginTop: 10,
            background: C.line,
          }}
        >
          <div style={{ width: `${m.autoPct}%`, background: C.actioned, transition: "width .5s ease" }} />
          <div style={{ width: `${m.escPct}%`, background: C.escalated, transition: "width .5s ease" }} />
        </div>
      </Tile>

      {/* avg decision time — sage */}
      <Tile bg="#C7D49B" fg="#23310C" sub="#4D5E2A" label="Avg decision time" icon={<Clock size={12} />}>
        <div style={{ ...bigNum, fontSize: 30, display: "flex", alignItems: "baseline", gap: 3, color: "#23310C" }}>
          {m.avg ? m.avg.toFixed(1) : "—"}
          <span style={{ fontSize: 15, color: "#4D5E2A" }}>s</span>
        </div>
      </Tile>

      {/* skipped — purple gradient (the judgment number) */}
      <Tile
        bg="linear-gradient(135deg, #4A2FB8 0%, #221544 100%)"
        fg="#fff"
        sub="rgba(255,255,255,0.66)"
        label="Skipped · already converting"
        icon={<SkipForward size={12} />}
        flex="1 1 200px"
      >
        <div style={{ ...bigNum, fontSize: 30, color: "#fff" }}>{m.skipped}</div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.66)", marginTop: 7, lineHeight: 1.35 }}>
          Declined to chase recoveries already in motion.
        </div>
      </Tile>
    </div>
  );
}
