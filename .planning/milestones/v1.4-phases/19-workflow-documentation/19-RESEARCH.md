# Phase 19: Workflow Documentation - Research

**Researched:** 2026-03-07
**Domain:** Technical documentation / knowledge extraction from codebase
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single self-contained markdown file: `claude-code/PIPELINE.md`
- Pipeline-sequential organization: overview -> Step 1 -> Step 2 -> Step 3 -> Step 4
- Focus on what the solver does conceptually -- agents, prompts, tools, and how they relate
- No Mastra framework internals (no RequestContext, workflow state, step writers)
- Framework-agnostic language throughout ("shared state" not "RequestContext", "pipeline step" not "workflow step")
- Detailed prompt summaries for reasoning agents (hypothesizer, verifier orchestrator, improver, answerer)
- Lighter treatment for extraction agents -- "parses output of X into schema Y" with the schema included
- Inline TypeScript type definitions for each agent's input/output schemas
- Include the actual linguistic perspectives used by the multi-perspective dispatcher
- Document tool name, inputs, outputs, AND key behavioral details
- Vocabulary system fully documented: all 5 CRUD tools, how vocabulary is shared across agents, the prompt fragment pattern
- Committed vs draft tool variants explained (verifiers use committed rules, hypothesizer/improver test drafts before committing)
- Blind translation pattern documented (sentence tester translates without seeing expected answer)
- Document both test granularities: per-rule testing and per-sentence testing, with what each catches
- How the verifier orchestrator decides which tests to run
- Improvement strategy: how the improver receives failure feedback (errant rules, errant sentences, issues list) and revises rules
- All termination conditions: ALL_RULES_PASS -> skip to answer, max rounds hard cap, improvement stall behavior
- Primary audience: Claude Code Opus 4.6 agents (later phases will read this to reimplement)
- Technical reference style: dense, structured, factual. Sections with headers, bullet points, schemas
- Minimal prose -- every sentence carries information
- Include brief design rationale per key decision (why two-agent chains, why blind translation, etc.) to prevent agents from "optimizing away" important patterns

### Claude's Discretion
- Exact section headings and subsection breakdown within the pipeline-sequential structure
- How much of each system prompt to summarize vs which directives to include verbatim
- Whether to include a quick-reference summary table of all agents at the top

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOCS-01 | Document the current Mastra workflow pipeline in detail (steps, agents, data flow, prompts, tools) | Full pipeline analysis completed -- all 4 steps, 12 agents, 10 tools, all data flows mapped. Source files read in full. |
| DOCS-02 | Document each agent's role, inputs, outputs, and system prompt summary | All 12 agent instruction files read. Roles, tool registrations, and model assignments catalogued per agent. |
| DOCS-03 | Document the verification loop mechanics (iteration flow, pass/fail logic, improvement strategy) | Multi-perspective hypothesis step (02-hypothesize.ts, 1240 lines) analyzed in full. Loop structure: dispatch -> hypothesize (parallel) -> verify -> synthesize -> convergence check. Termination conditions identified. |
| DOCS-04 | Written as a reference markdown file in `claude-code/` for the new agents to reference | CONTEXT.md locks output to `claude-code/PIPELINE.md`. Directory does not yet exist (must be created). |
</phase_requirements>

## Summary

Phase 19 is a pure documentation phase -- no code changes, no infrastructure, no tests. The deliverable is a single markdown file (`claude-code/PIPELINE.md`) that describes the full Mastra solver pipeline in framework-agnostic language, written for consumption by Claude Code agents in later phases (20-24).

The research consisted of reading every source file in `src/mastra/workflow/` (37 files), the existing architecture document (`.planning/codebase/ARCHITECTURE.md`), and the existing workflow README. All agent instruction files, tool implementations, schema definitions, and step orchestration logic were analyzed to extract the information needed for the pipeline document.

The pipeline is more complex than the 4-step description in CLAUDE.md suggests. The actual structure is a multi-round loop: Step 1 (extraction) -> Step 2 (multi-round loop of dispatch -> parallel hypothesize -> verify each -> synthesize -> convergence check) -> Step 3 (answer). The "Step 3 verify/improve loop" described in CLAUDE.md is actually implemented as rounds within Step 2. This must be documented accurately.

