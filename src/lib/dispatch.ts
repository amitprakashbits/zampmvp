import type { Channel, DispatchRecord, RunMode } from "../types";
import { stamp } from "./utils";

export interface OutreachPayload {
  channel: Channel | "-";
  message: string;
}

/* ────────────────────────────────────────────────────────────────────────
   The single send seam. EVERY outbound action funnels through here.

   • SHADOW mode (default): the agent makes the real decision but does NOT
     send. We return a "would_send" record carrying the exact payload - a
     deliberate dry-run for safe rollout, not a fake.

   • LIVE mode: control passes to `liveSend()` below - the one place a real
     Twilio / WhatsApp / email integration plugs in. It is currently a
     well-marked stub that does NOT actually send anything.
   ──────────────────────────────────────────────────────────────────────── */
export async function dispatchOutreach(
  payload: OutreachPayload,
  mode: RunMode,
): Promise<DispatchRecord> {
  if (mode === "shadow") {
    return {
      channel: payload.channel,
      message: payload.message,
      mode: "shadow",
      status: "would_send",
      at: stamp(),
    };
  }
  return liveSend(payload);
}

/**
 * ── LIVE INTEGRATION SEAM ────────────────────────────────────────────────
 * Wire a real provider here. This is the ONLY function that should ever touch
 * an external messaging API. It is intentionally a no-op stub today so the app
 * is safe to run in "Live mode" without any real-world side effects.
 *
 * To go truly live, replace the body below, e.g.:
 *
 *   switch (payload.channel) {
 *     case "WhatsApp":
 *       await twilio.messages.create({
 *         from: `whatsapp:${FROM}`, to: `whatsapp:${user.phone}`, body: payload.message,
 *       });
 *       break;
 *     case "Call":
 *       await twilio.calls.create({ from: FROM, to: user.phone, twiml: voiceScript(payload.message) });
 *       break;
 *     case "Email":
 *       await ses.sendEmail({ Destination: { ToAddresses: [user.email] }, ... });
 *       break;
 *   }
 *   return { ...payload, mode: "live", status: "sent", at: stamp() };
 *
 * Until that's wired, we mark the attempt as a no-op so nothing leaves the app.
 */
async function liveSend(payload: OutreachPayload): Promise<DispatchRecord> {
  // TODO: integrate Twilio (Call/WhatsApp) + SES/SendGrid (Email) here.
  // eslint-disable-next-line no-console
  console.warn(
    "[dispatch] LIVE mode is a stub - no real send is wired up. Payload:",
    payload,
  );
  return {
    channel: payload.channel,
    message: payload.message,
    mode: "live",
    status: "noop",
    at: stamp(),
  };
}
