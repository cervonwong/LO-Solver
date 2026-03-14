---
phase: 36-evaluation-support
verified: 2026-03-14T08:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 36: Evaluation Support Verification Report

**Phase Goal:** Eval harness can benchmark Claude Code provider runs alongside OpenRouter runs for cross-provider comparison
**Verified:** 2026-03-14
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `npm run eval -- --provider claude-code` starts eval using Claude Code provider | VERIFIED | `parseArgs()` in `run.ts:60-67` accepts `--provider claude-code`; line 118 computes `providerMode = 'claude-code-testing'` via template literal `${provider}-${mode}` |
| 2 | Running `npm run eval -- --provider claude-code --mode production` uses claude-code-production mode | VERIFIED | `--mode production` sets `mode = 'production'`; combined at line 118 → `'claude-code-production'` |
| 3 | Running `npm run eval` without --provider defaults to openrouter (backward compatible) | VERIFIED | `provider` initialised as `'openrouter'` at `run.ts:47`; default produces `'openrouter-testing'` |
| 4 | Claude Code auth is verified before any workflow execution when using claude-code provider | VERIFIED | `run.ts:199-214`: `isClaudeCodeMode(providerMode)` gate before `loadEvalProblems()`, calls `generateText({ model: claudeCode('sonnet'), prompt: 'Respond with OK', maxOutputTokens: 10 })` |
| 5 | Concurrency > 1 with Claude Code prints a warning | VERIFIED | `run.ts:217-222`: `isClaudeCodeMode(providerMode) && concurrency > 1` condition emits `console.warn` with subprocess warning |
| 6 | Zero-shot comparison with --provider claude-code uses Claude Code models (not OpenRouter) | VERIFIED | `zero-shot-solver.ts:39-40`: `isClaudeCodeMode(pm)` branch returns `claudeCode(pm === 'claude-code-production' ? 'sonnet' : 'haiku')` |
| 7 | User can filter eval runs by provider mode in the run history table | VERIFIED | `page.tsx:317,378-391`: `providerFilter` state drives `filteredRuns`; `<select>` dropdown renders when `providerModes.length > 1` |
| 8 | Selecting a provider filter shows only runs from that provider | VERIFIED | `page.tsx:338-339`: `filteredRuns = runs.filter((r) => r.providerMode === providerFilter)` when not 'all'; table at line 406 maps `filteredRuns` |
| 9 | Selecting 'All providers' shows all runs (default state) | VERIFIED | `page.tsx:338`: `providerFilter === 'all'` short-circuits to full `runs` array; filter resets in `fetchRuns` at line 321 |
| 10 | Provider filter options are derived from actual data (not hardcoded) | VERIFIED | `page.tsx:337`: `[...new Set(runs.map((r) => r.providerMode))].sort()` — dynamic derivation from loaded data |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/evals/run.ts` | CLI --provider flag, auth gate, concurrency warning | VERIFIED | Substantive: 580 lines; `--provider` flag at line 60, auth gate at line 199, concurrency warning at line 217. Wired: imported by eval runner entry point (`main()` at line 188) |
| `src/evals/zero-shot-solver.ts` | Claude Code model branch for zero-shot solver | VERIFIED | Substantive: 78 lines; `claudeCode` import at line 5, `isClaudeCodeMode` branch at line 39. Wired: imported and called in `run.ts:16,272` |
| `src/app/evals/page.tsx` | Provider filter dropdown in run history | VERIFIED | Substantive: 510 lines; `providerFilter` state at line 317, `providerModes` at line 337, `filteredRuns` at line 338, dropdown at line 379 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/evals/run.ts` | `src/mastra/openrouter.ts` | `isClaudeCodeMode(providerMode)` | WIRED | `run.ts:8` imports `isClaudeCodeMode`; called at lines 199 and 217 |
| `src/evals/run.ts` | `src/mastra/claude-code-provider.ts` | `generateText` auth probe with `claudeCode('sonnet')` | WIRED | `run.ts:6` imports `claudeCode`; used at line 203 in auth probe |
| `src/evals/zero-shot-solver.ts` | `src/mastra/claude-code-provider.ts` | Claude Code model for zero-shot | WIRED | `zero-shot-solver.ts:5` imports `claudeCode`; used at line 40 in model callback |
| `src/app/evals/page.tsx` | `EvalRunResult.providerMode` | filter state comparison | WIRED | `page.tsx:338`: `runs.filter((r) => r.providerMode === providerFilter)` — direct field access; `page.tsx:337`: `runs.map((r) => r.providerMode)` for option derivation |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| EVAL-01 | 36-01-PLAN.md | Eval harness accepts `--provider claude-code` flag for Claude Code provider runs | SATISFIED | `run.ts`: `--provider` flag parsing (line 60), auth gate (line 199), providerMode composition (line 118), zero-shot model branch in `zero-shot-solver.ts` (line 39) |
| EVAL-02 | 36-02-PLAN.md | Eval results record which provider was used for cross-provider comparison | SATISFIED | `storage.ts:44` has `providerMode: ProviderMode` field; `page.tsx`: `providerFilter` state, `filteredRuns`, and provider filter dropdown (lines 317-391) |

