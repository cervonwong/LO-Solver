# Architecture Research

**Domain:** Mastra workflow refactoring and prompt engineering — LO-Solver v1.5
**Researched:** 2026-03-08
**Confidence:** HIGH

## Overview

This document maps the integration points for v1.5 refactoring changes: file splitting in `02-hypothesize.ts`, agent factory pattern, schema reorganization, and `request-context-helpers.ts` decomposition. All analysis is grounded in direct inspection of the existing codebase.

---

## Current System Layout

```
src/mastra/workflow/
├── [agent files]              # 13 agent definitions (24-93 lines each)
│   ├── 01-structured-problem-extractor-agent.ts
│   ├── 02-dispatcher-agent.ts
│   ├── 02-improver-dispatcher-agent.ts
│   ├── 02-initial-hypothesizer-agent.ts
│   ├── 02-synthesizer-agent.ts
│   ├── 02a-initial-hypothesis-extractor-agent.ts  (DEPRECATED)
│   ├── 03a-rule-tester-agent.ts
│   ├── 03a-sentence-tester-agent.ts
│   ├── 03a-verifier-orchestrator-agent.ts
│   ├── 03a2-verifier-feedback-extractor-agent.ts
│   ├── 03b-rules-improver-agent.ts
│   ├── 03b2-rules-improvement-extractor-agent.ts
│   └── 04-question-answerer-agent.ts
├── [instructions files]       # One per agent (50-161 lines each)
├── [tool files]               # vocabulary-tools.ts, rules-tools.ts, tester tools
├── agent-utils.ts             # generateWithRetry + streamWithRetry (331 lines)
├── logging-utils.ts           # Markdown log writers (302 lines)
├── request-context-helpers.ts # All context accessors + cost tracking + draft stores (440 lines)
├── request-context-types.ts   # WorkflowRequestContext interface (79 lines)
├── workflow-schemas.ts        # All Zod schemas + initializeWorkflowState (407 lines)
├── index.ts                   # Re-exports agents and tools
├── shared-memory.ts           # (unclear purpose, needs audit)
├── workflow.ts                # Workflow composition (pipeline assembly)
└── steps/
    ├── 01-extract.ts          # Step 1: extraction (166 lines)
    ├── 02-hypothesize.ts      # Step 2: full hypothesis loop (1,240 lines) <-- PRIMARY TARGET
    └── 03-answer.ts           # Step 3: question answering (179 lines)
```

---

## System Overview — After Refactoring

```
src/mastra/workflow/
├── agents/                    # (optional: move agent files here)
│   └── ...                    # or leave flat with factory pattern applied
│
├── steps/
│   ├── 01-extract.ts          # (unchanged)
│   ├── 02-hypothesize.ts      # Thin coordinator — orchestrates sub-phases
│   ├── 02a-dispatch.ts        # Sub-phase: dispatch (rounds 1 and 2+)
│   ├── 02b-hypothesize.ts     # Sub-phase: parallel hypothesizer execution
│   ├── 02c-verify.ts          # Sub-phase: per-perspective verification scoring
│   ├── 02d-synthesize.ts      # Sub-phase: synthesis + convergence check
│   └── 03-answer.ts           # (unchanged)
│
├── schemas/                   # (optional: schema split by domain)
│   ├── workflow-state.ts      # workflowStateSchema, initializeWorkflowState
│   ├── problem.ts             # structuredProblemDataSchema, structuredProblemSchema
│   ├── hypothesis.ts          # dispatcher, perspective, hypothesis-loop schemas
│   ├── verification.ts        # verifierFeedbackSchema, roundResult, verificationMetadata
│   └── answers.ts             # questionsAnsweredSchema, questionAnsweringInputSchema
│   (or keep as single workflow-schemas.ts — see Architecture note below)
│
├── context/                   # (optional: context helper split by domain)
│   ├── vocabulary.ts          # getVocabularyState, getVocabularyArray
│   ├── rules.ts               # getRulesState, getRulesArray, getCurrentRules
│   ├── draft-stores.ts        # createDraftStore, getDraftStore, mergeDraftToMain, clearAllDraftStores
│   ├── trace.ts               # emitTraceEvent, emitToolTraceEvent
│   ├── cost.ts                # extractCostFromResult, updateCumulativeCost
│   └── accessors.ts           # getLogFile, getWorkflowStartTime, getParentAgentId, etc.
│   (or keep as single request-context-helpers.ts — see Architecture note below)
│
├── agent-factory.ts           # createWorkflowAgent() factory
├── agent-utils.ts             # (unchanged)
├── logging-utils.ts           # (unchanged)
├── openrouter.ts              # (unchanged — lives in src/mastra/)
├── request-context-helpers.ts # (kept or decomposed)
├── request-context-types.ts   # (unchanged)
├── vocabulary-tools.ts        # (unchanged)
├── rules-tools.ts             # (unchanged)
├── workflow-schemas.ts        # (kept or decomposed)
└── index.ts                   # (re-export agents — updated if factory applied)
```

