---
phase: 04-multi-perspective-hypothesis-generation
plan: 03
subsystem: workflow
tags: [mastra, workflow, multi-perspective, ui, sliders, progress, dispatch, synthesize, verify]

# Dependency graph
requires:
  - phase: 04-multi-perspective-hypothesis-generation
    plan: 01
    provides: "Rules CRUD tools, DraftStore infrastructure, multi-perspective Zod schemas"
  - phase: 04-multi-perspective-hypothesis-generation
    plan: 02
    provides: "Dispatcher, synthesizer, improver-dispatcher, refactored hypothesizer agents"
provides:
  - "Multi-perspective dispatch-hypothesize-verify-synthesize workflow loop"
  - "UI sliders for maxRounds and perspectiveCount in nav bar"
  - "Perspective-level and round-level progress tracking in frontend"
  - "Parallel hypothesizer execution with isolated RequestContexts per perspective"
  - "Score-weighted ruleset synthesis with convergence-based early exit"
affects: [05, workflow, evals, ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parallel agent execution: Promise.all with isolated RequestContext per perspective"
    - "Multi-round iteration: dispatch-hypothesize-verify-synthesize loop with convergence check"
    - "useSyncExternalStore + localStorage pattern for workflow settings hook"
    - "Round/perspective/synthesis event streaming for hierarchical progress"

key-files:
  created:
    - src/components/workflow-sliders.tsx
    - src/hooks/use-workflow-settings.ts
  modified:
    - src/mastra/workflow/workflow.ts
    - src/lib/workflow-events.ts
    - src/lib/trace-utils.ts
    - src/app/page.tsx
    - src/app/layout.tsx
    - src/evals/run.ts
    - src/mastra/workflow/03a-rule-tester-tool.ts
    - src/mastra/workflow/03a-sentence-tester-tool.ts
    - src/mastra/openrouter.ts

key-decisions:
  - "Each parallel hypothesizer gets its own RequestContext instance pointing to isolated draft store Maps"
  - "Testing mode caps at 2 perspectives and 2 rounds to limit cost and duration"
  - "Vocabulary merged programmatically by score order (highest-scored perspective wins conflicts); rules merged by synthesizer agent via CRUD tools"
  - "Progress bar shows hierarchical round -> perspective -> synthesis structure from streamed events"

patterns-established:
  - "Isolated RequestContext per parallel agent: each perspective gets fresh context with draft store Maps for 'vocabulary-state' and 'rules-state'"
  - "Workflow settings hook: useSyncExternalStore + localStorage for persistent UI controls"
  - "Convergence-based early exit: stop iteration when synthesized ruleset passes all tests"

requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04]

# Metrics
duration: ~180min
completed: 2026-03-01
---

# Phase 4 Plan 3: Workflow Rewrite + UI Sliders + Frontend Progress Summary

**Multi-perspective dispatch-hypothesize-verify-synthesize workflow loop with parallel hypothesizers, nav bar sliders for rounds/perspectives, and hierarchical round/perspective progress tracking**

## Performance

- **Duration:** ~180 min (across checkpoint pause)
- **Started:** 2026-03-01T05:37:22Z
- **Completed:** 2026-03-01T08:36:31Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 12

## Accomplishments
- Replaced single-perspective hypothesis step with multi-round dispatch-hypothesize-verify-synthesize loop in workflow.ts
- Parallel hypothesizer execution via Promise.all with isolated RequestContext per perspective (draft stores prevent cross-contamination)
- Verifier scores each perspective's ruleset individually; synthesizer merges best-scoring rulesets into main store
- Early exit on convergence when synthesized ruleset achieves 100% test pass rate
- Testing mode automatically limits to 2 perspectives and 2 rounds
- UI sliders in nav bar for Rounds (1-5) and Perspectives (2-7) with localStorage persistence
- Frontend progress bar shows hierarchical round/perspective/synthesis progress from new event types
- New workflow events: PerspectiveStart/Complete, SynthesisStart/Complete, RoundStart/Complete, TestToolSubAgentCall

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite workflow with dispatch-hypothesize-verify-synthesize loop** - `8b2bdb8` (feat)
2. **Task 2: Add UI sliders and multi-perspective progress tracking** - `0f347f4` (feat)
3. **Task 3: Checkpoint human-verify** - approved by user (no code commit)

