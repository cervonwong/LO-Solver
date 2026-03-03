---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/contexts/mascot-context.tsx
  - src/lib/mascot-messages.ts
  - src/components/lex-mascot.tsx
  - src/app/page.tsx
autonomous: true
requirements: [QUICK-13]
must_haves:
  truths:
    - "When the user aborts a running workflow, the duck shows a unique aborted message"
    - "The aborted duck uses the neutral image (lex-neutral.png), not the defeated image"
    - "Aborted messages are distinct from error, idle, and solved messages"
  artifacts:
    - path: "src/contexts/mascot-context.tsx"
      provides: "MascotState union including 'aborted'"
      contains: "aborted"
    - path: "src/lib/mascot-messages.ts"
      provides: "5 aborted message variants with MessageSegment arrays"
      contains: "aborted"
    - path: "src/components/lex-mascot.tsx"
      provides: "STATE_IMAGE mapping aborted to lex-neutral.png"
      contains: "aborted"
    - path: "src/app/page.tsx"
      provides: "useMascotSync detecting aborted state"
      contains: "setMascotState('aborted')"
  key_links:
    - from: "src/app/page.tsx"
      to: "src/contexts/mascot-context.tsx"
      via: "setMascotState('aborted') in useMascotSync"
      pattern: "setMascotState\\('aborted'\\)"
    - from: "src/lib/mascot-messages.ts"
      to: "src/contexts/mascot-context.tsx"
      via: "Record<MascotState, ...> includes aborted key"
      pattern: "aborted:"
---

<objective>
Add an 'aborted' state to the duck mascot speech system so that when a user aborts a running workflow, Lex shows unique aborted-specific messages with the neutral duck image instead of falling back to the generic idle state.

Purpose: The aborted state (hasStarted && !isRunning && !isComplete && !isFailed) currently maps to 'idle', losing the context that a workflow was interrupted. A distinct aborted state with its own messages gives better user feedback.
Output: Updated mascot context, messages, component, and sync logic.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/contexts/mascot-context.tsx
@src/lib/mascot-messages.ts
@src/components/lex-mascot.tsx
@src/app/page.tsx (useMascotSync function, lines ~56-82)

<interfaces>
<!-- From src/contexts/mascot-context.tsx -->
export type MascotState = 'idle' | 'ready' | 'solving' | 'solved' | 'error';

<!-- From src/lib/mascot-messages.ts -->
export interface MessageSegment { text: string; accent?: boolean; }
export const MASCOT_MESSAGES: Record<MascotState, MessageSegment[][]>
export function getRandomMessage(state: MascotState): MessageSegment[]

<!-- From src/components/lex-mascot.tsx -->
const STATE_IMAGE: Record<MascotState, string>
// Maps each state to a duck image path

<!-- From src/app/page.tsx (useMascotSync, line 313) -->
const isAborted = hasStarted && !isRunning && !isComplete && !isFailed;
// Already computed but not wired to mascot state
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add aborted to MascotState type and message variants</name>
  <files>src/contexts/mascot-context.tsx, src/lib/mascot-messages.ts</files>
  <action>
1. In `src/contexts/mascot-context.tsx`, add `'aborted'` to the `MascotState` union type:
   `export type MascotState = 'idle' | 'ready' | 'solving' | 'solved' | 'error' | 'aborted';`

2. In `src/lib/mascot-messages.ts`, add an `aborted` key to `MASCOT_MESSAGES` with 5 message variants. The tone should be neutral/understanding (not defeated like error). Use accent spans for actionable text like "try again" or "new problem". Example messages:
   - "Quack! No worries, we can [try again] whenever you're ready!"
   - "Stopped mid-waddle! [Paste a new problem] or hit [SOLVE] to restart."
   - "Mission a-duck-ed! Ready for another go when you are."
   - "Alright, pulling the brakes! [Try another problem] or re-run this one."
   - "Wings folded! Want to [give it another go] or try something new?"

   Use the same MessageSegment[] pattern as other states, with accent: true on actionable phrases.
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" || echo "0 errors"</verify>
  <done>MascotState includes 'aborted', MASCOT_MESSAGES has 5 aborted variants with accent spans, TypeScript compiles cleanly</done>
</task>

<task type="auto">
  <name>Task 2: Wire aborted state in mascot component and sync logic</name>
  <files>src/components/lex-mascot.tsx, src/app/page.tsx</files>
  <action>
1. In `src/components/lex-mascot.tsx`, add `aborted` to the `STATE_IMAGE` record, mapping it to `'/lex-neutral.png'` (neutral duck, not defeated).

2. In `src/app/page.tsx`, update the `useMascotSync` function. The `isAborted` variable is already computed at line 313 (`hasStarted && !isRunning && !isComplete && !isFailed`). Pass it into `useMascotSync` and add it to the condition chain. The updated logic inside the useEffect should be:

   ```
   if (isFailed) {
     setMascotState('error');
   } else if (isComplete) {
     setMascotState('solved');
   } else if (isRunning) {
     setMascotState('solving');
   } else if (isAborted) {
     setMascotState('aborted');
   } else {
     setMascotState('idle');
   }
   ```

   Two approaches to wire this — either:
   (a) Add `isAborted` as a parameter to `useMascotSync` alongside the existing booleans, OR
   (b) Compute it inside `useMascotSync` from the existing `hasStarted && !isRunning && !isComplete && !isFailed`.

   Option (b) is cleaner since the inputs already exist. If using (b), add the derived check directly in the useEffect. The `isAborted` check MUST come after `isRunning` (since isRunning=false is part of the aborted condition) and before the fallback `idle`.

   Also add `hasStarted` to the useEffect dependency array if it is not already used in the condition (it is listed but currently only used indirectly — confirm it remains in deps).
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" || echo "0 errors"</verify>
  <done>Aborting a running workflow shows the neutral duck with an aborted-specific message. The idle state is only reached when no workflow has started. TypeScript compiles cleanly.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
2. Grep confirms all four files reference 'aborted':
   - `grep "aborted" src/contexts/mascot-context.tsx` shows it in the type union
   - `grep "aborted" src/lib/mascot-messages.ts` shows 5 message variants
   - `grep "aborted" src/components/lex-mascot.tsx` shows it in STATE_IMAGE
   - `grep "aborted" src/app/page.tsx` shows it in useMascotSync
</verification>

<success_criteria>
- MascotState type includes 'aborted' as a valid state
- 5 unique aborted message variants exist with accent spans on actionable text
- Aborted state uses lex-neutral.png (not lex-defeated.png)
- useMascotSync correctly detects aborted condition (hasStarted && !isRunning && !isComplete && !isFailed) and sets mascotState to 'aborted'
- TypeScript compiles without new errors
</success_criteria>

<output>
After completion, create `.planning/quick/13-add-aborted-state-to-duck-mascot-speech-/13-SUMMARY.md`
</output>
