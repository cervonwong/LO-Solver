# Cyanotype Blueprint Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the LO-Solver UI from neutral shadcn/ui into a Cyanotype Blueprint theme with construction grid, crosshair cards, stamp buttons, and Lex the duck mascot.

**Architecture:** CSS Variable Override approach. Rewrite the color system in `globals.css`, add blueprint-specific CSS utilities (crosshair pseudo-elements, stamp animation, plotter keyframes), create two new components (`BlueprintCard`, `LexMascot`), and make targeted edits to existing components. Remove theme toggle (single-theme design).

**Tech Stack:** Next.js, Tailwind CSS v4 (CSS-only config), shadcn/ui, Google Fonts (Protest Riot, Architects Daughter, Noto Sans) via `next/font/google`.

**Design Doc:** `docs/plans/2026-02-27-cyanotype-blueprint-theme-design.md`

---

### Task 1: Install Google Fonts and Update Layout

**Files:**

- Modify: `src/app/layout.tsx`
- Delete reference to: `src/components/theme-toggle.tsx`

**Step 1: Update layout.tsx with fonts, remove theme toggle, remove title**

Replace the entire `src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Noto_Sans, Protest_Riot, Architects_Daughter } from 'next/font/google';
import './globals.css';
import 'streamdown/styles.css';
import { ModelModeToggle } from '@/components/model-mode-toggle';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const protestRiot = Protest_Riot({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const architectsDaughter = Architects_Daughter({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-handwritten',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LO-Solver',
  description: 'AI-powered Linguistics Olympiad Rosetta Stone solver',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full ${notoSans.variable} ${protestRiot.variable} ${architectsDaughter.variable}`}
    >
      <body className="flex h-full flex-col bg-background font-sans text-foreground antialiased">
        <nav className="flex shrink-0 items-center justify-end border-b border-border px-6 py-3">
          <ModelModeToggle />
        </nav>
        <main className="min-h-0 flex-1">{children}</main>
      </body>
    </html>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No new errors (the pre-existing globals.css error is fine).

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "Add blueprint fonts, remove title and theme toggle from nav"
```

---

### Task 2: Rewrite CSS Color System and Background

**Files:**

- Modify: `src/app/globals.css`

**Step 1: Replace the entire globals.css**

Replace all CSS variable definitions in `globals.css`. Key changes:

- Remove `:root` light mode and `.dark` blocks entirely
- Single set of blueprint variables in `:root`
- Add grid background, noise texture, and blueprint utilities
- Set `--radius: 0`

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';
@source "../node_modules/streamdown/dist/*.js";

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
  --font-sans: var(--font-noto-sans, 'Noto Sans', sans-serif);
  --font-heading: var(--font-protest-riot, 'Protest Riot', cursive);
  --font-handwritten: var(--font-architects-daughter, 'Architects Daughter', cursive);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-status-active: var(--status-active);
  --color-status-active-foreground: var(--status-active-foreground);
  --color-status-active-muted: var(--status-active-muted);
  --color-status-success: var(--status-success);
  --color-status-success-foreground: var(--status-success-foreground);
  --color-status-success-muted: var(--status-success-muted);
  --color-status-warning: var(--status-warning);
  --color-status-warning-foreground: var(--status-warning-foreground);
  --color-status-warning-muted: var(--status-warning-muted);
  --color-trace-agent: var(--trace-agent);
  --color-trace-agent-muted: var(--trace-agent-muted);
  --color-trace-tool: var(--trace-tool);
  --color-trace-tool-muted: var(--trace-tool-muted);
  --color-trace-vocab: var(--trace-vocab);
  --color-trace-vocab-muted: var(--trace-vocab-muted);
}

:root {
  --radius: 0;

  /* Blueprint Cyanotype palette */
  --background: #003366;
  --foreground: rgba(255, 255, 255, 0.8);
  --card: rgba(0, 40, 80, 0.6);
  --card-foreground: rgba(255, 255, 255, 0.85);
  --popover: rgba(0, 40, 80, 0.9);
  --popover-foreground: rgba(255, 255, 255, 0.85);
  --primary: #ff3333;
  --primary-foreground: #ffffff;
  --secondary: rgba(255, 255, 255, 0.1);
  --secondary-foreground: rgba(255, 255, 255, 0.8);
  --muted: rgba(255, 255, 255, 0.08);
  --muted-foreground: rgba(255, 255, 255, 0.5);
  --accent: #00ffff;
  --accent-foreground: #003366;
  --destructive: #ff3333;
  --border: rgba(255, 255, 255, 0.2);
  --input: rgba(255, 255, 255, 0.15);
  --ring: #00ffff;

  /* Status colors — blueprint adapted */
  --status-active: #00ffff;
  --status-active-foreground: #003366;
  --status-active-muted: rgba(0, 255, 255, 0.1);
  --status-success: rgba(255, 255, 255, 0.8);
  --status-success-foreground: #003366;
  --status-success-muted: rgba(255, 255, 255, 0.1);
  --status-warning: #ffd700;
  --status-warning-foreground: #003366;
  --status-warning-muted: rgba(255, 215, 0, 0.1);

  /* Trace event colors */
  --trace-agent: #cc99ff;
  --trace-agent-muted: rgba(204, 153, 255, 0.1);
  --trace-tool: #66cccc;
  --trace-tool-muted: rgba(102, 204, 204, 0.1);
  --trace-vocab: #66ccaa;
  --trace-vocab-muted: rgba(102, 204, 170, 0.1);

  --chart-1: #00ffff;
  --chart-2: #ff3333;
  --chart-3: #ffd700;
  --chart-4: #cc99ff;
  --chart-5: #66cccc;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    /* Blueprint grid background */
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
    background-size: 20px 20px;
    background-attachment: fixed;
    padding: 20px;
  }
}

/* ============================================
   BLUEPRINT COMPONENTS
   ============================================ */

/* Crosshair card — major containers only */
.blueprint-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(0, 51, 102, 0.9);
  padding: 15px;
}

.blueprint-card::before,
.blueprint-card::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

/* Vertical crosshair extensions */
.blueprint-card::before {
  top: -5px;
  bottom: -5px;
  left: 0;
  right: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.8);
  border-right: 1px solid rgba(255, 255, 255, 0.8);
}

/* Horizontal crosshair extensions */
.blueprint-card::after {
  left: -5px;
  right: -5px;
  top: 0;
  bottom: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.8);
}

/* Stamp button (primary red) */
.stamp-btn {
  font-family: var(--font-handwritten);
  background: transparent;
  color: #ff3333;
  border: 3px solid #ff3333;
  padding: 10px 25px;
  font-size: 1.25rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform: rotate(-2deg);
}

.stamp-btn:hover {
  background: rgba(255, 51, 51, 0.1);
}

.stamp-btn:active {
  transform: scale(0.92) rotate(-1deg);
  filter: blur(0.6px);
  box-shadow: 0 0 10px rgba(255, 51, 51, 0.4);
}

.stamp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: rotate(-2deg);
}

.stamp-btn:disabled:active {
  transform: rotate(-2deg);
  filter: none;
  box-shadow: none;
}

/* Stamp button (secondary white) */
.stamp-btn-secondary {
  font-family: var(--font-handwritten);
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 8px 20px;
  font-size: 1rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.stamp-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
}

.stamp-btn-secondary:active {
  transform: scale(0.95);
}

/* Dimension/coordinate text */
.dimension {
  font-family: 'Courier New', monospace;
  color: #00ffff;
  font-size: 0.75rem;
}

/* ============================================
   ANIMATION KEYFRAMES
   ============================================ */

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in-row {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes highlight-flash {
  0% {
    background-color: rgba(0, 255, 255, 0.15);
  }
  100% {
    background-color: transparent;
  }
}

@keyframes checkmark-scale {
  0% {
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes blink-cursor {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes plotter-draw {
  from {
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Utility classes for animations */
.animate-fade-in {
  animation: fade-in 200ms ease-out both;
}

.animate-slide-in-row {
  animation: slide-in-row 250ms ease-out both;
}

.animate-highlight-flash {
  animation: highlight-flash 500ms ease-out both;
}

.animate-checkmark-scale {
  animation: checkmark-scale 300ms ease-out both;
}

.animate-blink {
  animation: blink-cursor 1s step-end infinite;
}

.animate-plotter {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: plotter-draw 1s ease-out forwards;
}

/* Collapsible animation using grid-rows technique */
[data-state='open'].animate-collapsible {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 150ms ease-out;
}

[data-state='closed'].animate-collapsible {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 150ms ease-out;
}

.animate-collapsible > * {
  overflow: hidden;
}

/* ============================================
   STREAMDOWN OVERRIDES
   ============================================ */

/* Ensure markdown rendered by Streamdown inherits blueprint colors */
.streamdown pre {
  background: rgba(0, 40, 80, 0.6) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.streamdown code {
  color: #00ffff !important;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Rewrite color system to Cyanotype blueprint palette with grid background"
```

