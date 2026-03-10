# Phase 32: Frontend Cleanup - Research

**Researched:** 2026-03-10
**Domain:** React/TypeScript component refactoring (inline types and handlers)
**Confidence:** HIGH

## Summary

This phase is a pure mechanical refactoring of 5 React component files in the trace panel UI. The work has two axes: (1) extracting the single true inline arrow function in JSX event handler props (`RawJsonToggle`'s `onClick` in `shared.tsx:40-43`), and (2) adding named `{ComponentName}Props` interfaces for ~12 components that currently use inline destructured prop types.

A secondary cleanup removes the duplicate `ChevronIcon` component from `dev-trace-panel.tsx` (lines 102-115), which is already exported identically from `shared.tsx`.

The CONTEXT.md from the discuss phase is extremely prescriptive -- it names every component, every file, and the exact convention to follow. There are no technical unknowns. The existing codebase already has 4 components with named prop interfaces (`DevTracePanelProps`, `StepSectionProps`, `TraceEventCardProps`, `ToolCallGroupCardProps`) that serve as the pattern to replicate.

**Primary recommendation:** Follow the CONTEXT.md decisions exactly -- this is a straightforward apply-the-pattern refactoring with zero ambiguity.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Extract the 1 true inline arrow function in JSX: `RawJsonToggle`'s `onClick` handler in `shared.tsx:40-43`
- `onOpenChange={setOpen}` references (~12 occurrences) are direct state setter references, NOT inline arrow functions -- leave as-is
- Inner utility functions (`formatHeaderTimer`, `formatTimer`) stay as component-local functions -- they depend on component closure and aren't event handlers
- `flushStandalone` in `EventList` stays as-is -- it's algorithmic logic, not a JSX event handler
- Add named `{ComponentName}Props` interfaces for all ~12 components that currently use inline destructured types
- Colocate each interface directly above its component (standard React pattern)
- Naming convention: `ChevronIconProps`, `EventListProps`, `StepSectionProps` (already exists), `ToolCallDetailProps`, `RenderItemProps`, `AgentCardProps`, `RawJsonToggleProps`, `StructuredOutputSectionProps`, `VocabularyToolCardProps`, `SentenceTestToolCardProps`, `RuleTestCardProps`, `AgentToolCallCardProps`, `BulkToolCallGroupProps`, `ToolCallRendererProps`
- Remove duplicate `ChevronIcon` from `dev-trace-panel.tsx:102-115` -- `shared.tsx` already exports an identical one
- Add import of `ChevronIcon` from `./trace/shared` in `dev-trace-panel.tsx`
- Keep all components in their current files -- no component moves between files

### Claude's Discretion
- Exact ordering of interface fields
- Whether to use `type` or `interface` for props (prefer `interface` for consistency with existing `DevTracePanelProps` and `StepSectionProps`)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FE-01 | DevTracePanel inline event handlers extracted to named functions | Only 1 true inline handler found: `RawJsonToggle` onClick in `shared.tsx:40-43`. All `onOpenChange={setOpen}` are direct setter refs (not inline arrows). Extraction is straightforward. |
| FE-02 | Component naming and prop types cleaned up in trace components | 12 components need named prop interfaces. 4 already have them as pattern exemplars. Duplicate `ChevronIcon` to be removed. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | Component framework | Already in use |
| TypeScript | 5.x | Type system for prop interfaces | Already in use |
| Next.js | 15.x | App framework | Already in use |

No new libraries needed. This is purely a code organization refactoring.

## Architecture Patterns

### Existing Pattern to Replicate

The codebase already has 4 exemplar components with named prop interfaces:

```typescript
// Pattern: interface directly above component, {ComponentName}Props naming
interface DevTracePanelProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function DevTracePanel({ events, isRunning }: DevTracePanelProps) {
  // ...
}
```

This pattern exists in:
- `dev-trace-panel.tsx`: `DevTracePanelProps`, `StepSectionProps`
- `trace-event-card.tsx`: `TraceEventCardProps`
- `tool-call-cards.tsx`: `ToolCallGroupCardProps`

### Handler Extraction Pattern

The single inline handler to extract:

**Before (shared.tsx:39-43):**
```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    setShowRaw(!showRaw);
  }}
>
```

**After:**
```typescript
const handleToggleRaw = (e: React.MouseEvent) => {
  e.stopPropagation();
  setShowRaw(!showRaw);
};

// ...
<button onClick={handleToggleRaw}>
```

The handler uses `useCallback` only if the function is passed as a prop to memoized children. Here it is used directly in a `<button>` element's onClick -- `useCallback` is unnecessary. A simple `const` assignment inside the component is sufficient.

### Anti-Patterns to Avoid
- **Wrapping `setOpen` in arrow functions:** `onOpenChange={setOpen}` is already optimal -- do not extract these to named handlers. Direct state setter references are idiomatic React.
- **Over-extracting utility functions:** `formatHeaderTimer`, `formatTimer`, `flushStandalone` are component-internal logic, not JSX event handlers. Leave them as-is.
- **Moving components between files:** The current file organization is well-structured. The refactoring is within-file only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| N/A | N/A | N/A | No libraries or complex solutions needed for this refactoring |

This phase is pure mechanical code cleanup -- no "deceptively complex" problems to solve.

## Common Pitfalls

### Pitfall 1: Breaking the ChevronIcon Import Chain
**What goes wrong:** Removing the duplicate `ChevronIcon` from `dev-trace-panel.tsx` without adding the import causes a build error.
**Why it happens:** `StepSection` in `dev-trace-panel.tsx` uses `ChevronIcon` on line 210.
**How to avoid:** Add `import { ChevronIcon } from './trace/shared'` to `dev-trace-panel.tsx` in the same commit as the deletion.
**Warning signs:** `npx tsc --noEmit` will catch this immediately.

### Pitfall 2: Inline Types That Reference Complex Nested Shapes
**What goes wrong:** Some inline prop types in `specialized-tools.tsx` have nested object shapes (e.g., `toolCall: { data: { toolName: string; input: Record<string, unknown>; result: Record<string, unknown> } }`). Extracting these to interfaces must preserve the exact shape.
**Why it happens:** Components like `VocabularyToolCard`, `SentenceTestToolCard`, `RuleTestCard`, and `AgentToolCallCard` accept a `toolCall` prop with an inline nested type rather than using the `ToolCallEvent` type from `workflow-events.ts`.
**How to avoid:** The existing `ToolCallEvent` type from `@/lib/workflow-events` already matches these shapes. The new interfaces can reference `ToolCallEvent` or a `Pick` of it, but the CONTEXT.md decision is to add prop interfaces (not restructure the type hierarchy), so the simplest approach is to type the prop as what it currently accepts.
**Warning signs:** `npx tsc --noEmit` will catch any type mismatches.

### Pitfall 3: Subtle Differences in Duplicate ChevronIcon
**What goes wrong:** The two `ChevronIcon` components look identical but have a subtle CSS difference -- the one in `dev-trace-panel.tsx` (line 110) includes `text-muted-foreground` in its className, while the exported one in `shared.tsx` does not.
**Why it happens:** They were created at different times.
**How to avoid:** After removing the duplicate, verify that `StepSection` still renders correctly. The `text-muted-foreground` class may need to be applied at the call site or the shared version updated to match. Check both usages.
**Warning signs:** Visual regression in the step section chevron color.

## Code Examples

### Prop Interface Extraction (from inline to named)

**Before (`EventList` in dev-trace-panel.tsx:224-230):**
```typescript
function EventList({
  events,
  isStepActive,
}: {
  events: WorkflowTraceEvent[];
  isStepActive: boolean;
}) {
```

**After:**
```typescript
interface EventListProps {
  events: WorkflowTraceEvent[];
  isStepActive: boolean;
}

function EventList({ events, isStepActive }: EventListProps) {
```

### Complete Inventory of Changes by File

**`src/components/dev-trace-panel.tsx` (290 lines):**
1. Remove duplicate `ChevronIcon` (lines 102-115)
2. Add import `{ ChevronIcon }` from `./trace/shared`
3. Add `EventListProps` interface for `EventList` component (line 224)

**`src/components/trace/shared.tsx` (87 lines):**
1. Add `ChevronIconProps` interface for `ChevronIcon` (line 13)
2. Add `RawJsonToggleProps` interface for `RawJsonToggle` (line 28)
3. Extract inline `onClick` handler to named `handleToggleRaw` function (line 40-43)
4. Add `StructuredOutputSectionProps` interface for `StructuredOutputSection` (line 67)

**`src/components/trace/specialized-tools.tsx` (338 lines):**
1. Add `VocabularyToolCardProps` interface for `VocabularyToolCard` (line 19)
2. Add `SentenceTestToolCardProps` interface for `SentenceTestToolCard` (line 126)
3. Add `BulkToolCallGroupProps` interface for `BulkToolCallGroup` (line 180)
4. Add `RuleTestCardProps` interface for `RuleTestCard` (line 231)
5. Add `ToolCallRendererProps` interface for `ToolCallRenderer` (line 279)
6. Add `AgentToolCallCardProps` interface for `AgentToolCallCard` (line 303)

**`src/components/trace/tool-call-cards.tsx` (266 lines):**
1. Add `ToolCallDetailProps` interface for `ToolCallDetail` (line 54)
2. Add `RenderItemProps` interface for `RenderItem` (line 85)
3. Add `AgentCardProps` interface for `AgentCard` (line 118)

**`src/components/trace/trace-event-card.tsx` (143 lines):**
No changes needed -- already has `TraceEventCardProps` named interface.

## State of the Art

Not applicable -- this is a mechanical refactoring following established React/TypeScript conventions that have been stable for years.

## Open Questions

1. **ChevronIcon CSS difference**
   - What we know: The duplicate in `dev-trace-panel.tsx` has `text-muted-foreground` in its className; the one in `shared.tsx` does not.
   - What's unclear: Whether this causes a visible difference when the duplicate is removed.
   - Recommendation: After removing the duplicate, either add `text-muted-foreground` to the shared version (if all call sites want it) or add it at the call site in `StepSection`. Check all 4 import sites: `trace-event-card.tsx`, `tool-call-cards.tsx`, `specialized-tools.tsx`, and now `dev-trace-panel.tsx`.

## Sources

### Primary (HIGH confidence)
- Direct source code inspection of all 5 files in scope
- Existing named interface patterns in the codebase (`DevTracePanelProps`, `StepSectionProps`, `TraceEventCardProps`, `ToolCallGroupCardProps`)
- CONTEXT.md from discuss phase (extremely detailed, names every component and change)

### Secondary (MEDIUM confidence)
- None needed -- all findings are from direct code inspection

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, purely internal refactoring
- Architecture: HIGH - pattern already exists in codebase, just replicating it
- Pitfalls: HIGH - identified from direct code comparison (ChevronIcon CSS diff is the only non-trivial finding)

**Research date:** 2026-03-10
**Valid until:** indefinite (stable refactoring patterns, codebase-specific findings)
