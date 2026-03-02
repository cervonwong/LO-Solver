# Timestamp Logging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `[HH:MM:SS +N.Ns]` timestamps to all console and markdown log lines so hangs and timeouts are immediately visible.

**Architecture:** A `formatTimestamp()` utility in `logging-utils.ts` computes wall clock (HH:MM:SS GMT+8) + elapsed seconds from a workflow start epoch. The start epoch is stored in `WorkflowRequestContext` and propagated to all RequestContexts. Tools read it via a `getWorkflowStartTime()` helper. `agent-utils.ts` retries use wall-clock-only timestamps since they lack RequestContext.

**Tech Stack:** TypeScript, Mastra RequestContext

---

### Task 1: Add `formatTimestamp` utility and `getWorkflowStartTime` helper

**Files:**
- Modify: `src/mastra/workflow/logging-utils.ts:1-42` (add new export after existing `formatTimeGMT8`)
- Modify: `src/mastra/workflow/request-context-types.ts:34-67` (add key to interface)
- Modify: `src/mastra/workflow/request-context-helpers.ts:94-100` (add helper after `getLogFile`)

**Step 1: Add `workflow-start-time` to `WorkflowRequestContext`**

In `src/mastra/workflow/request-context-types.ts`, add after the `'step-id'?` entry (line 66):

```typescript
  /** Epoch ms when the workflow started, for elapsed-time timestamps */
  'workflow-start-time': number;
```

**Step 2: Add `formatTimestamp` to `logging-utils.ts`**

After the `formatTimeGMT8` function (after line 42), add:

```typescript
/**
 * Format a timestamp prefix for log lines: [HH:MM:SS +N.Ns]
 * Uses GMT+8 wall clock and elapsed seconds since workflow start.
 * If startTime is undefined, returns wall-clock only: [HH:MM:SS]
 */
export const formatTimestamp = (startTime?: number): string => {
  const now = Date.now();
  const wallClock = formatTimeGMT8(new Date(now));
  if (startTime === undefined) {
    return `[${wallClock}]`;
  }
  const elapsedSec = ((now - startTime) / 1000).toFixed(1);
  return `[${wallClock} +${elapsedSec}s]`;
};
```

**Step 3: Add `getWorkflowStartTime` helper to `request-context-helpers.ts`**

After the `getLogFile` function (after line 100), add:

