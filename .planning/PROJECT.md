# LO-Solver — Prove the Agentic Advantage

## What This Is

LO-Solver is an AI-powered system for solving Linguistics Olympiad Rosetta Stone problems. It has two solver implementations: a **Mastra workflow** (Next.js frontend, multi-provider LLMs, real-time UI) and a **Claude Code native solver** (subagent-based, terminal-only, file-based state). Both use the same multi-step pipeline: extract structure, generate multi-perspective linguistic hypotheses, verify/improve rules with failure diagnostics, and answer translation questions. The Mastra workflow supports two model providers — **OpenRouter** (GPT-5-mini, Gemini 3 Flash) and **Claude Code** (Haiku, Sonnet, Opus via MCP tool bridge) — with a 4-way provider toggle and cross-provider eval benchmarking. An automated evaluation harness proves the agentic workflow outperforms zero-shot LLMs, with a polished observability UI featuring hierarchical agent traces with duck mascots, animated 3-column layout, structured data formatting, workflow abort/reset controls, and live-updating vocabulary and rules panels.

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

- ✓ Fix trace hierarchy — correct parentId on tool-call events, orphan detection — v1.1
- ✓ Compact reasoning display — smaller tables, scrollable codeblocks in streamdown — v1.1
- ✓ Structured data formatting — tool I/O and agent output as labeled lists with raw JSON toggle — v1.1
- ✓ Agent duck mascots — oversized color-tinted duck icons with animated states — v1.1
- ✓ Workflow control buttons — abort, new problem, config disable during execution — v1.1
- ✓ 3-column animated layout — third column for vocab/rules, responsive collapse below 1024px — v1.1
- ✓ Aborted workflow state — distinct amber state separate from error/failed — v1.1

- ✓ Abort button propagates cancellation to in-flight agent calls — v1.2
- ✓ Large source files audited and split into focused modules — v1.2
- ✓ Workflow lifecycle toast notifications (start, complete, abort, cost warnings) — v1.2

- ✓ User-provided API key entry via nav bar dialog with localStorage persistence — v1.3
- ✓ Per-request OpenRouter provider factory supporting user-provided keys across all agents — v1.3
- ✓ Backend env-key fallback with no-key guard and hasServerKey endpoint — v1.3
- ✓ Auto-open dialog flow with deferred solve guard and chatId-based transport refresh — v1.3

- ✓ Comprehensive pipeline reference document (PIPELINE.md) for Claude Code agents — v1.4
- ✓ 6 Claude Code native agent definitions with self-contained prompts — v1.4
- ✓ /solve skill with full pipeline orchestration and multi-round hypothesis loop — v1.4
- ✓ Per-call verifier pattern with blind translation comparison — v1.4
- ✓ Terminal output display and markdown solution file generation — v1.4
- ✓ File-based workspace state (markdown files, not JSON) — v1.4

- ✓ Dead code removal via Knip audit with 26 dead exports removed — v1.5
- ✓ All `any` type annotations replaced with explicit types — v1.5
- ✓ `createWorkflowAgent()` factory for all 12 Mastra agents — v1.5
- ✓ Dynamic model resolution preserved through factory — v1.5
- ✓ Hypothesize step decomposed into 4 sub-phase files + coordinator — v1.5
- ✓ GPT-5-mini prompts rewritten per OpenAI best practices — v1.5
- ✓ Gemini 3 Flash prompts rewritten per Google best practices — v1.5
- ✓ Claude Opus 4.6 prompts rewritten per Anthropic best practices — v1.5
- ✓ Confidence vocabulary standardized across all 19 agent prompts — v1.5
- ✓ Frontend trace component props cleaned up with named interfaces — v1.5

- ✓ Claude Code AI SDK provider integrated as alternative model provider with auth gate — v1.6
- ✓ 4-way provider toggle (OR Test/Prod, CC Test/Prod) replacing binary model mode — v1.6
- ✓ Agent factory updated with tier-based model resolution for both providers — v1.6
- ✓ MCP tool bridge wrapping all 14 Mastra tools for Claude Code compatibility — v1.6
- ✓ Frontend auth status indicator and "Subscription" cost tracking for Claude Code — v1.6
- ✓ Eval harness `--provider` flag with cross-provider comparison and filter UI — v1.6

### Active

(No active milestone — planning next)

### Out of Scope

