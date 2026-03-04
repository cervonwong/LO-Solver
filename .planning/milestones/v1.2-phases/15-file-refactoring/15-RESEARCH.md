# Phase 15: File Refactoring - Research

**Researched:** 2026-03-04
**Domain:** TypeScript module decomposition (pure refactoring, zero behavior changes)
**Confidence:** HIGH

## Summary

Phase 15 is a mechanical code-splitting exercise targeting three oversized files: `workflow.ts` (1,448 lines), `trace-event-card.tsx` (898 lines), and `page.tsx` (842 lines). No new libraries are needed. The work involves extracting step definitions, UI components, and React hooks into focused modules, then updating import paths. The primary risk is broken imports and type mismatches, which are caught instantly by `npx tsc --noEmit`.

Because this is pure refactoring with no behavior changes and no new dependencies, the research scope is narrow: understanding current file structures, internal dependencies, export/import contracts, and the mechanical patterns for splitting.

**Primary recommendation:** Split each file in the order specified (workflow.ts -> trace-event-card.tsx -> page.tsx), verify with `npx tsc --noEmit` after each split, and commit atomically per split.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- One file per workflow step, 4 files total in `src/mastra/workflow/steps/`
- Numbered prefixes matching agent convention: `01-extract.ts`, `02-hypothesize.ts`, `03-verify-improve.ts`, `04-answer.ts`
- Boilerplate (emit events, call agent, validate, log, bail) stays inline in each step file — no shared step helper abstraction
- `workflow.ts` becomes ~30-line composition file: import step definitions, wire them with `.then()`/`.map()` chain
- No re-export of steps in `src/mastra/workflow/index.ts` — steps are internal to the workflow definition
- Domain-grouped split into `src/components/trace/` directory, ~4 files:
  - `trace-event-card.tsx` — main TraceEventCard component (keeps its name)
  - `tool-call-cards.tsx` — ToolCallGroupCard, ToolCallDetail, ToolCallRenderer
  - `specialized-tools.tsx` — VocabularyToolCard, SentenceTestToolCard, BulkToolCallGroup
  - `shared.tsx` — ChevronIcon, RawJsonToggle, StructuredOutputSection
- Utility functions (isRuleTestTool, isSentenceTestTool, hasVocabularyEntries, formatConclusion, jsonMarkdown, buildRenderItems, RenderItem) go in `trace/trace-utils.tsx`
- Delete original `src/components/trace-event-card.tsx` — update all imports to point to `components/trace/` paths directly
- No barrel/index.ts file in trace/
- ~4 domain hooks extracted to `src/hooks/`:
  - `useSolverWorkflow` — chat integration, transport, abort handling, send/stop/reset actions
  - `useWorkflowProgress` — progress steps, step status derivation
  - `useWorkflowData` — vocabulary, rules, trace events derived from raw event stream
  - `useExamples` — example fetching
- Panel sections extracted as lightweight sub-components in `src/components/` (alongside existing components)
- `page.tsx` becomes layout orchestration + hook wiring
- Split workflow.ts first (backend, no frontend dependencies)
- Split trace-event-card.tsx second
- Split page.tsx third (depends on trace imports being stable)
- Each split verified independently with `npx tsc --noEmit`
- One atomic commit per split (3 commits total)
- Each commit must pass type-checking independently

### Claude's Discretion
- Exact hook boundaries — which `useState`/`useMemo`/`useCallback` goes into which hook, based on state dependencies
- Which JSX sections become sub-components vs stay inline in page.tsx
- Whether to merge small utility functions inline or keep them in utility files
- Exact file naming for page.tsx sub-components

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REFAC-01 | `workflow.ts` step definitions extracted to individual `steps/*.ts` files; composition chain remains in `workflow.ts` | Step boundary analysis complete: 3 steps identified at lines 48, 180, 1297 with composition chain at line 1435. Each step is self-contained with its own imports. |
| REFAC-02 | `trace-event-card.tsx` sub-components extracted to focused files under `components/trace/` | Component inventory complete: 14 components + 7 utility functions mapped to 5 target files. Single consumer (`dev-trace-panel.tsx`) identified. |
| REFAC-03 | `page.tsx` hooks and logic extracted to dedicated hook files and sub-components | State dependency graph analyzed: 4 hook domains identified with clear boundaries. Existing hook pattern in `src/hooks/` established. |
| REFAC-04 | All refactored modules pass `npx tsc --noEmit` with no new errors | TypeScript config analyzed: `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess` are strict flags that affect export/import patterns. Known pre-existing error: `layout.tsx` CSS module. |
</phase_requirements>