---

## Component Responsibilities

### What Each Piece Does Today (and After Refactoring)

| Component | Today | After Refactoring |
|-----------|-------|-------------------|
| `02-hypothesize.ts` | 1,240-line monolith: dispatch + hypothesize + verify + synthesize + convergence loop | Thin coordinator: imports sub-phase functions, calls them in sequence, manages round loop |
| `02a-dispatch.ts` | Does not exist | Sub-phase: resolve perspectives from dispatcher or improver-dispatcher agent |
| `02b-hypothesize.ts` | Does not exist | Sub-phase: parallel hypothesizer execution per perspective |
| `02c-verify.ts` | Does not exist | Sub-phase: per-perspective verification + feedback extraction |
| `02d-synthesize.ts` | Does not exist | Sub-phase: vocabulary merge, synthesizer call, convergence check |
| `workflow-schemas.ts` | Single file, 407 lines, all schemas | Either stays flat or splits into domain files |
| `request-context-helpers.ts` | Single file, 440 lines, all helpers | Either stays flat or splits into domain files |
| Agent files (13 files) | ~24-93 lines each; duplicated constructor boilerplate | Same behaviour with factory reducing 15-20 lines per agent |
| `agent-factory.ts` | Does not exist | `createWorkflowAgent()` — centralized Agent constructor |

---

## Architectural Patterns

### Pattern 1: Sub-Phase Function Extraction (02-hypothesize.ts split)

**What:** The 1,240-line step is reorganized into a thin coordinator plus four sub-phase modules. Each sub-phase exports a single async function that receives exactly the data it needs and returns exactly what the coordinator needs.

**When to use:** When a step contains multiple logically independent phases each large enough to warrant their own file (target: ~200-300 lines per sub-phase).

**Interface contract — sub-phases must accept and return plain data, not the step's full closure scope:**

```typescript
// 02a-dispatch.ts — new file
export async function runDispatchPhase(params: {
  structuredProblem: StructuredProblemData;
  round: number;
  effectivePerspectiveCount: number;
  mainRules: Map<string, Rule>;
  mainVocabulary: Map<string, VocabularyEntry>;
  lastTestResults: unknown;
  previousPerspectiveIds: string[];
  modelMode: ModelMode;
  requestContext: RequestContext<WorkflowRequestContext>;
  writer: StepWriter | undefined;
  abortSignal: AbortSignal | undefined;
  logFile: string;
  workflowStartTime: number;
  mastra: Mastra;  // or typed agent getter
}): Promise<{ perspectives: Perspective[]; timing: StepTiming } | null>

// 02b-hypothesize.ts — new file
export async function runHypothesizePhase(params: {
  perspectives: Perspective[];
  round: number;
  isImproverRound: boolean;
  structuredProblem: StructuredProblemData;
  mainRequestContext: RequestContext<WorkflowRequestContext>;
  draftStores: Map<string, DraftStore>;
  mainRules: Map<string, Rule>;
  mainVocabulary: Map<string, VocabularyEntry>;
  modelMode: ModelMode;
  writer: StepWriter | undefined;
  abortSignal: AbortSignal | undefined;
  logFile: string;
  workflowStartTime: number;
  mastra: Mastra;
}): Promise<HypothesisResult[]>

// 02c-verify.ts — new file
export async function runVerifyPhase(params: {
  hypothesisResults: HypothesisResult[];
  round: number;
  structuredProblem: StructuredProblemData;
  mainRequestContext: RequestContext<WorkflowRequestContext>;
  modelMode: ModelMode;
  writer: StepWriter | undefined;
  abortSignal: AbortSignal | undefined;
  logFile: string;
  workflowStartTime: number;
  mastra: Mastra;
}): Promise<PerspectiveResult[]>

// 02d-synthesize.ts — new file
export async function runSynthesizePhase(params: {
  perspectiveResults: PerspectiveResult[];
  sortedResults: PerspectiveResult[];
  draftStores: Map<string, DraftStore>;
  mainRules: Map<string, Rule>;
  mainVocabulary: Map<string, VocabularyEntry>;
  structuredProblem: StructuredProblemData;
  round: number;
  mainRequestContext: RequestContext<WorkflowRequestContext>;
  modelMode: ModelMode;
  writer: StepWriter | undefined;
  abortSignal: AbortSignal | undefined;
  logFile: string;
  workflowStartTime: number;
  mastra: Mastra;
}): Promise<{
  converged: boolean;
  convergencePassRate: number;
  convergenceConclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
  lastTestResults: VerifierFeedback | null;
  finalFeedback: VerifierFeedback | null;
}>
```

