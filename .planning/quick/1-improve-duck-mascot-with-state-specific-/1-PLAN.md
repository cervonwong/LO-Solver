---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - public/lex-neutral.png
  - public/lex-thinking.png
  - public/lex-happy.png
  - public/lex-defeated.png
  - src/lib/mascot-messages.ts
  - src/hooks/use-typewriter.ts
  - src/components/lex-mascot.tsx
autonomous: true
requirements: [QUICK-1]

must_haves:
  truths:
    - "Duck image changes to match current mascot state (neutral/thinking/happy/defeated)"
    - "Speech bubble text appears letter-by-letter with typewriter animation"
    - "During solving state, messages auto-cycle through variants every ~20s (12s typing + 8s reading)"
    - "State change mid-animation cancels current typewriter and starts fresh"
    - "Each state shows one of 5 randomly selected message variants"
  artifacts:
    - path: "public/lex-neutral.png"
      provides: "Neutral duck image for idle/ready states"
    - path: "public/lex-thinking.png"
      provides: "Thinking duck image for solving state"
    - path: "public/lex-happy.png"
      provides: "Happy duck image for solved state"
    - path: "public/lex-defeated.png"
      provides: "Defeated duck image for error state"
    - path: "src/lib/mascot-messages.ts"
      provides: "5 message variants per MascotState"
      exports: ["MASCOT_MESSAGES", "getRandomMessage"]
    - path: "src/hooks/use-typewriter.ts"
      provides: "Typewriter animation hook with auto-cycling"
      exports: ["useTypewriter"]
    - path: "src/components/lex-mascot.tsx"
      provides: "Updated mascot component using state-specific images, typewriter, cycling"
  key_links:
    - from: "src/components/lex-mascot.tsx"
      to: "src/lib/mascot-messages.ts"
      via: "import MASCOT_MESSAGES, getRandomMessage"
      pattern: "import.*mascot-messages"
    - from: "src/components/lex-mascot.tsx"
      to: "src/hooks/use-typewriter.ts"
      via: "import useTypewriter"
      pattern: "import.*use-typewriter"
    - from: "src/components/lex-mascot.tsx"
      to: "src/contexts/mascot-context.tsx"
      via: "useMascotState for state-to-image mapping"
      pattern: "useMascotState"
---

<objective>
Enhance the Lex duck mascot with state-specific images, 5 speech variants per state, typewriter text animation, and auto-cycling messages during the solving state.

Purpose: Make the mascot feel alive and responsive to what's happening in the solver, rather than showing a static image with a single message per state.
Output: Updated mascot component with 4 duck images, 25 message variants, typewriter animation, and solving-state auto-cycling.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/lex-mascot.tsx
@src/contexts/mascot-context.tsx
@src/hooks/use-model-mode.ts

<interfaces>
<!-- From src/contexts/mascot-context.tsx -->
```typescript
export type MascotState = 'idle' | 'ready' | 'solving' | 'solved' | 'error';

export function useMascotState(): {
  mascotState: MascotState;
  setMascotState: (state: MascotState) => void;
};
```

