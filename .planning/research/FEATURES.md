# Feature Research: Security Hardening

**Domain:** Security hardening for single-user Next.js + Mastra AI agent solver
**Researched:** 2026-03-17
**Confidence:** HIGH (issues identified from direct code audit; remediation patterns well-established)

## Context: What Kind of App Is This?

LO-Solver is a **single-user development tool** running locally or on a personal server. There is no multi-tenancy, no user accounts, no public-facing production deployment. The threat model is:

- **Primary risk:** Accidental secret exposure (API keys leaking to disk, browser history, or database files that could be shared/committed)
- **Secondary risk:** Accidental cost burn if the app is briefly exposed on a network (no auth on expensive workflow endpoint)
- **Not a risk:** Sophisticated attackers, credential stuffing, session hijacking, CSRF (single user, no auth system)

This context means: fix real data leaks aggressively, add basic guardrails against accidental exposure, but skip enterprise patterns (OAuth, JWT rotation, WAF, audit logging).

## Feature Landscape

### Table Stakes (Must Fix)

These are genuine security defects where secrets end up where they should not.

| Feature | Why Essential | Complexity | Notes |
|---------|--------------|------------|-------|
| Remove API key from workflow state | `apiKey` field in `workflowStateSchema` causes Mastra to persist the OpenRouter key into LibSQL (`mastra.db`). The key is written to `mastra_workflow_snapshot` table as serialized JSON on every `setState()` call. Anyone with access to the `.db` file gets the key. | LOW | Remove `apiKey` from both `workflowStateSchema` and `rawProblemInputSchema`. Instead, create the OpenRouter provider once in the API route handler and pass it via `RequestContext` (which is in-memory only, never persisted). Each step already reads from `requestContext.get('openrouter-provider')` -- just ensure the first step sets it and subsequent steps receive it. The Mastra `RequestContext` is per-execution and lives only in process memory. |
| Move API key from query string to header | `/api/credits?key=sk-or-...` puts the API key in the URL. Browser history, server access logs, proxy logs, and Referer headers all capture query strings. | LOW | Change the `GET /api/credits` endpoint to read from `Authorization: Bearer <key>` header instead of `url.searchParams.get('key')`. Update the frontend `credits-badge.tsx` fetch call to send the key as a header. |
| Scope cancel endpoint to current run | `POST /api/solve/cancel` iterates **all** entries in the `activeRuns` Map and cancels every one. If two browser tabs are running workflows, canceling one kills both. | LOW | Accept a `runId` in the cancel request body. The solve route already has `run.runId` -- return it to the frontend in the stream or response headers, then require it for cancel. Falls back to cancel-all only if no `runId` provided (backward compat). |
| Redact API key from logs | `logAgentOutput()` writes `JSON.stringify(output)` to markdown files. If any agent output or step state contains the API key (e.g., from error messages that include config), the key lands on disk in plaintext. | LOW | Add a `redactSecrets(text: string)` utility that replaces patterns matching `sk-or-v1-*`, `sk-or-*`, and generic long alphanumeric tokens after known key prefixes. Apply it in `logAgentOutput`, `logValidationError`, and any other function that writes to the log file. Pattern: show first 5 and last 4 chars, mask the middle. |
| Remove server key exposure in credits fallback | `GET /api/credits` falls back to `process.env.OPENROUTER_API_KEY` when no user key is provided, then sends it to OpenRouter. While it does not return the key to the client, any error or exception in the fetch (e.g., network timeout mid-stream) could expose it in server logs. More importantly, it means an unauthenticated request to `/api/credits` burns the server owner's key for a credits check. | LOW | Only use the server key for credits if explicitly intended. Add a `source` query param or separate route (`/api/credits/server` vs `/api/credits/user`). Or simpler: if no user key is provided and a server key exists, return `{ remaining: null, hasServerKey: true }` without making the OpenRouter API call. The frontend already handles this case. |

### Differentiators (Should Fix)

