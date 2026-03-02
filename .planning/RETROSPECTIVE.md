# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Prove the Agentic Advantage

**Shipped:** 2026-03-02
**Phases:** 7 | **Plans:** 16 | **Commits:** 196

### What Was Built
- Automated evaluation harness (CLI + UI) with zero-shot comparison and intermediate scoring
- Multi-perspective hypothesis generation with dispatcher, parallel hypothesizers, and best-of-N selection
- Verification loop with round-by-round metadata and per-rule failure diagnostics
- Hierarchical event streaming system with id/parentId nesting and streamWithRetry
- Rules panel with live updates, activity chips, and three-panel resizable layout
- Nested trace display with custom tool renderers, bulk grouping, auto-scroll, and cross-linked results

### What Worked
- Eval-first approach: building the scoring harness before workflow changes gave measurable feedback at every step
- Two-agent chain pattern (reasoning → extraction) produced reliable structured output throughout
- Rules CRUD tools mirroring the vocabulary pattern reduced design decisions and implementation time
- DraftStore isolation for parallel hypothesizers eliminated race conditions cleanly
- GSD framework applied mid-project (after phases 1-2) structured the remaining 5 phases well
- Quick tasks interleaved between phases kept UI polish progressing without blocking major work

### What Was Inefficient
- Phase 4's workflow rewrite broke the EVAL-03 intermediate scorer — cross-phase regression caught by audit but could have been caught earlier with integration testing
- Phases 1-2 completed before GSD adoption lack formal SUMMARY.md/VERIFICATION.md artifacts
- The stale audit (run after phase 4) reported 8 unsatisfied requirements that were all resolved by phases 5-7 — auditing earlier in the milestone would have been less useful, but auditing just before completion would have been more accurate

### Patterns Established
- Two-agent chains (reasoning agent → extraction agent) for all structured output needs
- 5-tool CRUD pattern for both vocabulary and rules state management
- Hierarchical event pattern: generateEventId → agent-start → set parent-agent-id → streamWithRetry → agent-end → clear parent-agent-id
- Rolling activity chips (max 3 visible, 8s auto-expiry) for real-time state change indicators
- streamWithRetry with onTextChunk callback for real-time agent output forwarding

### Key Lessons
1. Build the evaluation harness first — it pays for itself by catching regressions and guiding improvements
2. Mirror existing patterns (vocabulary tools → rules tools, generateWithRetry → streamWithRetry) to reduce design surface area
3. DraftStore/RequestContext isolation per parallel branch prevents subtle state corruption
4. Cross-phase schema changes need explicit scorer/consumer updates — defensive returns (all zeros) mask real breakage
5. Three days from project init to shipped milestone is achievable with disciplined phase execution

### Cost Observations
- Model mix: primarily opus for planning/execution, sonnet for quick tasks, haiku for summaries
- 196 commits across 3 days of intensive development
- Notable: parallel phase execution not used (sequential was sufficient given tight dependencies)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 196 | 7 | GSD adopted mid-milestone; eval-first development |

### Cumulative Quality

| Milestone | Eval Problems | Requirements | LOC |
|-----------|--------------|--------------|-----|
| v1.0 | 4 Linguini | 22/22 satisfied | 13,581 TS |

### Top Lessons (Verified Across Milestones)

1. Eval harness before workflow changes — measurement enables confident iteration
2. Mirror existing patterns to reduce implementation surface area
