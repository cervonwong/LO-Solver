# Phase 29: Hypothesize Step Split - Research

**Researched:** 2026-03-09
**Domain:** TypeScript refactoring -- large file decomposition into sub-phase modules
**Confidence:** HIGH

## Summary

Phase 29 is a pure mechanical refactoring of `src/mastra/workflow/steps/02-hypothesize.ts` (1,240 lines) into four sub-phase files plus a thin coordinator. The file has clearly marked section boundaries (comments labeled a through f) that align well with the planned sub-phase structure. No new libraries or external patterns are needed -- this is entirely about extracting functions, defining typed interfaces, and verifying behavioral equivalence.

The key technical challenge is designing the `HypothesizeContext` interface and result types such that sub-phases receive only what they need while the coordinator retains ownership of mutable accumulators (timings, round results, best-tracking variables). The existing code already uses a clean pattern of section-local variables fed by earlier sections, making extraction straightforward.

**Primary recommendation:** Extract sub-phases bottom-up (synthesize first, then verify, hypothesize, dispatch) since later sections have fewer dependencies on coordinator-local state. Define all shared types in the coordinator file. Each sub-phase should be an async function that takes `(ctx: HypothesizeContext, params: StepParams, ...section-specific-args)` and returns a typed result.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single typed `HypothesizeContext` interface for shared state (mainRequestContext, mainVocabulary, mainRules, draftStores, etc.)
- Separate second argument for Mastra step params (mastra, writer, bail, setState, abortSignal) -- keeps "our state" distinct from "framework state"
- Per-perspective isolation: the hypothesize sub-phase creates per-perspective request contexts internally (as it already does), not passed via the shared context
- Round-to-round mutable accumulators (currentStepTimings, lastTestResults, previousPerspectiveIds, roundResults) stay local to the coordinator -- sub-phases receive what they need as function args and return new values
- Each sub-phase returns a typed result interface (DispatchResult, HypothesizeResult, VerifyResult, SynthesizeResult)
- All result types defined in the coordinator file (02-hypothesize.ts) alongside HypothesizeContext -- sub-phases import from coordinator
- Timings included in each result type (e.g., `timings: StepTiming[]`) -- coordinator appends to accumulator
- Sub-phases are pure-ish: receive inputs, return results, coordinator manages accumulation
- Convergence verification is part of the synthesize sub-phase (02d-synthesize.ts)
- 02d-synthesize.ts handles: vocabulary merge, synthesizer agent call, convergence verifier call, convergence extractor call
- SynthesizeResult includes convergencePassRate, convergenceConclusion, converged boolean, etc.
- HypothesizeContext interface defined in coordinator (02-hypothesize.ts)
- All result interfaces defined in coordinator (02-hypothesize.ts)
- Sub-phases import types from coordinator -- this is allowed since coordinator is not a sub-phase (STR-02 says no sub-phase-to-sub-phase imports)

### Claude's Discretion
- Exact fields in HypothesizeContext and StepParams interfaces
- Internal implementation of each sub-phase function
- Order of extraction (which sub-phase to pull out first)
- Whether to use a StepParams type alias or inline the destructured Mastra execute params

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STR-01 | `02-hypothesize.ts` (1,240 lines) split into 4 sub-phase files (dispatch, hypothesize, verify, synthesize) with a thin coordinator | Detailed line mapping shows clean section boundaries at lines 113, 337, 489, 721/876, 1177. Each section maps to a sub-phase function. |
| STR-02 | Sub-phase files are import-only leaves (no circular dependencies between them) | All sub-phases import types from coordinator only. No sub-phase needs types/values from another sub-phase. Verified by analyzing data flow: dispatch produces perspectives, hypothesize consumes them, verify consumes hypothesis results, synthesize consumes verify results -- each flows through the coordinator. |
| STR-03 | `mainRules` and `mainVocabulary` Maps passed by reference (not copied) to sub-phases | These are fields of `HypothesizeContext` passed as a single object. Since Maps are reference types in JavaScript, passing them via the context object inherently satisfies pass-by-reference. Sub-phases that read/write (synthesize clears and rebuilds mainRules/mainVocabulary) operate on the same Map instances. |