These improve security posture meaningfully but are not data-leak risks. They protect against accidental misuse.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Basic rate limiting on `/api/solve` | Each solve request starts a multi-step workflow costing $0.10-$2.00+ in API credits. Without rate limiting, a script or browser loop could drain the API key rapidly. | MEDIUM | Use an in-memory sliding window counter (no Redis needed for single-user). Limit to ~3 concurrent workflows and ~10 requests per minute. Implement as a wrapper function in the route handler, not middleware (simpler, no additional config). Use `Map<string, number[]>` keyed by IP. |
| Convert sync filesystem I/O to async | All 13 `fs.appendFileSync` / `fs.writeFileSync` calls in `logging-utils.ts` block the Node.js event loop. During verification loops with 20+ test calls, this creates noticeable latency spikes. | LOW | Replace `fs.appendFileSync` with `fs.promises.appendFile` (or `fs/promises`). Replace `fs.writeFileSync` with `fs.promises.writeFile`. Replace `fs.existsSync` + `fs.mkdirSync` with `fs.promises.mkdir({ recursive: true })`. All callers already `await` or can be trivially updated. |
| Opt-in logging with redaction | Logging writes full agent reasoning and structured output to disk by default. This includes the complete linguistic analysis, which is fine, but also includes any errors that might contain config data. A dev tool should log, but offer a way to disable or redact. | LOW | Add `LOG_ENABLED` env var (default: `true`). When `false`, skip all file writes in logging-utils. When `true`, apply the `redactSecrets()` function from the table stakes feature. This is a lightweight opt-out, not a full logging framework. |
| Hide debug trace panel behind toggle | `DevTracePanel` shows full agent reasoning, tool inputs/outputs, and internal workflow events in the main UI. This is the point of the tool, but a production-deployed instance might want to hide it. | LOW | Already client-side only. Add a `NEXT_PUBLIC_SHOW_TRACE` env var (default: `true`). When `false`, the layout renders without the trace column. The 3-column layout already supports conditional rendering (2 vs 3 columns). |
| Reduce `/api/claude-auth` surface | Endpoint returns `email` and `subscriptionType` from `claude auth status --json`. For a local dev tool this is fine, but if deployed, it leaks account metadata. | LOW | Return only `{ authenticated: boolean }` by default. Add a `NEXT_PUBLIC_SHOW_CC_DETAILS` env var to opt into showing email/subscription. Or simpler: just remove `email` from the response since it is not used in the UI (only `authenticated` and `subscriptionType` are used). |
| Guard eval API routes | `/api/evals` and `/api/evals/[id]` return full evaluation run data with no auth. Contains problem texts, model outputs, scores, and timing data. Not secret, but unnecessarily exposed. | LOW | Add a simple shared-secret check: read `EVAL_API_TOKEN` from env, require it as `Authorization: Bearer <token>` header. If not set, allow all requests (dev mode). This is a "lock if you want to" pattern. |

### Anti-Features (Do NOT Build)

Features that seem security-related but would be over-engineering for this use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full authentication system (NextAuth, Clerk) | "Protect all endpoints" | Single-user tool. Adding user accounts, sessions, cookies, and CSRF protection creates massive complexity with zero value. No one else uses this app. | Use env-var feature flags for sensitive endpoints when deployed. |
| Server-side API key storage (encrypted DB) | "Don't trust localStorage" | Requires encryption key management, key derivation, secure deletion. localStorage is appropriate for single-user -- the threat is the disk file, not the browser. If someone has access to your browser, they have access to everything. | Keep localStorage. Fix the real leak: remove key from workflow state/LibSQL. |
| Request signing / HMAC verification | "Prevent tampering with API calls" | All calls are localhost. The client and server are the same machine. Signing adds complexity with no security benefit. | Skip entirely. |
| Content Security Policy headers | "Prevent XSS" | No user-generated content, no third-party scripts, no CDN assets. CSP would only block legitimate functionality (inline styles from shadcn/ui, etc.) | Not needed for a dev tool with no untrusted input. |
| API key rotation / expiry system | "Keys should rotate" | The user manages their own OpenRouter key. The app has no authority to rotate it. Building expiry logic for a pass-through key is meaningless. | Let OpenRouter handle key management. |
| Encrypted log files | "Logs contain sensitive data" | Encryption at rest requires key management, which is harder than the problem it solves. The logs are on the user's own machine. | Redact secrets from logs (table stakes). Optionally disable logging entirely (differentiator). |
| Rate limiting with Redis/Upstash | "Need distributed rate limiting" | Single-user, single-process app. Redis adds infrastructure dependency for a problem solvable with a `Map` and `Date.now()`. | In-memory sliding window counter. |
| Audit logging for API access | "Track who accessed what" | Single user. There is no "who." | Console.log is sufficient for debugging. |

