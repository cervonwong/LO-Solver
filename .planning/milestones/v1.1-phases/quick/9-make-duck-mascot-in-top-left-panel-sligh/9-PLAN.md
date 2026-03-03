---
phase: quick-9
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/lex-mascot.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Duck mascot image in the left panel is visibly larger than before (~25% increase)"
  artifacts:
    - path: "src/components/lex-mascot.tsx"
      provides: "Mascot component with increased image dimensions"
      contains: "width={76}"
  key_links: []
---

<objective>
Increase the duck mascot image size in the left panel (step progress area) by ~25%.

Purpose: The mascot feels a bit small in the panel; a slight bump makes it more prominent.
Output: Updated lex-mascot.tsx with larger Image dimensions.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/lex-mascot.tsx
</context>

<interfaces>
From src/components/lex-mascot.tsx (lines 95-102):
```tsx
<Image
  src={imageSrc}
  alt="Lex the duck mascot"
  width={60}
  height={60}
  className="shrink-0"
  priority
/>
```
Current dimensions: 60x60. Target: 76x76 (~27% increase).
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Increase duck mascot image dimensions</name>
  <files>src/components/lex-mascot.tsx</files>
  <action>
In `src/components/lex-mascot.tsx`, find the `<Image>` component rendering the mascot (around line 95-102). Change `width={60}` to `width={76}` and `height={60}` to `height={76}`. This is a ~27% size increase.

No other changes needed. The speech bubble tail SVG and layout use flexbox and will adapt naturally.
  </action>
  <verify>
    <automated>grep -n 'width={76}' src/components/lex-mascot.tsx && grep -n 'height={76}' src/components/lex-mascot.tsx</automated>
  </verify>
  <done>Duck mascot Image component renders at 76x76 instead of 60x60</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring the known globals.css error)
- Mascot image dimensions changed from 60x60 to 76x76 in lex-mascot.tsx
</verification>

<success_criteria>
Duck mascot in the step progress panel is rendered at 76x76, visibly larger than the previous 60x60.
</success_criteria>

<output>
After completion, create `.planning/quick/9-make-duck-mascot-in-top-left-panel-sligh/9-SUMMARY.md`
</output>
