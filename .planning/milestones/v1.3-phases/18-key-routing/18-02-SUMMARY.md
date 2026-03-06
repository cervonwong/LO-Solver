---
phase: 18-key-routing
plan: 02
subsystem: ui
tags: [react, api-key, useChat, credits-badge, auto-open-dialog, workflow-control-context]

# Dependency graph
requires:
  - phase: 18-key-routing plan 01
    provides: Backend key routing (inputData.apiKey, hasServerKey, no-key 401 guard)
  - phase: 17-key-entry-ui
    provides: useApiKey hook, ApiKeyDialog component, CreditsBadge
provides:
  - API key transmitted with solve requests via inputData.apiKey
  - CreditsBadge fetches user-specific balance when user key is set
  - hasServerKey propagated from credits endpoint to NavBar via callback
  - Auto-open ApiKeyDialog when no key available from either source
  - Auto-trigger solve after key entry (pending solve ref pattern)
  - showApiKeyErrorToast for key-specific error feedback
  - requiresKeyEntry and openKeyDialog in WorkflowControlContext
  - KeyIcon and KeyAlertIcon SVG components for no-key CreditsBadge state
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [solve-guard-with-pending-ref, cross-component-state-via-workflow-control-context, chatId-transport-refresh]

key-files:
  created:
    - src/components/icons/key-icon.tsx
  modified:
    - src/hooks/use-solver-workflow.ts
    - src/components/credits-badge.tsx
    - src/components/api-key-dialog.tsx
    - src/components/workflow-toast.tsx
    - src/contexts/workflow-control-context.tsx
    - src/components/layout-shell.tsx
    - src/app/page.tsx
    - src/mastra/workflow/steps/02-hypothesize.ts

key-decisions:
  - "Solve guard uses pendingSolveRef in page.tsx to defer solve until key is saved, avoiding complex callback chains"
  - "chatId derived from apiKey forces useChat transport recreation when key changes, preventing stale credentials"
  - "CreditsBadge shows flashing yellow KeyAlertIcon when no key from either source, providing visual urgency"
  - "CreditsBadge key row is always gray (de-emphasized) while dollar figure stays cyan"

patterns-established:
  - "Solve guard pattern: requiresKeyEntry check before sendMessage, with pendingSolveRef for deferred auto-solve after key save"
  - "Cross-component coordination via WorkflowControlContext: NavBar registers key state, page.tsx reads it"
  - "chatId refresh pattern: derive useChat chatId from apiKey so transport is recreated on key change"

requirements-completed: [FLOW-01, FLOW-04, FLOW-05]

# Metrics
duration: ~45min
completed: 2026-03-06
---

# Phase 18 Plan 02: Frontend Key Wiring Summary

**Frontend API key routing with auto-open dialog, solve guard, and credit balance switching via WorkflowControlContext coordination**

## Performance

- **Duration:** ~45 min (across checkpoint and bug-fix iterations)
- **Started:** 2026-03-06T13:30:00Z
- **Completed:** 2026-03-06T14:15:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 9

## Accomplishments
- API key sent with every solve request via inputData.apiKey when user key is present
- CreditsBadge fetches and displays the correct balance for whichever key is active (user or server)
- Auto-open ApiKeyDialog when user clicks Solve with no key from either source
- Saving a key in the auto-opened dialog auto-triggers the solve with existing problem text
- showApiKeyErrorToast available for future key-specific error feedback
- Fixed stale transport bug where changing API key did not propagate to active useChat session

## Task Commits

Each task was committed atomically:

1. **Task 1: Send API key in solve requests and integrate hasServerKey in CreditsBadge** - `2f19ced` (feat)
2. **Task 2: Auto-open dialog flow, key-error toast, and end-to-end wiring** - `8fb6ea0` (feat)
3. **Task 3: Verify end-to-end API key routing** - checkpoint (human-verify, approved)

