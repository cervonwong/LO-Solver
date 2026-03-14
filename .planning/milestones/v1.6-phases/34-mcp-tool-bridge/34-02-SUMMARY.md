---
phase: 34-mcp-tool-bridge
plan: 02
subsystem: api
tags: [mcp, claude-code, workflow-steps, request-context, tool-bridge]

# Dependency graph
requires:
  - phase: 34-mcp-tool-bridge
    provides: createMcpToolServer factory, claude-code-provider RequestContext key, agent factory per-execution lookup
provides:
  - Per-RequestContext MCP server creation in all 3 tool-using workflow steps
  - Full E2E solve through Claude Code provider with all 12 agents and MCP tool calls
  - attachMcpProvider helper for conditional MCP server wiring
  - MCP provider caching to avoid transport reuse errors
affects: [35-frontend-integration, 36-evaluation-support]

# Tech tracking
tech-stack:
  added: []
  patterns: [attachMcpProvider helper for conditional MCP wiring, per-perspective MCP server isolation, MCP transport lifecycle management]

key-files:
  created:
    - src/mastra/workflow/steps/02-shared.ts
  modified:
    - src/mastra/workflow/steps/02b-hypothesize.ts
    - src/mastra/workflow/steps/02c-verify.ts
    - src/mastra/workflow/steps/02d-synthesize.ts
    - src/mastra/workflow/steps/02-hypothesize.ts
    - src/mastra/workflow/agent-factory.ts
    - src/mastra/workflow/agent-utils.ts
    - src/mastra/mcp/mcp-tool-bridge.ts
    - src/mastra/workflow/request-context-types.ts
    - src/mastra/workflow/03a-rule-tester-tool.ts
    - src/mastra/workflow/03a-sentence-tester-tool.ts

key-decisions:
  - "Extracted shared attachMcpProvider helper into 02-shared.ts to break circular import dependencies between step sub-modules"
  - "MCP provider is cached on RequestContext after first creation to avoid transport reuse errors"
  - "Tester sub-agents stripped of MCP servers in Claude Code mode since they are invoked by the orchestrator (not standalone)"
  - "Claude Code tool-activity detection routes through streamWithRetry for correct MCP server attachment"

patterns-established:
  - "attachMcpProvider pattern: conditional MCP server creation based on providerMode, reusable across all step files"
  - "Per-perspective MCP isolation: each perspective/verification context gets its own MCP server instance"

requirements-completed: [TOOL-05]

# Metrics
duration: 2 days (cross-session with manual E2E verification checkpoint)
completed: 2026-03-14
---

# Phase 34 Plan 02: Workflow Step Wiring and E2E Validation Summary

**MCP tool servers wired into all 3 workflow steps with per-perspective isolation, validated via full E2E solve through Claude Code provider with all 12 agents producing output and trace events visible in UI**

## Performance

- **Duration:** ~2 days (cross-session, includes manual E2E verification)
- **Started:** 2026-03-12T12:39:12Z
- **Completed:** 2026-03-14T03:50:35Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Wired MCP tool bridge into hypothesize (02b), verify (02c), and synthesize (02d) step files with conditional creation when providerMode is claude-code
- Created shared `attachMcpProvider` helper in `02-shared.ts` to avoid circular dependency issues between sub-modules
- Full E2E solve verified through Claude Code provider with vocabulary/rules tool calls, test results, and trace events streaming to the UI
- Per-perspective state isolation maintained via separate MCP server instances per RequestContext

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire MCP server creation into workflow step files** - `f153484`, `973e6ea`, `3fc0bb6`, `3e3d46b`, `432c47b`, `7e3f25e` (feat + multiple auto-fixes)
2. **Task 2: Verify full E2E solve through Claude Code with MCP tools** - checkpoint (human-verified, approved)

## Files Created/Modified
- `src/mastra/workflow/steps/02-shared.ts` - Shared attachMcpProvider helper and common imports for step sub-modules
- `src/mastra/workflow/steps/02-hypothesize.ts` - Refactored to use shared module, removed duplicated code
- `src/mastra/workflow/steps/02b-hypothesize.ts` - MCP server creation per perspective with draft testToolMode
- `src/mastra/workflow/steps/02c-verify.ts` - MCP server creation for verifier with committed testToolMode
- `src/mastra/workflow/steps/02d-synthesize.ts` - MCP server creation for synthesizer (draft) and convergence verifier (committed)
- `src/mastra/workflow/agent-factory.ts` - MCP provider caching and tool-activity routing fixes
- `src/mastra/workflow/agent-utils.ts` - Claude Code tool-activity detection and timeout increase
- `src/mastra/mcp/mcp-tool-bridge.ts` - Transport lifecycle fixes for MCP server reuse
- `src/mastra/workflow/request-context-types.ts` - Provider caching type updates
- `src/mastra/workflow/03a-rule-tester-tool.ts` - Strip MCP from tester sub-agents in Claude Code mode
- `src/mastra/workflow/03a-sentence-tester-tool.ts` - Strip MCP from tester sub-agents in Claude Code mode

