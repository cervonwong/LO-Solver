# UI Polish & Duck Mascots Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the dev trace panel with spinning duck indicators, compact cards, chevron animations, persistent input state, and reduced StreamDown font size.

**Architecture:** All changes are scoped to 5 existing files. No new components or files needed. CSS animations and overrides go in globals.css; component edits are surgical replacements within existing JSX.

**Tech Stack:** Next.js 16, React, Tailwind CSS v4, Radix UI Collapsible, Streamdown

**Design doc:** `docs/plans/2026-02-28-ui-polish-and-duck-mascots-design.md`

---

### Task 1: CSS Foundations — Spinning Duck Animation & StreamDown Sizing

**Files:**
- Modify: `src/app/globals.css`

**Context:** globals.css contains all custom CSS including animations (`animate-blink`, `animate-checkmark-scale`, etc.) and StreamDown overrides (`.streamdown pre`, `.streamdown code`). We add two new things: the spinning duck keyframes and StreamDown font-size reduction.

**Step 1: Add spinning duck animation**

In `src/app/globals.css`, find the animations section (after `@keyframes blink-cursor`). Add after the existing animation blocks:

```css
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-duck {
  animation: spin-slow 2s linear infinite;
}
```

**Step 2: Add StreamDown font-size overrides**

Find the existing `.streamdown pre` and `.streamdown code` rules. Add these rules before them:

```css
.streamdown {
  font-size: 0.75rem;
  line-height: 1.25rem;
}

.streamdown h1,
.streamdown h2,
.streamdown h3,
.streamdown h4,
.streamdown h5,
.streamdown h6 {
  font-size: 0.8125rem;
}
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error (ignore it).

**Step 4: Commit**

```
git add src/app/globals.css
git commit -m "Add spinning duck animation and StreamDown font-size overrides"
```

---

### Task 2: ActivityIndicator — Spinning Duck & Label Changes

**Files:**
- Modify: `src/components/activity-indicator.tsx`

**Context:** This component shows the top bar in the dev trace panel. It has two visible states: running (blinking `>`, `ACTIVE: AgentName`, model, T+timer) and complete (static `>`, `Complete`, total time). We replace the blinking arrow with a spinning duck image, change `ACTIVE:` to `RUNNING:`, and wrap the model name in parentheses.

**Step 1: Add image import**

At the top of `src/components/activity-indicator.tsx`, add after the existing imports:

```tsx
import Image from 'next/image';
```

**Step 2: Update the running state JSX**

Find the running state return (around line 70-78). Replace:

```tsx
    <div className="frosted flex items-center gap-2 border border-border px-4 py-2">
      <span className="animate-blink text-sm text-accent">&gt;</span>
      <span className="text-xs uppercase tracking-wider text-accent">
        ACTIVE: {agentName ?? 'Starting...'}
      </span>
      {model && <span className="text-xs text-muted-foreground">{model}</span>}
      <span className="ml-auto text-xs tabular-nums text-accent">T+{formatElapsed(elapsed)}</span>
    </div>
```

With:

```tsx
    <div className="frosted flex items-center gap-2 border border-border px-4 py-2">
      <Image
        src="/lex-mascot.png"
        alt=""
        width={16}
        height={16}
        className="animate-spin-duck shrink-0"
      />
      <span className="text-xs uppercase tracking-wider text-accent">
        RUNNING: {agentName ?? 'Starting...'}
      </span>
      {model && <span className="text-xs text-muted-foreground">({model})</span>}
      <span className="ml-auto text-xs tabular-nums text-accent">T+{formatElapsed(elapsed)}</span>
    </div>
```

**Step 3: Update the complete state JSX**

Find the completed state return (around line 43-53). Replace:

```tsx
    <div className="frosted flex items-center gap-2 border border-border px-4 py-2">
      <span className="text-sm text-foreground">&gt;</span>
      <span className="text-xs uppercase tracking-wider text-foreground">Complete</span>
```

With:

```tsx
    <div className="frosted flex items-center gap-2 border border-border px-4 py-2">
      <Image src="/lex-mascot.png" alt="" width={16} height={16} className="shrink-0" />
      <span className="text-xs uppercase tracking-wider text-foreground">Complete</span>
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 5: Commit**

```
git add src/components/activity-indicator.tsx
git commit -m "Replace blinking arrow with spinning duck in ActivityIndicator"
```

---

### Task 3: Dev Trace Panel — Step Heading Rework & Header Rename

**Files:**
- Modify: `src/components/dev-trace-panel.tsx`

