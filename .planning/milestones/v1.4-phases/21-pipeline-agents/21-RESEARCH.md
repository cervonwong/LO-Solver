# Phase 21: Pipeline Agents - Research

**Researched:** 2026-03-07
**Domain:** Claude Code subagent prompt engineering for Linguistics Olympiad problem solving
**Confidence:** HIGH

## Summary

This phase writes the full system prompts for two Claude Code subagent definition files that already exist as stubs: `extractor.md` and `hypothesizer.md` in `claude-code/.claude/agents/`. The technical domain is entirely prompt engineering -- no libraries, no code, no infrastructure. The stubs already have correct YAML frontmatter (name, description, tools, model); the task is to replace the placeholder body with complete, self-contained system prompts that produce correctly formatted workspace output.

The core challenge is translating the proven Mastra pipeline's extraction and hypothesis patterns into self-contained markdown prompts that work within Claude Code's subagent model. Key differences from the Mastra pipeline: (1) output is markdown files, not JSON via tools; (2) the agent writes files directly using the Write tool rather than committing state through CRUD tools; (3) there is no two-agent chain -- each agent must produce structured output directly; (4) each agent's prompt must be entirely standalone with no external references.

**Primary recommendation:** Use the Mastra pipeline's proven instruction patterns (especially its anti-patterns, confidence guidelines, and analysis sequence) as the foundation, but adapt for file-based output and complete self-containment. The workspace-format.md templates define the exact output structure; embed these inline in each prompt.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Perspective Strategy:**
- Perspectives are dynamic per problem -- the orchestrator (Phase 22) analyzes the extracted problem and chooses perspectives tailored to it
- Each perspective is communicated as a name + focus description (e.g., "Morphological Analysis: Focus on affixes, suffixes, prefixes, and how word forms change")
- Each hypothesizer runs in complete isolation -- it sees only the extracted problem and its assigned perspective, never other perspectives' outputs
- Default perspective count per round: 3 (configurable by the orchestrator)

**Extraction Depth:**
- Mechanical parse only -- the extractor structurally parses the raw problem into the markdown format without preliminary linguistic analysis
- Extract the foreign language name if explicitly stated in the problem text; do not guess
- Auto-detect which column is the foreign language vs. English based on content
- Flexible multi-language support -- handle problems with 2+ languages and variable column counts; do not assume a fixed format

**Hypothesizer Behavior:**
- No self-testing -- the hypothesizer writes rules and vocabulary without attempting to verify them against the dataset. Testing is the verifier's job (separate agent) to avoid confirmation bias
- Include confidence levels (HIGH/MEDIUM/LOW) on each rule
- Cite specific dataset sentence numbers as evidence for each rule (e.g., "Evidence: #1, #3, #5")
- Cite dataset sentences in vocabulary entries via the Notes field (e.g., "Appears in #1, #4")

**Prompt Design:**
- Moderate detail with inline format templates -- each prompt includes the expected output format directly, plus behavioral guidelines. Self-contained without being overwhelming
- Include anti-patterns ("Do NOT" sections) listing common mistakes to prevent known failure modes from the Mastra pipeline
- Completely standalone -- no references to PIPELINE.md. Each agent contains everything it needs
- Include brief domain context (2-3 sentences) explaining what a Rosetta Stone problem is and what the agent is trying to discover

**Error Handling:**
- Errors appear both inline in the agent's output file AND get logged to the separate `errors.md` file in the workspace run folder

### Claude's Discretion

