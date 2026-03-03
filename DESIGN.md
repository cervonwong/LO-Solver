# DESIGN.md

Cyanotype Blueprint theme. White lines on deep navy. No rounded corners. No light mode.

## Color Palette

All colors are CSS variables defined in `src/app/globals.css`.

### Core

| Variable | Value | Use |
|---|---|---|
| `--background` | `#003366` | Page canvas |
| `--foreground` | `rgba(255,255,255,0.8)` | Primary text |
| `--card` | `rgba(0,40,80,0.6)` | Card/popover bg |
| `--card-foreground` | `rgba(255,255,255,0.85)` | Card text |
| `--accent` | `#00ffff` | Active states, links, highlights |
| `--accent-foreground` | `#003366` | Text on cyan bg |
| `--primary` | `#ff3333` | Primary CTA (red stamp) |
| `--primary-foreground` | `#ffffff` | Text on red |
| `--destructive` | `#ff3333` | Errors, failed states |
| `--muted` | `rgba(255,255,255,0.08)` | Hover tint |
| `--muted-foreground` | `rgba(255,255,255,0.5)` | Secondary text |
| `--border` | `rgba(255,255,255,0.2)` | Standard borders |
| `--ring` | `#00ffff` | Focus rings |
| `--radius` | `0` | No rounded corners anywhere |

### Surface Elevation

Layered white opacity for depth. Grid shows through.

| Variable | Value | Use |
|---|---|---|
| `--surface-1` | `rgba(255,255,255,0.04)` | Blueprint cards, nav |
| `--surface-2` | `rgba(255,255,255,0.08)` | Nested content, collapsibles |
| `--surface-3` | `rgba(255,255,255,0.14)` | Hover states, tertiary |

### Border Strengths

| Variable | Value | Use |
|---|---|---|
| `--border-subtle` | `rgba(255,255,255,0.12)` | Faint dividers, inner card borders |
| `--border-strong` | `rgba(255,255,255,0.8)` | Crosshair cards, prominent edges |

### Status

| Variable | Value | Use |
|---|---|---|
| `--status-active` | `#00ffff` | Running/in-progress |
| `--status-success` | `rgba(255,255,255,0.8)` | Completed |
| `--status-warning` | `#ffd700` | Iterations, caution |

### Trace Events

| Variable | Value | Use |
|---|---|---|
| `--trace-agent` | `#cc99ff` | Agent reasoning |
| `--trace-tool` | `#66cccc` | Tool calls |
| `--trace-vocab` | `#66ccaa` | Vocabulary updates |

Each has a `-muted` variant at 0.1 opacity.

## Typography

Two fonts loaded via `next/font/google` in `layout.tsx`:

| CSS Variable | Font | Use |
|---|---|---|
| `--font-sans` | Noto Sans | Body text, labels, metadata |
| `--font-heading` | Architects Daughter | Section headers, stamp buttons, mascot speech |

### Tailwind Classes

- **Headings**: `font-heading text-sm` or `text-lg`
- **Labels**: `uppercase tracking-wider text-xs`
- **Dimension values**: `.dimension` class (cyan, 0.75rem)
- **Timer/monospace numbers**: `tabular-nums`

## CSS Utility Classes

Defined in `globals.css`. Use these instead of inline styles.

| Class | What it does | When to use |
|---|---|---|
| `.blueprint-card` | White border + crosshair pseudo-elements extending 5px past corners + surface-1 bg + blur | Major containers only |
| `.frosted` | `surface-1` bg + `backdrop-filter: blur(2px)` | Panels, headers, nav |
| `.stamp-btn` | Red 3px border, Architects Daughter font, uppercase, -2deg rotation, bouncy hover/active | Primary actions (Solve) |
| `.stamp-btn-secondary` | White 1px border, same font, uppercase, no rotation | Secondary actions (New Problem) |
| `.dimension` | Cyan text, 0.75rem | Durations, counts, coordinates |

## Component Patterns

### Badges

Always `variant="outline"` with transparent bg and colored border matching the event type:

```tsx
<Badge variant="outline" className="border-{color} text-{color} text-[10px]">
```

Color mappings: START=`status-active`, DONE=`foreground`, AGENT=`trace-agent`, TOOL=`trace-tool`, ITER=`status-warning`, VOCAB=`trace-vocab`.

### Borders

