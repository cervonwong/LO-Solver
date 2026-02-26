# Progress Bar Loop Expansion + Real-Time Tool Call Streaming — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix silent tool-call event dropping, expand the progress bar to show verify-improve loop iterations as sub-steps, and group tool calls in the trace panel for readability.

**Architecture:** Three changes: (1) Backend plumbing fix — pass the workflow step `writer` through `requestContext` so tools can emit events via the working pubsub channel. (2) New `data-verify-improve-phase` event type emitted at phase boundaries, consumed by a redesigned `StepProgress` component that dynamically inserts sub-step circles. (3) Frontend `ToolCallGroup` component that collapses consecutive same-name tool calls.

**Tech Stack:** TypeScript, Mastra workflows, Next.js 16, React 19, shadcn/ui, Tailwind CSS 4

**Design doc:** `docs/plans/2026-02-26-progress-bar-and-tool-streaming-design.md`

---

## Task 1: Add `step-writer` to RequestContext types

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/request-context-types.ts:26-38`

**Step 1: Add the new key to the interface**

In `request-context-types.ts`, add a `step-writer` key to `Workflow03RequestContext`:

```ts
export interface Workflow03RequestContext {
  /** Vocabulary state (mutable Map for vocabulary management) */
  'vocabulary-state': Map<string, VocabularyEntry>;

  /** Structured problem data (immutable through workflow) */
  'structured-problem': StructuredProblemData;

  /** Current rules (updated each iteration) */
  'current-rules': Rule[];

  /** Log file path for writing tool output */
  'log-file': string;