**Context:** The `StepSection` component renders step headings with: `[label] [blinking >] [duration] ... [N events]`. We need to: (a) replace the blinking `>` with a spinning duck, (b) add a live T+timer for active steps (counting from `group.startTime`), (c) move the timer to the right side after the events counter, (d) use `font-sans` on the right-side elements, (e) rename the header from "Dev Trace" to "Lex's Solving Process", (f) reduce EventList gap.

**Step 1: Add imports**

At the top of `src/components/dev-trace-panel.tsx`, add:

```tsx
import Image from 'next/image';
```

Also add `useEffect` and `useState` to the React import:

```tsx
import { useEffect, useMemo, useState } from 'react';
```

**Step 2: Rename the header**

In the `DevTracePanel` component, find:

```tsx
        <h2 className="font-heading text-lg text-foreground">Dev Trace</h2>
```

Replace with:

```tsx
        <h2 className="font-heading text-lg text-foreground">Lex&apos;s Solving Process</h2>
```

**Step 3: Reduce EventList card gap**

In the `EventList` component, find:

```tsx
    <div className="flex flex-col gap-2">
```

Replace with:

```tsx
    <div className="flex flex-col gap-1">
```

**Step 4: Rework StepSection heading**

The `StepSection` component needs a live timer for active steps. Add a timer hook inside the component, then rework the heading JSX.

Replace the entire `StepSection` function with:

```tsx
function StepSection({ group, isRunning }: StepSectionProps) {
  const isActive = group.durationMs === undefined && group.startTime !== undefined;

  const contentEvents = group.events.filter(
    (e) => e.type !== 'data-step-start' && e.type !== 'data-step-complete',
  );

  // Live timer for active steps
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isActive || !isRunning || !group.startTime) {
      setElapsed(0);
      return;
    }
    const start = group.startTime;
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isActive, isRunning, group.startTime]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `T+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <section id={`trace-${group.stepId}`} className="frosted border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 font-heading text-sm text-foreground">
          {group.label}
          {isActive && isRunning && (
            <Image
              src="/lex-mascot.png"
              alt=""
              width={16}
              height={16}
              className="animate-spin-duck shrink-0"
            />
          )}
        </span>
        <span className="flex items-center gap-3 font-sans">
          <span className="text-xs text-muted-foreground">{contentEvents.length} events</span>
          {isActive && isRunning && (
            <span className="text-xs tabular-nums text-accent">{formatTimer(elapsed)}</span>
          )}
          {group.durationMs !== undefined && (
            <span className="text-xs tabular-nums text-accent">
              {formatDuration(group.durationMs)}
            </span>
          )}
        </span>
      </div>

      <div className="p-3">
        <EventList events={contentEvents} />
      </div>
    </section>
  );
}
```

**Note:** The `group.startTime` property is used. Verify it exists on the `StepGroup` type by checking `src/lib/trace-utils.ts`. If it's a timestamp in milliseconds, the `Date.now() - start` math works. If it's in a different format, adjust accordingly.

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 6: Commit**

```
git add src/components/dev-trace-panel.tsx
git commit -m "Rework step headings with spinning duck and live timer"
```

---

### Task 4: Trace Event Cards — Agent Duck Mascots, Chevrons & Compact Padding

**Files:**
- Modify: `src/components/trace-event-card.tsx`

**Context:** This file renders individual trace events. Changes needed: (a) replace purple AGENT Badge with 16px duck image, (b) replace `▲`/`▼` unicode with rotating SVG chevron, (c) reduce vertical padding on agent/tool triggers.

**Step 1: Add image import**

At the top of `src/components/trace-event-card.tsx`, add:

```tsx
import Image from 'next/image';
```

**Step 2: Create ChevronDown helper component**

Add this component after the imports, before `TraceEventCard`:

```tsx
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="16"
      viewBox="0 -960 960 960"
      width="16"
      fill="currentColor"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z" />
    </svg>
  );
}
```

**Step 3: Update agent reasoning card**

In the `data-agent-reasoning` case, replace the entire Collapsible block. Key changes:
- Replace `<Badge variant="secondary" ...>AGENT</Badge>` with duck image
- Replace `<span className="text-muted-foreground">{open ? '▲' : '▼'}</span>` with `<ChevronIcon open={open} />`
- Reduce padding from `py-2` to `py-1.5`

Find:

```tsx
    case 'data-agent-reasoning':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-agent flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-2 text-left text-xs hover:bg-surface-3">
            <span className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="border-trace-agent text-trace-agent bg-transparent text-[10px]"
              >
                AGENT
              </Badge>
              <span className="font-medium">{event.data.agentName}</span>
              <span className="text-muted-foreground">({event.data.model})</span>
            </span>
            <span className="text-muted-foreground">{formatDuration(event.data.durationMs)}</span>
          </CollapsibleTrigger>