Bug fixes found during verification:
- `9d9b81b` - Fix user key abort bug (sub-requestContexts missing openrouter-provider) and CreditsBadge no-key UX
- `2e33f88` - Fix stale transport in useChat when API key changes (chatId forces Chat recreation)
- `9a710ff` - Make CreditsBadge key row always gray, keep dollar figure cyan

## Files Created/Modified
- `src/hooks/use-solver-workflow.ts` - Added apiKey to inputData, chatId for transport refresh
- `src/components/credits-badge.tsx` - User key balance fetching, hasServerKey callback, KeyAlertIcon for no-key state
- `src/components/api-key-dialog.tsx` - Added onSave callback prop for auto-solve flow
- `src/components/workflow-toast.tsx` - Added showApiKeyErrorToast function
- `src/contexts/workflow-control-context.tsx` - Added requiresKeyEntry, openKeyDialog, useRegisterKeyControl
- `src/components/layout-shell.tsx` - Wired hasServerKey tracking, key control registration, dialog integration
- `src/app/page.tsx` - Solve guard with pendingSolveRef, apiKey change watcher, guardedHandleSolve
- `src/components/icons/key-icon.tsx` - KeyIcon and KeyAlertIcon SVG components
- `src/mastra/workflow/steps/02-hypothesize.ts` - Fixed missing openrouter-provider in sub-requestContexts for parallel agent calls

## Decisions Made
- Solve guard uses a pendingSolveRef to store problem text when dialog is opened, then triggers solve via useEffect when apiKey changes. This avoids complex callback plumbing from dialog back to page.
- chatId derived from apiKey string forces useChat to recreate its transport when the key changes, solving stale credential issues without manual cleanup.
- CreditsBadge shows a flashing yellow KeyAlertIcon (animated pulse) when no key is available from either source, giving clear visual indication that a key is needed.
- Key row in CreditsBadge is always gray to de-emphasize it relative to the cyan credit balance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed user key abort bug in hypothesize step**
- **Found during:** Task 3 (verification)
- **Issue:** When using a user-provided API key, aborting a solve threw errors because sub-requestContexts created for parallel agent calls in 02-hypothesize.ts did not include the openrouter-provider key
- **Fix:** Added openrouter-provider propagation to sub-requestContexts in the hypothesize step
- **Files modified:** src/mastra/workflow/steps/02-hypothesize.ts
- **Committed in:** 9d9b81b

**2. [Rule 1 - Bug] Fixed stale transport when API key changes**
- **Found during:** Task 3 (verification)
- **Issue:** Changing the API key did not propagate to the active useChat session because the transport was memoized with the old key
- **Fix:** Added chatId derived from apiKey to useChat config, forcing transport recreation on key change
- **Files modified:** src/hooks/use-solver-workflow.ts
- **Committed in:** 2e33f88

**3. [Rule 1 - Bug] CreditsBadge no-key UX improvements**
- **Found during:** Task 3 (verification)
- **Issue:** No visual indicator when no key is available; unclear state. Key row color competed with dollar figure.
- **Fix:** Added KeyAlertIcon with flashing animation, hid credits row when no key, made key row always gray
- **Files modified:** src/components/credits-badge.tsx, src/components/icons/key-icon.tsx
- **Committed in:** 9d9b81b, 9a710ff

---

**Total deviations:** 3 auto-fixed (3 bugs found during verification)
**Impact on plan:** All fixes necessary for correct behavior with user-provided keys. No scope creep.

## Issues Encountered
None beyond the bugs fixed above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- End-to-end API key routing complete -- milestone v1.3 is fully implemented
- Users can provide their own OpenRouter API key and have it flow through the entire solve pipeline
- The app can be deployed without a server-side OPENROUTER_API_KEY; users provide their own

## Self-Check: PASSED

All 9 key files verified present. All 5 task/fix commits verified in git log.

---
*Phase: 18-key-routing*
*Completed: 2026-03-06*
