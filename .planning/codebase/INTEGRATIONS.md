# External Integrations

## APIs & Services
| Service | Purpose | Config Location |
|---------|---------|-----------------|
| OpenRouter | Multi-model LLM gateway -- routes requests to OpenAI, Google, and other providers via a single API key | `src/mastra/openrouter.ts` (provider instance), `.env` (`OPENROUTER_API_KEY`) |
| OpenAI GPT-5-mini (via OpenRouter) | Extraction and structured output agents: problem extractor (Step 1), hypothesis extractor (Step 2b), feedback extractor (Step 3a2), improvement extractor (Step 3b2) | Agent files in `src/mastra/workflow/` |
| Google Gemini 3 Flash (via OpenRouter) | Reasoning agents: initial hypothesizer (Step 2a), verifier orchestrator (Step 3a1), rules improver (Step 3b1), question answerer (Step 4) | Agent files in `src/mastra/workflow/` |
| OpenAI GPT-OSS-120B (via OpenRouter) | Cheap model used by all agents in "testing" mode (toggled via frontend UI) | `src/mastra/openrouter.ts` (`TESTING_MODEL` constant) |
| Mastra Studio | Dev-time dashboard for inspecting agents, workflows, and execution traces (served at port 4111 by `mastra dev`) | `mastra` CLI dev dependency |

## Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | Yes | API key for authenticating with OpenRouter's multi-model LLM gateway |
| `LOG_DIRECTORY` | No | Absolute path for workflow execution logs; defaults to `{cwd}/logs/` if unset |

## Data Storage

### LibSQL / SQLite (Mastra Storage)
- **Engine**: LibSQL via `@mastra/libsql` (`LibSQLStore`)
- **Location**: `mastra.db` in the project root (file-based, `file:` URL scheme)
- **Purpose**: Mastra's internal storage for workflow state persistence, agent memory, and observability data
- **Config**: `src/mastra/index.ts` -- `new LibSQLStore({ id: 'mastra-storage', url: 'file:{cwd}/mastra.db' })`
- **Note**: Treated as ephemeral -- `.gitignore` excludes `*.db` and `*.db-*` files

### Markdown Execution Logs
- **Engine**: Plain filesystem writes (`fs.writeFileSync` / `fs.appendFileSync`)
- **Location**: `LOG_DIRECTORY` env var or `{cwd}/logs/` by default
- **Naming**: `workflow_{YYYY-MM-DD_HH-MM-SS}.md` (timestamp in GMT+8)
- **Purpose**: Detailed per-execution logs including agent reasoning output, structured JSON results, validation errors, vocabulary changes, and timing summaries
- **Config**: `src/mastra/workflow/logging-utils.ts`
- **Note**: Treated as ephemeral -- `.gitignore` excludes `logs/`

### Example Problem Data
- **Hand-curated problems**: Markdown files in `examples/` directory (UKLO and Onling.org competition problems)
- **Linguini dataset**: JSONL file at `examples/linguini/dataset_enriched.jsonl` (IOL competition problems, loaded and grouped by `examples/index.ts`)
- **Server-side access**: `src/lib/examples-server.ts` reads files with `fs.readFileSync`, served via `/api/examples` and `/api/examples/[id]` API routes

### In-Memory State (Per-Execution)
- **Vocabulary Map**: `Map<string, VocabularyEntry>` passed through `RequestContext` across workflow steps and tools; serialized to workflow state as a plain object between steps
- **RequestContext**: Mastra's `RequestContext<WorkflowRequestContext>` carries per-execution mutable state (vocabulary, structured problem, current rules, log file path, model mode, step writer) -- defined in `src/mastra/workflow/request-context-types.ts`

## Streaming & Communication

### Frontend-to-Backend
- **Transport**: `DefaultChatTransport` from Vercel AI SDK, POST to `/api/solve`
- **API route**: `src/app/api/solve/route.ts` -- calls `handleWorkflowStream` from `@mastra/ai-sdk`, returns `createUIMessageStreamResponse`
- **Timeout**: `maxDuration = 600` seconds (10 minutes) on the API route

### Backend-to-Frontend Event Streaming
- **Mechanism**: Workflow steps emit typed events via `writer.write()` on the step's `ToolStream`
- **Event types**: Defined in `src/lib/workflow-events.ts` as a `WorkflowTraceEvent` discriminated union (step-start, step-complete, agent-reasoning, tool-call, vocabulary-update, iteration-update, verify-improve-phase)
- **Tool events**: Tools use `emitToolTraceEvent` helper (via step writer stored in RequestContext) since `ctx.writer?.custom()` is a no-op inside workflow step tool calls
- **Frontend parsing**: `src/lib/trace-utils.ts` and the main page component filter and group `data-*` typed parts from assistant messages

## Observability
- **Mastra Observability**: Enabled globally via `new Observability({ default: { enabled: true } })` in `src/mastra/index.ts`
- **Pino Logger**: `PinoLogger` at `info` level for Mastra framework-level logging
- **Console logging**: Workflow steps log step timing to console (`console.log` with step name, duration, completion time)
