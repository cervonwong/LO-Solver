# LO-Solver — Next Milestone

## What This Is

LO-Solver is an AI-powered system for solving Linguistics Olympiad Rosetta Stone problems. It uses a Next.js frontend with a Mastra AI agent orchestration backend. The core solving logic lives in a multi-step evolutionary workflow (Workflow 03) that coordinates specialized LLM agents to extract structure, hypothesize linguistic rules, verify/improve those rules, and answer translation questions.

This milestone focuses on making the agentic workflow genuinely outperform zero-shot LLMs, building the evaluation infrastructure to prove it, cleaning up legacy code, and improving the UI's observability of agent reasoning.

## Core Value

The ONE thing that must work: **the agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.** Currently, Workflow 03 achieves ~75% accuracy — which is the same as zero-shot. The goal is near-100% accuracy on most problems.

## Problem Statement

- Workflow 03 doesn't add value over zero-shot LLMs — the multi-agent pipeline produces the same accuracy
- Rule generation (Step 2) is weak — rules are often too vague, hallucinated, or miss key patterns
- Verification loop (Step 3) is ineffective — doesn't reliably catch and fix bad rules
- No systematic evaluation — accuracy is judged manually, making it impossible to measure improvements
- Legacy Workflows 01 and 02 are dead code cluttering the codebase
- UI trace display doesn't show agent-tool hierarchy (tools and agents shown flat, not nested)
- Rules aren't visible in the UI during processing (only vocabulary is shown)

## Target Outcome

1. Automated evaluation harness that scores workflow output against ground truth
2. Workflow 03 improvements informed by eval data — better rules, better verification
3. Clean codebase with only Workflow 03 (01 and 02 fully removed)
4. UI that shows rules alongside vocabulary, hierarchical agent/tool traces, and better result display
5. Expanded question bank for testing (future phase — agent-assisted extraction from PDFs/websites)

## Constraints

- TypeScript + Next.js + Mastra stack is fixed (no framework changes)
- All LLM calls go through OpenRouter
- No test framework currently configured — eval harness is the testing strategy
- Mastra documentation should be consulted via MCP or web for any new features
- Budget-conscious: use cheap models for testing, premium for production

## Technical Context

- **Stack**: TypeScript 5.9.3, Next.js 16.1.6, Mastra 1.8.0, Zod 4.3.6
- **Models**: GPT-5-mini (extraction), Gemini 3 Flash (reasoning), GPT-OSS-120B (testing)
- **Storage**: LibSQL for Mastra state, markdown logs for execution traces
- **Frontend**: React 19, shadcn/ui, resizable panels, AI SDK streaming
- **Active workflow**: `src/mastra/03-per-rule-per-sentence-delegation/`
- **Legacy workflows**: `src/mastra/01-one-agent/`, `src/mastra/02-extract-then-hypo-test-loop/`
- **Existing ground truth**: Some problems have known answers (Linguini dataset, hand-curated examples)

## Requirements

### Validated

- ✓ Multi-step agentic workflow with extract → hypothesize → verify/improve → answer pipeline — existing
- ✓ Vocabulary CRUD tools with live UI updates — existing
- ✓ Real-time trace event streaming from backend to frontend — existing
- ✓ Step progress bar showing pipeline stages — existing
- ✓ Example problem browser with hand-curated and Linguini dataset problems — existing
- ✓ Model mode toggle (production vs. testing) — existing
- ✓ Resizable panel layout with input, results, trace, and vocabulary views — existing
- ✓ Markdown execution logging — existing

### Active

- [ ] Automated evaluation harness scoring workflow output against ground truth
- [ ] Full cleanup of Workflow 01 and 02 (files, imports, index.ts references)
- [ ] Improved rule generation in Workflow 03
- [ ] Effective verification loop that catches and fixes bad rules
- [ ] Rules displayed in UI alongside vocabulary (tabbed panel)
- [ ] Hierarchical agent/tool event display in trace panel
- [ ] Custom-fitted tool input/output display for each tool type
- [ ] Better final result presentation
- [ ] Expanded question bank (agent-assisted extraction from PDFs/websites)

### Out of Scope

- Framework migration (no leaving Mastra/Next.js) — stack is settled
- Building a general-purpose linguistics tool — this solves Rosetta Stone problems specifically
- Multi-user support / authentication — single-user dev tool
- Deployment / hosting — development-only for now

## Key Decisions

| Decision | Rationale | Outcome |
| --- | --- | --- |
| Iterate on Workflow 03 (not start fresh) | Core architecture is sound; issues are in prompt quality, rule generation, and verification logic | Decided |
| Eval harness before workflow changes | Can't improve what you can't measure; need automated scoring to guide iterations | Decided |
| Full cleanup of old workflows | Dead code adds confusion; only one workflow should exist | Decided |
| Consult Mastra docs for new features | Use MCP or web docs to learn about evals, workflow features before implementing | Decided |
| Priority order: cleanup → eval → workflow → UI → question bank | Foundation first, then measurement, then improvement, then polish | Decided |

## Guidance for Future Phases

When working on any phase that touches Mastra code (agents, workflows, tools, evals), always:
1. Browse the Mastra documentation using the MCP tools (`mcp__mastra__mastraDocs`, `mcp__mastra__searchMastraDocs`, etc.) or via web search
2. Check the installed package API using `mcp__mastra__getMastraExports` and `mcp__mastra__getMastraExportDetails`
3. Look for relevant examples in the Mastra docs before implementing new patterns

---

_Last updated: 2026-02-28 after initialization_
