# Architecture

## Overview

LO-Solver is an AI-powered system for solving Linguistics Olympiad Rosetta Stone problems. It uses a Next.js frontend paired with a Mastra AI agent orchestration backend. The core solving logic lives in a multi-step workflow that coordinates 10 specialized LLM agents through an evolutionary pipeline: extracting structure from raw problem text, hypothesizing linguistic rules, iteratively verifying and improving those rules, and finally applying validated rules to answer translation questions.

All LLM calls are routed through OpenRouter, which provides access to multiple model providers (OpenAI GPT-5-mini for extraction/testing, Google Gemini 3 Flash for reasoning). A "model mode" toggle allows switching between production models and a cheap testing model for development. The frontend streams real-time trace events from the workflow, rendering agent reasoning, tool calls, and vocabulary mutations as they happen.

## Key Design Patterns

- **Two-agent chains**: A natural-language reasoning agent produces verbose analysis, then a JSON extraction agent parses it into structured output. Used in Steps 2 (hypothesize) and 3b (improve). This separates creative reasoning from structured data extraction, allowing each agent to use the model best suited to its task.

- **RequestContext for shared state**: Per-execution mutable state passed through Mastra's `RequestContext<WorkflowRequestContext>`. Keys are defined in `request-context-types.ts` (the single source of truth) and accessed via typed helpers in `request-context-helpers.ts`. This provides vocabulary, rules, problem data, log file path, model mode, and the step writer to agents and tools without threading parameters through every function signature.

- **Vocabulary tools as mutable shared state**: Five CRUD tools (`getVocabulary`, `addVocabulary`, `updateVocabulary`, `removeVocabulary`, `clearVocabulary`) read and write a `Map<string, VocabularyEntry>` stored in RequestContext. Agents that can modify vocabulary receive these tools plus a shared instruction fragment from `vocabulary-tools-prompt.ts`.

- **Tools wrapping sub-agents**: The `testRule` and `testSentence` tools are Mastra tools that internally call dedicated tester agents (`rule-tester`, `sentence-tester`) via `mastra.getAgentById()`. This allows the orchestrator agent to invoke per-rule and per-sentence testing through standard tool calls, while each test runs as an independent LLM call.

- **Dual tool variants (committed vs. draft)**: Rule and sentence tester tools come in two variants -- one reads the committed ruleset from RequestContext (`testRule`, `testSentence`), the other accepts a ruleset as a parameter (`testRuleWithRuleset`, `testSentenceWithRuleset`). Hypothesizer and improver agents use the "with ruleset" variants to test draft rules before committing.

- **Blind translation for sentence testing**: Sentence tester agents translate without seeing the expected answer. After translation, the tool compares the result against the expected translation in code. This prevents the LLM from reverse-engineering answers.

- **generateWithRetry**: A wrapper around `Agent.generate()` implementing a two-layer timeout strategy (cooperative AbortSignal + hard Promise.race fallback) with up to 2 retries and linear backoff. Handles empty responses, network errors, and model timeouts.

- **Dynamic model selection**: Each agent determines its model at runtime via a function that reads `model-mode` from RequestContext. Production mode uses per-agent model choices; testing mode routes all agents to a single cheap model.

- **Event streaming via step writer**: Workflow steps emit typed trace events via `writer.write()`. Tools emit events through a `step-writer` stored in RequestContext (using `emitToolTraceEvent`), because Mastra's `ctx.writer?.custom()` is a silent no-op inside workflow steps.

- **Workflow state schema**: Zod-validated workflow state (`WorkflowState`) carries vocabulary (serialized as `Record<string, VocabularyEntry>`), log file path, start time, step timings, and model mode. Vocabulary is serialized to/from the Map in RequestContext at step boundaries.

## Data Flow

```
User pastes problem text
        |
        v
[Frontend: page.tsx]
  useChat + DefaultChatTransport
  prepareSendMessagesRequest -> { rawProblemText, modelMode }
        |
        v
[POST /api/solve]
  handleWorkflowStream -> Mastra workflow
        |
        v
[Step 1: Extract Structure]
  Agent: structured-problem-extractor (GPT-5-mini)
  Input:  rawProblemText (string)
  Output: { context, dataset[], questions[] }
        |
        v
[Step 2: Initial Hypothesis]
  Agent chain: initial-hypothesizer (Gemini 3 Flash)
               -> initial-hypothesis-extractor (GPT-5-mini)
  Tools: vocabulary CRUD, testRuleWithRuleset, testSentenceWithRuleset
  Input:  structuredProblem + empty vocabulary
  Output: { rules[], vocabulary (via RequestContext) }
        |
        v
[Step 3: Verify-Improve Loop (up to 4 iterations)]
  3a. Verify:
      Agent chain: verifier-orchestrator (Gemini 3 Flash)
                   -> verifier-feedback-extractor (GPT-5-mini)
      Tools: testRule (-> rule-tester), testSentence (-> sentence-tester)
      Output: { conclusion, errantRules[], errantSentences[], issues[] }

      If conclusion == ALL_RULES_PASS -> skip to Step 4

  3b. Improve:
      Agent chain: rules-improver (Gemini 3 Flash)
                   -> rules-improvement-extractor (GPT-5-mini)
      Tools: vocabulary CRUD, testRuleWithRuleset, testSentenceWithRuleset
      Output: { revisedRules[], updated vocabulary }

      Loop back to 3a with new rules
        |
        v
[Step 4: Answer Questions]
  Agent: question-answerer (Gemini 3 Flash)
  Input:  structuredProblem + validated rules + vocabulary
  Output: { answers[{ questionId, answer, workingSteps, confidence }] }
        |
        v
[Frontend receives streamed results]
  - Step progress bar updates
  - Trace panel shows agent reasoning + tool calls
  - Vocabulary panel shows live CRUD mutations
  - Results panel displays answers with confidence + working steps
```

