# Architecture Research

**Domain:** Abort propagation, file refactoring, and toast notifications for existing Mastra/Next.js AI workflow app
**Researched:** 2026-03-03
**Confidence:** HIGH

## System Overview (Current)

```
Frontend (Next.js / React 19)                    Backend (Mastra Workflow)
=============================================     ==========================================

  page.tsx (824 LOC)                               workflow.ts (1399 LOC)
  useChat({ transport }) ----POST----->           handleWorkflowStream
  stop() ---> closes stream                         |
                                                    +-- extractionStep.execute({ writer, ... })
  layout.tsx -> LayoutShell                         |     streamWithRetry(agent, { prompt })
    WorkflowControlProvider                         |
      NavBar (abort btn, new problem btn)           +-- multiPerspectiveHypothesisStep.execute(...)
                                                    |     11x streamWithRetry(...) -- NO abortSignal
  workflow-control-context.tsx                       |     parallel perspectives, synthesis, convergence
    stop: () => void                                |
    handleReset: () => void                         +-- answerQuestionsStep.execute(...)
                                                          streamWithRetry(agent, { prompt })
  Event stream (data-* parts) <---- writer.write()
```

### Component Responsibilities

| Component | Responsibility | Current Size |
|-----------|----------------|--------------|
| `workflow.ts` | All 3 step definitions, agent orchestration, event emission, state management | 1399 LOC |
| `page.tsx` | Solver UI: layout, event parsing, vocab/rules accumulation, progress, results | 824 LOC |
| `trace-event-card.tsx` | Renders all trace event types (agents, tools, steps, iterations) | 898 LOC |
| `agent-utils.ts` | `generateWithRetry` and `streamWithRetry` wrappers with timeout + abort support | 331 LOC |
| `request-context-helpers.ts` | Draft store CRUD, state accessors, event emission helpers | 370 LOC |
| `trace-utils.ts` | Event grouping, agent hierarchy, step summary computation | 476 LOC |
| `workflow-events.ts` | Type definitions for 18 event types, StepId/UIStepId types, event ID generator | 282 LOC |
| `workflow-control-context.tsx` | Cross-component abort/reset coordination (layout navbar -> page.tsx) | 103 LOC |

## Integration Architecture for New Features

### Feature 1: Abort Signal Propagation

**Current state:** The `useChat` `stop()` function closes the client-side stream. Mastra's `createStep` execute function receives `{ abortSignal }` as a parameter. The `streamWithRetry` and `generateWithRetry` functions already accept an `abortSignal` option and handle it correctly (merged signal, no-retry on abort, cleanup during backoff). However, **none of the 11 `streamWithRetry` calls in workflow.ts destructure or pass `abortSignal`**.

**Gap analysis:**

```
Currently:
  execute: async ({ inputData, mastra, bail, state, setState, writer }) => {
                                                                   ^-- abortSignal NOT destructured
    ...
    const response = await streamWithRetry(agent, {
      prompt,
      options: { ... },
      // abortSignal: NOT PASSED
    });

Needed:
  execute: async ({ inputData, mastra, bail, state, setState, writer, abortSignal }) => {
                                                                       ^^^^^^^^^^^^
    ...
    const response = await streamWithRetry(agent, {
      prompt,
      options: { ... },
      abortSignal,    // <-- thread through
    });
```

**Integration points:**

| Layer | Current | Change | Risk |
|-------|---------|--------|------|
| Step execute signature | Destructures 6 params, omits `abortSignal` | Add `abortSignal` to all 3 steps | LOW -- Mastra already provides it |
| `streamWithRetry` calls | 11 calls, none pass `abortSignal` | Add `abortSignal` param to all 11 | LOW -- already supported |
| `agent-utils.ts` | Already handles abort fully | None needed | NONE |
| `useChat` `stop()` | Closes client stream | None needed on frontend | NONE |
| Mastra framework | Provides `abortSignal` via `AbortController` on workflow | None needed | NONE |
| Error handling in steps | Catches errors, may bail | Add abort-specific early returns / cleanup | MEDIUM |

**Data flow after change:**

```
User clicks "Abort" in NavBar
    |
    v
useWorkflowControl().stop()
    |
    v
useChat.stop() -- closes ReadableStream from client side
    |
    v
Mastra detects stream close, signals AbortController
    |
    v
abortSignal fires in step execute context
    |
    v
streamWithRetry receives merged signal (caller + timeout)
    |
    v
agent.stream() / agent.generate() receives abort, stops LLM call
    |
    v
streamWithRetry detects callerSignal.aborted, throws immediately (no retry)
    |
    v
Step execute catches error, workflow terminates cleanly
```

