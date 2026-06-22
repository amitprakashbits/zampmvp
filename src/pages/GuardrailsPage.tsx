import { C, MONO, R, SHADOW } from "../theme";
import type { Policy, AuditEntry } from "../types";
import { GuardrailsPanel } from "../components/GuardrailsPanel";
import type { CompliancePolicy } from "../lib/compliance";
import { ShieldAlert } from "lucide-react";
import { Eyebrow } from "../components/shared";

const KIND_COLOR: Record<string, string> = {
  guardrail: C.escalated,
  error: "#B42318",
};

function RecentFires({ log }: { log: AuditEntry[] }) {
  const fires = log.filter((e) => e.kind === "guardrail" || e.kind === "error").slice(0, 12);

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: R.lg,
        padding: 18,
        boxShadow: SHADOW,
        marginTop: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <ShieldAlert size={14} color={C.escalated} />
        <Eyebrow style={{ color: C.escalated }}>Recent rule activity</Eyebrow>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 10.5,
            color: fires.length ? C.escalated : C.faint,
            background: fires.length ? "#FBEFE2" : C.surfaceAlt,
            border: `1px solid ${fires.length ? "#F0DBC4" : C.line}`,
            borderRadius: R.pill,
            padding: "2px 8px",
          }}
        >
          {fires.length} event{fires.length === 1 ? "" : "s"}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: C.soft, marginBottom: 12, lineHeight: 1.4 }}>
        Every guardrail override and fail-safe escalation logged here in real time.
      </div>

      {fires.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.faint }}>
          No rule activity yet. Guardrails fire when the agent's decision exceeds operator policy.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {fires.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "7px 0",
                borderBottom: i === fires.length - 1 ? "none" : `1px solid ${C.lineSoft}`,
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
                  background: KIND_COLOR[e.kind] ?? C.soft,
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
      )}
    </div>
  );
}

export function GuardrailsPage({
  policy,
  setPolicy,
  compliance,
  setCompliance,
  fired,
  log,
}: {
  policy: Policy;
  setPolicy: (p: Policy) => void;
  compliance: CompliancePolicy;
  setCompliance: (p: CompliancePolicy) => void;
  fired: number;
  log: AuditEntry[];
}) {
  return (
    <>
      <GuardrailsPanel
        policy={policy}
        setPolicy={setPolicy}
        compliance={compliance}
        setCompliance={setCompliance}
        fired={fired}
      />
      <RecentFires log={log} />
    </>
  );
}
