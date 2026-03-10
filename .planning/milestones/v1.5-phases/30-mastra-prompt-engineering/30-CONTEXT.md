# Phase 30: Mastra Prompt Engineering - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite all 12 Mastra agent prompts using model-specific best practices (GPT-5 guide for GPT-5-mini agents, Gemini 3 guide for Gemini Flash agents). Standardize confidence/conclusion vocabulary across all prompts. Verify with eval run after all rewrites. Pure prompt changes — zero code logic changes.

</domain>

<decisions>
## Implementation Decisions

### Rewriting order and verification
- Rewrite per model family: GPT-5-mini agents first (5 agents), then Gemini 3 Flash agents (7 agents)
- No baseline eval capture before starting — skip PE-01
- No intermediate eval runs between batches — single eval run at the end after all 12 prompts are rewritten
- Final eval in testing mode only — skip production mode verification
- No per-agent eval runs

### GPT-5-mini agent treatment (role-adapted)
- Apply GPT-5 prompting guide strategies adapted to each agent's role:
  - **Extractors** (problem extractor, verifier feedback extractor, rules improvement extractor): emphasize JSON schema clarity, output format precision
  - **Testers** (rule tester, sentence tester): emphasize tool use guidance, clear success/failure criteria
- Not a rigid template — learn strategies from the guide, apply selectively

### Gemini 3 Flash agent treatment
- Add XML-delimited sections to all 7 Gemini prompts (e.g., `<context>`, `<task>`, `<rules>`, `<output>`)
- Selectively adopt other Gemini guide strategies that fit — not a hard template
- 7 agents: dispatcher, improver-dispatcher, hypothesizer, synthesizer, verifier orchestrator, rules improver, question answerer

### Evidence-based confidence scale (6 levels)
Standardize across all 12 Mastra agent prompts. Asymmetric — more lower-confidence options to counteract LLM overclaiming:

1. **well-supported** — satisfies ALL examples with no ambiguity; rule is simple with no exceptions
2. **supported** — 2+ examples align; minor gaps acceptable
3. **plausible** — 1 clear example, or pattern works but rule is complex with exceptions
4. **tentative** — partial pattern, gaps remain
5. **speculative** — inferred, no direct example
6. **unsupported** — contradicted by data or no evidence

Key constraint: if even one example is ambiguous, the rule cannot be "well-supported". Complexity and exceptions reduce confidence (a rule with 5 exceptions is "plausible" at best).

### Conclusion language style
- Hedged assertions: agents make claims but always qualify them with evidence references
- Example: "X appears to hold based on examples 1-3, though example 4 is ambiguous"
- Avoid unqualified assertions like "The answer is X" or "I found that X"

### Vendor guide consultation
- Research phase should fetch current GPT-5 and Gemini 3 prompting guides via web search
- Use up-to-date vendor advice, not cached knowledge
- Adopt strategies selectively — learn principles, don't force a rigid template

### Template injection preservation
- Keep existing `{{placeholder}}` pattern for hypothesizer, synthesizer, and improver agents
- Rewrite the static instruction content around the template slots
- Template pattern was decided in Phase 28 and remains stable

### Claude's Discretion
- Specific prompt content and wording
- Which vendor guide strategies to adopt vs skip per agent
- Internal XML tag naming for Gemini prompts
- How to integrate the confidence scale into each agent's prompt naturally
- Order of agents within each model family batch

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `agent-factory.ts`: All 12 agents use `createWorkflowAgent()` — instructions passed as string or system message
- 12 instruction files (`*-instructions.ts`): each exports a single const string — clean rewrite targets
- `vocabulary-tools-prompt.ts`: shared prompt fragment injected into agents with vocabulary access

### Established Patterns
- Instructions are TypeScript string constants exported from `*-instructions.ts` files
- Two-agent chain pattern: reasoning agent (Gemini) → extraction agent (GPT-5-mini)
- Template injection: 3 agents use `{{placeholder}}` replacement before passing to factory
- All agents use `UnicodeNormalizer` input processor (handled by factory)

### Integration Points
- 12 instruction files to modify (one per agent)
- `vocabulary-tools-prompt.ts` — shared fragment, may need vocabulary standardization
- No code logic changes — only instruction string content changes

### Agent inventory
| File | Model | Role |
|---|---|---|
| `01-structured-problem-extractor-instructions.ts` | GPT-5-mini | Extractor |
| `03a-rule-tester-instructions.ts` | GPT-5-mini | Tester |
| `03a-sentence-tester-instructions.ts` | GPT-5-mini | Tester |
| `03a2-verifier-feedback-extractor-instructions.ts` | GPT-5-mini | Extractor |
| `03b2-rules-improvement-extractor-instructions.ts` | GPT-5-mini | Extractor |
| `02-dispatcher-instructions.ts` | Gemini 3 Flash | Reasoning |
| `02-improver-dispatcher-instructions.ts` | Gemini 3 Flash | Reasoning |
| `02-initial-hypothesizer-instructions.ts` | Gemini 3 Flash | Reasoning |
| `02-synthesizer-instructions.ts` | Gemini 3 Flash | Reasoning |
| `03a-verifier-orchestrator-instructions.ts` | Gemini 3 Flash | Reasoning |
| `03b-rules-improver-instructions.ts` | Gemini 3 Flash | Reasoning |
| `04-question-answerer-instructions.ts` | Gemini 3 Flash | Reasoning |

</code_context>

<specifics>
## Specific Ideas

- Confidence scale should actively discourage overclaiming — LLMs tend to report high confidence because they think that's what users want to hear. The scale is deliberately asymmetric with more lower-confidence levels.
- "Well-supported" is a high bar: ALL examples must work, no ambiguity, and the rule must be simple. A complex rule with exceptions can never be "well-supported" even if it technically covers every example.
- Hedged assertion style: "X appears to hold based on examples 1-3, though example 4 is ambiguous" — not "I am confident that X is correct."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 30-mastra-prompt-engineering*
*Context gathered: 2026-03-09*