- Exact wording and structure of anti-patterns sections
- How to organize the "Do NOT" guidance (separate section vs. inline with relevant instructions)
- Specific format template details beyond what workspace-format.md defines
- How much domain context to include (2-3 sentences is the guideline)

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXTR-01 | Extractor agent parses raw problem into structured output (context, dataset, questions) | Workspace-format.md `problem.md` template defines exact structure. Mastra extractor instructions provide proven extraction rules. CONTEXT.md specifies mechanical parse only, auto-detect language columns, flexible multi-language support |
| EXTR-02 | Structured output written to workspace file | Output is `problem.md` (markdown, not JSON per CONTEXT.md evolution). Agent uses Write tool to produce the file. Path provided by orchestrator via input |
| HYPO-01 | Multiple hypothesizer instances dispatched with different linguistic perspectives | The hypothesizer agent definition is a single reusable template. Dispatch is Phase 22's responsibility; this phase creates the agent that accepts a perspective as input and produces output for that perspective. CONTEXT.md confirms sequential dispatch, not parallel |
| HYPO-02 | Each hypothesizer writes rules + vocabulary to its own draft file | Output is `hypotheses/round-N/perspective-N.md` (markdown, not JSON per CONTEXT.md). Format defined in workspace-format.md. Agent uses Write tool |
| HYPO-03 | Best hypothesis selected by orchestrator based on test results | Selection logic is Phase 22/23 scope. This phase ensures each hypothesis file has consistent structure (vocabulary table + numbered rules with confidence and evidence) to enable comparison |
</phase_requirements>

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Claude Code subagent `.md` files | Current (2026-03) | Agent definition format | Project convention; frontmatter already established in stubs |
| Workspace-format.md templates | N/A (reference doc) | Output format specification | Established in Phase 20; defines `problem.md` and `perspective-N.md` structure |
| Mastra pipeline instructions | N/A (reference) | Proven prompt patterns | Source of anti-patterns, analysis sequences, and confidence guidelines validated through evaluation |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Example problems in `examples/` | Validate prompt handles diverse formats | During prompt authoring to ensure edge cases are covered |
| `PIPELINE.md` reference | Source material for adapting Mastra patterns | Internal reference during prompt writing; not referenced by agents |

### Alternatives Considered

None -- this phase is pure prompt engineering within established conventions. No library or tool choices to make.

**Installation:**

No installation needed. This phase creates/modifies only markdown files.

## Architecture Patterns

### Recommended Project Structure

```
claude-code/.claude/agents/
  extractor.md         # Full system prompt (this phase)
  hypothesizer.md      # Full system prompt (this phase)
  verifier.md          # Stub (Phase 23)
  improver.md          # Stub (Phase 23)
  synthesizer.md       # Stub (future)
  answerer.md          # Stub (Phase 23)
```

### Pattern 1: Self-Contained Agent Prompt Structure

**What:** Each agent file contains everything needed: domain context, input format, processing instructions, output format template, anti-patterns, and error handling. No external references.

**When to use:** Always -- this is a locked decision from CONTEXT.md.

**Structure for each agent prompt:**

```markdown
---
name: {agent-name}
description: "{when to use}"
tools: Read, Write, Bash, Glob, Grep
model: opus
---

## Domain Context
[2-3 sentences: what a Rosetta Stone problem is, what this agent discovers]

## Input
[What the orchestrator provides and where to find it]

## Processing Instructions
[Step-by-step analysis methodology]

## Output Format
[Exact template with field descriptions -- embedded from workspace-format.md]

## Anti-Patterns
[Common mistakes to avoid -- derived from Mastra pipeline experience]

## Error Handling
[How to handle failures: inline + errors.md]
```

Source: Derived from CONTEXT.md decisions and existing agent stub patterns.

### Pattern 2: File-Based State Communication

**What:** Agents receive input by reading files from the workspace directory and produce output by writing files to the workspace directory. The orchestrator (Phase 22) tells each agent what file(s) to read and where to write.

**When to use:** All inter-agent communication in this pipeline.

**Key implications for prompts:**
- The extractor needs to know it will receive raw problem text (pasted or from a file path) and must write `problem.md`
- The hypothesizer needs to know it will read `problem.md` and write `hypotheses/round-N/perspective-N.md`
- File paths will be provided as input parameters by the orchestrator

Source: CLAUDE.md conventions and CONTEXT.md code context section.

### Pattern 3: Mechanical Extraction (No Analysis)

**What:** The extractor performs only structural parsing -- it identifies and organizes the problem's components without performing any linguistic analysis, translation, or hypothesis generation.

**When to use:** Extractor agent only.

**Why:** Separation of concerns. The extractor's job is parsing; the hypothesizer's job is analysis. Mixing them degrades both.

Source: CONTEXT.md locked decision on extraction depth.

### Pattern 4: Perspective-Isolated Hypothesis Generation

**What:** Each hypothesizer instance receives a single perspective (name + focus description) and produces its analysis independently. It never sees other perspectives' outputs.

**When to use:** Hypothesizer agent.

**Why:** Prevents convergence on a single approach. Different perspectives catch different patterns (morphological vs. syntactic vs. phonological). Isolation ensures genuine diversity.

Source: CONTEXT.md locked decision, mirrors Mastra pipeline's draft store isolation pattern.

### Anti-Patterns to Avoid

