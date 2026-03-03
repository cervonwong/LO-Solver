---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/mascot-messages.ts
autonomous: true
must_haves:
  truths:
    - "When a problem is pasted (ready state), all duck speech variants tell the user to scroll down to find the Solve button"
  artifacts:
    - path: "src/lib/mascot-messages.ts"
      provides: "Updated ready-state mascot messages"
      contains: "Scroll down"
  key_links: []
---

<objective>
Update the duck mascot's "ready" speech variants to say "Scroll down to click 'SOLVE'" instead of just "click Solve", making it clearer where the button is located on the page.

Purpose: Users may not realize the Solve button is below the fold after pasting a problem. The duck should guide them.
Output: Updated mascot-messages.ts with revised ready-state messages.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/mascot-messages.ts
@DESIGN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update ready-state duck speech to mention scrolling down</name>
  <files>src/lib/mascot-messages.ts</files>
  <action>
Update all 5 message variants in the `ready` array of `MASCOT_MESSAGES` to include guidance about scrolling down to find the Solve button. The key change: instead of just "Hit Solve" or "Click Solve", messages should say "Scroll down to click 'SOLVE'" or similar phrasing that communicates the button is further down the page.

Keep the duck's playful personality and accent styling on key action words. The accent span should cover "Scroll down" or the full call-to-action phrase to draw the user's eye.

Example rewrites (adapt to match each variant's tone):
- Variant 1: "Ooh, that's a juicy one! {Scroll down}[accent] and hit 'SOLVE' — I'll get quacking!"
- Variant 2: "Now we're talking! {Scroll down}[accent] and smash that 'SOLVE' button!"
- Variant 3: "Ooh I love this kind of puzzle! {Scroll down}[accent] to click 'SOLVE' and watch me fly!"
- Variant 4: "My duck senses are tingling... {Scroll down}[accent] and press 'SOLVE'!"
- Variant 5: "A worthy challenge! {Scroll down}[accent] to click 'SOLVE' — I'll give it my best quack!"

These are suggestions; maintain the existing character and enthusiasm of each variant while ensuring every one clearly communicates "scroll down" and references the SOLVE button.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" | grep -q "^0$" && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>All 5 ready-state mascot messages include "scroll down" guidance pointing to the SOLVE button. TypeScript compiles without new errors.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
- All 5 variants in the `ready` key of `MASCOT_MESSAGES` contain "scroll down" (case-insensitive) and reference SOLVE
</verification>

<success_criteria>
Every ready-state duck speech variant tells the user to scroll down to find and click the SOLVE button, maintaining the duck's playful personality.
</success_criteria>

<output>
After completion, create `.planning/quick/2-improve-duck-speech-to-say-scroll-down-t/2-SUMMARY.md`
</output>
