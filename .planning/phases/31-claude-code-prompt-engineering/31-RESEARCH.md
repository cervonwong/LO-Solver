# Phase 31: Claude Code Prompt Engineering - Research

**Researched:** 2026-03-09
**Domain:** Claude Code agent prompt engineering (Anthropic Claude Opus 4.6 / Sonnet 4.6)
**Confidence:** HIGH

## Summary

This phase rewrites all 6 Claude Code agent prompts (`claude-code/.claude/agents/*.md`) to follow Anthropic's official Claude 4.6 prompt engineering best practices. The agents are self-contained markdown files with YAML frontmatter used by Claude Code's native subagent system -- they are NOT Mastra agents. The prompts currently use markdown headings for structural boundaries, direct unhedged assertions, and a 3-level confidence scale (HIGH/MEDIUM/LOW). The rewrite applies XML-tagged sections, role-first structure, data-first ordering, conditional tool guidance, the 6-level evidence-based confidence scale, and hedged assertion style.

Key findings from Anthropic's official prompting guide (fetched 2026-03-09): Claude Opus 4.6 is significantly more responsive to system prompts than previous models and may overtrigger on aggressive language. The guide explicitly recommends (1) XML tags for structural boundaries, (2) role definitions to focus behavior, (3) long data/context placed before instructions, (4) positive framing ("do X" instead of "don't do Y") with context for constraints, and (5) conditional rather than blanket tool directives. The guide warns against "CRITICAL: You MUST" style language, noting that Opus 4.6 responds well to normal prompting without aggressive emphasis.

A critical distinction from Phase 30: the Claude Code agents output markdown files (not JSON), so there is no Zod schema constraint on the confidence field. The 6-level confidence scale can be used directly in output (e.g., `**Confidence:** well-supported`) without needing a mapping to a 3-level enum. The verifier agent is exempt from the confidence scale (keeps PASS/FAIL/NEEDS_UPDATE status vocabulary).

**Primary recommendation:** Deep-rewrite all 6 agent prompts using XML-tagged sections (`<role>`, `<context>`, `<input>`, `<task>`, `<output_format>`, `<guidelines>`), role-first opening, data-first ordering, conditional tool guidance, and positive framing. Apply the 6-level confidence scale directly and hedged assertion style per the agent inventory in CONTEXT.md.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Adopt the 6-level evidence-based confidence scale from Phase 30 for 5 of 6 agents: well-supported / supported / plausible / tentative / speculative / unsupported
- Same overclaiming guard: if even one example is ambiguous, a rule cannot be "well-supported"; complexity and exceptions reduce confidence (cap at "plausible" at best)
- Verifier agent is exempt -- keeps its PASS/FAIL/NEEDS_UPDATE status vocabulary (its output is a test result, not a confidence claim)
- Answerer uses the full 6-level scale for per-question confidence (not the old HIGH/MEDIUM/LOW)
- Hedged assertions for 4 agents: hypothesizer, synthesizer, improver, answerer
- Hedged means qualifying claims with evidence references: "X appears to hold based on examples 1-3, though example 4 is ambiguous"
- Avoid unqualified assertions like "The answer is X" or "I found that X"
- Extractor is exempt -- pure mechanical parsing, no linguistic claims to hedge
- Verifier is exempt -- definitive testing with direct assertions ("The rule is contradicted by sentence #3")
- Deep rewrite: treat prompts as substantially new text, not surface edits
- Restructure content, merge redundant sections, rewrite phrasing using Anthropic best practices
- The spirit of each prompt stays the same (same role, same task, same constraints) but the text is substantially rewritten
- Error handling sections preserved as-is (functional, tested, nearly identical across agents)
- YAML frontmatter descriptions also updated to match rewritten prompt style
- Constraint handling (current "Do NOT" sections): approach determined by Anthropic guide + Claude's judgment after reading the guide
- Research phase fetches latest Anthropic Claude prompting guide via web search
- Use up-to-date vendor advice, not cached knowledge
- Adopt strategies selectively -- learn principles from the guide, apply to each agent's specific role
- Single plan covering research + all 6 agent rewrites
- No eval run needed -- Claude Code solver has no automated eval harness
- No manual smoke test required

