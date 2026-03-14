# Phase 33: Provider Foundation - Research

**Researched:** 2026-03-11
**Domain:** Claude Code provider integration via ai-sdk-provider-claude-code, auth gating, security sandbox
**Confidence:** HIGH

## Summary

Phase 33 introduces Claude Code as an alternative model provider for the 8 tool-free agents (5 extractors, 2 dispatchers, 1 answerer). The integration uses `ai-sdk-provider-claude-code`, a community Vercel AI SDK provider that wraps the official `@anthropic-ai/claude-agent-sdk`. This provider returns `LanguageModelV3` instances compatible with Mastra 1.8's `MastraLanguageModel` type, so it slots directly into the existing `model` callback in `createWorkflowAgent()`.

The project already runs AI SDK v6.0.101, Mastra core 1.8.0, and Zod 4.3.6 -- all compatible with `ai-sdk-provider-claude-code` v3.2.0+. The provider supports `generateObject`/`streamObject` with constrained decoding (structured output), which is how all 8 tool-free agents produce JSON output. The `.catchall()` schema on `structuredProblemDataSchema` is a potential silent fallback risk and must be audited. Authentication is handled by the Claude Code CLI (`claude auth login`); the provider surfaces auth failures as `SDKAssistantMessageError: 'authentication_failed'` on the first call. Security sandboxing uses `disallowedTools` at the provider level to block all Claude Code built-in tools.

**Primary recommendation:** Install `ai-sdk-provider-claude-code` and `@anthropic-ai/claude-agent-sdk`, create `src/mastra/claude-code-provider.ts` with a singleton `createClaudeCode()` instance using comprehensive `disallowedTools`, extend the agent factory's `model` callback with a `'claude-code'` branch, and gate auth at the `/api/solve` route using a lightweight `query()` call or by catching `'authentication_failed'` on the first agent call.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Replace `modelMode: z.enum(['testing', 'production'])` with `providerMode: z.enum(['openrouter-testing', 'openrouter-production', 'claude-code'])`
- Default value: `'openrouter-testing'` (matches current behavior)
- Rename RequestContext key from `'model-mode'` to `'provider-mode'`
- Rename localStorage key from `'lo-solver-model-mode'` to `'lo-solver-provider-mode'`
- Single field controls both provider selection and model tier -- no separate provider/mode fields
- Add `claudeCodeModel` field to `WorkflowAgentConfig` in agent factory
- Reasoning agents (dispatchers, answerer): `claude-opus-4-6`
- Extraction agents (all 5 extractors): `claude-sonnet-4-6`
- Default fallback when `claudeCodeModel` not specified: `claude-sonnet-4-6`
- Model resolution per providerMode: `'openrouter-testing'` -> `testingModel`, `'openrouter-production'` -> `productionModel`, `'claude-code'` -> `claudeCodeModel`
- No testing/production split for Claude Code -- subscription-based, no cost difference
- SDK-level auth check in `/api/solve` route handler, before workflow starts
- If providerMode is `'claude-code'`: verify auth via the `ai-sdk-provider-claude-code` SDK
- If auth fails: return HTTP 401/403 error, frontend shows persistent error toast
- Error message: "Claude Code is not authenticated. Run `claude login` in your terminal, then try again."
- Fallback: if auth check is not available in SDK, catch the first-call auth error and surface it cleanly
- Create dedicated provider module: `src/mastra/claude-code-provider.ts` (mirrors `openrouter.ts` pattern)
- Comprehensive `disallowedTools` blocking ALL built-in Claude Code tools: Bash, Read, Write, Edit, Glob, Grep, NotebookEdit, WebSearch, WebFetch, Task, TodoRead, TodoWrite, EnterPlanMode, ExitPlanMode
- Only MCP-provided tools allowed (added in Phase 34)
- disallowedTools configured centrally in the provider module, not per-agent

