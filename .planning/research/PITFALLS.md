# Pitfalls Research

**Domain:** Adding abort propagation, file refactoring, and toast notifications to an existing Mastra/Next.js streaming workflow app
**Researched:** 2026-03-03
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Client-Side `stop()` Does Not Cancel Backend Workflow Execution

**What goes wrong:**
The current abort button calls `useChat`'s `stop()`, which only closes the client-side HTTP stream reader. The Mastra workflow, all in-flight `streamWithRetry` agent calls, and their OpenRouter LLM requests continue running on the server until completion. The user sees "aborted" in the UI, but API credits keep burning for minutes afterward. The `handleWorkflowStream` function in `@mastra/ai-sdk` does not pass any abort signal or expose the `run` object for cancellation.

**Why it happens:**
`stop()` from `useChat` aborts the client-side `fetch` ReadableStream reader. In the AI SDK's streaming model, this *should* propagate as an aborted `req.signal` to the server-side route handler. However, `handleWorkflowStream` ignores `req.signal` entirely -- it calls `run.stream()` without forwarding any abort signal. Even if it did, the three workflow steps (`extractionStep`, `multiPerspectiveHypothesisStep`, `answerQuestionsStep`) destructure `{ inputData, mastra, bail, state, setState, writer }` but never destructure or use `abortSignal` -- the parameter that Mastra provides for cooperative cancellation. Additionally, none of the 11 `streamWithRetry` calls in `workflow.ts` pass an `abortSignal` option.

**How to avoid:**
1. In the API route (`/api/solve/route.ts`), stop using `handleWorkflowStream` as a black box. Instead, manually call `workflow.createRun()` and `run.stream()`, then listen for `req.signal` abort to call `run.cancel()`.
2. In each workflow step's `execute` function, destructure `abortSignal` from the context and pass it to every `streamWithRetry` call. The `streamWithRetry` and `generateWithRetry` functions already accept `abortSignal` -- they just never receive one from the workflow steps.
3. Between sequential agent calls within a step (the multi-perspective step has ~20 sequential agent invocations), check `abortSignal.aborted` and call `abort()` to bail early.

**Warning signs:**
- After clicking abort, Mastra Studio shows the workflow still running
- OpenRouter dashboard shows API calls continuing after abort
- Server console logs show agent output arriving after the client disconnected

**Phase to address:**
Phase 1 (Abort Propagation) -- this is the primary purpose of the abort feature and should be implemented first, before any other changes.

---

### Pitfall 2: Missing `abortSignal` Checks Between Sequential Agent Calls Within a Step

**What goes wrong:**
Even after threading `abortSignal` through to `streamWithRetry`, the multi-perspective hypothesis step (`multiPerspectiveHypothesisStep`) runs a complex loop: dispatcher -> N parallel hypothesizers -> N parallel verifiers -> synthesizer -> convergence verifier -> possibly more rounds. If the abort signal fires between two of these phases (e.g., after the dispatcher returns but before hypothesizers start), the next `streamWithRetry` call will check the signal and throw, but only because `streamWithRetry` has `callerSignal?.throwIfAborted()` at the top. The real danger is the *control flow code between agent calls*: map/emit/store operations, draft store creation, `for` loops iterating perspectives, etc. These can take non-trivial time and will not be interrupted unless explicitly checked.

**Why it happens:**
Developers thread the abort signal through to the deepest async calls (the LLM request) but forget to check it at the *orchestration level* -- the loop control, the "should we start another round" decision, the "should we start the next perspective" decision.

**How to avoid:**
Add `abortSignal.aborted` checks at every loop boundary and before every expensive operation:
- Before each round iteration starts
- Before starting each perspective's hypothesizer
- Before starting the convergence verification
- Before starting the answer step
- Between the verifier and improver within a perspective's verify/improve loop

Create a small helper: `function throwIfAborted(signal: AbortSignal) { if (signal.aborted) throw new Error('Workflow aborted'); }` and call it at each checkpoint.

**Warning signs:**
- Abort during the multi-perspective step still runs 1-2 more agent calls before stopping
- Abort takes 30-60 seconds to actually stop all work despite the signal being set immediately

**Phase to address:**
Phase 1 (Abort Propagation) -- must be done as part of the abort signal threading work.

---

### Pitfall 3: Breaking the Re-Export Contract When Splitting `workflow.ts` Into Modules

