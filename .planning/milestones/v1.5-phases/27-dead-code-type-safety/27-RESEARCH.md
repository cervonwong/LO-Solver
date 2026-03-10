# Phase 27: Dead Code & Type Safety - Research

**Researched:** 2026-03-08
**Domain:** TypeScript dead code removal, unused export detection, type safety hardening
**Confidence:** HIGH

## Summary

Phase 27 is a pure cleanup phase with well-defined, mechanical tasks: delete 3 files, remove their registrations/documentation references, run Knip to find unused exports, replace 8+ `any` annotations with proper types, and verify nothing broke. All targets are already identified in the CONTEXT.md discussion.

The main risk is introducing regressions when replacing `any` types, particularly in the `updateCumulativeCost` function where the `any` exists because the function accepts both the full `RequestContext` (with `set()`) and the read-only getter interface. The Mastra `RequestContext` class is generic (`RequestContext<Values>`) and supports typed `get`/`set` when parameterized, so proper typing is achievable without `any`.

**Primary recommendation:** Execute in order: file deletions first (lowest risk), then Knip audit, then `any` replacements (highest risk), with a single `npx tsc --noEmit` verification at the end.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Run Knip across full `src/` (not just workflow code) -- clean all unused exports found
- Mastra registration exports (agents/tools in `index.ts`) will be flagged as unused by Knip since nothing imports them directly -- document these as justified false positives rather than configuring Knip exclusions
- Before deleting any flagged export: grep `src/` for all references AND check for dynamic usage patterns (dynamic imports, string references, `requestContext.get('key-name')` style lookups)
- Keep Knip as a permanent devDependency for future audits (add an `npm run audit` script)
- Remove `shared-memory.ts` entirely -- `generateWorkflowIds()` is confirmed dead code (never imported anywhere)
- Clean up all documentation references to deleted files (workflow README.md file tree listing, etc.)
- Delete `02a-initial-hypothesis-extractor-agent.ts` and `02a-initial-hypothesis-extractor-instructions.ts`
- Remove their registration from `src/mastra/workflow/index.ts`
- Replace all `any` annotations in workflow code with explicit typed alternatives
- Scope: `request-context-helpers.ts`, `logging-utils.ts`, `03a-rule-tester-tool.ts` (8 `any` annotations found across these files)
- Claude runs `npx tsc --noEmit` after type fixes to verify zero regressions
- User runs eval baseline before and after Phase 27
- Single verification pass at end of phase (not after each individual change)

### Claude's Discretion
- Specific type choices for replacing `any` (e.g., `unknown`, `Record<string, unknown>`, or creating local type declarations)
- Order of operations within the phase
- How to handle any unexpected Knip findings

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLN-01 | Deprecated agent files (`02a-initial-hypothesis-extractor-*`) and their `index.ts` registration are removed | Confirmed: 2 files exist, imported only in `index.ts`, agent ID `initial-hypothesis-extractor` not referenced in any step code or `getAgentById` calls |
| CLN-02 | Unused exports and dead code identified by Knip audit are removed (with full `src/` grep verification before each deletion) | Knip 5.86.0 available, Next.js plugin auto-detects App Router entries, `@public` JSDoc tag available for false positive documentation |
| CLN-03 | `shared-memory.ts` audited and removed if unused | Confirmed: only export `generateWorkflowIds()` has zero imports across `src/`; only reference is in `README.md` file tree listing |
| CLN-04 | All `any` type annotations in workflow code replaced with explicit typed alternatives | Found 10 `any` annotations across 4 files (not 8 as CONTEXT stated): `request-context-helpers.ts` (5), `logging-utils.ts` (3), `03a-rule-tester-tool.ts` (2), plus `03a-sentence-tester-tool.ts` (2). Typed alternatives identified for each. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Knip | 5.86.0 | Dead code & unused export detection | Industry standard for JS/TS projects; builds comprehensive module graph; 138 plugins including Next.js |
| TypeScript | 5.9.3 | Type checking (already installed) | Project compiler; `npx tsc --noEmit` is the verification command |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | -- | -- | No additional libraries needed for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Knip | ts-prune | ts-prune is deprecated (README recommends Knip); Knip has superior module graph analysis |

**Installation:**
```bash
npm install --save-dev knip@5.86.0
```

## Architecture Patterns

### File Deletion Safety Protocol
**What:** Before deleting any file or export, perform a triple-check: (1) grep for direct imports, (2) grep for string references (e.g., `getAgentById('agent-id')`), (3) grep for the export name without import syntax.
**When to use:** Every deletion in this phase.

