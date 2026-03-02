---
created: 2026-03-02T04:26:14.317Z
title: Investigate missing parentId on tool-call trace events
area: ui
files:
  - src/lib/trace-utils.ts:277
  - src/lib/workflow-events.ts
---

## Problem

Some `data-tool-call` trace events arrive without a `parentId` (or with a `parentId` that doesn't match any `data-agent-start` event in the same step group). This causes tool calls to render outside their parent agent in the hierarchical trace panel.

The `HierarchicalToolCallEvent` type declares `parentId: string` as required, but at runtime some events either lack the field or carry an ID that doesn't correspond to any agent in `agentMap`.

A bandaid fallback was added in `groupEventsWithAgents` (trace-utils.ts:277) that assigns orphaned tool calls to the most recently opened active agent. This masks the root cause.

Possible causes to investigate:
- Backend emitter not setting `parentId` on all tool-call events
- Tool calls emitted from workflow step context (not inside an agent `generate()` call)
- Agent ID mismatch between `agent-start` and `tool-call` events (different ID formats or scoping)
- Events split across different step groups by `groupEventsByStep`, so the agent-start is in one group and its tool calls are in another

## Solution

1. Add temporary logging in `groupEventsWithAgents` to capture orphaned tool call details (toolName, parentId value, available agentMap keys)
2. Run a solve and inspect which tool calls are orphaned and what their parentId values are
3. Trace back to the backend emitter code that produces these events
4. Fix the root cause so all tool-call events carry a correct parentId matching their parent agent-start
5. Remove the activeAgentStack fallback once the real fix is in place