**Critical constraint: shared mutable state.** The `mainRules` and `mainVocabulary` Maps are mutated across sub-phases (hypothesizers write to drafts, synthesize writes to main). Sub-phases must receive the live Map references, not copies. The coordinator holds the Maps and passes references into each sub-phase call.

**Trade-offs:**
- Pro: Each sub-phase is independently readable, reviewable, and testable
- Pro: Reduces cognitive load for prompt engineering changes in sub-phases
- Con: Function signatures are verbose (many parameters); consider a `RoundContext` object
- Con: Requires careful naming to avoid ambiguity between the step file and sub-phase files

---

### Pattern 2: Agent Factory

**What:** A `createWorkflowAgent()` factory centralizes the repeated `new Agent({...})` boilerplate. All 13 agents use identical `inputProcessors` (UnicodeNormalizer) and identical `model` selection logic (production/testing via requestContext). The factory captures this once.

**When to use:** When 10+ agents share identical structural boilerplate with only `id`, `name`, `instructions`, and `tools` varying.

**Example — current boilerplate (repeated 10 times across agents with UnicodeNormalizer):**

```typescript
// Current: 02-dispatcher-agent.ts (34 lines)
import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { DISPATCHER_INSTRUCTIONS } from './02-dispatcher-instructions';
import { TESTING_MODEL } from '../openrouter';
import { getOpenRouterProvider } from './request-context-helpers';

export const dispatcherAgent = new Agent({
  id: 'perspective-dispatcher',
  name: '[Step 2] Perspective Dispatcher Agent',
  instructions: { role: 'system', content: DISPATCHER_INSTRUCTIONS },
  model: ({ requestContext }) =>
    getOpenRouterProvider(requestContext)(
      requestContext?.get('model-mode') === 'production'
        ? 'google/gemini-3-flash-preview'
        : TESTING_MODEL,
    ),
  tools: {},
  inputProcessors: [new UnicodeNormalizer({ ... })],
});
```

**After factory:**

```typescript
// agent-factory.ts — new file
import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { TESTING_MODEL, getOpenRouterProvider } from '../openrouter';
import type { Tool } from '@mastra/core/tools';

interface WorkflowAgentConfig {
  id: string;
  name: string;
  instructions: string | { role: string; content: string };
  productionModel: string;
  tools?: Record<string, Tool>;
  skipUnicodeNormalizer?: boolean;   // for tester agents that use requestContextSchema
  requestContextSchema?: z.ZodObject<any>;
}

export function createWorkflowAgent(config: WorkflowAgentConfig): Agent {
  return new Agent({
    id: config.id,
    name: config.name,
    instructions: typeof config.instructions === 'string'
      ? config.instructions
      : config.instructions,
    model: ({ requestContext }) =>
      getOpenRouterProvider(requestContext)(
        requestContext?.get('model-mode') === 'production'
          ? config.productionModel
          : TESTING_MODEL,
      ),
    tools: config.tools ?? {},
    ...(config.requestContextSchema && { requestContextSchema: config.requestContextSchema }),
    ...(!config.skipUnicodeNormalizer && {
      inputProcessors: [new UnicodeNormalizer({
        stripControlChars: false,
        preserveEmojis: true,
        collapseWhitespace: true,
        trim: true,
      })],
    }),
  });
}
```

```typescript
// 02-dispatcher-agent.ts — after factory (13 lines vs 34 lines)
import { createWorkflowAgent } from './agent-factory';
import { DISPATCHER_INSTRUCTIONS } from './02-dispatcher-instructions';

export const dispatcherAgent = createWorkflowAgent({
  id: 'perspective-dispatcher',
  name: '[Step 2] Perspective Dispatcher Agent',
  instructions: { role: 'system', content: DISPATCHER_INSTRUCTIONS },
  productionModel: 'google/gemini-3-flash-preview',
});
```

