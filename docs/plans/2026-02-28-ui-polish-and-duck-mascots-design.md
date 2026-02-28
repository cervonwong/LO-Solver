# UI Polish & Duck Mascots Design

**Date:** 2026-02-28
**Status:** Approved

## Summary

A collection of targeted UI tweaks to the dev trace panel, activity indicator, input panel, and agent display. Key themes: spinning duck indicators, compact layout, font consistency, and state persistence.

## Changes

### 1. Step Heading Layout (dev-trace-panel.tsx)

**Before:** `[Step Label] [blinking >] [duration] ... [N events]`
**After:** `[Step Label] [spinning duck 16px] ... [N events] [T+MM:SS]`

- Remove blinking `>` arrow for active steps
- Add 16px spinning duck image (lex-mascot.png) when step is active
- Move timer to right side, after events counter
- When active: live `T+MM:SS` timer (counting from step start)
- When complete: static duration display
- Both events counter and timer use `font-sans` (Noto Sans)
- Timer keeps cyan/accent color

### 2. ActivityIndicator Top Bar (activity-indicator.tsx)

**Before (running):** `[blinking >] ACTIVE: AgentName  model-name  T+MM:SS`
**After (running):** `[spinning duck 16px] RUNNING: AgentName (model-name)  T+MM:SS`

- Replace blinking `>` with spinning duck
- Change label from `ACTIVE:` to `RUNNING:`
- Model name in parentheses: `(model-name)`
- T+MM:SS unchanged on the right

**Before (complete):** `[>] Complete  T+MM:SS`
**After (complete):** `[static duck] Complete  T+MM:SS`

### 3. Input Panel State Persistence (page.tsx)

**Problem:** Radix CollapsibleContent unmounts children when closed, losing ProblemInput's internal state (problemText, selectedExample).

**Fix:** Add `forceMount` to the `CollapsibleContent` wrapping ProblemInput. Use CSS to hide when `data-state="closed"` while keeping the component mounted. State (textarea text, combo selection) persists across open/close. Inputs remain disabled while solving.

### 4. Agent Duck Mascots (trace-event-card.tsx)

**Before:** `[AGENT badge] AgentName (model)` — purple Badge chip
**After:** `[16px duck image] AgentName (model)` — duck replaces Badge

- Remove `<Badge variant="secondary">AGENT</Badge>`
- Replace with 16px duck image (lex-mascot.png)
- Keep agent name and model text unchanged
- Use same duck image for all agents (unique per-agent images to be provided later)

### 5. StreamDown Font Size (globals.css)

Add CSS overrides to reduce StreamDown text size in trace context:

```css
.streamdown {
  font-size: 0.75rem;
  line-height: 1.25rem;
}
.streamdown h1, .streamdown h2, .streamdown h3,
.streamdown h4, .streamdown h5, .streamdown h6 {
  font-size: 0.8125rem;
}
```

### 6. Spinning Duck Animation (globals.css)

New CSS animation for active/running indicators:

```css
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin-duck {
  animation: spin-slow 2s linear infinite;
}
```

### 7. Chevron Icon for Accordions (trace-event-card.tsx)

**Before:** Unicode `▲`/`▼` toggled by open state
**After:** Material Design keyboard_arrow_down SVG with CSS rotation

- SVG path: `M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z`
- `fill="currentColor"`, inherits muted-foreground color
- Size: 16px
- Rotates 180° when open via `transition-transform duration-200 rotate-180`

### 8. Compact Trace Cards (trace-event-card.tsx, dev-trace-panel.tsx)

- Reduce agent/tool CollapsibleTrigger padding from `py-2` → `py-1.5`
- Reduce EventList card gap from `gap-2` → `gap-1`

### 9. Dev Trace Header Rename (dev-trace-panel.tsx)

**Before:** `Dev Trace`
**After:** `Lex's Solving Process`

## Files Affected

| File | Changes |
|------|---------|
| `src/components/dev-trace-panel.tsx` | Sections 1, 8, 9 |
| `src/components/activity-indicator.tsx` | Section 2 |
| `src/app/page.tsx` | Section 3 |
| `src/components/trace-event-card.tsx` | Sections 4, 7, 8 |
| `src/app/globals.css` | Sections 5, 6 |
