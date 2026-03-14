---
phase: 33-provider-foundation
plan: 07
subsystem: api
tags: [claude-code, structured-output, streaming, provider, fallback]

# Dependency graph
requires:
  - phase: 33-provider-foundation
    provides: streamWithRetry and generateWithRetry in agent-utils.ts, provider-mode in RequestContext
provides:
  - Claude Code generate-fallback for structured output calls in streamWithRetry
affects: [workflow-steps, agent-calls, claude-code-provider]

# Tech tracking
tech-stack:
  added: []
  patterns: [provider-conditional-fallback, streaming-to-generate-delegation]

key-files:
  created: []
  modified:
    - src/mastra/workflow/agent-utils.ts

key-decisions:
  - "Delegate to generateWithRetry (non-streaming) when Claude Code + structuredOutput detected, preserving onTextChunk by emitting full text on completion"
  - "Build generateOpts incrementally to satisfy exactOptionalPropertyTypes constraint"

patterns-established:
  - "Provider-conditional fallback: streamWithRetry detects provider mode and delegates to generateWithRetry when streaming would produce null structured output"

requirements-completed: [PROV-04]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 33 Plan 07: PROV-04 Structured Output Fix Summary

**Claude Code generate-fallback in streamWithRetry for structured output calls that would otherwise return null result.object**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T01:58:19Z
- **Completed:** 2026-03-12T02:00:13Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added Claude Code detection logic in streamWithRetry that checks provider-mode from RequestContext
- When claude-code + structuredOutput detected, delegates to generateWithRetry (non-streaming) for correct result.object population
- OpenRouter streaming path completely unchanged -- fallback only triggers for claude-code provider
- Trace event consistency maintained by emitting full text via onTextChunk on completion

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Claude Code generate-fallback to streamWithRetry** - `b32b4e5` (feat)

## Files Created/Modified
- `src/mastra/workflow/agent-utils.ts` - Added early-return fallback in streamWithRetry for Claude Code structured output calls

## Decisions Made
- Delegate to generateWithRetry (non-streaming) rather than trying to fix the streaming provider bug, since generateWithRetry already handles structured output correctly
- Build generateOpts object incrementally instead of inline to satisfy TypeScript's exactOptionalPropertyTypes constraint (avoids passing undefined for optional AbortSignal and ResponseCheck properties)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript exactOptionalPropertyTypes error**
- **Found during:** Task 1 (Claude Code generate-fallback)
- **Issue:** Passing `abortSignal: callerSignal` (which can be undefined) and `responseCheck: explicitResponseCheck` (which can be undefined) inline to GenerateWithRetryOptions violated exactOptionalPropertyTypes
- **Fix:** Build options object incrementally, only setting abortSignal and responseCheck when they have truthy values
- **Files modified:** src/mastra/workflow/agent-utils.ts
- **Verification:** `npx tsc --noEmit` passes with no new errors
- **Committed in:** b32b4e5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** TypeScript constraint fix necessary for compilation. No scope creep.

## Issues Encountered
None beyond the TypeScript exactOptionalPropertyTypes issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PROV-04 gap is architecturally resolved; all 8 tool-free agents using streamWithRetry with structuredOutput will now produce correct result.object when running through Claude Code
- Runtime validation requires human testing in a separate session with Claude Code provider active

## Self-Check: PASSED

- FOUND: src/mastra/workflow/agent-utils.ts
- FOUND: commit b32b4e5
- FOUND: 33-07-SUMMARY.md

---
*Phase: 33-provider-foundation*
*Completed: 2026-03-12*
