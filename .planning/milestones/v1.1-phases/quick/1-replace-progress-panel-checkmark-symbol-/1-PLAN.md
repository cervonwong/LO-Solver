---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/step-progress.tsx
autonomous: true
must_haves:
  truths:
    - "Progress panel completed steps show the same SVG checkmark icon used in the dev trace panel"
    - "The checkmark is bright cyan/accent colored, not dark blue or black"
  artifacts:
    - path: "src/components/step-progress.tsx"
      provides: "StepCircle with SVG checkmark icon"
      contains: "svg"
  key_links:
    - from: "src/components/step-progress.tsx"
      to: "src/app/globals.css"
      via: "animate-checkmark-scale class"
      pattern: "animate-checkmark-scale"
---

<objective>
Replace the Unicode checkmark character in the progress panel's StepCircle with the same SVG checkmark icon used in the dev trace panel, and style it with the bright accent cyan color.

Purpose: Visual consistency between progress panel and dev trace panel checkmarks, and better visibility with bright cyan instead of dark fill.
Output: Updated step-progress.tsx with SVG checkmark icon and accent color styling.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/components/step-progress.tsx
@src/components/dev-trace-panel.tsx (lines 180-189 — SVG checkmark reference)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace checkmark character with SVG icon and update success styling</name>
  <files>src/components/step-progress.tsx</files>
  <action>
In the `StepCircle` component in `src/components/step-progress.tsx`, make two changes:

1. **Replace the Unicode checkmark with the SVG icon from dev-trace-panel.tsx.**
   On line 30, replace:
   ```tsx
   <span className="animate-checkmark-scale">&#10003;</span>
   ```
   with:
   ```tsx
   <svg
     xmlns="http://www.w3.org/2000/svg"
     height="12"
     viewBox="0 -960 960 960"
     width="12"
     fill="currentColor"
     className="animate-checkmark-scale"
   >
     <path d="M382-267.69 183.23-466.46 211.77-495 382-324.77 748.23-691l28.54 28.54L382-267.69Z" />
   </svg>
   ```
   Note: Use height/width 12 (not 16 as in dev-trace) because the StepCircle is only 20px (h-5 w-5) — 12px fits the smaller container.

2. **Change the success state color to bright accent cyan.**
   On line 24, change the success styling from:
   ```
   status === 'success' && 'border-foreground bg-foreground text-background',
   ```
   to:
   ```
   status === 'success' && 'border-accent text-accent',
   ```
   This removes the filled background (`bg-foreground`) and switches to accent cyan for both the border and checkmark icon color (via `currentColor` on the SVG), matching the bright blue checkmark in the dev trace panel. No background fill — just a cyan border with a cyan checkmark inside.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>
    - StepCircle success state renders the same SVG path as dev-trace-panel checkmark
    - Checkmark is bright cyan (text-accent / #00ffff) instead of dark (text-background)
    - The circle border is accent-colored on success, no filled background
    - The animate-checkmark-scale animation still applies to the SVG
    - TypeScript compiles without new errors
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
- Visual inspection: run `npm run dev` and complete a workflow to see the progress panel checkmarks appear as bright cyan SVG icons
</verification>

<success_criteria>
The progress panel completed steps display the same SVG checkmark icon used in the dev trace panel, rendered in bright cyan (accent color) with the scale-in animation preserved.
</success_criteria>

<output>
After completion, create `.planning/quick/1-replace-progress-panel-checkmark-symbol-/1-SUMMARY.md`
</output>
