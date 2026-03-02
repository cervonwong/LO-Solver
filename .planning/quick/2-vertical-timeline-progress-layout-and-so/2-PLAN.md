---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/step-progress.tsx
  - src/app/globals.css
autonomous: true
requirements: [vertical-timeline, softer-red]
must_haves:
  truths:
    - "Progress steps display vertically (top-to-bottom column)"
    - "Each step shows circle on the left with label text to the right"
    - "Vertical connector lines run between circles"
    - "All red colors use #e04a4a instead of #ff3333"
  artifacts:
    - path: "src/components/step-progress.tsx"
      provides: "Vertical timeline stepper layout"
    - path: "src/app/globals.css"
      provides: "Updated red color values"
  key_links:
    - from: "src/app/globals.css"
      to: "src/components/step-progress.tsx"
      via: "CSS variables (--primary, --destructive) used in Tailwind classes"
      pattern: "text-destructive|border-destructive"
---

<objective>
Convert the horizontal step progress bar to a vertical timeline layout, and soften the red accent from #ff3333 to #e04a4a across all CSS variables and hardcoded values.

Purpose: Vertical layout avoids horizontal overflow and reads more naturally as a timeline; softer red is less harsh against the blueprint background.
Output: Updated step-progress.tsx (vertical layout) and globals.css (new red values).
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/step-progress.tsx
@src/app/globals.css
@src/app/page.tsx (lines 614-618 — StepProgress usage site)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Convert StepProgress to vertical timeline layout</name>
  <files>src/components/step-progress.tsx</files>
  <action>
Rewrite the StepProgress component layout from horizontal row to vertical stepper:

1. **Outer container**: Change from `flex items-center` (horizontal row) to `flex flex-col` (vertical column). Remove the `w-full` wrapper div if no longer needed.

2. **Each step row**: Render as a horizontal flex row: circle on the left, label text to the right of the circle (with a gap). Remove the column layout (`flex-col items-center`) that stacked label below circle.

3. **Connector**: Change the `Connector` component from horizontal line (`h-px min-w-3 flex-1 mx-1`) to a vertical line. Use `w-px min-h-3 h-4 ml-[15px]` (centered under the 8x8/32px circle: half of 32px = 16px, minus half of 1px line width = 15px). Remove `flex-1` horizontal stretching. Keep the same color logic (bothComplete, completedToRunning, hasActivity, inactive dashed). For the dashed inactive state, change from `border-t border-dashed` to `border-l border-dashed`.

4. **Connector placement**: Render the connector ABOVE each step (except the first) as a separate element in the vertical flow, not inline with the step. Structure per step:
   ```
   {i > 0 && <Connector ... />}
   <div className="flex items-center gap-3" onClick={...}>
     <StepCircle ... />
     <span className="...">{step.label}</span>
   </div>
   ```

5. **Label text**: Remove `whitespace-nowrap` class. Keep text-xs, uppercase, tracking-wider. Keep the same status-based color classes (running=accent, success=foreground, failed=destructive, pending=muted-foreground).

6. **StepCircle**: No changes to the circle component itself (same size, same status coloring, same checkmark/X icons).

7. **statusMessage**: Keep it rendered below all steps. Change from `mt-4 text-center` to `mt-3 text-sm text-muted-foreground` (left-aligned naturally in the vertical flow, or keep centered if it looks better — use `pl-[44px]` to align with labels, i.e., 32px circle + 12px gap).

8. **onStepClick and role/cursor**: Keep the same click handler and accessibility attributes on each step row.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css" || echo "Type check passed"</automated>
  </verify>
  <done>StepProgress renders as a vertical column with circles on the left, labels to the right, and vertical connector lines between steps. All props (steps, statusMessage, onStepClick) continue to work.</done>
</task>

<task type="auto">
  <name>Task 2: Replace #ff3333 with #e04a4a in globals.css</name>
  <files>src/app/globals.css</files>
  <action>
Make these exact replacements in src/app/globals.css:

1. **Line 71** — `--primary: #ff3333;` -> `--primary: #e04a4a;`
2. **Line 79** — `--destructive: #ff3333;` -> `--destructive: #e04a4a;`
3. **Line 104** — `--chart-2: #ff3333;` -> `--chart-2: #e04a4a;`
4. **Line 241** — `.stamp-btn` color: `color: #ff3333;` -> `color: #e04a4a;`
5. **Line 242** — `.stamp-btn` border: `border: 3px solid #ff3333;` -> `border: 3px solid #e04a4a;`
6. **Line 252** — `.stamp-btn:hover` background: `rgba(255, 51, 51, 0.1)` -> `rgba(224, 74, 74, 0.1)`
7. **Line 258** — `.stamp-btn:active` box-shadow: `rgba(255, 51, 51, 0.4)` -> `rgba(224, 74, 74, 0.4)`

That is all 7 occurrences. Everything else (destructive utility classes, chart colors, etc.) uses the CSS variables so they update automatically.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && grep -n "ff3333\|255, 51, 51" src/app/globals.css | head -20; echo "---"; echo "Expected: 0 matches (all replaced)"</automated>
  </verify>
  <done>Zero occurrences of #ff3333 or rgba(255, 51, 51, ...) remain in globals.css. All red values now use #e04a4a / rgba(224, 74, 74, ...).</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring the pre-existing globals.css module error)
2. `grep -rn "ff3333\|255, 51, 51" src/app/globals.css` returns no matches
3. Visual check: StepProgress renders vertically with circles left, labels right, connectors between
</verification>

<success_criteria>
- StepProgress displays as a vertical timeline (column layout, circles left, labels right, vertical connectors)
- All #ff3333 replaced with #e04a4a in CSS variables and hardcoded .stamp-btn styles
- No TypeScript errors introduced
- onStepClick and statusMessage props still functional
</success_criteria>

<output>
After completion, create `.planning/quick/2-vertical-timeline-progress-layout-and-so/2-SUMMARY.md`
</output>
