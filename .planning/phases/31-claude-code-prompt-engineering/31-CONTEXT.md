# Phase 31: Claude Code Prompt Engineering - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite all 6 Claude Code agent prompts (`claude-code/.claude/agents/*.md`) per Anthropic best practices for Claude Opus 4.6. XML-tagged sections, role-first structure, data-first ordering, conditional tool guidance, evidence-based confidence scale, and hedged assertion style. Pure prompt changes — zero code logic changes.

</domain>

<decisions>
## Implementation Decisions

### Confidence scale
- Adopt the 6-level evidence-based confidence scale from Phase 30 for 5 of 6 agents: well-supported / supported / plausible / tentative / speculative / unsupported
- Same overclaiming guard: if even one example is ambiguous, a rule cannot be "well-supported"; complexity and exceptions reduce confidence (cap at "plausible" at best)
- Verifier agent is exempt — keeps its PASS/FAIL/NEEDS_UPDATE status vocabulary (its output is a test result, not a confidence claim)
- Answerer uses the full 6-level scale for per-question confidence (not the old HIGH/MEDIUM/LOW)

### Assertion and language style
- Hedged assertions for 4 agents: hypothesizer, synthesizer, improver, answerer
- Hedged means qualifying claims with evidence references: "X appears to hold based on examples 1-3, though example 4 is ambiguous"
- Avoid unqualified assertions like "The answer is X" or "I found that X"
- Extractor is exempt — pure mechanical parsing, no linguistic claims to hedge
- Verifier is exempt — definitive testing with direct assertions ("The rule is contradicted by sentence #3")

### Rewrite depth
- Deep rewrite: treat prompts as substantially new text, not surface edits
- Restructure content, merge redundant sections, rewrite phrasing using Anthropic best practices
- The spirit of each prompt stays the same (same role, same task, same constraints) but the text is substantially rewritten
- Error handling sections preserved as-is (functional, tested, nearly identical across agents)
- YAML frontmatter descriptions also updated to match rewritten prompt style
- Constraint handling (current "Do NOT" sections): approach determined by Anthropic guide + Claude's judgment after reading the guide

### Vendor guide consultation
- Research phase fetches latest Anthropic Claude prompting guide via web search
- Use up-to-date vendor advice, not cached knowledge
- Adopt strategies selectively — learn principles from the guide, apply to each agent's specific role

### Plan structure
- Single plan covering research + all 6 agent rewrites (all use same vendor, Anthropic)
- No plan split by agent or agent group

### Verification
- No eval run needed — Claude Code solver has no automated eval harness
- No manual smoke test required

### Claude's Discretion
- Specific prompt content and wording
- Which Anthropic guide strategies to adopt vs skip per agent
- XML tag naming conventions (success criteria specify `<instructions>`, `<context>`, `<input>`, `<task>` but additional tags are at Claude's discretion)
- How to restructure "Do NOT" sections (conditional guidance, concise guardrails, or hybrid — guided by Anthropic best practices)
- Order of agents within the single plan
- How to integrate the confidence scale into each agent's prompt naturally

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- 6 agent markdown files in `claude-code/.claude/agents/`: extractor.md (120 lines), hypothesizer.md (170 lines), verifier.md (128 lines), improver.md (179 lines), synthesizer.md (138 lines), answerer.md (158 lines)
- `claude-code/PIPELINE.md`: full pipeline reference document — agents reference this for context
- `claude-code/CLAUDE.md`: project-level instructions for the Claude Code solver

### Established Patterns
- Agent prompts are self-contained markdown files with YAML frontmatter (name, description, tools, model)
- All agents use Opus 4.6 except verifier (Sonnet)
- File-based handoff: agents read predecessor files from workspace and write output files
- Prompts currently use markdown headings for structure (## Domain Context, ## Input, ## Task, etc.)
- Current confidence: HIGH/MEDIUM/LOW (3-level)
- Current assertion style: direct, unhedged

### Integration Points
- 6 agent files to modify (one per agent)
- No code logic changes — only prompt content changes
- YAML frontmatter descriptions also updated
- No other files need modification

### Agent inventory
| File | Model | Role | Hedging | Confidence Scale |
|---|---|---|---|---|
| `extractor.md` | Opus | Parser | Exempt | 6-level |
| `hypothesizer.md` | Opus | Hypothesis generator | Yes | 6-level |
| `verifier.md` | Sonnet | Tester | Exempt | PASS/FAIL/NEEDS_UPDATE |
| `improver.md` | Opus | Rule reviser | Yes | 6-level |
| `synthesizer.md` | Opus | Ruleset merger | Yes | 6-level |
| `answerer.md` | Opus | Translator | Yes | 6-level |

</code_context>

<specifics>
## Specific Ideas

- Confidence scale should actively discourage overclaiming — same asymmetric design as Phase 30 with more lower-confidence options to counteract LLM overclaiming
- "Well-supported" is a high bar: ALL examples must work, no ambiguity, and the rule must be simple
- Hedged assertion style: "X appears to hold based on examples 1-3, though example 4 is ambiguous" — not "I am confident that X is correct"
- Extractor exemption is because parsing is deterministic — there's nothing to hedge about
- Verifier exemption is because testing needs to be definitive — hedging weakens the signal the improver needs

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 31-claude-code-prompt-engineering*
*Context gathered: 2026-03-09*
