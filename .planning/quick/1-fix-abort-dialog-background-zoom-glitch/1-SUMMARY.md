---
phase: quick-fix
plan: 1
subsystem: ui
tags: [css, scrollbar-gutter, radix-dialog, layout-shift]

requires: []
provides:
  - "Stable scrollbar gutter preventing layout shift when dialogs open"
affects: []

tech-stack:
  added: []
  patterns:
    - "scrollbar-gutter: stable on html for dialog scroll-lock stability"

key-files:
  created: []
  modified:
    - src/app/globals.css

key-decisions:
  - "Placed html rule as first entry in @layer base, before the universal selector rule"

patterns-established:
  - "scrollbar-gutter: stable on <html> prevents layout shift from Radix Dialog overflow:hidden"

requirements-completed: []

duration: 1min
completed: 2026-03-04
---

# Quick Fix 1: Fix Abort Dialog Background Zoom Glitch Summary

**scrollbar-gutter: stable on html element prevents layout shift when Radix Dialog sets overflow:hidden on body**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-04T05:25:56Z
- **Completed:** 2026-03-04T05:26:43Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `scrollbar-gutter: stable` to `<html>` element in globals.css, reserving scrollbar space permanently
- Eliminates visible content shift/zoom when the abort confirmation dialog (or any Radix Dialog) opens or closes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add scrollbar-gutter stable to html element** - `bfb512f` (fix)

## Files Created/Modified
- `src/app/globals.css` - Added `html { scrollbar-gutter: stable; }` as first rule in `@layer base`

## Decisions Made
- Placed the `html` rule as the first entry inside `@layer base`, before the universal `*` selector rule, as specified by the plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Fix is complete and self-contained; no follow-up needed
- All Radix Dialog instances (abort confirmation, future dialogs) benefit from this fix automatically

## Self-Check: PASSED

- FOUND: src/app/globals.css
- FOUND: bfb512f (task commit)
- FOUND: scrollbar-gutter rule in globals.css

---
*Phase: quick-fix*
*Completed: 2026-03-04*
