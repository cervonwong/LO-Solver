---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/workflow-sliders.tsx
  - src/components/provider-mode-toggle.tsx
  - src/components/layout-shell.tsx
autonomous: true
requirements: [QUICK-13]
must_haves:
  truths:
    - "Rounds and Perspectives sliders are stacked vertically with minimal spacing"
    - "Provider toggle items have reduced vertical padding"
    - "Navbar still fits in a single horizontal bar without overflow"
  artifacts:
    - path: "src/components/workflow-sliders.tsx"
      provides: "Vertically stacked sliders"
    - path: "src/components/provider-mode-toggle.tsx"
      provides: "Reduced vertical padding on toggle items"
    - path: "src/components/layout-shell.tsx"
      provides: "Updated nav layout to accommodate vertical stacking"
  key_links:
    - from: "src/components/layout-shell.tsx"
      to: "src/components/workflow-sliders.tsx"
      via: "<WorkflowSliders /> render in NavBar"
    - from: "src/components/layout-shell.tsx"
      to: "src/components/provider-mode-toggle.tsx"
      via: "<ProviderModeToggle /> render in NavBar"
---

<objective>
Stack the Rounds and Perspectives sliders vertically and reduce vertical padding on the provider mode toggle items, creating a more compact navbar controls section.

Purpose: The current horizontal layout of Rounds + Perspectives sliders takes up horizontal space. Stacking them vertically and tightening the provider toggle padding makes the navbar more compact.
Output: Updated navbar with vertically stacked sliders and tighter provider toggle.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/components/workflow-sliders.tsx
@src/components/provider-mode-toggle.tsx
@src/components/layout-shell.tsx

<interfaces>
<!-- Current WorkflowSliders layout (line 9-11): -->
<!-- Outer: flex items-center gap-4 (horizontal, two slider groups side by side) -->
<!-- Each slider group: flex items-center gap-1.5 -->

<!-- Current ProviderModeToggle (line 24, 51): -->
<!-- Outer: flex flex-col items-center gap-0.5 -->
<!-- ToggleGroupItem: px-3 py-0.5 -->

<!-- Current NavBar (layout-shell.tsx lines 101-108): -->
<!-- WorkflowSliders and ProviderModeToggle in: flex items-center gap-4 -->
<!-- Separated by: div.h-5.w-px.bg-border (vertical divider) -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Stack sliders vertically and reduce provider toggle padding</name>
  <files>src/components/workflow-sliders.tsx, src/components/provider-mode-toggle.tsx</files>
  <action>
In `workflow-sliders.tsx`:
- Change the outer container from `flex items-center gap-4` to `flex flex-col gap-0.5` so the Rounds and Perspectives sliders stack vertically with minimal (2px) gap between them.
- Keep each individual slider row as `flex items-center gap-1.5` (unchanged).
- The `font-heading text-sm` and disabled classes remain on the outer container.

In `provider-mode-toggle.tsx`:
- On each `ToggleGroupItem` (line 51), reduce vertical padding from `py-0.5` to `py-0` for tighter toggle items.
- On the outer wrapper `div` (line 24), keep `gap-0.5` between the "Select Provider" label and the toggle group.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -20</automated>
  </verify>
  <done>Rounds and Perspectives sliders render stacked vertically with minimal gap. Provider toggle items have zero vertical padding. TypeScript compiles without new errors.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring the known globals.css error)
- Visual check: navbar renders with sliders stacked, toggles compact
</verification>

<success_criteria>
- Rounds slider sits directly above Perspectives slider with minimal spacing
- Provider toggle items are vertically tighter than before
- No horizontal overflow or layout breakage in the navbar
</success_criteria>

<output>
After completion, create `.planning/quick/13-stack-rounds-and-perspective-sliders-ver/13-SUMMARY.md`
</output>
