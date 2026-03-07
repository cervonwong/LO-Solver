# LO-Solver Pipeline Reference

This document describes the complete solver pipeline for Linguistics Olympiad Rosetta Stone problems. It is the authoritative reference for reimplementation. The pipeline takes raw problem text as input and produces translated answers as output through four logical stages: extraction, multi-perspective hypothesis generation (with integrated verification and synthesis), legacy verify/improve (alternate path), and question answering.

## 1. Overview

### Pipeline Summary

The solver analyzes Linguistics Olympiad problems where a dataset of foreign-language sentences with English translations is provided, and the task is to translate new sentences. The pipeline:

1. **Extracts** the raw problem text into a structured format (context, dataset, questions)
2. **Generates hypotheses** about the language's rules from multiple linguistic perspectives in parallel, verifies each perspective, synthesizes the best results, and iterates until convergence or a round limit
3. **Verifies and improves** rules via a dedicated improver chain (legacy alternate path; primary improvement occurs via new perspectives in Step 2)
4. **Answers** the questions by applying the validated rules and vocabulary

### Agent Quick-Reference

| # | Agent ID | Model | Role | Tools |
|---|----------|-------|------|-------|
| 1 | `structured-problem-extractor` | GPT-5-mini | Parse raw problem text into structured JSON | None |
| 2 | `perspective-dispatcher` | Gemini 3 Flash | Generate linguistic perspectives for Round 1 | None |
| 3 | `improver-dispatcher` | Gemini 3 Flash | Gap analysis and targeted perspectives for Round 2+ | None |
| 4 | `initial-hypothesizer` | Gemini 3 Flash | Discover linguistic rules from a specific perspective | Vocabulary CRUD (5), Rules CRUD (5), `testRuleWithRuleset`, `testSentenceWithRuleset` |
| 5 | `hypothesis-synthesizer` | Gemini 3 Flash | Merge multiple perspective rulesets into one solution | Vocabulary CRUD (5), Rules CRUD (5), `testRuleWithRuleset`, `testSentenceWithRuleset` |
| 6 | `verifier-orchestrator` | Gemini 3 Flash | Systematically test every rule and sentence | `testRule`, `testSentence` |
| 7 | `verifier-feedback-extractor` | GPT-5-mini | Extract structured JSON feedback from verifier output | None |
| 8 | `rule-tester` | GPT-5-mini | Test a single rule against the dataset (sub-agent) | None |
| 9 | `sentence-tester` | GPT-5-mini | Blind-translate a sentence using rules (sub-agent) | None |
| 10 | `rules-improver` | Gemini 3 Flash | Revise rules based on verification feedback (legacy) | Vocabulary CRUD (5), `testRuleWithRuleset`, `testSentenceWithRuleset` |
| 11 | `rules-improvement-extractor` | GPT-5-mini | Extract revised rules JSON from improver output (legacy) | None |
| 12 | `question-answerer` | Gemini 3 Flash | Apply validated rules to answer questions | None |

### Data Flow

```
Raw Problem Text
       |
       v
[Step 1: Extract] --> StructuredProblem
       |
       v
[Step 2: Multi-Perspective Hypothesis Loop]
       |
       |  for round = 1 to maxRounds:
       |    (a) Dispatch perspectives
       |    (b) Hypothesize per perspective (parallel)
       |    (c) Verify per perspective (parallel)
       |    (d) Synthesize (merge vocabularies + rules)
       |    (e) Convergence check
       |    (f) Cleanup draft stores
       |
       v
  Rules + Vocabulary (validated)
       |
       v
[Step 4: Answer Questions] --> QuestionAnswer[]
```

---

## 2. Shared Concepts

### 2.1 Two-Agent Chain Pattern

Several pipeline stages use a two-agent chain: a **reasoning agent** (Gemini 3 Flash) generates natural language analysis, then an **extraction agent** (GPT-5-mini) parses that analysis into structured JSON conforming to a target schema.

**Used in:**
- Verification: `verifier-orchestrator` (reasoning) then `verifier-feedback-extractor` (extraction)
- Legacy improvement: `rules-improver` (reasoning) then `rules-improvement-extractor` (extraction)

