import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Inbox as InboxIcon,
  Zap,
  Beaker,
  Plus,
  RotateCcw,
  Download,
  MessageSquare,
  Eye,
  Compass,
} from "lucide-react";
import { C, LANES, MONO, R, SANS, SHADOW } from "./theme";
import type {
  AgentDecision,
  AuditEntry,
  AuditKind,
  ChatAction,
  ChatMessage,
  Channel,
  LearningStats,
  NewUserInput,
  OutcomeKind,
  Policy,
  RunMode,
  User,
} from "./types";
import { fresh, seedLearning } from "./lib/seed";
import { API_MODE, getDecision } from "./lib/agent";
import { applyLearning, recordOutcome as foldOutcome } from "./lib/learning";
import { applyGuardrails, DEFAULT_POLICY } from "./lib/guardrails";
import { computeLift, nextInQueue, triageRank, totalCostPerHour, computeDebrief } from "./lib/insights";
import type { ShiftDebrief as ShiftDebriefData } from "./lib/insights";
import { dispatchOutreach } from "./lib/dispatch";
import { money, sleep, stamp, useCountUp } from "./lib/utils";
import { Hero } from "./components/Hero";
import { TopBar } from "./components/TopBar";
import { Scorecard, type Metrics } from "./components/Scorecard";
import { Lane } from "./components/queue/Lane";
import { AddPanel } from "./components/AddPanel";
import { AuditTrail } from "./components/AuditTrail";
import { LearningPanel } from "./components/LearningPanel";
import { GuardrailsPanel } from "./components/GuardrailsPanel";
import { ChatPanel } from "./components/ChatPanel";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { Onboarding, Checklist, type ChecklistState } from "./components/Onboarding";
import { BootSkeleton } from "./components/Skeleton";
import { respondToChat, type ChatContext } from "./lib/chat";
import { ShiftDebrief } from "./components/ShiftDebrief";
import { ChannelMatrix } from "./components/ChannelMatrix";
import { DEFAULT_COMPLIANCE_POLICY, type CompliancePolicy } from "./lib/compliance";

const PROC_STEPS = [
  "Reading signals",
  "Diagnosing root cause",
  "Selecting channel",
  "Drafting outreach",
  "Logging decision",
];

