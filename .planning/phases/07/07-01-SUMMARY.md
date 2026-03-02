---
phase: 07-hierarchical-trace-results
plan: 01
subsystem: api
tags: [zod, schema, answer-agent, workflow]

# Dependency graph
requires:
  - phase: 06-ui-event-system-rules-panel
    provides: Workflow schemas and agent instruction patterns
provides:
  - questionAnswerSchema with rulesApplied field for rule tag display
  - Answer agent instructions that populate rulesApplied with exact rule titles
affects: [07-03 results panel rule tag chips]

# Tech tracking
tech-stack:
  added: []
  patterns: [required array field on answer schema for rule traceability]

key-files:
  created: []
  modified:
    - src/mastra/workflow/workflow-schemas.ts
    - src/mastra/workflow/04-question-answerer-instructions.ts

key-decisions:
  - "rulesApplied is required (not optional) because every answer should reference at least one rule"

patterns-established:
  - "Answer schema carries rule titles for downstream UI display"

requirements-completed: [UI-05]

# Metrics
duration: 1min
completed: 2026-03-02
---

# Phase 7 Plan 1: Answer Schema rulesApplied Summary

**Added rulesApplied array field to questionAnswerSchema and updated answer agent instructions to populate it with exact rule titles**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-02T03:47:36Z
- **Completed:** 2026-03-02T03:48:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `rulesApplied: z.array(z.string())` to `questionAnswerSchema` for tracking which rules were used per answer
- Updated answer agent instructions with rulesApplied in JSON output example, quality guidelines, and methodology steps
- Backend data model ready for rule tag chips in results panel (Plan 07-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rulesApplied field to questionAnswerSchema** - `2e210c3` (feat)
2. **Task 2: Update answer agent instructions to populate rulesApplied** - `4fe83fd` (feat)

## Files Created/Modified
- `src/mastra/workflow/workflow-schemas.ts` - Added rulesApplied field to questionAnswerSchema
- `src/mastra/workflow/04-question-answerer-instructions.ts` - Updated JSON example, added quality guideline #5, added Step 3 bullet for recording rule titles

## Decisions Made
- rulesApplied is required (not optional) because every answer should reference at least one rule -- matches plan specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema field ready for Plan 07-03 (results panel rule tag chips)
- Answer agent will populate rulesApplied on next workflow run
- No blockers for downstream plans

## Self-Check: PASSED

All files and commits verified.

---
*Phase: 07-hierarchical-trace-results*
*Completed: 2026-03-02*
