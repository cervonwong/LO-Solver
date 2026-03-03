# Stack Research

**Domain:** Abort propagation, file refactoring, toast notifications for existing Mastra/Next.js agentic workflow app
**Researched:** 2026-03-03
**Confidence:** HIGH

## Recommended Stack

This milestone requires minimal new dependencies. The existing stack already has abort infrastructure in `agent-utils.ts` and Mastra's `abortSignal` in step execute functions. Sonner is the only new package.

### Core Technologies (already installed -- no changes)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| @mastra/core | 1.8.0 | Workflow execution with `abortSignal` in step execute params | Already supports abort -- `execute({ abortSignal })` is available |
| @mastra/ai-sdk | 1.1.0 | `handleWorkflowStream` bridges Mastra workflows to AI SDK streams | Already installed, no changes needed |
| ai (AI SDK) | 6.0.101 | `useChat` with `stop()` for client-side stream cancellation | Already installed |
| @ai-sdk/react | 3.0.103 | `useChat` hook, provides `stop` callback | Already installed |

### New Dependencies

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| sonner | ^2.0.7 | Toast notifications for workflow lifecycle events | shadcn/ui has first-class Sonner integration via `npx shadcn@latest add sonner`. Zero-config, opinionated defaults, supports `toast.custom()` for branded toasts. Already the standard in the shadcn ecosystem -- no alternatives worth considering. |

### Supporting Libraries (already installed -- no changes)

| Library | Version | Purpose | Relevant to This Milestone |
|---------|---------|---------|---------------------------|
| lucide-react | 0.575.0 | Icons for toast notifications | Use existing icons for toast types |
| class-variance-authority | 0.7.1 | Variant styling for custom toast components | May use for toast styling variants |

### Development Tools (no changes)

No new dev tools needed. TypeScript, Prettier, and shadcn CLI are sufficient.

## Installation

```bash
# Only new dependency: Sonner via shadcn (preferred method)
npx shadcn@latest add sonner

# This installs `sonner` as a dependency AND creates
# `src/components/ui/sonner.tsx` with a pre-configured <Toaster /> wrapper.
```

The shadcn installation will:
1. Add `sonner` to `package.json` dependencies
2. Create `src/components/ui/sonner.tsx` exporting a themed `<Toaster />` component
3. The component auto-inherits the project's design tokens (colors, fonts, etc.)

## Integration Points

### 1. Abort Signal Propagation (NO new packages)

The full abort chain requires connecting three existing layers:

**Layer 1: Client (already works)**
- `useChat()` returns `stop` callback
- `stop()` aborts the fetch request, closing the SSE connection
- UI already handles aborted state (amber steps, mascot state)

**Layer 2: API Route -> Workflow Run (GAP -- needs wiring)**
- `handleWorkflowStream` from `@mastra/ai-sdk` creates and starts a workflow `Run`
- `Run` has a public `abortController` getter and `cancel()` method
- `createUIMessageStreamResponse` does NOT forward `req.signal` to the workflow run
- The route handler currently does not pass `req.signal` through to the workflow

The gap: when the client calls `stop()`, the HTTP connection closes, but `handleWorkflowStream` does not detect this and the workflow continues executing. The route handler needs to listen for `req.signal.abort` and call `run.cancel()`.

**Approach:** Since `handleWorkflowStream` returns a `ReadableStream` but does not expose the `Run` object, the solution involves either:
- (a) Calling the workflow directly (bypass `handleWorkflowStream`) to get access to the `Run` object and its `cancel()` method, OR
- (b) Attaching a `req.signal` abort listener that cancels the stream, which propagates back to the workflow

**Layer 3: Workflow Steps -> Agent Calls (PARTIAL -- needs completion)**
- Mastra `createStep` execute function receives `abortSignal` parameter (confirmed in types)
- `generateWithRetry` and `streamWithRetry` in `agent-utils.ts` already accept `abortSignal` and propagate it to `agent.generate()` / `agent.stream()`
- The gap: workflow steps do NOT currently pass their `abortSignal` to the agent utility calls

**What to wire:** Each workflow step's execute function needs to destructure `abortSignal` and pass it through to `streamWithRetry`/`generateWithRetry` calls.

### 2. Sonner Toast Notifications (new package: sonner)

**Setup:**
1. `npx shadcn@latest add sonner` creates the themed component
2. Add `<Toaster />` to `src/app/layout.tsx` (server component, just add the import and component)
3. Call `toast()` / `toast.success()` / `toast.error()` / `toast.custom()` from client components

