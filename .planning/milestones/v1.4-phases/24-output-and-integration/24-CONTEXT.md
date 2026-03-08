# Phase 24: Output and Integration - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

After the solver pipeline completes, produce readable terminal output and a complete markdown solution file with all intermediate steps preserved. The workspace already retains all files (OUTP-03 is satisfied by existing behavior). This phase adds terminal display (OUTP-01) and the consolidated solution file (OUTP-02).

</domain>

<decisions>
## Implementation Decisions

### Terminal results display
- Show answers as a **numbered list** (not a table): `Q1: Vene-ti la boro → He/she ate the fish`
- Show discovered rules as **titles + one-line descriptions**: `1. Verb-initial word order (VSO) — Sentences follow V-S-O order`
- **Always show final pass rate** (e.g., `Pass rate: 87%`), even when 100%
- Failing rules/sentences shown **inline** with results, marked with a failure indicator
- Agent failures mentioned in terminal **only if they affected the result** (e.g., caused a fallback or degraded outcome)
- **Do not** print the solution file path or workspace path at the end — user already knows from earlier pipeline output

### Solution file structure
- Written to `{WORKSPACE}/solution-complete.md` (new file alongside existing workspace files, does not overwrite `solution.md`)
- **Section order:** Rules → Vocabulary → Verification Summary → Answers → Pipeline Notes
- Problem structure **referenced only** (`See problem.md`), not included inline — keeps the file focused on results
- **Rules:** Full detail per rule — title, description, evidence sentences, confidence level, and verification status (PASS/FAIL)
- **Vocabulary:** Full table with form, meaning, type, and notes columns
- **Verification summary:** One summary line per iteration (e.g., `Iteration 2: 87% → 94%`), not full verification tables
- **Answers:** Final translated answers for all questions
- Hypothesis round details (individual perspectives, per-round results) **not included** — those are in the workspace hypothesis files
- **Final verification only** — the summary lines per iteration cover the history; no full iteration tables

### Error and failure reporting
- Failing rules in the solution file **include the verifier's reasoning** about why they failed
- **Pipeline Notes section** included in solution file **only if errors occurred** (agent failures, retries, fallbacks); omitted on clean runs
- Terminal output mentions agent failures **only when they affected the outcome**

### Claude's Discretion
- Exact formatting/spacing of terminal output
- Whether to use markdown formatting in terminal (headers, bold) vs plain text
- How to abbreviate long rule descriptions for the one-liner terminal display
- Failure indicator style (e.g., ❌, [FAIL], etc.)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SKILL.md` (solve skill): The orchestrator that needs the output step appended — currently ends with `"Pipeline complete. Workspace: {WORKSPACE}/"`
- `references/workspace-format.md`: Defines file format templates for all workspace files; `solution-complete.md` format should be added here
- Existing workspace files (`solution.md`, `verification.md`, `answers.md`): Source data for the consolidated output

### Established Patterns
- All workspace files use **markdown format** (no JSON) — solution-complete.md follows this pattern
- SKILL.md uses `Print:` statements for terminal output — output step should follow the same pattern
- Agent output files have consistent markdown structure with `## Section` headers

### Integration Points
- New output step goes at the end of SKILL.md (after Step 5d Answer)
- Reads from: `{WORKSPACE}/solution.md` (or `improved-{I}.md`), `{WORKSPACE}/answers.md`, `{WORKSPACE}/verification*.md`, `{WORKSPACE}/errors.md`
- Writes to: `{WORKSPACE}/solution-complete.md`
- No agent needed — the /solve skill itself can read workspace files and produce output

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-output-and-integration*
*Context gathered: 2026-03-08*
