# Phase 16: Toast Notifications - Research

**Researched:** 2026-03-04
**Domain:** React toast notifications with custom theming, workflow event streaming
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Custom-rendered Sonner toasts matching the blueprint/cyanotype theme (surface-1 bg, white borders, status color accents)
- Toast titles use Architects Daughter font (--font-heading) + uppercase, echoing stamp button aesthetic
- Body text uses Noto Sans (--font-sans)
- Color mapping: start = cyan (--status-active), complete = white (--status-success), abort = white (--foreground), error = red (--destructive), cost warning = gold (--status-warning)
- Include Lex the Duck mascot image in toasts for personality and fun — match the playful duck messaging style from mascot-messages.ts
- Each toast shows outcome + one key stat line
- Examples: "SOLVING — Quack-ulating..." / "COMPLETE — 4 rules validated, 12 translations" / "ABORTED — Solve canceled" / "ERROR — Failed at Step 2" / "COST WARNING — $2.00 spent so far"
- Start toast should feel fun/duck-themed, consistent with Lex's personality
- All toasts auto-dismiss after 4s (Sonner default)
- All toasts clickable to dismiss early
- No persistent/sticky toasts — even errors and cost warnings auto-dismiss
- Position: bottom-left
- Hardcoded threshold interval: every $1 spent triggers a toast
- Backend emits a new 'cost-update' trace event type with cumulative spend amount
- Frontend watches for cost-update events and fires gold-accent toast at each $1 boundary
- Toast shows actual dollar amount (e.g., "COST WARNING — $1.00 spent so far", "$2.00 spent so far")
- Only lifecycle events fire toasts: solve start, solve complete, solve aborted, solve error, cost warning
- No toasts for step transitions or verify/improve iterations
- Toasts can stack naturally (no replacement via stable IDs)
- Maximum visible toasts: Sonner default (3)
- Stable IDs still used per TOAST-07 to prevent React Strict Mode duplication, but same-type toasts from different runs can coexist

### Claude's Discretion
- Exact Lex mascot image size in toasts
- Toast message wording (should be fun/duck-themed for start, informative for outcomes)
- How to extract the "key stat" for completion toasts from workflow data
- Internal architecture for the cost-update event emission

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOAST-01 | Sonner installed via shadcn; `<Toaster />` added to root layout, styled to blueprint/cyanotype theme | Sonner 2.x + shadcn CLI installation verified; `toast.custom()` headless API enables full theme control; `<Toaster />` goes in layout.tsx |
| TOAST-02 | Toast fires when workflow solve starts | `useSolverWorkflow` hook exposes `handleSolve` — toast fires inside or after solve trigger |
| TOAST-03 | Toast fires when workflow completes successfully with results | `workflowStatus === 'success'` derived in page.tsx; completion data available from `useWorkflowData` |
| TOAST-04 | Toast fires when workflow is aborted by user | `isAborted` state already derived in page.tsx (`hasStarted && !isRunning && !isComplete && !isFailed`) |
| TOAST-05 | Toast fires when workflow encounters an error | `isFailed` state (`workflowStatus === 'failed' \|\| workflowStatus === 'bailed'`) already derived |
| TOAST-06 | Toast fires when cumulative API cost crosses configurable thresholds during a run | New `data-cost-update` event type emitted from backend; OpenRouter returns cost in `providerMetadata.openrouter.usage.cost` per step |
| TOAST-07 | All toasts use stable IDs to prevent duplicates in React Strict Mode | Sonner `id` parameter prevents React Strict Mode double-rendering duplicates |
</phase_requirements>

## Summary

This phase adds non-blocking toast notifications for workflow lifecycle events (start, complete, abort, error) and a cost-warning toast when API spend crosses $1 boundaries. The implementation spans two domains: (1) frontend toast rendering with custom-themed Sonner toasts, and (2) backend cost-tracking event emission.

