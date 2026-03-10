---
phase: 27-dead-code-type-safety
plan: 02
subsystem: workflow
tags: [typescript, type-safety, any-removal, mastra]

# Dependency graph
requires:
  - phase: 27-dead-code-type-safety/01
    provides: Dead code removal clearing the way for type tightening
provides:
  - Zero any annotations in 4 workflow files
  - Typed AgentResultCostInfo, RequestContextReadWrite, and ReasoningChunk interfaces
affects: [workflow, steps, cost-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "exactOptionalPropertyTypes-compatible optional interfaces (add | undefined to optional props)"
    - "RequestContextReadWrite type for functions needing both get() and set() on RequestContext"

key-files:
  created: []
  modified:
    - src/mastra/workflow/request-context-helpers.ts
    - src/mastra/workflow/logging-utils.ts
    - src/mastra/workflow/03a-rule-tester-tool.ts
    - src/mastra/workflow/03a-sentence-tester-tool.ts

key-decisions:
  - "Used local interfaces (AgentResultCostInfo, ReasoningChunk) over importing Mastra types to avoid coupling to unstable internals"
  - "Matched Mastra conditional type pattern (K extends keyof V ? V[K] : never) in RequestContextReadWrite.set() for compatibility"

patterns-established:
  - "AgentResultCostInfo: typed interface for cost extraction from agent results"
  - "RequestContextReadWrite: typed read/write interface for RequestContext used outside step files"
  - "ReasoningChunk: typed interface for LLM reasoning output chunks"

requirements-completed: [CLN-04]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 27 Plan 02: Any Type Removal Summary

**Replaced 12 any annotations across 4 workflow files with typed interfaces (AgentResultCostInfo, RequestContextReadWrite, ReasoningChunk)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T07:33:44Z
- **Completed:** 2026-03-08T07:37:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Eliminated all `any` type annotations from request-context-helpers.ts (5 annotations) and logging-utils.ts (3 annotations)
- Removed all 4 `as any` casts from 03a-rule-tester-tool.ts and 03a-sentence-tester-tool.ts
- Removed all 6 eslint-disable no-explicit-any comments
- Created 3 reusable typed interfaces: AgentResultCostInfo, RequestContextReadWrite, ReasoningChunk

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace any types in request-context-helpers.ts and logging-utils.ts** - `2ac4c93` (refactor)
2. **Task 2: Remove as-any casts from tester tools** - `64f8275` (refactor)

## Files Created/Modified
- `src/mastra/workflow/request-context-helpers.ts` - Added AgentResultCostInfo and RequestContextReadWrite types, removed 5 any annotations and 2 eslint-disable comments
- `src/mastra/workflow/logging-utils.ts` - Added ReasoningChunk interface, typed formatReasoning and logAgentOutput parameters, removed 3 any annotations and 3 eslint-disable comments
- `src/mastra/workflow/03a-rule-tester-tool.ts` - Removed 2 `as any` casts from abort signal access
- `src/mastra/workflow/03a-sentence-tester-tool.ts` - Removed 2 `as any` casts from abort signal access

## Decisions Made
- Used local interfaces rather than importing from Mastra core to avoid coupling to potentially unstable internal types
- Matched the Mastra RequestContext conditional type pattern (`K extends keyof V ? V[K] : never`) in RequestContextReadWrite.set() for exact type compatibility
- Added `| undefined` to optional properties in AgentResultCostInfo to satisfy exactOptionalPropertyTypes tsconfig setting

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes compatibility in AgentResultCostInfo**
- **Found during:** Task 1 verification (type check)
- **Issue:** The plan's suggested AgentResultCostInfo interface used simple optional properties (`providerMetadata?:`) which are incompatible with Mastra's `FullOutput` type under exactOptionalPropertyTypes, where `ProviderMetadata | undefined` is not assignable to just `ProviderMetadata`
- **Fix:** Added `| undefined` to optional property types in AgentResultCostInfo
- **Files modified:** src/mastra/workflow/request-context-helpers.ts
- **Verification:** `npx tsc --noEmit` passes with no new errors
- **Committed in:** 64f8275 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed RequestContextReadWrite set() signature mismatch**
- **Found during:** Task 1 verification (type check)
- **Issue:** The plan's suggested `set: <K>(key: K, value: WorkflowRequestContext[K]) => void` does not match Mastra's actual signature which uses `K extends keyof V ? V[K] : never` conditional type
- **Fix:** Changed to `value: K extends keyof WorkflowRequestContext ? WorkflowRequestContext[K] : never` to match Mastra's pattern
- **Files modified:** src/mastra/workflow/request-context-helpers.ts
- **Verification:** `npx tsc --noEmit` passes with no new errors
- **Committed in:** 64f8275 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary for type compatibility with existing callers and tsconfig settings. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 target files now have zero `any` annotations
- Type system can catch type errors in cost tracking and reasoning formatting at build time
- Ready for next phase (28 - Request Context Split)

---
*Phase: 27-dead-code-type-safety*
*Completed: 2026-03-08*

## Self-Check: PASSED
- All 5 files exist
- Both commits (2ac4c93, 64f8275) found in git log
- Zero `any` type annotations remain in modified files (matches found are in comments/strings only)
- `npx tsc --noEmit` reports only pre-existing errors