## Standard Stack

### Core
No new libraries needed. This phase uses only existing project tooling.

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| TypeScript | (project version) | Type-checking after each split | `npx tsc --noEmit` is the verification gate |
| `createStep` / `createWorkflow` | `@mastra/core` | Step definitions export as standalone objects | Confirmed: `createStep` returns a `Step` object that can be imported independently |

### Supporting
None needed.

### Alternatives Considered
None — no new libraries or approaches are relevant for pure refactoring.

**Installation:**
```bash
# No installation needed
```

## Architecture Patterns

### Recommended Project Structure

After refactoring:

```
src/
├── mastra/workflow/
│   ├── steps/                          # NEW: step definitions
│   │   ├── 01-extract.ts              # extractionStep (lines 48-176)
│   │   ├── 02-hypothesize.ts          # multiPerspectiveHypothesisStep (lines 180-1294)
│   │   └── 03-answer.ts              # answerQuestionsStep (lines 1297-1433)
│   ├── workflow.ts                     # ~30 lines: imports + composition chain
│   ├── workflow-schemas.ts             # unchanged
│   ├── index.ts                        # unchanged (no step re-exports)
│   └── ...agents, tools, utils...      # unchanged
├── components/
│   ├── trace/                          # NEW: trace components
│   │   ├── trace-event-card.tsx       # TraceEventCard (main switch)
│   │   ├── tool-call-cards.tsx        # ToolCallGroupCard, ToolCallDetail, ToolCallRenderer
│   │   ├── specialized-tools.tsx      # VocabularyToolCard, SentenceTestToolCard, BulkToolCallGroup
│   │   ├── shared.tsx                 # ChevronIcon, RawJsonToggle, StructuredOutputSection
│   │   └── trace-utils.tsx            # isRuleTestTool, isSentenceTestTool, hasVocabularyEntries, etc.
│   ├── dev-trace-panel.tsx             # updated imports
│   └── ...other components...          # unchanged
├── hooks/
│   ├── use-solver-workflow.ts          # NEW: chat/transport/abort/send/stop/reset
│   ├── use-workflow-progress.ts        # NEW: progress steps, step status
│   ├── use-workflow-data.ts            # NEW: vocabulary, rules, trace events
│   ├── use-examples.ts                # NEW: example fetching
│   ├── use-model-mode.ts              # unchanged
│   ├── use-workflow-settings.ts        # unchanged
│   └── ...
├── app/
│   └── page.tsx                        # ~200-250 lines: layout + hook wiring
└── ...
```

### Pattern 1: Step Definition Export

**What:** Each step file exports a named `const` created with `createStep()`. The composition file imports and chains them.

**When to use:** Splitting `workflow.ts` step definitions.

**Example:**
```typescript
// steps/01-extract.ts
import { createStep } from '@mastra/core/workflows';
import { rawProblemInputSchema, structuredProblemSchema, workflowStateSchema } from '../workflow-schemas';
// ... other imports ...

export const extractionStep = createStep({
  id: 'extract-structure',
  description: 'Step 1: Extract structured problem data from raw text input.',
  inputSchema: rawProblemInputSchema,
  outputSchema: structuredProblemSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer, abortSignal }) => {
    // ... full step body ...
  },
});

// workflow.ts (composition only)
import { createWorkflow } from '@mastra/core/workflows';
import { extractionStep } from './steps/01-extract';
import { multiPerspectiveHypothesisStep } from './steps/02-hypothesize';
import { answerQuestionsStep } from './steps/03-answer';
import { rawProblemInputSchema, questionsAnsweredSchema, workflowStateSchema } from './workflow-schemas';

export const solverWorkflow = createWorkflow({
  id: 'solver-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
})
  .then(extractionStep)
  .map(async ({ inputData }) => inputData.data!)
  .then(multiPerspectiveHypothesisStep)
  .then(answerQuestionsStep)
  .commit();
```

