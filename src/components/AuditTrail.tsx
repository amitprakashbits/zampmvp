import { C, MONO } from "../theme";
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
  error: C.escalated,
};

export function AuditTrail({ log }: { log: AuditEntry[] }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        padding: 18,
      }}
    >
      <Eyebrow>Audit log · {log.length} entries</Eyebrow>
      <div
        style={{
          marginTop: 12,
          maxHeight: 320,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {log.length === 0 && (
          <div style={{ fontSize: 13, color: C.faint, padding: "8px 0" }}>
            No actions yet. Start a shift to watch the agent work the queue.
          </div>
        )}
        {log.map((e, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              padding: "7px 0",
              borderBottom: i === log.length - 1 ? "none" : `1px solid ${C.lineSoft}`,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: C.faint,
                flexShrink: 0,
                paddingTop: 1,
              }}
            >
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
              <span style={{ color: C.soft }}>— {e.text}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
