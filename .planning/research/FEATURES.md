# Feature Research

**Domain:** Codebase refactoring and prompt engineering (LO-Solver v1.5)
**Researched:** 2026-03-08
**Confidence:** HIGH

## Context

This is a subsequent milestone. The existing codebase (v1.4) has 15,656 LOC TypeScript and ships
a working pipeline. The v1.5 work is purely internal quality work: no new user-facing capabilities,
no feature additions, no stack changes. The two work streams are:

1. **Refactoring** — clean up structure without changing behavior
2. **Prompt engineering** — rewrite all 19 agent prompts using current vendor best practices

---

## Feature Landscape

### Table Stakes (Users Expect These)

In the context of a refactor milestone, "users" are the developers working in this codebase.
These are properties that a competent refactor must deliver to be considered complete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Zero behavioral regression | A refactor that changes behavior is a bug, not a cleanup | LOW | All changes must be verifiable against the eval harness (run before/after) |
| Dead code removal | Deprecated agents (`02a-initial-hypothesis-extractor-*`) are marked but still registered and exported | LOW | `initialHypothesisExtractorAgent` is imported in `index.ts` with a "DEPRECATED" comment; both its agent and instruction files can be deleted |
| Unused export cleanup | Exports with no consumers waste reader attention and create false signals about API surface | LOW | Manual audit: check `workflowTools` object in `index.ts` — `testRule` and `testSentence` (vs `testRuleWithRuleset` / `testSentenceWithRuleset`) need audit for actual callers |
| `02-hypothesize.ts` split | 1,240-line single file is the largest source of merge conflicts and hard to navigate | MEDIUM | Split into sub-phase files by logical section: dispatch, hypothesis-per-perspective, synthesis, verify, improve. Each sub-phase file imports agents it uses |
| Agent factory pattern | 13 agent definitions share 90% boilerplate (UnicodeNormalizer config, model selection pattern, tools spread) | MEDIUM | Create `createSolverAgent(config)` factory that applies shared defaults; each agent file becomes ~10 lines of config instead of ~50 |
| Schema domain grouping | `workflow-schemas.ts` (407 lines) mixes: core types, workflow state, step I/O, dispatcher output schemas | MEDIUM | Split into `schemas/core.ts`, `schemas/workflow-state.ts`, `schemas/step-io.ts` — imports update but types are unchanged |
| `request-context-helpers.ts` grouping | 440 lines mixing: OpenRouter helpers, vocabulary helpers, rules helpers, event emitters, cost tracking | MEDIUM | Split into domain-focused files or at minimum add clear section markers; simpler than schema split since it is all helpers |
| Frontend DevTracePanel cleanup | `dev-trace-panel.tsx` (290 lines) contains inline event handler logic that should be extracted | MEDIUM | Extract event handler callbacks to named functions; reduce anonymous arrow functions in JSX |
| Type safety: replace `any` | 4 occurrences of `: any` in `logging-utils.ts` (x3) and `request-context-helpers.ts` (x1); all are in utility functions handling Mastra response objects | LOW | Replace with `unknown` + type narrowing, or define explicit interfaces for the Mastra response shapes being accessed |
| Commented-out code removal | `03b-rules-improver-agent.ts` has a commented-out model line (`// model: openrouter('google/gemini-3-pro-preview')`) | LOW | Delete; no value in version-controlled commented code |

### Differentiators (Prompt Engineering Improvements)

