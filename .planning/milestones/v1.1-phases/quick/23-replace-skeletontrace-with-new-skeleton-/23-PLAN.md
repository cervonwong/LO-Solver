---
phase: quick-23
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/skeleton.tsx
  - src/app/globals.css
  - src/components/dev-trace-panel.tsx
  - src/components/skeleton-trace.tsx
autonomous: true
requirements: [QUICK-23]
must_haves:
  truths:
    - "Three skeleton cards animate in staggered sequence when workflow starts before events arrive"
    - "Each card draws its border with crosshair corners, fills with diagonal hatching, then fades out"
    - "Animation loops continuously until real events replace the skeleton"
  artifacts:
    - path: "src/components/skeleton.tsx"
      provides: "Skeleton loading component with looping blueprint box-drawing animation"
      min_lines: 40
    - path: "src/app/globals.css"
      provides: "Keyframes for skeleton border draw-in, hatch fill, and fade-out"
  key_links:
    - from: "src/components/dev-trace-panel.tsx"
      to: "src/components/skeleton.tsx"
      via: "import { Skeleton }"
      pattern: "import.*Skeleton.*from.*skeleton"
---

<objective>
Replace the static SkeletonTrace component with a new Skeleton component featuring looping blueprint box-drawing animation: 3 staggered cards that draw borders with crosshair overlap, fill with diagonal hatching lines, fade out, and repeat.

Purpose: The current skeleton is unrealistic (single SVG lines that draw once and stop). The new version matches the blueprint theme with continuous looping animation that feels like content being drafted.
Output: New `src/components/skeleton.tsx`, updated import in dev-trace-panel, deleted `skeleton-trace.tsx`.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/components/skeleton-trace.tsx
@src/components/dev-trace-panel.tsx
@src/app/globals.css (animation keyframes section)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Skeleton component and CSS keyframes</name>
  <files>src/components/skeleton.tsx, src/app/globals.css</files>
  <action>
Create `src/components/skeleton.tsx` with the following architecture:

**Component structure:**
- Export `function Skeleton()` (named export, no props needed).
- Render a container `div` with `flex flex-col gap-4 p-4`.
- Map over 3 card indices [0, 1, 2], each rendering an SVG-based card.

**Each card is a single SVG element** (`width="100%" height="80"` with `viewBox="0 0 400 80"` and `preserveAspectRatio="none"`). The SVG contains:

1. **Border lines (4 lines)** — top, right, bottom, left edges of the rect. Each line uses `stroke-dasharray` equal to its length and `stroke-dashoffset` animated from full length to 0. Lines extend ~5px past corners to create crosshair overlap (matching `.blueprint-card` from DESIGN.md).
   - Top line: `(-5, 0)` to `(405, 0)` — total length 410
   - Right line: `(400, -5)` to `(400, 85)` — total length 90
   - Bottom line: `(405, 80)` to `(-5, 80)` — total length 410
   - Left line: `(0, 85)` to `(0, -5)` — total length 90
   - Stroke color: `rgba(255, 255, 255, 0.8)` (matches `--border-strong`)
   - Stroke width: 1
   - All 4 lines animate simultaneously over ~800ms using CSS class `.animate-skeleton-border`

2. **Hatching lines (6-8 diagonal lines at -45deg)** drawn inside the rect area. Each is a line from top-right to bottom-left, spaced evenly across the card height. Use `stroke-dasharray` and `stroke-dashoffset` animated from full to 0.
   - Stroke color: `rgba(255, 255, 255, 0.08)` (matches `--muted` / hover-hatch color)
   - Stroke width: 1
   - Each hatch line uses class `.animate-skeleton-hatch` with staggered `animation-delay`: line 0 at 800ms (after border completes), line 1 at 900ms, line 2 at 1000ms, etc. (~100ms apart).
   - Clip hatching to card bounds using a `clipPath` rect `(0, 0, 400, 80)`.

3. **Fade out** — the entire SVG gets class `.animate-skeleton-fade` which fades opacity from 1 to 0 starting at ~2200ms (after border 800ms + hatch ~800ms + 600ms hold).

**Card stagger timing:**
- Card 0: no extra delay
- Card 1: 600ms delay on all animations
- Card 2: 1200ms delay on all animations
- Apply stagger by wrapping each card's SVG in a div with `style={{ animationDelay }}` or by adding the delay directly to each animation via inline `style` on every animated element within that card.

**Looping:** The total cycle for one card is ~2800ms (800ms border + 800ms hatch + 600ms hold + 300ms fade + 300ms pause). Use `animation-iteration-count: infinite` on all animations. The border, hatch, and fade are parts of a single continuous timeline per card. The simplest approach: use a SINGLE keyframe per element type that includes the draw, hold, and fade phases within one iteration:

