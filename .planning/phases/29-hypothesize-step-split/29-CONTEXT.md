# Phase 29: Hypothesize Step Split - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Decompose the 1,240-line `steps/02-hypothesize.ts` into 4 focused sub-phase files with a thin coordinator. Pure refactoring — zero behavioral changes. The round loop structure (dispatch → hypothesize → verify → synthesize+convergence) stays identical.

</domain>

<decisions>
## Implementation Decisions

### Sub-phase function API
- Single typed `HypothesizeContext` interface for shared state (mainRequestContext, mainVocabulary, mainRules, draftStores, etc.)
- Separate second argument for Mastra step params (mastra, writer, bail, setState, abortSignal) — keeps "our state" distinct from "framework state"
- Per-perspective isolation: the hypothesize sub-phase creates per-perspective request contexts internally (as it already does), not passed via the shared context
- Round-to-round mutable accumulators (currentStepTimings, lastTestResults, previousPerspectiveIds, roundResults) stay local to the coordinator — sub-phases receive what they need as function args and return new values

### Return value design
- Each sub-phase returns a typed result interface (DispatchResult, HypothesizeResult, VerifyResult, SynthesizeResult)
- All result types defined in the coordinator file (02-hypothesize.ts) alongside HypothesizeContext — sub-phases import from coordinator
- Timings included in each result type (e.g., `timings: StepTiming[]`) — coordinator appends to accumulator
- Sub-phases are pure-ish: receive inputs, return results, coordinator manages accumulation

### Convergence check placement
- Convergence verification is part of the synthesize sub-phase (02d-synthesize.ts)
- 02d-synthesize.ts handles: vocabulary merge, synthesizer agent call, convergence verifier call, convergence extractor call
- SynthesizeResult includes convergencePassRate, convergenceConclusion, converged boolean, etc.
- Combined size stays under 350 lines (~300 lines for synthesis + convergence)

### Type location
- HypothesizeContext interface defined in coordinator (02-hypothesize.ts)
- All result interfaces defined in coordinator (02-hypothesize.ts)
- Sub-phases import types from coordinator — this is allowed since coordinator is not a sub-phase (STR-02 says no sub-phase-to-sub-phase imports)

### Claude's Discretion
- Exact fields in HypothesizeContext and StepParams interfaces
- Internal implementation of each sub-phase function
- Order of extraction (which sub-phase to pull out first)
- Whether to use a StepParams type alias or inline the destructured Mastra execute params

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `agent-factory.ts`: All agents already migrated to factory (Phase 28)
- `request-context-helpers.ts`: `emitTraceEvent`, `createDraftStore`, `clearAllDraftStores`, `extractCostFromResult`, `updateCumulativeCost`
- `agent-utils.ts`: `streamWithRetry` used by all agent calls in the file
- `logging-utils.ts`: `recordStepTiming`, `logAgentOutput`, `formatTimestamp`, `logVerificationResults`

### Established Patterns
- Steps live in `src/mastra/workflow/steps/` directory
- Agent files use `NN-descriptor` naming; sub-phase files will use `02a-`, `02b-`, etc. in `steps/`
- Two-agent chain pattern (reasoning → extractor) appears in verify and convergence sections
- `RequestContext<WorkflowRequestContext>` created fresh for each scope (perspective, verify, convergence)

### Integration Points
- `src/mastra/workflow/steps/02-hypothesize.ts` — becomes thin coordinator importing 4 sub-phase functions
- New files: `steps/02a-dispatch.ts`, `steps/02b-hypothesize.ts`, `steps/02c-verify.ts`, `steps/02d-synthesize.ts`
- `workflow.ts` — imports `multiPerspectiveHypothesisStep` from coordinator (unchanged)
- `workflow-schemas.ts` — sub-phases will import schema types directly (existing pattern)

### File structure mapping
| Sub-phase file | Current lines | Content |
|---|---|---|
| 02a-dispatch.ts | ~220 | Round 1 dispatcher + round 2+ improver-dispatcher |
| 02b-hypothesize.ts | ~150 | Parallel hypothesizer calls per perspective |
| 02c-verify.ts | ~230 | Per-perspective verifier + feedback extractor |
| 02d-synthesize.ts | ~300 | Vocab merge + synthesizer agent + convergence check |
| 02-hypothesize.ts (coordinator) | ~150 | Init, round loop, accumulation, post-loop return |

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 29-hypothesize-step-split*
*Context gathered: 2026-03-09*
