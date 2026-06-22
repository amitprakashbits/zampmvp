import { C, MONO, R, SHADOW } from "../theme";
import type { User } from "../types";
import { Bot, Target, Database, ShieldCheck, TrendingUp } from "lucide-react";

interface Factor {
  label: string;
  score: number;
  max: number;
  status: "good" | "warn" | "low" | "empty";
  blocking: string;
  detail: string;
}

function computeFactors(users: User[]): Factor[] {
  // ── Calibration ───────────────────────────────────────────────
  const decided = users.filter((u) => u.result && u.outcome && Number.isFinite(u.result.confidence));
  let calibScore = 0;
  let calibStatus: Factor["status"] = "empty";
  let calibDetail = "";
  let calibBlocking = "Run a shift and record outcomes to populate.";

  if (decided.length >= 3) {
    const buckets = [0.5, 0.6, 0.7, 0.8, 0.9].map((lo) => {
      const in_ = decided.filter((u) => u.result!.confidence >= lo && u.result!.confidence < lo + 0.1);
      const rec = in_.filter((u) => u.outcome === "recovered").length;
      return { mid: lo + 0.05, n: in_.length, actual: in_.length ? rec / in_.length : -1 };
    });
    const filled = buckets.filter((b) => b.actual >= 0);
    if (filled.length > 0) {
      const ece = filled.reduce((s, b) => s + Math.abs(b.mid - b.actual) * b.n, 0) / filled.reduce((s, b) => s + b.n, 0);
      calibScore = ece <= 0.05 ? 25 : ece <= 0.10 ? 20 : ece <= 0.18 ? 13 : 6;
      calibStatus = ece <= 0.05 ? "good" : ece <= 0.10 ? "warn" : "low";
      calibDetail = `ECE ${Math.round(ece * 100)}% · ${filled.length} confidence bucket${filled.length === 1 ? "" : "s"} · n=${decided.length}`;
      calibBlocking = ece <= 0.10 ? "Calibration healthy." : "Slight overconfidence - log more outcomes.";
    }
  } else if (decided.length > 0) {
    calibScore = 5;
    calibStatus = "low";
    calibDetail = `${decided.length} outcome${decided.length === 1 ? "" : "s"} logged - need ≥3 to score.`;
    calibBlocking = "Record more outcomes to unlock calibration.";
  }

  // ── Decision coverage ────────────────────────────────────────
  const processed = users.filter((u) => ["actioned", "recovered", "escalated", "skipped"].includes(u.status));
  let covScore = 0;
  let covStatus: Factor["status"] = "empty";
  let covDetail = "";
  let covBlocking = "Run a shift to see decision coverage.";

  if (processed.length > 0) {
    const acted = users.filter((u) => u.status === "actioned" || u.status === "recovered").length;
    const escalated = users.filter((u) => u.status === "escalated").length;
    const decisionBase = acted + escalated;
    const autoPct = decisionBase > 0 ? acted / decisionBase : 0;
    covScore = autoPct >= 0.85 ? 25 : autoPct >= 0.70 ? 19 : autoPct >= 0.50 ? 12 : 6;
    covStatus = autoPct >= 0.85 ? "good" : autoPct >= 0.70 ? "warn" : "low";
    covDetail = `${Math.round(autoPct * 100)}% auto-acted · ${acted} acted, ${escalated} escalated`;
    covBlocking = autoPct >= 0.85 ? "Coverage strong." : "Lower confidence threshold to reduce escalations.";
  }

  // ── Recovery rate ────────────────────────────────────────────
  const withOutcomes = users.filter((u) => !u.heldOut && u.outcome != null);
  let recScore = 0;
  let recStatus: Factor["status"] = "empty";
  let recDetail = "";
  let recBlocking = "Record outcomes after a shift to see recovery rate.";

  if (withOutcomes.length >= 2) {
    const recovered = withOutcomes.filter((u) => u.outcome === "recovered").length;
    const rate = recovered / withOutcomes.length;
    recScore = rate >= 0.60 ? 25 : rate >= 0.45 ? 19 : rate >= 0.30 ? 12 : 5;
    recStatus = rate >= 0.60 ? "good" : rate >= 0.45 ? "warn" : "low";
    recDetail = `${Math.round(rate * 100)}% recovery · ${withOutcomes.length} confirmed outcomes`;
    recBlocking = rate >= 0.45 ? "Recovery rate healthy." : "Check channel routing and message quality.";
  } else if (withOutcomes.length > 0) {
    recScore = 4;
    recStatus = "low";
    recDetail = `${withOutcomes.length} outcome recorded - need ≥2 to score.`;
    recBlocking = "Record at least 2 non-control outcomes.";
  }

  // ── Sample depth ─────────────────────────────────────────────
  const totalDecisions = users.filter((u) => u.result != null).length;
  const sampScore = totalDecisions === 0 ? 0 : totalDecisions >= 50 ? 25 : totalDecisions >= 20 ? 18 : totalDecisions >= 10 ? 12 : 6;
  const sampStatus: Factor["status"] = totalDecisions === 0 ? "empty" : totalDecisions >= 50 ? "good" : totalDecisions >= 20 ? "warn" : "low";
  const sampDetail = totalDecisions > 0
    ? `${totalDecisions} decision${totalDecisions === 1 ? "" : "s"} logged · target: 50 for full confidence`
    : "No decisions yet.";
  const sampBlocking = totalDecisions >= 50 ? "Sufficient sample depth." : `${50 - totalDecisions} more to reach full confidence.`;

  return [
    { label: "Calibration", score: calibScore, max: 25, status: calibStatus, detail: calibDetail, blocking: calibBlocking },
    { label: "Decision coverage", score: covScore, max: 25, status: covStatus, detail: covDetail, blocking: covBlocking },
    { label: "Recovery rate", score: recScore, max: 25, status: recStatus, detail: recDetail, blocking: recBlocking },
    { label: "Sample depth", score: sampScore, max: 25, status: sampStatus, detail: sampDetail, blocking: sampBlocking },
  ];
}

