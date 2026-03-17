# Stack Research: Security Hardening

**Domain:** Security hardening for Next.js + Mastra AI agent solver app
**Researched:** 2026-03-17
**Confidence:** HIGH

## Context

This research covers **only the new libraries and patterns** needed for v1.7 security hardening. The existing stack (Next.js 16.1.6, Mastra 1.8.0, TypeScript 5.9.3, React 19, LibSQL, Pino 10 via @mastra/loggers) is validated and not re-evaluated.

The five security concerns to address:
1. API key transport (currently in JSON body, query strings for credits)
2. API route protection (no middleware, no rate limiting)
3. Session-scoped workflow runs (cancel endpoint has no scoping)
4. Logging redaction (markdown logs write raw agent output to disk)
5. LibSQL data lifecycle (1.1 GB database with apiKey in workflow snapshots)

---

## Recommended Stack Additions

### New Dependencies

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `rate-limiter-flexible` | ^10.0.1 | In-memory rate limiting for API routes | Zero dependencies, framework-agnostic, supports RateLimiterMemory for single-process apps without Redis. 451+ npm dependents. No external infra needed -- this app is single-user/single-process. |

### Existing Dependencies (No Changes Needed)

| Library | Version | Already Installed Via | Security Feature |
|---------|---------|----------------------|------------------|
| Pino | 10.1.0 | `@mastra/loggers` | Built-in `redact` option with path-based censoring, ~2% overhead via `fast-redact` |
| `@mastra/libsql` | 1.6.2 | Direct dependency | `WorkflowsStorage.deleteWorkflowRunById()` for snapshot cleanup |
| Next.js | 16.1.6 | Direct dependency | `proxy.ts` (replaces deprecated `middleware.ts`) for request interception |

### No New Dependencies Needed For

| Concern | Why No Library | Implementation Approach |
|---------|---------------|------------------------|
| API key header transport | Standard HTTP headers (`X-OpenRouter-Key`) | Move key from `inputData.apiKey` in JSON body to `X-OpenRouter-Key` request header. Read via `req.headers.get('x-openrouter-key')` in route handler. |
| Session-scoped cancel | Use existing `activeRuns` Map with scoping | Add a session token (`crypto.randomUUID()`, no library) to scope cancel to the requesting client's run. |
| Logging redaction (markdown) | Opt-in flag + string replacement | Controlled by `ENABLE_FILE_LOGGING` env var. When enabled, redact API keys from logged content with regex. |
| Secure headers (response) | `next.config.ts` headers config or `proxy.ts` | Add security headers (X-Content-Type-Options, X-Frame-Options) via Next.js built-in config. |

---

## Detailed Recommendations

### 1. API Key Transport: Headers Instead of Body/Query String

**Current problem:** The OpenRouter API key travels two insecure paths:
- `/api/solve`: Key sent in JSON body as `inputData.apiKey`, then stored in workflow state via `setState()` and persisted to LibSQL snapshots
- `/api/credits`: Key sent as `?key=...` query parameter (visible in server logs, browser history, referrer headers)

**Recommendation:** Use the `X-OpenRouter-Key` custom header.

```typescript
// Frontend (use-solver-workflow.ts) - send key as header, not body
const transport = new DefaultChatTransport({
  api: '/api/solve',
  headers: apiKey ? { 'X-OpenRouter-Key': apiKey } : undefined,
  prepareSendMessagesRequest: ({ messages }) => ({
    body: {
      inputData: {
        rawProblemText: /* ... */,
        providerMode,
        maxRounds: workflowSettings.maxRounds,
        perspectiveCount: workflowSettings.perspectiveCount,
        // apiKey removed from body
      },
    },
  }),
});

// Backend (api/solve/route.ts) - read from header
const apiKey = req.headers.get('x-openrouter-key') ?? undefined;
```

