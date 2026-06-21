import { Activity, Plus, RotateCcw, Zap, Beaker } from "lucide-react";
import { C, MONO } from "../theme";
import type { ApiMode, RunMode } from "../types";
import { Dot } from "./shared";

const btnBase = {
  all: "unset" as const,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 13px",
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 600,
};

/** Small shadow/live segmented switch. */
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
          padding: "5px 11px",
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 600,
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
        borderRadius: 9,
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
  apiMode,
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
  apiMode: ApiMode;
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
      style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: C.brand,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Activity size={17} color="#fff" strokeWidth={2.4} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1 }}>
            Recover
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: "0.06em",
              color: C.soft,
              marginTop: 3,
              textTransform: "uppercase",
            }}
          >
            autonomous recovery employee
          </div>
        </div>
      </div>

      {/* live shift status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 99,
          padding: "6px 12px",
        }}
      >
        <Dot color={running ? C.brand : C.faint} pulse={running} />
        <span
          style={{
            fontSize: 12.5,
            color: running ? C.ink : C.soft,
            fontWeight: running ? 600 : 500,
          }}
        >
          {running
            ? `On shift — ${phase || "working the queue"}`
            : inboxCount
              ? "Off shift — queue waiting"
              : "Off shift — queue clear"}
        </span>
      </div>

      {/* API mode badge: live key vs mock */}
      <div
        title={
          apiMode === "live"
            ? "Reasoning runs on claude-sonnet-4-6 (VITE_ANTHROPIC_API_KEY detected)."
            : "No API key set — reasoning runs on built-in mock logic."
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: apiMode === "live" ? "#EAF7EF" : C.paper,
          border: `1px solid ${apiMode === "live" ? "#CBE9D6" : C.line}`,
          borderRadius: 99,
          padding: "6px 11px",
          fontFamily: MONO,
          fontSize: 10.5,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: apiMode === "live" ? C.recovered : C.soft,
        }}
      >
        <Dot color={apiMode === "live" ? C.recovered : C.faint} />
        {apiMode === "live" ? "Live reasoning · sonnet-4-6" : "Mock reasoning"}
      </div>

      <div
        style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
      >
        <ModeToggle mode={mode} onToggle={onToggleMode} disabled={running} />

        <button
          onClick={onSimulate}
          disabled={running || !canSimulate}
          style={{
            ...btnBase,
            cursor: running || !canSimulate ? "default" : "pointer",
            opacity: running || !canSimulate ? 0.5 : 1,
            background: C.surface,
            border: `1px solid ${C.line}`,
            color: C.ink,
          }}
          title="Roll outcomes for everyone the agent has actioned (uses hidden warmth)."
        >
          <Beaker size={15} /> Simulate outcomes
        </button>

        <button
          onClick={onToggleAdd}
          disabled={running}
          style={{
            ...btnBase,
            cursor: running ? "default" : "pointer",
            opacity: running ? 0.5 : 1,
            background: C.surface,
            border: `1px solid ${C.line}`,
            color: C.ink,
          }}
        >
          <Plus size={15} /> Add user
        </button>

        <button
          onClick={onReset}
          disabled={running}
          style={{
            ...btnBase,
            cursor: running ? "default" : "pointer",
            opacity: running ? 0.5 : 1,
            background: C.surface,
            border: `1px solid ${C.line}`,
            color: C.soft,
          }}
        >
          <RotateCcw size={14} /> Reset
        </button>

        <button
          onClick={onRunShift}
          disabled={running || inboxCount === 0}
          style={{
            ...btnBase,
            cursor: running || inboxCount === 0 ? "default" : "pointer",
            opacity: running || inboxCount === 0 ? 0.55 : 1,
            padding: "8px 16px",
            background: C.brand,
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {running ? <Dot color="#fff" pulse /> : <Zap size={15} strokeWidth={2.4} />}
          {running ? "Working…" : `Run shift${inboxCount ? ` · ${inboxCount}` : ""}`}
        </button>
      </div>
    </div>
  );
}
