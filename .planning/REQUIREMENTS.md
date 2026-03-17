# Requirements: LO-Solver v1.7

**Defined:** 2026-03-17
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1.7 Requirements

Requirements for security hardening milestone. Each maps to roadmap phases.

### Secret Handling

- [ ] **SEC-01**: API key is not persisted to LibSQL via workflow state schema
- [ ] **SEC-02**: Solve endpoint receives API key via HTTP header instead of request body
- [ ] **SEC-03**: Credits endpoint receives API key via HTTP header instead of query string

### Endpoint Hardening

- [ ] **GUARD-01**: Cancel endpoint only cancels the specified workflow run, not all active runs
- [ ] **GUARD-02**: Solve endpoint enforces in-memory rate limiting
- [ ] **GUARD-03**: Eval API routes can be locked via optional EVAL_API_TOKEN bearer token
- [ ] **GUARD-04**: Claude auth endpoint returns only fields used by the UI (no email)
- [ ] **GUARD-05**: Next.js proxy layer enforces HTTP method restrictions on POST-only endpoints

### Code Quality

- [ ] **QUAL-01**: All filesystem logging calls use async I/O instead of sync
- [ ] **QUAL-02**: Logging can be disabled via LOG_ENABLED environment variable
- [ ] **QUAL-03**: Trace panel visibility is controlled via NEXT_PUBLIC_SHOW_TRACE env var
- [ ] **QUAL-04**: Workflow schema nullability trap in structuredProblemSchema is fixed
- [ ] **QUAL-05**: Dead code and unused dependencies are removed (Knip audit)
- [ ] **QUAL-06**: Naming inconsistencies and comment/code mismatches are fixed

## Future Requirements

### Secret Handling (Deferred)

- **SEC-04**: Log files have API key patterns redacted via redactSecrets() utility
- **SEC-05**: Credits endpoint does not use server key for unauthenticated requests

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full auth system (NextAuth, Clerk, JWT) | Single-user dev tool; no accounts, would break eval harness |
| Server-side encrypted key storage | localStorage is appropriate; the real leak is LibSQL |
| Redis-backed distributed rate limiting | Single-process app; in-memory counter sufficient |
| CSP headers | No untrusted input; would break inline styles from shadcn/ui |
| API key rotation / expiry | User manages their own OpenRouter key; app is pass-through |
| Request signing / HMAC | All calls are localhost; signing adds complexity with no benefit |
| Audit logging | Single user; there is no "who" to audit |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | — | Pending |
| SEC-02 | — | Pending |
| SEC-03 | — | Pending |
| GUARD-01 | — | Pending |
| GUARD-02 | — | Pending |
| GUARD-03 | — | Pending |
| GUARD-04 | — | Pending |
| GUARD-05 | — | Pending |
| QUAL-01 | — | Pending |
| QUAL-02 | — | Pending |
| QUAL-03 | — | Pending |
| QUAL-04 | — | Pending |
| QUAL-05 | — | Pending |
| QUAL-06 | — | Pending |

**Coverage:**
- v1.7 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
