---
phase: 18-key-routing
verified: 2026-03-06T14:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Solve with user-provided key end-to-end"
    expected: "Solve completes successfully using the user's key (not server env key)"
    why_human: "Cannot verify which provider credential was used during an actual solve without executing the workflow"
  - test: "Auto-open dialog when no key from either source"
    expected: "Clicking Solve with no user key and no server env key opens ApiKeyDialog"
    why_human: "Requires running the app without OPENROUTER_API_KEY set to observe browser UX"
  - test: "Auto-solve after key entry from auto-opened dialog"
    expected: "Entering a key in the auto-opened dialog triggers the pending solve automatically"
    why_human: "Requires interaction flow in a running browser session"
---

# Phase 18: Key Routing Verification Report

**Phase Goal:** The stored API key flows through every solve request and the backend handles presence or absence of a key cleanly
**Verified:** 2026-03-06T14:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                     | Status     | Evidence                                                                                  |
|----|-----------------------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------|
| 1  | When a user API key is sent in inputData, the backend creates a fresh OpenRouter provider using that key  | VERIFIED   | 01-extract.ts:49-51, 02-hypothesize.ts:84-86, 03-answer.ts:57-59 all call createOpenRouterProvider(state.apiKey) |
| 2  | When no user API key is sent, the backend uses the environment variable provider without error             | VERIFIED   | getOpenRouterProvider() falls back to singleton; singleton guards undefined via conditional in openrouter.ts:27-29 |
| 3  | When no key exists from either source, the workflow fails with a clear error message                      | VERIFIED   | solve/route.ts:16-21 returns 401 JSON `{ error: 'No API key provided' }` before workflow starts |
| 4  | The /api/credits endpoint returns a hasServerKey boolean                                                  | VERIFIED   | credits/route.ts:4 sets `hasServerKey = !!process.env.OPENROUTER_API_KEY`; included in all 3 response branches |
| 5  | Frontend sends stored API key in inputData.apiKey                                                         | VERIFIED   | use-solver-workflow.ts:33 `...(apiKey && { apiKey })` in prepareSendMessagesRequest body   |
| 6  | CreditsBadge fetches user-specific balance when user key is set                                           | VERIFIED   | credits-badge.tsx:22-25 builds URL with `?key=${encodeURIComponent(apiKey)}` when apiKey present |
| 7  | CreditsBadge reflects hasServerKey to NavBar for no-key determination                                     | VERIFIED   | credits-badge.tsx:35-37 calls `onServerKeyStatus?.(serverKey)`; layout-shell.tsx:110-111 wires callback |
| 8  | Clicking Solve with no key auto-opens ApiKeyDialog                                                        | VERIFIED   | page.tsx:102-111 guardedHandleSolve checks requiresKeyEntry; context wired in layout-shell.tsx:33-36 |
| 9  | After saving key from auto-opened dialog, solve auto-starts                                               | VERIFIED   | page.tsx:115-121 useEffect watches apiKey; when it changes from null to non-null with pending solve, triggers handleSolve |
| 10 | API key errors show key-specific toast function (exists for future use)                                   | VERIFIED   | workflow-toast.tsx:94-107 exports showApiKeyErrorToast                                     |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact                                                         | Expected                                                          | Status     | Details                                                                                   |
|------------------------------------------------------------------|-------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------|
| `src/mastra/openrouter.ts`                                       | createOpenRouterProvider factory + singleton                      | VERIFIED   | Exports openrouter, createOpenRouterProvider, ModelMode, TESTING_MODEL, activeModelId     |
| `src/mastra/workflow/request-context-types.ts`                   | 'openrouter-provider' optional key in WorkflowRequestContext      | VERIFIED   | Line 78: `'openrouter-provider'?: OpenRouterProvider;`                                   |
| `src/mastra/workflow/request-context-helpers.ts`                 | getOpenRouterProvider helper with singleton fallback              | VERIFIED   | Lines 37-41: returns provider from context or falls back to openrouter singleton          |
| `src/mastra/workflow/workflow-schemas.ts`                        | apiKey in rawProblemInputSchema and workflowStateSchema           | VERIFIED   | Line 88: `apiKey: z.string().optional()` in rawProblemInputSchema; line 58 in stateSchema |
| `src/mastra/workflow/steps/01-extract.ts`                        | Creates provider from inputData.apiKey, propagates to state       | VERIFIED   | Lines 35, 49-51: sets apiKey in state and creates provider in requestContext              |
| `src/mastra/workflow/steps/02-hypothesize.ts`                    | Creates provider from state.apiKey, propagates to sub-contexts    | VERIFIED   | Lines 84-86 (main), 377-378 (perspective), 514-515 (verify), 902-903 (convergence)       |
| `src/mastra/workflow/steps/03-answer.ts`                         | Creates provider from state.apiKey                                | VERIFIED   | Lines 57-59: `if (state.apiKey) requestContext.set('openrouter-provider', ...)`           |
| `src/app/api/solve/route.ts`                                     | No-key guard (401) + passes inputData with apiKey to workflow     | VERIFIED   | Lines 14-21: extracts apiKey, returns 401 when neither source has a key                  |
| `src/app/api/credits/route.ts`                                   | hasServerKey in all responses + optional user key query param     | VERIFIED   | Lines 4, 7-8, 11, 20, 26, 28: hasServerKey in every branch; userKey from ?key= param     |
| `src/hooks/use-solver-workflow.ts`                               | apiKey in inputData, chatId for transport refresh                 | VERIFIED   | Lines 17, 33, 43-47: useApiKey, apiKey in body, chatId derived from apiKey               |
| `src/components/credits-badge.tsx`                               | User key balance fetching, hasServerKey callback                  | VERIFIED   | Lines 22-47: fetch with ?key= param, onServerKeyStatus callback                          |
| `src/components/api-key-dialog.tsx`                              | onSave callback prop                                              | VERIFIED   | Lines 18, 50: onSave?: () => void in props, called after save                            |
| `src/components/workflow-toast.tsx`                              | showApiKeyErrorToast function                                     | VERIFIED   | Lines 94-107: exported function with id 'api-key-error'                                  |
| `src/contexts/workflow-control-context.tsx`                      | requiresKeyEntry, openKeyDialog, useRegisterKeyControl            | VERIFIED   | Lines 19-21, 42-45, 55-57, 128-145: all three present and wired                         |
| `src/components/layout-shell.tsx`                                | hasServerKey tracking, requiresKeyEntry computed, key control reg | VERIFIED   | Lines 30-36: tracks hasServerKey, computes requiresKeyEntry, calls useRegisterKeyControl  |
| `src/app/page.tsx`                                               | guardedHandleSolve with pendingSolveRef, apiKey change watcher    | VERIFIED   | Lines 98-121: requiresKeyEntry guard, pendingSolveRef, useEffect watching apiKey          |
| `src/components/icons/key-icon.tsx`                              | KeyIcon and KeyAlertIcon SVG components                           | VERIFIED   | Listed in 18-02-SUMMARY key-files.created; imported in credits-badge.tsx:5               |

