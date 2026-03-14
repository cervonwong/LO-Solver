---
phase: 35-frontend-integration
plan: 01
subsystem: api
tags: [provider-mode, claude-code, openrouter, agent-factory, cost-tracking]

# Dependency graph
requires:
  - phase: 33-provider-mode
    provides: "3-value ProviderMode type, Claude Code provider integration"
  - phase: 34-mcp-tool-bridge
    provides: "MCP tool bridge, attachMcpProvider, per-execution Claude Code provider"
provides:
  - "4-value ProviderMode type (openrouter-testing, openrouter-production, claude-code-testing, claude-code-production)"
  - "isClaudeCodeMode() and isOpenRouterMode() helper functions"
  - "Tier-based model resolution: extraction agents (haiku/sonnet), reasoning agents (sonnet/opus)"
  - "Claude Code cost extraction from providerMetadata"
  - "Token accumulation and per-call cost emission for Claude Code mode"
affects: [35-02-PLAN, 35-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isClaudeCodeMode/isOpenRouterMode helpers for mode checking"
    - "claudeCodeTestingModel/claudeCodeProductionModel split config in agent factory"
    - "Per-call cost emission for subscription (Claude Code) vs $1-boundary for pay-per-use (OpenRouter)"

key-files:
  created: []
  modified:
    - src/mastra/openrouter.ts
    - src/mastra/workflow/agent-factory.ts
    - src/mastra/workflow/agent-utils.ts
    - src/mastra/workflow/request-context-helpers.ts
    - src/mastra/workflow/request-context-types.ts
    - src/mastra/workflow/workflow-schemas.ts
    - src/lib/workflow-events.ts
    - src/app/api/solve/route.ts
    - src/mastra/workflow/steps/02-shared.ts
    - src/mastra/workflow/01-structured-problem-extractor-agent.ts
    - src/mastra/workflow/02-initial-hypothesizer-agent.ts
    - src/mastra/workflow/02-dispatcher-agent.ts
    - src/mastra/workflow/02-improver-dispatcher-agent.ts
    - src/mastra/workflow/02-synthesizer-agent.ts
    - src/mastra/workflow/03a-sentence-tester-agent.ts
    - src/mastra/workflow/03a-rule-tester-agent.ts
    - src/mastra/workflow/03a-verifier-orchestrator-agent.ts
    - src/mastra/workflow/03a2-verifier-feedback-extractor-agent.ts
    - src/mastra/workflow/03b-rules-improver-agent.ts
    - src/mastra/workflow/03b2-rules-improvement-extractor-agent.ts
    - src/mastra/workflow/04-question-answerer-agent.ts

key-decisions:
  - "Split claude-code into claude-code-testing and claude-code-production for 4-way provider toggle"
  - "Extraction/tester agents: haiku (testing) / sonnet (production) for cost efficiency"
  - "Reasoning agents: sonnet (testing) / opus (production) for quality scaling"
  - "Claude Code cost emission on every call (subscription model) vs $1-boundary for OpenRouter"
  - "Token accumulation via cumulative-tokens key in WorkflowRequestContext"

patterns-established:
  - "isClaudeCodeMode/isOpenRouterMode: centralized mode-check helpers instead of string comparison"
  - "claudeCodeTestingModel/claudeCodeProductionModel: per-tier model config on agent definitions"

requirements-completed: [UI-01, PROV-06]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 35 Plan 01: Backend Provider Mode Expansion Summary

**4-value ProviderMode with tier-based model resolution, isClaudeCodeMode/isOpenRouterMode helpers, and Claude Code cost+token tracking**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T05:05:36Z
- **Completed:** 2026-03-14T05:11:08Z
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments
- Expanded ProviderMode from 3 to 4 values: split 'claude-code' into 'claude-code-testing' and 'claude-code-production'
- Added centralized helper functions (isClaudeCodeMode, isOpenRouterMode) replacing all string comparisons
- Implemented tier-based model resolution in agent factory: extraction agents use haiku/sonnet, reasoning agents use sonnet/opus
- Extended cost extraction to read Claude Code providerMetadata alongside OpenRouter
- Added token accumulation and differentiated cost emission (per-call for Claude Code, $1-boundary for OpenRouter)

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand ProviderMode type and add helper functions** - `8b941be` (feat)
2. **Task 2: Update all claude-code comparisons, agent factory tiers, and cost extraction** - `23811db` (feat)

## Files Created/Modified
- `src/mastra/openrouter.ts` - 4-value ProviderMode, isClaudeCodeMode/isOpenRouterMode helpers
- `src/mastra/workflow/agent-factory.ts` - Tier-based model resolution with claudeCodeTestingModel/claudeCodeProductionModel
- `src/mastra/workflow/agent-utils.ts` - Updated generateWithRetry/streamWithRetry to use isClaudeCodeMode
- `src/mastra/workflow/request-context-helpers.ts` - Claude Code cost extraction, extractTokensFromResult, token-aware updateCumulativeCost
- `src/mastra/workflow/request-context-types.ts` - Added cumulative-tokens key
- `src/mastra/workflow/workflow-schemas.ts` - Updated 2 Zod enums to 4 values
- `src/lib/workflow-events.ts` - Extended CostUpdateEvent with cumulativeTokens/isSubscription
- `src/app/api/solve/route.ts` - Updated auth gate and API key checks to use helpers
- `src/mastra/workflow/steps/02-shared.ts` - Updated attachMcpProvider mode check
- 12 agent files - Updated from claudeCodeModel to claudeCodeTestingModel/claudeCodeProductionModel

## Decisions Made
- Split 'claude-code' into testing/production variants to match OpenRouter's 2-tier model
- Extraction/tester agents get haiku for testing (cost-efficient) and sonnet for production
- Reasoning agents get sonnet for testing and opus for production (quality scaling)
- Claude Code cost events emit on every call (subscription model has no meaningful $ boundaries)
- Token accumulation tracked separately from cost for Claude Code subscription display

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ProviderMode undefined guard in agent factory**
- **Found during:** Task 2 (agent factory update)
- **Issue:** `isClaudeCodeMode(providerMode)` called with potentially undefined providerMode from requestContext
- **Fix:** Added null check: `providerMode && isClaudeCodeMode(providerMode)`
- **Files modified:** src/mastra/workflow/agent-factory.ts
- **Verification:** Type-check passes
- **Committed in:** 23811db (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type safety fix, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend fully prepared for 4-way provider toggle
- Plan 02 can implement frontend toggle UI and client-side mapping
- Plan 03 can implement cost display changes for subscription mode

---
*Phase: 35-frontend-integration*
*Completed: 2026-03-14*
