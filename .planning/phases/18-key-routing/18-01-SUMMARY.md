---
phase: 18-key-routing
plan: 01
subsystem: api
tags: [openrouter, provider-factory, request-context, api-key, per-request-auth]

# Dependency graph
requires:
  - phase: 17-key-entry-ui
    provides: useApiKey hook and ApiKeyDialog for frontend key management
provides:
  - createOpenRouterProvider factory for per-request provider instances
  - getOpenRouterProvider helper with singleton fallback
  - openrouter-provider key in WorkflowRequestContext
  - API key propagation through workflow state and step RequestContexts
  - hasServerKey boolean in /api/credits responses
  - No-key guard (401) in solve route
affects: [18-key-routing plan 02 (frontend wiring)]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-request-provider-factory, state-based-key-propagation]

key-files:
  created: []
  modified:
    - src/mastra/openrouter.ts
    - src/mastra/workflow/request-context-types.ts
    - src/mastra/workflow/request-context-helpers.ts
    - src/mastra/workflow/workflow-schemas.ts
    - src/mastra/workflow/steps/01-extract.ts
    - src/mastra/workflow/steps/02-hypothesize.ts
    - src/mastra/workflow/steps/03-answer.ts
    - src/app/api/solve/route.ts
    - src/app/api/credits/route.ts
    - src/mastra/workflow/01-structured-problem-extractor-agent.ts
    - src/mastra/workflow/02-initial-hypothesizer-agent.ts
    - src/mastra/workflow/02a-initial-hypothesis-extractor-agent.ts
    - src/mastra/workflow/02-dispatcher-agent.ts
    - src/mastra/workflow/02-improver-dispatcher-agent.ts
    - src/mastra/workflow/02-synthesizer-agent.ts
    - src/mastra/workflow/03a-verifier-orchestrator-agent.ts
    - src/mastra/workflow/03a-rule-tester-agent.ts
    - src/mastra/workflow/03a-sentence-tester-agent.ts
    - src/mastra/workflow/03a2-verifier-feedback-extractor-agent.ts
    - src/mastra/workflow/03b-rules-improver-agent.ts
    - src/mastra/workflow/03b2-rules-improvement-extractor-agent.ts
    - src/mastra/workflow/04-question-answerer-agent.ts

key-decisions:
  - "API key flows through inputData schema and workflow state (not workflow-level requestContext) for Mastra compatibility"
  - "Provider created per-step (3 times total) from state.apiKey since RequestContext is step-local and not transferable"
  - "Environment key guard allows undefined openrouterBase when no server key configured (lazy initialization)"

patterns-established:
  - "Provider factory: createOpenRouterProvider(apiKey) wraps base with identical gpt-oss routing and usage tracking"
  - "Agent model indirection: all agents use getOpenRouterProvider(requestContext)(...) instead of direct openrouter(...)"
  - "State-based key propagation: apiKey stored in workflow state so downstream steps can recreate provider"

requirements-completed: [FLOW-02, FLOW-03, FLOW-04, FLOW-05]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 18 Plan 01: Backend Key Routing Summary

**Per-request OpenRouter provider factory with RequestContext plumbing across all 13 agents and 3 workflow steps**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T13:21:46Z
- **Completed:** 2026-03-06T13:26:53Z
- **Tasks:** 3
- **Files modified:** 22

## Accomplishments
- Extracted provider factory from singleton with shared gpt-oss routing and usage tracking logic
- Updated all 13 agent model functions to read provider from RequestContext via helper
- Wired API key through workflow state so all 3 steps create per-request providers
- Added no-key guard (401) and hasServerKey boolean to API routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Provider factory, RequestContext key, getOpenRouterProvider helper** - `3d29f53` (feat)
2. **Task 2: Update all 13 agent model functions** - `0db2863` (feat)
3. **Task 3: Wire API key through solve route, steps, and credits endpoint** - `44cf8ec` (feat)

## Files Created/Modified
- `src/mastra/openrouter.ts` - Added wrapProvider helper, createOpenRouterProvider factory, lazy env-key initialization
- `src/mastra/workflow/request-context-types.ts` - Added 'openrouter-provider' optional key to WorkflowRequestContext
- `src/mastra/workflow/request-context-helpers.ts` - Added getOpenRouterProvider helper with singleton fallback
- `src/mastra/workflow/workflow-schemas.ts` - Added apiKey to rawProblemInputSchema and workflowStateSchema
- `src/mastra/workflow/steps/01-extract.ts` - Creates per-request provider from inputData.apiKey, propagates to state
- `src/mastra/workflow/steps/02-hypothesize.ts` - Creates per-request provider from state.apiKey
- `src/mastra/workflow/steps/03-answer.ts` - Creates per-request provider from state.apiKey
- `src/app/api/solve/route.ts` - No-key guard (401), removed requestContext pass-through
- `src/app/api/credits/route.ts` - Added hasServerKey, optional user key query param, removed console.log
- `src/mastra/workflow/*-agent.ts` (13 files) - Changed model function to use getOpenRouterProvider(requestContext)

## Decisions Made
- API key propagates via Zod-validated workflow state (apiKey field) rather than workflow-level requestContext, because Mastra step execute functions do not receive the workflow-level requestContext directly. Each step creates its own provider instance from the string key in state.
- The singleton openrouter export handles missing OPENROUTER_API_KEY gracefully (undefined cast) instead of crashing with `!` assertion, supporting deployments without a server key.
- Credits endpoint accepts a `key` query param to fetch user-specific balance, reusing the existing endpoint rather than adding a new one.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend key routing complete, ready for Plan 02 (frontend wiring)
- Frontend needs to send apiKey in inputData and read hasServerKey from credits endpoint
- All agents and steps are ready to use per-request providers when a user key is present

## Self-Check: PASSED

All 10 key files verified present. All 3 task commits verified in git log.

---
*Phase: 18-key-routing*
*Completed: 2026-03-06*
