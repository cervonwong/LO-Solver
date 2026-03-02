---
phase: 03
plan: 01
subsystem: testing
tags: [eval, zero-shot, mastra-agent, intermediate-scoring, comparison]

# Dependency graph
requires:
  - phase: 02
    provides: "Eval foundation: problems, scorer, storage, runner CLI"
provides:
  - "Zero-shot solver using Mastra Agent with questionsAnsweredSchema output"
  - "Extraction and rule quality intermediate scorers"
  - "Extended EvalProblemResult/EvalRunResult types with optional zeroShot and intermediateScores"
  - "--comparison CLI flag for side-by-side workflow vs zero-shot evaluation"
affects: [03-02, 04, 05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Defensive output validation (never-throw scorers)", "Parallel workflow + zero-shot execution via Promise.all"]

key-files:
  created:
    - src/evals/zero-shot-solver.ts
    - src/evals/intermediate-scorers.ts
  modified:
    - src/evals/storage.ts
    - src/evals/run.ts
    - CLAUDE.md

key-decisions:
  - "Used structuredOutput API (not deprecated output param) for zero-shot agent"
  - "Used requestContext pattern for dynamic model selection, consistent with existing agents"
  - "Intermediate scoring runs on all successful workflows, not just comparison mode"
  - "Zero-shot runs in parallel with workflow via Promise.all for faster comparison evals"
  - "comparison field set to boolean (not optional undefined) due to exactOptionalPropertyTypes"

patterns-established:
  - "Eval-only agents: defined in src/evals/, not registered in src/mastra/index.ts"
  - "Defensive scorer pattern: validate unknown input shape, return score 0 on unexpected data, never throw"

requirements-completed: [EVAL-02, EVAL-03]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 3 Plan 1: Backend Evaluation Expansion Summary

**Zero-shot comparison solver, extraction/rule-quality intermediate scorers, and extended eval CLI with --comparison flag and delta display**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T03:17:45Z
- **Completed:** 2026-03-01T03:21:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Zero-shot solver using Mastra Agent with structured output matching questionsAnsweredSchema for direct scorer compatibility
- Intermediate extraction and rule quality scorers that inspect workflow step outputs defensively
- Extended storage types with backward-compatible optional fields for zero-shot and intermediate data
- Eval CLI --comparison flag running workflow and zero-shot in parallel, displaying side-by-side scores with delta

## Task Commits

Each task was committed atomically:

1. **Task 1: Create zero-shot solver and intermediate scorers** - `1fef5cf` (feat)
2. **Task 2: Extend storage types and integrate into eval runner** - `8fc36c0` (feat)

## Files Created/Modified
- `src/evals/zero-shot-solver.ts` - Mastra Agent-based zero-shot solver returning questionsAnsweredSchema output
- `src/evals/intermediate-scorers.ts` - scoreExtraction and scoreRuleQuality functions with defensive validation
- `src/evals/storage.ts` - Extended EvalProblemResult and EvalRunResult with optional zeroShot, intermediateScores, comparison, delta fields
- `src/evals/run.ts` - Added --comparison flag, intermediate scoring for all runs, parallel zero-shot execution, comparison table output
- `CLAUDE.md` - Documented --comparison flag and new eval source files

## Decisions Made
- Used `structuredOutput: { schema }` API instead of deprecated `output` param referenced in plan (Mastra docs confirm `output` is deprecated)
- Used `requestContext` with `model-mode` key for dynamic model selection, matching the pattern used by all existing workflow agents
- Set `comparison` field as `boolean` (always present) rather than `boolean | undefined` to satisfy `exactOptionalPropertyTypes: true` in tsconfig
- Intermediate scores are captured on every successful workflow run (not gated behind --comparison flag) for diagnostics value

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used structuredOutput instead of deprecated output parameter**
- **Found during:** Task 1 (Zero-shot solver creation)
- **Issue:** Plan specified `output: questionsAnsweredSchema` as generate option, but Mastra docs mark `output` as deprecated; current API is `structuredOutput: { schema }`
- **Fix:** Used `structuredOutput: { schema: questionsAnsweredSchema }` and `modelSettings: { maxOutputTokens, temperature }` per current Mastra API
- **Files modified:** src/evals/zero-shot-solver.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 1fef5cf (Task 1 commit)

**2. [Rule 1 - Bug] Used requestContext for dynamic model instead of generate model option**
- **Found during:** Task 1 (Zero-shot solver creation)
- **Issue:** Plan specified passing `model: openrouter(modelId)` as a generate option, but `model` is not a valid top-level option on Agent.generate()
- **Fix:** Used the same `requestContext.set('model-mode', modelMode)` pattern as all existing agents, with dynamic model function in Agent constructor
- **Files modified:** src/evals/zero-shot-solver.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 1fef5cf (Task 1 commit)

**3. [Rule 3 - Blocking] Fixed exactOptionalPropertyTypes type error on comparison field**
- **Found during:** Task 2 (Runner integration)
- **Issue:** `comparison: comparison || undefined` produced `boolean | undefined` type incompatible with `boolean` under exactOptionalPropertyTypes
- **Fix:** Changed to `comparison: comparison` (always set the boolean value)
- **Files modified:** src/evals/run.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 8fc36c0 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bug fixes, 1 blocking)
**Impact on plan:** All fixes required for correctness with current Mastra API and project tsconfig. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend evaluation expansion complete; all types and CLI features ready
- Plan 03-02 (Frontend: eval results page) can proceed using the extended storage types
- Phase 4 (Multi-Perspective Hypothesis) can use --comparison mode to measure improvement

---
*Phase: 03*
*Completed: 2026-03-01*