**Primary recommendation:** Write the document by walking through the codebase step-by-step, translating framework-specific patterns into framework-agnostic descriptions, and including simplified TypeScript types inline.

## Standard Stack

This phase produces no code. No libraries are needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| N/A | N/A | No code artifacts | Documentation-only phase |

## Architecture Patterns

### Recommended Document Structure

Based on the CONTEXT.md decisions and the actual pipeline structure, the document should follow this outline:

```
claude-code/PIPELINE.md
├── Overview (pipeline summary, agent table)
├── Shared Concepts
│   ├── Two-Agent Chain pattern
│   ├── Vocabulary system (schema, tools, prompt fragment)
│   ├── Rules system (schema, tools, prompt fragment)
│   ├── Testing tools (committed vs draft, blind translation)
│   └── Data types (Rule, VocabularyEntry, StructuredProblem, etc.)
├── Step 1: Extract Structure
│   ├── Agent: Structured Problem Extractor
│   └── Input/output schemas
├── Step 2: Multi-Perspective Hypothesis Generation
│   ├── Round structure (dispatch -> hypothesize -> verify -> synthesize -> convergence)
│   ├── Agent: Perspective Dispatcher / Improver Dispatcher
│   ├── Agent: Initial Hypothesizer (per perspective)
│   ├── Agent: Verifier Orchestrator + Feedback Extractor (per perspective)
│   ├── Agent: Hypothesis Synthesizer
│   ├── Convergence verification
│   └── Termination conditions
├── Step 3: Answer Questions
│   └── Agent: Question Answerer
└── Appendix: Complete Schemas
```

### Pattern 1: Content Extraction from Instruction Files

**What:** Each `*-instructions.ts` file exports a template literal string containing the agent's system prompt. Some use `{{PLACEHOLDER}}` syntax that gets replaced with tool instruction fragments at agent creation time.

**When to apply:** When writing prompt summaries for the PIPELINE.md document.

**Key observation:** The hypothesizer and improver instructions include `{{RULES_TOOLS_INSTRUCTIONS}}` and `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` placeholders. The synthesizer includes both. These are injected at agent definition time, not at runtime. The pipeline document should summarize the full injected prompt, not the template.

### Pattern 2: Pipeline Step Mapping

**What:** The codebase has 3 workflow steps, but the conceptual pipeline has more stages:

| Codebase Step | Conceptual Stage |
|---------------|-----------------|
| `01-extract` (extractionStep) | Step 1: Extract Structure |
| `02-hypothesize` (multiPerspectiveHypothesisStep) | Step 2: Multi-perspective loop (dispatch, hypothesize, verify, synthesize, convergence) |
| `03-answer` (answerQuestionsStep) | Step 3: Answer Questions |

**Key insight:** The verify/improve loop from CLAUDE.md is actually implemented as "rounds" within the `multiPerspectiveHypothesisStep`. Each round has 5 sub-phases: (a) dispatch perspectives, (b) run hypothesizers in parallel, (c) verify each perspective, (d) synthesize best rules, (e) convergence check. If convergence fails, a new round starts with an improver-dispatcher replacing the initial dispatcher.

### Pattern 3: Agent Classification

Based on codebase analysis, agents fall into three categories:

| Category | Agents | Model | Pattern |
|----------|--------|-------|---------|
| Reasoning agents | Hypothesizer, Verifier Orchestrator, Improver (via Improver Dispatcher), Synthesizer, Answerer, Perspective Dispatcher, Improver Dispatcher | Gemini 3 Flash | Full prompt summaries needed |
| Extraction agents | Structured Problem Extractor, Hypothesis Extractor (deprecated), Feedback Extractor, Improvement Extractor | GPT-5-mini | Lighter treatment -- "parses X into schema Y" |
| Sub-agents (via tools) | Rule Tester, Sentence Tester | GPT-5-mini | Called by tools, not directly by steps |

