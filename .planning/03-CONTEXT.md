# Phase 3 Context — Evaluation Expansion

## Requirements

- **EVAL-02**: Comparison mode scoring zero-shot vs agentic workflow on same problems, showing delta
- **EVAL-03**: Intermediate output scoring — rule quality and extraction quality
- **EVAL-04**: Eval results viewable in UI with accuracy scores, per-problem breakdowns, pass/fail per question

## Existing Eval System (Phase 2)

### Files
- `src/evals/problems.ts` — 4 Linguini problems with ground-truth answers
- `src/evals/translation-scorer.ts` — `createScorer` with preprocess → generateScore → generateReason
- `src/evals/storage.ts` — JSON persistence in `evals/results/`, types `EvalProblemResult` and `EvalRunResult`
- `src/evals/run.ts` — CLI with `--mode`, `--concurrency`, `--problem` flags

### Workflow Result Shape
The `workflow.createRun().start()` returns a `WorkflowResult` with:
- `status: 'success' | 'failed' | ...`
- `result: TOutput` — final step output (questionsAnsweredSchema)
- `steps: { [stepId]: StepResult }` — per-step outputs accessible by step ID

Step IDs: `extract-structure`, `initial-hypothesis`, `verify-improve-rules-loop`, `answer-questions`

### Key Intermediate Outputs
- **Step 1 (extract)**: `structuredProblemSchema` — `{ success, explanation, data: { context, dataset, questions } }`
- **Step 2 (hypothesize)**: `initialHypothesisOutputSchema` — `{ structuredProblem, rules, testResults, iterationCount }`
- **Step 3 (verify-improve)**: `hypothesisTestLoopSchema` — `{ structuredProblem, rules, testResults: verifierFeedbackSchema, iterationCount }`
  - `verifierFeedbackSchema` includes: `rulesTestedCount`, `errantRules[]`, `sentencesTestedCount`, `errantSentences[]`, `conclusion`
- **Step 4 (answer)**: `questionsAnsweredSchema` — `{ success, explanation, answers[] }`

### Model Selection
- `openrouter.ts` exports `openrouter`, `TESTING_MODEL` (gpt-oss-120b), `activeModelId(mode, productionModel)`
- Answerer uses Gemini 3 Flash in production
- Zero-shot solver should use the same model as the answerer for fair comparison

## Frontend Architecture

### Existing Pages
- `/` — Main solver page (client component with ResizablePanelGroup)
- No `/evals` page exists

### Layout
- `layout.tsx` has a nav bar with `ModelModeToggle` on the right
- Need to add nav link to `/evals`

### Installed shadcn/ui Components
badge, button, collapsible, command, dialog, dropdown-menu, popover, resizable, scroll-area, switch, table, tabs, textarea

### Design System
- Blueprint cyanotype palette (deep blue background, cyan accent, white foreground)
- BlueprintCard container pattern
- `.frosted` class for glassmorphism
- Surface elevation system (surface-1/2/3)
- Status colors: agent purple, tool teal, vocab mint, success white, warning gold, destructive red

## Design Decisions

1. **Zero-shot solver**: Use Mastra Agent (not raw generateText) with same model as the answerer, requesting output in `questionsAnsweredSchema` format
2. **Intermediate scoring**: Extract step outputs from `result.steps` rather than modifying the workflow
3. **Rule quality metric**: Derive from verifier feedback — pass rate = (tested - errant) / tested
4. **Extraction quality metric**: Heuristic — success + question count match against ground truth
5. **Storage extension**: Add optional fields to existing types (backward compatible)
6. **UI**: New `/evals` page with run history list and expandable detail view, plus comparison display

---

_Research conducted: 2026-02-28_
