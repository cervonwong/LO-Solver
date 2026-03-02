# Phase 2 Plan — Evaluation Foundation

**Goal:** Build automated evaluation that scores the solver workflow against ground-truth answers, using Mastra's eval framework, with persistent results for comparison.

**Requirements:** EVAL-01, EVAL-05, EVAL-06

**Context:** [02-CONTEXT.md](../../02-CONTEXT.md)

---

## Prompts

### Prompt 1: Ground-truth problem set

**Files to create:**
- `src/evals/problems.ts`

**Instructions:**

1. Create `src/evals/problems.ts` that defines the evaluation problem set.

2. Define types:
   ```typescript
   interface EvalProblem {
     id: string;                          // e.g., "iol-2023-1"
     title: string;                       // e.g., "Guazacapán Xinka"
     source: 'linguini' | 'hand-curated';
     rawProblemText: string;              // full problem text for workflow input
     groundTruth: GroundTruthAnswer[];    // expected answers in order
   }

   interface GroundTruthAnswer {
     questionIndex: number;               // 0-based position
     acceptedAnswers: string[];           // all acceptable answers (1 for single, N for alternatives)
   }
   ```

3. Import `loadLinguiniQuestions` and `buildLinguiniProblemText` from `@examples/index`.

4. Create a function `loadEvalProblems(): EvalProblem[]` that:
   - Calls `loadLinguiniQuestions()` to get the full dataset
   - Selects 3-4 questions that are `translation` or `fill_blanks` task type (the workflow handles Rosetta Stone translation problems)
   - For each selected question, builds the raw problem text via `buildLinguiniProblemText()`
   - Maps each part's `answer` field to `GroundTruthAnswer[]`. The `LinguiniEntry.answer` type is `string[] | string[][] | string`:
     - If `answer` is a bare `string`: wrap as `acceptedAnswers: [answer]` (single answer, single question)
     - If `answer` is `string[]`: each string is a single accepted answer for that part → `acceptedAnswers: [answer[i]]`
     - If `answer` is `string[][]`: the inner array contains alternatives → `acceptedAnswers: answer[i]`
     - Use a type guard (`typeof answer === 'string'` → `Array.isArray(answer[0])`) to disambiguate
   - Returns the array of `EvalProblem`

5. Select specific Linguini questions by filtering on:
   - `task_type === 'translation'` or `task_type === 'fill_blanks'` (at least in their first part)
   - Problems with enough answer items to score meaningfully (sum of `answer.length` across all `LinguiniEntry` parts >= 5)
   - Different languages/years for variety
   - Hard-code the selected question IDs in a `SELECTED_QUESTION_IDS` constant so the set is stable and reproducible

**Verification:** `npx tsc --noEmit` passes. The function can be imported and returns the expected structure.

**Satisfies:** Partial EVAL-01 (ground-truth data configured)

---

### Prompt 2: Translation accuracy scorer

**Files to create:**
- `src/evals/translation-scorer.ts`

**Instructions:**

1. Create `src/evals/translation-scorer.ts` with a custom scorer using `createScorer` from `@mastra/core/evals`.

2. The scorer ID should be `translation-accuracy`.

3. Implement the scorer pipeline:

   **preprocess step:**
   - `run.output` is already the final step's output (the `questionsAnsweredSchema` shape: `{ success, explanation, answers }`) — `runEvals` unwraps the `WorkflowResult` before passing it to the scorer
   - Extract answers from `run.output.answers` (an array of `{ questionId, answer, ... }`)
   - Sort answers by `questionId` (natural sort: Q1, Q2, ..., Q10, Q11, ...)
   - Extract the `answer` string from each
   - Get `run.groundTruth` which will be the `GroundTruthAnswer[]` array
   - Return `{ predictedAnswers: string[], groundTruth: GroundTruthAnswer[], totalQuestions: number }`

   **generateScore step:**
   - For each ground-truth answer, check if the corresponding predicted answer matches any of its `acceptedAnswers`
   - Normalize both sides before comparison: `normalize(s)` should trim, lowercase, and apply Unicode NFC normalization
   - Score = correct / total (0.0 to 1.0)
   - Handle edge cases: if workflow produced no answers or fewer answers than expected, unmatched questions score 0

   **generateReason step:**
   - List which questions were correct and which were wrong
   - For wrong answers, show predicted vs expected
   - Include the overall fraction (e.g., "7/10 correct")

