# Project Research Summary

**Project:** LO-Solver v1.5 Refactor and Prompt Engineering
**Domain:** AI agent orchestration system — internal quality milestone (structural refactoring + model-specific prompt engineering)
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

LO-Solver v1.5 is a pure internal quality milestone on a working TypeScript/Next.js/Mastra AI pipeline. No new user-facing features are introduced; the work is split into two sequential workstreams: structural refactoring of the existing 15,656-LOC codebase, and rewriting all 19 agent prompts using model-family-specific best practices from official vendor guides. The existing stack is fixed — Mastra 1.8.0, Zod 4.3.6, Next.js 16.1.6, OpenRouter — and no runtime dependency changes are planned. The only net-new dependency is Knip 5.86.0, a one-time dead code audit tool.

The recommended approach is a strict phase ordering: dead code removal first, then the agent factory pattern, then the 1,240-line `02-hypothesize.ts` split, then prompt engineering model-by-model (GPT-5-mini extraction agents, Gemini 3 Flash reasoning agents, Claude Opus 4.6 agents), with type safety and frontend cleanup last. This ordering is not arbitrary: structural changes must precede prompt engineering to prevent prompt rewrites from having to be moved during file splits. Each phase must be verified against the existing eval harness (`npm run eval`) before the next begins. A numeric baseline eval score must be captured before any prompt is touched.

The dominant risk is behavioral regression from prompt changes, compounded by the fact that all eval runs use `TESTING_MODEL` (gpt-oss-120b) — meaning production-model-specific regressions for Gemini 3 Flash and GPT-5-mini are invisible unless explicitly run with `--mode production`. Secondary risks are circular imports during the file split (silent runtime errors if a sub-phase file is imported by another sub-phase file) and breaking the dynamic model resolution pattern when introducing the agent factory. Both are preventable with `npx tsc --noEmit` checkpoints and a factory implementation that preserves the `({ requestContext }) => ...` function signature.

## Key Findings

### Recommended Stack

The base stack is unchanged. The only new tooling addition is Knip 5.86.0 for dead code detection, which supersedes the maintenance-mode ts-prune and auto-activates its Next.js plugin when `next` is in package.json. All prompt engineering work uses the existing plain TypeScript string-export pattern for instructions files — no prompt templating libraries, no DSPy, no LangChain. The three production model families are GPT-5-mini (extraction agents), Gemini 3 Flash (reasoning agents), and Claude Opus 4.6 (Claude Code solver agents); no model changes are in scope.

Prompt engineering methodology is strictly model-specific and sourced from official vendor guides fetched directly at research time. GPT-5-mini responds to literal, explicit, caching-friendly prompts with JSON schema described verbatim. Gemini 3 Flash requires direct XML-structured prompts, temperature held at default 1.0, and no chain-of-thought scaffolding (it reasons natively). Claude Opus 4.6 benefits from XML-tagged sections, role-first structure, data placed before task, and explicit rationale behind constraints. Applying any model's pattern to another model's agents is a concrete failure mode identified in research.

**Core technologies:**
- Knip 5.86.0: dead code audit — the only tool that finds unused exports, files, and npm deps in a single TypeScript/Next.js pass; run once before cleanup, once to confirm
- TypeScript 5.9.3 (existing): post-split validation — already at maximum strictness; `npx tsc --noEmit` is the sole needed gate after each file extraction
- Mastra 1.8.0 (existing): agent orchestration — factory must preserve dynamic `({ requestContext }) => ...` model resolution or testing/production switching breaks silently
- Eval harness (existing): regression gate — run before any prompt is touched to capture baseline, then after each individual prompt rewrite

### Expected Features

In the context of an internal refactoring milestone, "features" are the deliverables that make the codebase maintainable and improve pipeline quality. Research identified two distinct tiers.

**Must have (table stakes for a complete refactoring milestone):**
- Zero behavioral regression — refactors that change behavior are bugs; the eval harness is the verification gate
- Dead code removal — the deprecated `02a-initial-hypothesis-extractor-*` files are explicitly marked DEPRECATED but still registered and exported in `index.ts`
- `02-hypothesize.ts` split — at 1,240 lines this is the largest merge-conflict source; split into 4 sub-phase files plus a thin coordinator (~150 lines)
- Agent factory pattern — 13 agents share 90% identical boilerplate; factory reduces each from ~50 to ~10 lines of config
- GPT-5-mini prompt rewrites (5 agents) — current prompts have static content mid-prompt and format directives last; caching-hostile and verbose
- Gemini 3 Flash prompt rewrites (6 agents) — current prompts use numbered step lists that constrain Gemini 3's native reasoning; major rewrites required
- Claude Opus 4.6 prompt rewrites (6 Claude Code agents) — current `.md` files use markdown headings instead of XML; lack explicit tool use guidance

