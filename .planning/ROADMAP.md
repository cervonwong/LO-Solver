# Roadmap

## Milestones

- ✅ **v1.0 Prove the Agentic Advantage** — Phases 1-7 (shipped 2026-03-02)
- ✅ **v1.1 UI Polish** — Phases 8-13 (shipped 2026-03-03)
- ✅ **v1.2 Cleanup & Quality** — Phases 14-16 (shipped 2026-03-04)
- ✅ **v1.3 User API Key** — Phases 17-18 (shipped 2026-03-06)
- 🚧 **v1.4 Claude Code Native Solver** — Phases 19-24 (in progress)

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

### 🚧 v1.4 Claude Code Native Solver (In Progress)

**Milestone Goal:** Rebuild the LO-Solver workflow as a Claude Code native experience using subagents, skills, and system prompts -- running alongside the existing Mastra implementation.

- [x] **Phase 19: Workflow Documentation** - Document existing Mastra pipeline as reference for Claude Code agents (completed 2026-03-07)
- [x] **Phase 20: Infrastructure Setup** - Create directory structure, agent conventions, and project context (completed 2026-03-07)
- [ ] **Phase 21: Pipeline Agents** - Define extractor and hypothesizer subagents with self-contained prompts
- [ ] **Phase 22: Orchestrator and Entry Point** - Build slash command, orchestrator agent, and pipeline dispatch logic
- [ ] **Phase 23: Verify-Improve Loop and Answer** - Implement iterative verification, improvement, and final answer agents
- [ ] **Phase 24: Output and Integration** - Terminal results display, markdown solution file, workspace preservation

## Phase Details

### Phase 19: Workflow Documentation
**Goal**: A comprehensive reference document exists that any agent (or human) can read to understand the full Mastra solver pipeline
**Depends on**: Phase 18 (v1.3 complete)
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04
**Success Criteria** (what must be TRUE):
  1. A markdown file in `claude-code/` describes the full pipeline (extract, hypothesize, verify/improve, answer) with data flow between steps
  2. Each agent's role, inputs, outputs, and prompt summary are documented in that file
  3. The verification loop mechanics (iteration flow, pass/fail logic, improvement strategy) are described with enough detail to reimplement
  4. The document is self-contained -- reading it alone is sufficient to understand what the Claude Code agents must replicate
**Plans**: 1 plan
- [ ] 19-01-PLAN.md — Write comprehensive pipeline reference document (claude-code/PIPELINE.md)

### Phase 20: Infrastructure Setup
**Goal**: The `claude-code/` directory is ready for agent development with conventions, project context, and directory structure in place
**Depends on**: Phase 19
**Requirements**: INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. `claude-code/.claude/` directory exists with the correct structure for agent definitions
  2. All agent definition files specify Opus 4.6 as the model
  3. A CLAUDE.md file in `claude-code/` describes project context, file conventions, and workspace directory purpose
**Plans**: 1 plan
- [ ] 20-01-PLAN.md — Create directory structure, agent skeletons, skill shell, CLAUDE.md, and workspace format reference

### Phase 21: Pipeline Agents
**Goal**: The extraction and hypothesis agents exist as standalone Claude Code subagent definitions that produce correctly structured output
**Depends on**: Phase 20
**Requirements**: EXTR-01, EXTR-02, HYPO-01, HYPO-02, HYPO-03
**Success Criteria** (what must be TRUE):
  1. An extractor agent can parse a raw Linguistics Olympiad problem into structured JSON and write it to `workspace/extracted.json`
  2. A hypothesizer agent can generate linguistic rules and vocabulary from a specific perspective and write to `workspace/hypothesis-{n}.json`
  3. Multiple hypothesizer instances can be dispatched sequentially with different perspectives, each writing to its own numbered draft file
  4. Each agent's prompt is fully self-contained with explicit input/output format specifications (no reliance on inherited context)
**Plans**: 1 plan
- [ ] 21-01-PLAN.md -- Write extractor and hypothesizer agent system prompts

### Phase 22: Orchestrator and Entry Point
**Goal**: A user can trigger the solver via `/solve` and the orchestrator dispatches subagents in pipeline order with file-based state
**Depends on**: Phase 21
**Requirements**: ORCH-01, ORCH-02, ORCH-03, ORCH-04, ORCH-05
**Success Criteria** (what must be TRUE):
  1. User can run `/solve` in Claude Code to start the solver
  2. The orchestrator asks for problem input (paste text or file path) if not provided as an argument
  3. The orchestrator dispatches subagents sequentially in pipeline order, with each agent reading predecessor files and writing its own output file
  4. The orchestrator selects the best hypothesis by comparing test pass rates from hypothesis files
  5. The orchestrator validates subagent completion via spot-check (output file exists and contains valid JSON) rather than relying on return status
**Plans**: TBD

### Phase 23: Verify-Improve Loop and Answer
**Goal**: The solver can iteratively verify rules against the dataset, improve failing rules, and produce final translated answers
**Depends on**: Phase 22
**Requirements**: VERI-01, VERI-02, VERI-03, IMPR-01, IMPR-02, ANSR-01, ANSR-02
**Success Criteria** (what must be TRUE):
  1. A verifier agent tests each rule and sentence against the dataset and writes structured results to `workspace/verification-{iteration}.json`
  2. An improver agent reads verification failures and writes revised rules to `workspace/improved-{iteration}.json`
  3. The verify/improve loop runs up to 4 iterations, stopping early if all rules pass
  4. An answerer agent applies the validated rules to translate questions and writes results to `workspace/answers.json`
  5. All intermediate JSON files follow the workspace naming convention and are valid JSON
**Plans**: TBD

### Phase 24: Output and Integration
**Goal**: The solver produces readable results in the terminal and a complete markdown solution file with all intermediate steps preserved
**Depends on**: Phase 23
**Requirements**: OUTP-01, OUTP-02, OUTP-03
**Success Criteria** (what must be TRUE):
  1. After solving, the terminal displays the discovered rules, vocabulary, and final answers in a readable format
  2. A markdown solution file is written containing all intermediate steps (extraction, hypotheses, verification rounds, final answers)
  3. All intermediate JSON files remain in the workspace directory for debugging and inspection
**Plans**: TBD

## Progress

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
| 19. Workflow Documentation | 1/1 | Complete    | 2026-03-07 | - |
| 20. Infrastructure Setup | 1/1 | Complete    | 2026-03-07 | - |
| 21. Pipeline Agents | v1.4 | 0/? | Not started | - |
| 22. Orchestrator and Entry Point | v1.4 | 0/? | Not started | - |
| 23. Verify-Improve Loop and Answer | v1.4 | 0/? | Not started | - |
| 24. Output and Integration | v1.4 | 0/? | Not started | - |

_v1.0: 7 phases, 16 plans. All complete._
_v1.1: 6 phases, 9 plans. All complete._
_v1.2: 3 phases, 7 plans. All complete._
_v1.3: 2 phases, 4 plans. All complete._
_v1.4: 6 phases, plans TBD._
