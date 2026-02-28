# Phase 1 Context — Legacy Cleanup

## Renaming After Removal

After removing WF01 and WF02, all "03" prefixes are stripped. New conventions:

| Aspect | Before | After |
|--------|--------|-------|
| Directory | `src/mastra/03-per-rule-per-sentence-delegation/` | `src/mastra/workflow/` |
| Agent IDs | `wf03-extractor`, `wf03-initial-hypothesizer` | `extractor`, `initial-hypothesizer` |
| Display names | `[03-01] Extractor Agent` | `[Step 1] Extractor Agent` |
| File prefixes | `01-extractor-agent.ts` (within `03-*/`) | `01-extractor-agent.ts` (within `workflow/`) — step numbers kept |
| Log filenames | `workflow-03_*.md` | `workflow_*.md` (drop the `03` segment) |

**Scope:** Every file that references old agent IDs, display names, or the old directory path must be updated. This includes imports in `src/mastra/index.ts`, RequestContext keys if they embed agent names, and any frontend code that matches on agent IDs or display names.

## Documentation Updates

- **Scope:** Full update across all docs — CLAUDE.md, ROADMAP.md, REQUIREMENTS.md, and inline code comments
- **History:** No preservation of the three-workflow evolution. Git history is sufficient.
- **What to update:**
  - CLAUDE.md: Remove Workflow 01/02 descriptions, update naming conventions to new format, update directory references
  - ROADMAP.md: Replace "Workflow 03" references with "the workflow" or equivalent
  - REQUIREMENTS.md: Same as ROADMAP.md
  - Inline comments: Remove any references to "Workflow 03" as a numbered variant; refer to it simply as "the workflow"

## Code Context (from codebase scout)

- `src/mastra/01-one-agent/` — single-agent workflow, safe to delete entirely
- `src/mastra/02-extract-then-hypo-test-loop/` — extract+loop workflow, safe to delete entirely
- `src/mastra/index.ts` — registers all agents/tools/workflows; WF01/WF02 imports are already commented out but still present
- `src/mastra/03-per-rule-per-sentence-delegation/` — active workflow with ~20 files (agents, tools, schemas, instructions)
- Frontend (`src/app/page.tsx`, `src/components/`) does not reference workflow numbers directly; it uses `StepId` values from `workflow-events.ts`
- `StepId` values (`extract-structure`, `initial-hypothesis`, etc.) are workflow-agnostic and need no changes

## Deferred Ideas

(None captured during discussion)
