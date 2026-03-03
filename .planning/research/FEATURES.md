# Feature Research

**Domain:** Abort propagation, file refactoring, and toast notifications for an existing AI agent workflow app (LO-Solver v1.2)
**Researched:** 2026-03-03
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

These are the minimum behaviors expected once the v1.2 milestone claims "better abort behavior, cleaner codebase, better user feedback."

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Abort stops in-flight LLM calls | Abort button already exists; users expect it to actually stop API spend, not just hide the UI | MEDIUM | `streamWithRetry` already accepts `abortSignal` but workflow steps never pass one. The plumbing exists -- need to wire it through. |
| Abort signal checked between workflow steps | Mastra `Run.cancel()` prevents subsequent steps but running steps continue unless they check the signal | LOW | Mastra already does this at the step boundary level via `.then()` chain. Need to verify `handleWorkflowStream` passes the signal. |
| Toast on workflow start | User clicks Solve and needs confirmation something happened, especially since the collapsible input closes | LOW | Single `toast()` call on submit. |
| Toast on workflow complete (success) | Workflow takes 2-10+ minutes; user may switch tabs. Need a non-blocking notification. | LOW | Fire on `workflowStatus === 'completed'`. |
| Toast on workflow abort | Confirm abort action was received. Currently only the step progress bar changes color. | LOW | Fire when `stop()` is called and status transitions. |
| Toast on workflow error/failure | Distinguish between abort (intentional) and failure (unexpected) | LOW | Fire on `workflowStatus === 'failed'`. |
| Large files identified and split | 1,399-line `workflow.ts` and 898-line `trace-event-card.tsx` are maintenance liabilities | HIGH | `workflow.ts` contains 3 step definitions plus the workflow composition. Each step is a natural extraction unit. |
| Extracted modules re-export cleanly | After splitting, imports across the codebase should not break; barrel files preserve ergonomics | LOW | Re-export from the original path or a shared index. |

### Differentiators (Competitive Advantage)

Features that go beyond the minimum v1.2 scope but add notable quality.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cost-warning toast when API spend gets high | Workflow calls multiple LLMs; a toast at estimated cost thresholds protects the developer's wallet | MEDIUM | Requires token counting from agent responses. Could estimate from model pricing. Deferred -- no token tracking infrastructure today. |
| Abort drains gracefully with partial results | Instead of hard-cutting, let the current agent finish and return partial rules/vocab | HIGH | Would require workflow-level "soft abort" flag in RequestContext. The partial-result display already works (rules/vocab panels update live). Not in scope for v1.2 but architecturally possible. |
| Toast with "undo" for abort | Sonner supports action buttons; could offer a brief "undo" window before propagating the abort | LOW | Sonner's `toast()` accepts an `action` prop. Nice UX touch but adds confusion about timing. |
| Progress toast with elapsed time | Long-running workflow shows a persistent toast with elapsed time that updates | MEDIUM | Sonner supports `toast.loading()` with promises. Could replace or complement the step progress bar. Probably redundant given the existing progress bar. |
| Custom toast styling matching blueprint theme | Sonner can be styled with CSS. Matching the cyanotype design system keeps visual consistency. | LOW | Sonner `<Toaster />` accepts `toastOptions` with `className` and `style` overrides. shadcn/ui Sonner component already handles this. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Force-kill LLM requests server-side | "I want abort to be instant" | HTTP connections to OpenRouter cannot be forcibly terminated mid-response from the server. AbortSignal is cooperative -- the fetch cancels, but OpenRouter may still bill for the completion. | Pass AbortSignal to all agent calls; accept that billing granularity is per-request, not per-token. The signal prevents *new* requests and stops *reading* the stream. |
| Split every file over 200 lines | "Smaller files are always better" | Many files (e.g., `workflow-schemas.ts` at 405 lines, `agent-utils.ts` at 331 lines) are cohesive single-concern modules. Splitting them would scatter related logic across files for no readability gain. | Apply a heuristic: split files with *multiple distinct responsibilities*, not just high line counts. Target files with 2+ distinct step/component definitions. |
| Toast for every trace event | "Show toasts for agent start/end/tool calls" | The workflow fires dozens of events per run. Toasting each one would flood the screen and obscure important notifications. | Reserve toasts for workflow-level lifecycle events only (start, complete, abort, error). The trace panel handles granular events. |
| Microservice-style file splitting | "Each function in its own file" | Over-decomposition causes import spaghetti and makes code harder to navigate. A 50-line file with 3 imports from siblings is worse than a 200-line file with everything in one place. | Split by *responsibility boundary*, not by function. One file per workflow step, one file per UI component. |
| Replace Radix toast with Sonner | "Radix toast is already in package-lock" | Radix toast is a transitive dependency (from shadcn/ui), not directly used. No toast component is currently rendered. There is nothing to replace. | Install Sonner fresh via `npx shadcn@latest add sonner`. This is the shadcn-recommended toast solution. |

## Feature Dependencies

