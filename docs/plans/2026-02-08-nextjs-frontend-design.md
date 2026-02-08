# Next.js Frontend for LO-Solver

## Overview

Add a Next.js frontend to the existing Mastra project for runtime visualization of the Workflow 03 pipeline. Two views: a clean user-facing interactive tool and a separate developer trace page with full pipeline visibility.

## Goals

- Users paste a linguistics problem, submit it, and watch the pipeline solve it in real-time
- Step progress bar shows which of the 4 major steps is active
- Results page shows answers with confidence levels, plus the final rules and vocabulary
- Separate dev trace page shows the full conversation flow of agents in swimlane format with reasoning, tool calls, and outputs
- Mastra Studio remains available alongside Next.js for direct workflow debugging

## Tech Stack

- **Next.js** (App Router) — frontend + API routes
- **Tailwind CSS** — styling, plain HTML elements preferred over component wrappers
- **shadcn/ui** (selective) — Collapsible, Badge, Tabs, ScrollArea, ResizablePanel, Table, Textarea, Button. No Card component.
- **@ai-sdk/react** + **ai** — `useChat` hook, `DefaultChatTransport`, `createUIMessageStreamResponse`
- **@mastra/ai-sdk** — `handleWorkflowStream`, `WorkflowDataPart`

## Project Structure

```
lo-solver/
  src/
    app/
      layout.tsx                        # Root layout, global nav
      page.tsx                          # Home: problem input form
      run/[runId]/
        page.tsx                        # User view: progress bar + results
        trace/
          page.tsx                      # Dev trace: swimlanes + detail panel
      api/
        solve/
          route.ts                      # POST: starts workflow, streams events
    components/
      problem-input.tsx                 # Textarea + submit + example picker
      step-progress.tsx                 # 4-step progress indicator
      results-panel.tsx                 # Answers + rules + vocabulary
      dev/
        dev-trace.tsx                   # Swimlane container
        swimlane.tsx                    # Single agent lane
        detail-panel.tsx                # Right-side inspector panel
        iteration-tabs.tsx              # Verify/improve iteration switcher
    mastra/                             # Existing code (unchanged)
      index.ts
      openrouter.ts
      01-one-agent/
      02-extract-then-hypo-test-loop/
      03-per-rule-per-sentence-delegation/
    lib/
      workflow-events.ts                # Event type definitions
  package.json                          # Add next, react, tailwind, shadcn, ai-sdk
  next.config.ts
  mastra.config.ts                      # For Studio
```

## Streaming Architecture

### API Route (`/api/solve/route.ts`)

```typescript
import { handleWorkflowStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/mastra';

export async function POST(req: Request) {
  const params = await req.json();
  const stream = await handleWorkflowStream({
    mastra,
    workflowId: '03-per-rule-per-sentence-delegation-workflow',
    params,
  });
  return createUIMessageStreamResponse({ stream });
}
```

### Frontend Hook

```typescript
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/solve',
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        inputData: {
          rawProblemText: messages[messages.length - 1]?.parts[0]?.text,
        },
      },
    }),
  }),
});
```

### Message Parts

- **`data-workflow`** parts: `{ name, status, steps }` where each step has `status` (`running` | `success` | `failed` | `suspended` | `waiting`), `input`, and `output`. Drives the user-facing progress bar and results.
- **Custom `data-*` parts**: emitted via `writer.write()` in workflow steps for dev-level detail: agent reasoning, tool call inputs/outputs, vocabulary mutations, iteration boundaries.

## Pages

### Home (`/`)

- Centered layout
- Large textarea for pasting the linguistics problem
- "Solve" button
- Dropdown to pick from example problems (Forest Enets, Okinawan, Saisiyat)
- Submitting navigates to the run page

### Run Page (`/run/[runId]`) — User View

```
  Extract ──── Hypothesize ──── Verify/Improve ──── Answer
    [*]            [ ]               [ ]              [ ]

  Status: Extracting problem structure...

  ── Answers ──────────────────────────────────
  Q1: [answer]                         HIGH
  Q2: [answer]                         MEDIUM

  ── Rules (12) ───────────────────────────────
  > Verb agreement                     HIGH
  > Noun cases                         HIGH

  ── Vocabulary (24 entries) ──────────────────
  foreignForm | meaning | type | notes

  [View detailed trace ->]
```