**Agent variants handled by factory:**

| Variant | Agents | Factory Config |
|---------|--------|----------------|
| Reasoning agents (Gemini, with UnicodeNormalizer) | dispatcher, improver-dispatcher, synthesizer, hypothesizer, verifier-orchestrator, rules-improver, answerer | Default: no extra config |
| Extraction agents (GPT-5-mini, with UnicodeNormalizer) | structured-problem-extractor, hypothesis-extractor, feedback-extractor, improvement-extractor | `productionModel: 'openai/gpt-5-mini'` |
| Tester agents (GPT-5-mini, no UnicodeNormalizer, has requestContextSchema) | rule-tester, sentence-tester | `skipUnicodeNormalizer: true, requestContextSchema: z.object({...})` |

**Trade-offs:**
- Pro: UnicodeNormalizer config and model-selection logic defined once
- Pro: New agents are 10-15 lines instead of 30-50
- Con: Factory adds one layer of indirection; agent files no longer show complete Agent config
- Con: Agents with `requestContextSchema` need special handling in factory signature

---

### Pattern 3: Schema Reorganization Decision

**What:** `workflow-schemas.ts` (407 lines) groups all Zod schemas. The refactoring option is to split into domain files. The question is whether splitting aids maintainability or creates import fragmentation.

**Analysis of current grouping:**

```
workflow-schemas.ts contains:
  - ruleSchema, rulesArraySchema                         (core, referenced everywhere)
  - workflowStateSchema, initializeWorkflowState         (state management)
  - rawProblemInputSchema                                (API boundary)
  - structuredProblemDataSchema, structuredProblemSchema (step 1 output)
  - rulesSchema                                          (hypothesis extraction)
  - verifierFeedbackSchema, issueSchema, missingRuleSchema (step 3 verification)
  - questionsAnsweredSchema, questionAnswerSchema         (step 3 output)
  - hypothesisTestLoopSchema, initialHypothesisInputSchema (legacy, unused by current step 2)
  - roundResultSchema, verificationMetadataSchema        (metadata tracking)
  - questionAnsweringInputSchema                         (step 2 → step 3 interface)
  - perspectiveSchema, dispatcherOutputSchema            (dispatch sub-phase)
  - perspectiveResultSchema, synthesisInputSchema        (synthesis sub-phase)
  - improverDispatcherOutputSchema                       (dispatch sub-phase, round 2+)
```

**Recommendation: Keep as single file for this milestone.** The schemas are 407 lines across 17 schema groups. Splitting into 4-5 files creates 6-8 cross-file imports per consumer (each step file currently imports 5-8 schemas from one place). The split adds maintenance overhead without proportional readability gain at this scale.

**If splitting is attempted anyway, the natural domain groupings are:**

| File | Contents | Imports from |
|------|----------|--------------|
| `schemas/core.ts` | ruleSchema, rulesArraySchema, vocabularyEntrySchema | vocabulary-tools.ts |
| `schemas/workflow-state.ts` | workflowStateSchema, initializeWorkflowState, rawProblemInputSchema | core.ts, logging-utils.ts |
| `schemas/problem.ts` | structuredProblemDataSchema, structuredProblemSchema | core.ts |
| `schemas/hypothesis.ts` | dispatcherOutputSchema, perspectiveSchema, perspectiveResultSchema, synthesisInputSchema, improverDispatcherOutputSchema, hypothesisTestLoopSchema | core.ts, problem.ts |
| `schemas/verification.ts` | verifierFeedbackSchema, roundResultSchema, verificationMetadataSchema, questionAnsweringInputSchema | core.ts, hypothesis.ts |
| `schemas/answers.ts` | questionsAnsweredSchema, questionAnswerSchema | core.ts |

**Critical import chain issue:** `vocabularyEntrySchema` lives in `vocabulary-tools.ts`. Any schema file referencing it must import from there. Currently `workflow-schemas.ts` imports from `vocabulary-tools.ts`; splitting does not change this dependency, it only distributes it.

---

### Pattern 4: request-context-helpers.ts Decomposition Decision

**What:** `request-context-helpers.ts` (440 lines) contains 6 distinct concern groups. The split option separates these into domain files.

**Analysis of current concern groups:**

