# Roadmap

## Milestones

- ✅ **v1.0 Prove the Agentic Advantage** — Phases 1-7 (shipped 2026-03-02)
- ✅ **v1.1 UI Polish** — Phases 8-13 (shipped 2026-03-03)
- ✅ **v1.2 Cleanup & Quality** — Phases 14-16 (shipped 2026-03-04)
- ✅ **v1.3 User API Key** — Phases 17-18 (shipped 2026-03-06)
- ✅ **v1.4 Claude Code Native Solver** — Phases 19-26 (shipped 2026-03-08)
- 📋 **v1.5 Refactor & Prompt Engineering** — Phases 27-32 (in progress)

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

### v1.5 Refactor & Prompt Engineering (In Progress)

**Milestone Goal:** Clean up the codebase without changing functionality, then rewrite all agent prompts using the latest model-specific best practices from OpenAI, Google, and Anthropic.

- [x] **Phase 27: Dead Code & Type Safety** - Remove deprecated files, dead exports, and replace all `any` types (completed 2026-03-08)
- [x] **Phase 28: Agent Factory** - Create `createWorkflowAgent()` factory and migrate all 12 agents (completed 2026-03-08)
- [x] **Phase 29: Hypothesize Step Split** - Split 1,240-line `02-hypothesize.ts` into 4 sub-phase files (completed 2026-03-09)
- [x] **Phase 30: Mastra Prompt Engineering** - Rewrite GPT-5-mini and Gemini 3 Flash prompts with eval verification (completed 2026-03-09)
- [x] **Phase 31: Claude Code Prompt Engineering** - Rewrite all 6 Claude Code agent prompts per Anthropic best practices (completed 2026-03-10)
- [x] **Phase 32: Frontend Cleanup** - Extract DevTracePanel inline handlers and clean up trace component types (completed 2026-03-10)

## Phase Details

### Phase 27: Dead Code & Type Safety
**Goal**: The codebase contains only live, typed code with no deprecated files or untyped escape hatches
**Depends on**: Nothing (first phase of v1.5)
**Requirements**: CLN-01, CLN-02, CLN-03, CLN-04
**Success Criteria** (what must be TRUE):
  1. No files matching `02a-initial-hypothesis-extractor-*` exist in the workflow directory, and no `index.ts` references them
  2. Running Knip reports zero unused exports in `src/` (or all remaining are false positives documented with justification)
  3. `shared-memory.ts` is either removed (if unused) or its purpose is documented with an inline comment explaining its consumers
  4. `npx tsc --noEmit` reports zero `any` annotations in workflow code (only the pre-existing CSS module error remains)
  5. `npm run eval -- --problem linguini-1` passes with identical scores to pre-cleanup baseline
**Plans:** 2/2 plans complete

Plans:
- [ ] 27-01-PLAN.md — Delete deprecated files, install Knip, clean unused exports
- [ ] 27-02-PLAN.md — Replace all any type annotations with explicit types

### Phase 28: Agent Factory
**Goal**: A single factory function produces all 12 workflow agents, eliminating boilerplate while preserving dynamic model resolution
**Depends on**: Phase 27
**Requirements**: STR-04, STR-05, STR-06, STR-07
**Success Criteria** (what must be TRUE):
  1. `agent-factory.ts` exists with a `createWorkflowAgent()` function that handles reasoning, extraction, and tester agent variants
  2. All 12 `*-agent.ts` files use the factory (no raw `new Agent()` constructor calls remain)
  3. Running with `--mode testing` and `--mode production` logs different model IDs in execution output, confirming dynamic model resolution works
  4. `npm run eval -- --problem linguini-1` passes with identical scores to pre-factory baseline
**Plans:** 2/2 plans complete

Plans:
- [ ] 28-01-PLAN.md — Create factory function, config type, and extract tester instructions
- [ ] 28-02-PLAN.md — Migrate all 12 agents to use factory and verify non-regression

### Phase 29: Hypothesize Step Split
**Goal**: The 1,240-line hypothesize step is decomposed into focused sub-phase files that are independently readable without any behavioral change
**Depends on**: Phase 28
**Requirements**: STR-01, STR-02, STR-03
**Success Criteria** (what must be TRUE):
  1. Four sub-phase files exist (`02a-dispatch.ts`, `02b-hypothesize.ts`, `02c-verify.ts`, `02d-synthesize.ts`), each under 350 lines
  2. `02-hypothesize.ts` is reduced to a thin coordinator (under 200 lines) that imports and calls sub-phase functions
  3. No sub-phase file imports from another sub-phase file (import-only leaves verified by grep)
  4. `npm run eval -- --comparison` produces identical scores to the pre-split baseline, confirming zero behavioral regression
