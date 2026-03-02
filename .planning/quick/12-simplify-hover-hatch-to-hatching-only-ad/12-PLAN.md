---
plan: 12-01
objective: Simplify hover-hatch to hatching-only, add composable hover-hatch-border
tasks: 1
wave: 1
---

# Plan 12-01: Simplify hover-hatch CSS

## Task 1: Refactor hover-hatch classes and update DESIGN.md

**files:** `src/app/globals.css`, `src/components/layout-shell.tsx`, `DESIGN.md`
**action:**
1. Strip hover-hatch-cyan/white/red to only set `background-image` on `:hover` — no base state, no borders
2. Add new `.hover-hatch-border` class for borderless elements (transparent border base + cyan on hover)
3. Add `hover-hatch-border` + `px-3 py-1.5` to nav links in layout-shell.tsx
4. Update DESIGN.md hover states section to document the pattern

**done:** hover-hatch = hatching only, hover-hatch-border composable for borderless elements
