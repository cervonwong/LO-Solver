---
plan: 11-01
status: complete
commits:
  - bca4696
---

# Quick Task 11 Summary: Fix hover-hatch CSS

## Investigation Findings

1. **Stale Turbopack cache**: The `.hover-hatch-cyan` class was completely absent from Turbopack's compiled CSS output (0 matches) while `.stamp-btn` (13 matches) was present. After clearing `.next/` and restarting, the classes appeared. Turbopack's HMR didn't pick up newly-added CSS classes.

2. **CSS compositing issue**: The base state `background: transparent` was an unlayered CSS rule which overrides `bg-surface-2` in `@layer utilities` (per CSS cascade layers spec). This caused elements to lose their surface backgrounds. The hover state used `background` shorthand which resets `background-color` to transparent.

## Fix Applied

- Removed `background: transparent` from base `.hover-hatch-*` classes — elements keep their existing `bg-surface-*` backgrounds
- Changed hover from `background: repeating-linear-gradient(...)` to `background-image: repeating-linear-gradient(...)` — gradient layers ON TOP of existing background-color
- Updated transition from `background` to `border-color` only — gradients can't be animated

## Verification

- Tailwind CLI confirms correct output: no base background override, `background-image` in hover state
- `npx tsc --noEmit` shows only pre-existing CSS module errors
- User needs to restart dev server (`npm run dev`) after cache clear to verify visually

## Files Changed

- `src/app/globals.css` — Fixed all three hover-hatch utility classes (cyan, white, red)