**Plans:** 2/2 plans complete

Plans:
- [x] 29-01-PLAN.md — Type infrastructure and extract all 4 sub-phase functions (completed 2026-03-09)
- [ ] 29-02-PLAN.md — Rewrite coordinator to call sub-phases and verify non-regression

### Phase 30: Mastra Prompt Engineering
**Goal**: All 12 Mastra agent prompts are rewritten using model-specific best practices with eval-verified non-regression
**Depends on**: Phase 29
**Requirements**: PE-01, PE-02, PE-03, PE-05, PE-06, PE-07
**Success Criteria** (what must be TRUE):
  1. A numeric eval baseline (translation-accuracy and rule-quality scores) is captured and saved before any prompt changes
  2. All 5 GPT-5-mini agent prompts use static-first structure, explicit JSON schema descriptions, and literal instruction-following directives
  3. All 6 Gemini 3 Flash agent prompts use XML-delimited sections with no chain-of-thought scaffolding and no temperature overrides
  4. Confidence/conclusion vocabulary is consistent across all 13 Mastra agent prompts (no mixed terminology like "confident"/"certain"/"sure")
  5. At least one `--mode production` eval run per model family confirms no production-model-specific regressions
**Plans:** 3/3 plans complete

Plans:
- [ ] 30-01-PLAN.md — Rewrite 5 GPT-5-mini agent prompts with role-adapted vendor guide strategies
- [ ] 30-02-PLAN.md — Update shared confidence scale and rewrite 7 Gemini 3 Flash agent prompts
- [ ] 30-03-PLAN.md — Run final eval verification with comparison

### Phase 31: Claude Code Prompt Engineering
**Goal**: All 6 Claude Code agent prompts follow Anthropic best practices for Claude Opus 4.6 with XML structure and explicit tool guidance
**Depends on**: Phase 30
**Requirements**: PE-04
**Success Criteria** (what must be TRUE):
  1. All 6 Claude Code `.md` agent files use XML-tagged sections (`<instructions>`, `<context>`, `<input>`, `<task>`) instead of markdown headings for structural boundaries
  2. Each agent prompt opens with a role definition as the first sentence before any other content
  3. Prompts place long data/context before the task description (data-first ordering per Anthropic guidance)
  4. Tool use instructions specify conditions and expected behavior rather than blanket "ALWAYS" directives
**Plans**: 1 plan

Plans:
- [ ] 31-01-PLAN.md — Rewrite all 6 Claude Code agent prompts with XML structure, confidence scale, and hedged assertions

### Phase 32: Frontend Cleanup
**Goal**: Trace panel components use named, typed event handlers instead of inline callbacks
**Depends on**: Nothing (independent of other v1.5 phases)
**Requirements**: FE-01, FE-02
**Success Criteria** (what must be TRUE):
  1. DevTracePanel has zero inline arrow functions in JSX event handler props (all extracted to named functions)
  2. All trace component props use explicitly named interface types (no inline `{ foo: string; bar: number }` prop definitions)
  3. The trace panel renders identically in the browser with all event types visible (data-tool-call, data-vocabulary-update, data-rules-update confirmed in dev mode)
**Plans**: 1 plan

Plans:
- [ ] 32-01-PLAN.md — Extract inline handler, remove duplicate ChevronIcon, add named prop interfaces to all trace components

## Progress

**Execution Order:**
Phases execute in numeric order: 27 -> 28 -> 29 -> 30 -> 31 -> 32
(Phase 32 is independent and can run in parallel with 30-31 if desired)

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
| 27. Dead Code & Type Safety | 2/2 | Complete   | 2026-03-08 | - |
| 28. Agent Factory | 2/2 | Complete    | 2026-03-08 | - |
| 29. Hypothesize Step Split | 2/2 | Complete    | 2026-03-09 | - |
| 30. Mastra Prompt Engineering | 3/3 | Complete    | 2026-03-09 | - |
| 31. Claude Code Prompt Engineering | 1/1 | Complete    | 2026-03-10 | - |
| 32. Frontend Cleanup | 1/1 | Complete   | 2026-03-10 | - |

_v1.0: 7 phases, 16 plans. All complete._
_v1.1: 6 phases, 9 plans. All complete._
_v1.2: 3 phases, 7 plans. All complete._
_v1.3: 2 phases, 4 plans. All complete._
_v1.4: 8 phases, 9 plans. All complete._
_v1.5: 6 phases. Planning._
