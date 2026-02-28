# Dynamic Duck Messages Design

## Summary

Make Lex the duck's speech bubble change based on the solver's state. One fixed message per state, playful & punny tone, wired via React Context.

## States & Messages

| State | Trigger | Message |
|-------|---------|---------|
| `idle` | Initial load, no problem text | "I'm Lex, the Linguistics Olympiad Problem solving duck! **Copy and paste** a LO Problem below or try one of my examples!" |
| `ready` | Problem text entered/loaded | "Ooh, that's a juicy one! Hit **Solve** whenever you're ready and I'll get quacking!" |
| `solving` | User clicks Solve | "Quack-ulating... my finest duck brains are on it!" |
| `solved` | Workflow completes successfully | "Duck yeah! The answer's all wrapped up. How'd I do?" |
| `error` | Workflow fails | "Oh no, I ruffled my feathers on that one... Try again or paste a different problem!" |

Accent-highlighted words (cyan) preserved for key action words like "Copy and paste" and "Solve".

## Architecture

Context-driven approach: a `MascotContext` decouples the mascot from direct props.

### New file: `src/contexts/mascot-context.tsx`

- `MascotState` type: `'idle' | 'ready' | 'solving' | 'solved' | 'error'`
- `MascotProvider` component holding state + setter
- `useMascotState()` hook returning `{ mascotState, setMascotState }`

### Modified: `src/app/page.tsx`

- Wraps content in `<MascotProvider>`
- Calls `setMascotState()` at state transitions:
  - `'ready'` when problem text becomes non-empty
  - `'solving'` in handleSolve
  - `'solved'` when isComplete
  - `'error'` when isFailed
  - `'idle'` on "New Problem" reset

### Modified: `src/components/lex-mascot.tsx`

- Calls `useMascotState()` to get current state
- Maps state to message via lookup object
- Renders with accent highlights

### Data flow

```
page.tsx (MascotProvider)
  +-- ProblemInput -> on text change -> setMascotState('ready')
  +-- handleSolve -> setMascotState('solving')
  +-- useEffect(isComplete) -> setMascotState('solved')
  +-- useEffect(isFailed) -> setMascotState('error')
  +-- LexMascot -> useMascotState() -> renders message
```