These are not cleanup — they are quality improvements to the 19 agent prompts. The goal is to
apply current vendor-recommended prompting patterns to each model family used in the project.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| GPT-5-mini prompts: concise, explicit, caching-friendly | GPT-5-mini benefits from explicit step-by-step instructions, static content at the top of prompts (for prompt caching), and direct output format directives. Current extraction prompts are wordy and mix instructions with examples | MEDIUM | Applies to: `structuredProblemExtractorAgent`, `ruleTesterAgent`, `sentenceTesterAgent`, `verifierFeedbackExtractorAgent`, `rulesImprovementExtractorAgent`. Key change: keep static preamble at top (cacheable), put variable instructions at end; add "Return ONLY JSON." |
| Gemini 3 Flash prompts: direct, no chain-of-thought scaffolding, XML delimiters | Current prompts use heavy numbered step lists designed for GPT-3-era models. Gemini 3 Flash responds best to direct, concise instructions and explicit `<section>` delimiters. Temperature should stay at default 1.0 | HIGH | Applies to: `dispatcherAgent`, `improverDispatcherAgent`, `initialHypothesizerAgent`, `synthesizerAgent`, `rulesImproverAgent`, `questionAnswererAgent`. Major rewrites — restructure from numbered steps to XML-delimited sections; remove redundant process descriptions |
| Claude Opus 4.6 prompts: XML tags, role as first line, tool use guidance, adaptive thinking notes | Current Claude Code agent prompts (hypothesizer, verifier, improver, synthesizer, answerer, extractor) use markdown headings consistently but lack XML structure for input data and specific tool use guidance per Anthropic's current best practices | HIGH | Applies to all 6 `.claude/agents/*.md` files. Add `<context>` / `<input>` / `<task>` XML wrapping; move role definition to first sentence; add explicit tool use instructions per current Anthropic guide |
| Prompt template injection cleanup | Current pattern: string `.replace('{{PLACEHOLDER}}', value)` is fragile (typo = silent no-op, no type safety) | MEDIUM | Replace with a typed template function: `buildInstructions(base: string, parts: PromptParts): string` that validates required fields are present. Alternatively, restructure to avoid injection (move shared sections to shared constants and compose via string concatenation) |
| System prompt cache optimization | GPT-5-mini and Gemini 3 Flash both benefit from placing static content at the start of prompts for prefix caching. Current prompts often start with variable content like "You are solving a Linguistics Olympiad problem" (fine) but embed dynamic context mid-prompt | LOW | Audit prompt construction in step files — ensure static role/instructions precede variable data |
| Confidence calibration language | Prompts use "HIGH/MEDIUM/LOW confidence" guidance but the explanations are inconsistent across agents. Rule tester says `RULE_OK` but the improver responds to `conclusion: ALL_RULES_PASS`. Aligning terminology reduces model confusion | LOW | Standardize confidence vocabulary across all prompts; ensure tester output fields map directly to improver input field names |

### Anti-Features (Do Not Attempt)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automated prompt quality scoring | "Let's add evals to measure prompt quality before/after" | Prompt quality is measured by eval harness accuracy scores, not a separate scoring system. Adding eval-of-eval complexity increases scope beyond v1.5 | Run the existing eval harness before and after prompt changes; compare scores |
| Refactoring workflow schemas with Zod v4 breaking changes | Zod 4.3.6 is already installed and working | Migrating Zod usage would change API surface for all schema consumers — not a cleanup, a migration | Keep current Zod usage; only reorganize files |
| Adding an index.ts re-export layer for step files | "Steps should have a public API" | PROJECT.md decision: "Steps are internal to workflow composition, not public API" — adding re-exports contradicts this settled decision | Leave step files as direct imports in `workflow.ts` |
| Splitting agent instruction files further | "Each section of a long prompt could be its own file" | Instruction files are already focused (one per agent). Splitting within an instruction file creates fragmentation with no benefit | Keep one instruction file per agent; reduce internal length by rewriting with more concise prompts |
| Global `any` ban via ESLint | "Add `@typescript-eslint/no-explicit-any` rule" | Only 4 `any` usages exist and all have legitimate reasons (Mastra internal types not fully typed). A global ban would fight legitimate use cases | Fix the specific 4 occurrences; do not add a blanket ESLint rule that creates ongoing friction |
| Rewriting agents in a new pattern that changes behavior | "While we're in there, let's also improve the logic" | Prompt engineering and refactoring must be separable. Mixing behavioral changes into a structural refactor makes regression detection impossible | Keep behavioral changes strictly separate from structural cleanup; if a prompt rewrite changes accuracy, that is the intended change |

---

## Feature Dependencies

```
[Dead code removal]
    (independent — no dependencies)

[Type safety fixes]
    (independent — no dependencies)

[Commented-out code removal]
    (independent — no dependencies)

[Agent factory pattern]
    └──makes easier──> [02-hypothesize.ts split]
                       (factory reduces per-agent boilerplate before splitting)

[Schema domain grouping]
    └──pairs with──> [request-context-helpers grouping]
                     (both reorganize the same shared utilities layer)

[Prompt template injection cleanup]
    └──precedes──> [GPT-5-mini prompt rewrites]
    └──precedes──> [Gemini 3 Flash prompt rewrites]
    └──precedes──> [Claude Opus 4.6 prompt rewrites]
    (cleaner composition makes prompt rewrites easier to verify)

[GPT-5-mini prompt rewrites] ──independent of──> [Gemini 3 Flash prompt rewrites]
[Gemini 3 Flash prompt rewrites] ──independent of──> [Claude Opus 4.6 prompt rewrites]
(each model family's prompts can be rewritten in parallel)
```

