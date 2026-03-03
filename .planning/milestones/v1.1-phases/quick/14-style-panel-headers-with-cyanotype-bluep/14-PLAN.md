---
phase: quick-14
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
  - src/components/dev-trace-panel.tsx
  - src/components/vocabulary-panel.tsx
  - src/components/rules-panel.tsx
  - DESIGN.md
autonomous: true
requirements: [QUICK-14]

must_haves:
  truths:
    - "Panel headers display a double-line bottom border (thin 1px + 3px gap + thick 2px)"
    - "Border color is uniform --border (rgba(255,255,255,0.25))"
    - "No duplicate borders from Tailwind classes remain on panel headings"
  artifacts:
    - path: "src/app/globals.css"
      provides: "Double-line border via ::after pseudo-element on .panel-heading"
      contains: "panel-heading"
    - path: "DESIGN.md"
      provides: "Documented .panel-heading border pattern"
      contains: "panel-heading"
  key_links:
    - from: "src/app/globals.css"
      to: "src/components/dev-trace-panel.tsx"
      via: ".panel-heading class"
      pattern: "panel-heading"
    - from: "src/app/globals.css"
      to: "src/components/vocabulary-panel.tsx"
      via: ".panel-heading class"
      pattern: "panel-heading"
    - from: "src/app/globals.css"
      to: "src/components/rules-panel.tsx"
      via: ".panel-heading class"
      pattern: "panel-heading"
---

<objective>
Add a "title block" double-line bottom border to all panel headers, inspired by architectural drawing title blocks.

Purpose: Reinforce the cyanotype blueprint aesthetic with a distinctive panel heading treatment.
Output: Updated `.panel-heading` CSS class with double-border, cleaned component files, updated DESIGN.md.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/app/globals.css (lines 727-732 — .panel-heading class)
@src/components/dev-trace-panel.tsx (line 100 — panel-heading div)
@src/components/vocabulary-panel.tsx (line 30 — panel-heading div)
@src/components/rules-panel.tsx (line 98 — panel-heading div)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add double-line border to .panel-heading and remove Tailwind border classes</name>
  <files>src/app/globals.css, src/components/dev-trace-panel.tsx, src/components/vocabulary-panel.tsx, src/components/rules-panel.tsx</files>
  <action>
    1. In `src/app/globals.css`, update the `.panel-heading` rule (line 728) to add a `::after` pseudo-element that creates the double-line bottom border:
       - Add `position: relative;` to `.panel-heading`
       - Add `.panel-heading::after` with:
         - `content: '';`
         - `position: absolute;`
         - `bottom: 0; left: 0; right: 0;`
         - `height: 6px;` (1px top line + 3px gap + 2px bottom line)
         - `border-top: 1px solid var(--border);` (thin line)
         - `border-bottom: 2px solid var(--border);` (thick line)
         - `pointer-events: none;`

    2. Add `padding-bottom` adjustment: the `.panel-heading` currently uses Tailwind `py-2` (8px). The `::after` sits inside the element at `bottom: 0`, so add `padding-bottom: 14px;` (8px base + 6px for the pseudo-element) to the CSS class to prevent content overlapping the border. Actually, since `py-2` is on the Tailwind side and we want CSS to own the bottom spacing now, set `padding-bottom: 14px !important;` in the `.panel-heading` rule to override the Tailwind `py-2` for the bottom only.

    3. Remove `border-b border-border` from all three component files:
       - `src/components/dev-trace-panel.tsx` line 100: change `border-b border-border px-4 py-2` to `px-4 py-2`
       - `src/components/vocabulary-panel.tsx` line 30: change `border-b border-border px-4 py-2` to `px-4 py-2`
       - `src/components/rules-panel.tsx` line 98: change `border-b border-border px-4 py-2` to `px-4 py-2`
  </action>
  <verify>
    <automated>grep -n "border-b border-border" src/components/dev-trace-panel.tsx src/components/vocabulary-panel.tsx src/components/rules-panel.tsx | wc -l | xargs test 0 -eq && grep -c "panel-heading::after" src/app/globals.css | xargs test 1 -eq && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>All three panel headers render a double-line bottom border from CSS only; no Tailwind border-b classes remain on panel-heading elements</done>
</task>

<task type="auto">
  <name>Task 2: Document panel-heading border pattern in DESIGN.md</name>
  <files>DESIGN.md</files>
  <action>
    In `DESIGN.md`, in the "Component Patterns" section, add a new subsection `### Panel Headers` after the existing `### Borders` subsection (after line 111). Add:

    ```
    ### Panel Headers

    Panel headers use the `.panel-heading` class with a "title block" double-line bottom border (architectural drawing style):

    - **Thin line** (1px) + **3px gap** + **thick line** (2px), both in `--border` color
    - Implemented via `::after` pseudo-element (no Tailwind border classes needed)
    - Do NOT add `border-b border-border` to elements using `.panel-heading` — the border is built into the class
    ```
  </action>
  <verify>
    <automated>grep -c "Panel Headers" DESIGN.md | xargs test 1 -eq && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>DESIGN.md documents the .panel-heading double-border pattern so future components use it correctly</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no new type errors)
- No `border-b border-border` remains on any element with `panel-heading` class
- `.panel-heading::after` pseudo-element exists in globals.css with correct border specs
- DESIGN.md contains Panel Headers subsection
</verification>

<success_criteria>
All three panel headers (dev trace, vocabulary, rules) display a double-line bottom border rendered entirely via CSS. The pattern is documented in DESIGN.md.
</success_criteria>

<output>
After completion, create `.planning/quick/14-style-panel-headers-with-cyanotype-bluep/14-SUMMARY.md`
</output>
