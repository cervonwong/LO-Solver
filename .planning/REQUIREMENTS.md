# Requirements: LO-Solver

**Defined:** 2026-03-03
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1.2 Requirements

Requirements for v1.2 Cleanup & Quality. Each maps to roadmap phases.

### Abort Propagation

- [ ] **ABORT-01**: Workflow steps pass `abortSignal` from execute params to all `streamWithRetry`/`generateWithRetry` calls
- [ ] **ABORT-02**: Aborted workflows display amber "aborted" state in UI, distinct from red "error/failed" state
- [ ] **ABORT-03**: Fallback cancel endpoint (`POST /api/solve/cancel`) guarantees abort when `req.signal` is unreliable
- [ ] **ABORT-04**: Verify/improve loop checks `abortSignal.aborted` at iteration boundaries before starting next round

### Code Refactoring

- [ ] **REFAC-01**: `workflow.ts` step definitions extracted to individual `steps/*.ts` files; composition chain remains in `workflow.ts`
- [ ] **REFAC-02**: `trace-event-card.tsx` sub-components extracted to focused files under `components/trace/`
- [ ] **REFAC-03**: `page.tsx` hooks and logic extracted to dedicated hook files and sub-components
- [ ] **REFAC-04**: All refactored modules pass `npx tsc --noEmit` with no new errors

### Toast Notifications

- [ ] **TOAST-01**: Sonner installed via shadcn; `<Toaster />` added to root layout, styled to blueprint/cyanotype theme
- [ ] **TOAST-02**: Toast fires when workflow solve starts
- [ ] **TOAST-03**: Toast fires when workflow completes successfully with results
- [ ] **TOAST-04**: Toast fires when workflow is aborted by user
- [ ] **TOAST-05**: Toast fires when workflow encounters an error
- [ ] **TOAST-06**: Toast fires when cumulative API cost crosses configurable thresholds during a run
- [ ] **TOAST-07**: All toasts use stable IDs to prevent duplicates in React Strict Mode

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Observability

- **OBS-01**: Custom Sonner toast variants (progress toast with inline status)
- **OBS-02**: Toast notification preferences (user can disable categories)

### Code Quality

- **QUAL-01**: Additional file size audit after v1.2 refactoring to catch new growth

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time abort of already-returned LLM tokens | OpenRouter streaming can't un-send tokens; abort prevents new calls only |
| Full test framework setup | Eval harness remains the testing strategy per project constraints |
| Refactoring agent/tool files | Agent files are already single-responsibility; no split needed |
| Toast sound effects | Unnecessary for a dev tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ABORT-01 | — | Pending |
| ABORT-02 | — | Pending |
| ABORT-03 | — | Pending |
| ABORT-04 | — | Pending |
| REFAC-01 | — | Pending |
| REFAC-02 | — | Pending |
| REFAC-03 | — | Pending |
| REFAC-04 | — | Pending |
| TOAST-01 | — | Pending |
| TOAST-02 | — | Pending |
| TOAST-03 | — | Pending |
| TOAST-04 | — | Pending |
| TOAST-05 | — | Pending |
| TOAST-06 | — | Pending |
| TOAST-07 | — | Pending |

**Coverage:**
- v1.2 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15 (pending roadmap creation)

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after initial definition*
