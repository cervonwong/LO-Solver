# LO-Solver

## What This Is

LO-Solver is an AI-powered system for solving Linguistics Olympiad Rosetta Stone problems. It uses a Next.js frontend with a Mastra AI agent orchestration backend. The core solving logic lives in a multi-step workflow that coordinates specialized LLM agents to extract structure from raw problem text, hypothesize linguistic rules, iteratively verify and improve those rules, and apply validated rules to answer translation questions. All LLM calls route through OpenRouter for multi-model access.

## Core Value

The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration. Currently ~75% accuracy (same as zero-shot) — the goal is near-100% accuracy on most problems.

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
- ✓ Single clean workflow codebase (legacy workflows removed) — Phase 1
- ✓ Automated evaluation harness with ground-truth scoring and persistence — Phase 2

### Active

- [ ] Zero-shot comparison mode showing agentic vs zero-shot delta
- [ ] Intermediate output scoring (rule quality, extraction quality)
- [ ] Eval results viewable in UI with per-problem breakdowns
- [ ] Multi-perspective hypothesis generation (dispatcher + parallel hypothesizers)
- [ ] Competing hypothesis sets scored and best selected
- [ ] Stronger verification loop with failure diagnostics
- [ ] Rules displayed in UI alongside vocabulary (tabbed panel)
- [ ] Hierarchical agent/tool event display in trace panel
- [ ] Custom-fitted tool input/output display per tool type
- [ ] Better final result presentation
- [ ] Expanded question bank (agent-assisted extraction from PDFs/websites)

### Out of Scope

- Framework migration (no leaving Mastra/Next.js) — stack is settled
- Building a general-purpose linguistics tool — this solves Rosetta Stone problems specifically
- Multi-user support / authentication — single-user dev tool
- Deployment / hosting — development-only for now
- Real-time collaboration features — single-user

## Context

- **Current accuracy**: ~75% on evaluated problems, equivalent to zero-shot baseline
- **Workflow pipeline**: 4 steps with verification loop of up to 4 iterations. Uses two-agent chains (reasoning agent → extraction agent) in Steps 2 and 3b
- **Agent architecture**: 10 specialized agents coordinated through RequestContext for shared state. Tools wrap sub-agents for per-rule and per-sentence testing
- **Evaluation**: 4 Linguini ground-truth problems configured. CLI runner with `--mode`, `--concurrency`, `--problem` flags. JSON result persistence in `evals/results/`
- **Frontend**: Blueprint cyanotype design system. Resizable panels with trace, vocabulary, progress, and results views. Events streamed via step writer
- **Known weakness**: Rule generation (Step 2) produces vague/hallucinated rules. Verification loop (Step 3) doesn't reliably catch failures. These are the primary targets for improvement

## Constraints

- **Stack**: TypeScript 5.9.3, Next.js 16.1.6, Mastra 1.8.0, Zod 4.3.6, React 19 — fixed, no framework changes
- **LLM access**: All calls through OpenRouter. GPT-5-mini for extraction/testing, Gemini 3 Flash for reasoning, GPT-OSS-120B for cheap testing mode
- **Storage**: LibSQL for Mastra state, markdown logs for execution traces — both ephemeral
- **Testing**: No test framework. Evaluation harness is the testing strategy
- **Budget**: Use cheap models for development/testing, premium for production evaluation
- **Mastra docs**: Consult via MCP tools or web search for any new Mastra features before implementing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Iterate on workflow (not start fresh) | Core architecture is sound; issues are in prompt quality, rule generation, and verification logic | ✓ Good |
| Eval harness before workflow changes | Can't improve what you can't measure; need automated scoring to guide iterations | ✓ Good |
| Full cleanup of old workflows first | Dead code adds confusion; only one workflow should exist | ✓ Good |
| Priority order: cleanup → eval → workflow → UI → question bank | Foundation first, then measurement, then improvement, then polish | — Pending |
| Consult Mastra docs for new features | Use MCP or web docs to learn about evals, workflow features before implementing | — Pending |

## Guidance for Future Phases

When working on any phase that touches Mastra code (agents, workflows, tools, evals), always:
1. Browse the Mastra documentation using the MCP tools (`mcp__mastra__mastraDocs`, `mcp__mastra__searchMastraDocs`, etc.) or via web search
2. Check the installed package API using `mcp__mastra__getMastraExports` and `mcp__mastra__getMastraExportDetails`
3. Look for relevant examples in the Mastra docs before implementing new patterns

---
*Last updated: 2026-03-01 after re-initialization*
