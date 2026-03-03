---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/dev-trace-panel.tsx
autonomous: true
requirements: [QUICK-6]
must_haves:
  truths:
    - "Dev trace panel has a single compact header row instead of two stacked elements"
    - "Header matches Vocabulary/Rules panel header style exactly (frosted, border-b, px-4 py-2)"
    - "Route SVG icon and title shown on left, event count and timer on right"
    - "Elapsed timer shows T+MM:SS while running, hidden when idle"
    - "ActivityIndicator bar no longer renders in the trace panel"
  artifacts:
    - path: "src/components/dev-trace-panel.tsx"
      provides: "Merged compact header replacing ActivityIndicator + h2"
      contains: "Lex's Solving Process"
  key_links:
    - from: "src/components/dev-trace-panel.tsx"
      to: "events prop + isRunning prop"
      via: "elapsed timer derived from first event timestamp"
      pattern: "T\\+"
---

<objective>
Merge the ActivityIndicator bar and the "Lex's Solving Process" header in DevTracePanel into a single compact header row that matches the Vocabulary/Rules panel header style.

Purpose: Reduce vertical space consumed by the trace panel header area from two stacked elements to one clean row, creating visual consistency across all three panels.
Output: Modified `dev-trace-panel.tsx` with unified header.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/components/dev-trace-panel.tsx
@src/components/activity-indicator.tsx
@src/components/vocabulary-panel.tsx (reference header pattern)

<interfaces>
<!-- Reference: Vocabulary panel header pattern to match exactly -->
From src/components/vocabulary-panel.tsx (lines 30-48):
```tsx
<div className="frosted flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
  <div className="flex items-center gap-2">
    <svg ...icon... className="shrink-0">...</svg>
    <h3 className="font-heading text-sm text-foreground">Vocabulary</h3>
    <span className="dimension">{count} entries</span>
  </div>
  <RollingActivityChips events={activityEvents} />
</div>
```

