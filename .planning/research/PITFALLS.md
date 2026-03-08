# Pitfalls Research

**Domain:** Codebase refactoring and prompt engineering on an existing AI agent orchestration system (LO-Solver v1.5)
**Researched:** 2026-03-08
**Confidence:** HIGH (codebase analysis, Mastra v1 migration docs) / MEDIUM (prompt engineering, verified against vendor docs and peer-reviewed research)

---

## Critical Pitfalls

### Pitfall 1: Circular Imports from File-Splitting Without Dependency Analysis

**What goes wrong:**
When `02-hypothesize.ts` (1,240 lines) is split into sub-phase files, the new files may re-import from each other or from shared utilities they previously lived alongside. For example, splitting into `02a-dispatch.ts`, `02b-hypothesize-per-perspective.ts`, and `02c-synthesize.ts` means each needs `emitTraceEvent`, `streamWithRetry`, and types from `workflow-schemas.ts`. If any two of these new files also cross-reference each other, TypeScript produces silent circular dependency errors at runtime — the imported value arrives as `undefined` — not a build error.

The existing codebase already has a cross-reference to watch: `request-context-types.ts` imports `Rule` from `workflow-schemas.ts` and immediately re-exports it. Any new file in the same split that also imports `Rule` from `request-context-types.ts` while `request-context-types.ts` imports from the new file creates a cycle.

**Why it happens:**
Large monolithic files implicitly avoid circular imports because everything lives in one module. The moment you extract sub-modules, latent dependency cycles surface. Developers split files linearly (phase A, phase B, phase C) without drawing the full import graph first.

**How to avoid:**
1. Draw the dependency graph before writing any code. `workflow-schemas.ts` and `request-context-types.ts` must remain pure leaf consumers — no new files should be added to their import lists during the split. All sub-phase files should import only from leaves and from `../agent-utils`, `../logging-utils`, `../request-context-helpers`, and the specific agent files they invoke.
2. Keep sub-phase files as import-only consumers: they import utilities but export nothing that other sub-phase files import.
3. Run `npx tsc --noEmit` after each file extraction, not just at the end.
4. Use `import type` for all type-only imports — this prevents runtime circular dependency problems even when the type graph has cycles.

**Warning signs:**
- A split file imports from another split file that was created in the same refactoring session.
- A new barrel/index file re-exports from multiple sub-phase files that each import from the same helper.
- `npx tsc --noEmit` produces a new `TS2303: Circular definition of import alias` error.
- An import resolves to `undefined` at runtime where a function was expected.

**Phase to address:** File-splitting phase (02-hypothesize.ts). Verify with `npx tsc --noEmit` and `npm run eval -- --problem <id>` smoke test after each split.

---

### Pitfall 2: Prompt Regression Without a Captured Baseline Score

**What goes wrong:**
All 19 agent prompts are rewritten. Each individual change looks improved in isolation — clearer structure, model-specific formatting, explicit output constraints. But the eval harness runs end-to-end: a change to the dispatcher prompt that increases the number of generated perspectives cascades into a verifier timeout, dropping the final translation accuracy score. There is no per-step score that fires automatically on prompt change, so a 10-point drop in `translation-accuracy` from a synthesizer rewrite goes undetected until the full eval run at the end of the milestone.

Research confirms this failure mode directly: replacing task-specific prompt structure with generic "improved" prompt rules reduced extraction pass rate from 100% to 90% and RAG compliance from 93% to 80% on Llama-class models, while instruction-following metrics *improved* — the prompt appeared better but performed worse on the actual task.

**Why it happens:**
Prompt engineering feedback cycles are slow (minutes per eval run) and costly. Developers batch multiple prompt changes before running evals, making it impossible to isolate which rewrite caused a regression.

