---
phase: 04-multi-perspective-hypothesis-generation
plan: 02
subsystem: workflow
tags: [mastra, agents, dispatcher, synthesizer, hypothesizer, rules-tools]

# Dependency graph
requires:
  - phase: 04-multi-perspective-hypothesis-generation
    plan: 01
    provides: "Rules CRUD tools, DraftStore infrastructure, multi-perspective Zod schemas"
provides:
  - "Perspective dispatcher agent for generating linguistic exploration angles"
  - "Hypothesis synthesizer agent for score-weighted ruleset merging"
  - "Improver-dispatcher agent for round 2+ gap analysis"
  - "Refactored hypothesizer with rules CRUD tools (no extractor chain)"
  - "Updated agent registry with all multi-perspective agents"
affects: [04-03, workflow, agents]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dispatcher agents: no tools, structured output via call-site structuredOutput"
    - "Synthesizer agent: full tool suite (rules + vocabulary + testing)"
    - "Hypothesizer uses rules CRUD tools directly instead of extractor chain"
    - "Placeholder replacement pattern for injecting tool instructions into prompts"

key-files:
  created:
    - src/mastra/workflow/02-dispatcher-agent.ts
    - src/mastra/workflow/02-dispatcher-instructions.ts
    - src/mastra/workflow/02-synthesizer-agent.ts
    - src/mastra/workflow/02-synthesizer-instructions.ts
    - src/mastra/workflow/02-improver-dispatcher-agent.ts
    - src/mastra/workflow/02-improver-dispatcher-instructions.ts
  modified:
    - src/mastra/workflow/02-initial-hypothesizer-agent.ts
    - src/mastra/workflow/02-initial-hypothesizer-instructions.ts
    - src/mastra/workflow/02a-initial-hypothesis-extractor-agent.ts
    - src/mastra/workflow/02a-initial-hypothesis-extractor-instructions.ts
    - src/mastra/workflow/index.ts

key-decisions:
  - "Dispatcher agents use no tools; structured output applied at call site via structuredOutput param"
  - "Hypothesizer instructions rewritten for perspective-specific exploration with direct rules CRUD"
  - "Extractor agents deprecated but not deleted for backward compat with existing verify-improve loop"

patterns-established:
  - "Dispatcher pattern: analysis-only agent with structured output at call site"
  - "Tool instruction injection: {{RULES_TOOLS_INSTRUCTIONS}} and {{VOCABULARY_TOOLS_INSTRUCTIONS}} placeholders replaced at agent definition"

requirements-completed: [WORK-01, WORK-02, WORK-03]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 4 Plan 2: Multi-Perspective Agent Definitions Summary

**Dispatcher, synthesizer, and improver-dispatcher agents plus hypothesizer refactored for direct rules CRUD with perspective-aware exploration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T05:33:12Z
- **Completed:** 2026-03-01T05:37:22Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Perspective dispatcher agent with comprehensive reference list of common Linguistics Olympiad patterns (phonological, morphological, syntactic, agreement, semantic, orthographic)
- Hypothesis synthesizer agent with full tool suite and score-weighted conflict resolution instructions
- Improver-dispatcher agent for gap analysis and targeted round 2+ perspective generation
- Hypothesizer refactored: adds rulesTools, instructions rewritten for perspective-specific exploration and direct rules CRUD (no extractor chain dependency)
- All new agents registered in index.ts workflowAgents and rulesTools added to workflowTools

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dispatcher and improver-dispatcher agents** - `b674113` (feat)
2. **Task 2: Create synthesizer agent and refactor hypothesizer, update index** - `c23adb8` (feat)

## Files Created/Modified
- `src/mastra/workflow/02-dispatcher-agent.ts` - Perspective dispatcher agent (id: perspective-dispatcher)
- `src/mastra/workflow/02-dispatcher-instructions.ts` - Dispatcher prompt with LO pattern reference list
- `src/mastra/workflow/02-synthesizer-agent.ts` - Hypothesis synthesizer agent with rules + vocabulary + testing tools
- `src/mastra/workflow/02-synthesizer-instructions.ts` - Synthesizer prompt for score-weighted conflict resolution
- `src/mastra/workflow/02-improver-dispatcher-agent.ts` - Improver-dispatcher agent (id: improver-dispatcher)
- `src/mastra/workflow/02-improver-dispatcher-instructions.ts` - Gap analysis and targeted perspective generation prompt
- `src/mastra/workflow/02-initial-hypothesizer-agent.ts` - Added rulesTools, RULES_TOOLS_INSTRUCTIONS injection
- `src/mastra/workflow/02-initial-hypothesizer-instructions.ts` - Rewritten for perspective-specific exploration, direct rules CRUD
- `src/mastra/workflow/02a-initial-hypothesis-extractor-agent.ts` - Added deprecation comment
- `src/mastra/workflow/02a-initial-hypothesis-extractor-instructions.ts` - Added deprecation comment
- `src/mastra/workflow/index.ts` - Registered 3 new agents, added rulesTools to workflowTools

## Decisions Made
- Dispatcher agents have no tools; structured output is applied at the call site via `structuredOutput: { schema }` parameter on `Agent.generate()`, matching the Mastra convention noted in accumulated context
- Hypothesizer instructions fully rewritten rather than patched, to cleanly integrate perspective-specific exploration, rules CRUD instructions, and remove all references to extractor chain
- Extractor agents kept with deprecation comments rather than deleted, since the existing verify-improve workflow loop still imports them until Plan 03 rewrites the workflow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 agent types defined and registered: dispatcher, hypothesizer (refactored), synthesizer, improver-dispatcher
- Plan 03 can now wire these agents into the workflow step rewrite
- Dispatcher agents ready for structured output at call site
- Hypothesizer ready for parallel invocation with different perspective prompts
- Synthesizer ready for score-weighted merging with full tool access

## Self-Check: PASSED

All 11 files verified present. Both task commits (b674113, c23adb8) verified in git log.

---
*Phase: 04-multi-perspective-hypothesis-generation*
*Completed: 2026-03-01*
