# Phase 35: Frontend Integration - Research

**Researched:** 2026-03-14
**Domain:** Frontend UI (React/Next.js), Provider mode switching, Claude Code auth/cost integration
**Confidence:** HIGH

## Summary

This phase adds four-option provider mode switching to the UI, Claude Code auth status display, token/cost tracking for Claude Code, and several related UI fixes. The codebase is well-structured for these changes: `useProviderMode`, `CreditsBadge`, `ProviderModeToggle`, and `layout-shell.tsx` are the primary modification targets. The backend `extractCostFromResult` needs extension to read Claude Code cost data, and a new lightweight `/api/claude-auth` endpoint wraps `claude auth status --json`.

Key findings: (1) The `ai-sdk-provider-claude-code@3.4.4` package already provides token usage via standard AI SDK `usage` field AND dollar cost via `providerMetadata['claude-code'].costUsd` -- so "token count + estimated cost" display is fully feasible. (2) The `claude auth status --json` CLI command returns structured auth data including `loggedIn`, `authMethod`, and `subscriptionType` in under 100ms -- ideal for the lightweight auth endpoint. (3) The test result rendering bug is a field name mismatch: the sentence tester result uses `overallStatus` (SENTENCE_OK) while the UI checks `result.status`. (4) Perspective parallelization already works via `Promise.all` in `02b-hypothesize.ts` -- each perspective gets its own `attachMcpProvider` and `RequestContext`, so Claude Code agents should already run in parallel.

**Primary recommendation:** Extend the existing component architecture (CreditsBadge, ProviderModeToggle, useProviderMode) with conditional rendering branches rather than creating new components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Expand from 3-option to 4-option toggle: Test | Prod | CC Test | CC Prod
- `providerMode` enum expands from 3 to 4 values: `openrouter-testing`, `openrouter-production`, `claude-code-testing`, `claude-code-production`
- CC Testing maps to: Haiku for extraction agents, Sonnet for reasoning agents
- CC Production maps to: Sonnet for extraction agents, Opus for reasoning agents
- All 4 options visible at once in the same ToggleGroup component
- CreditsBadge replaces its content based on provider mode -- same slot, different content
- OpenRouter modes: show API key status + dollar credits (current behavior)
- Claude Code modes: show auth status (checkmark or warning) + token usage
- Badge is non-interactive (no click action) when Claude Code mode is active
- OpenRouter API key preserved silently in localStorage when switching to Claude Code -- available when switching back
- Authenticated state: green checkmark icon + "Claude Code" text in badge area
- Unauthenticated state: amber warning icon + "Run `claude login`" text (matches existing warning pulse style)
- Auth check triggers on mode switch to Claude Code, with periodic re-check (~20s interval, matching credits poll)
- New lightweight `/api/claude-auth` endpoint -- checks CLI presence and auth status without making an LLM call (no `generateText` probe)
- Backend `/api/solve` auth gate remains as defense-in-depth
- Frontend pre-check replaces key dialog guard when Claude Code is selected
- On solve attempt in CC mode: check `/api/claude-auth` first, block with error toast if unauthenticated
- On solve attempt in OpenRouter mode: existing key check behavior unchanged
- Claude Code modes show token count + estimated dollar cost in the badge area (replacing '$X.XX left')
- Format: "12.4k tokens (~$0.15)" using Anthropic's published per-token pricing
- Token tracking implemented in this phase -- research whether Claude Code/AI SDK responses include token counts
- If token data unavailable from the provider, show "Subscription" as fallback
- Instant toggle switch with toast notification: "Switched to Claude Code. Checking authentication..."
- Background auth check fires after mode switch, badge updates when result arrives
- If auth check fails: stay on Claude Code mode, show warning badge -- don't auto-revert
- No confirmation dialog on mode switch
- Fix testSentence and testRule tool call rendering in trace panel -- currently always shows FAIL
- Issue is in Zod schema parameter parsing -- not extracting pass/fail status correctly
- Show active Claude Code instances in the trace panel
- Enable concurrent execution of Claude Code agent instances where workflow allows

