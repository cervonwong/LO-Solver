# Dev Trace Panel & Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the dev trace visualization (right panel) showing agent calls as a chronological event log grouped by step and iteration, with expandable detail inspector, plus final polish.

**Architecture:** The `DevTracePanel` receives a flat array of `WorkflowTraceEvent` objects streamed in real-time. It groups events by step (and by iteration within the verify-improve loop), renders them as a vertical timeline of collapsible event cards. Clicking an event expands its full detail inline. No separate swimlane columns — a vertical timeline is more practical for the single-panel layout.

**Tech Stack:** React, shadcn/ui (Collapsible, Badge, Tabs, ScrollArea), Tailwind CSS, TypeScript

**Worktree:** `.worktrees/nextjs-frontend` on branch `feature/nextjs-frontend`

**No test framework.** Verify with `npx tsc --noEmit` after each task.

---

### Task 1: Create trace data grouping utility

**Files:**
- Create: `src/lib/trace-utils.ts`

**Step 1: Create the utility**

This module takes a flat `WorkflowTraceEvent[]` and groups events into a structure the UI can render: events organized by step, with verify-improve events further grouped by iteration.

```typescript
import type {
  WorkflowTraceEvent,
  StepId,
  StepStartEvent,
  StepCompleteEvent,
  AgentReasoningEvent,
  ToolCallEvent,
  IterationUpdateEvent,
  VocabularyUpdateEvent,
} from './workflow-events';
import { STEP_LABELS } from './workflow-events';

export interface StepGroup {
  stepId: StepId;
  label: string;
  startTime: string | undefined;
  durationMs: number | undefined;
  events: WorkflowTraceEvent[];
}

export interface IterationGroup {
  iteration: number;
  conclusion: string | undefined;
  events: WorkflowTraceEvent[];
}

/** Group events by their stepId. Events without stepId go into the step they follow. */
export function groupEventsByStep(events: WorkflowTraceEvent[]): StepGroup[] {
  const stepMap = new Map<StepId, StepGroup>();
  const order: StepId[] = [];

  for (const event of events) {
    const stepId = getStepId(event);
    if (!stepId) continue;

    let group = stepMap.get(stepId);
    if (!group) {
      group = {
        stepId,
        label: STEP_LABELS[stepId],
        startTime: undefined,
        durationMs: undefined,
        events: [],
      };
      stepMap.set(stepId, group);
      order.push(stepId);
    }

    if (event.type === 'data-step-start') {
      group.startTime = event.data.timestamp;
    } else if (event.type === 'data-step-complete') {
      group.durationMs = event.data.durationMs;
    }

    group.events.push(event);
  }

  return order.map((id) => stepMap.get(id)!);
}

/** Extract iterations from a verify-improve step group. */
export function groupEventsByIteration(events: WorkflowTraceEvent[]): IterationGroup[] {
  const iterations: IterationGroup[] = [];
  let current: IterationGroup = { iteration: 1, conclusion: undefined, events: [] };

  for (const event of events) {
    if (event.type === 'data-iteration-update') {
      current.conclusion = event.data.conclusion;
      current.events.push(event);
      iterations.push(current);
      current = {
        iteration: event.data.iteration + 1,
        conclusion: undefined,
        events: [],
      };
    } else {
      current.events.push(event);
    }
  }

  // Push remaining events as an in-progress iteration
  if (current.events.length > 0) {
    iterations.push(current);
  }

  return iterations;
}

function getStepId(event: WorkflowTraceEvent): StepId | undefined {
  switch (event.type) {
    case 'data-step-start':
    case 'data-step-complete':
    case 'data-agent-reasoning':
    case 'data-tool-call':
      return event.data.stepId;
    case 'data-iteration-update':
      return 'verify-improve-rules-loop';
    case 'data-vocabulary-update':
      return undefined;
  }
}

/** Format milliseconds as human-readable duration. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Only the known CSS import warning.

**Step 3: Commit**

```
git add src/lib/trace-utils.ts
git commit -m "Add trace event grouping utilities"
```

---

### Task 2: Create TraceEventCard component

**Files:**
- Create: `src/components/trace-event-card.tsx`

**Step 1: Create the component**

A collapsible card for each trace event. Shows a one-line summary; expands to show full detail.

```tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';
import { formatDuration } from '@/lib/trace-utils';

interface TraceEventCardProps {
  event: WorkflowTraceEvent;
}

