# Phase 28: Agent Factory - Research

**Researched:** 2026-03-08
**Domain:** TypeScript factory pattern for Mastra Agent construction
**Confidence:** HIGH

## Summary

This phase is a straightforward refactoring task: extract the repeated Agent constructor boilerplate across 12 agent files into a single `createWorkflowAgent()` factory function. Every agent file follows a nearly identical pattern -- importing `Agent`, `UnicodeNormalizer`, `TESTING_MODEL`, `getOpenRouterProvider`, constructing a `new Agent({...})` with the same model resolver function and input processor config. The factory eliminates this boilerplate while preserving all runtime behavior.

The codebase is well-understood. All 12 agents use one of two patterns: (a) standard agents with `UnicodeNormalizer` input processor and no `requestContextSchema`, or (b) tester agents with `requestContextSchema` and no input processor. The model resolver pattern is identical across all agents: `({ requestContext }) => getOpenRouterProvider(requestContext)(modelId)`. The factory consolidates these patterns with a flat config API.

**Primary recommendation:** Build a thin factory function that accepts a flat config object and returns `new Agent({...})` with the model resolver, UnicodeNormalizer, and common plumbing pre-built. Each agent file becomes a ~10-15 line thin wrapper.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Flat config approach -- no variant/category concept, every property explicitly specified
- Factory eliminates boilerplate (model resolver, UnicodeNormalizer, common imports) without categorizing agents
- `productionModel` and `testingModel` both configurable per agent (testingModel defaults to `TESTING_MODEL` if omitted)
- Factory internally builds the `({ requestContext }) => getOpenRouterProvider(requestContext)(...)` dynamic model resolver
- Instructions accepted as `string | { role: string; content: string }` -- passed through to `new Agent()` without normalization
- `useUnicodeNormalizer` boolean (default `true`) -- factory constructs the UnicodeNormalizer instance when true
- Optional `requestContextSchema` -- passed through to `new Agent()` when provided
- Optional `tools` -- passed through, defaults to `{}`
- Factory does NOT import zod; schema objects are passed in by the agent file
- Keep individual `*-agent.ts` files -- each becomes a thin wrapper calling `createWorkflowAgent()`
- Factory lives at `src/mastra/workflow/agent-factory.ts` (next to agent files, consistent with `agent-utils.ts`)
- `index.ts` stays unchanged -- continues importing from individual agent files and building `workflowAgents` record
- Extract tester agent instructions to separate files: `03a-rule-tester-instructions.ts` and `03a-sentence-tester-instructions.ts` (same `*-instructions.ts` convention)
- Template `{{placeholder}}` replacement stays as pre-processing in agent files, NOT in the factory
- Only 3 agents use it (hypothesizer, synthesizer, improver) with different replacement sets
- Agent files do `.replace()` calls and pass the result to factory
- Factory accommodates tester agents via `useUnicodeNormalizer: false` and `requestContextSchema` params
- All 12 agents go through the factory -- no exceptions
- Zod import stays in tester agent files; factory accepts the schema as an opaque type

### Claude's Discretion
- TypeScript type definition for the factory config object
- Internal implementation details of the factory function
- Order of migration (which agents to migrate first)
- Whether to add JSDoc to the factory function

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STR-04 | Agent factory `createWorkflowAgent()` created handling 3 agent variants (reasoning, extraction, tester) | Factory config type and implementation pattern documented below; flat config handles all variants without categorization |
| STR-05 | All 13 agent definitions migrated to use the factory | Complete agent inventory (12 agents, not 13 -- see note) with per-agent config documented; migration is mechanical |
| STR-06 | Factory preserves dynamic `({ requestContext }) => ...` model resolution pattern | Model resolver construction pattern documented; factory uses `getOpenRouterProvider` + `activeModelId` internally |
| STR-07 | Testing/production model switching verified working after factory migration | Verification approach: `npm run eval -- --problem linguini-1 --mode testing` and `--mode production` with log inspection |

