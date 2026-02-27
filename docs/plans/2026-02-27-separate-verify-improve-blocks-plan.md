# Separate Verify/Improve Blocks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the single "Verify / Improve" block into separate Verify 1, Improve 1, Verify 2, Improve 2, etc. blocks in both the progress bar and the right panel, with dynamic growth during execution.

**Architecture:** The backend stays unchanged. We introduce `UIStepId` -- a type extending `StepId` with `verify-${number}` and `improve-${number}` patterns. The event grouping logic in `trace-utils.ts` uses existing `data-verify-improve-phase` boundary events to split the single step's events into separate groups. The progress bar and right panel render these as flat, equal-weight steps.

**Tech Stack:** TypeScript, React, Next.js, shadcn/ui

---

### Task 1: Add `UIStepId` type and label function to `workflow-events.ts`

**Files:**

- Modify: `src/lib/workflow-events.ts`

**Step 1: Add `UIStepId` type**

Add after the existing `StepId` type (line 5):

```typescript
export type UIStepId = StepId | `verify-${number}` | `improve-${number}`;
```

**Step 2: Add `getUIStepLabel()` function**

Add after the `STEP_LABELS` record (line 12):

```typescript
export function getUIStepLabel(id: UIStepId): string {
  if (id in STEP_LABELS) return STEP_LABELS[id as StepId];
  const verifyMatch = id.match(/^verify-(\d+)$/);
  if (verifyMatch) return `Verify ${verifyMatch[1]}`;
  const improveMatch = id.match(/^improve-(\d+)$/);
  if (improveMatch) return `Improve ${improveMatch[1]}`;
  return id;
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No new errors (only the pre-existing `globals.css` error).

**Step 4: Commit**

```
Add UIStepId type and getUIStepLabel function
```

---

### Task 2: Refactor `trace-utils.ts` to split verify-improve events by phase

**Files:**

- Modify: `src/lib/trace-utils.ts`

**Step 1: Update `StepGroup` to use `UIStepId`**

Change the `StepGroup` interface (line 4-10):

```typescript
import type { WorkflowTraceEvent, StepId, UIStepId } from './workflow-events';
import { STEP_LABELS, getUIStepLabel } from './workflow-events';

