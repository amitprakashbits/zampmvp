import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CornerDownLeft } from "lucide-react";
import { C, MONO, R, SANS, SHADOW_POP } from "../theme";

export interface Command {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  hint?: string; // keyboard shortcut or meta
  keywords?: string;
  disabled?: boolean;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const avail = commands.filter((c) => !c.disabled);
    if (!q) return avail;
    return avail.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q),
    );
  }, [query, commands]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  if (!open) return null;

  const run = (c?: Command) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(16,17,21,0.38)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
        animation: "rcv-fade .12s ease",
        fontFamily: SANS,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "92vw",
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: R.lg,
          boxShadow: SHADOW_POP,
          overflow: "hidden",
          animation: "rcv-pop .14s ease",
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(filtered.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(filtered[active]);
            }
          }}
          placeholder="Type a command…  (run shift, simulate, guardrails, export…)"
          style={{
            all: "unset",
            boxSizing: "border-box",
            width: "100%",
            padding: "15px 17px",
            fontSize: 15,
            color: C.ink,
            fontFamily: SANS,
            borderBottom: `1px solid ${C.lineSoft}`,
          }}
        />
        <div ref={listRef} style={{ maxHeight: 340, overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "16px 14px", fontSize: 13, color: C.faint }}>No matching command.</div>
          )}
          {filtered.map((c, i) => {
            const Icon = c.icon;
            const isActive = i === active;
            return (
              <button
                key={c.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
                style={{
                  all: "unset",
                  boxSizing: "border-box",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  cursor: "pointer",
                  padding: "10px 11px",
                  borderRadius: R.sm,
                  background: isActive ? C.accentSoft : "transparent",
                }}
              >
                <Icon size={16} color={isActive ? C.accent : C.soft} strokeWidth={2} />
                <span style={{ flex: 1, fontSize: 13.5, color: C.ink }}>{c.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint, letterSpacing: "0.04em" }}>
                  {c.group}
                </span>
                {c.hint && (
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10.5,
                      color: C.soft,
                      background: C.surfaceAlt,
                      border: `1px solid ${C.line}`,
                      borderRadius: 5,
                      padding: "2px 6px",
                    }}
                  >
                    {c.hint}
                  </span>
                )}
                {isActive && !c.hint && <CornerDownLeft size={13} color={C.faint} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
