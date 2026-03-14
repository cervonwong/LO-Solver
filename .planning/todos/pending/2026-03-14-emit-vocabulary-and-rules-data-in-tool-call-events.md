---
created: 2026-03-14T11:47:48.848Z
title: Emit vocabulary and rules data in tool call events
area: ui
files:
  - src/mastra/workflow/vocabulary-tools.ts
  - src/lib/workflow-events.ts
  - src/mastra/workflow/request-context-helpers.ts
---

## Problem

The UI cards for vocabulary and rules tool calls (addVocabulary, addRules, updateRules, removeRules, updateVocabulary, removeVocabulary) do not show what vocabulary entries or rules were actually added, updated, or removed. The JSON payload of the emitted tool call events lacks this information, so the frontend has nothing to display.

Need to find where these tool call events are emitted (likely via `emitToolTraceEvent` or step writer in the workflow) and include the actual vocabulary/rules data in the event payload so the UI can render it.

## Solution

1. Find the event emission points for vocabulary and rules tools
2. Include the tool input/output data (entries added, rules modified, etc.) in the emitted event JSON
3. Applies to all vocabulary/rules CRUD tools: add, update, remove for both vocabulary and rules
