# Phase 4: Multi-Perspective Hypothesis Generation - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the single-perspective hypothesis step (Step 2) with a dispatcher that fans out to multiple independent hypothesizer agents exploring different linguistic angles, then synthesizes the best-scoring rulesets. Introduce rules CRUD tools mirroring the existing vocabulary tools, and a main/draft store architecture for parallel execution. The current verify-improve loop (Step 3) is replaced by a dispatch-hypothesize-verify-synthesize loop with gap-aware iteration.

Requirements: WORK-01, WORK-02, WORK-03, WORK-04

</domain>

<decisions>
## Implementation Decisions

### Perspective generation
- Dynamic perspectives: dispatcher analyzes the structured problem data (from Step 1) and generates 3-5 linguistic perspectives to explore
- Informed by a reference list of common Linguistics Olympiad rule patterns (phonological, morphological, syntactic, etc.) but ultimately generates custom perspectives based on problem analysis
- Should generate perspectives it thinks are feasible, including unlikely ones
- Production mode: 3-5 perspectives (dynamic); testing mode: 2 perspectives

### Agent architecture
- Single hypothesizer agent definition, invoked N times with different perspective-specific prompts — not separate agent definitions per perspective
- Hypothesizers run in parallel (all at once via Promise.all or similar)
- Drop extractor agents entirely — hypothesizers interact with rules and vocabulary via CRUD tools directly, no two-agent chain needed
- Gemini 3 Flash for all new agents (dispatcher, hypothesizers, synthesizer, improver-dispatcher)

### Rules CRUD tools
- Create rules tools mirroring the existing vocabulary tools: addRule, updateRule, removeRule, getRules (and similar)
- Rules are stored structurally so agents cannot hallucinate rules — the store is the source of truth
- All agents that edit rules must use the CRUD tools (hypothesizers, synthesizer, improver agents)

### Main vs. draft stores
- Refactor vocabulary and rules storage to support one main store and multiple draft stores
- Main store: displayed to the UI, represents the current best state
- Draft stores: per-perspective during parallel execution, can be pulled from main or merged back into main
- Each parallel hypothesizer gets its own draft vocabulary and draft rules store
- The synthesizer merges draft stores back into main

### Full execution loop
- **Round 1:** Dispatcher → Parallel Hypothesizers → Verifier (scores each perspective) → Synthesizer (merges best rules)
- **Round 2+:** Improver-Dispatcher (sees structured problem + previous synthesizer output, finds gaps) → Parallel Hypothesizers → Verifier → Synthesizer
- Improver-dispatcher can generate new perspectives for gaps AND dispatch refinement tasks that take previous rules as a starting point
- One hypothesizer in Round 2+ can be tasked to "start over" with a fresh approach if needed
- Max N rounds (default 3 production, 2 testing)
- Early exit on convergence: if synthesized ruleset achieves 100% test pass rate, stop

### Verifier role
- Verifier stays as a quality gate between hypothesizers and synthesizer
- Tests each perspective's ruleset individually and produces a score
- Existing verifier pattern (testRule, testSentence tool calls) is preserved

### Synthesis strategy
- Synthesizer receives all rulesets + vocabularies + test scores from the verifier
- Score-weighted conflict resolution: when two rules explain the same phenomenon, favor the rule from the higher-scoring perspective
- Intelligent conflict resolution — cannot just concatenate rules, must analyze overlapping/conflicting rules and choose the best explanation per phenomenon
- Synthesizer validates its merged output using testRuleWithRuleset/testSentenceWithRuleset tools
- Vocabularies merged with programmatic diff (structured data, not LLM-based diff)
- Clean merge, no provenance tracking — final ruleset does not record which perspective originated each rule

### UI controls
- Two sliders in the nav bar area next to the existing model mode toggle:
  - Max rounds slider (controls dispatch-hypothesize-synthesize loop count)
  - Hypothesizer count slider (controls how many perspectives per round)
- Values passed to the workflow alongside modelMode

### Claude's Discretion
- Reference list content (which common LO patterns to include)
- Exact prompt structure for perspective-specific hypothesizer invocations
- How the verifier produces per-perspective scores (reuse existing pattern or adapt)
- Draft store implementation details (RequestContext keys, serialization approach)
- Slider UI design (range, defaults, labels, placement relative to model toggle)

</decisions>

<specifics>
## Specific Ideas

- "The dispatcher should come up with 3-5 possible solutions that it thinks is feasible no matter how unlikely"
- "The synthesiser must be smart enough to assemble the rules himself — some winning solutions might have conflicting rules, different rules that explain the same thing"
- "There should be a rules store, similar to how agents store their own vocabulary set"
- "The vocabulary and rules store might have to be refactored to allow one main vocabulary and one main rules store, which will be displayed to the UI, but also draft vocabulary and rules, which can be pulled from the main or merged back into the main"
- "The improver will do the same job as the dispatcher, just that the prompt might be slightly altered because it no longer just has the structured problem data but the structured problem data PLUS the previous synthesiser's best data"
- "The improver will be tasked to find gaps, and possible explanations, even willing to start over if necessary"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vocabulary-tools.ts`: Five CRUD tools (get, add, update, remove, clear) for vocabulary management — pattern to replicate for rules
- `vocabulary-tools-prompt.ts`: Shared instruction fragment for agents with vocabulary access — needs equivalent for rules
- `agent-utils.ts` / `generateWithRetry()`: Wrapper with timeout and retry — used for all LLM calls, reusable for new agents
- `request-context-helpers.ts`: Typed accessor functions for RequestContext — extend for draft stores and rules
- `request-context-types.ts`: WorkflowRequestContext interface — add rules store, draft store keys
- `03a-rule-tester-tool.ts` / `03a-sentence-tester-tool.ts`: Existing testing tools that hypothesizers and synthesizer will use
- `logging-utils.ts`: Markdown execution logging — extend for multi-perspective logging

### Established Patterns
- RequestContext for shared mutable state (vocabulary Map) — extend to include rules store and draft/main separation
- Tools wrapping sub-agents (testRule → rule-tester agent) — reusable as-is
- Dual tool variants (committed vs. draft: testRule vs testRuleWithRuleset) — fits the draft store concept
- Event streaming via step writer (`emitTraceEvent`, `emitToolTraceEvent`) — extend for parallel perspective events
- Dynamic model selection via `activeModelId()` — reusable for new agents

### Integration Points
- `workflow.ts`: Step 2 (initialHypothesisStep) and Step 3 (verifyImproveLoopStep) will be replaced by the new dispatch-hypothesize-verify-synthesize loop
- `workflow-schemas.ts`: Needs new schemas for dispatcher output, perspective definitions, synthesis input/output
- `src/mastra/index.ts`: New agents (dispatcher, synthesizer, improver-dispatcher) must be registered
- `src/app/layout.tsx`: Nav bar needs slider controls for round count and perspective count
- `src/app/page.tsx`: Input preparation must include new slider values alongside modelMode
- `src/lib/workflow-events.ts`: New event types for multi-perspective progress (perspective-start, perspective-complete, synthesis-start, etc.)
- `openrouter.ts`: All new agents use Gemini 3 Flash

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-multi-perspective-hypothesis-generation*
*Context gathered: 2026-03-01*