**What goes wrong:**
`workflow.ts` (1,399 lines) is imported by `src/mastra/index.ts` as `import { solverWorkflow } from './workflow/workflow'`. The workflow is also indirectly consumed by `handleWorkflowStream` via the Mastra instance's workflow registry. If the file is split and the export location of `solverWorkflow` changes, the import in `mastra/index.ts` breaks. More subtly, if step definitions are moved to separate files but their closures over shared helpers (like `streamWithRetry`, `emitTraceEvent`, or `RequestContext` types) are not correctly resolved, TypeScript will compile but the runtime behavior will differ -- particularly if a step references a function that was in the same file scope but is now imported from a different module.

**Why it happens:**
Large files often have implicit coupling through shared local scope. In `workflow.ts`, all three steps share: (1) imported helpers at the top, (2) inline closures that capture `mastra`, `writer`, `state` from the step context, and (3) type imports. When splitting, it is tempting to move each step to its own file without auditing what each step actually references from the shared scope. TypeScript catches missing imports, but it does not catch subtle issues like module initialization order or circular references between step files.

**How to avoid:**
1. Keep `solverWorkflow` (the `createWorkflow(...).then().then().then().commit()` chain) in the original `workflow.ts` file as the composition root. Move only the step *definitions* (`extractionStep`, `multiPerspectiveHypothesisStep`, `answerQuestionsStep`) to separate files.
2. Maintain the existing import path for `solverWorkflow` so `mastra/index.ts` does not need to change.
3. After each file split, run `npx tsc --noEmit` immediately -- do not batch multiple splits. The project has no test framework, so the TypeScript compiler is the primary safety net.
4. Verify the eval harness still works (`npm run eval -- --problem 1`) after the refactor -- this is the only runtime validation available.

**Warning signs:**
- `npx tsc --noEmit` shows new errors after splitting
- Runtime `TypeError: X is not a function` or `Cannot read properties of undefined` when agents are invoked
- Workflow status shows `failed` in Mastra Studio after a refactor that compiled clean

**Phase to address:**
Phase 2 (File Refactoring) -- must be done carefully with compiler checks after each change.

---

### Pitfall 4: Sonner Toasts Firing Multiple Times in Streaming Data Flows

**What goes wrong:**
The solver page derives workflow state from streaming data parts (`allParts` array). When using `useEffect` to trigger toasts on state changes (e.g., `isComplete`, `isAborted`, `isFailed`), React Strict Mode in development causes effects to run twice, producing duplicate toasts. Additionally, the streaming nature means state variables transition through intermediate values (e.g., `workflowStatus` goes from `undefined` -> `'running'` -> `'success'`), and poorly guarded effects will fire toasts on each intermediate transition.

**Why it happens:**
Sonner's `toast()` function is imperative -- each call creates a new toast. In a streaming UI where state is derived from an ever-growing array of data parts (`allParts`), the `useMemo` dependencies change on every new chunk, which can retrigger effects. The existing code already uses `// eslint-disable-next-line react-hooks/exhaustive-deps` with `allParts.length` as a dependency hack. Adding toast effects tied to these derived states without careful deduplication will produce ghost toasts.

**How to avoid:**
1. Use refs to track whether each toast has already been shown: `const shownToasts = useRef(new Set<string>())`. Before calling `toast()`, check if the toast ID has been shown.
2. Use Sonner's built-in `toast.id` parameter for idempotent updates: `toast.success('Workflow complete', { id: 'workflow-complete' })`. Calling `toast()` with the same `id` updates the existing toast rather than creating a new one.
3. Derive toast triggers from *transition detection* (prev vs. current state) using a ref that stores the previous state, not from absolute state values.
4. Keep toast logic in a single `useEffect` or a custom hook (`useWorkflowToasts`) that consolidates all toast-related state watching.

**Warning signs:**
- Two "Workflow complete" toasts appear simultaneously
- Toast appears when the page first renders before any workflow has run
- Cost warning toasts repeat on every streaming chunk

**Phase to address:**
Phase 3 (Toast Notifications) -- fundamental to correct toast implementation.

---

### Pitfall 5: `req.signal` Not Propagating Through Next.js Route Handlers to the Workflow

