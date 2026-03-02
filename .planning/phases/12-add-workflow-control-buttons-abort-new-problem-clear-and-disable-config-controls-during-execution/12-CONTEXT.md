# Phase 12: Add workflow control buttons (Abort, New Problem) and disable config controls during execution - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Abort and New Problem buttons to the nav bar and disable all config controls during workflow execution. The original phase mentioned "Clear" as a separate action, but discussion confirmed Clear and New Problem are the same operation — no separate Clear button needed.

</domain>

<decisions>
## Implementation Decisions

### Button placement
- Abort and New Problem buttons live in the existing nav bar, rightmost position (after Model Mode toggle)
- Both buttons are always rendered (stable layout, no shifting)
- Disabled/greyed out when not relevant; enabled when contextually appropriate
- Abort enabled only during execution (`isRunning`)
- New Problem enabled after workflow has started (`hasStarted` and not `isRunning`)
- Solve button in Problem Input card stays as-is (shows "Solving..." when disabled during execution)

### Abort behavior
- Aborting keeps partial results visible (trace events, vocabulary, rules stay on screen)
- Progress bar freezes at current state — shows how far execution got
- Distinct "aborted" visual state — NOT reusing the error/failed state
- Amber/yellow banner (not red) saying "Workflow aborted" or similar — clearly different from an error
- Mascot returns to "idle" state after abort (no new mascot state needed)
- `useChat` `stop()` method used to abort the stream on the client side

### Config disabling during execution
- ALL nav bar controls disabled during execution (Model Mode toggle, Workflow Sliders, Eval Results link)
- Only Abort button and LO-Solver text remain interactive during execution
- Disabled treatment: 50% opacity, no pointer events (standard greyed-out pattern)
- No tooltip needed — just visual dimming

### LO-Solver link behavior
- On the home page (/): LO-Solver text is NOT a link (just plain text)
- On the evals page (/evals): LO-Solver text IS a link back to home
- This is a minor nav bar adjustment bundled with this phase

### Clear vs New Problem (merged)
- Clear and New Problem are the same action — single "New Problem" button
- No separate Clear button needed
- New Problem resets everything: hasSent, hasStarted, messages, mascot state, problem text

### Claude's Discretion
- Technical approach for sharing `isRunning` state between `page.tsx` and `layout.tsx` (React context, etc.)
- Exact button styling (should follow existing `stamp-btn-*` patterns and DESIGN.md)
- Abort animation/transition details
- Whether nav bar detects current route for conditional LO-Solver link behavior

</decisions>

<specifics>
## Specific Ideas

- User described the nav bar as the "floating action bar" — all workflow controls should feel integrated with the existing nav, not bolted on
- Buttons should feel like part of the same design language as existing nav elements

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handleReset` in `page.tsx` (line 333): Already resets hasSent, hasStarted, inputOpen, problemText, messages, mascotState — can be reused for New Problem
- `useChat` from `@ai-sdk/react`: Exposes `stop()` method for aborting streams — direct abort mechanism
- `stamp-btn-secondary` and `stamp-btn-accent` CSS classes: Existing button styling
- `generateWithRetry`/`streamWithRetry` in `agent-utils.ts`: Already support `abortSignal` for cooperative backend cancellation
- `MascotContext` (`src/contexts/mascot-context.tsx`): Existing context pattern for cross-component state — model for `isRunning` state sharing

### Established Patterns
- State via `useState` hooks in `page.tsx`; derived state (`isRunning = status === 'submitted' || status === 'streaming'`)
- `ProblemInput` already accepts `disabled` prop — pattern for disabling during execution
- `frosted` CSS class on nav bar for consistent styling

### Integration Points
- Nav bar in `layout.tsx` (server component) needs `isRunning` + `hasStarted` state from `page.tsx` (client component) — requires a new React context or similar bridge
- `WorkflowSliders` and `ModelModeToggle` components need to accept a `disabled` prop
- Abort button needs to call `stop()` from `useChat` — either via context or callback prop
- New Problem button needs to call `handleReset` from `page.tsx` — same bridging pattern
- LO-Solver link conditional behavior needs route detection (e.g., `usePathname()`)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-add-workflow-control-buttons-abort-new-problem-clear-and-disable-config-controls-during-execution*
*Context gathered: 2026-03-02*
