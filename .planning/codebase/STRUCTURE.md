# Directory Structure

## Top-Level Layout

```
LO-Solver/
  .agents/              # Claude Code agent skills configuration
  .claude/              # Claude Code session data
  .mastra/              # Mastra build output (generated, gitignored)
  .next/                # Next.js build output (generated, gitignored)
  .planning/            # Planning and architecture documents
  .vscode/              # VS Code workspace settings
  docs/plans/           # Design documents and implementation plans
  examples/             # Example linguistics problems and datasets
  logs/                 # Workflow execution logs (ephemeral, not committed)
  node_modules/         # Dependencies (gitignored)
  public/               # Static assets served by Next.js
  src/                  # Application source code
    app/                # Next.js App Router pages and API routes
    components/         # React UI components
    contexts/           # React context providers
    hooks/              # Custom React hooks
    lib/                # Shared utility modules
    mastra/             # Mastra AI workflow, agents, and tools
  mastra.db*            # LibSQL database files (ephemeral, not committed)
```

## Key Directories

### `src/mastra/` -- AI Workflow Engine

- **Purpose**: Contains all Mastra workflow definitions, agent definitions, tool implementations, and shared utilities. This is the core logic of the solver.
- **Key files**:
  - `index.ts` -- Mastra instance creation; registers all agents, workflows, storage, logging, observability
  - `openrouter.ts` -- OpenRouter provider instance, model mode types, `activeModelId()` helper

### `src/mastra/03-per-rule-per-sentence-delegation/` -- Active Workflow

- **Purpose**: The active workflow (Workflow 03) implementing the per-rule, per-sentence delegation pipeline. Contains 10 agents, tools, schemas, and utilities.
- **Key files**:
  - `workflow.ts` -- Workflow definition with 4 steps: extract, hypothesize, verify-improve loop, answer
  - `workflow-schemas.ts` -- All Zod schemas and types shared across steps (input/output/state schemas)
  - `index.ts` -- Re-exports all agents and tools for registration in `src/mastra/index.ts`
  - `request-context-types.ts` -- TypeScript interface for `Workflow03RequestContext` (source of truth for context keys)
  - `request-context-helpers.ts` -- Typed accessor functions for RequestContext data, `emitTraceEvent`/`emitToolTraceEvent` helpers
  - `vocabulary-tools.ts` -- Five CRUD tools for vocabulary management (get, add, update, remove, clear)
  - `vocabulary-tools-prompt.ts` -- Shared instruction fragment injected into agents with vocabulary access
  - `agent-utils.ts` -- `generateWithRetry()` wrapper with timeout, retry, and abort logic
  - `logging-utils.ts` -- Markdown log file creation, agent output logging, vocabulary mutation logging, timing utilities
  - `shared-memory.ts` -- UUID generation for workflow run identification
  - Agent files (see File Naming Conventions below)

### `src/mastra/01-one-agent/` -- Legacy Workflow 01

- **Purpose**: Single-agent solver (commented out in `index.ts`). Kept for reference.
- **Key files**:
  - `one-agent-solver-agent.ts` -- Single agent definition
  - `one-agent-solver-instructions.ts` -- System prompt
  - `one-agent-solver-scorers.ts` -- Evaluation scorers
  - `index.ts` -- Re-exports

### `src/mastra/02-extract-then-hypo-test-loop/` -- Legacy Workflow 02

- **Purpose**: Extract-then-hypothesize-test loop workflow (commented out in `index.ts`). Kept for reference.
- **Key files**:
  - `workflow.ts` -- Multi-step workflow with up to 5 iterations
  - Agent and instruction files for 4 agents
  - `index.ts` -- Re-exports

### `src/app/` -- Next.js App Router

- **Purpose**: Pages and API routes for the web application.
- **Key files**:
  - `layout.tsx` -- Root layout (server component), provides nav bar with model mode toggle, fonts, global CSS
  - `page.tsx` -- Main solver page (client component), contains all solver UI logic: `useChat`, progress tracking, event processing, vocabulary accumulation, resizable panels
  - `globals.css` -- Tailwind CSS configuration and custom styles
  - `api/solve/route.ts` -- POST endpoint that invokes Workflow 03 via `handleWorkflowStream`
  - `api/examples/route.ts` -- GET endpoint listing all example problems
  - `api/examples/[id]/route.ts` -- GET endpoint returning a specific example's text content

### `src/components/` -- UI Components

- **Purpose**: React components for the solver UI.
- **Key files**:
  - `problem-input.tsx` -- Problem text input with example selector (combobox)
  - `step-progress.tsx` -- Pipeline progress bar with clickable step circles
  - `dev-trace-panel.tsx` -- Real-time trace display showing agent reasoning and tool calls, grouped by step
  - `trace-event-card.tsx` -- Individual trace event rendering (agent reasoning, tool calls, iterations)
  - `results-panel.tsx` -- Tabbed display of answers and rules with confidence badges
  - `vocabulary-panel.tsx` -- Live vocabulary table with mutation summary badges
  - `blueprint-card.tsx` -- Styled card container with cyanotype/blueprint aesthetic
  - `lex-mascot.tsx` -- Animated mascot with state-dependent behavior
  - `model-mode-toggle.tsx` -- Testing/production model mode switch
  - `activity-indicator.tsx` -- Current activity status display
  - `skeleton-trace.tsx` -- Loading skeleton for the trace panel
  - `ui/` -- shadcn/ui primitive components (badge, button, collapsible, command, dialog, dropdown-menu, popover, resizable, scroll-area, switch, table, tabs, textarea)

