---
phase: 16-toast-notifications
plan: 01
subsystem: ui
tags: [sonner, toast, react-hooks, next-image, workflow-lifecycle]

# Dependency graph
requires:
  - phase: 15-file-refactoring
    provides: refactored page.tsx with extracted hooks (useSolverWorkflow, useWorkflowData, useWorkflowProgress)
provides:
  - Sonner toast infrastructure (Toaster in layout, CSS overrides)
  - WorkflowToast custom component with blueprint theme and Lex mascot images
  - Four toast helper functions (start, complete, aborted, error)
  - useWorkflowToasts hook with ref-guarded state transitions
affects: [16-02 cost warning toast]

# Tech tracking
tech-stack:
  added: [sonner]
  patterns: [ref-guarded-transition-hook, toast-custom-renderer, stable-toast-ids]

key-files:
  created:
    - src/components/ui/sonner.tsx
    - src/components/workflow-toast.tsx
    - src/hooks/use-workflow-toasts.ts
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - package.json
    - package-lock.json

key-decisions:
  - "Used bg-[rgba(0,40,80,0.95)] for toast background instead of surface-1 (too transparent for floating overlay)"
  - "Added explicit | undefined to optional props for exactOptionalPropertyTypes compatibility"

patterns-established:
  - "Ref-guarded transition hook: track previous boolean state, fire side effects only on false-to-true transition"
  - "Stable toast IDs: pass { id: 'solve-start' } to toast.custom() to prevent duplicates in React Strict Mode"

requirements-completed: [TOAST-01, TOAST-02, TOAST-03, TOAST-04, TOAST-05, TOAST-07]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 16 Plan 01: Toast Notifications Summary

**Sonner-based workflow lifecycle toasts with blueprint-themed custom renderer and Lex mascot images**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T07:11:24Z
- **Completed:** 2026-03-04T07:14:05Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Installed Sonner via shadcn and configured Toaster at bottom-left in root layout
- Created WorkflowToast component with blueprint/cyanotype styling (dark navy bg, white borders, Architects Daughter font titles, Lex mascot images)
- Built four toast helper functions for start, complete, aborted, and error lifecycle events
- Created ref-guarded useWorkflowToasts hook that fires toasts only on state transitions, preventing duplicates in React Strict Mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Sonner and create custom toast component** - `207d976` (feat)
2. **Task 2: Create useWorkflowToasts hook and wire into page.tsx** - `0e95fe1` (feat)

## Files Created/Modified
- `src/components/ui/sonner.tsx` - Sonner Toaster wrapper with bottom-left positioning
- `src/components/workflow-toast.tsx` - Custom toast component with Lex mascot and four helper functions
- `src/hooks/use-workflow-toasts.ts` - Ref-guarded hook for firing toasts on workflow state transitions
- `src/app/layout.tsx` - Added Toaster import and render in body
- `src/app/page.tsx` - Added useWorkflowToasts hook call with state flags
- `src/app/globals.css` - Added Sonner CSS overrides for blueprint theme
- `package.json` - Added sonner dependency
- `package-lock.json` - Lockfile update

## Decisions Made
- Used `bg-[rgba(0,40,80,0.95)]` for toast background instead of `bg-surface-1` because surface-1 is too transparent for a floating overlay that needs to be readable against any background
- Added explicit `| undefined` union to optional props in `UseWorkflowToastsOptions` interface for `exactOptionalPropertyTypes` compatibility (project has this tsconfig flag enabled)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes type error**
- **Found during:** Task 2 (useWorkflowToasts hook wiring)
- **Issue:** Optional props `finalRules` and `answerStepOutput` needed explicit `| undefined` union to satisfy `exactOptionalPropertyTypes` tsconfig setting
- **Fix:** Changed `finalRules?: Array<...>` to `finalRules?: Array<...> | undefined` and same for `answerStepOutput`
- **Files modified:** `src/hooks/use-workflow-toasts.ts`
- **Verification:** `npx tsc --noEmit` passes with no new errors
- **Committed in:** 0e95fe1 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type-level fix required by project's strict TypeScript config. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Toast infrastructure is in place for Plan 02 (cost warning toast)
- The pattern of adding new toast types is established: create helper function in workflow-toast.tsx, call from appropriate hook/component

## Self-Check: PASSED

All 6 created/modified files verified on disk. Both task commits (207d976, 0e95fe1) verified in git log.

---
*Phase: 16-toast-notifications*
*Completed: 2026-03-04*
