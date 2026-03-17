# Architecture Research: Security Hardening Integration

**Domain:** Security fixes for existing Next.js 16 + Mastra AI agent solver
**Researched:** 2026-03-17
**Confidence:** HIGH

## Current Architecture (Pre-Security)

### API Key Data Flow (Current -- Insecure)

```
Client (localStorage)
    |
    |--- POST /api/solve body: { inputData: { apiKey, ... } }
    |        |
    |        |--- apiKey written to workflow state via setState({ apiKey })
    |        |        |
    |        |        |--- State persisted to LibSQL by Mastra
    |        |        |
    |        |        |--- Step 1 reads inputData.apiKey
    |        |        |--- Step 2 reads state.apiKey
    |        |        |--- Step 3 reads state.apiKey
    |        |        |
    |        |        v
    |        |    Each step: createOpenRouterProvider(apiKey)
    |        |        -> stored on RequestContext as 'openrouter-provider'
    |        |
    |--- GET /api/credits?key=sk-or-... (API key in query string!)
    |
    |--- POST /api/solve/cancel (cancels ALL active runs, no scoping)
```

### Security Issues Identified

| Issue | Location | Risk |
|-------|----------|------|
| API key persisted to LibSQL via workflow state | `workflow-schemas.ts` L56, `01-extract.ts` L35 | Key stored on disk in plaintext |
| API key in query string | `credits-badge.tsx` L50, `credits/route.ts` L7 | Key logged in server access logs, browser history, referrer headers |
| Cancel endpoint kills all runs | `cancel/route.ts` -- iterates entire `activeRuns` map | Any client can cancel another client's workflow |
| Synchronous filesystem logging | `logging-utils.ts` -- all functions use `fs.writeFileSync`/`fs.appendFileSync` | Blocks event loop; sensitive data (rules, vocabulary) written to disk unconditionally |
| No API route protection | No `proxy.ts` exists | All API routes publicly accessible without method enforcement |

## Target Architecture (Post-Security)

### API Key Data Flow (Secured)

```
Client (localStorage)
    |
    |--- POST /api/solve
    |    Headers: { x-openrouter-key: sk-or-... }
    |    Body: { inputData: { rawProblemText, providerMode, ... } }  <-- no apiKey in body
    |        |
    |        v
    |    proxy.ts (Next.js 16 proxy layer)
    |        |--- Method enforcement (POST only)
    |        |--- Passes through to route handler
    |        v
    |    route.ts
    |        |--- Reads key from req.headers.get('x-openrouter-key')
    |        |--- Injects apiKey into inputData for workflow
    |        v
    |    Workflow execution
    |        |--- Step 1: receives key via inputData
    |        |        |--- Creates provider, sets on RequestContext
    |        |        |--- Persists key to state (pragmatic -- see rationale below)
    |        |--- Step 2: reads state.apiKey, creates provider
    |        |--- Step 3: reads state.apiKey, creates provider
    |        |
    |        v
    |    Key lives in LibSQL (accepted for local dev tool)
    |    Key NEVER appears in URLs, query strings, or logs
    |
    |--- GET /api/credits
    |    Headers: { x-openrouter-key: sk-or-... }  <-- moved from query string
    |
    |--- POST /api/solve/cancel
    |    Body: { runId: "specific-run-id" }  <-- scoped to one run
```

## Component Responsibilities (New and Modified)

| Component | Status | Responsibility | Changes |
|-----------|--------|----------------|---------|
| `src/proxy.ts` | **NEW** | Thin request proxy for API route method enforcement | Method checks on `/api/solve` and `/api/solve/cancel` |
| `workflow-schemas.ts` | **NO CHANGE** | Workflow state shape | `apiKey` stays in state (see Pattern 2 rationale) |
| `solve/route.ts` | MODIFY | Read key from header instead of body | Read `x-openrouter-key` header; inject into `inputData` |
| `credits/route.ts` | MODIFY | Read key from header instead of query string | Read `x-openrouter-key` header; stop reading query param |
| `cancel/route.ts` | MODIFY | Cancel specific run by ID | Accept `{ runId }` in POST body; look up in `activeRuns` |
| `active-runs.ts` | NO CHANGE | Track active runs by runId | Already stores by `runId`; no changes needed |
| `use-solver-workflow.ts` | MODIFY | Send key via header, not body | Move `apiKey` to transport `headers` option |
| `credits-badge.tsx` | MODIFY | Send key via header, not query string | Use `headers: { 'x-openrouter-key': apiKey }` in fetch |
| `logging-utils.ts` | MODIFY | Async, opt-in logging | Replace sync fs with `fs/promises`; gate on `LOG_ENABLED` |
| `workflow-schemas.ts` (`initializeWorkflowState`) | MODIFY | Conditional log file creation | Skip log file init when logging disabled |
| Step files (01, 02, 03) | MODIFY | Await logging calls | All log function calls become `await`ed |

