import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Zap,
  Beaker,
  Plus,
  RotateCcw,
  Download,
  MessageSquare,
  Eye,
  Compass,
} from "lucide-react";
import { C, MONO, SANS } from "./theme";
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
import { Nav, type Page } from "./components/Nav";
import type { Metrics } from "./components/Scorecard";
import { ChatPanel } from "./components/ChatPanel";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { Onboarding, Checklist, type ChecklistState } from "./components/Onboarding";
import { BootSkeleton } from "./components/Skeleton";
import { respondToChat, type ChatContext } from "./lib/chat";
import { DEFAULT_COMPLIANCE_POLICY, type CompliancePolicy } from "./lib/compliance";
import { DashboardPage } from "./pages/DashboardPage";
import { QueuePage } from "./pages/QueuePage";
import { IntelligencePage } from "./pages/IntelligencePage";
import { LearningPage } from "./pages/LearningPage";
import { GuardrailsPage } from "./pages/GuardrailsPage";
import { AuditPage } from "./pages/AuditPage";

const PROC_STEPS = [
  "Reading signals",
  "Diagnosing root cause",
  "Selecting channel",
  "Drafting outreach",
  "Logging decision",
];

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
  const [page, setPage] = useState<Page>("dashboard");

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
  const tunePolicy = useCallback(
    (next: Policy) => {
      setPolicy(next);
      mark("tunedGuardrail");
    },
    [setPolicy, mark],
  );

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

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 780);
    return () => clearTimeout(t);
  }, []);

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
      const next = nextInQueue(usersRef.current);
      if (!next) break;
      await processOne(next);
    }
    setRunning(false);
    setPhase("");
    setDebrief(computeDebrief(usersRef.current, learningRef.current));
  }, [running, processOne, mark]);

  const applyOutcome = useCallback(
    (user: User, outcome: OutcomeKind) => {
      const result = user.result;
      if (!result) return;
      const channel = result.channel as Channel | "-";
      const reason = user.dropOff;
      mark("recordedOutcome");

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

  const inboxCount = useMemo(() => users.filter((u) => u.status === "inbox").length, [users]);
  const canSimulate = users.some((u) => u.status === "actioned" && !u.outcome);

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
        setPage("queue");
        break;
      case "open_command":
        setCmdOpen(true);
        break;
      case "reset":
        reset();
        break;
    }
  };

  const exportRef = useRef<(() => void) | null>(null);

  const commands: Command[] = [
    { id: "run", label: "Run shift", group: "Agent", icon: Zap, hint: inboxCount ? `${inboxCount}` : undefined, keywords: "work queue start", disabled: running || inboxCount === 0, run: () => { setPage("queue"); void runShift(); } },
    { id: "sim", label: "Simulate outcomes", group: "Agent", icon: Beaker, keywords: "record results lift", disabled: running || !canSimulate, run: simulateOutcomes },
    { id: "mode", label: mode === "shadow" ? "Switch to Live mode" : "Switch to Shadow mode", group: "Agent", icon: Eye, keywords: "dry run send dispatch", disabled: running, run: () => setMode(mode === "shadow" ? "live" : "shadow") },
    { id: "add", label: "Add a stalled user", group: "Queue", icon: Plus, keywords: "new user", disabled: running, run: () => { setShowAdd(true); setPage("queue"); } },
    { id: "assistant", label: "Open the assistant", group: "Help", icon: MessageSquare, keywords: "chat ask delegate", run: () => { setChatOpen(true); mark("usedAssistant"); } },
    { id: "export", label: "Export audit log", group: "Audit", icon: Download, keywords: "download json compliance", disabled: log.length === 0, run: () => { exportRef.current?.(); } },
    { id: "tour", label: "Restart the tour", group: "Help", icon: Compass, keywords: "onboarding guide help", run: () => setOnboarding(true) },
    { id: "reset", label: "Reset the shift", group: "Agent", icon: RotateCcw, keywords: "clear start over", disabled: running, run: reset },
  ];

  const showChecklist = !checklistDismissed && !booting && !onboarding;

  const navBadges = {
    queue: inboxCount || undefined,
    audit: log.length > 0 ? log.length : undefined,
    guardrails: guardrailsFired > 0 ? guardrailsFired : undefined,
  };

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
        @keyframes rcv-ping   { 0%{transform:scale(1);opacity:.5} 70%,100%{transform:scale(2.4);opacity:0} }
        @keyframes rcv-in     { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        @keyframes rcv-rise   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes rcv-fade   { from{opacity:0} to{opacity:1} }
        @keyframes rcv-pop    { from{opacity:0;transform:translateY(-4px) scale(.99)} to{opacity:1;transform:none} }
        @keyframes rcv-blink  { 0%,50%{opacity:1} 50.01%,100%{opacity:0} }
        @keyframes rcv-skel   { 0%{opacity:1} 50%{opacity:.55} 100%{opacity:1} }
        @keyframes rcv-page   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes rcv-row-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
        @keyframes rcv-sla-pulse {
          0%,100%{ box-shadow:0 0 0 0 rgba(180,35,24,0.35) }
          60%    { box-shadow:0 0 0 5px rgba(180,35,24,0) }
        }
        @keyframes rcv-num-up { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        @keyframes rcv-shimmer {
          0%   { background-position:-200% 0 }
          100% { background-position: 200% 0 }
        }
        .rcv-skel   { animation: rcv-skel 1.3s ease-in-out infinite; }
        .rcv-card   { transition: transform .16s cubic-bezier(.22,1,.36,1), box-shadow .18s ease, border-color .14s ease; }
        .rcv-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px -12px rgba(16,17,21,.22); border-color:#D2D2CA; }
        .rcv-card:active { transform:translateY(0); }
        .rcv-num    { display:inline-block; animation: rcv-num-up .35s cubic-bezier(.22,1,.36,1) both; }
        .rcv-queue-row { transition: background .1s ease; }
        .rcv-queue-row:hover td { background: ${C.surfaceAlt} !important; }
        .rcv-queue-row:hover { background: ${C.surfaceAlt}; }
        .rcv-sla-breach { animation: rcv-sla-pulse 1.8s ease infinite; border-radius: 999px; }
        @media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }
        ::-webkit-scrollbar{height:9px;width:9px} ::-webkit-scrollbar-thumb{background:#DCDCD6;border-radius:8px} ::-webkit-scrollbar-thumb:hover{background:#C8C8C0}
        input::placeholder{color:${C.faint}}
        input:focus{outline:none;border-color:${C.accent}!important;box-shadow:0 0 0 2px rgba(37,99,235,.15)!important}
      `}</style>

      {booting ? (
        <BootSkeleton />
      ) : (
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "22px 22px 64px",
            animation: "rcv-fade .25s ease",
          }}
        >
          <Hero apiMode={API_MODE} />

          <Nav page={page} setPage={setPage} badges={navBadges} />

          <div key={page} style={{ animation: "rcv-page .22s cubic-bezier(.22,1,.36,1) both" }}>

          {page === "dashboard" && (
            <DashboardPage
              m={m}
              revDisplay={revDisplay}
              lift={lift}
              atRiskPerHour={atRiskPerHour}
              users={users}
              mode={mode}
              note={note}
              debrief={debrief}
              onDismissDebrief={() => setDebrief(null)}
              onNavigate={setPage}
              running={running}
            />
          )}

          {page === "queue" && (
            <QueuePage
              users={users}
              phase={phase}
              ranks={ranks}
              running={running}
              mode={mode}
              note={note}
              showAdd={showAdd}
              canSimulate={canSimulate}
              inboxCount={inboxCount}
              onToggleMode={setMode}
              onToggleAdd={() => setShowAdd((s) => !s)}
              onReset={reset}
              onRunShift={runShift}
              onSimulate={simulateOutcomes}
              onOpenCommand={() => setCmdOpen(true)}
              onAdd={addUser}
              onApprove={approve}
              onOverride={override}
              onOutcome={applyOutcome}
            />
          )}

          {page === "intelligence" && (
            <IntelligencePage users={users} learning={learning} />
          )}

          {page === "learning" && (
            <LearningPage learning={learning} users={users} />
          )}

          {page === "guardrails" && (
            <GuardrailsPage
              policy={policy}
              setPolicy={tunePolicy}
              compliance={compliance}
              setCompliance={setCompliance}
              fired={guardrailsFired}
              log={log}
            />
          )}

          {page === "audit" && (
            <AuditPage
              log={log}
              onExport={() => { mark("exportedAudit"); }}
              registerExport={(fn) => (exportRef.current = fn)}
            />
          )}

          </div>{/* end page transition wrapper */}

          <div
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 11,
              color: C.faint,
              fontFamily: MONO,
              letterSpacing: "0.04em",
            }}
          >
            {API_MODE === "live" ? "Reasoning runs on claude-sonnet-4-6" : "Reasoning runs on built-in deterministic logic"} · decides
            ACT / ESCALATE / SKIP per user, learns from outcomes, proves its own lift
          </div>
        </div>
      )}

      {!booting && onboarding && (
        <Onboarding
          onFinish={(runNow) => {
            setOnboarding(false);
            if (runNow) {
              setPage("queue");
              void runShift();
            }
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
