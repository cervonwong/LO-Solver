---
phase: 33-provider-foundation
plan: 03
subsystem: evals
tags: [provider-mode, eval-system, backward-compat, rename]

# Dependency graph
requires:
  - phase: 33-01
    provides: ProviderMode type with 3 values replacing binary ModelMode
provides:
  - providerMode field in EvalRunResult with backward-compat migration
  - Eval CLI maps --mode flag to ProviderMode values internally
  - Zero-shot solver uses provider-mode RequestContext key
  - Evals UI displays providerMode string
affects: [33-04, 33-05, 33-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [backward-compat-json-migration]

key-files:
  created: []
  modified:
    - src/evals/storage.ts
    - src/evals/run.ts
    - src/evals/zero-shot-solver.ts
    - src/app/evals/page.tsx

key-decisions:
  - "Backward-compat migration maps old 'testing'/'production' to 'openrouter-testing'/'openrouter-production' on JSON load"
  - "CLI --mode flag kept as testing|production for user ergonomics, mapped to ProviderMode internally"

patterns-established:
  - "JSON migration on read: old fields are migrated in-memory without rewriting files on disk"

requirements-completed: [PROV-01]

# Metrics
duration: 4min
completed: 2026-03-11
---

# Phase 33 Plan 03: Eval ProviderMode Rename Summary

**Renamed modelMode to providerMode across eval system with backward-compatible JSON migration for old result files**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-11T12:08:41Z
- **Completed:** 2026-03-11T12:13:38Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Renamed `modelMode` field to `providerMode` with `ProviderMode` type in `EvalRunResult` interface
- Added backward-compat migration function that maps old JSON `modelMode` values on read
- Updated eval CLI to map `--mode testing|production` to `ProviderMode` values internally
- Updated zero-shot solver to use `provider-mode` RequestContext key and `ProviderMode` type
- Updated evals UI to display `providerMode` string instead of old `modelMode`

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename modelMode to providerMode in eval files and evals UI** - `d91f2e7` (feat)

## Files Created/Modified
- `src/evals/storage.ts` - EvalRunResult uses providerMode field with ProviderMode type; migrateEvalRun function for old JSON files
- `src/evals/run.ts` - CLI --mode maps to ProviderMode; result object writes providerMode
- `src/evals/zero-shot-solver.ts` - Uses ProviderMode import, provider-mode RequestContext key
- `src/app/evals/page.tsx` - Displays providerMode string in run history table and run summary

## Decisions Made
- Backward-compat migration maps old `modelMode: 'testing'` to `providerMode: 'openrouter-testing'` and `'production'` to `'openrouter-production'` on JSON read, without rewriting files on disk
- CLI `--mode testing|production` flag kept unchanged for user ergonomics; mapping to ProviderMode happens internally in `parseArgs()`
- Evals UI uses `string` type for `providerMode` rather than importing the server-side ProviderMode type (client component cannot import server modules)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All eval files compile cleanly with providerMode
- Old eval JSON files are backward-compatible via in-memory migration
- Zero remaining `ModelMode` type references in src/
- Only `modelMode` string references remaining are in backward-compat migration code (expected)

## Self-Check: PASSED

All files verified present. Commit hash d91f2e7 verified in git log. providerMode and migrateEvalRun verified in storage.ts.

---
*Phase: 33-provider-foundation*
*Completed: 2026-03-11*
