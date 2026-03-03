# Roadmap

## Milestones

- ✅ **v1.0 Prove the Agentic Advantage** — Phases 1-7 (shipped 2026-03-02)
- ✅ **v1.1 UI Polish** — Phases 8-13 (shipped 2026-03-03)

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

### 🚧 v1.1 UI Polish (In Progress)

**Milestone Goal:** Refine the trace panel and results display with hierarchy bug fixes, compact styling, structured data formatting, and expressive agent mascots.

- [x] **Phase 8: Trace Hierarchy Fix** - Root-cause fix for parentId emission and frontend verification (completed 2026-03-02)
- [x] **Phase 9: Compact Reasoning Display** - Smaller tables and scrollable codeblocks in streamdown rendering (completed 2026-03-02)
- [ ] **Phase 10: Structured Data Formatting** - Tool I/O and agent output as labeled lists with raw JSON toggle
- [x] **Phase 11: Agent Duck Mascots** - Oversized color-tinted duck icons overflowing agent cards (completed 2026-03-03)

## Phase Details

### Phase 8: Trace Hierarchy Fix
**Goal**: Tool-call trace events nest correctly under their parent agent with no orphans or fallback hacks
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: HIER-01, HIER-02
**Success Criteria** (what must be TRUE):
  1. Every tool-call trace event emitted by the backend carries a parentId that matches an existing agent-start event
  2. The activeAgentStack fallback in groupEventsWithAgents (trace-utils.ts) is removed because it is no longer needed
  3. In the trace panel, every tool card renders nested inside its parent agent card with no orphaned tool calls at the root level
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — Backend parentId fix, deprecated type removal, type rename
- [x] 08-02-PLAN.md — Remove activeAgentStack fallback, orphan detection, visual verification

### Phase 9: Compact Reasoning Display
**Goal**: Agent reasoning text renders compactly without overflowing or bloating the trace panel
**Depends on**: Phase 8
**Requirements**: STYLE-01, STYLE-02
**Success Criteria** (what must be TRUE):
  1. Tables inside reasoning text render with smaller font size and reduced cell padding compared to the default streamdown styling
  2. Codeblocks inside reasoning text scroll horizontally when content exceeds the container width instead of expanding the container
  3. Neither tables nor codeblocks cause the trace panel to grow wider than its allocated resizable panel width
**Plans**: 1 plan

Plans:
- [x] 09-01-PLAN.md — Compact reasoning CSS overrides and visual verification

### Phase 10: Structured Data Formatting
**Goal**: Structured JSON data throughout the trace panel renders as human-readable labeled lists instead of raw JSON
**Depends on**: Phase 8
**Requirements**: FMT-01, FMT-02, FMT-03, FMT-04
**Success Criteria** (what must be TRUE):
  1. Tool input JSON displays as a labeled list with key names as labels and values formatted inline
  2. Tool output JSON displays as a labeled list with key names as labels and values formatted inline
  3. Agent structured output (non-streaming final result) displays as a labeled list with key names as labels and values formatted inline
  4. Each labeled list has a toggle button (e.g., `{...}` icon) that switches to the original raw JSON view and back
**Plans**: TBD

### Phase 11: Agent Duck Mascots
**Goal**: Agent cards in the trace panel have expressive, oversized duck mascot icons that visually distinguish agent types
**Depends on**: Phase 8
**Requirements**: DUCK-01, DUCK-02
**Success Criteria** (what must be TRUE):
  1. Each agent card displays a duck mascot icon that is visibly larger than the card header and extends beyond the top-left card boundary using absolute positioning
  2. Duck mascot icons use a distinct color tint per agent type so users can identify agent roles at a glance without reading the label
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10 -> 11
(Phases 9, 10, 11 are independent of each other but all follow Phase 8)

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
| 10. Structured Data Formatting | v1.1 | 0/? | Not started | - |
| 11. Agent Duck Mascots | 1/1 | Complete   | 2026-03-03 | - |
| 12. Workflow Control Buttons | v1.1 | 2/2 | Complete | 2026-03-02 |
| 13. 3-Column Layout | v1.1 | Complete    | 2026-03-03 | 2026-03-03 |

_v1.0: 7 phases, 16 plans. All complete._
_v1.1: 6 phases, 6 plans complete. Phases 10, 11 not started._

### Phase 12: Add workflow control buttons (Abort, New Problem, Clear) and disable config controls during execution

**Goal:** Nav bar has Abort and New Problem buttons that control the workflow, all config controls disable during execution, and aborted workflows show a distinct amber state
**Requirements**: CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05
**Depends on:** Phase 11
**Plans:** 1/1 plans complete

Plans:
- [x] 12-01-PLAN.md — WorkflowControlContext and client layout wrapper for state bridging
- [x] 12-02-PLAN.md — Abort/New Problem buttons, config disable, aborted state, conditional LO-Solver link

### Phase 13: Move vocabulary and rules panel to a third column layout

**Goal:** Solver page transitions from 2-column to 3-column layout when the workflow starts, giving vocabulary and rules their own dedicated column with animated transition and responsive collapse below 1024px
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04
**Depends on:** Phase 12
**Plans:** 1/1 plans complete

Plans:
- [x] 13-01-PLAN.md — 3-column layout with animated workflow-start transition and responsive collapse