```
request-context-helpers.ts contains:
  Group 1: Type definitions (ToolExecuteContext, RequestContextGetter)  — 10 lines
  Group 2: OpenRouter provider accessor (getOpenRouterProvider)          — 10 lines
  Group 3: Vocabulary accessors (getVocabularyState, getVocabularyArray) — 20 lines
  Group 4: Problem/rules accessors (getStructuredProblem, getCurrentRules, etc.) — 40 lines
  Group 5: Trace event emitters (emitTraceEvent, emitToolTraceEvent)    — 65 lines
  Group 6: Cost tracking (extractCostFromResult, updateCumulativeCost)  — 55 lines
  Group 7: Rules state helpers (getRulesState, getRulesArray)           — 20 lines
  Group 8: Draft store helpers (createDraftStore, getDraftStore, etc.)  — 150 lines
  Group 9: Utility (normalizeTranslation)                               — 10 lines
```

**Import surface analysis:**

| Importer | Functions imported |
|----------|--------------------|
| `02-hypothesize.ts` | emitTraceEvent, createDraftStore, clearAllDraftStores, extractCostFromResult, updateCumulativeCost |
| `01-extract.ts` | emitTraceEvent, extractCostFromResult, updateCumulativeCost |
| `03-answer.ts` | emitTraceEvent, extractCostFromResult, updateCumulativeCost |
| `vocabulary-tools.ts` | getVocabularyState, getLogFile, emitToolTraceEvent, getWorkflowStartTime, ToolExecuteContext |
| `rules-tools.ts` | getRulesState, getLogFile, emitToolTraceEvent, getWorkflowStartTime, ToolExecuteContext |
| `03a-rule-tester-tool.ts` | getCurrentRules, getStructuredProblem, getVocabularyState, emitToolTraceEvent, normalizeTranslation, ToolExecuteContext |
| `03a-sentence-tester-tool.ts` | getCurrentRules, getStructuredProblem, getVocabularyState, emitToolTraceEvent, normalizeTranslation, ToolExecuteContext |
| Agent files (13) | getOpenRouterProvider (only) |

**Recommendation: Keep as single file for this milestone.** The 440-line file is dense but all functions are related to one concept: accessing workflow context. The split into domain files would create 6 files where each tool file imports from 3-4 of them. The current single import `from './request-context-helpers'` is simpler than `from './context/trace'`, `from './context/vocabulary'`, `from './context/rules'`. The only genuine win would be splitting the 150-line draft store section into its own file if it grows.

**If draft stores are extracted (the clearest split candidate):**

```typescript
// context/draft-stores.ts — new file (150 lines)
// Exports: createDraftStore, getDraftStore, getAllDraftStores,
//          mergeDraftToMain, clearAllDraftStores,
//          getDraftVocabularyState, getDraftRulesState

// request-context-helpers.ts — reduced to ~290 lines
// Re-exports draft-stores.ts functions for backward compatibility
export {
  createDraftStore, getDraftStore, getAllDraftStores,
  mergeDraftToMain, clearAllDraftStores,
  getDraftVocabularyState, getDraftRulesState,
} from './context/draft-stores';
```

---

### Pattern 5: Type Safety Improvements

**What:** Tools use `context as unknown as ToolExecuteContext` pattern throughout. The `updateCumulativeCost` function accepts `{ get: (key: any) => any; set: (key: any, value: any) => void }`. These `any` types can be narrowed.

**Current pattern in all tool execute functions (17 occurrences):**

```typescript
execute: async (_inputData, context) => {
  const ctx = context as unknown as ToolExecuteContext;
  // ...
}
```

**Why this exists:** Mastra's `createTool` execute signature types `context` as `BaseExecuteContext` which does not include `requestContext`. The `as unknown as ToolExecuteContext` is a necessary type assertion because Mastra does not expose typed tool context generics in the public API.

**Improvement approach:** Narrow the `ToolExecuteContext` type and `RequestContextGetter` to avoid `any` in `updateCumulativeCost`:

```typescript
// Before (in request-context-helpers.ts)
export async function updateCumulativeCost(
  requestContext: { get: (key: any) => any; set: (key: any, value: any) => void },
  ...

// After: use the actual WorkflowRequestContext keys
export async function updateCumulativeCost(
  requestContext: {
    get: (key: keyof WorkflowRequestContext) => WorkflowRequestContext[keyof WorkflowRequestContext];
    set: <K extends keyof WorkflowRequestContext>(key: K, value: WorkflowRequestContext[K]) => void;
  },
  ...
```