<!-- Current lex-mascot.tsx structure -->
```typescript
// MESSAGES is a Record<MascotState, { text: string; accent?: string }[]>
// Each state maps to a single array of segments (text + optional accent spans)
// The component renders segments with accent spans colored differently
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Copy duck images and create message variants module</name>
  <files>public/lex-neutral.png, public/lex-thinking.png, public/lex-happy.png, public/lex-defeated.png, src/lib/mascot-messages.ts</files>
  <action>
**Step 1: Copy duck images from Windows Downloads into public/**

```bash
cp /mnt/c/Users/cervo/Downloads/duck-neutral.png public/lex-neutral.png
cp /mnt/c/Users/cervo/Downloads/duck-thinking.png public/lex-thinking.png
cp /mnt/c/Users/cervo/Downloads/duck-happy.png public/lex-happy.png
cp /mnt/c/Users/cervo/Downloads/duck-defeated.png public/lex-defeated.png
```

The old `public/lex-mascot.png` can remain (harmless), since the component will now reference the new filenames.

**Step 2: Create `src/lib/mascot-messages.ts`**

Define the message segment type and a `MASCOT_MESSAGES` constant: `Record<MascotState, MessageSegment[][]>` where each state has an array of 5 variants, and each variant is an array of `{ text: string; accent?: boolean }` segments.

Import `MascotState` from `@/contexts/mascot-context`.

Export a `getRandomMessage(state: MascotState): MessageSegment[]` function that picks a random variant from the array for that state.

Also export the `MessageSegment` type.

Message content guidelines — duck puns encouraged, keep the tone playful:

**idle** (5 variants, each should mention pasting a problem or trying examples):
1. "I'm Lex, the Linguistics Olympiad Problem solving duck! {Copy and paste} a LO Problem below or try one of my examples!" (preserves existing message)
2. "Quack quack! Got a linguistics puzzle? {Paste it below} and let's get cracking!"
3. "This duck's got brains! {Drop a problem} in the box and watch me work."
4. "Waddle you waiting for? {Paste a problem} below or pick an example!"
5. "Feathers primed, brain loaded. {Give me a puzzle} to sink my beak into!"

**ready** (5 variants, each should reference hitting Solve):
1. "Ooh, that's a juicy one! Hit {Solve} whenever you're ready and I'll get quacking!" (preserves existing)
2. "Now we're talking! Smash that {Solve} button and I'll work my magic!"
3. "Ooh I love this kind of puzzle! Hit {Solve} and watch me fly!"
4. "My duck senses are tingling... press {Solve} and let's do this!"
5. "A worthy challenge! Click {Solve} and I'll give it my best quack!"

**solving** (5 variants, shown during auto-cycling):
1. "Quack-ulating... my finest duck brains are on it!"
2. "Analyzing patterns... this is what I was hatched for!"
3. "Hmm, let me ruffle through my linguistic feathers..."
4. "Cross-referencing quack-tionaries... almost there!"
5. "Duck-oding the patterns... the pieces are falling into place!"

**solved** (5 variants):
1. "Duck yeah! The answer's all wrapped up. How'd I do?"
2. "Nailed it! Well, I think so. Take a gander at my work!"
3. "And that's how the duck does it! Check out the answers below!"
4. "Ta-da! Another puzzle cracked. I'm one talented fowl!"
5. "Quack of dawn to finish line! Here are my answers!"

**error** (5 variants):
1. "Oh no, I ruffled my feathers on that one... Try again or paste a different problem!"
2. "Well, that didn't fly... Give it another {try} or swap the problem!"
3. "Ducking disaster! Something went wrong. Let's {try again}!"
4. "My wings got tangled... Hit {try again} and I'll give it another go!"
5. "Fowl play! Something broke. {Paste a new problem} or retry!"

Use `{word}` notation above as shorthand — in actual code, these become `{ text: 'word', accent: true }` segments. Split the text around accented words into proper segments array.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -20</automated>
  </verify>
  <done>4 duck PNG files exist in public/. mascot-messages.ts exports MASCOT_MESSAGES (5 variants per 5 states = 25 total), getRandomMessage function, and MessageSegment type. Types check clean.</done>
</task>

<task type="auto">
  <name>Task 2: Create useTypewriter hook and update LexMascot component</name>
  <files>src/hooks/use-typewriter.ts, src/components/lex-mascot.tsx</files>
  <action>
**Step 1: Create `src/hooks/use-typewriter.ts`**

Build a custom hook: `useTypewriter(segments: MessageSegment[], options?: { charDelay?: number; enabled?: boolean })`.

The hook takes an array of `MessageSegment` (the message to animate) and returns `{ visibleSegments: MessageSegment[]; isTyping: boolean }`.

Implementation details:
- Flatten all segments into a total character count. Use a single `charIndex` counter that advances from 0 to totalChars.
- Use `useEffect` with `setInterval` at ~30ms (configurable via `charDelay`) to increment `charIndex`.
- Derive `visibleSegments` by slicing: walk through segments, for each segment determine how many characters are visible based on cumulative position vs `charIndex`. Return segments with `text` truncated to visible portion. Skip segments with 0 visible chars.
- When `charIndex >= totalChars`, clear the interval and set `isTyping = false`.
- When `segments` reference changes (use a stable key — JSON.stringify or a version counter), reset `charIndex` to 0 and restart.
- If `enabled` is false, return the full segments immediately (no animation).
- Cleanup: clear interval on unmount or when segments change.

Import `MessageSegment` from `@/lib/mascot-messages`.

**Step 2: Update `src/components/lex-mascot.tsx`**

Complete rewrite of the component. Key changes:

1. **Image mapping**: Create a `const STATE_IMAGE: Record<MascotState, string>` mapping:
   - idle -> `/lex-neutral.png`
   - ready -> `/lex-neutral.png`
   - solving -> `/lex-thinking.png`
   - solved -> `/lex-happy.png`
   - error -> `/lex-defeated.png`

2. **Message selection**: On state change, call `getRandomMessage(mascotState)` to pick a random variant. Store in a ref or state. Use `useRef` for a "message version" counter to trigger typewriter reset without causing extra re-renders.

3. **Typewriter integration**: Pass selected message segments to `useTypewriter()`. Render `visibleSegments` instead of static segments. Keep the same accent span rendering logic.

4. **Solving auto-cycle**: When `mascotState === 'solving'` and typewriter `isTyping === false` (animation finished), start a timer (~8 seconds reading time). When timer fires, pick a new random variant (different from current — re-roll if same) and reset the typewriter by updating the message state. Use `useEffect` watching `[mascotState, isTyping]`. Clear timer on state change or unmount.

5. **State change handling**: When `mascotState` changes, immediately pick a new random message. The typewriter hook will auto-reset because segments changed. Cancel any pending auto-cycle timer.

6. **Image preloading**: Add hidden `<link rel="preload">` or simply render all 4 images in a hidden container on mount so state transitions don't flash. Alternatively, use Next.js `Image` with `priority` on the active one. Simplest approach: preload with `new Image()` in a `useEffect([], ...)` on mount for all 4 paths.

7. **Preserve existing layout**: Keep the same flex layout, SVG tail, speech bubble structure. Only change the `<Image src=...>` and the text rendering inside the bubble.

8. **Blinking cursor**: While `isTyping` is true, show a blinking cursor character (`|`) after the last visible character, styled with a CSS animation (`animate-pulse` from Tailwind or a custom `@keyframes blink`). Remove cursor when typing completes.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -20</automated>
  </verify>
  <done>useTypewriter hook animates text letter-by-letter at ~30ms. LexMascot shows state-specific duck image, randomly selected message variant with typewriter animation, auto-cycles during solving state with ~8s reading pause, cancels animation cleanly on state change. Blinking cursor visible during typing. All types check clean.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
2. `npm run build` completes without errors
3. Visual check: navigate to localhost:3000, observe idle duck with neutral image and typewriter animation on load
4. Paste a problem -> ready state shows neutral image with new random message + typewriter
5. Click solve -> solving state shows thinking image, messages auto-cycle with typewriter
6. On completion -> solved state shows happy image
7. On error -> error state shows defeated image
</verification>

<success_criteria>
- 4 state-specific duck images render correctly based on mascot state
- 5 unique message variants per state, randomly selected on state transitions
- Typewriter animation reveals text at ~30ms per character with blinking cursor
- During solving, messages auto-cycle: typewriter completes -> 8s pause -> new variant
- State changes cancel in-progress animations and timers cleanly (no memory leaks)
- No TypeScript errors, build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/1-improve-duck-mascot-with-state-specific-/1-01-SUMMARY.md`
</output>