**Why headers over body:**
- Headers are not logged by default in most proxies/CDNs (unlike query strings)
- Headers are not persisted in browser history or referrer headers
- The key never enters Mastra workflow state, so it never reaches LibSQL
- Standard pattern (OpenRouter's own API uses `Authorization: Bearer`)

**Why `X-OpenRouter-Key` specifically:**
- Hyphens, not underscores (nginx blocks underscore headers by default)
- Descriptive name makes audit easy
- `X-` prefix for custom application headers

**Confidence:** HIGH -- standard HTTP security pattern, verified against Next.js route handler API.

### 2. Rate Limiting: `rate-limiter-flexible` with In-Memory Store

**Recommendation:** `rate-limiter-flexible` v10.0.1 with `RateLimiterMemory`.

```typescript
// src/lib/rate-limiter.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Solve endpoint: 5 concurrent solves per minute per IP
export const solveLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60, // seconds
  keyPrefix: 'solve',
});

// Credits endpoint: 30 requests per minute per IP
export const creditsLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
  keyPrefix: 'credits',
});

// Cancel endpoint: 10 requests per minute per IP
export const cancelLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
  keyPrefix: 'cancel',
});
```

**Usage in route handlers (not proxy):** Apply rate limiting directly in API route handlers, not via `proxy.ts`. This is because:
- `proxy.ts` is designed for request interception/routing, not per-route business logic
- Rate limiting per-route requires different limits for different endpoints
- The `RateLimiterMemory` store is in-process memory and works naturally in route handlers

```typescript
// In api/solve/route.ts
import { solveLimiter } from '@/lib/rate-limiter';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  try {
    await solveLimiter.consume(ip);
  } catch {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    });
  }
  // ... existing handler logic
}
```

**Why `rate-limiter-flexible` over alternatives:**
- Zero dependencies (no Redis, no Upstash account)
- `RateLimiterMemory` is perfect for single-process apps
- Framework-agnostic -- works in any Node.js context including Next.js route handlers
- Supports sliding window, fixed window, and token bucket algorithms
- 451+ npm dependents, actively maintained (latest release: March 2026)

**Why NOT Upstash `@upstash/ratelimit`:**
- Requires external Redis instance (Upstash account or self-hosted Redis)
- Overkill for a single-user dev tool running on one process
- Adds network latency for rate limit checks

**Why NOT custom Map-based implementation:**
- `rate-limiter-flexible` handles cleanup of expired entries automatically
- Handles edge cases (concurrent requests, timer management)
- Well-tested in production

**Confidence:** HIGH -- verified package exists at v10.0.1, no dependencies, memory store documented.

### 3. Next.js Request Interception: `proxy.ts` for Security Headers

**Important:** In Next.js 16, `middleware.ts` is **deprecated** in favor of `proxy.ts`. The function export name also changes from `middleware` to `proxy`. Both still work in 16.x, but new code should use `proxy.ts`.

**Recommendation:** Use `proxy.ts` only for response security headers, not rate limiting. Rate limiting stays in route handlers (see above).

```typescript
// proxy.ts (root of src/ or project root)
import { NextResponse, type NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

**Why `proxy.ts` and not `next.config.ts` headers:**
- `proxy.ts` can add headers conditionally (e.g., only for API routes)
- `next.config.ts` `headers` config works for static headers but cannot read request context
- Both approaches work; `proxy.ts` is marginally more flexible

**Confidence:** HIGH -- verified in Next.js 16 release notes and official documentation.

### 4. Logging Redaction: Pino `redact` + Opt-in File Logging

**Pino redaction (structured logs):** The Mastra logger is already Pino 10 (`@mastra/loggers`). Pino supports built-in `redact` paths:

```typescript
// src/mastra/index.ts
export const mastra = new Mastra({
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
    redact: {
      paths: [
        'apiKey',
        'inputData.apiKey',
        'req.headers.authorization',
        'req.headers["x-openrouter-key"]',
      ],
      censor: '[REDACTED]',
    },
  }),
});
```

**Note on PinoLogger compatibility:** The `@mastra/loggers` `PinoLogger` constructor may or may not pass through arbitrary Pino options like `redact`. Verify at implementation time whether `PinoLogger` accepts Pino's `redact` config. If not, the redaction must happen in the markdown logging layer instead (see below).

**Markdown file logging (opt-in + redaction):** The custom `logging-utils.ts` writes markdown files to disk. Two changes:

1. **Opt-in via environment variable:** Only write log files when `ENABLE_FILE_LOGGING=true`. Default to disabled.

```typescript
const isLoggingEnabled = (): boolean => process.env.ENABLE_FILE_LOGGING === 'true';