### Type Replacement Strategy
**What:** Replace `any` with the narrowest type that satisfies the usage site. Prefer `unknown` over `any` when values pass through without property access. Use `Record<string, unknown>` for objects. Create local interfaces for complex shapes.
**When to use:** All 10 `any` annotation replacements.

### Anti-Patterns to Avoid
- **Replacing `any` with `unknown` blindly:** If the code accesses properties on the value, `unknown` requires type narrowing guards. Check each usage site to determine whether `unknown`, a union type, or a specific interface is appropriate.
- **Deleting Knip-flagged exports without grep verification:** Knip cannot detect dynamic usage patterns like `requestContext.get('key-name')` or `mastra.getAgentById('id')`. Always verify with grep before deletion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dead code detection | Manual grep-based audit | Knip | Knip builds a full module graph; manual scanning misses transitive dependencies |
| Type checking | Manual review | `npx tsc --noEmit` | Compiler catches type errors humans miss |

## Common Pitfalls

### Pitfall 1: Mastra Registration Exports as False Positives
**What goes wrong:** Knip flags all agents and tools exported from `index.ts` as unused because they're consumed by Mastra's runtime registration, not by static imports.
**Why it happens:** Mastra reads agents from the `workflowAgents` object at runtime; no other file imports individual agents.
**How to avoid:** Document these as justified false positives in a comment block. Do NOT delete them. The `workflowAgents` object in `index.ts` is consumed by `src/mastra/index.ts` via `...workflowAgents`, so the `index.ts` file itself IS imported -- but individual agent re-exports may be flagged.
**Warning signs:** Knip reports `structuredProblemExtractorAgent`, `initialHypothesizerAgent`, etc. as unused.

### Pitfall 2: The `updateCumulativeCost` any Type
**What goes wrong:** The `updateCumulativeCost` function in `request-context-helpers.ts` uses `any` for its `requestContext` parameter because it needs both `get()` and `set()` methods, but the file's `RequestContextGetter` type alias only has `get()`.
**Why it happens:** The function is called from step files that have the full `RequestContext<WorkflowRequestContext>`, but the type system within this file only defines the read-only getter interface.
**How to avoid:** Create a new type alias (e.g., `RequestContextAccessor`) that includes both `get` and `set` with proper key/value typing from `WorkflowRequestContext`. Import `RequestContext` from `@mastra/core/request-context` and use `RequestContext<WorkflowRequestContext>` directly, or define a minimal interface with typed `get`/`set`.
**Warning signs:** Type errors in step files that call `updateCumulativeCost`.

### Pitfall 3: `abort-signal` Access Pattern Uses `as any`
**What goes wrong:** The `(ctx.requestContext as any)?.get?.('abort-signal')` pattern in tester tools uses `any` because `ctx.requestContext` is typed as the narrow `ToolExecuteContext.requestContext` which only types keys from `WorkflowRequestContext`, but `abort-signal` IS a valid key.
**Why it happens:** The `ToolExecuteContext` interface defines `requestContext` with `get: (key: keyof WorkflowRequestContext) => unknown`, so `'abort-signal'` should be valid. The `as any` is unnecessary if the type is correct.
**How to avoid:** Verify that `'abort-signal'` is in `WorkflowRequestContext` (it is -- line 72 of `request-context-types.ts`). Simply remove the `as any` cast -- the existing `ToolExecuteContext` type already allows `.get('abort-signal')` since it accepts `keyof WorkflowRequestContext`. If the issue is that `ctx.requestContext` might be `undefined`, use optional chaining without `as any`.
**Warning signs:** None expected -- removing `as any` should compile cleanly since `abort-signal` is a valid key.

### Pitfall 4: Pre-existing Type Errors Beyond CSS Module
**What goes wrong:** `npx tsc --noEmit` currently reports 5 errors, not just 1. CLAUDE.md mentions only the CSS module error, but there are also 2 CSS errors (`globals.css` + `streamdown/styles.css`) and 3 errors in `skeleton.tsx` (from `noUncheckedIndexedAccess`).
**Why it happens:** The `skeleton.tsx` errors and the second CSS import error pre-date this phase.
**How to avoid:** The success criterion says "only the pre-existing CSS module error remains." Clarify with the user that there are actually 5 pre-existing errors (all outside workflow code). The phase's `any` replacement work should not change this count. Verify by checking that `npx tsc --noEmit` output is identical before and after Phase 27 changes.
**Warning signs:** If the error count changes after type replacements, a regression was introduced.

