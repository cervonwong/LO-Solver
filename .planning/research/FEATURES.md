# Feature Research: Claude Code Provider Integration

**Domain:** AI SDK provider toggle for existing Mastra agentic workflow
**Researched:** 2026-03-10
**Confidence:** MEDIUM (critical tool bridging question has HIGH confidence answer but implementation complexity is unverified)

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must work for the Claude Code provider option to be usable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Three-way provider toggle | Users need to switch between OpenRouter Testing, OpenRouter Production, and Claude Code; replaces current binary toggle | MEDIUM | Current `ModelModeToggle` is a `Switch`; needs redesign as segmented control or dropdown. State stored in localStorage via `useModelMode`. Must propagate as `inputData.modelMode` through `prepareSendMessagesRequest`. |
| Claude Code authentication gate | Users must have `claude login` completed before selecting Claude Code option; provider requires CLI auth, not API keys | MEDIUM | Unlike OpenRouter (API key dialog), Claude Code uses browser OAuth via `claude login`. Need to detect auth status and show clear error if not authenticated. Cannot reuse existing API key dialog pattern. |
| Agents without tools work via Claude Code | 8 of 12 agents have no tools (extractors, dispatchers, testers, answerer); these should work immediately with `generateText`/`streamText` through the provider | LOW | `ai-sdk-provider-claude-code` supports `generateText()` and `streamText()`. These 8 agents just need model resolution to return a Claude Code model instead of an OpenRouter model. The agent factory's `model` callback already receives `requestContext` for dynamic resolution. |
| Structured output (JSON extraction) via Claude Code | 5 agents produce structured JSON (extractors use two-agent chain: reasoner then JSON extractor); Claude Code provider supports `generateObject()` | MEDIUM | The provider supports "native structured outputs with guaranteed schema compliance" via `generateObject()`/`streamObject()`. Mastra agents using `generateText` with output schemas should work. Some JSON Schema features (format constraints, complex regex) may silently degrade to prose -- keep schemas simple. |
| Agent factory provider abstraction | `createWorkflowAgent` must resolve to either OpenRouter or Claude Code provider based on request context, without changing individual agent definitions | MEDIUM | Current factory reads `requestContext.get('model-mode')` and `requestContext.get('openrouter-provider')`. Needs new `'provider-type'` key (or extend `ModelMode` to include `'claude-code'`). Factory returns `provider(modelId)` -- Claude Code equivalent is `claudeCode('opus')` or `claudeCode('sonnet')`. |
| Cost tracking adaptation | OpenRouter returns cost in `providerMetadata.openrouter.usage.cost`; Claude Code uses subscription (no per-call cost); cost tracking must not crash | LOW | `extractCostFromResult()` reads `providerMetadata?.openrouter?.usage?.cost`. When using Claude Code, this path returns `undefined`, and `callCost` stays `0`. No crash, but cost display should show "Subscription" or similar instead of $0.00. |
| Graceful error when Claude Code CLI not installed | User selects Claude Code but hasn't installed `@anthropic-ai/claude-code` CLI | LOW | Provider will throw on first `generateText` call. Catch and surface a clear error message directing user to install CLI and run `claude login`. |

### Differentiators (Competitive Advantage)

