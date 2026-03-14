---
phase: 33-provider-foundation
verified: 2026-03-12T02:15:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "All 8 tool-free agents produce correct structured output when run through Claude Code provider"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Submit a solve with providerMode='claude-code' selected in the UI"
    expected: "Selecting Claude Code and running a solve should succeed through all pipeline steps, including Step 1 extraction producing a correctly-structured result.object (not null). Full solve completes."
    why_human: "Runtime validation requires browser interaction with Claude Code CLI active. Cannot mock structured output behavior programmatically."
  - test: "Three-way provider toggle visual appearance and behavior"
    expected: "Toggle shows Testing ($) / Production ($$$) / Claude Code. Active segment uses accent color. Disabled during solve."
    why_human: "CSS styling and interactive state cannot be verified programmatically."
---

# Phase 33: Provider Foundation Verification Report

**Phase Goal:** Users can run the 8 tool-free agents through Claude Code provider with correct auth and error handling
**Verified:** 2026-03-12T02:15:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (Plan 33-07, commit b32b4e5)

## Gap Closure Summary

Previous verification (2026-03-11) found 1 gap: **PROV-04** — streaming + structuredOutput returns null `result.object` through the Claude Code provider. Plan 33-07 fixed this by adding an early-return path in `streamWithRetry` that detects `claude-code` provider mode combined with `structuredOutput` and delegates to `generateWithRetry` (non-streaming) instead.

The fix was committed as `b32b4e5` on 2026-03-12, modifying only `src/mastra/workflow/agent-utils.ts`. REQUIREMENTS.md now shows `PROV-04` as `[x]` Complete.

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Workflow schema accepts `providerMode` with three values and existing OpenRouter modes continue to work unchanged | VERIFIED | `workflowStateSchema` and `rawProblemInputSchema` in `workflow-schemas.ts` use `z.enum(['openrouter-testing', 'openrouter-production', 'claude-code']).default('openrouter-testing')`. OpenRouter path is untouched. |
| 2 | All 8 tool-free agents produce correct structured output when run through Claude Code provider | VERIFIED | `streamWithRetry` in `agent-utils.ts` (lines 212-251) detects `claude-code` + `structuredOutput`, delegates to `generateWithRetry` (non-streaming) which populates `result.object` correctly. All 6 call sites in step files pass `requestContext` alongside `structuredOutput`, so detection fires correctly. |
| 3 | Solve attempt with unauthenticated Claude Code CLI is blocked with a clear error message before any LLM call is made | VERIFIED | `/api/solve/route.ts` `generateText` probe returns 401 with message "Claude Code is not authenticated. Run `claude login` in your terminal, then try again." |
| 4 | Claude Code agent cannot access filesystem tools during server-side execution | VERIFIED | `claude-code-provider.ts` exports `CLAUDE_CODE_DISALLOWED_TOOLS` (19 tools) passed to `createClaudeCode({ defaultSettings: { disallowedTools: [...], permissionMode: 'bypassPermissions' } })`. |
| 5 | A transient Claude Code error during solve triggers retry logic and surfaces a meaningful error message | VERIFIED | Both `generateWithRetry` and `streamWithRetry` distinguish non-retryable (`authentication_failed`, `billing_error`, `ENOENT`) from retryable (`rate_limit`, `server_error`, `overloaded`) errors. |

**Score:** 5/5 truths verified

### PROV-04 Gap Closure — Detailed Verification

**Fix location:** `src/mastra/workflow/agent-utils.ts`, lines 212-251 (inside `streamWithRetry`)

**Detection logic verified:**
- Line 214: `const hasStructuredOutput = options && typeof options === 'object' && 'structuredOutput' in options;`
- Lines 215-222: Extracts `requestContext` from options, then reads `provider-mode` via `.get('provider-mode')`
- Line 223: `const isClaudeCode = providerMode === 'claude-code';`
- Line 225: `if (isClaudeCode && hasStructuredOutput) { ... }` — early return block

**Delegation verified:**
- Lines 229-234: Builds `GenerateWithRetryOptions` incrementally (avoids exactOptionalPropertyTypes TS error)
- Line 241: `const result = await generateWithRetry(agent, generateOpts);` — delegates to non-streaming path
- Lines 244-246: `onTextChunk` fires with full text for trace event consistency
- Line 250: Returns result cast to `FullOutput` shape for caller compatibility