- **Referencing external documents in prompts:** The agent prompt must not say "see PIPELINE.md" or "follow workspace-format.md". All needed content must be inline. Subagents receive only their system prompt plus basic environment details.
- **Over-specifying the output path:** The prompt should describe the file structure but the exact path should come from the orchestrator's input, not be hardcoded.
- **Mixing vocabulary and rules in hypothesizer output:** The Mastra pipeline found that conflating vocabulary entries with rules degrades rule quality. Keep them as separate sections.
- **Allowing the extractor to analyze:** If the extractor starts generating linguistic hypotheses alongside extraction, it contaminates the extraction step and biases downstream agents.
- **Including self-testing in the hypothesizer:** This is a locked decision. Testing is the verifier's job to avoid confirmation bias.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Output format specification | Invent new formats | Embed workspace-format.md templates inline | Consistency with all other agents; format already validated |
| Analysis methodology | Design new linguistic analysis steps | Adapt Mastra hypothesizer's 7-step process | Proven through evaluation; covers segmentation, alignment, morphology, syntax, phonology, validation, competing hypotheses |
| Anti-pattern list | Guess at failure modes | Extract from Mastra pipeline experience | Real failures from production evaluation runs are more valuable than theoretical concerns |
| Confidence guidelines | Create new rubric | Reuse Mastra's HIGH/MEDIUM/LOW criteria | Already calibrated through eval runs |

**Key insight:** The Mastra pipeline has been evaluated against real Linguistics Olympiad problems. Its prompt patterns represent accumulated learning from those evaluations. Adapting proven patterns is strictly better than designing new ones from scratch.

## Common Pitfalls

### Pitfall 1: Prompt Too Long for Context Window

**What goes wrong:** The system prompt consumes too much of the agent's context window, leaving insufficient room for the problem text and reasoning.

**Why it happens:** Including full workspace-format.md examples, exhaustive anti-patterns, and lengthy analysis instructions.

**How to avoid:** Keep prompts focused. Include one complete output template example (not multiple). Keep anti-patterns to the critical ones. The CONTEXT.md guideline of "moderate detail" is the right balance.

**Warning signs:** Agent output gets truncated or the agent fails to follow later instructions in the prompt.

### Pitfall 2: Format Drift Between Extractor Output and Hypothesizer Input

**What goes wrong:** The extractor produces `problem.md` in a format that doesn't match what the hypothesizer expects to read.

**Why it happens:** Writing the two prompts independently without cross-referencing the shared format.

**How to avoid:** The workspace-format.md templates are the single source of truth for both. The extractor's output template must match exactly what the hypothesizer's "Input" section describes. Verify this during implementation.

**Warning signs:** The hypothesizer fails to parse or misinterprets sections of `problem.md`.

### Pitfall 3: Hardcoded Assumptions About Problem Format

**What goes wrong:** The extractor assumes all problems have exactly two columns (foreign language + English), or that the foreign language column is always first.

**Why it happens:** Most example problems follow this pattern, so the prompt implicitly assumes it.

**How to avoid:** CONTEXT.md explicitly requires "flexible multi-language support -- handle problems with 2+ languages and variable column counts." The prompt must include instructions for detecting language columns and handling non-standard layouts. Example problems like the Okinawan problem show "focused" word annotations; the Saisiyat problem has contextual notes in brackets.

**Warning signs:** The extractor drops data from problems with unusual formats or mislabels columns.

### Pitfall 4: Hypothesizer Generates Vocabulary as Rules

**What goes wrong:** The hypothesizer writes rules like "kala means eat" instead of separating vocabulary (morpheme mappings) from rules (patterns/mechanisms like "verbs take -ti for past tense").

**Why it happens:** The LLM naturally conflates the two concepts. Without explicit separation guidance, vocabulary items get formatted as rules.

**How to avoid:** Include explicit anti-pattern in the prompt: "Do NOT include vocabulary items in your rules section. Vocabulary maps individual morphemes to meanings. Rules describe patterns and mechanisms." This is directly from the Mastra pipeline's learned experience.

**Warning signs:** The Rules section contains entries like "boro = fish" instead of structural patterns.

### Pitfall 5: Hypothesizer Skips Evidence Citations

**What goes wrong:** Rules lack specific dataset references, making verification impossible for downstream agents.

**Why it happens:** The LLM generates plausible rules from general knowledge rather than grounding them in specific examples.

**How to avoid:** CONTEXT.md requires citing specific sentence numbers. Include format template showing `**Evidence:** #1, #3, #5` pattern. Add anti-pattern: "Every rule MUST cite at least one dataset sentence by number."