  /** Step writer for emitting trace events from tools (bypasses broken ctx.writer) */
  'step-writer': unknown;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 3: Commit**

```
git add src/mastra/03-per-rule-per-sentence-delegation/request-context-types.ts
git commit -m "Add step-writer key to Workflow03RequestContext"
```

---

## Task 2: Add `emitToolTraceEvent` helper

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/request-context-helpers.ts:1-12` (imports) and append at end

**Step 1: Add the helper function**

At the end of `request-context-helpers.ts`, add:

```ts
/**
 * Emit a trace event from a tool via the step writer stored in requestContext.
 * This bypasses the broken ctx.writer?.custom() path (Mastra does not pass
 * outputWriter to tools when called from workflow steps).
 */
export async function emitToolTraceEvent(
  requestContext: RequestContextGetter,
  event: { type: string; data: Record<string, unknown> },
): Promise<void> {
  if (!requestContext) return;
  const writer = requestContext.get('step-writer') as
    | { write?: (data: unknown) => Promise<void> }
    | undefined;
  await writer?.write?.(event);
}
```

Note: We use `RequestContextGetter` (the existing type alias at line 27) which is `{ get: (key: keyof Workflow03RequestContext) => unknown } | undefined`. This keeps it consistent with the other helper functions.

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 3: Commit**

```
git add src/mastra/03-per-rule-per-sentence-delegation/request-context-helpers.ts
git commit -m "Add emitToolTraceEvent helper for tool-to-step event emission"
```

---

## Task 3: Set `step-writer` in workflow steps

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/workflow.ts`

**Step 1: Set writer in Step 2 (initial-hypothesis)**

In the `initialHypothesisStep` execute function, after creating the `requestContext` (around line 362-366), add:

```ts
requestContext.set('step-writer', writer);
```

Add it right after the existing `requestContext.set('model-mode', ...)` line (line 366).

**Step 2: Set writer in Step 3 (verify-improve loop)**

In the `verifyImproveLoopStep` execute function, after creating the `requestContext` (around line 554-559), add:

```ts
requestContext.set('step-writer', writer);
```

Add it right after the existing `requestContext.set('model-mode', ...)` line (line 559).

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 4: Commit**

```
git add src/mastra/03-per-rule-per-sentence-delegation/workflow.ts
git commit -m "Pass step writer to requestContext for tool event emission"
```

---

## Task 4: Fix tool event emission in rule tester tools

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts`

**Step 1: Add import for `emitToolTraceEvent`**

Update the import from `request-context-helpers` (line 4-9) to include `emitToolTraceEvent`:

```ts
import {
  getStructuredProblem,
  getVocabularyArray,
  getCurrentRules,
  getLogFile,
  emitToolTraceEvent,
  type ToolExecuteContext,
} from './request-context-helpers';
```

**Step 2: Replace `ctx.writer?.custom()` in `testRuleTool`**

In `testRuleTool.execute` (around line 190-199), replace:

```ts
await ctx.writer?.custom({
  type: 'data-tool-call',
  data: {
    stepId: 'verify-improve-rules-loop',
    toolName: 'testRule',
    input: { title, description },
    result: result as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  },
});
```

With:

```ts
await emitToolTraceEvent(ctx?.requestContext, {
  type: 'data-tool-call',
  data: {
    stepId: 'verify-improve-rules-loop',
    toolName: 'testRule',
    input: { title, description },
    result: result as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  },
});
```

**Step 3: Replace `ctx.writer?.custom()` in `testRuleWithRulesetTool`**

In `testRuleWithRulesetTool.execute` (around line 255-264), make the same replacement:

```ts
await emitToolTraceEvent(ctx?.requestContext, {
  type: 'data-tool-call',
  data: {
    stepId: 'verify-improve-rules-loop',
    toolName: 'testRuleWithRuleset',
    input: { rule: { title: rule.title }, rulesetCount: ruleset.length },
    result: result as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  },
});
```

Note: For `testRuleWithRuleset`, the `stepId` should be `'initial-hypothesis'` when called from the hypothesizer, or `'verify-improve-rules-loop'` when called from the improver. Since these tools don't know which step called them, and both the hypothesizer and improver run within steps that set `step-writer`, the events will flow correctly regardless. The `stepId` in the event data is for frontend grouping — keep it as `'verify-improve-rules-loop'` for now since that's where most test calls happen. We can refine later if needed.

**Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 5: Commit**

```
git add src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts
git commit -m "Fix rule tester tools to emit events via step writer"
```

---

## Task 5: Fix tool event emission in sentence tester tools

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts`

**Step 1: Add import for `emitToolTraceEvent`**

Update the import from `request-context-helpers` (line 3-11) to include `emitToolTraceEvent`:

```ts
import {
  getProblemContext,
  getStructuredProblem,
  getCurrentRules,
  getVocabularyArray,
  getLogFile,
  normalizeTranslation,
  emitToolTraceEvent,
  type ToolExecuteContext,
} from './request-context-helpers';
```

**Step 2: Replace `ctx.writer?.custom()` in `testSentenceTool`**

In `testSentenceTool.execute` (around line 222-231), replace:

```ts
await ctx.writer?.custom({
  type: 'data-tool-call',
  data: {
    stepId: 'verify-improve-rules-loop',
    toolName: 'testSentence',
    input: { id, content },
    result: result as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  },
});
```

With:

```ts
await emitToolTraceEvent(ctx?.requestContext, {
  type: 'data-tool-call',
  data: {
    stepId: 'verify-improve-rules-loop',
    toolName: 'testSentence',
    input: { id, content },
    result: result as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  },
});
```

**Step 3: Replace `ctx.writer?.custom()` in `testSentenceWithRulesetTool`**

In `testSentenceWithRulesetTool.execute` (around line 298-307), replace:

```ts
    await ctx.writer?.custom({
```

With:

```ts
    await emitToolTraceEvent(ctx?.requestContext, {
```

(Keep the rest of the object identical.)

**Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 5: Commit**

```
git add src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts
git commit -m "Fix sentence tester tools to emit events via step writer"
```

---

## Task 6: Fix vocabulary tool event emission

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/vocabulary-tools.ts`

**Step 1: Add import for `emitToolTraceEvent`**

Update the import from `request-context-helpers` (line 4-8) to include `emitToolTraceEvent`:

```ts
import {
  getVocabularyState,
  getLogFile,
  emitToolTraceEvent,
  type ToolExecuteContext,
} from './request-context-helpers';
```

**Step 2: Replace all `ctx.writer?.custom()` calls**

There are 4 occurrences in vocabulary-tools.ts:

1. `addVocabulary` (line 96)
2. `updateVocabulary` (line 161)
3. `removeVocabulary` (line 222)
4. `clearVocabulary` (line 265)

For each one, replace `await ctx.writer?.custom({` with `await emitToolTraceEvent(ctx?.requestContext, {`.

The event objects stay identical — only the call target changes.

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 4: Commit**

```
git add src/mastra/03-per-rule-per-sentence-delegation/vocabulary-tools.ts
git commit -m "Fix vocabulary tools to emit events via step writer"
```

---

## Task 7: Add `VerifyImprovePhaseEvent` to workflow events

**Files:**

- Modify: `src/lib/workflow-events.ts`

**Step 1: Add the new event type**

After the `IterationUpdateEvent` interface (after line 80), add:

```ts
export interface VerifyImprovePhaseEvent {
  type: 'data-verify-improve-phase';
  data: {
    iteration: number;
    phase: 'verify-start' | 'verify-complete' | 'improve-start' | 'improve-complete';
    timestamp: string;
  };
}
```

**Step 2: Add to the union type**

Update `WorkflowTraceEvent` (line 82-88) to include the new event:

```ts
export type WorkflowTraceEvent =
  | StepStartEvent
  | StepCompleteEvent
  | AgentReasoningEvent
  | ToolCallEvent
  | VocabularyUpdateEvent
  | IterationUpdateEvent
  | VerifyImprovePhaseEvent;
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors (may show exhaustiveness warnings in switch statements — that's expected and will be fixed in subsequent tasks)

**Step 4: Commit**

```
git add src/lib/workflow-events.ts
git commit -m "Add VerifyImprovePhaseEvent type for progress bar sub-steps"
```

---

## Task 8: Emit phase events from workflow verify-improve step

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/workflow.ts`

**Step 1: Emit `verify-start` before orchestrator call**

In `verifyImproveLoopStep.execute`, right before the orchestrator prompt construction (around line 564), add:

```ts
await emitTraceEvent(writer, {
  type: 'data-verify-improve-phase',
  data: {
    iteration: iterationCount + 1,
    phase: 'verify-start',
    timestamp: new Date().toISOString(),
  },
});
```

**Step 2: Emit `verify-complete` after verification feedback is extracted**

After the `emitTraceEvent` for `data-iteration-update` (after line 690), add:

```ts
await emitTraceEvent(writer, {
  type: 'data-verify-improve-phase',
  data: {
    iteration: iterationCount + 1,
    phase: 'verify-complete',
    timestamp: new Date().toISOString(),
  },
});
```

**Step 3: Emit `improve-start` before improver call**

Before the improver prompt construction (around line 721), add:

```ts
await emitTraceEvent(writer, {
  type: 'data-verify-improve-phase',
  data: {
    iteration: iterationCount + 1,
    phase: 'improve-start',
    timestamp: new Date().toISOString(),
  },
});
```

**Step 4: Emit `improve-complete` before returning updated loop state**

Before the final `return` statement (around line 853), add:

```ts
await emitTraceEvent(writer, {
  type: 'data-verify-improve-phase',
  data: {
    iteration: iterationCount + 1,
    phase: 'improve-complete',
    timestamp: new Date().toISOString(),
  },
});
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 6: Commit**

```
git add src/mastra/03-per-rule-per-sentence-delegation/workflow.ts
git commit -m "Emit verify-improve phase events for progress bar sub-steps"
```

---

## Task 9: Update trace-utils to handle new event type

**Files:**

- Modify: `src/lib/trace-utils.ts`

**Step 1: Update `getStepId` to handle the new event type**

In the `getStepId` function (line 80-92), add a case for the new event type:

```ts
function getStepId(event: WorkflowTraceEvent): StepId | undefined {
  switch (event.type) {
    case 'data-step-start':
    case 'data-step-complete':
    case 'data-agent-reasoning':
    case 'data-tool-call':
      return event.data.stepId;
    case 'data-iteration-update':
    case 'data-verify-improve-phase':
      return 'verify-improve-rules-loop';
    case 'data-vocabulary-update':
      return undefined;
  }
}
```

**Step 2: Add `groupConsecutiveToolCalls` utility**

After the `groupEventsByIteration` function, add:

```ts
export interface ToolCallGroup {
  toolName: string;
  calls: Array<{
    input: Record<string, unknown>;
    result: Record<string, unknown>;
    timestamp: string;
  }>;
}

/**
 * Group consecutive tool-call events by toolName.
 * Non-tool-call events are returned as-is.
 * Returns an array of either WorkflowTraceEvent or ToolCallGroup.
 */
export function groupEventsWithToolCalls(
  events: WorkflowTraceEvent[],
): Array<WorkflowTraceEvent | ToolCallGroup> {
  const result: Array<WorkflowTraceEvent | ToolCallGroup> = [];
  let currentGroup: ToolCallGroup | null = null;

  for (const event of events) {
    if (event.type === 'data-tool-call') {
      if (currentGroup && currentGroup.toolName === event.data.toolName) {
        currentGroup.calls.push({
          input: event.data.input,
          result: event.data.result,
          timestamp: event.data.timestamp,
        });
      } else {
        if (currentGroup) result.push(currentGroup);
        currentGroup = {
          toolName: event.data.toolName,
          calls: [
            {
              input: event.data.input,
              result: event.data.result,
              timestamp: event.data.timestamp,
            },
          ],
        };
      }
    } else {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(event);
    }
  }

  if (currentGroup) result.push(currentGroup);
  return result;
}

/** Type guard to check if an item is a ToolCallGroup */
export function isToolCallGroup(item: WorkflowTraceEvent | ToolCallGroup): item is ToolCallGroup {
  return 'toolName' in item && 'calls' in item;
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 4: Commit**

```
git add src/lib/trace-utils.ts
git commit -m "Add phase event handling and tool call grouping to trace-utils"
```

---

## Task 10: Update trace-event-card to handle new event type and tool groups

**Files:**

- Modify: `src/components/trace-event-card.tsx`

**Step 1: Add VerifyImprovePhaseEvent case to TraceEventCard**

In the `switch (event.type)` block (after the `data-vocabulary-update` case, around line 121), add:

```ts
    case 'data-verify-improve-phase':
      return (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {event.data.phase.includes('verify') ? 'VERIFY' : 'IMPROVE'}
          </Badge>
          <span>
            Iter {event.data.iteration}: {formatPhase(event.data.phase)}
          </span>
        </div>
      );
```

Add a helper function at the bottom of the file:

```ts
function formatPhase(phase: string): string {
  switch (phase) {
    case 'verify-start':
      return 'Verification started';
    case 'verify-complete':
      return 'Verification complete';
    case 'improve-start':
      return 'Improvement started';
    case 'improve-complete':
      return 'Improvement complete';
    default:
      return phase;
  }
}
```

**Step 2: Create `ToolCallGroupCard` component**

In the same file (or a new `src/components/tool-call-group-card.tsx` — prefer same file since it's small), add:

```ts
import type { ToolCallGroup } from '@/lib/trace-utils';

interface ToolCallGroupCardProps {
  group: ToolCallGroup;
}

export function ToolCallGroupCard({ group }: ToolCallGroupCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
        <span className="flex items-center gap-2">
          <Badge variant="default" className="text-[10px]">
            TOOL
          </Badge>
          <span className="font-medium">{group.toolName}</span>
          <Badge variant="outline" className="text-[10px]">
            x{group.calls.length}
          </Badge>
        </span>
        <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-x border-b border-border">
        <div className="flex flex-col divide-y divide-border">
          {group.calls.map((call, i) => (
            <ToolCallDetail key={i} index={i + 1} call={call} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolCallDetail({
  index,
  call,
}: {
  index: number;
  call: { input: Record<string, unknown>; result: Record<string, unknown> };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[10px] hover:bg-accent">
        <span className="text-muted-foreground">Call #{index}</span>
        <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 py-2">
        <div className="flex flex-col gap-2">
          <div>
            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Input</p>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Result</p>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
              {JSON.stringify(call.result, null, 2)}
            </pre>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 4: Commit**

```
git add src/components/trace-event-card.tsx
git commit -m "Add phase event display and tool call group component"
```

---

## Task 11: Update DevTracePanel to use tool call grouping

**Files:**

- Modify: `src/components/dev-trace-panel.tsx`

**Step 1: Import new utilities and component**

Update imports to include:

```ts
import {
  groupEventsByStep,
  groupEventsByIteration,
  groupEventsWithToolCalls,
  isToolCallGroup,
  formatDuration,
} from '@/lib/trace-utils';
import type { ToolCallGroup } from '@/lib/trace-utils';
import { TraceEventCard, ToolCallGroupCard } from '@/components/trace-event-card';
```

**Step 2: Replace `EventList` component**

Replace the `EventList` component (lines 112-124) with one that uses tool call grouping:

```ts
function EventList({ events }: { events: WorkflowTraceEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No events yet.</p>;
  }

  const grouped = groupEventsWithToolCalls(events);

  return (
    <div className="flex flex-col gap-2">
      {grouped.map((item, i) =>
        isToolCallGroup(item) ? (
          <ToolCallGroupCard key={i} group={item} />
        ) : (
          <TraceEventCard key={i} event={item} />
        ),
      )}
    </div>
  );
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 4: Commit**

```
git add src/components/dev-trace-panel.tsx
git commit -m "Use tool call grouping in DevTracePanel EventList"
```

---

## Task 12: Update page.tsx to derive loop state from phase events

**Files:**

- Modify: `src/app/page.tsx`

**Step 1: Import the new event type**

Update the import from workflow-events (line 15) to include:

```ts
import type { StepId, WorkflowTraceEvent, VerifyImprovePhaseEvent } from '@/lib/workflow-events';
```

**Step 2: Derive `loopState` from phase events**

After the `traceEvents` useMemo (around line 179), add:

```ts
// Derive loop state from verify-improve phase events
const loopState = useMemo(() => {
  const phaseEvents = allParts.filter(
    (p) => 'type' in p && (p as { type: string }).type === 'data-verify-improve-phase',
  ) as unknown as VerifyImprovePhaseEvent[];

  if (phaseEvents.length === 0) return undefined;

  // Track completed iterations and current state
  const completedIterations: Array<{
    iteration: number;
    conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
    hadImprovePhase: boolean;
  }> = [];

  let currentIteration = 1;
  let currentPhase: 'verify' | 'improve' | 'complete' = 'verify';
  let lastIterationHadImprove = false;

  for (const event of phaseEvents) {
    const { iteration, phase } = event.data;
    currentIteration = iteration;

    switch (phase) {
      case 'verify-start':
        currentPhase = 'verify';
        lastIterationHadImprove = false;
        break;
      case 'verify-complete':
        currentPhase = 'verify'; // Still in verify until improve starts
        break;
      case 'improve-start':
        currentPhase = 'improve';
        lastIterationHadImprove = true;
        break;
      case 'improve-complete':
        currentPhase = 'complete';
        // Find the iteration-update event to get conclusion
        const iterUpdateEvents = allParts.filter(
          (p) =>
            'type' in p &&
            (p as { type: string }).type === 'data-iteration-update' &&
            (p as { data: { iteration: number } }).data.iteration === iteration,
        ) as unknown as Array<{
          data: { conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES' };
        }>;
        const conclusion = iterUpdateEvents[0]?.data.conclusion ?? 'NEEDS_IMPROVEMENT';
        completedIterations.push({
          iteration,
          conclusion,
          hadImprovePhase: lastIterationHadImprove,
        });
        break;
    }
  }

  // Check if verify completed without improve (ALL_RULES_PASS early exit)
  const verifyStep = stepStatuses['verify-improve-rules-loop'];
  if (verifyStep === 'success' && currentPhase === 'verify') {
    const iterUpdateEvents = allParts.filter(
      (p) =>
        'type' in p &&
        (p as { type: string }).type === 'data-iteration-update' &&
        (p as { data: { iteration: number } }).data.iteration === currentIteration,
    ) as unknown as Array<{
      data: { conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES' };
    }>;
    const conclusion = iterUpdateEvents[0]?.data.conclusion ?? 'ALL_RULES_PASS';
    completedIterations.push({
      iteration: currentIteration,
      conclusion,
      hadImprovePhase: false,
    });
    currentPhase = 'complete';
  }

  return { currentIteration, currentPhase, completedIterations };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [allParts.length, stepStatuses]);
```

**Step 3: Pass loopState to StepProgress**

Update the StepProgress rendering (line 197):

```tsx
<StepProgress stepStatuses={stepStatuses} statusMessage={statusMessage} loopState={loopState} />
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: May show error on StepProgress props — this will be fixed in Task 13

**Step 5: Commit**

```
git add src/app/page.tsx
git commit -m "Derive loop state from phase events and pass to StepProgress"
```

---

## Task 13: Redesign StepProgress component with dynamic sub-steps

**Files:**

- Modify: `src/components/step-progress.tsx`

**Step 1: Rewrite the component**

Replace the entire file with:

```tsx
import { cn } from '@/lib/utils';
import { STEP_LABELS, type StepId } from '@/lib/workflow-events';

export const STEP_ORDER: StepId[] = [
  'extract-structure',
  'initial-hypothesis',
  'verify-improve-rules-loop',
  'answer-questions',
];

export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

interface CompletedIteration {
  iteration: number;
  conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
  hadImprovePhase: boolean;
}

interface LoopState {
  currentIteration: number;
  currentPhase: 'verify' | 'improve' | 'complete';
  completedIterations: CompletedIteration[];
}

interface StepProgressProps {
  stepStatuses: Record<StepId, StepStatus>;
  statusMessage?: string | undefined;
  loopState?: LoopState | undefined;
}

type SubStep = {
  id: string;
  label: string;
  status: StepStatus;
};

function buildSubSteps(loopState: LoopState, overallStatus: StepStatus): SubStep[] {
  const subSteps: SubStep[] = [];

  for (const completed of loopState.completedIterations) {
    // Verify sub-step (always present)
    subSteps.push({
      id: `v${completed.iteration}`,
      label: `V${completed.iteration}`,
      status: 'success',
    });
    // Improve sub-step (only if the iteration had an improve phase)
    if (completed.hadImprovePhase) {
      subSteps.push({
        id: `i${completed.iteration}`,
        label: `I${completed.iteration}`,
        status: 'success',
      });
    }
  }

  // Add current in-progress sub-step(s) if the loop hasn't completed
  if (
    loopState.currentPhase !== 'complete' ||
    !loopState.completedIterations.some((i) => i.iteration === loopState.currentIteration)
  ) {
    const isCurrentlyComplete = overallStatus === 'success' || overallStatus === 'failed';

    if (loopState.currentPhase === 'verify') {
      subSteps.push({
        id: `v${loopState.currentIteration}`,
        label: `V${loopState.currentIteration}`,
        status: isCurrentlyComplete
          ? overallStatus === 'success'
            ? 'success'
            : 'failed'
          : 'running',
      });
    } else if (loopState.currentPhase === 'improve') {
      // Verify is done, improve is running
      subSteps.push({
        id: `v${loopState.currentIteration}`,
        label: `V${loopState.currentIteration}`,
        status: 'success',
      });
      subSteps.push({
        id: `i${loopState.currentIteration}`,
        label: `I${loopState.currentIteration}`,
        status: isCurrentlyComplete
          ? overallStatus === 'success'
            ? 'success'
            : 'failed'
          : 'running',
      });
    }
  }

  return subSteps;
}

function StepCircle({
  status,
  label,
  size = 'normal',
}: {
  status: StepStatus;
  label: string | number;
  size?: 'normal' | 'small';
}) {
  const isSmall = size === 'small';
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border',
        isSmall ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
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

function Connector({
  active,
  variant = 'normal',
}: {
  active: boolean;
  variant?: 'normal' | 'sub';
}) {
  return (
    <div
      className={cn(
        'h-px flex-1',
        variant === 'sub' ? 'mx-0.5 min-w-2' : 'mx-1 min-w-3',
        active ? 'bg-foreground' : 'bg-border',
      )}
    />
  );
}

export function StepProgress({ stepStatuses, statusMessage, loopState }: StepProgressProps) {
  const verifyImproveStatus = stepStatuses['verify-improve-rules-loop'];
  const hasSubSteps = loopState && verifyImproveStatus !== 'pending';
  const subSteps = hasSubSteps ? buildSubSteps(loopState, verifyImproveStatus) : [];

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STEP_ORDER.map((stepId, i) => {
          const status = stepStatuses[stepId];
          const isVerifyImprove = stepId === 'verify-improve-rules-loop';

          // For verify-improve with sub-steps, render the sub-step cluster
          if (isVerifyImprove && hasSubSteps && subSteps.length > 0) {
            return (
              <div key={stepId} className="flex items-center">
                {/* Connector from previous step */}
                <Connector active={status !== 'pending'} />

                {/* Sub-step cluster */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center">
                    {subSteps.map((sub, si) => (
                      <div key={sub.id} className="flex items-center">
                        {si > 0 && (
                          <Connector
                            active={sub.status === 'running' || sub.status === 'success'}
                            variant="sub"
                          />
                        )}
                        <StepCircle status={sub.status} label={sub.label} size="small" />
                      </div>
                    ))}
                  </div>
                  <span
                    className={cn(
                      'text-xs',
                      status === 'running' && 'font-bold text-foreground',
                      status === 'success' && 'text-foreground',
                      status === 'failed' && 'text-destructive',
                      status === 'pending' && 'text-muted-foreground',
                    )}
                  >
                    {STEP_LABELS[stepId]}
                  </span>
                </div>

                {/* Connector to next step */}
                <Connector active={status === 'success'} />
              </div>
            );
          }

          // Normal step rendering
          return (
            <div key={stepId} className="flex items-center">
              {i > 0 && !isVerifyImprove && (
                <Connector active={status === 'success' || status === 'running'} />
              )}
              {/* Skip connector for verify-improve when no sub-steps (it's rendered in the cluster) */}
              {i > 0 && isVerifyImprove && !hasSubSteps && (
                <Connector active={status === 'success' || status === 'running'} />
              )}
              <div className="flex flex-col items-center gap-1">
                <StepCircle status={status} label={i + 1} />
                <span
                  className={cn(
                    'text-xs',
                    status === 'running' && 'font-bold text-foreground',
                    status === 'success' && 'text-foreground',
                    status === 'failed' && 'text-destructive',
                    status === 'pending' && 'text-muted-foreground',
                  )}
                >
                  {STEP_LABELS[stepId]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {statusMessage && (
        <p className="mt-4 text-center text-sm text-muted-foreground">{statusMessage}</p>
      )}
    </div>
  );
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 3: Commit**

```
git add src/components/step-progress.tsx
git commit -m "Redesign StepProgress with dynamic loop sub-steps"
```

---

## Task 14: Final type check and manual testing

**Step 1: Run full type check**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css | grep -v getExampleLabel`
Expected: No new errors

**Step 2: Run the dev server**

Run: `npm run dev`
Expected: Both Next.js and Mastra servers start without errors

**Step 3: Manual testing checklist**

Test with an example problem:

- [ ] Progress bar shows 4 flat steps initially
- [ ] When verify-improve starts, sub-step circles (V1, I1, etc.) appear
- [ ] Sub-steps show running/success states correctly
- [ ] If loop exits early (ALL_RULES_PASS), no improve sub-step appears for that iteration
- [ ] Tool call events appear in the Dev Trace Panel in real-time
- [ ] Tool calls are grouped by name (e.g., "testRule x6")
- [ ] Expanding a tool call group shows individual calls with input/output
- [ ] Vocabulary update events appear in the trace panel
- [ ] The progress bar returns to the 4-step view for a new problem after reset

**Step 4: Commit any fixes**

If any issues found, fix and commit.

**Step 5: Final commit**

```
git add -A
git commit -m "Complete progress bar loop expansion and tool call streaming"
```
