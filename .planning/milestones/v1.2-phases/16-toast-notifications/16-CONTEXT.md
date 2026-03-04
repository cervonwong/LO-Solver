# Phase 16: Toast Notifications - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Non-blocking toast notifications for workflow lifecycle events (start, complete, abort, error) and cost warnings. Uses Sonner via shadcn, styled to the blueprint/cyanotype design system. No step-level or iteration-level notifications — only major lifecycle boundaries. Toast preferences UI and custom progress toasts are out of scope (OBS-01, OBS-02).

</domain>

<decisions>
## Implementation Decisions

### Toast visual style
- Custom-rendered Sonner toasts matching the blueprint/cyanotype theme (surface-1 bg, white borders, status color accents)
- Toast titles use Architects Daughter font (--font-heading) + uppercase, echoing stamp button aesthetic
- Body text uses Noto Sans (--font-sans)
- Color mapping: start = cyan (--status-active), complete = white (--status-success), abort = white (--foreground), error = red (--destructive), cost warning = gold (--status-warning)
- Include Lex the Duck mascot image in toasts for personality and fun — match the playful duck messaging style from mascot-messages.ts

### Toast content detail
- Each toast shows outcome + one key stat line
- Examples: "SOLVING — Quack-ulating..." / "COMPLETE — 4 rules validated, 12 translations" / "ABORTED — Solve canceled" / "ERROR — Failed at Step 2" / "COST WARNING — $2.00 spent so far"
- Start toast should feel fun/duck-themed, consistent with Lex's personality

### Toast timing & persistence
- All toasts auto-dismiss after 4s (Sonner default)
- All toasts clickable to dismiss early
- No persistent/sticky toasts — even errors and cost warnings auto-dismiss
- Position: bottom-left

### Cost warning behavior
- Hardcoded threshold interval: every $1 spent triggers a toast
- Backend emits a new 'cost-update' trace event type with cumulative spend amount
- Frontend watches for cost-update events and fires gold-accent toast at each $1 boundary
- Toast shows actual dollar amount (e.g., "COST WARNING — $1.00 spent so far", "$2.00 spent so far")

### Notification scope
- Only lifecycle events fire toasts: solve start, solve complete, solve aborted, solve error, cost warning
- No toasts for step transitions (Extract, Hypothesize, Verify, Answer) — progress bar covers this
- No toasts for verify/improve iterations — trace panel covers this
- Toasts can stack naturally (no replacement via stable IDs)
- Maximum visible toasts: Sonner default (3)
- Stable IDs still used per TOAST-07 to prevent React Strict Mode duplication, but same-type toasts from different runs can coexist

### Claude's Discretion
- Exact Lex mascot image size in toasts
- Toast message wording (should be fun/duck-themed for start, informative for outcomes)
- How to extract the "key stat" for completion toasts from workflow data
- Internal architecture for the cost-update event emission

</decisions>

<specifics>
## Specific Ideas

- Toasts should feel fun and personality-driven, matching Lex the Duck's existing speech bubble messages (duck puns, playful tone)
- Include the Lex mascot image in toast notifications — the duck is a core part of the app's identity
- Reference existing mascot-messages.ts patterns for message style (MessageSegment with optional accent spans could be reused or adapted)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/lex-mascot.tsx`: Mascot component with state-dependent images (lex-neutral.png, lex-thinking.png, lex-happy.png, lex-defeated.png) — toast can reference these image paths
- `src/lib/mascot-messages.ts`: MessageSegment type and getRandomMessage() — message style can inform toast copy
- `src/contexts/mascot-context.tsx`: MascotState type (idle, ready, solving, solved, error, aborted) — aligns with toast event types
- `src/hooks/use-solver-workflow.ts`: Exposes status, isAborting, handleStop — toast triggers can hook into status changes
- `src/hooks/use-workflow-progress.ts` and `use-workflow-data.ts`: Track workflow state for progress/data — source for "key stat" in completion toast
- shadcn/ui already configured — `npx shadcn@latest add sonner` will install Sonner with project conventions

### Established Patterns
- Design system: DESIGN.md defines all colors, typography, surfaces, animations — toasts must use CSS variables, not raw values
- Status colors: cyan (active), white (success/completed), red (destructive), gold (warning) — direct mapping to toast types
- Font pattern: Architects Daughter for headings/stamps, Noto Sans for body — toasts follow same split
- Event streaming: workflow steps emit typed events via writer.write() on ToolStream — cost-update event follows this pattern
- WorkflowTraceEvent union in workflow-events.ts — new cost-update event type extends this

### Integration Points
- `src/app/layout.tsx`: `<Toaster />` component goes here (root layout, server component)
- `src/app/page.tsx` / `src/hooks/use-solver-workflow.ts`: Toast trigger logic hooks into workflow status changes
- `src/lib/workflow-events.ts`: New cost-update event type added to WorkflowTraceEvent union
- `src/app/globals.css`: Any custom Sonner CSS overrides for blueprint theme

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-toast-notifications*
*Context gathered: 2026-03-04*
