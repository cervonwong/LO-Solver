# Phase 34: MCP Tool Bridge - Research

**Researched:** 2026-03-12
**Domain:** MCP (Model Context Protocol) in-process tool bridge for Claude Code provider
**Confidence:** HIGH

## Summary

Phase 34 bridges the 4 tool-using agents (initial-hypothesizer, hypothesis-synthesizer, verifier-orchestrator, rules-improver) to work through Claude Code by wrapping their 14 Mastra tools as in-process MCP tools. The key discovery is that the `ai-sdk-provider-claude-code` package (v3.4.4) already exports `createCustomMcpServer` -- a convenience helper that wraps tool definitions into an in-process MCP server using `@anthropic-ai/claude-agent-sdk`'s `createSdkMcpServer`. This eliminates the need for stdio/SSE transport or external MCP server processes.

The fundamental architectural challenge is that Claude Code executes tools itself (via MCP or built-in tools) -- it does NOT participate in the AI SDK's tool call/response loop. When an AI SDK tool definition is registered on a Mastra Agent, the tool is normally executed locally by the AI SDK framework, with results fed back to the model. With Claude Code, `providerExecuted: true` and `dynamic: true` flags indicate tools are provider-managed. This means Mastra Agent `tools` config is effectively ignored by Claude Code, and all tools must be provided via MCP servers attached to the Claude Code provider settings.

**Primary recommendation:** Use `createCustomMcpServer` from `ai-sdk-provider-claude-code` to create a single in-process MCP server, parameterized by RequestContext per workflow execution. Create a factory function that builds the MCP server with closure-captured RequestContext, then inject it via `mcpServers` on the `createClaudeCode` provider (or per-model settings). The existing Mastra tool `execute` functions can be reused inside MCP handlers, avoiding code duplication.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full trace event parity with OpenRouter mode: all 4 event types (data-vocabulary-update, data-rules-update, data-rule-test-result, data-tool-call) must stream to the frontend
- Full UI parity: duck mascots, step progress bar, vocabulary/rules panels all behave identically in Claude Code mode
- Best-effort fallback: if the MCP boundary creates technical gaps for some events, accept the gap rather than blocking the phase
- Tester sub-agents (rule-tester, sentence-tester) respect the workflow's providerMode -- when solving with Claude Code, they also use Claude Code
- Tester sub-agents use `sonnet` shorthand in Claude Code mode (high-volume, extraction-focused)
- In-process MCP server preferred over separate process -- tools need shared memory access to RequestContext, Maps, and Mastra instance
- MCP tool names match existing Mastra tool IDs exactly (e.g., `getVocabulary`, `testRule`) -- agent prompts already reference these names
- Spike-first: plan 34-01 bridges vocabulary tools only and validates the MCP pattern with one agent before extending to all 14 tools
- Final validation: manual E2E solve via the UI with Claude Code provider selected (eval harness support deferred to Phase 36)
- If MCP bridging fails for a tool category (e.g., tester sub-agent spawning), research alternative approaches rather than shipping partial
- All 14 tool variants exposed via one MCP server: 5 vocabulary, 5 rules, 4 testers (testRule, testRuleWithRuleset, testSentence, testSentenceWithRuleset)
- MCP tool descriptions optimized for Claude's tool-use best practices (not copy-pasted from Mastra descriptions)
- MCP bridge code lives in new `src/mastra/mcp/` directory, separate from `src/mastra/workflow/` internals

