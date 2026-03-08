---
phase: 28-agent-factory
plan: 01
subsystem: workflow
tags: [mastra, agent, factory-pattern, typescript, refactoring]

# Dependency graph
requires:
  - phase: 27-dead-code-type-safety
    provides: Clean codebase with verified type safety
provides:
  - createWorkflowAgent() factory function for agent construction
  - WorkflowAgentConfig interface for flat agent configuration
  - RULE_TESTER_INSTRUCTIONS extracted to separate file
  - SENTENCE_TESTER_INSTRUCTIONS extracted to separate file
affects: [28-02 agent migration]

# Tech tracking
tech-stack:
  added: []
  patterns: [factory function for Agent construction, flat config over variant categorization]

key-files:
  created:
    - src/mastra/workflow/agent-factory.ts
    - src/mastra/workflow/03a-rule-tester-instructions.ts
    - src/mastra/workflow/03a-sentence-tester-instructions.ts
  modified: []

key-decisions:
  - "Used import('zod').ZodType<any> inline type to avoid runtime Zod dependency in factory"
  - "Used local ToolsInput type alias (Record<string, any>) since @mastra/core does not publicly export ToolsInput"
  - "Typed instructions role as literal 'system' to match Mastra SystemModelMessage type"

patterns-established:
  - "Factory pattern: createWorkflowAgent(config) returns Agent with model resolver, UnicodeNormalizer, and requestContextSchema pre-built"

requirements-completed: [STR-04, STR-06]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 28 Plan 01: Agent Factory Foundation Summary

**createWorkflowAgent() factory with flat config handling model resolution, UnicodeNormalizer, and requestContextSchema plus extracted tester instructions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T13:34:20Z
- **Completed:** 2026-03-08T13:37:31Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Factory function that eliminates repeated Agent constructor boilerplate across 12 agent files
- WorkflowAgentConfig interface supporting all three agent variants (standard, tester, tool-equipped) via flat config
- Tester agent instructions extracted to separate files following *-instructions.ts project convention

## Task Commits

Each task was committed atomically:

1. **Task 1: Create agent factory function and config type** - `91dfc4f` (feat)
2. **Task 2: Extract tester agent instructions to separate files** - `c1225b3` (feat)

## Files Created/Modified
- `src/mastra/workflow/agent-factory.ts` - Factory function and config interface for workflow agent construction
- `src/mastra/workflow/03a-rule-tester-instructions.ts` - Rule tester agent system prompt (extracted from agent file)
- `src/mastra/workflow/03a-sentence-tester-instructions.ts` - Sentence tester agent system prompt (extracted from agent file)

## Decisions Made
- Used `import('zod').ZodType<any>` inline type reference for `requestContextSchema` to keep factory free of runtime Zod dependency
- Defined local `ToolsInput = Record<string, any>` type alias since `@mastra/core` does not publicly export `ToolsInput` from any module entry point
- Changed instructions type from `{ role: string; content: string }` to `{ role: 'system'; content: string }` to match Mastra's `SystemModelMessage` type constraint

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed instructions type to use literal 'system' role**
- **Found during:** Task 1 (agent factory creation)
- **Issue:** Plan specified `{ role: string; content: string }` but Mastra's Agent constructor requires `SystemModelMessage` with `role: 'system'` literal type, causing TS2322
- **Fix:** Changed interface to `{ role: 'system'; content: string }`
- **Files modified:** src/mastra/workflow/agent-factory.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 91dfc4f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type correction necessary for compile-time safety. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Factory function ready for Plan 02 to migrate all 12 agent files
- Tester instruction files ready for import during migration
- No blockers for proceeding

## Self-Check: PASSED

All files found, all commits verified.

---
*Phase: 28-agent-factory*
*Completed: 2026-03-08*
