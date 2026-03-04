---
phase: 15-file-refactoring
plan: 02
subsystem: ui
tags: [react, components, refactoring, trace-panel]

# Dependency graph
requires:
  - phase: 15-file-refactoring (plan 01)
    provides: trace/ directory structure from step extraction
provides:
  - 5 focused trace component files replacing 898-line monolith
  - Shared trace UI primitives (ChevronIcon, RawJsonToggle, StructuredOutputSection)
  - Separated tool call rendering pipeline (specialized cards, generic cards, routing)
  - Pure utility module for trace type detection and render item building
affects: [15-file-refactoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Circular dependency avoidance: ToolCallRenderer lives in specialized-tools.tsx alongside the cards it routes to"

key-files:
  created:
    - src/components/trace/trace-event-card.tsx
    - src/components/trace/tool-call-cards.tsx
    - src/components/trace/specialized-tools.tsx
    - src/components/trace/shared.tsx
    - src/components/trace/trace-utils.tsx
  modified:
    - src/components/dev-trace-panel.tsx

key-decisions:
  - "Moved ToolCallRenderer and AgentToolCallCard to specialized-tools.tsx (not tool-call-cards.tsx) to avoid circular dependency between BulkToolCallGroup and ToolCallRenderer"

patterns-established:
  - "No barrel/index.ts in trace/ directory; consumers import from specific files"
  - "Pure utility functions (trace-utils.tsx) omit 'use client' directive"

requirements-completed: [REFAC-02, REFAC-04]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 15 Plan 02: Trace Event Card Split Summary

**Split 898-line trace-event-card.tsx into 5 focused files under src/components/trace/ with circular dependency avoidance**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T05:20:17Z
- **Completed:** 2026-03-04T05:25:30Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 1 modified, 1 deleted)

## Accomplishments
- Split monolithic 898-line trace-event-card.tsx into 5 domain-focused files
- Updated dev-trace-panel.tsx to import from new trace/ paths
- Deleted original file with no new TypeScript errors
- Resolved circular dependency between BulkToolCallGroup and ToolCallRenderer

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: Split trace-event-card.tsx and commit** - `aa130a6` (refactor)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/components/trace/trace-utils.tsx` - Pure utility functions: type detection (isRuleTestTool, isSentenceTestTool, etc.), buildRenderItems, jsonMarkdown, formatConclusion
- `src/components/trace/shared.tsx` - Shared UI primitives: ChevronIcon, RawJsonToggle, StructuredOutputSection, TRACE_SD_CLASS constant
- `src/components/trace/specialized-tools.tsx` - Domain-specific tool cards: VocabularyToolCard, SentenceTestToolCard, BulkToolCallGroup, RuleTestCard, ToolCallRenderer, AgentToolCallCard
- `src/components/trace/tool-call-cards.tsx` - Tool call rendering: ToolCallGroupCard, ToolCallDetail, RenderItem, AgentCard, DEPTH_INDENT, getIndentClass
- `src/components/trace/trace-event-card.tsx` - Main TraceEventCard switch component
- `src/components/dev-trace-panel.tsx` - Updated imports to new trace/ paths
- `src/components/trace-event-card.tsx` - Deleted (replaced by trace/ directory files)

## Decisions Made
- Moved ToolCallRenderer and AgentToolCallCard to specialized-tools.tsx instead of tool-call-cards.tsx as originally planned, to avoid circular dependency: BulkToolCallGroup (specialized-tools) calls ToolCallRenderer, and ToolCallRenderer calls RuleTestCard/SentenceTestToolCard/VocabularyToolCard (all in specialized-tools). Keeping them together avoids the cycle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved ToolCallRenderer to specialized-tools.tsx to avoid circular dependency**
- **Found during:** Task 1 (file split)
- **Issue:** Plan placed ToolCallRenderer in tool-call-cards.tsx and BulkToolCallGroup in specialized-tools.tsx. BulkToolCallGroup renders ToolCallRenderer, and ToolCallRenderer renders specialized cards from specialized-tools.tsx, creating a circular import.
- **Fix:** Kept ToolCallRenderer and AgentToolCallCard in specialized-tools.tsx alongside the components they route to. tool-call-cards.tsx imports ToolCallRenderer from specialized-tools.tsx.
- **Files modified:** src/components/trace/specialized-tools.tsx, src/components/trace/tool-call-cards.tsx
- **Verification:** npx tsc --noEmit passes with no new errors
- **Committed in:** aa130a6

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to avoid circular dependency. No scope creep; same components, different file placement.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- trace/ directory contains all trace-related components in focused files
- Ready for 15-03 (remaining file refactoring tasks)
- No blockers

## Self-Check: PASSED

- All 5 trace/ files exist on disk
- Original trace-event-card.tsx confirmed deleted
- Commit aa130a6 found in git log

---
*Phase: 15-file-refactoring*
*Completed: 2026-03-04*
