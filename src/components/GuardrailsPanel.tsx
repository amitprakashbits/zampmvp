import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { C, MONO } from "../theme";
import type { Policy } from "../types";
import { money } from "../lib/utils";
import { Eyebrow } from "./shared";

const VALUE_STEPS = [5000, 25000, 50000, 100000, 250000];

export function GuardrailsPanel({
  policy,
  setPolicy,
  fired,
}: {
  policy: Policy;
  setPolicy: (p: Policy) => void;
  fired: number;
}) {
  const Row = ({ children }: { children: ReactNode }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "11px 0",
        borderTop: `1px solid ${C.lineSoft}`,
      }}
    >
      {children}
    </div>
  );

  const label = (title: string, sub: string) => (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{title}</div>
      <div style={{ fontSize: 11, color: C.soft, marginTop: 2 }}>{sub}</div>
    </div>
  );

  const selStyle = {
    all: "unset" as const,
    cursor: "pointer",
    fontFamily: MONO,
    fontSize: 12,
    color: C.ink,
    background: C.paper,
    border: `1px solid ${C.line}`,
    borderRadius: 8,
    padding: "5px 9px",
  };

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <ShieldCheck size={15} color={C.escalated} />
        <Eyebrow style={{ color: C.escalated }}>Guardrails · operator policy</Eyebrow>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 10.5,
            color: fired ? C.escalated : C.faint,
            background: fired ? "#FBEFE2" : C.paper,
            border: `1px solid ${fired ? "#F0DBC4" : C.line}`,
            borderRadius: 99,
            padding: "3px 9px",
          }}
        >
          {fired} fired this shift
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: C.soft, marginBottom: 6, lineHeight: 1.4 }}>
        The agent acts autonomously inside these limits — they can only make it more
        conservative (auto-action → human). Tune them and re-run the shift.
      </div>

      <Row>
        {label("Escalate high-value accounts", "Auto-action ceiling — above this, a human signs off")}
        <select
          style={selStyle}
          value={policy.maxAutoValue}
          onChange={(e) => setPolicy({ ...policy, maxAutoValue: Number(e.target.value) })}
        >
          {VALUE_STEPS.map((v) => (
            <option key={v} value={v}>
              ≥ {money(v)}
            </option>
          ))}
        </select>
      </Row>

      <Row>
        {label("Escalate on negative sentiment", "Hand unhappy / at-risk relationships to a human")}
        <button
          onClick={() =>
            setPolicy({ ...policy, escalateNegativeSentiment: !policy.escalateNegativeSentiment })
          }
          style={{
            all: "unset",
            cursor: "pointer",
            width: 42,
            height: 24,
            borderRadius: 99,
            background: policy.escalateNegativeSentiment ? C.recovered : C.line,
            position: "relative",
            transition: "background .2s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: policy.escalateNegativeSentiment ? 21 : 3,
              width: 18,
              height: 18,
              borderRadius: 99,
              background: "#fff",
              transition: "left .2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }}
          />
        </button>
      </Row>

      <Row>
        {label("Min confidence to auto-act", "Below this, the agent routes to a human instead")}
        <input
          type="range"
          min={0.3}
          max={0.95}
          step={0.05}
          value={policy.minConfidence}
          onChange={(e) => setPolicy({ ...policy, minConfidence: Number(e.target.value) })}
          style={{ width: 120, accentColor: C.brand }}
        />
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink, width: 34, textAlign: "right" }}>
          {policy.minConfidence.toFixed(2)}
        </span>
      </Row>
    </div>
  );
}
