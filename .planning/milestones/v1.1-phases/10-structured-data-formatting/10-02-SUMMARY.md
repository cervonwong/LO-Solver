---
phase: 10-structured-data-formatting
plan: 02
subsystem: ui
tags: [react, trace-panel, structured-output, collapsible, labeled-list]

# Dependency graph
requires:
  - phase: 10-structured-data-formatting
    provides: "LabeledList component for structured data rendering (Plan 01)"
provides:
  - "AgentEndEvent type with optional structuredOutput field"
  - "Backend emission of structuredOutput for 6 agents with parsed JSON output"
  - "Collapsible StructuredOutputSection in AgentCard with LabeledList and raw JSON toggle"
affects: [trace-panel, workflow-events]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Spread-conditional field inclusion for optional event data"]

key-files:
  created: []
  modified:
    - src/lib/workflow-events.ts
    - src/mastra/workflow/workflow.ts
    - src/components/trace-event-card.tsx

key-decisions:
  - "Reused RawJsonToggle with empty input object, updated to skip empty Input block"
  - "Used spread-conditional pattern for structuredOutput to avoid sending undefined over the wire"

patterns-established:
  - "Spread-conditional event fields: ...(response.object ? { structuredOutput: response.object as Record<string, unknown> } : {})"

requirements-completed: [FMT-03, FMT-04]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 10 Plan 2: Structured Output Section Summary

**Agent structured output rendered as collapsible LabeledList section in trace panel AgentCard with raw JSON toggle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T11:14:47Z
- **Completed:** 2026-03-03T11:17:45Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added optional `structuredOutput` field to `AgentEndEvent` type for agents with parsed JSON output
- Emitted structuredOutput from 6 backend agents that use `structuredOutput` schema option (Problem Extractor, Perspective Dispatcher, Improver Dispatcher, Feedback Extractor, Convergence Extractor, Question Answerer)
- Rendered collapsible "Structured Output" section in AgentCard below reasoning, collapsed by default
- {...} toggle switches between LabeledList view and raw JSON view

## Task Commits

Each task was committed atomically:

1. **Task 1: Add structuredOutput field to AgentEndEvent and emit from backend** - `1643e73` (feat)
2. **Task 2: Render structured output section in AgentCard** - `65d27b2` (feat)

## Files Created/Modified
- `src/lib/workflow-events.ts` - Added optional structuredOutput field to AgentEndEvent data interface
- `src/mastra/workflow/workflow.ts` - Added structuredOutput emission to 6 agent-end events using spread-conditional pattern
- `src/components/trace-event-card.tsx` - Added StructuredOutputSection component and integrated into AgentCard; updated RawJsonToggle to skip empty Input block

## Decisions Made
- Reused existing RawJsonToggle with `{ input: {}, result: data }` for the structured output section, updating RawJsonToggle to conditionally skip rendering the Input block when input is an empty object (backward-compatible since no existing caller passes empty input)
- Used spread-conditional pattern `...(response.object ? { structuredOutput: ... } : {})` to avoid sending undefined values over the wire

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 (Structured Data Formatting) is complete with both plans finished
- LabeledList renders both tool call data (Plan 01) and agent structured output (Plan 02)
- Ready for next phase

---
*Phase: 10-structured-data-formatting*
*Completed: 2026-03-03*
