import { useCallback, useMemo, useRef, useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { C, LANES, SANS } from "./theme";
import type {
  AgentDecision,
  AuditEntry,
  AuditKind,
  Channel,
  LearningStats,
  NewUserInput,
  OutcomeKind,
  RunMode,
  User,
} from "./types";
import { fresh, seedLearning } from "./lib/seed";
import { API_MODE, getDecision } from "./lib/agent";
import { applyLearning, recordOutcome as foldOutcome } from "./lib/learning";
import { dispatchOutreach } from "./lib/dispatch";
import { money, sleep, stamp, useCountUp } from "./lib/utils";
import { Hero } from "./components/Hero";
import { TopBar } from "./components/TopBar";
import { Scorecard, type Metrics } from "./components/Scorecard";
import { Lane } from "./components/queue/Lane";
import { AddPanel } from "./components/AddPanel";
import { AuditTrail } from "./components/AuditTrail";
import { LearningPanel } from "./components/LearningPanel";

const PROC_STEPS = [
  "Reading signals",
  "Diagnosing root cause",
  "Selecting channel",
  "Drafting outreach",
  "Logging decision",
];

export default function App() {
  const [users, setUsers] = useState<User[]>(fresh);
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [times, setTimes] = useState<number[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [mode, setModeState] = useState<RunMode>("shadow");
  const [learning, setLearning] = useState<LearningStats>(seedLearning);

  // Refs mirror state so the async queue worker reads current values mid-shift.
  const usersRef = useRef(users);
  const setU = useCallback((updater: User[] | ((prev: User[]) => User[])) => {
    usersRef.current = typeof updater === "function" ? updater(usersRef.current) : updater;
    setUsers(usersRef.current);
  }, []);

  const modeRef = useRef(mode);
  const setMode = useCallback((m: RunMode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  const learningRef = useRef(learning);
  const setLearn = useCallback((next: LearningStats) => {
    learningRef.current = next;
    setLearning(next);
  }, []);

  const patch = useCallback(
    (id: string, p: Partial<User>) => {
      setU((us) => us.map((u) => (u.id === id ? { ...u, ...p } : u)));
    },
    [setU],
  );

  const audit = useCallback((who: string, text: string, kind: AuditKind) => {
    setLog((l) => [{ time: stamp(), who, text, kind }, ...l]);
  }, []);

  /* ── process one user end-to-end ──────────────────────────────────── */
  const processOne = useCallback(
    async (user: User) => {
      patch(user.id, { status: "processing" });
      let si = 0;
      setPhase(PROC_STEPS[0]);
      const iv = setInterval(() => {
        si = (si + 1) % PROC_STEPS.length;
        setPhase(PROC_STEPS[si]);
      }, 700);

      const t0 = performance.now();
      let base: AgentDecision | null = null;
      let errored = false;
      try {
        base = await getDecision(user, learningRef.current);
      } catch {
        errored = true;
      }
      clearInterval(iv);
      setTimes((t) => [...t, (performance.now() - t0) / 1000]);

      if (errored || !base) {
        // Fail safe to a human rather than dropping the user.
        const result: AgentDecision = {
          root_cause: "Automated diagnosis unavailable",
          channel: "—",
          action: "ESCALATE",
          reasoning:
            "The agent couldn't reach a confident decision (API or parse error), so it routed this user to a human instead of dropping them.",
          draft_message: "",
        };
        patch(user.id, { status: "escalated", result });
        audit(user.name, "diagnosis failed → escalated to a human (fail-safe)", "error");
        await sleep(450);
        return;
      }

      // Learning layer may shift the channel before anything is dispatched.
      const result = applyLearning(base, user, learningRef.current);
      audit(user.name, `diagnosed — ${result.root_cause}`, "diagnosed");
      if (result.learning_note) audit(user.name, result.learning_note, "learning");

      if (result.action === "SKIP") {
        patch(user.id, { status: "skipped", result });
        audit(user.name, "skipped — already converting, declined to spend an outreach", "skipped");
        await sleep(450);
        return;
      }
      if (result.action === "ESCALATE") {
        patch(user.id, { status: "escalated", result });
        audit(user.name, "escalated to a human for review", "escalated");
        await sleep(450);
        return;
      }

      // ACT — funnel through the single dispatch seam (shadow = would-send).
      const dispatch = await dispatchOutreach(
        { channel: result.channel, message: result.draft_message },
        modeRef.current,
      );
      patch(user.id, { status: "actioned", result, dispatch });
      audit(
        user.name,
        modeRef.current === "shadow"
          ? `would send via ${result.channel} — dry-run, not dispatched`
          : `dispatched via ${result.channel} (live seam, stubbed)`,
        "actioned",
      );
      await sleep(500);
    },
    [patch, audit],
  );

  const runShift = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setNote(null);
    for (;;) {
      const next = usersRef.current.find((u) => u.status === "inbox");
      if (!next) break;
      await processOne(next);
    }
    setRunning(false);
    setPhase("");
  }, [running, processOne]);

  /* ── outcome feedback loop ────────────────────────────────────────── */
  const applyOutcome = useCallback(
    (user: User, outcome: OutcomeKind) => {
      const result = user.result;
      if (!result) return;
      const channel = result.channel as Channel | "—";
      const reason = user.dropOff;

      // 1) fold into learning (drives future channel picks)
      setLearn(foldOutcome(learningRef.current, reason, channel, outcome));

      // 2) move the user / record the outcome
      if (outcome === "recovered") {
        patch(user.id, { status: "recovered", outcome });
        audit(
          user.name,
          `recovered — re-engaged after ${channel} outreach (+${money(user.value)})`,
          "outcome",
        );
      } else if (outcome === "ignored") {
        patch(user.id, { outcome });
        audit(user.name, `ignored — no response to ${channel} outreach`, "outcome");
      } else {
        patch(user.id, { outcome });
        audit(
          user.name,
          `converted on their own — ${channel} touch didn't drive it (uncredited)`,
          "outcome",
        );
      }
      audit(user.name, `learning updated for '${reason}' / ${channel}`, "learning");
    },
    [patch, audit, setLearn],
  );

  const simulateOutcomes = useCallback(() => {
    const pending = usersRef.current.filter((u) => u.status === "actioned" && !u.outcome);
    if (!pending.length) {
      setNote("No actioned users are awaiting an outcome. Run a shift first.");
      return;
    }
    for (const u of pending) {
      const r = Math.random();
      const p = u.propensity ?? 0.5;
      const outcome: OutcomeKind =
        r < p ? "recovered" : r < p + 0.15 ? "converted_anyway" : "ignored";
      applyOutcome(u, outcome);
    }
    setNote(
      `Simulated outcomes for ${pending.length} actioned user${
        pending.length === 1 ? "" : "s"
      } — the agent's learning has updated.`,
    );
  }, [applyOutcome]);

  /* ── human review ─────────────────────────────────────────────────── */
  const approve = useCallback(
    async (u: User) => {
      const dispatch = await dispatchOutreach(
        { channel: u.result?.channel ?? "—", message: u.result?.draft_message ?? "" },
        modeRef.current,
      );
      patch(u.id, { status: "actioned", resolvedBy: "approved", dispatch });
      audit(
        u.name,
        modeRef.current === "shadow"
          ? `human approved — would send via ${u.result?.channel ?? "chosen channel"} (shadow)`
          : `human approved — dispatched via ${u.result?.channel ?? "chosen channel"}`,
        "human",
      );
    },
    [patch, audit],
  );

  const override = useCallback(
    (u: User) => {
      patch(u.id, { status: "escalated", resolvedBy: "overridden" });
      audit(u.name, "human overrode the escalation — closed without outreach", "human");
    },
    [patch, audit],
  );

  const addUser = useCallback(
    (data: NewUserInput) => {
      const u: User = {
        id: "u-" + Math.random().toString(36).slice(2, 8),
        status: "inbox",
        result: null,
        resolvedBy: null,
        dispatch: null,
        outcome: null,
        propensity: 0.55,
        ...data,
      };
      setU((us) => [...us, u]);
      setShowAdd(false);
      setNote(`${u.name} added to the inbox — run the shift to let the agent take it.`);
    },
    [setU],
  );

  const reset = useCallback(() => {
    setU(fresh());
    setLearn(seedLearning());
    setLog([]);
    setTimes([]);
    setPhase("");
    setRunning(false);
    setNote(null);
    setShowAdd(false);
  }, [setU, setLearn]);

  /* ── metrics ──────────────────────────────────────────────────────── */
  const m: Metrics = useMemo(() => {
    const by = (s: User["status"]) => users.filter((u) => u.status === s).length;
    const actioned = by("actioned");
    const recovered = by("recovered");
    const escalated = by("escalated");
    const skipped = by("skipped");
    const acted = actioned + recovered; // recovered users were acted on
    const decided = acted + escalated + skipped;
    const decisionBase = acted + escalated;
    const autoPct = decisionBase ? Math.round((acted / decisionBase) * 100) : 0;
    const escPct = decisionBase ? 100 - autoPct : 0;
    const revenue = users
      .filter((u) => u.status === "recovered")
      .reduce((s, u) => s + u.value, 0);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return {
      acted,
      recovered,
      escalated,
      skipped,
      decided,
      total: users.length,
      autoPct,
      escPct,
      revenue,
      avg,
    };
  }, [users, times]);

  const revDisplay = useCountUp(m.revenue);

  const lanes = useMemo(() => {
    const map: Record<string, User[]> = {};
    LANES.forEach((l) => (map[l.key] = []));
    users.forEach((u) => {
      if (map[u.status]) map[u.status].push(u);
    });
    return map;
  }, [users]);

  const inboxCount = lanes.inbox.length;
  const canSimulate = users.some((u) => u.status === "actioned" && !u.outcome);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        fontFamily: SANS,
        color: C.ink,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        @keyframes rcv-ping { 0%{transform:scale(1);opacity:.55} 70%,100%{transform:scale(2.6);opacity:0} }
        @keyframes rcv-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        @keyframes rcv-blink { 0%,50%{opacity:1} 50.01%,100%{opacity:0} }
        @media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }
        ::-webkit-scrollbar{height:8px;width:8px} ::-webkit-scrollbar-thumb{background:${C.line};border-radius:8px}
        input::placeholder{color:${C.faint}}
      `}</style>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 22px 56px" }}>
        <Hero apiMode={API_MODE} />

        <TopBar
          running={running}
          phase={phase}
          inboxCount={inboxCount}
          mode={mode}
          onToggleMode={setMode}
          onToggleAdd={() => setShowAdd((s) => !s)}
          onReset={reset}
          onRunShift={runShift}
          onSimulate={simulateOutcomes}
          canSimulate={canSimulate}
        />

        {/* mode banner — frames shadow mode as a deliberate dry-run */}
        <div
          style={{
            background: mode === "shadow" ? "#F3EEFE" : "#EFF4FE",
            border: `1px solid ${mode === "shadow" ? "#E2D6FB" : "#D7E3FC"}`,
            color: mode === "shadow" ? C.brand : C.actioned,
            borderRadius: 9,
            padding: "9px 13px",
            fontSize: 12.5,
            marginBottom: 14,
            lineHeight: 1.45,
          }}
        >
          {mode === "shadow" ? (
            <>
              <b>Shadow mode (dry-run).</b> The agent makes every real decision and shows the exact
              payload it <i>would</i> dispatch — but nothing is sent. This is the safe rollout
              posture.
            </>
          ) : (
            <>
              <b>Live mode.</b> Actions route through the real dispatch seam in{" "}
              <code style={{ fontFamily: "monospace" }}>lib/dispatch.ts</code> — which is a clearly
              marked stub (TODO: Twilio / WhatsApp / email). It still does <b>not</b> send anything.
            </>
          )}
        </div>

        {note && (
          <div
            style={{
              background: "#F3EEFE",
              border: `1px solid #E2D6FB`,
              color: C.brand,
              borderRadius: 9,
              padding: "9px 13px",
              fontSize: 12.5,
              marginBottom: 14,
            }}
          >
            {note}
          </div>
        )}

        <Scorecard m={m} revDisplay={revDisplay} />

        {showAdd && <AddPanel onAdd={addUser} onClose={() => setShowAdd(false)} />}

        {/* queue board */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 20,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <InboxIcon size={15} color={C.soft} />
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 10.5,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: C.soft,
              }}
            >
              Queue · inbox → processing → outcome lanes
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
            {LANES.map((lane) => (
              <Lane
                key={lane.key}
                lane={lane}
                items={lanes[lane.key]}
                phase={phase}
                onApprove={approve}
                onOverride={override}
                onOutcome={applyOutcome}
              />
            ))}
          </div>
        </div>

        {/* learning + audit */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 360px", minWidth: 320 }}>
            <LearningPanel learning={learning} />
          </div>
          <div style={{ flex: "1 1 360px", minWidth: 320 }}>
            <AuditTrail log={log} />
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 11.5,
            color: C.faint,
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.04em",
          }}
        >
          {API_MODE === "live" ? "Reasoning runs on claude-sonnet-4-6" : "Reasoning runs on built-in mock logic"} · the
          agent decides ACT / ESCALATE / SKIP per user, learns from outcomes, on its own
        </div>
      </div>
    </div>
  );
}
