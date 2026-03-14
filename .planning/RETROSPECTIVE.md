# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Prove the Agentic Advantage

**Shipped:** 2026-03-02
**Phases:** 7 | **Plans:** 16 | **Commits:** 196

### What Was Built
- Automated evaluation harness (CLI + UI) with zero-shot comparison and intermediate scoring
- Multi-perspective hypothesis generation with dispatcher, parallel hypothesizers, and best-of-N selection
- Verification loop with round-by-round metadata and per-rule failure diagnostics
- Hierarchical event streaming system with id/parentId nesting and streamWithRetry
- Rules panel with live updates, activity chips, and three-panel resizable layout
- Nested trace display with custom tool renderers, bulk grouping, auto-scroll, and cross-linked results

### What Worked
- Eval-first approach: building the scoring harness before workflow changes gave measurable feedback at every step
- Two-agent chain pattern (reasoning → extraction) produced reliable structured output throughout
- Rules CRUD tools mirroring the vocabulary pattern reduced design decisions and implementation time
- DraftStore isolation for parallel hypothesizers eliminated race conditions cleanly
- GSD framework applied mid-project (after phases 1-2) structured the remaining 5 phases well
- Quick tasks interleaved between phases kept UI polish progressing without blocking major work

### What Was Inefficient
- Phase 4's workflow rewrite broke the EVAL-03 intermediate scorer — cross-phase regression caught by audit but could have been caught earlier with integration testing
- Phases 1-2 completed before GSD adoption lack formal SUMMARY.md/VERIFICATION.md artifacts
- The stale audit (run after phase 4) reported 8 unsatisfied requirements that were all resolved by phases 5-7 — auditing earlier in the milestone would have been less useful, but auditing just before completion would have been more accurate

### Patterns Established
- Two-agent chains (reasoning agent → extraction agent) for all structured output needs
- 5-tool CRUD pattern for both vocabulary and rules state management
- Hierarchical event pattern: generateEventId → agent-start → set parent-agent-id → streamWithRetry → agent-end → clear parent-agent-id
- Rolling activity chips (max 3 visible, 8s auto-expiry) for real-time state change indicators
- streamWithRetry with onTextChunk callback for real-time agent output forwarding

### Key Lessons
1. Build the evaluation harness first — it pays for itself by catching regressions and guiding improvements
2. Mirror existing patterns (vocabulary tools → rules tools, generateWithRetry → streamWithRetry) to reduce design surface area
3. DraftStore/RequestContext isolation per parallel branch prevents subtle state corruption
4. Cross-phase schema changes need explicit scorer/consumer updates — defensive returns (all zeros) mask real breakage
5. Three days from project init to shipped milestone is achievable with disciplined phase execution

### Cost Observations
- Model mix: primarily opus for planning/execution, sonnet for quick tasks, haiku for summaries
- 196 commits across 3 days of intensive development
- Notable: parallel phase execution not used (sequential was sufficient given tight dependencies)

---

## Milestone: v1.1 — UI Polish

**Shipped:** 2026-03-03
**Phases:** 6 | **Plans:** 9 | **Quick Tasks:** 24

### What Was Built
- Fixed trace hierarchy with correct parentId injection and orphan detection
- Compact reasoning display with scoped CSS overrides for tables and codeblocks
- Structured data formatting — LabeledList component for tool I/O and agent structured output
- Agent duck mascots with color-tinted overlays, role detection, and animated states
- Workflow control buttons (abort/new problem) with config disable and amber aborted state
- 3-column animated layout with responsive collapse below 1024px
- 24 quick tasks: hover-hatch pattern, panel header styling, skeleton animations, nav redesign, OpenRouter credits, combined problem input, sticky headers

### What Worked
- Phase execution was extremely fast — most plans completed in 2 minutes due to clear, specific plans with exact file paths and code patterns
- Quick tasks (24 in total) handled UI polish incrementally without blocking phase work
- Register pattern for WorkflowControlContext cleanly bridged page-level state to layout-level nav
- CSS scoping (.reasoning-compact wrapper class) isolated streamdown overrides without side effects
- mask-image technique for duck tint preserved PNG transparency while applying role colors
- Conditional panel rendering (2 vs 3 panels) was simpler than fighting the resizable-panels library

### What Was Inefficient
- Stale milestone audit: ran before phases 10-11 were executed, reported 6 "orphaned" requirements that were actually just not yet implemented — audit timing should be after all phases complete
- DUCK-01/DUCK-02 requirements not checked off in REQUIREMENTS.md after Phase 11 completion — clerical miss caught during milestone completion
- Phase 11 plan listed as "TBD" in roadmap despite being executed — roadmap wasn't updated after plan creation
- Some roadmap table rows had formatting issues (missing milestone column values for phases 10, 11, 13)

