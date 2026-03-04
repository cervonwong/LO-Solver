---
phase: quick-fix
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
autonomous: true
must_haves:
  truths:
    - "Opening the abort dialog does not cause background content to shift or zoom"
    - "Scrollbar gutter space is always reserved so layout is stable"
  artifacts:
    - path: "src/app/globals.css"
      provides: "scrollbar-gutter: stable on html element"
      contains: "scrollbar-gutter"
  key_links: []
---

<objective>
Fix the layout shift that occurs when the abort confirmation dialog opens. Radix UI Dialog
sets `overflow: hidden` on `<body>` to prevent background scrolling, which removes the
scrollbar and causes visible content shift. Adding `scrollbar-gutter: stable` to the `<html>`
element reserves the scrollbar gutter space permanently, preventing the shift.

Purpose: Eliminate jarring visual glitch when abort dialog appears.
Output: One CSS rule added to globals.css.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/globals.css
@src/components/ui/dialog.tsx
@src/components/layout-shell.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add scrollbar-gutter stable to html element</name>
  <files>src/app/globals.css</files>
  <action>
Inside the `@layer base` block in `src/app/globals.css`, add an `html` rule BEFORE the
existing `body` rule (around line 126). The rule should be:

```css
html {
  scrollbar-gutter: stable;
}
```

This reserves space for the scrollbar gutter at all times. When Radix Dialog adds
`overflow: hidden` to `<body>`, the scrollbar disappears but the reserved gutter space
remains, preventing any layout shift.

Place it as the first rule inside `@layer base { ... }`, before the `* { ... }` rule.
Do NOT modify any other rules.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && grep -n "scrollbar-gutter" src/app/globals.css && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>globals.css contains `scrollbar-gutter: stable` on the html element. Type-check passes (ignoring pre-existing globals.css module error). Opening any Radix dialog no longer causes background content shift.</done>
</task>

</tasks>

<verification>
- `grep "scrollbar-gutter: stable" src/app/globals.css` returns a match
- `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
- Visual: open the abort dialog during a workflow run and confirm no background shift
</verification>

<success_criteria>
The abort confirmation dialog opens and closes without any visible shift, zoom, or jitter
in the background content. The fix is a single CSS property addition with zero risk to
existing layout.
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-abort-dialog-background-zoom-glitch/1-SUMMARY.md`
</output>