Features that enhance the integration beyond basic functionality.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tool-using agents work via MCP bridge | 4 agents use Mastra tools (vocabulary CRUD, rules CRUD, testRule, testSentence); bridging these as MCP tools would make the full pipeline work with Claude Code | HIGH | **This is the hardest feature.** The `ai-sdk-provider-claude-code` explicitly does NOT support AI SDK custom tools (Zod schemas passed to `generateText`). Tools must be exposed via `createSdkMcpServer()` from `@anthropic-ai/claude-agent-sdk`. Each Mastra tool needs to be wrapped as an MCP tool with the same Zod schema and an `execute` handler that calls the original tool's logic. The tricky part: Mastra tools access `requestContext` for vocabulary/rules state -- MCP tool handlers don't receive Mastra's `requestContext`. A closure-based adapter is needed. |
| Per-agent model mapping for Claude Code | Map OpenRouter model IDs to Claude Code equivalents (e.g., `google/gemini-3-flash-preview` maps to `sonnet`, `openai/gpt-5-mini` maps to `haiku`) | LOW | Simple lookup table. Claude Code offers `opus`, `sonnet`, `haiku`. Reasoning agents (Gemini Flash) map to `sonnet`. Extraction agents (GPT-5-mini) map to `haiku`. Orchestrator agents map to `sonnet`. |
| Trace event streaming from Claude Code calls | Preserve the real-time trace UI (agent start/end, tool calls, step progress) when running via Claude Code provider | MEDIUM | `streamWithRetry` and `emitTraceEvent` emit trace events around agent calls in step files. These wrappers work at the step level, not the provider level, so they should continue to work. However, tool call trace events emitted from within MCP-bridged tools need the step writer closure. |
| Auth status indicator in nav bar | Show whether Claude Code is authenticated (green dot) vs. not authenticated (red dot with setup instructions) | LOW | Run `claude --version` or attempt a lightweight `query()` to check auth. Display status near the provider toggle. Avoids confusing errors during solve. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-install Claude Code CLI | Users want zero-setup experience | Running `npm install -g` programmatically from a web app is a security concern and platform-specific; CLI installation is a one-time manual step | Show clear instructions with copy-paste commands when Claude Code is selected but not installed |
| Claude Code built-in tools (Bash, Read, Write, Edit) | Claude Code has powerful built-in tools for code manipulation | These tools operate on the filesystem and have nothing to do with linguistics problem solving; allowing them creates security risks and confusing behavior | Only expose the specific Mastra vocabulary/rules/tester tools via MCP bridge; disable all Claude Code built-in tools via `disallowedTools` |
| Simultaneous multi-provider solve | Compare OpenRouter vs Claude Code results side-by-side in real-time | Doubles API costs, doubles UI complexity, doubles streaming complexity; the eval harness already supports comparison | Use the eval harness to compare providers across problem sets; keep the live solver single-provider |
| Claude Code session persistence | Resume or review past Claude Code agent sessions | The Mastra workflow manages its own state via RequestContext and workflow state; Claude Code session management is orthogonal and adds complexity | Use existing Mastra logs and trace UI for session review |
| Dynamic provider switching mid-solve | Switch from OpenRouter to Claude Code during an active solve | Workflow state (vocabulary Map, rules Map, RequestContext) is provider-agnostic but the provider is resolved at step initialization; mid-solve switching creates inconsistency | Provider is locked at solve start; user must reset and re-solve to change providers |

## Feature Dependencies

```
[Three-way provider toggle]
    |
    +--requires--> [Agent factory provider abstraction]
    |                  |
    |                  +--requires--> [Per-agent model mapping for Claude Code]
    |                  |
    |                  +--enables---> [Agents without tools work via Claude Code]
    |                  |
    |                  +--enables---> [Structured output via Claude Code]
    |
    +--requires--> [Claude Code authentication gate]
    |                  |
    |                  +--enhances--> [Auth status indicator in nav bar]
    |
    +--enables---> [Cost tracking adaptation]

[Tool-using agents work via MCP bridge]
    |
    +--requires--> [Agent factory provider abstraction]
    +--requires--> [Closure-based RequestContext adapter for MCP tools]
    +--enhances--> [Trace event streaming from Claude Code calls]
```

### Dependency Notes

- **Three-way toggle requires agent factory abstraction:** The toggle value must propagate through `inputData` to workflow steps to `requestContext` to the agent factory's `model` callback. The factory must know how to create both OpenRouter and Claude Code model instances.
- **MCP bridge requires RequestContext adapter:** Mastra tools read/write vocabulary and rules state from `requestContext`. MCP tool handlers run in the Claude Agent SDK process context. The adapter must capture `requestContext` in a closure when creating the MCP server, then pass it to tool handlers. This is the critical path.
- **Tool-using agents (MCP bridge) enhances trace streaming:** Without the bridge, 4 agents cannot use tools, which means the verify/improve loop does not work. The trace UI relies on tool call events emitted during verification.
- **Auth gate enhances with status indicator:** The gate blocks solve attempts; the indicator provides proactive feedback before the user tries to solve.

## MVP Definition

### Launch With (v1.6.0)

Minimum viable Claude Code integration -- the full pipeline works.

