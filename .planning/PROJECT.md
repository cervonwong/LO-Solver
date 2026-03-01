# LO-Solver — Prove the Agentic Advantage

## What This Is

LO-Solver is an AI-powered system for solving Linguistics Olympiad Rosetta Stone problems. It uses a Next.js frontend with a Mastra AI agent orchestration backend. The core solving logic lives in a multi-step workflow that coordinates specialized LLM agents to extract structure, hypothesize linguistic rules, verify/improve those rules, and answer translation questions.

This milestone focuses on making the agentic workflow genuinely outperform zero-shot LLMs, building the evaluation infrastructure to prove it, and improving the UI's observability of agent reasoning.

## Core Value

The ONE thing that must work: **the agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.** Currently, the workflow achieves ~75% accuracy — which is the same as zero-shot. The goal is near-100% accuracy on most problems.

## Current Milestone: v1.0 Prove the Agentic Advantage

**Goal:** Make the agentic workflow measurably outperform zero-shot LLMs, with automated evaluation to prove it and UI improvements to observe agent reasoning.

**Target features:**
- Evaluation expansion: zero-shot comparison, intermediate scoring, results UI
- Multi-perspective hypothesis generation with dispatcher + fan-out
- Verification loop improvements with failure diagnostics
- UI: rules panel, hierarchical trace display, formatted results

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
- ✓ Legacy cleanup: single workflow in `src/mastra/workflow/` — Phase 1
- ✓ Automated eval scoring against ground truth — Phase 2
- ✓ Eval uses Mastra `@mastra/evals` framework — Phase 2
- ✓ Eval results persisted for comparison — Phase 2

### Active

- [ ] Zero-shot vs agentic comparison mode
- [ ] Intermediate output scoring (rule quality, extraction quality)
- [ ] Eval results viewable in UI
- [ ] Dispatcher generates multiple linguistic perspectives
- [ ] Independent hypothesizer per perspective
- [ ] Each hypothesizer validates via testing tools
- [ ] Best-scoring ruleset selected by test pass rate
- [ ] Verification loop uses winning ruleset
- [ ] Failure reasons logged and surfaced
- [ ] Rules displayed alongside vocabulary (tabbed panel)
- [ ] Rules panel updates live
- [ ] Hierarchical agent/tool trace display
- [ ] Custom-fitted tool input/output display
- [ ] Formatted final results presentation
- [ ] Hierarchical event streaming system

### Out of Scope

- Framework migration (no leaving Mastra/Next.js) — stack is settled
- Building a general-purpose linguistics tool — Rosetta Stone problems only
- Multi-user support / authentication — single-user dev tool
- Deployment / hosting — development-only for now
- Real-time collaboration features

## Problem Statement

- The workflow doesn't add value over zero-shot LLMs — the multi-agent pipeline produces the same accuracy
- Rule generation (Step 2) is weak — rules are often too vague, hallucinated, or miss key patterns
- Verification loop (Step 3) is ineffective — doesn't reliably catch and fix bad rules
- UI trace display doesn't show agent-tool hierarchy (tools and agents shown flat, not nested)
- Rules aren't visible in the UI during processing (only vocabulary is shown)

## Target Outcome

1. Automated evaluation harness that scores workflow output against ground truth
2. Workflow improvements informed by eval data — better rules, better verification
3. UI that shows rules alongside vocabulary, hierarchical agent/tool traces, and better result display

## Constraints

- TypeScript + Next.js + Mastra stack is fixed (no framework changes)
- All LLM calls go through OpenRouter
- No test framework configured — eval harness is the testing strategy
- Mastra documentation should be consulted via MCP or web for any new features
- Budget-conscious: use cheap models for testing, premium for production

## Technical Context

- **Stack**: TypeScript 5.9.3, Next.js 16.1.6, Mastra 1.8.0, Zod 4.3.6
- **Models**: GPT-5-mini (extraction), Gemini 3 Flash (reasoning), GPT-OSS-120B (testing)
- **Storage**: LibSQL for Mastra state, markdown logs for execution traces
- **Frontend**: React 19, shadcn/ui, resizable panels, AI SDK streaming
- **Workflow**: `src/mastra/workflow/`
- **Evaluation**: `src/evals/` — CLI runner, translation scorer, JSON storage, 4 Linguini problems
- **Existing ground truth**: Linguini dataset problems with known answers

## What Already Exists

- Multi-step agentic workflow: extract → hypothesize → verify/improve → answer
- Vocabulary CRUD tools with live UI updates
- Real-time trace event streaming from backend to frontend
- Step progress bar showing pipeline stages
- Example problem browser with hand-curated and Linguini dataset problems
- Model mode toggle (production vs. testing)
- Resizable panel layout with input, results, trace, and vocabulary views
- Markdown execution logging
- Evaluation foundation: CLI runner (`npm run eval`), translation scorer, JSON result persistence, 4 ground-truth problems
- Legacy workflow code cleaned up — single workflow in `src/mastra/workflow/`

## Key Decisions

| Decision | Rationale | Outcome |
| --- | --- | --- |
| Iterate on the workflow (not start fresh) | Core architecture is sound; issues are in prompt quality, rule generation, and verification logic | Decided |
| Eval harness before workflow changes | Can't improve what you can't measure; need automated scoring to guide iterations | Decided |
| Consult Mastra docs for new features | Use MCP or web docs to learn about evals, workflow features before implementing | Decided |
| Priority order: eval → workflow → UI → question bank | Measurement first, then improvement, then polish | Decided |

## Guidance for Future Phases

When working on any phase that touches Mastra code (agents, workflows, tools, evals), always:
1. Browse the Mastra documentation using the MCP tools (`mcp__mastra__mastraDocs`, `mcp__mastra__searchMastraDocs`, etc.) or via web search
2. Check the installed package API using `mcp__mastra__getMastraExports` and `mcp__mastra__getMastraExportDetails`
3. Look for relevant examples in the Mastra docs before implementing new patterns

---

_Last updated: 2026-03-01_
