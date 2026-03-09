# Phase 30: Mastra Prompt Engineering - Research

**Researched:** 2026-03-09
**Domain:** LLM prompt engineering (GPT-5-mini, Gemini 3 Flash)
**Confidence:** HIGH

## Summary

This phase rewrites all 12 Mastra agent instruction files using model-specific vendor best practices, standardizes confidence/conclusion vocabulary, and verifies with a single eval run. The two model families require distinct prompting strategies: GPT-5-mini agents benefit from static-first XML scaffolding with explicit JSON schema descriptions and literal instruction-following directives, while Gemini 3 Flash agents respond best to XML-delimited sections, concise direct instructions, and data-before-instructions ordering.

A critical constraint: the Zod schema in `workflow-schemas.ts` enforces `z.enum(['HIGH', 'MEDIUM', 'LOW'])` for confidence fields in both `ruleSchema` and `questionAnswerSchema`. The user's 6-level confidence scale (well-supported through unsupported) must be implemented purely in prompt language (for reasoning/descriptions) while the structured output fields continue to emit `HIGH`, `MEDIUM`, or `LOW`. The 6-level scale maps to 3 Zod levels: well-supported/supported map to HIGH, plausible/tentative map to MEDIUM, speculative/unsupported map to LOW. This is a prompt-only change with zero code modifications.

**Primary recommendation:** Rewrite instruction files per model family (GPT-5-mini first, then Gemini 3 Flash), applying vendor guide strategies adapted to each agent's role. Use the 6-level confidence scale in natural-language prompts with explicit mapping to the 3-level Zod enum. Run a single `npm run eval -- --comparison` at the end.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Rewrite per model family: GPT-5-mini agents first (5 agents), then Gemini 3 Flash agents (7 agents)
- No baseline eval capture before starting -- skip PE-01
- No intermediate eval runs between batches -- single eval run at the end after all 12 prompts are rewritten
- Final eval in testing mode only -- skip production mode verification
- No per-agent eval runs
- GPT-5-mini agent treatment is role-adapted (extractors vs testers), not a rigid template
- Gemini 3 Flash agents get XML-delimited sections; other strategies adopted selectively
- Evidence-based 6-level confidence scale: well-supported, supported, plausible, tentative, speculative, unsupported
- Hedged assertion style for conclusion language
- Research phase should fetch current vendor prompting guides via web search
- Keep existing `{{placeholder}}` template injection pattern for hypothesizer, synthesizer, and improver agents

### Claude's Discretion
- Specific prompt content and wording
- Which vendor guide strategies to adopt vs skip per agent
- Internal XML tag naming for Gemini prompts
- How to integrate the confidence scale into each agent's prompt naturally
- Order of agents within each model family batch

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PE-01 | Eval baseline captured before any prompt changes | SKIPPED per user decision -- no baseline capture |
| PE-02 | GPT-5-mini agent prompts (5 agents) rewritten per OpenAI GPT-5 prompting guide | GPT-5/5.2 prompting guide strategies documented below with role-specific adaptation |
| PE-03 | Gemini 3 Flash agent prompts (7 agents) rewritten per Google Gemini 3 prompting guide | Gemini 3 prompting guide strategies documented below with XML section patterns |
| PE-05 | Confidence/conclusion vocabulary standardized across all agent prompts | 6-level scale defined; mapping to 3-level Zod enum documented; current inconsistencies catalogued |
| PE-06 | Each prompt rewrite verified with eval run (no regression) | Modified per user decision: single final eval run after all 12 rewrites |
| PE-07 | At least one production mode eval run per model family | SKIPPED per user decision -- testing mode only |

</phase_requirements>

## Agent Inventory and Template Injection Map

### GPT-5-mini Agents (5 total)

