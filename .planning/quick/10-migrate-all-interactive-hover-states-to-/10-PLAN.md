---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
  - src/components/trace-event-card.tsx
  - src/components/results-panel.tsx
  - src/components/dev-trace-panel.tsx
  - src/components/problem-input.tsx
  - src/app/evals/page.tsx
  - src/app/page.tsx
  - src/app/layout.tsx
autonomous: true
requirements: [QUICK-10]

must_haves:
  truths:
    - "All interactive containers/triggers show diagonal hatched background on hover instead of solid color fills"
    - "No layout shift occurs when hovering (transparent borders on base state)"
    - "Three reusable hover-hatch CSS classes exist in globals.css"
  artifacts:
    - path: "src/app/globals.css"
      provides: "hover-hatch-cyan, hover-hatch-white, hover-hatch-red utility classes"
      contains: "hover-hatch-cyan"
    - path: "src/components/trace-event-card.tsx"
      provides: "8 collapsible triggers with hatched hover"
    - path: "src/components/results-panel.tsx"
      provides: "3 interactive elements with hatched hover"
    - path: "src/components/dev-trace-panel.tsx"
      provides: "Step section trigger with hatched hover"
    - path: "src/components/problem-input.tsx"
      provides: "Example select button with hatched hover"
    - path: "src/app/evals/page.tsx"
      provides: "Problem breakdown trigger with hatched hover"
    - path: "src/app/page.tsx"
      provides: "3 section headers + jump button with hatched hover"
    - path: "src/app/layout.tsx"
      provides: "2 nav links with hatched hover"
  key_links:
    - from: "src/app/globals.css"
      to: "all component files"
      via: "hover-hatch-cyan class usage"
      pattern: "hover-hatch-cyan"
---

<objective>
Migrate all interactive hover states across the UI from solid background fills (hover:bg-surface-*, hover:bg-muted, hover:text-accent, hover:text-foreground) to the diagonal hatching pattern specified in DESIGN.md.

