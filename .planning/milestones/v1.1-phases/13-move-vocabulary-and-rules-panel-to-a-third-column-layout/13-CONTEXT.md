# Phase 13: Move vocabulary and rules panel to a third column layout - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the solver page from a 2-column to a 3-column layout, giving vocabulary and rules their own dedicated column separate from the trace panel. The third column appears when the workflow starts and collapses back on narrow screens.

</domain>

<decisions>
## Implementation Decisions

### Column proportions
- **Idle state (before workflow starts):** ~50/50 split — wider input panel on left, trace on right. Current 35/65 split gives too much space to the empty trace.
- **Active state (after workflow starts):** Animated transition to ~20% / 50% / 30% (input | trace | vocab+rules). Input panel shrinks, trace gets the middle, vocab/rules get a dedicated third column.
- All 3 columns resizable with drag handles — two vertical `ResizableHandle` elements between the 3 panels, consistent with the existing pattern.

### Third column visibility
- Third column does NOT exist on page load — starts as a 2-column layout.
- When the workflow starts (`hasStarted` becomes true), the third column appears with a gradual animated transition, shifting proportions from 50/50 to 20/50/30.
- Vocabulary and rules panels move from stacked in the right panel to their own dedicated third column.

### Responsive collapse
- Below 1024px (`lg` breakpoint), the third column collapses and vocab/rules fold back into the right panel as vertically stacked sections (matching the current layout behavior).
- Collapse/expand on window resize is an **instant snap** — no animation during window resizing.
- The animated transition is reserved for the one-time workflow-start event only.

### Claude's Discretion
- Exact minimum panel widths for each column
- How the animated transition is implemented (CSS transition, framer-motion, or ResizablePanel API)
- Vocabulary/rules stacking order and resize handle behavior in the third column (current pattern of vertical stack with resizable handles between them is the baseline)
- Content assignment details — whether left column content changes or stays the same

</decisions>

<specifics>
## Specific Ideas

- The workflow-start transition should feel gradual and intentional — the third column "slides in" and the left panel compresses, not an abrupt jump.
- Before the workflow starts, the wider input panel gives users more room to read/paste their problem text.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` from `@/components/ui/resizable` — already used for the 2-column and vertical splits
- `VocabularyPanel` (`vocabulary-panel.tsx`) — self-contained with own header, scroll area, activity chips
- `RulesPanel` (`rules-panel.tsx`) — self-contained with own header, scroll area, activity chips, expandable rows
- `hasStarted` state already tracks workflow start in `page.tsx`

### Established Patterns
- Vertical stacking with `ResizablePanelGroup orientation="vertical"` inside the right panel — vocab and rules already use this
- Conditional rendering with `hasStarted &&` for vocab/rules panels
- `defaultSize` and `minSize` percentage props on `ResizablePanel`
- `ScrollArea` wrapper for scrollable panel content
- `frosted` class on panel containers

### Integration Points
- `src/app/page.tsx` lines 594-775 — the entire layout JSX that needs restructuring
- The outer `ResizablePanelGroup orientation="horizontal"` wraps all columns
- Vocab/rules are currently nested inside the right panel's vertical `ResizablePanelGroup`
- `handleRuleClick` cross-links from results panel to rules panel — this stays within the same page, just different column positions

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-move-vocabulary-and-rules-panel-to-a-third-column-layout*
*Context gathered: 2026-03-02*
