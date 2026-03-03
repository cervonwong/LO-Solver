---
phase: quick-20
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/dev-trace-panel.tsx
  - src/components/vocabulary-panel.tsx
  - src/components/rules-panel.tsx
  - src/app/globals.css
autonomous: true
requirements: [STICKY-HEADER, FONT-REDUCE]
must_haves:
  truths:
    - "Dev trace panel header stays visible at the top while scrolling through trace events"
    - "Vocabulary table text is smaller than before, fitting more entries on screen"
    - "Rules table text is smaller than before, fitting more entries on screen"
  artifacts:
    - path: "src/components/dev-trace-panel.tsx"
      provides: "Sticky header with opaque background"
    - path: "src/components/vocabulary-panel.tsx"
      provides: "Reduced font size in table cells"
    - path: "src/components/rules-panel.tsx"
      provides: "Reduced font size in table cells"
    - path: "src/app/globals.css"
      provides: "Sticky panel-heading background override"
  key_links:
    - from: "src/app/globals.css"
      to: "src/components/dev-trace-panel.tsx"
      via: "panel-heading class with opaque bg for sticky"
      pattern: "panel-heading.*sticky"
---

<objective>
Make the dev trace panel header stick to the top when scrolling, and reduce font sizes in the vocabulary and rules table cells for higher information density.

Purpose: The trace panel header (with event count and timer) scrolls out of view during long solving runs. Vocabulary and rules tables use `text-sm` on data cells, wasting space in the third-column layout where the panel is narrow.

Output: Sticky trace header that stays visible, vocabulary/rules tables with smaller text.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/components/dev-trace-panel.tsx
@src/components/vocabulary-panel.tsx
@src/components/rules-panel.tsx
@src/app/globals.css
@src/app/page.tsx (lines 776-834 — panel layout with ScrollArea wrapping DevTracePanel)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix dev trace panel header sticky behavior with opaque background</name>
  <files>src/components/dev-trace-panel.tsx, src/app/globals.css</files>
  <action>
The DevTracePanel header at line 100 already has `sticky top-0 z-10` and the `panel-heading` class. However, `.panel-heading` in globals.css uses `background: rgba(255, 255, 255, 0.02)` which is nearly transparent — content scrolls visibly behind the sticky header.

Fix by adding a CSS rule for sticky panel headings that provides an opaque background. In `globals.css`, after the existing `.panel-heading::after` block (around line 859), add:

```css
/* Sticky panel headings need opaque bg so scrolling content doesn't show through */
.panel-heading.sticky {
  background: var(--background);
}
```

This targets only panel headings that also have the `sticky` class (currently only the dev trace header), giving them the solid navy `--background` (`#003366`) instead of the translucent white overlay. The non-sticky vocabulary and rules panel headings retain their subtle translucent style.

No changes needed in `dev-trace-panel.tsx` itself — the header already has both `panel-heading` and `sticky` classes on the same element (line 100).
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -5</automated>
  </verify>
  <done>Dev trace panel header has opaque background when sticky, covering scrolling content beneath it. Other panel headings are unaffected.</done>
</task>

<task type="auto">
  <name>Task 2: Reduce vocabulary and rules table font sizes</name>
  <files>src/components/vocabulary-panel.tsx, src/components/rules-panel.tsx</files>
  <action>
In `vocabulary-panel.tsx`:
- Line 77: Change `TableCell className="text-sm"` to `className="text-xs"` (foreignForm column)
- Line 78: Change `TableCell className="text-sm"` to `className="text-xs"` (meaning column)
- The Type and Notes cells (lines 79-84) already use `text-xs`, leave them as-is

In `rules-panel.tsx`:
- Line 161: Change `TableCell className="align-top text-sm"` to `className="align-top text-xs"` (title column, the inner div with the chevron stays the same)
- Leave the row number cell (line 158, already `text-xs`), description cell (line 180, already `text-xs`), confidence cell, and status cell as-is — they are already small or non-text

This brings all data cells in both tables to a consistent `text-xs` (0.75rem / 12px), down from `text-sm` (0.875rem / 14px), gaining ~15% more vertical density. Table headers already use `text-xs`.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -5</automated>
  </verify>
  <done>All vocabulary table data cells use text-xs. Rules table title cell uses text-xs. Tables display more entries in the same vertical space.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
2. Visual: Dev trace panel header stays pinned at top of its scroll area during scrolling, with opaque navy background
3. Visual: Vocabulary and rules table rows are noticeably more compact with smaller text
</verification>

<success_criteria>
- Dev trace header sticks to top with opaque background covering scrolled content
- Vocabulary table Form and Meaning columns use text-xs instead of text-sm
- Rules table Title column uses text-xs instead of text-sm
- No type errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/20-make-dev-trace-header-sticky-and-reduce-/20-SUMMARY.md`
</output>
