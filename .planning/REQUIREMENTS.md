# Requirements: LO-Solver v1.5

**Defined:** 2026-03-08
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1.5 Requirements

Requirements for the refactoring and prompt engineering milestone. Each maps to roadmap phases.

### Cleanup

- [x] **CLN-01**: Deprecated agent files (`02a-initial-hypothesis-extractor-*`) and their `index.ts` registration are removed
- [x] **CLN-02**: Unused exports and dead code identified by Knip audit are removed (with full `src/` grep verification before each deletion)
- [x] **CLN-03**: `shared-memory.ts` audited and removed if unused
- [x] **CLN-04**: All 4 `any` type annotations in workflow code replaced with explicit typed alternatives

### Structure

- [ ] **STR-01**: `02-hypothesize.ts` (1,240 lines) split into 4 sub-phase files (dispatch, hypothesize, verify, synthesize) with a thin coordinator
- [x] **STR-02**: Sub-phase files are import-only leaves (no circular dependencies between them)
- [x] **STR-03**: `mainRules` and `mainVocabulary` Maps passed by reference (not copied) to sub-phases
- [x] **STR-04**: Agent factory `createWorkflowAgent()` created handling 3 agent variants (reasoning, extraction, tester)
- [x] **STR-05**: All 13 agent definitions migrated to use the factory
- [x] **STR-06**: Factory preserves dynamic `({ requestContext }) => ...` model resolution pattern
- [x] **STR-07**: Testing/production model switching verified working after factory migration

### Frontend

- [ ] **FE-01**: DevTracePanel inline event handlers extracted to named functions
- [ ] **FE-02**: Component naming and prop types cleaned up in trace components

### Prompt Engineering

- [ ] **PE-01**: Eval baseline captured with `npm run eval -- --comparison` before any prompt changes
- [ ] **PE-02**: GPT-5-mini agent prompts (5 agents) rewritten per OpenAI GPT-5 prompting guide — static-first structure, explicit JSON schema descriptions, literal instruction-following
- [ ] **PE-03**: Gemini 3 Flash agent prompts (6 agents) rewritten per Google Gemini 3 prompting guide — XML delimiters, removed chain-of-thought scaffolding, data-first ordering
- [ ] **PE-04**: Claude Opus 4.6 agent prompts (6 agents) rewritten per Anthropic Claude 4.6 best practices — XML-tagged sections, role-first structure, tool use guidance
- [ ] **PE-05**: Confidence/conclusion vocabulary standardized across all 19 agent prompts
- [ ] **PE-06**: Each prompt rewrite verified with eval run (no regression from baseline)
- [ ] **PE-07**: At least one `--mode production` eval run per model family to catch production-model-specific regressions

## Future Requirements

### Deferred

- **SCH-01**: Split `workflow-schemas.ts` into domain files — deferred due to 39-edge import graph and circular dependency risk
- **CTX-01**: Full `request-context-helpers.ts` domain split — deferred; only draft stores extraction considered for v1.5
- **CI-01**: Automated prompt regression CI pipeline — requires infrastructure investment

## Out of Scope

| Feature | Reason |
|---------|--------|
| Schema barrel split | Research strongly recommends against — 39 import edges, circular dependency risk |
| Full context helpers decomposition | Low ROI, already helper-only code |
| New features or functionality changes | Refactoring milestone — zero behavioral changes |
| Model changes or additions | Stack is frozen for this milestone |
| Prompt templating libraries (DSPy, LangChain) | Plain TypeScript string exports are sufficient |
| Runtime dependency additions | Only Knip 5.86.0 as dev dependency for audit |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLN-01 | Phase 27 | Complete |
| CLN-02 | Phase 27 | Complete |
| CLN-03 | Phase 27 | Complete |
| CLN-04 | Phase 27 | Complete |
| STR-04 | Phase 28 | Complete |
| STR-05 | Phase 28 | Complete |
| STR-06 | Phase 28 | Complete |
| STR-07 | Phase 28 | Complete |
| STR-01 | Phase 29 | Pending |
| STR-02 | Phase 29 | Complete |
| STR-03 | Phase 29 | Complete |
| PE-01 | Phase 30 | Pending |
| PE-02 | Phase 30 | Pending |
| PE-06 | Phase 30 | Pending |
| PE-07 | Phase 30 | Pending |
| PE-03 | Phase 30 | Pending |
| PE-04 | Phase 31 | Pending |
| PE-05 | Phase 30 | Pending |
| FE-01 | Phase 32 | Pending |
| FE-02 | Phase 32 | Pending |

**Coverage:**
- v1.5 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after initial definition*