**The `context as unknown as ToolExecuteContext` assertions in tools cannot be eliminated without Mastra exposing typed context generics.** The improvement is to ensure `ToolExecuteContext` is as precise as possible, not to remove the assertion.

---

### Pattern 6: Prompt Engineering Integration

**What:** All 19 agent prompts (13 Mastra `*-instructions.ts` files + 6 Claude Code markdown agents) are rewritten using vendor-specific best practices. This is purely additive — no structural changes to agent files, tools, schemas, or workflow.

**Integration points:**

- **Mastra agents:** Each `*-instructions.ts` file is rewritten in isolation. The agent file (`*-agent.ts`) is unchanged except for the imported constant.
- **Template literal injection:** Three agents inject `{{RULES_TOOLS_INSTRUCTIONS}}` and/or `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` via `.replace()` in their agent file. This mechanism stays identical; only the base instruction constant changes.
- **Claude Code agents:** Six markdown files in `claude-code/.claude/agents/` rewritten. No TypeScript code touched.

**Agents using template injection (must preserve `.replace()` calls):**

| Agent file | Template variables |
|------------|-------------------|
| `02-initial-hypothesizer-agent.ts` | `{{RULES_TOOLS_INSTRUCTIONS}}`, `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` |
| `02-synthesizer-agent.ts` | `{{RULES_TOOLS_INSTRUCTIONS}}`, `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` |
| `03b-rules-improver-agent.ts` | `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` |

---

## Data Flow — How Refactoring Changes Data Movement

### Current flow in 02-hypothesize.ts (all in one closure):

```
createStep.execute closure
  └─ mainRequestContext (RequestContext) — shared mutable object
  └─ mainRules (Map<string, Rule>)       — direct reference
  └─ mainVocabulary (Map<string, VocabularyEntry>) — direct reference
  └─ draftStores (Map<string, DraftStore>)
       Round loop:
         a. dispatch phase — writes nothing to maps, gets perspectives[]
         b. hypothesize — each perspective creates draft store, writes to draft maps
         c. verify — reads draft maps (read-only), produces PerspectiveResult[]
         d. synthesize — clears mainRules, clears mainVocab, synthesizer writes to main
         e. convergence — reads main maps, produces converged bool
```

### After split (sub-phases with passed references):

```
02-hypothesize.ts (coordinator)
  Owns: mainRequestContext, mainRules, mainVocabulary, draftStores
  Passes by reference to sub-phases — Maps are mutated in place by sub-phases

  02a-dispatch.ts — reads main maps (for prompt construction), returns perspectives[]
  02b-hypothesize.ts — creates draft stores (writes to draftStores map), returns HypothesisResult[]
  02c-verify.ts — reads draft stores (read-only), returns PerspectiveResult[]
  02d-synthesize.ts — mutates mainRules and mainVocabulary, returns convergence result
```

**No serialization occurs.** Sub-phases receive live Map references. This is identical semantics to the current single-closure approach — just reorganized into functions.

---

## Integration Points

### New Components

| Component | Type | Integrates With |
|-----------|------|-----------------|
| `02a-dispatch.ts` | New sub-phase module | Imported by `02-hypothesize.ts`; calls dispatcher/improver-dispatcher via `mastra.getAgentById()` |
| `02b-hypothesize.ts` | New sub-phase module | Imported by `02-hypothesize.ts`; calls initial-hypothesizer via `mastra.getAgentById()` |
| `02c-verify.ts` | New sub-phase module | Imported by `02-hypothesize.ts`; calls verifier-orchestrator + verifier-feedback-extractor |
| `02d-synthesize.ts` | New sub-phase module | Imported by `02-hypothesize.ts`; calls hypothesis-synthesizer + convergence verifier |
| `agent-factory.ts` | New utility | Imported by all 13 `*-agent.ts` files (replaces direct `new Agent()`) |

### Modified Components

| Component | Nature of Change | Risk |
|-----------|-----------------|------|
| `steps/02-hypothesize.ts` | Refactored from 1,240 lines to ~150-line coordinator | HIGH — primary change; all sub-phase logic moved out |
| All 13 `*-agent.ts` files | `new Agent({...})` replaced with `createWorkflowAgent({...})` | LOW — purely structural; exports unchanged |
| All 13 `*-instructions.ts` files | Prompt content rewritten | MEDIUM — behavior change; eval before and after |
| 6 Claude Code `*.md` agent files | Prompt content rewritten | MEDIUM — behavior change; manual test before and after |

