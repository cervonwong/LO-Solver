# Phase 7: Hierarchical Trace Display & Results - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Render agent/tool hierarchy in the trace panel with custom-fitted tool displays, and present final results with clear formatting. Requirements UI-03, UI-04, UI-05. Does not add new event types or modify the workflow pipeline — purely frontend rendering of existing hierarchical event data.

</domain>

<decisions>
## Implementation Decisions

### Custom Tool Displays (UI-04)
- **Vocabulary tools** (add/update/remove): Show entry summary line (foreign form -> meaning [type]) with action badge (ADD/UPDATE/REMOVE). For updates, show diff (old -> new). For remove, show deleted entry struck through.
- **Sentence test tools** (testSentenceWithRuleset): Compact display — PASS/FAIL badge + sentence ID. Expand for full details (expected vs actual, rules applied).
- **Rule test tools**: Already have `RuleTestCard` with PASS/FAIL + reasoning — keep as-is.
- **Other tools**: Keep generic JSON display. Don't add custom renderers until explicitly needed.
- **Raw JSON toggle**: Every custom tool display includes a small per-tool-call "{...}" button to toggle between custom view and raw JSON. Developer can always see full data — nothing is hidden.
- **Bulk tool calls**: When an agent has many calls of the same type (e.g., 10+ rule tests), group them under a summary header showing count and pass/fail breakdown (e.g., "Rule Tests (12): 10 pass, 2 fail"). Expand to see individual results.
- **Bulk vocabulary**: Show "Added 5 entries" summary with expand to see full list.

### Results Presentation (UI-05)
- **Summary bar**: Show overall summary header at top of results (total answers, confidence breakdown).
- **Rule tags per answer**: Show small clickable chips/tags for each rule applied to produce an answer, displayed under the answer text in the collapsed view.
- **Cross-linking**: Clicking a rule tag switches to the Rules tab and scrolls to/highlights that rule.
- **Working steps**: Render as markdown (using Streamdown, which is already in the codebase) instead of plain text.
- **rulesApplied field**: Modify the answer agent's output schema to include an array of rule titles per answer. This provides real data for the rule tags.
- **Auto-scroll to results**: When solve completes, smoothly scroll the results panel into view.

### Hierarchy Nesting Style (UI-03)
- **Visual nesting**: Indentation + colored left border for each nesting level. Agent = one indent level, tool calls inside = two indent levels. Sub-agents indent further inside their parent.
- **Unlimited nesting depth**: Accurately represent the actual call tree — sub-agents render inside their parent agents at increasing indent levels.
- **Border colors**: Semantic, not depth-based. Colors depend on what the agent/tool does (existing trace-agent, trace-tool colors), not where it sits in the nesting tree.
- **Agent header badge**: Show tool call count in collapsed agent header (e.g., "8 tool calls").

### Trace Density & Defaults
- **Auto-expand active step only**: Currently-running step expands. Completed steps auto-collapse when the next step starts. Focus stays on what's happening now.
- **Auto-scroll to latest**: Trace auto-scrolls to follow new events. Stops auto-scrolling if user scrolls up manually; resumes when user scrolls back to bottom.
- **Agent inline summary**: Completed agents show a one-line summary in the collapsed header describing what they accomplished (e.g., "6 rules tested, 1 failed").
- **Step section summary**: Completed step headers show a brief outcome summary. Only reflect the primary purpose of the step — filter out incidental tool calls that don't represent the step's core activity.

### Claude's Discretion
- Specific CSS indent amounts and spacing values
- Exact animation timing for auto-collapse/expand transitions
- How to generate agent inline summaries (which data to extract per agent type)
- Step summary text generation logic (what constitutes "primary purpose" tools per step)
- Auto-scroll implementation approach (IntersectionObserver vs scroll position tracking)
- Semantic border color assignments per tool/agent type

</decisions>

<specifics>
## Specific Ideas

- Raw JSON toggle should be unobtrusive — small "{...}" icon button, not a prominent toggle
- Rule tag cross-linking should feel like navigating between related items (smooth scroll + brief highlight)
- Agent summaries should be genuinely informative, not just "completed successfully" — show what happened (test counts, entries modified, etc.)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AgentCard` (`trace-event-card.tsx`): Already groups agent-start + tool-calls + agent-end. Has `RuleTestCard` for rule tests and `AgentToolCallCard` for generic tools. Extend with new custom renderers.
- `groupEventsWithAgents()` (`trace-utils.ts`): Already produces `AgentGroup` objects with `agentStart`, `agentEnd`, `toolCalls`, `isActive`. Foundation for hierarchy rendering.
- `Streamdown` + `@streamdown/code`: Already used for markdown rendering in trace cards. Reuse for working steps in results panel.
- `Collapsible` (shadcn/ui): Used extensively for expand/collapse. Available for new nested displays.
- `Badge` (shadcn/ui): Used for status badges (PASS/FAIL, TOOL, VOCAB, etc.). Available for rule tags and action badges.
- `ResultsPanel` (`results-panel.tsx`): Has Answers/Rules tabs with confidence badges. Extend with summary bar, rule tags, markdown working steps.
- `formatDuration()` (`trace-utils.ts`): Duration formatting helper, reuse for summary displays.

### Established Patterns
- Left border color coding: `border-l-trace-agent` (blue), `border-l-trace-tool` (orange), `border-l-status-success/error/warning` for status. Extend semantically.
- Event type discrimination: Large switch statement in `TraceEventCard` handles each event type. Custom renderers follow this pattern.
- Two-pass grouping: `groupEventsWithAgents()` first, then `groupEventsWithToolCalls()` for standalone events. Hierarchy extends this pattern.

### Integration Points
- `src/mastra/workflow/workflow-schemas.ts`: Answer schema needs `rulesApplied` field added
- `src/mastra/workflow/04-answer-*`: Answer agent instructions/schema need update for rulesApplied output
- `src/app/page.tsx`: Main page manages events, results, scroll behavior. Auto-scroll and auto-collapse logic lives here.
- `src/components/dev-trace-panel.tsx`: `StepSection` manages expand/collapse per step. Auto-collapse logic added here.
- `src/components/trace-event-card.tsx`: Custom renderers added alongside existing `RuleTestCard` and `AgentToolCallCard`.
- `src/components/results-panel.tsx`: Summary bar, rule tags, markdown working steps, cross-linking added here.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07*
*Context gathered: 2026-03-02*