export const initializeLogFile = (logFile: string, startTime: string): void => {
  if (!isLoggingEnabled()) return;
  // ... existing logic
};
```

2. **Redact sensitive patterns from logged content:**

```typescript
const REDACT_PATTERNS = [
  /sk-or-v1-[a-zA-Z0-9]{64}/g,  // OpenRouter API keys
  /sk-[a-zA-Z0-9]{48}/g,         // OpenAI-style keys
  /Bearer\s+[a-zA-Z0-9._-]+/gi,  // Bearer tokens
];

function redactSecrets(content: string): string {
  let result = content;
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}
```

**Confidence:** MEDIUM for Pino `PinoLogger` passthrough (need to verify at implementation time), HIGH for markdown logging approach.

### 5. LibSQL Data Lifecycle: Snapshot Cleanup + Schema Fix

**Current problem:** The `mastra.db` file is 1.1 GB. Workflow snapshots include the full state (vocabulary, rules, timing) plus the `apiKey` field. Old snapshots accumulate indefinitely.

**Available API (verified in `@mastra/core` 1.8.0 type definitions):**

```typescript
// WorkflowsStorage interface provides:
abstract deleteWorkflowRunById(args: {
  runId: string;
  workflowName: string;
}): Promise<void>;

// StorageDomain base class provides:
abstract dangerouslyClearAll(): Promise<void>;
```

**Recommendation:** Two-pronged approach:

1. **Remove apiKey from workflow state entirely.** Once the key moves to headers (recommendation 1), remove `apiKey` from `workflowStateSchema` and `rawProblemInputSchema`. Pass the OpenRouter provider via `RequestContext` set up in the route handler before workflow execution. This prevents future secret persistence.

2. **Add a cleanup script for existing data.** Create `scripts/cleanup-db.ts`:

```typescript
import { mastra } from '@/mastra';

async function cleanup() {
  const store = await mastra.getStorage()?.getStore('workflows');
  if (!store) return;

  const { runs } = await store.listWorkflowRuns({ limit: 1000 });
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

  for (const run of runs) {
    if (new Date(run.createdAt).getTime() < cutoff) {
      await store.deleteWorkflowRunById({
        runId: run.runId,
        workflowName: run.workflowName,
      });
    }
  }
}
```

3. **Leverage existing `npm run dev:new` pattern.** This already deletes the database. For a single-user dev tool, this is sufficient for routine cleanup; the script above handles selective cleanup.

**Key architectural decision -- how to pass the provider without state persistence:**

Currently, each workflow step reads `state.apiKey` and creates an OpenRouter provider. After removing `apiKey` from state, there are three options:

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A. Transient input field | Keep `apiKey` in `rawProblemInputSchema` but remove from `workflowStateSchema`; never call `setState({apiKey})` | Minimal code change, key available via `inputData` | Key still in `inputData` which may be persisted in snapshot context |
| B. Route-level provider creation | Create provider in route handler, pass to workflow via Mastra API | Clean separation | Need to verify Mastra workflow API supports this |
| C. Separate non-persisted channel | Pass key via a separate mechanism (env var, global per-request store) | No persistence risk | Couples route handler to workflow internals |

**Option A is most pragmatic** but requires verifying whether Mastra persists `inputData` in snapshots (likely yes, based on snapshot documentation). If so, **Option B** is needed: create the provider in the route handler and inject it into the workflow's RequestContext before streaming starts. This needs implementation-time verification of the Mastra workflow API.

**Confidence:** HIGH for `deleteWorkflowRunById` availability (verified in type definitions). MEDIUM for the provider injection approach (needs implementation-time Mastra API verification).

---

## Installation

```bash
# Single new dependency
npm install rate-limiter-flexible