**Note on agent count:** The requirements and success criteria reference "13 agents" but the codebase contains exactly 12 agent files and 12 agent registrations in `index.ts`. The planner should use the actual count of 12.
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mastra/core/agent` | 1.8.0 | `Agent` class constructor | Already in use; factory wraps this |
| `@mastra/core/processors` | 1.8.0 | `UnicodeNormalizer` input processor | Already in use; factory constructs instances |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@openrouter/ai-sdk-provider` | (installed) | Model provider creation | Already in use via `openrouter.ts` |

### Alternatives Considered
None -- this is a pure refactoring of existing code with no new dependencies.

**Installation:**
No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
src/mastra/workflow/
  agent-factory.ts                              # NEW: Factory function
  03a-rule-tester-instructions.ts               # NEW: Extracted from agent file
  03a-sentence-tester-instructions.ts           # NEW: Extracted from agent file
  01-structured-problem-extractor-agent.ts      # MODIFIED: thin wrapper
  02-dispatcher-agent.ts                        # MODIFIED: thin wrapper
  02-improver-dispatcher-agent.ts               # MODIFIED: thin wrapper
  02-initial-hypothesizer-agent.ts              # MODIFIED: thin wrapper
  02-synthesizer-agent.ts                       # MODIFIED: thin wrapper
  03a-rule-tester-agent.ts                      # MODIFIED: thin wrapper
  03a-sentence-tester-agent.ts                  # MODIFIED: thin wrapper
  03a-verifier-orchestrator-agent.ts            # MODIFIED: thin wrapper
  03a2-verifier-feedback-extractor-agent.ts     # MODIFIED: thin wrapper
  03b-rules-improver-agent.ts                   # MODIFIED: thin wrapper
  03b2-rules-improvement-extractor-agent.ts     # MODIFIED: thin wrapper
  04-question-answerer-agent.ts                 # MODIFIED: thin wrapper
  index.ts                                      # UNCHANGED
```

### Pattern 1: Factory Config Type

**What:** A TypeScript interface for the flat config object the factory accepts.

**Key design points:**
- `productionModel` is required (each agent has a different one)
- `testingModel` is optional, defaults to `TESTING_MODEL` constant
- `instructions` accepts `string | { role: string; content: string }` (matches Mastra `SystemMessage` subset)
- `useUnicodeNormalizer` defaults to `true`
- `requestContextSchema` is optional, typed as `z.ZodType<any>` to avoid factory importing Zod
- `tools` is optional, defaults to `{}`

**Example:**
```typescript
// Source: Derived from Mastra Agent constructor docs + codebase patterns

