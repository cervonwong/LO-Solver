# Dashboard Redesign — Single-Page Agent Visualization

**Date:** 2026-02-09
**Status:** In Progress (Sprints 1–5 complete)

## Goals

Replace the current multi-route UI (home → run → trace) with a single-page dashboard that provides:

- Live visibility into the agent pipeline as a flow diagram (DAG)
- Chronological detail feed for each agent's reasoning, tool calls, and memory operations
- Collapsible panes for structured problem data, vocabulary state, and final results
- Data-dense layout with light/dark theme support

## Page Layout

Everything lives on a single page (`src/app/page.tsx`), no routing.

### Top Bar (~48px fixed)

| Left | Center | Right |
|------|--------|-------|
| Problem input (compact single-line, expandable to full textarea popover) + 3 example presets + Solve button | Step progress: 4 connected badges (Extract → Hypothesize → Verify & Improve → Answer), active step pulses, Verify step shows iteration badge (e.g. "2/4"). Clicking a step selects its first agent in the DAG. | Theme picker (light/dark/system), Results button (appears on completion), Stop button (while running) |

### Main Workspace (remaining viewport, below top bar)

Split into two resizable panels:

- **Left/Center (~60%):** React Flow canvas with the pipeline DAG
- **Right (~40%, collapsible):** Agent detail panel (chronological feed)

## Flow Diagram (DAG)

Rendered with **React Flow** + dagre/elk auto-layout (top-to-bottom).

### Node Types

- **Step nodes:** Large rounded rectangles for each of the 4 pipeline steps. Color-coded by status: pending=muted, running=blue pulse, complete=green, error=red.
- **Agent nodes:** Smaller cards nested within steps. Show agent name, model badge (e.g. "GPT-5-mini"), duration badge on completion. Two-agent chains (reasoner → extractor) shown as paired nodes with a thin arrow.
- **Tool nodes:** Small circular/diamond nodes for tool calls (testRule, testSentence, vocabulary tools). Appear as children of the calling agent.

### Edges

- **Data flow arrows:** Connect steps sequentially (Extract → Hypothesize → Verify → Answer).
- **Loop-back arrow:** Curved arrow from Improve sub-step back to Verify, animated dash pattern while looping. Iteration counter badge on the edge ("Iteration 2/4").
- **Tool call edges:** Thin dotted lines from agent to tool nodes.

### Interactions

- Click agent node → detail panel opens/updates on the right
- Zoom/pan via React Flow built-ins
- Nodes appear with subtle entrance animation as the workflow progresses
- Canvas starts empty and builds live

## Detail Panel — Agent Chronological Feed

Appears when an agent node is selected. Shows a unified, time-ordered feed.

### Header

Agent name, model badge, step badge, duration, iteration number (if in verify loop). Close button to collapse.

### Feed Items (each with timestamp + icon)

- **Reasoning blocks:** Agent chain-of-thought rendered as markdown. Proportional font (not monospace). Streamed in real-time with typing cursor while agent is active.
- **Tool call blocks:** Collapsible cards showing tool name, input parameters (JSON in monospace, syntax-highlighted), output/result. Green border for success, red for error.
- **Memory operation badges:** Compact inline badges for vocabulary reads/writes (e.g. `+ kuraw → rain (noun)` or `~ updated: tala → star → constellation`).

### Behavior

- Auto-scrolls to bottom while agent is active (scroll lock toggle to pause)
- Smooth transition when switching between agents
- Placeholder when no agent selected: "Select an agent node to view its activity"

## Collapsible Panes

Three overlay drawers accessible from top bar buttons. They overlay the main workspace (DAG stays visible underneath).

### Structured Problem Pane (left drawer)

- Shows Step 1 extraction output: context notes, dataset table (source ↔ target pairs), questions list
- Available once Step 1 completes; button appears in top bar

### Vocabulary Pane (bottom drawer)

- Compact data table: Foreign Form | Meaning | Type | Notes
- Entries flash briefly when added or modified
- Sortable columns, filterable by type
- Live state of the shared vocabulary map, updates in real-time

### Results Pane (right overlay or drawer)

- Final answers with confidence badges (HIGH=green, MEDIUM=yellow, LOW=red)
- Each answer expandable to show working steps
- Rules summary: list of validated rules with descriptions
- Available once Step 4 completes

## Component Architecture

```
src/app/page.tsx                          — Single page, layout shell
src/components/
  top-bar/
    top-bar.tsx                           — Container: input + progress + actions
    problem-input.tsx                     — Compact input + expand popover
    step-progress.tsx                     — 4-step connected badges
    top-bar-actions.tsx                   — Theme picker, results btn, stop btn
  flow/
    workflow-canvas.tsx                   — React Flow wrapper + layout logic
    step-node.tsx                         — Custom React Flow node for steps
    agent-node.tsx                        — Custom React Flow node for agents
    tool-node.tsx                         — Custom React Flow node for tools
    loop-edge.tsx                         — Custom animated loop-back edge
    flow-utils.ts                        — dagre layout, node/edge builders
  detail/
    detail-panel.tsx                      — Right panel container
    agent-header.tsx                      — Agent name, model, duration badges
    feed-item.tsx                         — Single feed entry
    reasoning-block.tsx                   — Markdown-rendered reasoning text
    tool-call-block.tsx                   — Collapsible tool call card
    memory-op-badge.tsx                   — Inline vocabulary operation badge
  panes/
    structured-problem-pane.tsx           — Extracted problem drawer
    vocabulary-pane.tsx                   — Live vocabulary table drawer
    results-pane.tsx                      — Final answers + rules drawer
  ui/                                     — Existing shadcn primitives (keep)
src/lib/
  workflow-events.ts                      — Event types (extend as needed)
  use-workflow-stream.ts                  — Custom hook: useChat + event dispatch
  workflow-store.ts                       — Zustand store for all workflow state
```