| File | Agent Role | Template Slots | Key Characteristics |
|------|-----------|---------------|---------------------|
| `01-structured-problem-extractor-instructions.ts` | Extractor | None | Parses raw text to JSON; must output strict schema |
| `03a-rule-tester-instructions.ts` | Tester | None | Tests single rule against dataset; tool-calling |
| `03a-sentence-tester-instructions.ts` | Tester | None | Translates single sentence; tool-calling |
| `03a2-verifier-feedback-extractor-instructions.ts` | Extractor | None | Parses natural language to JSON feedback |
| `03b2-rules-improvement-extractor-instructions.ts` | Extractor | None | Parses natural language to JSON rules |

### Gemini 3 Flash Agents (7 total)

| File | Agent Role | Template Slots | Key Characteristics |
|------|-----------|---------------|---------------------|
| `02-dispatcher-instructions.ts` | Reasoning | None | Generates perspectives for exploration |
| `02-improver-dispatcher-instructions.ts` | Reasoning | None | Gap analysis for improvement rounds |
| `02-initial-hypothesizer-instructions.ts` | Reasoning | `{{RULES_TOOLS_INSTRUCTIONS}}`, `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` | Core hypothesis generation; heavy tool use |
| `02-synthesizer-instructions.ts` | Reasoning | `{{RULES_TOOLS_INSTRUCTIONS}}`, `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` | Merges competing rulesets; tool use |
| `03a-verifier-orchestrator-instructions.ts` | Reasoning | None | Systematic rule/sentence testing orchestration |
| `03b-rules-improver-instructions.ts` | Reasoning | `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` | Revises rules from feedback; tool use |
| `04-question-answerer-instructions.ts` | Reasoning | None | Applies rules to answer questions; JSON output |

## GPT-5-mini Prompting Strategies

Sources: [OpenAI GPT-5 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide), [GPT-5.2 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-2_prompting_guide)

### Core Principles (HIGH confidence)

1. **Static-first structure with XML scaffolding**: Use XML-style section tags (`<output_verbosity_spec>`, `<constraints>`, etc.) to create unambiguous instruction boundaries. GPT-5 follows these precisely.

2. **Explicit JSON schema descriptions**: Always provide the JSON shape upfront. For missing fields: "set to null rather than guessing." Distinguish required vs optional fields explicitly.

3. **Literal instruction-following**: GPT-5 has "surgical precision" in instruction adherence. Contradictions cause reasoning waste (the model spends tokens trying to reconcile them). Resolve all conflicting directives explicitly.

4. **CTCO pattern**: Context (role + background) -> Task (single atomic action) -> Constraints (negative constraints, scope limits) -> Output (exact format with schema).

5. **Minimize reasoning overhead for extraction**: For extraction/formatting tasks, use `reasoning_effort: low` patterns in prompts: "Directly output the result without preamble." Avoid over-encouraging exploration.

6. **Tool description clarity**: Describe tools crisply in 1-2 sentences (what + when). GPT-5 naturally parallelizes tool calls when prompted.

### Role-Specific Adaptation

**For Extractors (problem extractor, verifier feedback extractor, rules improvement extractor):**
- Lead with JSON schema shape before any instructions
- Use "extraction completeness" directive: re-scan for omissions before finalizing
- Set missing fields to null rather than guessing
- Grounding principle: "Only extract information explicitly stated in the input"
- Anti-drift: "Implement EXACTLY and ONLY what is requested"

**For Testers (rule tester, sentence tester):**
- Crisp tool descriptions: 1-2 sentences for what + when to use
- Clear success/failure criteria with enum-style statuses
- Structured output sections matching the JSON schema
- "Quote exact evidence" directive for grounding

### Anti-Patterns to Avoid with GPT-5-mini
- Contradictory instructions (causes reasoning token waste)
- Over-encouraging context gathering (triggers unnecessary exploration)
- Narrative instruction style (prefer concrete scoped directives)
- Global markdown formatting without semantic specificity
- Vague stop conditions

## Gemini 3 Flash Prompting Strategies