**Key concern:** The `multiPerspectiveHypothesisStep` runs parallel perspective agents with `Promise.allSettled`. When abort fires, all parallel agents need to receive the signal simultaneously. Since they all share the same `abortSignal` from the step context, this works naturally -- `AbortSignal.any([callerSignal, timeoutController.signal])` in each `streamWithRetry` call will all fire when the parent aborts.

**Verify:** When the workflow cancels, does `handleWorkflowStream` clean up properly? The Mastra types show `WorkflowRunStatus` includes `'canceled'`, and `Workflow.cancel()` exists. The `handleWorkflowStream` function should handle client disconnect by calling `abort()` on the workflow's `AbortController`, which propagates down through the step's `abortSignal`. This is the standard Mastra pattern. HIGH confidence this works based on the type signatures.

### Feature 2: Toast Notifications (Sonner)

**Current state:** No toast library installed. shadcn is configured (`shadcn@3.8.5`). The `@radix-ui/react-toast` package exists in node_modules (dependency of shadcn) but is not used directly. The design system uses a cyanotype blueprint theme with `--radius: 0` (no rounded corners).

**Integration approach:**

Install via `npx shadcn@latest add sonner`, which installs the `sonner` package and creates a themed `<Toaster />` wrapper component. Place `<Toaster />` in `layout.tsx` (root layout) or in `LayoutShell`. Then call `toast()` from `page.tsx` at lifecycle events.

**Toast trigger points (all in page.tsx):**

| Event | Trigger Location | Toast Type |
|-------|------------------|------------|
| Workflow started | `handleSolve` callback | `toast.info("Solving...")` |
| Workflow complete | `isComplete` effect | `toast.success("Results ready")` |
| Workflow failed | `isFailed` effect | `toast.error("Workflow failed")` |
| Workflow aborted | `isAborted` detection | `toast.warning("Workflow aborted")` |

**Integration points:**

| Component | Change | New/Modified |
|-----------|--------|--------------|
| `src/components/ui/sonner.tsx` | New: shadcn Sonner wrapper with theme customization | NEW |
| `src/app/layout.tsx` or `LayoutShell` | Add `<Toaster />` | MODIFIED (1 line import, 1 line JSX) |
| `src/app/page.tsx` | Add `toast()` calls at lifecycle transitions | MODIFIED (4-5 toast calls) |

**Styling consideration:** Sonner accepts `toastOptions.className` and custom CSS. Must override default border-radius to 0, match background to `--card` / `--surface-2`, text to `--foreground`, accent colors to status variables. The shadcn sonner component wraps the theme automatically, but the cyanotype design system needs explicit overrides.

**Architecture note:** Toast calls live in the page component where workflow state is managed, not in a context. This avoids adding state management complexity. The `toast()` function is called imperatively (not via context/provider), which is Sonner's design.

### Feature 3: Large File Refactoring

**Files exceeding reasonable size thresholds (300+ LOC for components, 400+ for logic):**

| File | LOC | Issue | Refactoring Plan |
|------|-----|-------|-----------------|
| `workflow.ts` | 1399 | Three complete step definitions inline, all orchestration logic in one file | Extract each step into its own file |
| `trace-event-card.tsx` | 898 | Renders all 18+ event types in one switch statement | Extract per-event-type renderer components |
| `page.tsx` | 824 | State management, event parsing, layout, all in one component | Extract event parsing hooks, split layout sections |
| `trace-utils.ts` | 476 | Multiple grouping algorithms in one file | Acceptable size for utility module, but could split |
| `evals/run.ts` | 491 | CLI entry point with all eval logic | Out of scope (eval system, not user-facing) |

**Refactoring strategy for workflow.ts (the biggest win):**

Current structure:
```
workflow.ts (1399 LOC)
  - extractionStep (lines 48-175)        ~127 LOC
  - multiPerspectiveHypothesisStep (179-1246)  ~1067 LOC
  - answerQuestionsStep (1249-1384)       ~135 LOC
  - solverWorkflow definition (1386-1399)  ~13 LOC
```

