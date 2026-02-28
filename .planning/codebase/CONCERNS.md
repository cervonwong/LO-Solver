# Technical Concerns

## Known Issues

- **CSS module type declaration missing**: `src/app/layout.tsx` imports `./globals.css` which produces a TypeScript error (`Cannot find module './globals.css'`). This is a known pre-existing issue documented in CLAUDE.md and does not affect builds, but it means `npx tsc --noEmit` always reports one error, making it harder to detect real regressions.
- **Mastra tool writer is a silent no-op**: `ctx.writer?.custom()` inside tools running within workflow steps does nothing (Mastra does not pass outputWriter to tools in this context). The codebase works around this by passing the step writer through RequestContext via `step-writer` key and using `emitToolTraceEvent`. This is a framework-level limitation that could break if Mastra changes its internal context passing.
- **Non-null assertions on workflow `.map()` calls**: Both `workflow.ts` files use `inputData.data!` (line 816 in workflow 03, line 567 in workflow 02) after the extraction step's `.map()`. If the extraction step ever returns `data: null` despite `success: true`, these would throw at runtime. The bail logic should prevent this, but the assertion is unchecked.

## Technical Debt

| Area | Description | Severity |
|------|-------------|----------|
| Workflow 02 module-level mutable state | `02-extract-then-hypo-test-loop/workflow.ts` uses module-level `let` variables (`currentLogFile`, `workflowStartTime`, `lastStepEndTime`, `stepTimings`) for logging state. These are shared across all requests in the same process, causing data races if two workflows run concurrently. Workflow 03 fixed this by using workflow state and `RequestContext`. | High |
| Workflow 02 duplicated code | Workflow 02's `workflow.ts` (591 lines) contains its own copies of schemas, logging utilities, and formatting functions that are also defined in workflow 03's extracted modules (`workflow-schemas.ts`, `logging-utils.ts`). The schemas are slightly different (e.g., `rulesArraySchema` in WF02 lacks `confidence` field). | Medium |
| `as unknown as` type assertions | 15+ instances of `as unknown as ToolExecuteContext` across tool files (`vocabulary-tools.ts`, `03a-rule-tester-tool.ts`, `03a-sentence-tester-tool.ts`) and `as unknown as` casts in `page.tsx` and `activity-indicator.tsx`. These bypass type safety and indicate Mastra's tool context type does not expose `requestContext`, `mastra`, or `writer` fields in its public API, so the codebase works around this with unsafe casts. | Medium |
| `eslint-disable` comments | 4 instances of `eslint-disable-next-line react-hooks/exhaustive-deps` in `page.tsx` (lines 223, 297, 311, 327) and 3 instances of `@typescript-eslint/no-explicit-any` in `logging-utils.ts`. The `react-hooks` disables use `.length` as a proxy for array identity, which could miss updates if the array length doesn't change but contents do. | Medium |
| Hardcoded `maxSteps: 100` | Every `generateWithRetry` and direct `.generate()` call passes `maxSteps: 100`. This is scattered across 10+ call sites in `workflow.ts` and tool files with no centralized constant or configuration. | Low |
| `shared-memory.ts` is dead code | `generateWorkflowIds()` in `src/mastra/03-per-rule-per-sentence-delegation/shared-memory.ts` is never imported or used anywhere in the codebase. It is only referenced in a README. | Low |
| Commented-out model references | Multiple agent files contain commented-out `// model: openrouter('google/gemini-3-pro-preview')` lines (4 instances across WF03 agents). These are leftover from when agents used a fixed model before the `model-mode` dynamic model selection was implemented. | Low |

## Code Quality Observations

