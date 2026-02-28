# Phase 1 Plan — Legacy Cleanup

**Goal:** Remove dead Workflow 01 and 02 code, rename Workflow 03 to be the default workflow, update all references and documentation.

**Requirements:** CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04

**Context:** [01-CONTEXT.md](../../01-CONTEXT.md)

---

## Prompts

### Prompt 1: Delete legacy workflows and clean index.ts

**Files to modify:**
- `src/mastra/index.ts`

**Files to delete:**
- `src/mastra/01-one-agent/` (entire directory)
- `src/mastra/02-extract-then-hypo-test-loop/` (entire directory)

**Instructions:**

1. Delete the entire `src/mastra/01-one-agent/` directory
2. Delete the entire `src/mastra/02-extract-then-hypo-test-loop/` directory
3. In `src/mastra/index.ts`, remove:
   - Line 4: `import { oneAgentSolverAgents, oneAgentSolverScorers } from './01-one-agent';`
   - Line 5: `import { extractThenHypoTestLoopWorkflowAgents } from './02-extract-then-hypo-test-loop';`
   - Line 6: `import { extractThenHypoTestLoopWorkflow } from './02-extract-then-hypo-test-loop/workflow';`
   - Line 16 (commented): `// ...oneAgentSolverAgents,`
   - Line 17 (commented): `// ...extractThenHypoTestLoopWorkflowAgents,`
   - Line 20 (commented): `// ...oneAgentSolverScorers,`
   - The entire `scorers: {}` block if empty after removal
   - Line 24 (commented): `// extractThenHypoTestLoopWorkflow,`

**Verification:** `npx tsc --noEmit` passes (only the pre-existing CSS module error).

**Satisfies:** CLEAN-01, CLEAN-02

---

### Prompt 2: Move workflow directory and update imports

**Instructions:**

1. Move `src/mastra/03-per-rule-per-sentence-delegation/` to `src/mastra/workflow/`
2. Update imports in `src/mastra/index.ts`:
   - `'./03-per-rule-per-sentence-delegation'` → `'./workflow'`
   - `'./03-per-rule-per-sentence-delegation/workflow'` → `'./workflow/workflow'`
3. Search the entire `src/` directory for any other imports referencing `03-per-rule-per-sentence-delegation` and update them. Known location:
   - None expected outside `index.ts` (workflow files use relative imports internally)

**Verification:** `npx tsc --noEmit` passes.

---

### Prompt 3: Rename agent IDs, display names, and exports

This is the largest prompt. All changes are within `src/mastra/workflow/` and `src/mastra/index.ts`.

**3a. Agent IDs** — Update the `id:` field in each agent file:

| File | Old ID | New ID |
|------|--------|--------|
| `01-structured-problem-extractor-agent.ts` | `wf03-structured-problem-extractor` | `structured-problem-extractor` |
| `02-initial-hypothesizer-agent.ts` | `wf03-initial-hypothesizer` | `initial-hypothesizer` |
| `02a-initial-hypothesis-extractor-agent.ts` | `wf03-initial-hypothesis-extractor` | `initial-hypothesis-extractor` |
| `03a-verifier-orchestrator-agent.ts` | `wf03-verifier-orchestrator` | `verifier-orchestrator` |
| `03a2-verifier-feedback-extractor-agent.ts` | `wf03-verifier-feedback-extractor` | `verifier-feedback-extractor` |
| `03a-rule-tester-agent.ts` | `wf03-rule-tester` | `rule-tester` |
| `03a-sentence-tester-agent.ts` | `wf03-sentence-tester` | `sentence-tester` |
| `03b-rules-improver-agent.ts` | `wf03-rules-improver` | `rules-improver` |
| `03b2-rules-improvement-extractor-agent.ts` | `wf03-rules-improvement-extractor` | `rules-improvement-extractor` |
| `04-question-answerer-agent.ts` | `wf03-question-answerer` | `question-answerer` |