# No other new dependencies needed -- Pino 10 (redaction), LibSQL (deletion),
# and Next.js proxy.ts are already available in the current stack.
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `rate-limiter-flexible` (in-memory) | `@upstash/ratelimit` + Redis | Multi-instance deployment with shared rate limit state. Not relevant for this single-process app. |
| `rate-limiter-flexible` (in-memory) | Custom `Map`-based rate limiter | When you want zero runtime dependencies and have simple fixed-window needs. But `rate-limiter-flexible` is also zero-dep and handles edge cases (timer cleanup, concurrent access) better. |
| `proxy.ts` (Next.js 16) | `middleware.ts` (deprecated) | Only if stuck on Next.js 15 or earlier. Next.js 16 deprecates `middleware.ts`. |
| Pino `redact` paths | `pino-noir` plugin | Only if you need wildcard path redaction (e.g., `*.password`). Built-in `redact` covers our specific paths. |
| Header-based key transport | Cookie-based key transport | Multi-page apps with session management. Headers are simpler for SPA-style API calls. |
| `ENABLE_FILE_LOGGING` env var | Always-on logging with full redaction | Production deployments where logging is mandatory. For a dev tool, opt-in is cleaner. |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `helmet` | Express-only middleware; does not work with Next.js App Router route handlers | Manual security headers in `proxy.ts` or `next.config.ts` |
| `express-rate-limit` | Express-only; requires Express app instance | `rate-limiter-flexible` (framework-agnostic) |
| `@upstash/ratelimit` | Requires external Redis service; overkill for single-process dev tool | `rate-limiter-flexible` with `RateLimiterMemory` |
| `next-auth` / `auth.js` | Full authentication framework; this app is single-user with no accounts | Simple header-based key validation in route handlers |
| `jsonwebtoken` / `jose` | JWT session management; unnecessary without user accounts | `crypto.randomUUID()` for session tokens |
| `better-sqlite3` direct SQL | Already have LibSQL via Mastra; direct SQLite access bypasses Mastra's storage API | Use `@mastra/core` storage domain methods (`deleteWorkflowRunById`) |
| `winston` / `bunyan` | Alternative loggers; Pino is already installed via `@mastra/loggers` and has built-in redaction | Pino `redact` option |
| Custom encryption for stored keys | Over-engineering; the fix is to not store keys at all | Remove `apiKey` from workflow state schema |
| `cors` package | Next.js handles CORS via `next.config.ts` or route-level headers | Built-in Next.js CORS config if needed |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `rate-limiter-flexible@^10.0.1` | Node.js >= 22.13.0 | Zero dependencies, pure JS, no native modules |
| Pino `redact` option | `pino@10.1.0` (installed) | Built-in feature since Pino v5, uses `fast-redact` internally |
| `proxy.ts` | Next.js >= 16.0.0 | Replaces deprecated `middleware.ts`; both work in 16.x but `middleware.ts` will be removed in future |
| `deleteWorkflowRunById` | `@mastra/core@^1.8.0` | Verified in installed type definitions at `node_modules/@mastra/core/dist/storage/domains/workflows/base.d.ts` |
| `dangerouslyClearAll` | `@mastra/core@^1.8.0` | Abstract method on `StorageDomain` base class, verified in installed type definitions |

## Architecture Integration Points

### Where Changes Touch Existing Code

