---
phase: 21-pipeline-agents
plan: 01
subsystem: agents
tags: [claude-code, prompt-engineering, subagents, linguistics, markdown]

# Dependency graph
requires:
  - phase: 20-infrastructure-setup
    provides: Agent stub files with YAML frontmatter, workspace-format.md templates
provides:
  - Complete self-contained extractor agent prompt (problem parsing)
  - Complete self-contained hypothesizer agent prompt (rule/vocabulary discovery)
  - Extractor-to-hypothesizer format handoff (problem.md structure)
affects: [22-orchestrator, 23-verifier-improver-agents]

# Tech tracking
tech-stack:
  added: []
  patterns: [self-contained-agent-prompts, inline-format-templates, anti-pattern-sections]

key-files:
  created: []
  modified:
    - claude-code/.claude/agents/extractor.md
    - claude-code/.claude/agents/hypothesizer.md

key-decisions:
  - "Extractor handles multi-part problems by combining all questions into a single Questions table with direction labels"
  - "Hypothesizer includes optional baseline input for Round 2+ continuation rather than always starting fresh"
  - "Error correction questions use 'Error Correction' as direction label in Questions table"
  - "Additional vocabulary tables preserved in a separate section rather than merged into Dataset"

patterns-established:
  - "Agent prompt structure: Domain Context, Input, Task, Output Format, Do NOT, Error Handling"
  - "Anti-patterns section with 9+ specific Do NOT items derived from Mastra pipeline experience"
  - "Inline format templates embedded directly in prompts (no external document references)"
  - "Error handling writes both inline error section and errors.md entry"

requirements-completed: [EXTR-01, EXTR-02, HYPO-01, HYPO-02, HYPO-03]

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 21 Plan 01: Pipeline Agents Summary

**Self-contained extractor and hypothesizer agent prompts with inline format templates, 7-step analysis process, confidence guidelines, and anti-patterns from Mastra pipeline experience**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T11:17:33Z
- **Completed:** 2026-03-07T11:20:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Wrote complete extractor prompt replacing Phase 20 stub: domain context, input/output format, extraction rules for context/dataset/questions, 11 anti-patterns, error handling with errors.md logging
- Wrote complete hypothesizer prompt replacing Phase 20 stub: domain context, 7-step analysis process (segmentation through competing hypotheses), perspective-N.md output format, HIGH/MEDIUM/LOW confidence guidelines, 9 anti-patterns, optional baseline input for Round 2+
- Verified format handoff: extractor's output sections (Context, Dataset, Questions, Additional Vocabulary) match exactly what the hypothesizer's Input section describes

## Task Commits

Each task was committed atomically:

1. **Task 1: Write extractor agent system prompt** - `2394f7b` (feat)
2. **Task 2: Write hypothesizer agent system prompt** - `a5e3ca7` (feat)

## Files Created/Modified
- `claude-code/.claude/agents/extractor.md` - Complete self-contained system prompt for problem extraction (112 lines added)
- `claude-code/.claude/agents/hypothesizer.md` - Complete self-contained system prompt for hypothesis generation (162 lines added)

## Decisions Made
- Multi-part problems (Part 1, Part 2, Part 3 with different question types) combine into a single Questions table with direction-specific labels (e.g., "Error Correction", "Analysis", language-to-language directions)
- Additional vocabulary tables from problems preserved as a separate `## Additional Vocabulary` section rather than folded into Dataset
- Hypothesizer accepts optional baseline rules/vocabulary for Round 2+ (orchestrator decides whether to provide them), keeping the agent flexible for both fresh and continuation runs
- Error correction question type gets its own direction label rather than being forced into translate-to/translate-from categories

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness
- Both agent prompts are self-contained and ready for orchestrator integration (Phase 22)
- Format handoff verified: extractor output matches hypothesizer input expectations
- Remaining agents (verifier, improver, synthesizer, answerer) still have Phase 20 stubs, ready for Phase 23

## Self-Check: PASSED

All 2 modified files verified present on disk. Both task commits (2394f7b, a5e3ca7) verified in git log.

---
*Phase: 21-pipeline-agents*
*Completed: 2026-03-07*
