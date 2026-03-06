# Phase 18: Key Routing - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

The stored API key flows through every solve request and the backend handles presence or absence of a key cleanly. Frontend sends the key, backend creates a per-request OpenRouter provider (or falls back to env key), and missing keys produce a clear UX response rather than cryptic API failures.

</domain>

<decisions>
## Implementation Decisions

### Key Transmission
- API key sent in the `inputData` body alongside existing fields (modelMode, rawProblemText, etc.) — matches established pattern
- Key stripped from all logs and trace events — only last 4 chars (sk-...XXXX) if needed for debugging
- Stateless per-request approach — key included in each solve POST, no server-side session
- Credits badge uses the user's key when fetching credits (falls back to server key balance when no user key)

### Per-Request Provider
- Create a new `createOpenRouter({apiKey})` instance for each solve request when a user key is present
- Provider factory extracted from existing singleton logic so both share the same routing (gpt-oss provider ordering, usage tracking)
- Per-request provider stored in RequestContext under an `openrouter-provider` key
- Helper function `getOpenRouterProvider(rctx)` in request-context-helpers.ts returns the context provider or falls back to the singleton
- All agents read the provider from context via helper instead of importing the singleton directly

### Server Key Detection
- `/api/credits` response gains a `hasServerKey: boolean` field — no new endpoint needed
- CreditsBadge already polls this endpoint every 20s, so frontend knows server key status without additional calls
- ApiKeyDialog remains accessible via CreditsBadge button regardless of server key status, but does not show "required" framing when server key exists
- When user has their own key set, badge shows the user's credit balance (their key is what gets used for solves)

### No-Key Error Handling
- When no key is available from either source, clicking Solve auto-opens the ApiKeyDialog instead of sending the request
- After saving a key in the auto-opened dialog, solve auto-starts with the problem text already entered
- Workflow failures due to API key issues (401/403 from OpenRouter) show a specific toast message (e.g., "API key error — check your key in settings") rather than the generic error toast
- General workflow error toast already exists (`showSolveErrorToast`) — key-specific variant is additive

### Claude's Discretion
- Exact field name for the API key in inputData
- How the provider factory is structured (separate file vs extended openrouter.ts)
- How to detect key-specific errors from OpenRouter responses (status code inspection)
- Exact toast copy for key-related errors

</decisions>

<specifics>
## Specific Ideas

- User wants the solve flow to feel seamless even without a pre-configured key — click Solve, get prompted for key, then solve starts automatically
- Credits badge should always show the relevant balance — whoever's key is being used for solves, that's whose credits appear
- Key errors should be distinguishable from other workflow errors in the toast

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useApiKey` hook (`src/hooks/use-api-key.ts`): Already manages localStorage read/write with cross-tab sync via StorageEvent
- `useSolverWorkflow` hook (`src/hooks/use-solver-workflow.ts`): Builds `inputData` in `prepareSendMessagesRequest` — key field added here
- `CreditsBadge` (`src/components/credits-badge.tsx`): Already reads `useApiKey` and polls `/api/credits` — needs `hasServerKey` integration
- `ApiKeyDialog` (`src/components/api-key-dialog.tsx`): Existing dialog for key entry — needs onSave callback for auto-solve flow
- `showSolveErrorToast` (`src/components/workflow-toast.tsx`): Existing error toast — key-specific variant can follow same pattern
- `useWorkflowToasts` (`src/hooks/use-workflow-toasts.ts`): Already detects `isFailed` state and fires error toast

### Established Patterns
- `RequestContext` with typed keys (`request-context-types.ts`): Provider will follow same pattern as `model-mode`
- `request-context-helpers.ts`: Typed accessor functions with null-safety — new `getOpenRouterProvider()` follows this pattern
- `openrouter.ts` provider wrapper: Factory logic (gpt-oss routing, usage tracking) needs to be extractable for per-request instances
- Agent model functions read `model-mode` from RequestContext — will also need to read provider from context

### Integration Points
- `/api/solve/route.ts`: Receives `inputData` including apiKey, passes to workflow
- Workflow step setup: Where RequestContext is populated — provider creation happens here
- All agent definitions: Currently import `openrouter` singleton — will import via helper instead
- `/api/credits/route.ts`: Adds `hasServerKey` field; optionally accepts user key to show their balance

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-key-routing*
*Context gathered: 2026-03-06*