- Standard container: `border border-border`
- Inner/nested content: `border border-border-subtle`
- Prominent edge: `border border-border-strong`
- Event type indicator: `border-l-2 border-l-{color}`
- Active tab: `border-b-2 border-accent`
- Pending connector: `border-t border-dashed border-border-subtle`

### Panel Headers

Panel headers use the `.panel-heading` class with a "title block" double-line bottom border (architectural drawing style):

- **Thin line** (1px) + **3px gap** + **thick line** (2px), both in `--border` color
- Implemented via `::after` pseudo-element (no Tailwind border classes needed)
- Do NOT add `border-b border-border` to elements using `.panel-heading` -- the border is built into the class

### Surfaces

Nest surfaces to create depth:
- Panel background: `.frosted` (surface-1)
- Content inside panel: `bg-surface-2`
- Hover state: `bg-surface-3`

### Buttons

- Primary action: `.stamp-btn`
- Secondary action: `.stamp-btn-secondary`
- Inline/floating: `border border-accent bg-background/80 text-xs uppercase tracking-wider text-accent`

### Animations

| Class | Use |
|---|---|
| `.animate-fade-in` | Event card entrance |
| `.animate-slide-in-row` | Table row entrance |
| `.animate-checkmark-scale` | Success checkmark |
| `.animate-blink` | Active cursor/indicator |
| `.animate-plotter` | SVG line-drawing loading |
| `.animate-collapsible` | Expand/collapse sections |

### Active/Running States

- Blinking cyan cursor: `animate-blink text-accent`
- Cyan glow on circles: `shadow-[0_0_6px_rgba(0,255,255,0.4)]`
- Timer format: `T+MM:SS` in `tabular-nums text-accent`

### Error States

Red border container with stamp label:

```tsx
<div className="border border-destructive p-4 text-sm text-destructive">
  <span className="stamp-btn-secondary pointer-events-none mb-2 inline-block border-destructive text-xs text-destructive">
    REVISION REQUIRED
  </span>
</div>
```

## Hover States

Use **diagonal hatched backgrounds** on interactive elements instead of opacity changes or solid color fills.

Pattern: `repeating-linear-gradient` at `-45deg` with `7px` transparent / `1px` colored stripes applied via `background-image`.

### Utility Classes

| Class | What it does | When to use |
|---|---|---|
| `.hover-hatch-cyan` | Cyan diagonal hatching on `:hover` | Interactive elements (triggers, buttons, links) |
| `.hover-hatch-white` | White diagonal hatching on `:hover` | Secondary/neutral elements |
| `.hover-hatch-red` | Red diagonal hatching on `:hover` | Destructive context |
| `.hover-hatch-border` | Transparent border on base, cyan border on `:hover` | **Only** for elements with no existing borders (e.g., nav links) |

The hatching classes set **only** `background-image` — no borders, no padding, no background-color overrides. Elements keep all their own styling. Compose with `.hover-hatch-border` only when the element has no border of its own.

Color values:
- **Cyan** `rgba(0, 255, 255, 0.15)` — accent/interactive elements
- **Red** `rgba(224, 74, 74, 0.15)` — primary stamp buttons
- **White** `rgba(255, 255, 255, 0.12)` — secondary/neutral elements

### Exceptions

- **Icon-only buttons** (opacity toggles, close buttons): keep opacity transitions
- **`.stamp-btn` variants**: have their own built-in hatching hover (don't add `.hover-hatch-*`)
- **`.step-progress-item`**: has its own built-in hatching hover

See `globals.css` for all hover-hatch definitions.

## Rules

1. **No rounded corners.** `--radius: 0` is set globally.
2. **No light mode.** Single blueprint theme. No theme toggle.
3. **Use CSS variables**, not raw hex values (except in globals.css definitions).
4. **Use utility classes** (`.blueprint-card`, `.frosted`, `.stamp-btn`, `.dimension`) instead of reinventing.
5. **Badges are always outline** with transparent bg and colored border.
6. **All labels are uppercase** with `tracking-wider` or `tracking-widest`.
7. **Surface elevation for depth**: surface-1 → surface-2 → surface-3 for nesting.
8. **Cyan = active/interactive.** White = completed. Red = destructive/primary CTA. Gold = warning/iteration.
9. **Body has 20px grid** (`background-attachment: fixed`). Keep surfaces translucent so grid shows through.
10. **Spacing aligns to 20px grid** where possible: padding 15px or 20px, gaps in multiples of 4px.