### Claude's Discretion
- Error handling in `generateWithRetry`/`streamWithRetry` for Claude Code error shapes (AUTH-03)
- Exact structure of the provider module (singleton vs factory pattern)
- How to thread the Claude Code provider through RequestContext alongside the OpenRouter provider

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROV-01 | User can select between OpenRouter Testing, OpenRouter Production, and Claude Code as provider mode | Rename `modelMode` to `providerMode` with 3-value enum; update `workflowStateSchema`, `rawProblemInputSchema`, frontend hook, localStorage key |
| PROV-02 | Agent factory resolves to Claude Code or OpenRouter model based on provider mode | Extend `createWorkflowAgent()` model callback with 3-way branch; new `claudeCodeModel` config field |
| PROV-03 | Per-agent model mapping translates OpenRouter model IDs to Claude Code model shortcuts | 5 extractors use `claude-sonnet-4-6`, 2 dispatchers + 1 answerer use `claude-opus-4-6`; shortcuts are `'sonnet'` and `'opus'` |
| PROV-04 | All 8 tool-free agents produce correct output through Claude Code provider | Provider supports `generateObject`/`streamObject` structured output; `.catchall()` schema audit needed |
| PROV-05 | Workflow schema uses three-value `providerMode` enum replacing binary `modelMode` | Replace in `workflow-schemas.ts`, update all step files reading `state.modelMode` |
| AUTH-01 | Auth gate detects Claude Code CLI presence and auth status before solve | Use `query()` with a lightweight prompt as auth probe, or catch `'authentication_failed'` error |
| AUTH-02 | `disallowedTools` blocks Claude Code built-in filesystem tools | Provider-level `disallowedTools` array with 14 tool names; deny rules override all other permissions |
| AUTH-03 | `generateWithRetry` handles Claude Code error shapes alongside OpenRouter errors | Claude Code errors may include `AI_APICallError`, `authentication_failed`, rate limits; extend retryable error detection |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai-sdk-provider-claude-code` | ^3.2.0 (AI SDK v6) | Vercel AI SDK community provider wrapping Claude Agent SDK | Only maintained provider bridging Claude Code to AI SDK v6; listed on ai-sdk.dev community providers |
| `@anthropic-ai/claude-agent-sdk` | latest (peer dep) | Official Claude Agent SDK -- `query()` function for Claude Code CLI | Transitive dependency of `ai-sdk-provider-claude-code`; also useful for direct auth checks |
| `@mastra/core` | 1.8.0 (installed) | Agent orchestration, `MastraLanguageModel` type | Already installed; supports LanguageModelV3 models |
| `ai` | 6.0.101 (installed) | Vercel AI SDK core -- `generateText`, `streamText`, `generateObject` | Already installed; v6 required by the provider |
| `zod` | 4.3.6 (installed) | Schema validation | Already installed; required by provider v3.2.0+ |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@openrouter/ai-sdk-provider` | 2.1.1 (installed) | Existing OpenRouter provider | Unchanged; continues to serve `openrouter-testing` and `openrouter-production` modes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ai-sdk-provider-claude-code` | `@ai-sdk/anthropic` (direct API) | Different auth model (API key vs CLI subscription); out of scope per REQUIREMENTS.md |
| `ai-sdk-provider-claude-code` | `@t3ta/claude-code-mastra` | Targets Mastra 0.10.x (pre-1.0), likely abandoned; out of scope per REQUIREMENTS.md |
| `ai-sdk-provider-claude-code` | `ai-sdk-cc-provider` (alt package) | Less maintained fork; ben-vargas version is canonical and listed on ai-sdk.dev |

**Installation:**
```bash
npm install ai-sdk-provider-claude-code @anthropic-ai/claude-agent-sdk
```

Note: `@anthropic-ai/claude-agent-sdk` may be a peer dependency of `ai-sdk-provider-claude-code`. Install it explicitly to use `query()` for auth checking.

## Architecture Patterns

### Recommended Project Structure
```
src/mastra/
├── openrouter.ts              # Existing -- OpenRouter provider (unchanged)
├── claude-code-provider.ts    # NEW -- Claude Code provider module
└── workflow/
    ├── agent-factory.ts       # MODIFY -- add claudeCodeModel, 3-way model callback
    ├── agent-utils.ts         # MODIFY -- extend error detection for Claude Code errors
    ├── workflow-schemas.ts    # MODIFY -- providerMode replaces modelMode
    ├── request-context-types.ts  # MODIFY -- rename 'model-mode' to 'provider-mode'
    ├── request-context-helpers.ts  # MODIFY -- add getClaudeCodeProvider() helper
    ├── 01-*-agent.ts          # MODIFY -- add claudeCodeModel field (x5 extractors)
    ├── 02-dispatcher-agent.ts # MODIFY -- add claudeCodeModel field
    ├── 02-improver-dispatcher-agent.ts  # MODIFY -- add claudeCodeModel field
    ├── 04-question-answerer-agent.ts    # MODIFY -- add claudeCodeModel field
    └── steps/                 # MODIFY -- rename modelMode references to providerMode
