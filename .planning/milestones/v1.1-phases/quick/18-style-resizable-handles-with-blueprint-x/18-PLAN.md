---
phase: quick-18
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/resizable.tsx
  - src/app/globals.css
autonomous: true
requirements: [QUICK-18]
must_haves:
  truths:
    - "Resizable handle shows an X registration mark instead of grip dots"
    - "Hovering the handle turns separator line and X-mark cyan with glow"
    - "No rounded corners on any handle element"
    - "Handle works for both vertical and horizontal orientations"
  artifacts:
    - path: "src/components/ui/resizable.tsx"
      provides: "ResizableHandle with X-mark div instead of GripVerticalIcon"
    - path: "src/app/globals.css"
      provides: "CSS for .resize-xmark pseudo-elements and hover states"
  key_links:
    - from: "src/components/ui/resizable.tsx"
      to: "src/app/globals.css"
      via: "resize-xmark CSS class"
      pattern: "resize-xmark"
---

<objective>
Replace the default shadcn grip icon on resizable panel handles with a blueprint-themed X registration mark using CSS pseudo-elements, with cyan hover/glow effects.

Purpose: Align resizable handles with the cyanotype blueprint design language.
Output: Styled X-mark handles that glow cyan on hover.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/components/ui/resizable.tsx
@src/app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace grip icon with CSS X-mark and add hover states</name>
  <files>src/app/globals.css, src/components/ui/resizable.tsx</files>
  <action>
**In `src/app/globals.css`**, add a new section in the BLUEPRINT COMPONENTS area (after the `.panel-transition` / `.panel-heading` rules, before the animation keyframes):

```css
/* Resize handle X-mark — blueprint registration mark */
.resize-xmark {
  position: relative;
  width: 12px;
  height: 12px;
  z-index: 10;
  transition: filter 150ms ease;
}

.resize-xmark::before,
.resize-xmark::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 1px;
  background: var(--border);
  transition: background 150ms ease, box-shadow 150ms ease;
}

.resize-xmark::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.resize-xmark::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

/* Hover: separator turns cyan, X-mark turns cyan with glow */
[data-slot="resizable-handle"]:hover .resize-xmark::before,
[data-slot="resizable-handle"]:hover .resize-xmark::after {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
}

/* Make the separator line itself turn cyan on hover */
[data-slot="resizable-handle"]:hover {
  background: var(--accent);
}
```

**In `src/components/ui/resizable.tsx`**:

1. Remove the `import { GripVerticalIcon } from "lucide-react"` line entirely
2. Replace the `withHandle` block inside `ResizableHandle` — remove the old div with `GripVerticalIcon` and replace with:
   ```tsx
   {withHandle && (
     <div className="resize-xmark" />
   )}
   ```
   This is the entire withHandle conditional. The old div had `rounded-xs` and `bg-border` classes — all removed. The `.resize-xmark` CSS class handles everything via pseudo-elements.
3. Keep all other code unchanged — the `cn()` className on the Separator, the `withHandle` prop type, the `[aria-orientation=horizontal]>div]:rotate-90` rule in the existing classes (this rotates the X-mark div for horizontal handles automatically).
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>GripVerticalIcon import removed. Handle shows a CSS X-mark (two crossing lines via ::before/::after). On hover, separator line and X-mark turn cyan with subtle glow. No rounded corners. Both orientations work via existing rotate-90 rule. withHandle prop still controls visibility.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring pre-existing globals.css module error)
- Visual: resizable handles show X registration marks instead of grip dots
- Visual: hovering a handle turns the separator line and X-mark cyan with glow
- No `rounded-xs` or `GripVerticalIcon` references remain in resizable.tsx
</verification>

<success_criteria>
Resizable panel handles display blueprint-themed X registration marks with cyan hover glow effects, consistent with the cyanotype design language.
</success_criteria>

<output>
After completion, create `.planning/quick/18-style-resizable-handles-with-blueprint-x/18-SUMMARY.md`
</output>