</phase_requirements>

## Architecture Patterns

### Current File Structure (lines mapped)

```
02-hypothesize.ts (1,240 lines)
├── Lines 1-36:     Imports
├── Lines 38-46:    createStep boilerplate (id, schemas)
├── Lines 47-97:    execute() preamble: state init, main stores, accumulators
├── Lines 98-1181:  Round loop (for round = 1..maxRounds)
│   ├── Lines 113-336:  Section a. DISPATCH (~224 lines)
│   ├── Lines 337-488:  Section b. HYPOTHESIZE (~152 lines)
│   ├── Lines 489-720:  Section c. VERIFY (~232 lines)
│   ├── Lines 721-875:  Section d. SYNTHESIZE (~155 lines)
│   ├── Lines 876-1176: Section e. CONVERGENCE CHECK (~301 lines)
│   └── Lines 1177-1181: Section f. Clear draft stores
└── Lines 1182-1240: Post-loop: return structuredProblem + rules + metadata
```

### Target File Structure

```
src/mastra/workflow/steps/
├── 02-hypothesize.ts        # Thin coordinator (~150 lines)
│   ├── Type definitions: HypothesizeContext, StepParams, result interfaces
│   ├── createStep with execute()
│   ├── State initialization + main store setup
│   ├── Round loop skeleton (abort checks, accumulation, setState, convergence break)
│   └── Post-loop return
├── 02a-dispatch.ts          # Dispatch sub-phase (~220 lines)
│   └── export async function runDispatch(ctx, params, round, ...): Promise<DispatchResult>
├── 02b-hypothesize.ts       # Hypothesize sub-phase (~150 lines)
│   └── export async function runHypothesize(ctx, params, round, ...): Promise<HypothesizeResult>
├── 02c-verify.ts            # Verify sub-phase (~230 lines)
│   └── export async function runVerify(ctx, params, round, ...): Promise<VerifyResult>
└── 02d-synthesize.ts        # Synthesize + Convergence sub-phase (~300 lines)
    └── export async function runSynthesize(ctx, params, round, ...): Promise<SynthesizeResult>
```

### Pattern: HypothesizeContext Interface

The shared context carries references to the main stores and immutable problem data. Sub-phases read and write these references directly (Maps are passed by reference).

```typescript
// Defined in 02-hypothesize.ts (coordinator)
export interface HypothesizeContext {
  /** Immutable problem data */
  structuredProblem: z.infer<typeof structuredProblemDataSchema>;
  /** Mutable main vocabulary store (passed by reference -- STR-03) */
  mainVocabulary: Map<string, VocabularyEntry>;
  /** Mutable main rules store (passed by reference -- STR-03) */
  mainRules: Map<string, Rule>;
  /** Per-perspective draft stores (passed by reference) */
  draftStores: Map<string, DraftStore>;
  /** Main request context (carries openrouter provider, cumulative cost, etc.) */
  mainRequestContext: RequestContext<WorkflowRequestContext>;
  /** Log file path */
  logFile: string;
  /** Model mode for agent selection */
  modelMode: ModelMode;
  /** Step ID constant */
  stepId: StepId;
  /** Effective max perspective count for this run */
  effectivePerspectiveCount: number;
  /** Workflow start time (epoch ms) for timestamp formatting */
  workflowStartTime: number;
}
```

### Pattern: StepParams Interface

Carries Mastra framework params separately from application state:

```typescript
// Defined in 02-hypothesize.ts (coordinator)
export interface StepParams {
  mastra: Mastra;
  writer: StepWriter;
  bail: (value: unknown) => never;
  setState: (state: Record<string, unknown>) => Promise<void>;
  abortSignal?: AbortSignal;
}
```

Note: `bail` type needs to match the Mastra step `bail` parameter exactly. The actual type is a function that returns the output type of the step, but for our purposes treating it as `(value: unknown) => never` captures the "this function does not return" semantics.

### Pattern: Result Interfaces