## Architectural Patterns

### Pattern 1: Header-Based Key Transport

**What:** Move API key from request body and query strings to a custom HTTP header (`x-openrouter-key`).

**Why:** Headers are not logged in browser history, not included in referrer headers, and can be stripped by reverse proxies. This is the single highest-impact security fix.

**Integration points:**
- Frontend `use-solver-workflow.ts`: `DefaultChatTransport` accepts a `headers` option
- Frontend `credits-badge.tsx`: standard `fetch()` with headers
- Backend `solve/route.ts`: `req.headers.get('x-openrouter-key')`
- Backend `credits/route.ts`: `req.headers.get('x-openrouter-key')`

**Frontend transport change:**
```typescript
// use-solver-workflow.ts -- BEFORE
const transport = useMemo(
  () => new DefaultChatTransport({
    api: '/api/solve',
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        inputData: {
          rawProblemText: /* ... */,
          providerMode,
          ...(apiKey && { apiKey }),  // key in body
        },
      },
    }),
  }),
  [providerMode, apiKey, workflowSettings],
);

// use-solver-workflow.ts -- AFTER
const transport = useMemo(
  () => new DefaultChatTransport({
    api: '/api/solve',
    headers: apiKey ? { 'x-openrouter-key': apiKey } : undefined,
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        inputData: {
          rawProblemText: /* ... */,
          providerMode,
          // NO apiKey in body
        },
      },
    }),
  }),
  [providerMode, apiKey, workflowSettings],
);
```

**Backend route change:**
```typescript
// solve/route.ts -- key extraction
export async function POST(req: Request) {
  const apiKey = req.headers.get('x-openrouter-key') ?? undefined;
  const params = await req.json();
  const providerMode = params.inputData?.providerMode ?? 'openrouter-testing';

  if (isOpenRouterMode(providerMode) && !apiKey && !process.env.OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'No API key provided' }), { status: 401 });
  }

  // Inject apiKey into inputData for the workflow (keeps workflow code unchanged)
  const inputData = { ...params.inputData, apiKey };
  const workflow = mastra.getWorkflowById('solver-workflow')!;
  const run = await workflow.createRun();
  // ...
}
```

**Credits endpoint change:**
```typescript
// credits/route.ts -- BEFORE
const userKey = url.searchParams.get('key');

// credits/route.ts -- AFTER
const userKey = req.headers.get('x-openrouter-key');
```

### Pattern 2: apiKey Stays in Workflow State (Pragmatic Decision)

**What:** Keep `apiKey: z.string().optional()` in `workflowStateSchema`. Do NOT attempt to remove it from persistent state.

**Why this is the right call for this project:**

The Mastra framework's inter-step data flow makes removing apiKey from state extremely difficult:

1. **Step isolation:** Each step receives only its predecessor's output as `inputData`. The original workflow `inputData` (containing `apiKey`) is only directly available to Step 1.

2. **No workflow-level requestContext:** The existing Key Decision log confirms "Mastra steps don't receive workflow-level requestContext." There is no transient cross-step channel.

3. **Threading through I/O schemas:** To remove apiKey from state, every inter-step schema (`structuredProblemSchema`, `questionAnsweringInputSchema`) would need an `apiKey` field, polluting domain schemas with transport concerns.

4. **`.map()` closures cannot capture workflow inputData:** The `.map()` between steps in `workflow.ts` receives the previous step's output, not the workflow's original input.

