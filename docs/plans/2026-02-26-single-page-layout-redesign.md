# Single-Page Layout Redesign

Replaces the two-page flow (homepage + `/run/[runId]`) with a single page using a resizable two-column split.

## Layout

`ResizablePanelGroup` (horizontal) fills the viewport below the nav bar.

```
┌──────────────────────────────────────────────────────────┐
│  LO-Solver                                               │
├─────────────────────┬────────────────────────────────────┤
│  Left Panel (35%)   │  Right Panel (65%)                 │
│  ─────────────────  │  ──────────────────────────────    │
│  ProblemInput       │  EmptyState (before run)           │
│  StepProgress       │    or                              │
│  ResultsPanel       │  DevTracePanel (during/after run)  │
├─────────────────────┴────────────────────────────────────┤
```

- Left panel: min 25%, default 35%. Contains input, progress, and results stacked vertically.
- Right panel: min 30%, default 65%. Contains dev trace or empty state.
- Both panels have independent `ScrollArea` containers filling `calc(100vh - nav height)`.
- Draggable `ResizableHandle` between panels.

## Component Tree

```
layout.tsx (server)
  └─ nav bar
  └─ page.tsx (client) — owns useChat, derives workflow state
       └─ ResizablePanelGroup (horizontal)
            ├─ ResizablePanel (left)
            │    └─ ScrollArea
            │         ├─ ProblemInput — textarea, example picker, solve button
            │         ├─ StepProgress — 4-step indicator (hidden until run starts)
            │         └─ ResultsPanel — answers, rules, vocabulary (hidden until complete)
            ├─ ResizableHandle
            └─ ResizablePanel (right)
                 └─ ScrollArea
                      └─ DevTracePanel or EmptyState
```

## Left Panel Behavior

Three sections appear progressively:

1. **ProblemInput** — always visible. Disabled while a run is in progress. Accepts `onSolve(text)` callback (no router navigation). Re-enables after completion.
2. **StepProgress** — appears once `sendMessage` is called. Shows step statuses from `data-workflow` stream parts.
3. **ResultsPanel** — appears when workflow succeeds. Shows collapsible answers, rules, vocabulary. On failure, shows error message instead.

All three scroll together within the left panel's `ScrollArea`.

## Right Panel

**Empty state (no active run):** Centered placeholder with a unicode icon, instructional text ("Paste a problem on the left and click Solve"), and usage tips.

**During/after run:** `DevTracePanel` component showing:
- Iteration tabs (one per verify-improve iteration)
- Swimlane timeline (step events, agent calls, tool calls)
- Detail inspector (expandable input/output for each event)

The dev trace panel internals are Phase 4 work. The layout redesign creates the shell component with event accumulation; swimlane rendering is built separately.

## Responsive Behavior

- Below 1024px viewport width, `ResizablePanelGroup` direction switches to `vertical`. Both panels stack, each taking half the viewport height.
- Min panel sizes prevent either panel from collapsing.

## File Changes

**Delete:**
- `src/app/run/[runId]/page.tsx`

**Modify:**
- `src/app/page.tsx` — single-page client component with `useChat` and `ResizablePanelGroup`
- `src/components/problem-input.tsx` — remove `useRouter`/`sessionStorage`, accept `onSolve` callback and `disabled` prop
- `src/app/layout.tsx` — ensure `<main>` fills viewport height

**Create:**
- `src/components/dev-trace-panel.tsx` — shell with empty state, accepts trace event data

**Unchanged:**
- API route, workflow events, workflow.ts, tool files, all Mastra backend code
