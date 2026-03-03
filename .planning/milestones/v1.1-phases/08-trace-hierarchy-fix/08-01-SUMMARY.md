---
phase: 08-trace-hierarchy-fix
plan: 01
subsystem: ui
tags: [trace-events, typescript, event-hierarchy, parentId, workflow-events]

# Dependency graph
requires: []
provides:
  - "Clean event type names (AgentStartEvent, AgentEndEvent, ToolCallEvent) without Hierarchical prefix"
  - "Deprecated types removed (AgentReasoningEvent, old ToolCallEvent)"
  - "Correct parentId injection via emitToolTraceEvent"
  - "All tool-calling RequestContext instances have step-id set"
affects: [08-02-PLAN, trace-utils, trace-event-card, activity-indicator]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated union cleanup: rename interfaces without changing type literals"
    - "RequestContext consistency: all tool-calling contexts must set step-id, step-writer, parent-agent-id"

key-files:
  created: []
  modified:
    - src/lib/workflow-events.ts
    - src/lib/trace-utils.ts
    - src/components/trace-event-card.tsx
    - src/components/activity-indicator.tsx
    - src/mastra/workflow/workflow.ts

key-decisions:
  - "parentId injection flow is architecturally correct: set on RequestContext before agent call, same instance flows to tools via Mastra framework"
  - "verifyRequestContext was missing step-id, fixed as deviation"

patterns-established:
  - "Event type naming: AgentStartEvent, AgentEndEvent, ToolCallEvent (no prefix)"
  - "All RequestContext instances for tool-calling agents must set: step-id, step-writer, parent-agent-id, event-source"

requirements-completed: [HIER-01]

# Metrics
duration: 9min
completed: 2026-03-02
---

# Phase 8 Plan 1: Trace Hierarchy Fix Summary

**Removed deprecated event types, renamed Hierarchical-prefixed types to clean names, and fixed missing step-id on verifyRequestContext for correct tool event tagging**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-02T07:16:17Z
- **Completed:** 2026-03-02T07:25:52Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Removed deprecated `AgentReasoningEvent` and old `ToolCallEvent` (without id/parentId) from the codebase
- Renamed `HierarchicalAgentStartEvent` to `AgentStartEvent`, `HierarchicalAgentEndEvent` to `AgentEndEvent`, `HierarchicalToolCallEvent` to `ToolCallEvent`
- Updated all imports and references across trace-utils.ts, trace-event-card.tsx, and activity-indicator.tsx
- Diagnosed parentId emission flow: confirmed correct architecture (parent-agent-id set on RequestContext, flows to tools via Mastra framework)
- Fixed missing `step-id` on verifyRequestContext

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove deprecated event types and rename Hierarchical-prefixed types** - `f052118` (refactor)
2. **Task 2: Update all imports and references to use renamed event types** - `b5f4668` (refactor)
3. **Task 3: Diagnose and fix parentId emission for tool-call events** - `d2d66d8` (fix)

## Files Created/Modified
- `src/lib/workflow-events.ts` - Removed deprecated types, renamed interfaces, updated union type
- `src/lib/trace-utils.ts` - Updated imports and type references, removed data-agent-reasoning case
- `src/components/trace-event-card.tsx` - Updated imports, removed deprecated rendering block
- `src/components/activity-indicator.tsx` - Removed data-agent-reasoning references
- `src/mastra/workflow/workflow.ts` - Added missing step-id to verifyRequestContext

## Decisions Made
- parentId injection flow confirmed correct at architecture level: parent-agent-id is set on the same RequestContext instance that flows through Mastra to tool execute contexts
- The emitToolTraceEvent helper correctly reads parent-agent-id and injects parentId on data-tool-call events
- All four RequestContext instances used with tool-calling agents (mainRequestContext, perspectiveRequestContext, verifyRequestContext, convergenceRequestContext) now consistently set step-id

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing step-id to verifyRequestContext**
- **Found during:** Task 3 (parentId diagnosis)
- **Issue:** verifyRequestContext (used for verifier and feedback extractor agents) was created without setting step-id, unlike all other RequestContext instances for tool-calling agents
- **Fix:** Added `verifyRequestContext.set('step-id', stepId)` to the initialization block
- **Files modified:** src/mastra/workflow/workflow.ts
- **Verification:** All four tool-calling RequestContext instances now set step-id
- **Committed in:** d2d66d8 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix necessary for consistent event tagging. No scope creep.

## Issues Encountered
- Task 3 diagnosis revealed the parentId emission architecture is correct at the code level. The parent-agent-id is set before agent calls, the same RequestContext instance flows through Mastra to tools, and emitToolTraceEvent reads and injects it. The activeAgentStack fallback in trace-utils.ts may still be needed for edge cases (handled in Plan 02).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Clean event type names ready for Plan 02 to remove the activeAgentStack fallback
- All tool-call events should now carry correct parentId linking to their parent agent
- Plan 02 can focus on frontend hierarchy rendering and orphan handling

---
## Self-Check: PASSED

- SUMMARY.md: FOUND
- Commit f052118 (Task 1): FOUND
- Commit b5f4668 (Task 2): FOUND
- Commit d2d66d8 (Task 3): FOUND
- All 5 modified files: FOUND

---
*Phase: 08-trace-hierarchy-fix*
*Completed: 2026-03-02*
