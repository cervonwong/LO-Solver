# Phase 8: Trace Hierarchy Fix - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix parentId emission so all tool-call trace events nest correctly under their parent agent in the trace panel. Remove the activeAgentStack fallback hack. Remove deprecated event types. No new trace event types, no new UI features — pure correctness and cleanup.

</domain>

<decisions>
## Implementation Decisions

### Orphan handling after fix
- Fully strict parentId matching: only nest a tool-call under an agent if parentId exactly matches an agent-start event's id
- No fallback logic of any kind — remove activeAgentStack entirely
- Orphaned tool-calls (missing or unmatched parentId) render at root level of the step group
- Same visual appearance as nested tool-calls — position alone signals the issue
- Emit `console.warn` with tool name and invalid parentId when an orphan is detected in `groupEventsWithAgents`

### Deprecated event cleanup
- Remove both deprecated types: `ToolCallEvent` (old, without id/parentId) and `AgentReasoningEvent` (superseded by agent-start/agent-end pair)
- Drop all `data-agent-reasoning` handling from `trace-utils.ts` (`getRawStepId` case, any grouping logic)
- Remove the `data-agent-reasoning` rendering path from `TraceEventCard`
- Rename `HierarchicalToolCallEvent` → `ToolCallEvent`, `HierarchicalAgentStartEvent` → `AgentStartEvent`, `HierarchicalAgentEndEvent` → `AgentEndEvent` (the "Hierarchical" prefix was only needed to disambiguate from the deprecated types)

### Claude's Discretion
- Root cause diagnosis approach (logging, tracing, code inspection)
- Which backend emitters need fixing and how
- Order of operations for the fix vs cleanup
- Whether to batch rename types in a separate commit or inline with the fix

</decisions>

<specifics>
## Specific Ideas

- The todo at `.planning/todos/pending/2026-03-02-investigate-missing-parentid-on-tool-call-trace-events.md` lists four possible causes to investigate
- `emitToolTraceEvent` in `request-context-helpers.ts:158` already tries to inject parentId from `parent-agent-id` in RequestContext — the issue may be that `parent-agent-id` isn't always set correctly before tool execution

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `emitToolTraceEvent` (`request-context-helpers.ts:158`): Already injects parentId into tool-call events — likely the right place to fix
- `getParentAgentId` helper (`request-context-helpers.ts:137`): Reads `parent-agent-id` from RequestContext
- `generateEventId` (`workflow-events.ts:21`): Generates unique event IDs for linking

### Established Patterns
- Event types defined in `workflow-events.ts` as a discriminated union (`WorkflowTraceEvent`)
- Grouping logic in `trace-utils.ts` with `groupEventsByStep` → `groupEventsWithAgents` pipeline
- RequestContext used for per-execution state sharing between workflow steps and tools
- Tool events emitted via `emitToolTraceEvent` (not `ctx.writer?.custom()` which is a silent no-op)

### Integration Points
- Backend: `workflow.ts` workflow steps emit agent-start/agent-end events
- Backend: Tool files use `emitToolTraceEvent` to emit tool-call events
- Frontend: `trace-utils.ts` groups events; `dev-trace-panel.tsx` and `trace-event-card.tsx` render them
- `request-context-types.ts` defines the `parent-agent-id` and `step-writer` keys

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-trace-hierarchy-fix*
*Context gathered: 2026-03-02*