**What goes wrong:**
Even after modifying the API route to use `req.signal`, Next.js does not reliably propagate client disconnection as an aborted `req.signal` in all deployment modes. This is a known issue (vercel/next.js#48682, vercel/next.js#50364). In development with `next dev` (Turbopack), the signal behavior may differ from production. The `maxDuration = 600` (10 minutes) in the route means the connection stays alive for a long time. If `req.signal` never fires, `run.cancel()` is never called, and the abort button becomes cosmetic.

**Why it happens:**
Next.js route handlers wrap the underlying Node.js request, and client disconnection detection depends on the runtime (Node.js vs Edge) and the deployment target. The AI SDK team has documented this as a recurring issue. Turbopack may handle it differently than Webpack.

**How to avoid:**
1. Do not rely solely on `req.signal`. Implement a secondary abort mechanism: a dedicated API endpoint (`POST /api/solve/cancel`) that the frontend calls when the user clicks abort. This endpoint stores the `runId` and triggers `run.cancel()` directly.
2. Store the `run` object or `runId` in a server-side map keyed by some session/request identifier, so the cancel endpoint can look it up.
3. Test abort behavior in both `next dev` and `next build && next start` to verify `req.signal` works in each mode.

**Warning signs:**
- Abort works in one environment but not another
- `req.signal.aborted` is always `false` even after the client disconnects
- Adding `console.log` to the abort listener shows it never fires

**Phase to address:**
Phase 1 (Abort Propagation) -- the architecture must account for unreliable `req.signal` from the start.

---

### Pitfall 6: `page.tsx` Refactoring Breaks the Register Pattern for Workflow Control

**What goes wrong:**
`page.tsx` (824 lines) is a candidate for refactoring. It uses a "register pattern" where the child page pushes workflow state (`isRunning`, `hasStarted`, `stop`, `handleReset`) into a layout-level context (`WorkflowControlProvider`) via `useRegisterWorkflowControl`. If the page is split into sub-components, the hook that calls `useRegisterWorkflowControl` must remain in the component that owns the `useChat` hook and the derived state -- it cannot be moved to a child component that does not have access to the `stop` function or the `status` from `useChat`. Splitting the file incorrectly moves the registration call away from the state owner, breaking the abort button in the nav bar.

**Why it happens:**
React hooks cannot be conditionally called or moved between components without changing their execution context. The `useRegisterWorkflowControl` call is tightly coupled to the component that owns `useChat` because it needs `stop` and `isRunning` from that hook's return value.

**How to avoid:**
1. Keep `useChat`, `useRegisterWorkflowControl`, and all state derivation (`isRunning`, `isComplete`, `isAborted`) in the main `SolverPageInner` component. Extract only *render subtrees* (JSX) into separate components, not hook logic.
2. If extracting hooks, create a custom hook (e.g., `useSolverWorkflow`) that encapsulates both `useChat` and `useRegisterWorkflowControl` and returns all derived state. This hook must stay in the same component that renders.
3. After any refactor of `page.tsx`, verify: (a) abort button in nav still works, (b) reset button clears state, (c) mascot state transitions work.

**Warning signs:**
- Abort button in the nav bar does nothing after refactoring
- `useWorkflowControl must be used within WorkflowControlProvider` error
- Mascot stays in "solving" state after abort

**Phase to address:**
Phase 2 (File Refactoring) -- must be verified as part of `page.tsx` splitting.

---

### Pitfall 7: Abort Error Propagation Causes Workflow Status to Show "Failed" Instead of "Aborted"

**What goes wrong:**
When `streamWithRetry` receives an aborted signal, it throws an error. If this error is not caught and handled distinctly from other errors at the step level, the step fails with an error status. Mastra marks the workflow as `failed` (not `canceled`), and the frontend shows the red error state instead of the amber abort state. The existing frontend code determines abort status via inference: `const isAborted = hasStarted && !isRunning && !isComplete && !isFailed` -- meaning if the workflow reports `failed`, the abort state is never reached.

**Why it happens:**
Abort errors and genuine failures both propagate as thrown exceptions. Without explicit handling, they are indistinguishable. Mastra's `run.cancel()` sets the workflow status to `canceled`, but if the step throws an error *before* the cancellation status is recorded, the error status wins.

**How to avoid:**
1. In each step's `execute` function, wrap the main logic in a try/catch that checks `abortSignal.aborted` in the catch block. If aborted, call `abort()` (the Mastra-provided function) instead of rethrowing the error.
2. Ensure the frontend checks for `canceled` workflow status in addition to the current inference logic. Add `workflowStatus === 'canceled'` to the abort detection.
3. Order matters: call `run.cancel()` from the API route *before* the step's error propagates, or handle the race condition gracefully.

**Warning signs:**
- Clicking abort shows "Workflow failed" (red) instead of "Workflow aborted" (amber)
- Error details show "AbortError" or "This operation was aborted" in the trace panel
- The mascot shows the error state instead of the aborted state after user-initiated abort

**Phase to address:**
Phase 1 (Abort Propagation) -- correct status mapping is essential for the abort feature to feel right.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Wrapping `handleWorkflowStream` with abort logic instead of replacing it | Minimal changes to API route | If `@mastra/ai-sdk` adds abort support, the custom wrapper becomes dead code or conflicts | Never -- the function does not expose the `run` object, making it impossible to call `run.cancel()`. Must replace with manual workflow execution. |
| Putting all toast logic inline in `page.tsx` | Quick to implement | Adds 50-80 lines to an already 824-line file, making the refactoring target worse | Only if toasts are implemented before the file refactoring phase |
| Using `toast()` without IDs | Simpler API calls | Duplicate toasts in development (Strict Mode) and potential duplicates from streaming re-renders | Never -- always use toast IDs for workflow lifecycle events |
| Skipping abort checks between parallel perspective runs | Fewer code changes | Abort during multi-perspective phase still runs all N perspectives to completion | Acceptable for MVP if abort at least stops the next round from starting |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Mastra `run.cancel()` + `handleWorkflowStream` | Trying to call `run.cancel()` without access to the `run` object (it is hidden inside `handleWorkflowStream`) | Replace `handleWorkflowStream` with manual `createRun()` + `run.stream()` + `run.cancel()` in the API route |
| `useChat` `stop()` + server abort | Assuming `stop()` triggers `req.signal` abort reliably in Next.js | Implement a separate `/api/solve/cancel` endpoint as a fallback mechanism |
| Sonner `<Toaster />` + dark theme + blueprint design | Using default Sonner styles that clash with the cyanotype theme (rounded corners, white background) | Pass `theme="dark"` and custom `toastOptions.className` to match `--background`, `--border`, `--accent` CSS variables, set `--radius: 0` |
| `streamWithRetry` + `abortSignal` + retry logic | Forgetting that abort during the backoff delay between retries should also cancel | Already handled -- `streamWithRetry` listens for abort during backoff via `callerSignal?.addEventListener('abort', onAbort)` |
| File refactoring + TypeScript path aliases | Moving files but not updating `@/` path aliases, or creating circular imports between split step files | Each step file should import from shared utility files, never from other step files. Run `npx tsc --noEmit` after every file move. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Toast re-rendering on every streaming chunk | UI jank, excessive React re-renders, toast counter incrementing | Decouple toast triggers from `allParts.length` -- use a ref to track the last processed state transition | Immediately visible in development with any problem |
| Server-side `run` object memory leak if cancel endpoint stores runs in a Map | Memory grows with each workflow invocation, never cleaned up | Use a `WeakRef` or TTL-based map, clean up entries after workflow completion or a timeout | After ~50 workflow runs without server restart |
| Barrel file re-exports pulling in entire workflow module | Slower dev server startup, larger server bundles | Keep step files as direct imports in `workflow.ts`, do not create a barrel `index.ts` for step files | Not a practical concern at current codebase size (14K LOC) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Toast for "workflow started" appearing before the UI shows any progress | Confusing -- toast says started but progress bar is empty | Delay the "started" toast until the first step-start event is received, or emit it synchronously with the progress bar update |
| Abort toast appearing immediately while backend keeps running | User thinks abort worked, but API costs continue | Show a "Cancelling..." toast that updates to "Aborted" when backend confirms cancellation, or add a subtle "stopping background work..." indicator |
| Cost warning toast showing raw dollar amounts without context | "$0.12" means nothing to a user who does not know typical costs | Show relative context: "This run has used $0.12 so far (above average)" or use thresholds that are meaningful |
| Multiple error/abort toasts when abort races with a genuine failure | User sees both "Workflow failed" and "Workflow aborted" toasts | Use mutually exclusive toast IDs and clear the other when one fires |

## "Looks Done But Isn't" Checklist

- [ ] **Abort propagation:** The abort button stops the client stream -- verify the backend workflow ALSO stops by checking Mastra Studio or server logs
- [ ] **Abort propagation:** After abort, no new OpenRouter API calls appear in the dashboard -- verify with a real problem that takes 2+ minutes
- [ ] **Abort propagation:** Workflow status shows "canceled" (not "failed") in Mastra storage after abort -- check via Mastra Studio
- [ ] **Abort propagation:** Aborting during the backoff delay of a retry correctly cancels the retry -- verify by inducing a retry then aborting during the wait
- [ ] **File refactoring:** All existing imports in the codebase still resolve after splitting -- `npx tsc --noEmit` returns only the pre-existing CSS module error
- [ ] **File refactoring:** The eval harness still passes on at least one problem after refactoring -- `npm run eval -- --problem 1` completes without errors
- [ ] **File refactoring:** Mastra Studio still shows the workflow graph correctly after refactoring -- step IDs must remain unchanged
- [ ] **Toast notifications:** Toasts appear exactly once per lifecycle event, not duplicated -- test in development mode (Strict Mode is on)
- [ ] **Toast notifications:** Toasts match the blueprint design system (no rounded corners, correct colors) -- visual inspection against DESIGN.md
- [ ] **Toast notifications:** Toast for "workflow complete" does not fire when navigating to the page with cached data -- only on fresh workflow runs

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Backend keeps running after abort | LOW | Add `run.cancel()` call to the cancel endpoint. Existing `streamWithRetry` already handles `abortSignal` correctly -- just need to thread it through. |
| Workflow shows "failed" instead of "aborted" | LOW | Add `abortSignal.aborted` check in catch blocks, call `abort()` instead of rethrowing. Update frontend to check for `canceled` status. |
| File refactoring breaks imports | LOW | TypeScript catches at compile time. Fix imports and re-run `npx tsc --noEmit`. |
| File refactoring breaks runtime behavior | MEDIUM | No test framework -- must run eval harness (`npm run eval -- --problem 1`) and manually verify in the UI. Rollback via git if multiple files are affected. |
| Duplicate toasts | LOW | Add toast IDs to all `toast()` calls. Takes 5 minutes to fix. |
| `req.signal` does not propagate | MEDIUM | Implement the `/api/solve/cancel` fallback endpoint. Requires storing the `run` object server-side and exposing a `runId` to the frontend. |
| Toast styling clashes with theme | LOW | Override Sonner's CSS variables or pass `toastOptions.className` with blueprint design tokens. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Client `stop()` does not cancel backend | Phase 1: Abort Propagation | Mastra Studio shows workflow as "canceled" after abort |
| Missing abort checks between agent calls | Phase 1: Abort Propagation | Abort during multi-perspective step stops within seconds, not minutes |
| `req.signal` unreliable in Next.js | Phase 1: Abort Propagation | Abort works in both `next dev` and production build |
| Abort shows "failed" instead of "aborted" | Phase 1: Abort Propagation | UI shows amber abort state, not red error state |
| Breaking re-export contract | Phase 2: File Refactoring | `npx tsc --noEmit` passes, `solverWorkflow` import in `mastra/index.ts` unchanged |
| Register pattern breaks in page split | Phase 2: File Refactoring | Nav bar abort/reset buttons still functional after refactor |
| Duplicate toasts from streaming re-renders | Phase 3: Toast Notifications | Each lifecycle event produces exactly one toast in Strict Mode |

## Sources

- [Mastra `run.cancel()` reference](https://mastra.ai/reference/workflows/run-methods/cancel) -- HIGH confidence, official docs
- [AI SDK stopping streams documentation](https://ai-sdk.dev/docs/advanced/stopping-streams) -- HIGH confidence, official docs
- [AI SDK issue #9707: `chat.stop()` abort signal not detected on backend](https://github.com/vercel/ai/issues/9707) -- HIGH confidence, documented bug
- [Next.js discussion #48682: detecting client disconnections in route handlers](https://github.com/vercel/next.js/discussions/48682) -- HIGH confidence, known limitation
- [Mastra issue #11063: AbortSignal not propagated to sub-workflows](https://github.com/mastra-ai/mastra/issues/11063) -- MEDIUM confidence, was fixed but worth monitoring
- [Sonner issue #322: duplicate toasts in React Strict Mode](https://github.com/emilkowalski/sonner/issues/322) -- HIGH confidence, documented behavior
- [Sonner documentation](https://sonner.emilkowal.ski/toast) -- HIGH confidence, official docs
- Codebase analysis of `workflow.ts`, `agent-utils.ts`, `page.tsx`, `route.ts`, `workflow-control-context.tsx` -- HIGH confidence, direct source reading

---
*Pitfalls research for: LO-Solver v1.2 Cleanup & Quality milestone*
*Researched: 2026-03-03*
