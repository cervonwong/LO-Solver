# Quick Task 3: Fix STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED errors caused by Zod v3/v4 conflict - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Task Boundary

Fix STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED errors occurring during testRule and testSentence tool executions. Root cause is zod@4.3.6 installed but @mastra/core and AI SDK require zod@^3.23.8. The incompatibility causes structured output schema validation to fail silently or misbehave.

</domain>

<decisions>
## Implementation Decisions

### Zod Version Strategy
- Downgrade to zod v3 (change package.json to zod@^3.23.8)
- Most compatible with @mastra/core and AI SDK
- Clean npm install after version change

### Schema Resilience
- Fix zod version only, keep existing schemas strict
- The z.literal(true)/z.literal(false) discriminated unions in tester tools are correct design
- Failures are caused by zod v4 incompatibility, not bad schema design

### Verification Approach
- Run npx tsc --noEmit and npm run build to confirm no regressions
- No eval run needed — type-check + build is sufficient

### Claude's Discretion
- None — all areas discussed

</decisions>

<specifics>
## Specific Ideas

- Files importing zod: workflow-schemas.ts, 03a-rule-tester-tool.ts, 03a-sentence-tester-tool.ts, rules-tools.ts, vocabulary-tools.ts, logging-utils.ts, mcp-tool-bridge.ts, zero-shot-solver.ts
- npm ls shows multiple "invalid" zod resolutions under @mastra/core
- No npm overrides currently configured

</specifics>
