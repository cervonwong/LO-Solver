# Phase 14: Abort Propagation - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Clicking abort stops all in-flight OpenRouter LLM calls within seconds and the workflow shows "aborted" (not "failed") in the UI. The abort signal must propagate from the frontend through the API route into every workflow step's LLM calls. A fallback cancel endpoint guarantees abort when the browser's request signal is unreliable.

</domain>

<decisions>
## Implementation Decisions

### Abort UX behavior
- Confirmation dialog before aborting (prevent accidental clicks)
- After confirmation, instant visual feedback: progress bar immediately shows amber "aborting..." state, running steps switch to canceling indicator
- Abort button disables and shows spinner with "Aborting..." text until fully stopped
- Mascot stays in same neutral state throughout abort (no intermediate "canceling" expression)
- Simple aborted message: "Workflow aborted. Partial results preserved above." (current behavior, keep it)

### Cost protection
- Cancel ALL in-flight LLM calls including ones already mid-stream (maximize cost savings)
- Check abort at BOTH iteration boundaries (before starting each verify/improve round) AND mid-step (between individual testRule/testSentence calls)
- Cancel endpoint design: Claude's Discretion

### Recovery after abort
- Reset and start fresh using existing Reset button (same flow as today)
- Same reset behavior as after completed/failed solves (no special abort-specific handling)
- Must reset before starting a new solve (no auto-reset on new submission)

### Claude's Discretion
- Cancel endpoint implementation approach (server-side AbortController, request tracking, etc.)
- Signal threading architecture (how abort signal flows from HTTP request through workflow steps)
- Error handling for partially-completed steps during abort
- Exact timing/animation of the "aborting" transition state

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `agent-utils.ts`: `generateWithRetry` and `streamWithRetry` already accept `abortSignal` parameter with full support (signal merging, abort-aware retries, backoff cancellation) — just need to pass a signal in
- `workflow-control-context.tsx`: `useWorkflowControl` provides `stop()` function already wired to `useChat`'s stop — can be extended for abort confirmation flow
- `step-progress.tsx`: Already has `'aborted'` status with amber styling (`border-status-warning text-status-warning`)
- `mascot-context.tsx`: Already has `'aborted'` state mapping to neutral mascot image
- `page.tsx`: Already detects aborted state (`isAborted`) and converts running steps to aborted, shows abort message and icon

### Established Patterns
- `useChat` `stop()` closes the client-side stream but does NOT cancel server-side LLM calls — this is the core gap
- `WorkflowControlProvider` provides stop/reset callbacks via React context to layout-shell buttons
- `streamWithRetry` uses a two-layer approach: cooperative AbortSignal + hard Promise.race timeout fallback

### Integration Points
- `/api/solve/route.ts`: Need to pass `req.signal` or a server-managed AbortController to `handleWorkflowStream`
- `workflow.ts`: All ~10 `streamWithRetry` calls need an `abortSignal` parameter threaded through
- `03a-rule-tester-tool.ts` / `03a-sentence-tester-tool.ts`: `generateWithRetry` calls need abort signal for mid-step cancellation
- `handleWorkflowStream` from `@mastra/ai-sdk`: May or may not support abort signal passthrough — needs research

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-abort-propagation*
*Context gathered: 2026-03-04*
