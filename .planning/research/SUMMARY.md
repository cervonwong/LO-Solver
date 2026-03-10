# Project Research Summary

**Project:** LO-Solver v1.6 — Claude Code Provider Integration
**Domain:** AI SDK provider toggle for existing Mastra agentic workflow
**Researched:** 2026-03-10
**Confidence:** MEDIUM (provider integration path is HIGH confidence; MCP tool bridging is the unverified high-risk element)

## Executive Summary

Adding Claude Code as an alternative provider to LO-Solver is a well-bounded infrastructure change: one new npm package (`ai-sdk-provider-claude-code`), one new provider configuration file, and a three-way mode selector replacing the existing binary toggle. The `claudeCode()` provider returns a `LanguageModelV3` instance that Mastra 1.8.0 accepts natively, and the 8 tool-free agents (extractors, dispatchers, answerer) can use it as a direct drop-in with no agent-level changes. This half of the integration has HIGH confidence and no significant technical risk.

The hard problem is the remaining 4 agents — hypothesizer, synthesizer, verifier orchestrator, and rules improver — which use 12 Mastra custom tools that the Claude Code provider explicitly does not support. Two viable approaches emerge from research: (1) bridge the tools as an in-process MCP server via `createSdkMcpServer()`, which preserves the existing tool-call architecture but requires wrapping all 12 tools and using async-generator prompts; or (2) a prompt-only approach where tool-using agents emit structured JSON that step code parses and applies, following the same pattern as the earlier v1.4 Claude Code native solver. The architecture research recommends Approach 2 (prompt-only) as simpler and proven for this domain; the features research leans toward Approach 1 (MCP bridge) for full fidelity. This decision is the critical architectural fork and must be made explicitly in Phase 1 before any significant implementation begins.

Beyond the tool problem, three production-readiness concerns need active mitigation: OAuth token refresh race conditions during concurrent calls (solved by switching to `claude setup-token` for headless auth), structured output silent fallback on complex Zod schemas (solved by auditing and simplifying the 5 schemas used with `generateObject`), and the streaming event mismatch that will render the existing real-time trace UI incorrect for Claude Code runs. The security surface is also materially different from OpenRouter — Claude Code's `bypassPermissions` mode grants filesystem access, requiring explicit `disallowedTools` to block built-in Bash/Write/Edit/Read from server-side execution.

## Key Findings

### Recommended Stack

A single new package (`ai-sdk-provider-claude-code@^3.4.4`) is the only addition required. It pulls `@anthropic-ai/claude-agent-sdk` as a transitive dependency and is fully compatible with the existing stack: AI SDK v6, Zod 4.3.6, and Mastra 1.8.0. The Claude Code CLI (v2.1.62) is already installed and authenticated on this system with a Max subscription. No version conflicts arise.

**Core technologies:**
- `ai-sdk-provider-claude-code`: AI SDK v6 community provider wrapping Claude Agent SDK — only viable path to use Claude subscription without a separate API key
- `@anthropic-ai/claude-agent-sdk` (transitive): Underlying SDK powering the provider — do NOT install separately; the provider pins a compatible range
- Claude Code CLI: Authentication and execution backend — already present and authenticated on this machine

**What NOT to use:**
- `@t3ta/claude-code-mastra`: Targets Mastra 0.10.x (pre-1.0), likely abandoned
- `@anthropic-ai/claude-code` (deprecated npm package): Replaced by `claude-agent-sdk` since Oct 2025
- `@ai-sdk/anthropic`: Requires a separate Anthropic API key; does not use the subscription

### Expected Features

**Must have (table stakes — required for usable v1.6.0):**
- Three-way provider toggle (Testing / Production / Claude Code) — replaces binary switch
- Agent factory provider abstraction — resolves to Claude Code or OpenRouter based on `provider-mode` request context key
- Per-agent model mapping — lookup table from OpenRouter model IDs to Claude Code shortcuts (Gemini Flash → sonnet, GPT-5-mini → sonnet or haiku)
- Claude Code authentication gate — block solve with clear instructions if `claude login` not completed
- Tool-free agents working — 8 agents work immediately with direct provider drop-in
- Tool strategy for 4 remaining agents — either MCP bridge or prompt-only (must be decided before implementation)
- Cost tracking adaptation — show "Subscription" label instead of $0.00 when Claude Code is active

**Should have (polish — add after initial validation):**
- Auth status indicator in nav bar (green/red dot when Claude Code is selected)
- Trace event streaming verification — ensure real-time trace UI works correctly for Claude Code runs
- Graceful throttle/rate-limit messaging — Pro tier may hit 5-hour rolling window quotas during repeated solves

