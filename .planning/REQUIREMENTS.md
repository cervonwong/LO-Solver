# Requirements: LO-Solver v1.6 Claude Code Provider

**Defined:** 2026-03-10
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1.6 Requirements

Requirements for Claude Code provider integration. Each maps to roadmap phases.

### Provider Integration

- [x] **PROV-01**: User can select between OpenRouter Testing, OpenRouter Production, and Claude Code as provider mode
- [x] **PROV-02**: Agent factory resolves to Claude Code or OpenRouter model based on provider mode
- [x] **PROV-03**: Per-agent model mapping translates OpenRouter model IDs to Claude Code model shortcuts
- [x] **PROV-04**: All 8 tool-free agents produce correct output through Claude Code provider
- [x] **PROV-05**: Workflow schema uses three-value `providerMode` enum replacing binary `modelMode`
- [x] **PROV-06**: Cost tracking shows "Subscription" label for Claude Code mode instead of $0.00

### Tool Compatibility

- [x] **TOOL-01**: MCP server wraps Mastra vocabulary tools (5 tools) for Claude Code provider
- [x] **TOOL-02**: MCP server wraps Mastra rules tools (3 tools) for Claude Code provider
- [x] **TOOL-03**: MCP server wraps tester tools (testRule, testSentence) for Claude Code provider
- [x] **TOOL-04**: MCP tool handlers capture RequestContext via closure for state access
- [x] **TOOL-05**: All 4 tool-using agents produce correct output through Claude Code with MCP tools

### Authentication & Security

- [x] **AUTH-01**: Auth gate detects Claude Code CLI presence and auth status before solve
- [x] **AUTH-02**: `disallowedTools` blocks Claude Code built-in filesystem tools (Bash, Read, Write, Edit)
- [x] **AUTH-03**: `generateWithRetry` handles Claude Code error shapes alongside OpenRouter errors

### Frontend UX

- [x] **UI-01**: Three-way provider selector replaces binary model mode toggle
- [ ] **UI-02**: API key dialog hidden when Claude Code mode is selected
- [ ] **UI-03**: Auth status indicator shows Claude Code authentication state

### Evaluation

- [ ] **EVAL-01**: Eval harness accepts `--provider claude-code` flag for Claude Code provider runs
- [ ] **EVAL-02**: Eval results record which provider was used for cross-provider comparison

## Future Requirements

### Provider Expansion

- **PROV-F01**: Per-agent model selection within Claude Code provider (Opus vs Sonnet vs Haiku)
- **PROV-F02**: Per-Claude-Code-agent prompt engineering (optimize prompts for Claude models)
- **PROV-F03**: Subscription quota tracking and usage warnings

### Observability

- **OBS-F01**: Trace event streaming adaptation for Claude Code provider streaming differences
- **OBS-F02**: Subscription tier recommendation based on problem complexity

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct Anthropic API key support (`@ai-sdk/anthropic`) | Different auth model; `ai-sdk-provider-claude-code` uses subscription instead |
| `@t3ta/claude-code-mastra` integration | Targets Mastra 0.10.x (pre-1.0), likely abandoned |
| OAuth-based `claude login` for server auth | Token refresh race condition (GitHub #27933); use `setup-token` instead |
| Prompt-only tool alternative | MCP bridge chosen for full tool fidelity |
| Claude Code model fine-tuning per agent | Defer to future milestone after baseline validation |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROV-01 | Phase 33 | Complete |
| PROV-02 | Phase 33 | Complete |
| PROV-03 | Phase 33 | Complete |
| PROV-04 | Phase 33 | Complete |
| PROV-05 | Phase 33 | Complete |
| PROV-06 | Phase 35 | Complete |
| TOOL-01 | Phase 34 | Complete |
| TOOL-02 | Phase 34 | Complete |
| TOOL-03 | Phase 34 | Complete |
| TOOL-04 | Phase 34 | Complete |
| TOOL-05 | Phase 34 | Complete |
| AUTH-01 | Phase 33 | Complete |
| AUTH-02 | Phase 33 | Complete |
| AUTH-03 | Phase 33 | Complete |
| UI-01 | Phase 35 | Complete |
| UI-02 | Phase 35 | Pending |
| UI-03 | Phase 35 | Pending |
| EVAL-01 | Phase 36 | Pending |
| EVAL-02 | Phase 36 | Pending |

**Coverage:**
- v1.6 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after roadmap creation*