### Patterns Established
- Register pattern: child useRegisterWorkflowControl pushes state to parent context without prop drilling
- Server/client layout split: layout.tsx stays server component, LayoutShell wraps nav and children with context providers
- LabeledList pattern: reusable depth-limited key-value renderer for any Record<string, unknown>
- Spread-conditional event fields: `...(value ? { field: value } : {})` for optional wire data
- Aborted state detection: `hasStarted && !isRunning && !isComplete && !isFailed`
- panel-heading CSS class for differentiated header surfaces vs content surfaces
- hover-hatch pattern for interactive element hover states

### Key Lessons
1. Phase plans with exact file paths and line-level specificity enable 2-minute executions
2. Quick tasks are the right vehicle for UI polish — keep phases focused on structural changes
3. Audit timing matters: run after all phases complete, not mid-milestone
4. Keep REQUIREMENTS.md checkboxes and roadmap plan statuses updated during phase execution, not just at milestone end
5. Conditional rendering is often simpler than dynamic resizing for layout state changes

### Cost Observations
- Model mix: opus for phase execution, sonnet for quick tasks, haiku for summaries
- Sessions: ~3-4 across 2 days
- Notable: 2-minute average plan execution time — plans were highly specific

---

## Milestone: v1.2 — Cleanup & Quality

**Shipped:** 2026-03-04
**Phases:** 3 | **Plans:** 7 | **Quick Tasks:** 1

### What Was Built
- Abort signal propagation through all workflow steps and tester tools with cancel endpoint fallback
- Shadcn abort confirmation dialog with amber aborting state distinct from error
- Workflow.ts split from 1,500 lines to 24-line composition file with individual step files under steps/
- Trace-event-card 898-line monolith split into 5 focused components under trace/
- Page.tsx hooks extracted to 4 dedicated domain hooks
- Blueprint-themed Sonner toast notifications for workflow lifecycle events and API cost warnings

### What Worked
- Sequential dependency chain (abort → refactor → toasts) prevented merge conflicts on shared files
- File refactoring plans were very safe — purely structural changes with no behavior modifications
- Cost tracking piggybacked on existing RequestContext/event patterns without new schemas
- Phase 14-02 verification caught that browser confirm() should be replaced with shadcn Dialog — user feedback during verification improved UX
- Plans continued to be highly specific with exact file paths, maintaining fast execution

### What Was Inefficient
- Phase 14-02 took 38min (longest plan) due to user-requested changes during verification (confirm → AlertDialog pivot)
- ROADMAP.md progress table had formatting drift (missing milestone column values) — carried over from v1.1

### Patterns Established
- Abort signal threading: pass abortSignal through RequestContext, check at iteration boundaries
- Cancel endpoint pattern: POST /api/solve/cancel as browser signal fallback
- Per-step cost accumulation via RequestContext helpers (no schema changes needed)
- Conditional spread for optional abort signal: `...(signal ? { abortSignal: signal } : {})`
- Step file organization: each step in its own file, workflow.ts as pure composition

### Key Lessons
1. Build order matters for refactoring — do feature work first, then split files, then add new features on clean structure
2. File splitting is low-risk and fast when plans specify exact extraction boundaries
3. RequestContext is a reliable extensibility mechanism — cost tracking added without any schema changes
4. Verification-time user feedback (Phase 14-02) can redirect implementation significantly — budget extra time for user-facing phases
5. Smallest milestone yet (3 phases, 1 day) — focused scope with no scope creep

### Cost Observations
- Model mix: opus for phase execution, sonnet for quick tasks, haiku for summaries
- Sessions: ~2 across 1 day
- Notable: 69min total execution time across 7 plans — fastest milestone yet

---

## Milestone: v1.3 — User API Key

**Shipped:** 2026-03-06
**Phases:** 2 | **Plans:** 4 | **Commits:** 26

### What Was Built
- useApiKey hook with localStorage persistence and cross-tab sync via useSyncExternalStore
- ApiKeyDialog with enter/edit/clear flows and two-row CreditsBadge integration
- Per-request OpenRouter provider factory with RequestContext plumbing across all 13 agents
- Backend key routing with env-key fallback, no-key guard (401), and hasServerKey endpoint
- Auto-open dialog flow with deferred solve guard and chatId-based transport refresh

