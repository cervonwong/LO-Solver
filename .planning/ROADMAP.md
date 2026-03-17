# Roadmap

## Milestones

- ✅ **v1.0 Prove the Agentic Advantage** — Phases 1-7 (shipped 2026-03-02)
- ✅ **v1.1 UI Polish** — Phases 8-13 (shipped 2026-03-03)
- ✅ **v1.2 Cleanup & Quality** — Phases 14-16 (shipped 2026-03-04)
- ✅ **v1.3 User API Key** — Phases 17-18 (shipped 2026-03-06)
- ✅ **v1.4 Claude Code Native Solver** — Phases 19-26 (shipped 2026-03-08)
- ✅ **v1.5 Refactor & Prompt Engineering** — Phases 27-32 (shipped 2026-03-10)
- ✅ **v1.6 Claude Code Provider** — Phases 33-36 (shipped 2026-03-14)
- 🚧 **v1.7 Security Fixes** — Phases 39-41 (in progress)

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

<details>
<summary>✅ v1.6 Claude Code Provider (Phases 33-36) — SHIPPED 2026-03-14</summary>

- [x] Phase 33: Provider Foundation (7/7 plans) — completed 2026-03-12
- [x] Phase 34: MCP Tool Bridge (2/2 plans) — completed 2026-03-14
- [x] Phase 35: Frontend Integration (3/3 plans) — completed 2026-03-14
- [x] Phase 36: Evaluation Support (2/2 plans) — completed 2026-03-14

</details>

### 🚧 v1.7 Security Fixes (In Progress)

**Milestone Goal:** Harden secret handling, close unauthenticated API endpoints, and clean up security-adjacent code debt.

- [ ] **Phase 39: API Key Transport** - Move API key out of persisted state and request URLs into secure HTTP headers
- [ ] **Phase 40: Endpoint Guards** - Add scoped cancellation, rate limiting, bearer token protection, and method enforcement to API routes
- [ ] **Phase 41: Code Quality and Logging** - Convert logging to async I/O with opt-in gating, fix schema nullability, and clean up dead code

## Phase Details

### Phase 39: API Key Transport
**Goal**: API key no longer reaches disk (LibSQL) or appears in URLs, request bodies, or browser history
**Depends on**: Nothing (first phase of v1.7)
**Requirements**: SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Running a solve with a user-provided API key and then inspecting the LibSQL database shows no API key values in any workflow snapshot or state records
  2. Browser network tab shows the API key sent via `x-openrouter-key` request header on both solve and credits requests, with no key in the URL, query string, or request body
  3. Solving a problem with `OPENROUTER_API_KEY` unset and only a user-provided key works end-to-end (key propagates through all workflow steps)
  4. Credits badge fetches and displays balance correctly using header-based key transport
**Plans:** 1/2 plans executed
Plans:
- [ ] 39-01-PLAN.md — Remove apiKey from schemas, update workflow steps and route handlers for header-based key propagation
- [ ] 39-02-PLAN.md — Switch frontend to send API key via x-openrouter-key header

### Phase 40: Endpoint Guards
**Goal**: API routes enforce scoped access, rate limits, method restrictions, and minimal response surfaces
**Depends on**: Phase 39 (shared route files modified in Phase 39 must be stable first)
**Requirements**: GUARD-01, GUARD-02, GUARD-03, GUARD-04, GUARD-05
**Success Criteria** (what must be TRUE):
  1. Aborting a solve in one browser tab does not cancel a solve running in a different tab (cancel is scoped to a specific run)
  2. Rapidly submitting more than 5 solve requests within one minute returns a 429 rate limit response
  3. Sending a GET request to the solve endpoint (POST-only) returns a 405 Method Not Allowed response
  4. Accessing `/api/evals` with `EVAL_API_TOKEN` set but no bearer token in the request returns 401 Unauthorized; without the env var set, access is open
  5. The `/api/claude-auth` response JSON contains only the fields the UI uses (no email or other unnecessary personal data)
**Plans**: TBD

### Phase 41: Code Quality and Logging
**Goal**: Logging uses non-blocking async I/O with opt-in gating, and accumulated code quality issues are resolved
**Depends on**: Phase 40 (highest file-count blast radius; execute on stable codebase)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. Running a solve with `LOG_ENABLED` unset produces no log files on disk; setting `LOG_ENABLED=true` produces log files as before
  2. No `fs.writeFileSync` or `fs.appendFileSync` calls remain in the logging module (all file I/O is async)
  3. The trace panel is hidden when `NEXT_PUBLIC_SHOW_TRACE` is unset or set to `false`, and visible when set to `true`
  4. Running `npx knip` reports no new dead exports or unused dependencies beyond the pre-existing CSS module warning
  5. The `structuredProblemSchema` nullable fields parse correctly for both null and missing values without runtime errors

## Progress

**Execution Order:**
Phases execute in numeric order: 39 → 40 → 41

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
| 34. MCP Tool Bridge | v1.6 | 2/2 | Complete | 2026-03-14 |
| 35. Frontend Integration | v1.6 | 3/3 | Complete | 2026-03-14 |
| 36. Evaluation Support | v1.6 | 2/2 | Complete | 2026-03-14 |
| 39. API Key Transport | 1/2 | In Progress|  | - |
| 40. Endpoint Guards | v1.7 | 0/0 | Not started | - |
| 41. Code Quality and Logging | v1.7 | 0/0 | Not started | - |

_v1.0: 7 phases, 16 plans. All complete._
_v1.1: 6 phases, 9 plans. All complete._
_v1.2: 3 phases, 7 plans. All complete._
_v1.3: 2 phases, 4 plans. All complete._
_v1.4: 8 phases, 9 plans. All complete._
_v1.5: 6 phases, 11 plans. All complete._
_v1.6: 4 phases, 14 plans. All complete._
_v1.7: 3 phases, 2 plans. In progress._