- 4-step progress bar at the top with active step highlighted
- Short status message below the progress bar
- Results sections appear when workflow completes
- Answers shown with confidence badges (HIGH/MEDIUM/LOW)
- Rules list, expandable to show description
- Vocabulary as a table
- Link to dev trace page

### Dev Trace Page (`/run/[runId]/trace`) — Swimlanes + Detail Panel

```
  SWIMLANES (left ~65%)                    DETAIL PANEL (right ~35%)
  ┌────────┐ ┌────────┐ ┌────────┐        ┌─────────────────────────┐
  │Step 1   │ │Step 2a  │ │Step 2b  │       │ Step 2a: Hypothesizer   │
  │Extract  │ │Hypothe- │ │Extrac-  │       │ Gemini 3 Flash          │
  │         │ │sizer    │ │tor      │       │ 2.1 min                 │
  │ prompt  │ │ prompt  │ │ prompt  │       │                         │
  │ (3 ln)  │ │ (5 ln)  │ │ (2 ln)  │       │ ── Reasoning ────────── │
  │         │ │         │ │         │       │                         │
  │ reason  │ │>reason  │ │ reason  │       │ The dataset shows a     │
  │ (trunc) │ │ (trunc) │ │ (trunc) │       │ consistent pattern...   │
  │         │ │         │ │         │       │                         │
  │ output  │ │ output  │ │ output  │       │ (full scrollable text)  │
  │ {...}   │ │ {...}   │ │ {...}   │       │                         │
  │         │ │         │ │         │       │                         │
  │ 0.45m   │ │ 2.1m    │ │ 0.3m    │       │                         │
  └────────┘ └────────┘ └────────┘        └─────────────────────────┘

  < Iteration 1 ─────── Iteration 2 >
```

**Swimlanes (left, horizontally scrollable):**
- One column per agent invocation, ordered chronologically left to right
- Each lane header: agent name, model, duration
- Lane content (vertically scrollable): prompt (truncated) -> reasoning (truncated) -> tool calls (compact badges: tool name + status) -> output JSON (truncated)
- All sections are collapsed/truncated by default
- Clicking any section opens full content in the detail panel
- Active lanes pulse during streaming, completed lanes get a checkmark
- Verify/improve loop iterations separated by tabs at the bottom

**Detail panel (right, resizable):**
- Shows full content of the clicked section from any swimlane
- Context header: step name, agent name, model, duration
- Rendering by type:
  - Reasoning: full text, readable paragraphs
  - Tool call: input JSON + output JSON, syntax highlighted
  - Output: full structured JSON, syntax highlighted
  - Prompt: full prompt text
- Empty state: "Click any section in the trace to inspect"

## Changes to Existing Code

### `workflow.ts` — Add `writer.write()` calls

The only existing file that needs modification. Add custom event emissions at key moments for the dev trace view:

- Step start/complete boundaries
- Agent reasoning after each `generateWithRetry` call
- Iteration count updates in the verify/improve loop

### Tool files — Add trace events

Small additions to tool handlers to emit tool call/result events:

- `03a-rule-tester-tool.ts`: emit rule test input and result
- `03a-sentence-tester-tool.ts`: emit sentence test input and result
- `vocabulary-tools.ts`: emit vocabulary mutation events

### `src/mastra/index.ts` — Absolute DB path

Change LibSQL URL to absolute path so Next.js and Mastra Studio can share the database:

```typescript
url: "file:/absolute/path/to/lo-solver/mastra.db"
```

### No changes to:

- Agent definitions (`*-agent.ts`)
- Agent instructions (`*-instructions.ts`)
- Utility files (`agent-utils.ts`, `request-context-helpers.ts`, `request-context-types.ts`)
- Schemas (all defined in `workflow.ts`, unchanged)

## Dev Scripts

```json
{
  "dev:next": "next dev",
  "dev:studio": "mastra dev",
  "build": "next build",
  "start": "next start"
}
```

Run both `dev:next` and `dev:studio` during development. Studio provides direct workflow access; the Next.js app provides the user-facing and dev trace UIs.

## References

- [Mastra + Next.js guide](https://mastra.ai/guides/getting-started/next-js)
- [Mastra AI SDK UI integration](https://mastra.ai/guides/build-your-ui/ai-sdk-ui)
- [Mastra workflow streaming](https://mastra.ai/docs/streaming/workflow-streaming)
- [AI SDK UI docs](https://ai-sdk.dev/docs/ai-sdk-ui)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Mastra workflow streaming Next.js example](https://github.com/TeXmeijin/mastra-workflow-streaming-example)