---

### Task 3: Create BlueprintCard Component

**Files:**

- Create: `src/components/blueprint-card.tsx`

**Step 1: Create the component**

```tsx
import { cn } from '@/lib/utils';

interface BlueprintCardProps {
  children: React.ReactNode;
  className?: string;
}

export function BlueprintCard({ children, className }: BlueprintCardProps) {
  return <div className={cn('blueprint-card', className)}>{children}</div>;
}
```

**Step 2: Commit**

```bash
git add src/components/blueprint-card.tsx
git commit -m "Add BlueprintCard component with crosshair corners"
```

---

### Task 4: Create Lex Mascot Component

**Files:**

- Create: `src/components/lex-mascot.tsx`

**Step 1: Create the mascot component**

```tsx
export function LexMascot() {
  return (
    <div className="flex items-start gap-4">
      {/* Duck placeholder — blueprint-line style circle */}
      <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center border border-foreground">
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground"
        >
          {/* Simple duck outline drawn in blueprint line style */}
          <circle cx="16" cy="12" r="8" />
          <ellipse cx="20" cy="28" rx="14" ry="10" />
          <path d="M24 12 L30 10 L28 14" />
          <circle cx="14" cy="10" r="1.5" fill="currentColor" />
        </svg>
      </div>

      {/* Speech bubble */}
      <div className="relative border border-foreground bg-card px-4 py-3">
        {/* Bubble tail */}
        <div
          className="absolute -left-2 top-4 h-3 w-3 border-b border-l border-foreground bg-card"
          style={{ transform: 'rotate(45deg)' }}
        />
        <p className="font-handwritten text-base leading-relaxed">
          I&apos;m Lex, the Linguistics Olympiad Problem solving duck!{' '}
          <span className="text-accent">Copy and paste</span> a LO Problem below or try one of my
          examples!
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/lex-mascot.tsx
git commit -m "Add Lex duck mascot component with speech bubble"
```

