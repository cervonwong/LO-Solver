# Phase 20: Infrastructure Setup - Research

**Researched:** 2026-03-07
**Domain:** Claude Code project structure, agent definitions, skill definitions, CLAUDE.md conventions
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Flat directory structure — all agent .md files directly in `claude-code/.claude/agents/` (or equivalent)
- Plain descriptive names — no numbered prefixes (e.g., `extractor.md`, `hypothesizer.md`, not `01-extractor.md`)
- Single self-contained .md per agent — each file contains prompt/instructions, input/output format, and tool descriptions inline
- Shared static reference content (schemas, tool docs, format specs) in a shared reference file — Claude's discretion on exact location
- Workspace root: `claude-code/workspace/` (gitignored), per-run folders named by datetime (e.g., `2026-03-07_14-30-00/`), runs always preserved (no auto-cleanup)
- Workspace structure: `problem.md`, `hypotheses/round-N/perspective-N.md`, `hypotheses/round-N/verification-N.md`, `solution.md`, `verification.md`, `answers.md`, `errors.md`
- All workspace files use markdown — no JSON
- CLAUDE.md content scope: reference PIPELINE.md for pipeline details, include model requirement (Opus 4.6), workspace directory structure, agent file naming conventions, agent communication patterns (file-based handoff), brief problem domain context, brief mention of Mastra reimplementation; exclude testing guidance
- `/solve` skill lives in `claude-code/.claude/skills/`, accepts optional file path argument, supports paste inline or file path input
- Non-critical failures: retry once then skip; critical failures (extractor): abort with clear error
- Error log: separate `errors.md` in run folder
- Step-level progress updates with pass rates (not verbose, not silent)
- Single agent per pipeline step (~6 agents: extractor, hypothesizer, verifier, improver, synthesizer, answerer)
- Parallel dispatch for hypothesis perspectives within a round
- Configurable perspective count per round (default: 3)