**Warning signs:** Rules with vague evidence like "observed in several examples" instead of "#1, #3, #5".

### Pitfall 6: Extractor Solves the Problem

**What goes wrong:** The extractor starts translating question sentences or adding linguistic analysis to the Context section.

**Why it happens:** The LLM has enough capability to analyze the problem and "helpfully" includes analysis.

**How to avoid:** Multiple reinforcing constraints: "Your job is ONLY structural parsing", "Do NOT translate", "Do NOT answer questions", "Copy question text EXACTLY as written". The Mastra extractor uses similar constraints successfully.

**Warning signs:** The Context section of `problem.md` contains hypothesized grammar rules, or question entries have translations added.

## Code Examples

Since this phase produces markdown files (not code), examples here show the target prompt structure and output patterns.

### Extractor Agent Prompt Structure

```markdown
---
name: extractor
description: "Parses raw Linguistics Olympiad problem text into structured
  markdown with context, dataset, and questions. Use when extracting
  structure from raw problem input."
tools: Read, Write, Bash, Glob, Grep
model: opus
---

[Domain context: 2-3 sentences about Rosetta Stone problems]

## Input

You will receive:
1. The raw problem text (provided inline or as a file path to read)
2. The output file path where you must write `problem.md`

## Task

Parse the raw problem text into a structured markdown file...

[Processing rules adapted from Mastra extractor instructions:]
- Context: linguistic/orthographic notes only, exclude trivia
- Dataset: complete pairs only, renumber sequentially (#1, #2...)
- Questions: explicit and implicit, renumber sequentially (Q1, Q2...)
- Auto-detect which column is foreign language vs. English
- Handle multi-language problems with variable column counts

## Output Format

Write a file with this exact structure:

[Embedded problem.md template from workspace-format.md]

## Do NOT

- Do NOT translate or answer any questions
- Do NOT perform linguistic analysis
- Do NOT guess the language name if not explicitly stated
- Do NOT hallucinate data not present in the input
- Do NOT assume a fixed two-column format
- [etc.]

## Error Handling

If you cannot parse the problem:
1. Write an error section inline in the output file
2. Write an entry to `errors.md` in the workspace run folder
```

Source: Adapted from Mastra `01-structured-problem-extractor-instructions.ts` and CONTEXT.md decisions.

### Hypothesizer Agent Prompt Structure

```markdown
---
name: hypothesizer
description: "Generates linguistic rules and vocabulary from a specific
  analytical perspective. Use when creating hypothesis drafts for a given
  perspective."
tools: Read, Write, Bash, Glob, Grep
model: opus
---

[Domain context: 2-3 sentences about Rosetta Stone problems and what
linguistic rules/vocabulary are]

## Input

You will receive:
1. The path to `problem.md` (the extracted problem)
2. Your assigned perspective (name + focus description)
3. The round number and perspective number
4. The output file path where you must write your hypothesis

## Task

Explore the problem from your assigned perspective...

## Analysis Process

[7-step process adapted from Mastra hypothesizer:]
1. Segmentation and Alignment
2. Identify Recurring Patterns
3. Morphological Analysis
4. Syntactic Analysis
5. Phonological Analysis (if applicable)
6. Validation & Falsification
7. Generate Competing Hypotheses

## Output Format

Write a file with this exact structure:

[Embedded perspective-N.md template from workspace-format.md]

## Confidence Guidelines

- HIGH: Checked every relevant example, no contradictions...
- MEDIUM: Complex or has edge cases...
- LOW: Hypothesized based on analogy or intuition...

## Do NOT

- Do NOT test or verify your rules against the dataset
- Do NOT include vocabulary items in your rules section
- Do NOT reference other perspectives' outputs
- Do NOT answer the questions
- Do NOT assume rules from real-world languages unless data supports it
- [etc.]

## Error Handling

[Same pattern as extractor]
```

Source: Adapted from Mastra `02-initial-hypothesizer-instructions.ts` and CONTEXT.md decisions.

### Input Communication Pattern

The orchestrator (Phase 22) passes input to subagents via the Agent tool's message parameter. For the extractor, this message contains the raw problem text and output path. For the hypothesizer, it contains the problem.md path, perspective details, and output path.

```
[Orchestrator invokes extractor via Agent tool]
Message: "Parse this problem and write the result to workspace/2026-03-07_14-30-00/problem.md

<problem>
[raw problem text here]
</problem>"
```

