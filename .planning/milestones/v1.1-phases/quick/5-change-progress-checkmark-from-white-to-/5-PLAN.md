---
phase: quick-5
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/step-progress.tsx
autonomous: true
requirements: [QUICK-5]

must_haves:
  truths:
    - "Completed step circle checkmark is dark navy on bright cyan background"
  artifacts:
    - path: "src/components/step-progress.tsx"
      provides: "StepCircle with dark checkmark on accent bg"
      contains: "text-accent-foreground"
  key_links: []
---

<objective>
Change the completed step checkmark color from white to dark navy for better contrast against the bright cyan background.

Purpose: The white checkmark on bright cyan (`bg-accent`) has poor contrast. The design system defines `accent-foreground` (#003366, dark navy) as the correct text color for content on cyan backgrounds.
Output: Updated StepCircle component with proper contrast.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/step-progress.tsx
@DESIGN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Change checkmark color to accent-foreground</name>
  <files>src/components/step-progress.tsx</files>
  <action>
In `src/components/step-progress.tsx`, line 24, change:
```
status === 'success' && 'border-accent bg-accent text-white',
```
to:
```
status === 'success' && 'border-accent bg-accent text-accent-foreground',
```

This uses `text-accent-foreground` which maps to `#003366` (dark navy) — the design system's designated color for text on cyan backgrounds, per DESIGN.md's `--accent-foreground` variable.
  </action>
  <verify>
    <automated>grep -n "text-accent-foreground" src/components/step-progress.tsx && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>Completed step circle shows a dark navy checkmark on bright cyan background instead of white on cyan.</done>
</task>

</tasks>

<verification>
- `grep "text-accent-foreground" src/components/step-progress.tsx` returns the updated line
- `npx tsc --noEmit` passes (ignoring the pre-existing globals.css error)
</verification>

<success_criteria>
The completed step circle in StepProgress uses `text-accent-foreground` (dark navy #003366) instead of `text-white` for the checkmark, providing strong contrast against the `bg-accent` (cyan #00ffff) background.
</success_criteria>

<output>
After completion, create `.planning/quick/5-change-progress-checkmark-from-white-to-/5-SUMMARY.md`
</output>
