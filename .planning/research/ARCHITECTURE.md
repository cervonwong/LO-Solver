# Architecture Research

**Domain:** Claude Code provider integration into Mastra workflow agent factory
**Researched:** 2026-03-10
**Confidence:** MEDIUM (tool compatibility is the key risk; provider integration path is HIGH confidence)

## System Overview: Current vs Target

### Current Architecture (v1.5)

```
Frontend (React)                      Backend (Mastra Workflow)
 +---------------------------+         +-------------------------------------------+
 | useModelMode hook         |         | Workflow State                             |
 |  localStorage: testing/   |         |  modelMode: testing | production           |
 |    production             |         |  apiKey?: string                           |
 |                           |         +-------------------------------------------+
 | useSolverWorkflow hook    |              |
 |  transport: /api/solve    |              v
 |  body.inputData: {        |         +-------------------------------------------+
 |    modelMode, apiKey      |         | Per-Step RequestContext                    |
 |  }                        |         |  'model-mode': ModelMode                  |
 +---------------------------+         |  'openrouter-provider'?: OpenRouterProvider|
              |                        +-------------------------------------------+
              v                             |
 POST /api/solve                            v
              |                        +-------------------------------------------+
              v                        | Agent Factory (createWorkflowAgent)        |
 Mastra workflow.createRun()           |  model: ({ requestContext }) => {           |
   inputData flows through             |    mode = ctx.get('model-mode')            |
   workflow state to each step         |    modelId = mode==='prod' ? prod : test   |
                                       |    return getOpenRouterProvider(ctx)(modelId)|
                                       |  }                                         |
                                       +-------------------------------------------+
```

### Target Architecture (v1.6)

```
Frontend (React)                      Backend (Mastra Workflow)
 +---------------------------+         +-------------------------------------------+
 | useProviderMode hook      |         | Workflow State                             |
 |  localStorage: provider   |         |  providerMode: 'openrouter-testing'       |
 |    + mode combined into   |         |    | 'openrouter-production'               |
 |    single selection       |         |    | 'claude-code'                         |
 |                           |         |  apiKey?: string (OpenRouter only)         |
 +---------------------------+         +-------------------------------------------+
              |                             |
              v                             v
 POST /api/solve                       +-------------------------------------------+
   body.inputData: {                   | Per-Step RequestContext                    |
     providerMode,                     |  'provider-mode': ProviderMode             |
     apiKey                            |  'openrouter-provider'?: OpenRouterProvider|
   }                                   +-------------------------------------------+
                                            |
                                            v
                                       +-------------------------------------------+
                                       | Agent Factory (createWorkflowAgent)        |
                                       |  model: ({ requestContext }) => {           |
                                       |    mode = ctx.get('provider-mode')          |
                                       |    if (mode === 'claude-code')              |
                                       |      return claudeCode('sonnet', opts)      |
                                       |    else                                     |
                                       |      return openrouter(modelId)             |
                                       |  }                                         |
                                       +-------------------------------------------+
```

## Component Responsibilities

| Component | Current Responsibility | v1.6 Change |
|-----------|----------------------|-------------|
| `agent-factory.ts` | Creates agents with OpenRouter model resolution | Add Claude Code provider branch in model callback |
| `openrouter.ts` | OpenRouter provider singleton + factory | No change (provider code stays isolated) |
| NEW: `claude-code-provider.ts` | N/A | Claude Code provider configuration, model mapping |
| `request-context-types.ts` | Defines `WorkflowRequestContext` with `model-mode` and `openrouter-provider` | Add `provider-mode` key, deprecate or alias `model-mode` |
| `request-context-helpers.ts` | `getOpenRouterProvider()` helper | Add `getProviderModel()` that returns the right model instance |
| `workflow-schemas.ts` | `modelMode` in state, `rawProblemInputSchema` | Replace `modelMode` with `providerMode` enum |
| `use-model-mode.ts` | Two-state toggle (testing/production) | Replace with three-state `useProviderMode` |
| `model-mode-toggle.tsx` | Binary Switch component | Replace with segmented selector or dropdown |
| Step files (01-extract, 02-hypothesize, 03-answer) | Create RequestContext with `model-mode` + `openrouter-provider` | Switch to `provider-mode`, conditionally skip OpenRouter provider setup |
| `use-solver-workflow.ts` | Sends `modelMode` in body | Send `providerMode` instead |
| `route.ts` (API) | Validates API key presence | Skip API key check when Claude Code mode |

