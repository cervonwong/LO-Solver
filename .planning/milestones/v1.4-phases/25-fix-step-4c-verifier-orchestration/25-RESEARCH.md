# Phase 25: Fix Step 4c Verifier Orchestration - Research

**Researched:** 2026-03-08
**Domain:** SKILL.md orchestration logic (Claude Code skill file editing)
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORCH-03 | Orchestrator dispatches subagents in pipeline order with file-based state | Step 4c must dispatch verifier per-rule and per-sentence (not monolithic), matching the per-call pattern already proven in Step 5c |
| ORCH-04 | Each agent reads predecessor files and writes its own named output file | Step 4c must assemble `verification-{P}.md` from individual verifier call results, matching the format Step 4d expects |
| VERI-01 | Verifier agent tests each rule and sentence against the dataset | Step 4c currently dispatches the verifier as a monolithic tester; must switch to per-rule and per-sentence calls matching the verifier agent's actual API |
</phase_requirements>

## Summary

Phase 25 fixes a design mismatch identified in the v1.4 milestone audit (INT-01): Step 4c in SKILL.md dispatches the verifier agent as a monolithic perspective-tester, but the verifier agent (Phase 23) only supports two modes -- **Rule Test Mode** (one rule per call) and **Sentence Test Mode** (one sentence per call). There is no "full-perspective verification" mode. Step 5c already correctly implements the per-call pattern with skill-side aggregation. Step 4c must be rewritten to match.

The fix is entirely within `claude-code/.claude/skills/solve/SKILL.md`. No agent definition files need changes. The verifier agent's API is correct and proven. The work is a copy-and-adapt of Step 5c's orchestration pattern to Step 4c's context (perspective files instead of solution/improved files), plus ensuring Step 4d's pass rate extraction and Step 4f's convergence check work with the corrected output format.

**Primary recommendation:** Rewrite SKILL.md Step 4c to use Step 5c's per-call verifier orchestration pattern, adapting it for perspective-level verification. Also review and fix Step 4d and Step 4f to ensure they consume the corrected output format consistently.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Claude Code SKILL.md | N/A | Orchestration logic (markdown instructions) | This is the only "technology" involved -- editing a skill file |

### Supporting
No external libraries involved. This phase modifies a single markdown skill file.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-call pattern (Step 5c style) | Monolithic verifier mode (new agent mode) | Adding a third verifier mode would add complexity to the verifier agent, conflict with Phase 23 design decisions, and duplicate aggregation logic. Per-call is the proven pattern. |

## Architecture Patterns

### Recommended Project Structure
```
claude-code/.claude/skills/solve/SKILL.md   # Only file modified
```

No new files are created. No agent definitions change.

### Pattern 1: Per-Call Verifier Orchestration (from Step 5c)

**What:** The /solve skill orchestrates individual verifier calls (one per rule, one per sentence), reads back each result, performs blind translation comparison for sentences, then assembles an aggregated verification file with ## Summary and pass rate.

**When to use:** Any time verification results need to be assembled from individual verifier agent calls.

**Reference implementation (Step 5c, SKILL.md lines 193-296):**

The pattern has 4 sub-steps:

1. **5c.1 - Extract rules and sentences** from the current solution and problem files
2. **5c.2 - Test rules (one per call)** using verifier in rule test mode, read back Status
3. **5c.3 - Test sentences (one per call)** using verifier in sentence test mode, normalize and compare
4. **5c.4 - Aggregate and write verification file** with Summary section, Rule Results, Sentence Results, Question Coverage

Key details of the existing Step 5c pattern:
- Rule tests: dispatch verifier per rule title, read output file to get Status (PASS/FAIL/NEEDS_UPDATE) and reasoning
- Sentence tests: dispatch verifier per dataset sentence, read blind translation, normalize both (trim, lowercase, strip punctuation), compare for PASS/FAIL
- Questions: tested for coverage logging only, NOT included in pass rate denominator
- Pass rate formula: `round(100 * (rules_passed + sentences_passed) / (rules_total + sentences_total))`
- Output file format: `# Verification: Iteration {I}`, `## Summary` with counts and pass rate, `## Rule Results` with per-rule sections, `## Sentence Results` table, `## Question Coverage` table

### Pattern 2: Adapting Step 5c Pattern for Step 4c Context