- Framework migration (no leaving Mastra/Next.js) — stack is settled
- Building a general-purpose linguistics tool — Rosetta Stone problems only
- Multi-user support / authentication — single-user dev tool
- Deployment infrastructure / hosting setup — user key feature enables deployment but infra is separate
- Real-time collaboration features
- API key validation via test call — errors surface naturally during solve
- Auto-prompt dialog on first visit — button-only by design
- Server-side key storage — localStorage sufficient, no accounts needed
- Schema barrel split — 39 import edges, circular dependency risk
- Full context helpers decomposition — low ROI, already helper-only code
- Direct Anthropic API key support (`@ai-sdk/anthropic`) — different auth model; Claude Code uses subscription
- OAuth-based `claude login` for server auth — token refresh race condition (#27933); use `setup-token`
- Claude Code model fine-tuning per agent — defer until baseline validated with more problems

## Problem Statement

(Resolved in v1.0) The workflow uses multi-perspective hypothesis generation and verified rules. The evaluation harness demonstrates workflow accuracy improvements over zero-shot baselines. (Resolved in v1.1) The observability UI is polished with correct trace hierarchy, structured data display, workflow controls, and animated layout. (Resolved in v1.2) Abort propagation stops in-flight LLM calls, large files are split into focused modules, and toast notifications provide workflow lifecycle feedback. (Resolved in v1.3) Users can provide their own OpenRouter API key, enabling deployment without a server-side key. (Resolved in v1.4) Claude Code native solver implemented with 6 subagents, /solve skill, and file-based workspace — running alongside the Mastra implementation in `claude-code/`. (Resolved in v1.5) Codebase refactored with agent factory, decomposed hypothesize step, and all 19 agent prompts rewritten using model-specific vendor best practices. (Resolved in v1.6) Claude Code integrated as alternative model provider via MCP tool bridge, with 4-way provider toggle, auth gate, cost tracking, and cross-provider eval benchmarking.

## Context

Shipped v1.6 with 15,904 LOC TypeScript + 3,494 LOC markdown (Claude Code solver).
Tech stack: TypeScript 5.9.3, Next.js 16.1.6, Mastra 1.8.0, Zod 4.3.6, ai-sdk-provider-claude-code 0.3.1.
Models (OpenRouter): GPT-5-mini (extraction), Gemini 3 Flash (reasoning), GPT-OSS-120B (testing).
Models (Claude Code Testing): Haiku (extraction), Sonnet (reasoning).
Models (Claude Code Production): Sonnet (extraction), Opus (reasoning).
Storage: LibSQL for Mastra state, markdown logs for execution traces, JSON for eval results, markdown workspace files for Claude Code solver.
Frontend: React 19, shadcn/ui, resizable panels (3-column animated layout), AI SDK streaming.
Evaluation: 4 Linguini ground-truth problems, CLI runner with --comparison, --problem, and --provider flags.
UI: Blueprint/cyanotype design system, duck mascots per agent role, workflow abort/reset controls, Sonner toast notifications, user API key dialog, 4-way provider toggle, CC auth badge, provider filter in eval viewer.
Code structure: Agent factory pattern (`createWorkflowAgent()`), hypothesize step decomposed into 4 sub-phase files, workflow steps in individual files, trace components with named prop interfaces, page hooks in dedicated files. Knip configured for dead code detection.
Claude Code solver: 6 agent definitions in `claude-code/.claude/agents/`, /solve skill, workspace-based state, PIPELINE.md reference doc.
Provider architecture: `ai-sdk-provider-claude-code` wraps Claude Agent SDK `query()` as Vercel AI SDK provider. MCP tool bridge (`createMcpToolServer`) wraps all 14 Mastra tools as in-process MCP tools for Claude Code agents. Per-execution provider cached on RequestContext.
Deployment: App can run without server-side OPENROUTER_API_KEY; users provide their own key or use Claude Code subscription.

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
| Register pattern for workflow context | Child page pushes state to layout-level context without prop drilling | ✓ Good — clean separation of concerns |
| CSS scoping via wrapper class | .reasoning-compact scopes streamdown overrides to trace panel | ✓ Good — no side effects on other streamdown usage |
| LabeledList with depth limit | Recursive key-value rendering capped at depth 2 | ✓ Good — readable without overwhelming nesting |
| mask-image for duck tint | Color tint only on opaque pixels, preserving transparent PNG background | ✓ Good — clean visual effect |
| Conditional panel rendering (2/3 columns) | Render different panel counts vs hide/resize a panel to 0 | ✓ Good — simpler than fighting resizable-panels library |
| Imperative setLayout() for animation | CSS flex-grow transition with programmatic layout change | ✓ Good — smooth animated column appearance |
| Cancel endpoint fallback for abort | Browser req.signal can be unreliable; explicit POST /api/solve/cancel | ✓ Good — reliable abort regardless of browser behavior |
| shadcn AlertDialog for abort confirmation | Replaced browser confirm() for themed, non-blocking UX | ✓ Good — consistent blueprint styling |
| Abort → Refactor → Toast build order | Avoids merge conflicts on shared files (workflow.ts, page.tsx) | ✓ Good — clean sequential dependencies |
| Per-step cost accumulation | Avoids modifying workflow-schemas.ts; simpler implementation | ✓ Good — cost tracking works without schema changes |
| Step files split without index.ts re-export | Steps are internal to workflow composition, not public API | ✓ Good — no unnecessary re-exports |
| API key via workflow state (not workflow requestContext) | Mastra steps don't receive workflow-level requestContext | ✓ Good — clean per-step provider creation |
| Per-step provider creation from state.apiKey | RequestContext is step-local, not transferable | ✓ Good — consistent key propagation |
| No key validation via test API call | Errors surface naturally during solve | ✓ Good — simpler UX, no false negatives |
| pendingSolveRef for deferred auto-solve | Avoids complex callback chains from dialog to page | ✓ Good — clean solve-after-key-entry flow |
| chatId derived from apiKey | Forces useChat transport recreation on key change | ✓ Good — prevents stale credentials |
| Framework-agnostic pipeline doc | PIPELINE.md uses no Mastra-specific concepts | ✓ Good — Claude Code agents reference it directly |
| Markdown workspace files (not JSON) | Agents read/write markdown naturally; simpler than structured JSON | ✓ Good — 7 file types, all markdown |
| Sequential agent dispatch (not parallel) | Parallel Task tool calls are bugged (issues #22508, #29181) | ✓ Good — deterministic execution order |
| Always synthesize (never pick single winner) | Merging perspectives produces richer rulesets | ✓ Good — synthesizer combines best of each |
| Per-call verifier pattern | One rule or one sentence per verifier call; orchestrator aggregates | ✓ Good — consistent across Steps 4c, 4f, 5c |
| Verifier uses Sonnet (not Opus) | High call volume per solve; cost control | ✓ Good — adequate accuracy at lower cost |
| File existence as validation | Spot-check output file exists rather than parsing return status | ✓ Good — simple, reliable completion check |
| Knip for dead code detection | Static analysis catches unused exports reliably | ✓ Good — found 26 dead exports across 18 files |
| Agent factory over inheritance | Flat config object + function > class hierarchy for 3 agent variants | ✓ Good — eliminated boilerplate, preserved flexibility |
| Local type aliases for Mastra internals | `ToolsInput`, `ZodType<any>` not publicly exported | ✓ Good — avoids coupling to internal Mastra types |
| Sub-phase files as import-only leaves | No circular dependencies between extracted files | ✓ Good — clean dependency graph |
| `any` for bail/setState in StepParams | Mastra framework types not publicly stable | ✓ Good — practical compatibility |
| XML sections for all prompt styles | GPT-5-mini, Gemini, Claude all use XML delimiters | ✓ Good — consistent structure across models |
| 6-level confidence scale across all agents | Standardized vocabulary (well-supported → unsupported) | ✓ Good — consistent terminology |
| Interface (not type) for prop definitions | Matches existing DevTracePanelProps convention | ✓ Good — consistent codebase style |
| `ai-sdk-provider-claude-code` for CC integration | Wraps Claude Agent SDK as Vercel AI SDK provider; reuses existing agent factory | ✓ Good — minimal code change |
| MCP tool bridge (not prompt-only tools) | Full tool fidelity via in-process MCP server | ✓ Good — all 14 tools work through Claude Code |
| 4-way provider toggle (not 3-way) | Separate testing/production tiers for both providers | ✓ Good — consistent tiering |
| Tier-based model resolution (haiku/sonnet/opus) | Extraction agents use cheaper models; reasoning agents use capable models | ✓ Good — cost control per tier |
| `disallowedTools` for security sandbox | Blocks Bash, Read, Write, Edit in Claude Code agents | ✓ Good — prevents filesystem access |
| Auth gate via `generateText` probe | Lightweight pre-check (maxOutputTokens 10) before workflow start | ✓ Good — fast fail for unauth'd users |
| Structured output fallback (stream→generate) | Claude Code streaming + structuredOutput returns empty; delegate to generate | ✓ Good — reliable structured output |
| Per-execution MCP provider on RequestContext | Avoid transport reuse errors; cache after first creation | ✓ Good — clean lifecycle management |
| Shorthand model IDs for Claude Code | `sonnet`/`opus`/`haiku` instead of full `claude-sonnet-4-6` | ✓ Good — cleaner config |
| `setup-token` instead of `claude login` | OAuth race condition (#27933); token auth is reliable | ✓ Good — avoids auth failures |

## Constraints

- TypeScript + Next.js + Mastra stack is fixed (no framework changes)
- LLM calls go through OpenRouter or Claude Code (via `ai-sdk-provider-claude-code`)
- No test framework configured — eval harness is the testing strategy
- Mastra documentation should be consulted via MCP or web for any new features
- Budget-conscious: use cheap models for testing, premium for production (applies to both providers)

## Guidance for Future Phases

When working on any phase that touches Mastra code (agents, workflows, tools, evals), always:
1. Browse the Mastra documentation using the MCP tools (`mcp__mastra__mastraDocs`, `mcp__mastra__searchMastraDocs`, etc.) or via web search
2. Check the installed package API using `mcp__mastra__getMastraExports` and `mcp__mastra__getMastraExportDetails`
3. Look for relevant examples in the Mastra docs before implementing new patterns

---

*Last updated: 2026-03-14 after v1.6 milestone*
