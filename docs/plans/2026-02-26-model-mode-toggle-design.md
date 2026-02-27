# Model Mode Toggle Design

## Problem

Running the full production models (GPT-5-mini, Gemini 3 Flash) during development and testing is expensive. We need a UI toggle to switch between cheap testing models and production models on a per-request basis.

## Design

### Model Modes

- **Testing** (default): All 10 agents use `amazon/nova-micro-v1` via OpenRouter.
- **Production**: Each agent uses its own hardcoded production model (currently `openai/gpt-5-mini` for extraction agents, `google/gemini-3-flash-preview` for reasoning agents).

### UI

- **Component**: shadcn Switch in the nav bar, right-aligned on the same row as the "LO-Solver" logo.
- **Labels**: "Testing ($)" on the left, "Production ($$$)" on the right.
- **Persistence**: `localStorage` key `lo-solver-model-mode`, values `'testing' | 'production'`, default `'testing'`.
- **Always enabled**: Toggling mid-run is harmless; mode is captured when "Solve" is clicked.

### Data Flow

1. `page.tsx` reads mode via `useModelMode()` hook (reads localStorage).
2. `prepareSendMessagesRequest` includes `modelMode` in the request body: `{ inputData: { rawProblemText, modelMode } }`.
3. API route passes `params` through to `handleWorkflowStream` unchanged.
4. Workflow input schema extended: `{ rawProblemText: string, modelMode: z.enum(['testing', 'production']).default('testing') }`.
5. Step 1 stores `modelMode` in **workflow state** (alongside `logFile`, `startTime`, etc.).
6. Each subsequent step reads `state.modelMode` and sets `requestContext.set('model-mode', state.modelMode)` before calling agents.
7. Each agent uses a dynamic `model` function that reads `model-mode` from RequestContext.

### Agent Model Selection

Each agent uses an inline ternary — no helper function:

```typescript
import { TESTING_MODEL } from '../openrouter';

model: ({ requestContext }) =>
  openrouter(
    requestContext?.get('model-mode') === 'production'
      ? 'openai/gpt-5-mini'  // each agent has its own production model
      : TESTING_MODEL
  ),
```

`TESTING_MODEL` is a single constant (`'amazon/nova-micro-v1'`) exported from `openrouter.ts`.

### Files Changed

**New files:**

- `src/components/model-mode-toggle.tsx` — client component with shadcn Switch
- `src/hooks/use-model-mode.ts` — localStorage-backed hook
- `src/components/ui/switch.tsx` — shadcn Switch (installed via CLI)

**Modified files:**

- `src/mastra/openrouter.ts` — add `TESTING_MODEL` constant and `ModelMode` type
- `src/app/layout.tsx` — add ModelModeToggle to nav bar
- `src/app/page.tsx` — read mode from hook, include in request body
- `src/mastra/03-per-rule-per-sentence-delegation/workflow.ts` — extend input schema, set model-mode on RequestContext in all 4 steps
- `src/mastra/03-per-rule-per-sentence-delegation/request-context-types.ts` — add `'model-mode'` key
- 10 agent files in `src/mastra/03-per-rule-per-sentence-delegation/` — change static `model` to dynamic function

### Approach Considered and Rejected

- **Two sets of agents**: Duplicate all agents for each mode. Rejected due to massive code duplication.
- **Centralized role-based model factory**: `getModel('extraction' | 'reasoning', mode)`. Rejected in favor of per-agent hardcoded production models for flexibility.
- **Helper function `getModel(productionModel, mode)`**: Rejected as unnecessary indirection for a simple ternary.
