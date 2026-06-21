import { useState, type CSSProperties, type ReactNode } from "react";
import { Phone, Mail, MessageCircle, ChevronDown } from "lucide-react";
import { C, MONO } from "../theme";
import type { Channel } from "../types";
import { money } from "../lib/utils";

export const CHANNEL_ICON = { Call: Phone, WhatsApp: MessageCircle, Email: Mail };

export const Eyebrow = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 10.5,
      letterSpacing: "0.13em",
      textTransform: "uppercase",
      color: C.soft,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Dot = ({ color, pulse }: { color: string; pulse?: boolean }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
    <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
    {pulse && (
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 99,
          background: color,
          animation: "rcv-ping 1.4s ease-out infinite",
        }}
      />
    )}
  </span>
);

export const Chip = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      fontSize: 11,
      color: C.soft,
      background: C.paper,
      border: `1px solid ${C.line}`,
      borderRadius: 6,
      padding: "2px 7px",
      lineHeight: 1.5,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

export function ChannelTag({ channel }: { channel?: Channel | "—" }) {
  if (!channel || channel === "—") return null;
  const Icon = CHANNEL_ICON[channel];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.ink }}
    >
      {Icon && <Icon size={13} strokeWidth={2} />} {channel}
    </span>
  );
}

export function Stat({
  label,
  children,
  accent,
  sub,
}: {
  label: ReactNode;
  children: ReactNode;
  accent?: string;
  sub?: ReactNode;
}) {
  return (
    <div
      style={{
        flex: "1 1 150px",
        minWidth: 150,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: "14px 16px",
      }}
    >
      <Eyebrow style={accent ? { color: accent } : undefined}>{label}</Eyebrow>
      <div style={{ marginTop: 7 }}>{children}</div>
      {sub && (
        <div style={{ fontSize: 11.5, color: C.soft, marginTop: 6, lineHeight: 1.35 }}>{sub}</div>
      )}
    </div>
  );
}

export function CardShell({
  accent,
  children,
  glow,
}: {
  accent: string;
  children: ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className="rcv-card"
      style={{
        position: "relative",
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 13,
        padding: 12,
        animation: "rcv-in 0.28s ease",
        boxShadow: glow
          ? `0 0 0 1px ${accent}40, 0 16px 40px -16px ${accent}99`
          : "0 1px 2px rgba(10,10,10,0.03)",
      }}
    >
      {children}
    </div>
  );
}

export function Name({ name, value }: { name: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{name}</span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: C.soft }}>{money(value)}</span>
    </div>
  );
}

export function DraftToggle({
  message,
  channel,
  accent,
  label = "draft",
}: {
  message?: string;
  channel?: Channel | "—";
  accent: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!message) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: MONO,
          fontSize: 10.5,
          letterSpacing: "0.05em",
          color: accent,
          textTransform: "uppercase",
        }}
      >
        <ChevronDown
          size={12}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}
        />
        {open ? `hide ${label}` : `view ${label}`}
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            padding: "9px 10px",
            fontSize: 12.5,
            color: C.ink,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          <div style={{ marginBottom: 5 }}>
            <ChannelTag channel={channel} />
          </div>
          {message}
        </div>
      )}
    </div>
  );
}