## Architectural Patterns

### Pattern 1: Provider-Agnostic Model Resolution in Agent Factory

**What:** The `createWorkflowAgent` factory's `model` callback resolves to either an OpenRouter model instance or a Claude Code model instance based on `provider-mode` in RequestContext. The agent itself is unaware of which provider is active.

**When to use:** Every agent creation (all 12 workflow agents use the factory).

**Trade-offs:** Single point of change for provider logic (+). Claude Code provider may behave differently with tools and structured output, which the factory cannot abstract away (-).

**Example:**

```typescript
// claude-code-provider.ts (NEW)
import { claudeCode } from 'ai-sdk-provider-claude-code';

export type ProviderMode = 'openrouter-testing' | 'openrouter-production' | 'claude-code';

/** Claude Code model mapped from OpenRouter model role. */
export function getClaudeCodeModel(productionModel: string) {
  // Map agent roles to Claude Code model aliases.
  // Reasoning agents (Gemini Flash) -> sonnet (balanced)
  // Extraction agents (GPT-5-mini) -> sonnet (structured output capable)
  // All agents use sonnet since Claude Code has no model granularity benefit
  // and subscription cost is flat-rate.
  return claudeCode('sonnet', {
    permissionMode: 'bypassPermissions',
    // No filesystem settings -- agents should not read CLAUDE.md
    settingSources: [],
    // Explicit system prompt is handled by Mastra agent instructions
  });
}

// Updated agent-factory.ts
import { getClaudeCodeModel, type ProviderMode } from './claude-code-provider';

export function createWorkflowAgent(config: WorkflowAgentConfig): Agent {
  return new Agent({
    // ...
    model: ({ requestContext }) => {
      const providerMode = requestContext?.get('provider-mode') as ProviderMode | undefined;

      if (providerMode === 'claude-code') {
        return getClaudeCodeModel(config.productionModel);
      }

      // OpenRouter path (existing behavior)
      const isProduction = providerMode === 'openrouter-production';
      const modelId = isProduction ? config.productionModel : config.testingModel;
      return getOpenRouterProvider(requestContext)(modelId);
    },
    // ...
  });
}
```

### Pattern 2: Provider Mode in Workflow State (replaces Model Mode)

**What:** The three-way `providerMode` replaces the binary `modelMode` in workflow state and input schemas. This is a semantic expansion -- the old `testing`/`production` distinction maps directly to `openrouter-testing`/`openrouter-production`, with `claude-code` as the new option.

**When to use:** All workflow state initialization and propagation.

**Trade-offs:** Breaking change to workflow schema (+cleaner semantics). Requires migration of all step files that read `modelMode` from state (-).

**Example:**

```typescript
// workflow-schemas.ts
export const rawProblemInputSchema = z.object({
  rawProblemText: z.string(),
  providerMode: z.enum([
    'openrouter-testing',
    'openrouter-production',
    'claude-code',
  ]).default('openrouter-testing'),
  maxRounds: z.number().min(1).max(5).default(3),
  perspectiveCount: z.number().min(2).max(7).default(3),
  apiKey: z.string().optional(), // Only used for OpenRouter
});
```

### Pattern 3: Conditional Tool/StructuredOutput Handling

**What:** Claude Code provider does NOT support AI SDK custom tools (Zod schemas in `tools` parameter). It DOES support `generateObject`/`streamObject` structured output. For agents that use custom Mastra tools (verifier orchestrator with testRule/testSentence), Claude Code mode either (a) must use a different execution strategy, or (b) those tools must be exposed via MCP.

**When to use:** Only affects agents with custom tools: verifier orchestrator (testRule, testSentence tools).

**Trade-offs:** This is the **critical architectural decision** for v1.6. Options detailed below.

**Impact assessment across all 12 agents:**

| Agent | Uses Tools | Uses StructuredOutput | Claude Code Compatible |
|-------|-----------|----------------------|----------------------|
| structured-problem-extractor | No | Yes (structuredProblemSchema) | YES -- structured output works |
| dispatcher | No | Yes (dispatcherOutputSchema) | YES |
| initial-hypothesizer | Yes (vocab + rules tools) | No | PARTIAL -- tools won't work |
| synthesizer | Yes (vocab + rules tools) | No | PARTIAL -- tools won't work |
| improver-dispatcher | No | Yes (improverDispatcherOutputSchema) | YES |
| rules-improver | Yes (vocab + rules tools) | No | PARTIAL -- tools won't work |
| rules-improvement-extractor | No | Yes (rulesSchema) | YES |
| verifier-orchestrator | Yes (testRule, testSentence) | No | PARTIAL -- tools won't work |
| verifier-feedback-extractor | No | Yes (verifierFeedbackSchema) | YES |
| rule-tester | No | No (text output) | YES |
| sentence-tester | No | No (text output) | YES |
| question-answerer | No | Yes (questionsAnsweredSchema) | YES |