| File | Change | Impact |
|------|--------|--------|
| `src/hooks/use-solver-workflow.ts` | Move apiKey from body to header in `DefaultChatTransport` | Frontend only, no backend schema change needed |
| `src/app/api/solve/route.ts` | Read key from header instead of body; add rate limiting; create provider before workflow | Route handler, backwards compatible |
| `src/app/api/credits/route.ts` | Read key from header instead of query string; add rate limiting | Route handler, breaking change to credits fetch in frontend |
| `src/app/api/solve/cancel/route.ts` | Add session-scoped cancel guard; add rate limiting | Route handler |
| `src/mastra/workflow/workflow-schemas.ts` | Remove `apiKey` from `workflowStateSchema` and `rawProblemInputSchema` | Breaking change to workflow state shape, but no external consumers |
| `src/mastra/workflow/steps/01-extract.ts` | Remove `apiKey` from `stateWithMode`; receive provider via RequestContext | Step implementation detail |
| `src/mastra/workflow/steps/02-hypothesize.ts` | Remove `state.apiKey` usage | Step implementation detail |
| `src/mastra/workflow/steps/03-answer.ts` | Remove `state.apiKey` usage | Step implementation detail |
| `src/mastra/workflow/logging-utils.ts` | Add opt-in gate (`ENABLE_FILE_LOGGING`) and secret redaction | Backward compatible (default: logging disabled) |
| `src/mastra/index.ts` | Add Pino redact paths to logger config | Logger config change |
| `proxy.ts` (new file) | Security response headers for API routes | New file, no conflicts |
| `src/lib/rate-limiter.ts` (new file) | Rate limiter instances | New file, no conflicts |

### Files That Do NOT Need Changes

| File | Why No Change Needed |
|------|---------------------|
| `src/mastra/openrouter.ts` | `createOpenRouterProvider()` already exists; just need to call it from route handler instead of steps |
| `src/mastra/workflow/request-context-types.ts` | Already has `'openrouter-provider'` key in `WorkflowRequestContext` |
| `src/mastra/workflow/request-context-helpers.ts` | Already has `getOpenRouterProvider()` that falls back to singleton |
| `next.config.ts` | No changes needed unless using static security headers instead of `proxy.ts` |

## Sources

- [Next.js 16 release blog](https://nextjs.org/blog/next-16) -- `proxy.ts` replacing `middleware.ts`, verified HIGH
- [rate-limiter-flexible npm](https://www.npmjs.com/package/rate-limiter-flexible) -- v10.0.1, zero dependencies, verified HIGH
- [rate-limiter-flexible GitHub](https://github.com/animir/node-rate-limiter-flexible) -- RateLimiterMemory API, verified HIGH
- [Pino redaction docs (GitHub)](https://github.com/pinojs/pino/blob/main/docs/redaction.md) -- built-in `redact` option, verified HIGH
- [Pino redaction best practices (DEV Community)](https://dev.to/francoislp/nodejs-best-practices-redacting-secrets-from-your-pino-logs-1eik) -- path patterns, censor options
- [Mastra storage overview](https://mastra.ai/reference/storage/overview) -- storage domains and tables
- [Mastra snapshots docs](https://mastra.ai/docs/workflows/snapshots) -- what data is persisted in workflow snapshots
- [Mastra LibSQL reference](https://mastra.ai/reference/storage/libsql) -- LibSQLStore configuration
- `@mastra/core@1.8.0` type definitions (local) -- `deleteWorkflowRunById`, `dangerouslyClearAll` verified in `node_modules/@mastra/core/dist/storage/domains/workflows/base.d.ts`
- `pino@10.1.0` type definitions (local) -- `redact` option interface verified in `node_modules/pino/pino.d.ts`
- Codebase analysis (local) -- identified `apiKey` in workflow state schema, query string in credits route, unscoped cancel endpoint, raw markdown logging

---
*Stack research for: Security hardening of LO-Solver v1.7*
*Researched: 2026-03-17*
