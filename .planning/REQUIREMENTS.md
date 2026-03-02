# Requirements: LO-Solver

**Defined:** 2026-03-02
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1.1 Requirements

Requirements for UI Polish milestone. Each maps to roadmap phases.

### Trace Hierarchy

- [ ] **HIER-01**: Tool-call trace events carry correct parentId matching their parent agent-start event
- [ ] **HIER-02**: Tools render nested under their actual parent agent in the trace panel (no orphans or misassignments)

### Reasoning Display

- [ ] **STYLE-01**: Tables in reasoning text render with compact styling (smaller font, reduced padding)
- [ ] **STYLE-02**: Codeblocks in reasoning text use horizontal scroll instead of expanding the container width

### Structured Data Formatting

- [ ] **FMT-01**: Tool input JSON renders as a labeled list with key-value formatting
- [ ] **FMT-02**: Tool output JSON renders as a labeled list with key-value formatting
- [ ] **FMT-03**: Agent structured output renders as a labeled list with key-value formatting
- [ ] **FMT-04**: Each formatted display retains the `{...}` toggle to view original raw JSON

### Agent Mascots

- [ ] **DUCK-01**: Agent duck mascot icons are oversized, extending beyond the card boundary (top-left, absolute positioned)
- [ ] **DUCK-02**: Duck mascots have a color tint that varies by agent type

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
| HIER-01 | — | Pending |
| HIER-02 | — | Pending |
| STYLE-01 | — | Pending |
| STYLE-02 | — | Pending |
| FMT-01 | — | Pending |
| FMT-02 | — | Pending |
| FMT-03 | — | Pending |
| FMT-04 | — | Pending |
| DUCK-01 | — | Pending |
| DUCK-02 | — | Pending |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 0
- Unmapped: 10 ⚠️

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after initial definition*