- [ ] **Agent factory provider abstraction** -- extend `createWorkflowAgent` to resolve Claude Code models when `model-mode` is `'claude-code'`
- [ ] **Three-way provider toggle** -- replace `ModelModeToggle` switch with segmented control: Testing ($) / Production ($$$) / Claude Code
- [ ] **Per-agent model mapping** -- lookup table mapping OpenRouter model IDs to Claude Code model shortcuts
- [ ] **Claude Code authentication gate** -- detect auth status, block solve with clear message if not authenticated
- [ ] **Tool-free agents work** -- 8 agents (extractors, dispatchers, answerer) work via `generateText`/`streamText`
- [ ] **MCP tool bridge for Mastra tools** -- wrap vocabulary tools, rules tools, tester tools as MCP tools with RequestContext closure adapter
- [ ] **Cost tracking adaptation** -- handle missing cost metadata gracefully, show "Subscription" label

### Add After Validation (v1.6.x)

Features to add once the basic integration is working.

- [ ] **Auth status indicator** -- show green/red dot in nav bar when Claude Code is selected
- [ ] **Trace event streaming verification** -- ensure all trace events (agent start/end, tool calls, step progress, vocabulary/rules updates) work identically with Claude Code provider
- [ ] **Claude Code model selection within provider** -- allow choosing Opus vs Sonnet vs Haiku for Claude Code mode (currently auto-mapped)

### Future Consideration (v2+)

- [ ] **Eval harness with Claude Code** -- run `npm run eval` with `--provider claude-code` flag for cross-provider benchmarking
- [ ] **Prompt engineering per Claude Code model** -- the 19 agent prompts were optimized for GPT-5-mini and Gemini Flash; Claude Code agents (Opus/Sonnet) may benefit from different prompt styles

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Agent factory provider abstraction | HIGH | MEDIUM | P1 |
| Three-way provider toggle (frontend) | HIGH | MEDIUM | P1 |
| Per-agent model mapping | HIGH | LOW | P1 |
| Claude Code authentication gate | HIGH | MEDIUM | P1 |
| MCP tool bridge for Mastra tools | HIGH | HIGH | P1 |
| Cost tracking adaptation | MEDIUM | LOW | P1 |
| Graceful CLI-not-installed error | MEDIUM | LOW | P1 |
| Auth status indicator | LOW | LOW | P2 |
| Trace event streaming verification | MEDIUM | MEDIUM | P2 |
| Claude Code model selection | LOW | LOW | P3 |
| Eval harness Claude Code mode | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- pipeline must work end-to-end
- P2: Should have, add when possible -- polish and verification
- P3: Nice to have, future consideration

## Critical Implementation Details

### How `ai-sdk-provider-claude-code` Works

**Confidence: HIGH** (verified via official AI SDK docs, GitHub README, and Anthropic Agent SDK docs)

The provider wraps the Claude Agent SDK's `query()` function behind the Vercel AI SDK `LanguageModelV2` interface. When you call `generateText({ model: claudeCode('sonnet'), prompt: '...' })`, it spawns a Claude Code CLI process, sends the prompt via `query()`, and collects the response.

Key characteristics:
- **Authentication:** Uses `claude login` OAuth flow (browser-based). Credentials stored in OS keychain. No API key in code.
- **Model selection:** Shortcuts `opus`, `sonnet`, `haiku` or full identifiers like `claude-opus-4-5`.
- **Structured output:** Supported via `generateObject()`/`streamObject()` with Zod schemas converted to JSON Schema via `z.toJSONSchema()`. Uses the Agent SDK's `outputFormat: { type: 'json_schema', schema }` option.
- **Streaming:** Supported via `streamText()`/`streamObject()`.
- **Tools:** Does NOT support AI SDK custom tools (Zod schemas in `tools` parameter). Shows "Tool Usage: false" in capability table. Uses Claude's built-in tools (Bash, Read, Write, Edit) and MCP servers instead.

### How to Bridge Mastra Tools via MCP

**Confidence: MEDIUM** (architecture is sound based on official Claude Agent SDK custom tools docs, but no existing example of bridging Mastra tools specifically)

The Claude Agent SDK provides `tool()` and `createSdkMcpServer()` for defining in-process MCP tools. These accept Zod schemas for input validation and async handlers for execution.

**Bridge pattern:**

