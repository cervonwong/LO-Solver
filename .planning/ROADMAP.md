# Roadmap

## Milestones

- ✅ **v1.0 Prove the Agentic Advantage** — Phases 1-7 (shipped 2026-03-02)
- ✅ **v1.1 UI Polish** — Phases 8-13 (shipped 2026-03-03)
- ✅ **v1.2 Cleanup & Quality** — Phases 14-16 (shipped 2026-03-04)
- ✅ **v1.3 User API Key** — Phases 17-18 (shipped 2026-03-06)
- ✅ **v1.4 Claude Code Native Solver** — Phases 19-26 (shipped 2026-03-08)
- ✅ **v1.5 Refactor & Prompt Engineering** — Phases 27-32 (shipped 2026-03-10)
- 🚧 **v1.6 Claude Code Provider** — Phases 33-36 (in progress)

## Phases

<details>
<summary>✅ v1.0 Prove the Agentic Advantage (Phases 1-7) — SHIPPED 2026-03-02</summary>

- [x] Phase 1: Legacy Cleanup — completed 2026-02-28
- [x] Phase 2: Evaluation Foundation — completed 2026-02-28
- [x] Phase 3: Evaluation Expansion (2/2 plans) — completed 2026-03-01
- [x] Phase 4: Multi-Perspective Hypothesis Generation (3/3 plans) — completed 2026-03-01
- [x] Phase 5: Verification Loop Improvements (2/2 plans) — completed 2026-03-01
- [x] Phase 6: UI Event System & Rules Panel (4/4 plans) — completed 2026-03-01
- [x] Phase 7: Hierarchical Trace Display & Results (3/3 plans) — completed 2026-03-02

</details>

<details>
<summary>✅ v1.1 UI Polish (Phases 8-13) — SHIPPED 2026-03-03</summary>

- [x] Phase 8: Trace Hierarchy Fix (2/2 plans) — completed 2026-03-02
- [x] Phase 9: Compact Reasoning Display (1/1 plan) — completed 2026-03-02
- [x] Phase 10: Structured Data Formatting (2/2 plans) — completed 2026-03-03
- [x] Phase 11: Agent Duck Mascots (1/1 plan) — completed 2026-03-03
- [x] Phase 12: Workflow Control Buttons (2/2 plans) — completed 2026-03-03
- [x] Phase 13: 3-Column Layout (1/1 plan) — completed 2026-03-03

</details>

<details>
<summary>✅ v1.2 Cleanup & Quality (Phases 14-16) — SHIPPED 2026-03-04</summary>

- [x] Phase 14: Abort Propagation (2/2 plans) — completed 2026-03-04
- [x] Phase 15: File Refactoring (3/3 plans) — completed 2026-03-04
- [x] Phase 16: Toast Notifications (2/2 plans) — completed 2026-03-04

</details>

<details>
<summary>✅ v1.3 User API Key (Phases 17-18) — SHIPPED 2026-03-06</summary>

- [x] Phase 17: Key Entry UI (2/2 plans) — completed 2026-03-06
- [x] Phase 18: Key Routing (2/2 plans) — completed 2026-03-06

</details>

<details>
<summary>✅ v1.4 Claude Code Native Solver (Phases 19-26) — SHIPPED 2026-03-08</summary>

- [x] Phase 19: Workflow Documentation (1/1 plan) — completed 2026-03-07
- [x] Phase 20: Infrastructure Setup (1/1 plan) — completed 2026-03-07
- [x] Phase 21: Pipeline Agents (1/1 plan) — completed 2026-03-07
- [x] Phase 22: Orchestrator and Entry Point (1/1 plan) — completed 2026-03-08
- [x] Phase 23: Verify-Improve Loop and Answer (2/2 plans) — completed 2026-03-08
- [x] Phase 24: Output and Integration (1/1 plan) — completed 2026-03-08
- [x] Phase 25: Fix Step 4c Verifier Orchestration (1/1 plan) — completed 2026-03-08
- [x] Phase 26: Documentation Consistency Cleanup (1/1 plan) — completed 2026-03-08

</details>

<details>
<summary>✅ v1.5 Refactor & Prompt Engineering (Phases 27-32) — SHIPPED 2026-03-10</summary>

- [x] Phase 27: Dead Code & Type Safety (2/2 plans) — completed 2026-03-08
- [x] Phase 28: Agent Factory (2/2 plans) — completed 2026-03-08
- [x] Phase 29: Hypothesize Step Split (2/2 plans) — completed 2026-03-09
- [x] Phase 30: Mastra Prompt Engineering (3/3 plans) — completed 2026-03-09
- [x] Phase 31: Claude Code Prompt Engineering (1/1 plan) — completed 2026-03-10
- [x] Phase 32: Frontend Cleanup (1/1 plan) — completed 2026-03-10

