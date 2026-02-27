# Sub-Agent Timeout Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three bugs causing all agents after Step 1 to time out: missing `requestContext` on sub-agent calls, `Promise.race` resource leak in `generateWithRetry`, and lack of validation for required context.

**Architecture:** Thread `requestContext` from parent tool context into sub-agent `generateWithRetry` calls. Replace `Promise.race` with `AbortController` + `abortSignal` so abandoned agent calls are actually cancelled. Add `requestContextSchema` to sub-agents for fail-fast validation.

**Tech Stack:** Mastra (Agent, createTool, RequestContext, requestContextSchema), Zod, Node.js AbortController/AbortSignal

---

## Background

### The Problem

Sub-agents (`wf03-rule-tester`, `wf03-sentence-tester`) always use the slow `TESTING_MODEL` (`alibaba/tongyi-deepresearch-30b-a3b`) regardless of model mode, because `requestContext` is never passed to them. When the 10-minute timeout fires, `Promise.race` abandons the promise but doesn't cancel the LLM call — the agent keeps running in the background.

### Architecture

```
workflow.ts → generateWithRetry (10 min timeout, passes requestContext)
  └── parent agent.generate(maxSteps: 100, requestContext: ✓)
        ├── vocab tools (fast, no LLM)
        ├── testRule tool → executeRuleTest() → generateWithRetry → wf03-rule-tester (requestContext: ✗ BUG)
        └── testSentence tool → executeSentenceTest() → generateWithRetry → wf03-sentence-tester (requestContext: ✗ BUG)
```

### Key Files

- `src/mastra/03-per-rule-per-sentence-delegation/agent-utils.ts` — `generateWithRetry` (86 lines)
- `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts` — `executeRuleTest` + 2 tools (269 lines)
- `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts` — `executeSentenceTest` + 2 tools (312 lines)
- `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-agent.ts` — sub-agent definition (58 lines)
- `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-agent.ts` — sub-agent definition (88 lines)
- `src/mastra/03-per-rule-per-sentence-delegation/request-context-helpers.ts` — context helpers (124 lines)
- `src/mastra/03-per-rule-per-sentence-delegation/request-context-types.ts` — context types (45 lines)
- `src/mastra/openrouter.ts` — model config (20 lines)

---

## Task 1: Add `requestContextSchema` to sub-agents

Add Zod validation schemas to `wf03-rule-tester` and `wf03-sentence-tester` agents so they throw `MastraError` immediately if `requestContext` is missing or invalid, before making any LLM call.

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-agent.ts`
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-agent.ts`

**Step 1: Add `requestContextSchema` to rule tester agent**

In `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-agent.ts`:

Add import for zod at the top:

```typescript
import { z } from 'zod';
```

Add `requestContextSchema` to the Agent constructor (after `tools: {}`):

```typescript
requestContextSchema: z.object({
  'model-mode': z.enum(['testing', 'production']),
}),
```

The full agent definition becomes:

```typescript
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { openrouter, TESTING_MODEL } from '../openrouter';

// ... RULE_TESTER_SYSTEM_PROMPT unchanged ...

export const ruleTesterAgent = new Agent({
  id: 'wf03-rule-tester',
  name: '[03-3a-tool] Rule Tester Agent',
  instructions: RULE_TESTER_SYSTEM_PROMPT,
  model: ({ requestContext }) =>
    openrouter(
      requestContext?.get('model-mode') === 'production' ? 'openai/gpt-5-mini' : TESTING_MODEL,
    ),
  tools: {},
  requestContextSchema: z.object({
    'model-mode': z.enum(['testing', 'production']),
  }),
});
```

**Step 2: Add `requestContextSchema` to sentence tester agent**

In `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-agent.ts`:

Same pattern — add `import { z } from 'zod';` and add `requestContextSchema` after `tools: {}`:

