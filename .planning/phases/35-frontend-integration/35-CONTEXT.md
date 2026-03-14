# Phase 35: Frontend Integration - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can select Claude Code as their provider from the UI and see appropriate feedback throughout the solve. Includes the core provider toggle UX, auth status display, cost/token tracking, and several related UI improvements pulled in from pending todos: test result rendering fix, CC instance visualisation, CC model tiers, and CC agent parallelisation.

</domain>

<decisions>
## Implementation Decisions

### Provider toggle
- Expand from 3-option to 4-option toggle: Test | Prod | CC Test | CC Prod
- `providerMode` enum expands from 3 to 4 values: `openrouter-testing`, `openrouter-production`, `claude-code-testing`, `claude-code-production`
- CC Testing maps to: Haiku for extraction agents, Sonnet for reasoning agents
- CC Production maps to: Sonnet for extraction agents, Opus for reasoning agents
- All 4 options visible at once in the same ToggleGroup component

### API key visibility
- CreditsBadge replaces its content based on provider mode — same slot, different content
- OpenRouter modes: show API key status + dollar credits (current behavior)
- Claude Code modes: show auth status (checkmark or warning) + token usage
- Badge is non-interactive (no click action) when Claude Code mode is active
- OpenRouter API key preserved silently in localStorage when switching to Claude Code — available when switching back

### Auth status indicator
- Authenticated state: green checkmark icon + "Claude Code" text in badge area
- Unauthenticated state: amber warning icon + "Run `claude login`" text (matches existing warning pulse style)
- Auth check triggers on mode switch to Claude Code, with periodic re-check (~20s interval, matching credits poll)
- New lightweight `/api/claude-auth` endpoint — checks CLI presence and auth status without making an LLM call (no `generateText` probe)
- Backend `/api/solve` auth gate remains as defense-in-depth

### Solve flow guard
- Frontend pre-check replaces key dialog guard when Claude Code is selected
- On solve attempt in CC mode: check `/api/claude-auth` first, block with error toast if unauthenticated
- On solve attempt in OpenRouter mode: existing key check behavior unchanged

### Cost and token display
- Claude Code modes show token count + estimated dollar cost in the badge area (replacing '$X.XX left')
- Format: "12.4k tokens (~$0.15)" using Anthropic's published per-token pricing
- Token tracking implemented in this phase — research whether Claude Code/AI SDK responses include token counts
- If token data unavailable from the provider, show "Subscription" as fallback

### Mode switch experience
- Instant toggle switch with toast notification: "Switched to Claude Code. Checking authentication..."
- Background auth check fires after mode switch, badge updates when result arrives
- If auth check fails: stay on Claude Code mode, show warning badge — don't auto-revert
- No confirmation dialog on mode switch

### Test result rendering fix (from todo)
- Fix testSentence and testRule tool call rendering in trace panel — currently always shows FAIL
- Issue is in Zod schema parameter parsing — not extracting pass/fail status correctly
- Fix applies to all provider modes (general UI bug)

### Claude Code instance visualisation (from todo)
- Show active Claude Code instances in the trace panel
- Display which CC agents are currently running and their status
- Fits within existing trace panel observability pattern

### Claude Code agent parallelisation (from todo)
- Enable concurrent execution of Claude Code agent instances where workflow allows
- Currently only one hypothesizer agent runs at a time in CC mode — should parallel like OpenRouter

### Claude's Discretion
- Exact implementation of the lightweight `/api/claude-auth` endpoint (CLI detection method)
- Token tracking extraction from AI SDK response metadata
- CC instance visualisation component design within trace panel
- How to implement CC agent parallelisation (concurrent SDK `query()` calls vs other approach)
- Toast wording and timing details
- Anthropic pricing table format and update strategy

</decisions>

<specifics>
## Specific Ideas

- The CreditsBadge component should branch on provider mode to render either OpenRouter or Claude Code content — same component, conditional rendering
- Auth check endpoint should be fast (<100ms) — consider checking for `claude` CLI binary existence and cached auth tokens rather than making any API call
- For token tracking, check if `ai-sdk-provider-claude-code` exposes token usage in the response metadata (Vercel AI SDK `usage` field)
- CC instance visualisation could extend the existing trace event card pattern — new event type for CC instance lifecycle

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CreditsBadge` (`credits-badge.tsx`): Already polls `/api/credits` every 20s — extend with provider-mode-aware rendering and `/api/claude-auth` polling
- `ProviderModeToggle` (`provider-mode-toggle.tsx`): 3-option ToggleGroup — expand to 4 options with new labels
- `useProviderMode` hook: localStorage persistence with migration logic — extend enum values
- `ApiKeyDialog` (`api-key-dialog.tsx`): OpenRouter key entry — conditionally hidden for CC modes
- `useApiKey` hook: API key management — unchanged, just not displayed in CC mode
- Sonner toast notifications: Already used for workflow lifecycle — reuse for mode switch feedback
- `TraceEventCard` and trace rendering components: Integration point for CC instance visualisation
- `workflow-events.ts`: Event type definitions — extend for CC instance lifecycle events

### Established Patterns
- Provider mode in localStorage (`lo-solver-provider-mode`) with `useSyncExternalStore`
- Credits polling via `useEffect` + `setInterval` at 20s intervals
- Conditional UI based on `hasServerKey` / `apiKey` state
- Toast notifications via Sonner for workflow state changes
- `stamp-btn-nav-*` CSS classes for nav bar button styling
- `hover-hatch-cyan` for interactive elements

### Integration Points
- `layout-shell.tsx`: NavBar renders CreditsBadge and ProviderModeToggle — conditional rendering hub
- `use-solver-workflow.ts`: Sends `providerMode` in workflow payload — update to new 4-value enum
- `/api/solve/route.ts`: Auth gate and provider routing — update for 4 provider modes
- `agent-factory.ts`: `claudeCodeModel` field per agent — add tier-based model resolution
- `workflow-schemas.ts`: `providerMode` enum — expand from 3 to 4 values
- `request-context-types.ts`: Provider mode type — expand enum

</code_context>

<deferred>
## Deferred Ideas

- "Investigate cost estimation for Claude via tokens" todo — token tracking is IN scope for this phase, but advanced quota/subscription tier tracking is deferred
- "Make vocab and rules table horizontally scrollable" — already fixed per user

</deferred>

---

*Phase: 35-frontend-integration*
*Context gathered: 2026-03-14*