const STATUS_COLOR: Record<Factor["status"], string> = {
  good: C.recovered,
  warn: C.escalated,
  low: "#B42318",
  empty: C.faint,
};

const FACTOR_ICON = [Target, ShieldCheck, TrendingUp, Database];

function ReadinessRing({ score }: { score: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color =
    score >= 75 ? C.recovered :
    score >= 50 ? C.escalated :
    score >= 25 ? "#F59E0B" :
    score > 0  ? "#B42318" :
    C.faint;

  return (
    <svg width={82} height={82} viewBox="0 0 82 82" style={{ flexShrink: 0 }}>
      {/* track */}
      <circle cx={41} cy={41} r={r} fill="none" stroke={C.lineSoft} strokeWidth={6} />
      {/* fill */}
      {score > 0 && (
        <circle
          cx={41} cy={41} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      )}
      {/* center value */}
      {score > 0 ? (
        <>
          <text x={41} y={37} textAnchor="middle" fontSize={21} fontWeight={700} fill={color} fontFamily="monospace">
            {score}
          </text>
          <text x={41} y={50} textAnchor="middle" fontSize={8} fill={C.faint} fontFamily="monospace" letterSpacing="0.06em">
            / 100
          </text>
        </>
      ) : (
        <text x={41} y={47} textAnchor="middle" fontSize={24} fill={C.faint} fontFamily="monospace">
          -
        </text>
      )}
    </svg>
  );
}

export function AutopilotReadiness({ users }: { users: User[] }) {
  const factors = computeFactors(users);
  const total = factors.reduce((s, f) => s + f.score, 0);

  const verdict =
    total >= 80 ? "Ready for full autopilot" :
    total >= 60 ? "Supervised autopilot ready" :
    total >= 40 ? "Needs more data" :
    "Learning phase";

  const verdictColor = total >= 80 ? C.recovered : total >= 60 ? C.escalated : total >= 40 ? "#F59E0B" : C.soft;
  const verdictBg   = total >= 80 ? "#F0FDF4" : total >= 60 ? "#FFFBEB" : C.surfaceAlt;
  const verdictBdr  = total >= 80 ? "#86EFAC" : total >= 60 ? "#FDE68A" : C.line;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 18, boxShadow: SHADOW }}>
      {/* ── header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
        <Bot size={14} color={C.accent} />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            color: C.accent,
            whiteSpace: "nowrap",
          }}
        >
          Autopilot readiness
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            fontFamily: MONO,
            color: verdictColor,
            background: verdictBg,
            border: `1px solid ${verdictBdr}`,
            borderRadius: R.pill,
            padding: "2px 9px",
            whiteSpace: "nowrap",
          }}
        >
          {verdict}
        </span>
      </div>

      {/* ── ring + description ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
        <ReadinessRing score={total} />
        <div style={{ flex: 1, paddingTop: 2 }}>
          <div style={{ fontSize: 12, color: C.soft, lineHeight: 1.55 }}>
            How close is Recover to operating without any human review? Score updates live as you run shifts, record outcomes, and tune guardrails.
          </div>
          {total === 0 && (
            <div style={{ marginTop: 7, fontSize: 11, color: C.faint }}>
              Run a shift, then simulate outcomes to see this grow.
            </div>
          )}
        </div>
      </div>

      {/* ── factor breakdown ── */}
      <div
        style={{
          borderTop: `1px solid ${C.lineSoft}`,
          paddingTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 13,
        }}
      >
        {factors.map((f, i) => {
          const Icon = FACTOR_ICON[i];
          const pct = (f.score / f.max) * 100;
          const color = STATUS_COLOR[f.status];
          return (
            <div key={f.label}>
              {/* label row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <Icon size={11} color={color} strokeWidth={2.2} />
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.ink, flex: 1 }}>{f.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color, fontWeight: 700 }}>
                  {f.score}/{f.max}
                </span>
              </div>
              {/* progress bar */}
              <div
                style={{
                  height: 4,
                  borderRadius: 3,
                  background: C.lineSoft,
                  position: "relative",
                  overflow: "hidden",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: f.score > 0 ? `${pct}%` : "0%",
                    background: color,
                    borderRadius: 3,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              {/* status text */}
              <div style={{ fontSize: 10.5, color: f.status === "empty" ? C.faint : C.soft, lineHeight: 1.3 }}>
                {f.detail
                  ? <>
                      {f.detail}
                      {f.status !== "good" && (
                        <span style={{ color }}> · {f.blocking}</span>
                      )}
                    </>
                  : <span style={{ color: C.faint }}>{f.blocking}</span>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
