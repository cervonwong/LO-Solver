# Separate Verify and Improve into Distinct UI Blocks

## Problem

The verify-improve loop currently renders as a single block in both the progress bar and the right panel (DevTracePanel). In the progress bar, verify and improve sub-steps appear as small circles (V1, I1, V2, I2) clustered inside one step position. In the right panel, all events are grouped under one "Verify / Improve" section with iteration tabs (Iter 1, Iter 2) to toggle between iterations.

This is confusing -- verify and improve are conceptually distinct phases, and the iteration toggle hides information. Each verify and each improve should be its own block.

## Decision: UI-Only Split (Approach B)

The backend workflow uses a single Mastra step (`verifyImproveLoopStep`) run via `.dountil()`. Mastra's `.dountil()` only accepts a single step, and there is no clean way to alternate two steps in a loop. Restructuring the backend (Approach A) is not feasible without fighting the framework.

Instead, we derive separate UI blocks from the existing phase boundary events (`data-verify-improve-phase`) that the backend already emits. These events carry `iteration` and `phase` fields that precisely delineate which events belong to each verify and improve phase. No backend changes are needed.

## Design

### Event Layer (`workflow-events.ts`)

Add `UIStepId` -- a type that extends the existing `StepId` with dynamic verify/improve identifiers:

```typescript
type UIStepId = StepId | `verify-${number}` | `improve-${number}`;
```

The backend `StepId` type stays unchanged. `UIStepId` is used by all UI and grouping code.

Add `getUIStepLabel(id: UIStepId): string` -- a function that returns human-readable labels. For the four original step IDs it returns the same values as `STEP_LABELS`. For verify/improve IDs it returns "Verify 1", "Improve 2", etc.

### Event Grouping (`trace-utils.ts`)

Modify `groupEventsByStep()` to produce groups keyed by `UIStepId`. When processing events from `verify-improve-rules-loop`, the function uses `data-verify-improve-phase` boundary events to split them into separate groups:

- `verify-start` for iteration N opens a new group with ID `verify-N`
- `improve-start` for iteration N opens a new group with ID `improve-N`
- Events between boundaries (tool calls, agent reasoning, iteration updates) go into whichever group is currently open
- Phase events themselves are excluded from group contents (they are structural markers)

`StepGroup.stepId` changes from `StepId` to `UIStepId`.

Remove `groupEventsByIteration()` and `IterationGroup` -- no longer needed.

### Progress Bar (`step-progress.tsx`)

Replace the fixed 4-step bar with a dynamic step list. The bar starts with Extract, Hypothesize, and Answer. As verify-improve iterations run, new full-size steps (Verify 1, Improve 1, Verify 2, etc.) are inserted between Hypothesize and Answer.

Remove:

- `STEP_ORDER` constant (fixed `StepId[]` array)
- `buildSubSteps()` function and `SubStep` type
- `LoopState` interface
- Sub-step cluster rendering (small circles, sub connectors)

New props: a flat ordered list of `{ id: UIStepId, label: string, status: StepStatus }[]` built by the parent. Every step renders as a full-size `StepCircle`.

Click handler on each step scrolls the right panel to the corresponding section.

### Right Panel (`dev-trace-panel.tsx`)

Remove special-casing for verify-improve:

- Remove the `isVerifyImprove` branch in `StepSection`
- Remove the `IterationTabs` component entirely
- Every group renders the same way: header with label/badge/event count, then `EventList`

Each section gets an `id` attribute (e.g., `id="trace-verify-1"`) for scroll-to targeting from the progress bar.

### Event Cards (`trace-event-card.tsx`)

Remove or simplify the `data-verify-improve-phase` card rendering. Phase events are structural markers consumed by the grouping logic, not content to display.

### Page (`page.tsx`)

Refactor the `loopState` derivation (lines 184-262) into a function that produces the ordered step list with statuses. It reads phase events and iteration updates to determine which verify/improve steps exist and their statuses (pending, running, success, failed).

### Backend

No changes. The workflow continues to emit the same events with `stepId: 'verify-improve-rules-loop'`. The `data-verify-improve-phase` events already provide the boundary information needed.

### CLAUDE.md

Add documentation about the `UIStepId` pattern: backend uses `StepId`, frontend derives `UIStepId` from phase boundary events, `getUIStepLabel()` replaces static `STEP_LABELS` for rendering.

## Files Changed

| File                                  | Change                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/lib/workflow-events.ts`          | Add `UIStepId`, `getUIStepLabel()`                                                                  |
| `src/lib/trace-utils.ts`              | Modify `groupEventsByStep()` to split by phase; remove `groupEventsByIteration()`, `IterationGroup` |
| `src/components/step-progress.tsx`    | Replace sub-step cluster with flat dynamic step list                                                |
| `src/components/dev-trace-panel.tsx`  | Remove `IterationTabs`, remove special-casing; add scroll anchor IDs                                |
| `src/components/trace-event-card.tsx` | Remove/simplify phase event card rendering                                                          |
| `src/app/page.tsx`                    | Refactor `loopState` into ordered step list builder                                                 |
| `CLAUDE.md`                           | Document `UIStepId` pattern                                                                         |
