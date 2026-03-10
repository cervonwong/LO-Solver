# Phase 32: Frontend Cleanup - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract DevTracePanel inline handlers and clean up trace component types. Pure refactoring — zero behavioral changes. The trace panel must render identically before and after.

</domain>

<decisions>
## Implementation Decisions

### Handler extraction scope
- Extract the 1 true inline arrow function in JSX: `RawJsonToggle`'s `onClick` handler in `shared.tsx:40-43`
- `onOpenChange={setOpen}` references (~12 occurrences) are direct state setter references, NOT inline arrow functions — leave as-is
- Inner utility functions (`formatHeaderTimer`, `formatTimer`) stay as component-local functions — they depend on component closure and aren't event handlers
- `flushStandalone` in `EventList` stays as-is — it's algorithmic logic, not a JSX event handler

### Prop interface conventions
- Add named `{ComponentName}Props` interfaces for all ~12 components that currently use inline destructured types
- Colocate each interface directly above its component (standard React pattern)
- Naming convention: `ChevronIconProps`, `EventListProps`, `StepSectionProps` (already exists), `ToolCallDetailProps`, `RenderItemProps`, `AgentCardProps`, `RawJsonToggleProps`, `StructuredOutputSectionProps`, `VocabularyToolCardProps`, `SentenceTestToolCardProps`, `RuleTestCardProps`, `AgentToolCallCardProps`, `BulkToolCallGroupProps`, `ToolCallRendererProps`

### Duplicate cleanup
- Remove duplicate `ChevronIcon` from `dev-trace-panel.tsx:102-115` — `shared.tsx` already exports an identical one
- Add import of `ChevronIcon` from `./trace/shared` in `dev-trace-panel.tsx`

### File organization
- Keep all components in their current files — the `trace/` directory separation is already well-structured
- No component moves between files

### Claude's Discretion
- Exact ordering of interface fields
- Whether to use `type` or `interface` for props (prefer `interface` for consistency with existing `DevTracePanelProps` and `StepSectionProps`)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — straightforward cleanup following established patterns in the codebase.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DevTracePanelProps` and `StepSectionProps` in `dev-trace-panel.tsx` already use named interface pattern — follow this
- `TraceEventCardProps` in `trace-event-card.tsx` — already has a named interface
- `ToolCallGroupCardProps` in `tool-call-cards.tsx` — already has a named interface

### Established Patterns
- Interfaces use `{ComponentName}Props` naming (e.g., `DevTracePanelProps`, `TraceEventCardProps`)
- Props interfaces defined directly above the component that uses them
- All files use `'use client'` directive

### Integration Points
- `ChevronIcon` is imported by `trace-event-card.tsx`, `tool-call-cards.tsx`, `specialized-tools.tsx` from `./shared`
- Removing the duplicate in `dev-trace-panel.tsx` requires adding an import from `./trace/shared`

### Files in scope (5 files, 1,216 lines total)
- `src/components/dev-trace-panel.tsx` (290 lines) — main panel, duplicate ChevronIcon, 2 components with inline types
- `src/components/trace/shared.tsx` (87 lines) — ChevronIcon, RawJsonToggle (inline onClick + inline types), StructuredOutputSection
- `src/components/trace/specialized-tools.tsx` (338 lines) — 5 components with inline types
- `src/components/trace/tool-call-cards.tsx` (266 lines) — 3 components with inline types, AgentCard
- `src/components/trace/trace-event-card.tsx` (143 lines) — already has named interface, no changes needed

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-frontend-cleanup*
*Context gathered: 2026-03-10*
