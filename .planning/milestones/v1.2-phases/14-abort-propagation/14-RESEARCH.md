# Phase 14: Abort Propagation - Research

**Researched:** 2026-03-04
**Domain:** Abort signal propagation across Next.js/Mastra/AI SDK stack
**Confidence:** HIGH

## Summary

Abort propagation in this project requires threading an AbortSignal from the HTTP request (or a server-managed AbortController) through the Mastra workflow framework down to every OpenRouter LLM call. The good news: nearly all the infrastructure already exists. Mastra's `Run` class exposes `cancel()` and `abortController`. Every workflow step's `execute` function already receives `abortSignal` and `abort()` as parameters (they're just not destructured in our code). Both `streamWithRetry` and `generateWithRetry` already accept and fully handle `abortSignal` with signal merging, abort-aware retries, and backoff cancellation.

The primary gap is the glue: (1) the API route doesn't pass any signal to the workflow, (2) the workflow steps don't destructure or forward `abortSignal` to their `streamWithRetry`/`generateWithRetry` calls, (3) there's no cancel endpoint for the fallback path, and (4) the frontend abort button just calls `useChat`'s `stop()` which only closes the client-side stream without canceling server-side work.

**Primary recommendation:** Don't use `handleWorkflowStream` (it hides the `Run` object). Instead, call `workflow.createRun()` and `run.stream()` directly in the API route, store the `Run` reference in a module-level Map, and expose a `POST /api/solve/cancel` endpoint that calls `run.cancel()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Confirmation dialog before aborting (prevent accidental clicks)
- After confirmation, instant visual feedback: progress bar immediately shows amber "aborting..." state, running steps switch to canceling indicator
- Abort button disables and shows spinner with "Aborting..." text until fully stopped
- Mascot stays in same neutral state throughout abort (no intermediate "canceling" expression)
- Simple aborted message: "Workflow aborted. Partial results preserved above." (current behavior, keep it)
- Cancel ALL in-flight LLM calls including ones already mid-stream (maximize cost savings)
- Check abort at BOTH iteration boundaries (before starting each verify/improve round) AND mid-step (between individual testRule/testSentence calls)
- Reset and start fresh using existing Reset button (same flow as today)
- Same reset behavior as after completed/failed solves (no special abort-specific handling)
- Must reset before starting a new solve (no auto-reset on new submission)

### Claude's Discretion
- Cancel endpoint implementation approach (server-side AbortController, request tracking, etc.)
- Signal threading architecture (how abort signal flows from HTTP request through workflow steps)
- Error handling for partially-completed steps during abort
- Exact timing/animation of the "aborting" transition state

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ABORT-01 | Workflow steps pass `abortSignal` from execute params to all `streamWithRetry`/`generateWithRetry` calls | Mastra step `execute` already receives `abortSignal` param (confirmed in `step.d.ts` line 47). Both `streamWithRetry` and `generateWithRetry` already accept and handle `abortSignal` (full support in `agent-utils.ts`). Just need to destructure and pass through. |
| ABORT-02 | Aborted workflows display amber "aborted" state in UI, distinct from red "error/failed" state | `StepProgress` already has `'aborted'` status with amber styling. `page.tsx` already detects `isAborted` and converts running steps. Need to add "aborting..." transitional state and confirmation dialog. |
| ABORT-03 | Fallback cancel endpoint (`POST /api/solve/cancel`) guarantees abort when `req.signal` is unreliable | `Run.cancel()` exists in Mastra (confirmed). Need module-level Run tracking in API route and a cancel endpoint. `req.signal` is unreliable in Next.js (confirmed by community reports). |
| ABORT-04 | Verify/improve loop checks `abortSignal.aborted` at iteration boundaries before starting next round | The loop is a `for` loop at workflow.ts line ~232. Add `abortSignal.aborted` check at the top of each iteration and between individual tester tool calls within the orchestrator agent calls. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mastra/core` | 1.8.0 | Workflow framework with built-in `Run.cancel()` and `abortSignal` | Already installed; provides the abort infrastructure |
| `@mastra/ai-sdk` | 1.1.0 | Workflow-to-AI-SDK streaming bridge | Already installed; but we bypass `handleWorkflowStream` |
| `ai` | 6.0.101 | AI SDK with `createUIMessageStream` / `createUIMessageStreamResponse` | Already installed; provides stream creation |
| `next` | 16.1.6 | App Router with route handlers | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@ai-sdk/react` | (installed) | `useChat` hook with `stop()` | Already in use; provides client-side stream abort |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bypassing `handleWorkflowStream` | Patching it to return the `Run` | Too fragile; `handleWorkflowStream` is a simple ~15-line function, easy to inline |
| Module-level `Map<string, Run>` | Redis/DB-based run tracking | Overkill for single-server dev tool |
| Dedicated cancel endpoint | `req.signal` only | `req.signal` is unreliable in Next.js (confirmed by community); need fallback |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/solve/
│   ├── route.ts             # POST handler (bypasses handleWorkflowStream)
│   └── cancel/
│       └── route.ts         # POST handler for cancel endpoint
├── app/api/solve/
│   └── active-runs.ts       # Module-level Map<runId, Run> for tracking
├── mastra/workflow/
│   └── workflow.ts          # Steps destructure abortSignal, pass to agents
├── contexts/
│   └── workflow-control-context.tsx  # Extended with abort confirmation
└── components/
    └── layout-shell.tsx     # Abort button with confirmation dialog
```

### Pattern 1: Bypass handleWorkflowStream to Access Run
**What:** Instead of using `handleWorkflowStream` (which hides the `Run` object), inline its logic to retain a reference to the `Run`.
**When to use:** When you need to call `run.cancel()` from a separate endpoint.
**Confidence:** HIGH (verified by reading `handleWorkflowStream` source at `@mastra/ai-sdk/dist/index.js:4327-4354`)
**Example:**
```typescript
// Source: @mastra/ai-sdk/dist/index.js lines 4327-4354 (handleWorkflowStream internals)
import { createUIMessageStreamResponse, createUIMessageStream } from 'ai';
import { toAISdkStream } from '@mastra/ai-sdk';
import { mastra } from '@/mastra';
import { activeRuns } from './active-runs';

export async function POST(req: Request) {
  const params = await req.json();
  const workflow = mastra.getWorkflowById('solver-workflow')!;
  const run = await workflow.createRun();

  // Store run reference for cancel endpoint
  activeRuns.set(run.runId, run);

  const workflowStream = run.stream({
    inputData: params.inputData,
    requestContext: params.requestContext,
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      for await (const part of toAISdkStream(workflowStream, {
        from: 'workflow',
        includeTextStreamParts: true,
      })) {
        writer.write(part);
      }
    },
  });

  // Clean up run reference when stream ends
  const cleanup = () => activeRuns.delete(run.runId);
  req.signal.addEventListener('abort', cleanup);

  return createUIMessageStreamResponse({ stream });
}
```

### Pattern 2: Active Run Tracking via Module-Level Map
**What:** A simple module-level `Map<string, Run>` that stores active workflow runs.
**When to use:** For the cancel endpoint to find and cancel the correct run.
**Confidence:** HIGH (standard pattern for single-process servers)
**Example:**
```typescript
// src/app/api/solve/active-runs.ts
import type { Run } from '@mastra/core/workflows'; // type-only import

