---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Claude Code Provider
status: executing
stopped_at: Completed 35-02-PLAN.md
last_updated: "2026-03-14T05:40:13.355Z"
last_activity: "2026-03-14 - Completed plan 35-02: Frontend provider toggle and auth badge"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 12
  completed_plans: 12
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.
**Current focus:** Phase 35 — Frontend Integration

## Current Position

Phase: 35 of 36 (Frontend Integration)
Plan: 3 of 3 completed in current phase
Status: executing
Last activity: 2026-03-14 - Completed plan 35-02: Frontend provider toggle and auth badge

## Performance Metrics

**v1.0:** 16 plans, ~3 days
**v1.1:** 9 plans, ~74 min
**v1.2:** 7 plans, ~69 min
**v1.3:** 4 plans, ~55 min
**v1.4:** 9 plans, ~21 min
**v1.5:** 11 plans, ~3 days

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [v1.5]: Agent factory (`createWorkflowAgent()`) — hook point for provider switching
- [v1.3]: Per-request provider factory via RequestContext — same pattern extends to Claude Code
- [Phase 33]: createClaudeCode uses defaultSettings wrapper matching SDK API
- [Phase 33]: ProviderMode type replaces ModelMode: 3 values (openrouter-testing, openrouter-production, claude-code)
- [Phase 33]: Duplicated ProviderMode type in client hook to avoid importing server module
- [Phase 33]: Testing-mode guards updated from 'testing' to 'openrouter-testing' to match new 3-value enum
- [Phase 33]: Backward-compat JSON migration maps old modelMode values to ProviderMode on read
- [Phase 33]: claudeCodeModel defaults to claude-sonnet-4-6 when not specified per-agent
- [Phase 33]: Auth gate uses generateText probe with maxOutputTokens 10 for lightweight pre-check
- [Phase 33]: Non-retryable errors (auth, billing, ENOENT) checked before retryable in retry functions
- [Phase 33]: Shorthand model IDs (sonnet/opus) for Claude Code, not full form (claude-sonnet-4-6)
- [Phase 33]: Claude Code streaming + structuredOutput returns empty responses -- gap for future investigation
- [Phase 33]: Claude Code structured output fallback: streamWithRetry delegates to generateWithRetry when claude-code + structuredOutput detected
- [Phase 34]: MCP tool annotations use Hint-suffixed names (readOnlyHint, destructiveHint, openWorldHint)
- [Phase 34]: testToolMode parameter controls which tester variant registers under testRule/testSentence names
- [Phase 34]: Per-execution Claude Code provider via 'claude-code-provider' RequestContext key with singleton fallback
- [Phase 34]: Shared attachMcpProvider helper extracted to 02-shared.ts to break circular import dependencies
- [Phase 34]: MCP provider cached on RequestContext after first creation to avoid transport reuse errors
- [Phase 34]: Tester sub-agents stripped of MCP servers in Claude Code mode (run as sub-agents, not standalone)
- [Phase 34]: Claude Code tool-activity detection routes through streamWithRetry for correct MCP attachment
- [Phase 35]: Split claude-code into claude-code-testing and claude-code-production for 4-way provider toggle
- [Phase 35]: Extraction agents: haiku (CC testing) / sonnet (CC production); Reasoning agents: sonnet (CC testing) / opus (CC production)
- [Phase 35]: Claude Code cost events emit per-call (subscription); OpenRouter at dollar-boundary (pay-per-use)
- [Phase 35]: CC badge placed in AgentCard (tool-call-cards.tsx) where agent events render, not trace-event-card.tsx
- [Phase 35]: Auth endpoint uses claude auth status --json via child_process with loggedIn field
- [Phase 35]: ccCostData channel in WorkflowControlContext bridges cost events to NavBar badge
- [Phase 35]: Toggle labels use OR Test/OR Prod/CC Test/CC Prod for clarity

### Pending Todos

11 pending todos:
- Investigate production model failures and improve prompts
- Explore Claude Agent SDK as alternate model provider (now active as v1.6)
- Add custom port parameter to npm run dev
- Explore Mastra programmatic tool calling to improve results
- Explore solving LO problems as code using sandboxes
- Optimise prompts with ChatGPT 5.4 and Claude prompting guide
- Add visualisation for running Claude Code instances
- Add parallelisation of Claude Code agent instances
- Fix tool rendering for testSentence and testRule in UI
- Investigate cost estimation for Claude via tokens
- Add testing and production mode to Claude Code provider

### Blockers/Concerns

- ~~MCP bridge for tool-using agents is MEDIUM confidence~~ — resolved: full E2E solve validated through Claude Code with all 14 MCP tools (Phase 34 complete)
- OAuth race condition (#27933) — use `setup-token` instead of `claude login`
- ~~Structured output via Claude Code streaming returns empty responses~~ — resolved: streamWithRetry delegates to generateWithRetry for claude-code + structuredOutput (PROV-04 complete)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix abort dialog background zoom glitch | 2026-03-10 | d1aacad | [1-fix-abort-dialog-background-zoom-glitch](./quick/1-fix-abort-dialog-background-zoom-glitch/) |
| 2 | Make vocabulary and rules panel tables horizontally scrollable | 2026-03-14 | 1c72018 | [2-make-vocabulary-and-rules-panel-tables-h](./quick/2-make-vocabulary-and-rules-panel-tables-h/) |
| Phase 35 P01 | 5min | 2 tasks | 21 files |
| Phase 35 P03 | 2min | 2 tasks | 2 files |
| Phase 35 P02 | 12min | 2 tasks | 8 files |

## Session Continuity

Last session: 2026-03-14T05:40:12.207Z
Stopped at: Completed 35-02-PLAN.md
Resume file: None