```typescript
requestContextSchema: z.object({
  'model-mode': z.enum(['testing', 'production']),
}),
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors (pre-existing `globals.css` and `streamdown/styles.css` errors are OK).

**Step 4: Commit**

```
Add requestContextSchema to sub-agents for fail-fast validation
```

---

## Task 2: Thread `requestContext` through sub-agent tool calls

Pass `requestContext` from the parent tool's context into `executeRuleTest` and `executeSentenceTest`, then forward it to `generateWithRetry` options.

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts`
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts`

**Step 1: Add `requestContext` to `ExecuteRuleTestParams` and `executeRuleTest`**

In `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts`:

Add import for `RequestContext`:

```typescript
import { RequestContext } from '@mastra/core/server';
```

Add `requestContext` to the `ExecuteRuleTestParams` interface (line 66-73). Add after `logFile?`:

```typescript
requestContext?: RequestContext;
```

In the `executeRuleTest` function, destructure the new param (line 79-86). Add `requestContext` to the destructured params.

In the `generateWithRetry` call inside `executeRuleTest` (lines 129-137), add `requestContext` to the options:

```typescript
const result = await generateWithRetry(mastra.getAgentById('wf03-rule-tester'), {
  prompt,
  options: {
    maxSteps: 100,
    requestContext,
    structuredOutput: {
      schema: ruleTestSuccessSchema,
    },
  },
});
```

**Step 2: Forward `requestContext` from both tool execute functions**

In `testRuleTool.execute` (line 175-203), forward `ctx.requestContext` to `executeRuleTest`:

```typescript
const result = await executeRuleTest({
  rule: { title, description },
  allRules,
  structuredProblem,
  vocabulary,
  mastra: ctx.mastra!,
  ...(logFile !== undefined && { logFile }),
  requestContext: ctx.requestContext as RequestContext | undefined,
});
```

In `testRuleWithRulesetTool.execute` (line 230-268), same pattern:

```typescript
const result = await executeRuleTest({
  rule: {
    title: rule.title,
    description: rule.description,
    ...(rule.confidence !== undefined && { confidence: rule.confidence }),
  },
  allRules,
  structuredProblem,
  vocabulary,
  mastra: ctx.mastra!,
  ...(logFile !== undefined && { logFile }),
  requestContext: ctx.requestContext as RequestContext | undefined,
});
```

**Step 3: Same changes for sentence tester tool**

In `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts`:

Add import for `RequestContext`:

```typescript
import { RequestContext } from '@mastra/core/server';
```

Add `requestContext?: RequestContext` to `ExecuteSentenceTestParams` interface (line 78-89).

Destructure `requestContext` in `executeSentenceTest` function (line 95-106).

Add `requestContext` to the `generateWithRetry` options inside `executeSentenceTest` (lines 130-138):

```typescript
const result = await generateWithRetry(mastra.getAgentById('wf03-sentence-tester'), {
  prompt,
  options: {
    maxSteps: 100,
    requestContext,
    structuredOutput: {
      schema: agentResponseSchema,
    },
  },
});
```

Forward `requestContext` from `testSentenceTool.execute` (line 200-236):

```typescript
const result = await executeSentenceTest({
  id,
  content,
  sourceLanguage,
  targetLanguage,
  ...(expectedTranslation !== undefined && { expectedTranslation }),
  rules,
  problemContext,
  vocabulary,
  mastra: ctx.mastra!,
  ...(logFile !== undefined && { logFile }),
  requestContext: ctx.requestContext as RequestContext | undefined,
});
```

Forward `requestContext` from `testSentenceWithRulesetTool.execute` (line 270-311):

```typescript
const result = await executeSentenceTest({
  id,
  content,
  sourceLanguage,
  targetLanguage,
  ...(expectedTranslation !== undefined && { expectedTranslation }),
  rules,
  problemContext: structuredProblem.context,
  vocabulary,
  mastra: ctx.mastra!,
  ...(logFile !== undefined && { logFile }),
  requestContext: ctx.requestContext as RequestContext | undefined,
});
```

**Step 4: Verify `RequestContext` import path**

The import `import { RequestContext } from '@mastra/core/server';` should be correct for Mastra v1. If `tsc` complains, check the actual export path. It may also be `@mastra/core` directly. Search `node_modules/@mastra/core` for `RequestContext` export if needed.

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 6: Commit**

```
Thread requestContext into sub-agent generateWithRetry calls
```

---

## Task 3: Replace `Promise.race` with `AbortController` in `generateWithRetry`

Replace the bare `Promise.race` + `setTimeout` pattern with `AbortController` that actually cancels the LLM call on timeout. Accept an optional caller `abortSignal` and merge it with the internal timeout signal using `AbortSignal.any()`.

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/agent-utils.ts`

**Step 1: Rewrite `generateWithRetry`**

Replace the entire content of `agent-utils.ts` with:

```typescript
import type { Agent } from '@mastra/core/agent';

interface GenerateWithRetryOptions<TOptions> {
  prompt: string;
  options?: TOptions;
  timeoutMs?: number; // Default: 600,000 (10 minutes)
  maxRetries?: number; // Default: 2 (3 total attempts)
  abortSignal?: AbortSignal; // Caller-provided abort signal
}

/**
 * Wrapper around Agent.generate with timeout and retry logic.
 *
 * - Timeout: Aborts the request via AbortController if it takes longer than timeoutMs
 * - Retries: Retries up to maxRetries times on transient errors
 * - AbortSignal: Accepts optional caller signal; merged with internal timeout signal
 *   via AbortSignal.any() so either can cancel the operation
 *
 * @throws After all retries are exhausted, or if the caller signal aborts
 */
export async function generateWithRetry<TOptions extends Parameters<Agent['generate']>[1]>(
  agent: Agent,
  {
    prompt,
    options,
    timeoutMs = 600_000,
    maxRetries = 2,
    abortSignal: callerSignal,
  }: GenerateWithRetryOptions<TOptions>,
): Promise<Awaited<ReturnType<Agent['generate']>>> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // If the caller has already aborted, don't start another attempt
    callerSignal?.throwIfAborted();

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // Merge caller signal (if any) with our timeout signal
    const mergedSignal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const result = await agent.generate(prompt, {
        ...options,
        abortSignal: mergedSignal,
      } as TOptions);

      // Clean up timeout on success
      clearTimeout(timeoutId);

      // Check for empty response - this should trigger a retry
      // When structuredOutput is provided, check result.object; otherwise check result.text
      const hasStructuredOutput =
        options && typeof options === 'object' && 'structuredOutput' in options;

      if (hasStructuredOutput) {
        if (result.object === null || result.object === undefined) {
          throw new Error('Empty response from model');
        }
      } else {
        if (!result.text || result.text.trim() === '') {
          throw new Error('Empty response from model');
        }
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      lastError = error instanceof Error ? error : new Error(String(error));

      // If the caller aborted, don't retry — propagate immediately
      if (callerSignal?.aborted) {
        throw lastError;
      }

      // Normalize abort errors from timeout into a timeout message
      if (timeoutController.signal.aborted && lastError.name === 'AbortError') {
        lastError = new Error(`Timeout after ${timeoutMs}ms`);
      }

      // Check if this is a retryable error
      const isRetryable =
        lastError.name === 'AI_APICallError' ||
        lastError.message.includes('Provider returned error') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('Timeout') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('fetch failed') ||
        lastError.message.includes('network') ||
        lastError.message.includes('Empty response from model');

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff (5s, 10s, 15s)
      const delayMs = 5000 * (attempt + 1);

      console.warn(
        `[generateWithRetry] Attempt ${attempt + 1} failed: ${lastError.message}. ` +
          `Retrying in ${delayMs / 1000} seconds... (${maxRetries - attempt} retries remaining)`,
      );

      // Wait before retrying (also respect caller abort during backoff)
      await new Promise<void>((resolve, reject) => {
        const backoffTimeout = setTimeout(resolve, delayMs);
        callerSignal?.addEventListener(
          'abort',
          () => {
            clearTimeout(backoffTimeout);
            reject(callerSignal.reason);
          },
          { once: true },
        );
      });
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error('Unknown error in generateWithRetry');
}
```

Key changes from the original:

1. `AbortController` created per attempt — `clearTimeout` on success or error
2. `abortSignal` passed to `agent.generate()` so Mastra cancels the LLM call
3. `AbortSignal.any()` merges caller signal with timeout signal (Node 20+, project requires >= 22.13.0)
4. Caller abort propagates immediately without retry
5. Timeout abort is normalized to a `Timeout after Xms` error message for consistent retry detection
6. Backoff `setTimeout` is also cancellable via caller signal

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors. The `TOptions` generic may need minor adjustment if the spread `{ ...options, abortSignal }` causes type issues. If so, cast as shown: `as TOptions`.

**Step 3: Commit**

```
Replace Promise.race with AbortController in generateWithRetry
```

---

## Task 4: Verify end-to-end

**Step 1: Run type checker**

Run: `npx tsc --noEmit`
Expected: Only pre-existing CSS module errors.

**Step 2: Manual smoke test**

Run: `npm run dev`

Open the UI at http://localhost:3000. Submit a problem in testing mode. Observe:

- Step 1 (extractor) should complete quickly as before
- Step 2 (hypothesiser) should now use the correct model for sub-agent calls
- If a timeout occurs, the console should show that the abort signal was triggered (no more "zombie" agents continuing after timeout)
- The `requestContextSchema` validation should fire if `requestContext` is somehow not passed

**Step 3: Check sub-agent model selection**

Look in console output for model selection logs. Both testing and production modes should now correctly propagate to sub-agents. In testing mode, sub-agents use `TESTING_MODEL`; in production mode, they use `openai/gpt-5-mini`.

**Step 4: Commit any fixes from smoke testing**

If any issues are found during smoke testing, fix and commit individually.