### Anti-Patterns to Avoid
- **Documenting framework internals:** CONTEXT.md explicitly excludes RequestContext, workflow state, step writers. Use framework-agnostic language.
- **Copying code verbatim:** TypeScript types should be simplified clean interfaces, not raw Zod definitions with `.describe()` chains.
- **Over-documenting extraction agents:** These are mechanical JSON parsers. One paragraph each with the target schema inline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema documentation | Manually rewrite all Zod schemas as TypeScript | Extract simplified interfaces from `workflow-schemas.ts` | 12 interconnected schemas; manual rewriting risks divergence |

**Key insight:** The schemas in `workflow-schemas.ts` are the single source of truth. The PIPELINE.md should contain simplified TypeScript interfaces derived from them, not the raw Zod code.

## Common Pitfalls

### Pitfall 1: Confusing the Old and New Pipeline Structure
**What goes wrong:** CLAUDE.md describes a 4-step pipeline (extract, hypothesize, verify/improve loop, answer). The actual code has 3 steps with a multi-round multi-perspective loop in Step 2.
**Why it happens:** The pipeline evolved from a simple sequential design to a multi-perspective approach. CLAUDE.md was not updated to reflect this.
**How to avoid:** Document the actual code structure (3 steps, multi-round loop in Step 2). The CONTEXT.md says "overview -> Step 1 -> Step 2 -> Step 3 -> Step 4" but the actual structure is 3 steps. Must reconcile: document the conceptual pipeline as the user expects (4 logical stages) but explain that verification/improvement happens within the hypothesis generation loop.
**Warning signs:** Confusion about where verification happens, missing the synthesis step entirely.

### Pitfall 2: Missing the Dual Dispatch Mechanism
**What goes wrong:** Round 1 uses `perspective-dispatcher` agent. Round 2+ uses `improver-dispatcher` agent. These are different agents with different inputs and purposes.
**Why it happens:** They share similar output schemas but serve different functions.
**How to avoid:** Document both agents clearly, noting when each is used and what additional inputs the improver-dispatcher receives (current rules, vocabulary, test results, previous perspective IDs).

### Pitfall 3: Conflating Per-Perspective Verification with Convergence Verification
**What goes wrong:** There are TWO verification passes per round: (1) per-perspective verification of each draft store, (2) convergence verification of the synthesized/merged rules. Both use the same verifier-orchestrator agent but with different inputs.
**Why it happens:** Same agent used for both, but context differs.
**How to avoid:** Document both verification passes explicitly. Per-perspective verification scores individual hypotheses. Convergence verification tests the synthesized result. The convergence conclusion determines whether to continue iterating.

### Pitfall 4: Overlooking the Draft Store Mechanism
**What goes wrong:** Each perspective operates on its own isolated rules/vocabulary store (DraftStore). The synthesizer merges these into a main store. Without documenting this, agents reimplementing the pipeline won't understand isolation.
**Why it happens:** The mechanism uses RequestContext (framework-specific), which must be translated to framework-agnostic language.
**How to avoid:** Document as "each perspective maintains isolated rules and vocabulary. After verification, a synthesis step merges the best results into a shared store."

### Pitfall 5: Missing the Tool Registration Pattern
**What goes wrong:** Different agents get different tool variants. Hypothesizer and Improver get `testRuleWithRuleset`/`testSentenceWithRuleset` (draft testing). Verifier gets `testRule`/`testSentence` (committed testing). Getting this wrong breaks the testing isolation.
**Why it happens:** The variants look similar but read rules from different sources.
**How to avoid:** Document a clear table showing which agent gets which tools and why.

## Code Examples

These are the key data structures that need to appear as simplified TypeScript interfaces in the pipeline document.

