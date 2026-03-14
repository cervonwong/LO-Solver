# Simplify Tester Agent Output Schemas

**Date:** 2026-03-14
**Problem:** The rule tester and sentence tester agents have overly complex structured output schemas. The rule tester uses `success: literal(true)` in its agent schema (which the LLM frequently fails to output), and both schemas have fields that are redundant given how results are consumed downstream.

**Key insight:** Every downstream consumer (logging, frontend, verifier feedback extractor) reduces both schemas to pass/fail. The detailed status enums and nested suggestion objects only exist as an intermediate representation read by the orchestrator LLM, which paraphrases them into natural language anyway.

## Design

### Agent Output Schemas (what the LLM fills via structuredOutput)

**Rule tester** (4 fields → 2):

```ts
// Before: ruleTestSuccessSchema (includes success: literal(true))
{ success: true, status: 6-value enum, reasoning: string, recommendation: string }

// After: ruleTestAgentSchema (no success, no enum)
{ passed: boolean, reasoning: string }
```

- `passed` replaces `status === 'RULE_OK'`
- `reasoning` absorbs `recommendation` — the agent naturally explains what's wrong and how to fix it

**Sentence tester** (5 fields → 3):

```ts
// Before: agentResponseSchema
{ canTranslate: boolean, translation: string, ambiguities: string[],
  suggestions: [{suggestion, likelihood, reasoning}],
  overallStatus: 'SENTENCE_OK' | 'SENTENCE_AMBIGUOUS' | 'SENTENCE_UNTRANSLATABLE' }

// After: sentenceTestAgentSchema
{ passed: boolean, translation: string, reasoning: string }
```

- `passed` replaces both `canTranslate` and `overallStatus`
- `reasoning` absorbs `ambiguities` and `suggestions`

### Tool Output Schemas (programmatic, not LLM-generated)

**Rule tester tool:**

```ts
// Success (wraps agent output)
{ success: true, passed: boolean, reasoning: string }
// Error (catch block)
{ success: false, error: string }
```

**Sentence tester tool:**

```ts
// Success (wraps agent output + post-hoc comparison)
{ success: true, passed: boolean, translation: string, reasoning: string,
  matchesExpected: boolean | null, expectedTranslation: string | null }
// Error
{ success: false, error: string }
```

### Downstream Changes

- **Logging**: `logRuleTestResult` and `logSentenceTestResult` change from enum strings to `PASS`/`FAIL` based on the boolean.
- **Frontend `data-rule-test-result` event**: Already uses `passed: boolean` — no change.
- **`specialized-tools.tsx`**: `status === 'RULE_OK'` → `passed === true`.
- **System prompts to update:**
  1. `03a-rule-tester-instructions.ts` — output format: `passed` + `reasoning`
  2. `03a-sentence-tester-instructions.ts` — output format: `passed` + `translation` + `reasoning`
  3. `03a-verifier-orchestrator-instructions.ts` — update references to status values

### Files Changed

- `src/mastra/workflow/03a-rule-tester-tool.ts` — new agent schema, update tool schemas, update logging calls
- `src/mastra/workflow/03a-sentence-tester-tool.ts` — new agent schema, update tool schemas, update logging calls
- `src/mastra/workflow/03a-rule-tester-instructions.ts` — update output format
- `src/mastra/workflow/03a-sentence-tester-instructions.ts` — update output format
- `src/mastra/workflow/03a-verifier-orchestrator-instructions.ts` — update status references
- `src/mastra/workflow/logging-utils.ts` — update status parameter type/format
- `src/components/trace/specialized-tools.tsx` — update `RULE_OK` check to `passed`
- `src/components/trace/trace-utils.tsx` — update `RULE_OK` check to `passed`