**3b. Display names** — Update the `name:` field in each agent file:

| File | Old Name | New Name |
|------|----------|----------|
| `01-structured-problem-extractor-agent.ts` | `[03-01] Structured Problem Extractor Agent` | `[Step 1] Structured Problem Extractor Agent` |
| `02-initial-hypothesizer-agent.ts` | `[03-02] Initial Hypothesizer Agent` | `[Step 2] Initial Hypothesizer Agent` |
| `02a-initial-hypothesis-extractor-agent.ts` | _(check current value)_ | `[Step 2] Initial Hypothesis Extractor Agent` |
| `03a-verifier-orchestrator-agent.ts` | `[03-3a] Verifier Orchestrator Agent` | `[Step 3] Verifier Orchestrator Agent` |
| `03a2-verifier-feedback-extractor-agent.ts` | `[03-3a2] Verifier Feedback Extractor Agent` | `[Step 3] Verifier Feedback Extractor Agent` |
| `03a-rule-tester-agent.ts` | `[03-3a-tool] Rule Tester Agent` | `[Step 3] Rule Tester Agent` |
| `03a-sentence-tester-agent.ts` | `[03-3a-tool] Sentence Tester Agent` | `[Step 3] Sentence Tester Agent` |
| `03b-rules-improver-agent.ts` | `[03-3b] Rules Improver Agent` | `[Step 3] Rules Improver Agent` |
| `03b2-rules-improvement-extractor-agent.ts` | `[03-3b2] Rules Improvement Extractor Agent` | `[Step 3] Rules Improvement Extractor Agent` |
| `04-question-answerer-agent.ts` | `[03-04] Question Answerer Agent` | `[Step 4] Question Answerer Agent` |

**3c. `getAgentById()` calls** — Update all string literals in:
- `workflow.ts` — 8 calls (lines 58, 174, 218, 380, 425, 559, 602, 730)
- `03a-rule-tester-tool.ts` — 1 call (line 124): `'wf03-rule-tester'` → `'rule-tester'`
- `03a-sentence-tester-tool.ts` — 1 call (line 133): `'wf03-sentence-tester'` → `'sentence-tester'`

**3d. Export names in `index.ts`** (within `src/mastra/workflow/`):
- `workflow03Agents` → `workflowAgents`
- `workflow03Tools` → `workflowTools`
- Drop `wf03_` prefix from agent registration keys:
  - `wf03_structuredProblemExtractorAgent` → `structuredProblemExtractorAgent`
  - `wf03_initialHypothesizerAgent` → `initialHypothesizerAgent`
  - etc. (all 10 agents)
- Update comments: `// All agents for workflow 03` → `// All agents for the solver workflow`

**3e. Update `src/mastra/index.ts`:**
- `import { workflow03Agents }` → `import { workflowAgents }`
- `...workflow03Agents` → `...workflowAgents`
- `import { workflow03 }` → `import { solverWorkflow }`
- `workflow03,` → `solverWorkflow,`

**3f. Workflow export and ID** in `workflow.ts`:
- `export const workflow03 = createWorkflow({` → `export const solverWorkflow = createWorkflow({`
- `id: '03-per-rule-per-sentence-delegation-workflow'` → `id: 'solver-workflow'`

**3g. API route** in `src/app/api/solve/route.ts`:
- `workflowId: '03-per-rule-per-sentence-delegation-workflow'` → `workflowId: 'solver-workflow'`

**3h. RequestContext type** in `request-context-types.ts`:
- `Workflow03RequestContext` → `WorkflowRequestContext`
- Update the JSDoc comment to remove "Workflow 03"

**3i. RequestContext references** — Update all imports/usages of `Workflow03RequestContext`:
- `request-context-helpers.ts` — import and type references
- `workflow.ts` — import and `RequestContext<...>` usages (4 instances)
- `vocabulary-tools.ts` — import and type reference

