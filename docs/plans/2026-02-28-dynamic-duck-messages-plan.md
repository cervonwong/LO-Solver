# Dynamic Duck Messages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Lex the duck's speech bubble dynamically change based on the solver's state (idle, ready, solving, solved, error).

**Architecture:** React Context (`MascotContext`) holds a `MascotState` value. The page and ProblemInput update it at state transitions. LexMascot consumes it to pick the right message.

**Tech Stack:** React Context, TypeScript, Next.js

---

### Task 1: Create MascotContext

**Files:**
- Create: `src/contexts/mascot-context.tsx`

**Step 1: Create the contexts directory**

Run: `mkdir -p src/contexts`

**Step 2: Write the context file**

```tsx
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type MascotState = 'idle' | 'ready' | 'solving' | 'solved' | 'error';

interface MascotContextValue {
  mascotState: MascotState;
  setMascotState: (state: MascotState) => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

export function MascotProvider({ children }: { children: ReactNode }) {
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  return (
    <MascotContext.Provider value={{ mascotState, setMascotState }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascotState() {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error('useMascotState must be used within MascotProvider');
  return ctx;
}
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors (only the pre-existing globals.css one).

**Step 4: Commit**

```bash
git add src/contexts/mascot-context.tsx
git commit -m "Add MascotContext for dynamic duck messages"
```

---

### Task 2: Update LexMascot to consume MascotContext

**Files:**
- Modify: `src/components/lex-mascot.tsx`

**Step 1: Replace the static message with context-driven messages**

Replace the entire file content with:

```tsx
'use client';

import Image from 'next/image';
import { useMascotState, type MascotState } from '@/contexts/mascot-context';

const MESSAGES: Record<MascotState, { text: string; accent?: string }[]> = {
  idle: [
    { text: "I'm Lex, the Linguistics Olympiad Problem solving duck! " },
    { text: 'Copy and paste', accent: 'true' },
    { text: ' a LO Problem below or try one of my examples!' },
  ],
  ready: [
    { text: "Ooh, that's a juicy one! Hit " },
    { text: 'Solve', accent: 'true' },
    { text: " whenever you're ready and I'll get quacking!" },
  ],
  solving: [{ text: 'Quack-ulating... my finest duck brains are on it!' }],
  solved: [{ text: "Duck yeah! The answer's all wrapped up. How'd I do?" }],
  error: [
    { text: 'Oh no, I ruffled my feathers on that one... Try again or paste a different problem!' },
  ],
};