**What:** Step 4c operates on perspective files (`perspective-{P}.md`) rather than solution/improved files. The adaptation requires:

1. Reading rules and vocabulary from `perspective-{P}.md` instead of `{CURRENT_SOLUTION}`
2. Writing to `verification-{P}.md` in `hypotheses/round-{N}/` instead of `verification-{I}.md` in workspace root
3. Using `# Verification: Perspective {P}` header instead of `# Verification: Iteration {I}`
4. The verifier reads the perspective file as its solution file

**When to use:** Step 4c verification of individual perspectives during hypothesis rounds.

### Pattern 3: Step 4f Convergence Check Consistency

**What:** Step 4f verifies the merged `solution.md`. It currently dispatches the verifier monolithically (same problem as Step 4c). It must also use the per-call pattern, writing `verification.md` in workspace root.

**When to use:** After synthesizer produces `solution.md`.

**Key difference from Step 4c:** Step 4f tests the merged solution, not individual perspectives. Output goes to `{WORKSPACE}/verification.md` (not `hypotheses/round-{N}/verification-{P}.md`). The format matches Step 5c's `verification-{I}.md` but with header `# Final Verification` or `# Verification: Convergence`.

### Anti-Patterns to Avoid
- **Monolithic verifier dispatch:** Dispatching verifier with a full file and expecting it to aggregate results. The verifier agent only supports single-test mode.
- **Different verification file formats in Step 4c vs Step 5c:** The verification files must share the same `## Summary` format so Step 4d and Step 6 can extract pass rates consistently.
- **Skipping question coverage in Step 4c:** Even though questions don't affect pass rate, Step 5c logs them for coverage. Step 4c should do the same for consistency.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verification aggregation | A new verifier mode | Step 5c's skill-side aggregation pattern | The verifier agent is designed for single-test mode; aggregation belongs in the orchestrating skill (Phase 23 design decision) |
| Pass rate extraction | Custom parsing for Step 4d | The same `## Summary` format that Step 5c produces | Step 4d already expects this format; changing it creates a second format to maintain |
| Blind translation comparison | Verifier-side comparison | Skill-side normalize-and-compare (Phase 23 decision 23-02) | Comparison logic lives in the skill, not the verifier agent |

**Key insight:** This phase does not invent new patterns. It copies an existing proven pattern (Step 5c) and applies it to a different context (Step 4c perspective verification and Step 4f convergence).

## Common Pitfalls

### Pitfall 1: Forgetting to adapt file paths for the perspective context
**What goes wrong:** Copy-pasting Step 5c and leaving `{CURRENT_SOLUTION}` references instead of `{WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md`
**Why it happens:** Step 5c uses CURRENT_SOLUTION (a variable), while Step 4c needs explicit perspective file paths
**How to avoid:** Methodically replace every file path reference: solution file, output verification file, header naming
**Warning signs:** Step 4c referencing CURRENT_SOLUTION or writing to workspace root instead of hypotheses/round-{N}/

### Pitfall 2: Inconsistent verification file format between Step 4c and Step 5c
**What goes wrong:** Step 4d or Step 6 cannot parse verification files because Step 4c uses a different header or summary format
**Why it happens:** Step 4c verification files are for perspectives, Step 5c for iterations -- tempting to use different formats
**How to avoid:** Use identical `## Summary` format (same keys, same `Pass rate: {N}%` line) so downstream consumers parse them uniformly
**Warning signs:** Step 4d needing custom parsing logic different from what it uses for Step 5c output

### Pitfall 3: Step 4f not getting the same treatment as Step 4c
**What goes wrong:** Step 4c gets fixed but Step 4f (convergence check on solution.md) still uses monolithic dispatch
**Why it happens:** Step 4f is a separate section and easy to overlook when focused on Step 4c
**How to avoid:** Treat Step 4c and Step 4f as a pair -- both dispatch the verifier monolithically, both need the per-call pattern
**Warning signs:** Step 4f section still says "Use the verifier agent" with only solution.md and problem.md as inputs

