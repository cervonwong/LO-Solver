# Roadmap

## Milestones

- ✅ **v1.0 Prove the Agentic Advantage** — Phases 1-7 (shipped 2026-03-02)
- ✅ **v1.1 UI Polish** — Phases 8-13 (shipped 2026-03-03)
- ✅ **v1.2 Cleanup & Quality** — Phases 14-16 (shipped 2026-03-04)
- 🚧 **v1.3 User API Key** — Phases 17-18 (in progress)

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

### 🚧 v1.3 User API Key (In Progress)

**Milestone Goal:** Allow users to provide their own OpenRouter API key so the app can be deployed without embedding a server-side key.

- [ ] **Phase 17: Key Entry UI** - Nav bar button and dialog for entering, updating, and clearing the API key with localStorage persistence
- [ ] **Phase 18: Key Routing** - Wire the stored key through the solve pipeline, with backend fallback to env key and graceful error when neither is present

## Phase Details

### Phase 17: Key Entry UI
**Goal**: Users can store their OpenRouter API key in the browser and see its status at a glance
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: KEY-01, KEY-02, KEY-03, KEY-04
**Implementation note**: Button shares or replaces the existing CreditsBadge position in the nav bar top-right.
**Success Criteria** (what must be TRUE):
  1. User can click a button in the nav bar top-right (CreditsBadge area) to open the API key dialog
  2. User can type an API key into the dialog and save it, replacing any previously stored value
  3. User can clear the stored API key from the dialog, leaving no key in localStorage
  4. The nav bar button visually distinguishes between "key configured" and "key needed" states
  5. A saved key survives a full page reload and appears pre-filled in the dialog on next open
**Plans**: TBD

### Phase 18: Key Routing
**Goal**: The stored API key flows through every solve request and the backend handles presence or absence of a key cleanly
**Depends on**: Phase 17
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05
**Success Criteria** (what must be TRUE):
  1. Submitting a solve request sends the localStorage key to the backend in inputData
  2. When a user key is provided, the backend creates a per-request OpenRouter provider using that key
  3. When no user key is sent, the backend falls back to the environment variable key without error
  4. The frontend can query whether a server-side key is configured and reflects this in the UI (e.g., key dialog knows if user key is optional or required)
  5. Submitting a solve request with no key from either source produces a clear, user-readable error rather than a cryptic API failure
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
| 17. Key Entry UI | v1.3 | 0/? | Not started | - |
| 18. Key Routing | v1.3 | 0/? | Not started | - |

_v1.0: 7 phases, 16 plans. All complete._
_v1.1: 6 phases, 9 plans. All complete._
_v1.2: 3 phases, 7 plans. All complete._
_v1.3: 2 phases, TBD plans. In progress._
