import { X, Phone, MessageCircle, Mail, ShieldCheck, TrendingDown, Clock, Zap } from "lucide-react";
import { C, MONO, R, SANS, SHADOW_POP } from "../theme";
import type { OutcomeKind, User } from "../types";
import { computeSla, costPerHour, recoveryProbability } from "../lib/insights";
import { money } from "../lib/utils";

const CH_ICON = { Call: Phone, WhatsApp: MessageCircle, Email: Mail } as const;

const OUTCOME_LABELS: Record<OutcomeKind, string> = {
  recovered: "Recovered",
  ignored: "Ignored",
  converted_anyway: "Converted anyway",
};

const OUTCOME_META: Record<OutcomeKind, { color: string; bg: string; border: string }> = {
  recovered:        { color: C.recovered, bg: "#F0FDF4", border: "#86EFAC" },
  ignored:          { color: C.skipped,   bg: C.surfaceAlt, border: C.line },
  converted_anyway: { color: C.soft,      bg: C.surfaceAlt, border: C.line },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: 16, borderTop: `1px solid ${C.lineSoft}` }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.faint,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ConfRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? C.recovered : value >= 0.55 ? C.escalated : "#B42318";
  const r = 18, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={44} height={44} viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke={C.lineSoft} strokeWidth={4} />
        <circle
          cx={22} cy={22} r={r}
          fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text x={22} y={26} textAnchor="middle" fontSize={11} fontWeight={700} fill={color} fontFamily="monospace">
          {pct}%
        </text>
      </svg>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color }}>{pct}% confident</div>
        <div style={{ fontSize: 11, color: C.soft, marginTop: 1 }}>
          {value >= 0.75 ? "High confidence - auto-act eligible" :
           value >= 0.55 ? "Moderate - check guardrail threshold" :
           "Low - guardrail may escalate"}
        </div>
      </div>
    </div>
  );
}