export interface StepGroup {
  stepId: UIStepId;
  label: string;
  startTime: string | undefined;
  durationMs: number | undefined;
  events: WorkflowTraceEvent[];
}
```

**Step 2: Rewrite `groupEventsByStep()` to split by phase**

Replace the current implementation (lines 19-50). The new logic:

1. Walk events in order.
2. For non-verify-improve events, group by `StepId` as before.
3. For verify-improve events, use `data-verify-improve-phase` events to open new groups:
   - `verify-start` for iteration N → new group with `stepId: 'verify-N'`
   - `improve-start` for iteration N → new group with `stepId: 'improve-N'`
   - Other verify-improve events (tool calls, agent reasoning, iteration updates) go into the currently open group.
   - Phase events themselves are excluded from the group's `events` array.
4. Insert these groups in order between the hypothesize and answer groups.

```typescript
export function groupEventsByStep(events: WorkflowTraceEvent[]): StepGroup[] {
  const nonLoopMap = new Map<StepId, StepGroup>();
  const nonLoopOrder: StepId[] = [];
  const loopGroups: StepGroup[] = [];
  let currentLoopGroup: StepGroup | null = null;

  for (const event of events) {
    const rawStepId = getRawStepId(event);
    if (!rawStepId) continue;

    if (rawStepId !== 'verify-improve-rules-loop') {
      // Non-loop event: group by StepId as before
      let group = nonLoopMap.get(rawStepId);
      if (!group) {
        group = {
          stepId: rawStepId,
          label: getUIStepLabel(rawStepId),
          startTime: undefined,
          durationMs: undefined,
          events: [],
        };
        nonLoopMap.set(rawStepId, group);
        nonLoopOrder.push(rawStepId);
      }
      if (event.type === 'data-step-start') group.startTime = event.data.timestamp;
      else if (event.type === 'data-step-complete') group.durationMs = event.data.durationMs;
      group.events.push(event);
      continue;
    }

    // Loop event: split by phase boundaries
    if (event.type === 'data-verify-improve-phase') {
      const { iteration, phase } = event.data;
      if (phase === 'verify-start') {
        currentLoopGroup = {
          stepId: `verify-${iteration}` as UIStepId,
          label: getUIStepLabel(`verify-${iteration}` as UIStepId),
          startTime: event.data.timestamp,
          durationMs: undefined,
          events: [],
        };
        loopGroups.push(currentLoopGroup);
      } else if (phase === 'improve-start') {
        currentLoopGroup = {
          stepId: `improve-${iteration}` as UIStepId,
          label: getUIStepLabel(`improve-${iteration}` as UIStepId),
          startTime: event.data.timestamp,
          durationMs: undefined,
          events: [],
        };
        loopGroups.push(currentLoopGroup);
      } else if (phase === 'verify-complete' || phase === 'improve-complete') {
        if (currentLoopGroup) {
          // Compute duration from start to complete
          const startMs = currentLoopGroup.startTime
            ? new Date(currentLoopGroup.startTime).getTime()
            : 0;
          const endMs = new Date(event.data.timestamp).getTime();
          if (startMs > 0) currentLoopGroup.durationMs = endMs - startMs;
        }
      }
      // Phase events are structural markers -- don't add to events array
      continue;
    }

    // Non-phase loop event: add to current group
    if (event.type === 'data-step-start' || event.type === 'data-step-complete') {
      // Step-level start/complete are for the overall loop step -- skip
      continue;
    }
    if (currentLoopGroup) {
      currentLoopGroup.events.push(event);
    }
  }

  // Assemble: non-loop steps in order, with loop groups inserted after 'initial-hypothesis'
  const result: StepGroup[] = [];
  for (const stepId of nonLoopOrder) {
    result.push(nonLoopMap.get(stepId)!);
    if (stepId === 'initial-hypothesis') {
      result.push(...loopGroups);
    }
  }
  // If initial-hypothesis hasn't appeared yet but we have loop groups, append them
  if (!nonLoopOrder.includes('initial-hypothesis') && loopGroups.length > 0) {
    result.push(...loopGroups);
  }
  return result;
}
```

**Step 3: Remove `groupEventsByIteration()` and `IterationGroup`**

Delete the `IterationGroup` interface (lines 12-16) and `groupEventsByIteration()` function (lines 53-78).

**Step 4: Rename `getStepId` to `getRawStepId`**

The existing `getStepId` helper (lines 139-152) returns backend `StepId`. Rename it to `getRawStepId` for clarity. It stays unchanged in logic.

**Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: Errors in files that import removed symbols (`groupEventsByIteration`, `IterationGroup`). These will be fixed in subsequent tasks.

**Step 6: Commit**

```
Refactor trace-utils to split verify-improve events into separate UI step groups
```

---

### Task 3: Update `dev-trace-panel.tsx` to remove iteration tabs

**Files:**

- Modify: `src/components/dev-trace-panel.tsx`

**Step 1: Remove `IterationTabs` and special-casing**

Remove the `IterationTabs` component (lines 88-116). Remove the `groupEventsByIteration` import (line 9). In `StepSection`, remove the `isVerifyImprove` variable (line 50) and the conditional rendering (lines 78-79). Every group now renders `<EventList>`.

The updated `StepSection`:

```typescript
function StepSection({ group, isRunning }: StepSectionProps) {
  const isActive = group.durationMs === undefined && group.startTime !== undefined;

  const contentEvents = group.events.filter(
    (e) => e.type !== 'data-step-start' && e.type !== 'data-step-complete',
  );

  return (
    <section id={`trace-${group.stepId}`} className="rounded border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          {group.label}
          {isActive && isRunning && (
            <Badge variant="secondary" className="animate-pulse text-[10px]">
              Running
            </Badge>
          )}
          {group.durationMs !== undefined && (
            <Badge variant="outline" className="text-[10px]">
              {formatDuration(group.durationMs)}
            </Badge>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{contentEvents.length} events</span>
      </div>

      <div className="p-3">
        <EventList events={contentEvents} />
      </div>
    </section>
  );
}
```

Note the `id={`trace-${group.stepId}`}` attribute on the `<section>` for scroll targeting.

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No new errors (only pre-existing `globals.css` error).

**Step 3: Commit**

```
Remove iteration tabs from DevTracePanel, render all steps uniformly
```

---

### Task 4: Remove phase event card from `trace-event-card.tsx`

**Files:**

- Modify: `src/components/trace-event-card.tsx`

**Step 1: Remove the `data-verify-improve-phase` case**

In the `TraceEventCard` switch statement, remove the `case 'data-verify-improve-phase':` block (lines 124-134). Phase events are now consumed by the grouping logic and never reach event cards.

Also remove the `formatPhase` helper if it exists and is only used by this case.

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: TypeScript may warn about non-exhaustive switch. If so, leave a comment or add a default case. Otherwise, no new errors.

**Step 3: Commit**

```
Remove phase event card rendering from TraceEventCard
```

---

### Task 5: Refactor `step-progress.tsx` to render a dynamic flat step list

**Files:**

- Modify: `src/components/step-progress.tsx`

**Step 1: Define new props interface**

Replace the current props and supporting types. Remove `STEP_ORDER`, `LoopState`, `CompletedIteration`, `SubStep`, `buildSubSteps()`. The component receives a pre-built step list:

```typescript
import { cn } from '@/lib/utils';
import type { UIStepId } from '@/lib/workflow-events';

export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

export interface ProgressStep {
  id: UIStepId;
  label: string;
  status: StepStatus;
}

interface StepProgressProps {
  steps: ProgressStep[];
  statusMessage?: string | undefined;
  onStepClick?: (stepId: UIStepId) => void;
}
```

**Step 2: Simplify rendering**

Remove the sub-step cluster branch. Every step renders as a full-size `StepCircle` with `Connector` between them. Remove the `size` prop from `StepCircle` and `variant` prop from `Connector` (only one size now).

```typescript
function StepCircle({ status, label }: { status: StepStatus; label: string | number }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border text-xs',
        status === 'running' && 'animate-pulse border-foreground bg-foreground text-background',
        status === 'success' && 'border-foreground bg-foreground text-background',
        status === 'failed' && 'border-destructive bg-destructive text-background',
        status === 'pending' && 'border-border text-muted-foreground',
      )}
    >
      {status === 'success' ? (
        <span>&#10003;</span>
      ) : status === 'failed' ? (
        <span>&#10007;</span>
      ) : (
        label
      )}
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className={cn('mx-1 h-px min-w-3 flex-1', active ? 'bg-foreground' : 'bg-border')} />
  );
}