### Claude's Discretion
- Exact MCP server implementation pattern (stdio transport, server lifecycle management)
- How to inject RequestContext into MCP tool handlers (closure capture vs parameter passing)
- Whether the spike plan needs a lightweight test harness or just manual agent invocation
- Optimized tool descriptions wording for Anthropic's tool-use format

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOOL-01 | MCP server wraps Mastra vocabulary tools (5 tools) for Claude Code provider | `createCustomMcpServer` API verified, Zod schemas from `vocabulary-tools.ts` directly usable |
| TOOL-02 | MCP server wraps Mastra rules tools (3 tools) for Claude Code provider | Same pattern as TOOL-01; note CONTEXT.md says 5 rules tools (getRules, addRules, updateRules, removeRules, clearRules) |
| TOOL-03 | MCP server wraps tester tools (testRule, testSentence) for Claude Code provider | Tester tools spawn sub-agents via `mastra.getAgentById()` -- Mastra instance must be closure-captured alongside RequestContext |
| TOOL-04 | MCP tool handlers capture RequestContext via closure for state access | Factory function pattern creates MCP server per workflow execution with closure-captured RequestContext |
| TOOL-05 | All 4 tool-using agents produce correct output through Claude Code with MCP tools | Requires conditional tool injection in agent-factory + MCP server on provider settings |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai-sdk-provider-claude-code` | 3.4.4 | Claude Code AI SDK provider | Already installed; exports `createCustomMcpServer` helper |
| `@anthropic-ai/claude-agent-sdk` | 0.2.72 | Underlying Claude Agent SDK | Dependency of provider; provides `createSdkMcpServer`, `tool`, `CallToolResult` types |
| `@modelcontextprotocol/sdk` | 1.27.1 | MCP TypeScript SDK | Dependency of agent SDK; provides `McpServer`, `CallToolResult` schema |
| `zod` | (installed) | Schema definitions | Tool input schemas already defined in Zod; `createCustomMcpServer` accepts `ZodObject` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@mastra/core` | (installed) | Agent framework, RequestContext, createTool | Existing workflow infrastructure; agents, tools, request context |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `createCustomMcpServer` (high-level) | `createSdkMcpServer` + `tool()` (low-level) | More control but more boilerplate; `createCustomMcpServer` wraps both |
| In-process MCP (`type: 'sdk'`) | Stdio MCP server (`type: 'stdio'`) | Stdio requires separate process, cannot share JS memory (Maps, Mastra instance) |
| Single MCP server for all tools | Per-agent MCP servers | Single server is simpler; all tools share same RequestContext |

**Installation:**
No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/mastra/mcp/
  mcp-tool-bridge.ts          # Factory: createMcpToolServer(requestContext, mastra) -> McpSdkServerConfigWithInstance
  mcp-tool-descriptions.ts    # Optimized tool descriptions for Claude's tool-use format
