---
phase: 27-dead-code-type-safety
plan: 01
subsystem: infra
tags: [knip, dead-code, static-analysis, cleanup]

requires:
  - phase: none
    provides: n/a
provides:
  - Knip dead code detector installed with npm run audit script
  - Deprecated 02a-initial-hypothesis-extractor agent files deleted
  - shared-memory.ts deleted
  - 26 dead exports removed or made private across 18 files
affects: [27-02-dead-code-type-safety]

tech-stack:
  added: [knip@5.86.0]
  patterns: [knip-audit-script, export-visibility-reduction]

key-files:
  created: []
  modified:
    - src/mastra/workflow/index.ts
    - src/mastra/workflow/request-context-helpers.ts
    - src/mastra/workflow/workflow-schemas.ts
    - src/mastra/workflow/rules-tools.ts
    - src/mastra/workflow/vocabulary-tools.ts
    - src/mastra/workflow/logging-utils.ts
    - package.json

key-decisions:
  - "shadcn/ui component exports kept as documented false positives (generated library convention)"
  - "Mastra tool registration exports kept as false positives (runtime spread consumption)"
  - "Dependencies not removed (out of scope for dead export cleanup plan)"

patterns-established:
  - "npm run audit: Knip-based dead code detection for ongoing maintenance"

requirements-completed: [CLN-01, CLN-02, CLN-03]

duration: 9min
completed: 2026-03-08
---

# Phase 27 Plan 01: Dead Code Removal Summary

**Deleted 5 dead files, removed 26 unused exports via Knip analysis, installed permanent audit tooling**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-08T07:33:34Z
- **Completed:** 2026-03-08T07:42:56Z
- **Tasks:** 2
- **Files modified:** 23 (excluding package-lock.json)

## Accomplishments
- Deleted 3 deprecated workflow files (02a-initial-hypothesis-extractor-agent.ts, 02a-initial-hypothesis-extractor-instructions.ts, shared-memory.ts) and 2 unused UI components (activity-indicator.tsx, dropdown-menu.tsx)
- Removed 26 dead exports: 8 dead functions from request-context-helpers.ts, 6 dead schemas/types from workflow-schemas.ts, dead workflowTools aggregation from index.ts, and 11 internal-only exports made private
- Installed Knip v5.86.0 with `npm run audit` script for ongoing dead code detection
- Updated README.md Mermaid diagram, agent table, and file tree to reflect deletions

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete deprecated files and clean references** - `2ac4c93` (chore)
2. **Task 2: Install Knip, run audit, clean unused exports** - `2491a8b` (chore)

## Files Created/Modified
- `src/mastra/workflow/02a-initial-hypothesis-extractor-agent.ts` - Deleted (deprecated agent)
- `src/mastra/workflow/02a-initial-hypothesis-extractor-instructions.ts` - Deleted (deprecated instructions)
- `src/mastra/workflow/shared-memory.ts` - Deleted (unused generateWorkflowIds)
- `src/components/activity-indicator.tsx` - Deleted (unused file)
- `src/components/ui/dropdown-menu.tsx` - Deleted (unused file)
- `src/mastra/workflow/index.ts` - Removed deprecated agent, removed workflowTools export, added Knip comment
- `src/mastra/workflow/request-context-helpers.ts` - Removed 8 dead functions
- `src/mastra/workflow/workflow-schemas.ts` - Removed 6 dead schemas/types/constants
- `src/mastra/workflow/rules-tools.ts` - Removed dead re-export and types
- `src/mastra/workflow/vocabulary-tools.ts` - Removed dead type export
- `src/mastra/workflow/logging-utils.ts` - Made 3 internal functions private
- `src/mastra/workflow/README.md` - Updated diagram, agent table, file tree
- `src/components/trace/specialized-tools.tsx` - Made 3 internal components private
- `src/components/workflow-toast.tsx` - Made WorkflowToast private, removed showApiKeyErrorToast
- `src/components/rules-panel.tsx` - Made RuleEntry interface private
- `src/hooks/use-workflow-settings.ts` - Made WorkflowSettings interface private
- `src/lib/agent-roles.ts` - Made AgentRoleGroup and AgentRole private
- `src/lib/examples.ts` - Removed dead ExampleProblemMeta re-export
- `src/lib/mascot-messages.ts` - Made MASCOT_MESSAGES private
- `src/lib/workflow-events.ts` - Made STEP_LABELS private
- `package.json` - Added knip devDependency and audit script

## Decisions Made
- shadcn/ui component exports (badge, button, dialog, popover, etc.) kept as documented false positives -- these are generated component library exports where convention is to keep all variants available
- Mastra tool registration exports (getRules, addVocabulary, etc.) kept as false positives -- consumed via spread objects at runtime, invisible to static analysis
- Dependency removals (@mastra/evals, @mastra/memory, next-themes) not performed -- out of scope for dead export cleanup; dependencies require separate analysis for runtime/peer impacts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Deleted 2 unused UI component files**
- **Found during:** Task 2 (Knip audit)
- **Issue:** Knip flagged activity-indicator.tsx and dropdown-menu.tsx as unused files with zero imports
- **Fix:** Deleted both files after grep verification confirmed no references
- **Files modified:** src/components/activity-indicator.tsx (deleted), src/components/ui/dropdown-menu.tsx (deleted)
- **Verification:** Knip re-run no longer reports them; tsc --noEmit shows no new errors
- **Committed in:** 2491a8b (Task 2 commit)

**2. [Rule 2 - Missing Critical] Removed showApiKeyErrorToast dead function**
- **Found during:** Task 2 (Knip audit)
- **Issue:** showApiKeyErrorToast was exported but never imported anywhere
- **Fix:** Removed the function entirely
- **Files modified:** src/components/workflow-toast.tsx
- **Verification:** grep confirms zero imports
- **Committed in:** 2491a8b (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical -- dead code removal beyond plan's explicit list)
**Impact on plan:** Both auto-fixes are additional dead code cleanup discovered during Knip audit. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Knip audit infrastructure in place for Plan 02 (any type removal) and future maintenance
- All deprecated files removed; codebase is clean for type safety work
- Remaining Knip false positives are documented in index.ts comment and this summary

---
*Phase: 27-dead-code-type-safety*
*Completed: 2026-03-08*
