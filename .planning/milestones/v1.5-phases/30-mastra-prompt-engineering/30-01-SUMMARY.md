---
phase: 30-mastra-prompt-engineering
plan: 01
subsystem: ai-agents
tags: [gpt-5-mini, prompt-engineering, xml-structure, confidence-scale, extractors, testers]

# Dependency graph
requires:
  - phase: 28-agent-factory
    provides: agent factory pattern and instruction file conventions
provides:
  - 5 GPT-5-mini instruction files rewritten with XML section tags and schema-first ordering
  - 6-level confidence scale with Zod mapping in rules improvement extractor
  - Evidence-quoting directives in tester prompts
affects: [30-02, 30-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GPT-5-mini extractor pattern: role -> grounding -> output_schema -> extraction_rules -> constraints"
    - "GPT-5-mini tester pattern: role -> task -> tools -> output_format -> process -> constraints"
    - "6-level confidence scale mapped to 3-level Zod enum (well-supported/supported->HIGH, plausible/tentative->MEDIUM, speculative/unsupported->LOW)"

key-files:
  created: []
  modified:
    - src/mastra/workflow/01-structured-problem-extractor-instructions.ts
    - src/mastra/workflow/03a-rule-tester-instructions.ts
    - src/mastra/workflow/03a-sentence-tester-instructions.ts
    - src/mastra/workflow/03a2-verifier-feedback-extractor-instructions.ts
    - src/mastra/workflow/03b2-rules-improvement-extractor-instructions.ts

key-decisions:
  - "Kept suggestion likelihood as 3-level (HIGH/MEDIUM/LOW) in sentence tester since it measures fix likelihood, not evidence confidence"
  - "Markdown inside example blocks preserved (sample input the extractor would parse) while structural headers replaced with XML"

patterns-established:
  - "XML section tags for all GPT-5-mini prompts: <role>, <grounding>, <output_schema>, <extraction_rules>, <constraints>"
  - "Schema-first ordering: JSON output schema appears before processing instructions"
  - "Grounding principle in all extractors: extract ONLY what is explicitly stated"
  - "Re-scan completeness directive in all extractors"
  - "Evidence-quoting constraints in testers: cite item IDs, quote exact data"

requirements-completed: [PE-02, PE-05]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 30 Plan 01: GPT-5-mini Prompt Rewrites Summary

**5 GPT-5-mini agent prompts rewritten with XML section tags, schema-first ordering, grounding principles, and 6-level confidence scale**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T07:53:30Z
- **Completed:** 2026-03-09T07:56:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All 5 GPT-5-mini instruction files converted from markdown headers to XML section tags
- Extractor prompts restructured with schema-first ordering and grounding principle
- Tester prompts restructured with crisp tool descriptions and evidence-quoting directives
- Rules improvement extractor includes 6-level confidence scale mapped to HIGH/MEDIUM/LOW Zod enum
- All export names preserved, TypeScript compiles with no new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite 3 GPT-5-mini extractor prompts** - `db88a3a`
2. **Task 2: Rewrite 2 GPT-5-mini tester prompts** - `4a6b503`

## Files Created/Modified
- `src/mastra/workflow/01-structured-problem-extractor-instructions.ts` - Problem extractor with XML structure and grounding
- `src/mastra/workflow/03a-rule-tester-instructions.ts` - Rule tester with XML structure and evidence-quoting
- `src/mastra/workflow/03a-sentence-tester-instructions.ts` - Sentence tester with XML structure and evidence-quoting
- `src/mastra/workflow/03a2-verifier-feedback-extractor-instructions.ts` - Verifier feedback extractor with XML structure and grounding
- `src/mastra/workflow/03b2-rules-improvement-extractor-instructions.ts` - Rules improvement extractor with XML structure, grounding, and 6-level confidence scale

## Decisions Made
- Kept suggestion likelihood as 3-level (HIGH/MEDIUM/LOW) in sentence tester since it measures fix likelihood (a different concept from evidence confidence)
- Markdown headers inside example blocks preserved since they represent sample input the extractor would parse, not structural headers of the prompt itself

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 5 GPT-5-mini prompts ready for Plan 02 (Gemini 3 Flash prompts)
- XML tag patterns established as convention for remaining agents
- 6-level confidence scale pattern ready for adoption in Gemini 3 Flash reasoning agents

## Self-Check: PASSED

All 5 modified files confirmed present. Both task commits (db88a3a, 4a6b503) confirmed in git history.

---
*Phase: 30-mastra-prompt-engineering*
*Completed: 2026-03-09*