### What Worked
- Copying the useSyncExternalStore pattern from use-model-mode.ts made the hook trivial to implement
- Provider factory pattern cleanly abstracted the singleton vs per-request distinction
- State-based key propagation (apiKey in workflow state) worked cleanly despite Mastra's step-local RequestContext
- Plan specificity continued to enable fast execution (2min for 17-01, 2min for 17-02, 5min for 18-01)
- Verification checkpoint in 18-02 caught 3 bugs (stale transport, missing sub-context propagation, no-key UX) before milestone completion

### What Was Inefficient
- 18-02 took ~45min (vs 2-5min for other plans) due to 3 bugs found during verification that required iterative fixes
- No milestone audit was run — skipped directly to completion since all requirements were checked off

### Patterns Established
- Provider factory: createOpenRouterProvider(apiKey) wraps base with identical routing and usage tracking
- Agent model indirection: all agents use getOpenRouterProvider(requestContext) instead of direct openrouter()
- Solve guard with pendingSolveRef: defer solve until key is saved, avoid callback chains
- chatId refresh pattern: derive useChat chatId from apiKey to force transport recreation on key change
- Cross-component coordination via WorkflowControlContext for key state

### Key Lessons
1. Copy existing hook patterns (useSyncExternalStore + StorageEvent) for new localStorage state — eliminates design decisions
2. State-based propagation through Zod schemas is the correct Mastra pattern when workflow-level requestContext isn't available to steps
3. Verification checkpoints catch real bugs — 3 issues found in 18-02 that would have shipped broken
4. Small milestones (2 phases) with focused scope ship in a single day with minimal overhead

### Cost Observations
- Model mix: opus for phase execution, haiku for summaries
- Sessions: 2 across 1 day
- Notable: 55min total execution time across 4 plans; smallest milestone yet

---

## Milestone: v1.4 — Claude Code Native Solver

**Shipped:** 2026-03-08
**Phases:** 8 | **Plans:** 9 | **Commits:** 62

### What Was Built
- Comprehensive pipeline reference document (PIPELINE.md, 621 lines) documenting the full Mastra solver for Claude Code agents
- 6 Claude Code native agent definitions (extractor, hypothesizer, verifier, improver, synthesizer, answerer) with self-contained prompts
- /solve skill with full pipeline orchestration — multi-round hypothesis loop, synthesis, convergence checking
- Iterative verify-improve loop with per-call verifier pattern and blind translation comparison
- Terminal output display and markdown solution file generation
- Gap closure phases (25-26) fixing Step 4c verifier orchestration and documentation consistency

### What Worked
- Pipeline reference document (Phase 19) was invaluable — agents could be written by reading PIPELINE.md alone, with no need to reference Mastra source code
- Writing agent prompts as standalone markdown files was extremely fast — 2-3 minutes per plan, no build system or compilation needed
- Per-call verifier pattern (one rule or one sentence per agent call) emerged naturally and was consistently applied across Steps 4c, 4f, and 5c
- Audit-driven gap closure: the v1.4 audit found INT-01 (Step 4c monolithic verifier) and INT-02 (CLAUDE.md model exception) which were cleanly fixed by Phases 25-26
- The 21-minute total execution time across 9 plans is the fastest per-plan rate across all milestones

### What Was Inefficient
- Audit was initially run before gap closure phases — had to re-run after Phases 25-26 were completed
- Phase 24 "Plans: TBD" lingered in the roadmap until execution time, when it became a single 1-plan phase
- Sequential agent dispatch (due to parallel Task tool bug) limits hypothesis diversity — workaround is functional but not ideal
- SUMMARY.md files lacked `one_liner` frontmatter field, requiring manual accomplishment extraction during milestone completion

### Patterns Established
- Agent definition pattern: markdown system prompt with explicit Domain Context, Input, Task, Output Format, Do NOT, and Error Handling sections
- Workspace-based state: agents read/write markdown files in a workspace directory, orchestrator validates by file existence
- Per-call verifier pattern: one rule/sentence per verifier call, orchestrator aggregates and writes verification files
- Blind translation comparison in orchestrator: normalize, lowercase, strip punctuation before comparing
- Error handling via errors.md: agents write structured error logs to workspace/errors.md

### Key Lessons
1. A thorough reference document enables fast agent development — invest time in Phase 1 documentation
2. Markdown-only deliverables (no code compilation) enable sub-3-minute plan execution times
3. Audit → gap closure → re-audit is the correct sequence for catching integration issues
4. Per-call agent patterns are composable — the same verifier pattern works identically across 3 different orchestration steps
5. File-based state (markdown workspace files) is simpler than structured JSON for agent interop