### Claude's Discretion
- Exact directory name for shared references (e.g., `claude-code/references/` or `claude-code/.claude/references/`)
- Shared reference file structure and organization
- Specific markdown template designs for each workspace file type
- How the configurable perspective count is exposed (CLAUDE.md constant, config file, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | `claude-code/` directory with `.claude/` containing all agent/skill definitions | Claude Code `.claude/agents/` for subagent definitions, `.claude/skills/` for skill definitions — standard directory structure documented in official Claude Code docs. Agents use YAML frontmatter + markdown body. |
| INFR-02 | All agents use Opus 4.6 | The `model` field in agent frontmatter accepts model aliases (`opus`, `sonnet`, `haiku`) or `inherit`. Use `model: opus` to specify Opus 4.6. |
| INFR-03 | CLAUDE.md with project context and conventions | CLAUDE.md placed at `claude-code/CLAUDE.md` provides project-scoped instructions loaded at session start. Must be concise (<200 lines recommended). |

</phase_requirements>

## Summary

Phase 20 sets up the `claude-code/` directory as a self-contained Claude Code project with its own `.claude/` configuration, agent definitions, skill shell, and workspace conventions. The technical domain is entirely Claude Code configuration -- no application code, no dependencies, no build tools. The deliverables are markdown files in specific directory locations following Claude Code's conventions.

The primary challenge is getting the file formats and directory layout correct so that Claude Code discovers and uses agents, skills, and CLAUDE.md properly. The official documentation (verified March 2026) is clear on these conventions. Agent definitions use YAML frontmatter with `name`, `description`, `tools`, and `model` fields, followed by a markdown body that becomes the system prompt. Skills use a similar format in `SKILL.md` files within named subdirectories. CLAUDE.md is plain markdown loaded at session start.

**Primary recommendation:** Create the directory structure, write skeleton agent `.md` files (placeholder prompts -- full prompts are Phase 21+), the `/solve` skill shell, the shared reference file with workspace templates, CLAUDE.md, and `.gitignore`. No code to write, no packages to install.

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|--------------|---------|---------|--------------|
| Claude Code | Current | Agent runtime, subagent dispatch, skill invocation | The entire `claude-code/` project runs inside Claude Code |
| Claude Opus 4.6 | Current | Model for all solver agents | User decision: single model per agent, Opus handles both reasoning and extraction |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| Markdown | N/A | All file formats (workspace, agent defs, references) | Every file in the project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown workspace files | JSON files | User explicitly chose markdown for agent-friendly reading/writing |
| Single agent per step | Two-agent chains (reasoning + extraction) | User decided Opus 4.6 handles both; simpler architecture |

**Installation:** None required. Claude Code is the runtime. No `npm install` or package setup needed for this phase.

## Architecture Patterns

### Recommended Project Structure

```
claude-code/
├── CLAUDE.md                          # Project context and conventions
├── PIPELINE.md                        # Pipeline reference (Phase 19, already exists)
├── .claude/
│   ├── agents/
│   │   ├── extractor.md               # Step 1: Parse raw problem
│   │   ├── hypothesizer.md            # Step 2: Generate rules + vocabulary
│   │   ├── verifier.md                # Step 2/3: Test rules against dataset
│   │   ├── improver.md                # Step 2/3: Revise failing rules
│   │   ├── synthesizer.md             # Step 2: Merge perspective rulesets
│   │   └── answerer.md                # Step 4: Apply rules to answer questions
│   ├── skills/
│   │   └── solve/
│   │       └── SKILL.md               # /solve slash command
│   └── settings.json                  # (if needed for permissions)
├── references/
│   └── workspace-format.md            # Shared reference: workspace file templates
├── workspace/                         # Per-run output (gitignored)
│   └── .gitkeep
└── .gitignore                         # Ignore workspace/
```

### Pattern 1: Agent Definition File Format

**What:** Each agent is a markdown file in `.claude/agents/` with YAML frontmatter and a markdown body that becomes the system prompt.

**When to use:** For every solver agent.

**Example:**
```markdown
---
name: extractor
description: Parses raw Linguistics Olympiad problem text into structured markdown components (context, dataset, questions). Use when the orchestrator needs to extract structure from a problem.
tools: Read, Write
model: opus
---

You are an expert linguist specializing in parsing Linguistics Olympiad problems.

[Full system prompt goes here — Phase 21 content]
```

Source: [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents)

**Key frontmatter fields for this project:**

| Field | Value | Notes |
|-------|-------|-------|
| `name` | descriptive kebab-case | e.g., `extractor`, `hypothesizer` |
| `description` | when to delegate to this agent | Claude uses this to decide delegation |
| `tools` | comma-separated tool names | e.g., `Read, Write, Bash, Grep, Glob` |
| `model` | `opus` | Satisfies INFR-02: all agents use Opus 4.6 |

### Pattern 2: Skill Definition for /solve

**What:** A skill directory with `SKILL.md` that the user invokes via `/solve`.

**When to use:** Entry point for the solver pipeline.

**Example:**
```yaml
---
name: solve
description: Solve a Linguistics Olympiad Rosetta Stone problem
disable-model-invocation: true
argument-hint: "[file-path]"
---

Solve a Linguistics Olympiad Rosetta Stone problem.

If $ARGUMENTS is a file path, read the problem from that file.
If $ARGUMENTS is empty, ask the user to paste the problem text or provide a file path.

[Orchestrator instructions go here — Phase 22 content]
```

Source: [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)

**Key design decisions:**
- `disable-model-invocation: true` — only user-triggered, prevents Claude from auto-invoking the solver
- `argument-hint: "[file-path]"` — shows hint in autocomplete
- `$ARGUMENTS` — receives the optional file path
- No `context: fork` — the orchestrator runs in the main conversation context (required so it can dispatch subagents; subagents cannot spawn other subagents)

### Pattern 3: CLAUDE.md as Project Memory

**What:** A concise markdown file at the project root providing persistent instructions to Claude.

**When to use:** Every Claude Code session in `claude-code/`.

**Example structure:**
```markdown
# CLAUDE.md

## Project Overview
[Brief: what this project is, that it reimplements the Mastra pipeline]

## Model
All agents use Opus 4.6 (model: opus in agent frontmatter).

## Pipeline
See PIPELINE.md for full pipeline reference.

## Workspace
[Directory structure, per-run folders, file formats]

## Agent Conventions
[Naming, file-based handoff, communication pattern]

## Domain Context
[What a Rosetta Stone problem is, key terminology]
```

Source: [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory)

**Key constraints:**
- Target under 200 lines (official recommendation for adherence)
- Reference PIPELINE.md via `@PIPELINE.md` import or just mention it (don't duplicate)
- Include model requirement, workspace structure, agent conventions, domain context
- Exclude testing guidance (added later when agents exist)

### Pattern 4: File-Based Agent Communication

**What:** Agents communicate by reading and writing markdown files in the workspace directory. No shared in-memory state.

**When to use:** Every inter-agent handoff in the pipeline.

**Design:**
- Each agent reads its predecessor's output file(s) from `workspace/{run}/`
- Each agent writes its own output file(s) to `workspace/{run}/`
- The orchestrator (/solve skill) coordinates which agent runs when and passes the workspace path
- No JSON, no schemas — agents read and write natural markdown

### Anti-Patterns to Avoid

- **Numbered agent file prefixes:** User explicitly decided against `01-extractor.md` style. Use plain `extractor.md`.
- **JSON workspace files:** User explicitly chose markdown for all workspace files.
- **Duplicating pipeline docs in CLAUDE.md:** Reference PIPELINE.md instead.
- **`context: fork` on the /solve skill:** The orchestrator must be able to dispatch subagents. Skills with `context: fork` run in a subagent, and subagents cannot spawn other subagents. The /solve skill must run in the main conversation context.
- **Agent definitions with prompts in Phase 20:** This phase creates skeleton agent files. Full system prompts are Phase 21+ content.
- **Auto-invocable /solve skill:** The solver should only run when the user explicitly types `/solve`, not when Claude decides to invoke it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Agent dispatch | Custom script/code to spawn agents | Claude Code's built-in subagent system via Agent tool | Claude Code handles context isolation, tool access, model selection, and result summarization |
| Skill invocation | Custom CLI entry point | Claude Code's `/skill-name` system | Handles argument parsing, autocomplete, tool permissions |
| Project-wide instructions | Repeated inline instructions per agent | `CLAUDE.md` file at project root | Automatically loaded at session start, survives compaction |
| Shared reference docs | Duplicating schemas/formats in every agent | Shared reference file that agents read on demand | Single source of truth; agents use Read tool to load when needed |
| Workspace directory creation | Hardcoded mkdir scripts | Agents create directories via Write/Bash tools at runtime | Claude Code agents have full filesystem access |

**Key insight:** Phase 20 creates configuration files (markdown). There is no application code, no package management, and no build system. The "infrastructure" is entirely Claude Code's built-in project structure conventions.

## Common Pitfalls

### Pitfall 1: Orchestrator in a Forked Context
**What goes wrong:** If the `/solve` skill uses `context: fork`, it runs in a subagent. Subagents cannot spawn other subagents (documented limitation). The orchestrator would be unable to dispatch any solver agents.
**Why it happens:** `context: fork` seems natural for isolation, but it removes the ability to delegate.
**How to avoid:** Do NOT set `context: fork` on the `/solve` skill. The orchestrator must run in the main conversation context.
**Warning signs:** "Subagents cannot spawn other subagents" error at runtime.

### Pitfall 2: CLAUDE.md Too Large
**What goes wrong:** Instructions beyond ~200 lines reduce adherence. Claude may ignore or partially follow long instruction files.
**Why it happens:** Temptation to include full pipeline documentation, workspace templates, and detailed conventions.
**How to avoid:** Keep CLAUDE.md concise. Reference PIPELINE.md for pipeline details. Put workspace file templates in a separate reference file.
**Warning signs:** CLAUDE.md exceeding 200 lines; agents not following conventions.

### Pitfall 3: Agent Model Not Specified
**What goes wrong:** Without `model: opus` in frontmatter, agents default to `inherit` (whatever model the main conversation uses). If the user runs Claude Code with Sonnet, all agents run on Sonnet.
**Why it happens:** `model` field is optional and defaults to `inherit`.
**How to avoid:** Explicitly set `model: opus` in every agent definition file's frontmatter.
**Warning signs:** Agents producing lower-quality output; inconsistent results across sessions.

### Pitfall 4: Workspace Not Gitignored
**What goes wrong:** Per-run workspace files (potentially many MB of markdown) get committed to git.
**Why it happens:** Forgetting to add `workspace/` to the `claude-code/.gitignore`.
**How to avoid:** Create `claude-code/.gitignore` with `workspace/` entry. Keep a `.gitkeep` in the workspace directory so git tracks the empty directory.
**Warning signs:** Large git diffs after running the solver.

### Pitfall 5: Skill Name Collision
**What goes wrong:** If a skill in `claude-code/.claude/skills/` has the same name as one in the parent project's `.claude/skills/`, the parent project's skill takes precedence (higher-priority location wins).
**Why it happens:** Claude Code resolves skill names with a priority chain: enterprise > personal > project.
**How to avoid:** Use a distinctive name for the skill (e.g., `solve`). Verify no naming conflict with parent project skills. The parent project currently only has a `mastra` symlink in `.claude/skills/`, so `solve` is safe.
**Warning signs:** Wrong skill being invoked when typing `/solve`.

### Pitfall 6: Agent Description Too Vague
**What goes wrong:** Claude cannot determine when to delegate to the agent, or delegates to the wrong one.
**Why it happens:** The `description` field is what Claude uses to decide delegation. Vague descriptions cause misrouting.
**How to avoid:** Write descriptions that clearly specify the agent's task and when it should be used. Include keywords that match the orchestrator's delegation language.
**Warning signs:** Orchestrator failing to use agents, or using the wrong agent for a task.

## Code Examples

Verified patterns from official Claude Code documentation:

### Agent Definition File
```markdown
---
name: extractor
description: Parses raw Linguistics Olympiad problem text into structured markdown (context, dataset, questions). Use when extracting structure from raw problem input.
tools: Read, Write
model: opus
---

You are an expert at parsing Linguistics Olympiad Rosetta Stone problems.

[System prompt placeholder — full content is Phase 21]
```

Source: [Claude Code Subagents Docs](https://code.claude.com/docs/en/sub-agents)

### Skill SKILL.md File
```yaml
---
name: solve
description: Solve a Linguistics Olympiad Rosetta Stone problem
disable-model-invocation: true
argument-hint: "[file-path]"
---

Solve a Linguistics Olympiad Rosetta Stone problem.

If a file path is provided as $ARGUMENTS, read the problem from that file.
Otherwise, ask the user to paste the problem text or provide a file path.

[Orchestrator logic placeholder — full content is Phase 22]
```

Source: [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)

### CLAUDE.md Structure
```markdown
# LO-Solver Claude Code Pipeline

This project reimplements the LO-Solver's Mastra-based pipeline using Claude Code's native agent system.

## Model
All solver agents use Opus 4.6. Every agent definition file must include `model: opus` in its frontmatter.

## Pipeline Reference
See @PIPELINE.md for the full pipeline reference document describing all steps, data flow, and design rationale.

## Agents
Agent definitions live in `.claude/agents/`:
- `extractor.md` — Parse raw problem into structured markdown
- `hypothesizer.md` — Generate linguistic rules and vocabulary
- `verifier.md` — Test rules against the dataset
- `improver.md` — Revise failing rules
- `synthesizer.md` — Merge perspective rulesets
- `answerer.md` — Apply rules to translate questions

Agents communicate via file-based handoff: each reads predecessor files and writes output to the workspace.

## Workspace
Per-run output in `workspace/{datetime}/` (e.g., `workspace/2026-03-07_14-30-00/`).

### Structure
[workspace tree from CONTEXT.md decisions]

### File Format
All workspace files use markdown. See `references/workspace-format.md` for templates.

## Domain Context
A Rosetta Stone problem provides foreign-language sentences with English translations. The task is to discover the language's rules and use them to translate new sentences.

## Conventions
- Agent files: plain descriptive names (no numbered prefixes)
- Perspective count per round: 3 (configurable)
```

### .gitignore for claude-code/
```
workspace/
!workspace/.gitkeep
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/*.md` for slash commands | `.claude/skills/*/SKILL.md` (commands still work but skills are preferred) | 2025 | Skills support directory structure with supporting files, frontmatter control, subagent execution |
| `Task` tool for spawning subagents | `Agent` tool (Task renamed in v2.1.63) | Late 2025 | Existing `Task(...)` references still work as aliases |
| No persistent agent memory | `memory` field in agent frontmatter | 2025-2026 | Agents can maintain knowledge across sessions |

**Deprecated/outdated:**
- `.claude/commands/` single-file commands: Still work but `.claude/skills/` is preferred for new work. Skills and commands share the same frontmatter format.

## Open Questions

1. **Subagent nesting limitation and orchestrator design**
   - What we know: Subagents cannot spawn other subagents (confirmed in official docs). The `/solve` skill must NOT use `context: fork`. The orchestrator must run in the main conversation context to dispatch subagents.
   - What's unclear: Whether the orchestrator (running in the main context) can dispatch multiple subagents in parallel, or only sequentially. STATE.md notes "Parallel Task tool calls are bugged (issues #22508, #29181)."
   - Recommendation: Design the orchestrator for sequential dispatch. Parallel dispatch is a Phase 22 concern; if it works, it's a bonus. This does not affect Phase 20 infrastructure.

2. **Shared reference file location**
   - What we know: User gave discretion on exact location.
   - Recommendation: `claude-code/references/workspace-format.md` — a top-level `references/` directory inside `claude-code/`. This keeps it outside `.claude/` (which is for Claude Code configuration, not project reference docs) and at a discoverable location. Agents can reference it via relative path in CLAUDE.md.

3. **Configurable perspective count exposure**
   - What we know: Default is 3 perspectives per round. User gave discretion on how to expose it.
   - Recommendation: Document it as a constant in CLAUDE.md (e.g., "Default perspective count: 3"). The orchestrator skill can reference this value. No need for a config file — the `/solve` skill content is the configuration.

## Sources

### Primary (HIGH confidence)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) — skill file format, frontmatter fields, SKILL.md structure, `context: fork` behavior, argument handling, `$ARGUMENTS` substitution, `disable-model-invocation`, supporting files
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) — agent file format, frontmatter fields (name, description, tools, model, permissionMode), model aliases (`opus`, `sonnet`, `haiku`, `inherit`), subagent nesting limitation ("subagents cannot spawn other subagents"), built-in agents, scope/priority
- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory) — CLAUDE.md location, scoping, loading behavior, 200-line recommendation, `@import` syntax, `.claude/rules/` pattern

### Secondary (MEDIUM confidence)
- Existing project structure at `.claude/agents/gsd-*.md` — verified frontmatter format (name, description, tools, color fields) in working agent definitions
- Existing project `.claude/skills/mastra` — verified skill directory structure pattern in use

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Claude Code is the only tool; its documentation is definitive
- Architecture: HIGH — directory structure conventions are well-documented in official docs; verified against existing `.claude/` structure in this project
- Pitfalls: HIGH — the subagent nesting limitation and `context: fork` constraint are explicitly documented; the CLAUDE.md size recommendation is from official docs

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable — Claude Code conventions are well-established)
