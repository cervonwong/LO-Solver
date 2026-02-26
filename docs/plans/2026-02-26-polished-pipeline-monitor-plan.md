# Polished Pipeline Monitor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the LO-Solver UI from a monochrome monospace prototype into a polished three-panel developer tool with semantic colors, dark mode, rich content rendering, and smooth streaming UX.

**Architecture:** Keep the existing data flow (`useChat` + streaming data parts) and component structure intact. Add nested `ResizablePanelGroup` for the three-panel layout. Introduce `streamdown` for markdown rendering. Add CSS-only animations and transitions. Use the same `useSyncExternalStore` pattern (from model-mode-toggle) for theme persistence.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, streamdown + @streamdown/code, Radix UI (Tabs, Collapsible), react-resizable-panels, lucide-react icons.

---

### Task 1: Install Dependencies & Configure Streamdown

**Files:**

- Modify: `package.json`
- Modify: `src/app/globals.css:1-3`

**Step 1: Install streamdown and code plugin**

Run: `npm install streamdown @streamdown/code`

**Step 2: Add streamdown source directive to globals.css**

In `src/app/globals.css`, add after line 3 (after the existing imports):

```css
@source "../node_modules/streamdown/dist/*.js";
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 4: Commit**

```
Add streamdown dependencies and CSS source directive
```

---

### Task 2: Semantic Color Tokens in CSS

**Files:**

- Modify: `src/app/globals.css:7-46` (theme inline block)
- Modify: `src/app/globals.css:48-81` (:root block)
- Modify: `src/app/globals.css:83-115` (.dark block)

**Step 1: Add semantic color CSS custom properties to `:root`**

Add these new custom properties inside the `:root` block (after `--ring` at line 67):

```css
/* Semantic status colors */
--status-active: oklch(0.55 0.18 250);
--status-active-foreground: oklch(0.985 0 0);
--status-active-muted: oklch(0.55 0.18 250 / 10%);
--status-success: oklch(0.55 0.18 145);
--status-success-foreground: oklch(0.985 0 0);
--status-success-muted: oklch(0.55 0.18 145 / 10%);
--status-warning: oklch(0.65 0.18 75);
--status-warning-foreground: oklch(0.145 0 0);
--status-warning-muted: oklch(0.65 0.18 75 / 10%);
/* Trace event type colors */
--trace-agent: oklch(0.55 0.15 300);
--trace-agent-muted: oklch(0.55 0.15 300 / 10%);
--trace-tool: oklch(0.55 0.15 200);
--trace-tool-muted: oklch(0.55 0.15 200 / 10%);
--trace-vocab: oklch(0.55 0.15 175);
--trace-vocab-muted: oklch(0.55 0.15 175 / 10%);
```

**Step 2: Add dark mode overrides**

Add inside the `.dark` block (after `--ring` at line 101):

```css
/* Semantic status colors - dark mode (lighter) */
--status-active: oklch(0.65 0.18 250);
--status-active-foreground: oklch(0.145 0 0);
--status-active-muted: oklch(0.55 0.18 250 / 15%);
--status-success: oklch(0.65 0.18 145);
--status-success-foreground: oklch(0.145 0 0);
--status-success-muted: oklch(0.55 0.18 145 / 15%);
--status-warning: oklch(0.75 0.18 75);
--status-warning-foreground: oklch(0.145 0 0);
--status-warning-muted: oklch(0.65 0.18 75 / 15%);
/* Trace event type colors - dark mode */
--trace-agent: oklch(0.7 0.15 300);
--trace-agent-muted: oklch(0.55 0.15 300 / 15%);
--trace-tool: oklch(0.7 0.15 200);
--trace-tool-muted: oklch(0.55 0.15 200 / 15%);
--trace-vocab: oklch(0.7 0.15 175);
--trace-vocab-muted: oklch(0.55 0.15 175 / 15%);
```

**Step 3: Register new colors in the `@theme inline` block**

Add inside the `@theme inline` block (after `--color-sidebar-ring` at line 45):

```css
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
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
Add semantic color tokens for status and trace event types
```

---

### Task 3: Typography -- Switch from Monospace to Sans-Serif

**Files:**

- Modify: `src/app/layout.tsx:13`

**Step 1: Change body font class**

In `src/app/layout.tsx` line 13, change `font-mono` to `font-sans`:

```tsx
// Before:
<body className="flex h-full flex-col bg-background font-mono text-foreground antialiased">
// After:
<body className="flex h-full flex-col bg-background font-sans text-foreground antialiased">
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
Switch body font from monospace to sans-serif
```

---

### Task 4: Dark Mode -- Theme Hook & Toggle Component

**Files:**

- Create: `src/hooks/use-theme.ts`
- Create: `src/components/theme-toggle.tsx`
- Modify: `src/app/layout.tsx:12-16`

**Step 1: Create the theme hook**

Create `src/hooks/use-theme.ts`. Follow the same `useSyncExternalStore` pattern as `src/hooks/use-model-mode.ts`:

```typescript
'use client';

