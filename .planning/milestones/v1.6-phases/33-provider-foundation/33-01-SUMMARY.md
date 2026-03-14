---
phase: 33-provider-foundation
plan: 01
subsystem: api
tags: [claude-code, ai-sdk, provider, type-system]

# Dependency graph
requires: []
provides:
  - Claude Code provider module with security sandbox (disallowedTools)
  - ProviderMode type with 3 values replacing binary ModelMode
  - providerMode field in workflow state and input schemas
  - provider-mode RequestContext key
affects: [33-02, 33-03, 33-04, 33-05, 33-06]

# Tech tracking
tech-stack:
  added: [ai-sdk-provider-claude-code, "@anthropic-ai/claude-agent-sdk"]
  patterns: [singleton-provider-module, three-value-provider-mode-enum]

key-files:
  created:
    - src/mastra/claude-code-provider.ts
  modified:
    - package.json
    - src/mastra/openrouter.ts
    - src/mastra/workflow/workflow-schemas.ts
    - src/mastra/workflow/request-context-types.ts
    - src/mastra/workflow/agent-factory.ts

key-decisions:
  - "createClaudeCode uses defaultSettings wrapper (not top-level config) matching provider SDK API"
  - "19 built-in tools blocked (plan said 20 but enumerated list contains 19)"

patterns-established:
  - "Singleton Claude Code provider: CLI-level auth means no per-request key needed"
  - "ProviderMode type system: 3-value enum replaces binary ModelMode across codebase"

requirements-completed: [PROV-01, PROV-05]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 33 Plan 01: Provider Foundation Summary

**Claude Code provider module with 19 disallowed tools and ProviderMode type system replacing binary ModelMode**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T12:02:28Z
- **Completed:** 2026-03-11T12:05:50Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed `ai-sdk-provider-claude-code` and `@anthropic-ai/claude-agent-sdk` packages
- Created `claude-code-provider.ts` singleton with all 19 built-in tools blocked and bypassPermissions for server-side execution
- Renamed `ModelMode` to `ProviderMode` with 3 values across 5 core files
- All 7 core files compile cleanly; remaining type errors are only in step/agent/eval files (Plans 02 and 03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages and create Claude Code provider module** - `1f8eca3` (feat)
2. **Task 2: Rename modelMode to providerMode in core type files** - `e5477ee` (feat)

## Files Created/Modified
- `src/mastra/claude-code-provider.ts` - Claude Code provider singleton with comprehensive disallowedTools
- `package.json` - Added ai-sdk-provider-claude-code and @anthropic-ai/claude-agent-sdk dependencies
- `src/mastra/openrouter.ts` - ProviderMode type with 3 values, activeModelId with claude-code branch
- `src/mastra/workflow/workflow-schemas.ts` - providerMode field in workflowStateSchema and rawProblemInputSchema
- `src/mastra/workflow/request-context-types.ts` - Renamed 'model-mode' to 'provider-mode' with ProviderMode type
- `src/mastra/workflow/agent-factory.ts` - Updated model callback to use ProviderMode

## Decisions Made
- Used `defaultSettings` wrapper in `createClaudeCode()` matching the actual SDK API (plan showed top-level config but SDK requires `defaultSettings` key)
- 19 built-in tools blocked (Bash, Read, Write, Edit, Glob, Grep, NotebookEdit, WebSearch, WebFetch, Agent, Task, TaskOutput, TaskStop, TodoRead, TodoWrite, EnterPlanMode, ExitPlanMode, AskUserQuestion, Config) -- plan mentioned 20 but enumerated list contains 19

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted createClaudeCode config shape to match SDK API**
- **Found during:** Task 1 (Create provider module)
- **Issue:** Plan showed `createClaudeCode({ disallowedTools, permissionMode, allowDangerouslySkipPermissions })` but the actual SDK requires these under a `defaultSettings` key
- **Fix:** Wrapped config in `{ defaultSettings: { ... } }` to match `ClaudeCodeProviderSettings` type
- **Files modified:** src/mastra/claude-code-provider.ts
- **Verification:** npx tsc --noEmit shows no errors in provider file
- **Committed in:** 1f8eca3

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor config shape adjustment to match actual SDK API. No scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ProviderMode type system ready for Plans 02 and 03 to consume (mechanical rename across step/agent/eval files)
- Claude Code provider module ready for Plan 04 to integrate into agent factory
- 18 expected type errors in step/eval files await Plans 02 and 03

## Self-Check: PASSED

All files verified present. All commit hashes verified in git log.

---
*Phase: 33-provider-foundation*
*Completed: 2026-03-11*
