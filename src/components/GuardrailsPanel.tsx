import type { ReactNode } from "react";
import { ShieldCheck, Clock } from "lucide-react";
import { C, MONO, R } from "../theme";
import type { Policy } from "../types";
import { money } from "../lib/utils";
import { Eyebrow } from "./shared";
import { Select } from "./Select";
import type { CompliancePolicy } from "../lib/compliance";
import { complianceWindowStatus } from "../lib/compliance";

const VALUE_STEPS = [5000, 25000, 50000, 100000, 250000];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        width: 42,
        height: 24,
        borderRadius: 99,
        background: on ? C.recovered : C.line,
        position: "relative",
        transition: "background .2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: 99,
          background: "#fff",
          transition: "left .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}

export function GuardrailsPanel({
  policy,
  setPolicy,
  compliance,
  setCompliance,
  fired,
}: {
  policy: Policy;
  setPolicy: (p: Policy) => void;
  compliance: CompliancePolicy;
  setCompliance: (p: CompliancePolicy) => void;
  fired: number;
}) {
  const win = complianceWindowStatus();
  const Row = ({ children }: { children: ReactNode }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "11px 0",
        borderTop: `1px solid ${C.lineSoft}`,
      }}
    >
      {children}
    </div>
  );

  const label = (title: string, sub: string) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{title}</div>
      <div style={{ fontSize: 11, color: C.soft, marginTop: 2 }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <ShieldCheck size={15} color={C.escalated} />
        <Eyebrow style={{ color: C.escalated }}>Guardrails · operator policy</Eyebrow>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 10.5,
            color: fired ? C.escalated : C.faint,
            background: fired ? "#FBEFE2" : C.surfaceAlt,
            border: `1px solid ${fired ? "#F0DBC4" : C.line}`,
            borderRadius: 99,
            padding: "3px 9px",
          }}
        >
          {fired} fired this shift
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: C.soft, marginBottom: 6, lineHeight: 1.4 }}>
        The agent acts autonomously inside these limits - they can only make it more conservative
        (auto-action → human). Tune them and re-run the shift.
      </div>

      <Row>
        {label("Escalate high-value accounts", "Auto-action ceiling - above this, a human signs off")}
        <div style={{ width: 168, flexShrink: 0 }}>
          <Select
            ariaLabel="Auto-action ceiling"
            value={String(policy.maxAutoValue)}
            onChange={(v) => setPolicy({ ...policy, maxAutoValue: Number(v) })}
            options={VALUE_STEPS.map((v) => ({ value: String(v), label: `≥ ${money(v)}` }))}
          />
        </div>
      </Row>

      <Row>
        {label("Escalate on negative sentiment", "Hand unhappy / at-risk relationships to a human")}
        <Toggle
          on={policy.escalateNegativeSentiment}
          onClick={() => setPolicy({ ...policy, escalateNegativeSentiment: !policy.escalateNegativeSentiment })}
        />
      </Row>

      <Row>
        {label("Min confidence to auto-act", "Below this, the agent routes to a human instead")}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={policy.minConfidence}
            onChange={(e) => setPolicy({ ...policy, minConfidence: Number(e.target.value) })}
            style={{ width: 118, accentColor: C.accent }}
          />
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink, width: 34, textAlign: "right" }}>
            {policy.minConfidence.toFixed(2)}
          </span>
        </div>
      </Row>

      <Row>
        {label("Holdout control", "Untouched slice that measures true incremental lift")}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <input
            type="range"
            min={0}
            max={30}
            step={5}
            value={policy.holdoutPct}
            onChange={(e) => setPolicy({ ...policy, holdoutPct: Number(e.target.value) })}
            style={{ width: 118, accentColor: C.accent }}
          />
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink, width: 34, textAlign: "right" }}>
            {policy.holdoutPct}%
          </span>
        </div>
      </Row>

      {/* TRAI / RBI compliance section */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${C.line}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Clock size={13} color={win.open ? C.recovered : C.escalated} />
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: win.open ? C.recovered : C.escalated,
            }}
          >
            TRAI / RBI compliance
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: MONO,
              fontSize: 10,
              color: win.open ? C.recovered : C.escalated,
              background: win.open ? "#F0FDF4" : "#FEF2F2",
              border: `1px solid ${win.open ? "#86EFAC" : "#FECACA"}`,
              borderRadius: 99,
              padding: "2px 8px",
            }}
          >
            {win.open ? "Window open" : "Window closed"}
          </span>
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: C.soft,
            marginBottom: 10,
            lineHeight: 1.4,
          }}
        >
          {win.label}
          {!win.open && win.nextOpen && (
            <span style={{ color: C.faint }}> · {win.nextOpen}</span>
          )}
        </div>

        <Row>
          {label("Respect TRAI quiet hours", "Block calls outside 9 AM - 9 PM IST, switch to WhatsApp")}
          <Toggle
            on={compliance.respectQuietHours}
            onClick={() => setCompliance({ ...compliance, respectQuietHours: !compliance.respectQuietHours })}
          />
        </Row>

        <Row>
          {label("Require DPDP consent check", "Flag users where AI outreach consent is unverified")}
          <Toggle
            on={compliance.requireDpdpConsent}
            onClick={() => setCompliance({ ...compliance, requireDpdpConsent: !compliance.requireDpdpConsent })}
          />
        </Row>
      </div>
    </div>
  );
}
