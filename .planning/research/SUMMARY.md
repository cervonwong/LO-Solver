# Project Research Summary

**Project:** LO-Solver v1.7 Security Hardening
**Domain:** Security hardening for a single-user Next.js + Mastra AI agent solver
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

LO-Solver is a single-user development tool — not a SaaS product — and security hardening must be calibrated to that context. The research identified five genuine security defects where secrets reach unintended destinations: the OpenRouter API key is serialized into a LibSQL database on every `setState()` call, transmitted via query string (exposing it to browser history, server logs, and referrer headers), written to markdown log files on disk, and the cancel endpoint cancels all active runs with no scoping. These are real data-leak issues that should be fixed. Every other enhancement on a standard security checklist (auth middleware, CSRF, JWT, session management, Redis-backed rate limiting) is disproportionate to the single-user threat model and would break the eval harness, Mastra Studio, and the development workflow.

The recommended approach is three sequential phases. Phase 1 fixes the actual data leaks by moving the API key from the request body and query strings to a custom HTTP header (`x-openrouter-key`) and removing it from workflow state persistence. This is the highest-impact change and has a critical dependency: Steps 2 and 3 of the workflow currently read the key from Mastra state, so removing it from the state schema requires a verified replacement propagation mechanism before any other work proceeds. Phase 2 adds lightweight endpoint hardening (scoped cancellation, optional bearer token on eval routes, proxy method enforcement, rate limiting). Phase 3 addresses code quality: async file I/O in logging, opt-in log gating, and schema cleanup.

One architectural question is unsettled and must be resolved at implementation start: whether Mastra persists `inputData` in `mastra_workflow_snapshot` records alongside `workflowStateSchema`. If it does, keeping `apiKey` in `rawProblemInputSchema` (but removing it from `workflowStateSchema`) would still result in the key reaching disk. The fallback is an in-memory side-channel keyed by `runId` (similar to the existing `activeRuns` Map). This requires a one-line database inspection at implementation start before committing to the approach.

## Key Findings

### Recommended Stack

The v1.7 milestone requires only one new dependency: `rate-limiter-flexible@^10.0.1` for in-memory rate limiting. It is zero-dependency, framework-agnostic, and appropriate for a single-process app — no Redis or external infrastructure required. All other security patterns (Pino `redact`, LibSQL snapshot deletion, Next.js `proxy.ts`, header-based key transport) use already-installed packages. The only Next.js consideration is that v16 deprecated `middleware.ts` in favor of `proxy.ts` with the exported function renamed from `middleware` to `proxy`.

**Core technologies:**
- `rate-limiter-flexible` (new, `^10.0.1`): In-memory rate limiting on `/api/solve` — zero deps, `RateLimiterMemory` is correct for single-process
- `Pino 10` (existing, via `@mastra/loggers`): Structured log redaction via built-in `redact` paths — needs passthrough verification against `PinoLogger` constructor
- `@mastra/libsql` (existing): `deleteWorkflowRunById()` for targeted snapshot cleanup — verified in installed type definitions
- `Next.js proxy.ts` (existing, v16 feature): Thin request interception for method enforcement and security response headers

**What NOT to add:** `helmet` (Express-only), `@upstash/ratelimit` (requires Redis), `next-auth` (no user accounts), `jsonwebtoken` (no sessions), `better-sqlite3` (bypasses Mastra storage API).

### Expected Features

Security hardening for a single-user local dev tool is framed as fixing actual defects, not implementing enterprise patterns.

**Must have (P1 — active data leaks):**
- Remove `apiKey` from `workflowStateSchema` — stops LibSQL plaintext persistence on every `setState()` call
- Move API key from JSON body / query string to `x-openrouter-key` custom header — stops key appearing in browser history, server logs, referrer headers
- Redact API key patterns from markdown log files via `redactSecrets()` utility
- Stop `/api/credits` from using the server's `OPENROUTER_API_KEY` for unauthenticated requests
- Scope `/api/solve/cancel` to a specific `runId` — stops cross-tab cancel collisions

**Should have (P2 — reduces exposure surface):**
- Rate limiting on `/api/solve` with `RateLimiterMemory`
- Optional bearer token guard on `/api/evals` routes via `EVAL_API_TOKEN` env var
- Trim `/api/claude-auth` response to only fields the UI uses
- `src/proxy.ts` for HTTP method enforcement and security response headers

**Defer (P3 — code quality):**
- Convert sync `fs.*Sync` logging calls to `fs/promises` equivalents
- Opt-in logging gate via `LOG_ENABLED` env var (default: disabled)
- Fix nullability patterns in workflow schemas
- Dead code and naming cleanup

