# Cyanotype Blueprint Theme — Design Doc

## Overview

Complete visual redesign of the LO-Solver UI from the current neutral shadcn/ui aesthetic to a "Cyanotype Blueprint" theme. The design draws from technical drafting blueprints: white lines on deep blue background, crosshair corner markers, stamp-style buttons, and a 20px construction grid.

**Approach**: CSS Variable Override (Option A). Rewrite the color/theme system in `globals.css`, add blueprint-specific CSS utilities, and make targeted component edits where structural changes are needed. shadcn/ui primitives stay intact underneath.

**Theme toggle**: Removed. Blueprint-only (no light/dark switching).

---

## 1. Color System & Background

### Base Palette (CSS Variables)

| Role                   | Value                    | Notes                                                       |
| ---------------------- | ------------------------ | ----------------------------------------------------------- |
| `--background`         | `#003366`                | Deep matte blueprint blue. Entire page canvas.              |
| `--foreground`         | `rgba(255,255,255,0.8)`  | Drafting white at 80%. All primary text.                    |
| `--card` / `--popover` | `rgba(0,40,80,0.6)`      | Translucent blue for elevated surfaces. Grid shows through. |
| `--card-foreground`    | `rgba(255,255,255,0.85)` | Brighter text on cards.                                     |
| `--muted`              | `rgba(255,255,255,0.08)` | Subtle white tint for hover/inactive.                       |
| `--muted-foreground`   | `rgba(255,255,255,0.5)`  | Faded lines for secondary text.                             |
| `--border`             | `rgba(255,255,255,0.2)`  | Thin white construction lines.                              |
| `--accent`             | `#00FFFF`                | Cyan. Measurements, active highlights, links.               |
| `--accent-foreground`  | `#003366`                | Text on cyan backgrounds.                                   |
| `--destructive`        | `#FF3333`                | Redline. Errors, corrections.                               |
| `--primary`            | `#FF3333`                | Primary CTA uses redline.                                   |
| `--primary-foreground` | `#FFFFFF`                | White on red.                                               |
| `--ring`               | `#00FFFF`                | Focus rings in cyan.                                        |

### Status Colors

| Token              | Color                   | Rationale                                    |
| ------------------ | ----------------------- | -------------------------------------------- |
| `--status-active`  | `#00FFFF`               | Running states use measurement cyan.         |
| `--status-success` | `rgba(255,255,255,0.8)` | Completed = solid drafting white.            |
| `--status-warning` | `#FFD700`               | Iteration annotations in gold (pencil mark). |

### Background Texture

Layered CSS background on `<body>`:

1. **Grid**: `linear-gradient` creating 1px white lines at 20px intervals (visible construction grid per designer spec).
2. **Noise**: Inline SVG `feTurbulence` filter at 0.03 opacity for vellum paper grain.
3. **Base**: `#003366`.

`background-attachment: fixed` so the grid stays stable during scroll.

### Border Radius

Set `--radius: 0`. Blueprints are angular. Propagates through all shadcn components.

---

## 2. Typography & Fonts

### Fonts (loaded via `next/font/google`)

- **Protest Riot** — Display headings and section titles.
- **Architects Daughter** — Stamp buttons and Lex speech bubble.
- **Noto Sans** — All body text, UI labels, metadata.

### Application Rules

| Element                     | Font                    | Notes                           |
| --------------------------- | ----------------------- | ------------------------------- |
| Section headers             | Protest Riot            | "Dev Trace", "Vocabulary", etc. |
| Lex speech bubble           | Architects Daughter     | Handwritten personality voice   |
| Stamp button labels         | Architects Daughter     | "SOLVE", "NEW PROBLEM"          |
| Body text, labels, metadata | Noto Sans               | Clean readability               |
| Textarea, JSON, code        | System monospace        | Keep as-is                      |
| Dimension/coordinate values | Courier New / monospace | Cyan-colored                    |

### Special Treatments

- **Button text**: `uppercase tracking-widest font-semibold`
- **Badge text**: `uppercase tracking-wider text-[10px]`, transparent bg, colored 1px border
- **Muted annotations**: `rgba(255,255,255,0.5)` with `text-xs`

### Spacing

All gutters aligned to 20px grid: `20px`, `40px`, `60px`. Component padding: `15px` or `20px`.

---

## 3. Component Restyling

### Crosshair Cards (Major Containers Only)

Applied to: left panel, right panel, problem input section, results panel, dev trace section headers, vocabulary panel.

Implementation: Two pseudo-elements (`::before`, `::after`) creating 1px white lines extending 5px beyond each corner. Card border: `1px solid rgba(255,255,255,0.8)`. Background: `rgba(0,51,102,0.9)`.

Reusable `.blueprint-card` CSS class + `<BlueprintCard>` React component.

**Inner cards** (trace events, answer cards): Simple `1px solid rgba(255,255,255,0.2)` borders, no crosshairs.

### Stamp Buttons

**Primary (Red stamp)**: `3px solid #FF3333` border, transparent bg, Architects Daughter, uppercase, `-2deg` rotation. Hover: `rgba(255,51,51,0.1)` fill. Active: `scale(0.92)`, `blur(0.6px)`, red glow.