**Should have (quality improvements, not milestone blockers):**
- Schema domain grouping (`workflow-schemas.ts`, 407 lines) — research recommends keeping as flat file for this milestone to avoid circular import risk and the 39-edge import graph
- `request-context-helpers.ts` grouping (440 lines) — extract draft stores (150 lines) as the clearest split candidate; remainder can stay flat
- Type safety: replace 4 `any` occurrences in `logging-utils.ts` and `request-context-helpers.ts`
- Frontend `DevTracePanel` event handler extraction — extract inline callbacks to named functions with explicit `requestContext` threading
- Confidence/conclusion vocabulary standardization across all prompts
- Prompt template injection cleanup — replace fragile `.replace('{{PLACEHOLDER}}', value)` with typed composition

**Defer (v2+):**
- Automated prompt regression CI — eval runs on every PR; valuable but requires infrastructure investment
- Deeper `request-context-helpers.ts` domain split — lower priority; already helper-only code
- Schema barrel split — research strongly recommends against for this milestone due to circular import risk

### Architecture Approach

The architecture for v1.5 is decomposition without API surface change. The primary structural transformation is splitting `02-hypothesize.ts` into a thin coordinator plus four sub-phase modules (02a-dispatch, 02b-hypothesize, 02c-verify, 02d-synthesize), each exporting a single async function that receives data by reference and returns a typed result. The critical constraint is that `mainRules` and `mainVocabulary` Maps must be passed by reference (not copied) because synthesizer tool calls mutate them in place through RequestContext. Sub-phase files are import-only leaves — they import utilities but are never imported by each other — preventing circular dependency cycles.

The agent factory centralizes the repeated `new Agent({...})` constructor across 13 agents, handling three variants: reasoning agents (Gemini, with UnicodeNormalizer), extraction agents (GPT-5-mini, with UnicodeNormalizer), and tester agents (GPT-5-mini, without UnicodeNormalizer, with requestContextSchema). The factory must preserve the `({ requestContext }) => getOpenRouterProvider(requestContext)(...)` dynamic model resolution pattern — a static model value in the factory silently breaks testing/production mode switching. Research explicitly recommends keeping both `workflow-schemas.ts` and `request-context-helpers.ts` flat for this milestone based on direct import graph analysis (39 import edges across these files).

**Major components after refactoring:**
1. `agent-factory.ts` (new) — `createWorkflowAgent()` centralizing UnicodeNormalizer config and model resolution across all 13 agents
2. `02a-dispatch.ts`, `02b-hypothesize.ts`, `02c-verify.ts`, `02d-synthesize.ts` (new) — sub-phase functions extracted from `02-hypothesize.ts`; each exports one async function, receives Map references, returns typed result
3. `02-hypothesize.ts` (refactored) — reduced from 1,240 lines to ~150-line coordinator importing sub-phases
4. All 13 `*-instructions.ts` files and 6 Claude Code `*.md` agents (rewritten) — prompt content only; agent files, tool files, schemas, and workflow structure unchanged

### Critical Pitfalls

1. **Circular imports from file splitting** — sub-phase files that import from each other cause silent runtime `undefined` values, not TypeScript build errors. Draw the full dependency graph before writing any code; sub-phases must be import-only leaves; run `npx tsc --noEmit` after every single file extraction, not at the end.

2. **Prompt regression without a baseline score** — rewriting multiple prompts between eval runs makes regressions undiagnosable. Capture `translation-accuracy` and `rule-quality` baseline scores with `npm run eval -- --comparison` before touching any prompt file. Rewrite one agent at a time; run `npm run eval -- --problem <id>` after each. Research confirms that "cleaner" prompts can reduce extraction pass rate by 10% and RAG compliance by 13% while appearing better by instruction-following metrics.

3. **Agent factory breaking dynamic model resolution** — a factory that accepts a static model string instead of preserving the `({ requestContext }) => ...` pattern breaks testing/production model switching with no TypeScript error. Verify both modes log different model IDs after migrating the first 2-3 agents before continuing.

4. **Dead code removal breaking out-of-tree importers** — `src/evals/zero-shot-solver.ts` imports `questionsAnsweredSchema` from `@/mastra/workflow/workflow-schemas` and lives outside `workflow/`. It is missed by searches scoped to `workflow/`. Always `grep -rn` the full `src/` tree before any file deletion.

