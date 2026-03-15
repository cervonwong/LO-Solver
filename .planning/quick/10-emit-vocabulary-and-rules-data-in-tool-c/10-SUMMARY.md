---
phase: quick-10
plan: 01
subsystem: ui
tags: [trace-panel, tool-calls, vocabulary, rules, event-streaming]

requires:
  - phase: none
    provides: existing vocabulary-tools.ts, rules-tools.ts, specialized-tools.tsx
provides:
  - data-tool-call events with full entries data for vocabulary and rules CRUD tools
  - RulesToolCard component for rendering rules CRUD tool calls
  - hasRulesEntries() detection function
affects: [trace-panel, workflow-events]

tech-stack:
  added: []
  patterns: [specialized tool card pattern extended to rules CRUD]

key-files:
  created: []
  modified:
    - src/mastra/workflow/vocabulary-tools.ts
    - src/mastra/workflow/rules-tools.ts
    - src/components/trace/trace-utils.tsx
    - src/components/trace/specialized-tools.tsx

key-decisions:
  - "Keep removeVocabulary input as foreignForms (string[]) and removeRules input as titles (string[]) since these tools take keys not full entries"
  - "Follow VocabularyToolCard pattern for RulesToolCard with same badge color scheme and >5 entry threshold"

patterns-established: []

requirements-completed: [QUICK-10]

duration: 3min
completed: 2026-03-15
---

# Quick Task 10: Emit Vocabulary and Rules Data in Tool Call Events Summary

**Vocabulary and rules CRUD tool call events now carry full entry data, activating VocabularyToolCard and new RulesToolCard in the trace panel**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T02:10:48Z
- **Completed:** 2026-03-15T02:13:34Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Changed all vocabulary tool data-tool-call events to emit actual entries/foreignForms instead of just counts
- Changed all rules tool data-tool-call events to emit actual entries/titles instead of just counts
- Created RulesToolCard component matching VocabularyToolCard pattern with color-coded badges
- Added hasRulesEntries() detection function for routing rules tool calls to specialized UI

## Task Commits

Each task was committed atomically:

1. **Task 1: Include actual entries data in vocabulary and rules tool call events** - `1445843` (feat)
2. **Task 2: Add rules tool call detection and RulesToolCard UI component** - `4aa4a54` (feat)

## Files Created/Modified
- `src/mastra/workflow/vocabulary-tools.ts` - Changed data-tool-call events to include entries/foreignForms/action instead of count
- `src/mastra/workflow/rules-tools.ts` - Changed data-tool-call events to include entries/titles/action instead of count
- `src/components/trace/trace-utils.tsx` - Added hasRulesEntries() detection function
- `src/components/trace/specialized-tools.tsx` - Added RulesToolCard component, imported hasRulesEntries, added routing in ToolCallRenderer, removed INERT comment

## Decisions Made
- Kept removeVocabulary input as `foreignForms` (string array) rather than converting to full entry objects, since the UI hasVocabularyEntries() check already handles both input.entries and input.foreignForms
- Followed the same VocabularyToolCard pattern for RulesToolCard: badge colors (green ADD, yellow UPDATE, red REMOVE), line-through styling for removals, >5 entry threshold for summary mode
- Added `action: 'clear'` to clearVocabulary and clearRules events for clarity even though they have no entries to display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both vocabulary and rules tool call cards are now data-driven
- The trace panel displays actual entry data instead of opaque counts
- No blockers

## Self-Check: PASSED

All 4 modified files verified present. Both task commits (1445843, 4aa4a54) verified in git log.

---
*Quick Task: 10*
*Completed: 2026-03-15*