**Defer (v2+):**
- Eval harness with `--provider claude-code` flag for cross-provider benchmarking
- Per-Claude-Code-agent prompt engineering (prompts optimized for GPT-5-mini/Gemini Flash may need adjustment for Opus/Sonnet)
- Claude Code model selection within provider (Opus vs. Sonnet vs. Haiku per-agent)

### Architecture Approach

The integration requires a new `claude-code-provider.ts` module alongside the existing `openrouter.ts`, a single new `provider-mode` key in `WorkflowRequestContext`, and a branch in the agent factory's `model` callback. The workflow schema replaces the binary `modelMode` field with a three-value `providerMode` enum (`'openrouter-testing' | 'openrouter-production' | 'claude-code'`), which propagates unchanged through the existing `inputData` → workflow state → `requestContext` → agent factory chain. The `apiKey` field becomes optional and OpenRouter-only; the API route skips the key check for Claude Code mode.

**Major components and changes:**
1. `claude-code-provider.ts` (new) — `ProviderMode` type, `getClaudeCodeModel()` factory, permission config with `disallowedTools` blocking Bash/Write/Edit/Read
2. `agent-factory.ts` (modified) — add Claude Code branch in `model` callback; suppress or adapt `tools` parameter for tool-using agents in Claude Code mode
3. `workflow-schemas.ts` + `request-context-types.ts` (modified) — `providerMode` replaces `modelMode` throughout
4. `use-provider-mode.ts` + `provider-mode-selector.tsx` (new) — three-state hook and UI component replacing binary switch
5. All step files (modified) — propagate `provider-mode` in place of `model-mode`

### Critical Pitfalls

1. **AI SDK custom tools are silently unsupported** — The provider marks "Tool Usage: No" across all models. Agents with Mastra tools will silently produce text-only responses instead of executing tool calls. Prevention: decide on MCP bridge vs. prompt-only approach before any tool-using agent test; implement the chosen strategy before testing the verify/improve loop.