## Feature Dependencies

```
[Remove API key from workflow state]
    |
    +--> depends on --> [Pass OpenRouter provider via RequestContext across steps]
    |                        |
    |                        +--> requires understanding --> Mastra step-to-step context passing
    |
    +--> enables --> [Redact API key from logs] (less critical if key never enters state)

[Move API key from query to header]
    +--> independent (frontend + API change only)

[Scope cancel endpoint]
    +--> requires --> [Return runId from solve route to frontend]
    +--> independent of secret handling

[Sync to async I/O]
    +--> enhances --> [Opt-in logging with redaction] (both touch logging-utils.ts)
    +--> should be done in same phase to avoid double-touching the file

[Rate limiting]
    +--> independent (API route wrapper only)

[Guard eval APIs]
    +--> independent (2 route files only)
```

### Dependency Notes

- **Remove API key from state** is the highest-priority fix and has a subtle dependency: the API key currently flows `inputData.apiKey -> setState({ apiKey }) -> state.apiKey` across steps. Removing it requires an alternative mechanism. `RequestContext` is step-local in Mastra (created fresh in each step's `execute` function). The alternative is to **keep the key in `inputData` (which is per-run, not persisted to LibSQL as state)** and have each step read it from `inputData` rather than `state`. Or, strip `apiKey` from the state schema while still passing it in `inputData` -- the state schema controls what is persisted, and `inputData` is transient.
- **Async I/O and logging redaction** both modify `logging-utils.ts`. Do them in the same phase.
- **Cancel scoping** requires the frontend to know the `runId`, which means the solve route must communicate it. A custom stream event or response header works.

## MVP Definition

### Phase 1: Fix Data Leaks (Critical)

Minimum changes to stop secrets from hitting disk or URLs.

- [ ] Remove `apiKey` from `workflowStateSchema` -- stops LibSQL persistence
- [ ] Keep `apiKey` in `rawProblemInputSchema` (transient input, not persisted as state)
- [ ] Each step reads `inputData.apiKey` to create its OpenRouter provider (already the pattern in step 1; extend to steps 2 and 3)
- [ ] Move `/api/credits` key transport from query string to `Authorization` header
- [ ] Stop `/api/credits` from using server key for unauthenticated requests
- [ ] Add `redactSecrets()` utility and apply to all logging functions

### Phase 2: Harden Endpoints (Important)

Basic guardrails against accidental misuse.

- [ ] Scope cancel endpoint to specific `runId`
- [ ] Add in-memory rate limiting to `/api/solve`
- [ ] Guard eval APIs with optional bearer token
- [ ] Trim `/api/claude-auth` response to only what the UI uses

### Phase 3: Code Quality and Performance

Non-security improvements surfaced by the audit.

- [ ] Convert sync I/O to async in `logging-utils.ts`
- [ ] Add opt-in logging disable via `LOG_ENABLED` env var
- [ ] Add `NEXT_PUBLIC_SHOW_TRACE` env var for trace panel visibility
- [ ] Fix nullability trap in workflow schemas (the `data: ... .nullable()` pattern in `structuredProblemSchema`)
- [ ] Remove dead API surfaces and unused dependencies (Knip audit)
- [ ] Fix naming inconsistencies and comment/code mismatches

### Future Consideration (Only If Deployed Publicly)

- [ ] Full endpoint auth -- only if the app is ever hosted for multiple users
- [ ] HTTPS enforcement -- only if deployed (localhost is already secure context)
- [ ] Security headers middleware -- only if serving to external users

## Feature Prioritization Matrix

| Feature | Security Value | Implementation Cost | Priority |
|---------|---------------|---------------------|----------|
| Remove API key from workflow state | HIGH | LOW | P1 |
| Move API key from query to header | HIGH | LOW | P1 |
| Redact secrets from logs | HIGH | LOW | P1 |
| Stop server key use in credits fallback | MEDIUM | LOW | P1 |
| Scope cancel to runId | MEDIUM | LOW | P1 |
| In-memory rate limiting on /api/solve | MEDIUM | MEDIUM | P2 |
| Convert sync to async I/O | LOW (perf, not security) | LOW | P2 |
| Guard eval APIs | LOW | LOW | P2 |
| Trim claude-auth response | LOW | LOW | P2 |
| Opt-in logging disable | LOW | LOW | P3 |
| Trace panel env var toggle | LOW | LOW | P3 |
| Fix nullability in schemas | LOW (correctness) | LOW | P3 |
| Dead code / naming cleanup | LOW (hygiene) | LOW | P3 |

**Priority key:**
- P1: Must fix -- active data leak or secret exposure
- P2: Should fix -- reduces attack surface, improves robustness
- P3: Nice to have -- cleanup and polish

## Implementation Details for Key Features

### Removing API Key from Workflow State

**Current flow:**
```
Frontend (localStorage) --> POST /api/solve body --> inputData.apiKey
  --> Step 1: setState({ apiKey: inputData.apiKey }) --> LibSQL snapshot
  --> Step 2: reads state.apiKey --> creates provider
  --> Step 3: reads state.apiKey --> creates provider
```

**Target flow:**
```
Frontend (localStorage) --> POST /api/solve body --> inputData.apiKey
  --> Step 1: reads inputData.apiKey --> creates provider via RequestContext
  --> Step 2: reads inputData.apiKey --> creates provider via RequestContext
  --> Step 3: reads inputData.apiKey --> creates provider via RequestContext
  (apiKey never in stateSchema, never persisted to LibSQL)
```

Key insight: `inputData` is available in every step's `execute` function. Steps already access `inputData.providerMode`, `inputData.maxRounds`, etc. The `apiKey` is already in `rawProblemInputSchema`. The only change is: stop copying it to state, and read from `inputData` instead of `state` in steps 2 and 3.

Verify: does Mastra persist `inputData` to LibSQL? Check the `mastra_workflow_snapshot` table schema. If it does, the key would still leak. In that case, strip the key from inputData before passing to `workflow.stream()` and pass it via a closure or module-level map keyed by `runId`.

### In-Memory Rate Limiter

```typescript
// rate-limit.ts
const windows = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = windows.get(ip) ?? [];
  const recent = timestamps.filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  windows.set(ip, recent);
  return true;
}
```

No external dependencies. Resets on server restart (acceptable for dev tool).

### Secret Redaction Pattern

```typescript
// redact.ts
const SECRET_PATTERNS = [
  /sk-or-v1-[a-zA-Z0-9]{20,}/g,     // OpenRouter v1 keys
  /sk-or-[a-zA-Z0-9]{20,}/g,         // OpenRouter keys
  /sk-[a-zA-Z0-9]{20,}/g,            // Generic sk- prefixed keys
  /Bearer\s+[a-zA-Z0-9_-]{20,}/g,    // Bearer tokens in error messages
];

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match) => {
      if (match.length <= 12) return '[REDACTED]';
      return `${match.slice(0, 5)}...${match.slice(-4)}`;
    });
  }
  return result;
}
```

## Sources

- Direct code audit of `/home/cervo/Code/LO-Solver/src/app/api/` routes
- Direct code audit of `/home/cervo/Code/LO-Solver/src/mastra/workflow/` state and logging
- [Mastra workflow state docs](https://mastra.ai/docs/workflows/workflow-state) -- confirms state persists across suspend/resume via LibSQL snapshots
- [Mastra LibSQL storage reference](https://mastra.ai/en/reference/storage/libsql) -- `mastra_workflow_snapshot` table stores serialized state
- [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security) -- recommends keeping secrets server-side, validating at data access points
- [Next.js security blog](https://nextjs.org/blog/security-nextjs-server-components-actions) -- defense-in-depth, data minimization
- [TurboStarter Next.js security guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) -- API key transport, rate limiting patterns
- [Rate limiting techniques in Next.js](https://www.jigz.dev/blogs/rate-limiting-techniques-in-next-js-with-examples) -- in-memory vs Redis approaches
- [Node.js API security patterns 2025](https://dev.to/codanyks/secure-by-design-nodejs-api-security-patterns-for-2025-2a9k) -- Pino redaction, secret management

---
*Feature research for: Security hardening of LO-Solver (v1.7 milestone)*
*Researched: 2026-03-17*
