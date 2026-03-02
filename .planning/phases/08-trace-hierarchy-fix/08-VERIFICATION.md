---
phase: 08-trace-hierarchy-fix
verified: 2026-03-02T09:30:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
human_verification:
  - test: "Run a full solve and observe the trace panel hierarchy"
    expected: "Every tool call card (addVocabulary, testRule, getRules, etc.) appears nested inside its parent agent card. No tool cards appear at the root level of a step section. Browser DevTools console shows no [trace] Orphaned tool call warnings."
    why_human: "The visual nesting of tool cards under agent cards requires a live workflow execution to observe. The backend parentId fix is code-verified, but correct rendering of the resulting event stream can only be confirmed by triggering a real solve."
---

# Phase 8: Trace Hierarchy Fix Verification Report

**Phase Goal:** Tool-call trace events nest correctly under their parent agent with no orphans or fallback hacks
**Verified:** 2026-03-02T09:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria (from ROADMAP.md)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Every tool-call trace event emitted by the backend carries a parentId that matches an existing agent-start event | VERIFIED | `emitToolTraceEvent` reads `parent-agent-id` from RequestContext and injects `parentId: parentAgentId ?? ''` on every `data-tool-call` event (request-context-helpers.ts:164-175). All four tool-calling RequestContext instances set `parent-agent-id` before every agent call and clear it after (workflow.ts: 16 set calls confirmed). |
| 2 | The activeAgentStack fallback in groupEventsWithAgents (trace-utils.ts) is removed because it is no longer needed | VERIFIED | `grep -n "activeAgentStack"` returns no matches in trace-utils.ts. The `groupEventsWithAgents` function (trace-utils.ts:241-305) handles only explicit `parentId` lookup via `agentMap`, with orphan fallthrough and `console.warn`. |
| 3 | In the trace panel, every tool card renders nested inside its parent agent card with no orphaned tool calls at the root level | VERIFIED (code path) / NEEDS HUMAN (visual) | `groupEventsWithAgents` wires tool calls into `parentGroup.toolCalls` and `parentGroup.children` when parentId matches. `AgentCard` (trace-event-card.tsx:640+) renders `children` via `buildRenderItems`. The code path is correct. Visual confirmation requires a live solve. |

### Observable Truths (Plan must_haves)

**Plan 08-01 must_haves:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every tool-call trace event emitted by the backend carries a parentId that matches an existing agent-start event's id | VERIFIED | `emitToolTraceEvent` in request-context-helpers.ts:158-189 reads `parent-agent-id` from RequestContext and injects it. The `WorkflowRequestContext` `parent-agent-id` is set before every `generate()` call that uses tools and cleared after. |
| 2 | The deprecated AgentReasoningEvent and old ToolCallEvent types no longer exist in the codebase | VERIFIED | `grep -rn "AgentReasoningEvent"` and `grep -rn "HierarchicalToolCallEvent"` both return zero results across all of `src/`. Neither interface appears in workflow-events.ts. |
| 3 | The Hierarchical prefix is removed from all event type names (ToolCallEvent, AgentStartEvent, AgentEndEvent) | VERIFIED | workflow-events.ts exports `AgentStartEvent` (line 63), `AgentEndEvent` (line 77), `ToolCallEvent` (line 93) — none with Hierarchical prefix. WorkflowTraceEvent union (line 265-267) references these clean names. |

**Plan 08-02 must_haves:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 4 | Tools render nested under their actual parent agent in the trace panel with no orphans or misassignments | VERIFIED (code) / NEEDS HUMAN (visual) | `groupEventsWithAgents` assigns tool calls via `parentId` lookup. `AgentCard` renders children array. orphan path produces `console.warn`. Code path correct; visual needs human. |
| 5 | The activeAgentStack fallback in groupEventsWithAgents is removed | VERIFIED | No occurrence of `activeAgentStack` in trace-utils.ts. |
| 6 | Orphaned tool-calls (missing or unmatched parentId) render at root level of the step group with a console.warn | VERIFIED | trace-utils.ts:293-297 has `console.warn('[trace] Orphaned tool call: toolName=..., parentId=...')` followed by fall-through to `result.push(event)` at line 301. |

**Score:** 6/6 truths verified (1 also flags for human visual confirmation)

### Required Artifacts