### Pattern 2: Component Decomposition with Cross-File Dependencies

**What:** Components split into separate files, sharing types and utility functions via a local utility file.

**When to use:** Splitting `trace-event-card.tsx` into the `trace/` directory.

**Example:**
```typescript
// components/trace/shared.tsx
'use client';
import { useState } from 'react';
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';

export const TRACE_SD_CLASS = 'text-[11px] leading-4 streamdown-compact';

export function ChevronIcon({ open }: { open: boolean }) { /* ... */ }
export function RawJsonToggle({ data, children }: { /* ... */ }) { /* ... */ }
export function StructuredOutputSection({ data }: { data: Record<string, unknown> }) { /* ... */ }

// components/trace/trace-utils.tsx
import type { ToolCallEvent } from '@/lib/workflow-events';
import type { AgentGroup } from '@/lib/trace-utils';

export type RenderItemType = /* ... */;
export function isRuleTestTool(toolName: string): boolean { /* ... */ }
export function isSentenceTestTool(toolName: string): boolean { /* ... */ }
export function hasVocabularyEntries(toolCall: ToolCallEvent): boolean { /* ... */ }
export function isStartedStatus(result: Record<string, unknown>): boolean { /* ... */ }
export function formatConclusion(conclusion: string): string { /* ... */ }
export const jsonMarkdown = (label: string, data: unknown) => /* ... */;
export function buildRenderItems(children: Array<AgentGroup | ToolCallEvent>): RenderItemType[] { /* ... */ }

// components/trace/tool-call-cards.tsx
'use client';
import { ChevronIcon, RawJsonToggle, TRACE_SD_CLASS } from './shared';
import { isRuleTestTool, isSentenceTestTool, hasVocabularyEntries, isStartedStatus } from './trace-utils';
// ... component definitions ...
export function ToolCallGroupCard({ group }: ToolCallGroupCardProps) { /* ... */ }
export function ToolCallRenderer({ toolCall, depth }: { /* ... */ }) { /* ... */ }
```

### Pattern 3: Hook Extraction from Page Components

**What:** State logic extracted to custom hooks that return values and callbacks consumed by the page component.

**When to use:** Splitting `page.tsx` hook logic.

**Example:**
```typescript
// hooks/use-solver-workflow.ts
'use client';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useModelMode } from './use-model-mode';
import { useWorkflowSettings } from './use-workflow-settings';

export function useSolverWorkflow() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const hasSent = useRef(false);
  const [modelMode] = useModelMode();
  const [workflowSettings] = useWorkflowSettings();

  const transport = useMemo(() => /* ... */, [modelMode, workflowSettings]);
  const { messages, sendMessage, status, setMessages, stop } = useChat({ transport });

  const handleSolve = useCallback(/* ... */);
  const handleStop = useCallback(/* ... */);
  const handleReset = useCallback(/* ... */);

  // ... isComplete, isRunning, isAborted derivations ...

  return {
    messages, sendMessage, status, hasStarted, isAborting,
    isComplete, isRunning, isAborted, isFailed,
    handleSolve, handleStop, handleReset,
    setMessages,
  };
}
```

### Anti-Patterns to Avoid
- **Circular imports between step files:** Each step should only import from `workflow-schemas.ts`, utility modules, and `@mastra/core`. Steps must not import from each other.
- **Barrel re-exports for internal modules:** The `trace/` directory and `steps/` directory have no `index.ts`. Consumers import directly from the specific file.
- **Splitting too aggressively:** Small utility functions (e.g., `formatConclusion`) can live in the utility file even if only used by one component. Moving them to the consuming file adds no clarity.
- **Changing any runtime behavior:** No logic changes, no renamed exports consumed externally, no restructured data flow. The only changes are file locations and import paths.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| N/A | N/A | N/A | Pure refactoring — no new functionality |

**Key insight:** This phase intentionally adds zero new functionality. Any temptation to "improve" code during the split is scope creep.

## Common Pitfalls

