# Phase 5: Verification Loop Improvements - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Strengthen the verification/improvement loop within the multi-perspective step so it reliably catches and fixes failing rules with clear failure diagnostics. Fix the EVAL-03 regression where `scoreRuleQuality` returns all zeros due to Phase 4's output schema change. Requirements: WORK-05, WORK-06, EVAL-03.

</domain>

<decisions>
## Implementation Decisions

### Failure diagnostics surfacing
- Surface failure details in BOTH trace events (UI) AND markdown execution logs
- Each failing rule gets full detail: rule text, which sentences failed, expected vs actual translations, verifier's reasoning for why it failed
- All rules (passing and failing) logged with their pass/fail status in execution logs
- Detailed per-rule sections in markdown logs (not compact summary tables)

### Failure diagnostics event format
- Enrich the existing `data-iteration-update` event type with failure detail fields rather than creating new event types
- No new event types in the `WorkflowTraceEvent` union for this phase

### Failure flow to improver
- Pass each failing rule with its specific failing sentences and reasons as structured data in the improver-dispatcher prompt
- Structured failure context, not raw verifier text passthrough
- The improver agent can test whatever rules it needs during improvement
- After the improver finishes, run a full verification pass (like the convergence check) to confirm changes

### Loop strategy
- Keep the improvement loop INSIDE the multi-perspective step (no separate workflow step)
- Always re-dispatch new perspectives when convergence fails — failing rules signal potentially wrong assumptions, not just minor fixes that need tweaking
- The goal is diverse hypothesis exploration, not incremental rule patching

### Round configuration
- Expose maxRounds to the user via a UI slider (like the existing perspectiveCount slider from Phase 4)
- Keep current defaults: 3 production, 2 testing mode

### End-of-loop behavior
- When max rounds reached without full convergence: warn and use best-so-far rules
- Emit a trace event warning that convergence wasn't achieved, showing the final pass rate
- Proceed to answer questions with the best available rules

### EVAL-03 scorer fix
- Enrich the multi-perspective step's output with verification metadata AND update the scorer to read the new format
- Include full round-by-round results: perspectives tried, pass rates per perspective, convergence check results, which round was best
- Display round-by-round verification data in the eval results UI page (not just scoring)

### Metadata flow principle
- All verification metadata (round counts, pass rates, convergence status, per-perspective scores) is tracked programmatically in workflow code — variables, workflow state, emitted events
- Agents do reasoning and testing; the CODE tracks and passes around the results
- No agent is asked to produce verification metadata as structured output

### Accuracy measurement
- Use empirical observation to verify improvement — no formal eval runs required in this phase
- Success criterion #4 (eval harness shows further accuracy improvement) will be validated through observation, not automated comparison

### Claude's Discretion
- Exact schema shape for the enriched `data-iteration-update` event and the verification metadata in the step output
- How the maxRounds slider integrates with the existing perspectiveCount slider UI
- Specific implementation of the "best-so-far" tracking across rounds
- Eval UI layout for displaying round-by-round verification data

</decisions>

<specifics>
## Specific Ideas

- "If some rules or sentences fail, it might mean that the rules or vocabulary is wrong — we should aim to replace and find better hypotheses"
- The convergence check pattern already works (runs verifier on synthesized rules) — strengthen it with better data flow, not structural change
- After the improver, run a full verifier "like those that come after the hypothesis step in the parallel loop"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `verifierFeedbackSchema`: Already captures `errantRules`, `errantSentences`, `conclusion`, `rulesTestedCount`, `sentencesTestedCount` — the structured failure data exists
- `improver-dispatcher` agent: Already receives `testResults` and `currentRules` — needs richer structured failure context
- `data-iteration-update` event type: Already emits iteration/conclusion/counts — extend with failure detail fields
- `emitTraceEvent` / `emitToolTraceEvent`: Existing event emission infrastructure
- `logging-utils.ts`: `logAgentOutput`, `logValidationError` — extend with per-rule failure logging
- `scoreRuleQuality` / `scoreExtraction` in `intermediate-scorers.ts`: Update to read new output format

### Established Patterns
- Two-layer verification: per-perspective verify + convergence check after synthesis
- `verifierFeedbackSchema.safeParse()` for extracting structured verification results
- Programmatic pass rate computation from feedback data (not agent-derived)
- `lastTestResults` variable passes convergence feedback to next round's improver-dispatcher
- Workflow state saved via `setState()` after each round

### Integration Points
- `multiPerspectiveHypothesisStep` output schema (`questionAnsweringInputSchema`): Needs enrichment with verification metadata
- `intermediate-scorers.ts` `scoreRuleQuality()`: Needs update to read new output format
- `src/app/page.tsx` / input controls: Add maxRounds slider alongside perspectiveCount
- `src/app/evals/page.tsx`: Add round-by-round verification display
- `src/lib/workflow-events.ts`: Extend `data-iteration-update` event type with failure detail fields

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05*
*Context gathered: 2026-03-01*