**How to avoid:**
1. Establish a numeric baseline before touching any prompt: run `npm run eval -- --comparison` on all 4 ground-truth problems and record `translation-accuracy` and `rule-quality` scores. Save the results JSON as `evals/results/pre-v1.5-baseline.json`.
2. Rewrite one agent prompt at a time. After each rewrite, run `npm run eval -- --problem <id>` on the fastest problem in testing mode. If the score drops, revert and investigate before moving to the next agent.
3. Do not rewrite the dispatcher, synthesizer, and hypothesizer prompts in the same commit. These three agents interact — their prompts are coupled.
4. The eval baseline must be captured before any prompt is touched.

**Warning signs:**
- More than one agent prompt changed between eval runs.
- A prompt is described as "cleaner" or "follows best practices" but no eval was run to confirm the score held.
- The dispatcher prompt now instructs the LLM to generate a different number of perspectives than the workflow's `effectivePerspectiveCount` cap expects.
- The synthesizer prompt no longer mentions the tool-call constraint, causing the agent to return prose instead of calling tools.

**Phase to address:** Pre-prompt-engineering setup. The eval baseline must be captured before any prompt is touched. Each prompt rewrite should have its own `npm run eval` verification.

---

### Pitfall 3: Agent Factory Pattern Breaking Mastra's Dynamic Model Resolution

**What goes wrong:**
The current agent pattern uses a dynamic model function:
```typescript
model: ({ requestContext }) =>
  getOpenRouterProvider(requestContext)(
    requestContext?.get('model-mode') === 'production'
      ? 'google/gemini-3-flash-preview'
      : TESTING_MODEL,
  ),
```
A factory function that abstracts agent construction risks inlining the model as a static value or losing the `requestContext` parameter:
```typescript
// BAD: factory captures model at construction time, ignoring runtime mode
function makeAgent(model: string) {
  return new Agent({ model: openrouter(model), ... });
}
```
This breaks the testing/production mode toggle and the per-request API key injection, which both depend on `requestContext` being evaluated at call time, not at construction time.

**Why it happens:**
The factory pattern naturally encourages passing configuration at construction time. The dynamic-model pattern (a function that receives `requestContext`) is non-obvious — it looks like extra boilerplate until you understand why it exists. A developer writing the factory may simplify it by resolving the model eagerly.

**How to avoid:**
The factory must preserve the `({ requestContext }) => ...` signature. The correct factory shape:
```typescript
function makeWorkflowAgent(
  id: string,
  instructions: string,
  productionModel: string,
  tools?: Record<string, Tool>,
) {
  return new Agent({
    id,
    model: ({ requestContext }) =>
      getOpenRouterProvider(requestContext)(
        requestContext?.get('model-mode') === 'production'
          ? productionModel
          : TESTING_MODEL,
      ),
    instructions: { role: 'system', content: instructions },
    tools: tools ?? {},
    inputProcessors: [new UnicodeNormalizer({ stripControlChars: false, preserveEmojis: true, collapseWhitespace: true, trim: true })],
  });
}
```
Write this factory first, then migrate one agent, verify testing/production mode still switches models by checking the logged model name in a `npm run eval -- --problem <id>` run before migrating further.

**Warning signs:**
- The factory receives a `string` or `LanguageModelV1` as the model parameter instead of passing a function.
- Running `npm run eval -- --mode production` and `--mode testing` logs the same model ID.
- The per-request API key (user-provided key from `state.apiKey`) is no longer propagated — the factory doesn't call `getOpenRouterProvider(requestContext)`.

**Phase to address:** Factory pattern phase. Verify model switching and key propagation before migrating more than two agents.

---

### Pitfall 4: Dead Code Removal Deleting the Only Re-Export of a Type

**What goes wrong:**
The deprecated `02a-initial-hypothesis-extractor-agent.ts` is not called from any step and is safe to delete in isolation. However, `index.ts` still registers it in `workflowAgents`. Deleting the file without updating `index.ts` produces a broken import. More subtly: `src/evals/zero-shot-solver.ts` imports `questionsAnsweredSchema` from `@/mastra/workflow/workflow-schemas` and lives outside the `workflow/` directory. If schema reorganization moves or renames that export, this eval file breaks — it is not found by a `grep` scoped to `src/mastra/`.

