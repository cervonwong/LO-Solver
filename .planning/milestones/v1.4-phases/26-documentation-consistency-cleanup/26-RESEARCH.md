# Phase 26: Documentation Consistency Cleanup - Research

**Researched:** 2026-03-08
**Domain:** Documentation maintenance (CLAUDE.md, REQUIREMENTS.md, ROADMAP.md)
**Confidence:** HIGH

## Summary

Phase 26 is a documentation-only phase that fixes stale text across three files: `claude-code/CLAUDE.md`, `.planning/REQUIREMENTS.md`, and `.planning/ROADMAP.md`. The v1.4 milestone audit identified specific discrepancies between requirement/roadmap wording and the actual implemented design (markdown files instead of JSON, sequential dispatch instead of parallel, Sonnet model exception for verifier). All changes are text edits with no code modifications.

The scope is well-defined by the audit report and CONTEXT.md decisions. The three target files are all in the repository, their current content has been verified, and the exact stale items are enumerated. The user wants a specific uncheck/update/recheck cycle for REQUIREMENTS.md to create a clean git audit trail.

**Primary recommendation:** Execute the edits in three logical groups -- (1) CLAUDE.md verifier exception, (2) REQUIREMENTS.md uncheck-then-update-then-recheck cycle, (3) ROADMAP.md stale SC sweep -- with a single commit per group or one final commit for all.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Update requirement text directly to match implementation, with inline parenthetical evolution notes
- Evolution notes should include a brief reason but NOT phase references (e.g., "(changed from parallel to sequential: deterministic perspective ordering)")
- Uncheck evolved requirements first, update wording, then recheck -- creates clean audit trail in git history
- Keep same requirement IDs -- no version suffixes. Git history tracks changes
- Fix the 3 audit-identified items (CLAUDE.md exception, REQUIREMENTS.md wording, ROADMAP SC5)
- Additionally sweep ALL ROADMAP success criteria for stale references (e.g., "JSON" when implementation uses markdown)
- Update stale SCs in completed phases too -- the roadmap should be accurate as a historical record
- Do NOT expand to codebase maps or phase-level docs -- only CLAUDE.md, REQUIREMENTS.md, ROADMAP.md
- Note the Sonnet exception inline on the existing model convention line, not as a separate bullet
- E.g., "Models chosen per agent: GPT-5-mini for extraction/testing, Gemini 3 Flash for reasoning (verifier uses Sonnet for cost efficiency)"

### Claude's Discretion
- Exact wording of evolution notes per requirement
- Whether a ROADMAP SC is actually stale or still accurate
- Order of operations for the uncheck/update/recheck cycle

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-02 | All agents use Opus 4.6 | Current CLAUDE.md line 7 says "All solver agents use Opus 4.6" with no exception noted. Verifier uses `model: sonnet`. Fix: add parenthetical Sonnet exception. Also update REQUIREMENTS.md INFR-02 wording and recheck it. |
</phase_requirements>

## Standard Stack

No libraries or packages needed. This phase is pure documentation editing.

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Text editor (Edit tool) | Modify three markdown files | Direct text replacement is the only operation needed |
| Git | Commit with audit trail | Uncheck/recheck cycle creates meaningful diff history |

### Alternatives Considered
N/A -- no technology choices to make.

## Architecture Patterns

### Files to Edit

```
claude-code/CLAUDE.md              # Verifier Sonnet exception (1 line edit)
.planning/REQUIREMENTS.md          # 8 requirement rewrites + INFR-02 update
.planning/ROADMAP.md               # Stale SC sweep across phases 20-24
```

### Pattern 1: Inline Parenthetical Evolution Notes
**What:** When requirement wording has evolved from the original, update the text and add a parenthetical note explaining the change reason.
**When to use:** Every REQUIREMENTS.md item whose wording no longer matches the implementation.
**Example:**
```markdown
# Before:
- [x] **EXTR-02**: Structured output written to `workspace/extracted.json`

# After (uncheck first, then update, then recheck):
- [x] **EXTR-02**: Structured output written to `workspace/problem.md` (changed from extracted.json: markdown format adopted for all workspace files)
```

### Pattern 2: CLAUDE.md Inline Exception
**What:** Note the Sonnet exception on the existing model convention line rather than adding a separate bullet.
**When to use:** The CLAUDE.md model section edit.
**Example:**
```markdown
# Before:
All solver agents use Opus 4.6. Every agent definition file MUST include `model: opus` in its YAML frontmatter.

# After:
All solver agents use Opus 4.6 (exception: verifier uses Sonnet for cost efficiency). Every agent definition file MUST include `model: opus` in its YAML frontmatter.
```