// Module-level singleton — survives across requests in the same process
export const activeRuns = new Map<string, any>(); // Use 'any' to avoid complex generic params
```

### Pattern 3: Cancel Endpoint
**What:** A `POST /api/solve/cancel` endpoint that calls `run.cancel()`.
**When to use:** Called by the frontend when user confirms abort.
**Confidence:** HIGH (verified `Run.cancel()` exists in `@mastra/core` types)
**Example:**
```typescript
// src/app/api/solve/cancel/route.ts
import { activeRuns } from '../active-runs';

export async function POST(req: Request) {
  // Cancel ALL active runs (only one expected at a time)
  const cancelled: string[] = [];
  for (const [runId, run] of activeRuns) {
    await run.cancel();
    cancelled.push(runId);
  }
  // Cleanup happens via the abort signal listener or stream completion
  return Response.json({ cancelled });
}
```

### Pattern 4: Signal Threading in Workflow Steps
**What:** Destructure `abortSignal` from step execute params, pass it to every `streamWithRetry`/`generateWithRetry` call.
**When to use:** In every step's execute function.
**Confidence:** HIGH (verified types in `step.d.ts` and existing `abortSignal` handling in `agent-utils.ts`)
**Example:**
```typescript
const extractionStep = createStep({
  id: 'extract-structure',
  execute: async ({ inputData, mastra, bail, state, setState, writer, abortSignal }) => {
    // ...
    const response = await streamWithRetry(
      mastra.getAgentById('structured-problem-extractor'),
      {
        prompt: extractPrompt,
        abortSignal, // <-- Thread the signal
        options: { ... },
      },
    );
    // ...
  },
});
```

### Pattern 5: Iteration Boundary Abort Checks
**What:** Check `abortSignal.aborted` at the top of each round in the verify/improve loop.
**When to use:** At the start of each iteration of the `for (let round = 1; ...)` loop.
**Confidence:** HIGH (standard AbortSignal pattern, documented in Mastra docs)
**Example:**
```typescript
for (let round = 1; round <= effectiveMaxRounds; round++) {
  // Check abort before starting a new round
  if (abortSignal.aborted) {
    console.log(`[Round ${round}] Abort signal detected, stopping iteration.`);
    break;
  }
  // ... rest of round logic
}
```

### Pattern 6: Frontend Confirmation + Cancel Request
**What:** Confirmation dialog on abort click, then POST to cancel endpoint, with immediate visual feedback.
**When to use:** When user clicks the Abort button.
**Confidence:** HIGH (standard UI pattern)
**Example:**
```typescript
const handleAbort = useCallback(async () => {
  if (!confirm('Stop the current solve? All in-flight API calls will be cancelled.')) return;
  // Immediate visual feedback
  setIsAborting(true);
  // Close client-side stream
  stop();
  // Cancel server-side work
  await fetch('/api/solve/cancel', { method: 'POST' });
}, [stop]);
```

### Anti-Patterns to Avoid
- **Relying solely on `req.signal`:** Next.js `req.signal` abort is unreliable (community-confirmed issue, GitHub discussion #48682). Always use the cancel endpoint as the primary mechanism.
- **Trying to abort from within `handleWorkflowStream`:** This function does not expose the `Run` object. Don't monkey-patch it.
- **Throwing errors on abort:** The workflow should show "aborted" not "failed". Use `break` out of loops and return partial results rather than throwing.
- **Forgetting to clean up the active runs Map:** Always remove the run reference when the workflow completes (success, failure, or cancellation).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workflow cancellation | Custom abort controller chains | `Run.cancel()` from `@mastra/core` | It signals the AbortController, sets status to 'canceled', stops subsequent steps |
| Signal merging | Manual signal event forwarding | `AbortSignal.any()` (Web API) | Already used in `agent-utils.ts`; handles multiple signal sources correctly |
| Abort-aware retry logic | Custom retry-with-abort | Existing `streamWithRetry`/`generateWithRetry` | Already has full abort support: caller signal check, abort-aware backoff, immediate propagation |
| Inline workflow streaming | Rebuilding stream pipeline | `toAISdkStream` + `createUIMessageStream` | These are the exact internals of `handleWorkflowStream` |

**Key insight:** The abort infrastructure is 90% built. `agent-utils.ts` already handles abort signals perfectly. `Run.cancel()` already triggers the abort. The only missing piece is the wiring: passing signals through and exposing the `Run` for external cancellation.

## Common Pitfalls

### Pitfall 1: Confusing "aborted" with "failed" in UI
**What goes wrong:** The workflow throws an AbortError, which the UI interprets as a failure (red state).
**Why it happens:** Abort errors propagate as exceptions, and the frontend currently distinguishes states by `workflowStatus === 'failed'`.
**How to avoid:** When `Run.cancel()` is called, Mastra sets the status to `'canceled'` (not `'failed'`). The frontend should check for the canceled status OR detect that `isAborted` (already implemented via `hasStarted && !isRunning && !isComplete && !isFailed`). The key is that the cancel endpoint + `stop()` will make `isRunning` become false while `workflowStatus` is neither `'success'` nor `'failed'`, triggering the existing `isAborted` detection.
**Warning signs:** Aborted workflows showing red error state instead of amber.

### Pitfall 2: Run reference memory leak
**What goes wrong:** The `activeRuns` Map accumulates entries for completed/failed runs.
**Why it happens:** Cleanup only happens on abort, not on normal completion.
**How to avoid:** Register a cleanup callback that runs regardless of outcome. The stream `for await` loop completes naturally on success/failure, so add cleanup after the loop. Also add a `finally` block and a safety check in the Map (e.g., auto-cleanup entries older than 15 minutes).
**Warning signs:** Memory growth over many solve cycles.

### Pitfall 3: Race condition between stream completion and cancel
**What goes wrong:** Cancel endpoint called after the workflow has already completed, causing a no-op or error.
**Why it happens:** User clicks abort right as the workflow finishes.
**How to avoid:** Make cancel idempotent. If `run.cancel()` is called after completion, it should be a no-op. Check if the run is still in the `activeRuns` map and handle gracefully. Return appropriate status from cancel endpoint.
**Warning signs:** Console errors after aborting near workflow completion.

### Pitfall 4: `req.signal` unreliability
**What goes wrong:** Relying on `req.signal` as the primary abort mechanism, but it doesn't fire.
**Why it happens:** Next.js App Router's `req.signal` abort event is unreliable (documented in [Next.js discussion #48682](https://github.com/vercel/next.js/discussions/48682)).
**How to avoid:** Use the cancel endpoint as the primary mechanism. Optionally wire `req.signal` as a secondary listener for defense-in-depth, but never depend on it alone.
**Warning signs:** Abort works in dev but not in production (different connection handling).

### Pitfall 5: Tester tools not receiving abort signal
**What goes wrong:** The verify/improve step aborts, but individual `testRule`/`testSentence` tool calls keep running because they create their own `generateWithRetry` calls without an abort signal.
**Why it happens:** Tool execute functions don't receive the step's abort signal directly.
**How to avoid:** The tools call `generateWithRetry` which already accepts `abortSignal`. Thread the abort signal through RequestContext (e.g., store it as a new key in `WorkflowRequestContext`) so tools can read and pass it to their `generateWithRetry` calls.
**Warning signs:** OpenRouter charges continue accumulating for 30+ seconds after abort.

### Pitfall 6: Parallel promises not canceling on abort
**What goes wrong:** `Promise.all(hypothesizePromises)` or `Promise.all(verifyPromises)` has one promise abort but the others continue running.
**Why it happens:** `Promise.all` rejects on first rejection but doesn't cancel other promises.
**How to avoid:** All parallel promises share the same `abortSignal` from the step. When one detects abort, they all detect it simultaneously because they all check the same signal. The signal is set by `run.cancel()` at the workflow level, so all in-flight LLM calls get the abort signal.
**Warning signs:** After abort, some parallel LLM calls complete normally instead of stopping.

## Code Examples

### Example 1: Complete API Route with Run Tracking
```typescript
// Source: Pattern derived from @mastra/ai-sdk handleWorkflowStream internals
// (index.js lines 4327-4354) + @mastra/core Run.cancel() API
import { createUIMessageStreamResponse, createUIMessageStream } from 'ai';
import { toAISdkStream } from '@mastra/ai-sdk';
import { mastra } from '@/mastra';
import { activeRuns } from './active-runs';