### Pitfall 1: Breaking the External API Contract
**What goes wrong:** Renaming or removing exports that other files depend on.
**Why it happens:** Forgetting to check all import sites before moving code.
**How to avoid:**
- `workflow.ts` external contract: `solverWorkflow` imported by `src/mastra/index.ts`. This export MUST remain in `workflow.ts`.
- `trace-event-card.tsx` external contract: `TraceEventCard`, `ToolCallGroupCard`, `AgentCard` imported by `dev-trace-panel.tsx`. These exports must exist in their new locations, and `dev-trace-panel.tsx` imports must be updated.
- `page.tsx` external contract: `default export SolverPage`. This must remain as the default export.
**Warning signs:** `npx tsc --noEmit` reports "cannot find module" or "has no exported member" errors.

### Pitfall 2: Missing `'use client'` Directives
**What goes wrong:** New component files in `trace/` or new hook files fail at runtime because they use React hooks without the `'use client'` directive.
**Why it happens:** The directive was on the parent file but not propagated to split-out files.
**How to avoid:** Every `.tsx` file containing React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, etc.) and every `.ts` hook file must have `'use client'` as the first line.
**Warning signs:** Runtime error "useState is not a function" or "Hooks can only be called inside of the body of a function component."

### Pitfall 3: `verbatimModuleSyntax` Type Import Violations
**What goes wrong:** TypeScript errors when importing types without the `type` keyword.
**Why it happens:** The project uses `verbatimModuleSyntax: true` in tsconfig, which requires `import type` for type-only imports.
**How to avoid:** When a step file imports types from `workflow-schemas.ts` or `request-context-types.ts`, use `import type { ... }` for type-only imports. Mixed imports need `import { type Foo, bar }` syntax.
**Warning signs:** TS error "This import is a type-only import but is not declared as type-only."

### Pitfall 4: `exactOptionalPropertyTypes` Conditional Spread Issues
**What goes wrong:** Conditional spreads like `...(value ? { key: value } : {})` can fail type checking.
**Why it happens:** The project uses `exactOptionalPropertyTypes: true`. An empty object `{}` may not satisfy optional property types.
**How to avoid:** Use the existing pattern already in the codebase: conditional spread with explicit property presence.
**Warning signs:** TS error about exact optional property types.

### Pitfall 5: Forgetting to Delete the Original File
**What goes wrong:** Both old and new files exist, causing confusion about which is canonical.
**Why it happens:** After splitting, the original `src/components/trace-event-card.tsx` is left on disk.
**How to avoid:** Explicitly delete the original file after verifying all imports point to the new `components/trace/` paths. For `workflow.ts` and `page.tsx`, the originals remain (now smaller) rather than being deleted.
**Warning signs:** `git status` shows the original file is still present.

### Pitfall 6: Incorrect Import Paths for Step Files
**What goes wrong:** Step files use `@/lib/workflow-events` and other `@/*` imports which work from `src/mastra/workflow/` but the new `steps/` subdirectory adds one more nesting level.
**Why it happens:** Relative imports from the steps directory to sibling files need adjustment.
**How to avoid:** Since steps are in `src/mastra/workflow/steps/`, imports to workflow utilities use `../` prefix (e.g., `import { emitTraceEvent } from '../request-context-helpers'`). Absolute `@/*` imports (e.g., `@/lib/workflow-events`) work regardless of file location.
**Warning signs:** Module not found errors during type-checking.

### Pitfall 7: State Dependency Graph Broken by Hook Extraction
**What goes wrong:** Hooks depend on each other's return values, creating circular dependency or incorrect render order.
**Why it happens:** `page.tsx` state is interconnected — e.g., `useWorkflowData` needs `messages` from `useChat`, while `useWorkflowProgress` needs `allParts` which comes from processing messages.
**How to avoid:** Design hook interfaces so that raw inputs flow downward:
1. `useSolverWorkflow` returns `messages`, `status`, control functions
2. `useWorkflowProgress` takes `allParts` and `steps` as parameters (derived from messages)
3. `useWorkflowData` takes `allParts` as parameter
4. Hooks do NOT call each other — the page component wires them together
**Warning signs:** Hooks importing from each other, or the page needing intermediate variables that leak hook internals.

## Code Examples

### workflow.ts Step Boundaries (exact line ranges)