Each sub-phase returns a result that the coordinator consumes:

```typescript
// All defined in 02-hypothesize.ts (coordinator)
import type { StepTiming } from '../logging-utils'; // or re-define locally

export interface DispatchResult {
  perspectives: Perspective[];
  timings: StepTiming[];
}

export interface HypothesizeResult {
  results: Array<{
    perspective: Perspective;
    draftStore: DraftStore;
    timing: StepTiming;
  }>;
  timings: StepTiming[];
}

export interface VerifyResult {
  perspectiveResults: PerspectiveResult[];
  timings: StepTiming[];
}

export interface SynthesizeResult {
  convergencePassRate: number;
  convergenceConclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
  converged: boolean;
  convergenceFeedback: z.infer<typeof verifierFeedbackSchema> | null;
  verifyResults: PerspectiveResult[]; // passed through for roundResult
  timings: StepTiming[];
}
```

### Pattern: Sub-phase Function Signatures

Each sub-phase function takes the shared context, step params, and round-specific arguments:

```typescript
// 02a-dispatch.ts
export async function runDispatch(
  ctx: HypothesizeContext,
  params: StepParams,
  round: number,
  isImproverRound: boolean,
  lastTestResults: unknown,
  previousPerspectiveIds: string[],
): Promise<DispatchResult>

// 02b-hypothesize.ts
export async function runHypothesize(
  ctx: HypothesizeContext,
  params: StepParams,
  round: number,
  isImproverRound: boolean,
  perspectives: Perspective[],
): Promise<HypothesizeResult>

// 02c-verify.ts
export async function runVerify(
  ctx: HypothesizeContext,
  params: StepParams,
  round: number,
  hypothesisResults: HypothesizeResult['results'],
): Promise<VerifyResult>

// 02d-synthesize.ts
export async function runSynthesize(
  ctx: HypothesizeContext,
  params: StepParams,
  round: number,
  perspectives: Perspective[],
  perspectiveResults: PerspectiveResult[],
): Promise<SynthesizeResult>
```

### Pattern: Coordinator Round Loop (pseudo-code)

```typescript
for (let round = 1; round <= effectiveMaxRounds; round++) {
  if (abortSignal?.aborted) break;

  const isImproverRound = round > 1;
  await emitTraceEvent(writer, { type: 'data-round-start', ... });

  // a. DISPATCH
  const dispatchResult = await runDispatch(ctx, params, round, isImproverRound, lastTestResults, previousPerspectiveIds);
  currentStepTimings.push(...dispatchResult.timings);
  const perspectives = dispatchResult.perspectives;
  previousPerspectiveIds.push(...perspectives.map(p => p.id));

  // b. HYPOTHESIZE
  if (abortSignal?.aborted) break;
  const hypothesizeResult = await runHypothesize(ctx, params, round, isImproverRound, perspectives);
  currentStepTimings.push(...hypothesizeResult.timings);

  // c. VERIFY
  if (abortSignal?.aborted) break;
  const verifyResult = await runVerify(ctx, params, round, hypothesizeResult.results);
  currentStepTimings.push(...verifyResult.timings);

  // d. SYNTHESIZE + CONVERGENCE
  if (abortSignal?.aborted) break;
  const synthesizeResult = await runSynthesize(ctx, params, round, perspectives, verifyResult.perspectiveResults);
  currentStepTimings.push(...synthesizeResult.timings);

  // Coordinator accumulation
  roundResults.push({ round, perspectives: ..., ...synthesizeResult });
  if (synthesizeResult.convergencePassRate > bestPassRate) { ... }
  lastTestResults = synthesizeResult.convergenceFeedback;

  await setState({ ... });
  if (synthesizeResult.converged) break;
  clearAllDraftStores(mainRequestContext);
}
```

### Import Direction (STR-02 Compliance)