### Claude's Discretion
- Exact implementation of the lightweight `/api/claude-auth` endpoint (CLI detection method)
- Token tracking extraction from AI SDK response metadata
- CC instance visualisation component design within trace panel
- How to implement CC agent parallelisation (concurrent SDK `query()` calls vs other approach)
- Toast wording and timing details
- Anthropic pricing table format and update strategy

### Deferred Ideas (OUT OF SCOPE)
- Advanced quota/subscription tier tracking is deferred
- "Make vocab and rules table horizontally scrollable" -- already fixed per user
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Three-way provider selector replaces binary model mode toggle | CONTEXT expands to four-way. Current `ProviderModeToggle` uses ToggleGroup with 3 items; extend to 4. `ProviderMode` type in `use-provider-mode.ts` and `openrouter.ts` needs 2 new values. `workflow-schemas.ts` providerMode enum needs expansion. |
| UI-02 | API key dialog hidden when Claude Code mode is selected | `CreditsBadge` onClick opens API key dialog; make non-interactive for CC modes. `guardedHandleSolve` in `page.tsx` checks `requiresKeyEntry`; bypass for CC modes and use auth check instead. |
| UI-03 | Auth status indicator shows Claude Code authentication state | New `/api/claude-auth` endpoint using `claude auth status --json`. `CreditsBadge` renders auth state for CC modes. Polling interval matches existing 20s credits poll. |
| PROV-06 | Cost tracking shows "Subscription" label for Claude Code mode instead of $0.00 | Token usage IS available from `ai-sdk-provider-claude-code` via AI SDK `usage` field. Cost available via `providerMetadata['claude-code'].costUsd`. `extractCostFromResult` needs extension to read CC cost data. Badge shows token count + estimated cost, with "Subscription" fallback. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x | React framework | Already in use |
| react | 19.x | UI library | Already in use |
| radix-ui | latest | ToggleGroup primitive | Already used via shadcn/ui |
| sonner | latest | Toast notifications | Already used for workflow lifecycle |
| ai-sdk-provider-claude-code | 3.4.4 | Claude Code AI SDK provider | Already installed; provides usage/cost metadata |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.x | Schema validation | API response validation for auth endpoint |
| class-variance-authority | latest | Variant styling | Already in toggle components |

No new dependencies needed. All required libraries are already installed.

## Architecture Patterns

### Provider Mode Type Expansion

The `ProviderMode` type is duplicated in two places:
1. **Server-side (source of truth):** `src/mastra/openrouter.ts` line 48
2. **Client-side (duplicate):** `src/hooks/use-provider-mode.ts` line 6, `src/components/provider-mode-toggle.tsx` line 6

Both must be updated to include the new values. The client-side duplication is intentional (avoids importing server modules in client components, per Phase 33 decision).

```typescript
// Expanded from 3 to 4 values
type ProviderMode =
  | 'openrouter-testing'
  | 'openrouter-production'
  | 'claude-code-testing'
  | 'claude-code-production';
```

**Impact cascade:** Every file that references the old `'claude-code'` string literal must update to handle the two new values. Key locations:
- `workflow-schemas.ts` (Zod enum in 2 places: `workflowStateSchema` line 51, `rawProblemInputSchema` line 83)
- `agent-factory.ts` (model resolution switch, line 58 -- must branch on CC testing vs CC production)
- `openrouter.ts` (`activeModelId` function)
- `src/app/api/solve/route.ts` (auth gate check, line 18 and 26)
- `02-shared.ts` (`attachMcpProvider` check)
- `agent-utils.ts` (`isClaudeCodeGen` check)
- `request-context-helpers.ts` (various `provider-mode` checks)

**Helper function recommended:**
```typescript
function isClaudeCodeMode(mode: ProviderMode): boolean {
  return mode === 'claude-code-testing' || mode === 'claude-code-production';
}
function isOpenRouterMode(mode: ProviderMode): boolean {
  return mode === 'openrouter-testing' || mode === 'openrouter-production';
}
```

### Agent Factory Model Resolution (CC Testing vs CC Production)

Current `agent-factory.ts` has a single `claudeCodeModel` config per agent (defaults to `'sonnet'`). The new 4-mode split requires tier-based resolution:

| Agent Role | CC Testing | CC Production |
|------------|-----------|---------------|
| Extraction agents | haiku | sonnet |
| Reasoning agents | sonnet | opus |