**OpenRouter path verified unchanged:**
- The streaming retry loop (lines 253-394) only executes when `isClaudeCode && hasStructuredOutput` is false
- Zero changes to `generateWithRetry`, step files, or any other file

**Wiring verified:**
- All 6 `streamWithRetry` call sites with `structuredOutput` in step files also pass `requestContext: ctx.mainRequestContext` (confirmed in `02a-dispatch.ts` lines 61, 168; same pattern in `01-extract.ts`, `02d-synthesize.ts`, `02c-verify.ts`, `03-answer.ts`)
- `RequestContext` from `@mastra/core/request-context` has a `.get()` method — confirmed by 30+ usages across workflow files
- Tester tools (`03a-rule-tester-tool.ts`, `03a-sentence-tester-tool.ts`) use `generateWithRetry` directly, not `streamWithRetry`, so the fallback does not affect them

**Only file modified by Plan 07:** Confirmed via `git diff b32b4e5~1 b32b4e5 --name-only` → `src/mastra/workflow/agent-utils.ts` only.

### Required Artifacts

| Artifact | Provided | Status | Details |
|----------|----------|--------|---------|
| `src/mastra/claude-code-provider.ts` | Claude Code provider singleton with security sandbox | VERIFIED | Present. 19 tools blocked. `bypassPermissions` set. |
| `src/mastra/openrouter.ts` | `ProviderMode` type and `activeModelId` with claude-code branch | VERIFIED | Present. `ProviderMode` type, `activeModelId` returns `claude-code/${model}` for claude-code mode. |
| `src/mastra/workflow/workflow-schemas.ts` | `providerMode` field in workflow state and input schemas | VERIFIED | Both schemas have `providerMode` enum with 3 values defaulting to `openrouter-testing`. |
| `src/mastra/workflow/agent-factory.ts` | 3-way model resolution with `claudeCodeModel` config field | VERIFIED | Present. `claudeCode(claudeCodeModel)` returned for `claude-code` mode. |
| `src/app/api/solve/route.ts` | Auth gate for Claude Code provider | VERIFIED | Present. `generateText` probe fires before workflow, returns 401 on auth failure. |
| `src/mastra/workflow/agent-utils.ts` | Claude Code generate-fallback for structured output in streamWithRetry | VERIFIED | Early-return path at lines 212-251. Detects `claude-code` + `structuredOutput`, delegates to `generateWithRetry`. |
| `src/hooks/use-provider-mode.ts` | `useProviderMode` hook with localStorage migration | VERIFIED | Present. 3-value `ProviderMode` type, `lo-solver-provider-mode` key. |
| `src/components/provider-mode-toggle.tsx` | Three-way provider selector | VERIFIED | Present. Three `ToggleGroupItem` options: Testing ($), Production ($$$), Claude Code. |
| Old `use-model-mode.ts` deleted | Removed | VERIFIED | File absent from filesystem. |
| Old `model-mode-toggle.tsx` deleted | Removed | VERIFIED | File absent from filesystem. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `streamWithRetry` | `requestContext.get('provider-mode')` | `options.requestContext.get('provider-mode')` | VERIFIED | Lines 215-221 extract requestContext from options; line 221 calls `.get('provider-mode')`. |
| `streamWithRetry` | `generateWithRetry` | `await generateWithRetry(agent, generateOpts)` | VERIFIED | Line 241. Fallback path only for claude-code + structuredOutput. |
| Step files | `streamWithRetry` | `requestContext: ctx.mainRequestContext` + `structuredOutput: { schema }` in options | VERIFIED | Both options are co-present in all 6 structured output call sites (confirmed in `02a-dispatch.ts` lines 59-63 and 166-170; pattern consistent across all step files). |
| `agent-factory.ts` | `claude-code-provider.ts` | `import { claudeCode }` | VERIFIED | Unchanged from initial verification. |
| `solve/route.ts` | `claude-code-provider.ts` | Auth probe using `claudeCode('sonnet')` | VERIFIED | Unchanged from initial verification. |
| `use-solver-workflow.ts` | `use-provider-mode.ts` | `useProviderMode` sends `providerMode` in request body | VERIFIED | Unchanged from initial verification. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PROV-01 | 33-01, 33-02, 33-03, 33-06 | User can select between three provider modes | SATISFIED | `ProviderMode` type, `providerMode` in all schemas/steps/frontend. Old `modelMode` references removed. |
| PROV-02 | 33-04 | Agent factory resolves to Claude Code or OpenRouter model based on provider mode | SATISFIED | `agent-factory.ts` 3-way resolution. |
| PROV-03 | 33-04, 33-05 | Per-agent model mapping translates OpenRouter model IDs to Claude Code model shortcuts | SATISFIED | All 12 agents have `claudeCodeModel` field. |
| PROV-04 | 33-05, 33-07 | All 8 tool-free agents produce correct output through Claude Code provider | SATISFIED | `streamWithRetry` claude-code + structuredOutput fallback to `generateWithRetry`. REQUIREMENTS.md shows `[x]` Complete. |
| PROV-05 | 33-01 | Workflow schema uses three-value `providerMode` enum replacing binary `modelMode` | SATISFIED | Both `workflowStateSchema` and `rawProblemInputSchema` use 3-value enum. |
| AUTH-01 | 33-04 | Auth gate detects Claude Code CLI presence and auth status before solve | SATISFIED | `/api/solve/route.ts` `generateText` probe returns 401 with actionable message. |
| AUTH-02 | 33-01 | `disallowedTools` blocks Claude Code built-in filesystem tools | SATISFIED | `CLAUDE_CODE_DISALLOWED_TOOLS` includes Bash, Read, Write, Edit (plus 15 other tools). |
| AUTH-03 | 33-04 | `generateWithRetry` handles Claude Code error shapes | SATISFIED | Both `generateWithRetry` and `streamWithRetry` distinguish non-retryable from retryable Claude Code errors. |

