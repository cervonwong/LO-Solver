---
phase: 23-verify-improve-loop-and-answer
plan: 02
subsystem: agents
tags: [claude-code, solve-skill, verify-improve-loop, orchestration, answerer]

# Dependency graph
requires:
  - phase: 23-verify-improve-loop-and-answer
    provides: Verifier, improver, and answerer agent prompts (Plan 01)
  - phase: 22-orchestrator-and-entry-point
    provides: SKILL.md with Steps 1-4 and Step 5 placeholder
provides:
  - Complete Step 5 orchestration in SKILL.md with verify-improve loop and answer step
  - Multi-call verifier orchestration with per-rule and per-sentence blind translation
  - Iteration-based improvement with separate files per iteration
  - Answerer dispatch producing answers.md
affects: [24-end-to-end-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-call-verifier-orchestration, blind-translation-comparison-in-skill, iteration-file-chain, pass-rate-excludes-questions]

key-files:
  created: []
  modified:
    - claude-code/.claude/skills/solve/SKILL.md

key-decisions:
  - "Blind translation comparison (normalize, lowercase, trim punctuation, compare) happens in the /solve skill, not in the verifier agent"
  - "verification-{I}.md files are written by the /solve skill from aggregated per-call results, not by the verifier agent"
  - "Questions are tested for coverage logging but excluded from pass rate denominator"
  - "Step 5 gets 4 improvement iterations independent of Step 4's 3 hypothesis rounds"

patterns-established:
  - "Multi-call orchestration: /solve skill iterates over rules and sentences, calling verifier once per item, then aggregates"
  - "Blind translation comparison: normalize (trim, lowercase, strip punctuation), then exact string match"
  - "Iteration file chain: improved-{I}.md feeds into verification-{I}.md, CURRENT_SOLUTION and CURRENT_VERIFICATION track the latest"
  - "Convergence check per iteration: 100% pass rate exits early, max 4 iterations with failure summary"

requirements-completed: [VERI-02, VERI-03, IMPR-02, ANSR-02]

# Metrics
duration: 1min
completed: 2026-03-08
---

# Phase 23 Plan 02: Step 5 Verify-Improve Loop and Answer Orchestration Summary

**Complete Step 5 orchestration in SKILL.md: iteration 0 check from Step 4f, up to 4 improve-then-verify iterations with per-rule and per-sentence multi-call verification, blind translation comparison in the skill, and answerer dispatch**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-08T01:40:09Z
- **Completed:** 2026-03-08T01:41:40Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced Step 5 placeholder in SKILL.md with complete orchestration logic (163 lines added)
- Step 5a reads Step 4f's verification.md as iteration 0 with early exit at 100% pass rate
- Steps 5b-5c implement up to 4 improve-then-verify iterations with separate improved-{I}.md and verification-{I}.md files per iteration
- Step 5c orchestrates per-rule and per-sentence verifier calls, performs blind translation comparison in the skill (normalize, lowercase, strip punctuation), and writes aggregated verification files
- Step 5d dispatches answerer agent to produce answers.md from the best solution

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Step 5 orchestration logic in SKILL.md** - `d17c689` (feat)

## Files Created/Modified
- `claude-code/.claude/skills/solve/SKILL.md` - Complete Step 5 replacing placeholder: 5a convergence check, 5b-5c verify-improve loop, 5d answer dispatch

## Decisions Made
- Blind translation comparison logic (normalize, lowercase, strip punctuation, exact match) is performed by the /solve skill, not delegated to the verifier agent
- verification-{I}.md files are assembled by the /solve skill from aggregated individual verifier results, not written by the verifier agent
- Questions (from ## Questions in problem.md) are tested for coverage logging but excluded from the pass rate denominator since they have no expected answer
- Step 5's 4-iteration budget is independent of Step 4's 3-round hypothesis loop

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness
- The complete /solve skill pipeline (Steps 1-5) is now fully specified in SKILL.md
- All agent definitions (extractor, hypothesizer, verifier, improver, synthesizer, answerer) have complete prompts
- Phase 24 can perform end-to-end testing of the complete pipeline
- The pipeline produces: problem.md, perspective files, solution.md, verification files, improved files, and answers.md

## Self-Check: PASSED

All 1 modified file verified present on disk. Task commit (d17c689) verified in git log.

---
*Phase: 23-verify-improve-loop-and-answer*
*Completed: 2026-03-08*
