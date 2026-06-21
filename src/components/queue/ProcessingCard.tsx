import { C } from "../../theme";
import type { User } from "../../types";
import { CardShell, Dot, Name } from "../shared";

const STEPS = [
  "Reading signals",
  "Diagnosing root cause",
  "Selecting channel",
  "Drafting outreach",
  "Logging decision",
];

export function ProcessingCard({ u, phase }: { u: User; phase: string }) {
  const idx = STEPS.indexOf(phase);
  return (
    <CardShell accent={C.processing} glow>
      {/* sweeping sheen — reads as "the worker is on it" */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 13,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "40%",
            background:
              "linear-gradient(100deg, transparent, rgba(91,51,224,0.14), transparent)",
            animation: "rcv-sheen 1.8s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ position: "relative" }}>
        <Name name={u.name} value={u.value} />
        <div
          style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, color: C.processing }}
        >
          <Dot color={C.processing} pulse />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{phase || "Working…"}</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 9 }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              title={s}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                background: i <= idx ? C.processing : C.line,
                transition: "background .3s",
              }}
            />
          ))}
        </div>
      </div>
    </CardShell>
  );
}
