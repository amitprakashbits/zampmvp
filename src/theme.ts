/* ────────────────────────────────────────────────────────────────────────
   Design tokens - a restrained, professional ops-SaaS system (Linear / Ramp /
   Mercury lineage). Deliberately NOT an "AI app" look: no purple gradients, no
   glow, no glassmorphism, no sparkle iconography. A tight neutral palette, one
   calm blue accent, semantic status colours, hairline borders, low radius,
   monospace for numbers / IDs / timestamps.
   ──────────────────────────────────────────────────────────────────────── */

export const SANS =
  'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const DISPLAY = SANS;
export const MONO =
  '"Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export const C = {
  paper: "#F6F6F4", // app canvas
  surface: "#FFFFFF",
  surfaceAlt: "#FBFBFA",
  ink: "#16171B", // near-black text + the "primary" dark card
  soft: "#5B5F66", // secondary text
  faint: "#9A9EA6", // tertiary / meta
  line: "#E6E6E1", // hairline borders
  lineSoft: "#EFEFEB",

  accent: "#2563EB", // the single brand/primary accent (calm blue)
  accentSoft: "#EEF3FE",

  brand: "#2563EB", // "the agent" == accent
  inbox: "#64748B",
  processing: "#2563EB",
  actioned: "#2563EB",
  recovered: "#15803D",
  escalated: "#B45309",
  skipped: "#94A3B8",
  danger: "#B42318",
} as const;

/** Radii - low and consistent (research: 6-10px reads as "serious software"). */
export const R = {
  sm: 7,
  md: 9,
  lg: 11,
  pill: 999,
} as const;

/** A single restrained elevation. No layered glows. */
export const SHADOW = "0 1px 2px rgba(16,17,21,0.04), 0 1px 3px rgba(16,17,21,0.03)";
export const SHADOW_POP = "0 10px 30px -12px rgba(16,17,21,0.22)";

export const LANES = [
  { key: "inbox", label: "Inbox", color: C.inbox },
  { key: "processing", label: "Processing", color: C.processing },
  { key: "actioned", label: "Actioned", color: C.actioned },
  { key: "recovered", label: "Recovered", color: C.recovered },
  { key: "escalated", label: "Human review", color: C.escalated },
  { key: "skipped", label: "Skipped", color: C.skipped },
] as const;