### Pitfall 5: Knip May Find Unexpected Dead Code
**What goes wrong:** Running Knip across full `src/` may flag exports, files, or dependencies beyond the 3 known targets.
**Why it happens:** No Knip audit has been run before; there may be accumulated dead code from prior milestones.
**How to avoid:** Per CONTEXT.md, clean all unused exports found (not just the known ones). But still follow the grep verification protocol before each deletion. If Knip flags something unexpected, investigate before acting.

## Code Examples

### Knip Configuration (knip.json)
```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "ignore": [],
  "ignoreDependencies": []
}
```
Knip's Next.js plugin auto-activates when `next` is in `package.json` dependencies. It will automatically detect `src/app/**/page.tsx`, `src/app/**/layout.tsx`, `src/app/**/route.ts`, etc. as entry points. No custom entry configuration should be needed.

### package.json audit script
```json
{
  "scripts": {
    "audit": "knip"
  }
}
```

### Replacing `any` in `extractCostFromResult` (request-context-helpers.ts)
```typescript
// BEFORE:
export function extractCostFromResult(result: Record<string, any>): number {

// AFTER:
export function extractCostFromResult(result: Record<string, unknown>): number {
  let callCost = 0;
  const steps = result.steps;
  if (Array.isArray(steps) && steps.length > 0) {
    for (const step of steps) {
      const stepCost = (step as Record<string, unknown>)?.providerMetadata
        // ... needs careful property access with type narrowing
    }
  }
}
```

Note: Since the function accesses nested properties (`result.steps[].providerMetadata.openrouter.usage.cost`), a cleaner approach is to define a local interface for the expected shape:

```typescript
interface AgentResultCostInfo {
  steps?: Array<{
    providerMetadata?: {
      openrouter?: { usage?: { cost?: number } };
    };
  }>;
  providerMetadata?: {
    openrouter?: { usage?: { cost?: number } };
  };
}

export function extractCostFromResult(result: AgentResultCostInfo): number {
```

### Replacing `any` in `updateCumulativeCost` (request-context-helpers.ts)
```typescript
// BEFORE:
export async function updateCumulativeCost(
  requestContext: { get: (key: any) => any; set: (key: any, value: any) => void },
  ...

// AFTER -- Option A (minimal interface):
type RequestContextReadWrite = {
  get: (key: keyof WorkflowRequestContext) => unknown;
  set: <K extends keyof WorkflowRequestContext>(key: K, value: WorkflowRequestContext[K]) => void;
};

export async function updateCumulativeCost(
  requestContext: RequestContextReadWrite,
  ...

// AFTER -- Option B (use Mastra's typed RequestContext directly):
import { RequestContext } from '@mastra/core/request-context';

export async function updateCumulativeCost(
  requestContext: RequestContext<WorkflowRequestContext>,
  ...
```

Option A is recommended: it keeps the interface minimal and doesn't tightly couple to `RequestContext`'s full API surface.

### Replacing `any` in `formatReasoning` (logging-utils.ts)
```typescript
// BEFORE:
export const formatReasoning = (reasoning: any): string | null => {
  ...
    .map((chunk: any) => chunk.payload?.text || chunk.text || '')

// AFTER:
interface ReasoningChunk {
  payload?: { text?: string };
  text?: string;
}

export const formatReasoning = (reasoning: string | ReasoningChunk[] | null | undefined): string | null => {
  if (!reasoning) return null;
  if (typeof reasoning === 'string') return reasoning;
  if (!Array.isArray(reasoning)) return null;

  const result = reasoning
    .map((chunk: ReasoningChunk) => chunk.payload?.text || chunk.text || '')
    .filter((text: string) => text && text !== '[REDACTED]')
    .join('');

  return result || null;
};

// logAgentOutput parameter:
export const logAgentOutput = (
  logFile: string,
  stepName: string,
  agentName: string,
  output: unknown,
  reasoning?: string | ReasoningChunk[] | null,
  startTime?: number,
): void => {
```

### Removing `as any` from tester tools
```typescript
// BEFORE (03a-rule-tester-tool.ts lines 234, 314):
const abortSignal = (ctx.requestContext as any)?.get?.('abort-signal') as
  | AbortSignal
  | undefined;

// AFTER:
const abortSignal = ctx.requestContext?.get('abort-signal') as
  | AbortSignal
  | undefined;
```
Since `ToolExecuteContext.requestContext.get` already accepts `keyof WorkflowRequestContext` and `'abort-signal'` is a valid key, the `as any` cast is unnecessary. The same fix applies to `03a-sentence-tester-tool.ts` lines 243, 338.

