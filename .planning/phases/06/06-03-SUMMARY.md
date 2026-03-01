---
phase: 06-ui-event-system
plan: 03
subsystem: api
tags: [typescript, events, streaming, workflow, hierarchical-events, mastra]

# Dependency graph
requires:
  - phase: 06-01
    provides: "Hierarchical event types (HierarchicalAgentStartEvent, HierarchicalAgentEndEvent, AgentTextChunkEvent, RuleTestResultEvent) and streamWithRetry function"
provides:
  - Workflow.ts using streamWithRetry for all 10 agent calls with hierarchical event emission
  - Parent-agent-id context threading so tool calls link to their parent agent
  - Real-time text streaming via onTextChunk callbacks on every agent call
  - Rule test result events emitted from rule-tester-tool.ts
  - Trace panel rendering for data-agent-start, data-agent-end, data-rule-test-result events
affects: [06-04, 07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agent call pattern: generateEventId -> agent-start -> set parent-agent-id -> streamWithRetry -> agent-end -> clear parent-agent-id"
    - "Parallel agent calls set parent-agent-id on per-perspective request contexts to avoid race conditions"
    - "Tool events automatically enriched with parentId via emitToolTraceEvent"

key-files:
  created: []
  modified:
    - src/mastra/workflow/workflow.ts
    - src/mastra/workflow/request-context-types.ts
    - src/mastra/workflow/request-context-helpers.ts
    - src/mastra/workflow/agent-utils.ts
    - src/mastra/workflow/03a-rule-tester-tool.ts
    - src/lib/trace-utils.ts
    - src/components/dev-trace-panel.tsx
    - src/components/trace-event-card.tsx
    - src/components/activity-indicator.tsx

key-decisions:
  - "Kept deprecated data-agent-reasoning rendering in trace-event-card.tsx for backward compatibility with any cached/stored events"
  - "Set attempt=1, totalAttempts=1 in agent-end events since streamWithRetry handles retries internally; retry exposure deferred to Phase 7"
  - "Fixed streamWithRetry type constraint to use Agent['generate'] parameter types for structuredOutput compatibility"
  - "Updated activity-indicator.tsx to detect data-agent-start/end events (deviation from plan scope, required for non-regression)"

patterns-established:
  - "Hierarchical agent wrapping: every agent call in workflow.ts follows the generateEventId/agent-start/streamWithRetry/agent-end pattern"
  - "Parent-agent-id threading: set before call, cleared after, tools auto-inherit via emitToolTraceEvent"

requirements-completed: [UI-06]

# Metrics
duration: 15min
completed: 2026-03-01
---

# Phase 06 Plan 03: Hierarchical Event Emission & Workflow Streaming Summary

**Replaced all generateWithRetry calls with streamWithRetry, wrapping each agent call in hierarchical start/end events with parent-agent-id threading for tool linkage**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-01T12:49:44Z
- **Completed:** 2026-03-01T13:04:48Z
- **Tasks:** 4
- **Files modified:** 9

## Accomplishments
- Converted all 10 agent calls in workflow.ts from generateWithRetry to streamWithRetry with real-time text chunk streaming
- Wrapped every agent call with data-agent-start/data-agent-end events carrying unique IDs, step association, and timing
- Added parent-agent-id to RequestContext so tool call events automatically link to their parent agent
- Emitted data-rule-test-result events from the rule tester tool for frontend rules panel consumption
- Updated trace panel, event card, and activity indicator to render new hierarchical event types

## Task Commits

Each task was committed atomically:

1. **Task 1: Add parent-agent-id to RequestContext and update emit helpers** - `e93e500` (feat)
2. **Task 2: Rework workflow.ts to use streamWithRetry and emit hierarchical events** - `a52f0a8` (feat)
3. **Task 3: Emit data-rule-test-result events from rule-tester-tool.ts** - `52dc53b` (feat)
4. **Task 4: Update trace-utils.ts and trace panel for new event types** - `fb21c7a` (feat)

## Files Created/Modified
- `src/mastra/workflow/request-context-types.ts` - Added optional parent-agent-id key to WorkflowRequestContext
- `src/mastra/workflow/request-context-helpers.ts` - Added getParentAgentId helper; updated emitToolTraceEvent to inject id/parentId into tool-call events
- `src/mastra/workflow/agent-utils.ts` - Fixed streamWithRetry type constraint for structuredOutput compatibility
- `src/mastra/workflow/workflow.ts` - Replaced all 10 generateWithRetry with streamWithRetry; added hierarchical agent-start/end events; parent-agent-id threading; text chunk streaming
- `src/mastra/workflow/03a-rule-tester-tool.ts` - Emit data-rule-test-result events after each rule test (success and failure paths)
- `src/lib/trace-utils.ts` - Added data-agent-start, data-agent-end, data-agent-text-chunk, data-rule-test-result to getRawStepId
- `src/components/dev-trace-panel.tsx` - Filter out data-agent-text-chunk events from EventList display
- `src/components/trace-event-card.tsx` - Added rendering for data-agent-start, data-agent-end, data-rule-test-result, data-agent-text-chunk events
- `src/components/activity-indicator.tsx` - Updated to detect data-agent-start/end events for activity display

## Decisions Made
- Kept deprecated data-agent-reasoning rendering in trace-event-card.tsx for backward compatibility with cached/stored event data
- Set attempt=1, totalAttempts=1 in all agent-end events since streamWithRetry handles retries internally and doesn't expose retry count yet; Phase 7 will add retry tracking
- Fixed streamWithRetry type constraint by using Agent['generate'] parameter types instead of Agent['stream'] to work with structuredOutput overloads
- Updated activity-indicator.tsx to handle new event types (not in plan scope, but required to avoid visual regression)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed streamWithRetry type constraint for structuredOutput**
- **Found during:** Task 2
- **Issue:** streamWithRetry's TOptions generic constraint using `Parameters<Agent['stream']>[1]` resolved to an overload where structuredOutput was undefined, causing type errors at all call sites
- **Fix:** Changed constraint to `Parameters<Agent['generate']>[1]` and used `as Parameters<Agent['stream']>[1]` cast in the stream call body
- **Files modified:** src/mastra/workflow/agent-utils.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** a52f0a8 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Updated activity-indicator.tsx for new event types**
- **Found during:** Task 4
- **Issue:** activity-indicator.tsx only detected data-agent-reasoning events for showing active agent name; with the new event types, it would show "Starting..." instead of the actual agent name
- **Fix:** Added data-agent-start and data-agent-end to the activity detection logic
- **Files modified:** src/components/activity-indicator.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** fb21c7a (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All agent calls now emit hierarchical events with id/parentId for future nested trace display (Phase 7)
- Tool calls automatically linked to parent agents via request context
- Real-time text streaming wired and ready for frontend consumption (Phase 7 live reasoning display)
- Plan 06-04 can proceed to integrate the remaining frontend components (page.tsx prop update, vocabulary panel)

## Self-Check: PASSED

All 9 modified files exist. All 4 task commits (e93e500, a52f0a8, 52dc53b, fb21c7a) verified in git log.

---
*Phase: 06-ui-event-system*
*Completed: 2026-03-01*