Sonner via shadcn is the locked choice and is well-suited. The `toast.custom()` headless API provides full control over JSX rendering while preserving Sonner's animation system — this is the recommended approach for the blueprint/cyanotype theme rather than fighting Sonner's default styles with `!important` overrides. The cost-tracking feature requires a new `data-cost-update` event type emitted from workflow steps, leveraging OpenRouter's per-request cost data available through `providerMetadata.openrouter.usage.cost` in the AI SDK response.

**Primary recommendation:** Use `toast.custom()` for all toasts (headless rendering with full theme control), add `<Toaster />` to layout.tsx, create a dedicated `useWorkflowToasts` hook that fires toasts based on state transitions in page.tsx, and add cumulative cost tracking to the `generateWithRetry`/`streamWithRetry` wrappers.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sonner | 2.x (currently 2.0.7) | Toast notification primitives | shadcn's official toast solution; provides animations, positioning, stacking, auto-dismiss, ID deduplication |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/image | (bundled) | Lex mascot image in toasts | Optimized image loading for the duck mascot in toast JSX |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sonner | react-hot-toast | Sonner is the shadcn-blessed toast; already has shadcn integration pattern |
| toast.custom() | toast() with classNames/style overrides | Custom headless gives cleaner code; no !important fights with Sonner defaults |

**Installation:**
```bash
npx shadcn@latest add sonner
```
This installs the `sonner` package and creates `src/components/ui/sonner.tsx` with a pre-configured `<Toaster />` wrapper.

## Architecture Patterns

### Recommended File Structure
```
src/
├── components/
│   └── ui/
│       └── sonner.tsx           # shadcn Toaster wrapper (generated by CLI)
├── hooks/
│   └── use-workflow-toasts.ts   # Toast trigger logic (new)
├── lib/
│   └── workflow-events.ts       # Add CostUpdateEvent to union (modified)
├── mastra/
│   ├── openrouter.ts            # Enable usage accounting (modified)
│   └── workflow/
│       ├── agent-utils.ts       # Accumulate cost, emit cost-update (modified)
│       └── request-context-types.ts  # Add 'cumulative-cost' key (modified)
└── app/
    ├── layout.tsx               # Add <Toaster /> (modified)
    └── page.tsx                 # Wire useWorkflowToasts (modified)
```

### Pattern 1: Headless Custom Toast via toast.custom()
**What:** Render fully custom JSX inside Sonner's animation container, bypassing all default styles.
**When to use:** When the design system requires complete control (blueprint/cyanotype theme).
**Example:**
```typescript
// Source: https://sonner.emilkowal.ski/styling (headless/TailwindCSS section)
import { toast } from 'sonner';

toast.custom((id) => (
  <div className="flex items-center gap-3 border border-border bg-surface-1 p-3 backdrop-blur-sm">
    <img src="/lex-thinking.png" alt="" width={32} height={32} />
    <div>
      <p className="font-heading text-xs uppercase tracking-wider text-status-active">
        SOLVING
      </p>
      <p className="font-sans text-xs text-foreground">
        Quack-ulating...
      </p>
    </div>
  </div>
), { id: 'solve-start', duration: 4000 });
```

### Pattern 2: State-Transition Toast Hook
**What:** A custom hook that watches workflow state and fires toasts on transitions, not on every render.
**When to use:** When toast triggers depend on state changes (idle->running, running->complete, etc.).
**Example:**
```typescript
// Conceptual pattern — fires toast once per transition
function useWorkflowToasts({ hasStarted, isComplete, isFailed, isAborted }: ToastState) {
  const prevRef = useRef({ hasStarted: false, isComplete: false, isFailed: false, isAborted: false });

  useEffect(() => {
    const prev = prevRef.current;

    // Solve started: was not started, now is
    if (hasStarted && !prev.hasStarted) {
      toast.custom((id) => <SolveStartToast id={id} />, { id: 'solve-start' });
    }

    // Completed: was not complete, now is
    if (isComplete && !prev.isComplete) {
      toast.custom((id) => <SolveCompleteToast id={id} />, { id: 'solve-complete' });
    }

    prevRef.current = { hasStarted, isComplete, isFailed, isAborted };
  }, [hasStarted, isComplete, isFailed, isAborted]);
}
```

