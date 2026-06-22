/* ── Confidence Calibration Panel ─────────────────────────────────────────
   The canonical AI-product trust primitive: "When Recover says 80% confident,
   is it actually right 80% of the time?" A perfectly calibrated model falls on
   the diagonal. Overconfident agents cluster above; underconfident below.

   This is the proof that the agent knows what it doesn't know - the
   non-obvious PM insight that separates "AI toy" from "production system".
   ──────────────────────────────────────────────────────────────────────── */
import { C, MONO, R, SHADOW } from "../theme";
import type { User } from "../types";
import { Eyebrow } from "./shared";
import { Target } from "lucide-react";

interface Bucket {
  label: string;         // "0.5 - 0.6"
  midpoint: number;      // 0.55
  n: number;             // decisions in this bucket
  actualRate: number;    // fraction that recovered
}

function buildBuckets(users: User[]): Bucket[] {
  const defs = [
    { lo: 0.5, hi: 0.6, label: "0.50-0.60", midpoint: 0.55 },
    { lo: 0.6, hi: 0.7, label: "0.60-0.70", midpoint: 0.65 },
    { lo: 0.7, hi: 0.8, label: "0.70-0.80", midpoint: 0.75 },
    { lo: 0.8, hi: 0.9, label: "0.80-0.90", midpoint: 0.85 },
    { lo: 0.9, hi: 1.01, label: "0.90-1.00", midpoint: 0.95 },
  ];

  // only decisions where we have an outcome
  const decided = users.filter(
    (u) => u.result && u.outcome && Number.isFinite(u.result.confidence)
  );

  return defs.map(({ lo, hi, label, midpoint }) => {
    const inBucket = decided.filter((u) => {
      const c = u.result!.confidence;
      return c >= lo && c < hi;
    });
    const recovered = inBucket.filter((u) => u.outcome === "recovered").length;
    return {
      label,
      midpoint,
      n: inBucket.length,
      actualRate: inBucket.length > 0 ? recovered / inBucket.length : -1,
    };
  });
}

function calibrationError(buckets: Bucket[]): number {
  const filled = buckets.filter((b) => b.actualRate >= 0);
  if (!filled.length) return 0;
  const ece = filled.reduce((sum, b) => sum + Math.abs(b.midpoint - b.actualRate) * b.n, 0) /
    filled.reduce((sum, b) => sum + b.n, 0);
  return Math.round(ece * 100);
}

