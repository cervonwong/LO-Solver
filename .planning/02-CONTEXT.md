# Phase 2 Context — Evaluation Foundation

## Objective

Build automated evaluation infrastructure that scores the solver workflow against ground-truth answers, using Mastra's eval framework, with persistent results for tracking accuracy over time.

## Requirements

- **EVAL-01**: Run the workflow against problems with known answers and compute accuracy
- **EVAL-05**: Use `@mastra/evals` framework patterns
- **EVAL-06**: Persist eval results for comparison across runs

## Mastra Evals API (from research)

### Scoring — `createScorer` from `@mastra/core/evals`

Builds a `MastraScorer` with a pipeline of optional steps:

```typescript
import { createScorer } from '@mastra/core/evals';

const scorer = createScorer({ id: 'my-scorer', description: '...' })
  .preprocess(({ run }) => { /* transform run.input, run.output, run.groundTruth */ })
  .analyze({ /* optional LLM-based analysis step */ })
  .generateScore(({ results }) => { /* return number 0-1 */ })
  .generateReason(({ results, score }) => { /* return string */ });
```

Only `.generateScore()` is required. Each step receives results from prior steps via `results.preprocessStepResult`, etc. The scorer can be run standalone via `scorer.run({ input, output, groundTruth })`.

### Batch execution — `runEvals` from `@mastra/core/evals`

Runs a target (agent or workflow) against a dataset and scores results:

```typescript
import { runEvals } from '@mastra/core/evals';

const result = await runEvals({
  target: workflow,           // Mastra Workflow instance (via mastra.getWorkflow())
  data: [
    { input: { rawProblemText: '...', modelMode: 'testing' }, groundTruth: [...] },
  ],
  scorers: [myScorer],
  concurrency: 1,
  onItemComplete: ({ item, targetResult, scorerResults }) => { /* progress */ },
});
// result.scores — averaged per scorer
// result.summary.totalItems
```

For workflow targets, `targetResult` is a `WorkflowResult` with `.status` (`success`|`failed`|`suspended`|`tripwire`) and `.result` (final step output).

The scorer receives `run.output` as the unwrapped final step output (not the full `WorkflowResult`). `runEvals` extracts `workflowResult.result` before passing to the scorer. Access final answers via `run.output.answers`.

**`runEvals` does NOT auto-persist results.** Results are returned in-memory only.

### Programmatic workflow execution (alternative to `runEvals`)

```typescript
const workflow = mastra.getWorkflow('solver-workflow');
const run = await workflow.createRun();
const result = await run.start({ inputData: { rawProblemText: '...', modelMode: 'testing' } });
// result.status === 'success' → result.result is the final output
```

## Ground-Truth Data Sources

### Linguini Dataset (primary — 160 entries, 14+ IOL questions)

Loaded via `loadLinguiniQuestions()` from `examples/index.ts`. Each `LinguiniQuestion` has:
- `parts: LinguiniEntry[]` — sub-questions with individual answers
- `buildLinguiniProblemText(question)` — combines context + all queries into raw problem text

Answer formats:
- `string[]` (146 entries) — one correct answer per part
- `string[][]` (14 entries) — multiple acceptable alternatives per part

Task types: `fill_blanks`, `match_letters`, `num_to_text`, `text_to_num`, `translation`

### Hand-Curated Examples (3 problems)

Saisiyat, Forest Enets, Okinawan — markdown files with `**Answer:**` prefixed solutions. Require manual parsing.

## Workflow Output Schema

Step 4 produces `questionsAnsweredSchema`:

```typescript
{
  success: boolean,
  explanation: string,
  answers: Array<{
    questionId: string,  // "Q1", "Q2", etc.
    answer: string,
    workingSteps: string,
    confidence: 'HIGH' | 'MEDIUM' | 'LOW',
    confidenceReasoning: string,
  }> | null
}
```

## Persistence Decision

**JSON files** in `evals/results/` — most pragmatic for this use case:
- `runEvals` doesn't auto-persist
- Mastra's `mastra_scorers` table has no run-summary concept
- JSON is human-readable, diffable, and matches existing `logs/` convention
- Directory is gitignored (ephemeral like `logs/`)

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Use `runEvals` as primary runner | Satisfies EVAL-05 (framework patterns), handles workflow execution + scoring |
| Linguini dataset for ground truth | Already structured with answers, no parsing needed |
| Custom `createScorer` for accuracy | Built-in scorers don't handle multi-answer translation comparison |
| JSON file persistence | Pragmatic; `runEvals` doesn't auto-persist; human-readable |
| `npm run eval` CLI invocation | Simplest UX; long-running process with console output |
| Testing model mode for evals | Cheap and fast; production mode available via flag |

## Scoring Strategy

1. Extract `answers[]` from workflow result, sort by `questionId`
2. Match each answer to the corresponding Linguini ground-truth answer by index
3. Normalize strings: lowercase, trim whitespace, normalize Unicode
4. For `string[][]` alternatives: answer is correct if it matches any alternative
5. Score = (correct answers) / (total expected answers)
