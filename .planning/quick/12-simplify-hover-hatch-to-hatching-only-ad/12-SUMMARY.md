---
plan: 12-01
status: complete
commits:
  - 9f66f82
---

# Quick Task 12 Summary

## What Changed

1. **globals.css**: Simplified all three hover-hatch classes (cyan, white, red) to ONLY set `background-image` on `:hover`. Removed all base state properties (no borders, no transitions). Added new `.hover-hatch-border` composable class for borderless elements.

2. **layout-shell.tsx**: Added `hover-hatch-border` and `px-3 py-1.5` padding to both nav links (LO-Solver, Eval Results).

3. **DESIGN.md**: Updated Hover States section to document the simplified pattern: hatching is the core effect, border handling is separate and optional via `hover-hatch-border`.

## Design Rationale

- Elements with existing borders (trace cards, results panel, combo box) get hatching only — their borders stay unchanged on hover
- Elements without borders (nav links) compose `hover-hatch-border` for a subtle border on hover
- No property overrides — hover-hatch never fights with Tailwind utility classes