```
02-hypothesize.ts (coordinator)
  exports: HypothesizeContext, StepParams, DispatchResult, HypothesizeResult, VerifyResult, SynthesizeResult
  imports from: workflow-schemas, request-context-types, agent-utils, logging-utils, etc.
  imports from: 02a, 02b, 02c, 02d (function imports only)

02a-dispatch.ts
  imports from: 02-hypothesize.ts (types only: HypothesizeContext, StepParams, DispatchResult)
  imports from: workflow-schemas, agent-utils, logging-utils, etc.
  DOES NOT import from: 02b, 02c, 02d

02b-hypothesize.ts
  imports from: 02-hypothesize.ts (types only)
  DOES NOT import from: 02a, 02c, 02d

02c-verify.ts
  imports from: 02-hypothesize.ts (types only)
  DOES NOT import from: 02a, 02b, 02d

02d-synthesize.ts
  imports from: 02-hypothesize.ts (types only)
  DOES NOT import from: 02a, 02b, 02c
```

This creates a star topology with the coordinator at the center. STR-02 is satisfied because no sub-phase file imports from another sub-phase file.

### Anti-Patterns to Avoid

- **Barrel re-exports from coordinator**: Do not create an index.ts or re-export sub-phase functions. The coordinator is the sole consumer of sub-phase functions.
- **Shared mutable state via module globals**: All mutable state flows through function arguments and return values, not module-level variables.
- **Deep nesting of context objects**: Do not nest HypothesizeContext inside StepParams or vice versa. Keep them as flat, separate arguments.
- **Copying Maps instead of passing references**: STR-03 explicitly requires pass-by-reference for mainRules and mainVocabulary. Do not spread or clone these Maps when building HypothesizeContext.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| StepTiming type | Re-declare StepTiming interface in coordinator | Import from `logging-utils.ts` (already exported as `recordStepTiming` return type, though the interface itself is not exported -- may need to export it or re-declare) | Single source of truth |
| Abort signal checking | Custom abort checking pattern | Continue using existing `abortSignal?.aborted` pattern with early `break` in coordinator loop | Already working, well-tested |
| Event emission | Custom event helpers | Continue using `emitTraceEvent` from `request-context-helpers.ts` | Already abstracted |

**Key insight:** `StepTiming` is currently a non-exported interface in `logging-utils.ts` (line 10). The coordinator and sub-phases all need this type for their result interfaces. Either export it from `logging-utils.ts` or re-declare a compatible type in the coordinator. Exporting from `logging-utils.ts` is cleaner (single source of truth).

## Common Pitfalls

### Pitfall 1: Circular Import Between Coordinator and Sub-phases

**What goes wrong:** If a sub-phase accidentally imports a runtime value (not just a type) from the coordinator, TypeScript may create a circular dependency since the coordinator imports the sub-phase function.
**Why it happens:** Using `import { HypothesizeContext }` instead of `import type { HypothesizeContext }`.
**How to avoid:** All sub-phase imports from the coordinator MUST use `import type { ... }`. This is erased at compile time and creates no runtime circular dependency.
**Warning signs:** Runtime errors about undefined imports, or `tsc` warnings about circular references.

### Pitfall 2: bail() Return Type Mismatch

**What goes wrong:** The `bail` function from Mastra's `createStep` has a specific return type tied to the step's output schema. Wrapping it in a `StepParams` interface may lose this type information.
**Why it happens:** Mastra types `bail` as `(value: StepOutputType) => never` where `StepOutputType` is inferred from the step definition.
**How to avoid:** In the StepParams interface, type bail as `(value: unknown) => never` since it is only called in `02a-dispatch.ts` with an error object. The coordinator passes the actual typed `bail` from the execute params. Alternatively, keep bail out of StepParams and pass it only to dispatch as a separate argument.
**Warning signs:** TypeScript errors when calling `bail()` in sub-phase files.

### Pitfall 3: Forgetting to Pass Writer for Event Emission

**What goes wrong:** Sub-phases need `writer` to emit trace events, but it is on StepParams, not HypothesizeContext.
**Why it happens:** Separating "our state" from "framework state" means the writer is in StepParams.
**How to avoid:** Every sub-phase receives both ctx (HypothesizeContext) and params (StepParams). Sub-phases call `emitTraceEvent(params.writer, ...)`.
**Warning signs:** Events stop appearing in the frontend trace panel for specific sub-phases.