```
[Abort signal in RequestContext]
    |
    +--requires--> [Understand handleWorkflowStream abort flow]
    |                  (How does useChat stop() reach workflow steps?)
    |
    +--requires--> [Pass AbortSignal to streamWithRetry calls]
                       (11 call sites in workflow.ts need the signal)

[Toast notifications]
    |
    +--requires--> [Install Sonner + Toaster component]
    |
    +--requires--> [Style Toaster to match blueprint theme]
    |
    +--then-enables--> [Toast on start / complete / abort / error]

[File refactoring]
    |
    +--independent--> [Split workflow.ts into per-step files]
    |
    +--independent--> [Split trace-event-card.tsx into sub-components]
    |
    +--independent--> [Split page.tsx hooks/logic into custom hooks]

[Abort propagation] --conflicts-with--> [File refactoring of workflow.ts]
    (Do not refactor workflow.ts AND add abort signals in the same phase.
     One changes structure, the other changes behavior. Do them sequentially.)
```

### Dependency Notes

- **Abort signal requires understanding the `handleWorkflowStream` -> step execution path:** The `useChat` hook's `stop()` function cancels the client-side fetch. On the server, `handleWorkflowStream` should receive this as a request abort. Need to verify whether Mastra propagates this to `step.execute()` as an AbortSignal available in the step context, or if a manual approach (storing an AbortController in RequestContext) is needed.
- **Toast installation is a prerequisite for all toast features:** Sonner is not currently installed. The shadcn/ui Sonner component (`npx shadcn@latest add sonner`) handles the setup including the `<Toaster />` provider.
- **File refactoring conflicts with abort propagation timing:** Both touch `workflow.ts` heavily. Refactoring first (structural change) then adding abort (behavioral change) is safer than doing both at once. Alternatively, add abort first (smaller diff, behavior-only) then refactor (purely structural).
- **Toast features are fully independent** of abort and refactoring. Can be done in any order.

## MVP Definition

### Must Have (v1.2 Scope)

- [x] Abort signal propagated to all `streamWithRetry` calls in workflow steps -- stops API spend on abort
- [x] Sonner toast on workflow start, complete, abort, and error -- non-blocking lifecycle feedback
- [x] `workflow.ts` split into per-step modules (extraction, hypothesis, answer) -- largest file goes from 1,399 lines to ~200-400 each
- [x] `page.tsx` logic extracted into custom hooks -- 824 lines is manageable but state/effect logic is dense

### Add If Time Permits (v1.2 Stretch)

- [ ] `trace-event-card.tsx` split into renderer sub-components -- 898 lines with multiple card type renderers
- [ ] Custom Sonner styling matching blueprint/cyanotype theme -- functional toasts first, styled toasts second
- [ ] Abort signal checked mid-step (between agent calls within a step) -- prevents starting the *next* agent call when abort is signaled

### Future Consideration (v1.3+)

- [ ] Cost-warning toasts based on token tracking -- requires instrumentation not yet built
- [ ] Graceful abort with partial result preservation -- complex workflow state management
- [ ] `page.tsx` further decomposition into layout + controller pattern -- only needed if more features are added to the solver page

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Abort propagation to agent calls | HIGH (saves money) | MEDIUM (11 call sites, need to find signal source) | P1 |
| Toast on workflow lifecycle events | MEDIUM (quality of life) | LOW (install + 4 toast calls) | P1 |
| Split `workflow.ts` into step files | MEDIUM (maintainability) | MEDIUM (careful extraction, re-exports) | P1 |
| Split `page.tsx` into hooks | MEDIUM (maintainability) | MEDIUM (extract state + effects) | P2 |
| Split `trace-event-card.tsx` | LOW (internal quality) | MEDIUM (identify sub-components) | P2 |
| Custom toast theme styling | LOW (aesthetics) | LOW (CSS overrides) | P2 |
| Mid-step abort checking | MEDIUM (faster stop) | LOW (add signal checks between agent calls) | P2 |
| Cost-warning toasts | MEDIUM (wallet protection) | HIGH (token tracking infra) | P3 |
| Graceful abort with partial results | LOW (nice to have) | HIGH (state management) | P3 |

**Priority key:**
- P1: Must have for v1.2 milestone
- P2: Should have, add when possible within v1.2
- P3: Nice to have, defer to future milestones

## Implementation Details

### Abort Signal Propagation

**Current state:** The abort button calls `useChat`'s `stop()`, which aborts the client-side fetch request. On the server, `handleWorkflowStream` wraps a Mastra workflow run. Mastra's `Run.cancel()` triggers AbortSignal to notify running steps. However, the workflow steps in `workflow.ts` never read or forward any abort signal to `streamWithRetry`.

**What needs to happen:**
1. Determine how `handleWorkflowStream` exposes the abort signal (check if `step.execute()` receives it in its context, or if it needs to be wired manually)
2. If Mastra provides the signal in the step's execute context, read it and pass to every `streamWithRetry` call
3. If Mastra does NOT provide it, create an AbortController, store it in RequestContext, and wire the cancellation manually from the API route
4. `streamWithRetry` and `generateWithRetry` already handle AbortSignal correctly (check before retry, merge with timeout signal, abort during backoff). No changes needed in `agent-utils.ts`.

