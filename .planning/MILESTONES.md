# Milestones

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

