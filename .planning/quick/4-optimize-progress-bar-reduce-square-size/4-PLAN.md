---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/step-progress.tsx
  - src/app/globals.css
autonomous: true
requirements: [QUICK-4]

must_haves:
  truths:
    - "Step squares are visibly smaller than the current 32px size"
    - "Step labels display in mixed case (not uppercase)"
    - "Step labels render in the Architects Daughter handwriting font"
    - "Running step has a pulsing cyan glow animation"
    - "Running connector has a pulsing glow effect"
  artifacts:
    - path: "src/components/step-progress.tsx"
      provides: "Compact progress bar with font and glow changes"
    - path: "src/app/globals.css"
      provides: "Pulse glow keyframe animations"
  key_links:
    - from: "src/components/step-progress.tsx"
      to: "src/app/globals.css"
      via: "CSS animation classes"
      pattern: "animate-pulse-glow"
---

<objective>
Make the vertical progress bar more compact and visually polished: reduce step square size, switch labels from uppercase to mixed-case Architects Daughter font, and add pulsing glow animations to running states.

Purpose: Visual refinement for a tighter, more blueprint-styled progress display.
Output: Updated step-progress component and supporting CSS animations.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/step-progress.tsx
@src/app/globals.css
@src/app/layout.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add pulse glow keyframes to globals.css</name>
  <files>src/app/globals.css</files>
  <action>
Add two new keyframe animations and utility classes to globals.css in the ANIMATION KEYFRAMES section:

1. `@keyframes pulse-glow` -- a pulsing cyan glow for the running step circle. Animate box-shadow between a dim glow `0 0 4px rgba(0, 255, 255, 0.3)` and a bright glow `0 0 12px rgba(0, 255, 255, 0.6), 0 0 20px rgba(0, 255, 255, 0.3)`. Duration should feel organic: use `2s ease-in-out infinite`.

2. `@keyframes pulse-glow-line` -- a subtler pulsing glow for the running connector line. Animate box-shadow (applied via `box-shadow` on a 2px-wide element) between `0 0 3px rgba(0, 255, 255, 0.2)` and `0 0 8px rgba(0, 255, 255, 0.5)`. Same `2s ease-in-out infinite` timing.

Add corresponding utility classes:
- `.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }`
- `.animate-pulse-glow-line { animation: pulse-glow-line 2s ease-in-out infinite; }`
  </action>
  <verify>Grep globals.css for `pulse-glow` to confirm both keyframes and utility classes exist.</verify>
  <done>Two pulse glow keyframes and their utility classes are defined in globals.css.</done>
</task>

<task type="auto">
  <name>Task 2: Compact step squares, mixed-case font labels, and wire glow effects</name>
  <files>src/components/step-progress.tsx</files>
  <action>
Modify the StepProgress component with these changes:

**StepCircle size reduction:**
- Change `h-8 w-8` to `h-5 w-5` (20px squares -- significantly more compact)
- Change `text-xs` to `text-[10px]` for the step number/icon inside the circle to fit the smaller size

**StepCircle running glow:**
- For `status === 'running'`, replace the static `shadow-[0_0_6px_rgba(0,255,255,0.4)]` with the CSS class `animate-pulse-glow`
- Keep the existing `border-accent text-accent` classes for running state

**Connector adjustments:**
- Change `ml-[15px]` to `ml-[9px]` to center under the new 20px squares (half of 20px minus half of 2px = 9px)
- Change `h-4` to `h-3` (12px) for tighter vertical spacing
- Change `min-h-3` to `min-h-2` accordingly
- Change `w-px` to `w-0.5` (2px) for the solid connector lines (when bothComplete, completedToRunning, or hasActivity)
- Keep `border-l border-dashed` for pending connectors (they use border not width)
- For `completedToRunning` status, add `animate-pulse-glow-line` class alongside the existing `bg-accent`

**Labels -- remove uppercase, add handwriting font:**
- Remove `uppercase` from the label `<span>` className
- Remove `tracking-wider` (not needed without uppercase)
- Add `font-heading` to the label `<span>` className (this applies the Architects Daughter font already loaded in layout.tsx)
- Keep the status-specific color classes (`text-accent`, `text-foreground`, `text-destructive`, `text-muted-foreground`)

**Gap between circle and label:**
- Change `gap-3` to `gap-2` on the flex row to tighten spacing with the smaller circles

**Status message:**
- Change `pl-[44px]` to `pl-[28px]` (20px circle + 8px gap) so status message still aligns with labels
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" should output 0 (no new errors).</verify>
  <done>Step circles are 20px, labels are mixed-case in Architects Daughter font, running steps and connectors pulse with cyan glow, vertical spacing is tighter.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
- Visual inspection: progress bar is noticeably more compact, labels are handwritten mixed-case, running state pulses
</verification>

<success_criteria>
Progress bar squares are ~60% smaller (20px vs 32px), labels no longer uppercase, labels display in Architects Daughter font, running step circle has a pulsing cyan glow, running connector line has a pulsing glow effect, overall vertical height of the progress bar is reduced.
</success_criteria>

<output>
After completion, create `.planning/quick/4-optimize-progress-bar-reduce-square-size/4-SUMMARY.md`
</output>
