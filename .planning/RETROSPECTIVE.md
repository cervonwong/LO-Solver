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

## Milestone: v1.1 — UI Polish

**Shipped:** 2026-03-03
**Phases:** 6 | **Plans:** 9 | **Quick Tasks:** 24

### What Was Built
- Fixed trace hierarchy with correct parentId injection and orphan detection
- Compact reasoning display with scoped CSS overrides for tables and codeblocks
- Structured data formatting — LabeledList component for tool I/O and agent structured output
- Agent duck mascots with color-tinted overlays, role detection, and animated states
- Workflow control buttons (abort/new problem) with config disable and amber aborted state
- 3-column animated layout with responsive collapse below 1024px
- 24 quick tasks: hover-hatch pattern, panel header styling, skeleton animations, nav redesign, OpenRouter credits, combined problem input, sticky headers

### What Worked
- Phase execution was extremely fast — most plans completed in 2 minutes due to clear, specific plans with exact file paths and code patterns
- Quick tasks (24 in total) handled UI polish incrementally without blocking phase work
- Register pattern for WorkflowControlContext cleanly bridged page-level state to layout-level nav
- CSS scoping (.reasoning-compact wrapper class) isolated streamdown overrides without side effects
- mask-image technique for duck tint preserved PNG transparency while applying role colors
- Conditional panel rendering (2 vs 3 panels) was simpler than fighting the resizable-panels library

### What Was Inefficient
- Stale milestone audit: ran before phases 10-11 were executed, reported 6 "orphaned" requirements that were actually just not yet implemented — audit timing should be after all phases complete
- DUCK-01/DUCK-02 requirements not checked off in REQUIREMENTS.md after Phase 11 completion — clerical miss caught during milestone completion
- Phase 11 plan listed as "TBD" in roadmap despite being executed — roadmap wasn't updated after plan creation
- Some roadmap table rows had formatting issues (missing milestone column values for phases 10, 11, 13)

### Patterns Established
- Register pattern: child useRegisterWorkflowControl pushes state to parent context without prop drilling
- Server/client layout split: layout.tsx stays server component, LayoutShell wraps nav and children with context providers
- LabeledList pattern: reusable depth-limited key-value renderer for any Record<string, unknown>
- Spread-conditional event fields: `...(value ? { field: value } : {})` for optional wire data
- Aborted state detection: `hasStarted && !isRunning && !isComplete && !isFailed`
- panel-heading CSS class for differentiated header surfaces vs content surfaces
- hover-hatch pattern for interactive element hover states

### Key Lessons
1. Phase plans with exact file paths and line-level specificity enable 2-minute executions
2. Quick tasks are the right vehicle for UI polish — keep phases focused on structural changes
3. Audit timing matters: run after all phases complete, not mid-milestone
4. Keep REQUIREMENTS.md checkboxes and roadmap plan statuses updated during phase execution, not just at milestone end
5. Conditional rendering is often simpler than dynamic resizing for layout state changes

### Cost Observations
- Model mix: opus for phase execution, sonnet for quick tasks, haiku for summaries
- Sessions: ~3-4 across 2 days
- Notable: 2-minute average plan execution time — plans were highly specific

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 196 | 7 | GSD adopted mid-milestone; eval-first development |
| v1.1 | ~60 | 6 | Quick tasks for polish; 2-min plan execution average |

### Cumulative Quality

| Milestone | Eval Problems | Requirements | LOC |
|-----------|--------------|--------------|-----|
| v1.0 | 4 Linguini | 22/22 satisfied | 13,581 TS |
| v1.1 | 4 Linguini | 19/19 satisfied | 14,281 TS |

### Top Lessons (Verified Across Milestones)

1. Eval harness before workflow changes — measurement enables confident iteration
2. Mirror existing patterns to reduce implementation surface area
3. Specific plans with exact file paths enable fast execution (verified in v1.1)
4. Quick tasks handle polish without blocking structural phase work (verified in v1.1)
