# Stack Research

**Domain:** Codebase refactoring and prompt engineering for an existing TypeScript/Next.js/Mastra AI agent application
**Researched:** 2026-03-08
**Confidence:** HIGH

---

## Context: What This Milestone Adds and Does Not Add

This is a refactoring and prompt engineering milestone on an existing, validated stack. The base stack (TypeScript 5.9.3, Next.js 16.1.6, Mastra 1.8.0, Zod 4.3.6, React 19, shadcn/ui) is fixed and not under investigation. This document covers only what is needed for the new work:

- Dead code detection (unused exports, files, dependencies)
- Type safety analysis (where `: any` annotations remain)
- File splitting patterns (splitting `02-hypothesize.ts` at 1,240 lines into sub-phase files)
- Prompt engineering methodology for the three model families in use: GPT-5-mini (`openai/gpt-5-mini`), Gemini 3 Flash (`google/gemini-3-flash-preview`), and Claude Opus 4.6 (`claude-opus-4-6`)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Knip | 5.86.0 | Unused file, export, and dependency detection | Current standard for TypeScript dead code detection. Supersedes ts-prune which is now in maintenance mode per its own maintainer. Has a native Next.js plugin that auto-activates when `next` is in package.json — no manual config needed. Finds unused exports, files, and npm dependencies in a single pass. Run once before cleanup, re-run to confirm. |
| TypeScript (existing) | 5.9.3 | Type safety analysis and validation after file splits | Already configured with `strict: true`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` — the strictest available settings. No additional type tooling needed. The remaining `: any` annotations in `logging-utils.ts` and `request-context-helpers.ts` are fixed via code changes, not new tooling. |
| Prettier (existing) | in devDeps | Code formatting | Already configured via `.prettierrc`. No changes needed. |

### Supporting Libraries

No new runtime dependencies. One new dev dependency for the audit phase.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Knip | 5.86.0 | One-time dead code audit | Install as a devDependency. Run before starting dead code removal to identify targets. Re-run after cleanup to confirm. Not needed as a permanent CI gate for this milestone. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `npx tsc --noEmit` | Type-check after each file split | Already in use per CLAUDE.md. Run after splitting `02-hypothesize.ts` to confirm no broken imports. Ignore the one pre-existing `layout.tsx` error documented in CLAUDE.md. |
| `npx knip` | Generate unused-export and unused-file report | Run after `npm install -D knip`. The Next.js plugin activates automatically. Treat output as a starting list — verify each finding before deleting, as re-exported types can produce false positives. |

---

## Prompt Engineering Methodology

This section covers the research-backed, model-specific approach for rewriting 19 agent prompts (13 Mastra + 6 Claude Code agents). Sources were fetched from official documentation for all three model families.

### GPT-5-mini (`openai/gpt-5-mini`) — Used by: Structured Problem Extractor, Initial Hypothesis Extractor, Verifier Feedback Extractor, Rule Improvement Extractor, Rule Tester, Sentence Tester

**Sources:** OpenAI GPT-4.1 Prompting Guide and GPT-5 Prompting Guide (developers.openai.com, fetched directly). Confidence: HIGH.

**Key practices for rewriting these prompts:**

1. **Literal instruction following.** GPT-5-mini follows instructions more literally than GPT-4o. Ambiguous instructions produce ambiguous outputs. Remove any instruction that says "unless" or "except when" — replace with explicit branching: "If X, do A. If Y, do B."

2. **Recommended system prompt structure (in this order):**
   - Role and Objective
   - Instructions (with named sub-sections)
   - Reasoning Steps (if any)
   - Output Format (explicit schema description — not just "return JSON", describe each field)
   - Examples (2-3 few-shot, wrapped in `<example>` tags)
   - Context (dynamic data injected at the end)

3. **JSON/structured output.** Describe the exact schema in the instructions section. State field names, types, and whether they are required or nullable. The Mastra Zod schemas are the source of truth — write the prompt description from the schema. GPT-5-mini returns JSON reliably when the schema is described explicitly.

4. **No markdown in API outputs.** GPT-5 series does not format API responses in Markdown by default. "Return only the JSON object. Do not include any explanation, commentary, or preamble" is sufficient and will be followed literally.

5. **Conflicting instructions degrade output more than with earlier models.** Before finalizing each prompt, read it top to bottom and check: does any instruction contradict another? For example, "return success: false on error" combined with "the response is always a valid JSON object" is not a conflict — but "include an explanation" combined with "return only JSON" is.

6. **Extraction agents (high precision, low reasoning).** The four extraction agents (Initial Hypothesis Extractor, Verifier Feedback Extractor, Rule Improvement Extractor, Structured Problem Extractor) need high JSON fidelity with minimal reasoning. Keep their prompts short and mechanical. The instruction "Extract the structured data from the text above. Return a JSON object matching the schema below. Do not infer or add information not present in the text." is more effective than longer instructions.

7. **Tester agents (Rule Tester, Sentence Tester).** These are called in a tight loop. Keep instructions minimal and task-scoped: "You receive one rule and one sentence. Test this exact pair. Return pass or fail with a brief reason. Do not test anything else." Shorter prompts reduce latency and cost at scale.

### Gemini 3 Flash (`google/gemini-3-flash-preview`) — Used by: Dispatcher, Initial Hypothesizer, Verifier Orchestrator, Synthesizer, Rules Improver, Question Answerer

**Sources:** Google Gemini 3 Developer Guide and Gemini API Prompting Strategies (ai.google.dev, fetched directly). Confidence: HIGH.

**Key practices for rewriting these prompts:**

1. **Direct, concise prompts.** Gemini 3 Flash is less verbose than earlier Flash models and prefers direct instructions over elaborate framing. Remove motivational preambles. State what to do, not why it matters (unlike Claude, which benefits from rationale).

2. **Do not change temperature.** Google's documentation explicitly states: "Keep temperature at its default value of 1.0. Lowering temperature below 1.0 may lead to unexpected behavior, such as looping or degraded performance." Do not add temperature overrides in agent configuration.

3. **Few-shot examples are essential.** Gemini 3 prompts without examples produce less consistent formatting. Include 2-5 examples. Use `<example>` tags. Ensure all examples use identical structure — inconsistent formatting across examples degrades output format consistency.

4. **Context and data placement.** Put dynamic data (the problem, dataset, vocabulary) after role and instructions, not before. Put the specific question or task at the very end. Pattern: role → instructions → data → question. Google reports this ordering improves response quality significantly on complex multi-step inputs.

5. **Positive constraints only.** Avoid large blanket negative constraints like "do not infer" or "never guess." These cause Gemini 3 to over-apply the constraint and fail at basic reasoning steps. Instead, state what to use: "Base your analysis only on the provided dataset examples."

6. **Planning instruction for orchestrator agents (Dispatcher, Verifier Orchestrator, Rules Improver).** These agents coordinate work and make decisions. Add: "Before taking any action, list the sub-tasks you will perform. Then execute them in order." Gemini 3 responds well to explicit decomposition before tool use or structured output generation.

7. **Thinking level.** Gemini 3 Flash enables high-level reasoning by default. For the complex reasoning agents (Initial Hypothesizer, Rules Improver), this default is appropriate. For the Synthesizer and Question Answerer — which apply rules rather than discover them — consider `thinking_level: "low"` to reduce latency. Validate against the eval harness before committing this change.

8. **Knowledge cutoff note.** Gemini 3 Flash's knowledge cutoff is January 2025. The linguistics domain uses stable academic knowledge — this is not a concern. No special handling needed in prompts.

### Claude Opus 4.6 (`claude-opus-4-6`) — Used by: Claude Code solver agents (hypothesizer, synthesizer, answerer, improver, extractor); Sonnet 4.6 for the verifier

**Source:** Anthropic Prompting Best Practices (platform.claude.com, fetched directly). Confidence: HIGH.

**Key practices for rewriting these prompts:**

1. **XML tags for structure.** Claude strongly benefits from XML-tagged prompt sections: `<instructions>`, `<context>`, `<examples>`, `<input>`. The current Claude Code agent prompts use markdown headers, which work but are less precise when content includes code or nested structure. Switch to XML tags for section boundaries.

2. **Long data at the top, specific task at the end.** For the hypothesizer and synthesizer agents that receive the full problem dataset, place dataset content first, then instructions, then the specific task at the very end. Anthropic reports up to 30% quality improvement with this ordering on complex multi-document inputs.

3. **Role assignment.** Preserve and refine the existing role sentence. A single focused role sentence ("You are a linguistics expert specializing in morphological analysis") calibrates behavior and tone. The current agent prompts do this well.

4. **Explain the "why" behind constraints.** Claude generalizes from reasoning. "Never include vocabulary in the Rules section, because vocabulary and rules serve different purposes in the downstream pipeline — mixing them causes errors in the verifier" is more effective than "Never include vocabulary in the Rules section." Apply this pattern to all constraints in the agent prompts that currently lack rationale.

5. **Explicit action vs. suggestion.** Claude Opus 4.6 can be over-eager or under-eager about taking action depending on context. For agents that must write files (hypothesizer, extractor), state explicitly: "Write the output file. Do not describe what the file should contain — write it directly to the path provided." For agents that should reason before acting (improver), add a planning step first.

6. **Overeagerness and overengineering control.** Claude Opus 4.6 has a documented tendency to overengineer. Add to the hypothesizer and synthesizer: "Generate only what is directly evidenced by the dataset. Do not add rules or vocabulary items that are inferred from similar real-world languages or general linguistic knowledge."

7. **Prefilled responses are deprecated.** Claude 4.6 no longer supports prefilled responses on the last assistant turn. The Claude Code agent prompts use file output (write to a path), not API prefills — this does not apply. No changes needed.

8. **Adaptive thinking.** Claude Opus 4.6 uses adaptive thinking by default. For the Claude Code agents (which run inside Claude Code's runtime, not via the API directly), thinking behavior is managed by the runtime. Agent markdown files should not attempt to control thinking via prompt keywords — use clear task framing and complexity signaling instead.

9. **Parallel tool use.** Claude Opus 4.6 excels at parallel tool execution. The hypothesizer uses Read, Write, Bash, Glob, Grep tools. Add the standard parallel-tool prompt where appropriate: "If you intend to call multiple tools and there are no dependencies between the calls, make all independent calls in parallel."

10. **Sonnet 4.6 (verifier).** The verifier uses Sonnet for cost efficiency. The Anthropic docs recommend setting `effort: "medium"` for Sonnet 4.6 (the default of `high` adds latency). The verifier does focused, repetitive work — medium effort is appropriate. This is not directly configurable in Claude Code agent files via frontmatter, but the verifier's prompt should not include instructions that increase reasoning depth unnecessarily.

---

## Prompt Engineering: Methodology (Process for Doing the Work)

The research points to a structured manual process. This is not a tooling question.

**Step 1: Gather official vendor guides before starting each batch.** The official prompt guides are the authoritative sources. Training data is 6-18 months stale; vendor guides reflect current model behavior.

- OpenAI GPT-5 Prompting Guide: https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide
- OpenAI GPT-4.1 Prompting Guide: https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide
- Google Gemini 3 Developer Guide: https://ai.google.dev/gemini-api/docs/gemini-3
- Google Prompting Strategies: https://ai.google.dev/gemini-api/docs/prompting-strategies
- Anthropic Prompting Best Practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices

**Step 2: Audit all 19 prompts before rewriting.** For each prompt, identify: (a) which model family it targets, (b) what patterns it currently uses, (c) specific anti-patterns for that model family (large blanket negatives for Gemini, missing XML structure for Claude, missing explicit schema for GPT-5-mini).

**Step 3: Rewrite model-by-model, not prompt-by-prompt.** Group the 19 prompts by model family. Internalize the model-specific guide, then rewrite all prompts in that group in one session. Switching model-family context mid-session degrades consistency.

**Step 4: Validate with the eval harness after each batch.** Run `npm run eval` after completing each model family's prompts. The eval harness (4 Linguini problems with ground truth) is the only reliable quality gate. A regression in any batch means that batch needs further revision before moving to the next.

---

## File Splitting: Patterns for `02-hypothesize.ts`

No new tooling needed. These are pure TypeScript refactor patterns.

**Validated pattern: Internal step modules, no public index.ts re-export.**

The project validated this in v1.2 (CLAUDE.md: "Step files split without index.ts re-export — Steps are internal to workflow composition, not public API"). Apply the same approach to split `02-hypothesize.ts` (1,240 lines) into sub-phase files:

```
src/mastra/workflow/steps/
  02-hypothesize.ts      (orchestrator, ~100 lines after split)
  02a-dispatch.ts        (~130 lines — dispatcher agent call and perspective generation)
  02b-hypothesize.ts     (~400 lines — per-perspective hypothesis loop)
  02c-verify-select.ts   (~350 lines — verification and winner selection)
  02d-synthesize.ts      (~200 lines — synthesis and improve-dispatcher)
