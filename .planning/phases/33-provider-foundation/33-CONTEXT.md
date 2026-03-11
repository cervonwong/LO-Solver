# Phase 33: Provider Foundation - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Claude Code as an alternative model provider for the 8 tool-free agents (5 extractors, 2 dispatchers, 1 answerer), with authentication gating, security sandboxing, and error handling. The 4 tool-using agents (hypothesizer, synthesizer, verifier orchestrator, rules improver) are Phase 34.

</domain>

<decisions>
## Implementation Decisions

### Provider mode schema
- Replace `modelMode: z.enum(['testing', 'production'])` with `providerMode: z.enum(['openrouter-testing', 'openrouter-production', 'claude-code'])`
- Default value: `'openrouter-testing'` (matches current behavior)
- Rename RequestContext key from `'model-mode'` to `'provider-mode'`
- Rename localStorage key from `'lo-solver-model-mode'` to `'lo-solver-provider-mode'`
- Single field controls both provider selection and model tier — no separate provider/mode fields

### Model mapping
- Add `claudeCodeModel` field to `WorkflowAgentConfig` in agent factory
- Reasoning agents (dispatchers, answerer): `claude-opus-4-6`
- Extraction agents (all 5 extractors): `claude-sonnet-4-6`
- Default fallback when `claudeCodeModel` not specified: `claude-sonnet-4-6`
- Model resolution per providerMode:
  - `'openrouter-testing'` → `testingModel` (unchanged)
  - `'openrouter-production'` → `productionModel` (unchanged)
  - `'claude-code'` → `claudeCodeModel`
- No testing/production split for Claude Code — it's subscription-based, no cost difference

### Auth gating
- SDK-level auth check in the `/api/solve` route handler, before workflow starts
- If providerMode is `'claude-code'`: verify auth via the `ai-sdk-provider-claude-code` SDK
- If auth fails: return HTTP 401/403 error, frontend shows persistent error toast
- Error message: "Claude Code is not authenticated. Run `claude login` in your terminal, then try again."
- Fallback: if auth check isn't available in SDK, catch the first-call auth error and surface it cleanly

### Security sandbox
- Create dedicated provider module: `src/mastra/claude-code-provider.ts` (mirrors `openrouter.ts` pattern)
- Comprehensive `disallowedTools` blocking ALL built-in Claude Code tools:
  - Filesystem: `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `NotebookEdit`
  - Web: `WebSearch`, `WebFetch`
  - Agent management: `Task`, `TodoRead`, `TodoWrite`, `EnterPlanMode`, `ExitPlanMode`
- Only MCP-provided tools allowed (added in Phase 34)
- disallowedTools configured centrally in the provider module, not per-agent

### Claude's Discretion
- Error handling in `generateWithRetry`/`streamWithRetry` for Claude Code error shapes (AUTH-03)
- Exact structure of the provider module (singleton vs factory pattern)
- How to thread the Claude Code provider through RequestContext alongside the OpenRouter provider

</decisions>

<specifics>
## Specific Ideas

- Provider module should mirror the pattern of `src/mastra/openrouter.ts` — a dedicated file that exports the configured provider
- The agent factory's `model` callback is the natural hook point: it already reads RequestContext to determine the model, just needs a third branch for `'claude-code'`
- Integration target is `ai-sdk-provider-claude-code` community package (wraps Claude Agent SDK `query()` as Vercel AI SDK provider)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createWorkflowAgent()` (`agent-factory.ts`): Already has dynamic model resolution via `model` callback — extend with `claudeCodeModel` config field and `'claude-code'` branch
- `getOpenRouterProvider()` (`request-context-helpers.ts`): Pattern for reading provider from RequestContext — extend or add parallel `getClaudeCodeProvider()`
- `openrouter.ts`: Provider module pattern to mirror for Claude Code

### Established Patterns
- Per-request provider creation from state (`createOpenRouterProvider(apiKey)`) — Claude Code provider may be singleton (no per-request key)
- RequestContext keys in `request-context-types.ts` are the source of truth — add `'provider-mode'` and optionally `'claude-code-provider'`
- Agent factory config is per-agent (`WorkflowAgentConfig`) — each of the 12 agent files will need `claudeCodeModel` added

### Integration Points
- `workflowStateSchema` in `workflow-schemas.ts`: `modelMode` field → rename to `providerMode` with new enum
- `/api/solve` route: Add auth check before workflow execution when providerMode is `'claude-code'`
- `request-context-types.ts`: `WorkflowRequestContext` interface — rename `'model-mode'` to `'provider-mode'`, add Claude Code provider key
- Frontend `useModelMode` hook: Rename to `useProviderMode`, update localStorage key
- `prepareSendMessagesRequest` in `page.tsx`: Send `providerMode` instead of `modelMode`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 33-provider-foundation*
*Context gathered: 2026-03-11*