---

### Task 5: Update Problem Input with Loading State

**Files:**

- Modify: `src/components/problem-input.tsx`

**Step 1: Add plotter loading animation and restyle**

Replace the entire component:

```tsx
'use client';

import { useState } from 'react';

interface ExampleOption {
  id: string;
  label: string;
}

interface ProblemInputProps {
  examples: ExampleOption[];
  onSolve: (text: string) => void;
  disabled?: boolean | undefined;
}

export function ProblemInput({ examples, onSolve, disabled }: ProblemInputProps) {
  const [problemText, setProblemText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleExampleSelect(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/examples/${id}`);
      if (!res.ok) throw new Error('Failed to load example');
      const { text } = await res.json();
      setProblemText(text);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    const trimmed = problemText.trim();
    if (!trimmed) return;
    onSolve(trimmed);
  }

  const isDisabled = disabled || loading;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <label htmlFor="example-select" className="text-sm text-muted-foreground">
          Load example:
        </label>
        <select
          id="example-select"
          className="border border-border bg-transparent px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
          defaultValue=""
          disabled={isDisabled}
          onChange={(e) => {
            if (e.target.value) handleExampleSelect(e.target.value);
          }}
        >
          <option value="" disabled>
            Select a problem...
          </option>
          {examples.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          placeholder="Paste a linguistics problem here..."
          className="min-h-[200px] w-full resize-y border border-[rgba(255,255,255,0.3)] bg-transparent p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:shadow-[0_0_8px_rgba(0,255,255,0.2)] focus:outline-none"
          disabled={isDisabled}
        />
        {/* Plotter loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center border border-border bg-background/80">
            <svg width="200" height="20" viewBox="0 0 200 20" className="text-foreground">
              <text
                x="0"
                y="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                fontSize="14"
                fontFamily="monospace"
                className="animate-plotter"
              >
                LOADING SCHEMATIC...
              </text>
            </svg>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!problemText.trim() || isDisabled}
        className="stamp-btn w-fit"
      >
        {disabled ? 'Solving...' : 'Solve'}
      </button>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/problem-input.tsx
git commit -m "Restyle problem input with blueprint textarea and plotter loading"
```

---

### Task 6: Update Main Page Layout (Mascot, Collapsible, Empty State)

**Files:**

- Modify: `src/app/page.tsx`

**Step 1: Add Lex mascot, wrap collapsible in BlueprintCard, fix empty state centering**

In `src/app/page.tsx`, make these changes:

1. Add imports for `LexMascot` and `BlueprintCard`:

```tsx
import { LexMascot } from '@/components/lex-mascot';
import { BlueprintCard } from '@/components/blueprint-card';
```

2. Remove the import for `Button` (we'll use native stamp buttons).

3. In the left panel's content area, add `LexMascot` at the top and wrap the Collapsible in a `BlueprintCard`:

Replace the left panel `<div className="flex flex-col gap-6 p-6">` contents with:

```tsx
<LexMascot />

<BlueprintCard>
  <Collapsible open={inputOpen} onOpenChange={setInputOpen}>
    <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left font-heading text-lg text-foreground hover:text-accent">
      Problem Input
      <span className="text-accent text-xs">{inputOpen ? '\u25B2' : '\u25BC'}</span>
    </CollapsibleTrigger>
    <CollapsibleContent className="animate-collapsible pt-4">
      <ProblemInput examples={examples} onSolve={handleSolve} disabled={isRunning} />
    </CollapsibleContent>
  </Collapsible>
</BlueprintCard>
```

4. Replace the "New problem" `Button` with a native stamp button:

```tsx
<button onClick={handleReset} className="stamp-btn-secondary w-fit text-sm">
  New Problem
</button>
```

5. Replace the error div styling:

```tsx
<div className="border border-destructive p-4 text-sm text-destructive">
  <span className="stamp-btn-secondary pointer-events-none inline-block border-destructive text-destructive text-xs mb-2">
    REVISION REQUIRED
  </span>
  <p>The workflow encountered an error. Check Mastra Studio for details.</p>
</div>
```

6. The right panel empty state is handled in `dev-trace-panel.tsx` (Task 8).

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Add Lex mascot, wrap input in BlueprintCard, restyle buttons and error"
```

---

### Task 7: Update Step Progress for Blueprint Style

**Files:**

- Modify: `src/components/step-progress.tsx`

**Step 1: Restyle step circles, connectors, and labels**

Replace the entire `StepCircle` function:

```tsx
function StepCircle({ status, label }: { status: StepStatus; label: string | number }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 items-center justify-center border text-xs font-medium transition-all duration-300',
        status === 'running' && 'border-accent text-accent shadow-[0_0_6px_rgba(0,255,255,0.4)]',
        status === 'success' && 'border-foreground bg-foreground text-background',
        status === 'failed' && 'border-destructive text-destructive',
        status === 'pending' && 'border-[rgba(255,255,255,0.3)] text-muted-foreground',
      )}
    >
      {status === 'success' ? (
        <span className="animate-checkmark-scale">&#10003;</span>
      ) : status === 'failed' ? (
        <span>&#10007;</span>
      ) : (
        label
      )}
    </div>
  );
}
```

Replace the `Connector` function:

```tsx
function Connector({ fromStatus, toStatus }: { fromStatus: StepStatus; toStatus: StepStatus }) {
  const bothComplete = fromStatus === 'success' && toStatus === 'success';
  const completedToRunning = fromStatus === 'success' && toStatus === 'running';
  const hasActivity = fromStatus === 'success' || fromStatus === 'running';

  return (
    <div
      className={cn(
        'mx-1 h-px min-w-3 flex-1 transition-colors duration-300',
        bothComplete && 'bg-[rgba(255,255,255,0.6)]',
        completedToRunning && 'bg-accent',
        !bothComplete && !completedToRunning && hasActivity && 'bg-foreground',
        !hasActivity && 'border-t border-dashed border-[rgba(255,255,255,0.15)]',
      )}
    />
  );
}
```

Update step label classes in the render to add `uppercase tracking-wider`:

```tsx
<span
  className={cn(
    'whitespace-nowrap text-xs uppercase tracking-wider',
    step.status === 'running' && 'font-bold text-accent',
    step.status === 'success' && 'text-foreground',
    step.status === 'failed' && 'text-destructive',
    step.status === 'pending' && 'text-muted-foreground',
  )}
>
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/step-progress.tsx
git commit -m "Restyle step progress with blueprint circles, cyan active glow, dashed pending"
```

---

### Task 8: Update Activity Indicator (Mission Control Style)

**Files:**

- Modify: `src/components/activity-indicator.tsx`

**Step 1: Replace with mission control formatting**

Replace the completed state return block:

```tsx
return (
  <div className="flex items-center gap-2 border-b border-border px-4 py-2">
    <span className="font-mono text-sm text-foreground">&gt;</span>
    <span className="text-xs uppercase tracking-wider text-foreground">Complete</span>
    {totalMs > 0 && (
      <span className="ml-auto font-mono text-xs text-accent">
        T+{formatElapsed(Math.round(totalMs / 1000))}
      </span>
    )}
  </div>
);
```

Replace the running state return block:

```tsx
return (
  <div className="flex items-center gap-2 border-b border-border px-4 py-2">
    <span className="animate-blink font-mono text-sm text-accent">&gt;</span>
    <span className="text-xs uppercase tracking-wider text-accent">
      ACTIVE: {agentName ?? 'Starting...'}
    </span>
    {model && <span className="text-xs text-muted-foreground">{model}</span>}
    <span className="ml-auto font-mono text-xs tabular-nums text-accent">
      T+{formatElapsed(elapsed)}
    </span>
  </div>
);
```

Add helper function at the top of the file:

```tsx
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

**Step 2: Verify and commit**

```bash
git add src/components/activity-indicator.tsx
git commit -m "Restyle activity indicator with mission control T+ format and blinking cursor"
```

---

### Task 9: Update Dev Trace Panel and Empty State

**Files:**

- Modify: `src/components/dev-trace-panel.tsx`

**Step 1: Update section headers and empty state**

Update the `"Dev Trace"` header to use `font-heading`:

```tsx
<h2 className="font-heading text-lg text-foreground">Dev Trace</h2>
```

Update the section header label in `StepSection`:

```tsx
<span className="flex items-center gap-2 font-heading text-sm text-foreground">
  {group.label}
  {isActive && isRunning && <span className="animate-blink font-mono text-accent">&gt;</span>}
  {group.durationMs !== undefined && (
    <span className="dimension">{formatDuration(group.durationMs)}</span>
  )}
</span>
```

Replace `EmptyState` with the blueprint reticle:

```tsx
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      {/* Crosshair reticle */}
      <svg width="60" height="60" viewBox="0 0 60 60" className="text-accent">
        <line x1="30" y1="0" x2="30" y2="60" stroke="currentColor" strokeWidth="0.5" />
        <line x1="0" y1="30" x2="60" y2="30" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="30" cy="30" r="2" fill="currentColor" />
      </svg>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Awaiting Input</p>
    </div>
  );
}
```

**Step 2: Remove the `Badge` import references for running indicator** (replaced with `<span>` cursor above).

**Step 3: Verify and commit**

```bash
git add src/components/dev-trace-panel.tsx
git commit -m "Restyle trace panel with blueprint headers, reticle empty state"
```

---

### Task 10: Update Trace Event Cards (Badges and Borders)

**Files:**

- Modify: `src/components/trace-event-card.tsx`

**Step 1: Update badge and border styling**

Changes to make throughout the file:

1. All `border-l-3` → `border-l-2` (thinner indicator)
2. All badge `bg-*-muted` backgrounds → `bg-transparent border` (transparent + border treatment)
3. Replace `hover:bg-accent` on collapsible triggers with `hover:bg-muted`

Example for the START badge:

```tsx
<Badge
  variant="outline"
  className="border-status-active text-status-active bg-transparent text-[10px]"
