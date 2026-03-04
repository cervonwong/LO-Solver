# Roadmap

## Milestones

- ✅ **v1.0 Prove the Agentic Advantage** — Phases 1-7 (shipped 2026-03-02)
- ✅ **v1.1 UI Polish** — Phases 8-13 (shipped 2026-03-03)
- 🚧 **v1.2 Cleanup & Quality** — Phases 14-16 (in progress)

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

### 🚧 v1.2 Cleanup & Quality (In Progress)

**Milestone Goal:** Tighten what's already built — better abort behavior, cleaner codebase, better user feedback.

- [ ] **Phase 14: Abort Propagation** - Abort button stops in-flight LLM calls and preserves correct workflow status
- [ ] **Phase 15: File Refactoring** - Split oversized modules into focused files with no behavior changes
- [ ] **Phase 16: Toast Notifications** - Sonner toasts for workflow lifecycle events

## Phase Details

### Phase 14: Abort Propagation
**Goal**: Clicking abort actually stops all in-flight OpenRouter LLM calls within seconds and the workflow shows "canceled" not "failed"
**Depends on**: Nothing (first phase in v1.2)
**Requirements**: ABORT-01, ABORT-02, ABORT-03, ABORT-04
**Success Criteria** (what must be TRUE):
  1. User clicks abort during a solve and all pending LLM API calls stop within seconds (no further OpenRouter charges accumulate)
  2. After aborting, the workflow status in the UI shows the amber "aborted" state, not a red error/failed state
  3. User can abort during the verify/improve loop and the next iteration does not start
  4. Abort works reliably even if the browser-to-server signal is unreliable (cancel endpoint fallback)
**Plans**: 2 plans
- [ ] 14-01-PLAN.md — Backend abort infrastructure: cancel endpoint, signal threading, iteration boundary checks
- [ ] 14-02-PLAN.md — Frontend abort UX: confirmation dialog, aborting state, visual feedback

### Phase 15: File Refactoring
**Goal**: Oversized source files split into focused, single-responsibility modules with zero behavior changes
**Depends on**: Phase 14 (abort wiring must be stable before the files it touches are restructured)
**Requirements**: REFAC-01, REFAC-02, REFAC-03, REFAC-04
**Success Criteria** (what must be TRUE):
  1. `workflow.ts` is a short composition file (~30 lines) and each step definition lives in its own file under `steps/`
  2. `trace-event-card.tsx` sub-components live in focused files under `components/trace/`
  3. `page.tsx` is smaller with extracted hooks and sub-components, and the solver page works identically to before
  4. `npx tsc --noEmit` passes with no new errors after all splits
**Plans**: TBD

### Phase 16: Toast Notifications
**Goal**: Users get non-blocking feedback for workflow lifecycle events without watching the UI constantly
**Depends on**: Phase 15 (benefits from slimmer page.tsx; no file conflict risk)
**Requirements**: TOAST-01, TOAST-02, TOAST-03, TOAST-04, TOAST-05, TOAST-06, TOAST-07
**Success Criteria** (what must be TRUE):
  1. User sees a toast when a solve starts, and distinct toasts when it completes, is aborted, or errors
  2. User sees a cost-warning toast when cumulative API spend crosses a configurable threshold during a run
  3. Toasts are styled consistently with the blueprint/cyanotype design system
  4. Switching to another tab and back does not produce duplicate toasts (stable IDs prevent React Strict Mode duplication)
**Plans**: TBD

## Progress

**Execution Order:** 14 → 15 → 16

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
| 14. Abort Propagation | 1/2 | In Progress|  | - |
| 15. File Refactoring | v1.2 | 0/? | Not started | - |
| 16. Toast Notifications | v1.2 | 0/? | Not started | - |

_v1.0: 7 phases, 16 plans. All complete._
_v1.1: 6 phases, 9 plans. All complete._
_v1.2: 3 phases. In progress._