export function TraceEventCard({ event }: TraceEventCardProps) {
  const [open, setOpen] = useState(false);

  switch (event.type) {
    case 'data-step-start':
      return (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            START
          </Badge>
          <span>Step started</span>
        </div>
      );

    case 'data-step-complete':
      return (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            DONE
          </Badge>
          <span>Step completed in {formatDuration(event.data.durationMs)}</span>
        </div>
      );

    case 'data-agent-reasoning':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                AGENT
              </Badge>
              <span className="font-medium">{event.data.agentName}</span>
              <span className="text-muted-foreground">({event.data.model})</span>
            </span>
            <span className="text-muted-foreground">{formatDuration(event.data.durationMs)}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-x border-b border-border px-3 py-2">
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">
              {event.data.reasoning}
            </p>
          </CollapsibleContent>
        </Collapsible>
      );

    case 'data-tool-call':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
            <span className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px]">
                TOOL
              </Badge>
              <span className="font-medium">{event.data.toolName}</span>
            </span>
            <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-x border-b border-border px-3 py-2">
            <div className="flex flex-col gap-2">
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">Input</p>
                <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
                  {JSON.stringify(event.data.input, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">Result</p>
                <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
                  {JSON.stringify(event.data.result, null, 2)}
                </pre>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      );

    case 'data-iteration-update':
      return (
        <div className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs">
          <Badge
            variant={event.data.conclusion === 'ALL_RULES_PASS' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            ITER {event.data.iteration}
          </Badge>
          <span>{formatConclusion(event.data.conclusion)}</span>
          <span className="text-muted-foreground">
            Rules: {event.data.errantRulesCount}/{event.data.rulesTestedCount} errant |
            Sentences: {event.data.errantSentencesCount}/{event.data.sentencesTestedCount} errant
          </span>
        </div>
      );

    case 'data-vocabulary-update':
      return (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            VOCAB
          </Badge>
          <span>
            {event.data.action}: {event.data.entries.length} entries (total: {event.data.totalCount})
          </span>
        </div>
      );
  }
}

function formatConclusion(conclusion: string): string {
  switch (conclusion) {
    case 'ALL_RULES_PASS':
      return 'All rules pass';
    case 'NEEDS_IMPROVEMENT':
      return 'Needs improvement';
    case 'MAJOR_ISSUES':
      return 'Major issues found';
    default:
      return conclusion;
  }
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
git add src/components/trace-event-card.tsx
git commit -m "Add TraceEventCard collapsible component for each event type"
```

---

### Task 3: Build out DevTracePanel with step groups and iteration tabs

**Files:**
- Modify: `src/components/dev-trace-panel.tsx`

**Step 1: Rewrite DevTracePanel**

Replace the shell with a full implementation that groups events by step, shows iteration tabs for verify-improve, and renders `TraceEventCard` for each event.

```tsx
'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TraceEventCard } from '@/components/trace-event-card';
import {
  groupEventsByStep,
  groupEventsByIteration,
  formatDuration,
} from '@/lib/trace-utils';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

interface DevTracePanelProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function DevTracePanel({ events, isRunning }: DevTracePanelProps) {
  const stepGroups = useMemo(() => groupEventsByStep(events), [events]);

  if (events.length === 0 && !isRunning) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground">Dev Trace</h2>
        <span className="text-xs text-muted-foreground">
          {isRunning ? `Streaming... (${events.length} events)` : `${events.length} events`}
        </span>
      </div>

      {stepGroups.map((group) => (
        <StepSection key={group.stepId} group={group} isRunning={isRunning} />
      ))}
    </div>
  );
}

interface StepSectionProps {
  group: ReturnType<typeof groupEventsByStep>[number];
  isRunning: boolean;
}

function StepSection({ group, isRunning }: StepSectionProps) {
  const isVerifyImprove = group.stepId === 'verify-improve-rules-loop';
  const isActive = group.durationMs === undefined && group.startTime !== undefined;

  // Filter out step-start/step-complete for cleaner display
  const contentEvents = group.events.filter(
    (e) => e.type !== 'data-step-start' && e.type !== 'data-step-complete',
  );

  return (
    <section className="rounded border border-border">
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
        {isVerifyImprove ? (
          <IterationTabs events={contentEvents} />
        ) : (
          <EventList events={contentEvents} />
        )}
      </div>
    </section>
  );
}