export function StepProgress({ steps, statusMessage, onStepClick }: StepProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className="flex items-center"
            onClick={() => onStepClick?.(step.id)}
            role={onStepClick ? 'button' : undefined}
            style={onStepClick ? { cursor: 'pointer' } : undefined}
          >
            {i > 0 && (
              <Connector active={step.status === 'success' || step.status === 'running'} />
            )}
            <div className="flex flex-col items-center gap-1">
              <StepCircle status={step.status} label={i + 1} />
              <span
                className={cn(
                  'whitespace-nowrap text-xs',
                  step.status === 'running' && 'font-bold text-foreground',
                  step.status === 'success' && 'text-foreground',
                  step.status === 'failed' && 'text-destructive',
                  step.status === 'pending' && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      {statusMessage && (
        <p className="mt-4 text-center text-sm text-muted-foreground">{statusMessage}</p>
      )}
    </div>
  );
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: Errors in `page.tsx` due to changed props and removed `STEP_ORDER` export. Fixed in next task.

**Step 4: Commit**

```
Rewrite StepProgress as flat dynamic step list
```

---

### Task 6: Refactor `page.tsx` to build the step list and wire up scroll-to

**Files:**

- Modify: `src/app/page.tsx`

**Step 1: Update imports**

Replace:

```typescript
import { StepProgress, STEP_ORDER, type StepStatus } from '@/components/step-progress';
import type { StepId, WorkflowTraceEvent, VerifyImprovePhaseEvent } from '@/lib/workflow-events';
```

With:

```typescript
import { StepProgress, type StepStatus, type ProgressStep } from '@/components/step-progress';
import { getUIStepLabel, type UIStepId } from '@/lib/workflow-events';
import type { StepId, WorkflowTraceEvent, VerifyImprovePhaseEvent } from '@/lib/workflow-events';
```

**Step 2: Replace `STEP_ORDER`-based status derivation and `loopState` with a `progressSteps` builder**

Remove the `STEP_ORDER` loop (lines 102-116) and the `loopState` useMemo (lines 184-262). Replace with a single `useMemo` that builds the `ProgressStep[]` array:

```typescript
const BASE_STEP_ORDER: StepId[] = ['extract-structure', 'initial-hypothesis', 'answer-questions'];

const progressSteps: ProgressStep[] = useMemo(() => {
  const result: ProgressStep[] = [];

  // Helper to derive status for a backend StepId
  function getStepStatus(stepId: StepId): StepStatus {
    const step = steps[stepId];
    if (!step) return 'pending';
    if (step.status === 'running') return 'running';
    if (step.status === 'success') return 'success';
    if (step.status === 'failed') return 'failed';
    return 'pending';
  }

  // Add Extract and Hypothesize
  result.push({
    id: 'extract-structure',
    label: getUIStepLabel('extract-structure'),
    status: getStepStatus('extract-structure'),
  });
  result.push({
    id: 'initial-hypothesis',
    label: getUIStepLabel('initial-hypothesis'),
    status: getStepStatus('initial-hypothesis'),
  });

  // Derive verify/improve steps from phase events
  const phaseEvents = allParts.filter(
    (p) => 'type' in p && (p as { type: string }).type === 'data-verify-improve-phase',
  ) as unknown as VerifyImprovePhaseEvent[];

  const loopStatus = getStepStatus('verify-improve-rules-loop');
  const loopDone = loopStatus === 'success' || loopStatus === 'failed';

  // Track which verify/improve steps have been seen
  const seenVerify = new Set<number>();
  const seenImprove = new Set<number>();
  let latestPhase: { iteration: number; phase: string } | null = null;

  for (const event of phaseEvents) {
    const { iteration, phase } = event.data;
    latestPhase = { iteration, phase };

    if (phase === 'verify-start' && !seenVerify.has(iteration)) {
      seenVerify.add(iteration);
    }
    if (phase === 'improve-start' && !seenImprove.has(iteration)) {
      seenImprove.add(iteration);
    }
  }

  // Build verify/improve steps in order
  const maxIter = Math.max(0, ...seenVerify, ...seenImprove);
  for (let i = 1; i <= maxIter; i++) {
    if (seenVerify.has(i)) {
      let status: StepStatus = 'pending';
      if (latestPhase && latestPhase.iteration === i && latestPhase.phase === 'verify-start') {
        status = loopDone ? (loopStatus === 'success' ? 'success' : 'failed') : 'running';
      } else {
        // Verify for this iteration has completed (we're past it)
        status = 'success';
      }
      result.push({
        id: `verify-${i}` as UIStepId,
        label: getUIStepLabel(`verify-${i}` as UIStepId),
        status,
      });
    }
    if (seenImprove.has(i)) {
      let status: StepStatus = 'pending';
      if (latestPhase && latestPhase.iteration === i && latestPhase.phase === 'improve-start') {
        status = loopDone ? (loopStatus === 'success' ? 'success' : 'failed') : 'running';
      } else {
        status = 'success';
      }
      result.push({
        id: `improve-${i}` as UIStepId,
        label: getUIStepLabel(`improve-${i}` as UIStepId),
        status,
      });
    }
  }

  // Add Answer
  result.push({
    id: 'answer-questions',
    label: getUIStepLabel('answer-questions'),
    status: getStepStatus('answer-questions'),
  });

  return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [allParts.length, steps]);
```

**Step 3: Update `statusMessage` derivation**

Replace the `STEP_ORDER.find()` call with a lookup on `progressSteps`:

```typescript
const activeStep = progressSteps.find((s) => s.status === 'running');
const STATUS_MESSAGES: Record<string, string> = {
  'extract-structure': 'Extracting problem structure...',
  'initial-hypothesis': 'Generating linguistic rules and vocabulary...',
  'answer-questions': 'Applying rules to answer questions...',
};
const statusMessage =
  workflowStatus === 'success'
    ? 'Workflow complete.'
    : workflowStatus === 'failed' || workflowStatus === 'bailed'
      ? 'Workflow failed.'
      : activeStep
        ? (STATUS_MESSAGES[activeStep.id] ??
          (activeStep.id.startsWith('verify-')
            ? 'Verifying rules...'
            : activeStep.id.startsWith('improve-')
              ? 'Improving rules...'
              : 'Processing...'))
        : status === 'submitted' || status === 'streaming'
          ? 'Starting workflow...'
          : undefined;
```

**Step 4: Add scroll-to handler and update JSX**

Add a ref for the right panel scroll area and a click handler:

```typescript
const tracePanelRef = useRef<HTMLDivElement>(null);

const handleStepClick = useCallback((stepId: UIStepId) => {
  const el = document.getElementById(`trace-${stepId}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}, []);