## Exact `any` Annotation Inventory

| # | File | Line | Code | Recommended Replacement |
|---|------|------|------|------------------------|
| 1 | `request-context-helpers.ts` | 212 | `result: Record<string, any>` | `result: AgentResultCostInfo` (local interface) |
| 2 | `request-context-helpers.ts` | 234 | `key: any` (get) | `key: keyof WorkflowRequestContext` |
| 3 | `request-context-helpers.ts` | 234 | `=> any` (get return) | `=> unknown` |
| 4 | `request-context-helpers.ts` | 234 | `key: any` (set) | `key: K extends keyof WorkflowRequestContext` |
| 5 | `request-context-helpers.ts` | 234 | `value: any` (set) | `value: WorkflowRequestContext[K]` |
| 6 | `logging-utils.ts` | 112 | `reasoning: any` | `reasoning: string \| ReasoningChunk[] \| null \| undefined` |
| 7 | `logging-utils.ts` | 119 | `chunk: any` | `chunk: ReasoningChunk` |
| 8 | `logging-utils.ts` | 133 | `reasoning?: any` | `reasoning?: string \| ReasoningChunk[] \| null` |
| 9 | `03a-rule-tester-tool.ts` | 234 | `as any` | Remove cast entirely |
| 10 | `03a-rule-tester-tool.ts` | 314 | `as any` | Remove cast entirely |
| 11 | `03a-sentence-tester-tool.ts` | 243 | `as any` | Remove cast entirely |
| 12 | `03a-sentence-tester-tool.ts` | 338 | `as any` | Remove cast entirely |

Total: 12 `any` annotations across 4 files (CONTEXT.md stated 8 in 3 files; actual count is higher because `03a-sentence-tester-tool.ts` was not included and some lines have multiple `any` keywords).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-prune for unused exports | Knip (ts-prune deprecated) | 2023 | Knip has module graph, plugins, auto-fix |
| Manual dead code audits | Automated Knip CI integration | 2024-2025 | Repeatable, catches regressions |
| `eslint-disable @typescript-eslint/no-explicit-any` | Replace with proper types | Always | Eliminates runtime type errors |

## Open Questions

1. **Pre-existing type error count discrepancy**
   - What we know: `npx tsc --noEmit` reports 5 errors (2 CSS module, 3 skeleton.tsx), not 1 as CLAUDE.md states
   - What's unclear: Whether the success criterion "only the pre-existing CSS module error remains" should be interpreted as "the 5 pre-existing errors remain unchanged"
   - Recommendation: Treat as "error count does not increase" -- capture the 5 errors before changes and verify identical output after. The skeleton.tsx and second CSS errors are outside workflow scope.

2. **Knip may flag more than expected**
   - What we know: No prior Knip audit has been run
   - What's unclear: How many additional unused exports exist beyond the 3 known dead code targets
   - Recommendation: Run Knip first, review full report, then address all findings with grep verification

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all affected files (request-context-helpers.ts, logging-utils.ts, 03a-rule-tester-tool.ts, 03a-sentence-tester-tool.ts, index.ts, shared-memory.ts, request-context-types.ts, README.md)
- Mastra `RequestContext` class definition in `node_modules/@mastra/core/dist/request-context/index.d.ts` -- confirmed generic `<Values>` parameter with typed `get`/`set`
- `npx tsc --noEmit` output -- verified 5 pre-existing errors
- npm registry -- confirmed Knip 5.86.0 is latest

### Secondary (MEDIUM confidence)
- [Knip documentation: configuration](https://knip.dev/overview/configuration)
- [Knip documentation: unused exports](https://knip.dev/typescript/unused-exports)
- [Knip documentation: handling issues / false positives](https://knip.dev/guides/handling-issues)
- [Knip documentation: Next.js plugin](https://knip.dev/reference/plugins/next)
- [Knip documentation: JSDoc/TSDoc tags](https://knip.dev/reference/jsdoc-tsdoc-tags)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Knip is the established tool, already specified in requirements
- Architecture: HIGH -- all affected files inspected, all `any` annotations catalogued with line numbers
- Pitfalls: HIGH -- verified against actual codebase state (type error count, Mastra types)
- Type replacements: HIGH -- Mastra RequestContext generic parameter confirmed from source

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable domain -- dead code removal patterns don't change rapidly)