**5 of 12 agents use custom tools** that Claude Code provider cannot execute.

## Data Flow

### Request Flow (Current -- OpenRouter)

```
User clicks "Solve"
    |
    v
useSolverWorkflow: body = { rawProblemText, modelMode, apiKey }
    |
    v
POST /api/solve -> workflow.createRun({ inputData })
    |
    v
Step 1 (extract): reads inputData.modelMode -> sets state.modelMode
    creates RequestContext: 'model-mode', 'openrouter-provider'
    calls agent.generate() -> agent.model({ requestContext }) -> OpenRouter(modelId)
    |
    v
Step 2 (hypothesize): reads state.modelMode -> creates new RequestContext per sub-phase
    propagates 'openrouter-provider' from main RequestContext to sub-contexts
    |
    v
Step 3 (answer): reads state.modelMode -> creates new RequestContext
```

### Request Flow (Target -- Provider-Agnostic)

```
User clicks "Solve"
    |
    v
useSolverWorkflow: body = { rawProblemText, providerMode, apiKey? }
    |
    v
POST /api/solve
    if providerMode !== 'claude-code' && !apiKey && !env.OPENROUTER_API_KEY:
      return 401
    |
    v
Step 1 (extract): reads inputData.providerMode -> sets state.providerMode
    creates RequestContext: 'provider-mode'
    if OpenRouter: also sets 'openrouter-provider'
    calls agent.generate() -> agent.model({ requestContext }) ->
      if 'claude-code': claudeCode('sonnet', opts)
      else: OpenRouter(modelId)
    |
    v
Step 2 (hypothesize): reads state.providerMode -> propagates to sub-contexts
    |
    v
Step 3 (answer): reads state.providerMode
```

### Key Data Flow Change

The `apiKey` field becomes **optional** and **OpenRouter-only**. Claude Code authentication happens via `claude login` on the server -- there is no API key to pass. The API route must skip the key check for Claude Code mode.

## Integration Points

### Critical Integration: Claude Code Provider with Mastra Agent.generate()

**Mechanism:** `claudeCode('sonnet')` returns a `LanguageModelV3` instance (AI SDK v6). Mastra 1.8.0's `Agent` class accepts `MastraModelConfig` which is `LanguageModelV1 | LanguageModelV2 | LanguageModelV3 | ...`. The dynamic `model` callback returns this type, so **the provider instance slots directly into Mastra's model resolution**.

**Confidence:** HIGH. The types align: `claudeCode()` -> `LanguageModelV3` -> `MastraModelConfig`. Mastra 1.8.0 explicitly supports V3 models.

### Critical Integration: Tool Compatibility

**Problem:** `ai-sdk-provider-claude-code` does NOT support AI SDK custom tools passed via the `tools` parameter in `generateText`/`streamText`. Mastra agents that have `tools: { testRule, testSentence }` or vocabulary/rules tools will fail when the model callback returns a Claude Code model, because Mastra calls `agent.generate()` which internally uses AI SDK's `generateText`/`streamText` with the tools.

**Confidence:** HIGH that this is a real blocker. The ai-sdk.dev documentation explicitly states "Tool usage: No" for this provider.

**Three approaches to handle this:**

1. **Prompt-only approach (RECOMMENDED):** For Claude Code mode, agents that currently use tools receive the tool functionality as prompt context instead. Vocabulary and rules CRUD operations become instructions to output structured JSON that the step code parses and applies. This is how the Claude Code native solver (v1.4) already works -- agents output markdown that the orchestrator parses.

2. **MCP bridge approach:** Wrap existing Mastra tools as MCP servers using `createSdkMcpServer()` from `@anthropic-ai/claude-agent-sdk`. Pass these as `mcpServers` in the Claude Code provider config. Tools would execute autonomously within the Claude Code session. **Risk:** This changes execution semantics -- the agent controls tool execution, not Mastra's step code.

3. **Hybrid approach:** Use Claude Code provider only for tool-free agents, keep OpenRouter for tool-using agents even in "Claude Code mode." **Risk:** Mixed execution undermines the point of a single provider toggle.

