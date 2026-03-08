# Phase 22: Orchestrator and Entry Point - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the `/solve` skill orchestrator that dispatches subagents in pipeline order with file-based state. The user triggers `/solve`, the orchestrator handles input, dispatches extraction → multi-perspective hypothesis → synthesis → verification in a multi-round loop, and selects the best result. Phase 23 handles the verify-improve loop and final answer step.

</domain>

<decisions>
## Implementation Decisions

### Hypothesis selection
- Always run the synthesizer to merge all perspectives — don't pick a single winner
- Even if one perspective scores 100%, other perspectives may have complementary rules
- The synthesizer merges the best parts from all perspectives into a coherent solution

### Multi-round loop
- Support up to 3 rounds of hypothesis generation (matching Mastra pipeline)
- After synthesis + convergence check, if rules still fail, dispatch new targeted perspectives and iterate
- Full re-verification after synthesis: run the verifier agent on the synthesized solution, stop only if ALL_RULES_PASS
- If not converged after 3 rounds, use the best-so-far result

### Subagent validation
- File existence only — just check the output file was written
- Trust agents to produce valid output; the verifier catches bad content downstream
- No deep structure parsing of intermediate files

### User feedback
- Stage announcements: print a line when each major stage starts (e.g., "Extracting problem...", "Generating 3 perspectives (round 1)...", "Synthesizing...", "Verifying convergence...")
- Show per-perspective pass rates after verification rounds (e.g., "Round 1: Morphological 85%, Syntactic 72%, Phonological 91%")
- Do NOT show individual file writes — stage names only
- Mention non-critical failures briefly (e.g., "Perspective 3 failed (timeout) — continuing with 2 perspectives")
- All failures also logged to errors.md for later review

### Claude's Discretion
- Input handling approach (file path vs inline paste vs both)
- How to dispatch perspectives in parallel vs sequential
- Workspace directory naming convention
- Retry policy for non-critical failures (CLAUDE.md already sets default: retry once then skip)
- How to implement the improver-dispatcher for Round 2+ gap analysis

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following PIPELINE.md's design.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `claude-code/.claude/agents/` — 6 agent definitions already exist (extractor, hypothesizer, verifier, improver, synthesizer, answerer), each self-contained with Read/Write/Bash/Glob/Grep tools and Opus 4.6 model
- `claude-code/.claude/skills/solve/SKILL.md` — Skill shell exists with argument-hint for file path, currently placeholder
- `claude-code/references/workspace-format.md` — Complete templates for all workspace file types (problem.md, perspective-N.md, verification-N.md, solution.md, answers.md, errors.md)
- `claude-code/PIPELINE.md` — Full pipeline reference with data types, agent roles, and flow

### Established Patterns
- File-based handoff: agents read predecessor files from workspace and write their own output
- Markdown format for all workspace files (no JSON)
- Per-run workspace directories at `workspace/{datetime}/`
- Error logging to `errors.md` in the workspace run folder
- Agent definitions use YAML frontmatter with `model: opus`

### Integration Points
- `/solve` skill is the entry point — SKILL.md needs orchestrator logic written into it
- Agents are dispatched as Claude Code subagents via the Task tool
- Workspace directory is the shared state — all agents read/write files there
- CLAUDE.md conventions: 3 perspectives default, retry once then skip, error logging

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-orchestrator-and-entry-point*
*Context gathered: 2026-03-08*
