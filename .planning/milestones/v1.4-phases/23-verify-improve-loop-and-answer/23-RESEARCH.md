# Phase 23: Verify-Improve Loop and Answer - Research

**Researched:** 2026-03-08
**Domain:** Agent prompt engineering, file-based orchestration, iterative verification loop
**Confidence:** HIGH

## Summary

Phase 23 completes the Claude Code solver pipeline by implementing three agents (verifier, improver, answerer) and the Step 5 orchestration logic in the /solve skill. The verifier agent skeleton, improver agent skeleton, and answerer agent skeleton all exist with placeholder prompts. Step 5 of SKILL.md is a placeholder. The work is: (1) write the three agent system prompts following established patterns from extractor/hypothesizer/synthesizer, and (2) write the Step 5 orchestration logic in SKILL.md following the patterns from Steps 3-4.

The codebase provides two primary references: PIPELINE.md documents the Mastra pipeline's verifier-orchestrator, rules-improver, and question-answerer behavior in detail (including prompt summaries, data types, and output formats), and workspace-format.md provides the exact markdown templates for verification.md and answers.md. The Claude Code agents adapt these patterns to a file-based, tool-using approach rather than the Mastra pipeline's JSON/tool-call approach.

**Primary recommendation:** Follow the established agent file structure (frontmatter + domain context + input + task + output format + do-not + error handling) exactly as demonstrated by hypothesizer.md and synthesizer.md. Adapt prompt content from the Mastra agent instructions but reframe for file-based I/O. The /solve skill Step 5 should follow Step 4's orchestration patterns (sequential dispatch, file existence checks, retry on failure, error logging).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- The /solve skill orchestrates individual verifier calls -- one call per rule, one call per sentence (multi-call orchestration, not a single monolithic agent call)
- The verifier agent uses **Sonnet** (not Opus) to keep costs manageable given the high call volume
- Test rules first, then sentences -- rule failures provide context for understanding sentence failures
- Sentence testing uses **blind translation**: the verifier translates using only rules/vocabulary, then the /solve skill compares the translation against the expected answer
- Test scope: both dataset sentences (with expected translations) AND questions (without expected answers, to check rule coverage)
- Step 4f's convergence check result (verification.md) serves as **iteration 0** -- no redundant re-verification
- If Step 4f already shows 100% pass rate, skip directly to the answer step
- Step 5 gets its own budget of **up to 4 iterations** (independent of Step 4's rounds)
- Convergence threshold: **100% pass rate** (all rules pass, all sentences translate correctly)
- After the loop completes, print an **iteration summary**: iteration count, final pass rate, which rules/sentences still fail (if any)
- The improver produces **separate files per iteration**: `improved-1.md`, `improved-2.md`, etc. in the workspace root
- The latest improved file becomes the input for the next verification (not in-place rewriting of solution.md)
- Improver input: current solution (solution.md or latest improved-{N}.md) + verification results + problem.md
- The improver agent uses **Opus** -- rule improvement requires creative linguistic reasoning and root cause analysis
- Verification files for each iteration: `verification-1.md`, `verification-2.md`, etc. in the workspace root
- Full derivation: morpheme segmentation, rule-by-rule application with citations, interlinear gloss lines, synthesis
- Each answer includes **confidence level + reasoning** (e.g., "MEDIUM -- morpheme -ra is ambiguous between perfective and completive")
- Failure mode: **always produce a best-attempt translation**, flag with LOW confidence and explain what's uncertain -- never leave a question unanswered
- The answerer agent uses **Opus**
- Model assignments: Verifier = Sonnet, Improver = Opus, Answerer = Opus
- Exact verification report format within the established verification.md template (Claude's discretion)
- How to structure the /solve skill's comparison logic for blind translation (Claude's discretion)
- Error handling and retry behavior for individual verifier calls (Claude's discretion)
- How to aggregate per-rule and per-sentence results into the verification summary (Claude's discretion)

### Claude's Discretion
- Exact verification report format within the established verification.md template
- How to structure the /solve skill's comparison logic for blind translation
- Error handling and retry behavior for individual verifier calls
- How to aggregate per-rule and per-sentence results into the verification summary

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VERI-01 | Verifier agent tests each rule and sentence against the dataset | Verifier agent prompt (from PIPELINE.md verifier-orchestrator pattern), orchestration in SKILL.md Step 5 dispatching per-rule and per-sentence calls |
| VERI-02 | Verifier writes test results to `workspace/verification-{iteration}.md` | Workspace-format.md verification template; CONTEXT.md specifies markdown files (not JSON) at workspace root |
| VERI-03 | Verify/improve loop runs up to 4 iterations | Step 5 orchestration logic in SKILL.md with iteration counter, convergence check, early exit |
| IMPR-01 | Improver agent reads verification failures and revises rules | Improver agent prompt (from PIPELINE.md rules-improver pattern), receives current solution + verification + problem |
| IMPR-02 | Improved rules written to `workspace/improved-{iteration}.md` | Separate files per iteration, latest becomes next verification input |
| ANSR-01 | Answerer agent applies validated rules to translate questions | Answerer agent prompt (from PIPELINE.md question-answerer pattern), systematic derivation with confidence |
| ANSR-02 | Final answers written to `workspace/answers.md` | Workspace-format.md answers template, markdown format at workspace root |
</phase_requirements>

## Standard Stack

This phase involves no new libraries or dependencies. It consists entirely of markdown agent definition files and SKILL.md orchestration logic (both are plain text consumed by Claude Code's agent/skill framework).

### Core Components
| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| verifier.md | `.claude/agents/verifier.md` | Agent prompt for rule/sentence testing | Exists with placeholder |
| improver.md | `.claude/agents/improver.md` | Agent prompt for rule revision | Exists with placeholder |
| answerer.md | `.claude/agents/answerer.md` | Agent prompt for question translation | Exists with placeholder |
| SKILL.md | `.claude/skills/solve/SKILL.md` | Orchestrator skill with Step 5 placeholder | Exists, Step 5 is placeholder |

### Reference Materials
| Document | Location | Purpose |
|----------|----------|---------|
| PIPELINE.md | `claude-code/PIPELINE.md` | Authoritative Mastra pipeline reference with verifier, improver, answerer prompt summaries |
| workspace-format.md | `claude-code/references/workspace-format.md` | Templates for verification.md and answers.md |
| hypothesizer.md | `.claude/agents/hypothesizer.md` | Established agent file pattern to follow |
| synthesizer.md | `.claude/agents/synthesizer.md` | Established agent file pattern to follow |
| Mastra verifier instructions | `src/mastra/workflow/03a-verifier-orchestrator-instructions.ts` | Detailed prompt text for reference |
| Mastra improver instructions | `src/mastra/workflow/03b-rules-improver-instructions.ts` | Detailed prompt text for reference |
| Mastra answerer instructions | `src/mastra/workflow/04-question-answerer-instructions.ts` | Detailed prompt text for reference |

## Architecture Patterns

### Agent File Structure (established pattern)

Every agent markdown file follows this exact structure, as demonstrated by hypothesizer.md and synthesizer.md:

```markdown
---
name: {agent-name}
description: "{one-liner}"
tools: Read, Write, Bash, Glob, Grep
model: {opus|sonnet}
---

## Domain Context
{2-3 sentences establishing the agent's role in the pipeline}

## Input
{Numbered list of what the agent receives, including file paths}

## Task
{Detailed instructions with numbered subsections}

## Output Format
{Exact markdown structure the agent must produce}

## Confidence Guidelines
{When applicable}

## Do NOT
{Bulleted list of prohibited behaviors}

## Error Handling
{How to handle failures, including errors.md logging}
```

### Key differences from Mastra agents

The Claude Code agents differ from the Mastra pipeline agents in these ways:

1. **File-based I/O, not JSON**: Agents read/write markdown files, not JSON objects. The verifier reads `solution.md` or `improved-{N}.md` and writes `verification-{N}.md`. The answerer reads solution files and writes `answers.md`.

2. **No two-agent chain**: The Mastra pipeline uses a reasoning agent + extraction agent pattern. Claude Code agents do both reasoning and structured output in one agent, writing directly to markdown files.

3. **No tool-based CRUD**: The Mastra pipeline's hypothesizer and improver use vocabulary/rules CRUD tools to manage state. Claude Code agents read and write complete files. No vocabulary tools, no rules tools.

4. **Orchestration in SKILL.md, not code**: The Mastra workflow.ts orchestrates in TypeScript. Claude Code orchestrates in the /solve skill's SKILL.md prose instructions.

### Verifier Architecture (multi-call orchestration)

The CONTEXT.md locks a critical design: the /solve skill itself orchestrates multiple verifier calls, one per rule and one per sentence. This means:

- The **verifier agent** is a lightweight, single-purpose tester. It tests ONE rule or ONE sentence per invocation.
- The **/solve skill** (Step 5) is responsible for: iterating over all rules, calling the verifier for each, iterating over all sentences, calling the verifier for each, comparing blind translations to expected answers, aggregating results into verification-{N}.md.
- This is analogous to the Mastra pipeline's `testRule` and `testSentence` tool calls, but here the orchestration happens in SKILL.md prose rather than via tool definitions.

The verifier agent needs TWO modes (or the skill makes two types of calls):
1. **Rule test**: Given a rule + full ruleset + dataset, determine if the rule is correct/consistent/sufficient.
2. **Sentence test (blind translation)**: Given a sentence + rules + vocabulary, translate it without seeing the expected answer. Return the translation.

The /solve skill then compares the verifier's blind translation against the expected translation and determines pass/fail.

### Improvement File Chain

```
solution.md (from Step 4e)
    |
    v
verification.md (from Step 4f = iteration 0)
    |
    v
[If not 100%] --> improver reads solution.md + verification.md
    |                   |
    |                   v
    |              improved-1.md (revised rules/vocab)
    |                   |
    |                   v
    |              verification-1.md (test results for improved-1)
    |                   |
    |              [If not 100%] --> improver reads improved-1.md + verification-1.md
    |                   |
    |                   v
    |              improved-2.md
    |                   |
    |                   v
    |              verification-2.md
    |                   ...
    v
[100% or max iterations] --> answerer reads final solution/improved file
    |
    v
answers.md
```

### Workspace File Layout (Step 5 additions)

```
workspace/{datetime}/
  problem.md                   # Already exists (Step 3)
  hypotheses/round-{N}/...     # Already exists (Step 4)
  solution.md                  # Already exists (Step 4e)
  verification.md              # Already exists (Step 4f) -- iteration 0
  improved-1.md                # NEW: Step 5, iteration 1 improvement
  verification-1.md            # NEW: Step 5, iteration 1 verification
  improved-2.md                # NEW: Step 5, iteration 2 improvement
  verification-2.md            # NEW: Step 5, iteration 2 verification
  ...
  answers.md                   # NEW: Step 5, final answers
```

### Anti-Patterns to Avoid

- **Monolithic verifier call**: Do NOT dispatch the verifier once to test everything. The CONTEXT.md explicitly requires per-rule, per-sentence calls orchestrated by the skill.
- **JSON workspace files**: The CONTEXT.md explicitly notes that workspace convention is "all workspace files use markdown (no JSON)" -- markdown convention wins over the REQUIREMENTS.md mentions of `.json` files.
- **In-place solution rewriting**: The CONTEXT.md explicitly states improved files are separate (`improved-1.md`, `improved-2.md`, etc.), NOT in-place rewrites of `solution.md`.
- **Skipping iteration 0**: Step 4f's verification.md IS iteration 0. Step 5 should read this first and check pass rate before entering the loop.
- **Unanswered questions**: The answerer MUST always produce a best-attempt translation, even with LOW confidence. Never skip a question.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Agent file format | Custom format | Established frontmatter + sections pattern from hypothesizer.md | Consistency; Claude Code's agent framework expects this structure |
| Verification template | Custom format | workspace-format.md verification template | Already defined, used by Step 4c/4f |
| Answer template | Custom format | workspace-format.md answers template | Already defined with working steps format |
| Blind translation comparison | Complex string matching | Simple exact match after normalization (trim, lowercase, normalize unicode) | The Mastra pipeline uses post-hoc string comparison with normalization; same approach works here |
| Error logging format | Custom error format | Established errors.md format from extractor.md/hypothesizer.md | Consistency across all agents |

## Common Pitfalls

### Pitfall 1: Verifier model mismatch
**What goes wrong:** The verifier agent file might default to `model: opus` following the CLAUDE.md convention "All solver agents use Opus 4.6."
**Why it happens:** The project-level CLAUDE.md says all agents use Opus, but the CONTEXT.md for this phase explicitly overrides: verifier uses Sonnet for cost control.
**How to avoid:** Set `model: sonnet` in verifier.md frontmatter. The CONTEXT.md decision takes precedence over the general convention.
**Warning signs:** Check the frontmatter model field after writing.

### Pitfall 2: Confusing iteration numbering
**What goes wrong:** Off-by-one errors in iteration numbering. Step 4f's verification.md is iteration 0, but Step 5's loop iterations start at 1.
**Why it happens:** The mental model of "loop starts at iteration 1" conflicts with "verification.md already exists as iteration 0."
**How to avoid:** Step 5 logic should: (1) read existing verification.md, (2) check pass rate, (3) if not 100%, enter loop starting at iteration=1, (4) iteration 1 produces improved-1.md and verification-1.md.
**Warning signs:** verification-0.md appearing in workspace (wrong -- it's just verification.md).

### Pitfall 3: Verifier prompt scope creep
**What goes wrong:** Making the verifier agent too intelligent -- giving it aggregation, analysis, and recommendation responsibilities.
**Why it happens:** The Mastra verifier-orchestrator does aggregation. But in Claude Code, the /solve skill handles aggregation.
**How to avoid:** The verifier agent tests ONE thing per call. The /solve skill collects results and writes the verification-{N}.md summary.
**Warning signs:** Verifier prompt includes "aggregate results" or "synthesize recommendations."

### Pitfall 4: Improver not seeing the right input file
**What goes wrong:** The improver always reads solution.md instead of the latest improved-{N}.md in iterations 2+.
**Why it happens:** Not tracking the "current best" file path across iterations.
**How to avoid:** The /solve skill must track `currentSolutionFile` variable: starts as `solution.md`, becomes `improved-1.md` after iteration 1, etc.
**Warning signs:** Improver making the same fixes repeatedly because it's reading the original solution.

### Pitfall 5: Answerer producing incomplete output
**What goes wrong:** The answerer skips questions it cannot fully derive, leaving gaps.
**Why it happens:** The Mastra answerer can return `success: false`. But the CONTEXT.md explicitly requires best-attempt translations for ALL questions.
**How to avoid:** The answerer prompt must state: "Always produce a best-attempt translation for every question. If uncertain, use LOW confidence and explain what is uncertain. Never leave a question unanswered."
**Warning signs:** answers.md with missing Q entries.

### Pitfall 6: Blind translation comparison in wrong place
**What goes wrong:** The verifier agent itself compares its translation to the expected answer, defeating the purpose of blind translation.
**Why it happens:** It feels natural to have the verifier report pass/fail.
**How to avoid:** The verifier agent returns only its blind translation. The /solve skill compares the verifier's translation against the expected answer from problem.md and determines pass/fail. This is the "blind translation" pattern from PIPELINE.md section 2.4.
**Warning signs:** Verifier prompt includes "compare your translation to the expected answer."

## Code Examples

### Verifier Agent File Structure

Based on established patterns (hypothesizer.md, synthesizer.md) and PIPELINE.md verifier-orchestrator reference:

```markdown
---
name: verifier
description: "Tests a single linguistic rule or sentence..."
tools: Read, Write, Bash, Glob, Grep
model: sonnet
---

## Domain Context
[Role as mechanical tester, not creative analyst]

## Input
1. **Test type** -- either "rule" or "sentence"
2. **For rule tests:** The rule to test + full ruleset + dataset
3. **For sentence tests:** The sentence to translate + rules + vocabulary
4. **Output file path** -- where to write the single test result

## Task

### Rule Test Mode
[Check rule against all dataset examples, report status]

### Sentence Test Mode (Blind Translation)
[Translate using ONLY rules and vocabulary, without seeing expected]

## Output Format

### Rule Test Output
[Status (PASS/FAIL/NEEDS_UPDATE), reasoning, recommendation]

### Sentence Test Output
[The blind translation only -- no comparison to expected]

## Do NOT
- Do NOT compare your translation to any expected answer
- Do NOT aggregate multiple test results
[...]
```

### Improver Agent File Structure

Based on PIPELINE.md rules-improver and established patterns:

```markdown
---
name: improver
description: "Revises failing linguistic rules..."
tools: Read, Write, Bash, Glob, Grep
model: opus
---

## Domain Context
[Reviser PhD linguist role]

## Input
1. **Path to current solution** -- solution.md or improved-{N}.md
2. **Path to verification results** -- verification.md or verification-{N}.md
3. **Path to problem.md**
4. **Output file path** -- improved-{N+1}.md

## Task
[Root cause analysis, alternative hypotheses, revision]
[Follow the Mastra improver's 6 core reasoning principles]

## Output Format
[Same structure as solution.md -- complete Vocabulary table + Rules sections]
```

### Answerer Agent File Structure

Based on PIPELINE.md question-answerer and workspace-format.md answers template:

```markdown
---
name: answerer
description: "Applies validated linguistic rules..."
tools: Read, Write, Bash, Glob, Grep
model: opus
---

## Domain Context
[Systematic translator applying validated rules]

## Input
1. **Path to final solution** -- solution.md or latest improved-{N}.md
2. **Path to problem.md** -- for questions and dataset reference
3. **Output file path** -- answers.md

## Task
[5-step methodology per question: identify task, parse input,
 apply rules, construct answer, document working steps]
[Always produce best-attempt, never skip questions]

## Output Format
[Per workspace-format.md answers template with Working section,
 Confidence, and Rules Applied]
```

### SKILL.md Step 5 Orchestration Pattern

Based on Steps 3-4 patterns in the existing SKILL.md:

```markdown
## Step 5: Verify-Improve Loop and Answer

### Step 5a: Check Iteration 0 (Convergence from Step 4f)

Read `{WORKSPACE}/verification.md` (produced by Step 4f).
Extract the pass rate from the `## Summary` section.

If pass rate is **100%**:
  - Print: `"Step 4f already converged at 100%. Skipping to answer step."`
  - Set CURRENT_SOLUTION to `{WORKSPACE}/solution.md`
  - Jump to Step 5d (Answer)

Otherwise:
  - Print: `"Starting verify-improve loop (pass rate: {rate}%)..."`
  - Set CURRENT_SOLUTION to `{WORKSPACE}/solution.md`
  - Set CURRENT_VERIFICATION to `{WORKSPACE}/verification.md`

### Step 5b-5c: Verify-Improve Loop

For iteration I (1 to 4):

  #### Step 5b: Improve
  Print: `"Iteration {I}: Improving rules..."`

  Use the **improver** agent:
  - Read current solution from: {CURRENT_SOLUTION}
  - Read verification from: {CURRENT_VERIFICATION}
  - Read problem from: {WORKSPACE}/problem.md
  - Write improved rules to: {WORKSPACE}/improved-{I}.md

  [File existence check + retry pattern from Step 4b]
  Set CURRENT_SOLUTION to `{WORKSPACE}/improved-{I}.md`

  #### Step 5c: Verify
  Print: `"Iteration {I}: Verifying rules..."`

  [Per-rule and per-sentence verification orchestration]
  [Write aggregated results to {WORKSPACE}/verification-{I}.md]
  Set CURRENT_VERIFICATION to `{WORKSPACE}/verification-{I}.md`

  Check pass rate:
  - If 100%: Print convergence message, break
  - If iteration < 4: continue
  - If iteration = 4: Print max iterations message, break

  #### Iteration Summary
  Print: `"Iteration {I}: {pass_rate}% ({rules_passed}/{rules_total} rules, {sentences_passed}/{sentences_total} sentences)"`

### Step 5d: Answer
Print: `"Generating answers from validated rules..."`

Use the **answerer** agent:
- Read solution from: {CURRENT_SOLUTION}
- Read problem from: {WORKSPACE}/problem.md
- Write answers to: {WORKSPACE}/answers.md

[File existence check]

Print: `"Pipeline complete. Workspace: {WORKSPACE}/"`
```

### Blind Translation Comparison Logic (in SKILL.md Step 5c)

The /solve skill handles the comparison after getting the verifier's blind translation:

```
For each dataset sentence:
  1. Call verifier agent in "sentence" mode with:
     - The sentence's foreign text
     - Current rules and vocabulary (from CURRENT_SOLUTION)
     - Direction: source -> target
  2. Read the verifier's output (a blind translation)
  3. Normalize both the verifier's translation and the expected translation:
     - Trim whitespace
     - Lowercase
     - Remove leading/trailing punctuation
  4. Compare: PASS if normalized strings match, FAIL otherwise
  5. Record: sentence ID, expected, got, PASS/FAIL

For each question:
  1. Call verifier in "sentence" mode (no expected answer)
  2. Record: question ID, translation, rule coverage assessment
```

## State of the Art

| Aspect | Mastra Pipeline | Claude Code Pipeline | Impact |
|--------|----------------|---------------------|--------|
| Verification | Tool-based (testRule, testSentence tools) | Multi-call agent dispatch (per-rule, per-sentence) | More overhead but same logic |
| Rule storage | In-memory CRUD via tools | File-based (markdown) | Simpler but less granular |
| Improvement | Two-agent chain (improver + extractor) | Single agent writes markdown | Simpler, relies on Opus quality |
| Answering | JSON output with schema | Markdown output per template | Same content, different format |
| Models | Gemini 3 Flash (reasoning) + GPT-5-mini (extraction) | Sonnet (verifier) + Opus (improver, answerer) | Cost optimization via model mixing |

## Open Questions

1. **Verifier call granularity for sentence testing**
   - What we know: The verifier tests each sentence individually via separate agent calls. For a dataset of 10 sentences + 5 questions = 15 calls, plus N rules = N more calls.
   - What's unclear: Should the verifier agent be called with ALL rules/vocabulary in its prompt for each sentence call, or should it read the solution file each time? Including all rules in the prompt ensures consistency but increases token cost.
   - Recommendation: Have the verifier agent read the solution file (CURRENT_SOLUTION) on each call. The file is already in the workspace. This avoids duplicating rules/vocabulary in every dispatch message. The /solve skill just tells the verifier what to test and where to find the rules.

2. **Verifier output aggregation**
   - What we know: The /solve skill orchestrates per-rule and per-sentence calls, then must aggregate into verification-{N}.md.
   - What's unclear: How should the /solve skill collect individual results? Writing temporary files, or collecting in-message?
   - Recommendation: The /solve skill collects results in its own context (the skill is running inline, not as a separate agent). After all verifier calls complete, it writes the aggregated verification-{N}.md directly using the Write tool. No temporary files needed.

3. **Pass rate calculation**
   - What we know: CONTEXT.md says 100% convergence threshold. The workspace-format.md shows a percentage.
   - What's unclear: Exact formula -- should questions count toward pass rate, or only dataset sentences?
   - Recommendation: Match the Mastra pipeline formula: `passRate = 1 - (failedRules + failedSentences) / (totalRules + totalSentences)`. Include dataset sentences but NOT questions in the denominator (questions have no expected answer so cannot fail the translation comparison). Question coverage is logged but does not affect the pass rate.

## Sources

### Primary (HIGH confidence)
- `claude-code/PIPELINE.md` -- Full Mastra pipeline reference including verifier-orchestrator, rules-improver, question-answerer prompt summaries, data types (VerifierFeedback, QuestionAnswer), blind translation pattern, testing tools architecture
- `claude-code/references/workspace-format.md` -- Templates for verification.md and answers.md
- `claude-code/.claude/agents/hypothesizer.md` -- Established agent file pattern (frontmatter + sections)
- `claude-code/.claude/agents/synthesizer.md` -- Established agent file pattern
- `claude-code/.claude/agents/extractor.md` -- Established agent file pattern
- `claude-code/.claude/skills/solve/SKILL.md` -- Current orchestration with Step 5 placeholder
- `.planning/phases/23-verify-improve-loop-and-answer/23-CONTEXT.md` -- Locked decisions on models, file naming, iteration flow, blind translation, answer behavior
- `src/mastra/workflow/03a-verifier-orchestrator-instructions.ts` -- Detailed Mastra verifier prompt
- `src/mastra/workflow/03b-rules-improver-instructions.ts` -- Detailed Mastra improver prompt
- `src/mastra/workflow/04-question-answerer-instructions.ts` -- Detailed Mastra answerer prompt

### Secondary (MEDIUM confidence)
- `claude-code/CLAUDE.md` -- Project conventions (model assignments, workspace structure, agent naming)
- `claude-code/.claude/agents/verifier.md` -- Existing placeholder with frontmatter and description
- `claude-code/.claude/agents/improver.md` -- Existing placeholder with frontmatter and description
- `claude-code/.claude/agents/answerer.md` -- Existing placeholder with frontmatter and description

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already exist as placeholders; patterns established by prior phases
- Architecture: HIGH -- CONTEXT.md provides detailed locked decisions; PIPELINE.md provides authoritative reference
- Pitfalls: HIGH -- identified from actual codebase analysis (model mismatch, iteration numbering, blind translation placement, file tracking)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external dependencies, all patterns internal to project)