**Anti-features (do not build):**
- Full auth system (NextAuth, Clerk, JWT) — single-user tool, zero accounts, breaks eval harness
- Server-side encrypted key storage — localStorage is appropriate; the real leak is LibSQL
- Redis-backed distributed rate limiting — single-process app
- CSP headers — no untrusted input, would break inline styles from shadcn/ui

### Architecture Approach

The architecture changes are surgically targeted at the key transport path. The key flows from the browser via `x-openrouter-key` header to the route handler, which reads it and injects it into `inputData` before passing to the workflow. The pragmatic decision is to keep `apiKey` in `workflowStateSchema` rather than attempting to remove it entirely from inter-step propagation, because Mastra workflow state is the only cross-step data channel and threading the key through every inter-step schema would pollute domain schemas with transport concerns. The LibSQL persistence is a theoretical risk with near-zero practical impact for a local tool whose database is already ephemeral and gitignored — the real exposure vectors (URLs, query strings, logs) are what Phase 1 fixes.

**Major components:**
1. `src/proxy.ts` (new) — Next.js 16 proxy layer: HTTP method enforcement on POST-only endpoints, security response headers; deliberately thin (no body parsing, no auth logic per CVE-2025-29927 defense-in-depth guidance)
2. `src/lib/rate-limiter.ts` (new) — `RateLimiterMemory` instances for `/api/solve` (5/min), `/api/credits` (30/min), `/api/solve/cancel` (10/min)
3. Modified route handlers (`solve/route.ts`, `credits/route.ts`, `cancel/route.ts`) — read key from header, inject into workflow inputData, add rate limiting, scope cancel by `runId`
4. Modified frontend (`use-solver-workflow.ts`, `credits-badge.tsx`) — send key via header not body/query string; receive `runId` from first stream event for cancel scoping
5. Modified `logging-utils.ts` — async I/O, opt-in gate, `redactSecrets()` applied at all write points

**Key patterns:**
- Header-based key transport: `x-openrouter-key` custom header (hyphens not underscores to avoid nginx default header blocking; not `Authorization: Bearer` to avoid confusion with other auth schemes)
- Run-scoped cancellation: emit `data-workflow-start` event with `runId` as first stream event; frontend stores and sends with cancel requests; cancel route does single `activeRuns.get(runId)` lookup
- Proxy as defense-in-depth, not sole security boundary: route handlers must validate independently of proxy layer

### Critical Pitfalls

1. **Removing apiKey from workflow state breaks Steps 2 and 3** — Both steps call `createOpenRouterProvider(state.apiKey)`. Removing the field without a verified replacement mechanism causes those steps to silently fall back to the env key (wrong billing) or crash if no env key is set. Verify the replacement channel works with `OPENROUTER_API_KEY` unset before merging.

2. **Partial key transport migration leaves one endpoint still leaking** — Solve (POST body) and credits (GET query string) are separate code paths. Migrating one without the other produces "ERR" in the credits badge or broken solves. Update all key-reading points atomically in one PR; verify both flows in the browser network tab.

3. **Log redaction mutating response objects corrupts data flow** — Agent responses are used for both logging and `safeParse()` in every step file. Mutating `response.object` in place before logging corrupts the object the parser receives. Always shallow-copy before any redaction: `logFn({ ...response.object, sensitiveField: '[REDACTED]' })`.

4. **Over-engineering auth breaks the eval harness** — The eval harness calls `workflow.createRun()` directly via Mastra API, not HTTP. Any middleware or route-level guard requiring a user-provided key will break evals (they use env key only). Test with `npm run eval -- --problem linguini-001` after any auth or guard changes.

5. **Rate limiting that throttles development UX** — `/api/credits` polls every 20 seconds. Applying aggressive rate limiting to this endpoint causes the credits badge to alternate between value and "ERR". Set limits well above single-user usage and test credits polling after any rate limit changes.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: API Key Transport (Critical data leak fixes)

**Rationale:** This is the foundational change. Query-string and body-based key transport are the highest-impact vulnerabilities, and fixing them is a prerequisite to every subsequent security improvement. The critical dependency — ensuring Steps 2 and 3 retain access to the API key after state schema changes — must be resolved here before anything else.

**Delivers:** API key no longer appears in request bodies, URLs, server logs, or browser history. Key does not enter workflow state that is persisted to LibSQL via `workflowStateSchema`.