Sources: [Gemini 3 Prompting Guide (Vertex AI)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide), [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3), [Philschmid Gemini 3 Practices](https://www.philschmid.de/gemini-3-prompt-practices)

### Core Principles (HIGH confidence)

1. **XML-delimited sections**: Use XML tags (`<role>`, `<context>`, `<task>`, `<rules>`, `<constraints>`, `<output>`) to create unambiguous boundaries. Choose XML OR Markdown consistently -- do not mix formats within a prompt.

2. **Concise, direct instructions**: "Gemini 3 responds best to direct, clear instructions." Avoid verbose prompt engineering; the model "may over-analyze" such techniques. Default behavior is less verbose and prefers direct, efficient answers.

3. **Data-before-instructions ordering**: "Place your specific instructions or questions at the end of the prompt, after the data context." Anchor reasoning with "Based on the information above..."

4. **No temperature overrides**: Keep temperature at default 1.0. "Gemini 3's reasoning capabilities are optimized for the default temperature setting." Lowering temperature causes "looping or degraded performance."

5. **Constraint placement**: Place behavioral constraints and role definitions in System Instruction or at the very top. Place critical restrictions as the FINAL line to ensure they anchor the model's behavior.

6. **No chain-of-thought scaffolding**: Gemini 3 has built-in thinking capabilities via `thinking_level` parameter. Explicit step-by-step scaffolding in prompts is unnecessary and may cause over-analysis. Use `<planning_process>` section for structured decomposition if needed, but keep it minimal.

### Recommended XML Tag Structure

```xml
<role>
[Agent identity and expertise]
</role>

<context>
[Problem data, dataset, previous results -- placed BEFORE instructions]
</context>

<task>
[Core task description -- direct and concise]
</task>

<rules>
[Behavioral rules and constraints]
</rules>

<output>
[Output format specification]
</output>

<constraints>
[Final critical restrictions -- placed LAST for emphasis]
</constraints>
```

### Anti-Patterns to Avoid with Gemini 3 Flash
- Mixing XML and Markdown formatting styles in the same prompt
- Placing instructions before large data blocks (reverses recommended order)
- Lowering temperature from default 1.0
- Broad negative constraints like "do not infer" alone (causes over-indexing)
- Verbose prompt engineering techniques (the model over-analyzes them)
- Explicit chain-of-thought scaffolding (built-in thinking handles this)

## Confidence Scale Integration

### The Constraint: Zod Schema vs Prompt Language

The Zod schemas in `workflow-schemas.ts` enforce `z.enum(['HIGH', 'MEDIUM', 'LOW'])` for:
- `ruleSchema.confidence` (used by rule tools, extractors)
- `questionAnswerSchema.confidence` (used by question answerer)
- `perspectiveSchema.priority` (used by dispatchers -- different field, same enum)

**This is immutable without code changes.** The 6-level scale operates purely in prompt language.

### Mapping: 6-Level Scale to 3-Level Zod Enum

| Prompt-Level Label | Zod Enum | Criteria |
|--------------------|----------|----------|
| **well-supported** | HIGH | ALL examples work, no ambiguity, simple rule with no exceptions |
| **supported** | HIGH | 2+ examples align; minor gaps acceptable |
| **plausible** | MEDIUM | 1 clear example, or pattern works but complex with exceptions |
| **tentative** | MEDIUM | Partial pattern, gaps remain |
| **speculative** | LOW | Inferred, no direct example |
| **unsupported** | LOW | Contradicted by data or no evidence |

### Integration Strategy

Each agent prompt that deals with confidence should include this scale in its instructions, with the mapping to the output enum:

```
When assessing confidence, use this evidence-based scale:
- well-supported: ALL examples work, no ambiguity, simple rule. Output as HIGH.
- supported: 2+ examples align, minor gaps acceptable. Output as HIGH.
- plausible: 1 clear example, or complex with exceptions. Output as MEDIUM.
- tentative: Partial pattern, gaps remain. Output as MEDIUM.
- speculative: Inferred, no direct example. Output as LOW.
- unsupported: Contradicted by data or no evidence. Output as LOW.

Key: If even one example is ambiguous, the rule cannot be "well-supported".
Complexity and exceptions reduce confidence -- a rule with 5 exceptions is "plausible" at best.
```

### Agents Requiring Confidence Scale

| Agent | Current Confidence Usage | Change Needed |
|-------|-------------------------|---------------|
| Initial hypothesizer | 3-level (HIGH/MEDIUM/LOW) with guidelines | Replace with 6-level scale + Zod mapping |
| Rules improver | 3-level (HIGH/MEDIUM/LOW) with guidelines | Replace with 6-level scale + Zod mapping |
| Rules improvement extractor | Extracts 3-level from text | Update extraction guidance to handle 6-level language |
| Question answerer | 3-level for answer confidence | Replace with 6-level scale + Zod mapping |
| Dispatcher | Uses priority (HIGH/MEDIUM/LOW) | Different field -- no change to priority enum |
| Improver dispatcher | Uses priority (HIGH/MEDIUM/LOW) | Different field -- no change to priority enum |
| Verifier orchestrator | No confidence output (uses conclusion enum) | Add hedged assertion style to findings |
| Rule tester | Status enum, not confidence | No change to status enum |
| Sentence tester | Likelihood for suggestions (HIGH/MEDIUM/LOW) | Adapt terminology for suggestion likelihood |

### Conclusion Language Standardization

**Current state:** Mixed vocabulary across prompts:
- "with confidence" appears in hypothesizer, verifier, improver, question answerer preambles
- "feel confident" appears in rules improver
- No systematic hedged assertion pattern

**Target state:** Hedged assertions across all prompts. Replace unqualified assertions with evidence-qualified statements:
- INSTEAD OF: "I am confident that X is correct"
- USE: "X appears to hold based on examples 1-3, though example 4 is ambiguous"

## Shared Prompt Fragments

### Files That Are NOT Agent Instructions But Need Vocabulary Alignment

| File | Content | Change Needed |
|------|---------|---------------|
| `rules-tools-prompt.ts` | Shared rules tools instructions | Update confidence guidelines to 6-level scale |
| `vocabulary-tools-prompt.ts` | Shared vocabulary tools instructions | No confidence language -- no change needed |

The rules-tools-prompt contains a 3-level confidence scale in its guidelines section:
```
HIGH: Consistent across multiple examples, no counter-examples
MEDIUM: Supported by some examples, minor exceptions possible
LOW: Based on limited data or has known exceptions
```

This must be updated to use the 6-level scale with Zod mapping, since it's injected via `{{RULES_TOOLS_INSTRUCTIONS}}` into hypothesizer, synthesizer, and improver agents.

## Architecture Patterns

### Pattern 1: GPT-5-mini Extractor Prompt Structure

```typescript
export const EXAMPLE_EXTRACTOR_INSTRUCTIONS = `
<role>
You are a specialized JSON extraction agent for [specific domain].
</role>

<grounding>
You are strictly grounded to the input text. Only extract information that is
explicitly stated -- do not add, interpret, or hallucinate content.
</grounding>

<input_format>
[Description of what input looks like]
</input_format>

<output_schema>
{
  "field1": "string",
  "field2": "string | null",
  "field3": ["string"]
}

Set missing fields to null rather than guessing.
</output_schema>

<extraction_rules>
1. [Specific rule]
2. [Specific rule]
</extraction_rules>

<constraints>
- Extract ONLY information explicitly present in the input
- Return ONLY the JSON object
- Do not add interpretation beyond what is stated
</constraints>
`.trim();
```

### Pattern 2: GPT-5-mini Tester Prompt Structure

```typescript
export const EXAMPLE_TESTER_INSTRUCTIONS = `
<role>
You are a specialized [domain] validator.
</role>

<task>
[Single atomic task description]
</task>

<input>
[What you will receive]
</input>

<process>
1. [Step]
2. [Step]
</process>

<output_format>
{
  "status": "ENUM_VALUE",
  "reasoning": "1-2 sentences with SPECIFIC evidence. Cite item IDs.",
  "recommendation": "Actionable fix. Empty if status is OK."
}
</output_format>

<constraints>
- [Critical constraint placed last]
</constraints>
`.trim();
```

### Pattern 3: Gemini 3 Flash Reasoning Agent Prompt Structure

```typescript
export const EXAMPLE_REASONING_INSTRUCTIONS = `
<role>
You are a [domain expert identity]. [1-2 sentences on expertise and approach.]
</role>

<task>
[Direct, concise task description. No verbose preamble.]
</task>

<rules>
[Behavioral rules -- concise, numbered]
</rules>

<output>
[Output format -- what to produce, how to structure it]
</output>

<constraints>
[Critical constraints placed LAST for emphasis]
- Base analysis ONLY on evidence from the provided data
- [Other non-negotiable constraints]
</constraints>
`.trim();
```

### Pattern 4: Gemini 3 Flash Agent with Template Injection

Template slots (`{{PLACEHOLDER}}`) must remain exactly as-is. XML tags wrap around them:

```typescript
export const EXAMPLE_WITH_TEMPLATES = `
<role>
[Agent identity]
</role>

<task>
[Task description]
</task>

<tools>
{{RULES_TOOLS_INSTRUCTIONS}}

{{VOCABULARY_TOOLS_INSTRUCTIONS}}
</tools>

<process>
[Analysis methodology]
</process>

<output>
[Output format]
</output>

<constraints>
[Critical constraints LAST]
</constraints>
`.trim();
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prompt templating | Custom template engine | Existing `{{placeholder}}` string replacement | Already works, zero code changes mandate |
| Confidence mapping | Runtime enum translator | Prompt-level mapping instructions | Zod schema is immutable this phase |
| Eval regression detection | Manual score comparison | `npm run eval -- --comparison` output | Already compares workflow vs zero-shot |

## Common Pitfalls

### Pitfall 1: Breaking Template Injection
**What goes wrong:** Restructuring prompts that contain `{{RULES_TOOLS_INSTRUCTIONS}}` or `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` placeholders can move or damage them.
**Why it happens:** Template slots look like content and get accidentally reworded or removed during rewrite.
**How to avoid:** Identify template slots FIRST in each file. Place them inside a dedicated `<tools>` XML section. Verify slots survive via grep after rewrite.
**Warning signs:** TypeScript compiles fine but agents fail at runtime with missing tool context.

### Pitfall 2: Confidence Scale/Zod Mismatch
**What goes wrong:** Agents produce 6-level labels (e.g., "well-supported") in their structured JSON output, but Zod validation expects HIGH/MEDIUM/LOW.
**Why it happens:** Prompt tells agent to use 6-level scale without clarifying that JSON output fields must use the 3-level enum.
**How to avoid:** Every confidence scale section must include the explicit mapping: "Output as HIGH/MEDIUM/LOW in the confidence field."
**Warning signs:** Zod validation errors at runtime; structured output parsing failures.

### Pitfall 3: Over-Structuring GPT-5-mini Prompts
**What goes wrong:** Adding too much XML scaffolding to GPT-5-mini extraction prompts causes the model to spend reasoning tokens parsing structure rather than extracting content.
**Why it happens:** Applying reasoning-agent patterns to extraction tasks.
**How to avoid:** For extractors, keep structure minimal: schema up front, grounding principle, extraction rules, constraints. No elaborate process sections.
**Warning signs:** Increased latency on extraction steps; verbose preambles in output.

### Pitfall 4: Verbose Gemini 3 Flash Prompts
**What goes wrong:** Gemini 3 "may over-analyze" verbose prompt engineering techniques, leading to less focused output.
**Why it happens:** Importing heavy prompt patterns from other models.
**How to avoid:** Keep Gemini prompts concise and direct. Use XML tags for structure, not for padding. Cut unnecessary sections.
**Warning signs:** Model output becomes unfocused or over-hedged.

### Pitfall 5: Mixing XML and Markdown in Gemini Prompts
**What goes wrong:** Using XML tags for some sections and Markdown headers for others confuses the model's parsing.
**Why it happens:** Partial migration from current Markdown-style prompts.
**How to avoid:** For Gemini agents, convert ALL section markers to XML tags. Use Markdown only inside content (bold, lists, code blocks).
**Warning signs:** Model ignores some sections or mixes output formats.

### Pitfall 6: Losing the "Grounding Principle" in Extractors
**What goes wrong:** Removing the existing grounding directive ("strictly grounded to the input text") during rewrite.
**Why it happens:** Focusing on structural changes and overlooking critical behavioral directives.
**How to avoid:** Audit each rewrite for preservation of key behavioral directives. The grounding principle is essential for extractors.
**Warning signs:** Extractors start hallucinating content not in input.

## Code Examples

### Current vs Rewritten: GPT-5-mini Extractor Pattern

**Current pattern** (verifier feedback extractor):
```typescript
// Uses Markdown headers: # Input Format, # Output Format, # Extraction Guidelines
// Long narrative sections
// Example embedded inline
```

**Target pattern:**
```typescript
export const VERIFIER_FEEDBACK_EXTRACTOR_INSTRUCTIONS = `
<role>
You are a JSON extraction agent. Parse verification feedback text into structured JSON.
</role>

<grounding>
Extract ONLY information explicitly stated in the input. Do not add, interpret,
or hallucinate content. Preserve exact wording and citations.
</grounding>

<output_schema>
{
  "fullExplanation": "string - detailed narrative of testing results",
  "rulesTestedCount": "number - count of rules tested",
  "errantRules": ["string - rule titles that failed"],
  "sentencesTestedCount": "number - count of sentences tested",
  "errantSentences": ["string - sentence IDs like #1, Q2"],
  "issues": [{"title": "string", "description": "string", "recommendation": "string"}],
  "missingRules": [{"pattern": "string", "suggestedRule": "string", "evidence": ["string"]}],
  "topRecommendations": ["string - ranked by impact"],
  "conclusion": "ALL_RULES_PASS | NEEDS_IMPROVEMENT | MAJOR_ISSUES"
}

Set missing arrays to []. For conclusion, infer from overall tone.
</output_schema>

<extraction_rules>
[Numbered extraction rules]
</extraction_rules>

<example>
[Input/output example]
</example>

<constraints>
- Extract ALL information regardless of formatting
- Preserve exact wording and evidence citations
- Return ONLY the JSON object
</constraints>
`.trim();
```

### Current vs Rewritten: Gemini 3 Flash Reasoning Agent

**Current pattern** (verifier orchestrator):
```typescript
// Uses Markdown headers: # Core Reasoning Principles, # Your Mission, etc.
// Verbose step-by-step scaffolding
// Long process sections
```

**Target pattern:**
```typescript
export const VERIFIER_ORCHESTRATOR_INSTRUCTIONS = `
<role>
You verify a solution to a Linguistics Olympiad problem by systematically testing
every rule and every sentence against the dataset.
</role>

<task>
Test ALL rules individually, then test ALL sentences (dataset + questions) for
translation accuracy. Aggregate findings into structured feedback.
</task>

<tools>
testRule: Test a single rule against the dataset. Provide title and description.
testSentence: Test a single sentence translation. Provide id, content, languages.
</tools>

<rules>
1. Test EVERY rule, one by one. Skip nothing.
2. Test EVERY sentence in the dataset and questions.
3. For bidirectional problems, test each sentence BOTH directions.
4. Quote exact tool outputs in feedback. Do not paraphrase.
5. Retry once on transient errors. On persistent failure, log and continue.
</rules>

<evidence_assessment>
[6-level confidence scale with hedged assertion style]
</evidence_assessment>

<output>
Structure your output with these required sections:
[Section list -- concise]
</output>

<constraints>
- Be EXHAUSTIVE -- test everything, skip nothing
- Report tool results faithfully with specific examples
- Base all findings ONLY on tool output evidence
</constraints>
`.trim();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Heavy CoT scaffolding | Built-in thinking (Gemini 3) | Gemini 3 launch (2025) | Remove explicit step-by-step scaffolding |
| Markdown headers for structure | XML tags for section boundaries | GPT-5/Gemini 3 guides (2025-2026) | Both model families prefer XML-style delimiters |
| "Be helpful and thorough" directives | CTCO pattern (Context-Task-Constraints-Output) | GPT-5 guide (2025) | Structured atomic task descriptions |
| 3-level confidence (HIGH/MEDIUM/LOW) | 6-level evidence-based scale (prompt-level) | User decision (this phase) | More nuanced confidence assessment |
| Unqualified assertions | Hedged assertions with evidence references | User decision (this phase) | Reduces LLM overclaiming |

## Open Questions

1. **Rules-tools-prompt.ts modification scope**
   - What we know: This shared file contains a 3-level confidence scale and is injected into 3 agents via template
   - What's unclear: Whether to update it to 6-level or leave the Zod-aligned 3-level and handle mapping only in the host prompt
   - Recommendation: Update rules-tools-prompt to include the 6-level scale with Zod mapping, since it's the natural place agents encounter confidence guidance when using tools

2. **Vocabulary-tools-prompt.ts standardization**
   - What we know: This shared file has no confidence language
   - What's unclear: Whether hedged assertion style should be added to vocabulary tool guidance
   - Recommendation: No change needed -- vocabulary tools deal with factual entries, not confidence assessment

3. **Dispatcher priority vs confidence vocabulary**
   - What we know: Dispatchers use `priority: HIGH/MEDIUM/LOW` which is a different concept from rule confidence
   - What's unclear: Whether "priority" vocabulary should also be standardized
   - Recommendation: Leave priority vocabulary unchanged -- it describes exploration importance, not evidence strength

## Sources

### Primary (HIGH confidence)
- [OpenAI GPT-5 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide) - static-first structure, JSON schema, instruction hierarchy
- [OpenAI GPT-5.2 Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-2_prompting_guide) - CTCO pattern, extraction patterns, reasoning effort, tool calling
- [Gemini 3 Prompting Guide (Vertex AI)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide) - temperature, constraint placement, data ordering, thinking levels
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3) - thinking levels, structured output, function calling

### Secondary (MEDIUM confidence)
- [Philschmid Gemini 3 Practices](https://www.philschmid.de/gemini-3-prompt-practices) - XML tag patterns, system instruction templates, domain-specific patterns (verified against official docs)

### Codebase (HIGH confidence)
- All 12 instruction files read and analyzed
- `workflow-schemas.ts` Zod enums verified for confidence/priority constraints
- Template injection mechanism verified via agent files
- `rules-tools-prompt.ts` and `vocabulary-tools-prompt.ts` shared fragments analyzed

## Metadata

**Confidence breakdown:**
- GPT-5-mini strategies: HIGH - from official OpenAI guides, verified with multiple sources
- Gemini 3 Flash strategies: HIGH - from official Google docs, verified with multiple sources
- Confidence scale integration: HIGH - Zod constraint verified in codebase; mapping is straightforward
- Conclusion vocabulary standardization: HIGH - current usage audited via grep; clear before/after
- Template injection preservation: HIGH - mechanism verified in agent files

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (vendor guides are stable; models are frozen for this milestone)
