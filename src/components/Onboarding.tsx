import { useState } from "react";
import { ListChecks, Workflow, ShieldCheck, Play, ArrowRight, Check, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { C, MONO, R, SANS, SHADOW_POP } from "../theme";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Workflow,
    title: "Recover works a queue, on its own",
    body: "It pulls stalled funnel users one at a time, diagnoses why each stalled, picks a channel (Call / WhatsApp / Email), and decides to act, escalate to a human, or skip - no prompting per user.",
  },
  {
    icon: ShieldCheck,
    title: "You set the guardrails, it stays inside them",
    body: "Escalate high-value accounts, escalate on negative sentiment, set a confidence floor, hold back a control group. Guardrails can only make it more conservative - never less. Everything is logged and exportable.",
  },
  {
    icon: ListChecks,
    title: "It proves its own ROI",
    body: "A held-out control group measures true incremental lift, so you see the revenue the outreach actually caused - not credit for users who'd convert anyway.",
  },
  {
    icon: Play,
    title: "Run your first shift",
    body: "It starts in Shadow mode - every real decision, nothing actually sent. Watch it work the seeded queue, then record outcomes and watch it learn.",
  },
];

export function Onboarding({ onFinish }: { onFinish: (runNow: boolean) => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const Icon = step.icon;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(16,17,21,0.42)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "rcv-fade .2s ease",
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          width: 460,
          maxWidth: "100%",
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: R.lg,
          boxShadow: SHADOW_POP,
          overflow: "hidden",
          animation: "rcv-rise .24s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: `1px solid ${C.lineSoft}` }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: C.soft }}>
            Getting started · {i + 1} / {STEPS.length}
          </span>
          <button onClick={() => onFinish(false)} style={{ all: "unset", cursor: "pointer", color: C.faint, display: "flex" }} title="Skip">
            <X size={17} />
          </button>
        </div>

        <div style={{ padding: "22px 20px 18px" }}>
          <div style={{ width: 40, height: 40, borderRadius: R.md, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Icon size={20} color={C.accent} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>{step.title}</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: C.soft, marginTop: 9 }}>{step.body}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 20px" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, k) => (
              <span
                key={k}
                style={{
                  width: k === i ? 18 : 6,
                  height: 6,
                  borderRadius: 99,
                  background: k === i ? C.accent : C.line,
                  transition: "all .2s",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!last && (
              <button onClick={() => onFinish(false)} style={{ all: "unset", cursor: "pointer", fontSize: 13, color: C.soft, padding: "8px 12px" }}>
                Skip
              </button>
            )}
            <button
              onClick={() => (last ? onFinish(true) : setI(i + 1))}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: C.ink,
                color: "#fff",
                borderRadius: R.sm,
                padding: "9px 15px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {last ? "Run first shift" : "Next"}
              {last ? <Play size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── dockable activation checklist ──────────────────────────────────────── */

export interface ChecklistState {
  ranShift: boolean;
  recordedOutcome: boolean;
  tunedGuardrail: boolean;
  usedAssistant: boolean;
  exportedAudit: boolean;
}

const ITEMS: { key: keyof ChecklistState; label: string }[] = [
  { key: "ranShift", label: "Run a shift" },
  { key: "recordedOutcome", label: "Record an outcome" },
  { key: "tunedGuardrail", label: "Tune a guardrail" },
  { key: "usedAssistant", label: "Open the assistant (or ⌘K)" },
  { key: "exportedAudit", label: "Export the audit log" },
];

export function Checklist({
  state,
  onDismiss,
}: {
  state: ChecklistState;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(true);
  const done = ITEMS.filter((it) => state[it.key]).length;
  const pct = Math.round((done / ITEMS.length) * 100);
  const allDone = done === ITEMS.length;

  return (
    <div
      style={{
        position: "fixed",
        left: 18,
        bottom: 18,
        zIndex: 55,
        width: 248,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: R.lg,
        boxShadow: SHADOW_POP,
        overflow: "hidden",
        fontFamily: SANS,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, width: "100%", boxSizing: "border-box", padding: "11px 13px" }}
      >
        <div style={{ position: "relative", width: 26, height: 26 }}>
          <svg width="26" height="26" viewBox="0 0 26 26" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="13" cy="13" r="10" fill="none" stroke={C.lineSoft} strokeWidth="3" />
            <circle cx="13" cy="13" r="10" fill="none" stroke={allDone ? C.recovered : C.accent} strokeWidth="3" strokeDasharray={`${(pct / 100) * 62.8} 62.8`} strokeLinecap="round" style={{ transition: "stroke-dasharray .4s" }} />
          </svg>
        </div>
        <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: 600, color: C.ink }}>
          {allDone ? "You're set up" : "Getting started"}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.soft }}>{done}/{ITEMS.length}</span>
      </button>

      {open && (
        <div style={{ padding: "2px 13px 12px" }}>
          {ITEMS.map((it) => {
            const ok = state[it.key];
            return (
              <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 99,
                    border: ok ? "none" : `1.5px solid ${C.line}`,
                    background: ok ? C.recovered : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {ok && <Check size={11} color="#fff" strokeWidth={3} />}
                </span>
                <span style={{ fontSize: 12.5, color: ok ? C.faint : C.ink, textDecoration: ok ? "line-through" : "none" }}>
                  {it.label}
                </span>
              </div>
            );
          })}
          {allDone && (
            <button
              onClick={onDismiss}
              style={{ all: "unset", cursor: "pointer", marginTop: 8, fontSize: 12, color: C.accent, fontWeight: 600 }}
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