### Pitfall 4: Synthesize Sub-phase Exceeding 350 Lines

**What goes wrong:** Combining synthesis (lines 721-875, ~155 lines) and convergence (lines 876-1176, ~301 lines) gives 456 raw lines, which exceeds the 350-line target.
**Why it happens:** The convergence section is verbose with repetitive event emission and cost tracking boilerplate.
**How to avoid:** When extracting to a standalone function, the section boundary comments, redundant blank lines, and some coordinator-local logic (roundResult construction, best-tracking) stay in the coordinator. The sub-phase only handles: (1) vocab merge, (2) synthesizer agent call, (3) convergence verifier call, (4) convergence extractor call, (5) returning results. The estimated reduction is ~100-150 lines of coordinator-local accumulation that stays in the coordinator, bringing the sub-phase to ~300-310 lines.
**Warning signs:** Running `wc -l` on 02d-synthesize.ts returns >350.

### Pitfall 5: Breaking the `bail()` Early Return from Dispatch

**What goes wrong:** In the current code, `bail()` is called directly inside the execute function at line 210-216. When dispatch is extracted to a sub-phase, `bail()` cannot be called from within the sub-phase function and have it terminate the step -- it would need to be handled differently.
**Why it happens:** `bail()` is a Mastra-provided function scoped to the step's execute handler. It causes an early return from the step.
**How to avoid:** The dispatch sub-phase should NOT call `bail()` directly. Instead, it should throw an error or return a discriminated result (e.g., `{ success: false, error: string }` vs `{ success: true, perspectives: Perspective[] }`). The coordinator then calls `bail()` based on the result. Alternatively, pass `bail` into dispatch and let it propagate -- since `bail` returns `never`, it will propagate correctly. Both approaches work; the discriminated union is more testable.
**Warning signs:** Dispatch parse failures silently continue instead of stopping the workflow.

## Code Examples

### Coordinator Round Loop Body (verified from source analysis)

The coordinator's round loop after extraction will look approximately like:

```typescript
// In 02-hypothesize.ts coordinator
import { runDispatch } from './02a-dispatch';
import { runHypothesize } from './02b-hypothesize';
import { runVerify } from './02c-verify';
import { runSynthesize } from './02d-synthesize';

// Inside execute(), after state init:
const ctx: HypothesizeContext = {
  structuredProblem,
  mainVocabulary,
  mainRules,
  draftStores,
  mainRequestContext,
  logFile,
  modelMode: state.modelMode as ModelMode,
  stepId,
  effectivePerspectiveCount,
  workflowStartTime: state.workflowStartTime,
};

const params: StepParams = { mastra, writer, bail, setState, abortSignal };

for (let round = 1; round <= effectiveMaxRounds; round++) {
  if (abortSignal?.aborted) break;
  const isImproverRound = round > 1;

  await emitTraceEvent(writer, {
    type: 'data-round-start',
    data: { round, isImproverRound, timestamp: new Date().toISOString() },
  });

  // a. Dispatch
  const dispatchResult = await runDispatch(
    ctx, params, round, isImproverRound, lastTestResults, previousPerspectiveIds,
  );
  if (!dispatchResult.perspectives) {
    if (isImproverRound) break; // No new perspectives
    return bail({ success: false, message: dispatchResult.error! });
  }
  currentStepTimings.push(...dispatchResult.timings);
  previousPerspectiveIds.push(...dispatchResult.perspectives.map(p => p.id));

  // b. Hypothesize
  if (abortSignal?.aborted) break;
  const hypResult = await runHypothesize(ctx, params, round, isImproverRound, dispatchResult.perspectives);
  currentStepTimings.push(...hypResult.timings);

  // c. Verify
  if (abortSignal?.aborted) break;
  const verifyResult = await runVerify(ctx, params, round, hypResult.results);
  currentStepTimings.push(...verifyResult.timings);

  // d. Synthesize + Convergence
  if (abortSignal?.aborted) break;
  const synthResult = await runSynthesize(ctx, params, round, dispatchResult.perspectives, verifyResult.perspectiveResults);
  currentStepTimings.push(...synthResult.timings);

  // Coordinator accumulation (stays here, not in sub-phases)
  const roundResult: RoundResult = {
    round,
    perspectives: verifyResult.perspectiveResults.map(r => ({ ... })),
    convergencePassRate: synthResult.convergencePassRate,
    convergenceConclusion: synthResult.convergenceConclusion,
    converged: synthResult.converged,
  };
  roundResults.push(roundResult);
  // ... best-tracking, setState, convergence break, clearAllDraftStores
}
```