No orphaned requirements: REQUIREMENTS.md maps EVAL-01 and EVAL-02 exclusively to Phase 36, both covered by plans 36-01 and 36-02 respectively.

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments, no stub implementations, no empty handlers in any phase 36 files.

### TypeScript Status

`npx tsc --noEmit` reports four errors, all pre-existing and unrelated to phase 36:
- `src/app/layout.tsx`: Cannot find module `streamdown/styles.css` — pre-exists (layout.tsx not touched in phase 36)
- `src/components/skeleton.tsx` lines 89, 91, 99: Iterator and undefined errors — pre-exists (skeleton.tsx last modified in commits `6110a03` and `599c3c6`, both before phase 36)

No new TypeScript errors introduced by phase 36.

### Human Verification Required

#### 1. Provider filter visual appearance

**Test:** Start dev server (`npm run dev`), navigate to `/evals`. Ensure at least two runs with different `providerMode` values exist (e.g., one `openrouter-testing` and one `claude-code-testing`). Observe the Run History header.
**Expected:** A dropdown appears inline with the "Run History" heading. Options include "All providers", plus each distinct provider mode. Styling matches DESIGN.md: no rounded corners, uppercase tracking-wider text, border-subtle border, transparent background, cyan accent on focus.
**Why human:** CSS class application, actual pixel rendering, and visual design compliance cannot be verified by static analysis.

#### 2. Filter interaction and selection clearing

**Test:** With multiple provider modes in the run history: (a) select a run in one provider mode, (b) switch the filter to a different provider mode.
**Expected:** The selected run's detail panel disappears (because `selectedRun` is derived from `filteredRuns`, which no longer contains the selected run). The run history table shows only runs matching the new filter.
**Why human:** React state interaction and conditional rendering behavior require a running browser.

#### 3. Full Claude Code eval run (auth gate live path)

**Test:** Run `npm run eval -- --provider claude-code --problem <any-id>` in a terminal with valid Claude Code credentials.
**Expected:** "Verifying Claude Code authentication..." prints, followed by "Claude Code authenticated.", then the eval executes through the Claude Code provider.
**Why human:** Requires live Claude Code CLI credentials and actual LLM execution — cannot be simulated statically.

### Gaps Summary

No gaps. All ten observable truths are verified, all three artifacts are substantive and wired, all four key links are confirmed, and both requirements (EVAL-01, EVAL-02) are satisfied with direct code evidence. TypeScript errors present are pre-existing and unrelated to this phase.

---

_Verified: 2026-03-14_
_Verifier: Claude (gsd-verifier)_
