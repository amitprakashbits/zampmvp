import { useLayoutEffect, useRef, useState } from "react";
import { LayoutDashboard, Inbox, BrainCircuit, BookOpen, ShieldCheck, ScrollText, type LucideIcon } from "lucide-react";
import { C, MONO } from "../theme";

export type Page = "dashboard" | "queue" | "intelligence" | "learning" | "guardrails" | "audit";

const TABS: { id: Page; label: string; Icon: LucideIcon }[] = [
  { id: "dashboard",    label: "Dashboard",    Icon: LayoutDashboard },
  { id: "queue",        label: "Queue",        Icon: Inbox },
  { id: "intelligence", label: "Intelligence", Icon: BrainCircuit },
  { id: "learning",     label: "Learning",     Icon: BookOpen },
  { id: "guardrails",   label: "Guardrails",   Icon: ShieldCheck },
  { id: "audit",        label: "Audit",        Icon: ScrollText },
];

export function Nav({
  page,
  setPage,
  badges = {},
}: {
  page: Page;
  setPage: (p: Page) => void;
  badges?: Partial<Record<Page, number | undefined>>;
}) {
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Map<Page, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const el = tabRefs.current.get(page);
    const nav = navRef.current;
    if (el && nav) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    }
  }, [page]);

  return (
    <nav
      ref={navRef}
      style={{
        position: "relative",
        display: "flex",
        gap: 0,
        borderBottom: `1px solid ${C.line}`,
        marginBottom: 20,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = page === id;
        const badge = badges[id];
        return (
          <button
            key={id}
            ref={(el) => { if (el) tabRefs.current.set(id, el); else tabRefs.current.delete(id); }}
            onClick={() => setPage(id)}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              fontFamily: MONO,
              fontSize: 11.5,
              fontWeight: active ? 600 : 400,
              color: active ? C.ink : C.soft,
              /* no borderBottom here - handled by the sliding indicator */
              marginBottom: -1,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
              transition: "color .15s ease",
              borderBottom: "2px solid transparent",
            }}
          >
            <Icon
              size={13}
              color={active ? C.ink : C.faint}
              style={{ transition: "color .15s ease", flexShrink: 0 }}
            />
            {label}
            {badge != null && badge > 0 && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "#fff",
                  background: C.accent,
                  borderRadius: 999,
                  padding: "1px 5px",
                  lineHeight: 1.5,
                  transition: "background .2s ease",
                }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}

      {/* sliding underline indicator */}
      {indicator.ready && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: indicator.left,
            width: indicator.width,
            height: 2,
            background: C.ink,
            borderRadius: "2px 2px 0 0",
            transition: "left .22s cubic-bezier(.22,1,.36,1), width .18s cubic-bezier(.22,1,.36,1)",
            pointerEvents: "none",
          }}
        />
      )}
    </nav>
  );
}
