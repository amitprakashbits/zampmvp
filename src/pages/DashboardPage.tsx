import { Inbox, BrainCircuit, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { C, LANES, MONO, R, SHADOW } from "../theme";
import type { RunMode, User } from "../types";
import { Scorecard, type Metrics } from "../components/Scorecard";
import { ShiftDebrief } from "../components/ShiftDebrief";
import type { Lift, ShiftDebrief as ShiftDebriefData } from "../lib/insights";
import type { Page } from "../components/Nav";
import { money } from "../lib/utils";

const BASELINE_RECOVERY_RATE = 0.45;

function RevenueFunnel({ users, lift }: { users: User[]; lift: Lift }) {
  const atRiskValue = users
    .filter((u) => u.status !== "skipped")
    .reduce((s, u) => s + u.value, 0);

  const actionedValue = users
    .filter((u) => ["actioned", "recovered", "escalated"].includes(u.status))
    .reduce((s, u) => s + u.value, 0);

  const recoveredValue = users
    .filter((u) => u.outcome === "recovered" || u.status === "recovered")
    .reduce((s, u) => s + u.value, 0);

  const incrementalValue = lift.incrementalRevenue > 0 ? lift.incrementalRevenue : Math.round(recoveredValue * (1 - BASELINE_RECOVERY_RATE));

  const actionedPct = atRiskValue > 0 ? Math.round((actionedValue / atRiskValue) * 100) : 0;
  const recoveryPct = actionedValue > 0 ? Math.round((recoveredValue / actionedValue) * 100) : 0;

  const steps = [
    {
      label: "At risk",
      value: atRiskValue,
      sub: `${users.filter((u) => u.status !== "skipped").length} users in scope`,
      color: C.soft,
      bg: C.surfaceAlt,
      border: C.line,
    },
    {
      label: "Actioned",
      value: actionedValue,
      sub: actionedPct > 0 ? `${actionedPct}% of at-risk contacted` : "Run shift to contact users",
      color: C.accent,
      bg: C.accentSoft,
      border: "#BFDBFE",
    },
    {
      label: "Recovered",
      value: recoveredValue,
      sub: recoveryPct > 0 ? `${recoveryPct}% of actioned returned` : "Record outcomes to track",
      color: C.recovered,
      bg: "#F0FDF4",
      border: "#86EFAC",
    },
    {
      label: "Incremental lift",
      value: incrementalValue,
      sub: `vs. ${Math.round(BASELINE_RECOVERY_RATE * 100)}% industry baseline`,
      color: incrementalValue > 0 ? C.recovered : C.faint,
      bg: incrementalValue > 0 ? "#F0FDF4" : C.surfaceAlt,
      border: incrementalValue > 0 ? "#86EFAC" : C.line,
    },
  ];

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: R.lg,
        padding: 18,
        boxShadow: SHADOW,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.soft,
          marginBottom: 14,
        }}
      >
        Revenue recovery funnel
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          flexWrap: "wrap",
        }}
      >
        {steps.map((step, idx) => (
          <div
            key={step.label}
            style={{
              display: "flex",
              alignItems: "center",
              flex: "1 1 140px",
              minWidth: 120,
            }}
          >
            <div
              style={{
                flex: 1,
                background: step.bg,
                border: `1px solid ${step.border}`,
                borderRadius: R.md,
                padding: "14px 14px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 9.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: step.color,
                  marginBottom: 5,
                  opacity: 0.7,
                }}
              >
                {step.label}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  fontWeight: 700,
                  color: step.value > 0 ? step.color : C.faint,
                  lineHeight: 1,
                  marginBottom: 5,
                }}
              >
                {step.value > 0 ? money(step.value) : "-"}
              </div>
              <div style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.35 }}>{step.sub}</div>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ padding: "0 4px", color: C.faint, flexShrink: 0 }}>
                <ArrowRight size={14} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage({
  m,
  revDisplay,
  lift,
  atRiskPerHour,
  users,
  mode,
  note,
  debrief,
  onDismissDebrief,
  onNavigate,
  running,
}: {
  m: Metrics;
  revDisplay: number;
  lift: Lift;
  atRiskPerHour: number;
  users: User[];
  mode: RunMode;
  note: string | null;
  debrief: ShiftDebriefData | null;
  onDismissDebrief: () => void;
  onNavigate: (p: Page) => void;
  running: boolean;
}) {
  const total = users.length || 1;
  const statusCounts = LANES.map((l) => ({
    ...l,
    count: users.filter((u) => u.status === l.key).length,
  }));

  const inboxCount = users.filter((u) => u.status === "inbox").length;

  return (
    <>
      {/* mode banner */}
      <div
        style={{
          background: mode === "shadow" ? C.surfaceAlt : C.accentSoft,
          border: `1px solid ${mode === "shadow" ? C.line : "#D4E2FB"}`,
          color: mode === "shadow" ? C.soft : C.accent,
          borderRadius: R.md,
          padding: "9px 13px",
          fontSize: 12.5,
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        {mode === "shadow" ? (
          <>
            <b style={{ color: C.ink }}>Shadow mode (dry-run).</b> Every real decision is made
            and the exact payload it <i>would</i> dispatch is shown - nothing is sent. The safe
            rollout posture.
          </>
        ) : (
          <>
            <b>Live mode.</b> Actions route through the dispatch seam in{" "}
            <code style={{ fontFamily: MONO }}>lib/dispatch.ts</code> - a clearly marked stub.
            Nothing is actually sent.
          </>
        )}
      </div>

      {note && (
        <div
          style={{
            background: C.accentSoft,
            border: `1px solid #D4E2FB`,
            color: C.accent,
            borderRadius: R.md,
            padding: "9px 13px",
            fontSize: 12.5,
            marginBottom: 12,
          }}
        >
          {note}
        </div>
      )}

      <Scorecard m={m} revDisplay={revDisplay} lift={lift} atRiskPerHour={atRiskPerHour} />

      {debrief && <ShiftDebrief data={debrief} onDismiss={onDismissDebrief} />}

      <RevenueFunnel users={users} lift={lift} />

      {/* ── queue status breakdown ── */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: R.lg,
          padding: 18,
          boxShadow: SHADOW,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.soft,
            marginBottom: 12,
          }}
        >
          Queue status · {users.length} users
        </div>

        {/* stacked bar */}
        <div
          style={{
            display: "flex",
            height: 10,
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 14,
            background: C.lineSoft,
          }}
        >
          {statusCounts
            .filter((s) => s.count > 0)
            .map((s) => (
              <div
                key={s.key}
                title={`${s.label}: ${s.count}`}
                style={{
                  width: `${(s.count / total) * 100}%`,
                  background: s.color,
                  transition: "width .5s ease",
                }}
              />
            ))}
        </div>

        {/* legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
          {statusCounts.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.soft }}>{s.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C.ink }}>
                {s.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── quick navigation cards ── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          {
            page: "queue" as Page,
            Icon: Inbox,
            title: "Queue",
            stat: inboxCount > 0 ? `${inboxCount} user${inboxCount === 1 ? "" : "s"} waiting` : "Queue clear",
            desc: "Run the shift, approve escalations, record outcomes, add users.",
            color: C.accent,
            bg: C.accentSoft,
            border: "#BFDBFE",
            cta: inboxCount > 0 ? "Go to queue →" : "View queue →",
          },
          {
            page: "intelligence" as Page,
            Icon: BrainCircuit,
            title: "Intelligence",
            stat: "Autopilot · calibration · forecast",
            desc: "Readiness score, confidence calibration ECE, 7-day pipeline projection.",
            color: C.recovered,
            bg: "#F0FDF4",
            border: "#BBF7D0",
            cta: "View intelligence →",
          },
          {
            page: "guardrails" as Page,
            Icon: ShieldCheck,
            title: "Guardrails",
            stat: m.escalated > 0 ? `${m.escalated} escalated this shift` : "Policy configured",
            desc: "Set operator limits, compliance rules, holdout control percentage.",
            color: C.escalated,
            bg: "#FFFBEB",
            border: "#FDE68A",
            cta: "Configure →",
          },
          {
            page: "learning" as Page,
            Icon: Zap,
            title: "Learning",
            stat: "Channel × reason matrix",
            desc: "What the agent has learned - best outreach channel per drop-off reason.",
            color: C.brand,
            bg: C.accentSoft,
            border: "#BFDBFE",
            cta: "View learning →",
          },
        ].map(({ page: p, Icon, title, stat, desc, color, bg, border, cta }) => (
          <button
            key={p}
            onClick={() => onNavigate(p)}
            className="rcv-card"
            style={{
              all: "unset",
              cursor: "pointer",
              flex: "1 1 200px",
              minWidth: 180,
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: R.lg,
              padding: "16px 18px",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
              <Icon size={14} color={color} />
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color,
                }}
              >
                {title}
              </span>
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                fontWeight: 700,
                color: C.ink,
                marginBottom: 5,
                lineHeight: 1.3,
              }}
            >
              {stat}
            </div>
            <div style={{ fontSize: 11.5, color: C.soft, lineHeight: 1.45, marginBottom: 10 }}>
              {desc}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color, letterSpacing: "0.02em" }}>
              {cta}
            </div>
          </button>
        ))}
      </div>

      {/* footer note */}
      <div
        style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 11,
          color: C.faint,
          fontFamily: MONO,
          letterSpacing: "0.04em",
        }}
      >
        {running ? "Shift in progress - agent is working the queue" : "Off shift · ready to run"}
      </div>
    </>
  );
}