### Pattern 3: Uncheck/Update/Recheck Cycle
**What:** For each evolved requirement in REQUIREMENTS.md: (1) uncheck `[x]` to `[ ]`, (2) update the wording, (3) recheck `[ ]` to `[x]`. This creates a clean git diff showing the requirement was intentionally revised.
**When to use:** All 8 stale REQUIREMENTS.md items.
**Note:** The user specified this creates a clean audit trail in git history. This means either: (a) three separate commits (uncheck all, update all, recheck all), or (b) a single commit where the final state shows updated-and-checked text. Given that the planner has discretion on ordering, a single commit with the final updated-and-checked state is simpler and still shows the evolution in the diff.

### Anti-Patterns to Avoid
- **Adding version suffixes to requirement IDs:** User explicitly said "Keep same requirement IDs -- no version suffixes."
- **Including phase references in evolution notes:** User explicitly said NOT to include phase references. Use reason-based notes only.
- **Expanding scope beyond the three files:** Do NOT touch phase-level docs, codebase maps, or any other files.

## Don't Hand-Roll

N/A -- no custom solutions needed for a documentation-only phase.

## Common Pitfalls

### Pitfall 1: Missing Stale ROADMAP SCs
**What goes wrong:** Only fixing the three audit-identified items and missing other stale SCs.
**Why it happens:** The audit called out SC5 of Phase 22 explicitly but the user wants a full sweep.
**How to avoid:** Systematically check every SC in phases 20-24 for JSON/parallel/filename references that don't match implementation.
**Warning signs:** Any SC mentioning `.json` file extensions, "JSON" format, or "parallel" dispatch for hypothesizers.

### Pitfall 2: Inconsistent Evolution Note Style
**What goes wrong:** Different evolution notes use different formats (some with phase refs, some without, some too verbose).
**Why it happens:** Editing 8 requirements one by one without a consistent template.
**How to avoid:** Define the parenthetical format once and apply consistently: `(changed from X to Y: reason)` or `(changed from X: reason)`.
**Warning signs:** Notes that mention "Phase 21" or "per CONTEXT.md" -- these violate the no-phase-reference rule.

### Pitfall 3: INFR-02 Left Unchecked
**What goes wrong:** After updating INFR-02's wording to reflect the Sonnet exception, forgetting to recheck it and update the traceability section.
**Why it happens:** INFR-02 is currently `[ ]` (unchecked) in REQUIREMENTS.md with "Pending" status in the traceability table.
**How to avoid:** After updating INFR-02 wording, check it `[x]`, update traceability to "Complete", and update the pending count.
**Warning signs:** INFR-02 still showing `[ ]` or "Pending" after phase completion.

### Pitfall 4: ROADMAP Phase 20 SC2 Still Says "All Agents Use Opus"
**What goes wrong:** Fixing CLAUDE.md but not updating ROADMAP Phase 20 SC2 which says "All agent definition files specify Opus 4.6 as the model."
**Why it happens:** The audit only called out SC5 of Phase 22, not SC2 of Phase 20.
**How to avoid:** The full sweep should catch this. Phase 20 SC2 needs a parenthetical exception note.
**Warning signs:** ROADMAP SC2 still saying "All" without exception.

## Code Examples

### Complete inventory of stale items

#### CLAUDE.md (1 edit)

**File:** `claude-code/CLAUDE.md`, line 7
```markdown
# Current:
All solver agents use Opus 4.6. Every agent definition file MUST include `model: opus` in its YAML frontmatter.

# Updated:
All solver agents use Opus 4.6 (exception: verifier uses Sonnet for cost efficiency). Every agent definition file MUST include `model: opus` in its YAML frontmatter.
```

#### REQUIREMENTS.md (8 requirement edits + INFR-02 + traceability)

**Stale requirements with proposed updates:**

1. **EXTR-02** (line 26): `workspace/extracted.json` -> `workspace/problem.md`
   - `Structured output written to workspace/problem.md (changed from extracted.json: markdown format adopted for all workspace files)`

2. **HYPO-01** (line 30): `dispatched in parallel` -> `dispatched sequentially`
   - `Multiple hypothesizer agents dispatched sequentially, each with a different linguistic perspective (changed from parallel: deterministic perspective ordering)`

3. **HYPO-02** (line 31): `workspace/hypothesis-{n}.json` -> `workspace/hypotheses/round-{R}/perspective-{N}.md`
   - `Each hypothesizer writes rules + vocabulary to its own draft file (workspace/hypotheses/round-{R}/perspective-{N}.md) (changed from hypothesis-{n}.json: markdown format, round-based directory structure)`

4. **VERI-02** (line 37): `workspace/verification-{iteration}.json` -> `workspace/verification-{iteration}.md`
   - `Verifier writes test results to workspace/verification-{iteration}.md (changed from .json: markdown format adopted for all workspace files)`

5. **IMPR-02** (line 43): `workspace/improved-{iteration}.json` -> `workspace/improved-{iteration}.md`
   - `Improved rules written to workspace/improved-{iteration}.md (changed from .json: markdown format adopted for all workspace files)`

