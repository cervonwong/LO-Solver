# Stack Research: Claude Code Provider Integration

**Domain:** AI SDK provider integration (Claude Code as alternative model provider)
**Researched:** 2026-03-10
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ai-sdk-provider-claude-code` | ^3.4.4 | AI SDK v6 community provider wrapping Claude Agent SDK | Only viable path to use Claude Code as a Vercel AI SDK provider. Actively maintained (last published 2026-03-10), compatible with AI SDK v6 and Zod 4. Returns `LanguageModelV3` which Mastra 1.8.0 accepts via `MastraModelConfig`. |
| `@anthropic-ai/claude-agent-sdk` | ^0.2.63 (transitive) | Underlying SDK powering the provider | Installed automatically as dependency of `ai-sdk-provider-claude-code`. Do NOT install separately -- the provider pins a compatible range (`^0.2.63`; latest is 0.2.72). |
| Claude Code CLI | >= 2.1.x | Authentication and execution backend | The provider spawns the Claude Code CLI under the hood via the Agent SDK. Already installed on this system (v2.1.62). Requires `claude auth login` for credential setup (already authenticated with Max subscription). |

### Supporting Libraries

No additional supporting libraries are needed. The provider's dependencies (`@ai-sdk/provider@^3.0.0`, `@ai-sdk/provider-utils@^4.0.1`) are already satisfied by the existing AI SDK v6 installation.

| Library | Installed Version | Required Version | Status |
|---------|-------------------|------------------|--------|
| `ai` (Vercel AI SDK) | 6.0.101 | ^6.0.0 | Compatible |
| `@ai-sdk/provider` | 3.0.8 | ^3.0.0 | Compatible |
| `@ai-sdk/provider-utils` | 4.0.15 | ^4.0.1 | Compatible |
| `zod` | 4.3.6 | ^4.0.0 | Compatible |
| `@mastra/core` | 1.8.0 | N/A (consumer) | Compatible -- accepts `LanguageModelV3` via `MastraModelConfig` |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Claude Code CLI | Auth backend for provider | Already installed (v2.1.62). Auth via `claude auth login` using browser OAuth. Credentials stored in `~/.claude/`. |
| No new dev tools needed | -- | The provider works with existing TypeScript/Next.js toolchain. |

## Installation

```bash
# Single new dependency
npm install ai-sdk-provider-claude-code

# That's it. No other packages needed.
# The transitive dependency @anthropic-ai/claude-agent-sdk is pulled automatically.
```

**Pre-requisite (already met on this system):**
```bash
# Install Claude Code CLI (one-time)
curl -fsSL https://claude.ai/install.sh | bash

# Authenticate (one-time, stores credentials in ~/.claude/)
claude auth login
# Opens browser for OAuth. Requires Claude Pro or Max subscription.
```

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `ai-sdk-provider-claude-code@3.4.4` | `ai@^6.0.0` | Uses AI SDK v6 provider interfaces (`@ai-sdk/provider@^3.0.0`) |
| `ai-sdk-provider-claude-code@3.4.4` | `zod@^4.0.0` | Peer dependency. Our Zod 4.3.6 satisfies this. |
| `ai-sdk-provider-claude-code@3.4.4` | `@mastra/core@1.8.0` | Provider returns `LanguageModelV3`; Mastra accepts it via `MastraModelConfig` which includes `LanguageModelV3` in its union type. |
| `@anthropic-ai/claude-agent-sdk@^0.2.63` | `zod@^4.0.0` | Peer dependency. Same Zod 4 requirement. |
| `@anthropic-ai/claude-agent-sdk@^0.2.63` | `node@>=18.0.0` | We run Node 22.21.1 -- well above minimum. |

**Known warning (pre-existing, not caused by new package):** `npm install` will show `ERESOLVE` warnings about `@ai-sdk/ui-utils-v5` inside `@mastra/core` wanting `zod@^3.23.8`. This is a pre-existing Mastra internal compatibility issue with Zod 4 and does not affect functionality. The `--legacy-peer-deps` flag is not needed; npm resolves it automatically.

## Critical Integration Constraint: Tool Incompatibility

**This is the most important finding of this research.**

The `ai-sdk-provider-claude-code` provider **does NOT support AI SDK custom tools** (Zod schemas passed to `generateText`/`streamText`). This is documented explicitly on the [AI SDK community providers page](https://ai-sdk.dev/providers/community-providers/claude-code):

> "This provider does not support AI SDK custom tools (Zod schemas passed to generateText/streamText)."

Instead, it supports:
1. **Claude's built-in tools** (Bash, Read, Write, Edit, Task)
2. **MCP servers** via `createSdkMcpServer()` from `@anthropic-ai/claude-agent-sdk`

### Impact on LO-Solver

Of the 13 Mastra workflow agents:

| Agent Category | Count | Has Custom Tools | Claude Code Impact |
|----------------|-------|------------------|--------------------|
| Tool-free agents (extractor, dispatcher, tester, answerer) | 8 | No | Direct drop-in -- provider works as-is |
| Tool-using agents (hypothesizer, synthesizer, verifier-orchestrator, rules-improver) | 5 | Yes (vocabulary CRUD, rules CRUD, test tools) | Require MCP bridge or alternative approach |

**The 5 tool-using agents use Mastra `createTool()` tools that interact with in-process `RequestContext` state** (vocabulary Map, rules array, DraftStore). These tools cannot be naively converted to MCP tools because:

1. MCP tools run in an isolated server context, not in the Mastra workflow's process space
2. The tools need read/write access to shared mutable state in `RequestContext`
3. The `createSdkMcpServer` pattern from the Claude Agent SDK would need to bridge back into the Mastra workflow's RequestContext

### Recommended Approach: Two-Tier Provider Strategy

**Tier 1 (straightforward):** Use Claude Code provider for the 8 tool-free agents. These agents only do text generation/extraction and work identically regardless of provider.

**Tier 2 (requires bridging):** For the 5 tool-using agents, create an in-process MCP server via `createSdkMcpServer()` that wraps the Mastra tools' execute functions and receives RequestContext access via closure. The `tool()` helper from `@anthropic-ai/claude-agent-sdk` accepts Zod schemas (same as Mastra's `createTool`), making the conversion mechanical:

```typescript
// Conceptual bridge pattern
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

