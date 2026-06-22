import { C, DISPLAY, MONO, R } from "../theme";
import type { ApiMode } from "../types";
import { Dot } from "./shared";

function LogoMark({ size = 36 }: { size?: number }) {
  const sw = Math.round(size * 0.092 * 10) / 10;
  const tip = sw * 1.6;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* vertical segment down the right side */}
      <line x1="25.5" y1="9" x2="25.5" y2="21.5" stroke={C.ink} strokeWidth={sw} strokeLinecap="round" />
      {/* rounded corner */}
      <path d="M25.5,21.5 Q25.5,27 20,27" stroke={C.ink} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {/* horizontal segment to the left */}
      <line x1="20" y1="27" x2="11" y2="27" stroke={C.ink} strokeWidth={sw} strokeLinecap="round" />
      {/* arrowhead pointing left */}
      <polyline
        points={`${11 + tip},${27 - tip} ${11},${27} ${11 + tip},${27 + tip}`}
        stroke={C.ink}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

      {/* right: first-person brief + reasoning-mode badge */}
      <div
        style={{
          flex: "1 1 420px",
          minWidth: 300,
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: R.lg,
          padding: "13px 16px",
        }}
      >
        <p
          style={{
            margin: 0,
            flex: 1,
            fontFamily: MONO,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: C.soft,
          }}
        >
          <span style={{ color: C.ink, fontWeight: 600 }}>Hi, I'm Recover.</span> I work a queue of stalled users on
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