5. **Testing-mode evals masking production-model regressions** — all eval runs use `TESTING_MODEL` (gpt-oss-120b). Regressions specific to Gemini 3 Flash or GPT-5-mini prompts are invisible until `--mode production` is explicitly run. Run at least one production eval after rewriting each model family's prompts.

## Implications for Roadmap

Research across all four files converges on a 6-phase sequence. The ordering is determined by four constraints: (1) structural changes must precede prompt changes to avoid moving rewritten content; (2) dead code removal reduces surface area for subsequent work; (3) the factory must exist before agent migration begins; (4) an eval baseline must be captured before any prompt is touched. These constraints are derived from the dependency graph in FEATURES.md and the build order analysis in ARCHITECTURE.md.

### Phase 1: Dead Code Removal and Quick Wins

**Rationale:** Removing dead code first reduces the file set all subsequent phases work with. The three quick-win items (dead code, type safety, commented code) are fully independent of each other and touch different files; they can be done in any order and verified together with a single `npx tsc --noEmit` and `npm run eval -- --problem <id>`.
**Delivers:** Deleted deprecated `02a-initial-hypothesis-extractor-*` files and their `index.ts` registration; 4 `any` annotations replaced with typed alternatives (`unknown` + narrowing or `keyof WorkflowRequestContext` generics); commented-out model line removed from `03b-rules-improver-agent.ts`; Knip audit results captured as a candidate list for unused exports
**Addresses:** Dead code removal, type safety fixes, commented-out code removal (all P1 table-stakes features)
**Avoids:** Dead code removal breaking out-of-tree importers — `grep -rn` full `src/` before each deletion; verify `src/evals/zero-shot-solver.ts` compiles after any schema-adjacent change

### Phase 2: Agent Factory Pattern

**Rationale:** The factory must exist before any agent can be migrated, and smaller agent files make the `02-hypothesize.ts` split diff cleaner. Validate the factory on 2-3 representative agents (one reasoning, one extraction, one tester) before full migration to lock the API before it has 13 dependents.
**Delivers:** `agent-factory.ts` with `createWorkflowAgent()` handling all three agent variants; all 13 `*-agent.ts` files migrated from ~50-line boilerplate to ~10-line config declarations; testing/production model switching confirmed working via eval run
**Avoids:** Factory breaking dynamic model resolution — factory must construct `({ requestContext }) => getOpenRouterProvider(requestContext)(...)` internally, not accept a static model value; Mastra v1 deprecated property access (`agent.llm`, `agent.tools`) must not appear in any factory utility code

### Phase 3: 02-hypothesize.ts Split

**Rationale:** This is the highest-complexity structural change and must happen before prompt engineering. Splitting while prompts are unchanged means that an eval run before and after the split on identical prompts definitively establishes zero behavioral regression. Extract sub-phases in pipeline order (dispatch first, synthesize last) so each extracted function can be verified against the still-monolithic remainder.
**Delivers:** `02a-dispatch.ts`, `02b-hypothesize.ts`, `02c-verify.ts`, `02d-synthesize.ts` each at ~200-300 lines; `02-hypothesize.ts` coordinator reduced to ~150 lines; `npx tsc --noEmit` clean and eval passing after each extraction step
**Addresses:** `02-hypothesize.ts` split (P1 table-stakes feature)
**Avoids:** Circular imports — sub-phases import utilities only, never each other; Map reference pitfall — `mainRules` and `mainVocabulary` passed by reference, not copied; missing `setState` calls between phases that would corrupt round state

### Phase 4: Mastra Prompt Engineering (GPT-5-mini, then Gemini 3 Flash)

**Rationale:** Prompt engineering begins only after structural refactoring is complete and a numeric eval baseline is established. Rewriting by model family (not by pipeline step) maintains model-specific mental context. GPT-5-mini extraction agents first because they are lower-risk (JSON-in/JSON-out, less creative latitude) and their output format changes affect what Gemini reasoning agents receive. Each model family batch ends with an eval verification.
**Delivers:** All 13 Mastra `*-instructions.ts` files rewritten: GPT-5-mini agents get static-first structure, explicit Zod-schema-derived JSON descriptions, and `Return ONLY a valid JSON object. No explanation.` directives; Gemini 3 Flash agents get XML-delimited sections (`<task>`, `<context>`, `<constraints>`, `<output_format>`), removed numbered chain-of-thought scaffolding, and no temperature overrides; all prompts use aligned confidence/conclusion vocabulary
**Uses:** Official OpenAI GPT-5 Prompting Guide, Google Gemini 3 Developer Guide (both fetched at research time, HIGH confidence)
**Avoids:** Prompt regression without baseline (baseline saved before this phase begins); model-specific pattern cross-contamination (separate workstreams per model family); testing-mode masking production regressions (run `--mode production` eval after each model family)

