# Phase 15: File Refactoring - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Split 3 oversized source files into focused, single-responsibility modules with zero behavior changes. Targets: `workflow.ts` (1,448 lines), `trace-event-card.tsx` (898 lines), `page.tsx` (842 lines).

</domain>

<decisions>
## Implementation Decisions

### workflow.ts Split Strategy
- One file per workflow step, 4 files total in `src/mastra/workflow/steps/`
- Numbered prefixes matching agent convention: `01-extract.ts`, `02-hypothesize.ts`, `03-verify-improve.ts`, `04-answer.ts`
- Boilerplate (emit events, call agent, validate, log, bail) stays inline in each step file — no shared step helper abstraction
- `workflow.ts` becomes ~30-line composition file: import step definitions, wire them with `.then()`/`.map()` chain
- No re-export of steps in `src/mastra/workflow/index.ts` — steps are internal to the workflow definition

### trace-event-card.tsx Decomposition
- Domain-grouped split into `src/components/trace/` directory, ~4 files:
  - `trace-event-card.tsx` — main TraceEventCard component (keeps its name)
  - `tool-call-cards.tsx` — ToolCallGroupCard, ToolCallDetail, ToolCallRenderer
  - `specialized-tools.tsx` — VocabularyToolCard, SentenceTestToolCard, BulkToolCallGroup
  - `shared.tsx` — ChevronIcon, RawJsonToggle, StructuredOutputSection
- Utility functions (isRuleTestTool, isSentenceTestTool, hasVocabularyEntries, formatConclusion, jsonMarkdown, buildRenderItems, RenderItem) go in `trace/trace-utils.tsx`
- Delete original `src/components/trace-event-card.tsx` — update all imports to point to `components/trace/` paths directly
- No barrel/index.ts file in trace/

### page.tsx Hook Extraction
- ~4 domain hooks extracted to `src/hooks/`:
  - `useSolverWorkflow` — chat integration, transport, abort handling, send/stop/reset actions
  - `useWorkflowProgress` — progress steps, step status derivation
  - `useWorkflowData` — vocabulary, rules, trace events derived from raw event stream
  - `useExamples` — example fetching
- Panel sections extracted as lightweight sub-components in `src/components/` (alongside existing components)
- `page.tsx` becomes layout orchestration + hook wiring

### Execution Order
- Split workflow.ts first (backend, no frontend dependencies)
- Split trace-event-card.tsx second
- Split page.tsx third (depends on trace imports being stable)
- Each split verified independently with `npx tsc --noEmit`

### Commit Strategy
- One atomic commit per split (3 commits total)
- Each commit must pass type-checking independently

### Claude's Discretion
- Exact hook boundaries — which `useState`/`useMemo`/`useCallback` goes into which hook, based on state dependencies
- Which JSX sections become sub-components vs stay inline in page.tsx
- Whether to merge small utility functions inline or keep them in utility files
- Exact file naming for page.tsx sub-components

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/use-model-mode.ts`: Existing hook in hooks/ — new hooks follow the same pattern and location
- `src/components/ui/`: shadcn primitives already imported by trace components — no changes needed
- `src/lib/trace-utils.ts`: Event grouping logic already separate from rendering — trace/ directory for rendering components complements this

### Established Patterns
- One agent per file, one tool per file convention in `src/mastra/workflow/` — step-per-file follows the same principle
- Kebab-case filenames for components and hooks
- Named exports preferred throughout
- `@/*` path aliases for all src imports

### Integration Points
- `workflow.ts` is imported by `src/mastra/index.ts` — the export (`loSolverWorkflow`) must remain unchanged
- `trace-event-card.tsx` is imported by `src/components/dev-trace-panel.tsx` — imports must be updated
- `page.tsx` is the Next.js page component — default export must remain

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Pure mechanical refactoring with zero behavior changes.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-file-refactoring*
*Context gathered: 2026-03-04*