```

Each sub-file exports a single function called by the orchestrator. The orchestrator (`02-hypothesize.ts`) imports from the sub-files.

**Validation step after each split:** `npx tsc --noEmit`. The split is complete when tsc reports no new errors (ignoring the pre-existing `layout.tsx` error).

**Pattern: Agent factory function to reduce boilerplate across 13 agents.**

The 13 Mastra agent files share identical structure: import Agent, import UnicodeNormalizer, import instructions, import TESTING_MODEL, create agent with dynamic model selector. An agent factory captures this:

```typescript
// workflow/agent-factory.ts
export function createWorkflowAgent(config: {
  id: string;
  name: string;
  instructions: string;
  productionModel: string;
  tools?: Record<string, Tool>;
}): Agent {
  return new Agent({
    id: config.id,
    name: config.name,
    instructions: { role: 'system', content: config.instructions },
    model: ({ requestContext }) =>
      getOpenRouterProvider(requestContext)(
        requestContext?.get('model-mode') === 'production'
          ? config.productionModel
          : TESTING_MODEL,
      ),
    tools: config.tools ?? {},
    inputProcessors: [new UnicodeNormalizer({ ... })],
  });
}
```

This is a pure TypeScript refactor. No new libraries needed.

**Pattern: Domain-split schemas and helpers.**

`workflow-schemas.ts` (407 lines) and `request-context-helpers.ts` (440 lines) are candidates for domain-oriented splits. Suggested splits:

- `workflow-schemas.ts` → `schemas/problem.ts`, `schemas/hypothesis.ts`, `schemas/verification.ts`
- `request-context-helpers.ts` → `helpers/cost.ts`, `helpers/events.ts`, `helpers/providers.ts`

Use barrel re-exports only if other files import from `workflow-schemas.ts` directly. If they do (most likely), keep a thin re-export barrel to avoid changing 20+ import sites:

```typescript
// workflow-schemas.ts (thin barrel after split)
export * from './schemas/problem';
export * from './schemas/hypothesis';
export * from './schemas/verification';
```

---

## What NOT to Add

| Avoid | Why | What to Do Instead |
|-------|-----|-------------------|
| ts-prune | In maintenance mode per its own maintainer; Knip supersedes it | Use Knip 5.86.0 |
| ESLint + typescript-eslint | Not currently configured; adding ESLint for a refactoring milestone adds setup overhead disproportionate to the task | Use Knip for unused exports; use `tsc --noEmit` for type errors |
| eslint-plugin-unused-imports | Requires ESLint setup that doesn't exist in the project | Use Knip |
| New test framework | No test framework is intentional — eval harness is the testing strategy per CLAUDE.md | Continue using `npm run eval` |
| Prompt engineering libraries (LangChain prompt templates, DSPy, etc.) | The project uses plain TypeScript string exports for prompts (the `DISPATCHER_INSTRUCTIONS` pattern). This is sufficient and consistent. | Improve prompt content using official vendor guides; keep the string export mechanism |
| Automated prompt optimization | The eval harness has 4 problems — insufficient signal for automated optimization methods | Manual rewrite guided by official vendor guides and validated with `npm run eval` |
| New LLM models or providers | Stack is settled: GPT-5-mini (extraction), Gemini 3 Flash (reasoning), Claude Opus 4.6 (Claude Code agents) | Improve prompts for existing models |
| Biome (ESLint/Prettier replacement) | Prettier is already configured and working; switching is not in scope | Keep Prettier |

---

## Installation

Knip is the only net-new dev dependency for this milestone:

```bash
# Dead code detection (dev only, one-time audit tool)
npm install -D knip