**Design rationale:** Separating reasoning from extraction lets each model do what it does best. Gemini 3 Flash excels at creative linguistic reasoning; GPT-5-mini excels at precise structured data extraction. Combining both tasks in one model degrades output quality.

**Note:** The hypothesizer (`initial-hypothesizer`) and synthesizer (`hypothesis-synthesizer`) commit rules and vocabulary directly via tools rather than outputting natural language for extraction. They do not use the two-agent chain pattern.

### 2.2 Vocabulary System

Vocabulary entries map individual morphemes or words from the foreign language to their English glosses. Vocabulary is stored as a keyed map (`foreignForm` -> entry) in shared state, accessible to agents via five CRUD tools.

```typescript
interface VocabularyEntry {
  foreignForm: string; // The foreign morpheme or word (e.g., "kala", "-ti", "na-")
  meaning: string;     // English gloss (e.g., "eat", "past tense", "I/me")
  type: string;        // Morpheme type (noun, verb-root, tense-marker, etc.)
  notes: string;       // Dataset references, allomorphs, restrictions
}
```

#### Vocabulary Tools

| Tool | Input | Output | Behavior |
|------|-------|--------|----------|
| `addVocabulary` | `{ entries: VocabularyEntry[] }` | `{ added, skipped, total }` | Adds entries with new `foreignForm` keys; skips duplicates |
| `updateVocabulary` | `{ entries: VocabularyEntry[] }` | `{ updated, skipped, total }` | Overwrites entries matching by `foreignForm`; skips if key not found |
| `removeVocabulary` | `{ foreignForms: string[] }` | `{ removed, notFound, total }` | Deletes entries by `foreignForm` key |
| `getVocabulary` | `{}` | `{ entries: VocabularyEntry[], count }` | Reads all entries |
| `clearVocabulary` | `{}` | `{ removed }` | Deletes all entries |

#### Prompt Fragment Pattern

Agents that have vocabulary tool access receive a shared prompt fragment injected into their system prompt at agent creation time. The fragment describes:
- All five tools and when to use each
- The `VocabularyEntry` schema with field descriptions
- Morpheme type categories (noun, verb-root, tense-marker, aspect-marker, etc.)
- Guidelines: be atomic (one morpheme per entry), include allomorphs, cite evidence, distinguish homophones
- Directive to call `getVocabulary` at the end of the task to verify state

**Design rationale:** Vocabulary is separate from rules because rules describe patterns and mechanisms ("verbs take a -ti suffix for past tense") while vocabulary maps individual morphemes ("kala = eat"). Conflating them causes rules to degenerate into vocabulary lists, reducing their explanatory power.

### 2.3 Rules System

Rules describe linguistic patterns, grammar structures, and mechanisms discovered in the data. Rules are stored as a keyed map (`title` -> entry) in shared state.

