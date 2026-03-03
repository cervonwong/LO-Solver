---
phase: quick-19
plan: 01
subsystem: ui
tags: [openrouter, credits, nav-bar, polling, api-route]

# Dependency graph
requires:
  - phase: 12
    provides: NavBar with disabled-wrapper pattern for isRunning state
provides:
  - OpenRouter credits API proxy route
  - Self-polling CreditsBadge component in nav bar
affects: [nav-bar, layout-shell]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-side API proxy for external services, client-side polling with setInterval]

key-files:
  created:
    - src/app/api/credits/route.ts
    - src/components/credits-badge.tsx
  modified:
    - src/components/layout-shell.tsx

key-decisions:
  - "CreditsBadge placed outside isRunning disabled wrapper so credits remain visible during workflow execution"

patterns-established:
  - "API proxy pattern: server-side route fetches external API with env credentials, returns sanitized JSON"

requirements-completed: [QUICK-19]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Quick Task 19: Add OpenRouter Credits Display to Nav Bar

**Live OpenRouter balance display in nav bar with 20s auto-refresh, server-side API proxy, and always-visible during workflow execution**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T08:55:01Z
- **Completed:** 2026-03-03T08:56:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- API route at /api/credits proxies OpenRouter credits endpoint, computing remaining balance from total_credits - total_usage
- CreditsBadge component with dollar icon, "$X.XX left" display, 20s polling, loading ("--") and error ("ERR") states
- Badge placed outside the isRunning disabled-wrapper div so it stays fully visible during workflow execution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create API route and CreditsBadge component** - `cb7e8ed` (feat)
2. **Task 2: Integrate CreditsBadge into NavBar** - `cae2765` (feat)

## Files Created/Modified
- `src/app/api/credits/route.ts` - Server-side proxy to OpenRouter /api/v1/credits, returns { remaining }
- `src/components/credits-badge.tsx` - Self-contained client component with polling, loading/error states, dollar icon
- `src/components/layout-shell.tsx` - Added CreditsBadge import and JSX placement outside disabled wrapper

## Decisions Made
- CreditsBadge placed outside the isRunning disabled wrapper (between the wrapper's closing tag and the abort/new-problem divider) so credits remain always-visible and interactive regardless of workflow state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - uses existing OPENROUTER_API_KEY from .env (already required for the solver).

## Next Phase Readiness
- Credits display is self-contained and requires no further work
- Could be extended with spending alerts or history in future tasks

---
*Phase: quick-19*
*Completed: 2026-03-03*