**Risk assessment:** The LibSQL database (`mastra.db`) is:
- Local to the dev machine
- Already marked as ephemeral in CLAUDE.md ("Treat `mastra.db*` as ephemeral")
- Not committed to git (gitignored)
- The key is already in the client's localStorage

**Conclusion:** The real exposure vectors are query strings (browser history, server logs, referrer headers) and unredacted filesystem logs. Those are fixed by Patterns 1 and 4. The LibSQL persistence is a theoretical risk with near-zero practical impact for a single-user local dev tool.

### Pattern 3: Run-Scoped Cancellation

**What:** Change `/api/solve/cancel` from "cancel all runs" to "cancel specific run by ID."

**Current code analysis:** The `activeRuns` map in `active-runs.ts` already stores runs keyed by `runId`. The cancel endpoint iterates ALL entries. The fix is to accept a `runId` and do a single lookup.

**Integration points:**
- `cancel/route.ts`: Accept `{ runId }` in POST body
- `solve/route.ts`: Already stores `run.runId` in `activeRuns`. Need to communicate `runId` back to client.
- Frontend: Store `runId` when solve starts, send with cancel request

**How to get runId to the client:**

The solve endpoint uses AI SDK streaming (`createUIMessageStream`). The `runId` must reach the client before any cancel request. Three options:

1. **Emit as stream event (recommended):** Add a `data-workflow-start` event containing `runId` as the first event in the stream. The existing trace event infrastructure handles this. The frontend already parses custom events via `WorkflowTraceEvent`.

2. **Response header:** Set `x-run-id` header on the streaming response. But `createUIMessageStreamResponse` may not support custom headers cleanly, and the client may not read headers from a streaming response.

3. **Client-generated ID:** Let the client generate and send a `runId`. The backend uses it as the map key. Risk: collisions if client reuses IDs.

**Recommended approach -- stream event:**
```typescript
// solve/route.ts
activeRuns.set(run.runId, run);

const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    // Emit runId as first event so client can use it for cancellation
    writer.write({
      type: 'data',
      value: [{ type: 'data-workflow-start', data: { runId: run.runId } }],
    });
    // ... rest of stream
  },
});
```

```typescript
// cancel/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const runId = body?.runId;

  if (!runId || typeof runId !== 'string') {
    return Response.json({ error: 'runId is required' }, { status: 400 });
  }

  const run = activeRuns.get(runId);
  if (!run) {
    return Response.json({ error: 'Run not found or already completed' }, { status: 404 });
  }

  try {
    await run.cancel();
    return Response.json({ cancelled: [runId] });
  } catch {
    return Response.json({ cancelled: [runId] }); // idempotent
  }
}
```

### Pattern 4: Async Opt-In Logging

**What:** Replace all synchronous `fs.writeFileSync` / `fs.appendFileSync` calls with `fs/promises` equivalents, and gate logging behind `LOG_ENABLED=true` environment variable.

**Why:** Sync filesystem operations block the Node.js event loop. During a workflow run with dozens of agent calls and tool invocations, frequent sync writes degrade response latency. Making logging opt-in prevents sensitive data (LLM outputs, rules, vocabulary) from being written to disk by default.

**Scope of changes in `logging-utils.ts`:**

| Function | Current | After |
|----------|---------|-------|
| `initializeLogFile` | `fs.writeFileSync`, `fs.mkdirSync` | `fsp.writeFile`, `fsp.mkdir` (async) |
| `logWorkflowSummary` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logAgentOutput` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logValidationError` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logVocabularyAdded` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logVocabularyUpdated` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logVocabularyRemoved` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logVocabularyCleared` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logSentenceTestResult` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logRuleTestResult` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `logVerificationResults` | `fs.appendFileSync` | `fsp.appendFile` (async) |
| `getLogFilePath` | synchronous (pure computation) | No change needed |
| `recordStepTiming` | synchronous (pure computation) | No change needed |
| `formatTimestamp` | synchronous (pure computation) | No change needed |

**Ripple effect -- callers that must add `await`:**

