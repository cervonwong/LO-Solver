---
phase: 32-frontend-cleanup
plan: 01
subsystem: ui
tags: [react, typescript, interfaces, trace-panel, component-props]

# Dependency graph
requires: []
provides:
  - Named prop interfaces for all trace panel components (13 new, 4 pre-existing)
  - Extracted inline event handler in RawJsonToggle
  - Deduplicated ChevronIcon with optional className prop
affects: [trace-panel, dev-trace-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Named {ComponentName}Props interface colocated above each component"
    - "ChevronIcon accepts optional className for per-site styling"

key-files:
  created: []
  modified:
    - src/components/trace/shared.tsx
    - src/components/dev-trace-panel.tsx
    - src/components/trace/specialized-tools.tsx
    - src/components/trace/tool-call-cards.tsx

key-decisions:
  - "Used interface (not type) for all prop definitions, consistent with existing DevTracePanelProps pattern"
  - "No useCallback for handleToggleRaw since it targets a native button element, not a memoized child"

patterns-established:
  - "Named interface pattern: every trace component uses interface {Name}Props colocated above its function"

requirements-completed: [FE-01, FE-02]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 32 Plan 01: Trace Component Props and Handler Cleanup Summary

**Named prop interfaces for all 17 trace components, extracted inline onClick handler, and deduplicated ChevronIcon with optional className**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T10:45:03Z
- **Completed:** 2026-03-10T10:48:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extracted the sole inline JSX event handler (onClick in RawJsonToggle) to a named handleToggleRaw function
- Removed the duplicate ChevronIcon from dev-trace-panel.tsx, replacing it with an import from shared.tsx with className="text-muted-foreground"
- Added 13 new named prop interfaces across 4 files, bringing all trace components to named types

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract inline handler and remove duplicate ChevronIcon** - `a2113aa` (feat)
2. **Task 2: Add named prop interfaces to all trace components** - `aea2e05` (feat)

## Files Created/Modified
- `src/components/trace/shared.tsx` - Added ChevronIconProps, RawJsonToggleProps, StructuredOutputSectionProps; added optional className to ChevronIcon; extracted handleToggleRaw handler
- `src/components/dev-trace-panel.tsx` - Added EventListProps; removed duplicate ChevronIcon; added import from shared
- `src/components/trace/specialized-tools.tsx` - Added VocabularyToolCardProps, SentenceTestToolCardProps, BulkToolCallGroupProps, RuleTestCardProps, ToolCallRendererProps, AgentToolCallCardProps
- `src/components/trace/tool-call-cards.tsx` - Added ToolCallDetailProps, RenderItemProps, AgentCardProps

## Decisions Made
- Used `interface` (not `type`) for all prop definitions, matching the pre-existing `DevTracePanelProps` pattern
- Did not wrap handleToggleRaw in useCallback since it targets a native button element, not a memoized child component

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All trace component props now use named interfaces
- Zero inline arrow functions in JSX event handler props
- Ready for any further frontend cleanup plans in phase 32

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 32-frontend-cleanup*
*Completed: 2026-03-10*