### Phase 5: Claude Code Prompt Engineering

**Rationale:** Claude Code solver agents are structurally independent of Mastra — they use markdown workspace files and file-read/write tool calls, not Mastra RequestContext. Doing this after Mastra prompt engineering avoids context switching and allows the orchestrator agent prompt to be written last, after subagent output formats are settled.
**Delivers:** All 6 Claude Code `.md` agent files rewritten: XML-tagged sections (`<instructions>`, `<context>`, `<input>`, `<task>`, `<example>`) replacing markdown headings; role definition as first sentence; long data before task at end; explicit tool use instructions with conditions rather than "ALWAYS" directives; constraint rationale embedded per Anthropic guidance; verifier agent (Sonnet 4.6) free of deep-reasoning-increasing language
**Avoids:** Applying Mastra RequestContext tool patterns to Claude Code agents (category error; Claude Code agents reference PIPELINE.md for workspace state); "ALWAYS"/"MUST" overuse that triggers Opus 4.6 overtriggering

### Phase 6: Type Safety, Schema Cleanup, and Frontend

**Rationale:** These are correctness and readability improvements that do not block any other phase. Schema and helpers reorganization is scoped conservatively (per ARCHITECTURE.md recommendations) to avoid circular import risk. Frontend cleanup is included here because it is the only phase touching components outside the workflow directory.
**Delivers:** `updateCumulativeCost` signature tightened to use `keyof WorkflowRequestContext` typed accessors; `DevTracePanel` inline event handlers extracted to named functions with `requestContext` threaded explicitly; prompt template injection replaced with typed builder or direct concatenation; draft stores optionally extracted from `request-context-helpers.ts` if time permits
**Avoids:** `emitToolTraceEvent` silent no-op after handler extraction — always pass `requestContext` explicitly; verify all trace event types (`data-tool-call`, `data-vocabulary-update`, `data-rules-update`) appear in dev mode after frontend cleanup

### Phase Ordering Rationale

- Dead code before everything: reduces the file surface for all subsequent phases; the 3 quick-win items have no dependencies
- Factory before split: smaller agent files make the split diff cleaner; structural reduction before structural reorganization
- Structural refactoring (Phases 1-3) before prompt engineering (Phases 4-5): splitting files after rewriting prompts means moving rewritten content and makes regression detection impossible
- Eval baseline captured between Phase 3 and Phase 4: the one point where behavior is confirmed identical to v1.4 and a clean score is measurable
- GPT-5-mini before Gemini 3 Flash within Phase 4: extraction agent output format changes affect what reasoning agents receive; settle extraction format first
- Mastra prompts before Claude Code prompts: subagent output format expectations should be established before the orchestrator prompt references them
- Type safety and frontend last: independent of all other work; never blocks a prior phase

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (02-hypothesize.ts split):** The 1,240-line file has complex shared mutable state (Maps by reference, draft stores keyed by perspective, round convergence loop with `await setState()` calls at specific points). A detailed pre-split reading of the full file to map every variable's write and read sites is essential before writing sub-phase function signatures. The ARCHITECTURE.md signatures are a starting point, not a final contract.
- **Phase 4 (Gemini 3 Flash prompts):** The 6 reasoning agent prompts are major rewrites (HIGH complexity per FEATURES.md). The existing numbered step lists also encode logic constraints that are not pure scaffolding — each numbered step must be evaluated for whether it is a reasoning scaffold (remove) or a behavioral constraint (translate to XML section). Read each prompt line-by-line before rewriting.

Phases with standard patterns (skip additional research-phase):

