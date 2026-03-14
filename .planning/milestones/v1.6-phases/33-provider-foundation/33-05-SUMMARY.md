---
phase: 33-provider-foundation
plan: 05
subsystem: api
tags: [claude-code, agent-config, model-mapping, structured-output]

# Dependency graph
requires:
  - phase: 33-04
    provides: Agent factory with 3-way model resolution and claudeCodeModel config field
provides:
  - All 12 agents configured with claudeCodeModel (sonnet for extractors/testers, opus for dispatchers/reasoners)
  - Known gap documented: Claude Code streaming + structuredOutput returns empty responses
affects: [33-06, 34-01]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-agent-claude-code-model-tier]

key-files:
  created: []
  modified:
    - src/mastra/workflow/01-structured-problem-extractor-agent.ts
    - src/mastra/workflow/02-dispatcher-agent.ts
    - src/mastra/workflow/02-improver-dispatcher-agent.ts
    - src/mastra/workflow/02-initial-hypothesizer-agent.ts
    - src/mastra/workflow/02-synthesizer-agent.ts
    - src/mastra/workflow/03a-rule-tester-agent.ts
    - src/mastra/workflow/03a-sentence-tester-agent.ts
    - src/mastra/workflow/03a-verifier-orchestrator-agent.ts
    - src/mastra/workflow/03a2-verifier-feedback-extractor-agent.ts
    - src/mastra/workflow/03b-rules-improver-agent.ts
    - src/mastra/workflow/03b2-rules-improvement-extractor-agent.ts
    - src/mastra/workflow/04-question-answerer-agent.ts

key-decisions:
  - "Sonnet assigned to extractors/testers (5 agents), Opus to dispatchers/reasoners/answerer (7 agents)"
  - "Shorthand model IDs (sonnet/opus) used instead of full IDs (claude-sonnet-4-6) to match provider expectations"
  - "Structured output via Claude Code streaming returns empty responses -- gap deferred to future investigation"

patterns-established:
  - "Per-agent model tier: extractors/testers get lightweight model, dispatchers/reasoners get powerful model"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 33 Plan 05: Agent Model Configuration Summary

**All 12 agents configured with claudeCodeModel (sonnet/opus), but streaming + structuredOutput returns empty responses through Claude Code provider**

## Performance

- **Duration:** 2 min (Task 1 execution) + checkpoint verification (separate session)
- **Started:** 2026-03-11T12:20:23Z
- **Completed:** 2026-03-11T14:26:00Z
- **Tasks:** 1 completed, 1 failed validation
- **Files modified:** 12

## Accomplishments
- All 12 agent files configured with claudeCodeModel field in createWorkflowAgent config
- Extraction agents and testers (5 agents) assigned sonnet for cost-effective structured work
- Dispatcher, reasoning, and answerer agents (7 agents) assigned opus for complex reasoning
- Model IDs corrected from full form (claude-sonnet-4-6) to shorthand (sonnet/opus) to match provider conventions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add claudeCodeModel to all 12 agent files** - `db72c6a` (feat)
   - Follow-up fix: Model ID shorthand correction - `8f29374`, `523febd`

2. **Task 2: Validate Claude Code structured output with a real solve** - FAILED (no commit)
   - Streaming + structuredOutput combination returns empty responses from Claude Code provider
   - The `ai-sdk-provider-claude-code` has `defaultObjectGenerationMode = "json"` and supports `responseFormat.type === "json"` with schema, but `result.object` is null when streaming

## Files Created/Modified
- `src/mastra/workflow/01-structured-problem-extractor-agent.ts` - Added claudeCodeModel: 'sonnet'
- `src/mastra/workflow/02-dispatcher-agent.ts` - Added claudeCodeModel: 'opus'
- `src/mastra/workflow/02-improver-dispatcher-agent.ts` - Added claudeCodeModel: 'opus'
- `src/mastra/workflow/02-initial-hypothesizer-agent.ts` - Added claudeCodeModel: 'opus'
- `src/mastra/workflow/02-synthesizer-agent.ts` - Added claudeCodeModel: 'opus'
- `src/mastra/workflow/03a-rule-tester-agent.ts` - Added claudeCodeModel: 'sonnet'
- `src/mastra/workflow/03a-sentence-tester-agent.ts` - Added claudeCodeModel: 'sonnet'
- `src/mastra/workflow/03a-verifier-orchestrator-agent.ts` - Added claudeCodeModel: 'opus'
- `src/mastra/workflow/03a2-verifier-feedback-extractor-agent.ts` - Added claudeCodeModel: 'sonnet'
- `src/mastra/workflow/03b-rules-improver-agent.ts` - Added claudeCodeModel: 'opus'
- `src/mastra/workflow/03b2-rules-improvement-extractor-agent.ts` - Added claudeCodeModel: 'sonnet'
- `src/mastra/workflow/04-question-answerer-agent.ts` - Added claudeCodeModel: 'opus'

## Decisions Made
- Used shorthand model IDs ('sonnet', 'opus') instead of full form ('claude-sonnet-4-6', 'claude-opus-4-6') -- the ai-sdk-provider-claude-code maps these internally
- PROV-04 (all 8 tool-free agents produce correct output) NOT marked complete -- structured output validation failed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Model IDs changed from full form to shorthand**
- **Found during:** Post-Task 1 verification
- **Issue:** Initial implementation used `claude-sonnet-4-6` and `claude-opus-4-6` as model IDs, but the provider expects shorthand (`sonnet`, `opus`)
- **Fix:** Updated all 12 agent files plus agent-factory.ts and route.ts auth gate
- **Files modified:** 14 files (12 agents + agent-factory.ts + route.ts)
- **Verification:** Type check passes, provider resolves models correctly
- **Committed in:** `8f29374`, `523febd`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Model ID format correction needed for provider compatibility. No scope change.

## Known Gap: Structured Output via Claude Code

**Status:** FAILED -- deferred for investigation

The Claude Code provider returns empty responses when used with Mastra's streaming + structuredOutput combination:

```
[streamWithRetry] Attempt 1 failed: Empty response from model. Retrying in 5 seconds...
[streamWithRetry] Attempt 2 failed: Empty response from model. Retrying in 10 seconds...
ERROR: Error executing step workflow.solver-workflow.step.extract-structure: Error: Empty response from model
```

**Root cause hypothesis:** The `ai-sdk-provider-claude-code` supports `responseFormat.type === "json"` with schema and has `defaultObjectGenerationMode = "json"`, but the combination of streaming + structuredOutput results in `result.object` being null. This may require:
- Using `generate` (non-streaming) instead of `stream` for Claude Code structured output
- Adding a text-to-JSON fallback layer for Claude Code mode
- Investigating whether the `.catchall()` on `structuredProblemDataSchema` causes silent fallback

**Impact on PROV-04:** Requirement PROV-04 ("All 8 tool-free agents produce correct output through Claude Code provider") remains incomplete. This gap should be addressed in a gap closure plan or early Phase 34 work.

## Issues Encountered
- Structured output validation (Task 2) failed as described above -- this is the primary known gap from Phase 33

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 12 agents have claudeCodeModel configured -- ready for Phase 34 MCP tool bridge
- Structured output gap needs resolution before Claude Code provider can produce correct solve results
- Plan 06 (frontend toggle) already completed independently

## Self-Check: PASSED

All 12 modified files verified present. All 3 commit hashes (db72c6a, 8f29374, 523febd) verified in git log. claudeCodeModel grep count = 12.

---
*Phase: 33-provider-foundation*
*Completed: 2026-03-11*
