---
phase: quick-3
plan: 01
subsystem: dependencies
tags: [zod, schema-validation, structured-output, mastra, ai-sdk]

# Dependency graph
requires: []
provides:
  - "zod v3 compatibility with @mastra/core and AI SDK"
  - "Working structured output schema validation for tester tools"
affects: [workflow, solver]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Use --legacy-peer-deps for npm install due to zod v3/v4 peer dep split"]

key-files:
  created: []
  modified: [package.json, package-lock.json]

key-decisions:
  - "Pinned zod to ^3.25.76 (latest v3 line) instead of ^3.23.8 per npm resolution"
  - "Used --legacy-peer-deps for install due to @anthropic-ai/claude-agent-sdk requiring peer zod ^4.0.0"

patterns-established:
  - "npm install requires --legacy-peer-deps flag until claude-agent-sdk supports zod v3"

requirements-completed: [FIX-ZOD-COMPAT]

# Metrics
duration: 8min
completed: 2026-03-14
---

# Quick Task 3: Fix Structured Output Schema Validation Summary

**Downgraded zod from v4.3.6 to v3.25.76 to resolve STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED errors in @ai-sdk/ui-utils-v5 and @ai-sdk/provider-utils**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T08:43:08Z
- **Completed:** 2026-03-14T08:51:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Downgraded zod from v4.3.6 to v3.25.76 in package.json and package-lock.json
- Eliminated the 10 invalid zod resolutions from @ai-sdk/ui-utils-v5 and @ai-sdk/provider-utils that caused structured output schema validation failures
- Verified no TypeScript regressions (only pre-existing globals.css, streamdown/styles.css, and skeleton.tsx errors remain)
- Verified build failure is pre-existing (globals.css type error) and not caused by zod downgrade

## Task Commits

Each task was committed atomically:

1. **Task 1: Downgrade zod to v3 and clean install + Task 2: Verify no regressions** - `3f47700` (fix)

## Files Created/Modified
- `package.json` - Changed zod dependency from `^4.3.6` to `^3.25.76`
- `package-lock.json` - Updated lock file with zod 3.25.76 resolution

## Decisions Made
- **zod version ^3.25.76 instead of ^3.23.8:** npm resolved `^3.23.8` to 3.25.76 (latest v3) and auto-updated the range in package.json. This is correct; 3.25.x is the latest v3 line with backported v4 features.
- **--legacy-peer-deps required:** `@anthropic-ai/claude-agent-sdk@^0.2.72` and `ai-sdk-provider-claude-code@^3.4.4` declare `peer zod@"^4.0.0"`. These packages are runtime-compatible with zod v3 (they don't use v4-only APIs in our usage), but npm strict peer dep checking blocks install without the flag.
- **Preserved existing lock file versions:** Rather than deleting package-lock.json (which would upgrade @mastra/core from 1.8.0 to 1.13.2 and cause type errors), restored the lock file from git and only changed the zod entry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used --legacy-peer-deps due to @anthropic-ai/claude-agent-sdk peer dep conflict**
- **Found during:** Task 1 (npm install)
- **Issue:** `npm install` with `zod@^3.23.8` fails with ERESOLVE because `@anthropic-ai/claude-agent-sdk@0.2.76` requires `peer zod@"^4.0.0"`. The plan did not account for this peer dependency.
- **Fix:** Used `npm install --legacy-peer-deps` to bypass the strict peer dep check. The claude-agent-sdk is runtime-compatible with zod v3 in the project's usage.
- **Files modified:** package-lock.json
- **Verification:** npm install succeeds, tsc passes, all @mastra packages get valid zod resolution
- **Committed in:** 3f47700 (Task 1 commit)

**2. [Rule 3 - Blocking] Preserved package-lock.json instead of deleting it**
- **Found during:** Task 1 (first attempt at clean install)
- **Issue:** Plan instructed to delete node_modules AND package-lock.json then run npm install. This caused @mastra/core to upgrade from 1.8.0 to 1.13.2 and ai from 6.0.101 to 6.0.116, introducing 20+ new TypeScript errors (type incompatibilities in Agent.generate() and structuredOutput options).
- **Fix:** Restored package-lock.json from git, then ran `npm install zod@^3.23.8 --legacy-peer-deps` to only change the zod resolution while preserving all other locked versions.
- **Files modified:** package-lock.json
- **Verification:** `@mastra/core` stays at 1.8.0, `ai` stays at 6.0.101, tsc passes with only pre-existing errors
- **Committed in:** 3f47700 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes were necessary to complete the task. The plan's assumption that npm install would work without --legacy-peer-deps and that deleting the lock file was safe were incorrect. No scope creep.

## Issues Encountered
- **npm ls still shows "invalid" markers (24):** All from `@anthropic-ai/claude-agent-sdk` and `ai-sdk-provider-claude-code` having `peer zod@"^4.0.0"`. These are cosmetic peer dep warnings, not functional issues. The critical invalids (from @ai-sdk/ui-utils-v5 needing zod v3) are resolved.
- **npm run build fails on globals.css:** This is a pre-existing issue (also fails with original zod v4.3.6). Documented in CLAUDE.md as expected.

## User Setup Required

After pulling this change, run `npm install --legacy-peer-deps` instead of plain `npm install`. The `--legacy-peer-deps` flag is required until `@anthropic-ai/claude-agent-sdk` adds support for zod v3.

## Next Steps
- The STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED errors during testRule and testSentence tool executions should now be resolved
- Consider updating CLAUDE.md to note the `--legacy-peer-deps` requirement
- When @anthropic-ai/claude-agent-sdk supports zod v3 (or when @mastra/core supports zod v4 cleanly), the peer dep conflict can be resolved

## Self-Check: PASSED

- FOUND: package.json with zod ^3.25.76
- FOUND: package-lock.json with zod 3.25.76
- FOUND: 3-SUMMARY.md
- FOUND: commit 3f47700
- FOUND: zod 3.25.76 installed in node_modules

---
*Quick Task: 3-fix-structured-output-schema-validation*
*Completed: 2026-03-14*