### Claude's Discretion
- Specific prompt content and wording
- Which Anthropic guide strategies to adopt vs skip per agent
- XML tag naming conventions (success criteria specify `<instructions>`, `<context>`, `<input>`, `<task>` but additional tags are at Claude's discretion)
- How to restructure "Do NOT" sections (conditional guidance, concise guardrails, or hybrid -- guided by Anthropic best practices)
- Order of agents within the single plan
- How to integrate the confidence scale into each agent's prompt naturally

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PE-04 | Claude Opus 4.6 agent prompts (6 agents) rewritten per Anthropic Claude 4.6 best practices -- XML-tagged sections, role-first structure, tool use guidance | Full Anthropic guide fetched and analyzed; XML structure, role definition, data-first ordering, tool use, and constraint framing strategies documented below |

</phase_requirements>

## Anthropic Claude Prompting Best Practices (from Official Guide)

Source: [Prompting best practices - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) (fetched 2026-03-09)

### 1. XML Tags for Structure (HIGH confidence)

**What:** XML tags help Claude parse complex prompts unambiguously, especially when the prompt mixes instructions, context, examples, and variable inputs. Wrapping each type of content in its own tag reduces misinterpretation.

**Best practices from Anthropic:**
- Use consistent, descriptive tag names across prompts
- Nest tags when content has a natural hierarchy
- There are no canonical "best" XML tags -- use what is descriptive for your use case
- Wrap examples in `<example>` tags (multiple in `<examples>`)
- Wrap documents in `<document>` tags with metadata subtags

**Recommended tag set for this project (combining success criteria + Anthropic guidance):**
- `<role>` -- Agent identity and expertise (required by success criteria)
- `<context>` -- Domain background, pipeline context (required by success criteria)
- `<input>` -- What the agent receives at runtime (required by success criteria)
- `<task>` -- Core task description and steps (required by success criteria)
- `<output_format>` -- Output structure specification
- `<guidelines>` -- Behavioral guidelines including confidence scale, assertion style
- `<constraints>` -- Guardrails (replaces "Do NOT" sections)
- `<error_handling>` -- Error recovery procedures (preserved as-is per user decision)

### 2. Role Definition First (HIGH confidence)

**What:** Setting a role focuses Claude's behavior and tone. Even a single sentence makes a difference. The success criteria require "each agent prompt opens with a role definition as the first sentence before any other content."

**Anthropic guidance:** Place role in the system prompt. For Claude Code agents (which use markdown files as system prompts), the role should be the very first content after YAML frontmatter.

**Pattern:**
```
---
name: extractor
description: "..."
tools: Read, Write, Bash, Glob, Grep
model: opus
---

<role>
You are a structural parser for Linguistics Olympiad problems. You take raw problem text and organize it into a clean, structured markdown file. You perform no linguistic analysis -- only parsing and formatting.
</role>
```

### 3. Data-First Ordering (HIGH confidence)

**What:** Place long documents and inputs near the top of the prompt, above query, instructions, and examples. Queries at the end improve response quality by up to 30% in tests, especially with complex, multi-document inputs.

**Application to Claude Code agents:** The agents receive runtime data (problem text, solution files, verification results) via the user message, not the system prompt. However, data-first ordering applies to the prompt structure itself: domain context and reference information should precede task instructions. The `<context>` section (pipeline overview, data format descriptions) should come before `<task>`.

**Ordering within the prompt:**
1. `<role>` -- Identity (first sentence requirement)
2. `<context>` -- Domain background, data format descriptions
3. `<input>` -- Description of what the agent receives
4. `<task>` -- What to do with the input
5. `<output_format>` -- Expected output structure
6. `<guidelines>` -- Confidence scale, assertion style, behavioral guidance
7. `<constraints>` -- Guardrails
8. `<error_handling>` -- Error recovery

### 4. Positive Framing for Constraints (HIGH confidence)

**What:** Anthropic explicitly recommends "Tell Claude what to do instead of what not to do." The guide provides the example: instead of "Do not use markdown in your response," use "Your response should be composed of smoothly flowing prose paragraphs."

**Additional nuance:** The guide also says to "add context to improve performance" -- explain WHY a behavior matters, not just what to avoid. Example from guide: instead of "NEVER use ellipses," use "Your response will be read aloud by a text-to-speech engine, so never use ellipses since the text-to-speech engine will not know how to pronounce them." Claude generalizes from explanations.

**Application to current "Do NOT" sections:** The current prompts have 8-11 "Do NOT" bullet points each. These should be restructured as:
1. **Positive reframing** where natural: "Copy all text verbatim from the input" instead of "Do NOT modify, correct, or fix any text"
2. **Conditional guidance** where context matters: "When analyzing patterns, keep vocabulary entries separate from rules because vocabulary maps individual morphemes to meanings while rules describe patterns and mechanisms"
3. **Brief guardrails** where sharp boundaries are needed: some constraints are genuinely prohibitive and a concise negative statement is clearest (e.g., "Your job is structural parsing only -- do not translate, analyze, or answer questions")

**Hybrid approach recommended:** Not all negatives need to become positives. Use positive framing as the default, retain negatives only where they are genuinely the clearest expression, and always provide context/motivation.

### 5. Tool Use Guidance (HIGH confidence)

**What:** Claude Opus 4.6 is "more responsive to the system prompt than previous models." The guide explicitly warns: "If your prompts were designed to reduce undertriggering on tools or skills, these models may now overtrigger. The fix is to dial back any aggressive language. Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more normal prompting like 'Use this tool when...'"

**Current state in Claude Code agents:** The agents have `tools: Read, Write, Bash, Glob, Grep` in frontmatter. Tool usage instructions are implicit (e.g., "Read the solution file and problem.md using the Read tool before beginning your test" in the verifier). This is already relatively low-key.

**Success criteria requirement:** "Tool use instructions specify conditions and expected behavior rather than blanket 'ALWAYS' directives."

**Recommended approach:**
- Specify WHEN to use each tool and WHAT to expect: "Use the Read tool to load the solution file and problem.md before starting analysis"
- Avoid blanket "ALWAYS use X" -- instead use conditional: "When you need to examine file contents, use the Read tool"
- For Write tool: specify the output path convention and what to write
- Keep tool guidance concise -- Claude Code's tool system already provides tool descriptions

### 6. Clear and Direct Instructions (HIGH confidence)

**What:** Anthropic's "golden rule": Show your prompt to a colleague with minimal context on the task. If they'd be confused, Claude will be too. Be specific about desired output format and constraints. Provide instructions as sequential steps using numbered lists when order matters.

**Application:** The current prompts already use numbered steps for multi-step processes (e.g., hypothesizer's 7-step analysis process). This pattern should be preserved. However, instructions should be more concise -- Opus 4.6 is less verbose and prefers direct, efficient guidance.

### 7. Examples in Prompts (MEDIUM confidence)

**What:** Examples are "one of the most reliable ways to steer Claude's output format, tone, and structure." Wrap in `<example>` tags. Include 3-5 for best results.

**Application:** The current prompts include output format templates (showing expected markdown structure). These serve as implicit examples. For the rewrite, the output format section already provides the structural template. Adding explicit `<example>` tags with filled-in examples could be beneficial but would significantly increase prompt length. **Recommendation:** Keep the output format template as the primary example; do not add full worked examples unless prompt length allows.

### 8. Opus 4.6 Specific Behaviors (HIGH confidence)

**Key behaviors relevant to these agents:**
- **More concise and natural communication**: May skip verbose summaries. Good for these agents -- they should produce structured output, not verbose narration.
- **Overtriggering risk**: Opus 4.6 is significantly more proactive. Remove any "ALWAYS" or "CRITICAL: MUST" language from prompts.
- **Adaptive thinking**: Opus 4.6 uses adaptive thinking by default. Prefer general instructions over prescriptive step-by-step plans -- "Claude's reasoning frequently exceeds what a human would prescribe."
- **Overeagerness**: Tendency to overengineer. For agents that should stay in their lane (e.g., extractor should not analyze), clear scope boundaries are important.

## Architecture Patterns

### Recommended Prompt Structure

```
---
name: {agent-name}
description: "{updated description}"
tools: Read, Write, Bash, Glob, Grep
model: {opus|sonnet}
---

<role>
{Single paragraph: identity, expertise, scope. First sentence is the role definition.}
</role>

<context>
{Domain background: what Linguistics Olympiad problems are, how this agent fits in the pipeline, what predecessor/successor agents do. Data format descriptions for files the agent reads.}
</context>

<input>
{Numbered list of what the agent receives at runtime: file paths, parameters, optional inputs.}
</input>

<task>
{Core task with numbered steps. Direct and concise. For complex multi-step tasks, use numbered sub-steps.}
</task>

<output_format>
{Exact markdown structure expected in the output file. Template with placeholders.}
</output_format>

<guidelines>
{Behavioral guidance:
- Confidence scale (for 5 of 6 agents)
- Assertion style (hedged for 4, exempt for 2)
- Evidence citation requirements
- Tool usage conditions}
</guidelines>

<constraints>
{Scope boundaries and guardrails. Mix of positive framing, conditional guidance, and brief prohibitions as appropriate. Always with context/motivation.}
</constraints>

<error_handling>
{Preserved as-is from current prompts.}
</error_handling>
```

### Anti-Patterns to Avoid

- **"CRITICAL: You MUST" language**: Opus 4.6 overtriggers on aggressive emphasis. Use normal phrasing.
- **Long lists of "Do NOT" without context**: Reframe positively or add motivation.
- **Blanket tool directives**: "ALWAYS use the Read tool" -- instead specify when and why.
- **Verbose chain-of-thought scaffolding**: Opus 4.6 has built-in adaptive thinking. Keep process steps high-level.
- **Mixing XML and markdown for structure**: Use XML tags for prompt sections, markdown only inside content blocks (output format templates, tables).
- **Redundant emphasis across sections**: The current prompts sometimes repeat the same instruction in both the task section and the "Do NOT" section. Consolidate.

## Agent-Specific Rewrite Notes

### 1. Extractor (`extractor.md`, 120 lines)

**Model:** Opus
**Current structure:** Domain Context, Input, Task (with subsections), Output Format, Do NOT (11 items), Error Handling
**Hedging:** Exempt (pure mechanical parsing)
**Confidence scale:** 6-level (though extractor rarely uses confidence -- may be N/A)

**Rewrite notes:**
- Role: "You are a structural parser..." (already well-defined, just move to `<role>` tag)
- The Task section has 3 subsections (Context, Dataset, Questions) with detailed extraction rules -- these are the core value and should be preserved in substance
- 11 "Do NOT" items: many are reframable as positive instructions. Examples:
  - "Do NOT translate or answer any questions" -> scope boundary in `<role>`: "You perform no linguistic analysis -- only parsing and formatting"
  - "Do NOT modify, correct, or fix any text" -> positive: "Copy all text verbatim, preserving diacritics, special characters, and whitespace"
  - "Do NOT assume a fixed two-column format" -> positive: "Auto-detect the number of language columns and their identities based on content"
- No confidence scale needed (extractor does not assess confidence of anything)

### 2. Hypothesizer (`hypothesizer.md`, 170 lines)

**Model:** Opus
**Current structure:** Domain Context, Input, Task, Analysis Process (7 steps), Output Format, Confidence Guidelines, Do NOT (10 items), Error Handling
**Hedging:** Yes
**Confidence scale:** 6-level (replaces current HIGH/MEDIUM/LOW)

**Rewrite notes:**
- Longest prompt. The 7-step Analysis Process is detailed chain-of-thought scaffolding. Per Anthropic guidance, Opus 4.6's adaptive thinking makes prescriptive step-by-step less necessary. **Recommendation:** Condense the 7 steps into high-level guidance while preserving the key analytical concepts (segmentation, morphology, syntax, phonology, validation, competing hypotheses). Let the model's reasoning fill in the details.
- Confidence Guidelines section: replace 3-level with 6-level scale
- Add hedged assertion style guidance
- 10 "Do NOT" items: several are reframable:
  - "Do NOT test or verify your rules by attempting full translations" -> positive with motivation: "Testing is the verifier's job (a separate agent). Avoid attempting full sentence translations to prevent confirmation bias."
  - "Do NOT reference other perspectives' outputs" -> already embedded in role: "You work in complete isolation from other perspectives"

### 3. Verifier (`verifier.md`, 128 lines)

**Model:** Sonnet (not Opus -- but still benefits from Anthropic best practices)
**Current structure:** Domain Context, Input, Task (Rule Test Mode, Sentence Test Mode), Output Format, Do NOT (8 items), Error Handling
**Hedging:** Exempt
**Confidence scale:** Exempt (uses PASS/FAIL/NEEDS_UPDATE)

**Rewrite notes:**
- Two distinct operational modes (rule test, sentence test) -- keep this split clear
- "Do NOT" items (8): many are scope boundaries that belong in `<role>` or `<constraints>`:
  - "Do NOT aggregate multiple test results" -> role: "You test ONE thing per invocation"
  - "Do NOT modify, improve, or suggest changes to rules" -> role boundary: "Modification is the improver agent's job"
- Tool guidance: "Read the solution file and problem.md using the Read tool" -- already conditional, just formalize
- Uses Sonnet model -- Anthropic notes Sonnet 4.6 also benefits from clear XML structure and role definition

### 4. Improver (`improver.md`, 179 lines)

**Model:** Opus
**Current structure:** Domain Context, Input, Task (7 sub-steps), Output Format, Confidence Guidelines, Do NOT (8 items), Error Handling
**Hedging:** Yes
**Confidence scale:** 6-level (replaces current HIGH/MEDIUM/LOW)

**Rewrite notes:**
- Task has 7 detailed sub-steps including "Perform Root Cause Analysis" with 6 core reasoning principles. These are high-value instructions but can be condensed slightly per Anthropic's "prefer general instructions over prescriptive steps."
- "Multiple hypotheses" principle (step 3): aligns well with hedged assertion style -- integrate the two
- Confidence Guidelines: replace with 6-level scale
- "Do NOT" items: 8 items, mostly reframable:
  - "Do NOT only fix symptoms -- perform root cause analysis" -> positive: "Trace each failing sentence back to its root cause rule before proposing fixes"
  - "Do NOT produce partial output" -> positive: "Write the COMPLETE vocabulary table and ALL rules"

### 5. Synthesizer (`synthesizer.md`, 138 lines)

**Model:** Opus
**Current structure:** Domain Context, Input, Task (6 sub-steps), Output Format, Do NOT (8 items), Error Handling
**Hedging:** Yes
**Confidence scale:** 6-level (replaces current inline HIGH/MEDIUM/LOW)

**Rewrite notes:**
- Task has a clear merge process (rank, base, add, resolve, merge vocab, sanity check) -- preserve structure
- Confidence is currently embedded in the output format section (not a separate Confidence Guidelines section) -- extract to `<guidelines>`
- "Do NOT" items: 8 items:
  - "Do NOT invent rules not present in any perspective" -> positive with motivation: "Only merge, select, and refine existing rules -- the perspectives are the evidence base"
  - "Do NOT discard all rules from a perspective just because it has a lower pass rate" -> conditional guidance: "Low-scoring perspectives may still have complementary rules the best perspective lacks"

### 6. Answerer (`answerer.md`, 158 lines)

**Model:** Opus
**Current structure:** Domain Context, Input, Task (5 steps), Confidence and Best-Attempt Policy, Output Format, Confidence Guidelines, Do NOT (7 items), Error Handling
**Hedging:** Yes
**Confidence scale:** 6-level (replaces current HIGH/MEDIUM/LOW)

**Rewrite notes:**
- Has both a "Confidence and Best-Attempt Policy" subsection in Task AND a separate "Confidence Guidelines" section -- redundant. Merge into `<guidelines>`.
- 6-level scale replaces HIGH/MEDIUM/LOW directly in output (no Zod enum constraint for Claude Code agents)
- "Do NOT" items: 7 items, most reframable:
  - "Do NOT use external linguistic knowledge" -> positive: "Apply only the rules and vocabulary from the provided solution file"
  - "Do NOT skip any question" -> positive: "Produce a best-attempt translation for every question, even with low confidence"
  - "Do NOT produce JSON output" -> positive: "Write markdown following the output format"

## Confidence Scale Integration (Claude Code)

### No Schema Constraint

Unlike Mastra agents (Phase 30), Claude Code agents output markdown files, not JSON conforming to Zod schemas. This means the 6-level confidence scale can be used directly in output without mapping to a 3-level enum.

### Scale Definition (for inclusion in prompts)

```
When assessing confidence, use this evidence-based scale:
- well-supported: ALL examples work without exception, pattern is unambiguous and simple
- supported: 2+ examples align with minor gaps acceptable
- plausible: 1 clear example, or pattern works but involves complexity or exceptions
- tentative: Partial pattern with gaps remaining
- speculative: Inferred from analogy, no direct supporting example
- unsupported: Contradicted by data or lacking any evidence

Overclaiming guard: if even one example is ambiguous, the rule cannot be "well-supported."
Complexity and exceptions reduce confidence -- a rule with multiple exceptions is "plausible" at best.
```

### Per-Agent Application

| Agent | Confidence Scale | Assertion Style |
|-------|-----------------|-----------------|
| Extractor | Not applicable (no confidence claims) | Direct (mechanical parsing) |
| Hypothesizer | 6-level in output | Hedged with evidence citations |
| Verifier | PASS/FAIL/NEEDS_UPDATE (exempt) | Direct definitive ("The rule is contradicted by...") |
| Improver | 6-level in output | Hedged with evidence citations |
| Synthesizer | 6-level in output | Hedged with evidence citations |
| Answerer | 6-level per question | Hedged with evidence citations |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prompt structure | Custom section delimiters | XML tags (`<role>`, `<context>`, etc.) | Anthropic-recommended; model trained to parse XML boundaries |
| Constraint framing | Long "Do NOT" lists | Positive framing + context | Anthropic guide explicitly recommends this; Claude generalizes from explanations |
| Tool guidance | "ALWAYS/NEVER" directives | Conditional "Use X when Y" | Opus 4.6 overtriggers on aggressive language |
| Step-by-step reasoning | Detailed CoT scaffolding | High-level process description | Opus 4.6 has adaptive thinking; prescriptive steps may limit reasoning quality |

## Common Pitfalls

### Pitfall 1: Overtriggering from Aggressive Language
**What goes wrong:** Opus 4.6 is significantly more responsive to system prompts than previous models. "CRITICAL: You MUST" style language causes the model to over-index on those instructions at the expense of overall task performance.
**Why it happens:** The model was trained to follow instructions more precisely; aggressive emphasis magnifies this.
**How to avoid:** Use normal phrasing. "Use the Read tool to load the file" instead of "CRITICAL: You MUST ALWAYS use the Read tool."
**Warning signs:** Agent behaves rigidly, follows one instruction perfectly while ignoring others.

### Pitfall 2: Losing Functional Content During "Deep Rewrite"
**What goes wrong:** Rewriting for style destroys substantive instructions that the agent needs (e.g., specific extraction rules for the extractor, morphological analysis guidance for the hypothesizer).
**Why it happens:** Focus on structural changes (XML tags, positive framing) causes content to be omitted.
**How to avoid:** Verify every substantive instruction from the current prompt appears in the rewritten version. Use a checklist per agent.
**Warning signs:** Rewritten prompt is significantly shorter than original without justification.

### Pitfall 3: XML Tags Becoming Too Granular
**What goes wrong:** Over-tagging with deeply nested XML makes the prompt harder to read and maintain without improving Claude's parsing.
**Why it happens:** Enthusiasm for XML structure leads to wrapping every paragraph in tags.
**How to avoid:** Use 6-8 top-level tags maximum. Only nest when there is a genuine hierarchy (e.g., sub-steps within `<task>`). Use markdown for internal formatting.
**Warning signs:** More than 10 distinct XML tag types in a single prompt.

### Pitfall 4: Positive Framing That Loses Precision
**What goes wrong:** Reframing "Do NOT translate" as "Focus on parsing" is weaker -- it suggests but does not prohibit translation.
**Why it happens:** Forced positive reframing sometimes cannot express sharp boundaries.
**How to avoid:** Use the hybrid approach: positive framing as default, retain negatives for sharp scope boundaries, always with context/motivation. "Your scope is structural parsing only -- do not translate, analyze, or answer questions" is clear and motivated.
**Warning signs:** Rewritten constraint is longer and less precise than the original negative.

### Pitfall 5: Breaking YAML Frontmatter
**What goes wrong:** Modifying the YAML frontmatter (especially the `description` field) with characters that break YAML parsing (unescaped colons, quotes).
**Why it happens:** YAML has strict syntax; the description field must be properly quoted.
**How to avoid:** Keep descriptions in double quotes. Escape internal double quotes. Test that frontmatter parses correctly.
**Warning signs:** Agent fails to load in Claude Code.

## Code Examples

### Example: Restructured Extractor Prompt Opening

```markdown
---
name: extractor
description: "Parses raw Linguistics Olympiad problem text into structured markdown with context, dataset, and questions."
tools: Read, Write, Bash, Glob, Grep
model: opus
---

<role>
You are a structural parser for Linguistics Olympiad Rosetta Stone problems. You take raw problem text and organize it into a clean, structured markdown file with three sections: Context, Dataset, and Questions. You perform no linguistic analysis -- only parsing and formatting.
</role>

<context>
A Rosetta Stone Linguistics Olympiad problem provides sentences in an unfamiliar language paired with their English translations, then asks the solver to translate new sentences. Your job is the first step in a multi-agent pipeline: you produce the structured input that all downstream agents (hypothesizer, verifier, improver, synthesizer, answerer) rely on.
</context>

<input>
You will receive:

1. **Raw problem text** -- either inline in the message (inside `<problem>` tags) or as a file path. If given a path, use the Read tool to load the content.
2. **Output file path** -- where to write the resulting `problem.md` file.
</input>

<task>
Parse the raw problem text into a structured markdown file with three sections:
...
</task>
```

### Example: Constraint Reframing (Hypothesizer)

**Current (list of "Do NOT"):**
```markdown
## Do NOT

- Do NOT test or verify your rules against the dataset by attempting full translations -- testing is the verifier's job (a separate agent), to avoid confirmation bias.
- Do NOT include vocabulary items in your Rules section -- vocabulary maps individual morphemes to meanings; rules describe patterns and mechanisms.
- Do NOT reference other perspectives' outputs -- you work in complete isolation.
```

**Rewritten (positive framing + conditional guidance):**
```markdown
<constraints>
Your scope is hypothesis generation -- not verification or translation.

- Testing is the verifier agent's responsibility. Avoid attempting full sentence translations, as this introduces confirmation bias. You may segment and align data, but do not construct complete translations to "check" rules.
- Keep vocabulary and rules strictly separate. Vocabulary maps individual morphemes to meanings (e.g., "kala = eat"). Rules describe patterns and mechanisms (e.g., "verbs take -ti suffix for past tense"). Including vocabulary entries in the Rules section degrades their explanatory power.
- You work in complete isolation from other perspectives. Base your analysis solely on the problem data and your assigned perspective.
- Cite specific dataset sentence numbers for every rule and vocabulary entry. Evidence without citations cannot be evaluated.
</constraints>
```

### Example: Confidence Scale in Hypothesizer Output

**Current:**
```markdown
**Confidence:** {HIGH|MEDIUM|LOW}
```

**Rewritten:**
```markdown
**Confidence:** {well-supported|supported|plausible|tentative|speculative|unsupported}
```

### Example: Hedged Assertion Style

**Current (unhedged):**
```
The suffix -ti marks past tense.
```

**Rewritten (hedged with evidence):**
```
The suffix -ti appears to mark past tense based on examples #2, #5, and #7, where verbs with -ti consistently correspond to English past-tense translations. Example #4 may involve a different usage that warrants further investigation.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| "CRITICAL: You MUST" emphasis | Normal phrasing without aggressive emphasis | Claude 4.5/4.6 (2025-2026) | Opus 4.6 overtriggers on aggressive language; dial back |
| Blanket "ALWAYS use tool X" | Conditional "Use tool X when Y" | Claude 4.5/4.6 | More precise tool triggering |
| Markdown headings for prompt structure | XML tags for section boundaries | Claude 4.x series | Unambiguous parsing, especially with mixed content types |
| "Do not do X" constraints | Positive framing with context | Claude 4.6 guide update | Model generalizes better from explanations than prohibitions |
| Prescriptive step-by-step CoT | High-level process, let adaptive thinking fill in | Claude 4.6 (adaptive thinking) | Model reasoning "frequently exceeds what a human would prescribe" |
| Prefilled assistant responses | Direct instructions + XML format indicators | Claude 4.6 (prefills deprecated) | Not applicable to Claude Code agents but reflects model evolution |

## Open Questions

1. **Verifier model (Sonnet vs Opus)**
   - What we know: The verifier uses Sonnet for cost efficiency. Sonnet 4.6 also benefits from XML structure and role definition per Anthropic docs.
   - What's unclear: Whether Sonnet 4.6 responds to the same prompt patterns as Opus 4.6 for the purposes of this rewrite.
   - Recommendation: Apply the same XML structure and best practices. Anthropic's guide covers both models under the same recommendations. The verifier's simpler task (single-item testing) means Sonnet is appropriate regardless of prompt structure.

2. **Optimal level of analysis process detail for hypothesizer**
   - What we know: Anthropic recommends "prefer general instructions over prescriptive steps" for Opus 4.6 with adaptive thinking. The current hypothesizer has 7 detailed analysis steps.
   - What's unclear: How much condensation is safe without losing important analytical guidance (e.g., "actively seek counterexamples," "generate competing hypotheses").
   - Recommendation: Condense to 4-5 high-level steps that name the key concepts without over-specifying the process. Preserve the unique value-add items (falsification, competing hypotheses) as explicit guidance.

## Sources

### Primary (HIGH confidence)
- [Prompting best practices - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) -- Comprehensive official guide covering XML tags, role definition, data-first ordering, tool use, constraint framing, Opus 4.6 behaviors, and migration guidance
- [Use XML tags to structure your prompts - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags) -- XML tag naming conventions and nesting guidance

### Secondary (MEDIUM confidence)
- Phase 30 Research (`30-RESEARCH.md`) -- Precedent for confidence scale integration and vendor-specific prompt rewriting in the same project

### Tertiary (LOW confidence)
- None -- all findings verified against official Anthropic documentation

## Metadata

**Confidence breakdown:**
- Anthropic best practices: HIGH -- fetched directly from official Claude API docs (2026-03-09)
- XML tag structure: HIGH -- explicitly recommended in official guide with examples
- Constraint reframing: HIGH -- guide provides specific examples of positive vs negative framing
- Confidence scale integration: HIGH -- no schema constraint for Claude Code agents; 6-level scale can be used directly
- Agent-specific rewrite notes: MEDIUM -- based on analysis of current prompts against guide principles; actual rewrite quality depends on execution

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- Anthropic guide is the current reference for Claude 4.6)