```typescript
interface Rule {
  title: string;       // Short grouping title (e.g., "Verb agreement", "Noun cases")
  description: string; // Detailed rule description with evidence
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

#### Rules Tools

| Tool | Input | Output | Behavior |
|------|-------|--------|----------|
| `addRules` | `{ entries: Rule[] }` | `{ added, skipped, total }` | Adds rules with new `title` keys; skips duplicates |
| `updateRules` | `{ entries: Rule[] }` | `{ updated, skipped, total }` | Overwrites rules matching by `title`; skips if key not found |
| `removeRules` | `{ titles: string[] }` | `{ removed, notFound, total }` | Deletes rules by `title` key |
| `getRules` | `{}` | `{ rules: Rule[], count }` | Reads all rules |
| `clearRules` | `{}` | `{ removed }` | Deletes all rules |

#### Rules Prompt Fragment

Similar to the vocabulary prompt fragment, agents with rules tool access receive a shared prompt fragment describing:
- All five tools and when to use each
- The `Rule` schema with field descriptions
- Guidelines: rules describe patterns not vocabulary, be specific and testable, cite evidence, set confidence accurately, group related patterns by title
- Directive to call `getRules` at the end of the task to verify state

### 2.4 Testing Tools

Testing tools allow agents to validate rules and translations against the dataset. Each testing tool delegates to a dedicated sub-agent (`rule-tester` or `sentence-tester`) that performs the actual analysis.

There are two variants of each testing tool:

| Tool | Variant | Rules Source | Used By |
|------|---------|-------------|---------|
| `testRule` | committed | Reads from shared state (committed rules) | `verifier-orchestrator` |
| `testRuleWithRuleset` | draft | Accepts ruleset as parameter | `initial-hypothesizer`, `hypothesis-synthesizer`, `rules-improver` |
| `testSentence` | committed | Reads from shared state (committed rules) | `verifier-orchestrator` |
| `testSentenceWithRuleset` | draft | Accepts ruleset as parameter | `initial-hypothesizer`, `hypothesis-synthesizer`, `rules-improver` |

#### testRule / testRuleWithRuleset

Tests a single rule against the dataset by invoking the `rule-tester` sub-agent.

**Input (committed):** `{ title: string, description: string }`
**Input (draft):** `{ rule: Rule, ruleset: Rule[] }` -- the full draft ruleset provides context for how rules interact.

**Output:**
```typescript
// On success:
{
  success: true;
  status: 'RULE_OK' | 'RULE_WRONG' | 'RULE_INCONSISTENT'
        | 'RULE_UNCLEAR' | 'RULE_NEEDS_UPDATE' | 'RULE_NEW_NEEDED';
  reasoning: string;      // 1-2 sentences with evidence from dataset
  recommendation: string; // Actionable fix; empty if RULE_OK
}
// On error:
{ success: false; error: string }
```

The `rule-tester` sub-agent receives the full ruleset with the target rule highlighted via `>>>` markers. It checks the rule against all relevant dataset examples, looking for contradictions, edge cases, and conflicts with other rules.

#### testSentence / testSentenceWithRuleset

Tests translation of a single sentence by invoking the `sentence-tester` sub-agent.

**Input (committed):** `{ id: string, content: string, sourceLanguage: string, targetLanguage: string, expectedTranslation?: string }`
**Input (draft):** Same fields plus `ruleset: Rule[]`.

**Output:**
```typescript
// On success:
{
  success: true;
  canTranslate: boolean;
  translation: string;              // Best-attempt translation
  matchesExpected: boolean | null;   // Post-hoc comparison result (null if no expected)
  expectedTranslation: string | null;
  ambiguities: string[];            // Points of ambiguity found
  suggestions: Array<{
    suggestion: string;
    likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning: string;
  }>;
  overallStatus: 'SENTENCE_OK' | 'SENTENCE_AMBIGUOUS' | 'SENTENCE_UNTRANSLATABLE';
}
// On error:
{ success: false; error: string }
```

#### Blind Translation Pattern

The sentence tester performs **blind translation**: the sub-agent translates the sentence using only the provided rules and vocabulary, without seeing the expected answer. After the agent produces its translation, the tool performs a post-hoc string comparison (with normalization) between the agent's translation and the expected translation.

**Design rationale:** Blind translation prevents the LLM from reverse-engineering the expected answer and then rationalizing why the rules produce it. By never showing the expected output to the translating agent, the test genuinely validates whether the rules are sufficient for deterministic translation.

#### Committed vs Draft Variants

**Design rationale:** Hypothesizers need to test rules they have not yet committed to shared state. Verifiers need to test the "official" committed rules. Using different tool variants enforces this isolation: draft tools accept the ruleset as a parameter so agents can test before committing, while committed tools read from shared state so verifiers always test the canonical rules.

### 2.5 Draft Store Isolation

During multi-perspective hypothesis generation, each perspective operates on its own **isolated draft store** containing independent rules and vocabulary. This prevents multiple hypothesizers exploring different linguistic angles from interfering with each other's state.

After verification scores each perspective, a synthesis step merges the best results from all draft stores into the shared (main) store. Draft stores are cleared between rounds.

**Design rationale:** Multiple hypothesizers exploring different linguistic angles (e.g., morphological vs. phonological) must not interfere with each other. Isolated draft stores ensure each perspective can freely add, modify, and remove rules and vocabulary without affecting other perspectives or the main store.

### 2.6 Core Data Types

#### StructuredProblem

The output of Step 1 extraction, used as input throughout the pipeline.

```typescript
interface StructuredProblem {
  context: string;  // Linguistic, grammatical, and orthographic notes
  dataset: Array<{
    id: string;         // Sequential ID ("#1", "#2", ...)
    [key: string]: string; // Variable fields (e.g., foreignForm, english)
  }>;
  questions: Array<{
    id: string;    // Sequential ID ("Q1", "Q2", ...)
    type: string;  // Task type (e.g., "translate-to-english", "translate-to-target")
    input: string; // The phrase or sentence to process
  }>;
}
```

#### VerifierFeedback

Structured output from the verifier feedback extractor, describing test results.

```typescript
interface VerifierFeedback {
  fullExplanation: string;         // Narrative of testing results
  rulesTestedCount: number;
  errantRules: string[];           // Rule titles that failed
  sentencesTestedCount: number;
  errantSentences: string[];       // Sentence IDs that failed (e.g., "#3", "Q2")
  issues: Array<{
    title: string;
    description: string;           // Cites affected rules and sentences
    recommendation: string;        // Actionable fix
  }>;
  missingRules: Array<{
    pattern: string;               // Pattern no existing rule explains
    suggestedRule: string;
    evidence: string[];            // Sentence IDs demonstrating the pattern
  }>;
  topRecommendations: string[];    // Up to 5 fixes ranked by impact
  conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
}
```

#### QuestionAnswer

Individual answer produced by the question answerer.

```typescript
interface QuestionAnswer {
  questionId: string;              // e.g., "Q1"
  answer: string;                  // Final translated phrase
  workingSteps: string;            // Step-by-step derivation with morpheme breakdown
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceReasoning: string;
  rulesApplied: string[];          // Titles of rules used
}
```

#### Perspective

A linguistic angle for a hypothesizer to explore, produced by dispatcher agents.

```typescript
interface Perspective {
  id: string;              // Kebab-case identifier (e.g., "verb-morphology")
  name: string;            // Human-readable name
  linguisticAngle: string; // Detailed exploration instructions for the hypothesizer
  reasoning: string;       // Why this perspective is worth exploring
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

---

## 3. Step 1: Extract Structure

**Agent:** `structured-problem-extractor` (GPT-5-mini)

Parses raw Linguistics Olympiad problem text into a structured JSON representation. This is a single-agent step with no two-agent chain -- the extraction agent directly produces structured output conforming to the `StructuredProblem` schema.

**Input:** Raw problem text (string).

**Output:**
```typescript
{
  success: boolean;
  explanation: string;
  data: StructuredProblem | null;  // null if success is false
}
```

**Prompt summary:** The agent handles Rosetta Stone problems (foreign-language sentence pairs). It extracts three components:
- **Context**: Linguistic, grammatical, and orthographic notes relevant to solving the problem. Excludes trivia, demographics, and geography.
- **Dataset**: Complete pairs only (both foreign phrase and English translation present). IDs renumbered sequentially (#1, #2, ...). Items with missing translations are moved to questions.
- **Questions**: Explicit questions ("Translate...") and implicit questions (fill-in-the-blank items). IDs renumbered sequentially (Q1, Q2, ...). Question text copied verbatim -- the agent does not attempt to solve or translate.

The agent does not answer questions, does not translate, and does not hallucinate data not present in the input.

---

## 4. Step 2: Multi-Perspective Hypothesis Generation

This is the most complex stage of the pipeline. It runs a multi-round loop that dispatches linguistic perspectives, generates hypotheses in parallel, verifies each perspective, synthesizes the best results, and checks for convergence.

**Configuration defaults:**
- `maxRounds`: 3 (testing mode: 2)
- `perspectiveCount`: 3 (testing mode: 2)

### Round Structure

For each round (1 to `maxRounds`):

#### (a) Dispatch Perspectives

**Round 1** uses the `perspective-dispatcher` agent. **Round 2+** uses the `improver-dispatcher` agent.

##### perspective-dispatcher (Round 1)

**Agent:** `perspective-dispatcher` (Gemini 3 Flash). No tools.

**Input:** The `StructuredProblem` (context, dataset, questions) and the number of perspectives to generate.

**Output:**
```typescript
{
  success: boolean;
  explanation: string;
  perspectives: Perspective[] | null;
}
```

**Prompt summary:** The dispatcher is a linguistics expert that analyzes the problem data and generates distinct linguistic perspectives for exploration. It draws from a reference list of common Linguistics Olympiad patterns organized by category:

- **Phonological**: vowel harmony, consonant assimilation, tone patterns, sound changes
- **Morphological**: agglutination, affixation, reduplication, ablaut, clitics
- **Syntactic**: word order, modifier placement, question formation, relativization
- **Agreement**: person/number, gender, case marking, definiteness
- **Semantic/Pragmatic**: evidentiality, honorifics, classifiers, tense/aspect/mood, possession
- **Orthographic**: special characters, digraphs, writing conventions

Each perspective must be genuinely distinct (exploring a different linguistic dimension) and include a detailed `linguisticAngle` with enough specificity for an independent agent to work from. The number of perspectives generated matches the configured `perspectiveCount`.

##### improver-dispatcher (Round 2+)

**Agent:** `improver-dispatcher` (Gemini 3 Flash). No tools.

**Input:** The `StructuredProblem`, plus:
- Current rules (serialized JSON from the main store)
- Current vocabulary
- Test results (`VerifierFeedback` from the convergence check)
- Previous perspective IDs (to avoid regenerating already-explored angles)

**Output:**
```typescript
{
  success: boolean;
  explanation: string;
  gaps: Array<{ description: string; suggestedApproach: string }>;
  perspectives: Perspective[] | null;
}
```

**Prompt summary:** The improver-dispatcher performs gap analysis on a partially-solved problem. It follows a four-step process:

1. **Identify gaps**: Which dataset items and questions have no applicable rule? Which patterns are unaddressed?
2. **Identify weaknesses**: Which rules are errant and why? Which sentences fail? Are there systematic error clusters?
3. **Generate targeted perspectives**: Fresh angles not yet attempted, refinement of partially-correct approaches, or a "start over" perspective if the current approach is fundamentally flawed (only when `MAJOR_ISSUES` and most rules are errant).
4. **Prioritize**: HIGH for perspectives targeting unanswered questions, MEDIUM for patterns in data but not questions, LOW for speculative angles.

The improver-dispatcher must not regenerate previously explored perspectives (previous IDs are provided). If the current rules are nearly complete, it may return an empty perspectives array, signaling the loop should terminate.

#### (b) Hypothesize (Parallel)

For each perspective returned by the dispatcher, run in parallel:

1. **Create an isolated draft store** (rules + vocabulary) for this perspective
2. **Round 2+**: Initialize the draft store from the current main store (the hypothesizer starts with previously validated rules and vocabulary as a baseline)
3. **Run `initial-hypothesizer`** with the perspective's `linguisticAngle` injected into the prompt

**Agent:** `initial-hypothesizer` (Gemini 3 Flash).

**Tools:** Vocabulary CRUD (5) + Rules CRUD (5) + `testRuleWithRuleset` + `testSentenceWithRuleset` = 12 tools.

**Input:** JSON object containing:
- `perspective`: The `Perspective` object (id, name, linguisticAngle, priority)
- `vocabulary`: Current vocabulary entries (may be empty for Round 1)
- `context`: Problem context string
- `dataset`: The dataset array
- `questions`: The questions array

**Output:** The hypothesizer commits rules and vocabulary directly via tools. Its text output is reasoning only.

**Prompt summary:** The hypothesizer is an expert PhD linguist exploring the problem from the assigned perspective. Core reasoning principles:

1. **Logical order**: Process vocabulary before rules. Update vocabulary tools first, then formulate rules.
2. **Multiple hypotheses**: Generate at least one alternative interpretation for each significant pattern before committing.
3. **Abductive reasoning**: Look beyond obvious patterns -- consider phonological changes, null morphemes, different segmentation.
4. **Grounding**: Quote exact dataset item IDs when claiming a pattern exists.
5. **Completeness**: Check every relevant example before assigning HIGH confidence.
6. **Inhibit**: Draft rules mentally, then test with tools before committing.

The analysis process follows a structured sequence: segmentation and alignment, identifying recurring patterns, morphological analysis (affixes, roots, agglutination, agreement), syntactic analysis (word order, modifiers, questions, negation), phonological analysis (sound changes, spelling variations), validation and falsification (actively seek counterexamples), and generating competing hypotheses.

After analysis, the hypothesizer stores vocabulary via `addVocabulary`, stores rules via `addRules`, and verifies final state via `getRules` and `getVocabulary`. Before committing, it tests 2-3 critical sentences using `testRuleWithRuleset`/`testSentenceWithRuleset` and revises if tests fail.

**Confidence guidelines:**
- **HIGH**: Explicitly checked for contradictions in every relevant example, none found. Pattern is unambiguous and simple.
- **MEDIUM**: Overly complex or has edge cases suggesting the formulation may need refinement, or not yet verified against all examples.
- **LOW**: Hypothesized based on analogy or intuition. Evidence is weak or ambiguous.

#### (c) Verify (Parallel)

For each perspective, run in parallel:

1. **Run `verifier-orchestrator`** against the perspective's draft store rules
2. **Run `verifier-feedback-extractor`** to parse the verifier's natural language output into structured `VerifierFeedback`
3. **Compute `testPassRate`**:

```
testPassRate = 1 - (errantRules.length + errantSentences.length)
                   / (rulesTestedCount + sentencesTestedCount)
```

##### verifier-orchestrator

**Agent:** `verifier-orchestrator` (Gemini 3 Flash).

**Tools:** `testRule`, `testSentence` (committed variants).

**Prompt summary:** The verifier acts as a teacher checking a student's proposed solution. Core principles: test rules before sentences (rule failures provide context for sentence failures), test everything, quote exact tool outputs, retry once on transient errors.

**Systematic testing process:**

1. **Phase 1 -- Rule Testing**: Call `testRule` for each rule in the ruleset. Record status, reasoning, and recommendation for each.
2. **Phase 2 -- Sentence Testing**: Call `testSentence` for each dataset sentence, determining translation direction from context. For bidirectional problems, test both directions. Also test each question.
3. **Phase 3 -- Aggregation**: Count passed vs. failed rules and sentences. Identify clusters of related problems sharing a root cause. Detect missing rules (patterns no existing rule explains). Synthesize top recommendations.

**Output sections**: Testing Summary, Rule Testing Results (per-rule status), Sentence Testing Results (per-sentence), Issues Found (title, description with citations, recommendation), Missing Rules (pattern, suggested rule, evidence IDs), Top Recommendations (up to 5, ranked), Conclusion (`ALL_RULES_PASS` / `NEEDS_IMPROVEMENT` / `MAJOR_ISSUES`).

What each test granularity catches:
- **Per-rule testing**: Whether an individual rule is correct, consistent, and sufficient. Catches wrong rules, inconsistent rules, vague rules.
- **Per-sentence testing**: Whether the full ruleset can translate a complete sentence. Catches rule interaction problems, missing rules, and completeness gaps that no single rule test reveals.

##### verifier-feedback-extractor

**Agent:** `verifier-feedback-extractor` (GPT-5-mini). No tools.

Parses the natural language output from `verifier-orchestrator` into the `VerifierFeedback` schema. Strictly grounded to input text -- extracts only explicitly stated information, preserves exact wording and citations, does not hallucinate content. Uses reasonable defaults when fields cannot be extracted (empty arrays, estimated counts, tone-inferred conclusion).

#### (d) Synthesize

After all perspectives are verified, merge their draft stores into the main store.

**Two-phase merge:**

1. **Programmatic vocabulary merge** (code, not agent): Iterate through all perspective draft stores sorted by `testPassRate` (worst to best). For each perspective's vocabulary entries, write them to the main vocabulary store. When the same `foreignForm` key appears in multiple perspectives, the entry from the higher-scoring perspective wins because it is written last in the worst-to-best iteration order.

2. **Agent-based rules merge**: Clear the main rules store, then run `hypothesis-synthesizer` to merge rulesets.

##### hypothesis-synthesizer

**Agent:** `hypothesis-synthesizer` (Gemini 3 Flash).

**Tools:** Vocabulary CRUD (5) + Rules CRUD (5) + `testRuleWithRuleset` + `testSentenceWithRuleset` = 12 tools.

**Input:** JSON object containing:
- `structuredProblem`: The `StructuredProblem`
- `perspectiveResults`: Array of `PerspectiveResult` objects (one per perspective, with `testPassRate`, `verifierConclusion`, `rulesCount`, etc.)
- Per-perspective rules and vocabulary serialized as JSON

**Prompt summary:** The synthesizer merges multiple competing rulesets into a single coherent solution using score-weighted conflict resolution:

- **Same phenomenon**: Favor the rule from the higher-scoring perspective. If scores are within 0.1, compare rule specificity and evidence.
- **Complementary rules** (different phenomena): Include both, verify no contradiction.
- **Conflicting rules** (mutually exclusive): Check dataset support, favor higher pass rate, test both with tools if still ambiguous.

**Merging process:**
1. Clear rules store (`clearRules`)
2. Start with rules from the highest-scoring perspective as base
3. Add complementary rules from other perspectives
4. Resolve conflicts via score-weighted resolution
5. Refine vocabulary if rule merging reveals issues (`updateVocabulary`)
6. Validate with `testRuleWithRuleset`/`testSentenceWithRuleset` -- test conflict-resolved rules and sample sentences
7. Call `getRules` and `getVocabulary` to verify final state

The synthesizer's rules and vocabulary state (via tools) IS the output.

#### (e) Convergence Check

After synthesis, run `verifier-orchestrator` again on the merged/synthesized rules in the main store. Then run `verifier-feedback-extractor` on the convergence verification output.

Check the `conclusion` field of the resulting `VerifierFeedback`:
- If `ALL_RULES_PASS`: **converged** -- break the loop, proceed to Step 4.
- Otherwise: continue to the next round.

**Design rationale:** Per-perspective verification scores individual hypotheses, but the merged result may have conflicts or gaps not present in any single perspective. A separate convergence check validates the synthesis output to ensure the merge did not introduce problems.

#### (f) Cleanup

Clear all draft stores to prepare for the next round.

### Termination Conditions

The multi-round loop terminates when any of these four conditions is met:

1. **Convergence**: The convergence verifier returns `ALL_RULES_PASS`. The synthesized rules fully explain the dataset. Proceed to answer step.
2. **Max rounds reached**: The loop reaches `maxRounds` (default 3, testing mode 2). Uses the best-so-far rules.
3. **No perspectives generated**: Round 2+ improver-dispatcher returns null or empty perspectives, indicating no further exploration is needed. Loop exits.
4. **Abort signal**: External cancellation. Loop exits at the next check point.

---

## 5. Step 3: Verify & Improve (Legacy Path)

In the current multi-perspective architecture, verification and improvement happen within Step 2's multi-round loop. The dedicated verify/improve agents described here represent the original sequential pipeline and exist as an alternate code path.

### rules-improver

**Agent:** `rules-improver` (Gemini 3 Flash).

**Tools:** Vocabulary CRUD (5) + `testRuleWithRuleset` + `testSentenceWithRuleset` = 7 tools.

**Input:** Current rules (that failed verification), verification feedback (`VerifierFeedback`), and current vocabulary.

**Prompt summary:** The improver is a "Reviser PhD linguist" who critically analyzes the verifier's feedback and revises the ruleset. Core reasoning principles:

1. **Logical order**: Update vocabulary first if the issue involves word meanings or morpheme glosses.
2. **Abductive reasoning**: Consider alternative explanations -- wrong morpheme segmentation, phonological rules, null morphemes.
3. **Multiple hypotheses**: Always generate at least one alternative fix. For uncertain fixes, generate 2-3 alternatives.
4. **Adaptability**: Discard rules entirely if evidence shows they were wrong.
5. **Grounding**: Quote exact examples from the feedback.
6. **Persistence**: Test revised rules with tools; if tests fail, revise again (up to 2 iterations before committing).

The improver addresses every issue and missing rule in the feedback. It performs root cause analysis (asking "what if" questions about morpheme boundaries, phonological rules, null morphemes, word order flexibility), generates alternative hypotheses, and selects the best approach based on evidence strength.

**Output:** Revised rules in natural language with section headers, rule titles, confidence levels, and evidence citations.

### rules-improvement-extractor

**Agent:** `rules-improvement-extractor` (GPT-5-mini). No tools.

Parses the natural language output from `rules-improver` into structured JSON conforming to the rules schema. Strictly grounded -- extracts only explicitly stated rules, preserves exact wording and evidence. Does not extract vocabulary items as rules. If the input is empty or malformed, returns `success: false`.

---

## 6. Step 4: Answer Questions

**Agent:** `question-answerer` (Gemini 3 Flash). No tools.

**Input:** JSON object containing:
- `vocabulary`: All validated vocabulary entries
- `context`: Problem context string
- `dataset`: The dataset array
- `questions`: The questions array
- `rules`: The validated rules array

**Output:**
```typescript
{
  success: boolean;
  explanation: string;
  answers: QuestionAnswer[] | null;  // null if success is false
}
```

**Prompt summary:** The question answerer applies validated rules and vocabulary to answer each question through a systematic five-step process:

1. **Identify task type**: Determine what the question asks (translate-to-english, translate-to-target, fill-in-blank, etc.).
2. **Parse input**: Break into component morphemes/words.
3. **Apply rules systematically**: Match components to rules in order (vocabulary, morphology, syntax). Track which rule is applied at each step in `rulesApplied`.
4. **Construct the answer**: Assemble from rule application, verify consistency.
5. **Document working steps**: Morpheme breakdown, rule application references, interlinear gloss, synthesis.

**Working steps format** includes morpheme segmentation, rule-by-rule application with citations, interlinear gloss lines (Foreign / Gloss / Literal / Translation), and synthesis showing how components combine into the final answer.

**Confidence guidelines:**
- **HIGH**: All morphemes in vocabulary, all rules apply cleanly with no ambiguity.
- **MEDIUM**: Minor uncertainty (one morpheme inferred from pattern, slight ambiguity resolved by context).
- **LOW**: Significant uncertainty (guessing from incomplete rules, multiple valid interpretations).

**Failure conditions:** The agent returns `success: false` if a word/morpheme is not covered by any rule, a grammatical construction has no corresponding rule, multiple rules could apply ambiguously, rules lead to contradictory output, or context is insufficient.

The question answerer uses only the provided rules -- no external linguistic knowledge. Every part of the answer must be justified by the rules.

---

## 7. Design Rationale Summary

| Decision | Rationale |
|----------|-----------|
| **Two-agent chains** (reasoning then extraction) | Separates creative reasoning from structured data extraction. Each uses the model best suited to its task: Gemini 3 Flash for reasoning, GPT-5-mini for extraction. |
| **Blind sentence translation** | Prevents the LLM from reverse-engineering expected answers. The agent translates without seeing the expected translation; comparison happens in code post-hoc. |
| **Committed vs draft tool variants** | Hypothesizers need to test rules they have not yet committed. Verifiers need to test the "official" committed rules. Different tool variants enforce this isolation without complex state management. |
| **Per-perspective isolation** (draft stores) | Multiple hypothesizers exploring different linguistic angles must not interfere with each other's state. Isolated draft stores ensure independence. |
| **Vocabulary separate from rules** | Rules describe patterns and mechanisms ("verbs take -ti suffix"); vocabulary maps individual morphemes ("kala = eat"). Separating them prevents rules from becoming vocabulary lists. |
| **Multi-perspective + synthesis** | Different linguistic angles catch different patterns. A single hypothesizer may miss phonological patterns while catching morphological ones. Exploring multiple perspectives in parallel and synthesizing produces more complete solutions. |
| **Convergence check after synthesis** | Per-perspective verification scores individual hypotheses, but the merged result may have conflicts or gaps not present in any single perspective. A separate convergence check validates the synthesis. |