**Addresses:**
- Remove `apiKey` from `workflowStateSchema`; verify and implement replacement key propagation for Steps 2 and 3 (whether `inputData.apiKey` per-step or in-memory side-channel depends on snapshot inspection)
- Move `/api/solve` from `inputData.apiKey` in body to `x-openrouter-key` header (`use-solver-workflow.ts` + `solve/route.ts`)
- Move `/api/credits` from `?key=` query string to `x-openrouter-key` header (`credits-badge.tsx` + `credits/route.ts`)
- Stop server key fallback on unauthenticated credits requests
- Add `redactSecrets()` utility and apply to all logging functions

**Avoids:** Pitfall 1 (broken step access), Pitfall 2 (partial migration), Pitfall 3 (log mutation)

**Research flag:** NEEDS VERIFICATION — Inspect `mastra_workflow_snapshot` table at implementation start to confirm whether `inputData` is persisted alongside `workflowStateSchema` state. Run: `sqlite3 mastra.db "SELECT json_extract(snapshot, '$.inputData') FROM mastra_workflow_snapshot LIMIT 1"`. If `inputData` is persisted, use the in-memory side-channel approach; if not, keeping `apiKey` in `rawProblemInputSchema` is sufficient.

### Phase 2: Endpoint Guards (Lightweight hardening)

**Rationale:** Self-contained changes with no dependencies on Phase 1 internals, but should come after Phase 1 is stable to avoid merge conflicts on shared route files. The cancel scoping change touches `solve/route.ts` which is also modified in Phase 1.

**Delivers:** Cancel endpoint scoped to individual runs, lightweight rate limiting on the expensive solve endpoint, eval API optionally locked, proxy method enforcement, security response headers.

**Addresses:**
- Scope `/api/solve/cancel` to `runId`: emit `data-workflow-start` stream event with `runId` as first stream event; frontend stores it; `cancel/route.ts` does single `activeRuns.get(runId)` lookup
- Add `rate-limiter-flexible` with `RateLimiterMemory` to `/api/solve` (5 req/min per IP), `/api/solve/cancel` (10 req/min), `/api/credits` (30 req/min)
- Add optional `EVAL_API_TOKEN` bearer token check to `/api/evals` and `/api/evals/[id]`
- Trim `/api/claude-auth` response to remove unused `email` field
- Create `src/proxy.ts` for method enforcement on POST-only endpoints and security response headers

**Avoids:** Pitfall 5 (cancel UX regression — test full abort flow: Start solve -> Wait for activity -> Click Abort -> Verify amber state appears), Pitfall 8 (rate limiting that breaks credits polling)

**Research flag:** STANDARD PATTERNS — `rate-limiter-flexible` API is well-documented. `proxy.ts` Next.js 16 convention is verified. No additional research needed.

### Phase 3: Code Quality and Logging

**Rationale:** Touches the most files (`logging-utils.ts` plus all step files, `vocabulary-tools.ts`, `tester-tools.ts`) and has the highest regression risk for the eval harness. Must come after Phases 1 and 2 are stable to minimize merge surface and allow evals to serve as a baseline.

**Delivers:** Non-blocking event loop during workflow runs (async I/O replaces `fs.*Sync`), opt-in logging via `LOG_ENABLED` env var, schema and naming cleanup.

**Addresses:**
- Replace all `fs.writeFileSync` / `fs.appendFileSync` calls in `logging-utils.ts` with `fs/promises` equivalents (11 functions affected)
- Add `await` to all logging call sites in step files, `vocabulary-tools.ts`, and `tester-tools.ts`
- Keep `initializeWorkflowState()` synchronous (path computation only); move `initializeLogFile()` call to Step 1's async execute function
- Gate all log writes behind `isLoggingEnabled()` (`LOG_ENABLED=true` env var; default: disabled)
- Fix nullability in `structuredProblemSchema` (`.nullable()` pattern)
- Naming inconsistency cleanup

**Avoids:** Pitfall 6 (logging changes that break eval harness — run `npm run eval -- --problem linguini-001` before and after Phase 3)

**Research flag:** STANDARD PATTERNS — Node.js `fs/promises` API is well-established. The mechanical nature of the sync-to-async conversion is low-risk when done systematically.

### Phase Ordering Rationale

- Phase 1 before Phase 2: `solve/route.ts` and `credits/route.ts` are touched in both phases; doing key transport migration first ensures rate limiting is added to already-clean endpoints and avoids merge conflicts
- Phase 1 before Phase 3: Step files receive `await` additions in Phase 3 but must already have the correct key-access pattern from Phase 1
- Phase 3 last: Highest file-count blast radius (13 logging functions across 7+ call-site files); doing it on a stable codebase minimizes regressions
- All phases sequential: The same files appear across phases; parallel execution would cause merge conflicts

### Research Flags

Phases needing deeper research or verification during planning:

