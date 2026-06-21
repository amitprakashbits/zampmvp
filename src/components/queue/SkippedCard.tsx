import { SkipForward } from "lucide-react";
import { C, MONO } from "../../theme";
import type { User } from "../../types";
import { CardShell } from "../shared";

export function SkippedCard({ u }: { u: User }) {
  return (
    <CardShell accent={C.skipped}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{u.name}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.06em",
            color: C.skipped,
            textTransform: "uppercase",
          }}
        >
          <SkipForward size={11} /> no touch
        </span>
      </div>
      <div style={{ fontSize: 12, color: C.soft, marginTop: 6, lineHeight: 1.45 }}>
        {u.result?.reasoning}
      </div>
    </CardShell>
  );
}