**Recommendation:** Approach 1 (prompt-only). Reasons:
- The Claude Code native solver already proves this pattern works for this domain
- 7 of 12 agents already work without tools (structured output or text-only)
- The 5 tool-using agents use vocabulary/rules CRUD, which is fundamentally "write structured data" -- easily expressed as structured output
- MCP bridge adds significant complexity for marginal benefit
- Keeps the architecture simple: one provider mode, one code path per agent

### Critical Integration: Structured Output Compatibility

**Status:** Claude Code provider supports `generateObject()`/`streamObject()` with Zod schemas. However, the provider documentation warns: "Some JSON Schema features can cause the Claude Code CLI to silently fall back to prose." Complex regex patterns and format constraints may not work.

**Impact:** The current schemas (structuredProblemSchema, verifierFeedbackSchema, etc.) use standard Zod types (string, number, enum, array, object) without format constraints. They should work.

**Confidence:** MEDIUM. Standard schemas should work, but edge cases with deeply nested schemas or enum arrays need testing.

### Integration: Cost Tracking

**Current:** `extractCostFromResult()` reads `providerMetadata.openrouter.usage.cost`.

**Claude Code:** Usage data comes in a different format: `usage.raw` contains raw provider usage (v3.0.0+). Cost is subscription-based, not per-token, so per-call cost tracking is meaningless. The cost display should show "subscription" or be hidden for Claude Code mode.

**Confidence:** HIGH.

### Integration: AbortSignal

**Current:** `abortSignal` propagates through `mergedSignal` in `generateWithRetry`/`streamWithRetry` to the AI SDK call.

**Claude Code:** The provider supports `AbortSignal` (documented in ai-sdk-provider-claude-code README). This should work transparently.

**Confidence:** HIGH.

### Integration: Streaming (streamWithRetry)

**Current:** `streamWithRetry` uses `agent.stream()` which internally calls `streamText()`.

**Claude Code:** The provider supports `streamText()`. However, streaming behavior may differ -- Claude Code runs an agent session that may have multi-turn internal execution before producing output. Latency characteristics will differ from direct API calls.

**Confidence:** MEDIUM. Streaming works, but timing/chunking behavior may be different.

## Recommended Project Structure

### New Files

```
src/mastra/
  claude-code-provider.ts     # ProviderMode type, getClaudeCodeModel(), Claude Code config
```

### Modified Files

```
src/mastra/
  workflow/
    agent-factory.ts           # Add Claude Code branch in model callback
    request-context-types.ts   # Add 'provider-mode' to WorkflowRequestContext
    request-context-helpers.ts # Add getProviderModel() helper, update cost helpers
    workflow-schemas.ts        # providerMode replaces modelMode in schemas
    steps/01-extract.ts        # providerMode instead of modelMode
    steps/02-hypothesize.ts    # providerMode propagation
    steps/02a-dispatch.ts      # providerMode in sub-context
    steps/02b-hypothesize.ts   # providerMode in sub-context
    steps/02c-verify.ts        # providerMode in sub-context
    steps/02d-synthesize.ts    # providerMode in sub-context
    steps/03-answer.ts         # providerMode instead of modelMode
src/hooks/
  use-model-mode.ts -> use-provider-mode.ts  # Three-state selection
src/components/
  model-mode-toggle.tsx -> provider-mode-selector.tsx  # UI update
src/hooks/
  use-solver-workflow.ts       # Send providerMode in body
src/app/api/solve/
  route.ts                     # Skip API key check for Claude Code
```

### Structure Rationale

- **`claude-code-provider.ts` alongside `openrouter.ts`:** Parallel structure -- each provider gets its own module at the `src/mastra/` level. Not inside `workflow/` because the provider is a model concern, not a workflow concern.
- **RequestContext changes are minimal:** One new key (`provider-mode`) replaces one existing key (`model-mode`). The pattern of per-step context creation stays identical.
- **Frontend changes are minimal:** One hook replacement, one component replacement. The data flow through transport/body stays the same shape.

## Anti-Patterns

### Anti-Pattern 1: Creating Claude Code Sessions Per Agent Call

**What people do:** Instantiate a new `claudeCode()` provider for every `agent.generate()` call, potentially with different configs.

**Why it's wrong:** Claude Code sessions have startup overhead (spawning CLI process, authentication handshake). Creating per-call instances adds unnecessary latency. The provider handles session lifecycle internally.

