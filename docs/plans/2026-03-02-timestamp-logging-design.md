# Timestamp Logging Design

## Goal

Add `[HH:MM:SS +N.Ns]` timestamps to all console and markdown log lines so hangs and timeouts are immediately visible.

## Format

```
[14:32:07 +0.0s] [VOCAB:ADD] Added 5, total 5
[14:32:09 +2.1s] [RULES:ADD] Added 3, total 3
[14:32:22 +14.7s] [TOOL:testSentence] Starting...
[14:32:34 +27.3s] [TOOL:testSentence] Complete [12.6s — PASS]
```

Wall clock (HH:MM:SS) + elapsed since workflow start (+N.Ns).

## Approach

1. Add `formatTimestamp(startTime: number): string` to `logging-utils.ts`
2. Add `workflow-start-time: number` to `WorkflowRequestContext`
3. Set it in `workflow.ts` at workflow start
4. Prepend timestamp to every console.log/warn/error and markdown file write

## Files

| File | Log type | Lines affected |
|------|----------|---------------|
| `logging-utils.ts` | New utility + markdown writes | `logAgentOutput`, `logValidationError`, `logSentenceTestResult`, `logRuleTestResult`, `logVocabulary*` |
| `request-context-types.ts` | Type addition | Add `workflow-start-time` key |
| `workflow.ts` | Console (11 lines) | Step/round/convergence lifecycle logs |
| `vocabulary-tools.ts` | Console (5 lines) | `[VOCAB:*]` logs |
| `rules-tools.ts` | Console (5 lines) | `[RULES:*]` logs |
| `03a-sentence-tester-tool.ts` | Console (3 lines) | `[TOOL:testSentence]` logs |
| `03a-rule-tester-tool.ts` | Console (3 lines) | `[TOOL:testRule]` logs |
| `agent-utils.ts` | Console (2 lines) | `[generateWithRetry]`, `[streamWithRetry]` (wall-clock only, no RequestContext) |
