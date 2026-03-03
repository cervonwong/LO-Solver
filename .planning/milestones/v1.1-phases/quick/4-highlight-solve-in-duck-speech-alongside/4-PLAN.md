---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/lib/mascot-messages.ts]
autonomous: true
requirements: [QUICK-4]

must_haves:
  truths:
    - "All 5 ready-state mascot messages highlight both 'Scroll down' AND 'SOLVE' in accent blue"
  artifacts:
    - path: "src/lib/mascot-messages.ts"
      provides: "Ready-state message variants with dual accent segments"
      contains: "SOLVE"
  key_links: []
---

<objective>
Highlight "SOLVE" as an accent segment in all 5 ready-state duck mascot messages, alongside the existing "Scroll down" accent highlight.

Purpose: Both the scroll instruction and the button name are equally important calls to action and should share the same visual emphasis.
Output: Updated `src/lib/mascot-messages.ts` with split segments.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/mascot-messages.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Split ready-state message segments to accent-highlight SOLVE</name>
  <files>src/lib/mascot-messages.ts</files>
  <action>
In the `ready` array of `MASCOT_MESSAGES`, each variant currently has 3 segments where the third segment contains the word 'SOLVE' as plain text inside quotes. Split each variant's third segment into 3 parts so that 'SOLVE' (without surrounding single-quotes) becomes its own `{ text: 'SOLVE', accent: true }` segment, with the surrounding text as plain segments. Keep the single quotes in the surrounding plain-text segments for readability (e.g., `" and hit '"` and `"' — I'll get quacking!"`).

The 5 variants should become (showing only the segments after the existing "Scroll down" accent segment):

Variant 1: `" and hit '", { text: "SOLVE", accent: true }, "' — I'll get quacking!"`
Variant 2: `" and smash that '", { text: "SOLVE", accent: true }, "' button!"`
Variant 3: `" to click '", { text: "SOLVE", accent: true }, "' and watch me fly!"`
Variant 4: `" and press '", { text: "SOLVE", accent: true }, "' — let's do this!"`
Variant 5: `" to click '", { text: "SOLVE", accent: true }, "' — I'll give it my best quack!"`

Each ready variant goes from 3 segments to 5 segments. No other states (idle, solving, solved, error) are modified.

Format with Prettier conventions (2-space indent, single quotes, 100 char width).
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" | xargs -I{} test {} -eq 0 && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>All 5 ready-state variants have 5 segments each, with both "Scroll down" and "SOLVE" marked as accent: true. TypeScript compiles without new errors.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring the pre-existing globals.css error)
- Inspect `src/lib/mascot-messages.ts` ready array: each of the 5 variants has exactly 2 segments with `accent: true` ("Scroll down" and "SOLVE")
</verification>

<success_criteria>
Both "Scroll down" and "SOLVE" render with accent (blue) styling in all 5 ready-state mascot messages.
</success_criteria>

<output>
After completion, create `.planning/quick/4-highlight-solve-in-duck-speech-alongside/4-SUMMARY.md`
</output>