This requires a new config field or a lookup table in the factory. Each agent's `WorkflowAgentConfig` already has `claudeCodeModel` (single value); this needs to become a pair or the factory needs testing/production model mapping.

**Recommended approach:** Add `claudeCodeTestingModel` and rename `claudeCodeModel` to `claudeCodeProductionModel`, with backward compatibility default.

### CreditsBadge Conditional Rendering

Current `CreditsBadge` is a single interactive button that:
1. Polls `/api/credits` every 20s
2. Shows key icon + key tail + dollar balance
3. Fires `onClick` to open API key dialog

For CC modes, it must:
1. Poll `/api/claude-auth` every 20s instead
2. Show auth status icon + "Claude Code" text + token count
3. Be non-interactive (no `onClick`)

**Pattern:** Accept `providerMode` as prop (from `useProviderMode()`), branch internally:

```typescript
function CreditsBadge({ providerMode, ...props }) {
  if (isClaudeCodeMode(providerMode)) {
    return <ClaudeCodeBadge />;
  }
  return <OpenRouterBadge {...props} />;
}
```

### Auth Check Endpoint

**CLI approach (recommended):** Use `child_process.execFile` to run `claude auth status --json`:

```typescript
// /api/claude-auth/route.ts
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    const { stdout } = await execFileAsync('claude', ['auth', 'status', '--json'], {
      timeout: 5000,
    });
    const status = JSON.parse(stdout);
    return Response.json({
      authenticated: status.loggedIn === true,
      email: status.email,
      subscriptionType: status.subscriptionType,
    });
  } catch (error) {
    // CLI not found or not authenticated
    return Response.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

**Verified output format** (from running `claude auth status --json` on this machine):
```json
{
  "loggedIn": true,
  "authMethod": "claude.ai",
  "apiProvider": "firstParty",
  "email": "...",
  "orgId": "...",
  "orgName": "...",
  "subscriptionType": "max"
}
```

This is fast (<100ms), makes no LLM calls, and provides subscription type information.

### Cost Extraction Extension

Current `extractCostFromResult` only reads OpenRouter cost metadata:
```typescript
result.providerMetadata?.openrouter?.usage?.cost
```

Claude Code provides cost at:
```typescript
result.providerMetadata?.['claude-code']?.costUsd
```

And token usage via standard AI SDK `usage` field:
```typescript
result.usage?.inputTokens   // total (includes cache)
result.usage?.outputTokens  // total
```

**Recommended fix:** Extend `extractCostFromResult` to check both providers:

```typescript
export function extractCostFromResult(result: AgentResultCostInfo): number {
  let callCost = 0;
  // OpenRouter path (unchanged)
  if (result.steps?.length) {
    for (const step of result.steps) {
      const stepCost = step?.providerMetadata?.openrouter?.usage?.cost;
      if (typeof stepCost === 'number') callCost += stepCost;
    }
  }
  if (callCost === 0) {
    const topCost = result.providerMetadata?.openrouter?.usage?.cost;
    if (typeof topCost === 'number') callCost = topCost;
  }
  // Claude Code path
  if (callCost === 0) {
    const ccCost = result.providerMetadata?.['claude-code']?.costUsd;
    if (typeof ccCost === 'number') callCost = ccCost;
  }
  return callCost;
}
```

### Frontend Token/Cost Display

Token data flows through the existing cost tracking infrastructure:
1. `extractCostFromResult` extracts cost from each agent response
2. `updateCumulativeCost` accumulates in RequestContext and emits `data-cost-update` events
3. Frontend receives events and updates display

For token tracking, a separate accumulator is needed. Options:
- Extend `data-cost-update` event to include `cumulativeTokens`
- Add a new `data-token-update` event type
- Track tokens client-side by summing `usage` from agent-end events

**Recommended:** Extend `data-cost-update` to include optional `cumulativeTokens` and `isSubscription` fields. This avoids adding a new event type and keeps cost/token data co-located.

### Solve Flow Guard (CC Mode)

Current flow in `page.tsx`:
1. User clicks Solve
2. `guardedHandleSolve` checks `requiresKeyEntry` (no API key and no server key)
3. If true, opens API key dialog and queues solve
4. If false, proceeds to `handleSolve`

New CC mode flow:
1. User clicks Solve
2. `guardedHandleSolve` checks provider mode
3. If CC mode: fetch `/api/claude-auth`, block with error toast if unauthenticated
4. If OpenRouter mode: existing key check behavior

### Test Result Rendering Bug Fix

**Root cause identified:** Field name mismatch between tool result schema and UI rendering.

| Tool | Result field | Value on pass | UI checks | Result |
|------|-------------|---------------|-----------|--------|
| testRule | `result.status` | `'RULE_OK'` | `result.status === 'RULE_OK'` | Correct |
| testSentence | `result.overallStatus` | `'SENTENCE_OK'` | `result.status === 'SENTENCE_OK'` or `'PASS'` | Bug -- `status` is undefined |

**Fix locations:**
- `src/components/trace/specialized-tools.tsx` line 140-141: Change `SentenceTestToolCard` to read `result.overallStatus` instead of `result.status`
- `src/components/trace/specialized-tools.tsx` line 196 (BulkToolCallGroup): Same fix for bulk aggregation

The `passed` check should be:
```typescript
// For sentence tests
const status = result.overallStatus as string | undefined;
const passed = status === 'SENTENCE_OK';

