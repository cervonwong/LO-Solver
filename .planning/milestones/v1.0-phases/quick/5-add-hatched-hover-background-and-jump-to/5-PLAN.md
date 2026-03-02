---
phase: quick
plan: 5
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/step-progress.tsx
  - src/app/globals.css
autonomous: true
requirements: []

must_haves:
  truths:
    - "Hovering a progress bar step item shows diagonal hatched background"
    - "Each step item displays a 'Jump to step' subtitle below the step label"
    - "Clicking a step still scrolls to the corresponding trace section"
  artifacts:
    - path: "src/components/step-progress.tsx"
      provides: "Hover class and 'Jump to step' subtitle on step items"
      contains: "Jump to step"
    - path: "src/app/globals.css"
      provides: "Hatched hover background style for progress step items"
      contains: "step-progress-item"
  key_links:
    - from: "src/components/step-progress.tsx"
      to: "src/app/globals.css"
      via: "CSS class on step item wrapper"
      pattern: "step-progress-item"
---

<objective>
Add hover affordance to progress bar step items: a diagonal hatched background on hover and a small "Jump to step" subtitle beneath each step label to clarify that clicking scrolls to the trace section.

Purpose: The progress bar steps are clickable (they scroll to the corresponding trace section) but nothing visually communicates this. The hatched hover background (consistent with the stamp button hover pattern) plus a subtitle make the scroll-to-trace behavior discoverable.
Output: Updated step-progress.tsx component and globals.css with hover style.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/step-progress.tsx
@src/app/globals.css

<interfaces>
From src/components/step-progress.tsx:
```typescript
export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

export interface ProgressStep {
  id: UIStepId;
  label: string;
  status: StepStatus;
}

interface StepProgressProps {
  steps: ProgressStep[];
  statusMessage?: string | undefined;
  onStepClick?: (stepId: UIStepId) => void;
}
```

The `onStepClick` prop is optional. When provided, clicking a step row calls `handleStepClick` in page.tsx which does:
```typescript
const el = document.getElementById(`trace-${stepId}`);
if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add hatched hover background and 'Jump to step' subtitle</name>
  <files>src/app/globals.css, src/components/step-progress.tsx</files>
  <action>
    **1. Add CSS class in globals.css** (after the existing `.animate-pulse-glow-line` block, before the collapsible section):

    ```css
    /* Progress bar step item — clickable hover with hatching */
    .step-progress-item {
      padding: 3px 6px;
      margin: -3px -6px;
      transition: background 0.15s ease;
    }

    .step-progress-item:hover {
      background: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 7px,
        rgba(0, 255, 255, 0.08) 7px,
        rgba(0, 255, 255, 0.08) 8px
      );
    }
    ```

    Use cyan tint (accent color) at low opacity to match the blueprint theme. The -45deg angle and 7px/8px spacing match existing stamp button hatching patterns. Negative margin offsets the padding so the element stays in its original position while the hover area extends slightly.

    **2. Update step-progress.tsx:**

    a) On the clickable step row `<div>` (line ~64-69), add the `step-progress-item` class conditionally when `onStepClick` is provided. Replace the inline `style={{ cursor: 'pointer' }}` with a Tailwind `cursor-pointer` class applied conditionally. The row div should become:

    ```tsx
    <div
      className={cn(
        'flex items-center gap-2',
        onStepClick && 'step-progress-item cursor-pointer',
      )}
      onClick={() => onStepClick?.(step.id)}
      role={onStepClick ? 'button' : undefined}
    >
    ```

    Remove the inline `style` prop entirely since cursor is now handled by the class.

    b) Add a "Jump to step" subtitle beneath the step label `<span>`, but only when `onStepClick` is provided. After the label span, add:

    ```tsx
    {onStepClick && (
      <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
        Jump to step
      </span>
    )}
    ```

    To make `group-hover` work, add `group` to the parent div's className (alongside `step-progress-item`):

    ```tsx
    className={cn(
      'flex items-center gap-2',
      onStepClick && 'step-progress-item cursor-pointer group',
    )}
    ```

    The "Jump to step" text appears only on hover (via group-hover), is right-aligned (ml-auto), and uses a tiny font (9px) so it doesn't dominate the compact layout.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css\|Cannot find module './globals.css'" | head -20</automated>
  </verify>
  <done>
    - Hovering a progress bar step shows diagonal cyan hatching background
    - "Jump to step" text appears on hover to the right of the step label
    - Non-clickable steps (no onStepClick) show no hover effects or subtitle
    - Clicking still triggers scroll-to-trace behavior
    - TypeScript check passes with no new errors
  </done>
</task>

</tasks>

<verification>
Visual check: run `npm run dev:next`, open http://localhost:3000, start a solve. Hover over progress bar steps — each should show diagonal hatching and a "Jump to step" label. Click a completed step to verify it scrolls the trace panel.
</verification>

<success_criteria>
- Progress bar step items show diagonal hatched background on hover (cyan, -45deg, matching stamp button pattern)
- "Jump to step" subtitle appears on hover, disappears when not hovering
- Hover effects only appear when onStepClick is provided
- No layout shift from hover interaction
- TypeScript compiles without new errors
</success_criteria>

<output>
After completion, create `.planning/quick/5-add-hatched-hover-background-and-jump-to/5-SUMMARY.md`
</output>
