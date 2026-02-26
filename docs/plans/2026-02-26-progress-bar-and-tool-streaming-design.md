# Progress Bar Loop Expansion + Real-Time Tool Call Streaming

## Problem

Two UI issues in the LO-Solver frontend:

1. **Progress bar is flat**: The 4-step stepper treats "Verify / Improve" as a single opaque step. Users cannot see which iteration (of up to 4) the loop is on, or whether it is currently verifying vs. improving.

2. **Tool call events are silently dropped**: The backend emits `data-tool-call` events via `ctx.writer?.custom()`, but Mastra's `ToolStream.custom()` requires a `writeFn` that is never set when agents are called from workflow steps. The `custom()` call is a silent no-op. Step-level events (start, complete, agent reasoning, iteration updates) work via a different mechanism (`writer.write()` on the step's own ToolStream → pubsub).

## Design

### Feature 1: Real-Time Tool Call Streaming (Bug Fix)

**Root cause**: `ctx.writer?.custom()` in tools never receives a valid `writeFn` because Mastra does not expose `outputWriter` in the public agent API when called from workflow steps.

**Fix**: Pass the step's `writer` through `requestContext` so tools can emit events via the working pubsub channel.

#### Changes

**`request-context-types.ts`** — Add key:

```ts
'step-writer': unknown;
```

**`request-context-helpers.ts`** — Add helper:

```ts
export function emitToolTraceEvent(
  requestContext: RuntimeContext<Workflow03RequestContext>,
  event: WorkflowTraceEvent,
): void {
  const writer = requestContext.get('step-writer') as
    | { write?: (data: unknown) => void }
    | undefined;
  writer?.write?.(event);
}
```

**`workflow.ts`** — In each step's execute, before calling agents:

```ts
requestContext.set('step-writer', writer);
```

**Tool files** (`03a-rule-tester-tool.ts`, `03a-sentence-tester-tool.ts`, `vocabulary-tools.ts`) — Replace `ctx.writer?.custom(event)` with `emitToolTraceEvent(requestContext, event)`.

### Feature 2: Progress Bar Loop Expansion

Replace the static 4-step stepper with a dynamic step array that grows as verify-improve iterations proceed.

#### Visual

```
Before loop:
  (1) Extract  --  (2) Hypothesize  --  (3) Verify/Improve  --  (4) Answer

During iteration 1:
  (1)✓  --  (2)✓  --  [V1]•  ·  [I1]  ·  ...  --  (4)

After 2 iterations (all rules pass on iter 2 verify):
  (1)✓  --  (2)✓  --  [V1]✓  ·  [I1]✓  ·  [V2]✓  --  (4)
```

- Main steps: `h-8 w-8` circles (unchanged)
- Sub-steps: `h-6 w-6` circles, shorter/dotted connectors
- Sub-step labels: `V1`, `I1`, `V2`, `I2`, etc.
- Group label: "Verify / Improve" spans beneath the sub-step cluster
- Max: 4 iterations x 2 phases = 8 sub-steps

#### New event type

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

Emitted from `workflow.ts` at each phase boundary within the verify-improve step.

#### StepProgress props

```ts
interface StepProgressProps {
  stepStatuses: Record<StepId, StepStatus>;
  statusMessage?: string;
  loopState?: {
    currentIteration: number;
    currentPhase: 'verify' | 'improve' | 'complete';
    completedIterations: Array<{
      iteration: number;
      conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
      hadImprovePhase: boolean;
    }>;
  };
}
```

`page.tsx` derives `loopState` from accumulated `data-verify-improve-phase` events.

### Feature 3: Tool Call Grouping in Dev Trace Panel

With real-time tool calls flowing, the verifier orchestrator fires 10-20+ calls per iteration. To keep the trace panel readable:

- Group consecutive tool calls by tool name within each iteration
- Collapsed by default: "testRule x 6"
- Expandable to show individual calls with input/output
- Count increments live as tool calls stream in

#### Implementation

- New `ToolCallGroup` component
- New `groupConsecutiveToolCalls()` utility in `trace-utils.ts`
- Frontend-only change, no backend modifications

## Files Changed

### Backend

- `src/mastra/03-per-rule-per-sentence-delegation/request-context-types.ts`
- `src/mastra/03-per-rule-per-sentence-delegation/request-context-helpers.ts`
- `src/mastra/03-per-rule-per-sentence-delegation/workflow.ts`
- `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts`
- `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts`
- `src/mastra/03-per-rule-per-sentence-delegation/vocabulary-tools.ts`
- `src/lib/workflow-events.ts`

### Frontend

- `src/components/step-progress.tsx`
- `src/app/page.tsx`
- `src/components/dev-trace-panel.tsx` or new `tool-call-group.tsx`
- `src/lib/trace-utils.ts`
