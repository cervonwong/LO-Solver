# Simplify Tester Agent Output Schemas — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the rule tester and sentence tester agent structured output schemas from complex multi-field schemas to minimal `{passed, reasoning}` (+ `translation` for sentences), reducing LLM output complexity and eliminating the `success: literal(true)` bug.

**Architecture:** Replace the agent-facing schemas with minimal versions. Keep tool-level `success`/`error` discriminated unions (programmatic, not LLM-generated). Update all system prompts, frontend components, and logging that reference old field names.

**Tech Stack:** TypeScript, Zod, Next.js React components

---

### Task 1: Simplify rule tester schemas and tool code

**Files:**
- Modify: `src/mastra/workflow/03a-rule-tester-tool.ts`

**Step 1: Replace agent schema and tool schemas**

Replace lines 23-53 (the three schema definitions) with:

```ts
const ruleTestAgentSchema = z.object({
  passed: z.boolean().describe('Whether the rule correctly predicts all relevant dataset examples'),
  reasoning: z
    .string()
    .describe(
      '1-2 sentences explaining why the rule passed or failed, citing specific item IDs. If failed, include how to fix it.',
    ),
});

const ruleTestSuccessSchema = z.object({
  success: z.literal(true),
  passed: z.boolean(),
  reasoning: z.string(),
});

const ruleTestErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message describing what went wrong'),
});

const ruleTestResultSchema = z.discriminatedUnion('success', [
  ruleTestSuccessSchema,
  ruleTestErrorSchema,
]);
```

**Step 2: Update `executeRuleTest` to use the new agent schema**

In the `generateWithRetry` call (around line 155-158), change:
```ts
structuredOutput: {
  schema: ruleTestSuccessSchema,
},
```
to:
```ts
structuredOutput: {
  schema: ruleTestAgentSchema,
},
```

Update the result type (around line 161):
```ts
const ruleResult = result.object as z.infer<typeof ruleTestAgentSchema>;
```

Update the console.log status (around line 164) from `ruleResult.status` to:
```ts
`${ruleResult.passed ? 'PASS' : 'FAIL'}`
```

Update the log call (around line 169) from `ruleResult.status` to:
```ts
logRuleTestResult(logFile, rule.title, ruleResult.passed ? 'PASS' : 'FAIL', wfStartTime);
```

Update the `data-rule-test-result` event (around line 179) from `ruleResult.status === 'RULE_OK'` to:
```ts
passed: ruleResult.passed,
```

Update the return statement (around line 185) to wrap agent output:
```ts
return {
  success: true as const,
  passed: ruleResult.passed,
  reasoning: ruleResult.reasoning,
};
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css`
Expected: No new errors (only the pre-existing `globals.css` one)

**Step 4: Commit**

```
Simplify rule tester agent output schema to {passed, reasoning}
```

---

### Task 2: Simplify sentence tester schemas and tool code

**Files:**
- Modify: `src/mastra/workflow/03a-sentence-tester-tool.ts`

**Step 1: Replace agent schema and tool schemas**

Replace lines 25-73 (the `suggestionSchema`, `sentenceTestSuccessSchema`, `sentenceTestErrorSchema`, `sentenceTestResultSchema`, and `agentResponseSchema` definitions) with:

```ts
const sentenceTestAgentSchema = z.object({
  passed: z
    .boolean()
    .describe('Whether the sentence can be confidently and unambiguously translated using the ruleset'),
  translation: z.string().describe('The attempted translation, or empty string if not possible'),
  reasoning: z
    .string()
    .describe(
      'Explain the translation process step by step. Note any ambiguities, missing rules, or issues. If failed, suggest how to fix the rules.',
    ),
});

const sentenceTestSuccessSchema = z.object({
  success: z.literal(true),
  passed: z.boolean(),
  translation: z.string(),
  reasoning: z.string(),
  matchesExpected: z
    .boolean()
    .nullable()
    .describe('Whether the translation matches expected (null if no expected provided)'),
  expectedTranslation: z
    .string()
    .nullable()
    .describe('The expected translation for reference (null if not provided)'),
});

const sentenceTestErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message describing what went wrong'),
});

const sentenceTestResultSchema = z.discriminatedUnion('success', [
  sentenceTestSuccessSchema,
  sentenceTestErrorSchema,
]);
```

