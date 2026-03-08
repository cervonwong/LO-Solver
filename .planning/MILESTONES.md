# Milestones

## v1.4 Claude Code Native Solver (Shipped: 2026-03-08)

**Phases:** 8 | **Plans:** 9 | **LOC:** 3,494 markdown (claude-code/)
**Timeline:** 2 days (2026-03-07 → 2026-03-08)
**Git range:** v1.3..ce9c7a1 (63 files changed, +12,524 / -964)

**Delivered:** Claude Code native solver running alongside the existing Mastra implementation — 6 subagent definitions, /solve skill with full pipeline orchestration, iterative verify-improve loop, and terminal output display, all using file-based state in a workspace directory.

**Key accomplishments:**
1. Comprehensive pipeline reference document (PIPELINE.md, 621 lines) documenting all 12 Mastra agents, 14 tools, and 6 data types
2. 6 Claude Code native agent definitions (extractor, hypothesizer, verifier, improver, synthesizer, answerer) with self-contained prompts
3. /solve skill with full pipeline orchestration — multi-round hypothesis loop, synthesis, and convergence checking
4. Iterative verify-improve loop with per-call verifier pattern and blind translation comparison
5. Terminal output display and markdown solution file generation
6. Closed all integration gaps via Phases 25-26 (Step 4c verifier orchestration, documentation consistency)

---

## v1.3 User API Key (Shipped: 2026-03-06)

**Phases:** 2 | **Plans:** 4 | **LOC:** 15,656 TypeScript
**Timeline:** 1 day (2026-03-06)
**Git range:** 5fe820c..f39f090 (48 files changed, +2,985 / -84)

**Delivered:** User-provided OpenRouter API key support with localStorage persistence, per-request provider factory across all agents, and auto-open dialog flow enabling keyless deployment.

**Key accomplishments:**
1. useApiKey hook with localStorage persistence and cross-tab sync via useSyncExternalStore
2. ApiKeyDialog with enter/edit/clear flows and two-row CreditsBadge integration with key status indicator
3. Per-request OpenRouter provider factory with RequestContext plumbing across all 13 agents and 3 workflow steps
4. Backend key routing with env-key fallback, no-key guard (401), and hasServerKey endpoint
5. Auto-open dialog flow with deferred solve guard (pendingSolveRef) and chatId-based transport refresh

---

## v1.2 Cleanup & Quality (Shipped: 2026-03-04)

**Phases:** 3 | **Plans:** 7 | **Quick Tasks:** 1 | **LOC:** 15,069 TypeScript
**Timeline:** 1 day (2026-03-03 → 2026-03-04)
**Git range:** 5f1cca5..a783785 (34 files changed, +3,626 / -2,794)

**Delivered:** Reliable abort propagation, cleaner codebase through file splitting, and blueprint-themed toast notifications for workflow lifecycle and API cost feedback.

**Key accomplishments:**
1. Abort signal propagation through all workflow steps and tester tools with cancel endpoint fallback
2. Shadcn abort confirmation dialog with amber aborting state distinct from error
3. Workflow.ts split from 1,500 lines to 24-line composition file with individual step files
4. Trace-event-card 898-line monolith split into 5 focused components
5. Page.tsx hooks extracted to 4 dedicated domain hooks (useSolverWorkflow, useWorkflowProgress, useWorkflowData, useExamples)
6. Blueprint-themed Sonner toast notifications for workflow lifecycle events and API cost warnings

**1 quick task:** Fix abort dialog background zoom glitch.

---

## v1.1 UI Polish (Shipped: 2026-03-03)

**Phases:** 6 | **Plans:** 9 | **Quick Tasks:** 24 | **LOC:** 14,281 TypeScript
**Timeline:** 2 days (2026-03-02 → 2026-03-03)
**Git range:** v1.0..HEAD (119 files changed, +11,684 / -630)

**Delivered:** Polished observability UI with fixed trace hierarchy, compact reasoning, structured data formatting, animated duck mascots, workflow abort/reset controls, and animated 3-column layout.

**Key accomplishments:**
1. Fixed trace hierarchy — tool-call events carry correct parentId, orphans detected with console.warn fallback
2. Compact reasoning display — tables and codeblocks render compactly with horizontal scroll
3. Structured data formatting — tool I/O and agent output as labeled key-value lists with raw JSON toggle
4. Agent duck mascots — oversized color-tinted duck icons with animated thinking/happy states
5. Workflow control buttons — abort/new problem, config disable during execution, amber aborted state
6. 3-column animated layout — third column animates in for vocabulary/rules, responsive collapse below 1024px

**24 quick tasks** including hover-hatch pattern, panel header styling, skeleton animations, nav redesign, OpenRouter credits display, combined problem input, sticky headers, and scrolling fixes.

---

## v1.0 Prove the Agentic Advantage (Shipped: 2026-03-02)

**Phases:** 7 | **Plans:** 16 | **Commits:** 196 | **LOC:** 13,581 TypeScript
**Timeline:** 3 days (2026-02-28 → 2026-03-02)
**Git range:** 3543c83..9f52af9

**Delivered:** Full agentic Linguistics Olympiad solver with multi-perspective hypothesis generation, automated evaluation harness proving workflow outperforms zero-shot LLMs, and rich observability UI with hierarchical trace display, rules panel, and formatted results.

**Key accomplishments:**
1. Automated evaluation harness with ground-truth scoring, zero-shot comparison, and intermediate quality metrics
2. Multi-perspective hypothesis generation — dispatcher fans out to parallel hypothesizer agents, selects best-scoring ruleset
3. Verification loop with round-by-round metadata, per-rule PASS/FAIL logging, and failure diagnostics
4. Hierarchical event system with id/parentId nesting and streamWithRetry for real-time agent streaming
5. Rules panel with live updates, rolling activity chips, and three-panel resizable layout
6. Nested trace display with custom tool renderers, auto-expand/collapse, summary bar, and cross-linked rule tags

---