### Dependency Notes

- **Agent factory before `02-hypothesize.ts` split:** The factory reduces each agent file from ~50 lines to ~10 lines of config. With smaller agent files, the step file that calls them becomes easier to read after splitting. Doing the factory first makes the split cleaner.
- **Template injection cleanup before prompt rewrites:** The `.replace('{{PLACEHOLDER}}', ...)` pattern should be resolved before rewriting content. If templates are reorganized mid-rewrite, the injection points change and diff review becomes confusing.
- **Eval baseline before any prompt changes:** Run `npm run eval` before starting prompt rewrites to establish a baseline score. All prompt changes are validated by comparing against this baseline.
- **Dead code / type safety / comments are independent:** These are safe to do in any order or in parallel since they touch different files.

---

## MVP Definition

### Do First (Structural Refactoring)

Minimum structural cleanup that makes the codebase maintainable without changing behavior.

- [ ] Delete deprecated `02a-initial-hypothesis-extractor-*` files and remove from `index.ts` — unambiguous dead code with explicit DEPRECATED marker
- [ ] Fix 4 `any` type occurrences in `logging-utils.ts` and `request-context-helpers.ts` — small, safe, verified by `npx tsc --noEmit`
- [ ] Delete commented-out code in `03b-rules-improver-agent.ts`
- [ ] Create `createSolverAgent()` factory and migrate all 13 agent definitions — MEDIUM complexity, high impact on readability
- [ ] Split `02-hypothesize.ts` into sub-phase files — largest file in codebase, highest complexity
- [ ] Group `workflow-schemas.ts` by domain — 407 lines currently mixing unrelated schemas
- [ ] Frontend `DevTracePanel` event handler extraction — extract inline callbacks to named functions

### Do Second (Prompt Engineering)

After structural cleanup is complete and baseline eval score is established:

- [ ] Fix prompt template injection pattern (typed builder or direct concatenation)
- [ ] Rewrite GPT-5-mini extraction/testing prompts (5 agents): concise, explicit JSON output, static-first structure
- [ ] Rewrite Gemini 3 Flash reasoning prompts (6 agents): XML delimiters, remove chain-of-thought scaffolding, direct instructions
- [ ] Rewrite Claude Opus 4.6 agent prompts (6 Claude Code agents): XML input wrapping, role-first, tool use guidance
- [ ] Standardize confidence/conclusion terminology across all prompts

### Future Consideration

- [ ] Deeper `request-context-helpers.ts` domain split — lower priority since it's already helper-only code
- [ ] Automated prompt regression CI (eval runs on every PR) — valuable but requires infra

---

## Feature Prioritization Matrix

| Feature | Developer Value | Implementation Cost | Priority |
|---------|-----------------|---------------------|----------|
| Dead code removal (deprecated agent) | HIGH | LOW | P1 |
| Type safety fixes (4 occurrences) | MEDIUM | LOW | P1 |
| Commented-out code removal | LOW | LOW | P1 |
| Agent factory pattern | HIGH | MEDIUM | P1 |
| `02-hypothesize.ts` split | HIGH | MEDIUM | P1 |
| Schema domain grouping | MEDIUM | MEDIUM | P2 |
| `request-context-helpers.ts` grouping | MEDIUM | MEDIUM | P2 |
| Frontend DevTracePanel cleanup | MEDIUM | MEDIUM | P2 |
| Prompt template injection cleanup | MEDIUM | LOW | P1 (before prompts) |
| GPT-5-mini prompt rewrites | HIGH | MEDIUM | P1 |
| Gemini 3 Flash prompt rewrites | HIGH | HIGH | P1 |
| Claude Opus 4.6 prompt rewrites | HIGH | HIGH | P1 |
| Confidence vocabulary standardization | MEDIUM | LOW | P2 |

**Priority key:**
- P1: Core v1.5 deliverables
- P2: Important but non-blocking
- P3: Deferred

---

## Model-Specific Prompt Engineering Requirements

### GPT-5-mini (Extraction and Testing Agents)