```
extractionStep:                 lines 48-176   (~128 lines)
multiPerspectiveHypothesisStep: lines 180-1294 (~1114 lines)
answerQuestionsStep:            lines 1297-1433 (~136 lines)
composition chain:              lines 1435-1448 (~13 lines)
imports:                        lines 1-46     (~46 lines)
```

The `multiPerspectiveHypothesisStep` is by far the largest (1,114 lines). Per the user's decision, this maps to `02-hypothesize.ts`. The step numbers in filenames are:
- `01-extract.ts` = extractionStep
- `02-hypothesize.ts` = multiPerspectiveHypothesisStep
- `03-answer.ts` = answerQuestionsStep

Note: The user's CONTEXT.md mentions "4 files total" with `03-verify-improve.ts`, but the code has only 3 steps. The verify-improve logic is entirely within `multiPerspectiveHypothesisStep`. The planner should follow the actual code structure (3 step files), not the 4-file mention.

### trace-event-card.tsx Component Inventory

```
Exported components:
  TraceEventCard         (line 40)   → trace/trace-event-card.tsx
  ToolCallGroupCard      (line 186)  → trace/tool-call-cards.tsx
  AgentCard              (line 672)  → trace/tool-call-cards.tsx

Internal components:
  ChevronIcon            (line 15)   → trace/shared.tsx
  RawJsonToggle          (line 248)  → trace/shared.tsx
  StructuredOutputSection (line 287) → trace/shared.tsx
  VocabularyToolCard     (line 316)  → trace/specialized-tools.tsx
  SentenceTestToolCard   (line 423)  → trace/specialized-tools.tsx
  BulkToolCallGroup      (line 478)  → trace/specialized-tools.tsx
  ToolCallDetail         (line 217)  → trace/tool-call-cards.tsx
  ToolCallRenderer       (line 553)  → trace/tool-call-cards.tsx
  RenderItem             (line 639)  → trace/tool-call-cards.tsx
  RuleTestCard           (line 826)  → trace/specialized-tools.tsx
  AgentToolCallCard      (line 863)  → trace/tool-call-cards.tsx

Utility functions/constants:
  jsonMarkdown           (line 30)   → trace/trace-utils.tsx
  TRACE_SD_CLASS         (line 34)   → trace/shared.tsx (constant)
  formatConclusion       (line 169)  → trace/trace-utils.tsx
  isRuleTestTool         (line 533)  → trace/trace-utils.tsx
  isSentenceTestTool     (line 537)  → trace/trace-utils.tsx
  hasVocabularyEntries   (line 541)  → trace/trace-utils.tsx
  isStartedStatus        (line 549)  → trace/trace-utils.tsx
  RenderItemType         (line 583)  → trace/trace-utils.tsx (type)
  buildRenderItems       (line 588)  → trace/trace-utils.tsx
  DEPTH_INDENT           (line 656)  → trace/tool-call-cards.tsx (local constant)
  getIndentClass         (line 663)  → trace/tool-call-cards.tsx (local function)
```

### Consumer update required:
```typescript
// dev-trace-panel.tsx — BEFORE:
import { TraceEventCard, ToolCallGroupCard, AgentCard } from '@/components/trace-event-card';

// dev-trace-panel.tsx — AFTER:
import { TraceEventCard } from '@/components/trace/trace-event-card';
import { ToolCallGroupCard } from '@/components/trace/tool-call-cards';
import { AgentCard } from '@/components/trace/tool-call-cards';
```

### page.tsx Hook Domain Analysis

**useSolverWorkflow** — Chat lifecycle and abort handling:
```
State: hasStarted, isAborting, hasSent (ref), problemText, inputOpen
Deps: useModelMode, useWorkflowSettings, useChat, DefaultChatTransport
Returns: messages, status, hasStarted, isAborting, isComplete, isRunning, isFailed, isAborted
         handleSolve, handleStop, handleReset, setMessages, setMascotState
         problemText, setProblemText, inputOpen, setInputOpen
```

**useWorkflowProgress** — Progress bar step list:
```
Input: allParts (from messages), steps (from workflowData)
State: none (pure useMemo derivation)
Returns: progressSteps, displaySteps, statusMessage, activeStep
```