### Pattern 3: Cost Accumulation in RequestContext
**What:** Track cumulative cost in the workflow's RequestContext and emit events at $1 boundaries.
**When to use:** For the cost-warning toast feature (TOAST-06).
**Example:**
```typescript
// In agent-utils.ts, after agent call completes:
const cost = result.providerMetadata?.openrouter?.usage?.cost ?? 0;
if (cost > 0) {
  const prevCost = (requestContext.get('cumulative-cost') as number) ?? 0;
  const newCost = prevCost + cost;
  requestContext.set('cumulative-cost', newCost);

  // Check if we crossed a $1 boundary
  const prevBucket = Math.floor(prevCost);
  const newBucket = Math.floor(newCost);
  if (newBucket > prevBucket) {
    await emitTraceEvent(stepWriter, {
      type: 'data-cost-update',
      data: { cumulativeCost: newCost, timestamp: new Date().toISOString() },
    });
  }
}
```

### Pattern 4: Stable IDs for React Strict Mode
**What:** Pass an `id` to each toast call so React Strict Mode's double-invoke doesn't create duplicates.
**When to use:** Always — TOAST-07 requirement.
**Example:**
```typescript
// Each lifecycle event gets a deterministic ID
toast.custom((id) => <SolveStartToast id={id} />, { id: 'solve-start' });
toast.custom((id) => <SolveCompleteToast id={id} />, { id: 'solve-complete' });
toast.custom((id) => <SolveErrorToast id={id} />, { id: 'solve-error' });
toast.custom((id) => <SolveAbortedToast id={id} />, { id: 'solve-aborted' });

// Cost warnings use boundary amount as part of ID to allow stacking
toast.custom((id) => <CostWarningToast id={id} amount={2} />, { id: `cost-warning-2` });
```

### Anti-Patterns to Avoid
- **Firing toasts in render (no ref guard):** Causes duplicate toasts on every re-render. Always use `useEffect` with a ref tracking previous state.
- **Using `toast()` with style overrides instead of `toast.custom()`:** Fighting Sonner's default styles with `!important` is fragile and hard to maintain.
- **Importing toast() in server components:** Sonner's `toast()` is client-side only. The `<Toaster />` component can go in layout.tsx (a server component) because it's a client component imported into a server component, but `toast()` calls must be in client code.
- **Accumulating cost on the frontend from token counts:** Inaccurate — model pricing varies. Use OpenRouter's reported cost which accounts for exact pricing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast animations | Custom CSS transitions | Sonner's built-in animation system | Handles stacking, enter/exit, gesture dismiss |
| Toast stacking & positioning | Manual absolute positioning | Sonner's `position` + `visibleToasts` props | Handles overlap, z-index, mobile responsiveness |
| Duplicate prevention | Custom debounce/dedup | Sonner's `id` parameter | Calling `toast()` with same `id` replaces, not duplicates |
| Cost calculation | Token count * price lookup | OpenRouter `providerMetadata.openrouter.usage.cost` | Provider returns exact cost per request |

**Key insight:** Sonner handles the hard parts of toast UX (animation, stacking, gesture dismiss, z-index). The only custom work is the JSX rendering via `toast.custom()` and the state-transition logic for when to fire toasts.

## Common Pitfalls

### Pitfall 1: React Strict Mode Double Toasts
**What goes wrong:** In development, React Strict Mode double-invokes effects. Without stable IDs, every toast fires twice.
**Why it happens:** `useEffect` runs twice in React 18+ strict mode. If the effect fires `toast()` without an `id`, two toasts appear.
**How to avoid:** Always pass `id` to toast calls. Sonner replaces existing toasts with the same ID.
**Warning signs:** Toasts appearing in pairs during development.

