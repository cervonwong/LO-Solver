# Phase 39: API Key Transport - Research

**Researched:** 2026-03-17
**Domain:** HTTP header-based API key transport, Mastra workflow state security
**Confidence:** HIGH

## Summary

This phase removes the OpenRouter API key from all persisted and URL-visible locations (LibSQL snapshots, request bodies, query strings) and moves it to the `x-openrouter-key` HTTP header. The codebase has a small, well-defined surface area: two frontend touch points (solve hook, credits badge), two API routes, two schema definitions, and three workflow step files that read the key from persisted state.

The key technical challenge is propagating the API key through workflow steps without it appearing in workflow state (which Mastra persists to LibSQL snapshots). The recommended approach is to pass the key via `inputData` (which IS persisted in snapshots -- confirmed below) but strip it before the workflow sees it: extract the key from the HTTP header in the API route, create a per-request `RequestContext` with the OpenRouter provider already set, and pass that `RequestContext` to `run.stream()`. Steps already have access to the workflow-level `requestContext` via their `execute` params (documented in Mastra's Step reference), though the current code ignores it and creates its own.

**Primary recommendation:** Extract key from `x-openrouter-key` header in route handlers, remove `apiKey` from both Zod schemas, pass the provider via `run.stream({ requestContext })`, and have Step 1 propagate it to its local RequestContext. Steps 2 and 3 already read the provider from `state.apiKey` -- switch them to read from the workflow-level requestContext instead.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- API key sent via `x-openrouter-key` HTTP header on both solve and credits requests
- Remove key from request body (`inputData.apiKey`) and query string (`?key=`)
- No key in workflow state schema -- remove `apiKey` field from `workflowStateSchema` and `rawProblemInputSchema`
- Extract key from header in API route, pass to workflow outside of persisted state
- Subsequent steps must receive the key through a non-persisted channel (e.g., Mastra requestContext or step-local mechanism)
- Stop persisting new keys only -- no database migration or cleanup of old snapshots
- Old workflow snapshots in LibSQL may still contain keys from prior runs; this is acceptable for a single-user dev tool

### Claude's Discretion
- Exact mechanism for passing the key through workflow steps without state persistence
- Header extraction and validation details in route handlers
- Error message wording for missing/invalid keys

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | API key is not persisted to LibSQL via workflow state schema | Remove `apiKey` from `workflowStateSchema` and `rawProblemInputSchema`. Pass via RequestContext to `run.stream()` instead. Snapshot docs confirm `context.input` is persisted -- key must not be in inputData. |
| SEC-02 | Solve endpoint receives API key via HTTP header instead of request body | `DefaultChatTransport.prepareSendMessagesRequest` can return `headers` alongside `body`. Route handler reads `req.headers.get('x-openrouter-key')`. |
| SEC-03 | Credits endpoint receives API key via HTTP header instead of query string | Credits badge `fetch()` call adds `headers: { 'x-openrouter-key': apiKey }` instead of query param. Route reads from header. |
</phase_requirements>

## Architecture Patterns

### Critical Finding: Snapshot Persistence Includes inputData

Mastra workflow snapshots include `context.input` which contains the full `inputData` object. From the official Mastra snapshot docs:

```json
{
  "runId": "...",
  "context": {
    "input": {
      "value": 100,
      "user": "Michael"
    }
  }
}
```

Source: `node_modules/@mastra/core/dist/docs/references/docs-workflows-snapshots.md`

This means if `apiKey` remains in `rawProblemInputSchema`, it WILL be persisted to LibSQL even if removed from `workflowStateSchema`. Both schemas must have `apiKey` removed.

### Key Propagation Strategy (Claude's Discretion Resolution)

**Recommended approach: Workflow-level RequestContext**

Mastra's `run.stream()` accepts an optional `requestContext` parameter:

```typescript
const run = await workflow.createRun();
const workflowStream = run.stream({
  inputData: params.inputData, // NO apiKey here
  requestContext,              // API key lives here
});
```

Source: `node_modules/@mastra/core/dist/docs/references/reference-streaming-workflows-stream.md`

Step `execute` functions receive `requestContext` as a parameter:

```typescript
execute: async ({ inputData, state, setState, writer, requestContext }) => {
  // requestContext is the workflow-level RequestContext passed to run.stream()
}
```

Source: `node_modules/@mastra/core/dist/docs/references/reference-workflows-step.md`

**However**, the current codebase creates NEW `RequestContext` instances per step:

```typescript
// In 01-extract.ts (line 45):
const requestContext = new RequestContext<WorkflowRequestContext>();
```

This means the workflow-level `requestContext` is shadowed. Two approaches to fix this:

**Option A (Recommended): Pass provider in workflow-level requestContext, extract in Step 1**

1. API route creates a `RequestContext` with `openrouter-provider` set
2. Pass it to `run.stream({ requestContext })`
3. Step 1's execute receives it as a param (rename to avoid shadowing), extracts the provider, and sets it on its local RequestContext
4. Step 1 also persists `providerMode` to state (no change), Steps 2/3 read `state.providerMode` but get the provider from the workflow-level requestContext

Actually, this gets complicated because Steps 2 and 3 also create their own RequestContexts. The simplest path:

**Option B (Simplest): Pass only the API key string through workflow-level requestContext**

1. API route creates `RequestContext` with key `'user-api-key'` set to the raw key string
2. Each step's `execute` receives workflow `requestContext`, reads the key, and uses it when creating its local per-step `RequestContext`:

```typescript
execute: async ({ inputData, mastra, state, setState, writer, abortSignal, requestContext: workflowCtx }) => {
  const localCtx = new RequestContext<WorkflowRequestContext>();
  // ... existing setup ...
  const userApiKey = workflowCtx?.get('user-api-key') as string | undefined;
  if (userApiKey) {
    localCtx.set('openrouter-provider', createOpenRouterProvider(userApiKey));
  }
}
```

**Option B is recommended** because it requires the least structural change -- each step continues to create its own local RequestContext, but reads the API key from the workflow-level context instead of from `state.apiKey` or `inputData.apiKey`.

### Pattern: Frontend Header Injection

`DefaultChatTransport.prepareSendMessagesRequest` already returns `{ body }`. The return type also supports `headers`:

```typescript
type PrepareSendMessagesRequest = (options) => {
  body: object;
  headers?: HeadersInit;  // <-- can add custom headers here
  credentials?: RequestCredentials;
  api?: string;
};
```

Source: `node_modules/ai/dist/index.d.ts` lines 3861-3876

### Recommended Project Structure (Changes Only)

```
src/
  hooks/
    use-solver-workflow.ts     # Add x-openrouter-key header, remove apiKey from body
  components/
    credits-badge.tsx          # Switch from query param to header
  app/
    api/
      solve/route.ts           # Read key from header, create RequestContext
      credits/route.ts         # Read key from header instead of searchParams
  mastra/
    workflow/
      workflow-schemas.ts      # Remove apiKey from both schemas
      steps/
        01-extract.ts          # Read key from workflow requestContext, not inputData
        02-hypothesize.ts      # Read key from workflow requestContext, not state
        03-answer.ts           # Read key from workflow requestContext, not state
```

### Anti-Patterns to Avoid

- **Passing API key in inputData and filtering before snapshot:** Mastra snapshots are internal -- you cannot intercept them. The key must never enter `inputData`.
- **Using `initialState` for the key:** State is also persisted in snapshots. Same problem.
- **Relying on `getInitData()` in later steps:** `getInitData()` returns the original input which is persisted. Same problem.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Passing non-persisted data through workflow steps | Custom middleware or monkey-patching snapshot serialization | Mastra's `requestContext` parameter on `run.stream()` | Officially supported, type-safe, explicitly not persisted |
| Per-request OpenRouter provider | New provider creation pattern | Existing `createOpenRouterProvider(apiKey)` in `openrouter.ts` | Already implemented and tested with proper wrapping |

## Common Pitfalls

### Pitfall 1: Forgetting to Remove apiKey from rawProblemInputSchema
**What goes wrong:** The key is removed from workflowStateSchema but left in rawProblemInputSchema. Since inputData is persisted in snapshots (`context.input`), the key still leaks to disk.
**Why it happens:** Two separate schemas contain apiKey -- easy to miss one.
**How to avoid:** Remove from BOTH schemas. Verify by checking the Zod parse doesn't accept apiKey.
**Warning signs:** `npx tsc --noEmit` will flag errors in files that still reference `inputData.apiKey`.

### Pitfall 2: Variable Shadowing in Step Execute
**What goes wrong:** Step 1 currently destructures `requestContext` from its execute params... except it doesn't -- it creates a local `const requestContext`. If the workflow-level requestContext is also named `requestContext` in the destructuring, it will shadow or be shadowed.
**Why it happens:** The parameter name and the local variable have the same name.
**How to avoid:** Destructure the workflow-level requestContext with a different name: `requestContext: workflowCtx` or `requestContext: wfRequestContext`.
**Warning signs:** The user API key is undefined inside the step despite being set in the route.

### Pitfall 3: Credits Badge Polling Creates Repeated Header Sends
**What goes wrong:** The credits badge polls every 20 seconds. With query params, the key was visible in browser network tab URLs. With headers, the key is in request headers which is correct, but ensure the header name matches what the route expects.
**Why it happens:** Inconsistent header naming between frontend and backend.
**How to avoid:** Use the exact string `'x-openrouter-key'` consistently in all locations. Define it as a constant if desired.

### Pitfall 4: Eval Runner Uses OPENROUTER_API_KEY Env Var
**What goes wrong:** Someone assumes the eval runner also needs changes.
**Why it happens:** The eval runner (`src/evals/run.ts`) calls `run.start()` with `inputData` that has no `apiKey` field -- it relies on the server env var.
**How to avoid:** After removing `apiKey` from `rawProblemInputSchema`, verify the eval runner still compiles (it should, since it never sent `apiKey`).
**Warning signs:** TypeScript errors in `src/evals/run.ts`.

### Pitfall 5: chatId Uses apiKey Suffix
**What goes wrong:** `use-solver-workflow.ts` line 45 uses `apiKey.slice(-4)` in the `chatId`. After removing apiKey from the body, the key is still in the hook (read from localStorage) for header injection. The chatId pattern is fine -- it only uses the last 4 chars for cache-busting, not the full key.
**Why it happens:** False alarm, but worth noting.
**How to avoid:** Keep the chatId pattern as-is. The `useApiKey()` hook remains -- only the transport changes.

## Code Examples

### 1. Frontend: Header Injection in DefaultChatTransport

```typescript
// src/hooks/use-solver-workflow.ts
const transport = useMemo(
  () =>
    new DefaultChatTransport({
      api: '/api/solve',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          inputData: {
            rawProblemText:
              (messages[messages.length - 1]?.parts?.[0] as { text?: string } | undefined)
                ?.text ?? '',
            providerMode,
            maxRounds: workflowSettings.maxRounds,
            perspectiveCount: workflowSettings.perspectiveCount,
            // apiKey REMOVED from body
          },
        },
        // API key sent via header instead
        ...(apiKey && {
          headers: { 'x-openrouter-key': apiKey },
        }),
      }),
    }),
  [providerMode, apiKey, workflowSettings],
);
```

Source: Verified against AI SDK `PrepareSendMessagesRequest` type definition.

### 2. Backend: Solve Route Header Extraction

```typescript
// src/app/api/solve/route.ts
import { RequestContext } from '@mastra/core/request-context';

export async function POST(req: Request) {
  const params = await req.json();

  // Extract API key from header (not body)
  const apiKey = req.headers.get('x-openrouter-key') || undefined;
  const providerMode = (params.inputData?.providerMode ?? 'openrouter-testing') as ProviderMode;

  if (isOpenRouterMode(providerMode) && !apiKey && !process.env.OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'No API key provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ... Claude Code auth gate unchanged ...

  const workflow = mastra.getWorkflowById('solver-workflow')!;
  const run = await workflow.createRun();
  activeRuns.set(run.runId, run);

  // Pass API key via RequestContext (not persisted to LibSQL)
  const requestContext = new RequestContext();
  if (apiKey) {
    requestContext.set('user-api-key', apiKey);
  }

  const workflowStream = run.stream({
    inputData: params.inputData, // No apiKey field
    requestContext,
  });

  // ... rest unchanged ...
}
```

Source: Verified against Mastra `run.stream()` docs.

### 3. Backend: Credits Route Header Extraction

```typescript
// src/app/api/credits/route.ts
export async function GET(req: Request) {
  const hasServerKey = !!process.env.OPENROUTER_API_KEY;

  // Read key from header instead of query string
  const userKey = req.headers.get('x-openrouter-key');
  const effectiveKey = userKey || process.env.OPENROUTER_API_KEY;

  // ... rest unchanged ...
}
```

### 4. Frontend: Credits Badge Header-Based Fetch

```typescript
// src/components/credits-badge.tsx
async function fetchCredits() {
  try {
    const res = await fetch('/api/credits', {
      ...(apiKey && {
        headers: { 'x-openrouter-key': apiKey },
      }),
    });
    // ... rest unchanged ...
  }
}
```

### 5. Workflow Step: Reading Key from Workflow RequestContext

```typescript
// In any step's execute function:
execute: async ({ inputData, mastra, state, setState, writer, abortSignal, requestContext: workflowCtx }) => {
  const localCtx = new RequestContext<WorkflowRequestContext>();
  // ... existing setup ...

  // Read API key from workflow-level requestContext (not persisted)
  const userApiKey = workflowCtx?.get('user-api-key') as string | undefined;
  if (userApiKey) {
    localCtx.set('openrouter-provider', createOpenRouterProvider(userApiKey));
  }

  // ... rest of step logic uses localCtx as before ...
}
```

### 6. Schema Changes

```typescript
// src/mastra/workflow/workflow-schemas.ts

// REMOVE apiKey from workflowStateSchema:
export const workflowStateSchema = z.object({
  // ... all existing fields EXCEPT apiKey ...
  // apiKey: z.string().optional(), // REMOVED
});

// REMOVE apiKey from rawProblemInputSchema:
export const rawProblemInputSchema = z.object({
  rawProblemText: z.string(),
  providerMode: z.enum([...]).default('openrouter-testing'),
  maxRounds: z.number().min(1).max(5).default(3),
  perspectiveCount: z.number().min(2).max(7).default(3),
  // apiKey: z.string().optional(), // REMOVED
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API key in request body / query string | API key in HTTP header | This phase | Key no longer in URLs, browser history, or request body logs |
| API key in workflow state schema | API key in RequestContext | This phase | Key no longer persisted to LibSQL snapshots |
| `state.apiKey` read in steps 2/3 | Workflow-level RequestContext | This phase | Non-persisted channel for key propagation |

## Open Questions

1. **RequestContext typing for workflow-level context**
   - What we know: The API route creates a plain `new RequestContext()` (untyped) to pass to `run.stream()`. The step's `workflowCtx` parameter will be this untyped context.
   - What's unclear: Whether we should create a separate type for the workflow-level context or just use `as string` casts when reading.
   - Recommendation: Use a simple type alias or just cast. The surface area is small (one key, three consumers). Over-engineering the types adds complexity without proportional benefit.

2. **RequestContext in `02-shared.ts` sub-functions**
   - What we know: Steps 2's sub-functions (`runDispatch`, `runHypothesize`, `runVerify`, `runSynthesize`) receive a `HypothesizeContext` which carries `mainRequestContext`. The `mainRequestContext` is created in step 2's execute function.
   - What's unclear: Whether to pass the workflow-level requestContext through the `HypothesizeContext` or just read the key once in step 2's execute and set the provider on `mainRequestContext`.
   - Recommendation: Read the key once in step 2's execute and set `openrouter-provider` on `mainRequestContext`. This is the minimal-change approach -- sub-functions don't need to know about the workflow-level context.

## Affected Files Summary

| File | Change | Scope |
|------|--------|-------|
| `src/hooks/use-solver-workflow.ts` | Add header, remove apiKey from body | Frontend |
| `src/components/credits-badge.tsx` | Switch from query param to header | Frontend |
| `src/app/api/solve/route.ts` | Read header, create RequestContext, pass to stream | Backend route |
| `src/app/api/credits/route.ts` | Read header instead of query param | Backend route |
| `src/mastra/workflow/workflow-schemas.ts` | Remove apiKey from both schemas | Schema |
| `src/mastra/workflow/steps/01-extract.ts` | Read key from workflow requestContext | Workflow step |
| `src/mastra/workflow/steps/02-hypothesize.ts` | Read key from workflow requestContext | Workflow step |
| `src/mastra/workflow/steps/03-answer.ts` | Read key from workflow requestContext | Workflow step |

**Files NOT affected:**
- `src/hooks/use-api-key.ts` -- unchanged, still manages localStorage
- `src/evals/run.ts` -- never sends apiKey, uses env var
- `src/mastra/openrouter.ts` -- unchanged, `createOpenRouterProvider` still used
- `src/mastra/workflow/request-context-types.ts` -- unchanged, `openrouter-provider` key already exists
- `src/mastra/workflow/request-context-helpers.ts` -- unchanged, `getOpenRouterProvider` still works

## Sources

### Primary (HIGH confidence)
- `node_modules/@mastra/core/dist/docs/references/docs-workflows-snapshots.md` -- Confirms inputData persisted in snapshot `context.input`
- `node_modules/@mastra/core/dist/docs/references/reference-workflows-step.md` -- Confirms `requestContext` available in step execute params
- `node_modules/@mastra/core/dist/docs/references/reference-streaming-workflows-stream.md` -- Confirms `requestContext` parameter on `run.stream()`
- `node_modules/@mastra/core/dist/docs/references/docs-server-request-context.md` -- Full RequestContext documentation
- `node_modules/@mastra/core/dist/docs/references/docs-workflows-workflow-state.md` -- State persistence behavior
- `node_modules/ai/dist/index.d.ts` -- `PrepareSendMessagesRequest` type supports `headers` return

### Secondary (MEDIUM confidence)
- Direct source code inspection of all 8 affected files in the project

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies needed
- Architecture: HIGH -- Mastra docs confirm requestContext propagation through run.stream() to steps
- Pitfalls: HIGH -- direct code inspection reveals all touch points

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no new dependencies, all patterns verified against installed versions)
