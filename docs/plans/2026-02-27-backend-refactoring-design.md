# Backend Refactoring Design

**Goal:** Reduce duplication and improve type safety in the Workflow 03 backend (`src/mastra/03-per-rule-per-sentence-delegation/`). Pure refactoring -- no behavior changes.

**Scope:** Four items from the code review:

1. Type the `step-writer` in RequestContext (remove `unknown`)
2. Consolidate `emitTraceEvent` implementations
3. Split `workflow.ts` (1046 lines) into focused files
4. Unify `ruleSchema` definitions (fix confidence required/optional mismatch)

**Branch:** `refactor/backend-cleanup` from master.

---

## 1. StepWriter Typing

### Problem

`request-context-types.ts` declares `'step-writer': unknown`, forcing every consumer to cast to `{ write?: (data: unknown) => Promise<void> }`. The same structural type literal appears in `workflow.ts:21` and `request-context-helpers.ts:120-121`.

### Solution

Define a named type in `request-context-types.ts`:

```typescript
export type StepWriter = { write?: (data: unknown) => Promise<void> };
```

Update `Workflow03RequestContext`:

```typescript
'step-writer': StepWriter;
```

Remove casts from `request-context-helpers.ts` (`emitToolTraceEvent`) and `workflow.ts` (`emitTraceEvent`).

---

## 2. Consolidate emitTraceEvent

### Problem

Two implementations of the same logic:

- `emitTraceEvent(writer, event)` in `workflow.ts` (private, 23 call sites) -- takes writer directly
- `emitToolTraceEvent(requestContext, event)` in `request-context-helpers.ts` (10 call sites) -- retrieves writer from RequestContext

Both call `writer?.write?.(event)`.

### Solution

Move `emitTraceEvent` to `request-context-helpers.ts` and export it. The workflow version (`emitTraceEvent`) takes a `StepWriter` directly. The tool version (`emitToolTraceEvent`) extracts the writer from RequestContext and delegates to `emitTraceEvent`.

```typescript
// request-context-helpers.ts
export async function emitTraceEvent(
  writer: StepWriter | undefined,
  event: { type: string; data: Record<string, unknown> },
): Promise<void> {
  await writer?.write?.(event);
}

export async function emitToolTraceEvent(
  requestContext: RequestContextGetter,
  event: { type: string; data: Record<string, unknown> },
): Promise<void> {
  if (!requestContext) return;
  const writer = requestContext.get('step-writer') as StepWriter | undefined;
  await emitTraceEvent(writer, event);
}
```

In `workflow.ts`, remove the local `emitTraceEvent` function and import it from `request-context-helpers.ts`. The 23 call sites remain unchanged.

---

## 3. Split workflow.ts

### Problem

`workflow.ts` is 1046 lines containing schemas, four workflow steps, and composition.

### Solution

Split into:

- **`workflow-schemas.ts`** -- All 12 Zod schemas plus the workflow state schema and `initializeWorkflowState` (~200 lines). Exports every schema and the `WorkflowState` type.
- **`workflow.ts`** -- The four steps and composition remain here, importing schemas. This reduces the file to ~830 lines (steps + composition).

Why not split each step into its own file? Steps reference each other's output schemas and share the `emitTraceEvent` function. Splitting into 4+1 files would create circular imports between step files needing each other's schemas. The schema-only split is the clean boundary -- schemas have no dependencies on steps.

A future split of individual steps is possible once schemas are extracted, but is not necessary now and would over-fragment the codebase.

---

## 4. Unify ruleSchema

### Problem

Three definitions of the rule shape:

1. `ruleSchema` in `03a-rule-tester-tool.ts:21-28` -- `confidence` is **optional**
2. `rulesArraySchema` in `workflow.ts:109-123` -- `confidence` is **required**
3. `Rule` interface in `request-context-types.ts:17-21` -- `confidence` is **optional**

The mismatch means a rule returned by a tool (without confidence) could fail workflow schema validation.

### Solution

Define a single `ruleSchema` in `workflow-schemas.ts` with `confidence` as **optional** (matching runtime behavior -- some agents do not set it). Export it and a derived `Rule` type:

```typescript
// workflow-schemas.ts
export const ruleSchema = z.object({
  title: z.string().describe('A short title that groups or organises the rule'),
  description: z.string().describe('A detailed description of the rule'),
  confidence: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .optional()
    .describe('Confidence level for this rule based on evidence strength'),
});
export type Rule = z.infer<typeof ruleSchema>;
```

Remove:

- `Rule` interface from `request-context-types.ts` (import from `workflow-schemas.ts` instead)
- `ruleSchema` from `03a-rule-tester-tool.ts` (import from `workflow-schemas.ts` instead)
- Inline `rulesArraySchema` element definition from `workflow.ts` (use `z.array(ruleSchema)` instead)

Update imports in: `request-context-types.ts`, `request-context-helpers.ts`, `03a-rule-tester-tool.ts`, `03a-sentence-tester-tool.ts`, `workflow.ts`.

---

## Execution Order

The items have dependencies:

1. **StepWriter typing** (no deps)
2. **Consolidate emitTraceEvent** (depends on StepWriter type)
3. **Split workflow.ts** (extract schemas first, then update emitTraceEvent import)
4. **Unify ruleSchema** (depends on workflow-schemas.ts existing)

Verify with `npx tsc --noEmit` after each task.