**Integration with workflow events:**
- Toast triggers should fire from `page.tsx` (or a custom hook) based on workflow status changes
- `toast.loading()` for workflow start
- `toast.success()` for workflow complete
- `toast.error()` for workflow failed
- `toast.custom()` for branded toasts matching the blueprint/cyanotype design system
- `toast.warning()` for cost warnings (long-running, many retries)

**Custom styling:**
- Sonner supports `className`, `style`, and `richColors` prop on `<Toaster />`
- For the blueprint design system, use `toast.custom()` to render JSX with project CSS classes
- `toast.custom((id) => <div>...</div>)` gives full control over markup while preserving animations

### 3. File Refactoring (NO new packages)

Pure code organization work. Target files by line count:

| File | Lines | Refactoring Approach |
|------|-------|---------------------|
| `workflow.ts` | 1,399 | Split into per-step files (e.g., `steps/extract.ts`, `steps/hypothesize.ts`, `steps/verify.ts`, `steps/answer.ts`) |
| `trace-event-card.tsx` | 898 | Extract sub-renderers for each event type into separate components |
| `page.tsx` | 824 | Extract hooks (`useProgressSteps`, `useTraceEvents`), extract sub-components |
| `evals/run.ts` | 491 | May be fine as-is (CLI entry point, linear flow) |
| `trace-utils.ts` | 476 | Consider splitting grouping vs parsing logic |
| `workflow-schemas.ts` | 405 | May be fine (schema definitions are naturally co-located) |
| `request-context-helpers.ts` | 370 | May be fine (utility functions) |

No libraries needed. Standard TypeScript module extraction patterns.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| sonner (via shadcn) | react-hot-toast | Never for this project -- shadcn has Sonner integration, react-hot-toast does not |
| sonner (via shadcn) | @radix-ui/react-toast | Never for this project -- Radix Toast is lower-level; Sonner wraps it with better DX |
| sonner (via shadcn) | notistack | Never -- MUI ecosystem, not compatible with Tailwind/shadcn design |
| Direct `Run.cancel()` | Custom abort via storage/polling | Never -- Mastra has native cancel support; don't build a workaround |
| Pass `abortSignal` through steps | Ignore abort in steps | Only if Mastra changes its abort propagation model in a future version |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-toastify | Heavy, opinionated CSS that conflicts with Tailwind, no shadcn integration | sonner via shadcn |
| Custom WebSocket for abort | Over-engineered; SSE connection close + `req.signal` is sufficient | `req.signal` abort listener in route handler |
| AbortController in RequestContext | Tempting to store abort controller in Mastra's RequestContext, but the signal is already provided by the framework in step execute params | Use the `abortSignal` parameter from `createStep`'s execute function |
| New state management for toasts | Sonner is fire-and-forget, no store needed | Direct `toast()` calls from event handlers |
| Barrel file re-exports for refactored modules | Creates circular dependency risk and slows TypeScript resolution | Direct imports from specific files |

## Stack Patterns by Feature

**Abort propagation:**
- Use the native `abortSignal` from Mastra step execute params
- Pass it to `streamWithRetry` / `generateWithRetry` via the existing `abortSignal` option
- In the API route, listen for `req.signal` abort event and cancel the stream/run
- No new packages needed

**Toast notifications:**
- Use `sonner` installed via `npx shadcn@latest add sonner`
- Place `<Toaster />` in layout.tsx (once, globally)
- Trigger toasts from the main page component or a dedicated `useWorkflowToasts` hook
- Use `toast.custom()` for branded notifications matching the blueprint design

**File refactoring:**
- Extract workflow steps from `workflow.ts` into `src/mastra/workflow/steps/` directory
- Extract trace event renderers from `trace-event-card.tsx` into sub-components
- Extract page-level logic from `page.tsx` into custom hooks
- Keep re-exports in original files for backward compatibility during transition

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| sonner ^2.0.7 | React 19.2.4 | Sonner 2.x supports React 18+ and 19 |
| sonner ^2.0.7 | Next.js 16.1.6 | Works in both server and client components (Toaster is client, toast() is client-only) |
| sonner ^2.0.7 | shadcn 3.8.5 | shadcn has built-in Sonner component template |
| @mastra/core 1.8.0 | ai 6.0.101 | Both already installed and working together |

## Key Technical Details

### Mastra Step AbortSignal (confirmed from types)