```typescript
/**
 * Helper to get workflow start time (epoch ms) from request context.
 * Returns undefined if not set.
 */
export function getWorkflowStartTime(requestContext: RequestContextGetter): number | undefined {
  if (!requestContext) return undefined;
  return requestContext.get('workflow-start-time') as number | undefined;
}
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing CSS module error.

**Step 5: Commit**

```
Add formatTimestamp utility and workflow-start-time context key
```

---

### Task 2: Set `workflow-start-time` in all RequestContexts in `workflow.ts`

**Files:**
- Modify: `src/mastra/workflow/workflow.ts`

The workflow creates multiple RequestContext instances. Each must get the start time. There is one natural "workflow start" — the beginning of `extractionStep.execute`. The same `startTimeIso` used for `logWorkflowSummary` is available from `initializeWorkflowState().startTimeIso`.

**Step 1: Capture start epoch at the top of `extractionStep`**

At the top of the `execute` function (after line 55, near `const initialState = ...`), add:

```typescript
const workflowStartTime = Date.now();
```

**Step 2: Set on the extraction step RequestContext**

After line 70 (`requestContext.set('model-mode', ...)`), add:

```typescript
requestContext.set('workflow-start-time', workflowStartTime);
```

**Step 3: Pass `workflowStartTime` into step 2 state**

The `workflowStartTime` needs to survive across steps. Add it to the workflow state schema OR pass it through `setState`. The simplest approach: add `workflowStartTime` to the `WorkflowState` type and `initializeWorkflowState`.

In `src/mastra/workflow/workflow-schemas.ts`, find the `workflowStateSchema` and add:

```typescript
workflowStartTime: z.number().describe('Epoch ms when workflow started'),
```

And in `initializeWorkflowState()`, set `workflowStartTime: Date.now()`.

Then in `extractionStep`, use `initialState.workflowStartTime` instead of a local `Date.now()`.

**Step 4: Set on all RequestContexts in the hypothesize-verify step**

Find every `requestContext.set('step-writer', ...)` line and add `requestContext.set('workflow-start-time', state.workflowStartTime)` immediately after. This covers:
- `mainRequestContext` (line ~214)
- `perspectiveRequestContext` (line ~455-456)
- `verifyRequestContext` (line ~571-572)
- `convergenceRequestContext` (line ~912-913)

**Step 5: Set on the answer step RequestContext**

Find the answer step RequestContext (~line 1257) and add:

```typescript
requestContext.set('workflow-start-time', state.workflowStartTime);
```

**Step 6: Verify types compile**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```
Set workflow-start-time in all RequestContexts
```

---

### Task 3: Timestamp console logs in `workflow.ts`

**Files:**
- Modify: `src/mastra/workflow/workflow.ts`

**Step 1: Add import**

Add `formatTimestamp` to the existing `logging-utils` import (line 10-15):

```typescript
import {
  type StepTiming,
  recordStepTiming,
  logWorkflowSummary,
  logAgentOutput,
  logValidationError,
  formatTimestamp,
} from './logging-utils';
```

**Step 2: Timestamp all 11 console lines**

For each console.log/warn in workflow.ts, prepend `${formatTimestamp(state.workflowStartTime)}` (or `workflowStartTime` for the extraction step which uses a local var). The lines are:

1. Line ~129: `[Step 1] Structured Problem Extractor Agent finished...`
   ```typescript
   console.log(
     `${formatTimestamp(workflowStartTime)} [Step 1] Structured Problem Extractor Agent finished at ${timing1.endTime} (${timing1.durationMinutes} min).`,
   );
   ```

2. Line ~306: `[Round N] Dispatcher finished...`
   ```typescript
   console.log(
     `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Dispatcher finished at ${dispatchTiming.endTime} (${dispatchTiming.durationMinutes} min).`,
   );
   ```

3. Line ~401: `[Round N] Improver Dispatcher finished...` — same pattern
4. Line ~417: `[Round N] Improver returned no new perspectives...` — same pattern
5. Line ~526: `[Round N] Hypothesizer (id) finished...` — same pattern
6. Line ~642: `[Round N] Verifier (id) finished...` — same pattern
7. Line ~724: `[Round N] Verifier feedback parse failed...` — same pattern (console.warn)
8. Line ~871: `[Round N] Synthesizer finished...` — same pattern
9. Line ~1157: `[Round N] Converged!...` — same pattern
10. Line ~1173: `[Multi-Perspective] Max rounds reached...` — same pattern (console.warn)
11. Line ~1311: `[Step 3] Question Answerer Agent finished...` — same pattern

Each one: prepend `${formatTimestamp(state.workflowStartTime)} ` to the template literal. For the extraction step (line 129), use the local `workflowStartTime` variable since `state` may not have it yet at that point — or use `initialState.workflowStartTime`.

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
Add timestamps to workflow.ts console logs
```

---

### Task 4: Timestamp console logs in tool files

**Files:**
- Modify: `src/mastra/workflow/vocabulary-tools.ts`
- Modify: `src/mastra/workflow/rules-tools.ts`
- Modify: `src/mastra/workflow/03a-sentence-tester-tool.ts`
- Modify: `src/mastra/workflow/03a-rule-tester-tool.ts`

**Step 1: Add imports to each file**

Each tool file needs:
```typescript
import { formatTimestamp } from './logging-utils';
import { getWorkflowStartTime } from './request-context-helpers';
```

For `vocabulary-tools.ts`, `formatTimestamp` import is new; `getWorkflowStartTime` is added to the existing import from `request-context-helpers`.

For `rules-tools.ts`, both imports are new (add `formatTimestamp` from logging-utils, and `getWorkflowStartTime` to the existing `request-context-helpers` import).

For `03a-sentence-tester-tool.ts` and `03a-rule-tester-tool.ts`, check existing imports and add as needed.

**Step 2: In each tool's `execute`, get the start time and use it**

Pattern for every tool:
```typescript
const startTime = getWorkflowStartTime(ctx?.requestContext);
```

