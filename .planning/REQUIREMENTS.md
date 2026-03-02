# Requirements: LO-Solver

**Defined:** 2026-03-02
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1.1 Requirements

Requirements for UI Polish milestone. Each maps to roadmap phases.

### Trace Hierarchy

- [x] **HIER-01**: Tool-call trace events carry correct parentId matching their parent agent-start event
- [x] **HIER-02**: Tools render nested under their actual parent agent in the trace panel (no orphans or misassignments)

### Reasoning Display

- [x] **STYLE-01**: Tables in reasoning text render with compact styling (smaller font, reduced padding)
- [x] **STYLE-02**: Codeblocks in reasoning text use horizontal scroll instead of expanding the container width

### Structured Data Formatting

- [ ] **FMT-01**: Tool input JSON renders as a labeled list with key-value formatting
- [ ] **FMT-02**: Tool output JSON renders as a labeled list with key-value formatting
- [ ] **FMT-03**: Agent structured output renders as a labeled list with key-value formatting
- [ ] **FMT-04**: Each formatted display retains the `{...}` toggle to view original raw JSON

### Agent Mascots

- [ ] **DUCK-01**: Agent duck mascot icons are oversized, extending beyond the card boundary (top-left, absolute positioned)
- [ ] **DUCK-02**: Duck mascots have a color tint that varies by agent type

### Workflow Controls

- [x] **CTRL-01**: Abort button in nav bar stops the running workflow and keeps partial results visible
- [x] **CTRL-02**: New Problem button in nav bar resets all state (problem text, messages, progress, mascot)
- [x] **CTRL-03**: All nav bar config controls (Model Mode toggle, Workflow Sliders, Eval Results link) are disabled during execution
- [ ] **CTRL-04**: Aborted workflow shows a distinct amber/yellow "Workflow aborted" banner (not reusing the error/failed state)
- [ ] **CTRL-05**: LO-Solver text in nav bar is plain text on home page and a link to home on other pages

## Future Requirements

None deferred — all features scoped to v1.1.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New trace event types | v1.1 fixes existing events, doesn't add new ones |
| Workflow pipeline changes | Pure frontend milestone — no backend logic changes beyond parentId fix |
| Mobile responsiveness | Desktop-only dev tool |
| Dark mode | Not requested for this milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HIER-01 | Phase 8 | Complete |
| HIER-02 | Phase 8 | Complete |
| STYLE-01 | Phase 9 | Complete |
| STYLE-02 | Phase 9 | Complete |
| FMT-01 | Phase 10 | Pending |
| FMT-02 | Phase 10 | Pending |
| FMT-03 | Phase 10 | Pending |
| FMT-04 | Phase 10 | Pending |
| DUCK-01 | Phase 11 | Pending |
| DUCK-02 | Phase 11 | Pending |
| CTRL-01 | Phase 12 | Complete |
| CTRL-02 | Phase 12 | Complete |
| CTRL-03 | Phase 12 | Complete |
| CTRL-04 | Phase 12 | Pending |
| CTRL-05 | Phase 12 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation*