// For rule tests (already correct)
const status = result.status as string | undefined;
const passed = status === 'RULE_OK';
```

### CC Instance Visualisation

The trace panel already has `AgentStartEvent` and `AgentEndEvent` types. For CC mode, these events already fire (the workflow emits them in each step file). The model field already shows `claude-code/sonnet` etc. via `activeModelId()`.

What the user wants is visual differentiation when CC instances are running. This could be:
1. A different badge color or icon for CC agent events
2. A sidebar indicator showing active CC instances
3. An enhanced agent start event card with CC-specific metadata (session ID, model tier)

**Recommended approach:** Extend the existing `AgentStartEvent` rendering in `TraceEventCard` to show a CC-specific badge when the model string starts with `claude-code/`. Minimal change, leverages existing infrastructure.

### CC Agent Parallelisation

**Finding:** Parallelisation already works. The `runHypothesize` function in `02b-hypothesize.ts` uses `Promise.all` on all perspectives. Each perspective gets its own `RequestContext` with its own `attachMcpProvider` call, creating an independent `ClaudeCodeProvider` + MCP server per perspective.

The todo item "Add parallelisation of Claude Code agent instances" may refer to a perceived serial behavior that could be caused by:
1. Testing with `perspectiveCount=1` (default serializes to one perspective)
2. Rate limiting on the Claude Code SDK side
3. The `02c-verify.ts` step running verifiers sequentially (each perspective is verified sequentially, not in parallel)

**Verification step serialisation** in `02c-verify.ts`: The verify sub-phase runs perspectives in a `for` loop (sequential), not `Promise.all`. This is the same for both providers. Making verification parallel would require similar refactoring to what hypothesization already has.

**Recommendation:** Investigate whether the verify step should be parallelised similarly to hypothesize. This is a separate concern from the frontend integration scope.

### Anti-Patterns to Avoid
- **Importing server modules in client components:** The `ProviderMode` type must remain duplicated in client code (Phase 33 decision). Do not import from `openrouter.ts` in client components.
- **Blocking UI on auth check:** Auth checks should be background operations. Never block the toggle switch waiting for auth status.
- **Storing CC auth state in localStorage:** Auth state is ephemeral and server-side. Always fetch fresh from the API endpoint.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth status polling | Custom WebSocket or SSE | `useEffect` + `setInterval` at 20s (matching existing credits poll) | Already-proven pattern in CreditsBadge |
| Toast notifications | Custom notification system | Sonner `toast()` | Already in use throughout the app |
| Toggle component | Custom radio group | Radix ToggleGroup via shadcn/ui | Already in ProviderModeToggle |
| CLI execution | Manual spawn/exec | `child_process.execFile` with promisify | Standard Node.js pattern, safe with fixed args |
| Token formatting | Custom number formatter | Simple helper: `formatTokenCount(n)` -> "12.4k" | Straightforward arithmetic |

## Common Pitfalls

### Pitfall 1: ProviderMode String Literal Scatter
**What goes wrong:** Changing the ProviderMode type in one place but missing string literal checks elsewhere leads to runtime bugs where `'claude-code'` comparisons silently fail.
**Why it happens:** The old `'claude-code'` value is replaced by two values, but `=== 'claude-code'` checks throughout the codebase will stop matching.
**How to avoid:** Create `isClaudeCodeMode()` helper function, then find-and-replace all `=== 'claude-code'` and `!== 'claude-code'` references to use the helper. Do a global search for `'claude-code'` string literal across the entire codebase.
**Warning signs:** Claude Code mode stops working entirely; auth gate never triggers; model resolution falls through to OpenRouter.

### Pitfall 2: Zod Enum Must Match Type
**What goes wrong:** TypeScript type and Zod enum drift. The `providerMode` Zod enum in `workflow-schemas.ts` must exactly match the TypeScript `ProviderMode` type.
**Why it happens:** Two separate definitions that must stay in sync.
**How to avoid:** Update both simultaneously. The Zod enum is in `workflowStateSchema.providerMode` and `rawProblemInputSchema.providerMode`.
**Warning signs:** Runtime Zod validation errors when sending `claude-code-testing` or `claude-code-production` from the frontend.

### Pitfall 3: CreditsBadge onClick Still Active in CC Mode
**What goes wrong:** Clicking the badge in CC mode opens the OpenRouter API key dialog.
**Why it happens:** The `onClick` prop is passed from `layout-shell.tsx` regardless of mode.
**How to avoid:** Make `CreditsBadge` check provider mode and suppress `onClick` for CC modes. Or conditionally pass `onClick` from the parent.
**Warning signs:** API key dialog appearing when in Claude Code mode.

### Pitfall 4: Migration Break for Existing localStorage
**What goes wrong:** Users with `'claude-code'` stored in localStorage get an invalid provider mode.
**Why it happens:** The old value is no longer in the `VALID_MODES` array after expansion.
**How to avoid:** Add migration logic in `getSnapshot()` that maps `'claude-code'` to `'claude-code-testing'` (safe default). Similar to the existing `OLD_STORAGE_KEY` migration.
**Warning signs:** Users who previously selected Claude Code get reset to `openrouter-testing`.

### Pitfall 5: Auth Endpoint CLI Not in PATH
**What goes wrong:** `claude auth status --json` fails on the server because the CLI is not in the server's PATH.
**Why it happens:** Next.js dev server may have a different PATH than the user's shell.
**How to avoid:** Use `which claude` fallback, or check common installation paths. The CLI is at `/home/cervo/.nvm/versions/node/v22.21.1/bin/claude` on this machine.
**Warning signs:** Auth endpoint always returns unauthenticated; error includes ENOENT.

## Code Examples

### Expanding ProviderMode Type (Client)
```typescript
// src/hooks/use-provider-mode.ts
type ProviderMode =
  | 'openrouter-testing'
  | 'openrouter-production'
  | 'claude-code-testing'
  | 'claude-code-production';