export function UserDrawer({
  user,
  onClose,
  onApprove,
  onOverride,
  onOutcome,
}: {
  user: User;
  onClose: () => void;
  onApprove: (u: User) => void;
  onOverride: (u: User) => void;
  onOutcome: (u: User, o: OutcomeKind) => void;
}) {
  const sla = computeSla(user);
  const prob = recoveryProbability(user);
  const cph = costPerHour(user);
  const r = user.result;

  const tierColor = sla.tier === "Whale" ? C.accent : sla.tier === "Mid" ? C.escalated : C.faint;
  const tierBg   = sla.tier === "Whale" ? C.accentSoft : sla.tier === "Mid" ? "#FFFBEB" : C.surfaceAlt;
  const slaBreached = sla.breached;
  const slaWarn = !slaBreached && sla.pctUsed >= 0.7;

  const ChIcon = CH_ICON[user.pref as keyof typeof CH_ICON];

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(22,23,27,0.35)",
          backdropFilter: "blur(2px)",
          zIndex: 40,
          animation: "rcv-fade .18s ease",
        }}
      />

      {/* panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(440px, 100vw)",
          background: C.surface,
          borderLeft: `1px solid ${C.line}`,
          boxShadow: SHADOW_POP,
          zIndex: 50,
          overflowY: "auto",
          animation: "rcv-slide-in .2s ease",
          fontFamily: SANS,
        }}
      >
        <style>{`
          @keyframes rcv-slide-in {
            from { transform: translateX(100%); opacity: 0 }
            to   { transform: translateX(0);    opacity: 1 }
          }
        `}</style>

        {/* ── header ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: C.surface,
            borderBottom: `1px solid ${C.line}`,
            padding: "14px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            zIndex: 2,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.ink,
                lineHeight: 1.2,
                marginBottom: 5,
              }}
            >
              {user.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.ink,
                }}
              >
                {money(user.value)}
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9.5,
                  color: tierColor,
                  background: tierBg,
                  border: `1px solid ${tierColor}33`,
                  borderRadius: R.pill,
                  padding: "2px 7px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {sla.tier}
              </span>
              {(slaBreached || slaWarn) && (
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9.5,
                    color: slaBreached ? "#B42318" : C.escalated,
                    background: slaBreached ? "#FEF2F2" : "#FFFBEB",
                    border: `1px solid ${slaBreached ? "#FECACA" : "#FDE68A"}`,
                    borderRadius: R.pill,
                    padding: "2px 7px",
                  }}
                >
                  {slaBreached ? "SLA BREACH" : "SLA at risk"}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              all: "unset",
              cursor: "pointer",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 7,
              background: C.surfaceAlt,
              border: `1px solid ${C.line}`,
              color: C.soft,
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── body ── */}
        <div style={{ padding: "18px 18px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* context row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { Icon: Clock, label: "Idle", value: user.idle },
              { Icon: ChIcon ?? Phone, label: "Prefers", value: user.pref },
              { Icon: TrendingDown, label: "Drop-off", value: user.dropOff },
            ].map(({ Icon, label, value }) => (
              <div
                key={label}
                style={{
                  flex: "1 1 110px",
                  background: C.surfaceAlt,
                  border: `1px solid ${C.line}`,
                  borderRadius: R.md,
                  padding: "8px 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <Icon size={10} color={C.faint} />
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 9,
                      color: C.faint,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* recovery probability + cost */}
          <Section title="Urgency signals">
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  background: C.surfaceAlt,
                  border: `1px solid ${C.line}`,
                  borderRadius: R.md,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.faint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Recovery prob.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: C.lineSoft,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${prob}%`,
                        height: "100%",
                        background: prob >= 60 ? C.recovered : prob >= 40 ? C.escalated : "#B42318",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 14,
                      fontWeight: 700,
                      color: prob >= 60 ? C.recovered : prob >= 40 ? C.escalated : "#B42318",
                    }}
                  >
                    {prob}%
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: C.soft, marginTop: 4, lineHeight: 1.3 }}>
                  {prob >= 60 ? "High - act now" : prob >= 40 ? "Moderate - worth contacting" : "Low - may not respond"}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: cph > 50 ? "#FEF2F2" : C.surfaceAlt,
                  border: `1px solid ${cph > 50 ? "#FECACA" : C.line}`,
                  borderRadius: R.md,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.faint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Cost of delay</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 16,
                    fontWeight: 700,
                    color: cph > 50 ? "#B42318" : C.ink,
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  {money(cph)}
                  <span style={{ fontSize: 11, fontWeight: 400, color: C.soft }}>/hr</span>
                </div>
                <div style={{ fontSize: 10.5, color: C.soft, lineHeight: 1.3 }}>
                  {sla.slaHours}h SLA · {slaBreached ? "breached" : `${sla.remainingHours > 0 ? Math.round(sla.remainingHours) + "h left" : "at limit"}`}
                </div>
              </div>
            </div>
          </Section>

          {/* signals */}
          {user.signals.length > 0 && (
            <Section title="Signals">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {user.signals.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11.5,
                      color: C.soft,
                      background: C.paper,
                      border: `1px solid ${C.line}`,
                      borderRadius: 6,
                      padding: "3px 8px",
                      lineHeight: 1.5,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* agent analysis */}
          {r && (
            <Section title="Agent analysis">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ConfRing value={r.confidence} />

                <div>
                  <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO, marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Root cause</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{r.root_cause}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO, marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Decision</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Zap size={13} color={r.action === "ESCALATE" ? C.escalated : C.accent} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: r.action === "ESCALATE" ? C.escalated : C.accent }}>
                      {r.action}
                    </span>
                    {r.channel !== "-" && (
                      <>
                        <span style={{ color: C.faint }}>via</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: C.ink }}>
                          {CH_ICON[r.channel as keyof typeof CH_ICON] && (() => {
                            const Icon = CH_ICON[r.channel as keyof typeof CH_ICON];
                            return <Icon size={13} strokeWidth={2} />;
                          })()}
                          {r.channel}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO, marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Reasoning</div>
                  <div style={{ fontSize: 12.5, color: C.soft, lineHeight: 1.55 }}>{r.reasoning}</div>
                </div>

                {r.guardrail && (
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      background: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      borderRadius: R.md,
                      padding: "8px 10px",
                      fontSize: 12,
                      color: C.escalated,
                      lineHeight: 1.45,
                    }}
                  >
                    <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span><b>Guardrail - </b>{r.guardrail}</span>
                  </div>
                )}

                {r.learning_note && (
                  <div
                    style={{
                      background: C.accentSoft,
                      border: "1px solid #BFDBFE",
                      borderRadius: R.md,
                      padding: "8px 10px",
                      fontSize: 12,
                      color: C.accent,
                      lineHeight: 1.45,
                    }}
                  >
                    {r.learning_note}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* draft message */}
          {r?.draft_message && (
            <Section title="Draft outreach">
              <div
                style={{
                  background: C.paper,
                  border: `1px solid ${C.line}`,
                  borderRadius: R.md,
                  padding: "12px 14px",
                  fontSize: 13,
                  color: C.ink,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  fontFamily: MONO,
                }}
              >
                {r.draft_message}
              </div>
              {user.dispatch && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: user.dispatch.status === "sent" ? C.recovered : C.faint,
                    fontFamily: MONO,
                  }}
                >
                  {user.dispatch.status === "would_send" && "Would send via " + user.dispatch.channel + " (shadow mode)"}
                  {user.dispatch.status === "sent" && "Dispatched via " + user.dispatch.channel + " at " + user.dispatch.at}
                  {user.dispatch.status === "held_out" && "Held out as control - not dispatched"}
                </div>
              )}
            </Section>
          )}

          {/* actions */}
          {(user.status === "escalated" || (user.status === "actioned" && !user.outcome)) && (
            <Section title={user.status === "escalated" ? "Human review required" : "Record outcome"}>
              {user.status === "escalated" && !user.resolvedBy && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { onApprove(user); onClose(); }}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      flex: 1,
                      padding: "10px 0",
                      background: C.escalated,
                      color: "#fff",
                      borderRadius: R.md,
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    Approve &amp; act
                  </button>
                  <button
                    onClick={() => { onOverride(user); onClose(); }}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      flex: 1,
                      padding: "10px 0",
                      background: C.surface,
                      color: C.ink,
                      border: `1px solid ${C.line}`,
                      borderRadius: R.md,
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    Override
                  </button>
                </div>
              )}
              {user.status === "escalated" && user.resolvedBy && (
                <div style={{ fontSize: 13, color: C.soft }}>
                  {user.resolvedBy === "approved" ? "Approved - outreach dispatched." : "Overridden - closed without outreach."}
                </div>
              )}
              {user.status === "actioned" && !user.outcome && (
                <>
                  <div style={{ fontSize: 11.5, color: C.soft, marginBottom: 10, lineHeight: 1.4 }}>
                    {user.heldOut
                      ? "This user was held out as a control. Record what happened without an outreach."
                      : "Record what happened after the outreach to help the agent learn."}
                  </div>
                  <div style={{ display: "flex", gap: 7 }}>
                    {(["recovered", "ignored", ...(user.heldOut ? [] : ["converted_anyway"])] as OutcomeKind[]).map(
                      (o) => {
                        const m = OUTCOME_META[o];
                        return (
                          <button
                            key={o}
                            onClick={() => { onOutcome(user, o); onClose(); }}
                            style={{
                              all: "unset",
                              cursor: "pointer",
                              flex: 1,
                              padding: "9px 0",
                              background: m.bg,
                              color: m.color,
                              border: `1px solid ${m.border}`,
                              borderRadius: R.md,
                              fontSize: 11.5,
                              fontWeight: 600,
                              textAlign: "center",
                            }}
                          >
                            {o === "recovered" && user.heldOut ? "Came back" :
                             o === "ignored" && user.heldOut ? "Stayed away" :
                             OUTCOME_LABELS[o]}
                          </button>
                        );
                      }
                    )}
                  </div>
                </>
              )}
            </Section>
          )}

          {/* recorded outcome */}
          {user.outcome && (
            <Section title="Recorded outcome">
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  color: OUTCOME_META[user.outcome].color,
                }}
              >
                {OUTCOME_LABELS[user.outcome]}
                {user.heldOut && (
                  <span style={{ fontWeight: 400, color: C.faint, fontSize: 11.5 }}> · control (uncredited)</span>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