Then prepend `${formatTimestamp(startTime)}` to each console.log line.

**vocabulary-tools.ts** (5 lines):
- Line 44: `console.log(`${formatTimestamp(startTime)} [VOCAB:READ] Retrieved ${entries.length} vocabulary entries`);`
- Line 91: `console.log(`${formatTimestamp(startTime)} [VOCAB:ADD] Added ${added}, skipped ${skipped}, total ${vocabularyState.size}`);`
- Line 163-164: `console.log(`${formatTimestamp(startTime)} [VOCAB:UPDATE] Updated ${updated}, skipped ${skipped}, total ${vocabularyState.size}`);`
- Line 233-234: `console.log(`${formatTimestamp(startTime)} [VOCAB:REMOVE] Removed ${removed}, not found ${notFound}, total ${vocabularyState.size}`);`
- Line 287: `console.log(`${formatTimestamp(startTime)} [VOCAB:CLEAR] Cleared ${removed} vocabulary entries`);`

**rules-tools.ts** (5 lines):
- Line 27: `[RULES:READ]`
- Line 71: `[RULES:ADD]`
- Line 136: `[RULES:UPDATE]`
- Line 196-197: `[RULES:REMOVE]`
- Line 245: `[RULES:CLEAR]`

Same pattern: get `startTime` once per `execute`, prepend `${formatTimestamp(startTime)}`.

**03a-sentence-tester-tool.ts** (3 lines):
- Line 133-134: `[TOOL:testSentence] Starting...`
- Line 151-152: `[TOOL:testSentence] ... completed...`
- Line 180-181: `[TOOL:testSentence] ... FAILED...`

The tester tools are plain functions (not Mastra tool `execute` callbacks) — they receive `requestContext` as a parameter. Get `startTime` from it:
```typescript
const startTime = getWorkflowStartTime(
  requestContext ? { get: (key: string) => requestContext.get(key as any) } : undefined
);
```

Actually, check how the tester tools already access requestContext — they receive it as a `RequestContext<WorkflowRequestContext>` parameter directly. The `getWorkflowStartTime` helper expects `RequestContextGetter` type. Create a local wrapper or just read it directly:
```typescript
const wfStartTime = requestContext?.get('workflow-start-time') as number | undefined;
```

Then `formatTimestamp(wfStartTime)`.