Proposed structure:
```
src/mastra/workflow/
  steps/
    extract-structure.ts          # extractionStep definition
    multi-perspective-hypothesis.ts  # multiPerspectiveHypothesisStep
    answer-questions.ts           # answerQuestionsStep
  workflow.ts                     # Just imports + solverWorkflow composition (~30 LOC)
```

Each step file imports `streamWithRetry`, `emitTraceEvent`, schemas, etc. The step functions are already self-contained -- they only share state through `state`/`setState` and `RequestContext`, not through closures or module-level variables.

**Refactoring strategy for page.tsx:**

Extract custom hooks for event accumulation logic:
```
src/hooks/
  use-workflow-events.ts    # Vocab, rules, trace event parsing from allParts
  use-progress-steps.ts     # progressSteps computation from events + steps
```

This moves ~200 LOC of `useMemo` blocks out of `page.tsx`, leaving it focused on layout and composition.

**Refactoring strategy for trace-event-card.tsx:**

Extract grouped renderer components:
```
src/components/trace/
  step-event-cards.tsx      # StepStart, StepComplete cards
  agent-card.tsx            # AgentCard (already partially extracted)
  tool-call-card.tsx        # ToolCallGroupCard
  iteration-card.tsx        # IterationUpdate, VerifyImprovePhase
  data-update-cards.tsx     # VocabularyUpdate, RulesUpdate, RuleTestResult
```

The current file has a single large switch statement in `TraceEventCard` plus separate `AgentCard` and `ToolCallGroupCard` exports. These can be decomposed without changing the public API -- `trace-event-card.tsx` becomes a thin dispatcher that re-exports sub-components.

## Recommended Project Structure (After Refactoring)

```
src/
  app/
    layout.tsx              # + <Toaster /> import
    page.tsx                # Slimmed: layout + composition only (~500 LOC)
    api/solve/route.ts      # Unchanged
  mastra/workflow/
    steps/                  # NEW directory
      extract-structure.ts  # Step 1 definition
      multi-perspective-hypothesis.ts  # Step 2 definition (still large ~1000 LOC)
      answer-questions.ts   # Step 3 definition
    workflow.ts             # Slim: imports steps, composes workflow (~30 LOC)
    agent-utils.ts          # Unchanged
    request-context-*.ts    # Unchanged
    *-agent.ts, *-tool.ts   # Unchanged
  components/
    ui/
      sonner.tsx            # NEW: shadcn Sonner wrapper
    trace/                  # NEW directory (optional, could be flat)
      step-cards.tsx
      agent-card.tsx
      tool-cards.tsx
      iteration-cards.tsx
      data-cards.tsx
    trace-event-card.tsx    # Slim: dispatcher + re-exports
    dev-trace-panel.tsx     # Unchanged
  hooks/
    use-workflow-events.ts  # NEW: event accumulation from message parts
    use-progress-steps.ts   # NEW: progress bar step computation
  lib/
    workflow-events.ts      # Unchanged
    trace-utils.ts          # Unchanged
  contexts/
    workflow-control-context.tsx  # Unchanged
    mascot-context.tsx           # Unchanged
```

### Structure Rationale

- **steps/:** Each workflow step is 100-1000 LOC. Isolating them makes `workflow.ts` a clean composition file, and each step can be read/modified independently. Imports stay the same since steps reference shared modules via relative paths.
- **components/trace/:** The trace event card rendering is the second-largest component. Splitting by event category makes each file focused on one rendering concern.
- **hooks/:** Custom hooks for event parsing are natural React extractions. They encapsulate `useMemo` logic that currently bloats page.tsx.
- **ui/sonner.tsx:** Standard shadcn pattern for themed component wrappers.

## Architectural Patterns

### Pattern 1: Abort Signal Threading

**What:** Destructure `abortSignal` from Mastra's step execute params and pass it through to every `streamWithRetry` call.
**When to use:** Every step that makes agent calls.
**Trade-offs:** Minimal code change (add one param everywhere), but must be thorough -- missing even one call site means that agent continues burning API credits after abort.

**Example:**
```typescript
const extractionStep = createStep({
  id: 'extract-structure',
  // ...
  execute: async ({ inputData, mastra, bail, state, setState, writer, abortSignal }) => {
    // ... setup ...

    const response = await streamWithRetry(
      mastra.getAgentById('structured-problem-extractor'),
      {
        prompt: extractPrompt,
        options: { maxSteps: 100, requestContext, structuredOutput: { schema } },
        abortSignal,  // Thread through from step context
        onTextChunk: (chunk) => { /* ... */ },
      },
    );

    // ... rest of step ...
  },
});
```