```typescript
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Capture requestContext in closure at step initialization
function createMastraToolBridge(requestContext: RequestContext) {
  return createSdkMcpServer({
    name: 'mastra-tools',
    version: '1.0.0',
    tools: [
      tool(
        'addVocabulary',
        'Add NEW vocabulary entries...',
        { entries: z.array(vocabularyEntrySchema) },
        async (args) => {
          // Call original Mastra tool logic with captured requestContext
          const result = await addVocabularyExecute(args, requestContext);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        }
      ),
      // ... wrap each Mastra tool similarly
    ],
  });
}
```

**Key challenge:** The MCP tool handler returns `{ content: [{ type: 'text', text: string }] }` not structured objects. The agent receives text and must parse it. This works because the agent prompts already expect structured tool results.

**Important constraint from Claude Agent SDK docs:** "Custom MCP tools require streaming input mode. You must use an async generator/iterable for the `prompt` parameter -- a simple string will not work with MCP servers." This means agent calls with MCP tools must use streaming input, which affects how the step files invoke agents.

**Zod version concern:** The `ai-sdk-provider-claude-code` v3.2.0+ requires Zod 4. The project already uses Zod 4.3.6 -- no conflict.

### Agent Tool Usage Breakdown

| Agent | Has Tools | Tools Used | MCP Bridge Needed |
|-------|-----------|------------|-------------------|
| Structured Problem Extractor | No | -- | No |
| Perspective Dispatcher | No | -- | No |
| Improver Dispatcher | No | -- | No |
| Initial Hypothesizer | **Yes** | vocabulary (5), rules (5), testRule, testSentence | **Yes** |
| Hypothesis Synthesizer | **Yes** | vocabulary (5), rules (5), testRule, testSentence | **Yes** |
| Verifier Orchestrator | **Yes** | testRule, testSentence | **Yes** |
| Verifier Feedback Extractor | No | -- | No |
| Rules Improver | **Yes** | vocabulary (5), testRule, testSentence | **Yes** |
| Rules Improvement Extractor | No | -- | No |
| Rule Tester (sub-agent) | No | -- | No |
| Sentence Tester (sub-agent) | No | -- | No |
| Question Answerer | No | -- | No |

4 of 12 agents need the MCP bridge. These are the core workflow agents (hypothesizer, synthesizer, verifier orchestrator, improver).

### Unique Tool Definitions to Bridge

Counting unique tools across the 4 tool-using agents:

| Tool | Used By | RequestContext Keys Read | Side Effects |
|------|---------|--------------------------|-------------|
| getVocabulary | hypothesizer, synthesizer, improver | `vocabulary-state` | None (read-only) |
| addVocabulary | hypothesizer, synthesizer, improver | `vocabulary-state`, `log-file`, `step-writer`, `parent-agent-id`, `step-id`, `workflow-start-time` | Mutates vocabulary Map, emits trace events |
| updateVocabulary | hypothesizer, synthesizer, improver | Same as addVocabulary | Mutates vocabulary Map, emits trace events |
| removeVocabulary | hypothesizer, synthesizer, improver | Same as addVocabulary | Mutates vocabulary Map, emits trace events |
| clearVocabulary | hypothesizer, synthesizer, improver | Same as addVocabulary | Mutates vocabulary Map, emits trace events |
| getRules | hypothesizer, synthesizer, improver | `rules-state` | None (read-only) |
| addRules | hypothesizer, synthesizer, improver | `rules-state`, `log-file`, `step-writer`, etc. | Mutates rules Map, emits trace events |
| updateRules | hypothesizer, synthesizer, improver | Same as addRules | Mutates rules Map, emits trace events |
| removeRules | hypothesizer, synthesizer, improver | Same as addRules | Mutates rules Map, emits trace events |
| clearRules | hypothesizer, synthesizer, improver | Same as addRules | Mutates rules Map, emits trace events |
| testRule | hypothesizer, synthesizer, verifier, improver | `structured-problem`, `vocabulary-state`, `current-rules`, `model-mode`, `log-file`, `step-writer`, `mastra` | Spawns sub-agent call, emits trace events |
| testSentence | hypothesizer, synthesizer, verifier, improver | Same as testRule | Spawns sub-agent call, emits trace events |

