import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { C, MONO, R } from "../theme";
import type { RunMode, User, NewUserInput, OutcomeKind } from "../types";
import { TopBar } from "../components/TopBar";
import { AddPanel } from "../components/AddPanel";
import { QueueTable } from "../components/queue/QueueTable";
import { UserDrawer } from "../components/UserDrawer";
import { computeSla } from "../lib/insights";

export function QueuePage({
  users,
  phase,
  ranks,
  running,
  mode,
  note,
  showAdd,
  canSimulate,
  inboxCount,
  onToggleMode,
  onToggleAdd,
  onReset,
  onRunShift,
  onSimulate,
  onOpenCommand,
  onAdd,
  onApprove,
  onOverride,
  onOutcome,
}: {
  users: User[];
  phase: string;
  ranks: Record<string, number>;
  running: boolean;
  mode: RunMode;
  note: string | null;
  showAdd: boolean;
  canSimulate: boolean;
  inboxCount: number;
  onToggleMode: (m: RunMode) => void;
  onToggleAdd: () => void;
  onReset: () => void;
  onRunShift: () => void;
  onSimulate: () => void;
  onOpenCommand: () => void;
  onAdd: (d: NewUserInput) => void;
  onApprove: (u: User) => void;
  onOverride: (u: User) => void;
  onOutcome: (u: User, o: OutcomeKind) => void;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // SLA breach summary
  const inboxUsers = users.filter((u) => u.status === "inbox");
  const breached = inboxUsers.filter((u) => computeSla(u).breached);
  const warning = inboxUsers.filter((u) => {
    const s = computeSla(u);
    return !s.breached && s.pctUsed >= 0.7;
  });

  return (
    <>
      <TopBar
        running={running}
        phase={phase}
        inboxCount={inboxCount}
        mode={mode}
        onToggleMode={onToggleMode}
        onToggleAdd={onToggleAdd}
        onReset={onReset}
        onRunShift={onRunShift}
        onSimulate={onSimulate}
        canSimulate={canSimulate}
        onOpenCommand={onOpenCommand}
      />

      {/* mode banner */}
      <div
        style={{
          background: mode === "shadow" ? C.surfaceAlt : C.accentSoft,
          border: `1px solid ${mode === "shadow" ? C.line : "#D4E2FB"}`,
          color: mode === "shadow" ? C.soft : C.accent,
          borderRadius: R.md,
          padding: "9px 13px",
          fontSize: 12.5,
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        {mode === "shadow" ? (
          <>
            <b style={{ color: C.ink }}>Shadow mode (dry-run).</b> Every real decision is made and
            the exact payload it <i>would</i> dispatch is shown - nothing is sent.
          </>
        ) : (
          <>
            <b>Live mode.</b> Actions route through{" "}
            <code style={{ fontFamily: MONO }}>lib/dispatch.ts</code> - a stub, nothing is actually sent.
          </>
        )}
      </div>

      {note && (
        <div
          style={{
            background: C.accentSoft,
            border: `1px solid #D4E2FB`,
            color: C.accent,
            borderRadius: R.md,
            padding: "9px 13px",
            fontSize: 12.5,
            marginBottom: 12,
          }}
        >
          {note}
        </div>
      )}

      {/* SLA alert strip */}
      {(breached.length > 0 || warning.length > 0) && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: breached.length > 0 ? "#FEF2F2" : "#FFFBEB",
            border: `1px solid ${breached.length > 0 ? "#FECACA" : "#FDE68A"}`,
            borderRadius: R.md,
            padding: "8px 12px",
            marginBottom: 12,
            fontSize: 12.5,
            color: breached.length > 0 ? "#B42318" : C.escalated,
          }}
        >
          <AlertTriangle size={13} style={{ flexShrink: 0 }} />
          <span>
            {breached.length > 0 && (
              <b>
                {breached.length} SLA breach{breached.length > 1 ? "es" : ""} -{" "}
              </b>
            )}
            {warning.length > 0 && (
              <>
                {warning.length} user{warning.length > 1 ? "s" : ""} approaching SLA limit
                {breached.length > 0 ? "." : " - run the shift to resolve."}
              </>
            )}
            {breached.length > 0 && warning.length === 0 && "run the shift immediately."}
          </span>
        </div>
      )}

      {showAdd && <AddPanel onAdd={onAdd} onClose={onToggleAdd} />}

      <QueueTable
        users={users}
        phase={phase}
        ranks={ranks}
        onApprove={onApprove}
        onOverride={onOverride}
        onOutcome={onOutcome}
        onViewUser={(u) => setSelectedUser(u)}
      />

      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onApprove={(u) => { onApprove(u); setSelectedUser(null); }}
          onOverride={(u) => { onOverride(u); setSelectedUser(null); }}
          onOutcome={(u, o) => { onOutcome(u, o); setSelectedUser(null); }}
        />
      )}
    </>
  );
}