6. **ANSR-02** (line 48): `workspace/answers.json` -> `workspace/answers.md`
   - `Final answers written to workspace/answers.md (changed from answers.json: markdown format adopted for all workspace files)`

7. **OUTP-03** (line 54): `JSON files` -> `markdown files`
   - `All intermediate markdown files preserved in workspace for debugging (changed from JSON: markdown format adopted for all workspace files)`

8. **INFR-02** (line 59): `All agents use Opus 4.6` -> note Sonnet exception
   - `All agents use Opus 4.6 (exception: verifier uses Sonnet for cost efficiency)`
   - Also: change `[ ]` to `[x]`
   - Also: update traceability table row from "Pending" to "Complete"
   - Also: update pending count line from 4 to 3 (removing INFR-02 from the list)

#### ROADMAP.md (stale SC sweep)

**Phase 20 SC2** (line 88): "All agent definition files specify Opus 4.6 as the model"
- Update: `All agent definition files specify Opus 4.6 as the model (verifier uses Sonnet for cost efficiency)`

**Phase 21 SC1** (line 98): "structured JSON" and "workspace/extracted.json"
- Update: `An extractor agent can parse a raw Linguistics Olympiad problem into structured markdown and write it to workspace/problem.md`

**Phase 21 SC2** (line 99): "workspace/hypothesis-{n}.json"
- Update: `A hypothesizer agent can generate linguistic rules and vocabulary from a specific perspective and write to workspace/hypotheses/round-{R}/perspective-{N}.md`

**Phase 22 SC5** (line 114): "contains valid JSON"
- Update: `The orchestrator validates subagent completion via spot-check (output file exists and contains expected content) rather than relying on return status`

**Phase 23 SC1** (line 123): "workspace/verification-{iteration}.json"
- Update: `A verifier agent tests each rule and sentence against the dataset and writes structured results to workspace/verification-{iteration}.md`

**Phase 23 SC2** (line 124): "workspace/improved-{iteration}.json"
- Update: `An improver agent reads verification failures and writes revised rules to workspace/improved-{iteration}.md`

**Phase 23 SC4** (line 126): "workspace/answers.json"
- Update: `An answerer agent applies the validated rules to translate questions and writes results to workspace/answers.md`

**Phase 23 SC5** (line 127): "All intermediate JSON files follow the workspace naming convention and are valid JSON"
- Update: `All intermediate markdown files follow the workspace naming convention`

**Phase 24 SC3** (line 140): "All intermediate JSON files remain in the workspace directory"
- Update: `All intermediate markdown files remain in the workspace directory for debugging and inspection`

**Phase 26 SC3** (line 165): "ROADMAP SC5 references markdown files instead of 'valid JSON'"
- This is Phase 26's own SC referring to the fix. After the fix is applied, this SC describes what was done. No update needed -- it remains accurate as a criterion.

## State of the Art

N/A -- documentation maintenance has no technology evolution concerns.

## Open Questions

1. **Commit granularity for uncheck/update/recheck cycle**
   - What we know: The user wants the cycle to "create a clean audit trail in git history." This could mean 3 separate commits or 1 commit with the final state.
   - What's unclear: Whether the user expects 3 commits (uncheck -> update -> recheck) or a single commit with the final updated+checked state.
   - Recommendation: Use a single commit per logical group. The git diff will show the text change from old wording to new wording, which is a clear audit trail. Three commits for the same requirement would be excessive overhead for a documentation cleanup phase.

2. **ROADMAP Phase 21 SC3 wording**
   - What we know: SC3 says "dispatched sequentially" which is already correct (it was written after the parallel->sequential decision).
   - What's unclear: Whether this was always the wording or was updated.
   - Recommendation: Leave SC3 as-is -- it already says "sequentially."

## Sources

### Primary (HIGH confidence)
- `claude-code/CLAUDE.md` -- read directly, line 7 confirmed stale (no Sonnet exception)
- `claude-code/.claude/agents/verifier.md` -- confirmed `model: sonnet` in frontmatter
- `.planning/REQUIREMENTS.md` -- read directly, all 8 stale items confirmed with exact line numbers
- `.planning/ROADMAP.md` -- read directly, all stale SCs identified with exact line numbers
- `.planning/v1.4-MILESTONE-AUDIT.md` -- source of truth for identified discrepancies
- `claude-code/references/workspace-format.md` -- confirmed actual file naming conventions (problem.md, perspective-N.md, verification-N.md, etc.)

### Secondary (MEDIUM confidence)
None needed -- all findings are from direct file reads.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no libraries needed, pure text editing
- Architecture: HIGH -- all target files read, all stale items enumerated with exact line numbers
- Pitfalls: HIGH -- scope is narrow and well-defined; main risk is missing a stale SC (mitigated by full sweep)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- documentation files don't change frequently)
