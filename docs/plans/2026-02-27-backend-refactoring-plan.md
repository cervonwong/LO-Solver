# Backend Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce duplication and improve type safety in the Workflow 03 backend. Pure refactoring with no behavior changes.

**Architecture:** Extract schemas from `workflow.ts` into `workflow-schemas.ts`. Consolidate the `emitTraceEvent` function into `request-context-helpers.ts`. Replace the `unknown` StepWriter type with a named type alias. Unify `ruleSchema` with `confidence` as optional.

**Tech Stack:** TypeScript, Zod, Mastra

---

### Task 1: Add StepWriter Type

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/request-context-types.ts:44`

**Step 1: Add `StepWriter` type and update `Workflow03RequestContext`**

In `request-context-types.ts`, add the type alias before the `Workflow03RequestContext` interface and update the `step-writer` key:

```typescript
/** Type for the workflow step writer used to emit trace events. */
export type StepWriter = { write?: (data: unknown) => Promise<void> };
```

Change line 44 from:

```typescript
'step-writer': unknown;
```

to:

```typescript
'step-writer': StepWriter;
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 3: Commit**

```
Add StepWriter type alias and replace unknown in RequestContext
```

---

### Task 2: Consolidate emitTraceEvent

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/request-context-helpers.ts:115-124`
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/workflow.ts:1,7,20-25`

**Step 1: Update `request-context-helpers.ts`**

Import `StepWriter` from `request-context-types.ts`. Add the direct-writer version of `emitTraceEvent` and update `emitToolTraceEvent` to delegate to it.

Replace lines 115-124:

```typescript
/**
 * Emit a trace event directly via a step writer.
 * Used in workflow steps where the writer is available directly.
 */
export async function emitTraceEvent(
  writer: StepWriter | undefined,
  event: { type: string; data: Record<string, unknown> },
): Promise<void> {
  await writer?.write?.(event);
}

/**
 * Emit a trace event from a tool via the step writer stored in requestContext.
 * This bypasses the broken ctx.writer?.custom() path (Mastra does not pass
 * outputWriter to tools when called from workflow steps).
 */
export async function emitToolTraceEvent(
  requestContext: RequestContextGetter,
  event: { type: string; data: Record<string, unknown> },
): Promise<void> {
  if (!requestContext) return;
  const writer = requestContext.get('step-writer') as StepWriter | undefined;
  await emitTraceEvent(writer, event);
}
```

Also add `StepWriter` to the import from `./request-context-types` at the top of the file (line 5-9):

```typescript
import type {
  Workflow03RequestContext,
  StructuredProblemData,
  Rule,
  StepWriter,
} from './request-context-types';
```

**Step 2: Update `workflow.ts` to import `emitTraceEvent`**

In `workflow.ts`, remove the local `emitTraceEvent` function (lines 19-25, including the comment on line 19).

Add `emitTraceEvent` to the imports. There are no existing imports from `./request-context-helpers` in workflow.ts, so add a new import line after line 5:

```typescript
import { emitTraceEvent } from './request-context-helpers';
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 4: Commit**

```
Consolidate emitTraceEvent into request-context-helpers
```

---

### Task 3: Extract Schemas into `workflow-schemas.ts`

**Files:**

- Create: `src/mastra/03-per-rule-per-sentence-delegation/workflow-schemas.ts`
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/workflow.ts:1-231`

**Step 1: Create `workflow-schemas.ts`**

Create the new file with all schema definitions extracted from `workflow.ts`. This includes:

- `rawProblemInputSchema` (workflow.ts lines 64-67)
- `structuredProblemDataSchema` (lines 69-93)
- `structuredProblemSchema` (lines 95-107)
- `rulesArraySchema` (lines 109-123)
- `vocabularyArraySchema` (line 127)
- `rulesSchema` (lines 129-144)
- `issueSchema` (lines 147-155)
- `missingRuleSchema` (lines 157-161)
- `verifierFeedbackSchema` (lines 163-183)
- `questionAnswerSchema` (lines 185-199)
- `questionsAnsweredSchema` (lines 201-216)
- `hypothesisTestLoopSchema` (lines 221-230)
- `stepTimingSchema` (lines 30-35)
- `workflowStateSchema` (lines 39-45)
- `WorkflowState` type (line 47)
- `initializeWorkflowState` (lines 50-62)
- `MAX_VERIFY_IMPROVE_ITERATIONS` constant (line 27)

Also move the intermediate schemas used only within step definitions:

- `initialHypothesisInputSchema` (line 333)
- `initialHypothesisOutputSchema` (line 336)
- `questionAnsweringInputSchema` (lines 902-905)

The file should import `z` from `zod`, `vocabularyEntrySchema` from `./vocabulary-tools`, and logging utilities:

```typescript
import { z } from 'zod';
import { vocabularyEntrySchema } from './vocabulary-tools';
import { getLogFilePath, initializeLogFile } from './logging-utils';
```

Export everything that workflow.ts needs to import.

**Step 2: Update `workflow.ts` imports**

Replace the schema-related content in `workflow.ts` (lines 1-231) with imports from `workflow-schemas.ts`. The file should now start with:

```typescript
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { RequestContext } from '@mastra/core/request-context';
import { type VocabularyEntry } from './vocabulary-tools';
import type { Workflow03RequestContext } from './request-context-types';
import type { ModelMode } from '../openrouter';
import {
  type StepTiming,
  recordStepTiming,
  logWorkflowSummary,
  logAgentOutput,
  logValidationError,
} from './logging-utils';
import { generateWithRetry } from './agent-utils';
import { emitTraceEvent } from './request-context-helpers';
import type { StepId } from '@/lib/workflow-events';
import {
  MAX_VERIFY_IMPROVE_ITERATIONS,
  workflowStateSchema,
  type WorkflowState,
  initializeWorkflowState,
  rawProblemInputSchema,
  structuredProblemSchema,
  structuredProblemDataSchema,
  rulesSchema,
  verifierFeedbackSchema,
  questionsAnsweredSchema,
  hypothesisTestLoopSchema,
  initialHypothesisInputSchema,
  initialHypothesisOutputSchema,
  questionAnsweringInputSchema,
} from './workflow-schemas';
```

Remove all schema definitions, `MAX_VERIFY_IMPROVE_ITERATIONS`, `stepTimingSchema`, `workflowStateSchema`, `WorkflowState`, `initializeWorkflowState`, `rawProblemInputSchema`, and all other schemas from `workflow.ts`. The file should start with the step definitions (previously at line 232).

Note: `z` import should also be removed from `workflow.ts` since schemas are no longer defined there. The `getLogFilePath` and `initializeLogFile` imports should also be removed (they moved to `workflow-schemas.ts`).

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 4: Commit**

```
Extract workflow schemas into workflow-schemas.ts
```

---

### Task 4: Unify ruleSchema

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/workflow-schemas.ts:109-123`
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/request-context-types.ts:14-21`
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts:17-28`
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts:14`

**Step 1: Define canonical `ruleSchema` in `workflow-schemas.ts`**

In `workflow-schemas.ts`, the `rulesArraySchema` currently inlines its element schema. Extract it as a named export and make `confidence` optional:

Replace the `rulesArraySchema` definition with:

```typescript
export const ruleSchema = z.object({
  title: z
    .string()
    .describe(
      'A short title that groups or organises the rule (e.g. "Sentence syntax", "Verb agreement", "Noun cases")',
    ),
  description: z
    .string()
    .describe('A detailed description of the rule, such as grammar patterns or phonetic changes'),
  confidence: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .optional()
    .describe('Confidence level for this rule based on evidence strength'),
});

export type Rule = z.infer<typeof ruleSchema>;

const rulesArraySchema = z.array(ruleSchema);
```

Note: `rulesArraySchema` no longer needs to be exported (it's only used within `workflow-schemas.ts` by `rulesSchema` and `hypothesisTestLoopSchema`). If it is referenced by name in `workflow.ts` step code, keep it exported. Otherwise make it `const` (private).

**Step 2: Update `request-context-types.ts`**

Remove the `Rule` interface (lines 14-21) and import `Rule` from `workflow-schemas.ts` instead. Add a re-export so existing importers don't break:

```typescript
import type { ModelMode } from '../openrouter';
import type { VocabularyEntry } from './vocabulary-tools';
export type { Rule } from './workflow-schemas';
```

Remove:

```typescript
/**
 * A linguistic rule with confidence level.
 */
export interface Rule {
  title: string;
  description: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

**Step 3: Update `03a-rule-tester-tool.ts`**

Remove the `ruleSchema` definition (lines 17-28 including the comment block). Import it from `workflow-schemas.ts` instead:

```typescript
import { ruleSchema } from './workflow-schemas';
```

Remove:

```typescript
// ============================================================================
// Shared Schemas
// ============================================================================

export const ruleSchema = z.object({
  title: z.string().describe('A short title that groups or organises the rule'),
  description: z.string().describe('A detailed description of the rule'),
  confidence: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .optional()
    .describe('Confidence level for this rule'),
});
```

**Step 4: Update `03a-sentence-tester-tool.ts`**

Change the import of `ruleSchema` from `./03a-rule-tester-tool` to `./workflow-schemas`:

```typescript
// Before:
import { ruleSchema } from './03a-rule-tester-tool';
// After:
import { ruleSchema } from './workflow-schemas';
```

**Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 6: Commit**

```
Unify ruleSchema definitions with optional confidence
```

---

### Task 5: Update `index.ts` exports and verify

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/index.ts` (if `workflow-schemas.ts` exports are needed)
- Modify: `CLAUDE.md`

**Step 1: Check if `index.ts` needs updates**

Read `src/mastra/03-per-rule-per-sentence-delegation/index.ts`. If it re-exports from `workflow.ts` (e.g., `workflowStateSchema`, `WorkflowState`), update those exports to point to `workflow-schemas.ts` instead. If no external consumers reference moved exports, no changes needed.

**Step 2: Update `CLAUDE.md`**

In the **File Conventions in Each Workflow** section, add:

```markdown
- `workflow-schemas.ts` — Zod schemas and types shared across workflow steps and tools
```

**Step 3: Final build verification**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `globals.css` module error.

**Step 4: Commit**

```
Update exports and document workflow-schemas convention
```