### Pitfall 2: Toasts Firing on Every Re-render
**What goes wrong:** A `useEffect` without proper dependencies fires toasts repeatedly as the component re-renders.
**Why it happens:** State variables like `isComplete` remain `true` across many renders. Without ref-guarding the transition, the toast fires on each.
**How to avoid:** Track previous state with `useRef` and only fire on the transition (was false, now true).
**Warning signs:** Multiple "COMPLETE" toasts for a single solve, or toasts re-firing when unrelated state changes.

### Pitfall 3: Cost Data Not Available in Streaming
**What goes wrong:** Cost data returns `undefined` because streaming responses don't include usage by default.
**Why it happens:** OpenRouter only includes usage/cost in streaming responses when `include_usage: true` is set via `stream_options`. The `@openrouter/ai-sdk-provider` maps this from `settings.usage.include`.
**How to avoid:** Either (a) enable `usage: { include: true }` in the OpenRouter provider settings, or (b) extract cost from the `FullOutput` which collects usage from the final SSE message after streaming completes.
**Warning signs:** `providerMetadata?.openrouter?.usage?.cost` is always `undefined` for streaming calls.

### Pitfall 4: Font Inheritance in Toast Custom JSX
**What goes wrong:** Custom toast JSX doesn't pick up the Architects Daughter / Noto Sans fonts.
**Why it happens:** Sonner renders toasts in a portal outside the normal React tree. CSS variable fonts defined on `<html>` or `<body>` propagate through the portal because Sonner attaches to the document body, but Tailwind's `font-heading` / `font-sans` classes require the CSS variables to be set.
**How to avoid:** Use `font-heading` and `font-sans` Tailwind classes directly on toast elements. The CSS variables `--font-heading` and `--font-sans` are set on the `<html>` element in layout.tsx, so they propagate to portal elements.
**Warning signs:** Toast text renders in default system font instead of the design system fonts.

### Pitfall 5: Toaster Placement in Server vs Client Components
**What goes wrong:** `<Toaster />` import fails or doesn't render.
**Why it happens:** layout.tsx is a server component. The shadcn `<Toaster />` is a client component (marked `'use client'`), which is fine to import into a server component — Next.js handles this correctly. But the current layout.tsx uses `<LayoutShell>` (a client component) as its wrapper.
**How to avoid:** Place `<Toaster />` inside `LayoutShell` (which is already a client component) rather than directly in layout.tsx. This keeps it in the client component tree and avoids any ambiguity.
**Warning signs:** Toaster not rendering or hydration warnings.

## Code Examples

### shadcn Sonner Installation Output
```bash
npx shadcn@latest add sonner
# Creates: src/components/ui/sonner.tsx
# Installs: sonner package
```

The generated `sonner.tsx` is a thin wrapper:
```typescript
// Source: shadcn CLI output (typical)
'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return <Sonner className="toaster group" {...props} />;
};

export { Toaster };
```

### Toaster Configuration for Blueprint Theme
```typescript
// In src/components/layout-shell.tsx or wherever <Toaster /> is placed
<Toaster
  position="bottom-left"
  // visibleToasts defaults to 3, which matches the requirement
  // duration defaults to 4000ms, which matches the requirement
  // theme is not needed — we use toast.custom() for full control
/>
```

### Complete Custom Toast Component
```typescript
// In src/hooks/use-workflow-toasts.ts or a shared toast component file
import Image from 'next/image';
import { toast } from 'sonner';

interface WorkflowToastProps {
  id: string | number;
  title: string;
  message: string;
  accentColor: string; // CSS variable name like 'status-active'
  mascotImage: string; // e.g., '/lex-thinking.png'
}

function WorkflowToast({ id, title, message, accentColor, mascotImage }: WorkflowToastProps) {
  return (
    <div
      className="flex items-center gap-3 border border-border bg-surface-1 p-3 backdrop-blur-sm cursor-pointer"
      onClick={() => toast.dismiss(id)}
    >
      <Image src={mascotImage} alt="" width={32} height={32} className="shrink-0" />
      <div className="min-w-0">
        <p className={`font-heading text-xs uppercase tracking-wider text-${accentColor}`}>
          {title}
        </p>
        <p className="font-sans text-xs text-foreground truncate">
          {message}
        </p>
      </div>
    </div>
  );
}
```