## State Management

Single Zustand store holding:

- `events[]` — all streaming events
- `nodes[]` / `edges[]` — React Flow graph state, derived from events
- `selectedAgentId` — which agent's detail to show
- `vocabulary` — current vocabulary map state
- `structuredProblem` — extracted problem data from Step 1
- `results` — final answers and rules from Step 4
- `runStatus` — idle | running | complete | error
- `currentIteration` — verify loop counter

Events from `useChat` feed into the store. All components read reactively. Replaces the current sessionStorage approach.

## Streaming Event Changes (Backend)

### New events

- `data-agent-start` — emitted when an agent begins generating. Fields: `stepId`, `agentId`, `agentName`, `model`, `timestamp`.
- `data-agent-complete` — emitted when agent finishes. Fields: `stepId`, `agentId`, `agentName`, `model`, `timestamp`, `durationMs`.

### Enhanced events

- `data-tool-call` — ensure includes: `agentId`, `toolName`, `input` (JSON), `output` (JSON), `timestamp`, `durationMs`.
- `data-vocabulary-update` — ensure includes: `operation` (add/update/remove), `entry` data, `agentId`.

### Unchanged events

- `data-step-start`, `data-step-complete`, `data-agent-reasoning`, `data-iteration-update` — remain as-is.

## Tech Stack

- **React Flow** (`@xyflow/react`) — DAG rendering with custom nodes/edges
- **Zustand** — lightweight reactive state management
- **shadcn/ui + Tailwind CSS 4** — component library and styling
- **dagre** or **elkjs** — automatic graph layout
- **AI SDK `useChat`** — streaming connection (already in use)
- **react-markdown** — reasoning text rendering

## Implementation Progress

### Sprint 1: Foundation (Complete)
- Installed deps: `@xyflow/react`, `zustand`, `react-markdown`
- Created Zustand store (`src/lib/workflow-store.ts`) with all state and actions
- Extended `workflow-events.ts` with `AgentStartEvent` and `AgentCompleteEvent`
- Simplified `layout.tsx`, rebuilt `page.tsx` as single-page layout shell with resizable panels

### Sprint 2: Top Bar (Complete)
- `top-bar.tsx` — container with left/center/right sections
- `problem-input.tsx` — "Upload problem" / "View loaded problem" button + reset, dialog with textarea and example presets
- `step-progress.tsx` — 4 connected badge pills with status derivation from events
- `top-bar-actions.tsx` — three-dot menu (Ellipsis icon) with shadcn DropdownMenu for theme selection (light/dark/system using lucide icons), stop button, results button

### Sprint 3: Flow Diagram (Complete)
- `flow-utils.ts` — manual vertical layout (dagre removed due to CJS incompatibility), `buildFlowGraph()` derives nodes/edges from events
- `step-node.tsx` — color-coded step rectangles with status indicators and duration badges
- `agent-node.tsx` — agent cards with model pill, status dot, selection ring
- `loop-edge.tsx` — animated bezier loop-back edge with iteration counter
- `workflow-canvas.tsx` — React Flow wrapper with `ReactFlowProvider`, `ResizeObserver`-driven `fitView` for proper panel resize behavior

### Sprint 4: Detail Panel (Complete)
- `feed-utils.ts` — Temporal attribution logic (`getAgentFeedItems`) to assign tool calls and vocabulary events to agents, plus `formatTimestamp` helper
- `agent-header.tsx` — Header bar with status dot, agent name, model badge, step badge, duration, close button
- `reasoning-block.tsx` — Markdown-rendered reasoning text via `react-markdown`, proportional font
- `tool-call-block.tsx` — Collapsible card with green/red left border, JSON input/output in monospace
- `memory-op-badge.tsx` — Color-coded inline badges for vocabulary add/update/remove/clear operations
- `feed-item.tsx` — Three-column layout (timestamp, typed icon, content) wrapper for feed entries
- `detail-panel.tsx` — Main container: empty state placeholder, agent metadata derivation, chronological feed with auto-scroll
### Sprint 5: Collapsible Panes (Complete)
- `structured-problem-pane.tsx` — Dialog overlay showing context, dataset table, and questions list from Step 1 extraction
- `vocabulary-pane.tsx` — Dialog overlay with live vocabulary table (Foreign Form, Meaning, Type) and entry count badge
- `results-pane.tsx` — Dialog overlay showing answer cards and rules with color-coded status badges
- Added `openPane` state and `setOpenPane` action to Zustand store for pane visibility management
- Added pane toggle buttons (Problem, Vocab, Results) to top-bar-actions.tsx with conditional visibility and active state styling
### Sprint 6: Backend Events (Pending)
### Sprint 7: Integration & Polish (Pending)

### Deviations from Original Design
- **No dagre/elkjs**: `@dagrejs/dagre` is CJS-only, incompatible with Next.js bundler. Manual layout used instead (fixed 4-step pipeline makes auto-layout unnecessary).
- **No tool nodes**: Tool calls will be shown in the detail panel feed rather than as separate DAG nodes (reduces visual clutter).
- **Problem input simplified**: Single button + dialog instead of compact inline input with expand popover.

## Visual Style

- Data-dense: compact padding, small fonts, maximize information per pixel
- shadcn components with Tailwind
- Light/dark/system theme via CSS variables (already configured)
- Proportional font for reasoning text, monospace only for JSON/code blocks