### Pitfall 4: Step 4c becoming too long and complex
**What goes wrong:** Step 4c with per-call orchestration becomes significantly longer, making SKILL.md harder to follow
**Why it happens:** Step 5c's orchestration pattern is ~100 lines; duplicating it in Step 4c doubles the verification logic
**How to avoid:** Keep the same sub-step structure (4c.1, 4c.2, 4c.3, 4c.4) matching 5c.1-5c.4 for clarity. The SKILL.md reader (Claude Code) handles long instructions well.
**Warning signs:** Temptation to "simplify" by cutting sub-steps or combining rule+sentence testing

### Pitfall 5: Not updating Step 4d to handle the new format
**What goes wrong:** Step 4d still tries to extract pass rates from a format that has changed
**Why it happens:** Step 4d currently reads `## Summary` and `Pass rate: {N}%` -- if the format is correct, it should work. But the current Step 4c doesn't produce that format at all.
**How to avoid:** After fixing Step 4c, verify Step 4d's extraction instructions still work with the new output. Since we're adopting the same format Step 5c uses, Step 4d's existing extraction logic ("Read the ## Summary section, extract the Pass rate: {N}% value") should work without changes.
**Warning signs:** None expected if format is consistent -- but verify.

## Code Examples

### Example: Step 4c Rewrite Structure (pseudo-markdown for SKILL.md)

The rewritten Step 4c should mirror Step 5c's structure but adapted for perspective-level verification:

```markdown
### Step 4c: Verify Perspectives

For each perspective P that produced an output file, **sequentially**:

Print: `"Verifying perspective {P}: {perspective_name}..."`

#### Step 4c.1: Extract rules and sentences from perspective and problem

Read `{WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md` to get the list of rule titles
(each `### {title}` under `## Rules`).
Read `{WORKSPACE}/problem.md` to get dataset sentences and questions.

#### Step 4c.2: Test rules (one per call)

For each rule title in the perspective:
1. Use the **verifier** agent in rule test mode:
   - Test type: "rule"
   - Rule title: {rule_title}
   - Solution file: {WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md
   - Problem file: {WORKSPACE}/problem.md
   - Output file: a temporary result (read back immediately)
2. Read the verifier's output to get the Status (PASS/FAIL/NEEDS_UPDATE)
3. Record the result: rule title, status, reasoning

#### Step 4c.3: Test sentences (one per call, blind translation)

For each dataset sentence (from the `## Dataset` table in problem.md):
1. Use the **verifier** agent in sentence test mode:
   - Test type: "sentence"
   - Sentence: the foreign text to translate
   - Direction: the translation direction
   - Solution file: {WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md
   - Problem file: {WORKSPACE}/problem.md
   - Output file: a temporary result
2. Read the verifier's output to get the blind Translation
3. Normalize both translations (trim, lowercase, strip punctuation)
4. Compare: PASS if match, FAIL otherwise
5. Record: sentence number, expected, got, PASS/FAIL

For each question in problem.md:
1. Use the **verifier** agent in sentence test mode
2. Record for coverage logging (not in pass rate denominator)

#### Step 4c.4: Aggregate and write verification file

Compute pass rate: round(100 * (rules_passed + sentences_passed) / (rules_total + sentences_total))

Write `{WORKSPACE}/hypotheses/round-{N}/verification-{P}.md` with this structure:

# Verification: Perspective {P}

## Summary

- Rules tested: {rules_total}
- Rules passed: {rules_passed}
- Rules failed: {rules_failed}
- Sentences tested: {sentences_total}
- Sentences passed: {sentences_passed}
- Sentences failed: {sentences_failed}
- Pass rate: {pass_rate}%

## Rule Results
(same format as Step 5c.4)

## Sentence Results
(same format as Step 5c.4)

## Question Coverage
(same format as Step 5c.4)
```

### Example: Step 4f Convergence Check Rewrite

Step 4f should use the same per-call pattern but testing `solution.md`:

```markdown
### Step 4f: Convergence Check

Print: `"Checking convergence..."`

(Same sub-step structure as Step 4c, but:)
- Solution file: {WORKSPACE}/solution.md
- Output file: {WORKSPACE}/verification.md
- Header: `# Verification: Convergence`

After writing verification.md, read ## Summary and check pass rate:
- If 100%: break (converged)
- If not converged and round < 3: continue
- If not converged and round = 3: use best result
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic verifier (test full file) | Per-call verifier (one test per call) | Phase 23 (2026-03-08) | Verifier agent only supports single-test mode; aggregation must happen in skill |

**Deprecated/outdated:**
- Monolithic verifier dispatch: The verifier agent does not support aggregating multiple test results. This was a design error in Step 4c that was never caught because Step 5c was implemented correctly first and the synthesizer merges all perspectives regardless of verification quality.

## Open Questions

1. **Step 4c cost impact from per-call pattern**
   - What we know: Step 4c tests each perspective's rules and sentences individually, which means N_perspectives * (N_rules + N_sentences + N_questions) verifier calls per round. Step 5c already incurs a similar cost for the improve loop.
   - What's unclear: Whether the combined cost of Step 4c + Step 5c per-call verification is acceptable given the verifier uses Sonnet (cheaper than Opus).
   - Recommendation: Proceed with the per-call pattern. The verifier uses Sonnet specifically for cost control (Phase 23 decision). If cost becomes a concern, reducing perspective count (currently 3) is the lever, not changing the verification pattern.

2. **Whether Step 4d needs any changes**
   - What we know: Step 4d reads `## Summary` and extracts `Pass rate: {N}%`. If Step 4c produces files in the same format as Step 5c, Step 4d should work unchanged.
   - What's unclear: Whether the current Step 4d instructions handle the file path correctly (`hypotheses/round-{N}/verification-{P}.md`).
   - Recommendation: Review Step 4d instructions after fixing Step 4c. The path references should already be correct since Step 4d says "for each perspective that has a verification file" and reads from the round directory. But verify during implementation.

3. **Whether Step 4f's verification.md header should match Step 5c's pattern**
   - What we know: Step 5c uses `# Verification: Iteration {I}`. Step 4f produces `verification.md` (convergence check). workspace-format.md shows `# Final Verification`.
   - What's unclear: Whether `# Final Verification` or `# Verification: Convergence` is the right header.
   - Recommendation: Use the header from workspace-format.md (`# Final Verification`) since that's the documented template. The `## Summary` section format is what matters for downstream parsing, not the H1 header.

## Scope Assessment

### What Changes
1. **SKILL.md Step 4c** (lines ~89-101): Rewrite from 13 lines of monolithic dispatch to ~80 lines of per-call orchestration (4 sub-steps)
2. **SKILL.md Step 4f** (lines ~129-149): Rewrite convergence check to use per-call pattern instead of monolithic dispatch (~60 lines)
3. **SKILL.md Step 4d** (lines ~103-111): Review only -- likely needs no changes if Step 4c output format matches expectations

### What Does NOT Change
- `claude-code/.claude/agents/verifier.md` -- already correct
- `claude-code/.claude/agents/*.md` -- no other agent definitions affected
- `claude-code/references/workspace-format.md` -- verification file format template is already correct
- `claude-code/CLAUDE.md` -- no changes needed
- Step 5 (5a-5d) -- already working correctly
- Step 6 (6a-6b) -- reads from CURRENT_VERIFICATION which is set by Step 5, unaffected by Step 4c changes

### Size Estimate
- 1 file modified: SKILL.md
- Net line change: approximately +120 lines (replacing ~25 lines of monolithic dispatch with ~145 lines of per-call orchestration for Steps 4c and 4f combined)
- Complexity: LOW -- copying a proven pattern with path/header adaptations

## Sources

### Primary (HIGH confidence)
- `claude-code/.claude/skills/solve/SKILL.md` -- current Step 4c, 4d, 4f, and reference Step 5c implementation
- `claude-code/.claude/agents/verifier.md` -- verifier agent API (Rule Test Mode and Sentence Test Mode only)
- `claude-code/references/workspace-format.md` -- verification file format templates
- `.planning/v1.4-MILESTONE-AUDIT.md` -- INT-01 gap definition, tech debt items
- `.planning/REQUIREMENTS.md` -- ORCH-03, ORCH-04, VERI-01 requirement definitions

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` -- Phase 23 decisions (23-01, 23-02) establishing per-call verifier pattern and skill-side aggregation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - single file modification, no external dependencies
- Architecture: HIGH - pattern already exists in Step 5c, direct copy-and-adapt
- Pitfalls: HIGH - identified from direct code comparison of Step 4c vs Step 5c

**Research date:** 2026-03-08
**Valid until:** No expiry -- this is internal codebase refactoring, not dependent on external library versions