function createVocabularyMcpServer(requestContext: WorkflowRequestContext) {
  return createSdkMcpServer({
    name: 'vocabulary-tools',
    version: '1.0.0',
    tools: [
      tool(
        'getVocabulary',
        'Read all vocabulary entries',
        {},
        async () => {
          const entries = Array.from(requestContext.get('vocabulary-state').values());
          return { content: [{ type: 'text', text: JSON.stringify({ entries, count: entries.length }) }] };
        }
      ),
      // ... remaining vocabulary tools
    ]
  });
}
```

**Key constraint:** MCP tools with `createSdkMcpServer` require `streamingInput` mode (async generator for prompt parameter). The `ai-sdk-provider-claude-code` handles this internally when `mcpServers` are configured.

**However**, there is a simpler alternative worth considering: since the `createSdkMcpServer` runs in-process (same Node.js process), the closure over `requestContext` should work. The MCP server is not spawned as a subprocess -- it uses stdio transport internally within the same process. This makes the bridge pattern viable.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `ai-sdk-provider-claude-code` | `@anthropic-ai/sdk` (Anthropic API SDK) | If you have a separate Anthropic API key and want standard API access (not CLI-based). Would lose Claude Code's built-in tools and session management but gain native AI SDK tool support via `@ai-sdk/anthropic`. Not suitable here -- goal is to use existing Claude Pro/Max subscription. |
| `ai-sdk-provider-claude-code` | `@t3ta/claude-code-mastra` | If you want a full Mastra Agent replacement (not just provider). This package wraps the Claude Code SDK as a complete Mastra Agent with its own tool bridge. However, it targets `@mastra/core@^0.10.8` (pre-1.0) and `@anthropic-ai/claude-code` (deprecated, replaced by `claude-agent-sdk`). Dead package -- do not use. |
| MCP bridge for tools | Skip tools for Claude Code mode | If the MCP bridge proves too complex. Claude Code agents could receive tool results injected into their prompts by the workflow step (the step code calls tools directly, then passes results as context). Simpler but loses the agent's ability to decide when to use tools. |
| MCP bridge for tools | Run tool-using agents on OpenRouter even in Claude Code mode | Hybrid approach: only switch tool-free agents. Simpler but defeats the purpose of a full provider toggle. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@t3ta/claude-code-mastra` | Targets Mastra 0.10.x (pre-1.0) and deprecated `@anthropic-ai/claude-code`. v0.0.1, likely abandoned. | `ai-sdk-provider-claude-code` which targets current AI SDK v6 |
| `@anthropic-ai/claude-code` (npm package) | Deprecated in favor of `@anthropic-ai/claude-agent-sdk` since Oct 2025. The provider's v2.0.0 migration moved away from it. | `@anthropic-ai/claude-agent-sdk` (installed transitively) |
| `ai-sdk-cc-provider` | Alternative community provider with less adoption. `ai-sdk-provider-claude-code` is the one listed on the official AI SDK community providers page. | `ai-sdk-provider-claude-code` |
| `@ai-sdk/anthropic` | Standard Anthropic API provider requiring separate API key. Does not use Claude Pro/Max subscription. Different authentication model entirely. | `ai-sdk-provider-claude-code` for subscription-based access |
| Directly importing `@anthropic-ai/claude-agent-sdk` as a standalone dep | Version conflicts if pinned differently than the provider's transitive dep. The provider manages the SDK lifecycle internally. | Let the provider manage its SDK dependency |

