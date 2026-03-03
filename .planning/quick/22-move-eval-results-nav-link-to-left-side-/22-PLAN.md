---
phase: quick-22
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/layout-shell.tsx
autonomous: true
requirements: [QUICK-22]
must_haves:
  truths:
    - "Eval Results link appears on the left side of the nav bar, immediately after the dashboard title"
    - "No separator line exists between the dashboard title and the Eval Results link"
    - "Eval Results link is disabled (opacity-50, pointer-events-none) when a workflow is running"
    - "Right side of nav bar no longer contains the Eval Results link"
  artifacts:
    - path: "src/components/layout-shell.tsx"
      provides: "Rearranged NavBar with Eval Results on left"
  key_links: []
---

<objective>
Move the Eval Results nav link from the right-side control group to the left side of the nav bar, immediately after the dashboard title, with no separator between them.

Purpose: Better visual grouping — navigation links on left, controls on right.
Output: Updated layout-shell.tsx with repositioned Eval Results link.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/layout-shell.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Move Eval Results link to left side of nav bar</name>
  <files>src/components/layout-shell.tsx</files>
  <action>
In the NavBar component of `src/components/layout-shell.tsx`:

1. Replace the bare dashboard title element (the `span` or `Link` for "Lex's Dashboard") with a flex container that holds both the title AND the Eval Results link side by side:
   ```
   <div className="flex items-center gap-4">
     {/* existing dashboard title span/Link — unchanged */}
     <Link
       href="/evals"
       className={`stamp-btn-nav-underline${isRunning ? ' opacity-50 pointer-events-none' : ''}`}
       aria-disabled={isRunning || undefined}
       tabIndex={isRunning ? -1 : undefined}
     >
       Eval Results
       {/* keep the existing arrow SVG icon */}
     </Link>
   </div>
   ```
   There must be NO `<div className="h-5 w-px bg-border" />` separator between the title and the Eval Results link. The gap-4 on the flex container provides spacing.

2. Remove the Eval Results `<Link>` block and its adjacent separator `<div className="h-5 w-px bg-border" />` from the right-side disabled wrapper div. The disabled wrapper should now start directly with `<WorkflowSliders>`.

3. Since Eval Results is no longer inside the disabled wrapper, apply the disabled styling (opacity-50 + pointer-events-none) directly on the Eval Results Link element itself via the conditional className shown above (already included in the snippet).

Keep everything else in the nav bar unchanged.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>Eval Results link renders on the left side of the nav bar immediately after the dashboard title with no separator between them. The right-side control group no longer contains the Eval Results link. The link is still disabled during workflow runs.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring known globals.css error)
- Visual inspection: Eval Results link is left-side, no separator from title
</verification>

<success_criteria>
- Eval Results link appears immediately after "Lex's Dashboard" on the left
- No vertical separator line between them
- Right-side controls start with WorkflowSliders (no Eval Results)
- Eval Results link disabled (opacity + pointer-events) when workflow is running
</success_criteria>

<output>
After completion, create `.planning/quick/22-move-eval-results-nav-link-to-left-side-/22-SUMMARY.md`
</output>