4. Export the scorer as `translationAccuracyScorer`.

**Verification:** `npx tsc --noEmit` passes.

**Satisfies:** EVAL-05 (uses `createScorer` from Mastra's eval framework)

---

### Prompt 3: Eval result persistence

**Files to create:**
- `src/evals/storage.ts`

**Instructions:**

1. Create `src/evals/storage.ts` for persisting and retrieving eval run results.

2. Define the result types:
   ```typescript
   interface EvalProblemResult {
     problemId: string;
     title: string;
     score: number;                       // 0.0-1.0
     reason: string;
     totalQuestions: number;
     correctCount: number;
     details: Array<{
       questionIndex: number;
       predicted: string;
       expected: string[];                // accepted answers
       correct: boolean;
     }>;
   }

   interface EvalRunResult {
     id: string;                          // UUID
     timestamp: string;                   // ISO-8601
     modelMode: 'testing' | 'production';
     gitCommit?: string;                  // from `git rev-parse --short HEAD`
     duration: number;                    // ms
     problems: EvalProblemResult[];
     summary: {
       totalProblems: number;
       meanScore: number;                 // average across problems
       totalQuestions: number;
       totalCorrect: number;
       overallAccuracy: number;           // totalCorrect / totalQuestions
     };
   }
   ```

3. Implement storage functions:

   **`saveEvalRun(result: EvalRunResult): Promise<void>`**
   - Write to `evals/results/{timestamp}_{id}.json` (ISO timestamp with dashes, not colons)
   - Create the `evals/results/` directory if it doesn't exist
   - Pretty-print JSON (2-space indent)

   **`loadEvalRuns(): Promise<EvalRunResult[]>`**
   - Read all `.json` files from `evals/results/`
   - Parse and return sorted by timestamp descending (newest first)
   - Return empty array if directory doesn't exist

   **`loadEvalRun(id: string): Promise<EvalRunResult | null>`**
   - Find the file matching the ID
   - Parse and return, or null if not found

4. Add `evals/results/` to `.gitignore` (alongside `logs/` and `mastra.db*`).

**Verification:** `npx tsc --noEmit` passes.

**Satisfies:** EVAL-06 (results persisted for retrieval and comparison)

---

### Prompt 4: Eval runner script

**Files to create:**
- `src/evals/run.ts`

**Files to modify:**
- `package.json` (add `eval` script)

**Instructions:**

1. Create `src/evals/run.ts` as the main eval entry point.

2. The script should:

   **a. Parse CLI arguments:**
   - `--mode testing|production` (default: `testing`)
   - `--concurrency N` (default: `1`)
   - `--problem <id>` (optional: run only a specific problem)

   **b. Load the eval problem set:**
   - Import and call `loadEvalProblems()` from `./problems`
   - Filter by `--problem` if specified

   **c. Initialize Mastra and get the workflow:**
   - Import `{ mastra }` from `@/mastra`
   - Get the workflow via `mastra.getWorkflow('solverWorkflow')` (uses the registration key, not the workflow's internal `.id`)

   **d. Run evals using `runEvals` from `@mastra/core/evals`:**
   ```typescript
   const result = await runEvals({
     target: workflow,
     data: problems.map(p => ({
       input: { rawProblemText: p.rawProblemText, modelMode: mode },
       groundTruth: p.groundTruth,
     })),
     scorers: [translationAccuracyScorer],
     concurrency,
     onItemComplete: ({ item, targetResult, scorerResults }) => {
       // Log progress to console
     },
   });
   ```

   **e. Build the `EvalRunResult`:**
   - Collect per-problem results from `onItemComplete` callbacks
   - Compute summary (mean score, total questions, total correct, overall accuracy)
   - Get git commit via `execSync('git rev-parse --short HEAD')`
   - Record total duration

   **f. Persist via `saveEvalRun()`:**
   - Save the full result to JSON

   **g. Print summary to console:**
   - Table showing: problem ID, title, score, correct/total
   - Overall accuracy percentage
   - Path to the saved result file

3. **Important implementation note for `runEvals` integration:** If `runEvals` doesn't work cleanly with the solver workflow (due to RequestContext initialization or streaming complications), fall back to manual execution:
   ```typescript
   for (const problem of problems) {
     const run = await workflow.createRun();
     const result = await run.start({ inputData: { rawProblemText: problem.rawProblemText, modelMode: mode } });
     const scorerResult = await translationAccuracyScorer.run({
       input: problem.rawProblemText,
       output: result,
       groundTruth: problem.groundTruth,
     });
     // collect results
   }
   ```
   Both approaches satisfy EVAL-05 (using Mastra's eval framework).

4. Add to `package.json` scripts:
   ```json
   "eval": "npx tsx src/evals/run.ts"
   ```

**Verification:** `npx tsc --noEmit` passes. Running `npm run eval -- --mode testing` executes without import/compilation errors (workflow execution itself may take time).

**Satisfies:** EVAL-01 (user can invoke eval run and receive accuracy), EVAL-05 (uses `runEvals` or `createScorer` from Mastra evals)

---

### Prompt 5: Register scorer and update documentation

**Files to modify:**
- `src/mastra/index.ts`
- `CLAUDE.md`

**Instructions:**

1. In `src/mastra/index.ts`, import and register the translation accuracy scorer:
   ```typescript
   import { translationAccuracyScorer } from '@/evals/translation-scorer';
   // In the Mastra constructor:
   scorers: {
     translationAccuracy: translationAccuracyScorer,
   },
   ```
   This makes the scorer visible in Mastra Studio for trace-level scoring.

2. In `CLAUDE.md`, add a section documenting the eval system:
   - How to run evals (`npm run eval`)
   - CLI flags (`--mode`, `--concurrency`, `--problem`)
   - Where results are stored (`evals/results/`)
   - The scorer pattern (custom `createScorer` with preprocess → generateScore → generateReason)

**Verification:** `npx tsc --noEmit` passes.

---

### Prompt 6: End-to-end verification

1. Run `npx tsc --noEmit` — must pass with only the pre-existing CSS module error
2. Run `npm run eval -- --mode testing --problem <one-problem-id>` against a single problem to verify:
   - The workflow executes successfully
   - The scorer produces a score between 0 and 1
   - The result is persisted to `evals/results/`
   - The console output shows the accuracy percentage
3. Run `npm run eval -- --mode testing` against all configured problems to verify:
   - Multiple problems are scored
   - Summary shows overall accuracy across all problems
   - Results file contains per-problem breakdowns
4. Verify persistence by checking:
   - `evals/results/` contains the JSON file(s)
   - The file is valid JSON with all expected fields
   - Running the eval again creates a second file (not overwriting)

**Satisfies:** EVAL-01 (end-to-end), EVAL-05 (framework usage confirmed), EVAL-06 (persistence confirmed), Success Criteria 4 (at least 3 problems scored)

---

## Execution Notes

- **Parallelization:** Prompts 1 and 2 are independent and can run in parallel. Prompt 3 is independent. Prompt 4 depends on 1, 2, and 3. Prompt 5 depends on 2. Prompt 6 depends on all.
- **Risk:** The main risk is `runEvals` not integrating cleanly with the solver workflow (RequestContext, streaming, state initialization). Prompt 4 includes a fallback to manual workflow execution + scorer. Either approach satisfies EVAL-05.
- **Runtime:** Each workflow execution takes 2-10 minutes depending on model and problem complexity. Running 3-4 problems at concurrency 1 will take 10-40 minutes. Use `--problem` flag for quick iteration during development.
- **Model costs:** Use `testing` mode (cheap models) during development. `production` mode for real accuracy measurement.
- **Scope boundary:** This phase does NOT include UI for viewing eval results (that's Phase 3, EVAL-04). Console output and JSON files are sufficient.
- **Database:** Eval runs create workflow executions in `mastra.db`. Use `npm run dev:new` to clear if needed, but eval results in `evals/results/` are independent.

---

_6 prompts. Estimated scope: ~5 new files, ~2 files modified._