- **Inconsistent `UnicodeNormalizer` usage**: Most agents in WF03 include `UnicodeNormalizer` as an input processor, but `ruleTesterAgent` and `sentenceTesterAgent` (the tool-invoked agents) do not. These agents are called with prompts constructed in tool code, so the inconsistency may be intentional, but it is undocumented.
- **`requestContextSchema` inconsistency**: Only `ruleTesterAgent` and `sentenceTesterAgent` declare a `requestContextSchema`. All other WF03 agents access `requestContext` without schema validation. This means runtime errors from missing context keys would only be caught at the point of access, not at agent initialization.
- **Silent error swallowing**: In `page.tsx` line 85, the examples fetch uses `.catch(() => {})`, silently swallowing any error from the `/api/examples` endpoint. The user would see an empty examples dropdown with no indication of failure.
- **Duplicated `ModelMode` type**: The `ModelMode` type is defined in two places: `src/mastra/openrouter.ts` (`export type ModelMode`) and `src/hooks/use-model-mode.ts` (`type ModelMode`). These are separate definitions that happen to match, but changes to one would not propagate to the other.
- **Inconsistent agent naming convention**: The verifier orchestrator's display name is `[03-3a]` while the rules improver is `[03-3b]`, but the structured problem extractor is `[03-01]` (zero-padded). Tool agents use `[03-3a-tool]` pattern. The naming is functional but not fully consistent.
- **Verbose workflow step code**: The `workflow.ts` file for WF03 is 835 lines with significant repetition across steps (emit trace event, call agent, record timing, log output, validate schema, bail on failure). Each step follows the same pattern with minor variations, suggesting an opportunity for a higher-level step builder abstraction.
- **`normalizeTranslation` uses NFC but comment says NFKC**: In `request-context-helpers.ts` line 108, the JSDoc comment says "NFKC Unicode normalization" but the implementation calls `.normalize('NFC')`. NFC and NFKC are different normalization forms (NFKC also decomposes compatibility characters).

## Security Considerations

- **API key via non-null assertion**: `process.env.OPENROUTER_API_KEY!` in `openrouter.ts` uses a non-null assertion. If the env var is missing, the provider will be created with `undefined` as the API key. This would fail at runtime with an unclear error message from the OpenRouter SDK rather than a clear "missing API key" message at startup.
- **No input validation on `/api/solve`**: The `POST` handler in `src/app/api/solve/route.ts` calls `await req.json()` and passes the result directly to `handleWorkflowStream` without any validation. Arbitrary JSON payloads are forwarded to the Mastra workflow. The workflow's `rawProblemInputSchema` provides Zod validation, but malformed requests could produce confusing error messages.
- **No rate limiting**: The `/api/solve` endpoint has no rate limiting. Each request triggers multiple LLM API calls (potentially 10+ across all agents and tools), each costing money via OpenRouter. A single abuse request could cost significant API credits.
- **`maxDuration = 600`**: The `/api/solve` route sets a 600-second (10-minute) timeout. Combined with `generateWithRetry`'s own 10-minute timeout per agent call (with up to 3 attempts), a single workflow execution could theoretically run for over an hour if every agent call times out and retries. The `maxDuration` only applies to the Vercel/Next.js edge runtime; in local development there is no enforced upper bound.
- **Synchronous file I/O in logging**: All logging functions use `fs.appendFileSync` and `fs.writeFileSync`, which block the Node.js event loop. During a workflow with many tool calls (rule tests + sentence tests), these synchronous writes accumulate.

## Performance Considerations

- **Sequential tool calls in verification**: The verifier orchestrator agent calls `testRule` and `testSentence` tools one at a time via the LLM's tool-calling loop. For problems with many rules and sentences, this creates a serial chain where each tool call requires a round-trip to the LLM plus a round-trip to the tester agent's LLM. There is no parallelism.
- **Full context serialization in every tool call**: Each `testRule` and `testSentence` call serializes the entire vocabulary array and structured problem into the prompt string. For large problems, this redundantly sends the same data to the LLM for every individual test.
- **Vocabulary state serialization overhead**: The vocabulary `Map` is serialized to/from plain objects in workflow state (`Object.fromEntries`/`new Map(Object.entries)`) at the start and end of every step. For large vocabularies, this adds overhead.
- **All trace events accumulated in client memory**: `page.tsx` accumulates all `WorkflowTraceEvent` objects in memory via `allParts`. For long-running workflows with many tool calls, this array can grow large. The `useMemo` hooks use `allParts.length` as the dependency, which means every new event triggers re-computation of `traceEvents`, `vocabulary`, `mutationSummary`, and `progressSteps`.
- **`[...events].reverse()` in ActivityIndicator**: The `ActivityIndicator` component copies and reverses the entire events array on every render just to find the most recent agent/tool event. This could use `findLast()` instead.