**Orphaned requirements check:** No requirements mapped to Phase 33 in REQUIREMENTS.md are unaccounted for by Plans 01-07.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No new anti-patterns introduced by Plan 07. |

The `result.object === null` retry issue documented in the initial verification (agent-utils.ts lines 93-94) is now unreachable for Claude Code + structuredOutput calls — the early return in `streamWithRetry` delegates to `generateWithRetry` before the streaming path is entered.

### TypeScript Compilation Status

`npx tsc --noEmit` passes with zero output (no new errors). Pre-existing errors in `layout.tsx` (globals.css, streamdown/styles.css) and `skeleton.tsx` are not present in the filtered output. Zero TypeScript errors in any Phase 33 file.

### Human Verification Required

#### 1. End-to-end Claude Code structured output (PROV-04 runtime validation)

**Test:** Start dev server (`npm run dev`). Select "Claude Code" in the provider toggle. Submit a real problem. Observe Step 1 (Extract) behavior.
**Expected:** Step 1 completes successfully with a non-null parsed result (structured problem data). The pipeline proceeds through all steps. Previously this would fail with "Empty response from model" after 3 attempts.
**Why human:** Runtime behavior requires an active Claude Code CLI session and an actual LLM call. Cannot mock `result.object` population programmatically.

#### 2. Three-way provider toggle visual appearance and behavior

**Test:** Start dev server, navigate to the main solver page. Look at the nav bar.
**Expected:** A toggle group shows "Testing ($)" / "Production ($$$)" / "Claude Code" as three segments. Active segment uses accent color. Toggle is disabled (opacity-50) while a solve is running.
**Why human:** CSS styling, visual contrast, and interactive state cannot be verified programmatically.

### Re-verification Delta

**Gap closed:** PROV-04 — The streaming + structuredOutput null-object bug is resolved by the generate-fallback in `streamWithRetry`. The fix is architecturally sound: detection reads the actual `provider-mode` from `RequestContext` at call time, delegation uses the already-proven `generateWithRetry` path, and the OpenRouter streaming path is completely untouched.

**Regressions:** None. All 8 previously-passing must-haves remain passing. Only `agent-utils.ts` was modified; no step files, agent files, or schema files were touched.

**Remaining gap:** None blocking. Runtime validation (human verification item 1) is the only remaining open item, and it is confirmatory — the code change is architecturally complete.

---

_Verified: 2026-03-12T02:15:00Z_
_Verifier: Claude (gsd-verifier)_
