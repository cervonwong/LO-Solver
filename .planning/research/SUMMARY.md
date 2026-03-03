# Project Research Summary

**Project:** LO-Solver v1.2 Cleanup & Quality
**Domain:** Abort propagation, file refactoring, and toast notifications for an existing Mastra/Next.js AI workflow app
**Researched:** 2026-03-03
**Confidence:** HIGH

## Executive Summary

LO-Solver v1.2 is an enhancement milestone targeting three independent improvements to an existing, working AI agent workflow application: (1) making the abort button actually stop backend LLM calls and API spend, (2) splitting oversized files into maintainable modules, and (3) adding Sonner toast notifications for workflow lifecycle events. The codebase already has most of the infrastructure needed — `agent-utils.ts` fully supports `AbortSignal`, the Mastra framework provides `abortSignal` in step execute contexts, and shadcn is configured. The primary work is connecting existing pieces, not building new infrastructure.

The recommended build order is abort propagation first, then file refactoring, then toasts. Abort comes first because it fixes a real cost problem (LLM API calls continue burning after the user clicks abort) and is a pure wiring exercise — add `abortSignal` to step destructuring and thread it through 11 `streamWithRetry` call sites. Refactoring comes second because it should happen after the abort changes are already committed (both touch the same files), yielding a clean slate for toast integration. Toasts come last as a purely additive polish layer.

The most consequential risk is that `req.signal` in Next.js route handlers does not reliably propagate client disconnection in all deployment modes — a documented known issue. The mitigation is to implement a secondary `/api/solve/cancel` endpoint alongside `req.signal` monitoring so abort works reliably regardless of runtime behavior. The refactoring risk is lower but requires discipline: split files one at a time with `npx tsc --noEmit` after each change, and never mix structural refactoring with behavioral changes in the same commit.

## Key Findings

### Recommended Stack

The only new dependency is `sonner` (toast library), installed via `npx shadcn@latest add sonner`. All other work uses the existing stack. The `@mastra/core` step execute API already provides `abortSignal: AbortSignal` as a parameter; `generateWithRetry` and `streamWithRetry` in `agent-utils.ts` already accept and handle it correctly — including backoff cancellation. Nothing in the abort propagation work requires a new package.

**Core technologies:**
- `@mastra/core` 1.8.0: Workflow execution — step execute params include `abortSignal` and `abort()` natively, confirmed in `step.d.ts`
- `agent-utils.ts` (`streamWithRetry`/`generateWithRetry`): Already handles abort fully — just needs the signal passed in from each step's execute context
- `sonner` ^2.0.7 (NEW): Toast notifications — shadcn first-class integration via `npx shadcn@latest add sonner`, React 19 and Next.js 16.x compatible
- `useChat` stop() + `run.cancel()`: Client-to-backend abort chain — client side already works, server side needs manual wiring

### Expected Features

**Must have (table stakes):**
- Abort stops in-flight LLM calls — the existing abort button is cosmetic; it must actually halt API spend on all 11 agent call sites
- Abort produces "canceled" status (not "failed") — the UI already distinguishes amber/red states; error handling must preserve this distinction
- Toast on workflow start, complete, abort, and error — four imperative `toast()` calls covering the lifecycle
- `workflow.ts` split into per-step files — 1,399 lines containing 3 distinct step definitions; primary refactoring target
- `page.tsx` logic extracted into custom hooks — 824 lines; `useMemo` state/effect logic should move to `useWorkflowEvents` and `useProgressSteps`

**Should have (stretch):**
- Abort checks between sequential agent calls within `multiPerspectiveHypothesisStep` — prevents one more phase from running after the signal fires
- `trace-event-card.tsx` split into per-event-type renderer components — 898 lines, secondary refactoring target
- Custom Sonner styling matching the cyanotype blueprint theme — `--radius: 0`, dark background, blueprint accent colors

**Defer (v1.3+):**
- Cost-warning toasts based on token tracking — requires token instrumentation not yet built
- Graceful abort with partial result preservation — complex workflow state management, out of scope

### Architecture Approach

The three features are architecturally independent and touch separate layers. Abort propagation is a backend change to `workflow.ts` and `api/solve/route.ts`. File refactoring is a pure structural reorganization with no behavior changes. Toast notifications are a frontend addition to `page.tsx` and `layout.tsx`. The recommended structure after refactoring moves step definitions to `src/mastra/workflow/steps/`, trace sub-components to `src/components/trace/`, and page-level logic to `src/hooks/`. The main `workflow.ts` becomes a ~30-line composition file.

