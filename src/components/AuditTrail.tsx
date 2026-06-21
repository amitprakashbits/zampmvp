import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { C, MONO, R, SHADOW } from "../theme";
import type { AuditEntry, AuditKind } from "../types";
import { Eyebrow } from "./shared";

const EVENT_COLOR: Record<AuditKind, string> = {
  diagnosed: C.processing,
  actioned: C.actioned,
  recovered: C.recovered,
  escalated: C.escalated,
  skipped: C.skipped,
  human: C.escalated,
  outcome: C.recovered,
  learning: C.brand,
  guardrail: C.escalated,
  error: C.escalated,
};

const FILTERS: { label: string; match: (k: AuditKind) => boolean }[] = [
  { label: "All", match: () => true },
  { label: "Decisions", match: (k) => k === "diagnosed" || k === "learning" },
  { label: "Actions", match: (k) => k === "actioned" || k === "human" },
  { label: "Outcomes", match: (k) => k === "outcome" || k === "recovered" || k === "skipped" },
  { label: "Escalations", match: (k) => k === "escalated" || k === "guardrail" || k === "error" },
];

export function AuditTrail({
  log,
  onExport,
  registerExport,
}: {
  log: AuditEntry[];
  onExport?: () => void;
  registerExport?: (fn: () => void) => void;
}) {
  const [filter, setFilter] = useState(0);
  const shown = log.filter((e) => FILTERS[filter].match(e.kind));

  const exportLog = () => {
    if (log.length === 0) return;
    onExport?.();
    const payload = {
      product: "Recover - autonomous recovery employee",
      exported_at: new Date().toISOString(),
      total_entries: log.length,
      entries: log
        .slice()
        .reverse()
        .map((e) => ({ time: e.time, who: e.who, kind: e.kind, detail: e.text })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recover-audit-${log.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // expose export so the command palette can trigger it
  useEffect(() => {
    registerExport?.(exportLog);
  });

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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Eyebrow>Audit log · {log.length} entries</Eyebrow>
        <button
          onClick={exportLog}
          disabled={log.length === 0}
          title="Export the full decision trail as JSON"
          style={{
            all: "unset",
            cursor: log.length === 0 ? "default" : "pointer",
            opacity: log.length === 0 ? 0.4 : 1,
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: C.ink,
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            padding: "5px 9px",
          }}
        >
          <Download size={12} /> Export
        </button>
      </div>

      {/* filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {FILTERS.map((f, i) => {
          const active = i === filter;
          return (
            <button
              key={f.label}
              onClick={() => setFilter(i)}
              style={{
                all: "unset",
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: 10.5,
                letterSpacing: "0.03em",
                color: active ? "#fff" : C.soft,
                background: active ? C.ink : C.paper,
                border: `1px solid ${active ? C.ink : C.line}`,
                borderRadius: 99,
                padding: "4px 10px",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 12,
          maxHeight: 320,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {shown.length === 0 && (
          <div style={{ fontSize: 13, color: C.faint, padding: "8px 0" }}>
            {log.length === 0
              ? "No actions yet. Start a shift to watch the agent work the queue."
              : "No entries in this view."}
          </div>
        )}
        {shown.map((e, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              padding: "7px 0",
              borderBottom: i === shown.length - 1 ? "none" : `1px solid ${C.lineSoft}`,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint, flexShrink: 0, paddingTop: 1 }}>
              {e.time}
            </span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: EVENT_COLOR[e.kind] || C.soft,
                flexShrink: 0,
                marginTop: 6,
              }}
            />
            <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>
              <b style={{ fontWeight: 600 }}>{e.who}</b>{" "}
              <span style={{ color: C.soft }}>- {e.text}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