### Pattern 2: Imperative Toast at State Transitions

**What:** Call `toast()` imperatively in React effects/callbacks that detect workflow state transitions, rather than building a toast context/provider.
**When to use:** For workflow lifecycle events where state is already tracked.
**Trade-offs:** Simple and direct. No new state management. Sonner handles deduplication. However, toast logic is coupled to page.tsx -- if we add more pages that need toasts, we'd need to extract.

**Example:**
```typescript
// In page.tsx, detect transitions with useEffect
const prevCompleteRef = useRef(false);
useEffect(() => {
  if (isComplete && !prevCompleteRef.current) {
    toast.success('Results ready', {
      description: 'Workflow completed successfully.',
    });
  }
  prevCompleteRef.current = isComplete;
}, [isComplete]);
```

### Pattern 3: Step-Per-File Extraction

**What:** Move each `createStep` call and its execute function into a separate file under `steps/`. The main `workflow.ts` becomes a pure composition file.
**When to use:** When a workflow file exceeds 500 LOC or contains multiple step definitions.
**Trade-offs:** More files but each is focused. Import paths within the workflow module stay short (`./steps/extract-structure`). No behavioral change.

**Example:**
```typescript
// src/mastra/workflow/steps/extract-structure.ts
import { createStep } from '@mastra/core/workflows';
import { streamWithRetry } from '../agent-utils';
import { emitTraceEvent } from '../request-context-helpers';
// ... other imports ...

export const extractionStep = createStep({
  id: 'extract-structure',
  // ... full step definition ...
});

// src/mastra/workflow/workflow.ts
import { createWorkflow } from '@mastra/core/workflows';
import { extractionStep } from './steps/extract-structure';
import { multiPerspectiveHypothesisStep } from './steps/multi-perspective-hypothesis';
import { answerQuestionsStep } from './steps/answer-questions';

export const solverWorkflow = createWorkflow({
  id: 'solver-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
})
  .then(extractionStep)
  .map(async ({ inputData }) => inputData.data!)
  .then(multiPerspectiveHypothesisStep)
  .then(answerQuestionsStep)
  .commit();
```

## Data Flow

### Abort Signal Flow (New)

```
User clicks Abort
    |
    v
NavBar.stop() --> useWorkflowControl().stop()
    |
    v
page.tsx useChat.stop() --> closes HTTP stream
    |
    v
Mastra runtime detects stream close
    |
    v
workflow.abortController.abort()
    |
    v
step.execute receives abortSignal (already aborted)
    |
    v
streamWithRetry checks callerSignal?.throwIfAborted() --> throws
    |
    v
Step execute try/catch catches abort error
    |
    v
Workflow status -> 'canceled'
```

### Toast Notification Flow (New)

```
Workflow state changes (detected in page.tsx via useChat status + workflowData)
    |
    +-- hasStarted transitions true --> toast.info("Solving...")
    +-- isComplete transitions true --> toast.success("Results ready")
    +-- isFailed transitions true  --> toast.error("Workflow failed")
    +-- isAborted detected         --> toast.warning("Workflow aborted")
    |
    v
Sonner <Toaster /> in layout.tsx renders toast stack
    |
    v
Auto-dismisses after configurable duration (default 5s)
```

### Refactoring Data Flow (No Change)

File refactoring is purely structural -- no data flow changes. Step files import the same modules, export the same `createStep` result, and the workflow composition is identical. The only change is file boundaries.

## Anti-Patterns

### Anti-Pattern 1: Partial Abort Threading

**What people do:** Add `abortSignal` to 9 of 11 `streamWithRetry` calls, missing a few in the parallel perspective loop.
**Why it's wrong:** The missed calls continue running (and burning API credits) after abort. The whole point of abort propagation is wasted if any call site is missed.
**Do this instead:** Grep for every `streamWithRetry(` call in the codebase and mechanically add `abortSignal` to each one. There are exactly 11 calls in workflow.ts. Add a code comment at each step reminding that abort must be threaded.

### Anti-Pattern 2: Catching Abort Errors as Failures