## Stack Patterns by Provider Mode

**If provider mode = OpenRouter (Testing/Production):**
- Use existing `createOpenRouterProvider()` / singleton `openrouter`
- Model IDs: `openai/gpt-5-mini`, `google/gemini-3-flash-preview`, `openai/gpt-oss-120b`
- All Mastra tools work natively via AI SDK tool calling
- Per-request API key from user or server env

**If provider mode = Claude Code:**
- Use `claudeCode('sonnet')` or `claudeCode('opus')` from `ai-sdk-provider-claude-code`
- Model aliases: `opus`, `sonnet`, `haiku` (or full IDs like `claude-opus-4-5`)
- Tool-free agents: direct drop-in, no changes needed
- Tool-using agents: wrap Mastra tool execute functions in `createSdkMcpServer` + `tool()` and pass via provider settings
- Auth: Claude CLI credentials (no per-request key needed; uses system-level `claude auth login`)
- No API key management in frontend for Claude Code mode
- Parameters like `temperature`, `maxTokens` are NOT supported (Claude Code provider ignores them)

## Provider Factory Integration Point

The existing `createWorkflowAgent` factory resolves models via:
```typescript
model: ({ requestContext }) => {
  const mode = requestContext?.get('model-mode') as ModelMode;
  return getOpenRouterProvider(requestContext)(modelId);
}
```

For Claude Code integration, this callback needs to branch on a new provider-mode context key:
```typescript
model: ({ requestContext }) => {
  const providerMode = requestContext?.get('provider-mode');
  if (providerMode === 'claude-code') {
    return claudeCode('sonnet'); // or opus, based on agent role
  }
  const mode = requestContext?.get('model-mode') as ModelMode;
  return getOpenRouterProvider(requestContext)(modelId);
}
```

The `ModelMode` type expands from `'testing' | 'production'` to a `ProviderMode` of `'openrouter-testing' | 'openrouter-production' | 'claude-code'`.

## Claude Code Provider Configuration Options

| Option | Type | Purpose | Relevant to LO-Solver |
|--------|------|---------|----------------------|
| `permissionMode` | `'default' \| 'acceptEdits' \| 'bypassPermissions' \| 'plan'` | Controls tool approval workflow | Set to `'bypassPermissions'` for headless server execution |
| `maxTurns` | `number` | Limits agent loop iterations | Important for cost control; tool-using agents may need 10+ turns |
| `mcpServers` | `Record<string, McpServerConfig>` | Custom MCP server configurations | Required for tool bridging |
| `allowedTools` | `string[]` | Restrict which tools Claude can use | Filter to only vocabulary/rules/test tools, disable Bash/Read/Write |
| `disallowedTools` | `string[]` | Block specific tools | Block `Bash`, `Read`, `Write`, `Edit` to prevent file system access |
| `systemPrompt` | `string` | Custom system instructions | The provider maps this; Mastra also passes instructions separately |
| `cwd` | `string` | Working directory for Claude Code | Set to project root for consistent path resolution |

## Sources

- [ai-sdk-provider-claude-code GitHub](https://github.com/ben-vargas/ai-sdk-provider-claude-code) -- README, package.json, source code for tool handling behavior (HIGH confidence)
- [AI SDK Community Providers: Claude Code](https://ai-sdk.dev/providers/community-providers/claude-code) -- Official AI SDK listing confirming tool limitation (HIGH confidence)
- [Claude Agent SDK Custom Tools](https://platform.claude.com/docs/en/agent-sdk/custom-tools) -- MCP bridge pattern with `createSdkMcpServer` and `tool()` (HIGH confidence)
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- `query()`, `tool()`, `createSdkMcpServer()` API signatures (HIGH confidence)
- npm registry (via `npm view`) -- version numbers, dependency trees, publication dates (HIGH confidence)
- Dry-run `npm install` -- confirmed no blocking version conflicts (HIGH confidence)
- Local `claude auth status` -- confirmed CLI installed and authenticated with Max subscription (HIGH confidence)
- `@mastra/core` type definitions -- confirmed `MastraModelConfig` accepts `LanguageModelV3` (HIGH confidence)

---
*Stack research for: Claude Code provider integration into LO-Solver v1.6*
*Researched: 2026-03-10*
