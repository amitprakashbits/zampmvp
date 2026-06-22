import { useState } from "react";
import {
  ChevronDown,
  Phone,
  MessageCircle,
  Mail,
  Zap,
  CheckCircle2,
  Flag,
  SkipForward,
  ShieldCheck,
  Loader2,
  Search,
  ExternalLink,
  Download,
} from "lucide-react";
import { C, MONO, R, SHADOW } from "../../theme";
import type { OutcomeKind, User } from "../../types";
import { money } from "../../lib/utils";
import { DraftToggle, Eyebrow } from "../shared";
import { computeSla, urgencyScore, recoveryProbability, type SlaStatus } from "../../lib/insights";

function exportCsv(users: User[]) {
  const headers = ["Name", "Value", "Status", "Drop-off reason", "Idle", "Preferred channel", "Recovery prob %", "Urgency score", "Agent action", "Confidence", "Outcome"];
  const rows = users.map((u) => [
    u.name,
    u.value,
    u.status,
    `"${u.dropOff}"`,
    u.idle,
    u.pref,
    recoveryProbability(u),
    urgencyScore(u),
    u.result?.action ?? "",
    u.result?.confidence != null ? u.result.confidence.toFixed(2) : "",
    u.outcome ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `recover-queue-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function SlaBadge({ sla }: { sla: SlaStatus }) {
  const isBreached = sla.breached;
  const isWarning = !isBreached && sla.pctUsed >= 0.70;
  const color = isBreached ? "#B42318" : isWarning ? C.escalated : C.faint;
  const bg    = isBreached ? "#FEF2F2" : isWarning ? "#FFFBEB" : C.surfaceAlt;
  const bdr   = isBreached ? "#FECACA" : isWarning ? "#FDE68A" : C.line;
  const label = isBreached
    ? "SLA BREACH"
    : sla.remainingHours < 1
      ? `${sla.slaHours}h SLA · ${Math.round(sla.remainingHours * 60)}m left`
      : `${sla.slaHours}h SLA · ${Math.round(sla.remainingHours)}h left`;
  return (
    <span
      className={isBreached ? "rcv-sla-breach" : undefined}
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.03em",
        color,
        background: bg,
        border: `1px solid ${bdr}`,
        borderRadius: R.pill,
        padding: "2px 6px",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

/* ── channel ── */
const CH_ICON = { Call: Phone, WhatsApp: MessageCircle, Email: Mail };

function ChannelBadge({ channel }: { channel?: string | null }) {
  if (!channel || channel === "-") return <span style={{ color: C.faint, fontFamily: MONO, fontSize: 11 }}>-</span>;
  const Icon = CH_ICON[channel as keyof typeof CH_ICON];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.ink }}>
      {Icon && <Icon size={12} strokeWidth={2} />}
      {channel}
    </span>
  );
}

/* ── status ── */
const STATUS_META: Record<
  User["status"],
  { label: string; color: string; bg: string; border: string; Icon: typeof Flag }
> = {
  inbox: { label: "Inbox", color: C.inbox, bg: "#F1F5F9", border: "#CBD5E1", Icon: Flag },
  processing: { label: "Processing", color: C.processing, bg: C.accentSoft, border: "#BFDBFE", Icon: Loader2 },
  actioned: { label: "Actioned", color: C.actioned, bg: C.accentSoft, border: "#BFDBFE", Icon: Zap },
  recovered: { label: "Recovered", color: C.recovered, bg: "#F0FDF4", border: "#86EFAC", Icon: CheckCircle2 },
  escalated: { label: "Human review", color: C.escalated, bg: "#FFFBEB", border: "#FDE68A", Icon: Flag },
  skipped: { label: "Skipped", color: C.skipped, bg: C.surfaceAlt, border: C.line, Icon: SkipForward },
};

function StatusBadge({ status }: { status: User["status"] }) {
  const m = STATUS_META[status];
  const Icon = m.Icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: m.color,
        background: m.bg,
        border: `1px solid ${m.border}`,
        borderRadius: R.pill,
        padding: "3px 7px",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={10} strokeWidth={2.2} />
      {m.label}
    </span>
  );
}

/* ── confidence micro-bar ── */
function ConfBar({ value }: { value?: number }) {
  if (value == null || !Number.isFinite(value)) return <span style={{ color: C.faint, fontFamily: MONO, fontSize: 11 }}>-</span>;
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? C.recovered : value >= 0.55 ? C.escalated : "#B42318";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 32,
          height: 4,
          borderRadius: 3,
          background: C.lineSoft,
          position: "relative",
          overflow: "hidden",
          display: "inline-block",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
          }}
        />
      </span>
      <span style={{ fontFamily: MONO, fontSize: 11, color }}>{value.toFixed(2)}</span>
    </span>
  );
}

/* ── outcome recording ── */
const OUTCOME_LABELS: Record<OutcomeKind, string> = {
  recovered: "Recovered",
  ignored: "Ignored",
  converted_anyway: "Converted anyway",
};
const OUTCOME_COLORS: Record<OutcomeKind, string> = {
  recovered: C.recovered,
  ignored: C.skipped,
  converted_anyway: C.soft,
};

/* ── lane summary strip ── */
function LaneStrip({ users }: { users: User[] }) {
  const counts = {
    inbox: users.filter((u) => u.status === "inbox").length,
    processing: users.filter((u) => u.status === "processing").length,
    actioned: users.filter((u) => u.status === "actioned").length,
    recovered: users.filter((u) => u.status === "recovered").length,
    escalated: users.filter((u) => u.status === "escalated").length,
    skipped: users.filter((u) => u.status === "skipped").length,
  };
  const order: Array<User["status"]> = ["inbox", "processing", "actioned", "recovered", "escalated", "skipped"];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
      {order.map((s) => {
        const m = STATUS_META[s];
        const n = counts[s];
        return (
          <span
            key={s}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: MONO,
              fontSize: 10.5,
              color: n > 0 ? m.color : C.faint,
              background: n > 0 ? m.bg : C.surfaceAlt,
              border: `1px solid ${n > 0 ? m.border : C.line}`,
              borderRadius: R.pill,
              padding: "4px 9px",
              opacity: n > 0 ? 1 : 0.55,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: n > 0 ? m.color : C.line,
                flexShrink: 0,
              }}
            />
            {m.label}
            <span
              style={{
                fontWeight: 700,
                background: n > 0 ? m.color : C.faint,
                color: "#fff",
                borderRadius: 99,
                minWidth: 16,
                height: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                fontSize: 9.5,
              }}
            >
              {n}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* ── expanded row detail ── */
function ExpandedDetail({
  u,
  onApprove,
  onOverride,
  onOutcome,
}: {
  u: User;
  onApprove: (u: User) => void;
  onOverride: (u: User) => void;
  onOutcome: (u: User, o: OutcomeKind) => void;
}) {
  const r = u.result;
  return (
    <div
      style={{
        padding: "12px 16px 14px 40px",
        background: C.surfaceAlt,
        borderTop: `1px solid ${C.lineSoft}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* signals */}
      {u.signals.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {u.signals.map((s, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                color: C.soft,
                background: C.surface,
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                padding: "2px 7px",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* root cause + reasoning */}
      {r && (
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
            {r.root_cause}
          </span>
          <span style={{ fontSize: 12, color: C.soft }}>
            {" - "}{r.reasoning}
          </span>
        </div>
      )}

      {/* guardrail */}
      {r?.guardrail && (
        <div
          style={{
            display: "flex",
            gap: 6,
            fontSize: 11.5,
            color: C.escalated,
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 7,
            padding: "6px 9px",
            lineHeight: 1.4,
          }}
        >
          <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <b>Guardrail - </b>{r.guardrail}
          </span>
        </div>
      )}

      {/* learning note */}
      {r?.learning_note && (
        <div
          style={{
            fontSize: 11.5,
            color: C.accent,
            background: C.accentSoft,
            border: "1px solid #D4E2FB",
            borderRadius: 7,
            padding: "6px 9px",
            lineHeight: 1.45,
          }}
        >
          {r.learning_note}
        </div>
      )}

      {/* draft */}
      {r?.draft_message && (
        <DraftToggle
          message={r.draft_message}
          channel={r.channel}
          accent={STATUS_META[u.status]?.color ?? C.accent}
          label={u.dispatch?.mode === "shadow" ? "payload" : "draft"}
        />
      )}

      {/* escalation actions */}
      {u.status === "escalated" && !u.resolvedBy && (
        <div style={{ display: "flex", gap: 7 }}>
          <button
            onClick={() => onApprove(u)}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "7px 18px",
              background: C.escalated,
              color: "#fff",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Approve &amp; act
          </button>
          <button
            onClick={() => onOverride(u)}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "7px 18px",
              background: C.surface,
              color: C.ink,
              border: `1px solid ${C.line}`,
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Override
          </button>
        </div>
      )}
      {u.status === "escalated" && u.resolvedBy && (
        <div style={{ fontSize: 12, color: C.soft }}>
          {u.resolvedBy === "approved"
            ? u.dispatch?.mode === "shadow" ? "Human approved - would send (shadow)." : "Human approved - outreach dispatched."
            : "Human overrode - closed without outreach."}
        </div>
      )}

      {/* outcome buttons (actioned, no outcome yet) */}
      {(u.status === "actioned" || u.status === "recovered") && !u.outcome && onOutcome && (
        <div>
          <div
            style={{
              fontSize: 10.5,
              color: C.faint,
              marginBottom: 6,
              fontFamily: MONO,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {u.heldOut ? "Record control outcome → lift" : "Record outcome → agent learns"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["recovered", "ignored", ...(u.heldOut ? [] : ["converted_anyway"])] as OutcomeKind[]).map(
              (o) => (
                <button
                  key={o}
                  onClick={() => onOutcome(u, o)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    padding: "6px 14px",
                    background: C.surface,
                    color: OUTCOME_COLORS[o],
                    border: `1px solid ${C.line}`,
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {o === "recovered" && u.heldOut ? "Came back" : o === "ignored" && u.heldOut ? "Stayed away" : OUTCOME_LABELS[o]}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* recorded outcome */}
      {u.outcome && (
        <div style={{ fontSize: 12, fontWeight: 600, color: OUTCOME_COLORS[u.outcome] }}>
          Outcome: {OUTCOME_LABELS[u.outcome]}
          {u.heldOut && <span style={{ color: C.faint, fontWeight: 400 }}> · control (uncredited)</span>}
        </div>
      )}
    </div>
  );
}

/* ── main table ── */
const STATUS_ORDER: User["status"][] = [
  "processing", "inbox", "escalated", "actioned", "recovered", "skipped",
];

type FilterKind = "all" | "inbox" | "escalated" | "needs-outcome";

const FILTER_OPTS: { id: FilterKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "inbox", label: "Inbox" },
  { id: "escalated", label: "Escalated" },
  { id: "needs-outcome", label: "Needs outcome" },
];

export function QueueTable({
  users,
  phase,
  ranks,
  onApprove,
  onOverride,
  onOutcome,
  onViewUser,
}: {
  users: User[];
  phase: string;
  ranks: Record<string, number>;
  onApprove: (u: User) => void;
  onOverride: (u: User) => void;
  onOutcome: (u: User, o: OutcomeKind) => void;
  onViewUser?: (u: User) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");

  const sorted = [...users].sort((a, b) => {
    const oi = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (oi !== 0) return oi;
    return b.value - a.value;
  });

  const filtered = sorted.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "inbox") return u.status === "inbox";
    if (filter === "escalated") return u.status === "escalated";
    if (filter === "needs-outcome") return (u.status === "actioned" || u.status === "recovered") && !u.outcome;
    return true;
  });

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: R.lg,
        padding: 18,
        marginBottom: 14,
        boxShadow: SHADOW,
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Eyebrow>Queue · {users.length} users</Eyebrow>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, color: C.faint }}>
          click row to expand · ⬡ to open drawer
        </span>
        <button
          onClick={() => exportCsv(users)}
          title="Export queue as CSV"
          style={{
            all: "unset",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: MONO,
            fontSize: 10.5,
            color: C.soft,
            background: C.surfaceAlt,
            border: `1px solid ${C.line}`,
            borderRadius: R.md,
            padding: "5px 10px",
            transition: "background .12s, border-color .12s",
          }}
        >
          <Download size={11} />
          Export CSV
        </button>
      </div>

      {/* search + filter row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div
          style={{
            position: "relative",
            flex: "1 1 180px",
            maxWidth: 280,
          }}
        >
          <Search
            size={13}
            color={C.faint}
            style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 28px",
              fontSize: 12,
              fontFamily: MONO,
              border: `1px solid ${C.line}`,
              borderRadius: R.md,
              background: C.surfaceAlt,
              color: C.ink,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {FILTER_OPTS.map(({ id, label }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  fontFamily: MONO,
                  fontSize: 10.5,
                  letterSpacing: "0.02em",
                  padding: "5px 10px",
                  borderRadius: R.pill,
                  border: `1px solid ${active ? C.accent : C.line}`,
                  background: active ? C.accentSoft : C.surfaceAlt,
                  color: active ? C.accent : C.soft,
                  fontWeight: active ? 600 : 400,
                  transition: "all .12s",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
                {id === "needs-outcome" && (() => {
                  const n = users.filter((u) => (u.status === "actioned" || u.status === "recovered") && !u.outcome).length;
                  return n > 0 ? (
                    <span
                      style={{
                        marginLeft: 4,
                        background: active ? C.accent : C.faint,
                        color: "#fff",
                        borderRadius: 99,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "0 4px",
                        lineHeight: "14px",
                        display: "inline-block",
                      }}
                    >
                      {n}
                    </span>
                  ) : null;
                })()}
              </button>
            );
          })}
        </div>
        {(search || filter !== "all") && (
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint }}>
            {filtered.length} of {users.length}
          </span>
        )}
      </div>

      <LaneStrip users={users} />

      {/* table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.line}` }}>
              {["#", "Name", "Drop-off", "Channel", "Status", "Conf", "Outcome"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h === "Name" || h === "Drop-off" ? "left" : "center",
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: C.faint,
                    padding: "0 10px 9px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody key={`${filter}-${search}`}>
            {filtered.map((u, i) => {
              const isExpanded = expanded === u.id;
              const rank = ranks[u.id];
              const isProcessing = u.status === "processing";
              const accentColor = STATUS_META[u.status]?.color ?? C.soft;
              const urgency = urgencyScore(u);
              const recProb = recoveryProbability(u);
              const urgencyColor = urgency >= 70 ? "#B42318" : urgency >= 40 ? C.escalated : "transparent";
              const staggerDelay = `${Math.min(i * 0.04, 0.32)}s`;

              return (
                <>
                  <tr
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    style={{
                      cursor: "pointer",
                      borderBottom: isExpanded ? "none" : `1px solid ${C.lineSoft}`,
                      background: isExpanded ? C.surfaceAlt : "transparent",
                      transition: "background .12s",
                      borderLeft: `3px solid ${urgencyColor}`,
                      animation: `rcv-row-in .22s cubic-bezier(.22,1,.36,1) ${staggerDelay} both`,
                    }}
                    className="rcv-queue-row"
                  >
                    {/* rank / index */}
                    <td
                      style={{
                        padding: "11px 10px",
                        textAlign: "center",
                        fontFamily: MONO,
                        fontSize: 11,
                        color: rank === 1 ? C.accent : C.faint,
                        fontWeight: rank === 1 ? 700 : 400,
                        width: 32,
                      }}
                    >
                      {rank != null ? `#${rank}` : `${i + 1}`}
                    </td>

                    {/* name + value + recovery prob */}
                    <td style={{ padding: "11px 10px", minWidth: 150 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{u.name}</span>
                        {onViewUser && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewUser(u); }}
                            title="View full profile"
                            style={{
                              all: "unset",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 18,
                              height: 18,
                              borderRadius: 5,
                              border: `1px solid ${C.line}`,
                              background: C.surfaceAlt,
                              color: C.faint,
                              flexShrink: 0,
                              transition: "background .12s, border-color .12s",
                            }}
                          >
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: C.soft, marginTop: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>{money(u.value)}</span>
                        {u.heldOut && <span style={{ color: C.faint }}>· control</span>}
                        {u.status === "inbox" && recProb > 0 && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 9.5,
                              fontFamily: MONO,
                              color: recProb >= 60 ? C.recovered : recProb >= 40 ? C.escalated : C.faint,
                              background: recProb >= 60 ? "#F0FDF4" : recProb >= 40 ? "#FFFBEB" : C.surfaceAlt,
                              border: `1px solid ${recProb >= 60 ? "#86EFAC" : recProb >= 40 ? "#FDE68A" : C.line}`,
                              borderRadius: 999,
                              padding: "1px 5px",
                            }}
                          >
                            {recProb}% recov.
                          </span>
                        )}
                      </div>
                    </td>

                    {/* drop-off */}
                    <td style={{ padding: "11px 10px", minWidth: 160 }}>
                      <div style={{ fontSize: 12, color: C.soft }}>{u.dropOff}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: C.faint }}>{u.idle}</span>
                        {u.status === "inbox" && <SlaBadge sla={computeSla(u)} />}
                      </div>
                    </td>

                    {/* channel */}
                    <td style={{ padding: "11px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {isProcessing ? (
                        <span style={{ fontSize: 11, color: C.processing, fontFamily: MONO }}>
                          {phase || "working…"}
                        </span>
                      ) : u.result?.base_channel && u.result.base_channel !== u.result.channel ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                          <span style={{ color: C.faint, textDecoration: "line-through", fontFamily: MONO, fontSize: 10 }}>
                            {u.result.base_channel}
                          </span>
                          <span style={{ color: C.faint }}>→</span>
                          <ChannelBadge channel={u.result?.channel} />
                        </span>
                      ) : (
                        <ChannelBadge channel={u.result?.channel} />
                      )}
                    </td>

                    {/* status */}
                    <td style={{ padding: "11px 10px", textAlign: "center" }}>
                      <StatusBadge status={u.status} />
                      {isProcessing && (
                        <div style={{ display: "flex", gap: 2, marginTop: 5, justifyContent: "center" }}>
                          {[0, 1, 2, 3, 4].map((idx) => {
                            const steps = ["Reading signals", "Diagnosing root cause", "Selecting channel", "Drafting outreach", "Logging decision"];
                            const active = steps.indexOf(phase) >= idx;
                            return (
                              <div
                                key={idx}
                                style={{
                                  width: 14,
                                  height: 3,
                                  borderRadius: 2,
                                  background: active ? C.processing : C.lineSoft,
                                  transition: "background .3s",
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* confidence */}
                    <td style={{ padding: "11px 10px", textAlign: "center" }}>
                      <ConfBar value={u.result?.confidence} />
                    </td>

                    {/* outcome */}
                    <td style={{ padding: "11px 10px", textAlign: "center" }}>
                      {u.outcome ? (
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 10,
                            letterSpacing: "0.05em",
                            color: OUTCOME_COLORS[u.outcome],
                          }}
                        >
                          {OUTCOME_LABELS[u.outcome]}
                        </span>
                      ) : u.status === "actioned" ? (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint }}>pending</span>
                      ) : (
                        <span style={{ color: C.faint, fontFamily: MONO, fontSize: 11 }}>-</span>
                      )}
                    </td>

                    {/* expand chevron */}
                    <td style={{ padding: "11px 10px", width: 24, textAlign: "center" }}>
                      <ChevronDown
                        size={14}
                        color={C.faint}
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "none",
                          transition: "transform .18s ease",
                        }}
                      />
                    </td>
                  </tr>

                  {/* expanded detail row */}
                  {isExpanded && (
                    <tr
                      key={`${u.id}-detail`}
                      style={{ borderBottom: `1px solid ${C.lineSoft}` }}
                    >
                      <td
                        colSpan={8}
                        style={{ padding: 0 }}
                      >
                        <div
                          style={{
                            borderLeft: `3px solid ${accentColor}`,
                            marginLeft: 10,
                          }}
                        >
                          <ExpandedDetail
                            u={u}
                            onApprove={onApprove}
                            onOverride={onOverride}
                            onOutcome={onOutcome}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: C.faint }}>
          Queue is empty. Add users or reset to reload the seed data.
        </div>
      )}
      {users.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: C.faint }}>
          No users match the current filter.{" "}
          <button
            onClick={() => { setSearch(""); setFilter("all"); }}
            style={{ all: "unset", cursor: "pointer", color: C.accent, textDecoration: "underline", fontSize: 13 }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