**Step 2: Update `executeSentenceTest` to use the new agent schema**

In the `generateWithRetry` call (around line 164-166), the schema reference is already `agentResponseSchema` — change to:
```ts
structuredOutput: {
  schema: sentenceTestAgentSchema,
},
```

Update the result type (around line 170):
```ts
const agentResult = result.object as z.infer<typeof sentenceTestAgentSchema>;
```

Update the console.log status (around line 173) from `agentResult.overallStatus` to:
```ts
`${agentResult.passed ? 'PASS' : 'FAIL'}`
```

Update the log call (around line 187) from `agentResult.overallStatus` to:
```ts
logSentenceTestResult(logFile, id, agentResult.passed ? 'PASS' : 'FAIL', wfStartTime);
```

Update the return statement (around lines 189-198) to:
```ts
return {
  success: true as const,
  passed: agentResult.passed,
  translation: agentResult.translation,
  reasoning: agentResult.reasoning,
  matchesExpected,
  expectedTranslation: expectedTranslation ?? null,
};
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css`
Expected: No new errors

**Step 4: Commit**

```
Simplify sentence tester agent output schema to {passed, translation, reasoning}
```

---

### Task 3: Update rule tester system prompt

**Files:**
- Modify: `src/mastra/workflow/03a-rule-tester-instructions.ts`

**Step 1: Replace the `<output_format>` and `<example>` sections**

Replace the `<output_format>` section (lines 14-28) with:

```
<output_format>
{
  "passed": "boolean - true if the rule correctly predicts all relevant dataset examples; false otherwise",
  "reasoning": "string - 1-2 sentences with SPECIFIC evidence. Cite item IDs (e.g., #1, #5). If the rule failed, explain what's wrong and suggest how to fix it."
}
</output_format>
```

Replace the `<example>` section (lines 38-44) with:

```
<example>
{
  "passed": false,
  "reasoning": "Rule states adjectives follow nouns, but item #5 'red house' = 'aka ie' shows 'aka' (red) preceding 'ie' (house). Items #2, #7, #9 follow the rule correctly. Fix: add exception for color adjectives, which precede nouns."
}
</example>
```

**Step 2: Commit**

```
Update rule tester system prompt for simplified schema
```

---

### Task 4: Update sentence tester system prompt

**Files:**
- Modify: `src/mastra/workflow/03a-sentence-tester-instructions.ts`

**Step 1: Replace the `<output_format>` and `<example>` sections**

Replace the `<output_format>` section (lines 14-38) with:

```
<output_format>
{
  "passed": "boolean - true only if translation is unambiguous and deterministic; false if any ambiguity, missing rule, or issue exists",
  "translation": "string - best attempt at translation, even if ambiguous or incomplete",
  "reasoning": "string - step-by-step explanation of the translation process. Note any ambiguities, missing rules, or issues. If failed, suggest specific improvements to the ruleset, citing rules and item IDs."
}
</output_format>
```

Replace the `<example>` section (lines 48-75) with:

```
<example>
{
  "passed": false,
  "translation": "kala-ri na-tu (best guess)",
  "reasoning": "Step 1: 'kala' found in vocabulary as 'fish'. Step 2: Applied Rule 3 plural '-ri' → 'kala-ri'. Step 3: 'tu' not in vocabulary — guessed from similar pattern in item #4. Issues: (1) Rule 3 says plurals use '-ri' but doesn't specify if it applies to verb objects — items #2, #6, #8 show it does, so add this clarification. (2) Word 'tu' missing from vocabulary — likely means 'water' based on context in items #4, #7."
}
</example>
```