### Unchanged Components

| Component | Why Unchanged |
|-----------|---------------|
| `steps/01-extract.ts` | Clean, focused, no splitting needed |
| `steps/03-answer.ts` | Clean, focused, no splitting needed |
| `workflow.ts` | Pipeline assembly — imports steps by name, steps' public exports unchanged |
| `workflow-schemas.ts` | Kept flat (see Pattern 3) |
| `request-context-helpers.ts` | Kept flat unless draft stores extracted (see Pattern 4) |
| `request-context-types.ts` | No changes |
| `agent-utils.ts` | No changes |
| `logging-utils.ts` | No changes |
| `vocabulary-tools.ts` | No changes |
| `rules-tools.ts` | No changes |
| `03a-rule-tester-tool.ts` | No changes |
| `03a-sentence-tester-tool.ts` | No changes |
| `index.ts` | Updated only if factory changes agent export shape (it won't) |
| All frontend components | No changes for refactoring phase |
| Eval system | No changes |

---

## Build Order

Build order is determined by dependency direction: factories before agents, sub-phases before coordinator, schema changes before anything that imports them.

### Phase 1: Dead Code Removal (no dependencies — do first)

1. **Audit `shared-memory.ts`** — determine if it is used; remove if not
2. **Remove or mark DEPRECATED** the `02a-initial-hypothesis-extractor-agent.ts` and its instructions file — `index.ts` marks it deprecated but it is still exported
3. **Remove `hypothesisTestLoopSchema` and `initialHypothesisInputSchema`** from `workflow-schemas.ts` if unused by any live code path

**Why first:** Removing dead code reduces the surface area for all subsequent changes. Less to move when splitting files.

### Phase 2: Agent Factory (low risk, no runtime behaviour change)

4. **Create `agent-factory.ts`** — implement `createWorkflowAgent()`
5. **Migrate all agent files** to use factory — one agent at a time, verify `npx tsc --noEmit` after each

**Why second:** Factory must exist before any agent can be migrated. Migrating agents is low-risk (no behaviour change) and reduces file sizes before prompt rewrites, making instructions files easier to review.

### Phase 3: 02-hypothesize.ts Split (highest risk — do before prompt changes)

6. **Create `02a-dispatch.ts`** — extract dispatch phase function
7. **Create `02b-hypothesize.ts`** — extract parallel hypothesize phase function
8. **Create `02c-verify.ts`** — extract per-perspective verify phase function
9. **Create `02d-synthesize.ts`** — extract synthesize + convergence phase function
10. **Refactor `02-hypothesize.ts`** to thin coordinator importing sub-phases
11. **Verify `npx tsc --noEmit`** after each sub-phase extraction, not just at the end

**Why third:** Structural splits must happen before prompt engineering. If you rewrite prompts first and then split, you have to move rewritten content around. Split first on unchanged prompts — easier to verify correctness since behaviour is unchanged.

**Extraction order within step 3:** Extract sub-phases in pipeline order (dispatch first, synthesize last) so that each extracted function can be verified in isolation against the still-monolithic remainder.

### Phase 4: Mastra Prompt Engineering

12. **Rewrite `01-structured-problem-extractor-instructions.ts`** — baseline extractor
13. **Rewrite dispatcher and hypothesizer instructions** (`02-dispatcher`, `02-initial-hypothesizer`) — core of the pipeline
14. **Rewrite synthesizer and improver-dispatcher instructions**
15. **Rewrite verifier and feedback extractor instructions** (`03a-*`)
16. **Rewrite rules improver and improvement extractor instructions** (`03b-*`)
17. **Rewrite question answerer instructions** (`04-*`)
18. **Run eval after each agent group** — measure regression or improvement

**Why this order within prompt engineering:** Extract-first agents are lower risk (GPT-5-mini, structured output, less creative latitude). Reasoning agents (Gemini) have more complex prompts and benefit from seeing extractor changes first to align on data formats.

### Phase 5: Claude Code Prompt Engineering

19. **Rewrite all 6 Claude Code agent markdown files** — orchestrator last (depends on subagent formats)

**Why fifth:** Claude Code solver is independent of Mastra. Doing it after Mastra avoids context switching. The subagent formats (extractor, hypothesizer, etc.) should be rewritten before the orchestrator since orchestrator prompts reference subagent output formats.

### Phase 6: Type Safety Improvements (lowest priority)

20. **Tighten `updateCumulativeCost` signature** — replace `any` with typed accessors
21. **Audit and narrow `ToolExecuteContext` interface** — ensure it matches actual Mastra execute context shape
22. **Frontend component cleanup** if identified (DevTracePanel, event handlers)

**Why last:** Type safety changes are correctness improvements, not functional changes. They are safe to defer and do not unblock other phases.

---

## Anti-Patterns

### Anti-Pattern 1: Extracting Sub-Phases with Copied Data Instead of Map References

**What people do:** Copy `Array.from(mainRules.values())` into the sub-phase function signature instead of passing the live `Map<string, Rule>` reference.

**Why it's wrong:** The current architecture relies on Maps being mutated in place. The synthesizer writes rules via CRUD tools that access the Map directly through `requestContext`. Passing copies breaks this — the synthesizer's tool writes go to the copy, not the Map the coordinator reads after synthesis.

**Do this instead:** Pass the live Map references. Sub-phase function signatures should accept `mainRules: Map<string, Rule>` and `mainVocabulary: Map<string, VocabularyEntry>` by reference.

---

### Anti-Pattern 2: Adding a Sub-Phase Index File

**What people do:** Create `steps/02-phases/index.ts` that re-exports all four sub-phase functions.

**Why it's wrong:** The sub-phases are internal to `02-hypothesize.ts`. They are not part of any public API. Adding an index file creates a false impression that they are importable by other consumers, and adds a re-export layer with no benefit.

**Do this instead:** The coordinator (`02-hypothesize.ts`) imports directly from the individual sub-phase files. No index.

---

### Anti-Pattern 3: Rewriting Prompts Before Splitting 02-hypothesize.ts

**What people do:** Rewrite the 13 Mastra agent instructions first (exciting work), then attempt to split the monolithic step file.

**Why it's wrong:** Splitting the file requires careful reading and understanding of the current logic. Simultaneous prompt changes make it harder to verify that the split did not accidentally change behavior. Bugs introduced during the split are harder to isolate from prompt-change regressions.

**Do this instead:** Split the file on unchanged prompts, run evals to confirm identical behavior, then rewrite prompts.

---

### Anti-Pattern 4: Splitting workflow-schemas.ts Without Checking Import Graph

**What people do:** Split schemas into domain files, then discover that `workflowStateSchema` needs `ruleSchema` (core), `vocabularyEntrySchema` (from vocabulary-tools.ts), and `logging-utils.ts` (for `initializeWorkflowState`). The resulting import graph has multiple cross-file dependencies, creating circular import risk.

**Why it's wrong:** The schema file is flat by design. The apparent "domains" are load-bearing cross-references. A naive split creates circular imports or requires a shared `core.ts` that contains most of the schemas anyway.

**Do this instead:** Keep `workflow-schemas.ts` as a single file for this milestone. If schema file size becomes a maintenance issue post-v1.5, audit the dependency graph before splitting.

---

### Anti-Pattern 5: Changing the `agent-factory.ts` Signature Mid-Migration

**What people do:** Begin migrating agents to the factory, then realize the `requestContextSchema` handling needs a different API, and refactor the factory mid-migration.

**Why it's wrong:** Agents migrated before the signature change need to be re-migrated. The factory becomes a source of merge conflicts.

**Do this instead:** Finalize the factory signature by migrating 2-3 representative agents first (one reasoning agent, one extraction agent, one tester agent). Lock the API, then migrate the remaining 10.

---

## Sources

- `src/mastra/workflow/steps/02-hypothesize.ts` — direct inspection, 1,240 lines (HIGH confidence)
- `src/mastra/workflow/workflow-schemas.ts` — direct inspection, 407 lines (HIGH confidence)
- `src/mastra/workflow/request-context-helpers.ts` — direct inspection, 440 lines (HIGH confidence)
- `src/mastra/workflow/request-context-types.ts` — direct inspection, 79 lines (HIGH confidence)
- All 13 `*-agent.ts` files — direct inspection, confirmed boilerplate pattern (HIGH confidence)
- `src/mastra/workflow/index.ts` — direct inspection, confirmed export surface (HIGH confidence)
- `.planning/PROJECT.md` — milestone scope confirmation (HIGH confidence)

---

*Architecture research for: v1.5 refactor and prompt engineering integration*
*Researched: 2026-03-08*