```

### Pattern 1: MCP Tool Server Factory (Closure-Captured Context)

**What:** A factory function that creates an in-process MCP server with RequestContext and Mastra instance captured via closure. Each workflow execution creates a fresh MCP server with its own RequestContext.

**When to use:** Every time a tool-using agent is invoked in Claude Code mode.

**Why closures:** RequestContext is a per-execution mutable object containing Maps (vocabulary, rules). The MCP tool handlers need to read/write these Maps. Closures are the natural way to give MCP handlers access to this state without serialization.

**Example:**
```typescript
// Source: ai-sdk-provider-claude-code v3.4.4 API (verified from dist/index.d.ts)
import { createCustomMcpServer, type MinimalCallToolResult } from 'ai-sdk-provider-claude-code';
import type { McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk';
import type { Mastra } from '@mastra/core/mastra';
import type { RequestContext } from '@mastra/core/request-context';
import { z } from 'zod';

export function createMcpToolServer(
  requestContext: RequestContext,
  mastra: Mastra,
): McpSdkServerConfigWithInstance {
  return createCustomMcpServer({
    name: 'lo-solver-tools',
    version: '1.0.0',
    tools: {
      getVocabulary: {
        description: 'Read all vocabulary entries from the shared vocabulary store.',
        inputSchema: z.object({}),
        handler: async (args): Promise<MinimalCallToolResult> => {
          // Access vocabulary state via closure-captured requestContext
          const vocabularyState = requestContext.get('vocabulary-state');
          const entries = Array.from(vocabularyState.values());
          return {
            content: [{ type: 'text', text: JSON.stringify({ entries, count: entries.length }) }],
          };
        },
      },
      // ... other tools
    },
  });
}
```

### Pattern 2: Conditional Provider Construction

**What:** When providerMode is `'claude-code'`, construct the Claude Code provider with the MCP server attached. The provider must be created per-workflow-execution since the MCP server is bound to a specific RequestContext.

**When to use:** In the workflow steps that invoke tool-using agents.

**Example:**
```typescript
// In agent-factory.ts or a new provider-factory helper
import { createClaudeCode } from 'ai-sdk-provider-claude-code';
import { CLAUDE_CODE_DISALLOWED_TOOLS } from '../claude-code-provider';

export function createClaudeCodeWithMcp(mcpServer: McpSdkServerConfigWithInstance) {
  return createClaudeCode({
    defaultSettings: {
      disallowedTools: [...CLAUDE_CODE_DISALLOWED_TOOLS],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      mcpServers: {
        'lo-solver-tools': mcpServer,
      },
    },
  });
}
```

### Pattern 3: Tool Handler Reuse (Delegate to Existing Logic)

**What:** MCP tool handlers delegate to the same core logic as existing Mastra tools, avoiding code duplication. The existing `execute` functions in `vocabulary-tools.ts`, `rules-tools.ts`, etc. contain logging, trace event emission, and state management logic that should be reused.

**When to use:** For all 14 MCP tool handlers.

**Key consideration:** Existing Mastra tool `execute` functions receive a `context` parameter typed as `ToolExecuteContext` (which has `requestContext`, `mastra`, and `writer`). The MCP handler receives `(args, extra)` from `createCustomMcpServer`. The bridge must construct the `ToolExecuteContext` shape and pass it to the existing execute function.

**Example:**
```typescript
// Bridge pattern: construct ToolExecuteContext from closure-captured state
handler: async (args): Promise<MinimalCallToolResult> => {
  const ctx = {
    requestContext: {
      get: (key: string) => requestContext.get(key),
    },
    mastra,
  } as unknown as ToolExecuteContext;

  // Call existing tool's execute function
  const result = await addVocabulary.execute({ entries: args.entries }, ctx);

  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
  };
},
```

### Pattern 4: Per-Agent Model Override via MCP Server

**What:** Since the Claude Code provider is now created per-execution (to bind the MCP server), the `model` callback in `createWorkflowAgent` needs to return a model from this per-execution provider instead of the singleton.

**When to use:** Tool-using agents in Claude Code mode.

**Key architectural decision:** The current `agent-factory.ts` uses the singleton `claudeCode` provider. For tool-using agents, a per-execution provider with MCP is needed. Two approaches:

1. **Store provider in RequestContext:** Add a `claude-code-provider` key to RequestContext. The `model` callback reads it.
2. **Swap tools at call site:** In the workflow step, when in Claude Code mode, create a new Agent instance with MCP-specific settings instead of using the registered agent.

Approach 1 is cleaner because it preserves the existing `mastra.getAgentById()` pattern.

### Anti-Patterns to Avoid
- **Replicating tool logic in MCP handlers:** Never copy-paste the business logic from Mastra tools into MCP handlers. Always delegate to the existing execute functions. This ensures trace events, logging, and state management stay in one place.
- **Using stdio MCP transport:** Would require a separate process, breaking shared memory access to RequestContext Maps.
- **Creating one MCP server at app startup:** The MCP server must be per-execution because each workflow run has its own RequestContext with independent vocabulary/rules Maps.
- **Passing RequestContext via MCP tool arguments:** RequestContext contains non-serializable objects (Maps, references). It must be closure-captured, not passed as arguments.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP server creation | Custom MCP server with `@modelcontextprotocol/sdk` directly | `createCustomMcpServer` from `ai-sdk-provider-claude-code` | Handles Zod-to-JSON-Schema conversion, tool registration, transport setup |
| Tool result formatting | Custom result serialization | `MinimalCallToolResult` type with `{ content: [{ type: 'text', text: JSON.stringify(result) }] }` | MCP protocol requires specific result format |
| Zod schema conversion for MCP | Manual JSON Schema generation | `createCustomMcpServer` accepts `ZodObject` directly (uses `.shape` internally) | The helper extracts `.shape` and passes to SDK `tool()` function |

**Key insight:** The `createCustomMcpServer` helper (verified in source) does exactly: `tool(name, def.description, def.inputSchema.shape, handler, annotations)` for each tool definition. It handles Zod schema extraction automatically.

## Common Pitfalls

### Pitfall 1: MCP Tool Input Schemas Must Be ZodObject
**What goes wrong:** `createCustomMcpServer` expects `inputSchema` to be a `ZodObject<ZodRawShape>` and accesses `.shape`. If you pass a non-object Zod schema (e.g., `z.string()`), it will fail.
**Why it happens:** The SDK `tool()` function expects `ZodRawShape` (the shape of a ZodObject), not a full Zod schema.
**How to avoid:** All tool input schemas must be `z.object({...})`. For tools with no parameters (like `getVocabulary`, `clearVocabulary`), use `z.object({})`.
**Warning signs:** Runtime error about `.shape` being undefined.

### Pitfall 2: Tester Tools Spawn Sub-Agents That Also Need Claude Code Provider
**What goes wrong:** `testRuleTool` and `testSentenceTool` call `mastra.getAgentById('rule-tester')` and `mastra.getAgentById('sentence-tester')` to spawn sub-agents. These sub-agents use `generateWithRetry` which calls `agent.generate()`. If the sub-agents' `model` callback returns the singleton `claudeCode` provider (without MCP), they work fine because they are tool-free. But the provider must still respect `provider-mode` from RequestContext.
**Why it happens:** Tester sub-agents (rule-tester, sentence-tester) do NOT use tools -- they just receive a prompt and return structured output. The MCP concern does not apply to them. However, they DO need the correct provider mode from RequestContext.
**How to avoid:** Verify that tester sub-agents already work correctly via the existing `createWorkflowAgent` pattern. They should use `claudeCodeModel: 'sonnet'` (which they already do by default).
**Warning signs:** Tester agent errors about authentication or missing provider.

### Pitfall 3: MCP Server Lifecycle -- Created Per Execution, Not Per Agent Call
**What goes wrong:** Creating a new MCP server for each agent call within a single workflow execution leads to disconnected state (each server has its own closure over a different RequestContext snapshot).
**Why it happens:** Confusion between "per workflow execution" and "per agent invocation".
**How to avoid:** Create the MCP server ONCE when the workflow execution starts (in the hypothesize step), passing the main RequestContext. The same MCP server instance is used for all agent calls within that execution. For perspective-specific calls (hypothesizer per perspective), the MCP server should bind to the perspective's RequestContext.
**Warning signs:** Vocabulary added by one agent not visible to the next agent in the same workflow.

### Pitfall 4: Draft Stores and Perspective-Specific RequestContexts
**What goes wrong:** The hypothesizer creates per-perspective draft stores with isolated RequestContexts. If the MCP server is bound to the main RequestContext, hypothesizer tools will read/write main state instead of draft state.
**Why it happens:** Each perspective gets its own `perspectiveRequestContext` with isolated vocabulary and rules Maps.
**How to avoid:** Create a new MCP server (and thus a new Claude Code provider) for each perspective's RequestContext. The MCP server factory is lightweight (just closure binding).
**Warning signs:** Cross-perspective vocabulary contamination during parallel hypothesis generation.

### Pitfall 5: Trace Event Emission from MCP Handlers
**What goes wrong:** Existing Mastra tool `execute` functions emit trace events via `emitToolTraceEvent(ctx.requestContext, event)`. When called from an MCP handler, the step-writer in RequestContext must still be set correctly for events to reach the frontend.
**Why it happens:** The step-writer is set on RequestContext by the workflow step before invoking agents. As long as the MCP handler's closure captures the correct RequestContext (which has step-writer set), trace events will flow.
**How to avoid:** Ensure the MCP tool handler constructs the `ToolExecuteContext` with the closure-captured `requestContext` that already has `step-writer` set.
**Warning signs:** UI does not show vocabulary/rules updates or test results during Claude Code mode.

### Pitfall 6: Claude Code Session Management Across Multiple Agent Calls
**What goes wrong:** The Claude Code provider manages sessions via `sessionId`. If the same provider instance is reused across multiple agent calls, it may try to resume a previous session, causing confusion.
**Why it happens:** `createClaudeCode` creates a provider factory. Each call to `provider('opus')` creates a new `ClaudeCodeLanguageModel` with its own session state. But if `continue: true` or `resume` is set in settings, sessions may persist.
**How to avoid:** Do NOT set `continue` or `resume` in the MCP-aware provider settings. Let each agent call start a fresh Claude Code session. The default behavior (no session resumption) is correct.
**Warning signs:** Agent receiving context from a previous agent's conversation.

### Pitfall 7: Tool Result Size Limits
**What goes wrong:** Claude Code has a `maxToolResultSize` setting (default 10000 characters). Large vocabulary or rules dumps may be truncated.
**Why it happens:** `getVocabulary` or `getRules` returning dozens of entries can produce JSON larger than 10000 characters.
**How to avoid:** Monitor result sizes. If needed, increase `maxToolResultSize` in provider settings. The interior Claude Code process retains full data; truncation only affects the client stream.
**Warning signs:** Agent appears to only see partial tool results.

## Code Examples

### Creating the MCP Tool Server (Full Pattern)

```typescript
// Source: verified from ai-sdk-provider-claude-code v3.4.4 dist/index.js
// createCustomMcpServer signature:
//   function createCustomMcpServer<Tools>(config: {
//     name: string;
//     version?: string;
//     tools: Record<string, {
//       description: string;
//       inputSchema: ZodObject<ZodRawShape>;
//       handler: (args: Record<string, unknown>, extra: unknown) => Promise<MinimalCallToolResult>;
//       annotations?: ToolAnnotations;
//     }>;
//   }): McpSdkServerConfigWithInstance

