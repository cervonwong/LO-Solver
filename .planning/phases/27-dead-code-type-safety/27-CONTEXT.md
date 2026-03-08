# Phase 27: Dead Code & Type Safety - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove deprecated files, dead exports, and replace all `any` types in workflow code. Pure cleanup — zero behavioral changes. The codebase should contain only live, typed code with no deprecated files or untyped escape hatches.

</domain>

<decisions>
## Implementation Decisions

### Knip audit and false positives
- Run Knip across full `src/` (not just workflow code) — clean all unused exports found
- Mastra registration exports (agents/tools in `index.ts`) will be flagged as unused by Knip since nothing imports them directly — document these as justified false positives rather than configuring Knip exclusions
- Before deleting any flagged export: grep `src/` for all references AND check for dynamic usage patterns (dynamic imports, string references, `requestContext.get('key-name')` style lookups)
- Keep Knip as a permanent devDependency for future audits (add an `npm run audit` script)

### shared-memory.ts
- Remove the file entirely — `generateWorkflowIds()` is confirmed dead code (never imported anywhere)
- Clean up all documentation references to deleted files (workflow README.md file tree listing, etc.)

### Deprecated file removal
- Delete `02a-initial-hypothesis-extractor-agent.ts` and `02a-initial-hypothesis-extractor-instructions.ts`
- Remove their registration from `src/mastra/workflow/index.ts`
- Clean up any documentation references

### any type replacement
- Replace all `any` annotations in workflow code with explicit typed alternatives
- Scope: `request-context-helpers.ts`, `logging-utils.ts`, `03a-rule-tester-tool.ts` (8 `any` annotations found across these files)
- Claude runs `npx tsc --noEmit` after type fixes to verify zero regressions

### Verification
- User runs eval baseline (`npm run eval -- --problem linguini-1`) before Phase 27 starts
- User runs eval verification after Phase 27 is complete
- Claude runs `npx tsc --noEmit` as part of the phase to verify type safety
- Single verification pass at end of phase (not after each individual change)

### Claude's Discretion
- Specific type choices for replacing `any` (e.g., `unknown`, `Record<string, unknown>`, or creating local type declarations)
- Order of operations within the phase
- How to handle any unexpected Knip findings

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Knip 5.86.0 specified in requirements as the audit tool (not yet installed)
- Existing `npx tsc --noEmit` type checking baseline (one pre-existing CSS module error to ignore)

### Established Patterns
- Agent files follow `*-agent.ts` / `*-instructions.ts` naming convention
- `index.ts` re-exports agents/tools for Mastra registration
- `request-context-helpers.ts` uses `RequestContext` with string keys for runtime state

### Integration Points
- `src/mastra/workflow/index.ts` — agent registration (remove deprecated agent)
- `src/mastra/workflow/README.md` — file tree listing (update after deletions)
- `package.json` — add Knip devDependency and audit script

### Files to modify
- Delete: `02a-initial-hypothesis-extractor-agent.ts`, `02a-initial-hypothesis-extractor-instructions.ts`, `shared-memory.ts`
- Edit: `index.ts` (remove deprecated import), `request-context-helpers.ts`, `logging-utils.ts`, `03a-rule-tester-tool.ts` (replace `any`), `README.md` (update file tree)
- Add: `package.json` (Knip devDependency + audit script)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 27-dead-code-type-safety*
*Context gathered: 2026-03-08*
