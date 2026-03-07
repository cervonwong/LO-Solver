# Phase 20: Infrastructure Setup - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the `claude-code/` directory for agent development: create `.claude/` directory structure with agent definition conventions, write a project CLAUDE.md with context and conventions, and establish the workspace directory pattern for file-based agent state. The `/solve` skill shell is scaffolded here; orchestrator logic is Phase 22.

</domain>

<decisions>
## Implementation Decisions

### Agent file organization
- Flat directory structure — all agent .md files directly in `claude-code/.claude/agents/` (or equivalent)
- Plain descriptive names — no numbered prefixes (e.g., `extractor.md`, `hypothesizer.md`, not `01-extractor.md`)
- Single self-contained .md per agent — each file contains prompt/instructions, input/output format, and tool descriptions inline
- Shared static reference content (schemas, tool docs, format specs) in a shared reference file — Claude's discretion on exact location

### Workspace conventions
- Root: `claude-code/workspace/` (gitignored)
- Per-run folders named by datetime (e.g., `2026-03-07_14-30-00/`)
- Runs always preserved — no auto-cleanup
- Updated workspace structure (all markdown):
  ```
  workspace/2026-03-07_14-30-00/
    problem.md               # Extracted: context, dataset, questions
    hypotheses/
      round-1/
        perspective-1.md      # Vocab + rules (morphological focus)
        perspective-2.md      # Vocab + rules (syntactic focus)
        verification-1.md     # Test results for perspective-1
        verification-2.md     # Test results for perspective-2
      round-2/
        perspective-1.md
        verification-1.md
    solution.md               # Merged/synthesized vocab + rules
    verification.md           # Final verification results
    answers.md                # Translated answers
    errors.md                 # Error log (if any failures occurred)
  ```

### File formats
- All workspace files use markdown — no JSON
- Simplified formats, not matching Mastra's in-memory schemas
- Shared reference file with markdown templates showing exact expected file structure
- Vocabulary and rules combined in same file per hypothesis perspective

### CLAUDE.md content scope
- Reference PIPELINE.md for pipeline details (don't duplicate)
- Include: model requirement (Opus 4.6), workspace directory structure, agent file naming conventions
- Include: agent communication patterns (file-based handoff via workspace)
- Include: brief problem domain context (what a Rosetta Stone problem is, key terminology)
- Include: brief mention that this is a reimplementation of the Mastra pipeline
- Exclude: testing guidance (added later when agents exist)

### Slash command design (/solve)
- Lives in `claude-code/.claude/skills/` (project-scoped)
- Accepts optional file path argument: `/solve examples/problem1.md` runs immediately, `/solve` prompts for input
- Input modes: paste inline or provide file path
- Output: terminal display (answers + key rules + brief stats) AND workspace file written

### Error & failure handling
- Non-critical failures (hypothesizer, verifier): retry once, then skip that perspective and continue
- Critical failures (extractor/Step 1): abort with clear error message
- Error log: separate `errors.md` file in the run folder collecting all failures

### Progress reporting
- Step-level updates with pass rates (not verbose agent output, not silent)
- Example output style:
  ```
  Extracting problem...
    Done. 12 sentences, 5 questions.

  Hypothesizing (3 perspectives)...
    perspective-1 (morphological): done
    perspective-2 (syntactic): done
    perspective-3 (phonological): done

  Verifying round 1...
    perspective-1: 8/12 pass
    perspective-2: 10/12 pass
    perspective-3: 6/12 pass

  Synthesizing best results...
    Done. 11/12 sentences pass.
  ```
- Final output includes: translated answers, key rules summary, brief stats (time, rounds, pass rate)

### Agent dispatch model
- Single agent per pipeline step (~6 agents total, not 12) — Opus 4.6 handles both reasoning and structured output, no two-agent chains needed
- Approximate agent list: extractor, hypothesizer, verifier, improver, synthesizer, answerer
- Parallel dispatch for hypothesis perspectives within a round
- Parallel verification (verify each perspective as soon as hypothesis completes)
- Sequential synthesis after all perspectives verified
- Configurable perspective count per round (default: 3)

### Claude's Discretion
- Exact directory name for shared references (e.g., `claude-code/references/` or `claude-code/.claude/references/`)
- Shared reference file structure and organization
- Specific markdown template designs for each workspace file type
- How the configurable perspective count is exposed (CLAUDE.md constant, config file, etc.)

</decisions>

<specifics>
## Specific Ideas

- Vocabulary and rules should be "put down clearly" — not strict JSON schemas, natural markdown that agents can read and write fluently
- The workspace layout was confirmed with a specific tree structure showing round/perspective nesting
- Progress output style inspired by the mockup: step name, indented sub-items with pass rates
- Final answer output includes both translations and a "Key Rules Applied" section with a link to the full solution file

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `claude-code/PIPELINE.md`: Comprehensive pipeline reference document already exists (Phase 19 output) — agents can read this for full pipeline understanding
- `examples/` directory: Contains example linguistics problems and Linguini dataset for testing
- Main repo's `.claude/` structure: Reference for how Claude Code agents/skills are organized

### Established Patterns
- Main repo uses numbered file prefixes (`01-`, `02-`) for pipeline ordering — Claude Code version explicitly chose NOT to follow this, using plain descriptive names instead
- Main repo uses two-agent chains (reasoning + extraction) — Claude Code version consolidates to single agent per step
- Main repo uses JSON schemas (Zod) for data interchange — Claude Code version uses markdown files instead

### Integration Points
- `/solve` skill connects user input to the orchestrator (Phase 22)
- Workspace directory is the primary integration point between all agents — each agent reads predecessor files and writes its own output
- `examples/` directory provides test problems accessible from claude-code/

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-infrastructure-setup*
*Context gathered: 2026-03-07*