2. **OAuth token refresh race condition** — Concurrent CLI processes race on a single-use refresh token, causing mid-workflow 404 auth failures requiring manual re-login. This is a confirmed, unfixed GitHub bug (#27933). Prevention: use `claude setup-token` (1-year headless token) for server-side use instead of `claude login` OAuth.

3. **Structured output silent fallback** — `.catchall()` in `structuredProblemDataSchema` and `format` constraints cause the provider to silently return prose instead of structured JSON with no error. Prevention: audit all 5 schemas used with `generateObject`; check `response.object !== null` explicitly; simplify or restructure the `.catchall()` usage.

4. **Permission mode filesystem access** — `bypassPermissions` (required for headless server use) grants full filesystem access including reading CLAUDE.md. Prevention: use `disallowedTools` to block `Bash`, `Write`, `Edit`, `Read`; set `loadFileSystemSettings: false` to prevent the agent treating itself as a coding assistant.

5. **MCP tools require async-generator prompts** — If the MCP bridge approach is chosen, string prompts are incompatible with MCP tool discovery; an async generator wrapper is required. Warning sign: MCP tools registered but agent never calls them despite correct server setup.

## Implications for Roadmap

Based on the dependency graph across all four research files, three phases are recommended.

### Phase 1: Provider Foundation and Architecture Decision

**Rationale:** The tool compatibility question (MCP bridge vs. prompt-only) is a blocking architectural fork. All subsequent implementation depends on which path is chosen. Provider types, auth configuration, and the agent factory branch must be in place before any agent can be tested through Claude Code. This is also where permission mode and auth strategy must be locked — getting either wrong causes hangs or security issues in every subsequent phase.

**Delivers:** Working Claude Code provider for tool-free agents; settled tool strategy for the 4 tool-using agents; confirmed auth approach (`setup-token` recommended); permission mode configured correctly.

**Addresses:** Agent factory provider abstraction, per-agent model mapping, three-way provider toggle (backend schema changes), auth gate.

**Avoids:** Tool incompatibility (Pitfall 1), permission mode misconfiguration (Pitfall 4), OAuth token race condition (Pitfall 2).

**Key decisions in this phase:**
- MCP bridge or prompt-only for the 4 tool-using agents (must be explicit, not deferred)
- `claude setup-token` vs. OAuth for server auth (recommendation: `setup-token`)
- `disallowedTools` list to block Bash/Write/Edit/Read built-in tools

**Research flag:** This phase has HIGH confidence for the tool-free path. If MCP bridge is chosen for tool-using agents, a spike/proof-of-concept with one tool (e.g., `getVocabulary`) should be the first task to validate async-generator prompt requirements before committing to wrapping all 12 tools.

### Phase 2: Schema Validation and Tool Integration

**Rationale:** After the provider loads and tool-free agents are confirmed working, the next risk is structured output schema compatibility and (if MCP bridge was chosen) tool execution correctness. These must be resolved before the full pipeline can execute end-to-end. Error handling in `generateWithRetry` must also be extended — Claude Code errors may not match the existing OpenRouter-specific error patterns.

**Delivers:** All 12 agents running through Claude Code with correct outputs; structured output schemas validated; cost tracking adapted for subscription mode; retry logic covers Claude Code error types.

**Addresses:** Structured output compatibility (Pitfall 3), cost tracking adaptation, tool bridge implementation (if MCP path), error classification in retry logic.

**Avoids:** Silent structured output fallback on `.catchall()` schemas, MCP async-generator prompt format requirement (Pitfall 8), cost display showing permanent $0.00.

**Key tasks:**
- Test each of the 5 structured-output schemas individually through the Claude Code provider; check `response.object` is populated (not just `response.text` containing JSON-like text)
- Pay special attention to `structuredProblemDataSchema` which uses `.catchall()` — highest risk for silent fallback
- Adapt `extractCostFromResult()` to be provider-aware; add "Subscription" cost display mode
- Add Claude Code error shapes to the `isRetryable` check in `generateWithRetry`

**Research flag:** Standard patterns for this phase. Validation is mechanical testing of each schema. No additional research needed beyond what PITFALLS.md documents.

### Phase 3: Frontend Integration and UX Polish

**Rationale:** Frontend changes (provider selector, cost display, trace UI adaptation) are decoupled from backend correctness and can only be meaningfully designed after Phase 2 produces a working pipeline with observable streaming behavior. The trace display adaptation in particular requires empirical observation of what the Claude Code provider's `textStream` actually emits before the correct UI treatment can be specified.

**Delivers:** Three-way provider selector in the UI; adapted trace display for Claude Code; subscription quota awareness; auth status indicator; API key dialog hidden for Claude Code mode.

**Addresses:** Three-way provider toggle (UI), auth status indicator, trace event streaming adaptation, rate-limit messaging.

**Avoids:** Streaming mismatch causing garbled trace output (Pitfall 6), quota exhaustion with no user feedback (Pitfall 7), $0.00 cost display confusion.

**Key tasks:**
- Replace `ModelModeToggle` binary switch with segmented control or dropdown
- Update `useModelMode` → `useProviderMode` hook and localStorage key
- Discovery task: run a full solve through Claude Code and observe the actual `textStream` content before designing the trace UI adaptation
- Adapt trace display based on empirical findings (simplified step-progress mode is the likely outcome)
- Show "Subscription" cost label; hide API key dialog when Claude Code is selected

**Research flag:** Standard frontend patterns for selector and hook work. The trace display adaptation has a discovery dependency on Phase 2 execution — plan for a task to observe and decide before implementing.

### Phase Ordering Rationale

- Phase 1 must come first because the tool strategy decision (MCP vs. prompt-only) dictates the implementation shape for Phase 2. Starting Phase 2 work before this decision risks building the wrong thing.
- Auth strategy (`setup-token` setup) belongs in Phase 1 even though it feels like infrastructure — without correct auth, nothing in Phase 2 can be tested reliably.
- Phase 2 (schema and tool validation) must precede Phase 3 (frontend) because the trace UI adaptation depends on knowing what the Claude Code provider actually emits — you cannot design the right UI treatment until you have observed real streaming behavior from a working pipeline.
- Frontend selector and hook rename (Phase 3) could partially parallel Phase 2 for purely cosmetic changes, but the trace display work requires a working pipeline to observe first.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1 (MCP bridge decision):** If MCP bridge approach is chosen, a spike task should validate `createSdkMcpServer` + async-generator prompt interaction before planning the full implementation. The architecture is sound per official docs but no existing example bridges Mastra tools specifically to the Claude Code provider. The spike should use one simple tool (`getVocabulary`) before committing to wrapping all 12.

Phases with standard patterns (skip research-phase):
- **Phase 2 (schema validation):** Well-documented constraint; validation is mechanical testing of each schema; warning signs and recovery steps are fully specified in PITFALLS.md.
- **Phase 3 (frontend):** Standard React state management and component replacement patterns; the one unknown (trace display) is resolved by a discovery task, not additional research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version compatibility verified via npm, type definitions, and dry-run install. Single new dependency. CLI already installed and authenticated. |
| Features | MEDIUM | Tool-free agent integration is HIGH confidence. MCP bridge viability is MEDIUM — architecture is sound but Mastra-specific implementation is unverified in practice. Prompt-only alternative is MEDIUM-HIGH (proven in v1.4 but requires structural change to 4 agents). |
| Architecture | MEDIUM | Provider integration pattern is HIGH confidence. Tool compatibility strategy is the unresolved fork — both approaches are architecturally viable, neither is fully proven. Streaming behavior divergence acknowledged; actual content of `textStream` requires empirical observation. |
| Pitfalls | HIGH | All 8 pitfalls sourced from official docs, confirmed GitHub issues, and codebase analysis. Warning signs and recovery steps are concrete. OAuth race condition is a documented, confirmed, unfixed upstream bug. |

**Overall confidence:** MEDIUM-HIGH. The integration path is clear and low-risk for the tool-free half. The tool-using agent strategy is the one area requiring an upfront architectural decision before work can proceed safely.

### Gaps to Address

- **Tool strategy decision:** Must be resolved before Phase 1 implementation begins. Research surfaces two viable approaches (MCP bridge and prompt-only) with a recommendation for prompt-only. The roadmapper should treat this as an explicit planning decision and call it out as the first task in Phase 1 rather than leaving it implicit.
- **Streaming behavior empirical baseline:** PITFALLS.md documents the streaming mismatch risk but cannot predict exactly what the Claude Code provider's `textStream` will contain without running it. Phase 3 planning should include a discovery task before the trace UI adaptation is specified.
- **Subscription tier requirement:** A single solve is estimated to consume 20-60% of a Pro tier 5-hour quota. The roadmap should include a task to document the minimum recommended subscription tier and surface it in the UI before users commit to Claude Code mode.
- **`generateWithRetry` error compatibility:** The current retry logic checks for OpenRouter-specific error names. Claude Code errors may have different shapes. This needs a task in Phase 2 to test with intentional failures and add Claude Code error patterns to the `isRetryable` check.

## Sources

### Primary (HIGH confidence)
- [ai-sdk-provider-claude-code GitHub](https://github.com/ben-vargas/ai-sdk-provider-claude-code) — provider capabilities, tool limitations, permission modes, structured output behavior, Zod 4 requirement
- [AI SDK Community Providers: Claude Code](https://ai-sdk.dev/providers/community-providers/claude-code) — official tool support matrix (Tool Usage: No, Tool Streaming: No across all models)
- [Claude Agent SDK Custom Tools docs](https://platform.claude.com/docs/en/agent-sdk/custom-tools) — MCP bridge pattern via `createSdkMcpServer` + `tool()`; streaming input requirement for MCP tools
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) — `query()`, model selection, permission options
- [Claude Agent SDK Structured Outputs docs](https://platform.claude.com/docs/en/agent-sdk/structured-outputs) — supported JSON Schema features for constrained decoding
- [Claude Agent SDK Cost Tracking docs](https://platform.claude.com/docs/en/agent-sdk/cost-tracking) — `total_cost_usd` result field, per-query cost reporting
- npm registry + dry-run install — confirmed version compatibility, no blocking conflicts
- Local `claude auth status` — confirmed CLI installed, authenticated, Max subscription
- `@mastra/core@1.8.0` type definitions — confirmed `MastraModelConfig` accepts `LanguageModelV3`

### Secondary (MEDIUM confidence)
- [GitHub Issue #27933](https://github.com/anthropics/claude-code/issues/27933) and [#24317](https://github.com/anthropics/claude-code/issues/24317) — OAuth token race condition, confirmed but not fixed upstream
- [GitHub Issue #29048](https://github.com/anthropics/claude-code/issues/29048), [#14279](https://github.com/anthropics/claude-code/issues/14279), [#20264](https://github.com/anthropics/claude-code/issues/20264) — permission mode behavior edge cases
- [t3ta/claude-code-mastra](https://github.com/t3ta/claude-code-mastra) — reference Mastra integration (pre-1.0, not directly reusable, but confirms pattern direction and surfaces security warnings)
- [Claude Code rate limits (Portkey)](https://portkey.ai/blog/claude-code-limits/) and [Northflank](https://northflank.com/blog/claude-rate-limits-claude-code-pricing-cost) — subscription tier quota estimates
- Codebase analysis: `request-context-helpers.ts`, `agent-factory.ts`, `vocabulary-tools.ts`, `workflow-schemas.ts` — integration surface area for provider switching

---
*Research completed: 2026-03-10*
*Ready for roadmap: yes*
