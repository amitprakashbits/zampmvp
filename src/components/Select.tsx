import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { C, MONO, R, SANS, SHADOW_POP } from "../theme";

export interface Option {
  value: string;
  label: string;
  description?: string;
  hint?: string; // right-aligned meta (e.g. a value)
}

/* A dashboard-grade select: keyboard nav, type-to-filter past ~7 options,
   descriptions, selected check, hover/focus/empty states. Replaces native
   <select> everywhere (native reads as "unfinished internal tool"). */
export function Select({
  value,
  options,
  onChange,
  placeholder = "Select…",
  disabled,
  ariaLabel,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const searchable = options.length > 7;
  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.description?.toLowerCase().includes(query.toLowerCase()),
      )
    : options;
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    if (searchable) setTimeout(() => searchRef.current?.focus(), 10);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, searchable]);

  useEffect(() => {
    if (open) setActive(Math.max(0, filtered.findIndex((o) => o.value === value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active].value);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%", fontFamily: SANS }}>
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKey}
        style={{
          all: "unset",
          boxSizing: "border-box",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.55 : 1,
          background: C.surface,
          border: `1px solid ${open ? C.accent : C.line}`,
          boxShadow: open ? `0 0 0 3px ${C.accentSoft}` : "none",
          borderRadius: R.sm,
          padding: "8px 10px",
          fontSize: 13,
          color: selected ? C.ink : C.faint,
          transition: "border-color .12s, box-shadow .12s",
        }}
      >
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown size={14} color={C.faint} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: R.md,
            boxShadow: SHADOW_POP,
            overflow: "hidden",
            animation: "rcv-pop .12s ease",
          }}
        >
          {searchable && (
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              placeholder="Type to filter…"
              style={{
                all: "unset",
                boxSizing: "border-box",
                width: "100%",
                padding: "9px 11px",
                fontSize: 13,
                color: C.ink,
                fontFamily: SANS,
                borderBottom: `1px solid ${C.lineSoft}`,
              }}
            />
          )}
          <div style={{ maxHeight: 260, overflowY: "auto", padding: 4 }}>
            {filtered.length === 0 && (
              <div style={{ padding: "10px 11px", fontSize: 12.5, color: C.faint }}>No matches</div>
            )}
            {filtered.map((o, i) => {
              const isSel = o.value === value;
              const isActive = i === active;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                  style={{
                    all: "unset",
                    boxSizing: "border-box",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    padding: "8px 9px",
                    borderRadius: R.sm,
                    background: isActive ? C.accentSoft : "transparent",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        color: C.ink,
                        fontWeight: isSel ? 600 : 400,
                        display: "block",
                      }}
                    >
                      {o.label}
                    </span>
                    {o.description && (
                      <span style={{ fontSize: 11.5, color: C.soft, display: "block", marginTop: 1 }}>
                        {o.description}
                      </span>
                    )}
                  </span>
                  {o.hint && (
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>{o.hint}</span>
                  )}
                  {isSel && <Check size={14} color={C.accent} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
