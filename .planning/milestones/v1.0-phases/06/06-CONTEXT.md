# Phase 6: UI Event System & Rules Panel - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the hierarchical event streaming infrastructure and add a live-updating rules panel alongside the existing vocabulary panel. This phase delivers the event model and rules display; custom-fitted tool displays and hierarchical trace rendering are Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Rules Panel Placement
- Stacked layout on the right side: Trace (top) → Vocabulary (middle) → Rules (bottom)
- Each panel is individually resizable with drag handles (using existing `ResizablePanelGroup`)
- Both vocabulary and rules panels are collapsible to a thin header bar, giving more trace space when needed
- Vocabulary and rules panels are hidden until the solver starts running; full right side is available for empty state before that

### Hierarchical Event Model
- Explicit parent IDs for nesting: each event gets a unique `id`, child events include `parentId` referencing their parent
- Unlimited nesting depth supported (agent → tool → sub-agent → tool chains)
- Replace existing flat events (`AgentReasoningEvent`, `ToolCallEvent`) with new hierarchical event types — no backwards compatibility layer
- Events carry rich inline data (full tool input/output objects, agent reasoning text)
- Agent-start events include: agent name, model, stepId, and the task/prompt given to the agent
- Stream agent reasoning text in real-time — rework `generateWithRetry` to use `agent.stream()` instead of `agent.generate()`
- Retry visibility: default view shows the current/successful attempt; a small retry icon (with count badge) opens a popover showing previous failed attempts and their error reasons

### Rules Display Format
- Table layout with columns: # (ordinal) | Title | Description (truncated) | Confidence badge
- Rows are expandable — clicking a row reveals the full description below it
- Each rule shows a pass/fail test status indicator (green checkmark for passing, red X for failing, neutral for untested)
- Test status comes from a separate `data-rule-test-result` event type (not enriched into `RulesUpdateEvent`), keeping rule content and test results modular

### Live Update Behavior
- New rules: slide-in animation with a brief highlight color that fades
- Removed rules: strikethrough animation followed by fade out
- Updated rules: highlight flash in a distinct color to signal the change
- Rolling activity chips in the panel header: max 3 chips visible at once, oldest chip fades out as newest animates in (e.g., "+2 added", "1 updated"). This replaces the current cumulative mutation summary badges
- Rolling activity chip pattern applies to both vocabulary and rules panels (update vocab panel to match)
- Bulk clear: all rules fade out together with a "Rules cleared" activity chip
- No auto-scroll for the rules panel — user scrolls manually

### Claude's Discretion
- Exact animation durations and easing curves
- Activity chip fade timing and layout details
- How to generate unique event IDs (UUID vs incrementing counter)
- Exact field names and TypeScript types for new hierarchical events
- How to handle the streaming rework for `generateWithRetry` — whether to create a new `streamWithRetry` function or modify the existing one
- Retry popover component design and positioning

</decisions>

<specifics>
## Specific Ideas

- Mutation badges should be a rolling feed, not cumulative totals — "I don't know when it was added" was the feedback on cumulative badges
- User wants to see the task/prompt that's passed to each agent in its initial prompt — this helps understand what each agent is working on
- For Phase 7 context: user wants custom UI for agent outputs including statement counts, rule testing input/output, hypothesizer inputs, sentence tester results — noted for Phase 7 planning

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VocabularyPanel` (`src/components/vocabulary-panel.tsx`): Exact pattern to follow for rules panel — table layout, ScrollArea, mutation badges, empty state, `frosted` class styling
- `ResultsPanel` (`src/components/results-panel.tsx`): Already has a collapsible rules display with confidence badges — can inform the expandable row design
- `RulesUpdateEvent` (`src/lib/workflow-events.ts`): Already defined and emitted from `rules-tools.ts` with add/update/remove/clear actions, title, description, optional confidence
- shadcn/ui Tabs component: Already available and used in ResultsPanel
- shadcn/ui Collapsible component: Used for expandable sections throughout the app
- `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle`: Already used for the main layout split, ready for additional nesting
- `slide-in-row` animation class: Already exists in globals.css for vocabulary panel entries

### Established Patterns
- Event streaming: Workflow steps emit typed events via `writer.write()` on the step's ToolStream. Tools use `emitToolTraceEvent` helper via step-writer in RequestContext
- `generateWithRetry` (`agent-utils.ts`): All LLM calls go through this wrapper — uses `agent.generate()` (not streaming). Switching to `agent.stream()` is the main infrastructure change
- Event parsing: `page.tsx` filters `allParts` by event type strings, accumulates state (vocabulary Map, trace events array)
- `trace-utils.ts`: Groups events by step, collapses consecutive tool calls — will need updating for hierarchical model

### Integration Points
- `page.tsx` right panel layout: Currently `ResizablePanelGroup(vertical)` with Trace (70%) and Vocabulary (30%). Needs to become three-panel: Trace + Vocabulary + Rules
- `workflow-events.ts`: New hierarchical event types need to be added here (agent-start, agent-end, tool-call with parentId, rule-test-result)
- `request-context-helpers.ts`: `emitTraceEvent` and `emitToolTraceEvent` will need to support the new event types with ID/parentId
- Backend workflow steps: Each step that calls agents will need to emit agent-start/agent-end events and pass parent context to tools

</code_context>

<deferred>
## Deferred Ideas

- Custom-fitted tool displays (testRule showing pass/fail + failing sentences, vocabulary tools showing entries being modified, sentence tester showing I/O) — Phase 7 (UI-04)
- Hierarchical trace rendering (tool calls nested under agents in collapsible tree view) — Phase 7 (UI-03)
- Per-agent output details (statement counts, hypothesizer inputs, testing summaries) — Phase 7 (UI-04)
- Final results formatting with answers, confidence, working steps, and applied rules — Phase 7 (UI-05)

</deferred>

---

*Phase: 06*
*Context gathered: 2026-03-01*