const VALID_MODES: readonly ProviderMode[] = [
  'openrouter-testing',
  'openrouter-production',
  'claude-code-testing',
  'claude-code-production',
];

// Migration: map old 'claude-code' to 'claude-code-testing'
function getSnapshot(): ProviderMode {
  // ... existing migration logic ...
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'claude-code') {
    localStorage.setItem(STORAGE_KEY, 'claude-code-testing');
    return 'claude-code-testing';
  }
  // ...
}
```

### CreditsBadge Provider-Aware Rendering
```typescript
// Conditional content based on provider mode
function CreditsBadge({ onClick, onServerKeyStatus, providerMode }: CreditsBadgeProps) {
  const isCC = providerMode?.startsWith('claude-code');

  if (isCC) {
    return <ClaudeCodeBadgeContent />;
  }
  return <OpenRouterBadgeContent onClick={onClick} onServerKeyStatus={onServerKeyStatus} />;
}
```

### Auth Check Hook
```typescript
// src/hooks/use-claude-auth.ts
export function useClaudeAuth(enabled: boolean) {
  const [status, setStatus] = useState<{
    authenticated: boolean;
    loading: boolean;
    email?: string;
  }>({ authenticated: false, loading: true });

  useEffect(() => {
    if (!enabled) return;
    async function check() {
      try {
        const res = await fetch('/api/claude-auth');
        const data = await res.json();
        setStatus({ authenticated: data.authenticated, loading: false, email: data.email });
      } catch {
        setStatus({ authenticated: false, loading: false });
      }
    }
    check();
    const interval = setInterval(check, 20_000);
    return () => clearInterval(interval);
  }, [enabled]);

  return status;
}
```

### Sentence Test Fix
```typescript
// src/components/trace/specialized-tools.tsx - SentenceTestToolCard
// Before (bug):
const status = result.status as string | undefined;
const passed = status === 'SENTENCE_OK' || status === 'PASS';

