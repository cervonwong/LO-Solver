---
phase: 39-api-key-transport
plan: 01
subsystem: api, auth
tags: [security, openrouter, request-context, zod, header-transport]

# Dependency graph
requires: []
provides:
  - Header-based API key extraction in solve and credits routes
  - Workflow-level RequestContext propagation for user API keys
  - Clean Zod schemas with no apiKey field (prevents LibSQL persistence)
affects: [39-02 frontend changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Workflow-level RequestContext for non-persisted secrets via run.stream({ requestContext })"
    - "x-openrouter-key HTTP header for API key transport"

key-files:
  created: []
  modified:
    - src/mastra/workflow/workflow-schemas.ts
    - src/mastra/workflow/steps/01-extract.ts
    - src/mastra/workflow/steps/02-hypothesize.ts
    - src/mastra/workflow/steps/03-answer.ts
    - src/app/api/solve/route.ts
    - src/app/api/credits/route.ts

key-decisions:
  - "Use workflow-level RequestContext (not per-step) to propagate user API key across all steps"
  - "Read API key from x-openrouter-key HTTP header in both route handlers"

patterns-established:
  - "Workflow-level RequestContext with 'user-api-key' key for secret propagation"
  - "x-openrouter-key header convention for frontend-to-backend key transport"

requirements-completed: [SEC-01, SEC-02, SEC-03]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 39 Plan 01: Backend API Key Transport Summary

**Remove apiKey from Zod schemas and switch to header-based key transport via workflow-level RequestContext**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T14:09:18Z
- **Completed:** 2026-03-17T14:12:07Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Removed `apiKey` field from both `workflowStateSchema` and `rawProblemInputSchema`, preventing API key persistence in LibSQL workflow snapshots
- All three workflow steps now read the user API key from workflow-level `RequestContext` (`workflowCtx?.get('user-api-key')`) instead of state or inputData
- Solve route extracts API key from `x-openrouter-key` header and propagates via `RequestContext` to `run.stream()`
- Credits route reads API key from `x-openrouter-key` header instead of query string parameter

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove apiKey from schemas and update workflow steps** - `796148e` (fix)
2. **Task 2: Update solve and credits route handlers** - `af885a5` (fix)

## Files Created/Modified
- `src/mastra/workflow/workflow-schemas.ts` - Removed apiKey from workflowStateSchema and rawProblemInputSchema
- `src/mastra/workflow/steps/01-extract.ts` - Read user API key from workflow-level RequestContext
- `src/mastra/workflow/steps/02-hypothesize.ts` - Read user API key from workflow-level RequestContext
- `src/mastra/workflow/steps/03-answer.ts` - Read user API key from workflow-level RequestContext
- `src/app/api/solve/route.ts` - Extract key from x-openrouter-key header, create and pass RequestContext to run.stream()
- `src/app/api/credits/route.ts` - Extract key from x-openrouter-key header instead of query string

## Decisions Made
- Used workflow-level `RequestContext` (passed via `run.stream({ requestContext })`) rather than per-step context to propagate the user API key. This keeps the key out of persisted state entirely.
- Named the workflow-level RequestContext parameter `workflowCtx` in step destructuring to avoid shadowing the local per-step `requestContext` variable used for agent calls.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend is fully updated; API key no longer persists to LibSQL
- Plan 02 (frontend changes) can proceed to update the frontend to send the key via `x-openrouter-key` header instead of in the request body

## Self-Check: PASSED

All 6 modified files verified present. Both task commits (796148e, af885a5) verified in git log. SUMMARY.md created.

---
*Phase: 39-api-key-transport*
*Completed: 2026-03-17*
