---
phase: 15-file-refactoring
plan: 01
subsystem: workflow
tags: [mastra, workflow, refactoring, file-splitting]

# Dependency graph
requires:
  - phase: 14-abort-propagation
    provides: "workflow.ts with abort signal support"
provides:
  - "3 individual step definition files under src/mastra/workflow/steps/"
  - "Slim 24-line workflow.ts composition file"
affects: [15-02, 15-03]

# Tech tracking
tech-stack:
  added: []
  patterns: ["one-step-per-file under steps/ directory"]

key-files:
  created:
    - src/mastra/workflow/steps/01-extract.ts
    - src/mastra/workflow/steps/02-hypothesize.ts
    - src/mastra/workflow/steps/03-answer.ts
  modified:
    - src/mastra/workflow/workflow.ts

key-decisions:
  - "Step files use ../ for sibling workflow imports and @/ for external imports"
  - "No index.ts re-export in steps/ directory since steps are internal to workflow composition"

patterns-established:
  - "Workflow step files live in src/mastra/workflow/steps/ with NN-name.ts naming"
  - "workflow.ts is a composition-only file importing steps and chaining them"

requirements-completed: [REFAC-01, REFAC-04]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 15 Plan 01: Workflow Step Extraction Summary

**Split workflow.ts from 1,448 lines to 24-line composition file with 3 step files under steps/**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T05:13:11Z
- **Completed:** 2026-03-04T05:17:58Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extracted extractionStep to steps/01-extract.ts (158 lines)
- Extracted multiPerspectiveHypothesisStep to steps/02-hypothesize.ts (1,196 lines)
- Extracted answerQuestionsStep to steps/03-answer.ts (171 lines)
- Reduced workflow.ts to 24-line composition file (imports + .then() chain)
- No new TypeScript errors introduced (only pre-existing globals.css and skeleton.tsx errors)

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Extract step definitions and commit** - `8d7e778` (refactor)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/mastra/workflow/steps/01-extract.ts` - extractionStep definition (Step 1: Extract structured problem data)
- `src/mastra/workflow/steps/02-hypothesize.ts` - multiPerspectiveHypothesisStep definition (Step 2: Multi-perspective hypothesis generation)
- `src/mastra/workflow/steps/03-answer.ts` - answerQuestionsStep definition (Step 3: Answer questions)
- `src/mastra/workflow/workflow.ts` - Slim composition file importing steps and chaining with .then()

## Decisions Made
- Step files use `../` prefix for sibling imports within workflow directory and `@/` for external imports (consistent with project convention)
- No re-export index.ts created in steps/ directory since steps are internal implementation detail of the workflow composition
- Each step file includes only the imports it needs (no shared barrel import)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Steps directory established for plans 02 and 03 to split further large files
- workflow.ts is now a clean composition entry point
- All imports from src/mastra/index.ts continue working unchanged

## Self-Check: PASSED

All files verified to exist. Commit 8d7e778 confirmed in git log.

---
*Phase: 15-file-refactoring*
*Completed: 2026-03-04*
