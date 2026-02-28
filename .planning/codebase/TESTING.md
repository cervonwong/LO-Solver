# Testing

## Test Framework

- **None configured.** There is no test runner (Jest, Vitest, Mocha, etc.) in `package.json` dependencies or devDependencies. No test configuration files exist. No `test` script is defined in `package.json`.

## Test Structure

- **No test files exist** in the `src/` directory. There are zero `*.test.*`, `*.spec.*`, or `__tests__/` files in the project source.
- The only test-related files in the repository are within `node_modules/` (from dependencies).

## Test Coverage

- **No coverage tooling** is configured (no `c8`, `istanbul`, `nyc`, or similar).
- Coverage is effectively 0% from a unit/integration test perspective.

## How to Run Tests

- **Type checking only:** `npx tsc --noEmit` validates TypeScript types without emitting output. This is the sole automated verification step mentioned in the project. It has one pre-existing error (`src/app/layout.tsx: Cannot find module './globals.css'`) that does not affect builds and should be ignored.
- **Build verification:** `npm run build` runs the Next.js production build, which catches compilation errors.
- **No test command:** Running `npm test` would fail since no `test` script is defined.

## Testing Patterns

### Runtime Evaluation (Not Unit Tests)
The project uses `@mastra/evals` for runtime evaluation scoring rather than traditional test frameworks:
- The `@mastra/evals` package provides runtime evaluation scoring capabilities (e.g., `createCompletenessScorer()`).
- Scorers evaluate LLM output quality at runtime, not in a CI/test pipeline.

### Manual/Runtime Verification
- **Console logging:** Tagged log messages (`[VOCAB:ADD]`, `[Step 3a1]`, `[generateWithRetry]`) are emitted during workflow execution for manual inspection.
- **Markdown execution logs:** Each workflow run writes a detailed Markdown log to `{LOG_DIRECTORY}/workflow_*.md` containing agent outputs, reasoning, validation errors, vocabulary changes, and timing summaries.
- **Zod schema validation:** Every LLM response is validated against Zod schemas at runtime. Failures are logged and cause workflow steps to bail with descriptive error messages.
- **Model mode toggle:** A "testing" mode uses a cheaper model (`openai/gpt-oss-120b`) for development iteration, while "production" mode uses the intended models (GPT-5-mini, Gemini 3 Flash).
- **Example problems:** The `examples/` directory contains hand-curated Linguistics Olympiad problems (with known solutions) plus the Linguini JSONL dataset. These serve as manual test cases for verifying solver behavior.

## Gaps & Recommendations

### Critical Gaps
1. **No unit tests.** Core utility functions (`generateWithRetry`, `normalizeTranslation`, `formatDuration`, `groupEventsByStep`, `groupEventsWithToolCalls`, etc.) have no test coverage. These are pure functions that are straightforward to test.
2. **No integration tests.** The workflow pipeline, API routes, and request context helpers are untested in isolation.
3. **No test runner configured.** Adding Vitest (recommended for ESM/TypeScript projects with Vite-like tooling) or Jest would be the first step.
4. **No CI pipeline.** There is no `.github/workflows/`, no CI configuration of any kind. Type checking and builds are only run manually.

### Recommendations

1. **Add Vitest** as the test framework. It has native ESM and TypeScript support, works well with Next.js projects, and has a fast watch mode:
   ```bash
   npm install -D vitest
   ```
   Add a `test` script to `package.json`:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```

2. **Start with utility function tests.** High-value, low-effort targets:
   - `src/mastra/workflow/agent-utils.ts` -- test retry logic, timeout behavior, empty response detection.
   - `src/lib/trace-utils.ts` -- test `groupEventsByStep()`, `groupEventsWithToolCalls()`, `formatDuration()`, `isToolCallGroup()`.
   - `src/lib/workflow-events.ts` -- test `getUIStepLabel()` for all step ID patterns.
   - `src/mastra/workflow/request-context-helpers.ts` -- test `normalizeTranslation()`, context accessor error cases.
   - `src/mastra/workflow/logging-utils.ts` -- test `formatTimeGMT8()`, `recordStepTiming()`, `formatReasoning()`.

3. **Add schema validation tests.** Verify that Zod schemas in `workflow-schemas.ts` correctly parse valid data and reject invalid data. These are critical for the LLM output validation pipeline.

4. **Add a smoke test for the API route.** Verify that `POST /api/solve` accepts the expected payload shape and returns a streaming response.

5. **Set up CI.** A minimal GitHub Actions workflow running `npx tsc --noEmit` and `vitest run` on push/PR would catch regressions.

6. **Evaluate the runtime scorer setup.** The `@mastra/evals` scorer (`completenessScorer`) is currently commented out. Consider re-enabling it and creating a systematic evaluation pipeline using the Linguini dataset as ground truth (the dataset includes expected answers).
