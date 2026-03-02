---
phase: 06-ui-event-system
plan: 01
subsystem: api
tags: [typescript, events, streaming, mastra, agent-utils]

# Dependency graph
requires: []
provides:
  - Hierarchical event type definitions (HierarchicalAgentStartEvent, HierarchicalAgentEndEvent, HierarchicalToolCallEvent, AgentTextChunkEvent, RuleTestResultEvent)
  - generateEventId() helper for unique event IDs
  - streamWithRetry() function for agent text streaming with retry/timeout
affects: [06-02, 06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hierarchical event model with id/parentId for nested agent/tool events"
    - "streamWithRetry pattern: consume textStream, forward chunks via callback, return FullOutput"

key-files:
  created: []
  modified:
    - src/lib/workflow-events.ts
    - src/mastra/workflow/agent-utils.ts

key-decisions:
  - "Kept AgentReasoningEvent and ToolCallEvent as deprecated types in union for backward compatibility during migration"
  - "Used incrementing counter with random prefix for event IDs instead of UUIDs"
  - "streamWithRetry returns FullOutput (not MastraModelOutput) for simpler consumption"

patterns-established:
  - "Hierarchical events: every agent/tool event has id field, optional parentId for nesting"
  - "Text streaming callback: onTextChunk parameter on streamWithRetry enables real-time forwarding"

requirements-completed: [UI-06]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 06 Plan 01: Event Types & Streaming Infrastructure Summary

**Hierarchical event types with id/parentId nesting and streamWithRetry function for real-time agent text streaming**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T12:43:16Z
- **Completed:** 2026-03-01T12:46:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Defined 5 new hierarchical event types with id/parentId fields for nested agent/tool event tracking
- Added generateEventId() helper producing unique IDs with random prefix and counter
- Created streamWithRetry function that consumes agent textStream with real-time chunk callback and full retry/timeout support

## Task Commits

Each task was committed atomically:

1. **Task 1: Define hierarchical event types in workflow-events.ts** - `7e89b2d` (feat)
2. **Task 2: Create streamWithRetry function in agent-utils.ts** - `8839c3a` (feat)

## Files Created/Modified
- `src/lib/workflow-events.ts` - Added HierarchicalAgentStartEvent, HierarchicalAgentEndEvent, HierarchicalToolCallEvent, AgentTextChunkEvent, RuleTestResultEvent types; added generateEventId(); deprecated AgentReasoningEvent and ToolCallEvent
- `src/mastra/workflow/agent-utils.ts` - Added streamWithRetry function with onTextChunk callback, timeout/retry logic, FullOutput return type

## Decisions Made
- Kept AgentReasoningEvent and ToolCallEvent as deprecated types in the WorkflowTraceEvent union rather than removing them, since they are referenced by workflow.ts, trace-utils.ts, and UI components that will be migrated in plans 06-03 and 06-04
- Used simple incrementing counter with random prefix for event IDs (e.g., `evt_a1b2c3_0`) per plan guidance
- streamWithRetry returns `FullOutput` from `@mastra/core/stream` which provides `.text`, `.object`, `.reasoning` etc., matching the usage pattern of generateWithRetry

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept AgentReasoningEvent in union instead of removing it**
- **Found during:** Task 1 (Define hierarchical event types)
- **Issue:** Plan specified removing AgentReasoningEvent from the union, but it is referenced in 7 other files (workflow.ts, trace-utils.ts, activity-indicator.tsx, trace-event-card.tsx) which would break compilation
- **Fix:** Marked AgentReasoningEvent as @deprecated and kept it in the union alongside new types. Migration to new types is handled by plans 06-03 (backend) and 06-04 (frontend)
- **Files modified:** src/lib/workflow-events.ts
- **Verification:** `npx tsc --noEmit` passes with only pre-existing CSS module errors
- **Committed in:** 7e89b2d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to maintain backward compatibility. The deprecated types will be removed when the consuming files are migrated in later plans.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Event type contracts ready for consumption by Plan 06-03 (backend workflow migration) and Plan 06-04 (frontend display)
- streamWithRetry ready to replace generateWithRetry calls in workflow steps that need real-time text streaming
- generateEventId ready for use in workflow step event emission

---
*Phase: 06-ui-event-system*
*Completed: 2026-03-01*