### Key Link Verification

| From                                  | To                                                | Via                                    | Status  | Details                                                                               |
|---------------------------------------|---------------------------------------------------|----------------------------------------|---------|---------------------------------------------------------------------------------------|
| `src/app/api/solve/route.ts`          | `src/mastra/openrouter.ts`                        | createOpenRouterProvider(apiKey)       | WIRED   | Import exists (via 01-extract.ts, 02-hypothesize.ts, 03-answer.ts); solve route passes inputData with apiKey through |
| `src/mastra/workflow/steps/*.ts`      | `src/mastra/workflow/request-context-helpers.ts`  | getOpenRouterProvider in model fn      | WIRED   | All 13 agent files import and call getOpenRouterProvider(requestContext)(...)         |
| `src/mastra/workflow/*-agent.ts`      | `src/mastra/workflow/request-context-helpers.ts`  | getOpenRouterProvider in model fn      | WIRED   | Confirmed via grep: 13 agent files all use getOpenRouterProvider pattern              |
| `src/hooks/use-solver-workflow.ts`    | `/api/solve`                                      | inputData.apiKey in body               | WIRED   | Line 33: `...(apiKey && { apiKey })` in prepareSendMessagesRequest                   |
| `src/components/credits-badge.tsx`    | `/api/credits`                                    | ?key= query param when user key set    | WIRED   | Lines 22-25: `?key=${encodeURIComponent(apiKey)}` when apiKey present                |
| `src/components/layout-shell.tsx`     | `src/components/api-key-dialog.tsx`               | openKeyDialog -> setApiKeyDialogOpen   | WIRED   | Lines 34, 195: openKeyDialog sets state, ApiKeyDialog renders with that state        |
| `src/app/page.tsx`                    | auto-solve on key save                            | useEffect watching apiKey change       | WIRED   | Lines 115-121: watches apiKey, triggers handleSolve when pending text exists         |