## Deprecated/Legacy Code

- **Workflow 01 (`01-one-agent/`)**: Entirely commented out in `src/mastra/index.ts` (agents and scorers). Still imported. Contains a `Memory` instance with a hardcoded relative SQLite path (`file:../mastra.db`) that is relative to the `.mastra/output` directory, which is fragile. Uses a fixed model (`openai/gpt-5-mini`) rather than the `model-mode` dynamic selection pattern.
- **Workflow 02 (`02-extract-then-hypo-test-loop/`)**: Agents are still imported into `src/mastra/index.ts` but commented out from the Mastra constructor. The workflow itself is imported but also commented out. Uses fixed models (no `model-mode` support). Contains module-level mutable state. The code has not been updated to match WF03's patterns (RequestContext, vocabulary tools, event streaming, generateWithRetry).
- **`shared-memory.ts`**: Contains only `generateWorkflowIds()` which is never called. This appears to be a leftover from an earlier design where agents shared a memory store via thread IDs.
- **Commented-out scorers**: `src/mastra/index.ts` line 21 has `// ...oneAgentSolverScorers,` commented out. The scorer infrastructure exists but is not active.
- **Commented-out Gemini Pro model lines**: Four agents have `// model: openrouter('google/gemini-3-pro-preview')` comments above the active dynamic model selection. These are vestiges of a previous model configuration approach.

## Recommendations

1. **Fix the Workflow 02 module-level state race condition**: If Workflow 02 is ever re-enabled, its module-level `let` variables will cause data corruption under concurrent requests. Either refactor to use workflow state (like WF03) or clearly mark it as deprecated/removed.

2. **Remove dead code**: Delete `shared-memory.ts` (unused), remove commented-out model lines in agent files, and consider removing Workflows 01 and 02 entirely if they are no longer needed. They add import overhead and maintenance burden.

3. **Validate OPENROUTER_API_KEY at startup**: Add an early check (e.g., in `openrouter.ts` or `src/mastra/index.ts`) that throws a clear error if the API key is missing, rather than letting it fail deep inside an LLM call.

4. **Add input validation to `/api/solve`**: Parse and validate the request body with Zod before passing to `handleWorkflowStream`. Return a 400 response for malformed requests.

5. **Fix the NFC/NFKC documentation mismatch**: Either update the JSDoc comment in `normalizeTranslation` to say NFC, or change the implementation to use NFKC if compatibility normalization is desired.

6. **Replace synchronous file I/O with async**: Convert `fs.appendFileSync`/`fs.writeFileSync` calls to their async counterparts (`fs.promises.appendFile`/`fs.promises.writeFile`) to avoid blocking the event loop during workflow execution.

7. **Centralize `maxSteps` constant**: Define a shared constant for the default `maxSteps` value rather than hardcoding `100` in 10+ locations.

8. **Address `as unknown as` casts**: If Mastra's types do not expose `requestContext`/`mastra`/`writer` on tool context, consider creating a typed wrapper function that performs the cast once and provides a properly typed interface, rather than repeating the unsafe cast in every tool.

9. **Consider adding basic rate limiting**: Even a simple in-memory rate limiter (e.g., one concurrent workflow per IP) would prevent accidental API cost spikes.

10. **Unify `ModelMode` type**: Import the type from a single source (`openrouter.ts`) in both the backend and the frontend hook, or create a shared types file.
