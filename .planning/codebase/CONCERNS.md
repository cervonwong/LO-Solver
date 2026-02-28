# Technical Concerns

## Known Issues

- **CSS module type declaration missing**: `src/app/layout.tsx` imports `./globals.css` which produces a TypeScript error (`Cannot find module './globals.css'`). This is a known pre-existing issue documented in CLAUDE.md and does not affect builds, but it means `npx tsc --noEmit` always reports one error, making it harder to detect real regressions.
- **Mastra tool writer is a silent no-op**: `ctx.writer?.custom()` inside tools running within workflow steps does nothing (Mastra does not pass outputWriter to tools in this context). The codebase works around this by passing the step writer through RequestContext via `step-writer` key and using `emitToolTraceEvent`. This is a framework-level limitation that could break if Mastra changes its internal context passing.
- **Non-null assertions on workflow `.map()` calls**: `workflow.ts` uses `inputData.data!` after the extraction step's `.map()`. If the extraction step ever returns `data: null` despite `success: true`, this would throw at runtime. The bail logic should prevent this, but the assertion is unchecked.

## Technical Debt

| Area | Description | Severity |
|------|-------------|----------|
| `as unknown as` type assertions | 15+ instances of `as unknown as ToolExecuteContext` across tool files (`vocabulary-tools.ts`, `03a-rule-tester-tool.ts`, `03a-sentence-tester-tool.ts`) and `as unknown as` casts in `page.tsx` and `activity-indicator.tsx`. These bypass type safety and indicate Mastra's tool context type does not expose `requestContext`, `mastra`, or `writer` fields in its public API, so the codebase works around this with unsafe casts. | Medium |
| `eslint-disable` comments | 4 instances of `eslint-disable-next-line react-hooks/exhaustive-deps` in `page.tsx` (lines 223, 297, 311, 327) and 3 instances of `@typescript-eslint/no-explicit-any` in `logging-utils.ts`. The `react-hooks` disables use `.length` as a proxy for array identity, which could miss updates if the array length doesn't change but contents do. | Medium |
| Hardcoded `maxSteps: 100` | Every `generateWithRetry` and direct `.generate()` call passes `maxSteps: 100`. This is scattered across 10+ call sites in `workflow.ts` and tool files with no centralized constant or configuration. | Low |
| `shared-memory.ts` is dead code | `generateWorkflowIds()` in `src/mastra/workflow/shared-memory.ts` is never imported or used anywhere in the codebase. It is only referenced in a README. | Low |
| Commented-out model references | Multiple agent files contain commented-out `// model: openrouter('google/gemini-3-pro-preview')` lines (4 instances across agents). These are leftover from when agents used a fixed model before the `model-mode` dynamic model selection was implemented. | Low |

## Code Quality Observations

- **Inconsistent `UnicodeNormalizer` usage**: Most agents in the workflow include `UnicodeNormalizer` as an input processor, but `ruleTesterAgent` and `sentenceTesterAgent` (the tool-invoked agents) do not. These agents are called with prompts constructed in tool code, so the inconsistency may be intentional, but it is undocumented.
- **`requestContextSchema` inconsistency**: Only `ruleTesterAgent` and `sentenceTesterAgent` declare a `requestContextSchema`. All other the workflow agents access `requestContext` without schema validation. This means runtime errors from missing context keys would only be caught at the point of access, not at agent initialization.
- **Silent error swallowing**: In `page.tsx` line 85, the examples fetch uses `.catch(() => {})`, silently swallowing any error from the `/api/examples` endpoint. The user would see an empty examples dropdown with no indication of failure.
- **Duplicated `ModelMode` type**: The `ModelMode` type is defined in two places: `src/mastra/openrouter.ts` (`export type ModelMode`) and `src/hooks/use-model-mode.ts` (`type ModelMode`). These are separate definitions that happen to match, but changes to one would not propagate to the other.
- **Inconsistent agent naming convention**: The verifier orchestrator's display name is `[Step 3a]` while the rules improver is `[Step 3b]`, but the structured problem extractor is `[Step 1]`. Tool agents use `[Step 3a-tool]` pattern. The naming is functional but not fully consistent.
- **Verbose workflow step code**: The `workflow.ts` file for the workflow is 835 lines with significant repetition across steps (emit trace event, call agent, record timing, log output, validate schema, bail on failure). Each step follows the same pattern with minor variations, suggesting an opportunity for a higher-level step builder abstraction.
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

- **`shared-memory.ts`**: Contains only `generateWorkflowIds()` which is never called. This appears to be a leftover from an earlier design where agents shared a memory store via thread IDs.
- **Commented-out Gemini Pro model lines**: Four agents have `// model: openrouter('google/gemini-3-pro-preview')` comments above the active dynamic model selection. These are vestiges of a previous model configuration approach.

## Recommendations

1. **Remove dead code**: Delete `shared-memory.ts` (unused), remove commented-out model lines in agent files.

2. **Validate OPENROUTER_API_KEY at startup**: Add an early check (e.g., in `openrouter.ts` or `src/mastra/index.ts`) that throws a clear error if the API key is missing, rather than letting it fail deep inside an LLM call.

3. **Add input validation to `/api/solve`**: Parse and validate the request body with Zod before passing to `handleWorkflowStream`. Return a 400 response for malformed requests.

4. **Fix the NFC/NFKC documentation mismatch**: Either update the JSDoc comment in `normalizeTranslation` to say NFC, or change the implementation to use NFKC if compatibility normalization is desired.

5. **Replace synchronous file I/O with async**: Convert `fs.appendFileSync`/`fs.writeFileSync` calls to their async counterparts (`fs.promises.appendFile`/`fs.promises.writeFile`) to avoid blocking the event loop during workflow execution.

6. **Centralize `maxSteps` constant**: Define a shared constant for the default `maxSteps` value rather than hardcoding `100` in 10+ locations.

7. **Address `as unknown as` casts**: If Mastra's types do not expose `requestContext`/`mastra`/`writer` on tool context, consider creating a typed wrapper function that performs the cast once and provides a properly typed interface, rather than repeating the unsafe cast in every tool.

8. **Consider adding basic rate limiting**: Even a simple in-memory rate limiter (e.g., one concurrent workflow per IP) would prevent accidental API cost spikes.

9. **Unify `ModelMode` type**: Import the type from a single source (`openrouter.ts`) in both the backend and the frontend hook, or create a shared types file.