**12 unique tools** to bridge. The vocabulary and rules tools are relatively simple (Map operations with event emission). The tester tools are complex: they spawn sub-agent LLM calls using the Mastra instance from `requestContext`. This means the MCP bridge for tester tools must also have access to a Mastra instance and the ability to call `generateWithRetry()` on the tester agents.

### Authentication UX

**Confidence: HIGH** (verified via official Claude Code authentication docs)

1. **First-time setup:** User installs `@anthropic-ai/claude-code` globally, runs `claude login` in terminal. Browser opens for OAuth. One-time per machine.
2. **In-app detection:** Attempt a lightweight `query()` call or check for CLI presence. If not authenticated, show a dismissible banner: "Claude Code requires authentication. Run `claude login` in your terminal."
3. **No API key needed in app:** Unlike OpenRouter which stores an API key in localStorage, Claude Code auth is machine-level via OS keychain. The app just needs the CLI to be installed and authenticated.
4. **Per-request key not applicable:** The existing `useApiKey()` hook and API key dialog are OpenRouter-specific. When Claude Code is selected, the API key dialog should be hidden or disabled.

### Provider Toggle UX

**Confidence: HIGH** (straightforward frontend change)

Current state: Binary `Switch` component with "Testing ($)" and "Production ($$$)" labels.

New state: Three options. Recommended implementation: segmented control (radio group styled as tabs) or a `Select` dropdown.

Options:
1. **Testing ($)** -- OpenRouter with cheap models (GPT-OSS-120B)
2. **Production ($$$)** -- OpenRouter with per-agent production models
3. **Claude Code** -- Claude subscription, no per-call cost

The toggle value flows: `useModelMode()` hook -> `localStorage` -> `useSolverWorkflow()` -> `prepareSendMessagesRequest` -> `inputData.modelMode` -> workflow step -> `requestContext.set('model-mode', ...)` -> `createWorkflowAgent` model callback.

Extending `ModelMode` from `'testing' | 'production'` to `'testing' | 'production' | 'claude-code'` propagates through this entire chain.

### Provider Configuration via `createClaudeCode()`

**Confidence: HIGH** (verified via AI SDK community provider docs)

The provider supports these configuration options relevant to this integration:

| Option | Value for LO-Solver | Rationale |
|--------|---------------------|-----------|
| `allowedTools` | `['mcp__mastra-tools__*']` | Only allow the bridged Mastra tools |
| `disallowedTools` | `['Bash', 'Read', 'Write', 'Edit', 'WebSearch', 'WebFetch']` | Block all Claude Code built-in tools -- they're irrelevant and potentially dangerous |
| `permissionMode` | `'bypassPermissions'` | The MCP tools are all in-process; no filesystem operations to approve |
| `maxTurns` | `30` | Match reasonable limits for tool-using agents (hypothesizer uses many tool calls) |
| `cwd` | Not set | No filesystem operations needed |
| `systemPrompt` | Not set (use Mastra agent instructions) | Agent instructions are passed via Mastra, not via provider config |

## Sources

- [ai-sdk-provider-claude-code GitHub (ben-vargas)](https://github.com/ben-vargas/ai-sdk-provider-claude-code) -- community provider source, capability table, limitations
- [AI SDK Community Providers: Claude Code](https://ai-sdk.dev/providers/community-providers/claude-code) -- official AI SDK listing with capability matrix
- [Claude Agent SDK - Custom Tools](https://platform.claude.com/docs/en/agent-sdk/custom-tools) -- MCP tool bridge pattern with `tool()` and `createSdkMcpServer()`
- [Claude Agent SDK - TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- `query()` options, model selection, permissions, `AgentDefinition` type
- [Claude Agent SDK - Structured Outputs](https://platform.claude.com/docs/en/agent-sdk/structured-outputs) -- `outputFormat` option, Zod schema support, JSON Schema limitations
- [Claude Code - Authentication](https://code.claude.com/docs/en/authentication) -- `claude login`, credential storage, auth methods
- [t3ta/claude-code-mastra](https://github.com/t3ta/claude-code-mastra) -- reference integration of Claude Code SDK with Mastra framework (alternative approach using custom Agent class)
- [@anthropic-ai/claude-agent-sdk npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) -- SDK package, version 0.1.50+

---
*Feature research for: Claude Code provider integration (v1.6 milestone)*
*Researched: 2026-03-10*
