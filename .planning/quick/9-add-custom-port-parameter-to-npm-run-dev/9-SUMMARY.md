---
phase: quick
plan: 9
subsystem: infra
tags: [npm-scripts, dev-server, ports, next.js, mastra]

requires: []
provides:
  - "Custom port support for dev scripts via NEXT_PORT and MASTRA_PORT env vars"
affects: []

tech-stack:
  added: []
  patterns:
    - "POSIX shell parameter expansion for env var defaults in npm scripts"

key-files:
  created: []
  modified:
    - package.json
    - CLAUDE.md

key-decisions:
  - "Use POSIX shell parameter expansion instead of cross-env for port defaults"
  - "Separate NEXT_PORT and MASTRA_PORT env vars to avoid conflicts when running concurrently"

patterns-established:
  - "Port customization via env vars with shell defaults: ${VAR:-default}"

requirements-completed: [QT-9]

duration: 1min
completed: 2026-03-15
---

# Quick Task 9: Add Custom Port Parameter to npm run dev

**POSIX shell parameter expansion in npm scripts for NEXT_PORT and MASTRA_PORT env vars with backward-compatible defaults**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-15T01:30:26Z
- **Completed:** 2026-03-15T01:31:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- All three dev scripts (dev, dev:next, dev:mastra) support custom ports via env vars
- Default ports (3000 for Next.js, 4111 for Mastra) preserved when no env vars set
- CLAUDE.md documentation updated with port customization examples

## Task Commits

Each task was committed atomically:

1. **Task 1: Update package.json dev scripts with port env var support** - `6be7f4e`
2. **Task 2: Update CLAUDE.md command documentation** - `3f33e39`

## Files Created/Modified
- `package.json` - Updated dev, dev:next, and dev:mastra scripts with NEXT_PORT/MASTRA_PORT env var support
- `CLAUDE.md` - Documented port customization in Commands section with usage example

## Decisions Made
- Used POSIX shell parameter expansion (`${VAR:-default}`) rather than adding cross-env dependency, since the project runs on WSL2 Linux
- Separate env vars (NEXT_PORT, MASTRA_PORT) instead of shared PORT, since both Next.js and Mastra read PORT and would conflict if set to the same value

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Port customization is ready to use immediately
- No follow-up work needed

---
*Quick Task: 9*
*Completed: 2026-03-15*