import type { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/tools';
import type { ZodType } from 'zod';

interface WorkflowAgentConfig {
  id: string;
  name: string;
  instructions: string | { role: string; content: string };
  productionModel: string;
  testingModel?: string; // defaults to TESTING_MODEL
  tools?: ToolsInput;
  useUnicodeNormalizer?: boolean; // defaults to true
  requestContextSchema?: ZodType<any>;
}
```

**Confidence:** HIGH -- types derived from Mastra 1.8.0 embedded docs `reference-agents-agent.md` and existing codebase usage.

### Pattern 2: Factory Function Implementation

**What:** The `createWorkflowAgent()` function that builds an Agent from config.

**Key implementation details:**
1. Imports `Agent` from `@mastra/core/agent`, `UnicodeNormalizer` from `@mastra/core/processors`
2. Imports `TESTING_MODEL` from `../openrouter` and `getOpenRouterProvider` from `./request-context-helpers`
3. Builds the model resolver function: `({ requestContext }) => getOpenRouterProvider(requestContext)(resolvedModelId)`
4. Can use `activeModelId()` from `../openrouter` to simplify model resolution internally
5. Conditionally creates `UnicodeNormalizer` instance when `useUnicodeNormalizer !== false`
6. Passes through `requestContextSchema` when provided
7. Returns `new Agent({...})`

**Example:**
```typescript
// Source: Synthesized from codebase patterns

import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { TESTING_MODEL } from '../openrouter';
import { getOpenRouterProvider } from './request-context-helpers';
import type { ModelMode } from '../openrouter';

export function createWorkflowAgent(config: WorkflowAgentConfig): Agent {
  const {
    id,
    name,
    instructions,
    productionModel,
    testingModel = TESTING_MODEL,
    tools = {},
    useUnicodeNormalizer = true,
    requestContextSchema,
  } = config;

  return new Agent({
    id,
    name,
    instructions,
    model: ({ requestContext }) => {
      const mode = requestContext?.get('model-mode') as ModelMode | undefined;
      const modelId = mode === 'production' ? productionModel : testingModel;
      return getOpenRouterProvider(requestContext)(modelId);
    },
    tools,
    ...(useUnicodeNormalizer && {
      inputProcessors: [
        new UnicodeNormalizer({
          stripControlChars: false,
          preserveEmojis: true,
          collapseWhitespace: true,
          trim: true,
        }),
      ],
    }),
    ...(requestContextSchema && { requestContextSchema }),
  });
}
```

**Confidence:** HIGH -- all constituent parts verified against installed Mastra 1.8.0 docs and existing working code.

### Pattern 3: Migrated Agent File (Simple)

**What:** A typical agent file after migration (no template injection, no tools).

**Example:**
```typescript
// 01-structured-problem-extractor-agent.ts
import { createWorkflowAgent } from './agent-factory';
import { STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS } from './01-structured-problem-extractor-instructions';

export const structuredProblemExtractorAgent = createWorkflowAgent({
  id: 'structured-problem-extractor',
  name: '[Step 1] Structured Problem Extractor Agent',
  instructions: STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS,
  productionModel: 'openai/gpt-5-mini',
});
```

### Pattern 4: Migrated Agent File (With Template Injection + Tools)

**What:** Agent files that do `.replace()` on instructions before passing to factory.

**Example:**
```typescript
// 02-initial-hypothesizer-agent.ts
import { createWorkflowAgent } from './agent-factory';
import { INITIAL_HYPOTHESIZER_INSTRUCTIONS } from './02-initial-hypothesizer-instructions';
import { RULES_TOOLS_INSTRUCTIONS } from './rules-tools-prompt';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { rulesTools } from './rules-tools';
import { vocabularyTools } from './vocabulary-tools';
import { testRuleWithRulesetTool } from './03a-rule-tester-tool';
import { testSentenceWithRulesetTool } from './03a-sentence-tester-tool';

const instructions = INITIAL_HYPOTHESIZER_INSTRUCTIONS.replace(
  '{{RULES_TOOLS_INSTRUCTIONS}}',
  RULES_TOOLS_INSTRUCTIONS,
).replace('{{VOCABULARY_TOOLS_INSTRUCTIONS}}', VOCABULARY_TOOLS_INSTRUCTIONS);

export const initialHypothesizerAgent = createWorkflowAgent({
  id: 'initial-hypothesizer',
  name: '[Step 2] Initial Hypothesizer Agent',
  instructions: { role: 'system', content: instructions },
  productionModel: 'google/gemini-3-flash-preview',
  tools: {
    ...vocabularyTools,
    ...rulesTools,
    testRule: testRuleWithRulesetTool,
    testSentence: testSentenceWithRulesetTool,
  },
});
```

### Pattern 5: Migrated Tester Agent File

**What:** Tester agents with `requestContextSchema` and no `UnicodeNormalizer`.

**Example:**
```typescript
// 03a-rule-tester-agent.ts
import { z } from 'zod';
import { createWorkflowAgent } from './agent-factory';
import { RULE_TESTER_INSTRUCTIONS } from './03a-rule-tester-instructions';

export const ruleTesterAgent = createWorkflowAgent({
  id: 'rule-tester',
  name: '[Step 3] Rule Tester Agent',
  instructions: RULE_TESTER_INSTRUCTIONS,
  productionModel: 'openai/gpt-5-mini',
  useUnicodeNormalizer: false,
  requestContextSchema: z.object({
    'model-mode': z.enum(['testing', 'production']),
  }),
});
```

### Anti-Patterns to Avoid
- **Categorizing agents (reasoning/extraction/tester):** The user explicitly chose a flat config. Do not add variant enums or conditional logic based on agent type.
- **Template injection inside the factory:** Keep `.replace()` calls in agent files. The factory knows nothing about prompt templates.
- **Importing Zod in the factory:** `requestContextSchema` is typed as an opaque `ZodType<any>` and passed through. Zod stays in agent files that need it.
- **Creating a shared UnicodeNormalizer instance:** Each agent gets its own instance. This matches current behavior and avoids shared mutable state concerns (though `UnicodeNormalizer` is stateless, matching existing code is safer).

## Complete Agent Inventory

All 12 agents with their distinguishing properties:

| # | File | Export Name | ID | Production Model | Instructions Format | Has Tools | UnicodeNormalizer | RequestContextSchema | Template Injection |
|---|------|-------------|----|-----------------|--------------------|-----------|-------------------|---------------------|--------------------|
| 1 | `01-structured-problem-extractor-agent.ts` | `structuredProblemExtractorAgent` | `structured-problem-extractor` | `openai/gpt-5-mini` | string | No | Yes | No | No |
| 2 | `02-dispatcher-agent.ts` | `dispatcherAgent` | `perspective-dispatcher` | `google/gemini-3-flash-preview` | `{role,content}` | No | Yes | No | No |
| 3 | `02-improver-dispatcher-agent.ts` | `improverDispatcherAgent` | `improver-dispatcher` | `google/gemini-3-flash-preview` | `{role,content}` | No | Yes | No | No |
| 4 | `02-initial-hypothesizer-agent.ts` | `initialHypothesizerAgent` | `initial-hypothesizer` | `google/gemini-3-flash-preview` | `{role,content}` | Yes (rules+vocab+testers) | Yes | No | Yes (2 replacements) |
| 5 | `02-synthesizer-agent.ts` | `synthesizerAgent` | `hypothesis-synthesizer` | `google/gemini-3-flash-preview` | `{role,content}` | Yes (rules+vocab+testers) | Yes | No | Yes (2 replacements) |
| 6 | `03a-verifier-orchestrator-agent.ts` | `verifierOrchestratorAgent` | `verifier-orchestrator` | `google/gemini-3-flash-preview` | string | Yes (testRule+testSentence) | Yes | No | No |
| 7 | `03a-rule-tester-agent.ts` | `ruleTesterAgent` | `rule-tester` | `openai/gpt-5-mini` | string (inline) | No | No | Yes | No |
| 8 | `03a-sentence-tester-agent.ts` | `sentenceTesterAgent` | `sentence-tester` | `openai/gpt-5-mini` | string (inline) | No | No | Yes | No |
| 9 | `03a2-verifier-feedback-extractor-agent.ts` | `verifierFeedbackExtractorAgent` | `verifier-feedback-extractor` | `openai/gpt-5-mini` | `{role,content}` | No | Yes | No | No |
| 10 | `03b-rules-improver-agent.ts` | `rulesImproverAgent` | `rules-improver` | `google/gemini-3-flash-preview` | `{role,content}` | Yes (vocab+testers) | Yes | No | Yes (1 replacement) |
| 11 | `03b2-rules-improvement-extractor-agent.ts` | `rulesImprovementExtractorAgent` | `rules-improvement-extractor` | `openai/gpt-5-mini` | `{role,content}` | No | Yes | No | No |
| 12 | `04-question-answerer-agent.ts` | `questionAnswererAgent` | `question-answerer` | `google/gemini-3-flash-preview` | string | No | Yes | No | No |

**Summary:** 5 use GPT-5-mini, 7 use Gemini 3 Flash. 10 use UnicodeNormalizer, 2 do not (tester agents). 4 have tools. 3 use template injection. 2 have requestContextSchema (tester agents). Tester agents (#7, #8) have inline instructions that need extraction to separate files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model resolution | Custom mode-checking per agent | `activeModelId()` from `openrouter.ts` | Already exists, handles the `production ? prod : testing` logic |
| UnicodeNormalizer config | Copy-paste config per agent | Factory creates instance from fixed config | All 10 agents use identical config |
| Provider lookup | Inline `getOpenRouterProvider(requestContext)(...)` | Factory builds the model function internally | Identical across all 12 agents |

## Common Pitfalls

### Pitfall 1: Return Type Becoming `Agent<any>`
**What goes wrong:** The factory returns `Agent` without preserving the generic type parameters, losing type safety on tool types.
**Why it happens:** `Agent` has generic parameters `Agent<TAgentId, TTools>`. A generic factory function would need complex type inference.
**How to avoid:** Return `Agent` (base type). This matches existing usage -- agent variables are already typed as `Agent` at their usage sites in step files (via `generateWithRetry(agent, ...)`). The generic parameters are not relied upon externally.
**Warning signs:** TypeScript errors at call sites expecting specific tool types.

### Pitfall 2: Mutating Shared UnicodeNormalizer Instance
**What goes wrong:** If a single UnicodeNormalizer instance is shared across all agents, any future stateful behavior could cause cross-agent contamination.
**Why it happens:** Optimizing by creating one instance instead of one per agent.
**How to avoid:** Create a new `UnicodeNormalizer` instance per agent call (current behavior). The constructor is cheap.
**Warning signs:** Unexpected behavior in one agent after another agent processes unusual input.

### Pitfall 3: Breaking Tester Agent Model Resolution
**What goes wrong:** Tester agents use `requestContext?.get('model-mode')` just like other agents, but they have a `requestContextSchema` that validates `model-mode` exists. If the factory model resolver code differs from the current inline pattern, the tester agents may behave differently.
**Why it happens:** Tester agents are called via tool execution with a minimal requestContext (only `model-mode` set), not from the full workflow requestContext.
**How to avoid:** The factory model resolver must handle the case where `requestContext` might be undefined (use optional chaining, same as current code). The `requestContextSchema` is only for Mastra's internal validation, not for the model resolver.
**Warning signs:** Tester agents fail with "requestContext is required" errors during verification step.

### Pitfall 4: Instructions String vs Object Mismatch
**What goes wrong:** Some agents pass instructions as a plain string, others as `{ role: 'system', content: ... }`. Accidentally normalizing or wrapping instructions could change agent behavior.
**Why it happens:** Trying to be "helpful" by always wrapping strings in `{ role: 'system', content: ... }`.
**How to avoid:** Pass instructions through to `new Agent()` exactly as received. Mastra's `Agent` constructor already accepts both formats (verified in embedded docs). The factory type should match: `string | { role: string; content: string }`.
**Warning signs:** Agent behavior subtly changes because system message format affects model interpretation differently.

### Pitfall 5: Forgetting to Extract Tester Instructions
**What goes wrong:** The two tester agent files currently contain their instructions inline (not imported from `*-instructions.ts` files). If you only refactor the Agent construction but leave instructions inline, the files won't follow the project convention.
**Why it happens:** Focus on the factory construction, forgetting the instruction extraction step.
**How to avoid:** Extract `RULE_TESTER_SYSTEM_PROMPT` to `03a-rule-tester-instructions.ts` and `SENTENCE_TESTER_SYSTEM_PROMPT` to `03a-sentence-tester-instructions.ts` before or during migration.
**Warning signs:** Tester agent files are still 60-90 lines instead of ~10-15 lines after migration.

## Code Examples

### Complete Factory Implementation
```typescript
// Source: Synthesized from Mastra 1.8.0 Agent docs + all 12 existing agent files

import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import type { ToolsInput } from '@mastra/core/tools';
import { TESTING_MODEL, type ModelMode } from '../openrouter';
import { getOpenRouterProvider } from './request-context-helpers';

/** Configuration for creating a workflow agent via the factory. */
export interface WorkflowAgentConfig {
  /** Unique agent identifier (e.g., 'structured-problem-extractor'). */
  id: string;
  /** Display name (e.g., '[Step 1] Structured Problem Extractor Agent'). */
  name: string;
  /** System instructions -- string or {role, content} object. Passed through to Agent. */
  instructions: string | { role: string; content: string };
  /** Model ID used in production mode (e.g., 'openai/gpt-5-mini'). */
  productionModel: string;
  /** Model ID used in testing mode. Defaults to TESTING_MODEL. */
  testingModel?: string;
  /** Tools available to the agent. Defaults to {}. */
  tools?: ToolsInput;
  /** Whether to add UnicodeNormalizer input processor. Defaults to true. */
  useUnicodeNormalizer?: boolean;
  /** Zod schema for requestContext validation (tester agents only). */
  requestContextSchema?: import('zod').ZodType<any>;
}

/**
 * Create a workflow agent with standard boilerplate:
 * - Dynamic model resolution via requestContext model-mode
 * - UnicodeNormalizer input processor (when enabled)
 * - OpenRouter provider from requestContext
 */
export function createWorkflowAgent(config: WorkflowAgentConfig): Agent {
  const {
    id,
    name,
    instructions,
    productionModel,
    testingModel = TESTING_MODEL,
    tools = {},
    useUnicodeNormalizer = true,
    requestContextSchema,
  } = config;

  return new Agent({
    id,
    name,
    instructions,
    model: ({ requestContext }) => {
      const mode = requestContext?.get('model-mode') as ModelMode | undefined;
      const modelId = mode === 'production' ? productionModel : testingModel;
      return getOpenRouterProvider(requestContext)(modelId);
    },
    tools,
    ...(useUnicodeNormalizer && {
      inputProcessors: [
        new UnicodeNormalizer({
          stripControlChars: false,
          preserveEmojis: true,
          collapseWhitespace: true,
          trim: true,
        }),
      ],
    }),
    ...(requestContextSchema && { requestContextSchema }),
  });
}
```

### Tester Instructions Extraction
```typescript
// 03a-rule-tester-instructions.ts
// Source: Extracted from 03a-rule-tester-agent.ts inline prompt

export const RULE_TESTER_INSTRUCTIONS = `
You are a specialized linguistic rule validator...
`.trim();
```

```typescript
// 03a-sentence-tester-instructions.ts
// Source: Extracted from 03a-sentence-tester-agent.ts inline prompt

export const SENTENCE_TESTER_INSTRUCTIONS = `
You are a specialized linguistic sentence translator and validator...
`.trim();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 12 files each with ~20-50 lines of identical boilerplate | Single factory + 12 thin wrappers | Phase 28 | ~300 lines of boilerplate eliminated |

**Unchanged patterns:**
- `Agent` constructor API is stable in Mastra 1.8.0
- `UnicodeNormalizer` API is stable
- Model resolver function signature (`({ requestContext }) => ...`) is stable
- `requestContextSchema` property is documented and stable

## Open Questions

1. **Agent count: 12 or 13?**
   - What we know: The codebase has exactly 12 agent files and 12 registrations in `index.ts`. The CONTEXT.md says "12 agents."
   - What's unclear: The REQUIREMENTS.md STR-05 says "All 13 agent definitions" and the success criteria say "All 13 `*-agent.ts` files."
   - Recommendation: Use the actual count of 12. The "13" in requirements is likely a count error from an earlier state of the codebase (the deprecated `02a-initial-hypothesis-extractor-agent.ts` was removed in Phase 27 CLN-01). The planner should note 12 agents.

2. **`ToolsInput` type import path**
   - What we know: Existing agent files use inline tool objects without importing `ToolsInput` type. The factory config needs this type for the `tools` property.
   - What's unclear: The exact export path for `ToolsInput` from `@mastra/core`.
   - Recommendation: Check `@mastra/core/tools` for `ToolsInput` type export. If not available, use `Record<string, any>` or infer from existing tool usage patterns. The type can also be derived as `Agent['tools']` or `Parameters<typeof Agent>[0]['tools']`.

## Sources

### Primary (HIGH confidence)
- Mastra 1.8.0 embedded docs: `reference-agents-agent.md` -- Agent constructor parameters, instructions types, model resolver signature
- Mastra 1.8.0 embedded docs: `reference-processors-unicode-normalizer.md` -- UnicodeNormalizer constructor options
- All 12 agent source files in `src/mastra/workflow/` -- current boilerplate patterns (read in full)
- `src/mastra/openrouter.ts` -- `TESTING_MODEL`, `activeModelId()`, `ModelMode` type
- `src/mastra/workflow/request-context-helpers.ts` -- `getOpenRouterProvider()` function
- `src/mastra/workflow/index.ts` -- agent registration pattern (unchanged by this phase)

### Secondary (MEDIUM confidence)
- None needed -- all findings verified from installed source code and embedded docs

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all APIs verified against installed Mastra 1.8.0 embedded docs
- Architecture: HIGH -- factory pattern is straightforward; all 12 agent files read and cataloged
- Pitfalls: HIGH -- identified from direct code analysis, not speculation

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable refactoring, no external API changes expected)