**Note on onSave:** `ApiKeyDialog.onSave` prop is defined and functional, but `layout-shell.tsx` does not pass it to `ApiKeyDialog` (line 195: `<ApiKeyDialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen} />`). The auto-solve mechanism instead relies on page.tsx watching the `apiKey` state change directly via `useApiKey()`. This is a redundant mechanism that works correctly — the `onSave` callback path exists but is unused. The auto-solve behavior is achieved via the apiKey useEffect instead.

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                          | Status    | Evidence                                                                             |
|-------------|-------------|------------------------------------------------------------------------------------------------------|-----------|--------------------------------------------------------------------------------------|
| FLOW-01     | 18-02       | Frontend sends stored API key with solve requests via inputData                                      | SATISFIED | use-solver-workflow.ts:33 includes apiKey in inputData body                          |
| FLOW-02     | 18-01       | Backend creates per-request OpenRouter provider when user key is provided                            | SATISFIED | Steps 01/02/03 each call createOpenRouterProvider(state.apiKey) when apiKey present  |
| FLOW-03     | 18-01       | Backend falls back to environment variable key when no user key is sent                              | SATISFIED | getOpenRouterProvider returns singleton (env key) when openrouter-provider not in ctx |
| FLOW-04     | 18-01, 18-02 | Backend exposes whether server-side key is configured so frontend knows if user key is required      | SATISFIED | credits/route.ts returns hasServerKey in all paths; CreditsBadge propagates to NavBar |
| FLOW-05     | 18-01, 18-02 | Solve request fails gracefully with clear error when no key is available from either source          | SATISFIED | solve/route.ts:16-21 returns 401 JSON; page.tsx guardedHandleSolve prevents request if requiresKeyEntry |

All 5 FLOW requirements satisfied. No orphaned requirements found in REQUIREMENTS.md for Phase 18.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/solve/route.ts` | 29 | apiKey included in inputData passed to workflow (not stripped) | Info | The apiKey flows into the workflow as documented and used. No security issue since Mastra state is ephemeral per CLAUDE.md. |

No blocker or warning anti-patterns found. No TODO/FIXME/placeholder comments found in any phase-18 modified files. No stub implementations detected.

### TypeScript Check

Running `npx tsc --noEmit` shows 3 errors in `src/components/skeleton.tsx` and 1 in `src/app/layout.tsx` (streamdown CSS), all unrelated to phase 18 changes. Phase 18 modifications pass type checking.

### Human Verification Required

#### 1. Solve with User-Provided Key

**Test:** Start dev server with `OPENROUTER_API_KEY` set. Enter a user API key in the dialog. Paste a problem and click Solve.
**Expected:** Solve completes using the user's key balance (CreditsBadge should reflect the user key's balance)
**Why human:** Cannot verify which credential OpenRouter used without inspecting live API traffic

#### 2. No-Key Auto-Open Dialog

**Test:** Start dev server without `OPENROUTER_API_KEY`. Paste a problem and click Solve.
**Expected:** ApiKeyDialog opens automatically without starting the solve
**Why human:** Requires running the app in a browser with the env var absent

#### 3. Auto-Solve After Key Entry

**Test:** With no key configured, click Solve (dialog should open). Enter a valid key and save.
**Expected:** Solve starts automatically using the just-entered key
**Why human:** Requires live browser session; cannot verify the `useEffect` timing chain programmatically

### Gaps Summary

No gaps. All 10 truths verified, all 5 FLOW requirements satisfied, all artifacts substantive and wired, all 13 agents updated, all key links confirmed. Three items require human verification for end-to-end behavioural confirmation.

The one notable observation (not a gap): `ApiKeyDialog.onSave` is defined but unused by `layout-shell.tsx`. The auto-solve mechanism works correctly via a different path (apiKey useEffect in page.tsx), so no behavioral gap exists — it is architectural redundancy only.

---

_Verified: 2026-03-06T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