export const maxDuration = 600;

export async function POST(req: Request) {
  const params = await req.json();
  const workflow = mastra.getWorkflowById('solver-workflow')!;
  const run = await workflow.createRun();

  activeRuns.set(run.runId, run);

  const workflowStream = run.stream({
    inputData: params.inputData,
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      try {
        for await (const part of toAISdkStream(workflowStream, {
          from: 'workflow',
          includeTextStreamParts: true,
        })) {
          writer.write(part);
        }
      } finally {
        activeRuns.delete(run.runId);
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

### Example 2: Abort Signal Threading in Step Execute
```typescript
// Source: Mastra step.d.ts ExecuteFunctionParams type definition
execute: async ({ inputData, mastra, bail, state, setState, writer, abortSignal }) => {
  const response = await streamWithRetry(
    mastra.getAgentById('some-agent'),
    {
      prompt: '...',
      abortSignal,  // Thread directly from step params
      options: { maxSteps: 100, requestContext },
    },
  );
}
```

### Example 3: Storing Abort Signal in RequestContext for Tools
```typescript
// In workflow step, after getting abortSignal from step params:
mainRequestContext.set('abort-signal', abortSignal);

// In tool execute function:
const abortSignal = requestContext.get('abort-signal') as AbortSignal | undefined;
const result = await generateWithRetry(mastra.getAgentById('rule-tester'), {
  prompt,
  abortSignal,
  options: { ... },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No abort support in Mastra workflows | `Run.cancel()` + `abortSignal` in step execute | Mastra 1.x (current) | Full cooperative cancellation support |
| `handleWorkflowStream` only | Direct `run.stream()` + `toAISdkStream` composition | Always available, just not documented for this use case | Gives access to `Run` for cancellation |
| `useChat` `stop()` = full abort | `stop()` only closes client stream; server needs explicit cancel | AI SDK v6 (current) | Frontend stop is cosmetic without server-side cancel |

**Deprecated/outdated:**
- Relying on `req.signal` in Next.js as the sole abort mechanism (unreliable per community reports)

## Open Questions

1. **What status does Mastra set when `run.cancel()` is called?**
   - What we know: The docs say it "updates the workflow status to 'canceled' in storage." The `Run.cancel()` method exists and triggers the abort signal.
   - What's unclear: Whether the stream emits a `data-workflow` event with status `'canceled'` or if the stream just ends. The frontend currently detects abort via `isAborted = hasStarted && !isRunning && !isComplete && !isFailed`, which should still work.
   - Recommendation: Test during implementation. If the stream emits a canceled status, add it to the detection logic. If not, the existing `isAborted` inference should suffice.

2. **Does `toAISdkStream` need the `from: 'workflow'` option?**
   - What we know: `handleWorkflowStream` passes `{ from: 'workflow' }` to `toAISdkStream` (previously named `toAISdkV5Stream`).
   - What's unclear: Whether the export name is `toAISdkStream` or `toAISdkV5Stream` in the installed version.
   - Recommendation: Check the actual export name from `@mastra/ai-sdk` at implementation time. The source shows it's exported as `toAISdkStream` (alias of internal `toAISdkV5Stream`).

3. **Does `WorkflowRequestContext` need a new `abort-signal` key?**
   - What we know: Tools currently have no way to access the step-level abort signal. RequestContext is the mechanism for passing data from steps to tools.
   - What's unclear: Whether there's a better Mastra-native way for tools to access the abort signal.
   - Recommendation: Add `'abort-signal': AbortSignal` to `WorkflowRequestContext` interface. This follows the established pattern of passing step-level data to tools via RequestContext (same as `step-writer`).

## Sources

### Primary (HIGH confidence)
- `@mastra/core@1.8.0` types — `node_modules/@mastra/core/dist/workflows/step.d.ts` (ExecuteFunctionParams with `abortSignal` and `abort()`)
- `@mastra/core@1.8.0` types — `node_modules/@mastra/core/dist/workflows/workflow.d.ts` (Run class with `abortController` getter, `cancel()` method)
- `@mastra/ai-sdk@1.1.0` source — `node_modules/@mastra/ai-sdk/dist/index.js` lines 4327-4354 (handleWorkflowStream implementation)
- Mastra official docs — `reference/workflows/run-methods/cancel.md` (Run.cancel() documentation with abort signal behavior)
- Project source — `src/mastra/workflow/agent-utils.ts` (existing `abortSignal` support in both `streamWithRetry` and `generateWithRetry`)
- Project source — `src/mastra/workflow/workflow.ts` (step execute functions that need `abortSignal` destructuring)

### Secondary (MEDIUM confidence)
- [Next.js discussion #48682](https://github.com/vercel/next.js/discussions/48682) — `req.signal` unreliability in App Router (multiple community reports, partially resolved)
- Project source — `src/components/step-progress.tsx` (existing `'aborted'` status with amber styling)
- Project source — `src/app/page.tsx` (existing `isAborted` detection and display)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries already installed, types verified, source code read
- Architecture: HIGH — Pattern derived directly from reading `handleWorkflowStream` source and `Run` API types; straightforward composition
- Pitfalls: HIGH — Identified from direct code analysis and community-reported issues with verified sources

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable — Mastra core APIs unlikely to change in 30 days)
