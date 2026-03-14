---
phase: quick-2
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/vocabulary-panel.tsx
  - src/components/rules-panel.tsx
  - .planning/STATE.md
  - .planning/todos/pending/2026-03-14-make-vocab-and-rules-table-horizontally-scrollable.md
autonomous: true
must_haves:
  truths:
    - "Vocabulary table scrolls horizontally when content overflows its container"
    - "Rules table scrolls horizontally when content overflows its container"
    - "Completed todo is removed from pending todos"
  artifacts:
    - path: "src/components/vocabulary-panel.tsx"
      provides: "Horizontally scrollable vocabulary table"
      contains: "overflow-x-auto"
    - path: "src/components/rules-panel.tsx"
      provides: "Horizontally scrollable rules table"
      contains: "overflow-x-auto"
  key_links: []
---

<objective>
Add horizontal scroll wrappers to the vocabulary and rules panel tables so they remain usable on narrow viewports or with long content. Remove the completed todo.

Purpose: Fix table overflow on narrow screens.
Output: Two updated components and cleaned-up todo tracking.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/vocabulary-panel.tsx
@src/components/rules-panel.tsx
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add horizontal scroll wrappers to vocabulary and rules tables</name>
  <files>src/components/vocabulary-panel.tsx, src/components/rules-panel.tsx</files>
  <action>
In `src/components/vocabulary-panel.tsx` (line 57): Wrap the `<Table>` element (lines 57-88) in a `<div className="overflow-x-auto">` so the table scrolls horizontally when it overflows. The wrapper goes inside the `<ScrollArea>` block, around only the `<Table>`, not the empty-state div.

In `src/components/rules-panel.tsx` (line 125): Wrap the `<Table>` element (lines 125-201) in a `<div className="overflow-x-auto">` in the same manner -- inside the `<ScrollArea>`, around only the `<Table>`.

Do NOT change any other styles, classes, or structure.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "Cannot find module './globals.css'" | head -20</automated>
  </verify>
  <done>Both tables wrapped in overflow-x-auto divs. Type check passes (only pre-existing globals.css error).</done>
</task>

<task type="auto">
  <name>Task 2: Remove completed todo and update STATE.md</name>
  <files>.planning/todos/pending/2026-03-14-make-vocab-and-rules-table-horizontally-scrollable.md, .planning/STATE.md</files>
  <action>
Delete the file `.planning/todos/pending/2026-03-14-make-vocab-and-rules-table-horizontally-scrollable.md`.

In `.planning/STATE.md`, remove the line (currently line 81): `- Make vocab and rules table horizontally scrollable` from the `### Pending Todos` section. Decrement the todo count on the line above it (change "12 pending todos" to "11 pending todos").
  </action>
  <verify>
    <automated>test ! -f .planning/todos/pending/2026-03-14-make-vocab-and-rules-table-horizontally-scrollable.md && grep "11 pending todos" .planning/STATE.md && echo "PASS"</automated>
  </verify>
  <done>Todo file deleted. STATE.md updated with decremented count and removed line item.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (only pre-existing globals.css error)
- Both component files contain `overflow-x-auto` wrapper divs around their tables
- Todo file no longer exists in pending directory
- STATE.md reflects 11 pending todos with the scrollable todo removed
</verification>

<success_criteria>
Tables in vocabulary-panel.tsx and rules-panel.tsx scroll horizontally on overflow. Todo tracking is cleaned up.
</success_criteria>

<output>
After completion, create `.planning/quick/2-make-vocabulary-and-rules-panel-tables-h/2-SUMMARY.md`
</output>