**Major components:**
1. `workflow.ts` (split into `steps/`) — Step definitions extracted to `extract-structure.ts`, `multi-perspective-hypothesis.ts`, `answer-questions.ts`; main file becomes pure composition of ~30 lines
2. `api/solve/route.ts` (modified) — Replace `handleWorkflowStream` black box with manual `createRun()` + `run.stream()` + `run.cancel()` to gain access to the run object for abort
3. `page.tsx` + new hooks — Toast calls added; `useMemo` event-processing logic extracted to `useWorkflowEvents` and `useProgressSteps`
4. `src/components/ui/sonner.tsx` (new) — shadcn-generated themed `<Toaster />` wrapper, placed in `layout.tsx`

### Critical Pitfalls

1. **`stop()` does not cancel the backend workflow** — `handleWorkflowStream` hides the `run` object, so `run.cancel()` cannot be called. Replace it with manual `createRun()` + `run.stream()` to gain abort access. Also wire `abortSignal` from step execute context through all 11 `streamWithRetry` call sites.

2. **`req.signal` is unreliable in Next.js route handlers** — Known issue (vercel/next.js#48682). Do not rely on it alone. Implement `/api/solve/cancel` as a secondary abort mechanism; the frontend calls this endpoint when the user clicks abort, passing a `runId` the server exposes at workflow start.

3. **Abort error propagates as "failed" instead of "canceled"** — When `streamWithRetry` throws on abort, the step error can set workflow status to `failed`. In each step's catch block, check `abortSignal.aborted` and call `abort()` instead of rethrowing.

4. **Breaking the re-export contract when splitting `workflow.ts`** — `mastra/index.ts` imports `solverWorkflow` from `./workflow/workflow`. Keep `solverWorkflow` in the original `workflow.ts` (composition only). Run `npx tsc --noEmit` after every individual file move, never batch multiple splits.

5. **Duplicate toasts from streaming re-renders** — Sonner is imperative; `useEffect` in React Strict Mode double-fires. Always pass a stable `id` to every `toast()` call (e.g., `{ id: 'workflow-complete' }`). Sonner updates an existing toast rather than creating a new one when the same `id` is used.

6. **`page.tsx` register pattern breaks if split incorrectly** — `useRegisterWorkflowControl` must stay in the component that owns `useChat` because it needs `stop` and `isRunning` from that hook. Extract only render subtrees (JSX) to child components; keep hook logic in `SolverPageInner`.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Abort Signal Propagation

**Rationale:** Fixes a real cost problem (wasted API credits after abort). Purely behavioral change to backend files with no structural risk. Should be done first so the abort wiring is already in place when `workflow.ts` is split in Phase 2.
**Delivers:** True abort — clicking the abort button stops all in-flight OpenRouter LLM calls within seconds, and the workflow status shows "canceled" not "failed"
**Addresses:** Must-have features — abort stops API spend, abort produces correct "canceled" status
**Avoids:**
- Pitfall 1: Replace `handleWorkflowStream` with manual run creation; add `req.signal` listener and `/api/solve/cancel` fallback endpoint
- Pitfall 3: Check `abortSignal.aborted` in catch blocks, call `abort()` instead of rethrowing
- Add `abortSignal.aborted` checks at loop boundaries in `multiPerspectiveHypothesisStep` to prevent extra agent calls

### Phase 2: File Refactoring

**Rationale:** Structural-only change (no behavior changes) done after abort wiring is stable. Splitting `workflow.ts` is cleaner once the abort changes are already committed — one clear cut rather than two concurrent modifications to the same file. Also makes Phase 3 toast integration land in a slimmer `page.tsx`.
**Delivers:** `workflow.ts` split from 1,399 lines into 3 focused step files plus a ~30-line composition file; `page.tsx` reduced by ~200 LOC via custom hooks
**Uses:** Standard TypeScript module extraction; `npx tsc --noEmit` as the primary safety net after each individual file move
**Implements:** `src/mastra/workflow/steps/` directory, `src/hooks/useWorkflowEvents` and `useProgressSteps`
**Avoids:**
- Pitfall 4: Keep `solverWorkflow` in `workflow.ts`, run type-check after every individual split, never batch
- Pitfall 6: Keep `useRegisterWorkflowControl` in the component that owns `useChat`; extract only JSX subtrees to children
- Never mix behavioral changes with structural changes in the same commit

### Phase 3: Toast Notifications

**Rationale:** Purely additive, no risk to existing functionality. Benefits from Phase 2's slimmer `page.tsx`. Sonner's imperative API means this is 4-5 `toast()` calls plus the `<Toaster />` in layout — minimal scope.
**Delivers:** Non-blocking user feedback for workflow start, complete, abort, and error — covering users who switch tabs during a long-running solve
**Uses:** `sonner` ^2.0.7 installed via `npx shadcn@latest add sonner`; `<Toaster />` in `layout.tsx`; `toast()` calls in `page.tsx` or a dedicated `useWorkflowToasts` hook
**Avoids:**
- Pitfall 5: Always pass stable `id` to every `toast()` call to prevent duplicates in Strict Mode
- No ToastContext provider needed — use Sonner's imperative API directly

### Phase Ordering Rationale

- Abort first because it has the highest user/cost value, the smallest code footprint, and the changes need to be stable before the files are restructured
- Refactoring second because it is purely structural (verifiable with type-check), benefits from having abort already wired, and makes the toast integration land cleanly
- Toasts last because they are additive-only, benefit from the smaller `page.tsx` after refactoring, and carry no risk to existing functionality
- All three phases are independent and could run in parallel, but sequential ordering eliminates conflicts on shared files (`workflow.ts`, `page.tsx`)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** The `handleWorkflowStream` replacement approach needs hands-on verification — confirm the exact API for `workflow.createRun()` and `run.stream()` against `@mastra/core` types. The `req.signal` reliability in the current Next.js 16.1.6 / Turbopack environment is unverified and should be tested early to determine whether the cancel-endpoint fallback is actually needed.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Pure TypeScript module extraction — well-understood pattern, no library unknowns. The refactoring plan is fully specified with exact line ranges in ARCHITECTURE.md.
- **Phase 3:** Sonner installation and basic usage is fully documented with HIGH confidence. The `npx shadcn@latest add sonner` path is the standard shadcn pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All stack choices verified against local `node_modules` type declarations and official docs. Only one new package (sonner), with confirmed React 19 and Next.js 16.x compatibility. |
| Features | HIGH | Feature scope derived from direct codebase analysis — exact line numbers, call site counts, file structure. No speculation about what's needed; it was read from source. |
| Architecture | HIGH | Abort signal flow confirmed from `@mastra/core` type definitions (`step.d.ts`, `workflow.d.ts`). Refactoring plan maps to actual file structure with line ranges. |
| Pitfalls | HIGH | Most pitfalls confirmed via official docs, known GitHub issues, and direct codebase inspection. The `req.signal` pitfall has documented Next.js issues as backing evidence. |

**Overall confidence:** HIGH

### Gaps to Address

- **`req.signal` reliability in current environment:** The behavior of `req.signal` in Next.js 16.1.6 with Turbopack is unverified. The plan assumes it may be unreliable and recommends a cancel endpoint fallback, but this should be tested early in Phase 1 to determine if the fallback is actually needed.
- **`handleWorkflowStream` replacement API:** The exact usage pattern for `workflow.createRun()` + `run.stream()` piped into `createUIMessageStreamResponse` needs verification during Phase 1 planning. Type declarations confirm the methods exist; the correct integration pattern needs confirmation.
- **`multiPerspectiveHypothesisStep` abort checkpoint locations:** The step is 1,022 lines with nested loops for parallel perspectives. The exact locations to add `abortSignal.aborted` checks between agent invocations should be mapped during Phase 1 implementation.

## Sources

### Primary (HIGH confidence)
- `node_modules/@mastra/core/dist/workflows/step.d.ts` — Step execute function receives `abortSignal: AbortSignal`
- `node_modules/@mastra/core/dist/workflows/workflow.d.ts` — `Run.cancel()`, `run.abortController` getter
- `node_modules/@mastra/ai-sdk/dist/workflow-route.d.ts` — `handleWorkflowStream` params
- `node_modules/ai/dist/index.d.ts` — `UIMessageStreamOnFinishCallback` with `isAborted` flag
- [Mastra Run.cancel() docs](https://mastra.ai/reference/workflows/run-methods/cancel) — Cancel mechanism and AbortSignal integration
- [AI SDK Stopping Streams docs](https://ai-sdk.dev/docs/advanced/stopping-streams) — Client-to-server abort propagation
- [Sonner shadcn/ui integration](https://ui.shadcn.com/docs/components/radix/sonner) — Installation and setup
- [Sonner official docs](https://sonner.emilkowal.ski/toast) — Toast API
- Codebase analysis of `workflow.ts`, `agent-utils.ts`, `page.tsx`, `route.ts`, `workflow-control-context.tsx` — direct source reading

### Secondary (MEDIUM confidence)
- [GitHub: Mastra abort propagation #11063](https://github.com/mastra-ai/mastra/issues/11063) — Sub-workflow signal propagation (closed March 2026, likely resolved)
- [GitHub: AI SDK abort signal bug #9707](https://github.com/vercel/ai/issues/9707) — `chat.stop()` backend detection issues (may not apply to current Next.js version)

### Tertiary (MEDIUM-LOW confidence)
- [GitHub: Next.js req.signal #48682](https://github.com/vercel/next.js/discussions/48682) — Client disconnection detection in route handlers (older Next.js versions; behavior in 16.x unconfirmed)
- [Sonner issue #322: duplicate toasts in Strict Mode](https://github.com/emilkowalski/sonner/issues/322) — Mitigation via `id` parameter is confirmed

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
