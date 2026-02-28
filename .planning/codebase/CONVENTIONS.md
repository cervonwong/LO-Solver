# Code Conventions

## Style & Formatting

- **Formatter:** Prettier 3.8.1 (`.prettierrc` at project root)
  - 2-space indent
  - Single quotes
  - Semicolons
  - Trailing commas (all)
  - Print width: 100 characters
  - End of line: auto
- **Linter:** No ESLint configuration at the project root. Inline `eslint-disable-next-line` comments appear sparingly in a few files (e.g., `@typescript-eslint/no-explicit-any` in logging-utils, `react-hooks/exhaustive-deps` in page.tsx), which suggests ESLint may be provided via Next.js defaults but is not explicitly configured.
- **TypeScript:** Strict mode enabled (`tsconfig.json`). Notable strict options: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`. Target: ES2020, module: ESNext with bundler resolution.
- **Module system:** ES modules (`"type": "module"` in `package.json`). Uses `import`/`export` exclusively; no `require()`.

## Naming Conventions

### Files
- **Agents:** `{NN}-{descriptor}-agent.ts` (e.g., `01-structured-problem-extractor-agent.ts`, `03a-rule-tester-agent.ts`). Step numbers prefix the filename.
- **Instructions:** `{NN}-{descriptor}-instructions.ts` matching the agent file.
- **Tools:** `{NN}-{descriptor}-tool.ts` (e.g., `03a-rule-tester-tool.ts`).
- **Schemas:** `workflow-schemas.ts` per workflow directory.
- **Utilities:** Descriptive kebab-case (e.g., `agent-utils.ts`, `logging-utils.ts`, `request-context-helpers.ts`).
- **React components:** Kebab-case files (e.g., `step-progress.tsx`, `dev-trace-panel.tsx`). UI primitives live in `src/components/ui/`.
- **Hooks:** `use-{name}.ts` (e.g., `use-model-mode.ts`).
- **API routes:** Next.js App Router convention (`src/app/api/{path}/route.ts`).

### Agent IDs
- Pattern: `wf{N}-{descriptor}` (e.g., `wf03-initial-hypothesizer`, `wf03-rule-tester`).

### Agent Display Names
- Pattern: `[{workflow}-{step}] Name` (e.g., `[03-01] Structured Problem Extractor Agent`, `[03-3a-tool] Rule Tester Agent`).

### Functions
- camelCase for all functions and methods (e.g., `generateWithRetry`, `getVocabularyState`, `emitToolTraceEvent`).
- Arrow function expressions for exported utilities defined as `const` (e.g., `export const getLogDirectory = (): string => ...`).
- Regular `function` declarations for component-level functions and exported library functions.

### Types & Interfaces
- PascalCase (e.g., `WorkflowState`, `VocabularyEntry`, `StructuredProblemData`, `ToolExecuteContext`).
- Zod schemas use camelCase with `Schema` suffix (e.g., `ruleSchema`, `workflowStateSchema`, `verifierFeedbackSchema`).
- Type aliases derived from Zod schemas use `z.infer<typeof schema>` pattern.
- Discriminated unions used for result types (e.g., `ruleTestResultSchema` with `success` discriminator).

### Constants
- UPPER_SNAKE_CASE for configuration constants (e.g., `MAX_VERIFY_IMPROVE_ITERATIONS`, `TESTING_MODEL`, `STORAGE_KEY`).
- Instruction string constants use UPPER_SNAKE_CASE (e.g., `STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS`, `VOCABULARY_TOOLS_INSTRUCTIONS`).
- UPPER_SNAKE_CASE for record-type constants (e.g., `STEP_LABELS`).

### Request Context Keys
- Kebab-case strings (e.g., `'vocabulary-state'`, `'structured-problem'`, `'model-mode'`, `'step-writer'`).

## Import Patterns

- **External packages first**, then internal imports. No blank line separator is enforced between groups, but external packages generally appear before local imports.
- **Path aliases:** `@/*` maps to `./src/*` and `@examples/*` maps to `./examples/*`. Used heavily (e.g., `import { cn } from '@/lib/utils'`).
- **Deep Mastra imports:** Import from subpaths (e.g., `@mastra/core/agent`, `@mastra/core/tools`, `@mastra/core/workflows`, `@mastra/core/processors`), not from barrel `@mastra/core`.
- **Type-only imports:** Uses `import type { ... }` where applicable, enforced by `verbatimModuleSyntax`.
- **Named exports preferred:** Almost all exports are named. Default exports are used only for React page/layout components (Next.js convention) and the `next.config.ts` config.

## Code Organization

### Directory Structure
```
src/
  app/             # Next.js App Router (pages, layouts, API routes)
    api/           # API routes (route.ts per endpoint)
  components/      # React components
    ui/            # shadcn/ui primitives
  contexts/        # React context providers
  hooks/           # React hooks
  lib/             # Shared utilities, types, helpers
  mastra/          # Mastra AI orchestration (agents, workflows, tools)
    01-one-agent/              # Workflow 01
    02-extract-then-hypo-test-loop/  # Workflow 02
    03-per-rule-per-sentence-delegation/  # Workflow 03 (active)
    index.ts       # Mastra instance configuration
    openrouter.ts  # OpenRouter provider setup
examples/          # Problem data and Linguini dataset
```

### File Organization Pattern (Workflow Files)
- One agent per file, one tool per file, one instruction set per file.
- `workflow.ts` contains the workflow definition with all steps.
- `workflow-schemas.ts` centralizes all Zod schemas shared across workflow steps and tools.
- `index.ts` re-exports agents and tools for registration in the top-level Mastra config.
- Utility modules: `agent-utils.ts` (retry logic), `logging-utils.ts` (file logging), `request-context-helpers.ts` (context accessors), `request-context-types.ts` (type definitions).

### Export Patterns
- Named exports everywhere, aggregated via `index.ts` barrel files per workflow directory.
- Agents exported as `const` from individual files, collected into a record object in `index.ts` (e.g., `workflow03Agents`).
- Tools exported individually and also collected into a record object (e.g., `workflow03Tools`, `vocabularyTools`).

### Two-Agent Chain Pattern
Steps 2 and 3b use a consistent two-agent chain:
1. A **reasoning agent** (e.g., Gemini) generates natural language analysis.
2. An **extraction agent** (e.g., GPT-5-mini) parses the natural language into structured JSON via `structuredOutput`.

### RequestContext Pattern
Per-execution mutable state is shared via `RequestContext<Workflow03RequestContext>`. Keys are defined in `request-context-types.ts` (source of truth). Helper functions in `request-context-helpers.ts` provide typed access with null-safety checks (throw if missing).

## Comments & Documentation

- **Neutral tone:** Comments describe current behavior without evaluative language (no "Better", "Improved", "Enhanced").
- **JSDoc:** Used on exported functions and tool definitions. Includes `@throws` annotations where appropriate (e.g., `generateWithRetry`). Brief 1-2 sentence descriptions.
- **Section dividers:** Comment blocks with `// ====...====` separators are used in larger tool files to delineate sections (e.g., "Shared Schemas", "Core Execution Function", "testRuleTool").
- **Inline comments:** Explain non-obvious logic (e.g., why vocabulary is rebuilt from state, why certain fields are nullable). Keep them brief.
- **Console logging:** Uses tagged prefixes like `[VOCAB:ADD]`, `[Step 3a1]`, `[generateWithRetry]` for grep-friendly runtime logging.
- **Commented-out code:** Model alternatives are left as comments (e.g., `// model: openrouter('google/gemini-3-pro-preview')`) and inactive workflows are commented out in `src/mastra/index.ts`.

## Error Handling

### Zod Schema Validation
The primary error handling pattern is Zod validation after every LLM call:
1. Call `schema.safeParse(response.object)`.
2. If validation fails, log the error via `logValidationError()` and call `bail()` to abort the workflow step with a descriptive message.
3. If the parsed result has `success === false`, bail with the explanation field.

### generateWithRetry
All LLM calls go through `generateWithRetry()` in `agent-utils.ts`:
- 10-minute timeout per attempt (two-layer: AbortSignal + Promise.race).
- Up to 2 retries (3 total attempts) with linear backoff (5s, 10s, 15s).
- Retries on: `AI_APICallError`, timeout, network errors, empty responses.
- Non-retryable errors and caller aborts propagate immediately.

### Tool Error Handling
Tools wrap their execution in try/catch and return discriminated union results:
- Success: `{ success: true, status: ..., reasoning: ..., recommendation: ... }`
- Error: `{ success: false, error: "..." }`

### Context Access Errors
Request context helpers throw descriptive errors if required keys are missing (e.g., `"'vocabulary-state' not found in requestContext"`). Optional keys (like `log-file`) return `undefined` instead.

### API Route Error Handling
API routes are minimal; the Mastra framework handles streaming and error propagation. The examples API returns 404 JSON for missing resources.