| Artifact | Status | Level 1: Exists | Level 2: Substantive | Level 3: Wired | Details |
|----------|--------|----------------|---------------------|----------------|---------|
| `src/lib/workflow-events.ts` | VERIFIED | Yes | Yes — exports `AgentStartEvent`, `AgentEndEvent`, `ToolCallEvent` (clean names, no Hierarchical prefix). `WorkflowTraceEvent` union updated. No deprecated types. | Imported by trace-utils.ts, trace-event-card.tsx | Contains `export interface ToolCallEvent` with `id`, `parentId`, `stepId` fields. |
| `src/mastra/workflow/request-context-helpers.ts` | VERIFIED | Yes | Yes — `emitToolTraceEvent` reads `parent-agent-id`, injects `parentId: parentAgentId ?? ''` into data-tool-call events. | Called by vocabulary-tools, rules-tools, and other tools via `emitToolTraceEvent(ctx.requestContext, ...)` | Line 164-175 confirmed. |
| `src/mastra/workflow/workflow.ts` | VERIFIED | Yes | Yes — all four RequestContext instances (main, perspective, verify, convergence) call `set('parent-agent-id', ...)` before agent calls and `set('parent-agent-id', undefined)` after. | Sets `parent-agent-id` on contexts consumed by tool-calling agents | 16 set calls confirmed via grep. verifyRequestContext now also sets `step-id` (bug fix from Plan 01). |
| `src/lib/trace-utils.ts` | VERIFIED | Yes | Yes — `groupEventsWithAgents` uses explicit parentId lookup only. `console.warn` for orphans at line 293-297. No `activeAgentStack`. `AgentGroup` uses `AgentStartEvent`, `AgentEndEvent`, `ToolCallEvent`. | Imported and called by `dev-trace-panel.tsx:276` | Imports `AgentStartEvent`, `AgentEndEvent`, `ToolCallEvent` from workflow-events (lines 5-7). |
| `src/components/trace-event-card.tsx` | VERIFIED | Yes | Yes — `AgentCard` renders children array (tool calls + sub-agents) via `buildRenderItems`. No `data-agent-reasoning` case. Imports `ToolCallEvent` (not `HierarchicalToolCallEvent`). | Used by `dev-trace-panel.tsx` for rendering agent groups | `AgentCard` at line 640 receives `AgentGroup` with `children: Array<AgentGroup | ToolCallEvent>`. |
| `src/components/dev-trace-panel.tsx` | VERIFIED | Yes | Yes — calls `groupEventsWithAgents` at line 276. | Output consumed for rendering step events | Line 8: imports `groupEventsWithAgents`; line 276: calls it. |

### Key Link Verification

**Plan 08-01 key links:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/mastra/workflow/workflow.ts` | `src/mastra/workflow/request-context-helpers.ts` | `parent-agent-id` set in RequestContext, read by `emitToolTraceEvent` | WIRED | `workflow.ts` calls `set('parent-agent-id', ...)` 8 times (before each agent call). `emitToolTraceEvent` reads this at line 164: `requestContext.get('parent-agent-id')`. |
| `src/lib/workflow-events.ts` | `src/lib/trace-utils.ts` | Renamed type imports consumed by frontend grouping | WIRED | `trace-utils.ts` lines 5-7 import `AgentStartEvent`, `AgentEndEvent`, `ToolCallEvent` from `./workflow-events`. Used in `AgentGroup` interface and `groupEventsWithAgents` type casts. |

**Plan 08-02 key links:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/trace-utils.ts` | `src/components/dev-trace-panel.tsx` | `groupEventsWithAgents` output consumed by trace panel rendering | WIRED | `dev-trace-panel.tsx` line 8 imports `groupEventsWithAgents`; line 276 calls it on `displayEvents`; result used for rendering. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HIER-01 | 08-01-PLAN.md | Tool-call trace events carry correct parentId matching their parent agent-start event | SATISFIED | `emitToolTraceEvent` injects `parentId` from `parent-agent-id` on all `data-tool-call` events. All four tool-calling RequestContext instances set `parent-agent-id` before agent calls. |
| HIER-02 | 08-02-PLAN.md | Tools render nested under their actual parent agent in the trace panel (no orphans or misassignments) | SATISFIED (code) / NEEDS HUMAN (visual) | `groupEventsWithAgents` uses explicit parentId lookup only (no activeAgentStack fallback). `AgentCard` renders children array for nested display. Orphans warn and fall through to root. Visual confirmation needs a live solve. |

**Orphaned requirements:** None. Both HIER-01 and HIER-02 are mapped to this phase in REQUIREMENTS.md and claimed in plan frontmatter.

### Anti-Patterns Found

Scanned files modified in this phase: `src/lib/workflow-events.ts`, `src/lib/trace-utils.ts`, `src/components/trace-event-card.tsx`, `src/components/activity-indicator.tsx`, `src/mastra/workflow/workflow.ts`.

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/mastra/workflow/request-context-helpers.ts:175` | `parentId: parentAgentId ?? ''` — empty string fallback when no parent | Info | When no agent is active, `parentId` is `''` (empty string). The frontend checks `if ('parentId' in event.data && event.data.parentId)` which treats `''` as falsy, so the tool call falls through to the orphan warn. This is intentional design and consistent with the plan. |

No blockers or warnings found. The empty string fallback is documented behavior.

### Human Verification Required

#### 1. Visual trace panel hierarchy during a live solve

**Test:** Start `npm run dev`. Navigate to `http://localhost:3000`. Enter a linguistics problem and run the solver. Observe the trace panel on the right as the workflow executes.

**Expected:**
- Every tool call card (e.g., addVocabulary, testRule, getRules) appears **nested inside** its parent agent card, indented under the agent header
- No tool cards appear at the root level of a step section floating outside an agent card
- Open browser DevTools console — there should be **no** `[trace] Orphaned tool call` warnings
- The hierarchy reads: Step section > Agent card > Tool call cards (and/or sub-agent cards)
- No `data-agent-reasoning` events appear anywhere (no legacy event type rendering)

**Why human:** The parentId injection is code-verified, but the end-to-end rendering requires a live workflow event stream to validate that events arrive in the correct order, parentIds resolve correctly against the agentMap at time of processing, and the visual nesting appears as intended.

### Gaps Summary

No gaps found. All six must-have truths are verified at the code level. All required artifacts exist, are substantive, and are correctly wired. All key links are confirmed. Both requirements (HIER-01, HIER-02) are satisfied by the implementation. TypeScript compiles cleanly (the two CSS module errors are pre-existing, unrelated to Phase 8).

One item is flagged for human verification — the visual trace panel rendering during a live solve — but this is a completeness check, not a blocker. The code path is fully correct.

---

_Verified: 2026-03-02T09:30:00Z_
_Verifier: Claude (gsd-verifier)_