All logging function calls in step files must become `await`ed. Grep shows call sites in:
- `01-extract.ts`: `logAgentOutput`, `logValidationError`
- `02-hypothesize.ts`: `logVerificationResults`
- `02b-hypothesize.ts`, `02c-verify.ts`, `02d-synthesize.ts`: various log functions
- `03-answer.ts`: `logAgentOutput`, `logValidationError`, `logWorkflowSummary`
- `vocabulary-tools.ts`: `logVocabularyAdded`, `logVocabularyUpdated`, `logVocabularyRemoved`, `logVocabularyCleared`
- `tester-tools.ts`: `logSentenceTestResult`, `logRuleTestResult`

**`initializeWorkflowState` change:**

Currently `initializeWorkflowState()` in `workflow-schemas.ts` is synchronous and calls `getLogFilePath()` + `initializeLogFile()`. After the change:
- `getLogFilePath()` stays synchronous (pure path computation)
- `initializeLogFile()` becomes async
- `initializeWorkflowState()` must either become async OR defer log file creation to the first step

**Recommended:** Keep `initializeWorkflowState()` synchronous. It still generates the log file path (cheap). Move the actual `initializeLogFile()` call to Step 1's execute function (which is already async). Gate it behind the logging check:

```typescript
// workflow-schemas.ts
export const initializeWorkflowState = (): WorkflowState => {
  const logFile = getLogFilePath();  // Just computes the path, no I/O
  return {
    vocabulary: {},
    rules: {},
    logFile,  // Path is set but file not created yet
    startTime: new Date().toISOString(),
    // ...
  };
};

// 01-extract.ts (in execute function)
const initialState = initializeWorkflowState();
if (isLoggingEnabled()) {
  await initializeLogFile(initialState.logFile, initialState.startTime);
}
```

**Opt-in gate pattern:**
```typescript
// logging-utils.ts
import * as fsp from 'fs/promises';

const isLoggingEnabled = (): boolean => process.env.LOG_ENABLED === 'true';

export const logAgentOutput = async (
  logFile: string,
  stepName: string,
  agentName: string,
  output: unknown,
  reasoning?: string | ReasoningChunk[] | null,
  startTime?: number,
): Promise<void> => {
  if (!isLoggingEnabled()) return;
  const content = /* ... build markdown string ... */;
  await fsp.appendFile(logFile, content);
};
```

### Pattern 5: Next.js 16 Proxy for Method Enforcement

**What:** Add `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) to enforce HTTP methods on API routes.

**Important context:** Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`. The proxy runs on the Node.js runtime (not Edge). It executes before route handlers.

**What the proxy should do (thin scope):**
- Enforce POST method on `/api/solve` and `/api/solve/cancel`
- Let all other API routes pass through (they are read-only GET endpoints)

**What the proxy should NOT do:**
- Read request bodies (consumes the stream, breaks route handlers)
- Perform heavy auth logic (defense-in-depth means route handlers validate independently)
- Check `providerMode` (requires body parsing)

**Implementation:**
```typescript
// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Enforce POST-only on write endpoints
  if (pathname === '/api/solve' && request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (pathname === '/api/solve/cancel' && request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

**Trade-off:** The proxy adds a thin safety layer but is NOT a security boundary. CVE-2025-29927 demonstrated that Next.js middleware/proxy can be bypassed. Route handlers must still validate independently. The proxy's value is method enforcement and keeping invalid requests from reaching route handler code.

## Data Flow Changes Summary

### Solve Request (Before vs After)

**Before:**
```
Frontend: POST /api/solve { inputData: { rawProblemText, providerMode, apiKey } }
Route:    reads apiKey from body -> passes to workflow inputData
Step 1:   reads inputData.apiKey -> setState({ apiKey }) -> LibSQL
Steps 2-3: reads state.apiKey -> createOpenRouterProvider(state.apiKey)
```

**After:**
```
Frontend: POST /api/solve { inputData: { rawProblemText, providerMode } }
          Headers: { x-openrouter-key: sk-or-... }
