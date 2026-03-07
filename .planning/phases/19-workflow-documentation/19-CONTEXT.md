# Phase 19: Workflow Documentation - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a single comprehensive reference document (`claude-code/PIPELINE.md`) that describes the full Mastra solver pipeline in enough detail for Claude Code agents to reimplement the solver logic. The document is the sole deliverable — no code, no infrastructure, no agents.

</domain>

<decisions>
## Implementation Decisions

### Document structure
- Single self-contained markdown file: `claude-code/PIPELINE.md`
- Pipeline-sequential organization: overview → Step 1 → Step 2 → Step 3 → Step 4
- Focus on what the solver does conceptually — agents, prompts, tools, and how they relate
- No Mastra framework internals (no RequestContext, workflow state, step writers)
- Framework-agnostic language throughout ("shared state" not "RequestContext", "pipeline step" not "workflow step")

### Content per agent
- Detailed prompt summaries for reasoning agents (hypothesizer, verifier orchestrator, improver, answerer)
- Lighter treatment for extraction agents — "parses output of X into schema Y" with the schema included
- Inline TypeScript type definitions for each agent's input/output schemas
- Include the actual linguistic perspectives used by the multi-hypothesis dispatcher

### Tool documentation
- Document tool name, inputs, outputs, AND key behavioral details
- Vocabulary system fully documented: all 5 CRUD tools, how vocabulary is shared across agents, the prompt fragment pattern
- Committed vs draft tool variants explained (verifiers use committed rules, hypothesizer/improver test drafts before committing)
- Blind translation pattern documented (sentence tester translates without seeing expected answer)

### Verification loop
- Document both test granularities: per-rule testing and per-sentence testing, with what each catches
- How the verifier orchestrator decides which tests to run
- Improvement strategy: how the improver receives failure feedback (errant rules, errant sentences, issues list) and revises rules
- All termination conditions: ALL_RULES_PASS → skip to answer, max 4 iterations hard cap, improvement stall behavior

### Audience and tone
- Primary audience: Claude Code Opus 4.6 agents (later phases will read this to reimplement)
- Technical reference style: dense, structured, factual. Sections with headers, bullet points, schemas
- Minimal prose — every sentence carries information
- Include brief design rationale per key decision (why two-agent chains, why blind translation, etc.) to prevent agents from "optimizing away" important patterns

### Claude's Discretion
- Exact section headings and subsection breakdown within the pipeline-sequential structure
- How much of each system prompt to summarize vs which directives to include verbatim
- Whether to include a quick-reference summary table of all agents at the top

</decisions>

<specifics>
## Specific Ideas

- The document should be readable start-to-finish by an agent that has never seen the codebase — self-contained per the success criteria
- Design rationale should be brief (1-2 sentences per decision), not lengthy justification
- TypeScript schemas should be simplified/clean types (not raw Zod definitions), easy to parse

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/codebase/ARCHITECTURE.md`: Contains full data flow diagram and component interactions — can be used as source material for the pipeline document
- `src/mastra/workflow/README.md`: Existing workflow documentation
- Agent instruction files (`*-instructions.ts`): 10+ files with detailed system prompts that need to be summarized
- `workflow-schemas.ts`: Centralized Zod schemas that define all agent inputs/outputs

### Established Patterns
- Two-agent chains (reasoning → extraction) used in Steps 2 and 3b
- Vocabulary tools pattern with shared prompt fragment (`vocabulary-tools-prompt.ts`)
- Tools wrapping sub-agents (testRule/testSentence → dedicated tester agents)
- Dual tool variants (committed vs draft) for rules testing
- Multi-perspective hypothesis dispatch via dispatcher agent

### Integration Points
- `claude-code/` directory will be created (currently doesn't exist) — this document goes there
- Later phases (20-24) will read this document to build Claude Code agents
- The document must align with REQUIREMENTS.md items DOCS-01 through DOCS-04

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-workflow-documentation*
*Context gathered: 2026-03-07*