```

Replace with:

```tsx
    case 'data-agent-reasoning':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-agent flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs hover:bg-surface-3">
            <span className="flex items-center gap-2">
              <Image
                src="/lex-mascot.png"
                alt=""
                width={16}
                height={16}
                className="shrink-0"
              />
              <span className="font-medium">{event.data.agentName}</span>
              <span className="text-muted-foreground">({event.data.model})</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">{formatDuration(event.data.durationMs)}</span>
              <ChevronIcon open={open} />
            </span>
          </CollapsibleTrigger>
```

**Step 4: Update tool call card**

In the `data-tool-call` case, replace the chevron and reduce padding. Find:

```tsx
          <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-tool flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-2 text-left text-xs hover:bg-surface-3">
            <span className="flex items-center gap-2">
              <Badge variant="default" className="border-trace-tool text-trace-tool bg-transparent text-[10px]">
                TOOL
              </Badge>
              <span className="font-medium">{event.data.toolName}</span>
            </span>
            <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
          </CollapsibleTrigger>
```

Replace with:

```tsx
          <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-tool flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs hover:bg-surface-3">
            <span className="flex items-center gap-2">
              <Badge variant="default" className="border-trace-tool text-trace-tool bg-transparent text-[10px]">
                TOOL
              </Badge>
              <span className="font-medium">{event.data.toolName}</span>
            </span>
            <ChevronIcon open={open} />
          </CollapsibleTrigger>
```

**Step 5: Update ToolCallGroupCard chevron**

In the `ToolCallGroupCard` component, find:

```tsx
        <span className="text-muted-foreground">{open ? '\u25B2' : '\u25BC'}</span>
```

Replace with:

```tsx
        <ChevronIcon open={open} />
```

Also reduce padding on the same trigger from `py-2` to `py-1.5`.

**Step 6: Update ToolCallDetail chevron**

In the `ToolCallDetail` component, find:

```tsx
        <span className="text-muted-foreground">{open ? '\u25B2' : '\u25BC'}</span>
```

Replace with:

```tsx
        <ChevronIcon open={open} />
```

**Step 7: Remove unused Badge import if no longer needed**

Check if `Badge` is still used anywhere in the file after these changes (it's still used for TOOL, START, DONE, ITER, VOCAB badges). If so, keep the import. It is still used — keep it.

**Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 9: Commit**

```
git add src/components/trace-event-card.tsx
git commit -m "Replace agent badge with duck, add chevron icons, compact cards"
```

---

### Task 5: Input Panel State Persistence

**Files:**
- Modify: `src/app/page.tsx`

**Context:** The ProblemInput is wrapped in a Radix `CollapsibleContent` which unmounts children when closed. This loses the textarea text and combo box selection. We add `forceMount` to keep it mounted and use CSS to hide it when the collapsible is closed.

**Step 1: Add forceMount and hidden styling**

In `src/app/page.tsx`, find:

```tsx
                <CollapsibleContent className="animate-collapsible pt-4">
                  <ProblemInput
```

Replace with:

```tsx
                <CollapsibleContent forceMount className="animate-collapsible pt-4 data-[state=closed]:hidden">
                  <ProblemInput
```

The `forceMount` keeps the component mounted. `data-[state=closed]:hidden` is Tailwind's data-attribute variant that applies `display: none` when Radix sets `data-state="closed"` on the element.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error. If `forceMount` causes a type error, check the Radix Collapsible API. It's a standard prop on `CollapsibleContent`.

**Step 3: Commit**

```
git add src/app/page.tsx
git commit -m "Persist input panel state across collapse with forceMount"
```

---

### Task 6: Visual Verification & Final Commit

**Files:** None (verification only)

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Visual verification checklist**

Open `http://localhost:3000` and verify each change:

- [ ] **Dev trace header** reads "Lex's Solving Process" (not "Dev Trace")
- [ ] **StreamDown text** in trace cards is smaller (12px body, 13px headings)
- [ ] **Input panel**: select an example, type text, click Solve → panel collapses → reopen panel → text and selection are still there and disabled
- [ ] **ActivityIndicator** shows spinning duck + "RUNNING: AgentName (model)" + T+timer
- [ ] **Step headings**: active step shows spinning duck + live T+timer on the right after events count
- [ ] **Agent cards**: duck image instead of purple AGENT badge
- [ ] **Chevrons**: SVG arrows rotate 180° smoothly when opening/closing trace cards
- [ ] **Card spacing**: cards are more compact (less vertical padding, tighter gap)
- [ ] **Complete state**: ActivityIndicator shows static duck + "Complete" + total time

**Step 3: Stop dev server, push**

```
git push
```