export function LexMascot() {
  const { mascotState } = useMascotState();
  const segments = MESSAGES[mascotState];

  return (
    <div className="flex items-start">
      <Image
        src="/lex-mascot.png"
        alt="Lex the duck mascot"
        width={60}
        height={60}
        className="shrink-0"
      />

      {/* SVG tail — sits on top of the bubble's left border via z-10 */}
      <svg
        width="12"
        height="24"
        viewBox="0 0 12 24"
        className="relative z-10 mt-3 shrink-0"
        style={{ marginRight: '-1px' }}
      >
        <polygon points="0,12 12,0 12,24" style={{ fill: 'var(--surface-1)' }} stroke="none" />
        <polyline
          points="12,0 0,12 12,24"
          fill="none"
          style={{ stroke: 'var(--border-strong)' }}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>

      {/* Speech bubble with crosshair corner extensions */}
      <div className="speech-bubble px-4 py-3">
        <p className="font-heading text-base leading-relaxed">
          {segments.map((seg, i) =>
            seg.accent ? (
              <span key={i} className="text-accent">
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors (only the pre-existing globals.css one).

**Step 3: Commit**

```bash
git add src/components/lex-mascot.tsx
git commit -m "Make LexMascot consume MascotContext for dynamic messages"
```

---

### Task 3: Wire MascotProvider and state transitions in page.tsx

**Files:**
- Modify: `src/app/page.tsx:1-409`

This task adds the provider wrapper and calls `setMascotState` at the right transition points.

**Step 1: Add imports**

At the top of `page.tsx`, add to imports:

```tsx
import { MascotProvider, useMascotState } from '@/contexts/mascot-context';
```

**Step 2: Extract inner content into a child component**

Because `useMascotState()` must be called inside `<MascotProvider>`, we need to either:
- Wrap the return JSX in `<MascotProvider>` and call `setMascotState` from a child, OR
- Move the provider higher (layout) — but layout is a server component

The cleanest approach: wrap the `SolverPage` return value in `<MascotProvider>` and extract a small `useMascotSync` hook that syncs solver state to mascot state. This avoids restructuring the component.

Add a custom hook inside `page.tsx` (before the `SolverPage` component):

```tsx
function useMascotSync({
  hasStarted,
  isComplete,
  isFailed,
  isRunning,
}: {
  hasStarted: boolean;
  isComplete: boolean;
  isFailed: boolean;
  isRunning: boolean;
}) {
  const { setMascotState } = useMascotState();

  useEffect(() => {
    if (isFailed) {
      setMascotState('error');
    } else if (isComplete) {
      setMascotState('solved');
    } else if (isRunning || hasStarted) {
      setMascotState('solving');
    }
  }, [hasStarted, isComplete, isFailed, isRunning, setMascotState]);

  return setMascotState;
}
```

**Step 3: Split SolverPage into provider wrapper + inner component**

Rename the current `SolverPage` to `SolverPageInner`. Create a new `SolverPage` that wraps it:

```tsx
export default function SolverPage() {
  return (
    <MascotProvider>
      <SolverPageInner />
    </MascotProvider>
  );
}

function SolverPageInner() {
  // ... all existing code from current SolverPage ...
}
```

**Step 4: Call useMascotSync inside SolverPageInner**

After the existing `isRunning` declaration (line 222), add:

```tsx
const setMascotState = useMascotSync({ hasStarted, isComplete, isFailed, isRunning });
```

**Step 5: Pass setMascotState to ProblemInput for "ready" state**

Update the `<ProblemInput>` JSX to pass a callback:

```tsx
<ProblemInput
  examples={examples}
  onSolve={handleSolve}
  disabled={isRunning}
  onTextChange={(hasText) => {
    if (!hasStarted) setMascotState(hasText ? 'ready' : 'idle');
  }}
/>
```

**Step 6: Update handleReset to reset mascot**

In `handleReset`, add `setMascotState('idle')`:

```tsx
const handleReset = useCallback(() => {
  hasSent.current = false;
  setHasStarted(false);
  setInputOpen(true);
  setMessages([]);
  setMascotState('idle');
}, [setMessages, setMascotState]);
```

**Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: Error about `onTextChange` prop not existing on ProblemInput yet (expected, fixed in Task 4).

---

### Task 4: Add onTextChange callback to ProblemInput

**Files:**
- Modify: `src/components/problem-input.tsx:17-27,125-127`

**Step 1: Add the prop**

Update `ProblemInputProps` interface:

```tsx
interface ProblemInputProps {
  examples: ExampleOption[];
  onSolve: (text: string) => void;
  disabled?: boolean | undefined;
  onTextChange?: (hasText: boolean) => void;
}
```

Update the destructuring:

```tsx
export function ProblemInput({ examples, onSolve, disabled, onTextChange }: ProblemInputProps) {
```

**Step 2: Call onTextChange from the textarea onChange**

Update the Textarea onChange handler:

```tsx
onChange={(e) => {
  setProblemText(e.target.value);
  onTextChange?.(!!e.target.value.trim());
}}
```

**Step 3: Call onTextChange after example loads**

In `handleExampleSelect`, after `setProblemText(text)` (line 43):

```tsx
setProblemText(text);
onTextChange?.(!!text.trim());
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors (only the pre-existing globals.css one).

**Step 5: Commit all wiring changes (Tasks 3 + 4 together)**

```bash
git add src/app/page.tsx src/components/problem-input.tsx
git commit -m "Wire MascotProvider and state transitions for dynamic duck messages"
```

---

### Task 5: Manual verification

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Verify each state transition**

1. **Idle**: Page loads → duck says "I'm Lex, the Linguistics Olympiad Problem solving duck! Copy and paste a LO Problem below or try one of my examples!"
2. **Ready**: Type/paste text in textarea OR load an example → duck says "Ooh, that's a juicy one! Hit Solve whenever you're ready and I'll get quacking!"
3. **Ready → Idle**: Clear the textarea → duck returns to idle message
4. **Solving**: Click Solve → duck says "Quack-ulating... my finest duck brains are on it!"
5. **Solved**: Workflow completes → duck says "Duck yeah! The answer's all wrapped up. How'd I do?"
6. **Error**: If workflow fails → duck says "Oh no, I ruffled my feathers on that one..."
7. **Reset**: Click "New Problem" → duck returns to idle message

**Step 3: Final commit if any fixes needed**
