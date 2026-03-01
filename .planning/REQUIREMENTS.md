# Requirements: LO-Solver

**Defined:** 2026-02-28
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1 Requirements

### Cleanup (CLEAN) — Complete

- [x] **CLEAN-01**: All legacy workflow files removed from `src/mastra/`
- [x] **CLEAN-02**: Directory structure consolidated to `src/mastra/workflow/`
- [x] **CLEAN-03**: All references to legacy workflow agents, tools, and schemas removed from `src/mastra/index.ts` and any shared files
- [x] **CLEAN-04**: Project compiles cleanly with `npx tsc --noEmit` after cleanup (only pre-existing CSS module error remains)

### Evaluation Harness (EVAL)

- [x] **EVAL-01**: User can run automated scoring that executes the workflow against problems with known ground-truth answers and computes accuracy (percentage of correct translations)
- [x] **EVAL-02**: User can run comparison mode that scores zero-shot LLM output vs. agentic workflow output on the same problems, showing the delta
- [x] **EVAL-03**: User can evaluate intermediate outputs — rule quality (do generated rules correctly predict sentence translations?) and extraction quality (is the problem correctly parsed?)
- [x] **EVAL-04**: User can view eval results in the UI — accuracy scores, per-problem breakdowns, pass/fail per question
- [x] **EVAL-05**: Eval harness uses Mastra's `@mastra/evals` framework where applicable (consult Mastra docs for eval patterns)
- [x] **EVAL-06**: Eval results are persisted so users can track accuracy over time across workflow changes

### Workflow Improvements (WORK)

- [x] **WORK-01**: A dispatcher agent analyzes the problem and generates multiple linguistic perspectives to explore (e.g., phonological rules, morphological patterns, grammatical tense, person/number agreement, part of speech, word order)
- [x] **WORK-02**: Each perspective is dispatched to an independent hypothesizer agent that generates rules and vocabulary from that specific linguistic angle
- [x] **WORK-03**: Each hypothesizer uses the existing testing tools (`testRuleWithRuleset`, `testSentenceWithRuleset`) to validate its rules against the data
- [x] **WORK-04**: Competing hypothesis sets are scored by test pass rate, and the best-scoring ruleset is selected as the basis for further refinement
- [x] **WORK-05**: The verification loop uses the winning ruleset and iteratively improves it (existing verify/improve pattern, but starting from a stronger foundation)
- [x] **WORK-06**: Failure reasons are logged and surfaced — when a rule fails testing, the specific sentences it fails on and why are captured for the improver agent

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

| Feature | Reason |
|---------|--------|
| Framework migration | Mastra/Next.js stack is settled |
| General-purpose linguistics tool | Solves Rosetta Stone problems only |
| Multi-user support / authentication | Single-user dev tool |
| Deployment / hosting | Development-only for now |
| Real-time collaboration | Single-user tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEAN-01 | Phase 1: Legacy Cleanup | Complete |
| CLEAN-02 | Phase 1: Legacy Cleanup | Complete |
| CLEAN-03 | Phase 1: Legacy Cleanup | Complete |
| CLEAN-04 | Phase 1: Legacy Cleanup | Complete |
| EVAL-01 | Phase 2: Evaluation Foundation | Complete |
| EVAL-05 | Phase 2: Evaluation Foundation | Complete |
| EVAL-06 | Phase 2: Evaluation Foundation | Complete |
| EVAL-02 | Phase 3: Evaluation Expansion | Complete |
| EVAL-03 | Phase 5: Verification Loop Improvements | Complete |
| EVAL-04 | Phase 3: Evaluation Expansion | Complete |
| WORK-01 | Phase 4: Multi-Perspective Hypothesis Generation | Complete |
| WORK-02 | Phase 4: Multi-Perspective Hypothesis Generation | Complete |
| WORK-03 | Phase 4: Multi-Perspective Hypothesis Generation | Complete |
| WORK-04 | Phase 4: Multi-Perspective Hypothesis Generation | Complete |
| WORK-05 | Phase 5: Verification Loop Improvements | Complete |
| WORK-06 | Phase 5: Verification Loop Improvements | Complete |
| UI-01 | Phase 6: UI Event System & Rules Panel | Pending |
| UI-02 | Phase 6: UI Event System & Rules Panel | Pending |
| UI-06 | Phase 6: UI Event System & Rules Panel | Pending |
| UI-03 | Phase 7: Hierarchical Trace Display & Results | Pending |
| UI-04 | Phase 7: Hierarchical Trace Display & Results | Pending |
| UI-05 | Phase 7: Hierarchical Trace Display & Results | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-03-01 after milestone v1.0 formalization*