// After (fix):
const overallStatus = result.overallStatus as string | undefined;
const passed = overallStatus === 'SENTENCE_OK';
```

### Token Count Formatting
```typescript
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Binary model mode (testing/production) | 3-value ProviderMode | Phase 33 | This phase expands to 4 values |
| `generateText` probe for auth | CLI `auth status` command | Phase 35 | Much faster (<100ms vs ~3s), no LLM call |
| OpenRouter-only cost tracking | Provider-agnostic cost extraction | Phase 35 | `extractCostFromResult` reads from either provider |

**Token usage availability (verified):** `ai-sdk-provider-claude-code@3.4.4` provides:
- `usage.inputTokens.total` / `usage.outputTokens.total` (standard AI SDK)
- `providerMetadata['claude-code'].costUsd` (actual USD cost from CLI)
- `providerMetadata['claude-code'].durationMs` (request duration)

This means the "Subscription" fallback is unlikely to be needed -- real token and cost data IS available.

## Open Questions

1. **CC Agent Parallelisation scope**
   - What we know: Hypothesizer perspectives already run in parallel via `Promise.all`. Each gets its own MCP server.
   - What's unclear: Whether the user observed serial behavior due to testing conditions or an actual concurrency issue. The verify step does run sequentially but this is the same for both providers.
   - Recommendation: Investigate in implementation -- check if the `perspectiveCount` was 1 during testing, and whether verify-phase parallelisation is desired.

2. **CC instance visualisation design**
   - What we know: Agent start/end events already fire with model info. The trace panel already renders these.
   - What's unclear: What additional CC-specific information should be shown. Options include session IDs, subprocess PIDs, active instance count.
   - Recommendation: Start simple -- add a CC badge/indicator to existing agent event cards when model is `claude-code/*`. Extend later if needed.

3. **Anthropic pricing table maintenance**
   - What we know: `providerMetadata['claude-code'].costUsd` provides actual cost per request. No need to maintain a pricing table if we use the provider's reported cost.
   - What's unclear: Whether the user wants estimated cost (from a pricing table) or actual cost (from the provider). The provider-reported cost is more accurate.
   - Recommendation: Use provider-reported `costUsd` for actual cost display. Only fall back to token-based estimation if `costUsd` is unavailable.

## Sources

### Primary (HIGH confidence)
- `ai-sdk-provider-claude-code@3.4.4` source code (`node_modules/ai-sdk-provider-claude-code/dist/index.js`) -- verified token usage in `convertClaudeCodeUsage()` and cost in `providerMetadata['claude-code'].costUsd`
- `claude auth status --json` CLI output -- verified on local machine, returns `loggedIn`, `email`, `subscriptionType`
- Source files: `credits-badge.tsx`, `provider-mode-toggle.tsx`, `use-provider-mode.ts`, `layout-shell.tsx`, `agent-factory.ts`, `workflow-schemas.ts`, `openrouter.ts`, `specialized-tools.tsx`

### Secondary (MEDIUM confidence)
- `03a-sentence-tester-tool.ts` schema analysis -- `overallStatus` field confirmed as the correct field name (not `status`)
- `02b-hypothesize.ts` parallelisation pattern -- `Promise.all` already used for concurrent perspectives

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- extending well-understood existing patterns with full source access
- Pitfalls: HIGH -- all identified through direct source code analysis
- Test result bug: HIGH -- field name mismatch confirmed by comparing schema to UI code
- Token/cost availability: HIGH -- verified in installed provider source code

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- local codebase patterns, installed package versions)
