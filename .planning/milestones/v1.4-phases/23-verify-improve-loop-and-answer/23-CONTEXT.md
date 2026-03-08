# Phase 23: Verify-Improve Loop and Answer - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the iterative verify-improve loop (Step 5 of the /solve skill) and the final answer step. The verifier tests the synthesized solution's rules and sentences, the improver revises failing rules, the loop runs up to 4 iterations, and the answerer applies validated rules to translate the questions. Agent skeleton files already exist with placeholder prompts; the /solve skill has Step 5 as a placeholder.

</domain>

<decisions>
## Implementation Decisions

### Verification approach
- The /solve skill orchestrates individual verifier calls — one call per rule, one call per sentence (multi-call orchestration, not a single monolithic agent call)
- The verifier agent uses **Sonnet** (not Opus) to keep costs manageable given the high call volume
- Test rules first, then sentences — rule failures provide context for understanding sentence failures
- Sentence testing uses **blind translation**: the verifier translates using only rules/vocabulary, then the /solve skill compares the translation against the expected answer
- Test scope: both dataset sentences (with expected translations) AND questions (without expected answers, to check rule coverage)

### Iteration flow
- Step 4f's convergence check result (verification.md) serves as **iteration 0** — no redundant re-verification
- If Step 4f already shows 100% pass rate, skip directly to the answer step
- Step 5 gets its own budget of **up to 4 iterations** (independent of Step 4's rounds)
- Convergence threshold: **100% pass rate** (all rules pass, all sentences translate correctly)
- After the loop completes, print an **iteration summary**: iteration count, final pass rate, which rules/sentences still fail (if any)

### Improvement file handling
- The improver produces **separate files per iteration**: `improved-1.md`, `improved-2.md`, etc. in the workspace root
- The latest improved file becomes the input for the next verification (not in-place rewriting of solution.md)
- Improver input: current solution (solution.md or latest improved-{N}.md) + verification results + problem.md
- The improver agent uses **Opus** — rule improvement requires creative linguistic reasoning and root cause analysis
- Verification files for each iteration: `verification-1.md`, `verification-2.md`, etc. in the workspace root

### Answer working steps
- Full derivation: morpheme segmentation, rule-by-rule application with citations, interlinear gloss lines, synthesis
- Each answer includes **confidence level + reasoning** (e.g., "MEDIUM — morpheme -ra is ambiguous between perfective and completive")
- Failure mode: **always produce a best-attempt translation**, flag with LOW confidence and explain what's uncertain — never leave a question unanswered
- The answerer agent uses **Opus**

### Model assignments (summary)
- Verifier: **Sonnet** (high call volume, mechanical testing)
- Improver: **Opus** (creative reasoning, root cause analysis)
- Answerer: **Opus** (systematic derivation, complex morphological reasoning)

### Claude's Discretion
- Exact verification report format within the established verification.md template
- How to structure the /solve skill's comparison logic for blind translation
- Error handling and retry behavior for individual verifier calls
- How to aggregate per-rule and per-sentence results into the verification summary

</decisions>

<specifics>
## Specific Ideas

- The workspace-format.md templates for verification.md and answers.md are the authoritative format reference
- The success criteria mention `.json` files, but the workspace convention is "all workspace files use markdown (no JSON)" — markdown convention wins
- The PIPELINE.md describes the Mastra pipeline's verifier/improver/answerer behavior in detail — agent prompts should reference the same patterns but adapted for Claude Code's file-based approach

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `verifier.md` agent skeleton: exists with placeholder `[System prompt -- Phase 23]`
- `improver.md` agent skeleton: exists with placeholder `[System prompt -- Phase 23]`
- `answerer.md` agent skeleton: exists with placeholder `[System prompt -- Phase 23]`
- `/solve` skill (SKILL.md): Step 5 is a placeholder `[Phase 23]`, needs to be filled in
- `workspace-format.md`: Templates for verification.md and answers.md already defined
- `PIPELINE.md`: Full reference for verifier-orchestrator, rules-improver, and question-answerer behavior

### Established Patterns
- Agent definitions are single self-contained markdown files in `.claude/agents/`
- All agents have: YAML frontmatter (name, description, tools, model), domain context, input description, task description, output format, error handling
- Hypothesizer and synthesizer agents (written in Phases 21-22) serve as the pattern to follow
- File-based handoff: agents read predecessor files and write output files
- The /solve skill orchestrates agent calls sequentially, checks output existence, handles retries

### Integration Points
- Step 5 of SKILL.md: currently `[Phase 23]` placeholder, follows Step 4f (convergence check)
- Workspace directory: `workspace/{datetime}/` — new files go here (improved-{N}.md, verification-{N}.md, answers.md)
- verification.md from Step 4f: serves as iteration 0 input for the verify-improve loop
- solution.md: the synthesized solution from Step 4e, first input to the improvement loop

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-verify-improve-loop-and-answer*
*Context gathered: 2026-03-08*
