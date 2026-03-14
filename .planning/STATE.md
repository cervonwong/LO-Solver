---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Claude Code Provider
status: executing
stopped_at: Completed 34-01-PLAN.md
last_updated: "2026-03-12T12:39:12Z"
last_activity: 2026-03-12 — Completed 34-01 MCP Tool Bridge Infrastructure plan
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 2
  completed_plans: 1
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.
**Current focus:** Phase 34 — MCP Tool Bridge

## Current Position

Phase: 34 of 36 (MCP Tool Bridge)
Plan: 1 of 2 completed in current phase
Status: executing
Last activity: 2026-03-12 — Completed 34-01 MCP Tool Bridge Infrastructure plan

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

### Pending Todos

12 pending todos:
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
- Make vocab and rules table horizontally scrollable
- Add testing and production mode to Claude Code provider

### Blockers/Concerns

- MCP bridge for tool-using agents is MEDIUM confidence — spike with one tool before wrapping all 12
- OAuth race condition (#27933) — use `setup-token` instead of `claude login`
- ~~Structured output via Claude Code streaming returns empty responses~~ — resolved: streamWithRetry delegates to generateWithRetry for claude-code + structuredOutput (PROV-04 complete)

## Session Continuity

Last session: 2026-03-12T12:39:12Z
Stopped at: Completed 34-01-PLAN.md
Resume file: .planning/phases/34-mcp-tool-bridge/34-01-SUMMARY.md
