# Phase 10: Structured Data Formatting - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform raw JSON displays in the trace panel into human-readable labeled lists. Applies to generic tool call I/O and agent structured output. Existing custom renderers (vocabulary, rule test, sentence test) are already human-readable and stay as-is. Each formatted display retains a toggle to view original raw JSON.

</domain>

<decisions>
## Implementation Decisions

### Labeled list layout
- Stacked rows: each key-value pair on its own line, label left-aligned, value to the right
- Labels in muted-foreground text, values in regular foreground
- Keep bold "Input:" and "Result:" section headers separating tool input from output
- Label column width auto-sized per section (adjusts to longest label in that section)

### Nested/complex values
- Nested objects: indent sub-keys under the parent key (tree-like structure, up to 2 levels)
- Beyond 2 levels of nesting, fall back to compact raw JSON string
- Arrays: numbered items, one per line; object items in arrays get the indented sub-key treatment
- Long string values: always show full text, no truncation — values wrap naturally

### Which data gets formatted
- Generic tool calls only: replace raw JSON in AgentToolCallCard and ToolCallDetail (the fallback renderers)
- Custom renderers (VocabularyToolCard, RuleTestCard, SentenceTestToolCard) are NOT modified — they already have purpose-built displays
- Agent structured output: add a new "Structured Output" section below reasoning in agent cards, formatted as a labeled list
- Agent structured output section is collapsed by default (chevron to expand)
- Step-level events stay as-is — no output display added to step-complete events
- Tool calls and agent results are the full scope; step events out of scope

### Claude's Discretion
- Toggle behavior details (RawJsonToggle already exists and works; keep current default-to-formatted, toggle-to-raw pattern)
- Exact spacing, padding, and indentation pixel values
- How to handle edge cases (empty objects, null values, very large arrays)
- Whether agent-end events currently carry structured output data or need backend changes

</decisions>

<specifics>
## Specific Ideas

- Visual style should match the existing stacked label pattern used in SentenceTestToolCard ("Expected: ...", "Actual: ...")
- The "Task:" prefix in agent cards (muted label, normal value) is the reference pattern for label styling

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RawJsonToggle` component: already handles custom view vs raw JSON with `{...}` button — reuse directly
- `jsonMarkdown()` helper: current raw JSON rendering via Streamdown — this is what gets replaced in generic fallback
- `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`: used throughout for expandable sections
- `ChevronIcon`: reusable expand/collapse indicator
- `TRACE_SD_CLASS`: shared font sizing class for trace panel content

### Established Patterns
- Custom tool renderers follow a consistent pattern: detect tool type in `ToolCallRenderer`, delegate to specialized component
- `AgentToolCallCard` is the generic fallback — this is the primary target for labeled list replacement
- `ToolCallDetail` (inside `ToolCallGroupCard`) also renders raw JSON — secondary target
- Agent cards already have a "Reasoning" section with its own collapsible; structured output would follow the same pattern

### Integration Points
- `ToolCallRenderer` function routes tool calls to renderers — generic fallback returns `AgentToolCallCard`
- `AgentCard` component renders agent-end data — structured output section would be added alongside reasoning
- `ToolCallDetail` renders individual calls within grouped tool calls — needs same labeled list treatment
- `trace-event-card.tsx` is the single file containing all relevant components

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-structured-data-formatting*
*Context gathered: 2026-03-03*