- **Phase 1 (snapshot persistence):** Inspect the `mastra_workflow_snapshot` table schema at implementation start. This is a single SQL query, not a research sprint — but the result determines whether `inputData.apiKey` propagation is sufficient or whether an in-memory side-channel is required. Must be done before writing any Phase 1 code.
- **Phase 1 (PinoLogger options passthrough):** Check `PinoLogger` constructor signature in `node_modules/@mastra/loggers` to confirm whether `redact` Pino options are passed through. One-time inspection; result determines whether structured-log redaction is available or must be markdown-only.

Phases with standard patterns (skip additional research):

- **Phase 2:** All patterns (`rate-limiter-flexible`, `proxy.ts`, bearer token, stream event emission) are documented and well-understood.
- **Phase 3:** `fs/promises` migration is purely mechanical; established Node.js patterns throughout.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only one new dependency (`rate-limiter-flexible`). All other recommendations use already-installed packages. Versions verified against local `node_modules`. |
| Features | HIGH | Derived entirely from direct code audit of all affected files. P1/P2/P3 prioritization is based on observed data flows with specific file paths and line numbers, not hypothetical risks. |
| Architecture | HIGH | Data flow diagrams verified against codebase. Pragmatic decision to keep `apiKey` in workflow state is well-reasoned given Mastra's step-isolation constraints. One open question (whether `inputData` is persisted to LibSQL snapshots) is resolvable with a single SQL query at implementation start. |
| Pitfalls | HIGH | All pitfalls sourced from direct codebase analysis with specific file paths and line numbers. Recovery strategies are concrete and low-cost (most are "revert 16-30 lines"). |

**Overall confidence:** HIGH

### Gaps to Address

- **Mastra `inputData` persistence:** Confirm whether `inputData` appears in `mastra_workflow_snapshot` records. Run `sqlite3 mastra.db "SELECT json_extract(snapshot, '$.inputData') FROM mastra_workflow_snapshot LIMIT 1"` at Phase 1 implementation start. If present, `apiKey` in `rawProblemInputSchema` still leaks to disk; use in-memory side-channel instead.

- **PinoLogger options passthrough:** Verify `@mastra/loggers`'s `PinoLogger` constructor accepts arbitrary Pino options like `redact`. Check `node_modules/@mastra/loggers/dist/index.d.ts` at Phase 1 implementation start. If not supported, structured-log redaction falls back to the markdown-only `redactSecrets()` approach.

- **`chatId` key-suffix dependency:** `use-solver-workflow.ts` uses `apiKey.slice(-4)` to compute `chatId` for transport uniqueness. Moving the key to a header does NOT remove it from frontend state — the key remains in the `apiKey` state variable from `use-api-key.ts`. Verify at implementation time that `chatId` still updates correctly when the user changes their API key after the header transport migration.

## Sources

### Primary (HIGH confidence)
- Codebase analysis (local) — Direct audit of all route handlers, workflow steps, frontend hooks, logging utilities, and schema files. All pitfalls include specific file paths and line numbers.
- `@mastra/core@1.8.0` type definitions (local) — `deleteWorkflowRunById`, `dangerouslyClearAll` verified in `node_modules/@mastra/core/dist/storage/domains/workflows/base.d.ts`
- `pino@10.1.0` type definitions (local) — `redact` option interface verified in `node_modules/pino/pino.d.ts`
- [rate-limiter-flexible npm](https://www.npmjs.com/package/rate-limiter-flexible) — v10.0.1, zero dependencies, `RateLimiterMemory` API
- [rate-limiter-flexible GitHub](https://github.com/animir/node-rate-limiter-flexible) — sliding window and memory store usage
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) — `proxy.ts` replacing `middleware.ts`, verified HIGH
- [Next.js proxy.ts API reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — thin proxy pattern, no body parsing

### Secondary (MEDIUM confidence)
- [Mastra workflow state docs](https://mastra.ai/docs/workflows/workflow-state) — state persistence behavior; cross-step data transfer
- [Mastra LibSQL storage reference](https://mastra.ai/en/reference/storage/libsql) — `mastra_workflow_snapshot` table structure
- [Mastra snapshots docs](https://mastra.ai/docs/workflows/snapshots) — what data is persisted in workflow snapshots
- [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security) — server-side secret handling recommendations
- [TurboStarter Next.js security guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) — API key transport, CVE-2025-29927 middleware bypass

### Tertiary (LOW confidence — validate at implementation)
- Assumption: `inputData` is included in LibSQL snapshots (verify with `sqlite3` query at Phase 1 start)
- Assumption: `PinoLogger` passes through `redact` option to underlying Pino instance (verify via constructor inspection)

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
