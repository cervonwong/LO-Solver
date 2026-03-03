---
plan: 11-01
objective: Fix hover-hatch utility classes so hatching is visible on hover
tasks: 1
wave: 1
---

# Plan 11-01: Fix hover-hatch CSS compositing

## Context

The hover-hatch utility classes added in quick task 10 have two issues:
1. **Stale Turbopack cache**: The dev server needed restart after adding new CSS classes (resolved by clearing `.next/`)
2. **CSS specificity/compositing**: The base state `background: transparent` overrides `bg-surface-2` (unlayered CSS beats `@layer utilities`), and the hover state uses `background` shorthand which resets `background-color` to transparent, losing the element's surface tint

## Task 1: Fix hover-hatch CSS properties

**files:** `src/app/globals.css`
**action:**

For all three hover-hatch classes (cyan, white, red):

1. Remove `background: transparent` from base state — elements should keep their existing background
2. Change hover state from `background: repeating-linear-gradient(...)` to `background-image: repeating-linear-gradient(...)` — this layers the gradient ON TOP of existing background-color instead of resetting it
3. Update transition from `background 0.15s ease` to `border-color 0.15s ease` — gradients can't be animated, only the border color transition matters

**verify:** `npx tsc --noEmit` passes, dev server shows hatching on hover for collapsible triggers
**done:** All three hover-hatch classes fixed
