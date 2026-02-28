# Requirements

## v1 Requirements

### Cleanup (CLEAN)

- [ ] **CLEAN-01**: All Workflow 01 files removed from `src/mastra/01-one-agent/`
- [ ] **CLEAN-02**: All Workflow 02 files removed from `src/mastra/02-extract-then-hypo-test-loop/`
- [ ] **CLEAN-03**: All references to Workflow 01/02 agents, tools, and schemas removed from `src/mastra/index.ts` and any shared files
- [ ] **CLEAN-04**: Project compiles cleanly with `npx tsc --noEmit` after cleanup (only pre-existing CSS module error remains)

### Evaluation Harness (EVAL)

- [ ] **EVAL-01**: User can run automated scoring that executes the workflow against problems with known ground-truth answers and computes accuracy (percentage of correct translations)
- [ ] **EVAL-02**: User can run comparison mode that scores zero-shot LLM output vs. agentic workflow output on the same problems, showing the delta
- [ ] **EVAL-03**: User can evaluate intermediate outputs — rule quality (do generated rules correctly predict sentence translations?) and extraction quality (is the problem correctly parsed?)
- [ ] **EVAL-04**: User can view eval results in the UI — accuracy scores, per-problem breakdowns, pass/fail per question
- [ ] **EVAL-05**: Eval harness uses Mastra's `@mastra/evals` framework where applicable (consult Mastra docs for eval patterns)
- [ ] **EVAL-06**: Eval results are persisted so users can track accuracy over time across workflow changes

### Workflow Improvements (WORK)

- [ ] **WORK-01**: A dispatcher agent analyzes the problem and generates multiple linguistic perspectives to explore (e.g., phonological rules, morphological patterns, grammatical tense, person/number agreement, part of speech, word order)
- [ ] **WORK-02**: Each perspective is dispatched to an independent hypothesizer agent that generates rules and vocabulary from that specific linguistic angle
- [ ] **WORK-03**: Each hypothesizer uses the existing testing tools (`testRuleWithRuleset`, `testSentenceWithRuleset`) to validate its rules against the data
- [ ] **WORK-04**: Competing hypothesis sets are scored by test pass rate, and the best-scoring ruleset is selected as the basis for further refinement
- [ ] **WORK-05**: The verification loop uses the winning ruleset and iteratively improves it (existing verify/improve pattern, but starting from a stronger foundation)
- [ ] **WORK-06**: Failure reasons are logged and surfaced — when a rule fails testing, the specific sentences it fails on and why are captured for the improver agent

### UI Improvements (UI)

- [ ] **UI-01**: Rules are displayed in the UI alongside vocabulary in a tabbed panel view — user can switch between "Vocabulary" and "Rules" tabs
- [ ] **UI-02**: Rules panel updates live as agents generate, test, and revise rules
- [ ] **UI-03**: Trace panel displays tool calls nested under their parent agent calls (hierarchical view, not flat)
- [ ] **UI-04**: Each tool type has custom-fitted input/output display (e.g., testRule shows rule text + pass/fail + failing sentences, vocabulary tools show the entry being modified)
- [ ] **UI-05**: Final results are presented with clear formatting — answers, confidence scores, working steps, and which rules were applied
- [ ] **UI-06**: Event streaming system supports hierarchical events (agent starts → tool calls within → agent ends) so the frontend can build nested views

## v2 Requirements (Deferred)

- [ ] Agent-assisted question bank expansion — agents read PDFs/websites and extract problems + answer sheets into the existing format
- [ ] Expanded Linguini dataset coverage
- [ ] Custom hand-crafted edge-case problems
- [ ] Accuracy trend visualization over time
- [ ] A/B testing different workflow configurations

## Out of Scope

- Framework migration — Mastra/Next.js stack is settled
- Multi-user support / authentication — single-user dev tool
- Deployment / hosting — development-only
- Building a general-purpose linguistics tool — Rosetta Stone problems only
- Real-time collaboration features

## Traceability

| Requirement | Phase | Status |
| --- | --- | --- |
| CLEAN-01 | — | Pending |
| CLEAN-02 | — | Pending |
| CLEAN-03 | — | Pending |
| CLEAN-04 | — | Pending |
| EVAL-01 | — | Pending |
| EVAL-02 | — | Pending |
| EVAL-03 | — | Pending |
| EVAL-04 | — | Pending |
| EVAL-05 | — | Pending |
| EVAL-06 | — | Pending |
| WORK-01 | — | Pending |
| WORK-02 | — | Pending |
| WORK-03 | — | Pending |
| WORK-04 | — | Pending |
| WORK-05 | — | Pending |
| WORK-06 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |
| UI-04 | — | Pending |
| UI-05 | — | Pending |
| UI-06 | — | Pending |

---

_22 requirements across 4 categories. 5 requirements deferred to v2._