Post-checkpoint fixes during verification testing:
- `878b200` - Remove test tools from hypothesizer to fix 20-min stalling
- `1ded98f` - Revert above (test tools needed for perspective quality)
- `2a9a6b1` - Add logging and trace events for test tool sub-agent calls
- `1a0b012` - Route gpt-oss models to clarifai/fp4 then google-vertex

## Files Created/Modified
- `src/mastra/workflow/workflow.ts` - Complete workflow rewrite with multiPerspectiveHypothesisStep replacing initialHypothesisStep + verifyImproveLoopStep
- `src/lib/workflow-events.ts` - New event types for perspective, synthesis, and round tracking; updated StepId and UIStepId
- `src/lib/trace-utils.ts` - Updated event parsing/grouping for new multi-perspective event types
- `src/app/page.tsx` - Sends maxRounds/perspectiveCount in request; handles round/perspective/synthesis events in progress bar
- `src/app/layout.tsx` - Added WorkflowSliders component to nav bar
- `src/components/workflow-sliders.tsx` - Two range sliders for Rounds and Perspectives controls
- `src/hooks/use-workflow-settings.ts` - useSyncExternalStore + localStorage hook for workflow settings
- `src/evals/run.ts` - Updated for new workflow input schema (maxRounds/perspectiveCount)
- `src/mastra/workflow/03a-rule-tester-tool.ts` - Added trace event emission for sub-agent calls
- `src/mastra/workflow/03a-sentence-tester-tool.ts` - Added trace event emission for sub-agent calls
- `src/mastra/openrouter.ts` - Model routing update for gpt-oss via clarifai/fp4

## Decisions Made
- Each parallel hypothesizer gets its own RequestContext instance pointing to isolated draft store Maps, preventing cross-contamination between perspectives
- Testing mode caps at 2 perspectives and 2 rounds (via `Math.min`) to keep iteration fast and cheap
- Vocabulary is merged programmatically by score order (highest-scored perspective wins conflicts on foreignForm key); rules are merged by the synthesizer agent using CRUD tools
- Progress bar shows hierarchical structure: Extract -> Round N (Perspective A, Perspective B, ..., Synthesis) -> Answer
- Model routing adjusted to use clarifai/fp4 for gpt-oss models, then google-vertex as fallback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test tool trace events not emitting**
- **Found during:** Checkpoint verification testing
- **Issue:** Test tool sub-agent calls (rule tester, sentence tester) were not emitting trace events, making debugging difficult
- **Fix:** Added trace event emission in both tester tools and new TestToolSubAgentCallEvent type
- **Files modified:** `src/mastra/workflow/03a-rule-tester-tool.ts`, `src/mastra/workflow/03a-sentence-tester-tool.ts`, `src/lib/workflow-events.ts`
- **Committed in:** `2a9a6b1`

**2. [Rule 3 - Blocking] Model routing for gpt-oss models**
- **Found during:** Checkpoint verification testing
- **Issue:** gpt-oss model calls failing with default routing
- **Fix:** Added clarifai/fp4 as primary route, google-vertex as fallback for gpt-oss models
- **Files modified:** `src/mastra/openrouter.ts`
- **Committed in:** `1a0b012`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for the workflow to execute successfully during verification. No scope creep.

## Issues Encountered
- Hypothesizer agents with test tools sometimes stalled for 20+ minutes; attempted removing test tools but reverted since they are needed for perspective quality. The stalling was resolved by the model routing fix instead.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 4 complete: multi-perspective hypothesis generation fully operational
- Workflow produces scored rulesets from multiple linguistic perspectives per round
- Phase 5 (Verification Loop Improvements) can build on the synthesized ruleset as its starting point
- All WORK-01 through WORK-04 requirements satisfied
- Eval harness ready to measure accuracy improvement from multi-perspective approach

## Self-Check: PASSED

All 11 files verified present. All 6 commits (8b2bdb8, 0f347f4, 878b200, 1ded98f, 2a9a6b1, 1a0b012) verified in git log.

---
*Phase: 04-multi-perspective-hypothesis-generation*
*Completed: 2026-03-01*