>
  START
</Badge>
```

DONE badge:

```tsx
<Badge variant="outline" className="border-foreground text-foreground bg-transparent text-[10px]">
  DONE
</Badge>
```

AGENT badge:

```tsx
<Badge variant="outline" className="border-trace-agent text-trace-agent bg-transparent text-[10px]">
  AGENT
</Badge>
```

TOOL badge:

```tsx
<Badge variant="outline" className="border-trace-tool text-trace-tool bg-transparent text-[10px]">
  TOOL
</Badge>
```

ITER badge:

```tsx
<Badge
  variant="outline"
  className="border-status-warning text-status-warning bg-transparent text-[10px]"
>
  ITER {event.data.iteration}
</Badge>
```

VOCAB badge:

```tsx
<Badge variant="outline" className="border-trace-vocab text-trace-vocab bg-transparent text-[10px]">
  VOCAB
</Badge>
```

4. Inner card borders: change `border border-border` to `border border-[rgba(255,255,255,0.15)]`

**Step 2: Verify and commit**

```bash
git add src/components/trace-event-card.tsx
git commit -m "Restyle trace event cards with blueprint badge treatment and thinner borders"
```

---

### Task 11: Update Results Panel (Underline Tabs, Confidence Colors)

**Files:**

- Modify: `src/components/results-panel.tsx`

**Step 1: Update confidence badge mapping**

```tsx
const CONFIDENCE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  HIGH: 'outline', // white border
  MEDIUM: 'secondary', // gold-styled
  LOW: 'destructive', // redline
};
```

**Step 2: Add `font-heading` to tab triggers and update styling**

Replace `<TabsList>` section:

```tsx
<TabsList className="bg-transparent border-b border-border rounded-none">
  <TabsTrigger
    value="answers"
    className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:bg-transparent uppercase tracking-wider text-xs"
  >
    Answers
  </TabsTrigger>
  <TabsTrigger
    value="rules"
    className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:bg-transparent uppercase tracking-wider text-xs"
  >
    Rules
  </TabsTrigger>
