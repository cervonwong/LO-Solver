# Phase 34: MCP Tool Bridge - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Bridge the 4 tool-using agents (hypothesizer, synthesizer, verifier orchestrator, rules improver) to work through Claude Code by wrapping their 14 Mastra tools as MCP tools. All 12 agents (8 tool-free from Phase 33 + 4 tool-using) must complete a full end-to-end solve through the Claude Code provider.

</domain>

<decisions>
## Implementation Decisions

### Trace event fidelity
- Full parity with OpenRouter mode: all 4 event types (data-vocabulary-update, data-rules-update, data-rule-test-result, data-tool-call) must stream to the frontend
- Full UI parity: duck mascots, step progress bar, vocabulary/rules panels all behave identically in Claude Code mode
- Best-effort fallback: if the MCP boundary creates technical gaps for some events, accept the gap rather than blocking the phase

### Sub-agent model routing
- Tester sub-agents (rule-tester, sentence-tester) respect the workflow's providerMode — when solving with Claude Code, they also use Claude Code
- Tester sub-agents use `sonnet` shorthand in Claude Code mode (high-volume, extraction-focused)
- In-process MCP server preferred over separate process — tools need shared memory access to RequestContext, Maps, and Mastra instance
- MCP tool names match existing Mastra tool IDs exactly (e.g., `getVocabulary`, `testRule`) — agent prompts already reference these names

### Validation approach
- Spike-first: plan 34-01 bridges vocabulary tools only and validates the MCP pattern with one agent before extending to all 14 tools
- Final validation: manual E2E solve via the UI with Claude Code provider selected (eval harness support deferred to Phase 36)
- If MCP bridging fails for a tool category (e.g., tester sub-agent spawning), research alternative approaches rather than shipping partial

### Tool surface scope
- All 14 tool variants exposed via one MCP server: 5 vocabulary, 5 rules, 4 testers (testRule, testRuleWithRuleset, testSentence, testSentenceWithRuleset)
- MCP tool descriptions optimized for Claude's tool-use best practices (not copy-pasted from Mastra descriptions)
- MCP bridge code lives in new `src/mastra/mcp/` directory, separate from `src/mastra/workflow/` internals

### Claude's Discretion
- Exact MCP server implementation pattern (stdio transport, server lifecycle management)
- How to inject RequestContext into MCP tool handlers (closure capture vs parameter passing)
- Whether the spike plan needs a lightweight test harness or just manual agent invocation
- Optimized tool descriptions wording for Anthropic's tool-use format

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vocabulary-tools.ts` (5 tools): All use `createTool()` with Zod input/output schemas and `ToolExecuteContext` for RequestContext access
- `rules-tools.ts` (5 tools): Same pattern as vocabulary tools, keyed by rule title
- `03a-rule-tester-tool.ts` (2 variants): `testRuleTool` (committed rules) + `testRuleWithRulesetTool` (draft rules) — both spawn sub-agents via `mastra.getAgentById('rule-tester')`
- `03a-sentence-tester-tool.ts` (2 variants): Same pattern — spawn `sentence-tester` sub-agent with blind translation approach
- `claude-code-provider.ts`: Singleton provider with `disallowedTools` blocking all built-in tools, `permissionMode: 'bypassPermissions'`
- `agent-factory.ts`: `createWorkflowAgent()` already routes to `claudeCode(model)` when providerMode is `'claude-code'`

### Established Patterns
- Tools access state via `ToolExecuteContext` — cast from `context` parameter: `const ctx = context as unknown as ToolExecuteContext`
- RequestContext keys defined in `request-context-types.ts` — vocabulary-state, rules-state, structured-problem, current-rules, draft-stores, etc.
- Trace events emitted via `emitToolTraceEvent(requestContext, event)` using step-writer from RequestContext
- Tester tools call `generateWithRetry(agent, { prompt, options: { requestContext, structuredOutput } })` — sub-agents inherit RequestContext

### Integration Points
- Agent `tools` config in each of the 4 agent files: tools must be swapped from Mastra tools to MCP-bridged tools when providerMode is `'claude-code'`
- `agent-factory.ts`: May need conditional tool injection based on providerMode
- `request-context-helpers.ts`: State accessors (getVocabularyState, getRulesState, etc.) used by tool handlers
- Workflow steps that create RequestContext and invoke agents: MCP server must be set up per-workflow-execution with the right RequestContext

</code_context>

<specifics>
## Specific Ideas

- The MCP bridge must be in-process to share memory with the Mastra workflow — tools read/write JavaScript Maps in RequestContext, and tester tools call `mastra.getAgentById()` which requires the Mastra instance
- Plan 34-01 should be a spike: bridge just the 5 vocabulary tools, wire them to the hypothesizer agent, and run a single agent call to validate the pattern works end-to-end before investing in all 14 tools
- The "WithRuleset" tester variants exist for hypothesizer/synthesizer/improver to test draft rules; the non-"WithRuleset" variants are for verifier-orchestrator testing committed rules

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-mcp-tool-bridge*
*Context gathered: 2026-03-12*