**Step 2: Commit**

```
Update sentence tester system prompt for simplified schema
```

---

### Task 5: Update verifier orchestrator system prompt

**Files:**
- Modify: `src/mastra/workflow/03a-verifier-orchestrator-instructions.ts`

**Step 1: Update tool descriptions**

Replace line 11:
```
testRule: Test a single rule against the dataset. Provide the rule's title and description. Returns status, reasoning, and recommendation.
```
with:
```
testRule: Test a single rule against the dataset. Provide the rule's title and description. Returns {passed: boolean, reasoning: string}.
```

Replace lines 13:
```
testSentence: Test a single sentence translation. Provide the sentence's id, content, sourceLanguage, targetLanguage, and optionally expectedTranslation. Returns translation attempt, ambiguities, and suggestions.
```
with:
```
testSentence: Test a single sentence translation. Provide the sentence's id, content, sourceLanguage, targetLanguage, and optionally expectedTranslation. Returns {passed: boolean, translation: string, reasoning: string}.
```

**Step 2: Update Rule Testing Results section**

Replace line 40:
```
**Rule Testing Results**: For each rule: title, status (PASSED / FAILED / PASSED WITH WARNINGS), and if failed, which sentences showed problems and why.
```
with:
```
**Rule Testing Results**: For each rule: title, passed (true/false), and if failed, the reasoning from the tool output.
```

**Step 3: Commit**

```
Update verifier orchestrator prompt for simplified tester output
```

---

### Task 6: Update hypothesizer and improver instruction references

**Files:**
- Modify: `src/mastra/workflow/02-initial-hypothesizer-instructions.ts:21`
- Modify: `src/mastra/workflow/03b-rules-improver-instructions.ts:17,19`

**Step 1: Update initial hypothesizer tool description**

Replace line 21:
```
testRule: Tests a single rule against the dataset using your proposed ruleset. Provide the rule to test plus your entire draft ruleset for context. Returns status (RULE_OK, RULE_WRONG, etc.), reasoning, and recommendations.
```
with:
```
testRule: Tests a single rule against the dataset using your proposed ruleset. Provide the rule to test plus your entire draft ruleset for context. Returns {passed: boolean, reasoning: string}.
```

Replace line 23:
```
testSentence: Tests translation of a sentence using your proposed ruleset. Provide sentence details (id, content, languages) plus your entire draft ruleset. Returns whether it translates correctly, ambiguities, and suggestions.
```
with:
```
testSentence: Tests translation of a sentence using your proposed ruleset. Provide sentence details (id, content, languages) plus your entire draft ruleset. Returns {passed: boolean, translation: string, reasoning: string}.
```

**Step 2: Update improver tool description**

Replace line 17:
```
testRule: Tests a single rule against the dataset. Provide the rule to test plus your entire revised ruleset for context. Returns status (RULE_OK, RULE_WRONG, etc.), reasoning, and recommendations.
```
with:
```
testRule: Tests a single rule against the dataset. Provide the rule to test plus your entire revised ruleset for context. Returns {passed: boolean, reasoning: string}.
```

Replace line 19:
```
testSentence: Tests translation of a sentence. Provide sentence details (id, content, languages) plus your entire revised ruleset. Returns whether it translates correctly, ambiguities, and suggestions.
```
with:
```
testSentence: Tests translation of a sentence. Provide sentence details (id, content, languages) plus your entire revised ruleset. Returns {passed: boolean, translation: string, reasoning: string}.
```

**Step 3: Commit**

```
Update hypothesizer and improver prompts for simplified tester output
```

---

### Task 7: Update MCP tool descriptions

**Files:**
- Modify: `src/mastra/mcp/mcp-tool-descriptions.ts:27,29,31`

**Step 1: Update all four tool descriptions**

Replace lines 27, 29, and 31 with:

