---
phase: 23-verify-improve-loop-and-answer
plan: 01
subsystem: agents
tags: [claude-code, prompt-engineering, verifier, improver, answerer, linguistics]

# Dependency graph
requires:
  - phase: 22-orchestrator-and-entry-point
    provides: Complete synthesizer agent prompt and /solve skill orchestrator with Step 5 placeholder
  - phase: 21-pipeline-agents
    provides: Established agent file structure pattern (hypothesizer.md, extractor.md)
  - phase: 20-infrastructure-setup
    provides: Agent stub files with placeholder prompts, workspace-format.md templates, PIPELINE.md reference
provides:
  - Complete verifier agent prompt for single-purpose rule/sentence testing (Sonnet model)
  - Complete improver agent prompt for rule revision with root cause analysis (Opus model)
  - Complete answerer agent prompt for question translation with full derivation (Opus model)
affects: [23-02-solve-skill-step5]

# Tech tracking
tech-stack:
  added: []
  patterns: [single-test-per-call-verifier, blind-translation-pattern, root-cause-analysis-improvement, complete-file-output-revision, never-skip-questions-answerer]

key-files:
  created: []
  modified:
    - claude-code/.claude/agents/verifier.md
    - claude-code/.claude/agents/improver.md
    - claude-code/.claude/agents/answerer.md

key-decisions:
  - "Verifier uses Sonnet model (not Opus) for cost control given high call volume per user decision"
  - "Verifier tests ONE rule or ONE sentence per call; orchestrating skill handles aggregation"
  - "Verifier sentence mode returns blind translation only; comparison to expected happens in /solve skill"
  - "Improver produces complete replacement files (not diffs) with Changes section documenting what was revised"
  - "Answerer always produces best-attempt translation with LOW confidence rather than skipping questions"

patterns-established:
  - "Single-test-per-call verifier: lightweight agent tests one item, skill orchestrates many calls"
  - "Blind translation pattern: verifier translates without seeing expected answer, comparison is external"
  - "Root cause analysis in improver: 6 reasoning principles before revising any rule"
  - "Never-skip mandate: answerer always produces answers, using LOW confidence for uncertain items"

requirements-completed: [VERI-01, IMPR-01, ANSR-01]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 23 Plan 01: Verifier, Improver, and Answerer Agent Prompts Summary

**Three complete agent prompts: single-purpose Sonnet verifier with rule/sentence test modes, Opus improver with 6-principle root cause analysis, and Opus answerer with full derivation and never-skip mandate**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T01:33:36Z
- **Completed:** 2026-03-08T01:37:07Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Wrote complete verifier agent prompt (122 lines) with Sonnet model, two test modes (Rule Test and Sentence Test/Blind Translation), explicit anti-patterns preventing aggregation and expected-answer comparison
- Wrote complete improver agent prompt (148 lines) with Opus model, 6 core reasoning principles (logical order, abductive reasoning, multiple hypotheses, adaptability, grounding, persistence), complete-file output with Changes section
- Wrote complete answerer agent prompt (153 lines) with Opus model, 5-step methodology per question, confidence levels with reasoning, interlinear gloss format, and never-skip-questions mandate

## Task Commits

Each task was committed atomically:

1. **Task 1: Write verifier agent system prompt** - `52ad586` (feat)
2. **Task 2: Write improver and answerer agent system prompts** - `550cb57` (feat)

## Files Created/Modified
- `claude-code/.claude/agents/verifier.md` - Complete single-purpose tester prompt replacing Phase 20 stub (122 lines)
- `claude-code/.claude/agents/improver.md` - Complete rule revision prompt replacing Phase 20 stub (148 lines)
- `claude-code/.claude/agents/answerer.md` - Complete question translation prompt replacing Phase 20 stub (153 lines)

## Decisions Made
- Verifier uses Sonnet model (overriding project-level CLAUDE.md "all agents use Opus" convention) per user decision in CONTEXT.md for cost control
- Verifier is a single-test-per-call agent (not monolithic); the /solve skill orchestrates multiple calls and handles aggregation
- Blind translation pattern: verifier returns translation only, never compares to expected answer; comparison logic belongs to the /solve skill
- Improver writes complete replacement files with a Changes section at the top summarizing root cause analysis, not just diffs
- Answerer always produces a best-attempt translation for every question, using LOW confidence with explanations rather than skipping

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness
- All three agent prompts are complete and ready for the /solve skill to dispatch
- Plan 23-02 can now implement Step 5 orchestration in SKILL.md, calling verifier (per-rule, per-sentence), improver, and answerer
- Verifier is designed for multi-call orchestration: the /solve skill iterates over rules and sentences, calling the verifier once per item
- Improver expects file paths as input (current solution, verification results, problem.md) matching the iteration file chain (improved-{N}.md, verification-{N}.md)

## Self-Check: PASSED

All 3 modified files verified present on disk. Both task commits (52ad586, 550cb57) verified in git log.

---
*Phase: 23-verify-improve-loop-and-answer*
*Completed: 2026-03-08*
