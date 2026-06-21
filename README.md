# Recover — an autonomous recovery employee

Recover is an **autonomous AI employee** that owns one process end-to-end:
recovering revenue from stalled users in a conversion funnel. It isn't a chatbot
and it isn't a copilot you prompt each time — you start a shift and it works a
queue of stalled users **on its own**:

- **Diagnoses** the specific root cause of each stall from the user's signals
- **Picks a channel** — Call / WhatsApp / Email
- **Decides** `ACT` · `ESCALATE` (hand to a human) · `SKIP` (already converting)
- **Drafts** the actual outreach copy
- **Escalates** sensitive / high-value / negative-sentiment cases to a human
- **Learns** from recorded outcomes and shifts future channel choices
- Takes **delegation** and **explains its own calls** via a built-in chat
- Keeps a full **audit trail** and owns one number: **recovered revenue**

It demonstrates the four things an "AI employee" has to do — monitor, act,
escalate, and learn — with every decision legible and auditable.

---

## Quick start

```bash
cd recover
npm install
npm run dev
```

Then open the URL it prints (default **http://localhost:5173**).

That's it — **no API key required**. With no key set, Recover runs in **mock
reasoning** mode out of the box (realistic, deterministic canned reasoning), so
anyone can run it instantly.

Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
npm run typecheck  # tsc --noEmit
```

---

## The two pairs of "modes"

Recover has **two independent toggles**. Don't confuse them — one is about where
the *thinking* comes from, the other is about whether it would *send*.

### 1. Reasoning: Mock vs Live (set by the API key)

| | When | Where it shows |
|---|---|---|
| **Mock reasoning** | No API key set (default) | Badge in the header reads `MOCK REASONING` |
| **Live reasoning** | `VITE_ANTHROPIC_API_KEY` is set | Badge reads `LIVE REASONING · sonnet-4-6` |

To use live Claude reasoning:

```bash
cp .env.example .env
# edit .env and set:
# VITE_ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Live mode calls **`claude-sonnet-4-6`** (`max_tokens: 1000`) and prompts the
model for strict JSON (`root_cause`, `channel`, `action`, `reasoning`,
`draft_message`). The response is parsed defensively — code fences are stripped,
the JSON object is located and `JSON.parse`d in a `try/catch`, and on any failure
the user is **escalated to a human as a fail-safe** rather than dropped.

> **Security note.** This MVP calls the Anthropic API **directly from the
> browser** (using the `anthropic-dangerous-direct-browser-access` header) for
> demo simplicity, which means the key ships to the client. That's fine for a
> local demo with a throwaway key. For production you'd move the call behind a
> tiny serverless proxy (e.g. a Vercel function) and keep the key server-side —
> the single `getDecision()` call in `src/lib/agent.ts` is the only thing you'd
> repoint.

### 2. Behaviour: Shadow vs Live (the header toggle)

| | What happens |
|---|---|
| **Shadow mode** (default, ON) | The agent makes **every real decision** but **does not send**. Actions are labelled **"would send"** and the exact payload (channel + message) it *would* have dispatched is shown. A deliberate dry-run for safe rollout — not a fake. |
| **Live mode** | Actions route through the single real dispatch seam in [`src/lib/dispatch.ts`](src/lib/dispatch.ts) — a clearly-marked, well-commented **stub** with a `TODO` where Twilio / WhatsApp / email would plug in. It **still does not send anything**. |

`dispatch.ts` is intentionally the *only* place that ever touches an outbound
provider, so going truly live is a one-function change.

---

## The two headline features

### Shadow mode
Honest, intentional simulation. The agent commits to a real decision and shows
the precise payload it would dispatch, without sending — the safe posture for
rolling an autonomous worker into a live funnel.

### Outcome feedback loop (the agent learns and compounds)
After the agent actions a user, record an outcome — **Recovered**, **Ignored**,
or **Converted-anyway** — manually per card, or use **Simulate outcomes** to roll
them for a demo. The agent maintains a running tally of **channel effectiveness
broken down by drop-off reason**, surfaced in the **"What the agent has learned"**
panel. That tally **demonstrably shifts future decisions**: when it picks a
channel its reasoning cites what it learned, e.g.

> _"Learned: 'KYC incomplete' recovers better on Call (80% over 5) than Email
> (20%) → shifting channel Email→Call."_

(The seed ships with a little prior history so this shift fires on the very first
shift — watch **Marcus Lee** get moved off his Email preference onto Call.)

### Talk to Recover (delegation surface)

The **"Ask Recover"** chat (bottom-right) is how you *manage* the employee — not a
chatbot you re-prompt for each action. It does two things, grounded in live state:

- **Takes delegation as real actions** — "run the shift", "simulate outcomes",
  "go live" / "switch to shadow", "reset" actually drive the app (deterministic,
  works in any mode and shows an `↳ action taken` tag).
- **Explains its own calls** — "why did you escalate the big accounts?", "what's
  working best?", "summarize the shift" answer from the actual queue, metrics and
  learned channel data. With a key it answers via `claude-sonnet-4-6`; without
  one it answers from grounded mock heuristics.

---

## How a demo runs

1. **Run shift** — the agent works the 7 seeded users one at a time with a
   visible "working…" state. You'll see all behaviours fire:
   - **ACT** → Priya, Marcus, Dev (clear recovery candidates)
   - **SKIP** → Aisha, Tom (active right now — declines to waste a touch)
   - **ESCALATE** → Rohan (KYC/PAN mismatch, $180k), Sara (negative sentiment, $42k)
2. **Record outcomes** (or **Simulate outcomes**) on the actioned users — watch
   recovered revenue and the learning panel update.
3. **Human review** — Approve or Override the escalated users.
4. **Add user** — drop in your own stalled user and watch it reason live.
5. Toggle **Shadow / Live** and **Reset** at any time.

---

## Project structure

```
src/
  App.tsx                 orchestration: the queue worker, state, handlers
  theme.ts                design tokens (palette, fonts, lanes)
  types.ts                domain types
  lib/
    agent.ts              getDecision() — live (claude-sonnet-4-6) or mock
    mockAgent.ts          deterministic mock reasoning (zero-setup)
    learning.ts           outcome feedback loop + channel-shift logic
    dispatch.ts           the single send seam (shadow / live stub)
    seed.ts               7 seeded users + seeded prior learning
    utils.ts              money / stamp / count-up helpers
  components/
    TopBar.tsx            shift status, mode toggle, API-mode badge, actions
    Scorecard.tsx         revenue owned, processed, auto/escalated %, etc.
    LearningPanel.tsx     "What the agent has learned"
    AuditTrail.tsx        timestamped decision log
    AddPanel.tsx          add a stalled user (no <form>; onClick handlers)
    shared.tsx            small presentational primitives
    queue/                Lane + the per-status cards
```

State is **React-only** — no `localStorage` / `sessionStorage`.

---

## Tech

Vite · React 18 · TypeScript · Tailwind CSS · lucide-react. The visual system is
**Zamp-inspired** (zamp.ai): a neutral-grey canvas, heavy display wordmark,
**Geist / Geist Mono** type, a first-person monospace "terminal" intro, vivid
status cards, and big rounded panels. It's driven by explicit design tokens in
`theme.ts`; Tailwind is wired up and available.

---

## Deploy (Vercel)

See the deployment walkthrough below / in the chat. In short: push to GitHub,
import on Vercel (framework auto-detected as Vite, build `npm run build`, output
`dist`). **Live Anthropic reasoning requires setting `VITE_ANTHROPIC_API_KEY`**
in the Vercel project's Environment Variables; with no key set, the deployed app
runs in mock mode so anyone can try it instantly.
