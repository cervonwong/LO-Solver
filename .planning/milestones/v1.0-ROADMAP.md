# Roadmap

## Milestone: Prove the Agentic Advantage

### Phase 1: Legacy Cleanup — Complete
**Goal:** Remove dead legacy workflow code so the codebase contains only the active workflow.
**Requirements:** CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04

**Success Criteria:**
1. Legacy workflow directories no longer exist
2. `src/mastra/index.ts` contains no imports or references to legacy workflow agents, tools, or schemas
3. `npx tsc --noEmit` passes with only the pre-existing CSS module error
4. `npm run dev` starts successfully and a problem can be solved end-to-end with the workflow

---

### Phase 2: Evaluation Foundation — Complete
**Goal:** Build the core automated evaluation harness that scores workflow output against ground-truth answers, using Mastra's eval framework where applicable.
**Requirements:** EVAL-01, EVAL-05, EVAL-06

**Success Criteria:**
1. User can invoke an eval run that executes the workflow against a set of problems with known answers and receives an accuracy percentage
2. Eval implementation uses `@mastra/evals` framework patterns (confirmed by consulting Mastra docs during implementation)
3. Eval results are persisted to storage so previous runs can be retrieved and compared
4. At least 3 ground-truth problems are configured and produce scored results

---

### Phase 3: Evaluation Expansion — Complete
**Goal:** Extend the eval harness with zero-shot comparison, intermediate output scoring, and a UI for viewing results.
**Requirements:** EVAL-02, EVAL-03, EVAL-04
**Plans:** 2 plans (2 complete)

Plans:
- [x] 03-01-PLAN.md — Backend: zero-shot solver, intermediate scorers, storage types, runner integration
- [x] 03-02-PLAN.md — Frontend: API routes, eval results page, nav bar update

**Success Criteria:**
1. User can run a comparison eval that scores zero-shot LLM output alongside agentic workflow output on the same problems and displays the delta
2. User can evaluate intermediate outputs — rule quality (do rules predict translations correctly?) and extraction quality (is the problem parsed correctly?)
3. Eval results are viewable in the UI with accuracy scores, per-problem breakdowns, and pass/fail per question
4. Comparison mode clearly shows whether the agentic workflow outperforms zero-shot

---

### Phase 4: Multi-Perspective Hypothesis Generation — Complete
**Goal:** Replace the single-perspective hypothesis step with a dispatcher that fans out to multiple independent hypothesizer agents exploring different linguistic angles, then selects the best-scoring ruleset.
**Requirements:** WORK-01, WORK-02, WORK-03, WORK-04
**Plans:** 3/3 plans complete

Plans:
- [x] 04-01-PLAN.md — Foundation: rules CRUD tools, draft store architecture, new workflow schemas
- [x] 04-02-PLAN.md — Agents: dispatcher, synthesizer, improver-dispatcher definitions + hypothesizer refactor
- [x] 04-03-PLAN.md — Workflow rewrite: dispatch-hypothesize-verify-synthesize loop + UI sliders + frontend progress

**Success Criteria:**
1. A dispatcher agent analyzes each problem and produces at least 3 distinct linguistic perspectives to explore
2. Each perspective is processed by an independent hypothesizer agent that generates rules and vocabulary from that angle
3. Each hypothesizer validates its rules using the existing testing tools (`testRuleWithRuleset`, `testSentenceWithRuleset`)
4. The system scores competing hypothesis sets by test pass rate and selects the best-scoring ruleset
5. Eval harness (from Phase 2) shows measurable accuracy improvement over the single-perspective baseline

---

### Phase 5: Verification Loop Improvements
**Goal:** Strengthen the verification/improvement loop so it starts from the winning multi-perspective ruleset and reliably catches and fixes failing rules with clear failure diagnostics. Also fix the EVAL-03 regression where `scoreRuleQuality` returns all zeros due to Phase 4's output schema change.
**Requirements:** WORK-05, WORK-06, EVAL-03
**Gap Closure:** Closes EVAL-03 regression from v1.0 audit
**Plans:** 2/2 plans complete

Plans:
1. Verification metadata and scorer fix (schemas, logging, EVAL-03 fix)
2. Event enrichment and round-by-round UI (IterationUpdateEvent fields, eval results display)

**Success Criteria:**
1. The verification loop operates on the best-scoring ruleset selected in Phase 4
2. When a rule fails testing, the specific failing sentences and failure reasons are captured and passed to the improver agent
3. Failure reasons are logged to the execution markdown log and surfaced in trace events
4. Eval harness shows further accuracy improvement over Phase 4 baseline

---

### Phase 6: UI Event System & Rules Panel — Complete
**Goal:** Build the hierarchical event streaming infrastructure and add a live-updating rules panel alongside the existing vocabulary panel.
**Requirements:** UI-01, UI-02, UI-06
**Plans:** 4/4 plans complete

Plans:
- [x] 06-01-PLAN.md — Hierarchical event types and streamWithRetry function
- [x] 06-02-PLAN.md — Rules panel, rolling activity chips, vocabulary panel update
- [x] 06-03-PLAN.md — Hierarchical event emission, streamWithRetry migration, rule test events
- [x] 06-04-PLAN.md — Three-panel layout wiring, rules state, activity tracking, minimum heights

**Success Criteria:**
1. Event streaming system emits hierarchical events (agent-start, tool-calls nested within, agent-end) that the frontend can consume
2. Rules are displayed alongside vocabulary in a stacked resizable panel layout with minimum height constraints
3. Rules panel updates live as agents generate, test, and revise rules during a solve run
4. Existing trace and progress UI continues to function correctly with the new event structure

---

### Phase 7: Hierarchical Trace Display & Results — Complete
**Goal:** Render agent/tool hierarchy in the trace panel with custom-fitted tool displays, and present final results with clear formatting.
**Requirements:** UI-03, UI-04, UI-05
**Plans:** 3/3 plans complete

Plans:
- [x] 07-01-PLAN.md — Answer schema: rulesApplied field + agent instructions
- [x] 07-02-PLAN.md — Hierarchical trace display: nested agents, custom tool renderers, bulk grouping, auto-expand/collapse, auto-scroll
- [x] 07-03-PLAN.md — Results display: summary bar, rule tags, cross-linking, markdown working steps, auto-scroll

**Success Criteria:**
1. Trace panel displays tool calls nested under their parent agent calls in a collapsible hierarchical view
2. Each tool type renders custom input/output display (e.g., testRule shows rule text + pass/fail + failing sentences; vocabulary tools show the entry being modified)
3. Final results are presented with clear formatting including answers, confidence scores, working steps, and which rules were applied
4. User can follow the full reasoning chain from hypothesis through testing to final answer via the trace and results panels

---

_7 phases. 22 v1 requirements mapped. All phases complete. All 22 v1 requirements satisfied. Question bank expansion deferred to v2._
