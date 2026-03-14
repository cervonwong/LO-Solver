---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mastra/workflow/steps/01-extract.ts
  - src/mastra/workflow/steps/02a-dispatch.ts
  - src/mastra/workflow/steps/02b-hypothesize.ts
  - src/mastra/workflow/steps/02c-verify.ts
  - src/mastra/workflow/steps/02d-synthesize.ts
  - src/mastra/workflow/steps/03-answer.ts
autonomous: true
requirements: [QUICK-5]

must_haves:
  truths:
    - "Token count accumulates correctly across all workflow steps"
    - "Cost update events include non-zero cumulativeTokens when LLM calls return token usage"
  artifacts:
    - path: "src/mastra/workflow/steps/01-extract.ts"
      provides: "Token extraction for extract step"
      contains: "extractTokensFromResult"
    - path: "src/mastra/workflow/steps/02a-dispatch.ts"
      provides: "Token extraction for dispatch steps"
      contains: "extractTokensFromResult"
    - path: "src/mastra/workflow/steps/02b-hypothesize.ts"
      provides: "Token extraction for hypothesize step"
      contains: "extractTokensFromResult"
    - path: "src/mastra/workflow/steps/02c-verify.ts"
      provides: "Token extraction for verify step"
      contains: "extractTokensFromResult"
    - path: "src/mastra/workflow/steps/02d-synthesize.ts"
      provides: "Token extraction for synthesize step"
      contains: "extractTokensFromResult"
    - path: "src/mastra/workflow/steps/03-answer.ts"
      provides: "Token extraction for answer step"
      contains: "extractTokensFromResult"
  key_links:
    - from: "all step files"
      to: "request-context-helpers.ts"
      via: "extractTokensFromResult import"
      pattern: "extractTokensFromResult"
    - from: "extractTokensFromResult result"
      to: "updateCumulativeCost 4th argument"
      via: "callTokens parameter"
      pattern: "updateCumulativeCost.*callTokens"
---

<objective>
Wire `extractTokensFromResult()` into all workflow step files so that token counts are passed to `updateCumulativeCost()` and propagated to the frontend via `data-cost-update` events.

Purpose: The Claude Code cost estimator UI shows token count as 0 because `extractTokensFromResult()` exists in `request-context-helpers.ts` but is never called from any step file. The `updateCumulativeCost()` function already accepts an optional `callTokens` 4th argument and accumulates it into `cumulative-tokens` in RequestContext, but no caller passes it.

Output: All 10 `updateCumulativeCost()` call sites across 6 step files pass token counts extracted from agent responses.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/mastra/workflow/request-context-helpers.ts (extractTokensFromResult at line 240, updateCumulativeCost at line 262)

<interfaces>
<!-- Key functions the executor needs -->

From src/mastra/workflow/request-context-helpers.ts:
```typescript
export function extractCostFromResult(result: AgentResultCostInfo): number;
export function extractTokensFromResult(result: AgentResultCostInfo): { input: number; output: number };
export async function updateCumulativeCost(
  requestContext: RequestContextReadWrite,
  writer: StepWriter | undefined,
  callCost: number,
  callTokens?: { input: number; output: number },
): Promise<void>;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire extractTokensFromResult into all workflow step files</name>
  <files>
    src/mastra/workflow/steps/01-extract.ts,
    src/mastra/workflow/steps/02a-dispatch.ts,
    src/mastra/workflow/steps/02b-hypothesize.ts,
    src/mastra/workflow/steps/02c-verify.ts,
    src/mastra/workflow/steps/02d-synthesize.ts,
    src/mastra/workflow/steps/03-answer.ts
  </files>
  <action>
For each of the 6 step files, apply two changes:

1. **Add `extractTokensFromResult` to the import** from `../request-context-helpers` (it is already exported, just not imported by step files). Add it alongside the existing `extractCostFromResult` import.

2. **At each `updateCumulativeCost` call site**, add a `const callTokens = extractTokensFromResult(response)` line immediately after the corresponding `extractCostFromResult` call, then pass `callTokens` as the 4th argument to `updateCumulativeCost`.

Specific call sites (10 total):

**01-extract.ts** (1 site):
- Line 91-92: After `const callCost = extractCostFromResult(response);`, add `const callTokens = extractTokensFromResult(response);` and change `updateCumulativeCost(requestContext, writer, callCost)` to `updateCumulativeCost(requestContext, writer, callCost, callTokens)`.

**02a-dispatch.ts** (2 sites):
- Line 80-81: After `const dispatchCost = extractCostFromResult(dispatcherResponse);`, add `const dispatchTokens = extractTokensFromResult(dispatcherResponse);` and pass as 4th arg.
- Line 188-189: After `const improverDispatchCost = extractCostFromResult(improverDispatcherResponse);`, add `const improverDispatchTokens = extractTokensFromResult(improverDispatcherResponse);` and pass as 4th arg.

**02b-hypothesize.ts** (1 site):
- Line 116-117: After `const hypCost = extractCostFromResult(hypothesizerResponse);`, add `const hypTokens = extractTokensFromResult(hypothesizerResponse);` and pass as 4th arg.

**02c-verify.ts** (2 sites):
- Line 97-98: After `const verifyCost = extractCostFromResult(verifierResponse);`, add `const verifyTokens = extractTokensFromResult(verifierResponse);` and pass as 4th arg.
- Line 172-173: After `const extractorCost = extractCostFromResult(extractorResponse);`, add `const extractorTokens = extractTokensFromResult(extractorResponse);` and pass as 4th arg.

**02d-synthesize.ts** (3 sites):
- Line 110-111: After `const synthesizerCost = extractCostFromResult(synthesizerResponse);`, add `const synthesizerTokens = extractTokensFromResult(synthesizerResponse);` and pass as 4th arg.
- Line 219-220: After `const convergenceCost = extractCostFromResult(convergenceVerifierResponse);`, add `const convergenceTokens = extractTokensFromResult(convergenceVerifierResponse);` and pass as 4th arg.
- Line 287-288: After `const convergenceExtractorCost = extractCostFromResult(convergenceExtractorResponse);`, add `const convergenceExtractorTokens = extractTokensFromResult(convergenceExtractorResponse);` and pass as 4th arg.

**03-answer.ts** (1 site):
- Line 102-103: After `const callCost = extractCostFromResult(answererResponse);`, add `const callTokens = extractTokensFromResult(answererResponse);` and pass as 4th arg.

Use consistent naming: `{variablePrefix}Tokens` matching the existing `{variablePrefix}Cost` pattern in each file.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>
    All 10 updateCumulativeCost call sites pass token data as 4th argument. extractTokensFromResult is imported in all 6 step files. TypeScript compiles cleanly (ignoring pre-existing globals.css error).
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
2. `grep -r "extractTokensFromResult" src/mastra/workflow/steps/` shows imports and usage in all 6 files
3. `grep -c "updateCumulativeCost.*Tokens" src/mastra/workflow/steps/*.ts` confirms all 10 call sites pass tokens
</verification>

<success_criteria>
- extractTokensFromResult is called after every extractCostFromResult call in all step files
- Every updateCumulativeCost call passes the extracted tokens as 4th argument
- TypeScript compiles without new errors
</success_criteria>

<output>
After completion, create `.planning/quick/5-fix-token-count-showing-0-in-claude-code/5-SUMMARY.md`
</output>
