# Phase 21: Pipeline Agents - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

The extraction and hypothesis agents exist as standalone Claude Code subagent `.md` files (in `claude-code/.claude/agents/`) with complete, self-contained system prompts that produce correctly structured workspace output. This phase writes the extractor and hypothesizer agent definitions. Orchestration, verification, improvement, synthesis, and answering agents are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Perspective Strategy
- Perspectives are **dynamic per problem** — the orchestrator (Phase 22) analyzes the extracted problem and chooses perspectives tailored to it
- Each perspective is communicated as a **name + focus description** (e.g., "Morphological Analysis: Focus on affixes, suffixes, prefixes, and how word forms change")
- Each hypothesizer runs in **complete isolation** — it sees only the extracted problem and its assigned perspective, never other perspectives' outputs
- Default perspective count per round: **3** (configurable by the orchestrator)

### Extraction Depth
- **Mechanical parse only** — the extractor structurally parses the raw problem into the markdown format without preliminary linguistic analysis
- Extract the foreign language name **if explicitly stated** in the problem text; do not guess
- **Auto-detect** which column is the foreign language vs. English based on content
- **Flexible multi-language support** — handle problems with 2+ languages and variable column counts; do not assume a fixed format

### Hypothesizer Behavior
- **No self-testing** — the hypothesizer writes rules and vocabulary without attempting to verify them against the dataset. Testing is the verifier's job (separate agent) to avoid confirmation bias
- Include **confidence levels** (HIGH/MEDIUM/LOW) on each rule
- **Cite specific dataset sentence numbers** as evidence for each rule (e.g., "Evidence: #1, #3, #5")
- **Cite dataset sentences in vocabulary entries** via the Notes field (e.g., "Appears in #1, #4")

### Prompt Design
- **Moderate detail with inline format templates** — each prompt includes the expected output format directly, plus behavioral guidelines. Self-contained without being overwhelming
- Include **anti-patterns** ("Do NOT" sections) listing common mistakes to prevent known failure modes from the Mastra pipeline
- **Completely standalone** — no references to PIPELINE.md. Each agent contains everything it needs
- Include **brief domain context** (2-3 sentences) explaining what a Rosetta Stone problem is and what the agent is trying to discover

### Error Handling
- Errors appear **both inline** in the agent's output file AND get logged to the separate `errors.md` file in the workspace run folder

### Claude's Discretion
- Exact wording and structure of anti-patterns sections
- How to organize the "Do NOT" guidance (separate section vs. inline with relevant instructions)
- Specific format template details beyond what workspace-format.md defines
- How much domain context to include (2-3 sentences is the guideline)

</decisions>

<specifics>
## Specific Ideas

- The blind translation principle from the Mastra pipeline (verifier tests without seeing expected answers) should be preserved in the overall architecture — reinforced by keeping self-testing out of the hypothesizer
- Vocabulary and rules should be kept separate: rules describe patterns and mechanisms, vocabulary maps individual morphemes. The Mastra pipeline found that conflating them degrades rule quality
- The perspective isolation principle mirrors the Mastra pipeline's draft-store isolation — each hypothesizer explores independently so they don't converge on one approach

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `claude-code/.claude/agents/extractor.md`: Stub agent file — needs system prompt written
- `claude-code/.claude/agents/hypothesizer.md`: Stub agent file — needs system prompt written
- `claude-code/references/workspace-format.md`: Complete format templates for all workspace files (problem.md, perspective-N.md, verification-N.md, etc.)
- `claude-code/CLAUDE.md`: Project-level context with conventions, workspace structure, and domain context
- `claude-code/PIPELINE.md`: Full pipeline reference from Mastra implementation (for internal reference, not referenced by agents)

### Established Patterns
- Agent files use YAML frontmatter (`name`, `description`, `tools`, `model: opus`)
- All workspace files are markdown (no JSON)
- Workspace structure: `workspace/{datetime}/problem.md`, `workspace/{datetime}/hypotheses/round-N/perspective-N.md`
- Agents have tools: Read, Write, Bash, Glob, Grep

### Integration Points
- Extractor reads raw problem text (provided by orchestrator in Phase 22) and writes `problem.md`
- Hypothesizer reads `problem.md` and writes `hypotheses/round-N/perspective-N.md`
- Orchestrator (Phase 22) will dispatch hypothesizers sequentially with perspective name + description

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-pipeline-agents*
*Context gathered: 2026-03-07*