### `src/lib/` -- Shared Utilities

- **Purpose**: Utility modules shared between frontend components.
- **Key files**:
  - `workflow-events.ts` -- TypeScript types for the 7 workflow trace event types (`WorkflowTraceEvent` discriminated union), `StepId`/`UIStepId` types, `getUIStepLabel()` function, step label constants
  - `trace-utils.ts` -- Event grouping logic: `groupEventsByStep()` splits events into step sections (handling verify-improve sub-phases), `groupEventsWithToolCalls()` collapses consecutive tool calls, `formatDuration()` helper
  - `examples.ts` -- Client-safe example problem metadata and label formatting
  - `examples-server.ts` -- Server-side example file reading (filesystem access), Linguini dataset loading and grouping
  - `utils.ts` -- `cn()` class name utility (clsx + tailwind-merge)

### `src/contexts/` -- React Contexts

- **Purpose**: React context providers for cross-component state.
- **Key files**:
  - `mascot-context.tsx` -- `MascotProvider` and `useMascotState` hook for mascot animation state (`idle | ready | solving | solved | error`)

### `src/hooks/` -- Custom Hooks

- **Purpose**: Reusable React hooks.
- **Key files**:
  - `use-model-mode.ts` -- `useModelMode` hook for reading/writing model mode to localStorage with cross-tab synchronization via `useSyncExternalStore`

### `examples/` -- Problem Data

- **Purpose**: Example linguistics problems for testing and demonstration.
- **Key files**:
  - `index.ts` -- `EXAMPLE_PROBLEMS` metadata array, `LinguiniEntry`/`LinguiniQuestion` types, `loadLinguiniQuestions()` parser, `buildLinguiniProblemText()` formatter
  - `linguini/dataset_enriched.jsonl` -- IOL competition problems in JSONL format
  - `*.md` -- Hand-curated problem input/solution files from UKLO and Onling.org competitions

### `public/` -- Static Assets

- **Purpose**: Static files served at the root URL.
- **Key files**:
  - `lex-mascot.png` -- Mascot image used in the UI and as a loading spinner
  - `paper-texture.jpg` -- Paper texture overlay for the cyanotype background aesthetic

### `docs/plans/` -- Design Documents

- **Purpose**: Design documents and implementation plans.

## File Naming Conventions

### Agent files in Workflow 03 (`src/mastra/03-per-rule-per-sentence-delegation/`)

- `{NN}-{descriptor}-agent.ts` -- Agent definition (one agent per file)
  - `NN` = step number in the workflow pipeline (01, 02, 03a, 03b, 04)
  - Letter suffixes distinguish sub-steps (a = verify, b = improve, a2 = extractor)
  - Examples: `01-structured-problem-extractor-agent.ts`, `03a-verifier-orchestrator-agent.ts`

- `{NN}-{descriptor}-instructions.ts` -- System prompt for the corresponding agent
  - Always paired with its agent file: `02-initial-hypothesizer-instructions.ts`

- `{NN}-{descriptor}-tool.ts` -- Tool definitions used by agents
  - Examples: `03a-rule-tester-tool.ts`, `03a-sentence-tester-tool.ts`

### General conventions

- `workflow.ts` -- Workflow definition with steps (one per workflow directory)
- `workflow-schemas.ts` -- Zod schemas and types shared across workflow steps
- `index.ts` -- Re-exports agents/tools for registration in the main Mastra index
- `*-utils.ts` -- Utility/helper modules (`agent-utils.ts`, `logging-utils.ts`)
- `*-types.ts` -- TypeScript type definitions (`request-context-types.ts`)
- `*-prompt.ts` -- Reusable instruction fragments (`vocabulary-tools-prompt.ts`)
- `ui/*.tsx` -- shadcn/ui primitive components (generated, not manually written)

### Agent IDs and display names

- Agent ID format: `wf{N}-{descriptor}` (e.g., `wf03-initial-hypothesizer`)
- Agent display name format: `[{workflow}-{step}] Name` (e.g., `[03-02] Initial Hypothesizer Agent`)

## Entry Points

- `src/mastra/index.ts` -- Mastra instance creation, the root of the backend. Creates and exports the `mastra` singleton with all agents, workflows, storage, and observability. Used by the API route and by Mastra's dev server.
- `src/app/layout.tsx` -- Next.js root layout (server component). Wraps all pages with fonts, global CSS, and the nav bar.
- `src/app/page.tsx` -- Main application page (client component). The primary user-facing entry point containing all solver UI logic.
- `src/app/api/solve/route.ts` -- POST handler that bridges the frontend to the Mastra workflow. Receives input, starts workflow execution, and returns a streamed response.
- `src/app/api/examples/route.ts` -- GET handler listing available example problems.
- `src/app/api/examples/[id]/route.ts` -- GET handler returning a specific example's raw text.
- `examples/index.ts` -- Example problem metadata and Linguini dataset loading. Used by the examples API routes.
- `src/mastra/03-per-rule-per-sentence-delegation/workflow.ts` -- Workflow 03 definition. The main AI pipeline, defining the step chain: extract -> hypothesize -> verify-improve loop -> answer.
- `package.json` scripts:
  - `npm run dev` -- Starts Next.js (port 3000, Turbopack) and Mastra dev server (port 4111, includes Mastra Studio) concurrently
  - `npm run build` -- Next.js production build
  - `npx tsc --noEmit` -- Type-check without emitting