import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'lo-solver-theme';
const DEFAULT_THEME: Theme = 'system';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return DEFAULT_THEME;
}

function getResolvedTheme(): ResolvedTheme {
  const theme = getStoredTheme();
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(): void {
  const resolved = getResolvedTheme();
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function subscribe(callback: () => void): () => void {
  const handleStorage = () => {
    applyTheme();
    callback();
  };
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => {
    applyTheme();
    callback();
  };
  window.addEventListener('storage', handleStorage);
  mql.addEventListener('change', handleMediaChange);
  // Apply on mount
  applyTheme();
  return () => {
    window.removeEventListener('storage', handleStorage);
    mql.removeEventListener('change', handleMediaChange);
  };
}

function getSnapshot(): ResolvedTheme {
  return getResolvedTheme();
}

function getServerSnapshot(): ResolvedTheme {
  return 'light';
}

export function useTheme(): {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
} {
  const resolvedTheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme();
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return { theme: getStoredTheme(), resolvedTheme, setTheme };
}
```

**Step 2: Create the theme toggle component**

Create `src/components/theme-toggle.tsx`:

```tsx
'use client';

import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  const Icon = theme === 'system' ? MonitorIcon : theme === 'light' ? SunIcon : MoonIcon;
  const label = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';

  return (
    <Button variant="ghost" size="sm" onClick={cycleTheme} className="gap-1.5">
      <Icon className="h-4 w-4" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </Button>
  );
}
```

**Step 3: Add theme toggle to layout and add `suppressHydrationWarning`**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { ModelModeToggle } from '@/components/model-mode-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'LO-Solver',
  description: 'AI-powered Linguistics Olympiad Rosetta Stone solver',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex h-full flex-col bg-background font-sans text-foreground antialiased">
        <nav className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
          <span className="text-lg font-semibold tracking-tight">LO-Solver</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ModelModeToggle />
          </div>
        </nav>
        <main className="min-h-0 flex-1">{children}</main>
      </body>
    </html>
  );
}
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
Add dark mode with system preference detection and manual toggle
```

---

### Task 5: Animation Keyframes & Utility Classes

**Files:**

- Modify: `src/app/globals.css` (add at end, after `@layer base` block)

**Step 1: Add animation keyframes and utility classes**

Append to `src/app/globals.css`:

```css
/* Animation keyframes */
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

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes highlight-flash {
  0% {
    background-color: var(--trace-vocab-muted);
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

@keyframes progress-fill {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}

/* Utility classes for animations */
.animate-fade-in {
  animation: fade-in 200ms ease-out both;
}

.animate-slide-in-row {
  animation: slide-in-row 250ms ease-out both;
}

.animate-shimmer {
  background: linear-gradient(90deg, var(--muted) 25%, var(--accent) 50%, var(--muted) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.animate-highlight-flash {
  animation: highlight-flash 500ms ease-out both;
}

.animate-checkmark-scale {
  animation: checkmark-scale 300ms ease-out both;
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
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
Add animation keyframes and utility classes for UI transitions
```

---

### Task 6: Three-Panel Layout

**Files:**

- Modify: `src/app/page.tsx:184-230` (JSX layout)
- Create: `src/components/vocabulary-panel.tsx`

**Step 1: Create the vocabulary panel component**

Create `src/components/vocabulary-panel.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VocabEntry {
  foreignForm: string;
  meaning: string;
  type?: string;
  notes?: string;
}

interface MutationSummary {
  added: number;
  updated: number;
  removed: number;
}

interface VocabularyPanelProps {
  vocabulary: VocabEntry[];
  mutationSummary: MutationSummary;
  isRunning: boolean;
}

export function VocabularyPanel({ vocabulary, mutationSummary, isRunning }: VocabularyPanelProps) {
  const hasActivity =
    mutationSummary.added > 0 || mutationSummary.updated > 0 || mutationSummary.removed > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Vocabulary</h3>
          <Badge variant="secondary" className="text-xs">
            {vocabulary.length} {vocabulary.length === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>
        {hasActivity && (
          <div className="flex items-center gap-1.5">
            {mutationSummary.added > 0 && (
              <Badge className="bg-status-success-muted text-status-success text-xs">
                +{mutationSummary.added} added
              </Badge>
            )}
            {mutationSummary.updated > 0 && (
              <Badge className="bg-status-warning-muted text-status-warning text-xs">
                {mutationSummary.updated} updated
              </Badge>
            )}
            {mutationSummary.removed > 0 && (
              <Badge className="bg-destructive/10 text-destructive text-xs">
                {mutationSummary.removed} removed
              </Badge>
            )}
          </div>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {vocabulary.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            {isRunning
              ? 'Vocabulary entries will appear here as the solver discovers them...'
              : 'No vocabulary entries yet.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Form</TableHead>
                <TableHead className="text-xs">Meaning</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vocabulary.map((entry, i) => (
                <TableRow key={entry.foreignForm} className="animate-slide-in-row">
                  <TableCell className="font-mono text-sm">{entry.foreignForm}</TableCell>
                  <TableCell className="text-sm">{entry.meaning}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.type ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.notes ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
```

**Step 2: Update page.tsx layout to three-panel**

Replace the JSX layout in `src/app/page.tsx` (lines 184-230) with a nested `ResizablePanelGroup`. The outer group splits left/right horizontally. The right panel contains a vertical group splitting trace/vocabulary.

Key changes:

- Import `VocabularyPanel`
- Compute `mutationSummary` from vocabulary update events (add a `useMemo` after the existing vocabulary accumulation)
- Replace the single right panel with a vertical `ResizablePanelGroup` containing trace (top) and vocabulary (bottom)
- Remove `VocabularySection` rendering from the `ResultsPanel` props — vocabulary now lives in the bottom panel and is always visible when entries exist
- Pass vocabulary + mutationSummary to `VocabularyPanel` unconditionally (not gated by `isComplete`)

The mutation summary `useMemo` should count `add`, `update`, `remove` actions from the `data-vocabulary-update` parts:

```typescript
const mutationSummary = useMemo(() => {
  const summary = { added: 0, updated: 0, removed: 0 };
  for (const part of allParts) {
    if (part.type === 'data-vocabulary-update') {
      const data = part.data as VocabUpdateData;
      if (data.action === 'add') summary.added += data.entryCount ?? 1;
      else if (data.action === 'update') summary.updated += data.entryCount ?? 1;
      else if (data.action === 'remove') summary.removed += data.entryCount ?? 1;
    }
  }
  return summary;
}, [allParts]);
```

Layout JSX structure:

```tsx
<ResizablePanelGroup direction="horizontal" className="h-full">
  {/* Left panel: Input + Results */}
  <ResizablePanel defaultSize={35} minSize={25}>
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-6">
        {/* ... existing: Collapsible input, StepProgress, error, ResultsPanel, reset button */}
      </div>
    </ScrollArea>
  </ResizablePanel>

  <ResizableHandle withHandle />

  {/* Right panel: Trace (top) + Vocabulary (bottom) */}
  <ResizablePanel defaultSize={65} minSize={30}>
    <ResizablePanelGroup direction="vertical">
      {/* Trace panel */}
      <ResizablePanel defaultSize={70} minSize={30}>
        <ScrollArea className="h-full">
          <DevTracePanel events={traceEvents} isRunning={isRunning} />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Vocabulary panel */}
      <ResizablePanel defaultSize={30} minSize={15}>
        <VocabularyPanel
          vocabulary={vocabularyEntries}
          mutationSummary={mutationSummary}
          isRunning={isRunning}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  </ResizablePanel>
</ResizablePanelGroup>
```

**Step 3: Update results-panel.tsx to remove VocabularySection**

In `src/components/results-panel.tsx`:

- Remove `VocabEntry` interface, `VocabularySection` component, and `vocabulary` from `ResultsPanelProps`
- Remove the `vocabulary` prop pass-through in `ResultsPanel`
- Wrap `AnswersSection` + `RulesSection` in Radix `Tabs` with two tabs: "Answers" and "Rules"

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// In ResultsPanel:
<Tabs defaultValue="answers">
  <TabsList>
    <TabsTrigger value="answers">Answers</TabsTrigger>
    <TabsTrigger value="rules">Rules</TabsTrigger>
  </TabsList>
  <TabsContent value="answers">
    <AnswersSection answers={answers} />
  </TabsContent>
  <TabsContent value="rules">
    {rules && rules.length > 0 && <RulesSection rules={rules} />}
  </TabsContent>
</Tabs>;
```

**Step 4: Update page.tsx to stop passing vocabulary to ResultsPanel**

Remove the `vocabulary` prop from the `<ResultsPanel>` usage in page.tsx.

**Step 5: Verify build**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```
Add three-panel layout with persistent vocabulary panel and tabbed results
```

---

### Task 7: Trace Event Cards -- Color Accents & Rich Rendering

**Files:**

- Modify: `src/components/trace-event-card.tsx`

**Step 1: Add colored left-border accents per event type**

For each card type, add a `border-l-3` with the semantic color:

- `data-agent-reasoning`: `border-l-3 border-l-trace-agent`
- `data-tool-call`: `border-l-3 border-l-trace-tool`
- `data-vocabulary-update`: `border-l-3 border-l-trace-vocab`
- `data-step-start`: `border-l-3 border-l-status-active`
- `data-step-complete`: `border-l-3 border-l-status-success`
- `data-iteration-update`: `border-l-3 border-l-status-warning`

Also update badge colors to match:

- "AGENT" badge: `bg-trace-agent-muted text-trace-agent`
- "TOOL" badge: `bg-trace-tool-muted text-trace-tool`
- "VOCAB" badge: `bg-trace-vocab-muted text-trace-vocab`
- "START" badge: `bg-status-active-muted text-status-active`
- "DONE" badge: `bg-status-success-muted text-status-success`
- Iteration badges: `bg-status-warning-muted text-status-warning`

**Step 2: Add fade-in animation to all cards**

Add `animate-fade-in` class to the outer wrapper of each card variant.

**Step 3: Add smooth collapsible animation**

Add `className="animate-collapsible"` to `CollapsibleContent` elements in agent-reasoning and tool-call cards.

**Step 4: Render agent reasoning with Streamdown**

Replace the `<p className="whitespace-pre-wrap ...">` for reasoning text with:

```tsx
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import 'streamdown/styles.css';

// In the agent-reasoning CollapsibleContent:
<Streamdown plugins={{ code }}>{event.data.reasoning}</Streamdown>;
```

**Step 5: Render tool call JSON with Streamdown code fences**

Replace the `<pre>` blocks for tool input/result with Streamdown rendering via markdown code fences:

```tsx
const jsonMarkdown = (label: string, data: unknown) =>
  `**${label}:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;

// In the tool-call CollapsibleContent:
<Streamdown plugins={{ code }}>
  {jsonMarkdown('Input', event.data.input)}
</Streamdown>
<Streamdown plugins={{ code }}>
  {jsonMarkdown('Result', event.data.result)}
</Streamdown>
```

**Step 6: Verify build**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```
Add semantic color accents and rich content rendering to trace event cards
```

---

### Task 8: Activity Indicator

**Files:**

- Create: `src/components/activity-indicator.tsx`
- Modify: `src/components/dev-trace-panel.tsx`

**Step 1: Create activity indicator component**

Create `src/components/activity-indicator.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

interface ActivityIndicatorProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function ActivityIndicator({ events, isRunning }: ActivityIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  // Find the most recent agent or tool event to show what's active
  const latestActivity = [...events]
    .reverse()
    .find((e) => e.type === 'data-agent-reasoning' || e.type === 'data-tool-call');

  // Timer: count seconds since the latest activity started
  useEffect(() => {
    if (!isRunning) return;
    setElapsed(0);
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, latestActivity]);

  if (!isRunning && events.length > 0) {
    // Completed state
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const totalMs =
      firstEvent && lastEvent && 'timestamp' in firstEvent.data && 'timestamp' in lastEvent.data
        ? (lastEvent.data as { timestamp: number }).timestamp -
          (firstEvent.data as { timestamp: number }).timestamp
        : 0;

    return (
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="h-2 w-2 rounded-full bg-status-success" />
        <span className="text-sm text-muted-foreground">
          Completed {totalMs > 0 ? `in ${Math.round(totalMs / 1000)}s` : ''}
        </span>
      </div>
    );
  }

  if (!isRunning) return null;

  const agentName =
    latestActivity?.type === 'data-agent-reasoning'
      ? (latestActivity.data as { agentName?: string }).agentName
      : latestActivity?.type === 'data-tool-call'
        ? (latestActivity.data as { toolName?: string }).toolName
        : null;

  const model =
    latestActivity?.type === 'data-agent-reasoning'
      ? (latestActivity.data as { model?: string }).model
      : null;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-status-active-muted px-4 py-2">
      <span className="h-2 w-2 animate-pulse rounded-full bg-status-active" />
      <span className="text-sm font-medium">{agentName ?? 'Starting...'}</span>
      {model && <span className="text-xs text-muted-foreground">{model}</span>}
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{elapsed}s</span>
    </div>
  );
}
```

**Step 2: Add ActivityIndicator to DevTracePanel**

In `src/components/dev-trace-panel.tsx`, import and render `ActivityIndicator` at the top of the panel, before the step sections. Pass `events` and `isRunning` props.

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
Add activity indicator showing current agent/tool in trace panel
```

---

### Task 9: Auto-Scroll with Breakout

**Files:**

- Modify: `src/app/page.tsx` (trace panel scroll area)

**Step 1: Add auto-scroll logic**

In `page.tsx`, add refs and an `IntersectionObserver` for the trace panel's scroll area:

```typescript
const traceEndRef = useRef<HTMLDivElement>(null);
const [isAtBottom, setIsAtBottom] = useState(true);

// IntersectionObserver to detect if user scrolled away from bottom
useEffect(() => {
  const sentinel = traceEndRef.current;
  if (!sentinel) return;
  const observer = new IntersectionObserver(([entry]) => setIsAtBottom(entry.isIntersecting), {
    threshold: 0.1,
  });
  observer.observe(sentinel);
  return () => observer.disconnect();
}, []);

// Auto-scroll when new events arrive and user hasn't scrolled away
useEffect(() => {
  if (isAtBottom && traceEndRef.current) {
    traceEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [traceEvents.length, isAtBottom]);
```

**Step 2: Add sentinel div and "Jump to latest" pill**

Inside the trace panel's `ScrollArea`, after `<DevTracePanel>`, add:

```tsx
<div ref={traceEndRef} className="h-px" />
```

Outside the `ScrollArea` (but inside the panel), add the "Jump to latest" pill:

```tsx
{
  !isAtBottom && isRunning && (
    <button
      onClick={() => traceEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
      className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-status-active px-3 py-1 text-xs text-status-active-foreground shadow-md transition-opacity hover:opacity-90"
    >
      Jump to latest
    </button>
  );
}
```

The trace panel's `ResizablePanel` needs `className="relative"` for the absolute positioning to work.

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
Add auto-scroll with jump-to-latest breakout pill in trace panel
```

---

### Task 10: Step Progress Transitions & Polish

**Files:**

- Modify: `src/components/step-progress.tsx`

**Step 1: Add transitions to step circles**

Update the step circles to use CSS transitions for fill/stroke changes:

- Add `transition-all duration-300` to the circle container
- Success state: `bg-status-success text-status-success-foreground` with `animate-checkmark-scale` on the checkmark icon
- Running state: `bg-status-active text-status-active-foreground` with `animate-pulse` (keep existing behavior but with semantic color)
- Failed state: `bg-destructive text-destructive-foreground` (keep existing)
- Pending state: `bg-muted text-muted-foreground` (keep existing)

**Step 2: Animate connecting lines**

The connecting line between steps should show progress:

- Completed-to-completed: `bg-status-success` (solid green)
- Completed-to-running: gradient from `bg-status-success` to `bg-status-active`
- Any involving pending: `bg-border` (gray, as now)
- Add `transition-colors duration-300` to lines

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
Add color transitions and animations to step progress indicator
```

---

### Task 11: Skeleton Trace Loader

**Files:**

- Create: `src/components/skeleton-trace.tsx`
- Modify: `src/components/dev-trace-panel.tsx`

**Step 1: Create skeleton component**

Create `src/components/skeleton-trace.tsx`:

```tsx
export function SkeletonTrace() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-14 animate-shimmer rounded" />
            <div className="h-4 w-32 animate-shimmer rounded" />
            <div className="ml-auto h-4 w-16 animate-shimmer rounded" />
          </div>
          <div className="h-3 w-3/4 animate-shimmer rounded" />
          <div className="h-3 w-1/2 animate-shimmer rounded" />
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Use in DevTracePanel**

In `dev-trace-panel.tsx`, show `SkeletonTrace` when `isRunning && events.length === 0` (instead of the current empty state). The existing `EmptyState` (gear icon) only shows when `!isRunning && events.length === 0`.

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
Add skeleton shimmer loader for trace panel pre-first-event state
```

---

### Task 12: Final Collapsible Animation Pass

**Files:**

- Modify: `src/components/results-panel.tsx` (answer/rule collapsibles)
- Modify: `src/app/page.tsx` (problem input collapsible)

**Step 1: Add `animate-collapsible` to all CollapsibleContent elements**

In `results-panel.tsx`, add `className="animate-collapsible"` to every `<CollapsibleContent>` in AnswersSection and RulesSection.

In `page.tsx`, add `className="animate-collapsible"` to the problem input `<CollapsibleContent>`.

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
Add smooth open/close animations to all collapsible sections
```

---

### Task 13: Visual Smoke Test

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Manual verification checklist**

- [ ] Three-panel layout renders: left (input/results), right-top (trace), right-bottom (vocab)
- [ ] All three panel splits are resizable with grip handles
- [ ] Theme toggle cycles through system/light/dark, persists on reload
- [ ] Dark mode applies correctly (backgrounds, text, borders)
- [ ] Font is sans-serif everywhere except code blocks
- [ ] Vocabulary panel shows empty state with placeholder text
- [ ] Step progress uses semantic colors (blue active, green complete, red fail)
- [ ] Results show as tabs (Answers | Rules) not stacked sections

**Step 3: Run a solve and verify streaming UX**

- [ ] Skeleton shimmer appears in trace panel before first event
- [ ] Activity indicator at top of trace shows current agent + elapsed timer
- [ ] Trace events fade in (not pop) as they arrive
- [ ] Event cards have colored left borders (purple for agent, cyan for tool, teal for vocab)
- [ ] Agent reasoning renders as formatted markdown (bold, lists, code)
- [ ] Tool call JSON has syntax highlighting
- [ ] Vocabulary table updates live with new entries sliding in
- [ ] Mutation summary badges appear ("+N added", "N updated")
- [ ] Auto-scroll follows new events
- [ ] Scrolling up manually shows "Jump to latest" pill
- [ ] Collapsibles animate smoothly open/close
- [ ] Step progress animates between states with color transitions

**Step 4: Commit any fixes found during smoke test**

```
Fix issues found during visual smoke test
```
