---
phase: 30-mastra-prompt-engineering
plan: 02
subsystem: ai-agents
tags: [gemini-3-flash, xml-prompts, confidence-scale, prompt-engineering, mastra]

# Dependency graph
requires:
  - phase: 28-agent-factory
    provides: "Agent factory and instruction file pattern"
provides:
  - "7 Gemini 3 Flash instruction files rewritten with XML-delimited sections"
  - "Shared rules-tools-prompt.ts with 6-level evidence-based confidence scale"
  - "Hedged assertion style across all Gemini prompts"
affects: [30-mastra-prompt-engineering, eval-results]

# Tech tracking
tech-stack:
  added: []
  patterns: ["XML-delimited prompt sections for Gemini 3 Flash", "6-level evidence-based confidence scale with 3-level Zod mapping", "hedged assertion style for LLM conclusions"]

key-files:
  created: []
  modified:
    - src/mastra/workflow/rules-tools-prompt.ts
    - src/mastra/workflow/02-dispatcher-instructions.ts
    - src/mastra/workflow/02-improver-dispatcher-instructions.ts
    - src/mastra/workflow/02-initial-hypothesizer-instructions.ts
    - src/mastra/workflow/02-synthesizer-instructions.ts
    - src/mastra/workflow/03a-verifier-orchestrator-instructions.ts
    - src/mastra/workflow/03b-rules-improver-instructions.ts
    - src/mastra/workflow/04-question-answerer-instructions.ts

key-decisions:
  - "Kept markdown formatting inside rules-tools-prompt.ts since it is embedded content within XML <tools> sections, not structural headers"
  - "Included full 6-level confidence scale directly in rules-improver since it has no {{RULES_TOOLS_INSTRUCTIONS}} template slot"
  - "Used <approach> section instead of explicit step-by-step scaffolding for structured decomposition in hypothesizer and synthesizer"

patterns-established:
  - "Gemini XML prompt pattern: <role>, <task>, <tools>, <rules>/<approach>, <evidence_assessment>, <output>, <constraints> (constraints always last)"
  - "Template injection slots placed inside dedicated <tools> XML section"
  - "6-level confidence scale: well-supported/supported -> HIGH, plausible/tentative -> MEDIUM, speculative/unsupported -> LOW"

requirements-completed: [PE-03, PE-05]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 30 Plan 02: Gemini Prompt Rewrite Summary

**All 7 Gemini 3 Flash prompts rewritten with XML-delimited sections, 6-level evidence-based confidence scale, and hedged assertion style**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T07:53:39Z
- **Completed:** 2026-03-09T07:58:09Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Updated shared rules-tools-prompt.ts from 3-level to 6-level evidence-based confidence scale with explicit Zod enum mapping
- Rewrote all 7 Gemini 3 Flash instruction files with XML-delimited sections, removing markdown headers for structure
- Removed explicit chain-of-thought scaffolding from all Gemini prompts (leveraging Gemini 3's built-in thinking)
- Added hedged assertion style to all prompts that assess evidence or confidence
- Preserved all template injection slots ({{RULES_TOOLS_INSTRUCTIONS}} in hypothesizer and synthesizer, {{VOCABULARY_TOOLS_INSTRUCTIONS}} in hypothesizer, synthesizer, and rules-improver)
- Preserved priority vocabulary unchanged for dispatcher and improver-dispatcher

## Task Commits

Each task was committed atomically:

1. **Task 1: Update shared confidence scale and rewrite 4 non-template Gemini prompts** - `b8704ca`
2. **Task 2: Rewrite 3 template-injected Gemini prompts** - `9a586bb`

## Files Created/Modified
- `src/mastra/workflow/rules-tools-prompt.ts` - Updated confidence guidelines from 3-level to 6-level evidence-based scale with Zod mapping
- `src/mastra/workflow/02-dispatcher-instructions.ts` - Rewritten with XML sections, concise task description, preserved priority vocabulary
- `src/mastra/workflow/02-improver-dispatcher-instructions.ts` - Rewritten with XML sections, gap analysis focus, preserved priority vocabulary
- `src/mastra/workflow/02-initial-hypothesizer-instructions.ts` - Rewritten with XML sections, template slots in <tools>, confidence scale reinforced
- `src/mastra/workflow/02-synthesizer-instructions.ts` - Rewritten with XML sections, template slots in <tools>, merge strategy focus
- `src/mastra/workflow/03a-verifier-orchestrator-instructions.ts` - Rewritten with XML sections, hedged assertion evidence assessment
- `src/mastra/workflow/03b-rules-improver-instructions.ts` - Rewritten with XML sections, full 6-level confidence scale (no rules-tools template)
- `src/mastra/workflow/04-question-answerer-instructions.ts` - Rewritten with XML sections, 6-level confidence scale with Zod mapping

## Decisions Made
- Kept markdown formatting inside rules-tools-prompt.ts since it is embedded content within XML `<tools>` sections in host prompts, not structural headers. This follows the plan's note that "rules-tools-prompt.ts may retain markdown for its embedded content."
- Included the full 6-level confidence scale directly in rules-improver since it does not receive `{{RULES_TOOLS_INSTRUCTIONS}}` template injection. Hypothesizer and synthesizer reinforce by reference since they get the scale via the injected rules-tools-prompt.
- Used `<approach>` section for structured decomposition in agents that need it (hypothesizer, synthesizer, rules-improver) as a minimal alternative to removed chain-of-thought scaffolding.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 7 Gemini 3 Flash prompts are rewritten with consistent XML structure and vocabulary
- 6-level confidence scale is in place across all relevant agents
- Ready for the final eval run plan (30-03) to verify no regression

## Self-Check: PASSED

All 8 modified files verified present. Both task commits (b8704ca, 9a586bb) verified in git log. TypeScript compilation produces only pre-existing errors (CSS module types). All template slots verified via grep. XML `<role>` tags present in all 7 instruction files.

---
*Phase: 30-mastra-prompt-engineering*
*Completed: 2026-03-09*
