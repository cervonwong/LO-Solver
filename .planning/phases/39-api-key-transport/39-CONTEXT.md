# Phase 39: API Key Transport - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Move the OpenRouter API key out of persisted workflow state (LibSQL) and request URLs/bodies into secure HTTP headers. The key must never reach disk or appear in browser history. Requirements: SEC-01, SEC-02, SEC-03.

</domain>

<decisions>
## Implementation Decisions

### Transport mechanism
- API key sent via `x-openrouter-key` HTTP header on both solve and credits requests
- Remove key from request body (`inputData.apiKey`) and query string (`?key=`)
- No key in workflow state schema — remove `apiKey` field from `workflowStateSchema` and `rawProblemInputSchema`

### Key propagation through workflow
- Extract key from header in API route, pass to workflow outside of persisted state
- Subsequent steps must receive the key through a non-persisted channel (e.g., Mastra requestContext or step-local mechanism)

### Existing persisted keys
- Stop persisting new keys only — no database migration or cleanup of old snapshots
- Old workflow snapshots in LibSQL may still contain keys from prior runs; this is acceptable for a single-user dev tool

### Claude's Discretion
- Exact mechanism for passing the key through workflow steps without state persistence
- Header extraction and validation details in route handlers
- Error message wording for missing/invalid keys

</decisions>

<specifics>
## Specific Ideas

No specific requirements — success criteria in ROADMAP.md define exactly what must be true.

</specifics>

<code_context>
## Existing Code Insights

### Key Touch Points
- `src/hooks/use-solver-workflow.ts:33` — Frontend sends key in `inputData.apiKey` via request body
- `src/components/credits-badge.tsx:50` — Frontend sends key as query param `?key=`
- `src/app/api/solve/route.ts:15` — Route extracts key from `params.inputData?.apiKey`
- `src/app/api/credits/route.ts:7` — Route extracts key from `url.searchParams.get('key')`
- `src/mastra/workflow/workflow-schemas.ts:56` — `apiKey: z.string().optional()` in state schema
- `src/mastra/workflow/workflow-schemas.ts:86` — `apiKey: z.string().optional()` in input schema
- `src/mastra/workflow/steps/01-extract.ts:35` — Copies key into workflow state via `setState`
- `src/mastra/workflow/steps/01-extract.ts:49-51` — Creates per-request OpenRouter provider from key

### Established Patterns
- Per-request OpenRouter provider via `createOpenRouterProvider(apiKey)` stored on RequestContext
- `getOpenRouterProvider(requestContext)` helper returns per-request or singleton provider
- `DefaultChatTransport` in `use-solver-workflow.ts` constructs request body — can add headers here

### Integration Points
- `prepareSendMessagesRequest` in `use-solver-workflow.ts` — add `headers` with API key
- All 4 workflow step files read `state.apiKey` — need to switch to reading from inputData or requestContext
- `credits-badge.tsx` fetch call — switch from query param to header

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-api-key-transport*
*Context gathered: 2026-03-17*