## Component Interactions

### Backend (Mastra)

- **Mastra instance** (`src/mastra/index.ts`): Central registry for agents, workflows, storage, logging, and observability. All agents are registered here for discoverability via `mastra.getAgentById()`.

- **Workflow -> Steps**: The workflow chains steps using `.then()` and `.dountil()`. Steps communicate through typed input/output schemas (Zod) and shared workflow state.

- **Steps -> Agents**: Each step calls `mastra.getAgentById()` to retrieve registered agents and invokes them via `generateWithRetry()`.

- **Agents -> Tools**: Agents use tools registered in their definition. The orchestrator agent calls `testRule`/`testSentence` tools, which internally call sub-agents.

- **Tools -> RequestContext**: Tools access shared runtime state (vocabulary, problem data, rules) through typed helpers that read from `RequestContext`.

- **Events -> Frontend**: Steps and tools emit `WorkflowTraceEvent` objects (a discriminated union of 7 event types) through the step writer. These flow through `handleWorkflowStream` -> `createUIMessageStreamResponse` to the frontend as data parts in assistant messages.

### Frontend (Next.js)

- **page.tsx**: Main solver page. Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointing to `/api/solve`. Processes streamed data parts into progress steps, trace events, vocabulary updates, and results.

- **Layout -> Page**: `layout.tsx` (server component) provides the root HTML structure and nav bar with model mode toggle. `page.tsx` (client component) renders the full solver UI.

- **Resizable panels**: The UI is split into a left panel (input + results + progress) and a right panel (trace view + vocabulary table), with draggable dividers.

- **Event processing**: `workflow-events.ts` defines the event type union; `trace-utils.ts` provides `groupEventsByStep()` and `groupEventsWithToolCalls()` for organizing events into UI sections.

- **Examples API**: Two API routes (`/api/examples` and `/api/examples/[id]`) serve example problems from the `examples/` directory (hand-curated problems) and the Linguini JSONL dataset (IOL competition problems).

### Cross-Cutting

- **OpenRouter** (`openrouter.ts`): Single provider instance shared by all agents. Model selection is per-agent, using `activeModelId()` to resolve the actual model based on mode.

- **Logging** (`logging-utils.ts`): Markdown execution logs written to timestamped files in `logs/`. Records agent outputs, reasoning, vocabulary mutations, step timings, and validation errors.

- **Observability**: Mastra's built-in observability is enabled for all agents via the `observability` config in the Mastra instance.

## State Management

### Workflow State (per execution)

Managed by Mastra's workflow state system via `setState()`/`state`. Persisted in LibSQL (`mastra.db`). Contains:

- `vocabulary`: Serialized `Record<string, VocabularyEntry>` -- the vocabulary Map is serialized to/from this at step boundaries
- `logFile`: Path to the current execution's markdown log file
- `startTime`: ISO timestamp of workflow start
- `stepTimings`: Array of `{ stepName, agentName, endTime, durationMinutes }`
- `modelMode`: `'testing' | 'production'`

### RequestContext (per execution, in-memory)

A `RequestContext<WorkflowRequestContext>` instance created at the start of each step. Contains:

- `vocabulary-state`: Mutable `Map<string, VocabularyEntry>` -- the live vocabulary
- `structured-problem`: Immutable parsed problem data
- `current-rules`: Current rules array (updated each verify-improve iteration)
- `log-file`: Path to markdown log file
- `model-mode`: `'testing' | 'production'`
- `step-writer`: Reference to the workflow step's writer for emitting trace events from tools

### Client State

- **React state** in `page.tsx`: Chat messages, progress steps, trace events, vocabulary accumulation, UI state (input open/closed, scroll position)
- **localStorage**: Model mode preference (`lo-solver-model-mode`), persisted across sessions via `useModelMode` hook
- **MascotContext**: React context for mascot animation state (`idle | ready | solving | solved | error`), synchronized with workflow progress

### Persistent Storage

- **LibSQL** (`mastra.db`): Mastra's storage backend for workflow execution state, agent data, and observability traces
- **File system** (`logs/`): Markdown execution logs, one per workflow run
- **File system** (`examples/`): Static example problem files and Linguini JSONL dataset