**Secondary (White stamp)**: Same structure, white border/text, no rotation, `1px` border.

### Select Dropdown

Transparent bg, `1px solid` white border, white text, cyan highlight on selected option.

### Textarea

`1px solid rgba(255,255,255,0.3)` border, transparent bg (grid visible), white text, `font-mono`. Focus: cyan border + `box-shadow: 0 0 8px rgba(0,255,255,0.2)`.

### Badges

Transparent bg, `1px` colored border, colored text. Uppercase tracking-wider.

### Resizable Panel Handles

Thin `1px` cyan line with small cyan diamond indicator at center.

---

## 4. Layout Changes & New Elements

### Nav Bar

Remove "LO-Solver" title. Remove ThemeToggle. Keep only ModelModeToggle on the right. Thin blueprint border bottom.

### Lex the Duck Mascot

**Position**: Top of left panel, always visible (never collapses).

**Layout**: 60x60px placeholder image (blueprint-line duck SVG or circle with "LEX") on the left. Speech bubble on the right with Architects Daughter text: "I'm Lex, the Linguistics Olympiad Problem solving duck! **Copy and paste** a LO Problem below or try one of my examples!" Bold text in cyan. Bubble styled as blueprint annotation with thin white border and triangular tail.

### Problem Input Redesign

Entire collapsible section (title + selector + textarea + button) wrapped in a `BlueprintCard`. Title is a section header inside the card. When collapsed: shows only header bar with cyan chevron + one-line problem preview.

### Example Loading State

SVG plotter animation: `stroke-dashoffset` animates drawing "LOADING SCHEMATIC..." text in white blueprint lines. ~1 second, then replaced by actual problem text.

### Right Panel Empty State

`flex items-center justify-center h-full`. Crosshair reticle (thin cyan `+` lines) with "AWAITING INPUT" text below in `uppercase tracking-widest text-xs`.

---

## 5. Trace, Progress & Status

### Step Progress Bar

- Step circles: `1px solid` border (not filled). Active: cyan border + text + glow. Completed: solid white. Pending: faded white dashed. Failed: red.
- Connectors: `1px solid`. Completed: white 60%. Active: cyan. Pending: dashed faded.
- No `animate-pulse`. Steady cyan glow for active.
- Labels: Noto Sans `text-xs uppercase tracking-wider`.

### Activity Indicator

- Blinking cyan `>` cursor instead of dot.
- Text: `ACTIVE: {agentName}` uppercase tracking-wider cyan.
- Time: monospace cyan `T+00:42` format.
- Complete: white `>` (no blink), `COMPLETE` label.

### Dev Trace Panel

- Section headers: Protest Riot, cyan `>` cursor for running sections.
- Event cards: `1px solid rgba(255,255,255,0.15)` border, `2px` left color indicator.
- Badges: transparent bg, 1px colored border. START=cyan, DONE=white, AGENT=purple, TOOL=teal, ITER=gold.

### Skeleton / Plotter Loading

Replace shimmer with SVG plotter animation: paths draw themselves left-to-right via `stroke-dashoffset`, revealing card wireframes.

### Vocabulary Panel

- Protest Riot header. Entry count in cyan monospace.
- Table: `1px solid rgba(255,255,255,0.2)` cell borders. Header: uppercase faded. Keep `slide-in-row` animation.
- Mutation badges: Added=white border, Updated=gold, Removed=red.

### Results Panel

- Tabs: underline style. Active: cyan underline + text. Inactive: white, no underline.
- Answer cards: thin white border. Confidence: HIGH=white, MEDIUM=gold, LOW=red (redline for low confidence).

### Error States

Red border + "REVISION REQUIRED" stamp label. Redline annotation aesthetic.

### "Jump to Latest" Button

Cyan-bordered pill, translucent blue bg, `text-xs uppercase` "JUMP TO LATEST" + down arrow.

---

## Files Changed

### Modified

- `src/app/globals.css` — Complete color system rewrite, grid background, blueprint utilities, crosshair card class, stamp button class, plotter animation keyframes
- `src/app/layout.tsx` — Font loading (Protest Riot, Architects Daughter, Noto Sans), remove ThemeToggle, remove title
- `src/app/page.tsx` — Add Lex mascot section, restructure problem input collapsible, fix right panel centering, loading state
- `src/components/problem-input.tsx` — BlueprintCard wrapper, loading state, collapsed preview
- `src/components/step-progress.tsx` — Blueprint-adapted step circles, connectors, labels
- `src/components/activity-indicator.tsx` — Blinking cursor, mission control formatting
- `src/components/dev-trace-panel.tsx` — Section headers, badge restyling
- `src/components/trace-event-card.tsx` — Border/badge adaptations
- `src/components/results-panel.tsx` — Underline tabs, confidence badge colors
- `src/components/vocabulary-panel.tsx` — Header, table, mutation badge restyling
- `src/components/skeleton-trace.tsx` — Replace shimmer with plotter SVG animation

### New

- `src/components/blueprint-card.tsx` — Reusable crosshair card wrapper
- `src/components/lex-mascot.tsx` — Duck mascot with speech bubble

### Removed

- `src/components/theme-toggle.tsx` — No longer needed (single theme)
- `src/hooks/use-theme.ts` — No longer needed