function IterationTabs({ events }: { events: WorkflowTraceEvent[] }) {
  const iterations = useMemo(() => groupEventsByIteration(events), [events]);

  if (iterations.length === 0) {
    return <p className="text-xs text-muted-foreground">Waiting for events...</p>;
  }

  if (iterations.length === 1) {
    return <EventList events={iterations[0].events} />;
  }

  return (
    <Tabs defaultValue="1">
      <TabsList>
        {iterations.map((iter) => (
          <TabsTrigger key={iter.iteration} value={String(iter.iteration)} className="text-xs">
            Iter {iter.iteration}
            {iter.conclusion === 'ALL_RULES_PASS' && ' ✓'}
          </TabsTrigger>
        ))}
      </TabsList>
      {iterations.map((iter) => (
        <TabsContent key={iter.iteration} value={String(iter.iteration)}>
          <EventList events={iter.events} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function EventList({ events }: { events: WorkflowTraceEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No events yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event, i) => (
        <TraceEventCard key={i} event={event} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <span className="text-4xl">&#9881;</span>
      <div className="flex max-w-xs flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">No active run</p>
        <p className="text-xs text-muted-foreground">
          Paste a Rosetta Stone problem in the input on the left and click Solve to watch the
          pipeline work through it step by step.
        </p>
        <p className="text-xs text-muted-foreground">
          Try one of the example problems to get started.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
git add src/components/dev-trace-panel.tsx
git commit -m "Build DevTracePanel with step groups and iteration tabs"
```

---

### Task 4: Include vocabulary events in the trace

The `page.tsx` currently filters out `data-vocabulary-update` events from the trace. They should be included so the dev trace shows vocabulary mutations in context.

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Remove vocabulary exclusion from traceEvents filter**

In `page.tsx`, find the `traceEvents` useMemo and remove the `data-vocabulary-update` exclusion:

Change:
```typescript
        (p as { type: string }).type !== 'data-workflow' &&
        (p as { type: string }).type !== 'data-vocabulary-update',
```

To:
```typescript
        (p as { type: string }).type !== 'data-workflow',
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
git add src/app/page.tsx
git commit -m "Include vocabulary update events in dev trace"
```

---

### Task 5: Polish — error handling and edge cases

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/problem-input.tsx`

**Step 1: Allow re-running after completion or failure**

In `page.tsx`, reset the `hasSent` ref and clear messages when the workflow completes or fails, so the user can submit a new problem. Add a "New Problem" button that resets state.

Modify the `SolverPage` component — add a reset handler:

```tsx
const handleReset = useCallback(() => {
  hasSent.current = false;
  setHasStarted(false);
  setInputOpen(true);
  setMessages([]);
}, [setMessages]);
```

Add `setMessages` to the `useChat` destructure:

```tsx
const { messages, sendMessage, status, setMessages } = useChat({ transport });
```

Render a "New Problem" button when the workflow is done (below the results or error):

```tsx
{(isComplete || isFailed) && !isRunning && (
  <Button variant="outline" onClick={handleReset} className="w-fit text-xs">
    New problem
  </Button>
)}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
git add src/app/page.tsx
git commit -m "Add reset functionality for re-running with a new problem"
```

---

### Task 6: Polish — styling pass

**Files:**
- Modify: `src/app/page.tsx` (minor spacing/border tweaks if needed)
- Modify: `src/components/step-progress.tsx` (responsive connector lines)
- Modify: `src/components/dev-trace-panel.tsx` (loading animation)

**Step 1: Add a pulsing dot to the active step section header**

Already done via `animate-pulse` badge in Task 3.

**Step 2: Ensure step progress connector lines work in narrow panel**

In `step-progress.tsx`, change the connector width from fixed to flexible:

Change:
```tsx
'mx-2 h-px w-12 sm:w-16',
```

To:
```tsx
'mx-1 h-px flex-1',
```

This makes connector lines stretch to fill available space regardless of panel width.

**Step 3: Type-check**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
git add src/components/step-progress.tsx
git commit -m "Make progress bar connector lines flexible width"
```

---

### Task 7: Final type-check and verification

**Files:** None (verification only)

**Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: Only the known CSS import false positive.

**Step 2: Verify file structure**

Confirm no orphaned imports or missing files:
- `src/lib/trace-utils.ts` exists
- `src/components/trace-event-card.tsx` exists
- `src/components/dev-trace-panel.tsx` updated
- `src/app/run/` directory deleted
- No remaining references to `/run/` routes

**Step 3: List all changed files**

Run: `git status`
Expected: All changes accounted for.
