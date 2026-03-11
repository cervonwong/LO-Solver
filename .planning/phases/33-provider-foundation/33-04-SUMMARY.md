---
phase: 33-provider-foundation
plan: 04
subsystem: api
tags: [claude-code, agent-factory, auth-gate, error-handling, provider-mode]

# Dependency graph
requires:
  - phase: 33-01
    provides: Claude Code provider module and ProviderMode type
  - phase: 33-02
    provides: ProviderMode propagation across all workflow step and agent files
provides:
  - 3-way model resolution in agent factory (openrouter-testing, openrouter-production, claude-code)
  - Auth gate in /api/solve blocking unauthenticated Claude Code requests before workflow starts
  - Non-retryable error detection (auth, billing, ENOENT) in generateWithRetry and streamWithRetry
  - Retryable transient Claude Code error patterns (rate_limit, server_error, overloaded)
affects: [33-05, 33-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [three-way-model-resolution, auth-gate-probe, non-retryable-error-detection]

key-files:
  created: []
  modified:
    - src/mastra/workflow/agent-factory.ts
    - src/app/api/solve/route.ts
    - src/mastra/workflow/agent-utils.ts

key-decisions:
  - "claudeCodeModel defaults to claude-sonnet-4-6 when not specified per-agent"
  - "Auth gate uses generateText probe with maxOutputTokens 10 (lightweight auth check)"
  - "Non-retryable errors checked before retryable to ensure fast failure on auth/billing"

patterns-established:
  - "Auth gate pattern: lightweight generateText probe before workflow execution"
  - "Non-retryable vs retryable error classification in retry functions"

requirements-completed: [PROV-02, PROV-03, AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 33 Plan 04: Agent Factory and Auth Gate Summary

**3-way model resolution in agent factory with Claude Code auth gate and extended error handling for auth/transient errors**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T12:15:52Z
- **Completed:** 2026-03-11T12:19:03Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Agent factory resolves to Claude Code provider when providerMode is 'claude-code' via claudeCode(claudeCodeModel)
- Auth gate in /api/solve blocks unauthenticated Claude Code requests with 401 and clear error message
- generateWithRetry and streamWithRetry fail fast on authentication, billing, and ENOENT errors
- Transient Claude Code errors (rate_limit, server_error, overloaded) added to retryable patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend agent factory with 3-way model resolution** - `b251c33` (feat)
2. **Task 2: Add auth gate and extend error handling** - `d264ed8` (feat)

## Files Created/Modified
- `src/mastra/workflow/agent-factory.ts` - Added claudeCodeModel config field (defaults to claude-sonnet-4-6), import of claudeCode provider, 3-way model resolution in model callback
- `src/app/api/solve/route.ts` - Added Claude Code auth gate with generateText probe, scoped API key check to OpenRouter modes
- `src/mastra/workflow/agent-utils.ts` - Added non-retryable error detection (auth, billing, ENOENT) and Claude Code transient error patterns in both generateWithRetry and streamWithRetry

## Decisions Made
- Used `maxOutputTokens: 10` (not `maxTokens`) for the auth probe -- the `ai` SDK v6 uses `maxOutputTokens` as the property name
- Defaults to `claude-sonnet-4-6` for claudeCodeModel when not specified -- cost-effective default, agents that need Opus will specify it in Plan 05

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed maxTokens to maxOutputTokens in auth probe**
- **Found during:** Task 2 (Auth gate implementation)
- **Issue:** Plan specified `maxTokens: 10` but the `ai` SDK v6 uses `maxOutputTokens` as the property name, causing a TypeScript error
- **Fix:** Changed `maxTokens` to `maxOutputTokens` in the generateText call
- **Files modified:** src/app/api/solve/route.ts
- **Verification:** npx tsc --noEmit shows no errors in route.ts
- **Committed in:** d264ed8

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial property name fix to match SDK API. No scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Agent factory ready for Plan 05 to add claudeCodeModel to all 12 agent config files
- Auth gate operational -- Claude Code requests will be blocked if CLI not authenticated
- Error handling covers both auth failures (fail fast) and transient errors (retry with backoff)

## Self-Check: PASSED

All files verified present. All commit hashes verified in git log.

---
*Phase: 33-provider-foundation*
*Completed: 2026-03-11*