**Do this instead:** Create the model instance once per provider mode resolution and let the provider manage sessions. The `claudeCode('sonnet', opts)` call creates a model reference, not a session -- sessions are created when AI SDK actually calls the model.

### Anti-Pattern 2: Trying to Make Custom Tools Work via Prompt Hacking

**What people do:** Pass tools to the agent and hope Claude Code ignores the unsupported tool parameter, or try to serialize tool definitions into the prompt.

**Why it's wrong:** The AI SDK will error when trying to pass tools to a provider that doesn't support them. Mastra's Agent class will pass the `tools` option through to the underlying `generateText` call.

**Do this instead:** For Claude Code mode, agents that need tool-like behavior should use structured output to return operation instructions, and the step code should execute those operations. Or use the `activeTools` mechanism to disable tools per-call.

### Anti-Pattern 3: Sharing Authentication State Between OpenRouter and Claude Code

**What people do:** Try to unify API key management across both providers.

**Why it's wrong:** OpenRouter uses per-request API keys (user-provided or env). Claude Code uses `claude login` CLI auth (OAuth, stored locally). They are fundamentally different auth models.

**Do this instead:** Keep them completely separate. OpenRouter: `apiKey` in workflow state. Claude Code: pre-authenticated via CLI on the server. The frontend only shows the API key dialog when in OpenRouter mode.

## Scaling Considerations

| Concern | Impact |
|---------|--------|
| Claude Code process lifecycle | Each `claudeCode()` call spawns a CLI process. Multiple concurrent solves may overwhelm the server. Consider limiting concurrency for Claude Code mode. |
| Subscription rate limits | Claude Pro/Max has usage limits. High-frequency agent calls (12+ per solve, multiple solves) may hit these. The provider's `maxTurns` and `maxBudgetUsd` options can help. |
| Server requirement | Claude Code CLI must be installed and authenticated on the server. This limits deployment to environments where you control the server (dev machine, self-hosted). Not suitable for shared/serverless deployment. |

## Build Order

Based on dependency analysis, the recommended implementation order:

1. **Provider types and configuration** (no existing code depends on new types)
   - `claude-code-provider.ts` (new file)
   - Update `request-context-types.ts` (add `provider-mode`)
   - Update `workflow-schemas.ts` (add `providerMode` to schemas)

2. **Agent factory update** (depends on step 1)
   - Update `createWorkflowAgent` in `agent-factory.ts`
   - Update `request-context-helpers.ts`

3. **Step file migration** (depends on step 2)
   - Update all step files to use `providerMode` instead of `modelMode`
   - Update provider propagation logic

4. **API route update** (depends on step 3)
   - Update `route.ts` to handle Claude Code mode (skip API key check)

5. **Frontend update** (can partially parallel with step 3)
   - New `use-provider-mode.ts` hook
   - New `provider-mode-selector.tsx` component
   - Update `use-solver-workflow.ts`

6. **Tool compatibility** (depends on step 2, highest risk)
   - Validate which agents work with Claude Code
   - Implement prompt-only alternatives for tool-using agents in Claude Code mode
   - Likely needs per-agent `tools` override in the factory based on provider mode

7. **Testing and validation** (depends on all above)
   - Manual testing of each agent with Claude Code
   - Verify structured output works with all schemas
   - Verify abort signal propagation

## Sources

- [ai-sdk-provider-claude-code GitHub](https://github.com/ben-vargas/ai-sdk-provider-claude-code) -- Provider source, README, capabilities
- [AI SDK Community Providers: Claude Code](https://ai-sdk.dev/providers/community-providers/claude-code) -- Official AI SDK listing, capabilities matrix
- [Claude Agent SDK Custom Tools](https://platform.claude.com/docs/en/agent-sdk/custom-tools) -- MCP-based custom tool pattern
- [t3ta/claude-code-mastra](https://github.com/t3ta/claude-code-mastra) -- Reference Mastra integration
- [Mastra Agent Class Reference](https://mastra.ai/reference/agents/agent) -- DynamicArgument model pattern
- [Mastra Agent.generate() Reference](https://mastra.ai/reference/agents/generate) -- RequestContext flow
- [Mastra Models Documentation](https://mastra.ai/models) -- AI SDK provider support, MastraModelConfig types
- Installed `@mastra/core@1.8.0` type definitions -- MastraLanguageModel, MastraModelConfig, DynamicArgument type verification

---
*Architecture research for: Claude Code provider integration into LO-Solver v1.6*
*Researched: 2026-03-10*
