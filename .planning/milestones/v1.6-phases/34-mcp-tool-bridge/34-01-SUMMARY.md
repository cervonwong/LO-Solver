---
phase: 34-mcp-tool-bridge
plan: 01
subsystem: api
tags: [mcp, claude-code, tool-bridge, ai-sdk, request-context]

# Dependency graph
requires:
  - phase: 33-provider-foundation
    provides: Claude Code provider singleton, agent factory, ProviderMode
provides:
  - createMcpToolServer factory wrapping all 14 Mastra tools as in-process MCP tools
  - MCP_TOOL_DESCRIPTIONS optimized for Claude tool-use
  - claude-code-provider key in WorkflowRequestContext for per-execution provider injection
  - Agent factory per-execution provider lookup with singleton fallback
affects: [34-02-PLAN, workflow steps that invoke tool-using agents]

# Tech tracking
tech-stack:
  added: []
  patterns: [MCP tool server factory with closure-captured RequestContext, per-execution provider via RequestContext]

key-files:
  created:
    - src/mastra/mcp/mcp-tool-bridge.ts
    - src/mastra/mcp/mcp-tool-descriptions.ts
  modified:
    - src/mastra/workflow/request-context-types.ts
    - src/mastra/workflow/agent-factory.ts

key-decisions:
  - "Tool annotations use MCP spec Hint-suffixed names (readOnlyHint, destructiveHint, openWorldHint)"
  - "Mastra Tool.execute bridged via any-cast in createHandler to cross complex generic boundary"
  - "testToolMode parameter controls which tester variant registers under testRule/testSentence names"
  - "MCP_TOOL_DESCRIPTIONS typed as inferred const object (not Record<string,string>) for strict property access"

patterns-established:
  - "createHandler pattern: wraps Mastra tool execute as MCP handler with JSON serialization and error wrapping"
  - "buildToolContext pattern: constructs ToolExecuteContext from closure-captured RequestContext and Mastra instance"

requirements-completed: [TOOL-01, TOOL-02, TOOL-03, TOOL-04]

# Metrics
duration: 6min
completed: 2026-03-12
---

# Phase 34 Plan 01: MCP Tool Bridge Summary

**MCP server factory wrapping all 14 Mastra tools (vocabulary, rules, testers) as in-process MCP tools with closure-captured RequestContext, plus per-execution Claude Code provider injection in agent factory**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-12T12:33:01Z
- **Completed:** 2026-03-12T12:39:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created MCP tool server factory that wraps all 14 Mastra tools as in-process MCP tools via createCustomMcpServer
- All tool handlers delegate to existing Mastra tool execute functions (no duplicated business logic)
- testToolMode parameter enables agent-specific aliasing of testRule/testSentence to committed or draft variants
- Added per-execution Claude Code provider lookup in agent factory, backward-compatible with existing singleton

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MCP tool descriptions and server factory** - `e999122` (feat)
2. **Task 2: Extend RequestContext and agent factory for per-execution provider** - `6fa71fc` (feat)

## Files Created/Modified
- `src/mastra/mcp/mcp-tool-descriptions.ts` - Optimized tool descriptions for all 14 tools
- `src/mastra/mcp/mcp-tool-bridge.ts` - createMcpToolServer factory function with testToolMode support
- `src/mastra/workflow/request-context-types.ts` - Added 'claude-code-provider' optional key
- `src/mastra/workflow/agent-factory.ts` - Per-execution provider lookup with singleton fallback

## Decisions Made
- Used MCP spec annotation names (readOnlyHint, destructiveHint, openWorldHint) instead of the shorthand names from the plan (readOnly, destructive, openWorld) -- discovered at type-check time
- Used `any`-cast in createHandler to bridge Mastra's complex generic Tool type with the simple MCP handler interface -- avoids exposing Mastra internals while preserving runtime delegation
- Typed MCP_TOOL_DESCRIPTIONS as inferred const object instead of Record<string, string> to get strict string types on property access
- Imported McpSdkServerConfigWithInstance from ai-sdk-provider-claude-code (re-export) instead of directly from @anthropic-ai/claude-agent-sdk

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed annotation property names to match MCP spec**
- **Found during:** Task 1 (MCP tool server factory)
- **Issue:** Plan specified `readOnly`, `destructive`, `openWorld` but MCP ToolAnnotations type uses `readOnlyHint`, `destructiveHint`, `openWorldHint`
- **Fix:** Changed all annotation properties to use Hint-suffixed names
- **Files modified:** src/mastra/mcp/mcp-tool-bridge.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** e999122 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed description type from string|undefined to string**
- **Found during:** Task 1 (MCP tool server factory)
- **Issue:** `Record<string, string>` index signature returns `string | undefined`, but createCustomMcpServer requires `string` for description
- **Fix:** Changed MCP_TOOL_DESCRIPTIONS from `Record<string, string>` to inferred const object type
- **Files modified:** src/mastra/mcp/mcp-tool-descriptions.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** e999122 (Task 1 commit)

**3. [Rule 3 - Blocking] Fixed Mastra Tool type incompatibility with wrapHandler**
- **Found during:** Task 1 (MCP tool server factory)
- **Issue:** Mastra `Tool` class has complex generic types that don't match `{ execute: (input: any, ctx: any) => Promise<any> }` shape
- **Fix:** Changed wrapHandler to createHandler accepting `any` typed mastraTool parameter
- **Files modified:** src/mastra/mcp/mcp-tool-bridge.ts
- **Verification:** TypeScript compilation passes, runtime behavior preserved via delegation
- **Committed in:** e999122 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for type correctness. No scope creep.

## Issues Encountered
None beyond the type-check issues documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MCP tool server factory ready for plan 34-02 to wire into workflow steps
- Per-execution provider key in RequestContext ready for workflow steps to populate
- Agent factory will automatically use MCP-enabled provider when set

---
*Phase: 34-mcp-tool-bridge*
*Completed: 2026-03-12*
