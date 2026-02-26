# Single-Page Layout Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the two-page flow (homepage + run page) into a single page with a resizable two-column layout.

**Architecture:** Left panel (35%) holds problem input, step progress, and results. Right panel (65%) holds a dev trace panel (shell for now) with an empty state before any run starts. Both panels scroll independently. `useChat` state lives in the top-level `page.tsx` client component.

**Tech Stack:** Next.js 15, shadcn/ui (ResizablePanel, ScrollArea), @ai-sdk/react (useChat), Tailwind CSS v4

**Design doc:** `docs/plans/2026-02-26-single-page-layout-redesign.md`

**Worktree:** `.worktrees/nextjs-frontend` on branch `feature/nextjs-frontend`

**No test framework is configured.** Verification is via `npx tsc --noEmit` and visual inspection with `npm run dev:next`.

---

### Task 1: Update layout.tsx to fill viewport height

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Edit layout.tsx**

Change `<main>` to fill available viewport height so the resizable panels can stretch:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex h-full flex-col bg-background font-mono text-foreground antialiased">
        <nav className="shrink-0 border-b border-border px-6 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight hover:text-muted-foreground">
            LO-Solver
          </Link>
        </nav>
        <main className="min-h-0 flex-1">{children}</main>
      </body>
    </html>
  );
}
```

Key changes: `html` gets `h-full`, `body` gets `flex h-full flex-col`, nav gets `shrink-0`, main gets `min-h-0 flex-1`.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors (existing CSS import warnings are expected)

**Step 3: Commit**

```
git add src/app/layout.tsx
git commit -m "Fill viewport height in root layout for resizable panels"
```

---

### Task 2: Refactor ProblemInput to use callback instead of router

**Files:**
- Modify: `src/components/problem-input.tsx`

**Step 1: Refactor component**

Remove `useRouter` and `sessionStorage`. Accept `onSolve` callback and `disabled` prop:

```tsx
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ExampleOption {
  id: string;
  label: string;
}

interface ProblemInputProps {
  examples: ExampleOption[];
  onSolve: (text: string) => void;
  disabled?: boolean | undefined;
}