src/hooks/
├── use-model-mode.ts          # RENAME to use-provider-mode.ts, update type
src/app/api/solve/
└── route.ts                   # MODIFY -- add Claude Code auth gate
```

### Pattern 1: Provider Module (claude-code-provider.ts)

**What:** Singleton `createClaudeCode()` instance with security-hardened configuration.
**When to use:** Whenever the provider mode is `'claude-code'`.
**Why singleton:** Unlike OpenRouter (per-request API keys), Claude Code uses CLI-level auth. No per-request state needed.

```typescript
// Source: ai-sdk-provider-claude-code README + official docs
import { createClaudeCode } from 'ai-sdk-provider-claude-code';

/** All built-in Claude Code tools -- must be blocked for server-side solver execution. */
const DISALLOWED_TOOLS = [
  // Filesystem
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'NotebookEdit',
  // Web
  'WebSearch', 'WebFetch',
  // Agent management
  'Agent', 'Task', 'TaskOutput', 'TaskStop', 'TodoRead', 'TodoWrite',
  'EnterPlanMode', 'ExitPlanMode',
  // Other
  'AskUserQuestion', 'Config',
] as const;

/**
 * Claude Code provider with all built-in tools blocked.
 * Accepts model shortcuts: 'opus', 'sonnet', 'haiku', or full IDs like 'claude-opus-4-6'.
 */
export const claudeCode = createClaudeCode({
  disallowedTools: [...DISALLOWED_TOOLS],
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true,
});
```

### Pattern 2: Agent Factory Extension

**What:** Add `claudeCodeModel` config field and 3-way model resolution.
**When to use:** All 12 agents get the field; Phase 33 activates it for the 8 tool-free ones.

```typescript
// In agent-factory.ts
import { claudeCode } from '../claude-code-provider';

export interface WorkflowAgentConfig {
  // ... existing fields ...
  /** Claude Code model shortcut (e.g., 'opus', 'sonnet'). Defaults to 'sonnet'. */
  claudeCodeModel?: string;
}

export function createWorkflowAgent(config: WorkflowAgentConfig): Agent {
  const {
    claudeCodeModel = 'sonnet',
    // ... existing destructuring ...
  } = config;

  return new Agent({
    // ...
    model: ({ requestContext }) => {
      const providerMode = requestContext?.get('provider-mode') as ProviderMode | undefined;

      if (providerMode === 'claude-code') {
        return claudeCode(claudeCodeModel);
      }

      // OpenRouter path (unchanged logic)
      const mode = providerMode === 'openrouter-production' ? 'production' : 'testing';
      const modelId = mode === 'production' ? productionModel : testingModel;
      return getOpenRouterProvider(requestContext)(modelId);
    },
    // ...
  });
}
```

### Pattern 3: Auth Gate in API Route

**What:** Pre-flight auth check before starting the workflow when providerMode is `'claude-code'`.
**When to use:** In `/api/solve` route handler.

```typescript
// In route.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

