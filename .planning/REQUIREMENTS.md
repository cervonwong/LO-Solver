# Requirements: LO-Solver

**Defined:** 2026-03-06
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1.3 Requirements

Requirements for user-provided OpenRouter API key. Each maps to roadmap phases.

### API Key Entry

- [ ] **KEY-01**: User can open an API key dialog from a button in the nav bar top-right
- [ ] **KEY-02**: User can enter, update, and clear their OpenRouter API key in the dialog
- [ ] **KEY-03**: API key persists in browser localStorage across sessions
- [ ] **KEY-04**: Button indicates key status (configured vs. needed)

### Key Routing

- [ ] **FLOW-01**: Frontend sends stored API key with solve requests via inputData
- [ ] **FLOW-02**: Backend creates per-request OpenRouter provider when user key is provided
- [ ] **FLOW-03**: Backend falls back to environment variable key when no user key is sent
- [ ] **FLOW-04**: Backend exposes whether server-side key is configured so frontend knows if user key is required
- [ ] **FLOW-05**: Solve request fails gracefully with clear error when no key is available from either source

## Future Requirements

None planned.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Key validation via test API call | User chose no validation; errors surface naturally during solve |
| Auto-prompt dialog on first visit | User chose button-only; no auto-prompt |
| Server-side key storage | localStorage is sufficient; no accounts/sessions needed |
| Key rotation / expiry | Out of scope for a personal tool |
| Multiple API key profiles | Single key is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| KEY-01 | Phase 17 | Pending |
| KEY-02 | Phase 17 | Pending |
| KEY-03 | Phase 17 | Pending |
| KEY-04 | Phase 17 | Pending |
| FLOW-01 | Phase 18 | Pending |
| FLOW-02 | Phase 18 | Pending |
| FLOW-03 | Phase 18 | Pending |
| FLOW-04 | Phase 18 | Pending |
| FLOW-05 | Phase 18 | Pending |

**Coverage:**
- v1.3 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*
