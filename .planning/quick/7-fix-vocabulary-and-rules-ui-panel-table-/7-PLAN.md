---
phase: quick-7
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/vocabulary-panel.tsx
  - src/components/rules-panel.tsx
autonomous: false
requirements: []

must_haves:
  truths:
    - "Vocabulary table scrolls horizontally when columns overflow the panel width"
    - "Rules table scrolls horizontally when columns overflow the panel width"
    - "Vertical scrolling still works for both panels when rows overflow"
  artifacts:
    - path: "src/components/vocabulary-panel.tsx"
      provides: "Vocabulary panel with working horizontal scroll"
    - path: "src/components/rules-panel.tsx"
      provides: "Rules panel with working horizontal scroll"
  key_links:
    - from: "ScrollArea"
      to: "Table"
      via: "ScrollBar orientation=horizontal added to ScrollArea"
---

<objective>
Fix horizontal scrolling in the vocabulary and rules panel tables.

Purpose: Quick task 2 added `overflow-x-auto` wrapper divs but horizontal scrolling still does not work because two issues compound:
1. The Radix `ScrollArea` Viewport captures overflow, but only a vertical `ScrollBar` is rendered -- no horizontal scrollbar exists for the user to scroll with.
2. The `Table` component (shadcn) itself renders a wrapper `<div className="relative w-full overflow-x-auto">` around the `<table className="w-full">`. With `w-full` on the table, the table collapses to fit its container rather than overflowing. So there is nothing to scroll.

Output: Both panels scroll horizontally via Radix horizontal scrollbar when the panel is narrow.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@./DESIGN.md
@src/components/vocabulary-panel.tsx
@src/components/rules-panel.tsx
@src/components/ui/scroll-area.tsx
@src/components/ui/table.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix horizontal scrolling in vocabulary and rules panels</name>
  <files>src/components/vocabulary-panel.tsx, src/components/rules-panel.tsx</files>
  <action>
The root cause has two parts:

**Part A: No horizontal scrollbar.** The `ScrollArea` component only renders `<ScrollBar />` which defaults to `orientation="vertical"`. The Radix ScrollArea Viewport captures overflow in both directions, but without a horizontal ScrollBar the user cannot scroll sideways. Import `ScrollBar` from `@/components/ui/scroll-area` and add `<ScrollBar orientation="horizontal" />` as a sibling to the existing content inside ScrollArea.

**Part B: Table never overflows.** The shadcn `Table` component wraps `<table>` in `<div className="relative w-full overflow-x-auto">` and the table itself has `w-full`. This means the table always shrinks to fit its container -- it never becomes wider than the container, so there is nothing to scroll. Remove the redundant `<div className="overflow-x-auto">` wrapper that quick task 2 added (it is doubly redundant with the one already inside Table). Then pass `className="min-w-[600px]"` to the `<Table>` component in vocabulary-panel.tsx and `className="min-w-[700px]"` to the `<Table>` in rules-panel.tsx (rules has 5 columns vs 4). This `min-w-*` class goes on the `<table>` element itself (Table passes className to the table tag), ensuring the table maintains a minimum width that forces horizontal overflow when the panel is narrow.

**Changes to vocabulary-panel.tsx:**
1. Update import: `import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';`
2. Remove the `<div className="overflow-x-auto">` wrapper around `<Table>` (lines 57, 90)
3. Add `className="min-w-[600px]"` to the `<Table>` component
4. Add `<ScrollBar orientation="horizontal" />` inside the `<ScrollArea>` as a direct child, after the conditional content block (before the closing `</ScrollArea>` tag)

**Changes to rules-panel.tsx:**
1. Update import: `import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';`
2. Remove the `<div className="overflow-x-auto">` wrapper around `<Table>` (lines 125, 203)
3. Add `className="min-w-[700px]"` to the `<Table>` component
4. Add `<ScrollBar orientation="horizontal" />` inside the `<ScrollArea>` as a direct child, after the conditional content block (before the closing `</ScrollArea>` tag)
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>
Both panels import ScrollBar, render a horizontal ScrollBar inside ScrollArea, the redundant overflow-x-auto wrapper divs are removed, and Tables have min-w classes that force horizontal overflow when the panel is narrower than the min-width. Type check passes.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify horizontal scrolling works visually</name>
  <action>
    User verifies horizontal scrolling works in both panels.
  </action>
  <what-built>Horizontal scrolling for vocabulary and rules panel tables via Radix ScrollArea horizontal scrollbar and table min-width constraints.</what-built>
  <how-to-verify>
    1. Run `npm run dev` and open http://localhost:3000
    2. Start a solve run (or use an existing one with vocabulary/rules populated)
    3. Resize the right-side vocab/rules panel to be narrow (drag the resize handle left)
    4. Verify the vocabulary table has a horizontal scrollbar at the bottom and can be scrolled left/right
    5. Verify the rules table has a horizontal scrollbar at the bottom and can be scrolled left/right
    6. Verify vertical scrolling still works when there are many rows
    7. Verify the tables look normal at full/wide panel width (no unnecessary scrollbar when content fits)
  </how-to-verify>
  <verify>User confirms horizontal scrolling works</verify>
  <done>Both vocabulary and rules tables scroll horizontally when panel is narrow</done>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring the pre-existing globals.css error)
- Visual: Both tables scroll horizontally when panel is narrow
- Visual: Vertical scrolling still works for both panels
</verification>

<success_criteria>
- Vocabulary panel table scrolls horizontally when panel width is less than 600px
- Rules panel table scrolls horizontally when panel width is less than 700px
- Both panels retain vertical scrolling behavior
- No TypeScript errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-vocabulary-and-rules-ui-panel-table-/7-SUMMARY.md`
</output>
