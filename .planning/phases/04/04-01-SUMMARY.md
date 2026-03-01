---
phase: 04-multi-perspective-hypothesis-generation
plan: 01
subsystem: workflow
tags: [zod, mastra, rules-tools, draft-stores, request-context]

# Dependency graph
requires:
  - phase: 03-evaluation-expansion
    provides: "Existing workflow schemas, vocabulary tools pattern, request context infrastructure"
provides:
  - "Rules CRUD tools (getRules, addRules, updateRules, removeRules, clearRules)"
  - "Rules tools prompt fragment (RULES_TOOLS_INSTRUCTIONS)"
  - "DraftStore interface for per-perspective isolation"
  - "Draft store helpers (create, get, merge, clear)"
  - "Multi-perspective Zod schemas (perspective, dispatcher, synthesis, improver-dispatcher)"
  - "Updated rawProblemInputSchema with maxRounds and perspectiveCount"
  - "Updated workflowStateSchema with rules store and round tracking"
affects: [04-02, 04-03, workflow, agents, evals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rules CRUD tools mirroring vocabulary tools pattern"
    - "Draft store Map<string, DraftStore> for per-perspective isolation"
    - "getRulesState/getRulesArray helpers following getVocabularyState pattern"

key-files:
  created:
    - src/mastra/workflow/rules-tools.ts
    - src/mastra/workflow/rules-tools-prompt.ts
  modified:
    - src/mastra/workflow/request-context-types.ts
    - src/mastra/workflow/request-context-helpers.ts
    - src/mastra/workflow/workflow-schemas.ts
    - src/evals/run.ts

key-decisions:
  - "Moved ruleSchema before workflowStateSchema to fix JS const declaration order"
  - "Added explicit default values at eval runner call site for backward compat with new schema fields"

patterns-established:
  - "Rules tools: same 5-tool CRUD pattern as vocabulary tools, keyed by title"
  - "Draft stores: Map<string, DraftStore> in RequestContext with create/get/merge/clear helpers"
  - "data-rules-update trace event type for rules CRUD operations"

requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 4 Plan 1: Foundation Types, Tools, and Schemas Summary

**Rules CRUD tools mirroring vocabulary pattern, DraftStore per-perspective isolation, and multi-perspective Zod schemas for dispatch/synthesize workflow**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T05:24:51Z
- **Completed:** 2026-03-01T05:30:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Rules CRUD tools (getRules, addRules, updateRules, removeRules, clearRules) with trace event emission, matching vocabulary tools API
- DraftStore interface and full helper suite (create, get, merge, clear) for per-perspective hypothesis isolation
- All multi-perspective schemas: perspectiveSchema, dispatcherOutputSchema, perspectiveResultSchema, synthesisInputSchema, improverDispatcherOutputSchema
- Updated rawProblemInputSchema with maxRounds/perspectiveCount defaults and workflowStateSchema with round tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: Create rules CRUD tools and draft store infrastructure** - `04de404` (feat)
2. **Task 2: Add new workflow schemas for multi-perspective dispatch** - `e38212e` (feat)

## Files Created/Modified
- `src/mastra/workflow/rules-tools.ts` - Five CRUD tools for rules management via RequestContext
- `src/mastra/workflow/rules-tools-prompt.ts` - RULES_TOOLS_INSTRUCTIONS agent prompt fragment
- `src/mastra/workflow/request-context-types.ts` - DraftStore interface, rules-state and draft-stores keys
- `src/mastra/workflow/request-context-helpers.ts` - getRulesState, getRulesArray, createDraftStore, getDraftStore, getAllDraftStores, mergeDraftToMain, clearAllDraftStores, getDraftVocabularyState, getDraftRulesState
- `src/mastra/workflow/workflow-schemas.ts` - perspectiveSchema, dispatcherOutputSchema, perspectiveResultSchema, synthesisInputSchema, improverDispatcherOutputSchema, updated rawProblemInputSchema and workflowStateSchema
- `src/evals/run.ts` - Added maxRounds/perspectiveCount defaults to eval runner workflow call

## Decisions Made
- Moved ruleSchema definition before workflowStateSchema in workflow-schemas.ts to fix JS const declaration order (ruleSchema is referenced by workflowStateSchema)
- Added explicit default values (maxRounds: 3, perspectiveCount: 3) at eval runner call site since Zod defaults only apply at parse time, not at TypeScript type level

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ruleSchema declaration order in workflow-schemas.ts**
- **Found during:** Task 2 (Adding workflowStateSchema.rules field)
- **Issue:** workflowStateSchema referenced ruleSchema but ruleSchema was defined later in the file; const declarations are not hoisted
- **Fix:** Moved ruleSchema and related declarations above workflowStateSchema
- **Files modified:** src/mastra/workflow/workflow-schemas.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** e38212e (Task 2 commit)

**2. [Rule 3 - Blocking] Updated eval runner for new rawProblemInputSchema fields**
- **Found during:** Task 2 (After adding maxRounds/perspectiveCount to rawProblemInputSchema)
- **Issue:** TypeScript error in src/evals/run.ts: inputData missing maxRounds and perspectiveCount (Zod .default() makes input optional but output required; Mastra types inputData as output type)
- **Fix:** Added explicit maxRounds: 3 and perspectiveCount: 3 to eval runner's workflow start call
- **Files modified:** src/evals/run.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** e38212e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correct compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Foundation types, tools, and schemas are ready for agent definitions (Plan 02)
- Rules tools follow identical API pattern to vocabulary tools, enabling consistent agent instructions
- Draft store infrastructure supports the parallel hypothesizer pattern needed by Plan 03 workflow rewrite
- All new schemas compile and are ready for agent output typing

## Self-Check: PASSED

All 7 files verified present. Both task commits (04de404, e38212e) verified in git log.

---
*Phase: 04-multi-perspective-hypothesis-generation*
*Completed: 2026-03-01*
