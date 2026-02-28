# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Starts Next.js (port 3000, Turbopack) and Mastra dev server (port 4111, includes Mastra Studio) concurrently. `dev:next` / `dev:mastra` run them independently.
- `npm run dev:new` — Clear database then start dev server
- `npm run build` — Next.js production build
- `npx tsc --noEmit` — Type-check without emitting (run before commits)

Note: `npx tsc --noEmit` currently reports one pre-existing error: `src/app/layout.tsx: Cannot find module './globals.css'` — this is a CSS module without a type declaration and does not affect builds. Ignore it when checking for regressions.

No test framework is configured. Evaluation uses `@mastra/evals` scorers at runtime.

## Architecture

LO-Solver uses **Mastra** (AI agent orchestration) to solve Linguistics Olympiad Rosetta Stone problems. Multiple LLMs are accessed via **OpenRouter** (`src/mastra/openrouter.ts`).

### Solver Workflow

The solver workflow lives at `src/mastra/workflow/`. It uses per-rule and per-sentence testing with orchestrated feedback loops (4 steps, verification loop of up to 4 iterations).

### Pipeline

1. **Extract** (GPT-5-mini) — Parse raw problem into structured context/dataset/questions
2. **Hypothesize** (Gemini 3 Flash → GPT-5-mini extractor) — Generate linguistic rules + vocabulary
3. **Verify & Improve** (iterative loop) — Orchestrator tests each rule and sentence individually via tool calls to dedicated tester agents, then an improver agent revises failing rules
4. **Answer** (Gemini 3 Flash) — Apply validated rules to translate questions

### Frontend (Next.js)

- `src/app/layout.tsx` — Root layout (server component), contains nav bar
- `src/app/page.tsx` — Main solver page (client component), uses `useChat` with `DefaultChatTransport` to call `/api/solve`
- `src/components/` — UI components (shadcn/ui primitives in `ui/`)
- `src/hooks/` — React hooks
- Request flow: page.tsx builds `inputData` in `prepareSendMessagesRequest` → POST to `/api/solve` → Mastra workflow receives it as `inputData`
- shadcn/ui is configured; add components with `npx shadcn@latest add <name>`
- `StepProgress`, `DevTracePanel`, `TraceEventCard` — Pipeline progress and real-time trace UI components
- Event types defined in `src/lib/workflow-events.ts` (`WorkflowTraceEvent` union); parsing/grouping logic in `src/lib/trace-utils.ts`
- `UIStepId` extends backend `StepId` with `verify-${N}` and `improve-${N}` patterns, derived from `data-verify-improve-phase` boundary events. `getUIStepLabel()` produces display labels. The progress bar and trace panel use `UIStepId`; the backend continues to use `StepId`.

### File Conventions

- `workflow.ts` — Workflow definition with steps
- `workflow-schemas.ts` — Zod schemas and types shared across workflow steps and tools
- `*-agent.ts` — Agent definition (one per file)
- `*-instructions.ts` — System prompt for the corresponding agent
- `*-tool.ts` — Tool definitions used by agents
- `index.ts` — Re-exports agents/tools for registration in `src/mastra/index.ts`

### Key Patterns

**Two-agent chains**: Natural language reasoning agent → JSON extraction agent. Used in Steps 2 and 3b.

**RequestContext for shared state**: Per-execution mutable state passed through `RequestContext`. Keys defined in `request-context-types.ts` (source of truth), accessed via helpers in `request-context-helpers.ts`.

**Vocabulary tools**: Five tools (`vocabulary-tools.ts`) that read/write the vocabulary Map in RequestContext. Agents with vocabulary access get these tools plus a prompt fragment from `vocabulary-tools-prompt.ts`.

**generateWithRetry** (`agent-utils.ts`): Wrapper around `Agent.generate()` with 10-minute timeout, up to 2 retries with exponential backoff. Used for all LLM calls in workflow steps.

**Execution logging**: Markdown logs written to `{LOG_DIRECTORY}/workflow_*.md` via `logging-utils.ts`.

**Event streaming to frontend**: Workflow steps emit typed events via `writer.write()` on the step's `ToolStream`. **Caution:** `ctx.writer?.custom()` inside tools is a silent no-op when agents run inside workflow steps. To emit events from tools, use the step writer passed via `step-writer` in RequestContext and the `emitToolTraceEvent` helper in `request-context-helpers.ts`.

### Evaluation System

- `npm run eval` — Run evaluation against ground-truth problems
- `npm run eval -- --mode testing|production` — Choose model mode (default: testing)
- `npm run eval -- --concurrency N` — Parallel problem execution (default: 1)
- `npm run eval -- --problem <id>` — Run a single problem by ID
- Results stored as JSON in `evals/results/` (gitignored)
- Custom scorer uses `createScorer` from `@mastra/core/evals` (preprocess → generateScore → generateReason pipeline)
- `src/evals/problems.ts` — Ground-truth problem definitions from Linguini dataset
- `src/evals/translation-scorer.ts` — Translation accuracy scorer
- `src/evals/storage.ts` — Result persistence (JSON files)
- `src/evals/run.ts` — CLI entry point

## Conventions

- Agent IDs: `{descriptor}` (e.g., `initial-hypothesizer`)
- Agent display names: `[Step N] Name` (e.g., `[Step 2] Initial Hypothesizer Agent`)
- All agents use `UnicodeNormalizer` input processor
- Models chosen per agent: GPT-5-mini for extraction/testing, Gemini 3 Flash for reasoning
- Do not run npm scripts automatically; verify with `npx tsc --noEmit` after code changes
- Treat `mastra.db*` and `logs/` as ephemeral — do not commit or delete without being asked
- Comments should be neutral, describing current behavior (no "Better"/"Improved"/"Enhanced")
- TypeScript ES modules; prefer named exports; keep files focused on a single agent/workflow
- Format with Prettier (`.prettierrc`: 2-space indent, single quotes, 100 char width); run before pushing

## Git

- Imperative mood ("Add feature" not "Added feature")
- Capitalise first letter
- No conventional commits prefix (no `feat:`, `fix(scope):`, etc.)
- For small, self-contained changes: commit and push proactively without asking
- For large or multi-step changes: proactively ask whether to commit and push

## Environment

- Node.js >= 22.13.0
- `.env` requires `OPENROUTER_API_KEY`; optional `LOG_DIRECTORY`. In a git worktree, copy `.env` from the main working tree (usually `../../.env`)
- Example prompts/data live in `examples/`
