---
phase: quick-24
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/dev-trace-panel.tsx
autonomous: true
requirements: [QUICK-24]

must_haves:
  truths:
    - "The panel heading stays visible at the top while scrolling trace content"
    - "Trace events scroll independently within their container"
    - "Layout works in both wide-screen (3-column) and narrow-screen (stacked) modes"
  artifacts:
    - path: "src/components/dev-trace-panel.tsx"
      provides: "Fixed Dev Trace Panel with proper scroll containment"
  key_links:
    - from: "src/components/dev-trace-panel.tsx"
      to: "src/app/page.tsx"
      via: "DevTracePanel rendered inside h-full div (wide) or ResizablePanel (narrow)"
      pattern: "DevTracePanel"
---

<objective>
Fix the Dev Trace Panel so the header stays sticky/fixed at the top while the trace event content scrolls below it.

Purpose: Currently the entire panel (header + content) scrolls together or the scroll containment is broken because the root div uses `flex-1` without a flex parent in the wide-screen layout. The header should remain pinned while events scroll.

Output: A Dev Trace Panel with proper height containment and sticky header.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/dev-trace-panel.tsx
@src/app/page.tsx (lines 755-765 — parent containers for DevTracePanel)
@src/components/vocabulary-panel.tsx (reference — same pattern with panel-heading + ScrollArea)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix DevTracePanel height containment and scroll behavior</name>
  <files>src/components/dev-trace-panel.tsx</files>
  <action>
In `src/components/dev-trace-panel.tsx`, fix the root container and scroll behavior:

1. **Root div (line 63):** Change `className="flex flex-1 flex-col"` to `className="flex h-full flex-col"`. The `h-full` ensures the component fills its parent regardless of whether the parent is a flex container (wide-screen: plain `h-full` div) or a flex child (narrow-screen: ResizablePanel). The `flex-1` alone does nothing when the parent is not a flex container.

2. **ScrollArea (line 85):** Keep `className="min-h-0 flex-1"` as-is — this is correct for a flex child that should take remaining space and allow overflow scrolling.

3. **Verify the same pattern works in the Skeleton and EmptyState early returns** (lines 54-60). The Skeleton return already works (no header). The EmptyState return uses `h-full` and centers content. Both are fine and need no changes.

This matches the pattern used by VocabularyPanel and RulesPanel which both use `flex h-full min-h-[120px] flex-col` on their root divs with `panel-heading` + `ScrollArea` children.

The `panel-heading` class already has `position: relative`, `backdrop-filter: blur(8px)`, and `shrink-0` is on the element via Tailwind — these together with the flex column layout ensure the header stays pinned at the top while ScrollArea handles scrolling below.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>DevTracePanel root div uses `h-full` instead of `flex-1`, ensuring proper height containment in both wide-screen (h-full parent div) and narrow-screen (ResizablePanel parent) layouts. The header stays fixed while content scrolls via the existing ScrollArea.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
- Visual check: Run `npm run dev`, trigger a workflow, confirm the "Lex's Solving Process" header stays pinned while trace events scroll beneath it
</verification>

<success_criteria>
- The panel heading with "Lex's Solving Process" title and event count stays visible at the top of the Dev Trace Panel at all times
- Trace event cards scroll independently within the content area below the header
- Works correctly in both the 3-column wide layout and the stacked narrow layout
</success_criteria>

<output>
After completion, create `.planning/quick/24-fix-dev-trace-panel-scrolling-sticky-hea/24-SUMMARY.md`
</output>
