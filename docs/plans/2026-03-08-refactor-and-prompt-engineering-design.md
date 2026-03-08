# v1.5 Design: Refactor & Prompt Engineering

**Date:** 2026-03-08
**Milestone:** v1.5 — Refactor & Prompt Engineering
**Approach:** Refactor first, then prompt optimization (Approach A)

## Goal

Clean up the codebase (dead code, large files, boilerplate, type safety, frontend components) without changing functionality, then rewrite all agent prompts using the latest model-specific best practices from OpenAI, Google, and Anthropic.

## Part 1: Codebase Refactoring

### Dead Code Removal

- Remove `shared-memory.ts` — unused `generateWorkflowIds()` function
- Remove deprecated `initialHypothesisExtractorAgent` and `02a-initial-hypothesis-extractor-instructions.ts`
- Audit for other unused exports/imports

### Split `02-hypothesize.ts` (1,240 lines → 4 files)

Extract into sub-phase files, same logic:

- `02a-dispatch-phase.ts` — Perspective dispatch
- `02b-hypothesis-phase.ts` — Parallel hypothesis generation per perspective
- `02c-verify-phase.ts` — Verification batch with tester tools
- `02d-synthesis-phase.ts` — Best-round selection and synthesis

The main `02-hypothesize.ts` becomes a thin orchestrator composing the four sub-phases.

### Agent Factory Pattern

Create `createWorkflowAgent()` factory function:

- Encapsulates model selection (production vs testing), UnicodeNormalizer, provider setup
- Refactor all 13 agent definitions to use the factory
- Reduces boilerplate by ~50% per agent file

### Schema Reorganization (`workflow-schemas.ts`, 407 lines → domain files)

```
workflow-schemas/
├── core.ts               (Rule, VocabularyEntry base types)
├── problem.ts            (StructuredProblemData, related schemas)
├── hypothesis.ts         (Hypothesis, Feedback, Test loop)
├── verification.ts       (VerifierFeedback, RoundResult, Metadata)
├── multi-perspective.ts  (Perspective, PerspectiveResult, Synthesis)
└── index.ts              (re-export all for backward compat)
```

### Request Context Helpers Split (`request-context-helpers.ts`, 440 lines → domain files)

```
request-context-helpers/
├── core.ts          (getOpenRouterProvider, basic accessors)
├── vocabulary.ts    (vocabulary-specific helpers)
├── rules.ts         (rules-specific helpers)
├── draft-stores.ts  (draft store lifecycle)
├── cost-tracking.ts (cost accumulation + boundary events)
└── events.ts        (trace event emission helpers)
```

### Type Safety Improvements

- Replace `any` types with explicit interfaces in tool files and helpers
- Add proper typing to cost extraction, agent results, tool inputs

### Frontend Cleanup

- Split `DevTracePanel` (290 lines) into focused sub-components
- Extract event handlers from `use-workflow-data.ts` (239 lines) into domain-specific modules
- Clean up component naming and prop types

### What Does NOT Change

- No behavior changes — identical functionality
- No new features, no agent logic changes, no UI changes
- All existing tests/evals produce the same results

## Part 2: Prompt Engineering

### Research Phase

Fetch and study 7 prompting guides:

**OpenAI:**
- GPT-5.4 Prompt Guidance (production patterns, reasoning effort, tool-use, output contracts)
- GPT-5 Prompting Guide (minimal reasoning, agentic workflows, coding tips)
- GPT-4.1 Prompting Guide (literal instruction-following, agentic workflows, tool usage)
- General Prompt Engineering Guide (message roles, reasoning models, coding tips)

**Google:**
- Gemini 3 Prompting Guide (temperature=1.0, negative constraints at end, thinking levels)
- Gemini 3/3.1 Developer Guide (migration, thinking, temperature)
- General Prompt Design Strategies (foundational concepts, temperature, thinking)

**Anthropic:**
- Claude 4.6 Best Practices (output control, tool use, thinking, agentic systems)

Distill into per-model prompt style guide for our agents.

### Mastra Agents (13 agents)

**GPT-5-mini agents** (extractor, hypothesis extractor, rule tester, sentence tester):
- Apply GPT-5 minimal reasoning patterns
- Structured output contracts
- Literal instruction-following

**Gemini 3 Flash agents** (initial hypothesizer, dispatcher, improver, verifier, answerer, synthesizer):
- Temperature guidance
- Negative constraints placement
- Thinking level configuration

### Claude Code Agents (6 agents)

**Opus 4.6** (extractor, hypothesizer, improver, synthesizer, answerer):
- Extended thinking patterns
- Agentic system best practices

**Sonnet** (verifier):
- Cost-efficient patterns for high-volume calls

### What Does NOT Change

- Agent roles and responsibilities
- Tool definitions
- Workflow step logic
- Only system prompt text changes

## Phase Structure (Proposed)

1. Dead code cleanup + type safety
2. Split `02-hypothesize.ts` into sub-phases
3. Agent factory pattern + schema reorganization
4. Request context helpers split + frontend cleanup
5. Research: fetch prompting guides, create per-model style guide
6. Rewrite Mastra agent prompts
7. Rewrite Claude Code agent prompts