export function ProblemInput({ examples, onSolve, disabled }: ProblemInputProps) {
  const [problemText, setProblemText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleExampleSelect(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/examples/${id}`);
      if (!res.ok) throw new Error('Failed to load example');
      const { text } = await res.json();
      setProblemText(text);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    const trimmed = problemText.trim();
    if (!trimmed) return;
    onSolve(trimmed);
  }

  const isDisabled = disabled || loading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="example-select" className="text-sm text-muted-foreground">
          Load example:
        </label>
        <select
          id="example-select"
          className="rounded border border-input bg-background px-2 py-1 text-sm"
          defaultValue=""
          disabled={isDisabled}
          onChange={(e) => {
            if (e.target.value) handleExampleSelect(e.target.value);
          }}
        >
          <option value="" disabled>
            Select a problem...
          </option>
          {examples.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.label}
            </option>
          ))}
        </select>
      </div>

      <Textarea
        value={problemText}
        onChange={(e) => setProblemText(e.target.value)}
        placeholder="Paste a linguistics problem here..."
        className="min-h-[200px] resize-y font-mono text-sm"
        disabled={isDisabled}
      />

      <Button onClick={handleSubmit} disabled={!problemText.trim() || isDisabled} className="w-fit">
        {disabled ? 'Solving...' : 'Solve'}
      </Button>
    </div>
  );
}
```

Key changes:
- Removed `useRouter` import and `router.push()` call
- Removed `sessionStorage.setItem()`
- Added `onSolve` callback prop and `disabled` prop
- Removed `max-w-2xl` and `w-full` (parent controls width now)
- Reduced `min-h` on textarea from 300px to 200px (less space in left panel)
- Button shows "Solving..." when disabled
- Textarea disables during run

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Errors in `page.tsx` because it doesn't pass the new `onSolve` prop yet — that's expected and fixed in Task 4.

**Step 3: Commit**

```
git add src/components/problem-input.tsx
git commit -m "Refactor ProblemInput to use onSolve callback instead of router"
```

---

### Task 3: Create DevTracePanel shell with empty state

**Files:**
- Create: `src/components/dev-trace-panel.tsx`

**Step 1: Create the component**

```tsx
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

interface DevTracePanelProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function DevTracePanel({ events, isRunning }: DevTracePanelProps) {
  if (events.length === 0 && !isRunning) {
    return <EmptyState />;
  }

  return (
    <div className="p-4">
      <h2 className="mb-4 text-sm font-bold text-muted-foreground">Dev Trace</h2>
      <p className="text-xs text-muted-foreground">
        {isRunning
          ? `Receiving events... (${events.length} so far)`
          : `${events.length} events recorded.`}
      </p>
      {/* Swimlane view will be built in Phase 4 */}
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
Expected: No new errors from this file.

**Step 3: Commit**

```
git add src/components/dev-trace-panel.tsx
git commit -m "Add DevTracePanel shell component with empty state"
```

---

### Task 4: Rewrite page.tsx as single-page layout

This is the main task. The new `page.tsx` combines logic from the old homepage and run page into a single client component with `useChat` and `ResizablePanelGroup`.

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Rewrite page.tsx**

```tsx
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProblemInput } from '@/components/problem-input';
import { StepProgress, STEP_ORDER, type StepStatus } from '@/components/step-progress';
import { ResultsPanel } from '@/components/results-panel';
import { DevTracePanel } from '@/components/dev-trace-panel';
import { EXAMPLE_PROBLEMS } from '@/lib/examples';
import type { StepId, WorkflowTraceEvent } from '@/lib/workflow-events';

const STEP_STATUS_MESSAGES: Record<StepId, string> = {
  'extract-structure': 'Extracting problem structure...',
  'initial-hypothesis': 'Generating linguistic rules and vocabulary...',
  'verify-improve-rules-loop': 'Verifying and improving rules...',
  'answer-questions': 'Applying rules to answer questions...',
};

interface WorkflowStepData {
  status: string;
  output?: Record<string, unknown>;
}

interface WorkflowData {
  name: string;
  status: string;
  steps: Record<string, WorkflowStepData>;
}

interface VocabUpdateData {
  action: 'add' | 'update' | 'remove' | 'clear';
  entries: Array<{ foreignForm: string; meaning: string; type: string; notes: string }>;
  totalCount: number;
}

const examples = EXAMPLE_PROBLEMS.map((e) => ({ id: e.id, label: e.label }));

export default function SolverPage() {
  const [hasStarted, setHasStarted] = useState(false);
  const hasSent = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/solve',
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            inputData: {
              rawProblemText:
                (messages[messages.length - 1]?.parts?.[0] as { text?: string } | undefined)
                  ?.text ?? '',
            },
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const handleSolve = useCallback(
    async (text: string) => {
      if (hasSent.current) return;
      hasSent.current = true;
      setHasStarted(true);
      await sendMessage({ text });
    },
    [sendMessage],
  );

  // Collect all data parts from assistant messages
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const allParts = assistantMessages.flatMap((m) => m.parts ?? []);

  // Extract the latest workflow data part
  const workflowParts = allParts.filter(
    (p) => 'type' in p && p.type === 'data-workflow',
  ) as Array<{ type: string; data: WorkflowData }>;
  const workflowData = workflowParts.at(-1)?.data;
  const workflowStatus = workflowData?.status;
  const steps = workflowData?.steps ?? {};

  // Derive step statuses for the progress bar
  const stepStatuses = {} as Record<StepId, StepStatus>;
  for (const stepId of STEP_ORDER) {
    const step = steps[stepId];
    if (!step) {
      stepStatuses[stepId] = 'pending';
    } else if (step.status === 'running') {
      stepStatuses[stepId] = 'running';
    } else if (step.status === 'success') {
      stepStatuses[stepId] = 'success';
    } else if (step.status === 'failed') {
      stepStatuses[stepId] = 'failed';
    } else {
      stepStatuses[stepId] = 'pending';
    }
  }

  // Find the active step for the status message
  const activeStep = STEP_ORDER.find((id) => stepStatuses[id] === 'running');
  const statusMessage =
    workflowStatus === 'success'
      ? 'Workflow complete.'
      : workflowStatus === 'failed' || workflowStatus === 'bailed'
        ? 'Workflow failed.'
        : activeStep
          ? STEP_STATUS_MESSAGES[activeStep]
          : status === 'submitted' || status === 'streaming'
            ? 'Starting workflow...'
            : undefined;

  // Extract results data
  const isComplete = workflowStatus === 'success';
  const isFailed = workflowStatus === 'failed' || workflowStatus === 'bailed';
  const isRunning = status === 'submitted' || status === 'streaming';
  const answerStepOutput = steps['answer-questions']?.output;
  const verifyStepOutput = steps['verify-improve-rules-loop']?.output;
  const rules =
    (verifyStepOutput?.rules as Array<{
      title: string;
      description: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    }>) ?? undefined;

  // Accumulate vocabulary from data-vocabulary-update parts
  const vocabParts = allParts.filter(
    (p) => 'type' in p && p.type === 'data-vocabulary-update',
  ) as Array<{ type: string; data: VocabUpdateData }>;

  const vocabulary = useMemo(() => {
    const vocabMap = new Map<
      string,
      { foreignForm: string; meaning: string; type: string; notes: string }
    >();
    for (const part of vocabParts) {
      const { action, entries } = part.data;
      if (action === 'clear') {
        vocabMap.clear();
      } else if (action === 'remove') {
        for (const entry of entries) {
          vocabMap.delete(entry.foreignForm);
        }
      } else {
        for (const entry of entries) {
          vocabMap.set(entry.foreignForm, entry);
        }
      }
    }
    return Array.from(vocabMap.values());
  }, [vocabParts.length]);

  // Collect trace events for the dev trace panel
  const traceEvents = useMemo(() => {
    return allParts.filter(
      (p) =>
        'type' in p &&
        typeof (p as { type: string }).type === 'string' &&
        (p as { type: string }).type.startsWith('data-') &&
        (p as { type: string }).type !== 'data-workflow' &&
        (p as { type: string }).type !== 'data-vocabulary-update',
    ) as unknown as WorkflowTraceEvent[];
  }, [allParts.length]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={35} minSize={25}>
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 p-6">
            <ProblemInput examples={examples} onSolve={handleSolve} disabled={isRunning} />

            {hasStarted && (
              <StepProgress stepStatuses={stepStatuses} statusMessage={statusMessage} />
            )}

            {isFailed && (
              <div className="rounded border border-destructive p-4 text-sm text-destructive">
                The workflow encountered an error. Check Mastra Studio for details.
              </div>
            )}

            {isComplete && answerStepOutput && (
              <ResultsPanel output={answerStepOutput} rules={rules} vocabulary={vocabulary} />
            )}
          </div>
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={65} minSize={30}>
        <ScrollArea className="h-full">
          <DevTracePanel events={traceEvents} isRunning={isRunning} />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

Key points:
- `useChat` lives here with `DefaultChatTransport` (moved from run page)
- `handleSolve` callback passed to `ProblemInput` — calls `sendMessage` directly
- All workflow state derivation moved from run page
- `traceEvents` filters relevant `data-*` parts for the dev trace panel (excludes `data-workflow` and `data-vocabulary-update` which are used by left panel components)
- `hasStarted` state controls whether progress bar is visible
- `hasSent` ref prevents duplicate submissions
- `isRunning` disables the input during a run
- `useMemo` for `vocabulary` and `traceEvents` to avoid recomputation

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors (existing CSS import warnings are expected).

**Step 3: Commit**

```
git add src/app/page.tsx
git commit -m "Rewrite page.tsx as single-page two-column layout"
```

---

### Task 5: Delete run page and clean up

**Files:**
- Delete: `src/app/run/[runId]/page.tsx`

**Step 1: Delete the run page**

```bash
rm src/app/run/[runId]/page.tsx
rmdir src/app/run/[runId]
rmdir src/app/run
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors referencing the deleted file.

**Step 3: Commit**

```
git add -A
git commit -m "Remove run page route in favor of single-page layout"
```

---

### Task 6: Visual verification and adjustments

**Files:**
- Possibly: `src/app/page.tsx`, `src/components/step-progress.tsx`, `src/components/results-panel.tsx`

**Step 1: Start the dev server**

Run: `npm run dev:next`

**Step 2: Visual checks**

Open `http://localhost:3000` and verify:
1. Two-column layout fills viewport below nav bar
2. Drag handle works to resize panels
3. Right panel shows empty state with tips
4. Example picker loads problem text into textarea
5. Left panel scrolls independently
6. Components don't overflow their panels

**Step 3: Fix any layout issues**

Common adjustments:
- `StepProgress` may need `max-w-full` instead of `max-w-2xl` since it's inside a panel now
- `ResultsPanel` may need `max-w-full` instead of `max-w-2xl`
- If panels don't fill height, check that `h-full` propagates correctly through the component tree

**Step 4: Type-check**

Run: `npx tsc --noEmit`

**Step 5: Commit any fixes**

```
git add -A
git commit -m "Fix layout issues found during visual verification"
```
