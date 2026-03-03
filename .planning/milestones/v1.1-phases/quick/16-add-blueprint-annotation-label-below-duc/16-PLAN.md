---
phase: quick-16
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/components/lex-mascot.tsx]
autonomous: false
requirements: [QUICK-16]

must_haves:
  truths:
    - "A small dimension bracket SVG appears directly below the duck image"
    - "The text 'LEX THE DUCK' appears below the bracket in muted uppercase"
    - "The speech bubble tail alignment remains visually correct"
  artifacts:
    - path: "src/components/lex-mascot.tsx"
      provides: "Duck mascot with blueprint annotation label"
      contains: "LEX THE DUCK"
  key_links:
    - from: "src/components/lex-mascot.tsx"
      to: "var(--muted-foreground)"
      via: "SVG stroke and text color"
      pattern: "muted-foreground"
---

<objective>
Add a blueprint-style dimension annotation label below the duck mascot image in the LexMascot component, displaying "LEX THE DUCK" with a small SVG dimension bracket.

Purpose: Visual polish — gives the mascot a blueprint-style technical label consistent with the cyanotype theme.
Output: Updated lex-mascot.tsx with annotation below the duck image.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/components/lex-mascot.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add blueprint dimension annotation below duck image</name>
  <files>src/components/lex-mascot.tsx</files>
  <action>
In the LexMascot component's return JSX, wrap the existing `<Image>` element in a `div` with classes `flex flex-col items-center shrink-0`. Keep all Image props unchanged.

Below the Image (inside the wrapper div), add an annotation group with `gap-1` spacing between the image and the annotation:

1. An inline SVG dimension bracket: approximately 40px wide, 8px tall, with a horizontal line and 4px vertical end caps at each end. Use `stroke="var(--muted-foreground)"` and `strokeWidth="1"`. No fill. The SVG viewBox should be `"0 0 40 8"` with three lines:
   - Left cap: line from (0,0) to (0,4) — vertical 4px endcap
   - Horizontal bar: line from (0,4) to (40,4) — connecting bar
   - Right cap: line from (40,0) to (40,4) — vertical 4px endcap

2. A `<span>` with text "LEX THE DUCK" styled with Tailwind classes: `text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5` (uses Noto Sans, the default --font-sans).

The wrapper div should use `gap-1` to create a small gap between the image and the annotation group. The annotation SVG and text can be direct children of the wrapper or wrapped in their own flex-col container — whichever keeps markup minimal.

After wrapping the Image, check that the SVG speech bubble tail (the `<svg>` with `mt-3`) still aligns properly with the speech bubble. The `mt-3` on the tail may need a slight tweak (e.g., increasing to `mt-4` or `mt-5`) since the overall mascot column is now taller. Visually the tail should still point at the vertical center-ish of the duck image, not at the label text. Adjust only if the wrapper changes the alignment.

Use CSS variable `var(--muted-foreground)` for both SVG stroke and text color (via Tailwind `text-muted-foreground`). Do NOT use raw hex/rgba values.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" | grep -q "^0$" && echo "PASS: No new type errors" || echo "FAIL: Type errors found"</automated>
  </verify>
  <done>The LexMascot component renders the duck image with a dimension bracket SVG and "LEX THE DUCK" label below it, all in muted-foreground color. No new TypeScript errors introduced.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Visual verification of annotation label</name>
  <what-built>Blueprint-style "LEX THE DUCK" annotation label below the duck mascot image, with a small SVG dimension bracket.</what-built>
  <how-to-verify>
    1. Run `npm run dev:next` if not already running
    2. Visit http://localhost:3000
    3. Look at the duck mascot in the top-left area
    4. Verify: Small horizontal bracket line with vertical endcaps appears below the duck image
    5. Verify: "LEX THE DUCK" text appears below the bracket in muted/subtle color
    6. Verify: Text is small (10px), uppercase, with letter spacing
    7. Verify: Speech bubble tail still aligns correctly with the duck (not pointing at the label)
    8. Verify: Label does not compete visually with the speech bubble — it should be subtle
  </how-to-verify>
  <resume-signal>Type "approved" or describe any alignment/sizing issues to fix</resume-signal>
</task>

</tasks>

<verification>
- TypeScript compiles without new errors
- Visual inspection confirms annotation renders correctly below duck
- Speech bubble tail alignment preserved
</verification>

<success_criteria>
- "LEX THE DUCK" label visible below duck image with dimension bracket
- Uses var(--muted-foreground) for both SVG and text
- Blueprint theme consistency maintained
- No layout regressions in mascot + speech bubble alignment
</success_criteria>

<output>
After completion, create `.planning/quick/16-add-blueprint-annotation-label-below-duc/16-SUMMARY.md`
</output>
