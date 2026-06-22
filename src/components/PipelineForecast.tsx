import { C, MONO, R, SHADOW } from "../theme";
import type { User } from "../types";
import { Eyebrow } from "./shared";
import { TrendingUp, AlertCircle } from "lucide-react";

interface ForecastResult {
  observedRate: number;
  baselineRate: number;
  rateSource: "observed" | "baseline";
  dailyInboxValue: number;
  cumulative: number[];
  totalProjected: number;
}

function buildForecast(users: User[]): ForecastResult {
  const withOutcomes = users.filter((u) => !u.heldOut && u.outcome != null);
  const recoveredCount = withOutcomes.filter((u) => u.outcome === "recovered").length;
  const observedRate = withOutcomes.length >= 2 ? recoveredCount / withOutcomes.length : -1;

  const baselineRate = 0.45;
  const activeRate = observedRate >= 0 ? observedRate : baselineRate;
  const rateSource: "observed" | "baseline" = observedRate >= 0 ? "observed" : "baseline";

  const inboxValue = users.filter((u) => u.status === "inbox").reduce((s, u) => s + u.value, 0);
  const avgValue = users.length > 0 ? users.reduce((s, u) => s + u.value, 0) / users.length : 15_000;
  const dailyInboxValue = inboxValue > 0 ? inboxValue : avgValue * 5;

  const GROWTH = 0.05;
  const cumulative: number[] = [];
  let cum = 0;
  for (let d = 1; d <= 7; d++) {
    cum += dailyInboxValue * Math.pow(1 + GROWTH, d - 1) * activeRate;
    cumulative.push(Math.round(cum));
  }

  return { observedRate, baselineRate, rateSource, dailyInboxValue, cumulative, totalProjected: cumulative[6] };
}

function money(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return null;
  const W = 240;
  const H = 72;
  const PAD = { t: 8, b: 8, l: 4, r: 4 };

  const max = Math.max(...values);
  const toX = (i: number) => PAD.l + (i / (values.length - 1)) * (W - PAD.l - PAD.r);
  const toY = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  const linePts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const areaPath =
    `M${toX(0)},${toY(values[0])} ` +
    values.map((v, i) => `L${toX(i)},${toY(v)}`).join(" ") +
    ` L${toX(values.length - 1)},${H - PAD.b} L${toX(0)},${H - PAD.b} Z`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      {/* zero baseline */}
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke={C.lineSoft} strokeWidth={1} />
      {/* area */}
      <path d={areaPath} fill={color} fillOpacity={0.10} />
      {/* line */}
      <polyline points={linePts} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* dots - small interior, large terminal */}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(v)}
          r={i === values.length - 1 ? 5 : 3}
          fill={i === values.length - 1 ? color : C.surface}
          stroke={color}
          strokeWidth={i === values.length - 1 ? 0 : 2}
        />
      ))}
    </svg>
  );
}

export function PipelineForecast({ users }: { users: User[] }) {
  const fc = buildForecast(users);
  const color = C.recovered;
  const rateDisplay = fc.rateSource === "observed"
    ? Math.round(fc.observedRate * 100)
    : Math.round(fc.baselineRate * 100);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 18, boxShadow: SHADOW }}>
      {/* ── header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <TrendingUp size={14} color={color} />
        <Eyebrow style={{ color }}>7-day pipeline forecast</Eyebrow>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 10,
            color: fc.rateSource === "observed" ? C.recovered : C.faint,
            background: fc.rateSource === "observed" ? "#F0FDF4" : C.surfaceAlt,
            border: `1px solid ${fc.rateSource === "observed" ? "#86EFAC" : C.line}`,
            borderRadius: R.pill,
            padding: "2px 8px",
            whiteSpace: "nowrap",
          }}
        >
          {fc.rateSource === "observed" ? `${rateDisplay}% observed rate` : `${rateDisplay}% industry baseline`}
        </span>
      </div>

      {/* ── baseline warning ── */}
      {fc.rateSource === "baseline" && (
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "flex-start",
            fontSize: 11,
            color: C.escalated,
            background: "#FFFBEB",
            border: `1px solid #FDE68A`,
            borderRadius: R.md,
            padding: "6px 10px",
            marginTop: 8,
            marginBottom: 10,
            lineHeight: 1.45,
          }}
        >
          <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          Using industry baseline ({rateDisplay}%). Record outcomes after a shift to switch to your actual rate.
        </div>
      )}

      {/* ── headline metrics ── */}
      <div style={{ display: "flex", gap: 0, marginTop: fc.rateSource === "observed" ? 10 : 0, marginBottom: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.01em" }}>
            {money(fc.totalProjected)}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint, marginTop: 4, letterSpacing: "0.02em" }}>
            projected 7-day recovery · {rateDisplay}% rate · 5%/day growth
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            paddingLeft: 16,
            borderLeft: `1px solid ${C.lineSoft}`,
            textAlign: "right",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.soft }}>
            Daily cohort
          </div>
          <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.ink }}>
            {money(fc.dailyInboxValue)}
          </div>
        </div>
      </div>

      {/* ── sparkline ── */}
      <Sparkline values={fc.cumulative} color={color} />

      {/* ── day-by-day table ── */}
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderTop: `1px solid ${C.lineSoft}`,
          paddingTop: 8,
        }}
      >
        {fc.cumulative.map((v, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              borderRight: i < 6 ? `1px solid ${C.lineSoft}` : "none",
              paddingRight: i < 6 ? 4 : 0,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.faint, letterSpacing: "0.05em", marginBottom: 2 }}>
              D{i + 1}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: i === 6 ? 11 : 10,
                fontWeight: i === 6 ? 700 : 400,
                color: i === 6 ? color : C.soft,
              }}
            >
              {money(v)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
