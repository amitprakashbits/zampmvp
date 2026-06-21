/* ────────────────────────────────────────────────────────────────────────
   Design tokens — Zamp-inspired.

   The system: a light neutral-grey canvas, near-black ink, heavy display type,
   and monospace (Geist Mono) for every label, meta line, control and terminal
   block. Vivid card fills (cobalt / purple / olive / sage / near-black) carry
   the colour. Big rounded panels with hairline borders. Black pill primary CTA.
   ──────────────────────────────────────────────────────────────────────── */

export const SANS =
  'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const DISPLAY = SANS; // same family, used at heavy weights + tight tracking
export const MONO =
  '"Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export const C = {
  paper: "#EFEFED", // the canvas — matches zamp.ai's neutral grey
  surface: "#FFFFFF",
  ink: "#0A0A0A",
  soft: "#5C5C57",
  faint: "#9A9A92",
  line: "#E1E1DC",
  lineSoft: "#E9E9E4",
  brand: "#5B33E0", // the agent
  inbox: "#6B6B64",
  processing: "#5B33E0",
  actioned: "#2F6BFF", // Zamp cobalt
  recovered: "#1F8A4C",
  escalated: "#B4530A",
  skipped: "#5B6470",
} as const;

/** Accent fills used on the big statement cards (mirroring the zamp.ai cards). */
export const FILL = {
  black: "#0A0A0A",
  cobalt: "#2F6BFF",
  purpleFrom: "#4A2FB8",
  purpleTo: "#221544",
  sage: "#C7D49B",
  olive: "#5B6B2E",
} as const;

export const LANES = [
  { key: "inbox", label: "Inbox", color: C.inbox },
  { key: "processing", label: "Processing", color: C.processing },
  { key: "actioned", label: "Actioned", color: C.actioned },
  { key: "recovered", label: "Recovered", color: C.recovered },
  { key: "escalated", label: "Human review", color: C.escalated },
  { key: "skipped", label: "Skipped", color: C.skipped },
] as const;
