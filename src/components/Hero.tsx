import { C, DISPLAY, MONO, R } from "../theme";
import type { ApiMode } from "../types";
import { Dot } from "./shared";

function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: C.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: size * 0.1 }}>
        <span style={{ width: size * 0.42, height: size * 0.1, background: "#fff", borderRadius: 2, transform: "skewX(-18deg)" }} />
        <span style={{ width: size * 0.42, height: size * 0.1, background: "#fff", borderRadius: 2, transform: "skewX(-18deg)" }} />
      </span>
    </div>
  );
}

/* Compact single-row header: wordmark + first-person brief side by side so the
   whole identity sits in one viewport band (no big scroll to reach the work). */
export function Hero({ apiMode }: { apiMode: ApiMode }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 18,
      }}
    >
      {/* left: wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <LogoMark size={34} />
        <div>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(30px, 5vw, 46px)",
              letterSpacing: "-0.035em",
              lineHeight: 0.95,
              color: C.ink,
            }}
          >
            recover
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.soft,
              marginTop: 4,
            }}
          >
            autonomous recovery employee
          </div>
        </div>
      </div>

      {/* right: first-person brief + reasoning-mode badge, on the same line */}
      <div
        style={{
          flex: "1 1 420px",
          minWidth: 300,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: R.lg,
          padding: "12px 15px",
        }}
      >
        <p
          style={{
            margin: 0,
            flex: 1,
            fontFamily: MONO,
            fontSize: 12,
            lineHeight: 1.55,
            color: C.soft,
          }}
        >
          <span style={{ color: C.ink }}>Hi, I'm Recover.</span> I work a queue of stalled users on
          my own - diagnose, pick a channel, act or escalate, and learn from outcomes. I own one
          number: recovered revenue.
        </p>
        <div
          title={
            apiMode === "live"
              ? "Reasoning runs on claude-sonnet-4-6 (VITE_ANTHROPIC_API_KEY detected)."
              : "No API key set - reasoning runs on built-in deterministic logic."
          }
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: apiMode === "live" ? "#EAF6EE" : C.surfaceAlt,
            border: `1px solid ${apiMode === "live" ? "#CDE8D6" : C.line}`,
            borderRadius: R.pill,
            padding: "5px 10px",
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: apiMode === "live" ? C.recovered : C.soft,
          }}
        >
          <Dot color={apiMode === "live" ? C.recovered : C.faint} />
          {apiMode === "live" ? "Live · sonnet-4-6" : "Mock reasoning"}
        </div>
      </div>
    </header>
  );
}