/** How much an outreach lifts comeback odds for a contacted user (vs control). */
const TOUCH_UPLIFT = 0.2;

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
  const [policy, setPolicyState] = useState<Policy>(DEFAULT_POLICY);
  const [compliance, setCompliance] = useState<CompliancePolicy>(DEFAULT_COMPLIANCE_POLICY);
  const [debrief, setDebrief] = useState<ShiftDebriefData | null>(null);

  // screen / surface state
  const [booting, setBooting] = useState(true);
  const [onboarding, setOnboarding] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistState>({
    ranShift: false,
    recordedOutcome: false,
    tunedGuardrail: false,
    usedAssistant: false,
    exportedAudit: false,
  });
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const mark = useCallback((k: keyof ChecklistState) => {
    setChecklist((c) => (c[k] ? c : { ...c, [k]: true }));
  }, []);

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

  const policyRef = useRef(policy);
  const setPolicy = useCallback((next: Policy) => {
    policyRef.current = next;
    setPolicyState(next);
  }, []);
  // operator-initiated policy change (also advances the activation checklist)
  const tunePolicy = useCallback(
    (next: Policy) => {
      setPolicy(next);
      mark("tunedGuardrail");
    },
    [setPolicy, mark],
  );

  // holdout accounting per shift (largest-remainder so small queues still hold ~holdoutPct)
  const actSeqRef = useRef(0);
  const heldSeqRef = useRef(0);

  const patch = useCallback(
    (id: string, p: Partial<User>) => {
      setU((us) => us.map((u) => (u.id === id ? { ...u, ...p } : u)));
    },
    [setU],
  );

  const audit = useCallback((who: string, text: string, kind: AuditKind) => {
    setLog((l) => [{ time: stamp(), who, text, kind }, ...l]);
  }, []);

  /* boot: brief skeleton so the first paint feels like a real dashboard load */
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 780);
    return () => clearTimeout(t);
  }, []);

  /* global Cmd/Ctrl-K command palette */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
        mark("usedAssistant");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mark]);

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
        const result: AgentDecision = {
          root_cause: "Automated diagnosis unavailable",
          channel: "-",
          action: "ESCALATE",
          reasoning:
            "The agent couldn't reach a confident decision (API or parse error), so it routed this user to a human instead of dropping them.",
          draft_message: "",
          confidence: 0,
        };
        patch(user.id, { status: "escalated", result });
        audit(user.name, "diagnosis failed → escalated to a human (fail-safe)", "error");
        await sleep(450);
        return;
      }

      // learning may shift the channel; guardrails may force an escalation.
      const learned = applyLearning(base, user, learningRef.current);
      const result = applyGuardrails(learned, user, policyRef.current);
      audit(user.name, `diagnosed - ${result.root_cause} (confidence ${result.confidence.toFixed(2)})`, "diagnosed");
      if (result.learning_note) audit(user.name, result.learning_note, "learning");
      if (result.guardrail) audit(user.name, `guardrail → ${result.guardrail}`, "guardrail");

      if (result.action === "SKIP") {
        patch(user.id, { status: "skipped", result });
        audit(user.name, "skipped - already converting, declined to spend an outreach", "skipped");
        await sleep(450);
        return;
      }
      if (result.action === "ESCALATE") {
        patch(user.id, { status: "escalated", result });
        audit(user.name, "escalated to a human for review", "escalated");
        await sleep(450);
        return;
      }

      // ACT - but first decide if this one is held back as an untouched control.
      actSeqRef.current += 1;
      const target = Math.round((actSeqRef.current * policyRef.current.holdoutPct) / 100);
      const heldOut = target > heldSeqRef.current;
      if (heldOut) heldSeqRef.current += 1;

      if (heldOut) {
        patch(user.id, {
          status: "actioned",
          result,
          heldOut: true,
          dispatch: {
            channel: result.channel,
            message: result.draft_message,
            mode: modeRef.current,
            status: "held_out",
            at: stamp(),
          },
        });
        audit(user.name, "held out as an untouched control - measuring incremental lift", "actioned");
        await sleep(420);
        return;
      }

      const dispatch = await dispatchOutreach(
        { channel: result.channel, message: result.draft_message },
        modeRef.current,
      );
      patch(user.id, { status: "actioned", result, dispatch });
      audit(
        user.name,
        modeRef.current === "shadow"
          ? `would send via ${result.channel} - dry-run, not dispatched`
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
    mark("ranShift");
    actSeqRef.current = 0;
    heldSeqRef.current = 0;
    for (;;) {
      const next = nextInQueue(usersRef.current); // triage: highest value-at-risk first
      if (!next) break;
      await processOne(next);
    }
    setRunning(false);
    setPhase("");
    // compute and show the shift debrief
    setDebrief(computeDebrief(usersRef.current, learningRef.current));
  }, [running, processOne, mark]);

  /* ── outcome feedback loop ────────────────────────────────────────── */
  const applyOutcome = useCallback(
    (user: User, outcome: OutcomeKind) => {
      const result = user.result;
      if (!result) return;
      const channel = result.channel as Channel | "-";
      const reason = user.dropOff;
      mark("recordedOutcome");

      // control users: never contacted - record for the lift calc only.
      if (user.heldOut) {
        patch(user.id, { outcome });
        audit(
          user.name,
          outcome === "recovered"
            ? "control - re-engaged on their own (baseline, not credited to outreach)"
            : "control - stayed stalled (baseline)",
          "outcome",
        );
        return;
      }

      // contacted users: fold into learning, move lane, count revenue.
      setLearn(foldOutcome(learningRef.current, reason, channel, outcome));
      if (outcome === "recovered") {
        patch(user.id, { status: "recovered", outcome });
        audit(user.name, `recovered - re-engaged after ${channel} outreach (+${money(user.value)})`, "outcome");
      } else if (outcome === "ignored") {
        patch(user.id, { outcome });
        audit(user.name, `ignored - no response to ${channel} outreach`, "outcome");
      } else {
        patch(user.id, { outcome });
        audit(user.name, `converted on their own - ${channel} touch didn't drive it (uncredited)`, "outcome");
      }
    },
    [patch, audit, setLearn, mark],
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
      let outcome: OutcomeKind;
      if (u.heldOut) {
        // control gets no uplift - this is the baseline
        outcome = r < p ? "recovered" : "ignored";
      } else {
        const eff = Math.min(0.97, p + TOUCH_UPLIFT);
        outcome = r < eff ? "recovered" : r < eff + 0.12 ? "converted_anyway" : "ignored";
      }
      applyOutcome(u, outcome);
    }
    setNote(
      `Simulated outcomes for ${pending.length} user${pending.length === 1 ? "" : "s"} - learning and incremental lift updated.`,
    );
  }, [applyOutcome]);

  /* ── human review ─────────────────────────────────────────────────── */
  const approve = useCallback(
    async (u: User) => {
      const dispatch = await dispatchOutreach(
        { channel: u.result?.channel ?? "-", message: u.result?.draft_message ?? "" },
        modeRef.current,
      );
      patch(u.id, { status: "actioned", resolvedBy: "approved", dispatch });
      audit(
        u.name,
        modeRef.current === "shadow"
          ? `human approved - would send via ${u.result?.channel ?? "chosen channel"} (shadow)`
          : `human approved - dispatched via ${u.result?.channel ?? "chosen channel"}`,
        "human",
      );
    },
    [patch, audit],
  );

  const override = useCallback(
    (u: User) => {
      patch(u.id, { status: "escalated", resolvedBy: "overridden" });
      audit(u.name, "human overrode the escalation - closed without outreach", "human");
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
      setNote(`${u.name} added to the inbox - run the shift to let the agent take it.`);
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
    setDebrief(null);
  }, [setU, setLearn]);

  /* ── metrics + insights ───────────────────────────────────────────── */
  const m: Metrics = useMemo(() => {
    const by = (s: User["status"]) => users.filter((u) => u.status === s).length;
    const actioned = by("actioned");
    const recovered = by("recovered");
    const escalated = by("escalated");
    const skipped = by("skipped");
    const acted = actioned + recovered;
    const decided = acted + escalated + skipped;
    const decisionBase = acted + escalated;
    const autoPct = decisionBase ? Math.round((acted / decisionBase) * 100) : 0;
    const escPct = decisionBase ? 100 - autoPct : 0;
    const revenue = users
      .filter((u) => u.status === "recovered" && !u.heldOut)
      .reduce((s, u) => s + u.value, 0);
    const atRisk = users
      .filter(
        (u) =>
          u.status === "inbox" ||
          u.status === "processing" ||
          u.status === "escalated" ||
          (u.status === "actioned" && u.outcome !== "recovered" && u.outcome !== "converted_anyway"),
      )
      .reduce((s, u) => s + u.value, 0);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return { acted, recovered, escalated, skipped, decided, total: users.length, autoPct, escPct, revenue, atRisk, avg };
  }, [users, times]);

  const lift = useMemo(() => computeLift(users), [users]);
  const ranks = useMemo(() => triageRank(users), [users]);
  const atRiskPerHour = useMemo(() => totalCostPerHour(users), [users]);
  const guardrailsFired = useMemo(() => users.filter((u) => u.result?.guardrail).length, [users]);
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

  /* ── chat / delegation surface ────────────────────────────────────── */
  const chatRespond = (message: string, history: ChatMessage[]) => {
    const ctx: ChatContext = { mode, apiMode: API_MODE, metrics: m, inbox: inboxCount, users, learning, policy };
    return respondToChat(message, ctx, history);
  };

  const runChatAction = (action: ChatAction) => {
    switch (action.type) {
      case "run_shift":
        void runShift();
        break;
      case "simulate":
        simulateOutcomes();
        break;
      case "set_mode":
        setMode(action.mode);
        break;
      case "set_policy":
        tunePolicy({ ...policyRef.current, ...action.patch });
        break;
      case "add_user":
        setShowAdd(true);
        break;
      case "open_command":
        setCmdOpen(true);
        break;
      case "reset":
        reset();
        break;
    }
  };

  /* ── command palette ──────────────────────────────────────────────── */
  const commands: Command[] = [
    { id: "run", label: "Run shift", group: "Agent", icon: Zap, hint: inboxCount ? `${inboxCount}` : undefined, keywords: "work queue start", disabled: running || inboxCount === 0, run: () => void runShift() },
    { id: "sim", label: "Simulate outcomes", group: "Agent", icon: Beaker, keywords: "record results lift", disabled: running || !canSimulate, run: simulateOutcomes },
    { id: "mode", label: mode === "shadow" ? "Switch to Live mode" : "Switch to Shadow mode", group: "Agent", icon: Eye, keywords: "dry run send dispatch", disabled: running, run: () => setMode(mode === "shadow" ? "live" : "shadow") },
    { id: "add", label: "Add a stalled user", group: "Queue", icon: Plus, keywords: "new user", disabled: running, run: () => setShowAdd(true) },
    { id: "assistant", label: "Open the assistant", group: "Help", icon: MessageSquare, keywords: "chat ask delegate", run: () => { setChatOpen(true); mark("usedAssistant"); } },
    { id: "export", label: "Export audit log", group: "Audit", icon: Download, keywords: "download json compliance", disabled: log.length === 0, run: () => { exportRef.current?.(); } },
    { id: "tour", label: "Restart the tour", group: "Help", icon: Compass, keywords: "onboarding guide help", run: () => setOnboarding(true) },
    { id: "reset", label: "Reset the shift", group: "Agent", icon: RotateCcw, keywords: "clear start over", disabled: running, run: reset },
  ];
  const exportRef = useRef<(() => void) | null>(null);

  const showChecklist = !checklistDismissed && !booting && !onboarding;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.paper,
        backgroundImage: "radial-gradient(rgba(22,23,27,0.035) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        backgroundAttachment: "fixed",
        fontFamily: SANS,
        color: C.ink,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        @keyframes rcv-ping { 0%{transform:scale(1);opacity:.5} 70%,100%{transform:scale(2.4);opacity:0} }
        @keyframes rcv-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        @keyframes rcv-rise { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes rcv-fade { from{opacity:0} to{opacity:1} }
        @keyframes rcv-pop { from{opacity:0;transform:translateY(-4px) scale(.99)} to{opacity:1;transform:none} }
        @keyframes rcv-blink { 0%,50%{opacity:1} 50.01%,100%{opacity:0} }
        @keyframes rcv-skel { 0%{opacity:1} 50%{opacity:.55} 100%{opacity:1} }
        .rcv-skel{ animation: rcv-skel 1.3s ease-in-out infinite; }
        .rcv-card{ transition: transform .14s ease, box-shadow .18s ease, border-color .14s ease; }
        .rcv-card:hover{ transform: translateY(-1px); box-shadow: 0 6px 18px -10px rgba(16,17,21,.28); border-color:#D8D8D2; }
        @media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }
        ::-webkit-scrollbar{height:9px;width:9px} ::-webkit-scrollbar-thumb{background:#DCDCD6;border-radius:8px} ::-webkit-scrollbar-thumb:hover{background:#C8C8C0}
        input::placeholder{color:${C.faint}}
      `}</style>

      {booting ? (
        <BootSkeleton />
      ) : (
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 22px 64px", animation: "rcv-fade .25s ease" }}>
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
            onOpenCommand={() => setCmdOpen(true)}
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
                <b style={{ color: C.ink }}>Shadow mode (dry-run).</b> Every real decision is made and the
                exact payload it <i>would</i> dispatch is shown - nothing is sent. The safe rollout posture.
              </>
            ) : (
              <>
                <b>Live mode.</b> Actions route through the single dispatch seam in{" "}
                <code style={{ fontFamily: MONO }}>lib/dispatch.ts</code> - a clearly marked stub (TODO:
                Twilio / WhatsApp / email). It still does <b>not</b> send anything.
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

          <Scorecard m={m} revDisplay={revDisplay} lift={lift} atRiskPerHour={atRiskPerHour} />

          {debrief && <ShiftDebrief data={debrief} onDismiss={() => setDebrief(null)} />}

          {showAdd && <AddPanel onAdd={addUser} onClose={() => setShowAdd(false)} />}

          {/* queue board */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 18, marginBottom: 14, boxShadow: SHADOW }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <InboxIcon size={15} color={C.soft} />
              <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: C.soft }}>
                Queue · inbox → processing → outcome lanes
              </span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, color: C.faint }}>
                triaged by revenue-at-risk
              </span>
            </div>
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
              {LANES.map((lane) => (
                <Lane
                  key={lane.key}
                  lane={lane}
                  items={lanes[lane.key]}
                  phase={phase}
                  ranks={ranks}
                  onApprove={approve}
                  onOverride={override}
                  onOutcome={applyOutcome}
                />
              ))}
            </div>
          </div>

          {/* guardrails */}
          <div style={{ marginBottom: 14 }}>
            <GuardrailsPanel
              policy={policy}
              setPolicy={tunePolicy}
              compliance={compliance}
              setCompliance={setCompliance}
              fired={guardrailsFired}
            />
          </div>

          {/* channel matrix + learning */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ flex: "2 1 420px", minWidth: 320 }}>
              <ChannelMatrix learning={learning} />
            </div>
            <div style={{ flex: "1 1 280px", minWidth: 280 }}>
              <LearningPanel learning={learning} />
            </div>
          </div>

          {/* audit */}
          <div style={{ marginBottom: 14 }}>
            <AuditTrail log={log} onExport={() => { mark("exportedAudit"); }} registerExport={(fn) => (exportRef.current = fn)} />
          </div>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: C.faint, fontFamily: MONO, letterSpacing: "0.04em" }}>
            {API_MODE === "live" ? "Reasoning runs on claude-sonnet-4-6" : "Reasoning runs on built-in deterministic logic"} · decides
            ACT / ESCALATE / SKIP per user, learns from outcomes, proves its own lift
          </div>
        </div>
      )}

      {!booting && onboarding && (
        <Onboarding
          onFinish={(runNow) => {
            setOnboarding(false);
            if (runNow) void runShift();
          }}
        />
      )}

      {showChecklist && <Checklist state={checklist} onDismiss={() => setChecklistDismissed(true)} />}

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />

      {!booting && (
        <ChatPanel
          mode={mode}
          open={chatOpen}
          onOpenChange={(o) => {
            setChatOpen(o);
            if (o) mark("usedAssistant");
          }}
          respond={chatRespond}
          onAction={runChatAction}
        />
      )}
    </div>
  );
}