**useWorkflowData** — Vocabulary, rules, trace events derived from event stream:
```
Input: allParts (from messages)
State: none (pure useMemo derivations)
Returns: vocabulary, rules, rulesWithTestStatus, vocabActivityEvents, rulesActivityEvents, traceEvents
```

**useExamples** — Example problem fetching:
```
State: examples (array)
Returns: examples
```

**Remaining in page.tsx** — Layout orchestration:
```
- MascotProvider / useMascotSync
- useRegisterWorkflowControl
- useGroupRef, useMediaQuery
- hasAnimated (ref), isTransitioning
- auto-scroll effect, handleRuleClick, handleStepClick
- All JSX layout (ResizablePanelGroup, panels, sections)
```

### Dependency flow between hooks in page.tsx:
```
useExamples (independent)
useSolverWorkflow → messages, status, control functions
  ↓ messages
derive allParts, workflowData, steps
  ↓ allParts, steps
useWorkflowProgress(allParts, steps) → progressSteps
useWorkflowData(allParts) → vocabulary, rules, traceEvents
```

This confirms hooks do NOT need to call each other. The page component derives `allParts` and `steps` from `messages` and passes them down.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | N/A | N/A | Pure refactoring — no paradigm shifts |

## Open Questions

1. **Step count discrepancy: 3 vs 4 files**
   - What we know: CONTEXT.md says "4 files total" with `03-verify-improve.ts`, but the actual code has 3 `createStep` calls. The verify-improve logic is part of `multiPerspectiveHypothesisStep`.
   - What's unclear: Whether the user intended to further split the 1,114-line `multiPerspectiveHypothesisStep` into two files.
   - Recommendation: Follow the actual code structure with 3 step files. The step definition is atomic (one `createStep` call with one `execute` function) — splitting one step's execute body across files would require a helper abstraction, which the user explicitly declined. If the planner sees this as a conflict with the "4 files" mention, clarify with the user.

2. **Exact hook boundary for `useSolverWorkflow`**
   - What we know: The hook needs to encompass `useChat`, transport, abort state, and control functions. But `setMascotState` from `useMascotSync` is used inside `handleReset`.
   - What's unclear: Whether `useMascotSync` should live inside `useSolverWorkflow` or remain in page.tsx with `setMascotState` passed as a parameter to the hook.
   - Recommendation: Keep `useMascotSync` in page.tsx. Pass `setMascotState` to `handleReset` via closure in page.tsx, or have `useSolverWorkflow` accept a `resetCallback` option. This keeps mascot concerns separate from workflow lifecycle.

3. **Sub-component extraction from page.tsx**
   - What we know: The JSX in page.tsx has distinct panel sections (input panel, progress panel, results panel, trace panel layout). Some already delegate to existing components (ProblemInput, StepProgress, ResultsPanel, DevTracePanel).
   - What's unclear: Whether inline JSX sections (like the progress BlueprintCard wrapper or the error/aborted status messages) should become sub-components.
   - Recommendation: Leave these inline — they are ~20-30 lines of JSX each and extracting them would just add more files with minimal clarity gain. The main size reduction comes from hook extraction, not JSX splitting. This is at Claude's discretion per CONTEXT.md.

## Sources

### Primary (HIGH confidence)
- Direct code analysis of `workflow.ts` (1,448 lines), `trace-event-card.tsx` (898 lines), `page.tsx` (842 lines)
- `tsconfig.json` — strict TypeScript settings confirmed: `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- `@mastra/core` type definitions — `createStep` returns an importable `Step` object
- `dev-trace-panel.tsx` — sole consumer of `trace-event-card.tsx` exports
- `src/mastra/index.ts` — sole consumer of `solverWorkflow` from `workflow.ts`
- Existing hook pattern from `src/hooks/use-model-mode.ts` and `use-workflow-settings.ts`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, pure refactoring using existing tools
- Architecture: HIGH - file structure and split boundaries are fully determined by code analysis
- Pitfalls: HIGH - all pitfalls derive from direct code analysis and TypeScript config inspection

**Research date:** 2026-03-04
**Valid until:** indefinite (pure refactoring research does not age)