import { createCustomMcpServer, type MinimalCallToolResult } from 'ai-sdk-provider-claude-code';

// Handler helper: wraps any JSON result into MCP format
function jsonResult(data: unknown): MinimalCallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

// Error result helper
function errorResult(message: string): MinimalCallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}
```

### Injecting MCP Server into Claude Code Provider

```typescript
// Source: verified from ai-sdk-provider-claude-code v3.4.4 dist/index.d.ts
// ClaudeCodeSettings.mcpServers: Record<string, McpServerConfig>
// McpServerConfig union includes McpSdkServerConfigWithInstance (type: 'sdk')

const mcpServer = createMcpToolServer(requestContext, mastra);

const claudeCodeWithTools = createClaudeCode({
  defaultSettings: {
    disallowedTools: [...CLAUDE_CODE_DISALLOWED_TOOLS],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    mcpServers: {
      'lo-solver-tools': mcpServer,
    },
  },
});

// Use: claudeCodeWithTools('opus') for tool-using agents
```

### Storing Per-Execution Provider in RequestContext

```typescript
// Extend WorkflowRequestContext:
'claude-code-provider'?: ClaudeCodeProvider;

// In model callback (agent-factory.ts):
model: ({ requestContext }) => {
  const providerMode = requestContext?.get('provider-mode');
  if (providerMode === 'claude-code') {
    // Use per-execution provider with MCP tools if available
    const mcpProvider = requestContext?.get('claude-code-provider');
    if (mcpProvider) {
      return mcpProvider(claudeCodeModel);
    }
    // Fall back to singleton (for tool-free agents)
    return claudeCode(claudeCodeModel);
  }
  // OpenRouter path
  const modelId = providerMode === 'openrouter-production' ? productionModel : testingModel;
  return getOpenRouterProvider(requestContext)(modelId);
},
```

### Tool Annotations for Optimized Claude Tool Use

```typescript
// MCP tool annotations hint to Claude about tool behavior
// Source: @anthropic-ai/claude-agent-sdk SdkMcpToolDefinition.annotations
annotations: {
  readOnly: true,      // For get* tools -- tells Claude this tool has no side effects
  destructive: false,  // For add/update tools
  openWorld: false,    // Tools operate on closed internal state
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI SDK tool definitions work with all providers | Claude Code provider ignores AI SDK tools; uses MCP or built-in tools only | Provider architecture (inherent) | Must bridge all tools via MCP |
| `createSdkMcpServer` + `tool()` (low-level) | `createCustomMcpServer` (high-level helper) | ai-sdk-provider-claude-code v3.x | Simpler API, automatic Zod schema handling |
| Singleton provider `claudeCode('sonnet')` | Per-execution provider with MCP server | This phase | Enables tool-using agents with shared state |

**Deprecated/outdated:**
- `customSystemPrompt` setting is deprecated in favor of `systemPrompt` (ai-sdk-provider-claude-code v3.x)
- `maxThinkingTokens` setting is deprecated in favor of `thinking` config (Claude Agent SDK)

## Open Questions

1. **Perspective-specific MCP servers and parallel execution**
   - What we know: Each perspective gets its own RequestContext. The hypothesizer runs perspectives in parallel via `Promise.all`.
   - What's unclear: Whether creating multiple MCP servers (one per perspective) and multiple Claude Code providers in parallel causes issues with the underlying `claude` CLI process spawning.
   - Recommendation: The spike (34-01) should test parallel MCP server creation. Each `createCustomMcpServer` call creates an independent in-process server, and each `createClaudeCode` call creates an independent provider. There should be no shared state conflicts, but verify empirically.

2. **MCP tool result size for large datasets**
   - What we know: Default `maxToolResultSize` is 10000 characters. `getVocabulary` and `getRules` can return large JSON payloads.
   - What's unclear: Whether typical vocabulary (30-50 entries) or rules (10-20) exceed this limit after JSON serialization.
   - Recommendation: Set `maxToolResultSize: 50000` on the provider to be safe. Monitor actual sizes during spike.

3. **Agent tool config interaction with MCP tools**
   - What we know: The existing agents have Mastra tools configured (e.g., `tools: { ...vocabularyTools, ...rulesTools }`). In Claude Code mode, these tools are ignored by the provider.
   - What's unclear: Whether having Mastra tools configured on the agent causes any interference or errors in Claude Code mode (e.g., the AI SDK trying to validate tool results against Mastra tool schemas).
   - Recommendation: If interference occurs, conditionally exclude Mastra tools from agent config when in Claude Code mode. The `createWorkflowAgent` factory could accept `tools` conditionally based on provider mode.

## Sources

### Primary (HIGH confidence)
- `ai-sdk-provider-claude-code` v3.4.4 `dist/index.d.ts` -- `createCustomMcpServer`, `createClaudeCode`, `ClaudeCodeSettings.mcpServers`, `MinimalCallToolResult` type signatures
- `ai-sdk-provider-claude-code` v3.4.4 `dist/index.js` -- `createCustomMcpServer` implementation (line 2547-2558), `doGenerate`/`doStream` implementation confirming `providerExecuted: true` for tool calls
- `@anthropic-ai/claude-agent-sdk` v0.2.72 `sdk.d.ts` -- `createSdkMcpServer`, `SdkMcpToolDefinition`, `McpSdkServerConfigWithInstance`, `McpServerConfig`, `tool()` function signatures
- Existing codebase: `vocabulary-tools.ts`, `rules-tools.ts`, `03a-rule-tester-tool.ts`, `03a-sentence-tester-tool.ts`, `agent-factory.ts`, `claude-code-provider.ts`, `request-context-types.ts`, `request-context-helpers.ts`

### Secondary (MEDIUM confidence)
- `@modelcontextprotocol/sdk` v1.27.1 -- `CallToolResult` schema (verified via types)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified in node_modules with exact versions and API signatures
- Architecture: HIGH -- `createCustomMcpServer` implementation confirmed in source; in-process MCP pattern verified; tool call flow confirmed via `providerExecuted: true` in provider source
- Pitfalls: MEDIUM-HIGH -- most pitfalls derived from verified architecture, but parallel MCP server behavior and tool result size limits need empirical validation during spike

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable -- packages are installed and pinned)