## Decisions Made
- Extracted shared code into `02-shared.ts` instead of keeping attachMcpProvider in `02-hypothesize.ts` -- circular dependency between sub-modules required the shared module approach
- MCP provider cached on RequestContext after first creation to avoid MCP transport reuse errors that occurred when creating new providers per agent call
- Tester sub-agents (rule-tester, sentence-tester) stripped of MCP servers in Claude Code mode because they run as sub-agents of the verifier orchestrator, not as standalone tool-using agents
- Claude Code tool-activity detection routes through streamWithRetry to ensure MCP servers are properly attached before agent generation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed MCP bridge passing fake RequestContext proxy to tester sub-agents**
- **Found during:** Task 1
- **Issue:** Tester sub-agents received a proxy RequestContext that broke MCP tool handler closures
- **Fix:** Pass the real RequestContext through to sub-agent invocations
- **Files modified:** src/mastra/mcp/mcp-tool-bridge.ts
- **Committed in:** 973e6ea

**2. [Rule 1 - Bug] Fixed MCP transport reuse error**
- **Found during:** Task 1
- **Issue:** Creating multiple Claude Code providers with the same MCP server caused transport reuse errors
- **Fix:** Cache the provider on RequestContext and add transport lifecycle management
- **Files modified:** src/mastra/mcp/mcp-tool-bridge.ts, src/mastra/workflow/agent-factory.ts, src/mastra/workflow/agent-utils.ts, src/mastra/workflow/steps/02-hypothesize.ts, src/mastra/workflow/request-context-types.ts
- **Committed in:** 3fc0bb6

**3. [Rule 1 - Bug] Stripped MCP from tester sub-agents**
- **Found during:** Task 1
- **Issue:** Tester sub-agents (invoked by orchestrator) received MCP servers they could not use, causing errors
- **Fix:** Strip MCP server configuration from tester sub-agents in Claude Code mode, increase timeout
- **Files modified:** src/mastra/workflow/03a-rule-tester-tool.ts, src/mastra/workflow/03a-sentence-tester-tool.ts, src/mastra/workflow/agent-utils.ts
- **Committed in:** 3e3d46b

**4. [Rule 3 - Blocking] Broke circular dependencies in hypothesize step sub-modules**
- **Found during:** Task 1
- **Issue:** Import cycle between 02-hypothesize.ts and sub-modules (02b, 02c, 02d) caused initialization errors
- **Fix:** Extracted shared code into new 02-shared.ts module
- **Files modified:** src/mastra/workflow/steps/02-shared.ts (created), 02-hypothesize.ts, 02a-dispatch.ts, 02b-hypothesize.ts, 02c-verify.ts, 02d-synthesize.ts
- **Committed in:** 432c47b

**5. [Rule 1 - Bug] Fixed MCP provider caching and Claude Code tool-activity routing**
- **Found during:** Task 1
- **Issue:** MCP provider not cached correctly; tool-activity detection not routing through streamWithRetry
- **Fix:** Proper provider caching on RequestContext and tool-activity routing
- **Files modified:** src/mastra/workflow/agent-factory.ts, src/mastra/workflow/agent-utils.ts, src/mastra/workflow/steps/02-shared.ts
- **Committed in:** 7e3f25e

---

**Total deviations:** 5 auto-fixed (4 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for runtime correctness of MCP tool bridge. The core wiring pattern from the plan was correct, but runtime integration surfaced transport lifecycle and sub-agent invocation issues that required iterative fixing.

## Issues Encountered
- Multiple runtime issues discovered during E2E testing that could not be caught by type-checking alone (MCP transport reuse, sub-agent MCP conflicts, circular imports). Each was fixed iteratively across commits 973e6ea through 7e3f25e.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full Claude Code provider pipeline working end-to-end with all 12 agents
- Phase 34 (MCP Tool Bridge) complete -- all TOOL requirements satisfied
- Ready for Phase 35 (Frontend Integration) to add three-way provider toggle UI
- Ready for Phase 36 (Evaluation Support) to add eval harness provider flag

## Self-Check: PASSED

- All 11 referenced files exist on disk
- All 6 task commits verified in git history
- Task 2 human-verified (approved by user)

---
*Phase: 34-mcp-tool-bridge*
*Completed: 2026-03-14*
