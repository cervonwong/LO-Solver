# Polished Pipeline Monitor -- UI Redesign

## Context

The current UI is a monochrome, monospace, developer-oriented split-pane tool. It works but
feels like a prototype: jarring streaming UX, no dark mode, flat visual hierarchy, and raw
text rendering for agent reasoning and tool call JSON.

## Audience

Developer/researcher (primary user). Information density and pipeline observability are
priorities. The UI should look like a polished product, not a prototype, while keeping the
trace panel dominant.

## Design Decisions

### Layout: Three-Panel Resizable

```
┌──────────────────────────────────────────────────────────┐
│  Nav: "LO-Solver"                    [theme] [mode]      │
├─────────────┬────────────────────────────────────────────┤
│             │                                            │
│  LEFT ~35%  │  RIGHT-TOP ~70% of right column            │
│             │                                            │
│  Input +    │  Dev Trace                                 │
│  Results    │  (activity indicator, streaming events,    │
│  (tabbed)   │   agent reasoning, tool calls)             │
│             │                                            │
│             ├────────────────────────────────────────────┤
│             │  RIGHT-BOTTOM ~30% of right column         │
│             │                                            │
│             │  Vocabulary Table (live-updating)           │
│             │  [mutation summary badge]                   │
│             │                                            │
└─────────────┴────────────────────────────────────────────┘
```

- Outer: horizontal `ResizablePanelGroup` (left 35% | right 65%)
- Right: vertical `ResizablePanelGroup` (trace 70% | vocabulary 30%)
- All splits user-resizable with grip handles
- Left panel spans full height

**Left panel:**

1. Problem Input (collapsible, auto-collapses when solving)
2. Step Progress bar (4-step indicator, upgraded visually)
3. Results as Radix Tabs (Answers | Rules). Vocabulary removed from here.

**Right-top:** Dev Trace with same step-grouping architecture but rich rendering.

**Right-bottom:** Persistent vocabulary table. Visible from solve start. Live-updating with
mutation summary badge. Future: becomes a general "live results" panel.

### Color System: Semantic Functional Palette

All colors as CSS custom properties with light/dark variants.

| Role                 | Usage                                           | Approximate hue      |
| -------------------- | ----------------------------------------------- | -------------------- |
| In-progress / Active | Active step, running badge, streaming indicator | Blue                 |
| Success / Complete   | Completed step, pass badge                      | Green                |
| Warning / Iteration  | Iteration badges, partial-pass                  | Amber                |
| Error / Fail         | Failed step, error banner                       | Red (existing)       |
| Agent reasoning      | Left-border accent on reasoning cards           | Purple               |
| Tool call            | Left-border accent on tool call cards           | Cyan                 |
| Vocabulary           | Vocab mutation badges, bottom panel accent      | Teal                 |
| Neutral              | Backgrounds, borders, text hierarchy            | Grayscale (existing) |

**Application method:** Left-border accents (3-4px) on cards, low-opacity badge tints,
step progress fills, subtle background tints (5-8% opacity) on active sections. Not
background fills everywhere.

### Dark Mode

- System preference detection via `prefers-color-scheme`
- Manual toggle in nav bar (sun/moon icon)
- `localStorage` persistence, `useSyncExternalStore` pattern (same as model mode toggle)
- `.dark` class on `<html>`

### Typography

- Body/UI: system sans-serif (`font-sans`). Monospace only in `<pre>`, `<code>`, tool JSON.
- Sizing hierarchy:
  - Section headers: `text-base` (16px) `font-semibold`
  - Body: `text-sm` (14px)
  - Badges: `text-xs` (12px)
  - Muted metadata: `text-xs` `text-muted-foreground`

### Rich Content Rendering

**Agent reasoning:** Rendered via `<Streamdown>` from `streamdown` package. Supports
markdown formatting (lists, bold, inline code for linguistic forms). Shiki syntax
highlighting via `@streamdown/code`.

**Tool call JSON:** Wrapped in markdown code fence, rendered through streamdown for Shiki
highlighting. Collapsible with one-line summary for large payloads.

**Collapsible animations:** CSS transitions on Radix Collapsible using
`data-[state=open]`/`data-[state=closed]` with `grid-rows` animation pattern. ~150ms
ease-out.

### Streaming & Live Feedback UX (Primary Pain Point)

**A. Activity Indicator** -- persistent header bar in trace panel:

- Shows colored dot, agent name, model, elapsed timer
- Updates as agents/tools become active
- Collapses to "Completed in Xm Ys" when done

**B. Event Fade-In** -- `@keyframes fadeIn` (opacity 0 to 1, ~200ms) on new trace events.

**C. Auto-Scroll with Breakout:**

- Auto-scrolls to bottom as events arrive
- Manual scroll-up pauses auto-scroll, shows "Jump to latest" pill
- `IntersectionObserver` on bottom sentinel element

**D. Step Progress Transitions:**

- Smooth fill transition on circle completion (~300ms)
- Connecting line progress animation (gray to blue)
- Scale-up pulse on final checkmark

**E. Skeleton State:**

- Shimmer placeholder cards before first event arrives
- Disappears on first real event

**F. Vocabulary Live Updates:**

- New rows slide in with teal highlight flash (~500ms fade)
- Mutation summary badge: "+3 added, 1 updated" -- live-updating, resets per step

## Component Changes

### Modified

| Component               | Changes                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `page.tsx`              | Nested resizable layout. Vocabulary state feeds bottom panel. Auto-scroll logic.                               |
| `results-panel.tsx`     | Remove VocabularySection. Wrap Answers + Rules in Radix Tabs.                                                  |
| `dev-trace-panel.tsx`   | Activity indicator header. Fade-in on events. Skeleton pre-first-event. "Jump to latest" pill.                 |
| `trace-event-card.tsx`  | Colored left-border accents. Streamdown for reasoning. Highlighted JSON. Smooth collapsible CSS.               |
| `step-progress.tsx`     | CSS transitions on fills/strokes. Animated connecting line. Smoother active indicator.                         |
| `model-mode-toggle.tsx` | Add dark mode toggle next to it in nav.                                                                        |
| `globals.css`           | Semantic color tokens. Dark mode variants. `@source` for streamdown. Animation keyframes. `font-sans` on body. |

### New

| Component                | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `vocabulary-panel.tsx`   | Right-bottom panel. Live table + mutation summary.       |
| `activity-indicator.tsx` | Top-of-trace header showing current agent/tool activity. |
| `theme-toggle.tsx`       | Sun/moon dark mode toggle.                               |
| `skeleton-trace.tsx`     | Shimmer placeholder cards.                               |

### New Dependencies

| Package            | Purpose                                |
| ------------------ | -------------------------------------- |
| `streamdown`       | Markdown rendering for agent reasoning |
| `@streamdown/code` | Shiki syntax highlighting              |

### Unchanged

- Data flow, hooks, API routes -- no architecture changes
- `problem-input.tsx`
- All shadcn/ui primitives (collapsible gets animation CSS only)
- `useChat` and streaming protocol