if (providerMode === 'claude-code') {
  try {
    // Lightweight auth probe -- minimal prompt, no tools, single turn
    const probe = query({
      prompt: 'Respond with OK',
      options: {
        maxTurns: 1,
        disallowedTools: [...ALL_TOOLS],
        persistSession: false,
      },
    });
    // Consume the generator to trigger auth
    for await (const msg of probe) {
      if (msg.type === 'assistant' && msg.error === 'authentication_failed') {
        throw new Error('authentication_failed');
      }
      if (msg.type === 'result') break;
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Claude Code is not authenticated. Run `claude login` in your terminal, then try again.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
```

**Alternative (lighter):** Skip the probe and catch auth errors from the first actual agent call. This avoids the extra `query()` call but delays the error to mid-workflow. The CONTEXT.md prefers pre-workflow gating.

### Pattern 4: ProviderMode Type System

**What:** Replace binary `ModelMode` with 3-value `ProviderMode`.
**Affects:** `openrouter.ts`, `workflow-schemas.ts`, `request-context-types.ts`, all step files, frontend hooks.

```typescript
// New type definition (in openrouter.ts or a shared types file)
export type ProviderMode = 'openrouter-testing' | 'openrouter-production' | 'claude-code';

// In workflow-schemas.ts
export const workflowStateSchema = z.object({
  // ...
  providerMode: z.enum(['openrouter-testing', 'openrouter-production', 'claude-code'])
    .default('openrouter-testing'),
  // Remove: modelMode
});

export const rawProblemInputSchema = z.object({
  rawProblemText: z.string(),
  providerMode: z.enum(['openrouter-testing', 'openrouter-production', 'claude-code'])
    .default('openrouter-testing'),
  maxRounds: z.number().min(1).max(5).default(3),
  perspectiveCount: z.number().min(2).max(7).default(3),
  apiKey: z.string().optional(),
});
```

### Anti-Patterns to Avoid
- **Separate provider + mode fields:** The user explicitly decided against this. A single `providerMode` field replaces both.
- **Per-agent disallowedTools:** Configure tools centrally in the provider module, not repeated in each agent.
- **Lazy auth detection:** Do not let auth errors propagate as unhandled crashes mid-workflow. Gate them up front.
- **Loading CLAUDE.md or settings:** The provider should NOT load `settingSources` or `systemPrompt` presets. The solver agents have their own instructions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI SDK provider for Claude Code | Custom HTTP client to Claude Code CLI | `ai-sdk-provider-claude-code` | Handles process spawning, message parsing, LanguageModelV3 conformance |
| Structured output validation | Manual JSON extraction + retry | Provider's native constrained decoding | Built into the CLI; `generateObject`/`streamObject` work out of the box |
| Tool blocking | Custom pre-tool-use hooks | `disallowedTools` in provider config | Deny rules are checked first, override everything including `bypassPermissions` |
| Model shortcut resolution | Mapping table from full model IDs to shortcuts | Provider's built-in shortcuts (`'opus'`, `'sonnet'`, `'haiku'`) | Already handled by `claudeCode('sonnet')` |

**Key insight:** The `ai-sdk-provider-claude-code` package abstracts away the Claude Agent SDK process lifecycle. Don't interact with the SDK's `query()` directly for agent calls -- only for the auth probe if needed.

## Common Pitfalls

### Pitfall 1: .catchall() Schema Silent Fallback
**What goes wrong:** Claude Code's structured output uses constrained decoding. When the JSON schema includes features the CLI does not support (like `.catchall()`), it silently falls back to prose text instead of structured JSON.
**Why it happens:** `structuredProblemDataSchema` uses `.catchall(z.string())` on dataset array items. This produces an `additionalProperties` pattern in JSON Schema that Claude Code may not handle via constrained decoding.
**How to avoid:** Test the extraction agent with Claude Code on a real problem. If structured output fails, either: (a) remove `.catchall()` and enumerate known fields, or (b) use the `jsonPromptInjection` option to inject schema instructions into the prompt instead of relying on constrained decoding.
**Warning signs:** Agent returns text but `response.object` is `null` or `undefined`.

### Pitfall 2: Claude Code CLI Not Installed on Server
**What goes wrong:** `ai-sdk-provider-claude-code` spawns a Claude Code CLI process. If the CLI is not installed on the machine running the Next.js server, all Claude Code calls fail.
**Why it happens:** The package requires `@anthropic-ai/claude-code` CLI globally installed (`npm install -g @anthropic-ai/claude-code`).
**How to avoid:** Document the prerequisite. The auth gate will surface a clear error if CLI is missing (process spawn fails).
**Warning signs:** Error about process spawn failure or missing executable.

### Pitfall 3: Token Usage / Cost Tracking Returns Different Shape
**What goes wrong:** `extractCostFromResult()` currently reads `providerMetadata.openrouter.usage.cost`. Claude Code provider returns usage differently -- via `result.usage` (input/output tokens) but no dollar cost (subscription-based).
**Why it happens:** Different provider metadata shapes.
**How to avoid:** In `extractCostFromResult()`, return 0 for Claude Code provider mode. PROV-06 (Phase 35) handles "Subscription" label.
**Warning signs:** Cost tracking crashes with undefined property access.

### Pitfall 4: permissionMode Required for Server Execution
**What goes wrong:** Claude Code prompts for tool permissions interactively. In a server context (Next.js API route), there is no TTY, so the process hangs.
**Why it happens:** Default `permissionMode` is `'default'` which requires interactive approval.
**How to avoid:** Set `permissionMode: 'bypassPermissions'` and `allowDangerouslySkipPermissions: true` in the provider config. Since all dangerous tools are in `disallowedTools`, bypass is safe.
**Warning signs:** Request hangs indefinitely, no response.

### Pitfall 5: ModelMode References Throughout Codebase
**What goes wrong:** The rename from `modelMode` to `providerMode` touches many files. Missing a reference causes type errors or runtime bugs.
**Why it happens:** `modelMode` / `model-mode` appears in: workflow schemas, request context types, step files, frontend hooks, trace events, eval system, localStorage.
**How to avoid:** Use TypeScript's type system -- rename the type first, then fix all compilation errors. Search for both `modelMode` and `model-mode` across the codebase.
**Warning signs:** `npx tsc --noEmit` reports errors.

### Pitfall 6: Eval System Uses modelMode
**What goes wrong:** `src/evals/run.ts` accepts `--mode testing|production` and the eval results page displays `modelMode`. These break if not updated.
**Why it happens:** The eval system has its own modelMode references separate from the workflow.
**How to avoid:** Update eval CLI to accept `--provider` flag (or keep backward compatibility). This may partially defer to Phase 36 (EVAL-01) but types must be consistent.
**Warning signs:** Eval runs fail or display incorrect mode labels.

## Code Examples

### Creating the Claude Code Provider Module

```typescript
// src/mastra/claude-code-provider.ts
// Source: ai-sdk-provider-claude-code docs + Claude Agent SDK official reference
import { createClaudeCode, type ClaudeCodeProvider } from 'ai-sdk-provider-claude-code';

/**
 * All built-in Claude Code tools that must be blocked during server-side execution.
 * Deny rules override all other permission settings including bypassPermissions.
 */
export const CLAUDE_CODE_DISALLOWED_TOOLS = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'NotebookEdit',
  'WebSearch', 'WebFetch',
  'Agent', 'Task', 'TaskOutput', 'TaskStop',
  'TodoRead', 'TodoWrite',
  'AskUserQuestion',
  'EnterPlanMode', 'ExitPlanMode',
  'Config',
] as const;

/**
 * Shared Claude Code provider with all built-in tools blocked.
 * Singleton -- Claude Code auth is CLI-level, no per-request key.
 */
export const claudeCode = createClaudeCode({
  disallowedTools: [...CLAUDE_CODE_DISALLOWED_TOOLS],
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true,
});

export type { ClaudeCodeProvider };
```

### Extended Agent Factory Model Callback

```typescript
// In agent-factory.ts -- model callback with 3-way resolution
model: ({ requestContext }) => {
  const providerMode = requestContext?.get('provider-mode') as ProviderMode | undefined;

  if (providerMode === 'claude-code') {
    // Claude Code provider -- model shortcut from agent config
    return claudeCode(claudeCodeModel);
  }

  // OpenRouter path -- unchanged
  const isProduction = providerMode === 'openrouter-production';
  const modelId = isProduction ? productionModel : testingModel;
  return getOpenRouterProvider(requestContext)(modelId);
},
```

### Extending generateWithRetry for Claude Code Errors

```typescript
// In agent-utils.ts -- additional retryable error patterns
const isRetryable =
  lastError.name === 'AI_APICallError' ||
  lastError.message.includes('Provider returned error') ||
  lastError.message.includes('timeout') ||
  lastError.message.includes('Timeout') ||
  lastError.message.includes('ECONNRESET') ||
  lastError.message.includes('ETIMEDOUT') ||
  lastError.message.includes('fetch failed') ||
  lastError.message.includes('network') ||
  lastError.message.includes('Empty response from model') ||
  // Claude Code specific
  lastError.message.includes('rate_limit') ||
  lastError.message.includes('server_error') ||
  lastError.message.includes('billing_error');

// Non-retryable Claude Code errors (fail fast):
const isAuthError =
  lastError.message.includes('authentication_failed') ||
  lastError.message.includes('not authenticated');

if (isAuthError) {
  throw lastError; // Don't retry auth failures
}
```

### activeModelId Extension for Trace Events

```typescript
// Extend activeModelId to handle claude-code provider mode
export function activeModelId(providerMode: ProviderMode, productionModel: string, claudeCodeModel?: string): string {
  if (providerMode === 'claude-code') {
    return `claude-code/${claudeCodeModel ?? 'sonnet'}`;
  }
  return providerMode === 'openrouter-production' ? productionModel : TESTING_MODEL;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `claude-code-sdk` package name | `@anthropic-ai/claude-agent-sdk` | 2025 Q4 | SDK renamed; import paths changed |
| `LanguageModelV1/V2` | `LanguageModelV3` | AI SDK v6 (2025) | Mastra 1.8 supports both; provider returns V3 |
| Manual JSON extraction | `generateObject`/`streamObject` with constrained decoding | Provider v3.0+ | Structured output works natively, no prompt engineering |
| `ai-sdk-provider-claude-code` v1.x (loaded CLAUDE.md by default) | v2.0+ (no filesystem settings by default) | v2.0 breaking change | Must NOT set `settingSources` for our use case (correct default) |
| `ai-sdk-provider-claude-code` v2.x (Zod 3) | v3.2.0+ (Zod 4 required) | v3.2.0 | Project already on Zod 4.3.6 -- compatible |
| `Task` tool name | `Agent` tool (Task still accepted as alias) | Claude Code update | Block both `Agent` and `Task` in disallowedTools |

**Deprecated/outdated:**
- `@t3ta/claude-code-mastra`: Targeted Mastra 0.10.x (pre-1.0), likely abandoned
- `claude-code-sdk-node`: Renamed to `@anthropic-ai/claude-agent-sdk`
- `maxThinkingTokens` option: Deprecated in favor of `thinking: { type: 'adaptive' }` (which is the default)

## Open Questions

1. **Auth probe approach vs catch-on-first-call**
   - What we know: The Claude Agent SDK `query()` can be used for a lightweight auth check. The `SDKAssistantMessage.error` field surfaces `'authentication_failed'`. The provider also surfaces errors through the AI SDK error system.
   - What's unclear: Whether `ai-sdk-provider-claude-code` exposes a lighter auth check method without spawning a full query. The auth probe adds ~1-2 seconds latency.
   - Recommendation: Try the probe approach first. If latency is unacceptable, fall back to catching auth errors from the first real agent call and returning early.

2. **`.catchall()` schema compatibility**
   - What we know: Claude Code's constrained decoding may silently fall back to prose for unsupported JSON Schema features. `.catchall()` produces `additionalProperties` in JSON Schema.
   - What's unclear: Whether the current Claude Code CLI version handles `additionalProperties` correctly.
   - Recommendation: Test with a real problem during implementation. If it fails, use `jsonPromptInjection: true` as a workaround for the extraction agent.

3. **Cost tracking for Claude Code provider**
   - What we know: `extractCostFromResult()` reads OpenRouter-specific `providerMetadata`. Claude Code returns usage tokens but no dollar cost.
   - What's unclear: Exact shape of Claude Code usage data in AI SDK v6 result objects.
   - Recommendation: Return 0 cost for Claude Code mode in Phase 33. Phase 35 (PROV-06) handles the "Subscription" label.

4. **Eval system backward compatibility**
   - What we know: Eval uses `--mode testing|production` CLI flag and stores `modelMode` in results.
   - What's unclear: Whether to update eval types in Phase 33 (for consistency) or defer to Phase 36.
   - Recommendation: Update the TypeScript types in Phase 33 (they must compile), but defer the `--provider` CLI flag to Phase 36 (EVAL-01).

## Sources

### Primary (HIGH confidence)
- [ai-sdk-provider-claude-code GitHub](https://github.com/ben-vargas/ai-sdk-provider-claude-code) - Full README with API, config, structured output docs
- [AI SDK Community Providers: Claude Code](https://ai-sdk.dev/providers/community-providers/claude-code) - Official AI SDK listing, model capabilities
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) - Full `query()` API, Options type, SDKMessage types, tool names, auth errors
- Mastra embedded docs (`node_modules/@mastra/core/dist/docs/references/reference-agents-agent.md`) - Agent constructor, model callback type

### Secondary (MEDIUM confidence)
- [Mastra Changelog 2026-01-20](https://mastra.ai/blog/changelog-2026-01-20) - LanguageModelV3 support confirmation
- Codebase analysis of existing `openrouter.ts`, `agent-factory.ts`, `request-context-types.ts`, `workflow-schemas.ts`, all step files

### Tertiary (LOW confidence)
- Auth probe approach using `query()` with minimal prompt -- inferred from SDK docs, not tested in this project context

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- provider package verified on ai-sdk.dev, versions confirmed compatible
- Architecture: HIGH -- patterns derived from existing codebase + verified provider API
- Pitfalls: MEDIUM -- `.catchall()` risk and auth probe latency are theoretical until tested
- Error handling: MEDIUM -- Claude Code error shapes documented in SDK types but not tested in Mastra context

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (30 days -- provider and SDK are actively maintained)
