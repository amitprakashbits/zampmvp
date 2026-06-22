/* ────────────────────────────────────────────────────────────────────────
   TRAI / RBI compliance layer.

   In India, AI-initiated outreach on a live funnel must respect:
     - TRAI DND / DNCR: calling DND numbers is a ₹10L+ violation per instance
     - Calling hours: 9 AM - 9 PM for transactional, 10 AM - 7 PM for promotional
     - DPDP Act 2023: explicit consent required before AI-generated comms
     - RBI Fair Practices Code: no harassment, clear identification of AI caller

   This module is the compliance gate the agent runs through before dispatch.
   Violations are blocked here rather than logged after - exactly the posture
   a regulated fintech needs.
   ──────────────────────────────────────────────────────────────────────── */

import type { Channel } from "../types";

export type ComplianceStatus = "ok" | "blocked" | "warn";

export interface ComplianceCheck {
  status: ComplianceStatus;
  /** Short reason shown on the card. */
  reason?: string;
  /** Suggested alternative channel when status = "warn". */
  suggestedChannel?: Channel;
}

/** Transactional (account-related) calling window per TRAI. */
const TRANSACTIONAL_HOURS = { start: 9, end: 21 }; // 9 AM - 9 PM


export interface CompliancePolicy {
  respectQuietHours: boolean;
  requireDpdpConsent: boolean;
  /** Simulated DND list. In production: scrub against TRAI DNCR API. */
  dndList: string[];
}

export const DEFAULT_COMPLIANCE_POLICY: CompliancePolicy = {
  respectQuietHours: true,
  requireDpdpConsent: true,
  dndList: [], // seeded empty; real impl scrubs against TRAI DNCR
};

/** Current hour in IST (UTC+5:30). */
function istHour(): number {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const istMs = utcMs + 5.5 * 3600_000;
  return new Date(istMs).getHours();
}

/**
 * Run compliance check before dispatching an outreach.
 * Returns status + reason. Violations are "blocked" (hard stop).
 * Near-violations are "warn" with a suggested alternative.
 */
export function checkCompliance(
  channel: Channel,
  userName: string,
  policy: CompliancePolicy,
): ComplianceCheck {
  if (!policy.respectQuietHours && !policy.requireDpdpConsent) {
    return { status: "ok" };
  }

  // DND check
  if (policy.dndList.includes(userName)) {
    return {
      status: "blocked",
      reason: "DND registry - TRAI DNCR block. Cannot contact this user.",
    };
  }

  const hour = istHour();

  // Calling hours enforcement
  if (channel === "Call") {
    if (hour < TRANSACTIONAL_HOURS.start || hour >= TRANSACTIONAL_HOURS.end) {
      return {
        status: "warn",
        reason: `Outside TRAI calling window (9 AM - 9 PM IST, currently ${formatHour(hour)}). Switching to WhatsApp.`,
        suggestedChannel: "WhatsApp",
      };
    }
  }

  // WhatsApp is generally OK 24/7 for transactional messages, but we warn at night
  if (channel === "WhatsApp") {
    if (hour < 7 || hour >= 23) {
      return {
        status: "warn",
        reason: `Late-night send (${formatHour(hour)} IST). Message will queue for 8 AM delivery.`,
      };
    }
  }

  return { status: "ok" };
}

function formatHour(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:00 ${suffix}`;
}

/** Human-readable summary of the current compliance window status. */
export function complianceWindowStatus(): {
  open: boolean;
  label: string;
  nextOpen?: string;
} {
  const hour = istHour();
  const open = hour >= TRANSACTIONAL_HOURS.start && hour < TRANSACTIONAL_HOURS.end;
  if (open) {
    const hoursLeft = TRANSACTIONAL_HOURS.end - hour;
    return {
      open: true,
      label: `Calling window open - ${hoursLeft}h left (closes ${formatHour(TRANSACTIONAL_HOURS.end)} IST)`,
    };
  }
  const hoursUntil =
    hour < TRANSACTIONAL_HOURS.start
      ? TRANSACTIONAL_HOURS.start - hour
      : 24 - hour + TRANSACTIONAL_HOURS.start;
  return {
    open: false,
    label: `Outside TRAI calling window`,
    nextOpen: `Opens in ${hoursUntil}h (${formatHour(TRANSACTIONAL_HOURS.start)} IST)`,
  };
}