- `.animate-skeleton-border`: Single `@keyframes skeleton-border` over ~3200ms total:
  - 0%: `stroke-dashoffset` = full length, `opacity: 1`
  - 25% (~800ms): `stroke-dashoffset: 0` (border fully drawn)
  - 75%: `stroke-dashoffset: 0, opacity: 1` (hold)
  - 90%: `opacity: 0` (fade)
  - 100%: `opacity: 0` (stay invisible, then loop resets)

- `.animate-skeleton-hatch`: Single `@keyframes skeleton-hatch` over ~3200ms total:
  - 0%: `stroke-dashoffset` = full length, `opacity: 0`
  - 25%: `stroke-dashoffset` = full length, `opacity: 0` (wait for border)
  - 50%: `stroke-dashoffset: 0`, `opacity: 1` (hatch drawn)
  - 75%: `opacity: 1` (hold)
  - 90%: `opacity: 0` (fade with border)
  - 100%: `opacity: 0` (stay invisible, loop resets)

Each hatch line gets an additional `animation-delay` for the stagger within the card.

**CSS keyframes to add to `globals.css`** (in the animation keyframes section, after the existing `plotter-draw` keyframe):

```css
/* Skeleton loading — looping blueprint box-drawing */
@keyframes skeleton-border {
  0% { stroke-dashoffset: var(--dash-length); opacity: 1; }
  25% { stroke-dashoffset: 0; opacity: 1; }
  75% { stroke-dashoffset: 0; opacity: 1; }
  90% { opacity: 0; }
  100% { stroke-dashoffset: var(--dash-length); opacity: 0; }
}

@keyframes skeleton-hatch {
  0% { stroke-dashoffset: var(--dash-length); opacity: 0; }
  20% { stroke-dashoffset: var(--dash-length); opacity: 0; }
  45% { stroke-dashoffset: 0; opacity: 1; }
  75% { stroke-dashoffset: 0; opacity: 1; }
  90% { opacity: 0; }
  100% { stroke-dashoffset: var(--dash-length); opacity: 0; }
}
```

Use CSS custom property `--dash-length` on each SVG element (via inline style) so the keyframe can reference it. Set `stroke-dasharray` and `--dash-length` to the same value for each line.

Utility classes:
```css
.animate-skeleton-border {
  animation: skeleton-border 3.2s ease-in-out infinite;
}

.animate-skeleton-hatch {
  animation: skeleton-hatch 3.2s ease-in-out infinite;
}
```

Do NOT use framer-motion. Pure CSS/SVG only.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>
    - `src/components/skeleton.tsx` exists with named `Skeleton` export
    - `globals.css` has `skeleton-border` and `skeleton-hatch` keyframes
    - 3 cards render with staggered timing, each with border draw-in, hatch fill, and fade-out
    - Animation loops continuously (infinite iteration count)
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire Skeleton into dev-trace-panel and delete old component</name>
  <files>src/components/dev-trace-panel.tsx, src/components/skeleton-trace.tsx</files>
  <action>
In `src/components/dev-trace-panel.tsx`:
1. Replace the import line `import { SkeletonTrace } from '@/components/skeleton-trace';` with `import { Skeleton } from '@/components/skeleton';`
2. Replace the usage `<SkeletonTrace />` (line 55) with `<Skeleton />`

Delete the file `src/components/skeleton-trace.tsx` entirely — it is fully replaced.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css" && ! test -f src/components/skeleton-trace.tsx && echo "skeleton-trace.tsx deleted"</automated>
  </verify>
  <done>
    - dev-trace-panel imports and renders `Skeleton` (not `SkeletonTrace`)
    - `skeleton-trace.tsx` no longer exists
    - No TypeScript errors (except pre-existing globals.css one)
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (only pre-existing globals.css error)
- `src/components/skeleton.tsx` exports `Skeleton`
- `src/components/skeleton-trace.tsx` is deleted
- `dev-trace-panel.tsx` imports from `@/components/skeleton`
- CSS keyframes `skeleton-border` and `skeleton-hatch` exist in `globals.css`
</verification>

<success_criteria>
When the workflow starts (events.length === 0 && isRunning), three blueprint-style skeleton cards appear with staggered timing. Each card draws its border with crosshair corners, fills with diagonal hatching, fades out, and loops continuously until real trace events arrive.
</success_criteria>

<output>
After completion, create `.planning/quick/23-replace-skeletontrace-with-new-skeleton-/23-SUMMARY.md`
</output>