# Run the audit
npx knip
```

No other installs needed. All other work is code changes.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Knip 5.86.0 | ts-prune | Never for new work — ts-prune is in maintenance mode |
| Knip 5.86.0 | Manual code search for dead code | For codebases smaller than ~10 files. LO-Solver has 60+ source files in mastra/workflow alone. Knip is more reliable. |
| Official vendor guides for prompt engineering | General prompt engineering articles | General articles are appropriate for non-model-specific guidance; for GPT-5-mini, Gemini 3 Flash, and Claude Opus 4.6 specifically, the official guides are more accurate |
| `npx tsc --noEmit` for post-split validation | Type coverage tooling | Type coverage tools address `strict: false` codebases. This project already has strict enabled — tsc itself is sufficient. |
| Plain TypeScript string exports for prompts | Template literals with slot injection | Slot injection (replacing `{{VAR}}` in template strings) is already used for vocabulary/rules tool instructions. Keep this pattern where it exists but do not expand it — the eval harness is more valuable than prompt parameterization. |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| knip@5.86.0 | Next.js (any version) | The Next.js plugin pattern-matches on `next` in package.json regardless of major version. Auto-activates. |
| knip@5.86.0 | TypeScript 5.9.3 | Fully compatible — Knip uses TypeScript's compiler API internally. |

---

## Sources

- https://knip.dev/ — Knip feature overview, Next.js plugin documentation (HIGH confidence — official docs)
- https://socket.dev/blog/knip-hits-500-releases — Knip version 5.86.0 confirmation (MEDIUM confidence — news coverage, corroborated by npm show output)
- https://effectivetypescript.com/2023/07/29/knip/ — ts-prune vs Knip comparison with explanation of ts-prune maintenance status (HIGH confidence — written by author of Effective TypeScript)
- https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide — GPT-4.1 prompt engineering guide for literal instruction following, system prompt structure, JSON output (HIGH confidence — official OpenAI guide, fetched directly)
- https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide — GPT-5 prompt engineering guide for verbosity control, agentic behavior, reasoning_effort (HIGH confidence — official OpenAI guide, fetched directly)
- https://ai.google.dev/gemini-api/docs/gemini-3 — Gemini 3 Flash developer guide: temperature warning, context window, thinking level, knowledge cutoff (HIGH confidence — official Google docs, fetched directly)
- https://ai.google.dev/gemini-api/docs/prompting-strategies — Google prompting strategies: few-shot examples, context placement, positive constraints (HIGH confidence — official Google docs, fetched directly)
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices — Anthropic prompting best practices for Claude Opus 4.6: XML tags, data placement, role assignment, adaptive thinking, prefill deprecation (HIGH confidence — official Anthropic docs, fetched directly)

---
*Stack research for: LO-Solver v1.5 Refactor & Prompt Engineering*
*Researched: 2026-03-08*