Proxy:    method check -> pass through
Route:    reads apiKey from header -> injects into inputData
Step 1:   reads inputData.apiKey -> setState({ apiKey }) -> LibSQL (unchanged)
Steps 2-3: reads state.apiKey (unchanged)
```

Key change: apiKey never appears in the request body or URL. It travels via header from client to route handler, then via workflow inputData and state (internal transport).

### Credits Request (Before vs After)

**Before:** `GET /api/credits?key=sk-or-v1-abc123...`
**After:** `GET /api/credits` with `x-openrouter-key` header

### Cancel Request (Before vs After)

**Before:** `POST /api/solve/cancel` (no body, cancels ALL)
**After:** `POST /api/solve/cancel` with `{ runId: "uuid" }` (cancels ONE)

## Suggested Build Order

Build in this order to minimize rework and respect dependencies:

### Phase 1: Header-based key transport (highest impact, no dependencies)

**Files:** `use-solver-workflow.ts`, `credits-badge.tsx`, `solve/route.ts`, `credits/route.ts`

Rationale: Highest-impact security fix. Query strings expose keys in browser history, server logs, and referrer headers. The fix is self-contained: change where the key is read/sent without touching workflow internals.

### Phase 2: Scoped cancellation (no dependencies, parallel-safe with Phase 1)

**Files:** `cancel/route.ts`, `solve/route.ts` (emit runId event), frontend workflow control

Rationale: Small, self-contained. The `activeRuns` map already stores by `runId`. Need to emit `runId` to client and accept it in cancel requests.

### Phase 3: Async opt-in logging (independent, larger blast radius)

**Files:** `logging-utils.ts`, `workflow-schemas.ts`, all step files, `vocabulary-tools.ts`, `tester-tools.ts`

Rationale: Touches many files but changes are mechanical (sync to async, add guard). Must be done after Phases 1-2 to reduce merge conflict surface on shared step files.

### Phase 4: Proxy layer (depends on Phase 1)

**Files:** `src/proxy.ts` (new)

Rationale: Depends on header-based transport being in place. Should be done last as it is the thinnest security layer (defense-in-depth, not primary auth).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Proxy as Auth Boundary

**What people do:** Put all authentication logic in `proxy.ts`, trusting it as the sole security boundary.

**Why wrong:** CVE-2025-29927 showed middleware/proxy can be bypassed via header manipulation. Defense-in-depth requires route handlers to validate independently.

**Do this instead:** Keep auth validation in route handlers (where it already lives). Use proxy only for method enforcement.

### Anti-Pattern 2: Reading Request Body in Proxy

**What people do:** Parse the request body in `proxy.ts` to check fields like `providerMode`.

**Why wrong:** Reading the body in proxy consumes the stream. The route handler receives an empty body. Next.js 16 docs explicitly state proxy should be "thin" -- redirects, rewrites, header checks only.

**Do this instead:** Check only headers, cookies, URL path, and query parameters in proxy. Leave body validation to route handlers.

### Anti-Pattern 3: Encrypting State Instead of Excluding Secrets

**What people do:** Add AES-256 encryption for `apiKey` in workflow state rather than keeping it out of state.

**Why wrong for this project:** Adds complexity (key management, encryption/decryption per step) for a local dev tool with an ephemeral database. The encryption key itself becomes a new secret to manage.

**Do this instead:** Accept the pragmatic trade-off for local dev tools. Focus security effort on the actual exposure vectors: URLs, logs, and network transport.

### Anti-Pattern 4: Fire-and-Forget Async Logging

**What people do:** Make logging async but don't await the calls, creating unhandled promise rejections.

**Why wrong:** Unhandled rejections crash Node.js. Even if the log write is "optional," a disk-full or permission error becomes a process crash.

**Do this instead:** Always `await` async log calls. The opt-in gate (`if (!isLoggingEnabled()) return;`) short-circuits before any I/O, so the performance cost is negligible when logging is disabled.

## Sources

- [Next.js 16 proxy.ts API reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) -- HIGH confidence
- [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication) -- HIGH confidence
- [Mastra workflow state docs](https://mastra.ai/docs/workflows/workflow-state) -- MEDIUM confidence
- [Node.js blocking vs non-blocking](https://nodejs.org/en/learn/asynchronous-work/overview-of-blocking-vs-non-blocking) -- HIGH confidence
- [Next.js CVE-2025-29927 middleware bypass](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) -- HIGH confidence
- Codebase analysis of `workflow-schemas.ts`, step files, route handlers, and frontend hooks -- HIGH confidence

---
*Architecture research for: Security hardening of LO-Solver v1.7*
*Researched: 2026-03-17*