Used for: structured problem extraction, rule testing, sentence testing, feedback extraction,
improvement extraction. These are JSON-in/JSON-out tasks — correctness over creativity.

Current issues in prompts:
- Long preamble ("You are solving a Linguistics Olympiad problem...") repeated across all agents
- Examples embedded mid-prompt interrupt the instruction flow
- Output format specified last (model sees it late in context)

Required changes (MEDIUM confidence — based on OpenAI structured outputs guide and GPT-5 prompting guide):
- Move output schema/format to the TOP of the prompt (static cacheable content)
- Reduce prose; use direct imperative: "Test this rule. Return JSON with fields: status, reasoning, recommendation."
- Remove redundant context that the model doesn't use for JSON extraction tasks
- Prefix output instructions with "Return ONLY a valid JSON object. No explanation."

### Gemini 3 Flash (Reasoning Agents)

Used for: perspective dispatch, initial hypothesizer, synthesizer, rules improver, question answerer,
improver dispatcher. These are reasoning tasks — quality of analysis matters.

Current issues in prompts:
- Heavy numbered step lists ("1. Segmentation and Alignment, 2. Identify Recurring Patterns...") designed for earlier models that need explicit scaffolding. Gemini 3 Flash has built-in structured reasoning; these steps constrain rather than help.
- Mixed markdown headings and bullet points throughout (inconsistent structure)
- No use of XML delimiters to separate instruction sections from data

Required changes (HIGH confidence — from Gemini 3 Developer Guide and philschmid.de best practices):
- Replace numbered process steps with `<task>`, `<context>`, `<constraints>`, `<output_format>` XML sections
- Move behavioral constraints to the top, anchoring reasoning early
- For large dataset inputs, move instructions to the END of the prompt, after all dataset content
- Remove chain-of-thought scaffolding (numbered analysis steps) — Gemini 3 reasons natively
- Keep temperature at default 1.0 (do not add temperature overrides)

### Claude Opus 4.6 (Claude Code Agents)

Used for: all 6 Claude Code agents (hypothesizer, verifier, improver, synthesizer, answerer,
extractor). These are file-reading/writing agents with tool use.

Current issues in prompts:
- Domain context section appears before role definition
- No XML wrapping for input data sections (uses markdown headings instead)
- Tool use instructions are implicit ("Read the problem.md file using the Read tool") not explicit
- "ALWAYS" and "MUST" directives are overused — Opus 4.6 docs warn this causes overtriggering

Required changes (HIGH confidence — from official Anthropic prompting best practices guide):
- First line: role definition ("You are a linguistic hypothesis generator...")
- Wrap input data descriptions in `<input>` tags
- Use `<task>` tags for the main task description
- Replace "ALWAYS use X tool" with "Use X tool when [condition]"
- Avoid prefilled responses (deprecated for Claude 4.6 models)
- Use XML `<example>` tags for few-shot examples instead of markdown blocks

---

## Sources

- [Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices) — Official guide for Claude Opus 4.6, Sonnet 4.6, Haiku 4.5. HIGH confidence.
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3) — Official Google guide. Key: default temperature 1.0, XML delimiters, direct instructions. HIGH confidence.
- [Gemini 3 Prompt Best Practices (philschmid.de)](https://www.philschmid.de/gemini-3-prompt-practices) — Practical analysis of Gemini 3 differences vs earlier models. MEDIUM confidence (community source, consistent with official guide).
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) — Official guide for JSON schema compliance in GPT-5-mini. HIGH confidence.
- [GPT-5 Prompting Guide (OpenAI Cookbook)](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide) — Key finding: mini variants need explicit task decomposition, more precise upfront planning. MEDIUM confidence (GPT-5-mini-specific guidance sparse).
- [Knip Dead Code Detection](https://knip.dev/) — Tool for finding unused exports, dead dependencies. HIGH confidence (established tool).
- [TypeScript Advanced Patterns 2025](https://dev.to/frontendtoolstech/typescript-advanced-patterns-writing-cleaner-safer-code-in-2025-4gbn) — `unknown` vs `any`, discriminated unions for type safety. MEDIUM confidence (community).
- Codebase audit: direct inspection of `src/mastra/workflow/` files — line counts, `any` occurrences, deprecated code markers, boilerplate patterns. HIGH confidence.

---
*Feature research for: LO-Solver v1.5 Refactor and Prompt Engineering*
*Researched: 2026-03-08*