**03a-rule-tester-tool.ts** (3 lines): Same pattern as sentence-tester.

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
Add timestamps to tool console logs
```

---

### Task 5: Timestamp markdown log functions in `logging-utils.ts`

**Files:**
- Modify: `src/mastra/workflow/logging-utils.ts`

Add an optional `startTime?: number` parameter to each markdown logging function, then prepend `formatTimestamp(startTime)` to the written content.

**Step 1: Update `logAgentOutput`**

```typescript
export const logAgentOutput = (
  logFile: string,
  stepName: string,
  agentName: string,
  output: unknown,
  reasoning?: any,
  startTime?: number,
): void => {
  let content = `${formatTimestamp(startTime)} ## ${stepName}\n\n**Agent:** ${agentName}\n\n`;
  // ... rest unchanged
```

**Step 2: Update `logValidationError`**

```typescript
export const logValidationError = (logFile: string, stepName: string, error: z.ZodError, startTime?: number): void => {
  const content = `${formatTimestamp(startTime)} ## ⚠️ Validation Error: ${stepName}\n\n...`;
```

**Step 3: Update `logSentenceTestResult`**

```typescript
export const logSentenceTestResult = (
  logFile: string | undefined,
  id: string,
  status: string,
  startTime?: number,
): void => {
  if (!logFile) return;
  fs.appendFileSync(logFile, `${formatTimestamp(startTime)} [SENTENCE] #${id}: ${status}\n`);
};
```

**Step 4: Update `logRuleTestResult`**

```typescript
export const logRuleTestResult = (
  logFile: string | undefined,
  title: string,
  status: string,
  startTime?: number,
): void => {
  if (!logFile) return;
  fs.appendFileSync(logFile, `${formatTimestamp(startTime)} [RULE] "${title}": ${status}\n`);
};
```

**Step 5: Update `logVocabularyAdded`**

```typescript
export const logVocabularyAdded = (
  logFile: string | undefined,
  entries: { meaning: string; foreignForm: string }[],
  startTime?: number,
): void => {
  if (!logFile || entries.length === 0) return;
  const mappings = entries.map((e) => `  ${e.meaning} → ${e.foreignForm}`).join('\n');
  fs.appendFileSync(logFile, `${formatTimestamp(startTime)} ### Vocabulary Added (${entries.length} entries)\n\n${mappings}\n\n`);
};
```

**Step 6: Update `logVocabularyUpdated`, `logVocabularyRemoved`, `logVocabularyCleared`**

Same pattern: add `startTime?: number` param, prepend `${formatTimestamp(startTime)} ` to the content string.

**Step 7: Update `logVerificationResults`**

```typescript
export const logVerificationResults = (
  logFile: string | undefined,
  sectionTitle: string,
  feedback: { ... },
  allRuleTitles: string[],
  startTime?: number,
): void => {
  if (!logFile) return;
  let content = `${formatTimestamp(startTime)} ## ${sectionTitle}\n\n`;
  // ... rest unchanged
```

**Step 8: Verify types compile**

Run: `npx tsc --noEmit`

**Step 9: Commit**

```
Add timestamps to markdown log functions
```

---

### Task 6: Pass `startTime` to markdown log call sites

**Files:**
- Modify: `src/mastra/workflow/workflow.ts` (calls to `logAgentOutput`, `logValidationError`, `logVerificationResults`)
- Modify: `src/mastra/workflow/vocabulary-tools.ts` (calls to `logVocabularyAdded`, etc.)
- Modify: `src/mastra/workflow/03a-sentence-tester-tool.ts` (call to `logSentenceTestResult`)
- Modify: `src/mastra/workflow/03a-rule-tester-tool.ts` (call to `logRuleTestResult`)

**Step 1: Update `workflow.ts` call sites**

Find every call to `logAgentOutput(logFile, ...)` and append `state.workflowStartTime` (or `workflowStartTime` in extraction step) as the last argument.

Find every call to `logValidationError(logFile, ...)` and append the start time.

Find every call to `logVerificationResults(logFile, ...)` and append the start time.

**Step 2: Update `vocabulary-tools.ts` call sites**

Each vocab tool already gets `const startTime = getWorkflowStartTime(ctx?.requestContext)` (from Task 4). Pass it to the log functions:
- `logVocabularyAdded(logFile, addedEntries, startTime)` (was `logVocabularyAdded(logFile, addedEntries)`)
- `logVocabularyUpdated(logFile, updatedEntries, startTime)`
- `logVocabularyRemoved(logFile, removedForms, startTime)`
- `logVocabularyCleared(logFile, removed, startTime)`

**Step 3: Update tester tool call sites**

- `03a-sentence-tester-tool.ts`: `logSentenceTestResult(logFile, id, agentResult.overallStatus, wfStartTime)`
- `03a-rule-tester-tool.ts`: `logRuleTestResult(logFile, rule.title, ruleResult.status, wfStartTime)`

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
Pass startTime to all markdown log call sites
```

---

### Task 7: Timestamp retry warnings in `agent-utils.ts`

**Files:**
- Modify: `src/mastra/workflow/agent-utils.ts`

These functions don't have access to RequestContext, so use wall-clock-only timestamps.

**Step 1: Add import**

```typescript
import { formatTimestamp } from './logging-utils';
```

**Step 2: Update `generateWithRetry` warning (line ~139-141)**

```typescript
console.warn(
  `${formatTimestamp()} [generateWithRetry] Attempt ${attempt + 1} failed: ${lastError.message}. ` +
    `Retrying in ${delayMs / 1000} seconds... (${maxRetries - attempt} retries remaining)`,
);
```

**Step 3: Update `streamWithRetry` warning (line ~308-310)**

Same pattern with `${formatTimestamp()}`.

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
Add wall-clock timestamps to retry warnings in agent-utils
```

---

### Task 8: Final verification

**Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing CSS module error.

**Step 2: Squash-commit if needed, push**

All changes should be committed from previous tasks. Push.