```
[Orchestrator invokes hypothesizer via Agent tool]
Message: "Read the problem from workspace/2026-03-07_14-30-00/problem.md

Perspective: Morphological Analysis
Focus: Examine affixes, suffixes, prefixes, and how word forms change...

Write your hypothesis to workspace/2026-03-07_14-30-00/hypotheses/round-1/perspective-1.md"
```

Source: Claude Code subagent documentation -- subagents receive their system prompt plus the invoking message.

## State of the Art

| Old Approach (Mastra) | New Approach (Claude Code) | Impact |
|----------------------|---------------------------|--------|
| JSON output via Zod schemas | Markdown file output via Write tool | Simpler; no schema validation but loses type safety. Format compliance relies entirely on prompt quality |
| Two-agent chain (reasoning + extraction) | Single agent produces structured output directly | Fewer moving parts; Opus 4.6 is capable enough for both reasoning and structured output |
| Vocabulary/Rules via CRUD tools | Vocabulary/Rules as markdown sections in output file | No tool overhead; but loses the ability to incrementally build state |
| Self-testing via testRule/testSentence tools | No self-testing (locked decision) | Reduces confirmation bias; verification is a separate agent's job |
| JSON for inter-agent data | Markdown for inter-agent data | Human-readable workspace files; easier debugging but harder programmatic parsing if needed later |

**Key evolution:** The Mastra pipeline uses programmatic tools (vocabulary CRUD, test tools) because it runs in a code execution environment. Claude Code subagents use file I/O because that's the natural communication primitive. This is not a regression -- it's a different execution model that aligns with Claude Code's strengths.

## Open Questions

1. **How does the orchestrator pass input to subagents?**
   - What we know: Claude Code's Agent tool accepts a message parameter. The subagent sees its system prompt + the message.
   - What's unclear: Whether there's a size limit on the message (relevant for large problems). Whether the orchestrator can pass structured parameters or only a text message.
   - Recommendation: Design prompts to accept input as plain text within the message, with clear delimiters (XML tags like `<problem>`, `<perspective>`). This is robust regardless of message constraints. Phase 22 will finalize the exact communication protocol.

2. **How should the hypothesizer handle Round 2+ with existing rules?**
   - What we know: CONTEXT.md says "each hypothesizer runs in complete isolation." The Mastra pipeline initializes Round 2+ draft stores from the main store.
   - What's unclear: Whether Round 2+ hypothesizers should read the existing solution.md or start fresh. This is an orchestration decision (Phase 22).
   - Recommendation: Design the hypothesizer prompt to optionally accept a "baseline" -- existing rules/vocabulary to build upon. The orchestrator decides whether to provide it. The prompt says "If baseline rules/vocabulary are provided, build upon them; otherwise start from scratch."

3. **Error handling: where does errors.md get created?**
   - What we know: CONTEXT.md says errors appear both inline and in `errors.md`.
   - What's unclear: Whether the agent creates `errors.md` itself or the orchestrator manages it.
   - Recommendation: The agent appends to `errors.md` in the workspace run folder. If the file doesn't exist, create it. Use a consistent entry format (timestamp, agent, error type, message, recovery).

## Sources

### Primary (HIGH confidence)

- Claude Code subagent documentation: https://code.claude.com/docs/en/sub-agents -- Definitive reference for frontmatter fields, tool access, input/output model, and subagent limitations
- `claude-code/references/workspace-format.md` -- Output format templates for `problem.md` and `perspective-N.md`
- `claude-code/CLAUDE.md` -- Project conventions (model choice, workspace structure, error handling)
- `.planning/phases/21-pipeline-agents/21-CONTEXT.md` -- Locked decisions from user discussion

### Secondary (MEDIUM confidence)

- Mastra pipeline agent instructions (`src/mastra/workflow/01-*-instructions.ts`, `02-*-instructions.ts`) -- Proven prompt patterns adapted for Claude Code context
- `claude-code/PIPELINE.md` -- Full pipeline reference for understanding the design rationale

### Tertiary (LOW confidence)

- None -- all findings verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no libraries to choose; this is pure prompt engineering within established conventions
- Architecture: HIGH -- patterns are well-defined by CONTEXT.md decisions, workspace-format.md templates, and existing agent stubs
- Pitfalls: HIGH -- derived from actual Mastra pipeline evaluation experience and Claude Code documentation

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days; stable domain with no external dependencies)
