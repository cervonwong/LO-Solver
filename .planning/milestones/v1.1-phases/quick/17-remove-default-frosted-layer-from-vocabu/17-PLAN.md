---
phase: 17-remove-default-frosted-layer
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/vocabulary-panel.tsx
  - src/components/rules-panel.tsx
  - src/components/dev-trace-panel.tsx
autonomous: true
requirements: []
---

<objective>
Remove the default frosted glass effect from vocabulary and rules panels, and update the dev trace empty state message to be more user-friendly.

Purpose: The panels should have a clean background by default; frosted effect will be applied selectively to other UI elements only. Update help text to guide users.
Output: Three files updated with visual and messaging changes applied.
</objective>

<execution_context>
@/home/cervo/Code/LO-Solver/.claude/get-shit-done/workflows/execute-plan.md
@/home/cervo/Code/LO-Solver/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/home/cervo/Code/LO-Solver/.planning/STATE.md
@/home/cervo/Code/LO-Solver/CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove frosted class from vocabulary and rules panels</name>
  <files>src/components/vocabulary-panel.tsx, src/components/rules-panel.tsx</files>
  <action>
    Open src/components/vocabulary-panel.tsx and find line 29 where the panel container div is defined. The line currently reads: `<div className="frosted flex h-full min-h-[120px] flex-col">`. Remove the `frosted` class, leaving: `<div className="flex h-full min-h-[120px] flex-col">`.

    Repeat the same operation for src/components/rules-panel.tsx at line 97. Remove `frosted` from the container div className.

    The frosted class (rgba(255,255,255,0.04) background + backdrop-filter blur) should not be applied to these panels by default. It will remain on other elements (nav bar, trace sections, activity indicator, popover) where it's still used.
  </action>
  <verify>
    Open the updated files and confirm:
    - src/components/vocabulary-panel.tsx line 29: `className="frosted flex...` has been changed to `className="flex h-full min-h-[120px] flex-col"`
    - src/components/rules-panel.tsx line 97: Same change applied
    Run `npx tsc --noEmit` to verify no TypeScript errors introduced.
  </verify>
  <done>Both panel containers no longer have the frosted class applied. Panels render with clean background.</done>
</task>

<task type="auto">
  <name>Task 2: Update dev trace empty state message</name>
  <files>src/components/dev-trace-panel.tsx</files>
  <action>
    Open src/components/dev-trace-panel.tsx and find line 324 where the empty state text is defined. The line currently contains: `"Awaiting input."`. Change this to: `"Enter a problem on the left for Lex to solve!"`.

    This message is shown when the trace panel is empty and waiting for a problem to be submitted.
  </action>
  <verify>
    Open the updated file and confirm line 324 now reads: `"Enter a problem on the left for Lex to solve!"` instead of `"Awaiting input."`
    Run `npx tsc --noEmit` to verify no TypeScript errors.
  </verify>
  <done>Empty state message updated to guide users on how to start solving problems.</done>
</task>

</tasks>

<verification>
Visual verification post-execution:
1. Run `npm run dev` and navigate to http://localhost:3000
2. Confirm vocabulary panel (left) and rules panel (right in 3-column layout) render without frosted glass background
3. Confirm dev trace panel shows "Enter a problem on the left for Lex to solve!" when empty
4. Confirm other frosted elements (nav bar top border, trace event cards, popover) still display frosted effect
</verification>

<success_criteria>
- Vocabulary panel and rules panel containers no longer have frosted class
- Dev trace empty state message reads "Enter a problem on the left for Lex to solve!"
- All TypeScript checks pass (npx tsc --noEmit)
- No visual regressions on other frosted elements
</success_criteria>

<output>
After completion, create `.planning/quick/17-remove-default-frosted-layer-from-vocabu/17-SUMMARY.md`
</output>
