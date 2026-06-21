import { useEffect, useRef, useState } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { C, MONO, R, SANS, SHADOW, SHADOW_POP } from "../theme";
import type { ChatAction, ChatMessage, RunMode } from "../types";
import type { ChatReply } from "../lib/chat";
import { sleep, stamp } from "../lib/utils";

const uid = () => "m-" + Math.random().toString(36).slice(2, 9);

const SUGGESTIONS = [
  "Run the shift",
  "Why did you escalate the big accounts?",
  "What's working best?",
  "Summarize the shift",
];

function LogoMark({ size = 16 }: { size?: number }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: size * 0.18 }}>
      <span style={{ width: size, height: size * 0.16, background: "#fff", borderRadius: 2, transform: "skewX(-18deg)" }} />
      <span style={{ width: size, height: size * 0.16, background: "#fff", borderRadius: 2, transform: "skewX(-18deg)" }} />
    </span>
  );
}

function Typing() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "10px 13px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: C.faint,
            animation: "rcv-blink 1s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ChatPanel({
  mode,
  open,
  onOpenChange,
  respond,
  onAction,
}: {
  mode: RunMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  respond: (message: string, history: ChatMessage[]) => Promise<ChatReply>;
  onAction: (action: ChatAction) => void;
}) {
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "agent",
      ts: stamp(),
      text:
        "Hi - I'm Recover. I'm already set up to work your queue of stalled users. Delegate to me (\"run the shift\", \"simulate outcomes\", \"go live\") or ask me about any call I've made.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", ts: stamp(), text: trimmed };
    const history = messages;
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    const [{ reply, action }] = await Promise.all([
      respond(trimmed, [...history, userMsg]),
      sleep(420), // keep a natural beat even when mock answers instantly
    ]);
    setMessages((m) => [
      ...m,
      { id: uid(), role: "agent", ts: stamp(), text: reply, action: action.type !== "none" },
    ]);
    setTyping(false);
    if (action.type !== "none") onAction(action);
  };

  /* launcher */
  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        style={{
          all: "unset",
          cursor: "pointer",
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 60,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 16px",
          background: C.ink,
          color: "#fff",
          borderRadius: R.pill,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: SHADOW_POP,
        }}
      >
        <MessageSquare size={15} strokeWidth={2} />
        Ask Recover
        <span style={{ marginLeft: 2, fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.55)" }}>⌘K</span>
      </button>
    );
  }

  /* drawer */
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        top: 16,
        width: 396,
        maxWidth: "94vw",
        zIndex: 60,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: R.lg,
        boxShadow: SHADOW_POP,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: SANS,
        animation: "rcv-rise 0.26s ease",
      }}
    >
      <div style={{ height: 2, background: C.accent }} />

      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "13px 15px",
          borderBottom: `1px solid ${C.lineSoft}`,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: C.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LogoMark size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>Recover</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: MONO,
              fontSize: 10.5,
              color: C.soft,
              marginTop: 2,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 99, background: "#3FCB6B" }} />
            online · {mode} mode
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          style={{ all: "unset", cursor: "pointer", color: C.faint, display: "flex", padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 15px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: C.paper,
        }}
      >
        {messages.map((mm) => {
          const isUser = mm.role === "user";
          return (
            <div
              key={mm.id}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "86%",
                background: isUser ? C.actioned : C.surface,
                color: isUser ? "#fff" : C.ink,
                border: isUser ? "none" : `1px solid ${C.line}`,
                borderLeft: mm.action ? `3px solid ${C.brand}` : undefined,
                borderRadius: R.md,
                padding: "10px 13px",
                fontSize: 13.5,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                boxShadow: isUser ? "none" : SHADOW,
              }}
            >
              {mm.action && (
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 9.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.brand,
                    marginBottom: 5,
                  }}
                >
                  ↳ action taken
                </div>
              )}
              {mm.text}
            </div>
          );
        })}
        {typing && (
          <div
            style={{
              alignSelf: "flex-start",
              background: C.surface,
              border: `1px solid ${C.line}`,
              borderRadius: R.md,
            }}
          >
            <Typing />
          </div>
        )}
      </div>

      {/* suggestions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 13px 0" }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={typing}
            style={{
              all: "unset",
              cursor: typing ? "default" : "pointer",
              opacity: typing ? 0.5 : 1,
              fontSize: 11.5,
              color: C.soft,
              background: C.paper,
              border: `1px solid ${C.line}`,
              borderRadius: 99,
              padding: "5px 10px",
              lineHeight: 1.4,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* composer (no <form>) */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: 13 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Delegate or ask…  (Enter to send)"
          style={{
            all: "unset",
            boxSizing: "border-box",
            flex: 1,
            maxHeight: 96,
            overflowY: "auto",
            background: C.surfaceAlt,
            border: `1px solid ${C.line}`,
            borderRadius: R.sm,
            padding: "10px 12px",
            fontSize: 13.5,
            lineHeight: 1.4,
            color: C.ink,
            fontFamily: SANS,
            resize: "none",
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={typing || !input.trim()}
          style={{
            all: "unset",
            cursor: typing || !input.trim() ? "default" : "pointer",
            opacity: typing || !input.trim() ? 0.4 : 1,
            width: 40,
            height: 40,
            borderRadius: R.sm,
            background: C.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}