</TabsList>
```

**Step 3: Verify and commit**

```bash
git add src/components/results-panel.tsx
git commit -m "Restyle results panel with underline tabs and blueprint confidence badges"
```

---

### Task 12: Update Vocabulary Panel

**Files:**

- Modify: `src/components/vocabulary-panel.tsx`

**Step 1: Update header and mutation badges**

Update the header `<h3>`:

```tsx
<h3 className="font-heading text-sm text-foreground">Vocabulary</h3>
```

Update entry count badge to use cyan monospace:

```tsx
<span className="dimension">
  {vocabulary.length} {vocabulary.length === 1 ? 'entry' : 'entries'}
</span>
```

Update mutation badges to blueprint border treatment:

```tsx
{
  mutationSummary.added > 0 && (
    <Badge variant="outline" className="border-foreground text-foreground text-xs">
      +{mutationSummary.added} added
    </Badge>
  );
}
{
  mutationSummary.updated > 0 && (
    <Badge variant="outline" className="border-status-warning text-status-warning text-xs">
      {mutationSummary.updated} updated
    </Badge>
  );
}
{
  mutationSummary.removed > 0 && (
    <Badge variant="outline" className="border-destructive text-destructive text-xs">
      {mutationSummary.removed} removed
    </Badge>
  );
}
```

Update table header styling to `uppercase tracking-wider text-muted-foreground`.

**Step 2: Verify and commit**

```bash
git add src/components/vocabulary-panel.tsx
git commit -m "Restyle vocabulary panel with blueprint header and border badges"
```

---

### Task 13: Update Skeleton Trace with Plotter Animation

**Files:**

- Modify: `src/components/skeleton-trace.tsx`

**Step 1: Replace shimmer with plotter SVG**

Replace the entire component:

```tsx
export function SkeletonTrace() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="border border-[rgba(255,255,255,0.15)] p-3">
          <svg
            width="100%"
            height="20"
            viewBox="0 0 400 20"
            preserveAspectRatio="none"
            className="text-foreground"
          >
            <line
              x1="0"
              y1="10"
              x2="400"
              y2="10"
              stroke="currentColor"
              strokeWidth="0.5"
              className="animate-plotter"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          </svg>
          <svg
            width="60%"
            height="12"
            viewBox="0 0 240 12"
            preserveAspectRatio="none"
            className="mt-2 text-muted-foreground"
          >
            <line
              x1="0"
              y1="6"
              x2="240"
              y2="6"
              stroke="currentColor"
              strokeWidth="0.5"
              className="animate-plotter"
              style={{ animationDelay: `${i * 200 + 100}ms` }}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/skeleton-trace.tsx