**3j. Shared memory** in `shared-memory.ts`:
- `wf03-thread-` → `thread-`
- `wf03-resource-` → `resource-`

**3k. Log filename** in `logging-utils.ts`:
- `workflow-03_${timestamp}.md` → `workflow_${timestamp}.md`
- Update JSDoc comment

**Verification:** `npx tsc --noEmit` passes.

**Satisfies:** CLEAN-03

---

### Prompt 4: Update documentation

**4a. CLAUDE.md** — Rewrite to reflect single-workflow codebase:
- Remove the "Workflows" section listing three workflows
- Rename "Workflow 03 Pipeline" → "Solver Pipeline" (or just "Pipeline")
- Remove numbered workflow list (01, 02, 03)
- Update "File Conventions in Each Workflow" → "File Conventions"
- Update "RequestContext for shared state (Workflow 03)" → remove "(Workflow 03)"
- Update agent ID convention: `wf{N}-{descriptor}` → just `{descriptor}` (e.g., `initial-hypothesizer`)
- Update display name convention: `[{workflow}-{step}] Name` → `[Step N] Name`
- Update log filename pattern: `workflow-0N_*.md` → `workflow_*.md`
- Update directory path: `03-per-rule-per-sentence-delegation` → `workflow`

**4b. `.planning/ROADMAP.md`:**
- Replace "Workflow 03" with "the workflow" throughout
- Update success criteria referencing workflow numbers

**4c. `.planning/REQUIREMENTS.md`:**
- Replace "Workflow 01", "Workflow 02", "Workflow 03" references with appropriate generic terms

**4d. `.planning/PROJECT.md`:**
- Replace all "Workflow 03" references
- Update directory paths

**4e. `.planning/codebase/` docs:**
- Update `ARCHITECTURE.md` — agent IDs, directory paths, type names
- Update `STRUCTURE.md` — directory paths, agent ID format, display name format
- Update `CONVENTIONS.md` — naming conventions, directory paths, type names
- Update `INTEGRATIONS.md` — log filename pattern, RequestContext type name
- Update `CONCERNS.md` — remove WF02-specific concerns, update remaining references
- Update `TESTING.md` — log filename pattern

**4f. `src/mastra/workflow/README.md`:**
- Update title and content to remove "03" numbering

**Verification:** Scan all updated files to confirm no remaining `wf03`, `workflow.?03`, `03-per-rule`, `Workflow 0[123]` references in active code or documentation.

---

### Prompt 5: Final verification

1. Run `npx tsc --noEmit` — must pass with only the pre-existing CSS module error
2. Grep the entire codebase for stale references: `wf03`, `workflow03`, `03-per-rule`, `Workflow 01`, `Workflow 02`, `Workflow 03`, `01-one-agent`, `02-extract-then-hypo`
   - Matches in `docs/plans/` are acceptable (historical plan documents)
   - Matches in `.planning/01-CONTEXT.md` are acceptable (it documents the before/after)
   - No matches should remain in `src/`, `CLAUDE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`
3. Confirm the directories `src/mastra/01-one-agent/` and `src/mastra/02-extract-then-hypo-test-loop/` no longer exist

**Satisfies:** CLEAN-04

---

## Execution Notes

- **Parallelization:** Prompts 1 and 2 are sequential (2 depends on 1's deletion). Prompt 3 depends on 2. Prompt 4 can partially parallel with 3 (doc updates are independent of code renames) but is safer sequential. Prompt 5 is final.
- **Risk:** The biggest risk is broken `getAgentById()` calls at runtime — a typo in an agent ID string won't be caught by TypeScript. The final verification should include starting the dev server.
- **Scope boundary:** Historical plan documents in `docs/plans/` are NOT updated — they are point-in-time artifacts.
- **Database:** After renaming agent IDs and workflow ID, the Mastra database may have stale references. Use `npm run dev:new` to start fresh.

---

_5 prompts. Estimated scope: ~30 files modified, 2 directories deleted._