Purpose: Unify all hover states to the cyanotype blueprint hatching pattern, making the UI consistent with the design system.
Output: Three reusable CSS utility classes in globals.css and all interactive elements migrated to use them.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md (Hover States section -- the specification to implement)
@src/app/globals.css (add hover-hatch classes; reference .stamp-btn and .step-progress-item for pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add hover-hatch utility classes to globals.css</name>
  <files>src/app/globals.css</files>
  <action>
Add three new CSS utility classes after the `.step-progress-item` block (after line 585) and before the collapsible animation section. Insert a comment header and the three classes:

```css
/* Hover-hatch utility classes — diagonal hatching for interactive elements */
.hover-hatch-cyan {
  background: transparent;
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.hover-hatch-cyan:hover {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 7px,
    rgba(0, 255, 255, 0.15) 7px,
    rgba(0, 255, 255, 0.15) 8px
  );
  border-top-color: rgba(0, 255, 255, 0.15);
  border-bottom-color: rgba(0, 255, 255, 0.15);
}

.hover-hatch-white {
  background: transparent;
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.hover-hatch-white:hover {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 7px,
    rgba(255, 255, 255, 0.12) 7px,
    rgba(255, 255, 255, 0.12) 8px
  );
  border-top-color: rgba(255, 255, 255, 0.12);
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.hover-hatch-red {
  background: transparent;
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.hover-hatch-red:hover {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 7px,
    rgba(224, 74, 74, 0.15) 7px,
    rgba(224, 74, 74, 0.15) 8px
  );
  border-top-color: rgba(224, 74, 74, 0.15);
  border-bottom-color: rgba(224, 74, 74, 0.15);
}
```

These match the exact pattern from `.stamp-btn:hover` and `.step-progress-item:hover` already in the file.
  </action>
  <verify>
    <automated>grep -c "hover-hatch-cyan\|hover-hatch-white\|hover-hatch-red" src/app/globals.css | grep -q "6" && echo "PASS: All 6 class definitions found" || echo "FAIL"</automated>
  </verify>
  <done>Three hover-hatch utility classes (cyan, white, red) exist in globals.css with transparent base borders and diagonal hatching on hover.</done>
</task>

<task type="auto">
  <name>Task 2: Migrate all component hover states to hover-hatch-cyan</name>
  <files>src/components/trace-event-card.tsx, src/components/results-panel.tsx, src/components/dev-trace-panel.tsx, src/components/problem-input.tsx, src/app/evals/page.tsx, src/app/page.tsx, src/app/layout.tsx</files>
  <action>
For each file, replace the old Tailwind hover classes with the `hover-hatch-cyan` CSS class. Remove the old hover class but keep all other classes intact.

**src/components/trace-event-card.tsx** -- 8 replacements (skip line 260, that is an icon-only opacity transition):
- Line 96: Remove `hover:bg-surface-3`, add `hover-hatch-cyan`
- Line 189: Remove `hover:bg-surface-3`, add `hover-hatch-cyan`
- Line 226: Remove `hover:bg-muted`, add `hover-hatch-cyan`
- Line 414: Remove `hover:bg-surface-3`, add `hover-hatch-cyan`
- Line 475: Remove `hover:bg-surface-3`, add `hover-hatch-cyan`
- Line 657: Remove `hover:bg-surface-3`, add `hover-hatch-cyan`
- Line 759: Remove `hover:bg-surface-3`, add `hover-hatch-cyan`
- Line 794: Remove `hover:bg-surface-3`, add `hover-hatch-cyan`
Do NOT touch line 260 (`hover:text-foreground opacity-40 hover:opacity-100`) -- that is an icon-only button with opacity transition.

**src/components/results-panel.tsx** -- 3 replacements:
- Line 84: Remove `hover:bg-muted`, add `hover-hatch-cyan`. Also remove `hover:border-accent` (the hover-hatch border effect replaces it).
- Line 118: Remove `hover:bg-muted`, add `hover-hatch-cyan`
- Line 184: Remove `hover:bg-muted`, add `hover-hatch-cyan`

**src/components/dev-trace-panel.tsx** -- 1 replacement:
- Line 207: Remove `hover:bg-surface-2`, add `hover-hatch-cyan`

**src/components/problem-input.tsx** -- 1 replacement:
- Line 92: Remove `hover:bg-surface-3`, add `hover-hatch-cyan`

**src/app/evals/page.tsx** -- 1 replacement:
- Line 151: Remove `hover:bg-surface-1`, add `hover-hatch-cyan`

**src/app/page.tsx** -- 4 replacements:
- Line 592: Remove `hover:text-accent`, add `hover-hatch-cyan`
- Line 623: Remove `hover:text-accent`, add `hover-hatch-cyan`
- Line 668: Remove `hover:text-accent`, add `hover-hatch-cyan`
- Line 716: Remove `hover:bg-muted`, add `hover-hatch-cyan`

**src/app/layout.tsx** -- 2 replacements:
- Line 34: Remove `hover:text-foreground`, add `hover-hatch-cyan`
- Line 41: Remove `hover:text-foreground`, add `hover-hatch-cyan`

Important: When adding `hover-hatch-cyan`, place it at the beginning or end of the className string -- not in the middle of Tailwind utility sequences. Keep `transition-colors` or `transition-opacity` if present alongside other non-hover transitions, but the hover-hatch class handles its own transition so remove `transition-colors` only if it was solely there for the hover bg change.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -v "Cannot find module" | head -20</automated>
  </verify>
  <done>All 20 interactive elements across 7 files use hover-hatch-cyan instead of solid hover backgrounds. No hover:bg-surface-*, hover:bg-muted, hover:text-accent, or hover:text-foreground classes remain on interactive containers/triggers (icon-only opacity buttons excluded).</done>
</task>

</tasks>

<verification>
1. `grep -rn "hover:bg-surface-3\|hover:bg-surface-2\|hover:bg-surface-1\|hover:bg-muted" src/components/trace-event-card.tsx src/components/results-panel.tsx src/components/dev-trace-panel.tsx src/components/problem-input.tsx src/app/evals/page.tsx src/app/page.tsx src/app/layout.tsx` -- should return NO matches
2. `grep -rn "hover:text-accent\|hover:text-foreground" src/app/page.tsx src/app/layout.tsx` -- should return NO matches (these were all migrated)
3. `grep -c "hover-hatch-cyan" src/components/trace-event-card.tsx` -- should return 8
4. `grep -c "hover-hatch-cyan" src/app/page.tsx` -- should return 4
5. `npx tsc --noEmit` -- passes (ignoring the pre-existing globals.css module error)
</verification>

<success_criteria>
- Three hover-hatch CSS utility classes defined in globals.css (cyan, white, red)
- All 20 interactive elements across 7 files migrated to hover-hatch-cyan
- No old hover:bg-surface-*, hover:bg-muted classes remain on interactive triggers
- No layout shift on hover (transparent base borders prevent it)
- TypeScript compiles without new errors
</success_criteria>

<output>
After completion, create `.planning/quick/10-migrate-all-interactive-hover-states-to-/10-SUMMARY.md`
</output>
