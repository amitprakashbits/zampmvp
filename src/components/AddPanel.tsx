import { useState, type CSSProperties } from "react";
import { C, SANS } from "../theme";
import { CHANNELS, type Channel, type NewUserInput } from "../types";
import { Eyebrow } from "./shared";

const STAGES = [
  "Signup — email unverified",
  "KYC incomplete",
  "KYC — manual review",
  "Bank linking failed",
  "Funding (flagged stalled)",
  "Funded, no first trade",
  "Stalled after support ticket",
];

const inp: CSSProperties = {
  all: "unset",
  boxSizing: "border-box",
  width: "100%",
  background: C.paper,
  border: `1px solid ${C.line}`,
  borderRadius: 7,
  padding: "8px 10px",
  fontSize: 13,
  color: C.ink,
  fontFamily: SANS,
};

export function AddPanel({
  onAdd,
  onClose,
}: {
  onAdd: (data: NewUserInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [dropOff, setDropOff] = useState("KYC incomplete");
  const [idle, setIdle] = useState("1d ago");
  const [pref, setPref] = useState<Channel>("WhatsApp");
  const [value, setValue] = useState("5000");
  const [signals, setSignals] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      dropOff,
      idle: idle.trim() || "just now",
      pref,
      value: Math.max(0, Number(value) || 0),
      signals: signals
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Eyebrow>Add a stalled user · watch it reason live</Eyebrow>
        <button
          onClick={onClose}
          style={{ all: "unset", cursor: "pointer", fontSize: 18, color: C.faint, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <div>
          <Eyebrow style={{ marginBottom: 5 }}>Name</Eyebrow>
          <input
            style={inp}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jordan Cole"
          />
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 5 }}>Dropped off at</Eyebrow>
          <select style={inp} value={dropOff} onChange={(e) => setDropOff(e.target.value)}>
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 5 }}>Last activity</Eyebrow>
          <input
            style={inp}
            value={idle}
            onChange={(e) => setIdle(e.target.value)}
            placeholder="e.g. 6h ago"
          />
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 5 }}>Channel preference</Eyebrow>
          <select
            style={inp}
            value={pref}
            onChange={(e) => setPref(e.target.value as Channel)}
          >
            {CHANNELS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 5 }}>Account value ($)</Eyebrow>
          <input
            style={inp}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Eyebrow style={{ marginBottom: 5 }}>Signals (comma-separated)</Eyebrow>
          <input
            style={inp}
            value={signals}
            onChange={(e) => setSignals(e.target.value)}
            placeholder="Opened app 3×, on funding screen now, …"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={submit}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: "8px 16px",
            background: C.brand,
            color: "#fff",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Add to queue
        </button>
        <span style={{ fontSize: 12, color: C.soft, alignSelf: "center" }}>
          Then hit <b style={{ color: C.ink }}>Run shift</b> — the agent picks it up on its own.
        </span>
      </div>
    </div>
  );
}