<!-- Current DevTracePanel header area to replace (lines 80-85): -->
```tsx
<ActivityIndicator events={events} isRunning={isRunning} />
<div className="flex items-center justify-between border-b-4 border-double border-border pb-2">
  <h2 className="font-heading text-lg text-foreground">Lex&apos;s Solving Process</h2>
  <span className="text-xs text-muted-foreground">{events.length} events</span>
</div>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace header area with unified compact header</name>
  <files>src/components/dev-trace-panel.tsx</files>
  <action>
In `src/components/dev-trace-panel.tsx`:

1. **Remove the ActivityIndicator import** (line 17): Delete `import { ActivityIndicator } from '@/components/activity-indicator';`

2. **Add elapsed timer state and effect** inside `DevTracePanel` component, after the existing `useMemo` and refs. Compute elapsed time from the first event's timestamp:

```tsx
// Elapsed timer for the header (total workflow time)
const [headerElapsed, setHeaderElapsed] = useState(0);
useEffect(() => {
  if (!isRunning || events.length === 0) {
    if (!isRunning) setHeaderElapsed(0);
    return;
  }
  const firstEvent = events[0];
  const startMs =
    firstEvent && 'timestamp' in firstEvent.data
      ? (firstEvent.data as { timestamp: number }).timestamp
      : Date.now();
  const tick = () => setHeaderElapsed(Math.floor((Date.now() - startMs) / 1000));
  tick();
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, [isRunning, events]);

const formatTimer = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `T+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
```

Add `useState` to the existing React import if not already there (it is already imported).

3. **Replace the two header elements** (the `<ActivityIndicator ... />` line and the `<div className="flex items-center justify-between border-b-4 ...">` block) with a single header matching the Vocabulary/Rules pattern:

```tsx
<div className="frosted flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
  <div className="flex items-center gap-2">
    <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor" className="shrink-0">
      <path d="M220-140v-481.01q-35-12.84-57.5-39.49-22.5-26.65-22.5-59.24 0-41.77 29.14-71.02Q198.28-820 239.91-820q41.63 0 70.86 29.24Q340-761.51 340-719.74q0 32.59-22.5 59.24T260-620.85V-180h200v-640h280v481.01q35 12.84 57.5 39.49 22.5 26.65 22.5 59.24 0 41.77-29.14 71.02Q761.72-140 720.09-140q-41.63 0-70.86-29.24Q620-198.49 620-240.26q0-32.59 22.5-59.74t57.5-39.15V-780H500v640H220Zm20-520q24.69 0 42.35-17.65Q300-695.31 300-720t-17.65-42.35Q264.69-780 240-780t-42.35 17.65Q180-744.69 180-720t17.65 42.35Q215.31-660 240-660Zm480 480q24.69 0 42.35-17.65Q780-215.31 780-240t-17.65-42.35Q744.69-300 720-300t-42.35 17.65Q660-264.69 660-240t17.65 42.35Q695.31-180 720-180ZM240-720Zm480 480Z" />
    </svg>
    <h3 className="font-heading text-sm text-foreground">Lex&apos;s Solving Process</h3>
    <span className="dimension">{events.length} events</span>
  </div>
  {(isRunning || headerElapsed > 0) && (
    <span className="text-xs tabular-nums text-accent">{formatTimer(headerElapsed)}</span>
  )}
</div>
```

Key details:
- Container classes match Vocabulary/Rules exactly: `frosted flex shrink-0 items-center justify-between border-b border-border px-4 py-2`
- Left side: Route SVG icon (16px, fill="currentColor", shrink-0) + h3 title + event count in `dimension` class
- Right side: Timer in `text-accent` shown while running or when elapsed > 0
- The `Image` import for `next/image` can be removed since it was only used for the duck mascot in ActivityIndicator (but check -- it may not be imported here at all). Actually, looking at the file, `Image` from `next/image` IS imported (line 4) and used only for the duck in StepSection (line 171-177). So keep the `Image` import.
- The title uses `h3` (not `h2`), `text-sm` (not `text-lg`), matching the other panels.

4. **Reset elapsed on completion**: When `isRunning` becomes false, keep the final elapsed value visible briefly. The current logic already sets `headerElapsed` to 0 when not running. Instead, keep the last elapsed value when workflow completes so the total time is visible:

Revise the effect: do NOT reset to 0 when `isRunning` becomes false. Only reset when a new run starts (events.length resets to 0). Update the condition:

```tsx
useEffect(() => {
  if (!isRunning || events.length === 0) return;
  const firstEvent = events[0];
  const startMs =
    firstEvent && 'timestamp' in firstEvent.data
      ? (firstEvent.data as { timestamp: number }).timestamp
      : Date.now();
  const tick = () => setHeaderElapsed(Math.floor((Date.now() - startMs) / 1000));
  tick();
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, [isRunning, events.length === 0]);
```

Wait -- `events.length === 0` is not a stable dependency. Use a ref or just rely on the cleanup. Simpler approach:

```tsx
useEffect(() => {
  if (events.length === 0) {
    setHeaderElapsed(0);
    return;
  }
  if (!isRunning) return; // Keep last value visible
  const firstEvent = events[0];
  const startMs =
    firstEvent && 'timestamp' in firstEvent.data
      ? (firstEvent.data as { timestamp: number }).timestamp
      : Date.now();
  const tick = () => setHeaderElapsed(Math.floor((Date.now() - startMs) / 1000));
  tick();
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, [isRunning, events]);
```

This way: events empty -> reset to 0; running with events -> tick; stopped with events -> keep last value.

And the render condition becomes simply `headerElapsed > 0`:
```tsx
{headerElapsed > 0 && (
  <span className="text-xs tabular-nums text-accent">{formatTimer(headerElapsed)}</span>
)}
```

5. **Ensure the scroll container structure is correct.** The header should be OUTSIDE the scrollable area so it stays pinned at top. Currently the entire content is in one div with `overflow-y-auto`. Restructure:

- Wrap in a flex-col container that fills the parent
- Header is `shrink-0` (already has it) at top
- Scrollable content below with `flex-1 overflow-y-auto`

Change the outer return from:
```tsx
<div ref={scrollContainerRef} onScroll={handleScroll} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
  {/* header */}
  {/* stepGroups */}
</div>
```

To:
```tsx
<div className="flex flex-1 flex-col">
  {/* Header - pinned */}
  <div className="frosted flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
    ...
  </div>
  {/* Scrollable content */}
  <div ref={scrollContainerRef} onScroll={handleScroll} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
    {stepGroups.map(...)}
  </div>
</div>
```

This keeps the header pinned while step content scrolls. The SkeletonTrace and EmptyState early returns do not need headers (they show when events.length === 0).
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>
    - Single compact header row replaces the ActivityIndicator bar and "Lex's Solving Process" h2
    - Header matches Vocabulary/Rules panel style: frosted container, Route SVG icon, h3 font-heading text-sm title, dimension-class event count
    - Elapsed timer (T+MM:SS) shown in text-accent on the right while running and after completion
    - Timer resets only when events clear (new problem)
    - Header stays pinned while trace content scrolls
    - ActivityIndicator import removed from dev-trace-panel.tsx
    - No TypeScript errors (except pre-existing globals.css one)
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (no new errors)
2. Visual: dev trace panel header matches vocabulary/rules panel header style
3. Timer counts up during workflow execution, persists after completion, resets on new run
</verification>

<success_criteria>
- The dev trace panel shows a single compact header with Route icon, "Lex's Solving Process" title, event count in dimension class, and T+MM:SS timer
- The old ActivityIndicator bar and double-bordered h2 header are gone
- Header visually matches the Vocabulary and Rules panel headers
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/6-merge-activity-indicator-and-trace-heade/6-SUMMARY.md`
</output>
