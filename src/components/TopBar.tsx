import { Plus, RotateCcw, Zap, Beaker, ArrowRight } from "lucide-react";
import { C, MONO } from "../theme";
import type { RunMode } from "../types";
import { Dot } from "./shared";

const pill = {
  all: "unset" as const,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 14px",
  borderRadius: 99,
  fontFamily: MONO,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.01em",
};

/** Shadow/Live segmented switch. */
function ModeToggle({
  mode,
  onToggle,
  disabled,
}: {
  mode: RunMode;
  onToggle: (m: RunMode) => void;
  disabled: boolean;
}) {
  const seg = (m: RunMode, label: string) => {
    const active = mode === m;
    return (
      <button
        onClick={() => !disabled && onToggle(m)}
        title={
          m === "shadow"
            ? "Dry-run: the agent decides everything but never sends."
            : "Live: routes through the real dispatch seam (stubbed — still won't send)."
        }
        style={{
          all: "unset",
          cursor: disabled ? "default" : "pointer",
          padding: "6px 13px",
          borderRadius: 99,
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 500,
          color: active ? "#fff" : C.soft,
          background: active ? (m === "shadow" ? C.brand : C.actioned) : "transparent",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {m === "shadow" ? <Beaker size={13} /> : <Zap size={13} />}
        {label}
      </button>
    );
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 99,
        padding: 3,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {seg("shadow", "Shadow")}
      {seg("live", "Live")}
    </div>
  );
}

export function TopBar({
  running,
  phase,
  inboxCount,
  mode,
  onToggleMode,
  onToggleAdd,
  onReset,
  onRunShift,
  onSimulate,
  canSimulate,
}: {
  running: boolean;
  phase: string;
  inboxCount: number;
  mode: RunMode;
  onToggleMode: (m: RunMode) => void;
  onToggleAdd: () => void;
  onReset: () => void;
  onRunShift: () => void;
  onSimulate: () => void;
  canSimulate: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 16,
        position: "sticky",
        top: 10,
        zIndex: 20,
        background: "rgba(239,239,237,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: "8px 10px",
        borderRadius: 99,
        border: `1px solid ${C.line}`,
      }}
    >
      {/* live shift status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 10px" }}>
        <Dot color={running ? C.brand : C.faint} pulse={running} />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 12,
            color: running ? C.ink : C.soft,
            fontWeight: running ? 600 : 400,
          }}
        >
          {running
            ? `on shift — ${(phase || "working the queue").toLowerCase()}`
            : inboxCount
              ? "off shift — queue waiting"
              : "off shift — queue clear"}
        </span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <ModeToggle mode={mode} onToggle={onToggleMode} disabled={running} />

        <button
          onClick={onSimulate}
          disabled={running || !canSimulate}
          style={{
            ...pill,
            cursor: running || !canSimulate ? "default" : "pointer",
            opacity: running || !canSimulate ? 0.45 : 1,
            background: C.surface,
            border: `1px solid ${C.line}`,
            color: C.ink,
          }}
          title="Roll outcomes for everyone the agent has actioned (uses hidden warmth)."
        >
          <Beaker size={14} /> Simulate outcomes
        </button>

        <button
          onClick={onToggleAdd}
          disabled={running}
          style={{
            ...pill,
            cursor: running ? "default" : "pointer",
            opacity: running ? 0.45 : 1,
            background: C.surface,
            border: `1px solid ${C.line}`,
            color: C.ink,
          }}
        >
          <Plus size={14} /> Add user
        </button>

        <button
          onClick={onReset}
          disabled={running}
          style={{
            ...pill,
            cursor: running ? "default" : "pointer",
            opacity: running ? 0.45 : 1,
            background: C.surface,
            border: `1px solid ${C.line}`,
            color: C.soft,
          }}
        >
          <RotateCcw size={13} /> Reset
        </button>

        <button
          onClick={onRunShift}
          disabled={running || inboxCount === 0}
          style={{
            ...pill,
            cursor: running || inboxCount === 0 ? "default" : "pointer",
            opacity: running || inboxCount === 0 ? 0.55 : 1,
            padding: "10px 16px",
            background: C.ink,
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {running ? <Dot color="#fff" pulse /> : <Zap size={14} strokeWidth={2.4} />}
          {running ? "Working…" : `Run shift${inboxCount ? ` · ${inboxCount}` : ""}`}
          {!running && inboxCount > 0 && <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  );
}
