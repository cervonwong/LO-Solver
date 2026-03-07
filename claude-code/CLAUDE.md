# LO-Solver Claude Code Pipeline

This project reimplements the LO-Solver's Mastra-based pipeline as a Claude Code native experience using subagents, skills, and file-based state. It runs alongside the existing Mastra implementation in the parent repository.

## Model

All solver agents use Opus 4.6. Every agent definition file MUST include `model: opus` in its YAML frontmatter.

## Pipeline

See PIPELINE.md for the full pipeline reference document describing all steps, data flow, agent roles, and design rationale.

The pipeline has 4 logical stages:
1. **Extract** -- Parse raw problem into structured markdown (context, dataset, questions)
2. **Hypothesize** -- Generate linguistic rules and vocabulary from multiple perspectives
3. **Verify & Improve** -- Test rules against the dataset, revise failures (up to 4 iterations)
4. **Answer** -- Apply validated rules to translate question sentences

## Agents

Agent definitions live in `.claude/agents/`. Each is a single self-contained markdown file:
- `extractor.md` -- Parse raw problem into structured markdown
- `hypothesizer.md` -- Generate linguistic rules and vocabulary from a given perspective
- `verifier.md` -- Test rules against the dataset
- `improver.md` -- Revise failing rules based on verification results
- `synthesizer.md` -- Merge best rules from multiple perspectives
- `answerer.md` -- Apply rules to translate questions

Agents communicate via file-based handoff: each reads predecessor files from the workspace and writes its own output files.

## Workspace

Per-run output stored in `workspace/{datetime}/` (e.g., `workspace/2026-03-07_14-30-00/`). Runs are always preserved (no auto-cleanup).

### Structure
```
workspace/{datetime}/
  problem.md                 # Extracted: context, dataset, questions
  hypotheses/
    round-1/
      perspective-1.md       # Vocab + rules (e.g., morphological focus)
      perspective-2.md       # Vocab + rules (e.g., syntactic focus)
      verification-1.md      # Test results for perspective-1
      verification-2.md      # Test results for perspective-2
    round-2/
      perspective-1.md
      verification-1.md
  solution.md                # Merged/synthesized vocab + rules
  verification.md            # Final verification results
  answers.md                 # Translated answers
  errors.md                  # Error log (if any failures occurred)
```

### File Format
All workspace files use markdown (no JSON). See `references/workspace-format.md` for templates.

## Conventions

- Agent file names: plain descriptive (e.g., `extractor.md`, not `01-extractor.md`)
- Default perspective count per round: 3
- Non-critical failures (hypothesizer, verifier): retry once, then skip and continue
- Critical failures (extractor): abort with clear error message
- Error logging: separate `errors.md` file in the run folder

## Domain Context

A Rosetta Stone problem provides sentences in an unfamiliar language paired with their English translations. The task is to discover the language's linguistic rules (grammar, morphology, phonology) and use them to translate new sentences that have no provided translation. These problems come from Linguistics Olympiad competitions.