This is a concrete risk: there are 39 import edges across the codebase pointing to `workflow-schemas.ts`, `request-context-types.ts`, and `request-context-helpers.ts`. Any reorganization that changes module paths without adding re-exports will break some subset of these.

**Why it happens:**
Dead code tools flag the deprecated agent as unused in steps but miss its registration in `index.ts`. Schema reorganization tends to move canonical declarations without auditing all downstream consumers. Searches scoped to the `workflow/` directory miss the eval files one level up in `src/evals/`.

**How to avoid:**
1. Before deleting any file: run `grep -rn "from.*<filename>"` across the entire `src/` tree (not just `workflow/`). If any hit exists outside the file itself, update the importer first.
2. For schema reorganization: maintain re-exports at the old path for at least one commit. Move the declaration, add a re-export at the old path, verify `npx tsc --noEmit` passes, then remove the re-export in a separate commit.
3. The `02a-initial-hypothesis-extractor-agent.ts` deletion specifically requires removing both its `import` and its entry in `workflowAgents` in `index.ts`, and removing the reference in `README.md`.

**Warning signs:**
- `npx tsc --noEmit` produces `Cannot find module` errors after a deletion.
- A file is deleted but `src/mastra/workflow/index.ts` still imports it.
- `src/evals/zero-shot-solver.ts` fails to import after `workflow-schemas.ts` is restructured — this file lives outside the workflow directory and is easy to miss in a local search.

**Phase to address:** Dead-code-removal phase (first in the refactor sequence). Run `npx tsc --noEmit` and `npm run eval -- --problem <id>` after each deletion.

---

### Pitfall 5: Schema Reorganization Producing Duplicate Symbol Errors via Re-Exports

**What goes wrong:**
`workflow-schemas.ts` and `request-context-types.ts` already have a dual-export pattern for `Rule`: it is defined in `workflow-schemas.ts` and re-exported from `request-context-types.ts`. If schema reorganization splits `workflow-schemas.ts` into domain files and introduces a barrel `schemas/index.ts` that re-exports everything, consumers that import the same type from both the barrel and a direct path will produce TypeScript duplicate-import errors. With Zod 4, this is further complicated because inferred types and schema objects share similar names (`Rule` type vs `ruleSchema` object), and a barrel re-export of both can create `TS2300: Duplicate identifier` errors if two source files in the barrel export the same name.

**Why it happens:**
Barrel files feel like the natural solution to "one import for everything," but they cause TypeScript to see the same symbol through two different module paths. The Zod pattern of `const ruleSchema = z.object(...)` + `type Rule = z.infer<typeof ruleSchema>` is particularly prone to this when reorganized across multiple files.

**How to avoid:**
1. Do not create a barrel `index.ts` that re-exports from multiple schema files. Keep the existing `workflow-schemas.ts` as the canonical single point of import for all schemas. If it needs to be split, move declarations into sub-files and import them into `workflow-schemas.ts` — consumers continue to import from `workflow-schemas.ts`.
2. Use `import type` for all type-only imports to prevent runtime value conflicts.
3. Never re-export the same symbol from two different module paths.
4. The safest approach for v1.5: do not split `workflow-schemas.ts` at all. At 407 lines it is well-organized. Scope schema reorganization only to `request-context-helpers.ts` domain functions.

**Warning signs:**
- `npx tsc --noEmit` reports `TS2300: Duplicate identifier` after a barrel file is introduced.
- A schema is imported from both `./workflow-schemas` and `./schemas/index` in the same file.
- A Zod schema name and its inferred type name collide in a re-export barrel.

**Phase to address:** Schema reorganization phase. Verify with `npx tsc --noEmit` before and after each schema move.

---

### Pitfall 6: Model-Specific Prompt Assumptions Breaking Cross-Agent Behavior