```typescript
// From @mastra/core step.d.ts -- execute receives abortSignal:
execute: async ({ inputData, abortSignal, abort, writer, mastra, state, setState }) => {
  // abortSignal: AbortSignal -- standard Web API
  // abort: () => void -- function to trigger abort from within step

  // Pass to agent calls:
  const result = await streamWithRetry(agent, {
    prompt: '...',
    abortSignal,  // <-- wire this through
  });
}
```

### Sonner Toast API (relevant subset)

```typescript
import { toast } from 'sonner';

// Basic types
toast('Workflow started');
toast.success('Workflow complete');
toast.error('Workflow failed');
toast.warning('High cost warning');
toast.loading('Solving...');

// Custom JSX (for blueprint-themed toasts)
toast.custom((id) => (
  <div className="...blueprint styles...">
    <span>Workflow complete in 45s</span>
    <button onClick={() => toast.dismiss(id)}>Dismiss</button>
  </div>
));

// With options
toast.success('Complete', {
  description: '4 questions answered correctly',
  duration: 5000,
});
```

### AI SDK useChat stop() Behavior

```typescript
// Client side -- already works:
const { stop } = useChat({ transport });
// stop() aborts the fetch, closing SSE connection

// Server side -- needs wiring:
export async function POST(req: Request) {
  const params = await req.json();
  const stream = await handleWorkflowStream({ mastra, workflowId: '...', params });

  // Option A: Use req.signal to detect client disconnect
  // Note: req.signal reliability varies by runtime (known Next.js issues)
  // Option B: Implement a cancel endpoint the client calls on stop()

  return createUIMessageStreamResponse({ stream });
}
```

### Known Limitation: req.signal in Next.js

There are documented issues with `req.signal` abort event not always firing in Next.js route handlers (GitHub issue #48682, #50364). The workaround patterns include:

1. **Dual approach:** Listen for `req.signal.abort` AND implement a separate cancel endpoint
2. **Polling-based:** Client sends abort request to a `/api/cancel` endpoint that looks up and cancels the run
3. **Stream-aware:** When the SSE stream consumer disconnects, the ReadableStream should eventually error, which can trigger cleanup

For this project, the pragmatic approach is:
- Try `req.signal` first (it may work in current Next.js 16.1.6)
- Fall back to a cancel endpoint if signal is unreliable
- Either way, the workflow steps need `abortSignal` wired through regardless

## Sources

- [@mastra/core workflow.d.ts](local: node_modules/@mastra/core/dist/workflows/workflow.d.ts) -- Run.cancel(), abortController, step execute params (HIGH confidence)
- [@mastra/core step.d.ts](local: node_modules/@mastra/core/dist/workflows/step.d.ts) -- Step execute function receives abortSignal (HIGH confidence)
- [@mastra/ai-sdk workflow-route.d.ts](local: node_modules/@mastra/ai-sdk/dist/workflow-route.d.ts) -- handleWorkflowStream params (HIGH confidence)
- [ai SDK index.d.ts](local: node_modules/ai/dist/index.d.ts) -- UIMessageStreamOnFinishCallback with isAborted flag (HIGH confidence)
- [Mastra Run.cancel() docs](https://mastra.ai/reference/workflows/run-methods/cancel) -- Cancel mechanism and AbortSignal integration (HIGH confidence)
- [AI SDK Stopping Streams docs](https://ai-sdk.dev/docs/advanced/stopping-streams) -- Client-to-server abort propagation (HIGH confidence)
- [Sonner shadcn/ui integration](https://ui.shadcn.com/docs/components/radix/sonner) -- Installation and setup (HIGH confidence)
- [Sonner official docs](https://sonner.emilkowal.ski/toast) -- Toast API (HIGH confidence)
- [GitHub: AI SDK abort signal bug #9707](https://github.com/vercel/ai/issues/9707) -- chat.stop() backend detection issues (MEDIUM confidence, may not apply to Next.js runtime)
- [GitHub: Mastra abort propagation #11063](https://github.com/mastra-ai/mastra/issues/11063) -- Sub-workflow signal propagation (MEDIUM confidence, issue is closed/resolved)
- [GitHub: Next.js req.signal issues #48682](https://github.com/vercel/next.js/discussions/48682) -- Client disconnection detection in route handlers (MEDIUM confidence, older versions)

---
*Stack research for: LO-Solver v1.2 Cleanup & Quality milestone*
*Researched: 2026-03-03*