export function ConfidenceCalibration({ users }: { users: User[] }) {
  const buckets = buildBuckets(users);
  const filled = buckets.filter((b) => b.n > 0 && b.actualRate >= 0);
  const ece = calibrationError(buckets);
  const totalDecisions = buckets.reduce((s, b) => s + (b.n > 0 ? b.n : 0), 0);

  // SVG chart dimensions
  const W = 260, H = 130, PAD = 28;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const toX = (v: number) => PAD + (v - 0.5) / 0.5 * chartW;
  const toY = (v: number) => PAD + (1 - v) * chartH;

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
        <Target size={14} color={C.accent} />
        <Eyebrow style={{ color: C.accent }}>Confidence calibration</Eyebrow>
        {totalDecisions > 0 && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: MONO,
              fontSize: 10,
              color: ece <= 8 ? C.recovered : ece <= 18 ? C.escalated : "#B42318",
              background: ece <= 8 ? "#F0FDF4" : ece <= 18 ? "#FFFBEB" : "#FEF2F2",
              border: `1px solid ${ece <= 8 ? "#86EFAC" : ece <= 18 ? "#FDE68A" : "#FECACA"}`,
              borderRadius: R.pill,
              padding: "2px 8px",
            }}
          >
            ECE {ece}% · {ece <= 8 ? "well calibrated" : ece <= 18 ? "slight overconfidence" : "needs calibration"}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: C.soft, marginBottom: 10, lineHeight: 1.4 }}>
        When Recover says "80% confident," is it right 80% of the time? Dots on the diagonal = perfectly calibrated.
        {totalDecisions === 0 && (
          <span style={{ color: C.faint }}> Record outcomes after a shift to populate.</span>
        )}
      </div>

      {/* always render the chart; just hide data dots when empty */}
      {(
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ overflow: "visible", display: "block" }}
        >
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <line
              key={v}
              x1={PAD}
              y1={toY(v)}
              x2={W - PAD}
              y2={toY(v)}
              stroke={C.lineSoft}
              strokeWidth={1}
            />
          ))}
          {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((v) => (
            <line
              key={v}
              x1={toX(v)}
              y1={PAD}
              x2={toX(v)}
              y2={H - PAD}
              stroke={C.lineSoft}
              strokeWidth={1}
            />
          ))}

          {/* perfect calibration diagonal */}
          <line
            x1={toX(0.5)}
            y1={toY(0.5)}
            x2={toX(1.0)}
            y2={toY(1.0)}
            stroke={C.line}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />

          {/* axis labels */}
          {[0.5, 0.75, 1.0].map((v) => (
            <text
              key={v}
              x={toX(v)}
              y={H - 4}
              textAnchor="middle"
              fontSize={8.5}
              fill={C.faint}
              fontFamily="monospace"
            >
              {v.toFixed(2)}
            </text>
          ))}
          {[0, 0.5, 1].map((v) => (
            <text
              key={v}
              x={6}
              y={toY(v) + 3}
              textAnchor="middle"
              fontSize={8.5}
              fill={C.faint}
              fontFamily="monospace"
            >
              {Math.round(v * 100)}%
            </text>
          ))}

          {/* axis labels */}
          <text x={W / 2} y={H} textAnchor="middle" fontSize={8.5} fill={C.soft} fontFamily="monospace">
            predicted confidence
          </text>
          <text
            x={9}
            y={H / 2}
            textAnchor="middle"
            fontSize={8.5}
            fill={C.soft}
            fontFamily="monospace"
            transform={`rotate(-90, 9, ${H / 2})`}
          >
            actual rate
          </text>

          {/* data points */}
          {filled.map((b) => {
            const cx = toX(b.midpoint);
            const cy = toY(b.actualRate);
            const isCalibrated = Math.abs(b.midpoint - b.actualRate) <= 0.08;
            const color = isCalibrated ? C.recovered : C.escalated;
            return (
              <g key={b.label}>
                {/* vertical error bar from diagonal */}
                <line
                  x1={cx}
                  y1={toY(b.midpoint)}
                  x2={cx}
                  y2={cy}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                />
                <circle cx={cx} cy={cy} r={5 + b.n} fill={color} fillOpacity={0.15} />
                <circle cx={cx} cy={cy} r={5} fill={color} />
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  fontSize={8}
                  fill={color}
                  fontFamily="monospace"
                >
                  n={b.n}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* bucket table */}
      {filled.length > 0 && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 40px 60px 60px",
              gap: "4px 8px",
              fontFamily: MONO,
              fontSize: 10,
            }}
          >
            <span style={{ color: C.faint, letterSpacing: "0.06em", textTransform: "uppercase" }}>Bucket</span>
            <span style={{ color: C.faint, textAlign: "right" }}>n</span>
            <span style={{ color: C.faint, textAlign: "right" }}>Predicted</span>
            <span style={{ color: C.faint, textAlign: "right" }}>Actual</span>
            {filled.map((b) => {
              const gap = Math.abs(b.midpoint - b.actualRate);
              const gapColor = gap <= 0.08 ? C.recovered : gap <= 0.18 ? C.escalated : "#B42318";
              return (
                <>
                  <span key={`l${b.label}`} style={{ color: C.soft }}>{b.label}</span>
                  <span key={`n${b.label}`} style={{ color: C.faint, textAlign: "right" }}>{b.n}</span>
                  <span key={`p${b.label}`} style={{ color: C.soft, textAlign: "right" }}>{Math.round(b.midpoint * 100)}%</span>
                  <span key={`a${b.label}`} style={{ color: gapColor, textAlign: "right", fontWeight: 600 }}>
                    {Math.round(b.actualRate * 100)}%
                  </span>
                </>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
