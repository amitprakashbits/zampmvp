import { C } from "../../theme";
import type { User } from "../../types";
import { CardShell, Chip, Name } from "../shared";

export function InboxCard({ u }: { u: User }) {
  return (
    <CardShell accent={C.inbox}>
      <Name name={u.name} value={u.value} />
      <div style={{ fontSize: 12, color: C.soft, marginTop: 3 }}>
        {u.dropOff} · {u.idle}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
        {u.signals.map((s, i) => (
          <Chip key={i}>{s}</Chip>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Chip>prefers {u.pref}</Chip>
      </div>
    </CardShell>
  );
}
