# LO-Solver — Prove the Agentic Advantage

## What This Is

LO-Solver is an AI-powered system for solving Linguistics Olympiad Rosetta Stone problems. It uses a Next.js frontend with a Mastra AI agent orchestration backend. A multi-step workflow coordinates specialized LLM agents to extract structure, generate multi-perspective linguistic hypotheses, verify/improve rules with failure diagnostics, and answer translation questions. An automated evaluation harness proves the agentic workflow outperforms zero-shot LLMs, with a rich observability UI showing hierarchical agent traces, live-updating rules, and formatted results.

## Core Value

The ONE thing that must work: **the agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.**

## Requirements

### Validated

- ✓ Multi-step agentic workflow: extract → hypothesize → verify/improve → answer — existing
- ✓ Vocabulary CRUD tools with live UI updates — existing
- ✓ Real-time trace event streaming from backend to frontend — existing
- ✓ Step progress bar showing pipeline stages — existing
- ✓ Example problem browser with hand-curated and Linguini dataset problems — existing
- ✓ Model mode toggle (production vs. testing) — existing
- ✓ Resizable panel layout with input, results, trace, and vocabulary views — existing
- ✓ Markdown execution logging — existing
- ✓ Legacy cleanup: single workflow in `src/mastra/workflow/` — v1.0
- ✓ Automated eval scoring against ground truth — v1.0
- ✓ Eval uses Mastra `@mastra/evals` framework — v1.0
- ✓ Eval results persisted for comparison — v1.0
- ✓ Zero-shot vs agentic comparison mode — v1.0
- ✓ Intermediate output scoring (rule quality, extraction quality) — v1.0
- ✓ Eval results viewable in UI — v1.0
- ✓ Dispatcher generates multiple linguistic perspectives — v1.0
- ✓ Independent hypothesizer per perspective — v1.0
- ✓ Each hypothesizer validates via testing tools — v1.0
- ✓ Best-scoring ruleset selected by test pass rate — v1.0
- ✓ Verification loop uses winning ruleset — v1.0
- ✓ Failure reasons logged and surfaced — v1.0
- ✓ Rules displayed alongside vocabulary (stacked panel layout) — v1.0
- ✓ Rules panel updates live — v1.0
- ✓ Hierarchical agent/tool trace display — v1.0
- ✓ Custom-fitted tool input/output display — v1.0
- ✓ Formatted final results presentation — v1.0
- ✓ Hierarchical event streaming system — v1.0

### Active

(None — fresh for next milestone)

### Out of Scope

- Framework migration (no leaving Mastra/Next.js) — stack is settled
- Building a general-purpose linguistics tool — Rosetta Stone problems only
- Multi-user support / authentication — single-user dev tool
- Deployment / hosting — development-only for now
- Real-time collaboration features

## Problem Statement

(Resolved in v1.0) The workflow now uses multi-perspective hypothesis generation and verified rules. The evaluation harness demonstrates workflow accuracy improvements over zero-shot baselines.

## Context

Shipped v1.0 with 13,581 LOC TypeScript across 241 files.
Tech stack: TypeScript 5.9.3, Next.js 16.1.6, Mastra 1.8.0, Zod 4.3.6.
Models: GPT-5-mini (extraction), Gemini 3 Flash (reasoning), GPT-OSS-120B (testing).
Storage: LibSQL for Mastra state, markdown logs for execution traces, JSON for eval results.
Frontend: React 19, shadcn/ui, resizable panels, AI SDK streaming.
Evaluation: 4 Linguini ground-truth problems, CLI runner with --comparison and --problem flags.

## Key Decisions

| Decision | Rationale | Outcome |
| --- | --- | --- |
| Iterate on the workflow (not start fresh) | Core architecture is sound; issues are in prompt quality, rule generation, and verification logic | ✓ Good — v1.0 shipped on existing architecture |
| Eval harness before workflow changes | Can't improve what you can't measure; need automated scoring to guide iterations | ✓ Good — eval-driven development caught regressions |
| Consult Mastra docs for new features | Use MCP or web docs to learn about evals, workflow features before implementing | ✓ Good — avoided deprecated APIs |
| Priority order: eval → workflow → UI → question bank | Measurement first, then improvement, then polish | ✓ Good — each layer built on the previous |
| Two-agent chain pattern for extraction | Natural language reasoning → JSON extraction avoids hallucinated structure | ✓ Good — reliable structured output |
| Rules CRUD tools mirroring vocabulary pattern | Consistent 5-tool pattern for both data types | ✓ Good — reduced implementation complexity |
| DraftStore for per-perspective isolation | Each parallel hypothesizer needs independent state | ✓ Good — no race conditions |
| streamWithRetry replacing generateWithRetry | Real-time text streaming needed for hierarchical events | ✓ Good — enabled live agent output display |
| id/parentId for hierarchical events | Simple nesting model, no deep tree structure needed | ✓ Good — clean agent/tool hierarchy |
| Three-panel right layout (trace/vocab/rules) | All observability data visible simultaneously | ✓ Good — no tab switching during solve |

## Constraints

- TypeScript + Next.js + Mastra stack is fixed (no framework changes)
- All LLM calls go through OpenRouter
- No test framework configured — eval harness is the testing strategy
- Mastra documentation should be consulted via MCP or web for any new features
- Budget-conscious: use cheap models for testing, premium for production

## Guidance for Future Phases

When working on any phase that touches Mastra code (agents, workflows, tools, evals), always:
1. Browse the Mastra documentation using the MCP tools (`mcp__mastra__mastraDocs`, `mcp__mastra__searchMastraDocs`, etc.) or via web search
2. Check the installed package API using `mcp__mastra__getMastraExports` and `mcp__mastra__getMastraExportDetails`
3. Look for relevant examples in the Mastra docs before implementing new patterns

---

*Last updated: 2026-03-02 after v1.0 milestone*
