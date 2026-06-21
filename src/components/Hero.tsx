import { C, DISPLAY, MONO } from "../theme";
import type { ApiMode } from "../types";
import { Dot } from "./shared";

/* The zamp.ai signature: a heavy lowercase wordmark and a monospace,
   first-person "terminal" intro that frames the product as an employee. */
export function Hero({ apiMode }: { apiMode: ApiMode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      {/* top row: identity tag + live reasoning badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: C.ink,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ width: 12, height: 2.5, background: "#fff", borderRadius: 2, transform: "skewX(-18deg)" }} />
              <span style={{ width: 12, height: 2.5, background: "#fff", borderRadius: 2, transform: "skewX(-18deg)" }} />
            </span>
          </div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.ink,
              fontWeight: 500,
            }}
          >
            Recover
          </span>
          <span style={{ color: C.faint, fontFamily: MONO, fontSize: 11 }}>/</span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.soft,
            }}
          >
            autonomous recovery employee
          </span>
        </div>

        <div
          title={
            apiMode === "live"
              ? "Reasoning runs on claude-sonnet-4-6 (VITE_ANTHROPIC_API_KEY detected)."
              : "No API key set — reasoning runs on built-in mock logic."
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: apiMode === "live" ? "#E7F3EC" : C.surface,
            border: `1px solid ${apiMode === "live" ? "#C6E4D1" : C.line}`,
            borderRadius: 99,
            padding: "6px 12px",
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: apiMode === "live" ? C.recovered : C.soft,
          }}
        >
          <Dot color={apiMode === "live" ? C.recovered : C.faint} pulse={apiMode === "live"} />
          {apiMode === "live" ? "Live reasoning · sonnet-4-6" : "Mock reasoning"}
        </div>
      </div>

      {/* terminal intro — aligned right, like the zamp.ai hero */}
      <div
        style={{
          maxWidth: 460,
          marginLeft: "auto",
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          padding: "16px 18px",
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: 1.7,
          color: C.ink,
        }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: C.escalated }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: "#E3B341" }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: C.recovered }} />
        </div>
        <p style={{ margin: "0 0 10px" }}>Hi, I'm Recover, an autonomous recovery employee.</p>
        <p style={{ margin: "0 0 10px", color: C.soft }}>
          I work a queue of stalled users on my own — diagnose why each one stalled, pick a channel,
          act or escalate, and learn from every outcome.
        </p>
        <p style={{ margin: 0 }}>
          I own one number: recovered revenue.
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 15,
              marginLeft: 4,
              transform: "translateY(2px)",
              background: C.ink,
              animation: "rcv-blink 1.1s steps(1) infinite",
            }}
          />
        </p>
      </div>

      {/* the wordmark */}
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(86px, 21vw, 280px)",
          lineHeight: 0.84,
          letterSpacing: "-0.04em",
          color: C.ink,
          marginTop: -6,
          display: "flex",
          alignItems: "flex-end",
          gap: "0.04em",
        }}
      >
        recover
        <span
          style={{
            width: "0.14em",
            height: "0.14em",
            borderRadius: 99,
            background: C.brand,
            marginBottom: "0.12em",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: "0.04em",
          color: C.soft,
          marginTop: 14,
        }}
      >
        // monitors a funnel, works the queue, escalates the hard calls, compounds what works.
      </div>
    </section>
  );
}
