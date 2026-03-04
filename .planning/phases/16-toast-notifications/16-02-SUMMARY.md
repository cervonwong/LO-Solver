---
phase: 16-toast-notifications
plan: 02
subsystem: ui
tags: [cost-tracking, toast, openrouter, request-context, workflow-events]

# Dependency graph
requires:
  - phase: 16-toast-notifications
    plan: 01
    provides: Sonner toast infrastructure, WorkflowToast component, useWorkflowToasts hook
provides:
  - CostUpdateEvent type in WorkflowTraceEvent union
  - OpenRouter usage accounting on all model calls
  - extractCostFromResult and updateCumulativeCost helper functions
  - Cost tracking wired into all three workflow steps (8 agent calls total)
  - showCostWarningToast with gold accent and dollar-amount stable IDs
  - useWorkflowToasts watches allParts for cost-update events
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [per-step-cost-accumulation, dollar-boundary-event-emission, stable-id-toast-stacking]

key-files:
  created: []
  modified:
    - src/lib/workflow-events.ts
    - src/mastra/openrouter.ts
    - src/mastra/workflow/request-context-types.ts
    - src/mastra/workflow/request-context-helpers.ts
    - src/mastra/workflow/steps/01-extract.ts
    - src/mastra/workflow/steps/02-hypothesize.ts
    - src/mastra/workflow/steps/03-answer.ts
    - src/components/workflow-toast.tsx
    - src/hooks/use-workflow-toasts.ts
    - src/app/page.tsx

key-decisions:
  - "Used Record<string, any> for extractCostFromResult parameter to avoid exactOptionalPropertyTypes issues with FullOutput type"
  - "Injected usage: { include: true } via openrouter wrapper function at model-call level (not provider-level, which SDK does not support)"
  - "Cost accumulates per-step (not per-workflow) to avoid touching workflow-schemas.ts; acceptable because Step 2 is where most cost occurs"
  - "Used mainRequestContext for cost accumulation in Step 2 even for parallel hypothesizers (single-threaded JS means no race condition)"

patterns-established:
  - "Cost tracking pattern: extractCostFromResult(response) -> updateCumulativeCost(ctx, writer, cost) after each agent call"
  - "Dollar-boundary event emission: emit data-cost-update at each integer dollar crossing, supporting multi-dollar jumps"

requirements-completed: [TOAST-06, TOAST-07]

# Metrics
duration: 7min
completed: 2026-03-04
---

# Phase 16 Plan 02: Cost Warning Toast Summary

**End-to-end cost tracking from OpenRouter response metadata through event emission to gold-accented toast notifications at $1 boundaries**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-04T07:16:53Z
- **Completed:** 2026-03-04T07:24:27Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Added CostUpdateEvent to WorkflowTraceEvent union and enabled OpenRouter usage accounting on all model calls
- Created extractCostFromResult and updateCumulativeCost helper functions with dollar-boundary event emission
- Wired cost tracking after all 8 streamWithRetry calls across 3 workflow steps (1 in extract, 8 in hypothesize, 1 in answer)
- Added showCostWarningToast with gold accent, Lex thinking image, and dollar-amount-based stable IDs for stacking
- Extended useWorkflowToasts to watch allParts for data-cost-update events and fire cost toasts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cost tracking infrastructure to backend** - `b02eaf1` (feat)
2. **Task 2: Add cost warning toast to frontend** - `b2ec16f` (feat)

## Files Created/Modified
- `src/lib/workflow-events.ts` - Added CostUpdateEvent interface and added to WorkflowTraceEvent union
- `src/mastra/openrouter.ts` - Injected usage: { include: true } into all model calls via wrapper
- `src/mastra/workflow/request-context-types.ts` - Added cumulative-cost key to WorkflowRequestContext
- `src/mastra/workflow/request-context-helpers.ts` - Added extractCostFromResult and updateCumulativeCost helpers
- `src/mastra/workflow/steps/01-extract.ts` - Initialize cumulative-cost, track cost after extract agent
- `src/mastra/workflow/steps/02-hypothesize.ts` - Initialize cumulative-cost, track cost after all 8 agent calls
- `src/mastra/workflow/steps/03-answer.ts` - Initialize cumulative-cost, track cost after answer agent
- `src/components/workflow-toast.tsx` - Added showCostWarningToast with gold accent and stable IDs
- `src/hooks/use-workflow-toasts.ts` - Added allParts prop, cost event watching, bucket ref reset on start
- `src/app/page.tsx` - Pass allParts to useWorkflowToasts hook

## Decisions Made
- Used `Record<string, any>` for `extractCostFromResult` parameter type instead of a strict interface with optional `providerMetadata` -- avoids `exactOptionalPropertyTypes` type incompatibilities with Mastra's `FullOutput` type while still working correctly via property access
- Injected `usage: { include: true }` at the model-call level through the `openrouter` wrapper function, not at the provider level, because `createOpenRouter` does not accept `usage` in its settings (it's a per-model setting in the SDK)
- Cost accumulates per-step rather than per-workflow to avoid modifying `workflow-schemas.ts` and workflow state passing; acceptable because Step 2 (hypothesize) is where most cost occurs with its 8+ agent calls
- Used `mainRequestContext` for cost accumulation even for parallel hypothesizer calls -- JavaScript's single-threaded event loop means the synchronous get/set in `updateCumulativeCost` is safe between the async `emitTraceEvent` calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed OpenRouter usage accounting location**
- **Found during:** Task 1 (OpenRouter usage accounting)
- **Issue:** Plan specified `usage: { include: true }` on `createOpenRouter()` provider settings, but the installed SDK version only supports `usage` as a per-model setting (`OpenRouterChatSettings`), not a provider-level setting
- **Fix:** Injected `usage: { include: true }` into every model call via the `openrouter` wrapper function's `baseSettings` spread
- **Files modified:** `src/mastra/openrouter.ts`
- **Verification:** `npx tsc --noEmit` passes with no new errors
- **Committed in:** b02eaf1 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed extractCostFromResult type compatibility**
- **Found during:** Task 1 (cost tracking helpers)
- **Issue:** Plan's function signature used `{ providerMetadata?: Record<string, unknown> }` which is incompatible with Mastra's `FullOutput` type under `exactOptionalPropertyTypes` (FullOutput uses `ProviderMetadata | undefined`, not `Record<string, unknown>`)
- **Fix:** Changed parameter type to `Record<string, any>` to accept any response shape, since the function uses property access patterns internally
- **Files modified:** `src/mastra/workflow/request-context-helpers.ts`
- **Verification:** `npx tsc --noEmit` passes with no new errors
- **Committed in:** b02eaf1 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed updateCumulativeCost set() type compatibility**
- **Found during:** Task 1 (cost tracking helpers)
- **Issue:** Plan's `set` signature `(key: keyof WorkflowRequestContext, value: unknown) => void` is incompatible with `RequestContext.set()` which uses strongly-typed generics
- **Fix:** Changed parameter types to `any` to accept any RequestContext implementation
- **Files modified:** `src/mastra/workflow/request-context-helpers.ts`
- **Verification:** `npx tsc --noEmit` passes with no new errors
- **Committed in:** b02eaf1 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for type compatibility with the project's strict TypeScript config. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 16 (toast notifications) is fully complete
- All toast types implemented: start, complete, aborted, error, and cost warning
- Cost tracking infrastructure can be extended to emit additional event types if needed

## Self-Check: PASSED

All 10 modified files verified on disk. Both task commits (b02eaf1, b2ec16f) verified in git log.

---
*Phase: 16-toast-notifications*
*Completed: 2026-03-04*