Line 27 (`testRuleWithRuleset`):
```
'Test a single rule against the dataset using a provided draft ruleset. Pass the rule to test plus your entire proposed ruleset for context. Returns {success, passed, reasoning}.',
```

Line 29 (`testSentence`):
```
'Test a sentence translation using committed rules from the store. Spawns a sub-agent for blind translation. Returns {success, passed, translation, reasoning, matchesExpected}.',
```

Line 31 (`testSentenceWithRuleset`):
```
'Test a sentence translation using a provided draft ruleset. Pass sentence details plus your entire proposed ruleset. Returns {success, passed, translation, reasoning, matchesExpected}.',
```

Also check if there's a `testRule` entry (around line 25-26) and update it similarly.

**Step 2: Commit**

```
Update MCP tool descriptions for simplified tester output
```

---

### Task 8: Update frontend components

**Files:**
- Modify: `src/components/trace/specialized-tools.tsx:140-141,197-203,247-250`
- Modify: `src/lib/trace-utils.ts:404-405`

**Step 1: Update `SentenceTestCard`**

At line 140-141, replace:
```ts
const overallStatus = result.overallStatus as string | undefined;
const passed = overallStatus === 'SENTENCE_OK';
```
with:
```ts
const passed = result.passed as boolean | undefined ?? false;
```

**Step 2: Update `BulkToolCallGroup` pass/fail counting**

At lines 195-205, replace the rule/sentence branching:
```ts
const isRule = isRuleTestTool(tc.data.toolName);
if (isRule) {
  const status = tc.data.result.status as string | undefined;
  if (status === 'RULE_OK') passCount++;
  else failCount++;
} else {
  // Sentence test uses overallStatus field
  const overallStatus = tc.data.result.overallStatus as string | undefined;
  if (overallStatus === 'SENTENCE_OK') passCount++;
  else failCount++;
}
```
with:
```ts
if (tc.data.result.passed) passCount++;
else failCount++;
```

**Step 3: Update `RuleTestCard`**

At lines 247-250, replace:
```ts
const status = result.status as string | undefined;
const passed = status === 'RULE_OK';
const reasoning = result.reasoning as string | undefined;
const recommendation = result.recommendation as string | undefined;
```
with:
```ts
const passed = result.passed as boolean | undefined ?? false;
const reasoning = result.reasoning as string | undefined;
```

Remove any rendering of `recommendation` as a separate field (it's now part of `reasoning`). Check if the component JSX references `recommendation` and remove those references.

**Step 4: Update `trace-utils.ts`**

At lines 403-406, replace:
```ts
if (name === 'testRule' || name === 'testRuleWithRuleset') {
  const status = tc.data.result.status as string | undefined;
  if (status === 'RULE_OK') testResults.pass++;
  else testResults.fail++;
}
```
with:
```ts
if (name === 'testRule' || name === 'testRuleWithRuleset') {
  if (tc.data.result.passed) testResults.pass++;
  else testResults.fail++;
}
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css`
Expected: No new errors

**Step 6: Commit**

```
Update frontend components for simplified tester output schemas
```

---

### Task 9: Final verification

**Step 1: Full grep for old field names**

Run: `grep -rn 'RULE_OK\|RULE_WRONG\|RULE_INCONSISTENT\|RULE_UNCLEAR\|RULE_NEEDS_UPDATE\|RULE_NEW_NEEDED\|SENTENCE_OK\|SENTENCE_AMBIGUOUS\|SENTENCE_UNTRANSLATABLE\|overallStatus\|canTranslate\|\.recommendation' src/`

Expected: No matches (except possibly in unrelated code). Any remaining references are missed update sites.

**Step 2: Type check**

Run: `npx tsc --noEmit 2>&1 | grep -v globals.css`
Expected: No new errors

**Step 3: Commit (if any cleanup was needed)**

```
Clean up remaining references to old tester schema fields
```