**Key risk:** Mastra v1.8.0 may not propagate the signal to step execution contexts. The [GitHub issue #11063](https://github.com/mastra-ai/mastra/issues/11063) about sub-workflow signal propagation is still open. Need to verify with docs or testing.

**Call sites to update (11 in workflow.ts):**
- Line 89: extractionStep streamWithRetry
- Line 270: dispatcherResponse
- Line 367: improverDispatcherResponse
- Line 500: hypothesizerResponse
- Line 618: verifierResponse
- Line 684: extractorResponse
- Line 850: synthesizerResponse
- Line 958: convergenceVerifierResponse
- Line 1019: convergenceExtractorResponse
- Line 1296: answererResponse
- Plus the tester tool calls in `03a-rule-tester-tool.ts` and `03a-sentence-tester-tool.ts`

### Toast Notifications

**Library:** Sonner via shadcn/ui (`npx shadcn@latest add sonner`)

**Installation:**
1. `npx shadcn@latest add sonner` -- installs sonner, creates `src/components/ui/sonner.tsx`
2. Add `<Toaster />` to root layout (`src/app/layout.tsx`)
3. Import and call `toast()` from `sonner` in `page.tsx`

**Toast events:**
| Event | Toast Type | Message | Trigger |
|-------|-----------|---------|---------|
| Workflow start | `toast()` (default) | "Solving problem..." | `handleSolve` callback |
| Workflow complete | `toast.success()` | "Workflow complete" with duration | `workflowStatus === 'completed'` |
| Workflow aborted | `toast.warning()` | "Workflow aborted" | `stop()` called + status transition |
| Workflow error | `toast.error()` | "Workflow failed" with error message | `workflowStatus === 'failed'` |

**Styling:** Sonner's `<Toaster />` component accepts `theme`, `toastOptions`, and CSS class overrides. For the cyanotype theme: dark theme base, override background to `var(--card)`, border to `var(--border)`, text to `var(--foreground)`, and accent colors per toast type.

### File Refactoring Targets

**`workflow.ts` (1,399 lines) -- PRIMARY TARGET**

Current structure (3 monolithic step definitions + composition):
- Lines 1-47: Imports
- Lines 48-134: `extractionStep` (~86 lines)
- Lines 136-1158: `multiPerspectiveHypothesisStep` (~1,022 lines, the real problem)
- Lines 1159-1384: `answerQuestionsStep` (~225 lines)
- Lines 1386-1399: Workflow composition

Recommended split:
| New File | Content | Approx Lines |
|----------|---------|-------------|
| `01-extraction-step.ts` | `extractionStep` definition | ~100 |
| `02-hypothesis-step.ts` | `multiPerspectiveHypothesisStep` definition | ~1,050 |
| `04-answer-step.ts` | `answerQuestionsStep` definition | ~240 |
| `workflow.ts` | Imports steps, composes workflow chain, exports | ~30 |

Note: `multiPerspectiveHypothesisStep` at 1,022 lines is still large after extraction. It contains dispatch, hypothesize, verify, synthesize, and convergence logic in nested loops. Further splitting into sub-functions (not separate steps) within that file is advisable but is a secondary concern.

**`trace-event-card.tsx` (898 lines) -- SECONDARY TARGET**

Contains rendering logic for multiple card types (agent, tool, rule-test, iteration, etc.). Each card type renderer could be its own component file.

**`page.tsx` (824 lines) -- SECONDARY TARGET**

Dense with state management, effects, memoized computations, and layout. Custom hooks can extract:
- Progress step computation logic
- Trace event processing
- Vocabulary/rules data extraction from message parts
- Layout animation logic

## Sources

- [Mastra Run.cancel() documentation](https://mastra.ai/reference/workflows/run-methods/cancel) -- Step cancellation uses AbortSignal; steps must actively check it. HIGH confidence.
- [Mastra GitHub Issue #11063 -- AbortSignal not propagated to sub-workflows](https://github.com/mastra-ai/mastra/issues/11063) -- Open issue, signals don't cascade to child workflows. MEDIUM confidence (may be fixed in newer versions).
- [Mastra GitHub Issue #10874 -- AbortSignal propagation to sub-agents](https://github.com/mastra-ai/mastra/issues/10874) -- CLOSED March 2, 2026. Agent network abort propagation merged in PR #13491. HIGH confidence.
- [AI SDK Stopping Streams documentation](https://ai-sdk.dev/docs/advanced/stopping-streams) -- `useChat` `stop()` cancels client fetch, server receives via `abortSignal` on request. HIGH confidence.
- [Sonner GitHub repository](https://github.com/emilkowalski/sonner) -- Opinionated React toast library, TypeScript-first. HIGH confidence.
- [shadcn/ui Sonner integration](https://www.shadcn.io/ui/sonner) -- Official shadcn integration via `npx shadcn@latest add sonner`. HIGH confidence.
- Codebase analysis of `workflow.ts`, `agent-utils.ts`, `page.tsx`, `trace-event-card.tsx` -- direct inspection. HIGH confidence.

---
*Feature research for: LO-Solver v1.2 Cleanup & Quality milestone*
*Researched: 2026-03-03*
