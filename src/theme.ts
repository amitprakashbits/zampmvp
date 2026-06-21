/* ────────────────────────────────────────────────────────────────────────
   Design tokens. The look is intentional: a confident, restrained internal-ops
   tool — tight type, narrow palette, clear status colors. Kept as plain JS
   tokens (not Tailwind classes) so the original aesthetic is preserved exactly.
   ──────────────────────────────────────────────────────────────────────── */

export const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

export const C = {
  paper: "#F6F6F2",
  surface: "#FFFFFF",
  ink: "#1C1C1A",
  soft: "#71716B",
  faint: "#A6A6A0",
  line: "#E9E9E2",
  lineSoft: "#F0F0EA",
  brand: "#6D28D9", // the agent
  inbox: "#71716B",
  processing: "#6D28D9",
  actioned: "#2563EB",
  recovered: "#15803D",
  escalated: "#B45309",
  skipped: "#64748B",
} as const;

export const LANES = [
  { key: "inbox", label: "Inbox", color: C.inbox },
  { key: "processing", label: "Processing", color: C.processing },
  { key: "actioned", label: "Actioned", color: C.actioned },
  { key: "recovered", label: "Recovered", color: C.recovered },
  { key: "escalated", label: "Human review", color: C.escalated },
  { key: "skipped", label: "Skipped", color: C.skipped },
] as const;