### Cost Update Event Type
```typescript
// Addition to src/lib/workflow-events.ts
export interface CostUpdateEvent {
  type: 'data-cost-update';
  data: {
    cumulativeCost: number; // Total cost in dollars so far
    timestamp: string;
  };
}

// Add to WorkflowTraceEvent union:
// | CostUpdateEvent
```

### Enable OpenRouter Usage Accounting
```typescript
// In src/mastra/openrouter.ts — add usage accounting to provider settings
const openrouterBase = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  usage: { include: true }, // Enable cost reporting in responses
});
```

### Extracting Cost from Agent Response
```typescript
// After streamWithRetry or generateWithRetry returns:
const result = await streamWithRetry(agent, { ... });

// For multi-step agents, sum cost across all steps
const totalCost = result.steps?.reduce((sum, step) => {
  const stepCost = (step.providerMetadata as any)?.openrouter?.usage?.cost ?? 0;
  return sum + stepCost;
}, 0) ?? 0;

// Or from the last step's providerMetadata (single-step agents):
const cost = (result.providerMetadata as any)?.openrouter?.usage?.cost ?? 0;
```

### Key Stat Extraction for Completion Toast
```typescript
// From useWorkflowData: finalRules and answerStepOutput are available
// answerStepOutput contains the translations, finalRules has validated rules
const ruleCount = finalRules?.length ?? 0;
const translationCount = (answerStepOutput?.translations as unknown[])?.length ?? 0;
const message = `${ruleCount} rules validated, ${translationCount} translations`;
```

## Existing Code Integration Points

### Where Cost Tracking Hooks In

The `streamWithRetry` and `generateWithRetry` functions in `agent-utils.ts` are the universal wrappers for all LLM calls. They return `FullOutput` (for streaming) or the generate result, both of which expose `providerMetadata` with OpenRouter's cost data. The cost accumulation should happen at this layer.

**However**, `agent-utils.ts` does not currently receive `requestContext` or `stepWriter`. The callers (workflow step files) do. Two approaches:

1. **Option A: Accumulate in step files.** Each step already has access to `requestContext` and `writer`. After each `streamWithRetry`/`generateWithRetry` call, extract cost and accumulate. Emit `data-cost-update` when threshold crossed.
2. **Option B: Pass requestContext/writer to agent-utils.** Add optional params to `streamWithRetry`/`generateWithRetry` for cost tracking. Centralizes logic but changes the function signature.

**Recommendation:** Option A (accumulate in step files). The cost extraction is 5-6 lines of code per agent call, and the step files already handle all the event emission. A helper function `trackCost(requestContext, writer, result)` in `request-context-helpers.ts` can minimize repetition.

### Where Toast Triggers Hook In

The `page.tsx` SolverPageInner component already derives:
- `hasStarted` — from `useSolverWorkflow`
- `isComplete` — `workflowStatus === 'success'`
- `isFailed` — `workflowStatus === 'failed' || workflowStatus === 'bailed'`
- `isAborted` — `hasStarted && !isRunning && !isComplete && !isFailed`
- `isRunning` — from `useSolverWorkflow`

A `useWorkflowToasts` hook receives these boolean flags plus `allParts` (for cost events) and `finalRules`/`answerStepOutput` (for completion stats). It uses `useRef` to track previous state and fires toasts on transitions.

### Mascot Images Available
- `/lex-neutral.png` — idle/aborted states
- `/lex-thinking.png` — solving/start
- `/lex-happy.png` — complete
- `/lex-defeated.png` — error