### Sub-phase Import Pattern (verified from source analysis)

```typescript
// In 02a-dispatch.ts
import type { HypothesizeContext, StepParams, DispatchResult } from './02-hypothesize';
import type { Perspective } from '../workflow-schemas';
import { dispatcherOutputSchema, improverDispatcherOutputSchema } from '../workflow-schemas';
import { streamWithRetry } from '../agent-utils';
import { emitTraceEvent, extractCostFromResult, updateCumulativeCost } from '../request-context-helpers';
import { recordStepTiming, logAgentOutput, formatTimestamp } from '../logging-utils';
import { activeModelId } from '../../openrouter';
import { generateEventId } from '@/lib/workflow-events';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single monolithic step file | Sub-phase decomposition with typed interfaces | This phase | Each file independently readable, under 350 lines |
| All types inline in step body | Exported interfaces from coordinator | This phase | Enables type-safe sub-phase contracts |

**No deprecated/outdated patterns apply.** This is an internal refactoring with no external library changes.

## Open Questions

1. **StepTiming export from logging-utils.ts**
   - What we know: `StepTiming` is a non-exported interface in `logging-utils.ts`. Sub-phase result types need to reference it.
   - What's unclear: Whether to export it from `logging-utils.ts` or re-declare in the coordinator.
   - Recommendation: Export it from `logging-utils.ts` -- it is the single source of truth and avoids drift.

2. **bail() propagation strategy**
   - What we know: `bail()` is only called once, in the dispatch section (line 210), on round 1 dispatcher parse failure.
   - What's unclear: Whether to pass `bail` into the sub-phase or use a discriminated union return.
   - Recommendation: Use a discriminated union (`DispatchResult` with `perspectives: Perspective[] | null` and `error?: string`). The coordinator checks and calls `bail()` itself. This keeps sub-phases free of Mastra framework coupling beyond types.

3. **setState typing**
   - What we know: Mastra's `setState` accepts the workflow state type. The coordinator calls it at the end of each round.
   - What's unclear: The exact TypeScript type of `setState` may need casting in the StepParams interface.
   - Recommendation: Type it as `(state: Record<string, unknown>) => Promise<void>` in StepParams. The coordinator passes the real setState from execute params.

## Sources

### Primary (HIGH confidence)
- Direct source code analysis of `src/mastra/workflow/steps/02-hypothesize.ts` (1,240 lines)
- Direct source code analysis of `src/mastra/workflow/request-context-types.ts`
- Direct source code analysis of `src/mastra/workflow/request-context-helpers.ts`
- Direct source code analysis of `src/mastra/workflow/workflow-schemas.ts`
- Direct source code analysis of `src/mastra/workflow/agent-utils.ts`
- Direct source code analysis of `src/mastra/workflow/logging-utils.ts`
- Direct source code analysis of `src/mastra/workflow/workflow.ts`
- CONTEXT.md decisions from Phase 29 discussion session

### Secondary (MEDIUM confidence)
- None needed -- this is pure internal refactoring with no external dependencies

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, purely internal refactoring
- Architecture: HIGH - detailed line-by-line analysis of the target file confirms clean section boundaries
- Pitfalls: HIGH - all pitfalls identified from direct code analysis of variable usage patterns and Mastra framework constraints

**Research date:** 2026-03-09
**Valid until:** Indefinite (internal refactoring, no external dependency changes)
