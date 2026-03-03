---
phase: quick-15
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
  - src/components/layout-shell.tsx
autonomous: true
requirements: [QUICK-15]

must_haves:
  truths:
    - "Top bar is visibly shorter than before (reduced vertical padding)"
    - "Left side shows 'Lex's Dashboard' with view_quilt icon to its left"
    - "Eval Results has arrow_forward icon to its right"
    - "Both nav links use bottom-border-only styling (no top/left/right borders)"
    - "Hover on either link produces a visible bottom-border color change"
  artifacts:
    - path: "src/app/globals.css"
      provides: ".stamp-btn-nav-underline class"
      contains: "stamp-btn-nav-underline"
    - path: "src/components/layout-shell.tsx"
      provides: "Restyled NavBar with reduced height, renamed links, inline SVG icons"
      contains: "Lex's Dashboard"
  key_links:
    - from: "src/components/layout-shell.tsx"
      to: "src/app/globals.css"
      via: "stamp-btn-nav-underline class usage"
      pattern: "stamp-btn-nav-underline"
---

<objective>
Redesign the top navigation bar: reduce its height, rename "LO-Solver" to "Lex's Dashboard", restyle both "Lex's Dashboard" and "Eval Results" as bottom-border-only buttons with custom SVG icons, and add a new CSS class for the underline button style.

Purpose: Visual refinement of the nav bar for a cleaner, more compact look with distinctive icon-labeled navigation links.
Output: Updated layout-shell.tsx and globals.css with new nav styling.
</objective>

<context>
@DESIGN.md
@src/components/layout-shell.tsx
@src/app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add .stamp-btn-nav-underline CSS class</name>
  <files>src/app/globals.css</files>
  <action>
Add a new `.stamp-btn-nav-underline` class in globals.css immediately after the `.stamp-btn-nav-neutral` block (after line 394). The class should:

```css
/* Stamp button (nav underline — bottom-border-only nav links) */
.stamp-btn-nav-underline {
  font-family: var(--font-heading);
  background: transparent;
  color: var(--foreground);
  border: none;
  border-bottom: 2px solid var(--foreground);
  font-size: 0.8rem;
  text-transform: uppercase;
  cursor: pointer;
  padding: 4px 8px 3px;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stamp-btn-nav-underline:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}
```

Key details:
- Matches font-family, font-size, text-transform of existing `.stamp-btn-nav-*` buttons
- Only bottom border (2px solid foreground), no top/left/right borders
- Hover changes color and border-bottom-color to accent cyan with subtle text glow
- `display: inline-flex` with `align-items: center` and `gap: 4px` for icon+text alignment
- Padding: 4px horizontal top, 3px bottom (slight asymmetry for visual balance with underline)
  </action>
  <verify>grep -c "stamp-btn-nav-underline" src/app/globals.css returns at least 2 (base + hover)</verify>
  <done>.stamp-btn-nav-underline class exists in globals.css with base and hover states, using bottom-border-only styling with cyan hover effect</done>
</task>

<task type="auto">
  <name>Task 2: Restyle NavBar — reduce height, rename, add icons, apply underline class</name>
  <files>src/components/layout-shell.tsx</files>
  <action>
Modify the NavBar component in layout-shell.tsx with these changes:

1. **Reduce nav height**: Change `py-3` to `py-1.5` on the `<nav>` element (line 15).

2. **Rename and restyle the left "LO-Solver" link/span**:
   - Change text from "LO-Solver" to "Lex's Dashboard" in BOTH the `<span>` (home page) and `<Link>` (other pages) variants
   - For BOTH variants, replace the current classes with `stamp-btn-nav-underline`
   - Remove `hover-hatch-cyan hover-hatch-border` from the Link variant (the underline class handles hover)
   - Remove `px-3 py-1.5` from the Link variant (the underline class has its own padding)
   - Add the view_quilt SVG icon BEFORE the text (left side), inside both the span and the Link:
     ```tsx
     <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor" className="inline-block">
       <path d="M160-240v-480h640v480H160Zm237.62-260H760v-180H397.62v180Zm200.92 220H760v-180H598.54v180Zm-200.92 0h160.92v-180H397.62v180ZM200-280h157.62v-400H200v400Z"/>
     </svg>
     ```

3. **Restyle "Eval Results" link**:
   - Replace classes `hover-hatch-cyan hover-hatch-border px-3 py-1.5 font-heading text-sm text-foreground/80` with `stamp-btn-nav-underline`
   - Add the arrow_forward SVG icon AFTER the text (right side), inside the Link:
     ```tsx
     <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor" className="inline-block">
       <path d="M683.15-460H200v-40h483.15L451.46-731.69 480-760l280 280-280 280-28.54-28.31L683.15-460Z"/>
     </svg>
     ```

The final left section should look like:
```tsx
{pathname === '/' ? (
  <span className="stamp-btn-nav-underline">
    <svg ...>view_quilt path</svg>
    Lex&apos;s Dashboard
  </span>
) : (
  <Link href="/" className="stamp-btn-nav-underline">
    <svg ...>view_quilt path</svg>
    Lex&apos;s Dashboard
  </Link>
)}
```

The Eval Results link should look like:
```tsx
<Link href="/evals" className="stamp-btn-nav-underline" ...>
  Eval Results
  <svg ...>arrow_forward path</svg>
</Link>
```

Note: Use `Lex&apos;s Dashboard` for the apostrophe in JSX (or use curly braces with template string: `{"Lex's Dashboard"}`).
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" returns 0 (no new type errors beyond the known CSS module one)</verify>
  <done>NavBar has reduced height (py-1.5), displays "Lex's Dashboard" with view_quilt icon on left, "Eval Results" with arrow_forward icon on right, both using stamp-btn-nav-underline styling</done>
</task>

</tasks>

<verification>
1. `grep "stamp-btn-nav-underline" src/app/globals.css` — CSS class defined
2. `grep "stamp-btn-nav-underline" src/components/layout-shell.tsx` — class applied to nav links
3. `grep "Lex" src/components/layout-shell.tsx` — rename confirmed
4. `grep "py-1.5" src/components/layout-shell.tsx` — reduced height confirmed
5. `npx tsc --noEmit` — no new type errors
</verification>

<success_criteria>
- Nav bar is visibly shorter with py-1.5 padding
- "LO-Solver" renamed to "Lex's Dashboard" with view_quilt icon on left
- "Eval Results" has arrow_forward icon on right
- Both nav links use bottom-border-only styling via .stamp-btn-nav-underline
- Hover produces cyan bottom border and text color change
- No TypeScript errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/15-redesign-top-bar-with-reduced-height-bot/15-SUMMARY.md`
</output>