**What goes wrong:**
GPT-5-mini (extraction agents), Gemini 3 Flash (reasoning agents), and GPT-OSS-120B (testing mode fallback) each follow different instruction patterns. Gemini 3 models default to efficient/terse output and require explicit requests for detailed reasoning. GPT-5-mini responds well to markdown delimiters (`###`, `---`) but does not need chain-of-thought encouragement. Writing a uniform "improved" prompt template and applying it to all 13 Mastra agents ignores these differences.

The extraction agents (steps 1 and 2a-extractor) use GPT-5-mini and produce structured JSON. If the new prompt for these agents adopts Gemini-style XML tags (`<output>`, `<reasoning>`), GPT-5-mini may wrap its JSON in XML-like prose, and the downstream Zod parse fails silently — the extractor returns an empty result rather than throwing.

Critically: all eval runs use `TESTING_MODEL = 'openai/gpt-oss-120b'`. Model-specific issues introduced for Gemini 3 Flash or GPT-5-mini prompts only surface when running `--mode production`. A prompt rewrite can appear to "pass" testing-mode evals while being broken in production.

**Why it happens:**
Prompt engineering guides present best practices as universal. Developers apply the "correct" pattern from one model's guide to all agents without realizing the testing model runs all eval tests.

**How to avoid:**
1. Treat extraction agents (GPT-5-mini) and reasoning agents (Gemini 3 Flash) as separate prompt engineering workstreams. Do not port reasoning agent prompt structures to extraction agents.
2. For extraction agents: prioritize exact output format instructions. Include JSON schema in the prompt, concrete examples of the expected output object, explicit "output ONLY valid JSON" constraint.
3. For Gemini 3 Flash reasoning agents: use structural headings, keep temperature at default 1.0 (per Google's explicit recommendation), use directness rather than persuasive framing.
4. Run at least one `npm run eval -- --problem <id> --mode production` after rewriting each extraction agent prompt to catch production-mode regressions.

**Warning signs:**
- An extraction agent's prompt adds `<reasoning>` or `<thinking>` XML tags not present before.
- `scoreExtraction` in `intermediate-scorers.ts` returns `questionsFound: 0` after a prompt change.
- Zod parsing of structured output starts producing more `success: false` results in eval intermediate scores.
- An eval passes in `--mode testing` but fails in `--mode production`.

**Phase to address:** Prompt engineering phase, specifically when touching `01-structured-problem-extractor-instructions.ts` and `02a-initial-hypothesis-extractor-instructions.ts`.

---

### Pitfall 7: emitToolTraceEvent Silent No-Op After Helper Extraction

**What goes wrong:**
The codebase has a documented caution: `ctx.writer?.custom()` inside tools is a silent no-op when agents run inside workflow steps. Events must be emitted via the `step-writer` from `RequestContext` using `emitToolTraceEvent`. During the DevTracePanel cleanup — extracting event handlers into helper functions — developers copy the tool execute signature but drop the `requestContext` threading needed to access `step-writer`. The result is tools that run correctly but produce no trace events in the frontend.

**Why it happens:**
The normal mental model for emitting events from an async function is `writer.write(event)`. The `step-writer` workaround is project-specific knowledge. When logic is extracted into helper functions, the `requestContext` parameter is often omitted to keep the helper signature clean.

**How to avoid:**
1. Any function that calls `emitToolTraceEvent` must receive `requestContext` as an explicit parameter — do not thread it through a closure or module-level variable.
2. When extracting helper functions from tool execute bodies, verify each helper that previously emitted events continues to emit events after extraction.
3. Add a comment above each `emitToolTraceEvent` call in extracted helpers: `// requires step-writer via requestContext; ctx.writer is a no-op inside workflow steps`.

**Warning signs:**
- A tool's event (e.g., `data-tool-call`) no longer appears in the DevTracePanel after a refactoring commit.
- A helper function was extracted from a tool execute body but its signature does not include `requestContext`.
- The frontend trace shows agent-level events but gaps where tool-level events used to appear.

**Phase to address:** DevTracePanel / frontend component cleanup phase. Verify by running a full solve in dev mode and checking that all expected trace events appear for at least one tool call.

---

### Pitfall 8: Mastra v1 API Breaking Changes in Agent Property Access

**What goes wrong:**
Mastra v1 deprecated direct property access to `agent.llm`, `agent.tools`, and `agent.instructions` in favor of getter methods (`agent.getLLM()`, `agent.getTools()`, `agent.getInstructions()`). The refactoring milestone touches agent definitions across 13 files. If any refactoring introduces code that reads these properties directly (e.g., in a factory's test helper, in a README example, or in a diagnostic utility), the code will fail at runtime without a TypeScript error — the properties exist but return deprecated values.

Similarly, `mastra.getAgents()` was renamed to `mastra.listAgents()`. If any diagnostic or eval code calls `getAgents()`, it fails at runtime.

**Why it happens:**
The old property names worked in previous Mastra versions and the change is not enforced at the TypeScript type level in all code paths. Developers copy patterns from older code or documentation without noticing the deprecation.

**How to avoid:**
1. When writing any factory helper or diagnostic code that introspects agents, always use getter methods.
2. Search for `agent.llm`, `agent.tools`, `agent.instructions`, and `mastra.getAgents()` before marking a refactoring phase complete.
3. Check `node_modules/@mastra/core` type definitions for the current installed version (1.8.0) to confirm which methods are available.

**Warning signs:**
- A newly written factory test helper accesses `agent.tools` instead of `agent.getTools()`.
- `mastra.getAgents()` appears in any new utility or diagnostic file.
- Runtime errors in dev mode mentioning deprecated property access.

**Phase to address:** Factory pattern phase and any phase that introduces agent introspection utilities.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Rewriting all 19 prompts in one batch | Faster milestone delivery | Cannot isolate which prompt caused a regression; eval scores become meaningless for diagnosis | Never — always do one agent at a time with an eval checkpoint |
| Using a barrel `index.ts` for schemas | Single import path for consumers | Circular import risk, duplicate symbol errors, tree-shaking problems in Next.js | Only if the barrel imports from true leaf files with no cross-dependencies |
| Deleting deprecated agents without grepping all consumers | Cleaner codebase faster | Breaks `src/evals/zero-shot-solver.ts` or other out-of-tree importers silently | Never — always grep `src/` first |
| Applying one factory to all 13 agents at once | Less incremental work | Mistakes propagate to all agents; harder to bisect a regression | Start with 2-3 agents, verify, then scale |
| Skipping `npx tsc --noEmit` between refactoring steps | Faster iteration | Circular imports and broken re-exports accumulate undetected | Never during schema reorganization |
| Running only `--mode testing` evals for prompt rewrites | Fast iteration cycle | Production-mode model-specific regressions invisible until production use | Never for extraction agents; acceptable for a first pass on reasoning agents |

---

## Integration Gotchas

Common mistakes when connecting to external services or internal boundaries.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Mastra v1 Agent API | Accessing `agent.llm`, `agent.tools`, `agent.instructions` as properties | Use `agent.getLLM()`, `agent.getTools()`, `agent.getInstructions()` — direct property access deprecated in Mastra v1 |
| Mastra RequestContext in factory | Passing model string to factory, constructing `openrouter(modelId)` at factory call time | Pass `productionModel: string` to factory; factory must construct `({ requestContext }) => getOpenRouterProvider(requestContext)(...)` |
| OpenRouter per-request key | Creating provider once at module load and capturing it in closure | Create provider per-request via `createOpenRouterProvider(state.apiKey)` inside the step; do not cache across requests |
| Eval harness as regression gate | Running eval only at end of milestone | Run `npm run eval -- --problem <id>` in testing mode after every prompt change; run full `--comparison` eval before and after milestone |
| `emitToolTraceEvent` in extracted helpers | Omitting `requestContext` from helper function signature | Always pass `requestContext` explicitly; never rely on module-scope capture |
| Zod 4 `._def` access | Accessing `schema._def` for schema introspection (Zod 3 pattern) | Zod 4 moved internal definition to `schema._zod.def`; avoid `._def` access in any reorganized schema code |
| `src/evals/` during schema reorganization | Scoping schema import audit to `src/mastra/workflow/` only | `src/evals/zero-shot-solver.ts` imports from `@/mastra/workflow/workflow-schemas`; always audit the full `src/` tree |

---

## Performance Traps

Patterns that work but silently degrade eval score or runtime performance.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Prompt length exceeding 3,000 tokens | LLM reasoning degrades; rule quality score drops; more verifier iterations needed | Audit token count after each prompt rewrite; keep system prompts under 2,000 tokens; put dynamic content in user message, not system message | Above ~3,000 tokens in system prompt per research findings |
| Duplicate instructions across tool-injection and system prompt | LLM receives conflicting format requirements; produces malformed tool calls | The hypothesizer agent injects `{{RULES_TOOLS_INSTRUCTIONS}}` and `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` via template substitution; do not duplicate these sections in the base prompt | Any prompt rewrite that copies tool documentation inline rather than using the template placeholder |
| Over-specifying output format for reasoning agents | Gemini 3 Flash produces shorter, less nuanced reasoning; rule coverage decreases | Keep Gemini reasoning agents directive but not overly constrained; use structural headings, not rigid JSON-extraction constraints on reasoning steps | When a rewritten prompt adds `RETURN ONLY` or a JSON schema to a reasoning (not extraction) agent |
| Testing mode masking production prompt issues | All eval runs use `TESTING_MODEL` (`gpt-oss-120b`); production-model-specific regressions invisible | Run at least one `--mode production` eval for prompts intended for Gemini 3 Flash or GPT-5-mini | Any prompt that uses model-specific formatting not supported by `gpt-oss-120b` |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **02-hypothesize.ts split:** Run `npm run eval` after split to confirm the multi-round hypothesis loop still terminates correctly. The sub-phase files must preserve all `await setState(...)` calls in the correct sequence; a missing setState between phases corrupts round state.
- [ ] **Dead code removal:** Verify `src/evals/zero-shot-solver.ts` still compiles after any schema change — it lives outside `workflow/` and imports `questionsAnsweredSchema`.
- [ ] **Factory pattern migration:** Verify `--mode testing` and `--mode production` model toggle still works by checking logged model IDs in at least one eval run after migration.
- [ ] **Prompt rewrite for extraction agents:** Verify with `npm run eval -- --problem <id> --mode production` that `scoreExtraction` still returns `success: true` and `questionsFound` matches `expectedQuestions`.
- [ ] **DevTracePanel cleanup:** After any handler extraction, trigger a full solve in dev mode and confirm all trace event types still appear in the panel (`data-tool-call`, `data-vocabulary-update`, `data-rules-update`).
- [ ] **Type safety improvements:** Replacing `as any` in `03a-rule-tester-tool.ts` and `03a-sentence-tester-tool.ts` for `abort-signal` access requires confirming the new typed pattern works identically at runtime to `(ctx.requestContext as any)?.get?.('abort-signal')`.
- [ ] **Claude Code agent prompts (6 agents):** The agents in `claude-code/.claude/agents/` use markdown-file workspace state, not Mastra RequestContext. Applying Mastra-style tool instruction patterns to these agents is a category error; they must retain PIPELINE.md references.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Circular import discovered at runtime | LOW | `git diff --stat` to find new import edges; use `import type` to break the cycle; re-run `npx tsc --noEmit` |
| Prompt regression found in eval | MEDIUM | `git log --oneline` to find the prompt change commit; revert that one file; re-run eval to confirm score restores; then re-attempt the rewrite with a more conservative change |
| Factory pattern broke model switching | LOW | Compare factory implementation against the original dynamic-model pattern in `03a-verifier-orchestrator-agent.ts`; ensure the function is `({ requestContext }) => ...` not a static value |
| Schema reorganization broke evals import | LOW | Add a re-export at the old path (`export { questionsAnsweredSchema } from './schemas/new-location'`); run `npx tsc --noEmit`; do not delete old re-export until all consumers are migrated |
| Dead code deletion broke observability registry | LOW | Restore the import and export in `index.ts`; mark the agent with `// DEPRECATED` rather than deleting its registration |
| emitToolTraceEvent stopped emitting from extracted helper | LOW | Add `requestContext` parameter to the helper; thread it from the tool execute context |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Circular imports from file-splitting | File-splitting phase (02-hypothesize.ts) | `npx tsc --noEmit` passes; `npm run eval -- --problem <id>` passes after each split |
| Prompt regression without baseline | Pre-prompt-engineering setup | Baseline eval scores captured and saved before any prompt is touched |
| Factory pattern breaking dynamic model | Factory pattern phase | `--mode testing` and `--mode production` log different model IDs after factory migration |
| Dead code removal breaking importers | Dead code removal phase (first) | `grep -rn "from.*<deleted-file>"` across full `src/` returns zero hits before deletion |
| Schema re-export duplicate symbols | Schema reorganization phase | `npx tsc --noEmit` produces zero new errors; `src/evals/` compiles cleanly |
| Model-specific prompt breaking extraction | Prompt engineering phase (extraction agents) | `scoreExtraction` returns `success: true` in `--mode production` eval |
| emitToolTraceEvent silent no-op | DevTracePanel cleanup phase | Full solve in dev mode shows all expected trace event types in the panel |
| Mastra v1 API deprecated properties | Factory pattern phase | No direct `agent.llm`/`agent.tools`/`agent.instructions` property access in any new code |

---

## Sources

- Codebase analysis: `/home/cervo/Code/LO-Solver/src/mastra/workflow/` — direct examination of 39 import edges across schema files, agent definitions, and step files
- Mastra v1 migration guide: [Agent Class | v1 Migration Guide | Mastra Docs](https://mastra.ai/guides/migrations/upgrade-to-v1/agent) — breaking changes for `requestContext`, property accessor deprecations
- Prompt regression research: [When "Better" Prompts Hurt](https://arxiv.org/html/2601.22025v1) — 10% extraction pass rate drop and 13% RAG compliance drop from generic prompt improvements on Llama 3
- Automated prompt regression testing: [Traceloop — Automated Prompt Regression Testing](https://www.traceloop.com/blog/automated-prompt-regression-testing-with-llm-as-a-judge-and-ci-cd) — "prompt drift is silent but costly"
- Gemini prompting strategies: [Gemini API Prompt Design Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) — temperature 1.0 recommendation, directness over persuasive framing, few-shot example guidance
- TypeScript circular dependencies: [How to Fix Circular Dependency Issues in TypeScript](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de) — `import type` as a safe workaround
- Barrel file pitfalls: [Tree shaking doesn't work with TypeScript barrel files](https://github.com/vercel/next.js/issues/12557) — confirmed still an issue in Next.js projects
- Zod 4 migration: [Lessons from Upgrading to Zod 4](https://www.viget.com/articles/lessons-learned-upgrading-a-large-typescript-application-from-zod-3-to-4) — `._def` moved to `._zod.def`, stricter `.pipe()` typing
- LLM prompt engineering testing: [LLM Testing in 2026 — Top Methods](https://www.confident-ai.com/blog/llm-testing-in-2024-top-methods-and-strategies)
- Dead code removal: [How to Delete Dead Code in TypeScript Projects](https://camchenry.com/blog/deleting-dead-code-in-typescript)

---

*Pitfalls research for: LO-Solver v1.5 Refactor and Prompt Engineering milestone*
*Researched: 2026-03-08*