### Cost Observations
- Model mix: opus for planning/execution, haiku for summaries (no sonnet needed — all content was markdown)
- Sessions: ~3 across 2 days
- Notable: 21min total execution time across 9 plans — 2.3min average, fastest milestone

---

## Milestone: v1.5 — Refactor & Prompt Engineering

**Shipped:** 2026-03-10
**Phases:** 6 | **Plans:** 11

### What Was Built
- Dead code removal via Knip audit: 26 dead exports removed across 18 files, deprecated agent files deleted
- Agent factory (`createWorkflowAgent()`) handling reasoning, extraction, and tester variants for all 12 Mastra agents
- Hypothesize step decomposed from 1,240 lines into 4 sub-phase files + thin coordinator
- GPT-5-mini prompts rewritten with static-first structure, XML sections, schema-first ordering
- Gemini 3 Flash prompts rewritten with XML delimiters, data-first ordering, structured decomposition approach
- Claude Code prompts rewritten with XML-tagged sections, role-first structure, 6-level confidence scale
- Standardized confidence vocabulary across all 19 agent prompts
- Frontend trace components cleaned up with named prop interfaces

### What Worked
- Factory pattern was a clean fit — flat config object + function eliminated repetitive Agent construction across 12 files
- Sub-phase extraction was surgical — each file became independently readable without any behavioral change
- Model-specific prompt research (vendor guides) gave concrete, actionable patterns per model family
- XML section tags worked universally across GPT-5-mini, Gemini, and Claude — converged on a single structural convention
- Phase 32 (frontend) was correctly identified as independent and could execute without blocking prompt work

### What Was Inefficient
- Eval baseline (PE-01) was skipped before prompt changes — no quantitative before/after comparison exists
- Per-rewrite eval verification (PE-06) deferred — prompt changes shipped without automated regression checking
- Production mode eval (PE-07) never executed — cost concern deferred it indefinitely
- Coordinator at 305 lines exceeded 200-line target (Prettier formatting expansion) — plan target was too aggressive
- Nyquist validation missing for all 6 phases — skipped per config setting

### Patterns Established
- Agent factory pattern: `createWorkflowAgent(config)` with model resolver, UnicodeNormalizer, requestContextSchema pre-built
- Sub-phase file pattern: thin coordinator imports focused async functions, each sub-phase is an import-only leaf
- XML section tags for all prompt styles: `<instructions>`, `<context>`, `<input>`, `<task>`, `<output>` boundaries
- 6-level confidence scale: well-supported, supported, partially-supported, weakly-supported, speculative, unsupported
- Named prop interfaces: every React component gets a dedicated `FooProps` interface (not inline types)

### Key Lessons
1. Refactoring milestones are safe and fast — zero behavioral changes means zero regressions to debug
2. Factory patterns work best with flat config objects, not class hierarchies or variant enums
3. Model-specific prompt guides provide concrete patterns — worth the research investment per model family
4. XML delimiters are the universal structural pattern across all major LLM providers
5. Eval verification should not be optional for prompt engineering — shipped without quantitative confidence
6. Plan targets (e.g., "200 lines") should account for Prettier expansion

### Cost Observations
- Model mix: opus for phase execution, haiku for summaries
- Sessions: ~4 across 3 days
- Notable: 11 plans across 6 phases — larger than v1.4 but still fast execution

---

## Milestone: v1.6 — Claude Code Provider

**Shipped:** 2026-03-14
**Phases:** 4 | **Plans:** 14 | **Commits:** 69

### What Was Built
- Claude Code AI SDK provider integration with auth gate, error handling, and structured output fallback
- MCP tool bridge wrapping all 14 Mastra tools as in-process MCP server for Claude Code agents
- 4-way provider toggle (OR Test/Prod, CC Test/Prod) with tier-based model resolution
- Frontend auth status indicator, "Subscription" cost label, and CC badge on agent trace events
- Eval harness `--provider` flag for cross-provider benchmarking with zero-shot Claude Code support
- Provider filter dropdown in eval results viewer for cross-provider comparison

### What Worked
- `ai-sdk-provider-claude-code` community provider wrapped cleanly into existing agent factory pattern — minimal disruption
- MCP in-process server approach gave full tool fidelity without modifying tool implementations
- Agent factory's hook-point design (from v1.5) made provider switching a config change, not a code rewrite
- Per-execution RequestContext provider caching solved transport reuse errors cleanly
- 4-way provider split (testing/production x OpenRouter/Claude Code) reused existing tier patterns
- Audit-first approach: ran audit before completion, found only non-critical tech debt