</details>

### v1.6 Claude Code Provider (In Progress)

**Milestone Goal:** Add Claude Code as an alternative model provider, enabling users to run the solver workflow using their Claude subscription instead of OpenRouter API credits.

- [x] **Phase 33: Provider Foundation** - Provider module, auth, agent factory, schema changes, tool-free agents validated (completed 2026-03-11)
- [x] **Phase 34: MCP Tool Bridge** - MCP server wrapping Mastra tools, tool-using agents validated (completed 2026-03-14)
- [x] **Phase 35: Frontend Integration** - Four-way provider toggle, auth status, cost display, test result bug fix, CC visualisation (completed 2026-03-14)
- [ ] **Phase 36: Evaluation Support** - Eval harness provider flag and cross-provider comparison

## Phase Details

### Phase 33: Provider Foundation
**Goal**: Users can run the 8 tool-free agents through Claude Code provider with correct auth and error handling
**Depends on**: Phase 32 (v1.5 complete)
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04, PROV-05, AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. Workflow schema accepts `providerMode` with three values (openrouter-testing, openrouter-production, claude-code) and existing OpenRouter modes continue to work unchanged
  2. All 8 tool-free agents (extractors, dispatchers, answerer) produce correct structured output when run through Claude Code provider
  3. Solve attempt with unauthenticated Claude Code CLI is blocked with a clear error message before any LLM call is made
  4. Claude Code agent cannot access filesystem tools (Bash, Read, Write, Edit) during server-side execution
  5. A transient Claude Code error during solve triggers retry logic and surfaces a meaningful error message (not an unhandled crash)
**Plans**: 7 plans

Plans:
- [ ] 33-01-PLAN.md — Core types: package install, provider module, providerMode rename in 7 core files
- [ ] 33-02-PLAN.md — Mechanical rename: modelMode to providerMode in 9 step/agent files
- [ ] 33-03-PLAN.md — Eval rename: modelMode to providerMode in 4 eval files
- [ ] 33-04-PLAN.md — Agent factory extension, auth gate, error handling (3 files)
- [x] 33-05-PLAN.md — Add claudeCodeModel to 12 agents, validate structured output
- [ ] 33-06-PLAN.md — Frontend hook and toggle rename to providerMode
- [ ] 33-07-PLAN.md — Gap closure: Claude Code generate-fallback for structured output (PROV-04)

### Phase 34: MCP Tool Bridge
**Goal**: The 4 tool-using agents (hypothesizer, synthesizer, verifier orchestrator, rules improver) execute their tool calls correctly through Claude Code via MCP bridge
**Depends on**: Phase 33
**Requirements**: TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-05
**Success Criteria** (what must be TRUE):
  1. Vocabulary tools (get, add, update, delete, list) are callable by Claude Code agents and correctly read/write RequestContext state
  2. Rules tools (get, add, update) are callable by Claude Code agents and correctly read/write RequestContext state
  3. Tester tools (testRule, testSentence) are callable by Claude Code agents and return structured pass/fail results
  4. A full end-to-end solve completes through Claude Code provider with all 12 agents (tool-free and tool-using) producing correct output
**Plans**: 2 plans

Plans:
- [ ] 34-01-PLAN.md — MCP tool bridge infrastructure: server factory, tool descriptions, RequestContext provider key, agent factory lookup
- [ ] 34-02-PLAN.md — Workflow step wiring and E2E validation checkpoint

### Phase 35: Frontend Integration
**Goal**: Users can select Claude Code as their provider from the UI (4-way toggle with testing/production tiers) and see appropriate feedback throughout the solve
**Depends on**: Phase 33 (schema changes), Phase 34 (full pipeline working)
**Requirements**: UI-01, UI-02, UI-03, PROV-06
**Success Criteria** (what must be TRUE):
  1. User can switch between OpenRouter Testing, OpenRouter Production, Claude Code Testing, and Claude Code Production via a four-way selector in the UI
  2. API key dialog is hidden and not prompted when Claude Code mode is selected
  3. Auth status indicator shows whether Claude Code CLI is authenticated (visible when Claude Code mode is active)
  4. Cost display shows "Subscription" label instead of dollar amounts during Claude Code solves
  5. Sentence test tool cards correctly show PASS/FAIL status (bug fix)
  6. Claude Code agent events are visually identifiable in the trace panel
**Plans**: 3 plans

Plans:
- [ ] 35-01-PLAN.md — Backend enum expansion to 4 values, helper functions, agent factory tiers, cost extraction
- [ ] 35-02-PLAN.md — Frontend toggle, auth endpoint, auth hook, badge, solve guard
- [ ] 35-03-PLAN.md — Test result rendering fix, CC instance visualisation