```

Update the `StepProgress` usage:

```tsx
<StepProgress steps={progressSteps} statusMessage={statusMessage} onStepClick={handleStepClick} />
```

Remove the `loopState` prop.

**Step 5: Clean up unused imports**

Remove `STEP_ORDER` from imports. Remove `STEP_STATUS_MESSAGES` constant (replaced inline). Remove `VerifyImprovePhaseEvent` from the import if no longer used directly (it's still used in the `useMemo` cast -- keep if needed).

**Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: No new errors (only pre-existing `globals.css` error).

**Step 7: Commit**

```
Refactor page.tsx to build dynamic progress step list with scroll-to
```

---

### Task 7: Update `CLAUDE.md`

**Files:**

- Modify: `CLAUDE.md`

**Step 1: Add `UIStepId` documentation**

In the **Frontend (Next.js)** section, after the line about event types (line 44), add:

```markdown
- `UIStepId` extends backend `StepId` with `verify-${N}` and `improve-${N}` patterns, derived from `data-verify-improve-phase` boundary events. `getUIStepLabel()` produces display labels. The progress bar and trace panel use `UIStepId`; the backend continues to use `StepId`.
```

**Step 2: Commit**

```
Document UIStepId pattern in CLAUDE.md
```

---

### Task 8: Final verification

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Manual smoke test**

Run: `npm run dev`
Verify:

- Progress bar starts with Extract, Hypothesize, Answer (3 steps)
- When verify-improve loop starts, Verify 1 appears between Hypothesize and Answer
- If improve runs, Improve 1 appears after Verify 1
- Subsequent iterations add Verify 2, Improve 2, etc.
- Right panel shows flat sections: Extract, Hypothesize, Verify 1, Improve 1, ..., Answer
- No iteration tabs
- Clicking a step in the progress bar scrolls the right panel to that section

**Step 4: Commit any fixes**

If smoke testing reveals issues, fix and commit.
