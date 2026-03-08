# Phase 24: Output and Integration - Research

**Researched:** 2026-03-08
**Domain:** File-based output formatting and terminal display
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Terminal answers shown as **numbered list** (not table): `Q1: Vene-ti la boro -> He/she ate the fish`
- Terminal rules shown as **titles + one-line descriptions**: `1. Verb-initial word order (VSO) -- Sentences follow V-S-O order`
- **Always show final pass rate** (e.g., `Pass rate: 87%`), even at 100%
- Failing rules/sentences shown **inline** with results, marked with failure indicator
- Agent failures mentioned in terminal **only if they affected the result**
- **Do not** print solution file path or workspace path at the end
- Solution file written to `{WORKSPACE}/solution-complete.md` (not overwriting `solution.md`)
- **Section order:** Rules -> Vocabulary -> Verification Summary -> Answers -> Pipeline Notes
- Problem structure **referenced only** (`See problem.md`), not included inline
- **Rules:** Full detail -- title, description, evidence, confidence, verification status (PASS/FAIL)
- **Vocabulary:** Full table with form, meaning, type, notes columns
- **Verification summary:** One summary line per iteration (e.g., `Iteration 2: 87% -> 94%`)
- **Answers:** Final translated answers for all questions
- Hypothesis round details **not included** -- those remain in workspace hypothesis files
- **Final verification only** -- summary lines per iteration cover the history
- Failing rules in solution file **include verifier's reasoning** about why they failed
- **Pipeline Notes section** included **only if errors occurred**; omitted on clean runs
- Terminal output mentions agent failures **only when they affected the outcome**

### Claude's Discretion

- Exact formatting/spacing of terminal output
- Whether to use markdown formatting in terminal (headers, bold) vs plain text
- How to abbreviate long rule descriptions for the one-liner terminal display
- Failure indicator style (e.g., [FAIL], etc.)

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUTP-01 | Results displayed in terminal (rules, vocabulary, answers) | Terminal display step appended to SKILL.md using existing `Print:` pattern; reads workspace files and formats inline |
| OUTP-02 | Full solution written to markdown file with all intermediate steps | New `solution-complete.md` file written to workspace; template added to workspace-format.md |
| OUTP-03 | All intermediate JSON files preserved in workspace for debugging | Already satisfied by existing behavior -- workspace files are never cleaned up. Confirm in SKILL.md that no cleanup step exists |
</phase_requirements>

## Summary

Phase 24 adds two capabilities to the existing `/solve` skill: (1) a formatted terminal display of results after the pipeline completes, and (2) a consolidated `solution-complete.md` file written to the workspace. No new agents, libraries, or external dependencies are needed. The implementation is entirely within the existing SKILL.md pattern of reading workspace files and using `Print:` statements for terminal output and the `Write` tool for file creation.

The key technical challenge is data extraction: reading multiple workspace files (solution.md or improved-N.md, verification files, answers.md, errors.md) and reformatting their contents into the prescribed terminal and file formats. This is straightforward because all workspace files follow known markdown templates defined in `references/workspace-format.md`.

OUTP-03 (preserving intermediate files) is already satisfied by the current design -- workspace files are never deleted. This requires only a brief confirmation that no cleanup logic exists.

**Primary recommendation:** Append a Step 6 to SKILL.md that reads workspace files and produces both terminal output and the solution-complete.md file. Add the solution-complete.md template to workspace-format.md.

## Standard Stack

### Core

No new libraries or dependencies are needed. This phase uses only existing project infrastructure:

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| SKILL.md | `claude-code/.claude/skills/solve/SKILL.md` | Orchestration instructions | All pipeline steps are defined here; Step 6 follows the same pattern |
| workspace-format.md | `claude-code/references/workspace-format.md` | File format templates | Defines markdown structure for all workspace files; add solution-complete.md template |
| Read tool | Built-in Claude Code tool | Read workspace files | Already used throughout SKILL.md for reading agent outputs |
| Write tool | Built-in Claude Code tool | Write solution-complete.md | Already used in Step 2 for writing problem-raw.md |
| Print: pattern | SKILL.md convention | Terminal output | All steps use `Print:` statements; Step 6 follows the same pattern |