### Phase 36: Evaluation Support
**Goal**: Eval harness can benchmark Claude Code provider runs alongside OpenRouter runs for cross-provider comparison
**Depends on**: Phase 34 (full pipeline working through Claude Code)
**Requirements**: EVAL-01, EVAL-02
**Success Criteria** (what must be TRUE):
  1. Running `npm run eval -- --provider claude-code` executes the eval suite through the Claude Code provider
  2. Eval result JSON files record which provider was used, and the eval results viewer can filter/compare results by provider
**Plans**: TBD

Plans:
- [ ] 36-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 33 -> 34 -> 35 -> 36

| Phase | Milestone | Plans Complete | Status | Completed |
| --- | --- | --- | --- | --- |
| 1. Legacy Cleanup | v1.0 | 1/1 | Complete | 2026-02-28 |
| 2. Evaluation Foundation | v1.0 | 1/1 | Complete | 2026-02-28 |
| 3. Evaluation Expansion | v1.0 | 2/2 | Complete | 2026-03-01 |
| 4. Multi-Perspective Hypothesis | v1.0 | 3/3 | Complete | 2026-03-01 |
| 5. Verification Loop Improvements | v1.0 | 2/2 | Complete | 2026-03-01 |
| 6. UI Event System & Rules Panel | v1.0 | 4/4 | Complete | 2026-03-01 |
| 7. Hierarchical Trace & Results | v1.0 | 3/3 | Complete | 2026-03-02 |
| 8. Trace Hierarchy Fix | v1.1 | 2/2 | Complete | 2026-03-02 |
| 9. Compact Reasoning Display | v1.1 | 1/1 | Complete | 2026-03-02 |
| 10. Structured Data Formatting | v1.1 | 2/2 | Complete | 2026-03-03 |
| 11. Agent Duck Mascots | v1.1 | 1/1 | Complete | 2026-03-03 |
| 12. Workflow Control Buttons | v1.1 | 2/2 | Complete | 2026-03-03 |
| 13. 3-Column Layout | v1.1 | 1/1 | Complete | 2026-03-03 |
| 14. Abort Propagation | v1.2 | 2/2 | Complete | 2026-03-04 |
| 15. File Refactoring | v1.2 | 3/3 | Complete | 2026-03-04 |
| 16. Toast Notifications | v1.2 | 2/2 | Complete | 2026-03-04 |
| 17. Key Entry UI | v1.3 | 2/2 | Complete | 2026-03-06 |
| 18. Key Routing | v1.3 | 2/2 | Complete | 2026-03-06 |
| 19. Workflow Documentation | v1.4 | 1/1 | Complete | 2026-03-07 |
| 20. Infrastructure Setup | v1.4 | 1/1 | Complete | 2026-03-07 |
| 21. Pipeline Agents | v1.4 | 1/1 | Complete | 2026-03-07 |
| 22. Orchestrator and Entry Point | v1.4 | 1/1 | Complete | 2026-03-08 |
| 23. Verify-Improve Loop and Answer | v1.4 | 2/2 | Complete | 2026-03-08 |
| 24. Output and Integration | v1.4 | 1/1 | Complete | 2026-03-08 |
| 25. Fix Step 4c Verifier Orchestration | v1.4 | 1/1 | Complete | 2026-03-08 |
| 26. Documentation Consistency Cleanup | v1.4 | 1/1 | Complete | 2026-03-08 |
| 27. Dead Code & Type Safety | v1.5 | 2/2 | Complete | 2026-03-08 |
| 28. Agent Factory | v1.5 | 2/2 | Complete | 2026-03-08 |
| 29. Hypothesize Step Split | v1.5 | 2/2 | Complete | 2026-03-09 |
| 30. Mastra Prompt Engineering | v1.5 | 3/3 | Complete | 2026-03-09 |
| 31. Claude Code Prompt Engineering | v1.5 | 1/1 | Complete | 2026-03-10 |
| 32. Frontend Cleanup | v1.5 | 1/1 | Complete | 2026-03-10 |
| 33. Provider Foundation | v1.6 | 7/7 | Complete | 2026-03-12 |
| 34. MCP Tool Bridge | 2/2 | Complete    | 2026-03-14 | - |
| 35. Frontend Integration | 3/3 | Complete   | 2026-03-14 | - |
| 36. Evaluation Support | v1.6 | 0/? | Not started | - |

_v1.0: 7 phases, 16 plans. All complete._
_v1.1: 6 phases, 9 plans. All complete._
_v1.2: 3 phases, 7 plans. All complete._
_v1.3: 2 phases, 4 plans. All complete._
_v1.4: 8 phases, 9 plans. All complete._
_v1.5: 6 phases, 11 plans. All complete._
_v1.6: 4 phases, ? plans. In progress._
