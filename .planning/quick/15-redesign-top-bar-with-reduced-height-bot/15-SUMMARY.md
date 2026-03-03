---
phase: quick-15
plan: 01
subsystem: frontend/nav
tags: [ui, css, nav-bar, layout]
key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/layout-shell.tsx
decisions:
  - Used curly-brace string syntax for apostrophe in JSX instead of HTML entity
metrics:
  duration: 73s
  completed: "2026-03-03T01:11:44Z"
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 15: Redesign Top Bar with Reduced Height and Bottom-Border Nav Links

Bottom-border-only nav styling with view_quilt and arrow_forward Material Icons, reduced bar height via py-1.5

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add .stamp-btn-nav-underline CSS class | 1b1af22 | src/app/globals.css |
| 2 | Restyle NavBar -- reduce height, rename, add icons | 80fb39e | src/components/layout-shell.tsx |

## Changes Made

### Task 1: Add .stamp-btn-nav-underline CSS class
- Added new `.stamp-btn-nav-underline` class in globals.css after the `.stamp-btn-nav-neutral` block
- Bottom border only (2px solid foreground), no top/left/right borders
- Hover changes color and border-bottom-color to accent cyan with 8px text glow
- Inline-flex with gap for icon+text alignment
- Consistent font-family, font-size (0.8rem), text-transform (uppercase) with existing nav stamp buttons

### Task 2: Restyle NavBar
- Reduced nav vertical padding from `py-3` to `py-1.5` for a more compact bar
- Renamed "LO-Solver" to "Lex's Dashboard" in both span (home page) and Link (other pages) variants
- Added view_quilt Material Icon SVG before "Lex's Dashboard" text
- Added arrow_forward Material Icon SVG after "Eval Results" text
- Replaced hover-hatch-cyan/hover-hatch-border classes with stamp-btn-nav-underline on both nav links
- Removed explicit px-3/py-1.5/font-heading/text-sm classes (handled by CSS class)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `stamp-btn-nav-underline` found 2 times in globals.css (base + hover)
- `stamp-btn-nav-underline` applied to 3 elements in layout-shell.tsx (span, home Link, evals Link)
- "Lex's Dashboard" text confirmed in both variants
- `py-1.5` confirmed on nav element
- `npx tsc --noEmit` shows only pre-existing CSS module errors (globals.css, streamdown/styles.css)