### Supporting

None needed.

### Alternatives Considered

None -- the existing infrastructure handles everything this phase requires.

**Installation:**
No packages to install.

## Architecture Patterns

### Recommended Changes

```
Files to modify:
  claude-code/.claude/skills/solve/SKILL.md        # Add Step 6
  claude-code/references/workspace-format.md        # Add solution-complete.md template

Files unchanged:
  claude-code/.claude/agents/*.md                   # No agent changes
  claude-code/CLAUDE.md                             # Workspace structure doc already covers new file
```

### Pattern 1: Step 6 Structure in SKILL.md

**What:** A new Step 6 appended after the current Step 5d that reads workspace files and produces output.
**When to use:** After the pipeline completes (answers.md exists).

The step has two sub-steps:
- **Step 6a: Terminal Display** -- Read files, print formatted results
- **Step 6b: Solution File** -- Read files, write solution-complete.md

```
## Step 6: Output Results

### Step 6a: Terminal Display

Read {CURRENT_SOLUTION} to extract rules and vocabulary.
Read {WORKSPACE}/answers.md to extract translated answers.
Read {CURRENT_VERIFICATION} (or {WORKSPACE}/verification.md) to extract pass rate.

Print: "" (blank line for spacing)
Print: "--- Results ---"
Print: ""
Print: "Rules:"
For each rule in the solution:
  Print: "{N}. {rule_title} -- {one-line description}"
  If rule failed verification, also print:
    Print: "   [FAIL] {verifier reasoning}"

Print: ""
Print: "Answers:"
For each question in answers.md:
  Print: "{Q_ID}: {input_sentence} -> {translation}"

Print: ""
Print: "Pass rate: {rate}%"

If errors.md exists and contains entries that affected the outcome:
  Print: ""
  Print: "Warnings:"
  For each relevant error:
    Print: "- {agent}: {message}"
```

### Pattern 2: Data Extraction from Workspace Files

**What:** Reading known markdown structures to extract data for reformatting.
**When to use:** Throughout Step 6.

The key files and what to extract from each:

| File | Sections to Read | Data Needed |
|------|-----------------|-------------|
| `{CURRENT_SOLUTION}` (solution.md or improved-N.md) | `## Rules`, `## Vocabulary` | Rule titles, descriptions, evidence, confidence; vocab table rows |
| `{CURRENT_VERIFICATION}` (verification.md or verification-N.md) | `## Summary`, `## Rule Results` | Pass rate, per-rule PASS/FAIL status and reasoning |
| `{WORKSPACE}/answers.md` | Each `## Q{N}:` section | Question ID, input, translation, confidence |
| `{WORKSPACE}/errors.md` | All entries (if file exists) | Agent, error type, message, recovery status |
| `{WORKSPACE}/verification*.md` files | `## Summary` of each | Pass rate per iteration for the verification summary lines |

**Important:** CURRENT_SOLUTION and CURRENT_VERIFICATION are variables set during Step 5. The /solve skill tracks which file is the latest. Step 6 must use these same variables.

### Pattern 3: Verification History Collection

**What:** Gathering pass rate progression across iterations for the solution file's Verification Summary section.
**When to use:** When building the verification summary lines like `Iteration 2: 87% -> 94%`.

The verification files follow a naming pattern:
- `{WORKSPACE}/verification.md` -- from Step 4f (the initial convergence check, iteration 0)
- `{WORKSPACE}/verification-1.md` through `verification-4.md` -- from Step 5c iterations

To build the summary:
1. Read `{WORKSPACE}/verification.md` and extract pass rate (this is iteration 0)
2. For I = 1 to 4, check if `{WORKSPACE}/verification-{I}.md` exists
3. If it exists, read and extract pass rate
4. Format as: `Iteration 0: {rate}% -> Iteration 1: {rate}% -> ...`

Or as individual lines:
```
- Iteration 0 (initial): 78%
- Iteration 1: 87%
- Iteration 2: 94%
- Iteration 3: 100%
```

### Pattern 4: Solution-Complete.md Generation

**What:** A Write tool call that produces the consolidated solution file.
**When to use:** Step 6b.

Template structure (matching user decisions on section order):

