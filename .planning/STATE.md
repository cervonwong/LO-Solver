---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Security Fixes
status: active
stopped_at: null
last_updated: "2026-03-17T00:00:00Z"
last_activity: "2026-03-17 - Roadmap created for v1.7"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.
**Current focus:** v1.7 Security Fixes - Phase 39 (API Key Transport)

## Current Position

Phase: 39 of 41 (API Key Transport)
Plan: —
Status: Ready to plan
Last activity: 2026-03-17 — Roadmap created for v1.7

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**v1.0:** 16 plans, ~3 days
**v1.1:** 9 plans, ~74 min
**v1.2:** 7 plans, ~69 min
**v1.3:** 4 plans, ~55 min
**v1.4:** 9 plans, ~21 min
**v1.5:** 11 plans, ~3 days
**v1.6:** 14 plans, ~4 days

## Accumulated Context

### Decisions

(Cleared at milestone boundary -- see PROJECT.md Key Decisions for full history)

### Pending Todos

5 pending todos:
- Explore Mastra programmatic tool calling to improve results
- Explore solving LO problems as code using sandboxes
- Add visualisation for running Claude Code instances
- Fix tool rendering for testSentence and testRule in UI
- Polish VocabularyToolCard and RulesToolCard visual design

### Blockers/Concerns

- OAuth race condition (#27933) -- use `setup-token` instead of `claude login`
- Phase 39 research flag: Inspect `mastra_workflow_snapshot` table to confirm whether `inputData` is persisted alongside workflow state (determines key propagation approach)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix abort dialog background zoom glitch | 2026-03-10 | d1aacad | [1-fix-abort-dialog-background-zoom-glitch](./quick/1-fix-abort-dialog-background-zoom-glitch/) |
| 2 | Make vocabulary and rules panel tables horizontally scrollable | 2026-03-14 | 1c72018 | [2-make-vocabulary-and-rules-panel-tables-h](./quick/2-make-vocabulary-and-rules-panel-tables-h/) |
| 3 | Fix structured output schema validation (zod v4 to v3 downgrade) | 2026-03-14 | 3f47700 | [3-fix-structured-output-schema-validation-](./quick/3-fix-structured-output-schema-validation-/) |
| 4 | Fix SentenceTestToolCard field names for tool rendering | 2026-03-14 | b12667f | [4-fix-tool-rendering-for-testsentence-and-](./quick/4-fix-tool-rendering-for-testsentence-and-/) |
| 5 | Wire extractTokensFromResult into step files for token count display | 2026-03-14 | 9be661a | [5-fix-token-count-showing-0-in-claude-code](./quick/5-fix-token-count-showing-0-in-claude-code/) |
| 6 | Fix Mastra observability deprecation warning | 2026-03-14 | 49aa2ef | [6-fix-mastra-observability-warning](./quick/6-fix-mastra-observability-warning/) |
| 7 | Fix vocabulary and rules panel table horizontal scrolling | 2026-03-14 | 4360338 | [7-fix-vocabulary-and-rules-ui-panel-table-](./quick/7-fix-vocabulary-and-rules-ui-panel-table-/) |
| 8 | Change CC testing configuration to use haiku | 2026-03-14 | 00537d5 | [8-change-cc-testing-configuration-to-use-h](./quick/8-change-cc-testing-configuration-to-use-h/) |
| 9 | Add custom port parameter to npm run dev | 2026-03-15 | 6be7f4e | [9-add-custom-port-parameter-to-npm-run-dev](./quick/9-add-custom-port-parameter-to-npm-run-dev/) |
| 10 | Emit vocabulary and rules data in tool call events | 2026-03-15 | 4aa4a54 | [10-emit-vocabulary-and-rules-data-in-tool-c](./quick/10-emit-vocabulary-and-rules-data-in-tool-c/) |
| 12 | Add confidence badge to RulesToolCard entries | 2026-03-15 | d0544e4 | [12-add-confidence-badge-flushed-right-on-ea](./quick/12-add-confidence-badge-flushed-right-on-ea/) |
| 13 | Stack rounds and perspectives sliders vertically | 2026-03-15 | df0da0a | [13-stack-rounds-and-perspective-sliders-ver](./quick/13-stack-rounds-and-perspective-sliders-ver/) |

## Session Continuity

Last session: 2026-03-17
Stopped at: Roadmap created for v1.7 Security Fixes
Resume file: None