These map directly to toast types:
- Start toast: `/lex-thinking.png`
- Complete toast: `/lex-happy.png`
- Abort toast: `/lex-neutral.png`
- Error toast: `/lex-defeated.png`
- Cost warning: `/lex-neutral.png` (or `/lex-thinking.png` since it's mid-solve)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-toastify` or `react-hot-toast` | Sonner (via shadcn) | shadcn adopted Sonner in 2024 | shadcn's blessed toast solution; `npx shadcn add sonner` |
| `toast()` with style overrides | `toast.custom()` headless mode | Sonner 1.x+ | Full JSX control without fighting default styles |
| Manual cost calculation from token counts | Provider-reported cost via `providerMetadata` | OpenRouter AI SDK provider 2.x | Accurate cost including cached tokens, reasoning tokens |

**Deprecated/outdated:**
- shadcn's old `@/components/ui/toast` (based on Radix Toast) is superseded by the Sonner integration. The project doesn't have the old toast component installed, so no migration needed.

## Open Questions

1. **Multi-step agent cost aggregation accuracy**
   - What we know: `FullOutput.steps[]` contains per-step `providerMetadata` with cost. `FullOutput.providerMetadata` contains only the last step's metadata.
   - What's unclear: Whether summing `steps[].providerMetadata.openrouter.usage.cost` gives the total cost or whether some steps report cumulative cost.
   - Recommendation: Sum per-step costs. Verify empirically with a single run by comparing sum vs OpenRouter dashboard.

2. **Usage accounting for streaming calls**
   - What we know: OpenRouter requires `stream_options: { include_usage: true }` for cost in streaming. The `@openrouter/ai-sdk-provider` supports `usage: { include: true }` in settings. `streamWithRetry` calls `getFullOutput()` which resolves after stream completes.
   - What's unclear: Whether `getFullOutput().steps[].providerMetadata` includes cost for streaming calls without the `usage.include` flag, since the FullOutput aggregates from the stream.
   - Recommendation: Enable `usage: { include: true }` on the OpenRouter provider to guarantee cost data availability. Test with a single streaming call.

## Sources

### Primary (HIGH confidence)
- `node_modules/@openrouter/ai-sdk-provider/dist/index.d.mts` — OpenRouterUsageAccounting type with `cost` field, provider settings with `usage.include`
- `node_modules/@mastra/core/dist/stream/base/output.d.ts` — FullOutput type with `steps`, `providerMetadata`, `usage`
- `node_modules/@mastra/core/dist/stream/types.d.ts` — LLMStepResult type with per-step `providerMetadata`
- Sonner official docs (https://sonner.emilkowal.ski/toast) — toast() API with `id`, `duration`, `className`, `toast.custom()`
- Sonner official docs (https://sonner.emilkowal.ski/styling) — headless/TailwindCSS approach with full code example
- Sonner official docs (https://sonner.emilkowal.ski/toaster) — Toaster props including `position`, `visibleToasts`, `theme`
- shadcn/ui Sonner docs (https://ui.shadcn.com/docs/components/radix/sonner) — installation and layout integration
- OpenRouter usage accounting docs (https://openrouter.ai/docs/guides/guides/usage-accounting) — cost in response, streaming usage

### Secondary (MEDIUM confidence)
- Codebase analysis of existing event streaming pattern in workflow steps (verified against running code)
- Codebase analysis of state derivation in page.tsx and hooks (verified against running code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Sonner via shadcn is well-documented and the project already uses shadcn
- Architecture: HIGH — Patterns verified against existing codebase; toast.custom() API confirmed via official docs
- Pitfalls: HIGH — React Strict Mode double-fire is a well-known issue with documented solution (stable IDs)
- Cost tracking: MEDIUM — OpenRouter cost reporting verified in provider types, but streaming cost availability needs empirical validation

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable libraries, no breaking changes expected)