```markdown
# Complete Solution

> Problem: See problem.md

## Rules

### 1. {Rule Title}

{Full description}

**Evidence:** {evidence sentences}
**Confidence:** {HIGH/MEDIUM/LOW}
**Verification:** {PASS/FAIL}
{If FAIL: **Failure reason:** {verifier reasoning}}

(repeat for each rule)

## Vocabulary

| Form | Meaning | Type | Notes |
|------|---------|------|-------|
| {form} | {meaning} | {type} | {notes} |

## Verification Summary

- Iteration 0 (initial): {rate}%
- Iteration 1: {rate}%
- ...
- Final: {rate}%

## Answers

### Q1: {Direction}

**Input:** {sentence}
**Translation:** {answer}
**Confidence:** {level}

(repeat for each question)

## Pipeline Notes

> This section is only included if errors occurred during the pipeline.

- {timestamp}: {agent} -- {error message} (Recovered: {yes/no})
```

### Anti-Patterns to Avoid

- **Re-reading problem.md in the solution file:** User decided problem structure should be referenced only (`See problem.md`), not inlined. Do not copy the dataset or context into solution-complete.md.
- **Including hypothesis round details:** User explicitly excluded per-perspective hypothesis details from the solution file. Those remain in `{WORKSPACE}/hypotheses/round-N/` files.
- **Full verification tables in the solution file:** User wants one summary line per iteration, not full tables with per-sentence results.
- **Printing workspace path at the end:** User explicitly said not to print the solution file path or workspace path. The pipeline already printed the workspace path in the old Step 5 ending -- that `Print:` line must be removed.
- **Vocabulary printing in terminal:** The user decision says terminal shows rules and answers. Vocabulary is not mentioned for terminal display -- include it in the solution file but not necessarily in the terminal summary (Claude's discretion on terminal formatting).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown parsing | Custom regex parser for workspace files | Direct `Read` tool + section scanning | Workspace files follow known templates; full parsing is unnecessary |
| File existence checks | Complex error handling | `test -f` via Bash | Already used throughout SKILL.md |

**Key insight:** The workspace file formats are controlled by this project's own agents and templates. There is no need for a general-purpose markdown parser -- the SKILL.md instructions can reference specific section headers and table formats that are guaranteed by the workspace-format.md templates.

## Common Pitfalls

### Pitfall 1: Wrong CURRENT_SOLUTION Reference
**What goes wrong:** Step 6 reads `{WORKSPACE}/solution.md` instead of the latest improved file.
**Why it happens:** The verify-improve loop updates CURRENT_SOLUTION to `{WORKSPACE}/improved-{I}.md` but if Step 6 is written as a static reference to `solution.md`, it will read stale data.
**How to avoid:** Step 6 must use the same CURRENT_SOLUTION variable that Step 5 tracks. The SKILL.md instructions should explicitly carry this variable from Step 5 into Step 6.
**Warning signs:** Rules in terminal output don't match the latest verification results.

### Pitfall 2: Missing Verification Files
**What goes wrong:** The verification history collection tries to read files that don't exist (e.g., if the loop converged early).
**Why it happens:** The loop breaks on 100% pass rate, so verification-3.md and verification-4.md may not exist.
**How to avoid:** Step 6 must check file existence before reading each verification file. Only include iterations that actually occurred.
**Warning signs:** Errors during output generation about missing files.

### Pitfall 3: Removing the Existing Pipeline Complete Line Too Early
**What goes wrong:** The current SKILL.md ends with `Print: "Pipeline complete. Workspace: {WORKSPACE}/"`. If this is removed but Step 6 fails, there's no indication the pipeline finished.
**Why it happens:** The user said not to print workspace path, but the print also serves as a completion signal.
**How to avoid:** Replace the existing line with the new Step 6 output. The pass rate and results display serves as the new completion signal.
**Warning signs:** Pipeline appears to hang or produce no output on completion.

### Pitfall 4: Terminal Output for Completely Failed Runs
**What goes wrong:** If the pipeline produced no answers (answerer failed), Step 6 has nothing to display for the Answers section.
**Why it happens:** Edge case where errors.md exists but answers.md does not.
**How to avoid:** Step 6 should check for answers.md existence. If missing, print a failure message instead of trying to format non-existent answers.
**Warning signs:** Crash or empty output when answers.md is missing.

### Pitfall 5: Vocabulary Table in Solution-Complete.md from Wrong Source
**What goes wrong:** Vocabulary table is read from the initial `solution.md` instead of the latest improved file.
**Why it happens:** Same as Pitfall 1 -- the improved files contain updated vocabulary.
**How to avoid:** Use CURRENT_SOLUTION consistently for both rules and vocabulary.
**Warning signs:** Vocabulary in solution-complete.md doesn't reflect improvements made during the verify-improve loop.

## Code Examples

### Terminal Output Format (Recommended)

Based on user decisions for the terminal display:

```
--- Results ---

Rules:
1. Verb-initial word order (VSO) -- Sentences follow V-S-O order
2. Tense/aspect suffixes -- Verbs take -ti (past), -su (future), -ra (perfective)
3. Subject pronouns -- na (I), ko (you), la (he/she) appear between verb and object
   [FAIL] The distinction between -ti and -ra is not well captured; both map to past tense in some contexts

Answers:
Q1: Vene-ti la boro -> He/she caught the fish
Q2: You will eat the bird -> Kala-su ko siga
Q3: Mira-ra na siga -> I spotted the bird

Pass rate: 94%
```

Notes on formatting decisions (Claude's discretion):
- Use `[FAIL]` as the failure indicator (plain text, no emoji, clear and grep-able)
- Indent failure reasoning under the rule it belongs to
- Separate sections with blank lines for readability
- No markdown formatting (no `**bold**` or `## headers`) -- keep it plain terminal text
- Rule one-line descriptions truncated from the full rule description (first sentence or clause)

### Solution-Complete.md Template

```markdown
# Complete Solution

> Problem: See problem.md

## Rules

### 1. Verb-initial word order (VSO)

Taloki sentences follow Verb-Subject-Object order: the inflected verb comes first, then the subject pronoun, then the object noun.

**Evidence:** All dataset sentences (#1-#6).
**Confidence:** HIGH
**Verification:** PASS

### 2. Tense/aspect suffixes

Verbs take suffixes marking tense and aspect:
- `-ti` marks simple past ("ate", "saw")
- `-su` marks future ("will eat", "will see")
- `-ra` marks perfective past -- completed actions

**Evidence:** -ti in #1, #3; -su in #2, #5; -ra in #4, #6.
**Confidence:** MEDIUM
**Verification:** FAIL
**Failure reason:** The distinction between -ti and -ra is not consistently applied; sentence #6 generated "ate" instead of "caught".

## Vocabulary

| Form | Meaning | Type | Notes |
|------|---------|------|-------|
| kala | eat | verb-root | #1, #3 |
| mira | see | verb-root | #2, #5 |
| vene | catch | verb-root | #4 |
| boro | fish | noun | #1, #2, #5 |
| siga | bird | noun | #3, #4, #6 |
| na | I/me | pronoun | First person |
| ko | you | pronoun | Second person |
| la | he/she | pronoun | Third person |

## Verification Summary

- Iteration 0 (initial): 78%
- Iteration 1: 87%
- Iteration 2: 94%

## Answers

### Q1: Taloki -> English

**Input:** Vene-ti la boro
**Translation:** He/she caught the fish
**Confidence:** HIGH

### Q2: English -> Taloki

**Input:** You will eat the bird
**Translation:** Kala-su ko siga
**Confidence:** HIGH

### Q3: Taloki -> English

**Input:** Mira-ra na siga
**Translation:** I spotted the bird
**Confidence:** MEDIUM
```

### SKILL.md Step 6 Skeleton

The step to append to SKILL.md after the current Step 5d:

```
## Step 6: Output Results

### Step 6a: Display Results in Terminal

Read {CURRENT_SOLUTION} to get rules (## Rules section) and vocabulary (## Vocabulary section).
Read {WORKSPACE}/answers.md to get translated answers (each ## Q{N} section).
Read the latest verification file ({CURRENT_VERIFICATION}) to get the overall pass rate and per-rule results.

Print: ""
Print: "--- Results ---"
Print: ""
Print: "Rules:"

For each rule (### {title} under ## Rules in CURRENT_SOLUTION):
  - Extract the title and first sentence of the description as a one-liner
  - Check the Rule Results in CURRENT_VERIFICATION for this rule's status
  - Print: "{N}. {title} -- {one-liner}"
  - If the rule's status is FAIL or NEEDS_UPDATE:
    - Extract the verifier's reasoning from the Rule Results section
    - Print: "   [FAIL] {reasoning}"

Print: ""
Print: "Answers:"

For each question section (## Q{N} in answers.md):
  - Extract the input sentence and translation
  - Print: "{Q_ID}: {input} -> {translation}"

Print: ""

Extract the pass rate from CURRENT_VERIFICATION's ## Summary section.
Print: "Pass rate: {rate}%"

If {WORKSPACE}/errors.md exists:
  Read it and check for errors that affected the outcome (non-recovered errors or errors that caused fallbacks).
  If any such errors exist:
    Print: ""
    Print: "Warnings:"
    For each relevant error:
      Print: "- {agent}: {message}"

### Step 6b: Write Solution File

Read {CURRENT_SOLUTION} for rules and vocabulary sections.
Read {CURRENT_VERIFICATION} for per-rule verification status and reasoning.
Read {WORKSPACE}/answers.md for translated answers.
If {WORKSPACE}/errors.md exists, read it for pipeline notes.

Collect verification history:
  Read {WORKSPACE}/verification.md and extract pass rate (iteration 0).
  For I = 1 to 4:
    Check if {WORKSPACE}/verification-{I}.md exists (using test -f).
    If it exists, read it and extract pass rate.

Write {WORKSPACE}/solution-complete.md using the Write tool with the following structure:
(See workspace-format.md for the solution-complete.md template)
```

## State of the Art

Not applicable -- this phase uses no external libraries or frameworks. The implementation is entirely within the project's existing SKILL.md pattern.

## Open Questions

1. **How to handle vocabulary in terminal display**
   - What we know: User decisions explicitly mention rules and answers for terminal. Vocabulary is not mentioned for terminal but IS in the solution file.
   - What's unclear: Should vocabulary be shown in terminal? The OUTP-01 requirement says "rules, vocabulary, answers" but the user decisions don't include a vocabulary terminal format.
   - Recommendation: Include vocabulary in terminal output as a brief list (form = meaning). OUTP-01 explicitly lists vocabulary. The user decisions focused on format details for rules and answers but didn't explicitly exclude vocabulary from terminal. Show it between Rules and Answers.

2. **Handling the Step 4f verification.md vs Step 5c verification files**
   - What we know: Step 4f writes `verification.md` (no number). Step 5c writes `verification-{I}.md`. The variable CURRENT_VERIFICATION tracks the latest.
   - What's unclear: If Step 5 is skipped (100% at Step 4f), only `verification.md` exists. The verification history section should handle this gracefully.
   - Recommendation: Always treat `verification.md` as iteration 0. If no verification-{I}.md files exist, the summary is just one line.

## Sources

### Primary (HIGH confidence)

- **SKILL.md** (`claude-code/.claude/skills/solve/SKILL.md`) -- Current pipeline definition with all 5 steps; read in full to understand the integration point for Step 6
- **workspace-format.md** (`claude-code/references/workspace-format.md`) -- Templates for all workspace file formats; confirmed the exact markdown structure for solution.md, verification.md, answers.md, and errors.md
- **24-CONTEXT.md** -- User decisions on terminal format, solution file structure, and error handling
- **REQUIREMENTS.md** -- OUTP-01, OUTP-02, OUTP-03 requirement definitions
- **CLAUDE.md** -- Project conventions including workspace structure and file conventions

### Secondary (MEDIUM confidence)

None needed -- all information comes from project-internal sources.

### Tertiary (LOW confidence)

None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no external dependencies; uses only existing project infrastructure
- Architecture: HIGH -- direct extension of existing SKILL.md pattern with well-defined input files
- Pitfalls: HIGH -- all pitfalls identified from reading the actual SKILL.md variable tracking and file naming patterns

**Research date:** 2026-03-08
**Valid until:** Indefinite -- this research is based on project internals, not external libraries