### Rule Schema (from workflow-schemas.ts)
```typescript
interface Rule {
  title: string;       // Short grouping title (e.g., "Verb agreement")
  description: string; // Detailed rule description with evidence
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

### Vocabulary Entry Schema (from vocabulary-tools.ts)
```typescript
interface VocabularyEntry {
  foreignForm: string; // The foreign morpheme or word
  meaning: string;     // English gloss
  type: string;        // Morpheme type (noun, verb-root, tense-marker, etc.)
  notes: string;       // Dataset references, allomorphs, restrictions
}
```

### Structured Problem (from workflow-schemas.ts)
```typescript
interface StructuredProblem {
  context: string;
  dataset: Array<{ id: string; [key: string]: string }>;
  questions: Array<{ id: string; type: string; input: string }>;
}
```

### Verifier Feedback (from workflow-schemas.ts)
```typescript
interface VerifierFeedback {
  fullExplanation: string;
  rulesTestedCount: number;
  errantRules: string[];           // Rule titles that failed
  sentencesTestedCount: number;
  errantSentences: string[];       // Sentence IDs that failed (e.g., "#3", "Q2")
  issues: Array<{
    title: string;
    description: string;
    recommendation: string;
  }>;
  missingRules: Array<{
    pattern: string;
    suggestedRule: string;
    evidence: string[];
  }>;
  topRecommendations: string[];
  conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
}
```

### Question Answer (from workflow-schemas.ts)
```typescript
interface QuestionAnswer {
  questionId: string;
  answer: string;
  workingSteps: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceReasoning: string;
  rulesApplied: string[];
}
```

### Perspective (from workflow-schemas.ts)
```typescript
interface Perspective {
  id: string;             // Kebab-case identifier
  name: string;           // Human-readable name
  linguisticAngle: string; // Detailed exploration instructions
  reasoning: string;      // Why this perspective is worth exploring
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

## Key Findings from Codebase Analysis

### Agent Count and Roles (12 agents total)

| # | Agent ID | Display Name | Model | Tools | Role |
|---|----------|-------------|-------|-------|------|
| 1 | `structured-problem-extractor` | [Step 1] Structured Problem Extractor | GPT-5-mini | None | Parse raw problem text into structured JSON |
| 2 | `perspective-dispatcher` | Perspective Dispatcher | Gemini 3 Flash | None | Analyze problem and generate linguistic perspectives for Round 1 |
| 3 | `improver-dispatcher` | Improver Dispatcher | Gemini 3 Flash | None | Gap analysis for Round 2+; generates new perspectives targeting weaknesses |
| 4 | `initial-hypothesizer` | [Step 2] Initial Hypothesizer | Gemini 3 Flash | vocabulary CRUD (5), rules CRUD (5), testRuleWithRuleset, testSentenceWithRuleset | Discover linguistic rules from a specific perspective |
| 5 | `hypothesis-synthesizer` | Hypothesis Synthesizer | Gemini 3 Flash | vocabulary CRUD (5), rules CRUD (5), testRuleWithRuleset, testSentenceWithRuleset | Merge multiple perspective rulesets into one coherent solution |
| 6 | `verifier-orchestrator` | [Step 3] Verifier Orchestrator | Gemini 3 Flash | testRule, testSentence | Systematically test every rule and sentence |
| 7 | `verifier-feedback-extractor` | Verifier Feedback Extractor | GPT-5-mini | None | Extract structured JSON feedback from verifier output |
| 8 | `rule-tester` | Rule Tester | GPT-5-mini | None | Test a single rule against dataset (called by testRule tool) |
| 9 | `sentence-tester` | Sentence Tester | GPT-5-mini | None | Translate a sentence blindly using rules (called by testSentence tool) |
| 10 | `rules-improver` | [Step 3b] Rules Improver | Gemini 3 Flash | vocabulary CRUD (5), testRuleWithRuleset, testSentenceWithRuleset | (Legacy/alternate path) Revise rules based on verification feedback |
| 11 | `rules-improvement-extractor` | Rules Improvement Extractor | GPT-5-mini | None | (Legacy/alternate path) Extract revised rules JSON from improver output |
| 12 | `question-answerer` | [Step 4] Question Answerer | Gemini 3 Flash | None | Apply validated rules to answer questions |

**Note:** Agents 10-11 (rules-improver + extraction chain) represent the original verify/improve loop. In the current multi-perspective architecture, improvement happens via the improver-dispatcher generating targeted perspectives for the next round, rather than a dedicated improver agent. However, these agents are still registered and may be used.

### Tool Inventory (10 unique tools)

| Tool ID | Variant | Used By | Reads Rules From | Purpose |
|---------|---------|---------|-------------------|---------|
| `addVocabulary` | - | Hypothesizer, Synthesizer | N/A (writes) | Add new vocabulary entries |
| `updateVocabulary` | - | Hypothesizer, Synthesizer | N/A (writes) | Update existing vocabulary entries |
| `removeVocabulary` | - | Hypothesizer, Synthesizer | N/A (writes) | Remove vocabulary entries by foreignForm |
| `getVocabulary` | - | Hypothesizer, Synthesizer | N/A (reads) | Read all vocabulary entries |
| `clearVocabulary` | - | Hypothesizer, Synthesizer | N/A (writes) | Remove all vocabulary entries |
| `addRules` | - | Hypothesizer, Synthesizer | N/A (writes) | Add new rules |
| `updateRules` | - | Hypothesizer, Synthesizer | N/A (writes) | Update existing rules by title |
| `removeRules` | - | Hypothesizer, Synthesizer | N/A (writes) | Remove rules by title |
| `getRules` | - | Hypothesizer, Synthesizer | N/A (reads) | Read all rules |
| `clearRules` | - | Hypothesizer, Synthesizer | N/A (writes) | Remove all rules |
| `testRule` | committed | Verifier Orchestrator | Shared state (committed) | Test one rule against dataset |
| `testRuleWithRuleset` | draft | Hypothesizer, Synthesizer | Parameter (draft ruleset) | Test one rule against dataset using draft rules |
| `testSentence` | committed | Verifier Orchestrator | Shared state (committed) | Blind-translate a sentence |
| `testSentenceWithRuleset` | draft | Hypothesizer, Synthesizer | Parameter (draft ruleset) | Blind-translate using draft rules |

### Multi-Round Loop Structure (from 02-hypothesize.ts)

```
for round = 1 to maxRounds (default 3, testing mode: max 2):

  a. DISPATCH
     Round 1: perspective-dispatcher generates N perspectives (default 3, testing: 2)
     Round 2+: improver-dispatcher does gap analysis, generates targeted perspectives

  b. HYPOTHESIZE (parallel)
     For each perspective (in parallel):
       - Create isolated draft store (rules + vocabulary)
       - Round 2+: initialize draft from current main store
       - Run initial-hypothesizer with perspective-specific prompt
       - Hypothesizer commits rules/vocabulary via tools to its draft store

  c. VERIFY (parallel)
     For each perspective (in parallel):
       - Run verifier-orchestrator with draft store's rules
       - Verifier calls testRule for each rule, testSentence for each sentence
       - Run verifier-feedback-extractor to get structured feedback
       - Compute testPassRate = 1 - (errantRules + errantSentences) / (rulesTestedCount + sentencesTestedCount)

  d. SYNTHESIZE
     - Programmatic vocabulary merge: iterate drafts worst-to-best, best perspective's entries win
     - Clear main rules store
     - Run hypothesis-synthesizer agent to merge rulesets (uses tools to write merged rules)
     - Synthesizer has access to test tools for conflict resolution

  e. CONVERGENCE CHECK
     - Run verifier-orchestrator again on synthesized/merged rules
     - Run verifier-feedback-extractor on convergence verification output
     - If conclusion == ALL_RULES_PASS: converged = true, break
     - Otherwise: clear draft stores, continue to next round

  f. CLEANUP
     - Clear all draft stores for next round

Output: final rules + vocabulary + verification metadata
```

### Termination Conditions

1. **Convergence:** Convergence verifier returns `ALL_RULES_PASS` -> loop exits, proceed to answer step
2. **Max rounds:** Loop reaches `effectiveMaxRounds` (default 3, testing mode max 2) -> uses best-so-far rules
3. **Improver returns no perspectives:** Round 2+ improver-dispatcher returns null/empty perspectives -> loop exits
4. **Abort signal:** External cancellation -> loop exits at next check point

### Design Rationale Summary (for inclusion in document)

| Decision | Rationale |
|----------|-----------|
| Two-agent chains (reasoning -> extraction) | Separates creative reasoning from structured data extraction. Each uses the model best suited to its task (Gemini Flash for reasoning, GPT-5-mini for extraction). |
| Blind sentence translation | Prevents the LLM from reverse-engineering expected answers. Agent translates without seeing the expected translation; comparison happens in code post-hoc. |
| Committed vs draft tool variants | Hypothesizers need to test rules they have not yet committed. Verifiers need to test the "official" committed rules. Using different tool variants enforces this isolation without complex state management. |
| Per-perspective isolation (draft stores) | Multiple hypothesizers exploring different linguistic angles must not interfere with each other's state. Isolated draft stores ensure independence. |
| Vocabulary as separate from rules | Rules describe patterns and mechanisms ("verbs take -ti suffix"); vocabulary maps individual morphemes ("kala = eat"). Separating them prevents rules from becoming vocabulary lists. |
| Multi-perspective + synthesis | Different linguistic angles catch different patterns. A single hypothesizer may miss phonological patterns while catching morphological ones. Exploring multiple perspectives in parallel and synthesizing produces more complete solutions. |
| Convergence check after synthesis | Per-perspective verification scores individual hypotheses, but the merged result may have conflicts or gaps not present in any single perspective. A separate convergence check validates the synthesis. |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential hypothesis -> verify -> improve loop | Multi-perspective dispatch -> parallel hypothesize -> verify -> synthesize loop | Recent (multi-perspective is current architecture) | Pipeline document must describe the multi-perspective architecture, not the legacy sequential one |
| Dedicated improver agent per iteration | Improver-dispatcher generates new perspectives for next round | Same transition | Improvement happens via fresh perspectives, not rule patching |
| 4 workflow steps | 3 workflow steps (verify/improve folded into hypothesis step) | Same transition | Document must explain the round-based structure within Step 2 |

## Open Questions

1. **Legacy agents (rules-improver, improvement-extractor, hypothesis-extractor)**
   - What we know: These agents are still registered in `src/mastra/workflow/index.ts` and their instruction files exist. The hypothesis-extractor file is marked DEPRECATED.
   - What's unclear: Whether they are still reachable in any code path in the current multi-perspective architecture.
   - Recommendation: Document the current multi-perspective pipeline only. Mention legacy agents briefly if they appear in agent registration, but do not document their prompt details. The Claude Code reimplementation should not include them.

2. **Pipeline step numbering discrepancy**
   - What we know: CLAUDE.md says 4 steps, CONTEXT.md says "overview -> Step 1 -> Step 2 -> Step 3 -> Step 4". The code has 3 steps.
   - What's unclear: Whether the user expects the document to present 4 logical stages (matching CLAUDE.md) or 3 actual steps (matching code).
   - Recommendation: Present as the user requested in CONTEXT.md (Step 1 through Step 4), but make it clear that Steps 2 and 3 (hypothesis + verification) are interleaved in a multi-round loop. This matches both the user's mental model and the code reality.

## Sources

### Primary (HIGH confidence)
- Source files in `src/mastra/workflow/` -- all 37 files read directly
- `workflow-schemas.ts` -- all schema definitions
- `02-hypothesize.ts` (1240 lines) -- complete multi-perspective loop logic
- All 12 agent instruction files -- system prompts read in full
- All tool implementations -- vocabulary (5), rules (5), rule tester, sentence tester

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md` -- high-level architecture overview (may be slightly stale vs code)
- `src/mastra/workflow/README.md` -- workflow documentation (reflects older pipeline structure)
- `CLAUDE.md` -- project instructions (pipeline description slightly outdated)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no libraries needed, documentation-only phase
- Architecture: HIGH -- all source files read, pipeline fully understood
- Pitfalls: HIGH -- identified from direct code analysis, not speculation

**Research date:** 2026-03-07
**Valid until:** No expiry -- codebase documentation, not library research