### What Was Inefficient
- Phase 33 had 7 plans (3 were mechanical renames that could have been combined) — over-decomposition
- Token pipeline (`extractTokensFromResult`) built but never wired — CC badge shows "0 tokens" alongside correct cost
- Rules CRUD tools registered on verifier MCP server unnecessarily — by design but adds unused surface
- `claude login` OAuth race condition (#27933) required workaround with `setup-token`

### Patterns Established
- MCP tool bridge: `createMcpToolServer(tools, descriptions)` factory wraps Mastra tools as in-process MCP endpoints
- Per-execution provider injection: `claude-code-provider` RequestContext key with singleton fallback
- `attachMcpProvider` helper: shared helper for conditional MCP server wiring (extracted to break circular deps)
- Provider mode helpers: `isClaudeCodeMode()` / `isOpenRouterMode()` for branching on provider type
- Structured output fallback: streamWithRetry detects claude-code + structuredOutput and delegates to generateWithRetry
- Auth gate via lightweight `generateText` probe (maxOutputTokens: 10) for fast pre-check

### Key Lessons
1. Community providers can integrate cleanly with existing patterns — the agent factory's hook-point design paid off
2. MCP in-process bridges preserve full tool fidelity without modifying tool implementations
3. Mechanical renames should be combined into fewer plans — 3 separate rename plans was over-decomposition
4. Token/cost pipelines should be wired end-to-end during implementation, not deferred as tech debt
5. Provider architecture benefits from testing/production tiers from the start — 3-way to 4-way expansion was smooth

### Cost Observations
- Model mix: opus for phase execution, haiku for summaries and plan checks
- Sessions: ~4 across 4 days
- Notable: 14 plans across 4 phases — most plans per milestone, but mechanical renames inflated count

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 196 | 7 | GSD adopted mid-milestone; eval-first development |
| v1.1 | ~60 | 6 | Quick tasks for polish; 2-min plan execution average |
| v1.2 | ~30 | 3 | Focused cleanup; sequential dependency chain; fastest milestone |
| v1.3 | 26 | 2 | User-facing feature; pattern copying; verification-driven bug fixes |
| v1.4 | 62 | 8 | Markdown-only deliverables; 2.3min/plan average; audit-driven gap closure |
| v1.5 | 68 | 6 | Pure refactoring; factory + decomposition + prompt engineering; no behavioral changes |
| v1.6 | 69 | 4 | Provider integration; MCP tool bridge; 4-way toggle; cross-provider eval |

### Cumulative Quality

| Milestone | Eval Problems | Requirements | LOC |
|-----------|--------------|--------------|-----|
| v1.0 | 4 Linguini | 22/22 satisfied | 13,581 TS |
| v1.1 | 4 Linguini | 19/19 satisfied | 14,281 TS |
| v1.2 | 4 Linguini | 15/15 satisfied | 15,069 TS |
| v1.3 | 4 Linguini | 9/9 satisfied | 15,656 TS |
| v1.4 | 4 Linguini | 27/27 satisfied | 15,656 TS + 3,494 MD |
| v1.5 | 4 Linguini | 17/20 satisfied (3 user-skipped) | 14,751 TS + 3,494 MD |
| v1.6 | 4 Linguini | 19/19 satisfied | 15,904 TS + 3,494 MD |

### Top Lessons (Verified Across Milestones)

1. Eval harness before workflow changes — measurement enables confident iteration
2. Mirror existing patterns to reduce implementation surface area (v1.0 tools, v1.2 RequestContext)
3. Specific plans with exact file paths enable fast execution (verified v1.1, v1.2)
4. Quick tasks handle polish without blocking structural phase work (verified v1.1, v1.2)
5. Build order matters — feature work before refactoring before new features on clean structure (verified v1.2)
6. Copy existing patterns for new features — reduces design surface and enables fast execution (verified v1.3)
7. Verification checkpoints catch real bugs before shipping (verified v1.2, v1.3)
8. Invest in reference documentation before implementation — it pays for itself across all subsequent phases (verified v1.4)
9. Audit-driven gap closure catches integration issues that static verification misses (verified v1.4)
10. Refactoring milestones are safe and fast — zero behavioral changes means zero regressions (verified v1.5)
11. XML delimiters are the universal structural pattern across all major LLM providers (verified v1.5)
12. Eval verification should not be optional for prompt engineering work (lesson learned v1.5)
13. Community providers can integrate cleanly when the codebase has hook-point architecture (verified v1.6)
14. MCP in-process bridges preserve full tool fidelity without modifying implementations (verified v1.6)
15. Mechanical renames should be combined into fewer plans to avoid over-decomposition (lesson learned v1.6)