- **Phase 1 (Dead code removal):** Knip + grep + tsc workflow is fully documented; the 3 quick-win items (deprecated agent, 4 `any` occurrences, commented code) are unambiguous locations
- **Phase 2 (Agent factory):** The factory pattern, correct dynamic-model signature, and all three agent variants are fully specified in ARCHITECTURE.md Pattern 2 with working code examples
- **Phase 5 (Claude Code prompts):** Anthropic's best practices are fetched and documented in STACK.md at HIGH confidence; the 6 agent files share the same structural issues (markdown vs XML, wrong data ordering) and the same fix pattern
- **Phase 6 (Type safety):** Specific `any` locations and the correct typed replacements are identified in ARCHITECTURE.md Pattern 5; the `ToolExecuteContext` assertion cannot be fully eliminated without Mastra exposing typed context generics

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official vendor docs fetched directly for all 3 model families; Knip confirmed via official docs and effectivetypescript.com; no new runtime dependencies |
| Features | HIGH | Based on direct codebase inspection (line counts, grep for `any`, dead code markers); not inferred; dependency graph drawn from actual import statements |
| Architecture | HIGH | Based on direct inspection of all 60+ source files; function signatures researched against actual code; keep-flat recommendations for schemas and helpers derived from 39-edge import graph analysis |
| Pitfalls | HIGH (codebase / Mastra API) / MEDIUM (prompt engineering) | Circular import and factory pitfalls from direct code analysis and Mastra v1 migration docs; prompt regression pitfall supported by ArXiv paper with empirical data |

**Overall confidence:** HIGH

### Gaps to Address

- **GPT-5-mini-specific guidance is sparse:** The GPT-5 Prompting Guide has limited guidance specific to the mini variant vs full GPT-5. Extraction agent prompt rewrites should be validated against the eval harness promptly after each rewrite rather than deferred to end-of-batch.
- **`shared-memory.ts` purpose unclear:** ARCHITECTURE.md flags this file as "(unclear purpose, needs audit)." Its usage must be determined before Phase 1 dead code removal to avoid deleting something referenced.
- **Production eval cost:** Running `--mode production` evals after each model family's prompts incurs OpenRouter cost. Budget for at least 4-6 production eval runs (one per model family batch, plus start/end baselines).
- **Draft store extraction is optional:** ARCHITECTURE.md recommends extracting the 150-line draft stores section from `request-context-helpers.ts` as the clearest split candidate, but labels it optional. Treat as P2 in Phase 6 — skip if time is constrained.

## Sources

### Primary (HIGH confidence)

- https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide — GPT-5 prompting guide: literal instruction following, system prompt structure, JSON output, extraction agent patterns
- https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide — GPT-4.1 prompting guide: structured output, extraction precision, prompt caching, verbosity control
- https://ai.google.dev/gemini-api/docs/gemini-3 — Gemini 3 Flash developer guide: temperature 1.0 requirement, thinking level, context window, knowledge cutoff
- https://ai.google.dev/gemini-api/docs/prompting-strategies — Google prompting strategies: few-shot examples, context placement, positive constraints only
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices — Anthropic prompting best practices: XML tags, data placement, role assignment, prefill deprecation, parallel tool use
- https://knip.dev/ — Knip documentation: Next.js plugin auto-activation, unused export detection, false positive handling
- `src/mastra/workflow/steps/02-hypothesize.ts` — direct codebase inspection, 1,240 lines, full shared-state map
- `src/mastra/workflow/workflow-schemas.ts` — direct codebase inspection, 407 lines, 39 import edges mapped
- `src/mastra/workflow/request-context-helpers.ts` — direct codebase inspection, 440 lines, 9 concern groups identified
- All 13 `*-agent.ts` files — direct codebase inspection, confirmed boilerplate pattern and three agent variants

### Secondary (MEDIUM confidence)

- https://arxiv.org/html/2601.22025v1 — prompt regression research: 10% extraction pass rate drop and 13% RAG compliance drop from generic "improved" prompts on Llama 3
- https://www.philschmid.de/gemini-3-prompt-practices — Gemini 3 practical differences from earlier models (community source, consistent with official guide)
- https://www.traceloop.com/blog/automated-prompt-regression-testing-with-llm-as-a-judge-and-ci-cd — "prompt drift is silent but costly"
- https://effectivetypescript.com/2023/07/29/knip/ — ts-prune vs Knip comparison; ts-prune maintenance status confirmed by tool maintainer
- https://mastra.ai/guides/migrations/upgrade-to-v1/agent — Mastra v1 breaking changes: `requestContext` API, property accessor deprecations (`agent.llm`, `agent.tools`, `agent.instructions`)

### Tertiary (LOW confidence)

- https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de — TypeScript circular dependencies: `import type` as safe workaround
- https://github.com/vercel/next.js/issues/12557 — barrel file tree-shaking problems in Next.js (corroborates recommendation to avoid schema barrel files)
- https://www.viget.com/articles/lessons-learned-upgrading-a-large-typescript-application-from-zod-3-to-4 — Zod 4 `._def` moved to `._zod.def`; stricter `.pipe()` typing

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
