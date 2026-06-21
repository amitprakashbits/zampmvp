import { Zap, CheckCircle2 } from "lucide-react";
import { C, MONO } from "../../theme";
import type { OutcomeKind, User } from "../../types";
import { Dot } from "../shared";
import { InboxCard } from "./InboxCard";
import { ProcessingCard } from "./ProcessingCard";
import { DecisionCard } from "./DecisionCard";
import { SkippedCard } from "./SkippedCard";
import { EscalatedCard } from "./EscalatedCard";

export interface LaneDef {
  key: User["status"];
  label: string;
  color: string;
}

const EMPTY: Record<string, string> = {
  inbox: "Queue clear.",
  processing: "Idle.",
  actioned: "No outreach yet.",
  recovered: "Nothing recovered yet.",
  escalated: "Nothing needs you.",
  skipped: "No skips yet.",
};

export function Lane({
  lane,
  items,
  phase,
  onApprove,
  onOverride,
  onOutcome,
}: {
  lane: LaneDef;
  items: User[];
  phase: string;
  onApprove: (u: User) => void;
  onOverride: (u: User) => void;
  onOutcome: (u: User, outcome: OutcomeKind) => void;
}) {
  return (
    <div style={{ flex: "1 1 230px", minWidth: 230, display: "flex", flexDirection: "column", gap: 9 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "6px 10px",
          borderRadius: 99,
          background: `${lane.color}14`,
          border: `1px solid ${lane.color}2E`,
        }}
      >
        <Dot color={lane.color} pulse={lane.key === "processing" && items.length > 0} />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: lane.color,
            fontWeight: 600,
          }}
        >
          {lane.label}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "#fff",
            background: lane.color,
            borderRadius: 99,
            minWidth: 18,
            height: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5px",
            marginLeft: "auto",
          }}
        >
          {items.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.length === 0 && (
          <div style={{ fontSize: 12, color: C.faint, padding: "10px 2px" }}>{EMPTY[lane.key]}</div>
        )}
        {items.map((u) => {
          if (lane.key === "inbox") return <InboxCard key={u.id} u={u} />;
          if (lane.key === "processing") return <ProcessingCard key={u.id} u={u} phase={phase} />;
          if (lane.key === "actioned")
            return (
              <DecisionCard
                key={u.id}
                u={u}
                accent={C.actioned}
                badge="actioned"
                BadgeIcon={Zap}
                onOutcome={onOutcome}
              />
            );
          if (lane.key === "recovered")
            return (
              <DecisionCard
                key={u.id}
                u={u}
                accent={C.recovered}
                badge="recovered"
                BadgeIcon={CheckCircle2}
              />
            );
          if (lane.key === "escalated")
            return <EscalatedCard key={u.id} u={u} onApprove={onApprove} onOverride={onOverride} />;
          if (lane.key === "skipped") return <SkippedCard key={u.id} u={u} />;
          return null;
        })}
      </div>
    </div>
  );
}