git commit -m "Replace shimmer skeleton with plotter line-drawing animation"
```

---

### Task 14: Update Jump-to-Latest Button and Resize Handles

**Files:**

- Modify: `src/app/page.tsx` (jump to latest button)

**Step 1: Restyle the floating button in page.tsx**

Replace the jump-to-latest button:

```tsx
<button
  onClick={() => traceEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
  className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 border border-accent bg-background/80 px-3 py-1 text-xs uppercase tracking-wider text-accent transition-opacity hover:bg-muted"
>
  Jump to latest &#8595;
</button>
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "Restyle jump-to-latest button with blueprint treatment"
```

---

### Task 15: Remove Theme Toggle and useTheme Hook

**Files:**

- Delete: `src/components/theme-toggle.tsx`
- Delete: `src/hooks/use-theme.ts`

**Step 1: Delete the files**

```bash
rm src/components/theme-toggle.tsx src/hooks/use-theme.ts
```

**Step 2: Verify no other files import them**

Search for `theme-toggle` and `use-theme` imports. The layout.tsx import was already removed in Task 1.

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add -A
git commit -m "Remove theme toggle and useTheme hook (single blueprint theme)"
```

---

### Task 16: Update Model Mode Toggle for Blueprint Style

**Files:**

- Modify: `src/components/model-mode-toggle.tsx`

**Step 1: Restyle labels**

The switch should use accent color when toggled. Update label classes:

Active label: `text-accent`
Inactive label: `text-muted-foreground`

The underlying shadcn Switch component should pick up the new accent color automatically from CSS variables.

**Step 2: Commit**

```bash
git add src/components/model-mode-toggle.tsx
git commit -m "Restyle model mode toggle labels for blueprint theme"
```

---

### Task 17: Visual Verification and Polish

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Visual checklist**

Open `http://localhost:3000` and verify:

- [ ] Deep blue background with visible 20px white grid lines
- [ ] No rounded corners anywhere
- [ ] Nav bar shows only the model toggle (no title, no theme toggle)
- [ ] Lex duck mascot visible at top of left panel with speech bubble
- [ ] "Copy and paste" text in speech bubble is cyan
- [ ] Problem input section wrapped in crosshair card with extending corner lines
- [ ] Textarea has thin white border, cyan glow on focus
- [ ] "SOLVE" button is red stamp style with slight rotation
- [ ] Selecting an example shows plotter loading animation
- [ ] Right panel empty state shows cyan crosshair reticle + "AWAITING INPUT"
- [ ] Submitting: step progress uses blueprint circles (cyan active, white complete)
- [ ] Activity indicator shows blinking `>` cursor and `T+MM:SS` format
- [ ] Trace event badges have transparent backgrounds with colored borders
- [ ] "Dev Trace" header uses Protest Riot font
- [ ] Results tabs use underline style (cyan active)
- [ ] Vocabulary header uses Protest Riot font, entry count in cyan monospace
- [ ] "Jump to latest" button is cyan-bordered, not rounded
- [ ] All fonts rendering correctly (Protest Riot for headings, Architects Daughter for stamps/mascot, Noto Sans for body)

**Step 3: Fix any visual issues found**

Address each issue as a micro-commit.

**Step 4: Final commit**

```bash
git add -A
git commit -m "Visual polish pass for blueprint theme"
```