**What people do:** Treat abort-triggered errors the same as operational failures, logging them as errors or showing "Workflow failed" state.
**Why it's wrong:** Abort is a deliberate user action, not a failure. The UI already has distinct "aborted" state (amber) vs "failed" (red). If abort errors are caught and re-thrown as bail(), the workflow shows as "bailed/failed" instead of "canceled".
**Do this instead:** Let abort errors propagate naturally. The Mastra framework will catch them and set status to 'canceled'. If you must catch errors in step logic (e.g., for cleanup), check `abortSignal.aborted` before deciding to bail.

### Anti-Pattern 3: Toast Notification in Context Provider

**What people do:** Create a `ToastContext` provider that wraps the app, with methods to show workflow-specific toasts.
**Why it's wrong:** Sonner's `toast()` function is already global and imperative -- it doesn't need React context. Adding a context layer adds complexity with no benefit for a single-page app.
**Do this instead:** Import `toast` from `sonner` directly in `page.tsx` and call it at state transitions.

### Anti-Pattern 4: Refactoring with Behavioral Changes

**What people do:** While splitting files, also "improve" the code by changing logic, renaming variables, or restructuring control flow.
**Why it's wrong:** Refactoring should be provably safe -- same behavior, different file boundaries. Mixing refactoring with behavioral changes makes it impossible to verify correctness.
**Do this instead:** Pure file extraction first (cut/paste with import adjustments), verified with `npx tsc --noEmit`. Behavioral changes (like abort propagation) in separate commits.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Change Required |
|----------|---------------|-----------------|
| step execute -> streamWithRetry | Function call with options object | Add `abortSignal` field |
| page.tsx -> layout.tsx | `<Toaster />` rendered in layout, `toast()` called in page | Add Toaster component to layout |
| workflow.ts -> steps/*.ts | Import/export of step definitions | Move code, adjust imports |
| trace-event-card.tsx -> trace/*.tsx | Component composition | Extract sub-components, re-export |
| page.tsx -> hooks/*.ts | Custom hook calls | Extract useMemo blocks into hooks |

### External Services

| Service | Integration Pattern | Impact of Changes |
|---------|---------------------|-------------------|
| OpenRouter (LLM API) | Called via Mastra agents through `streamWithRetry` | Abort signal stops in-flight HTTP calls, saving API credits |
| Sonner (npm package) | `toast()` imperative API, `<Toaster />` component | New dependency, ~10KB gzipped |
| Mastra framework | Provides `abortSignal` in step execute context | No framework changes needed |

## Build Order Recommendation

These three features are independent and could be built in any order. However, the recommended sequence considers dependency and risk:

1. **Abort signal propagation** (lowest risk, highest value)
   - Purely backend change to workflow.ts
   - No new dependencies
   - Saves real money (stops wasted API calls)
   - Can be verified by aborting during a solve and confirming agent calls stop

2. **File refactoring** (medium risk, structural improvement)
   - Pure structural change, no behavioral impact
   - Verified with `npx tsc --noEmit`
   - Best done AFTER abort propagation so the abort changes are already in the files being split
   - Makes all future work on the codebase easier

3. **Toast notifications** (lowest risk, polish)
   - New dependency (sonner)
   - Purely additive -- no existing code changes beyond adding `<Toaster />` and `toast()` calls
   - Can be built independently of the other two
   - Best done AFTER refactoring because toast calls go in page.tsx which will be slimmer after extraction

**Rationale for this order:**
- Abort first because it fixes a real cost problem and the code change is small and well-understood
- Refactoring second because it restructures files that were just touched by abort work, and it makes the toast integration cleaner
- Toasts last because they are purely additive polish and benefit from the cleaner page.tsx

## Sources

- Mastra workflow step types: `node_modules/@mastra/core/dist/workflows/step.d.ts` (line 47: `abortSignal: AbortSignal`)
- Mastra workflow types: `node_modules/@mastra/core/dist/workflows/workflow.d.ts` (line 387: `get abortController()`, line 392: `cancel()`)
- Existing abort support in agent-utils: `src/mastra/workflow/agent-utils.ts` (full abort signal merging, retry-skip, backoff abort)
- AI SDK `useChat` stop: closes client stream, Mastra detects and fires abort controller
- Sonner/shadcn integration: [shadcn/ui Sonner docs](https://ui.shadcn.com/docs/components/radix/sonner)
- Design system: `DESIGN.md` (--radius: 0, cyanotype theme, status colors)

---
*Architecture research for: LO-Solver v1.2 abort propagation, file refactoring, and toast notifications*
*Researched: 2026-03-03*
