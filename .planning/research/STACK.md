# Stack Research: Claude Code Native Solver Workflow

**Domain:** Claude Code agentic workflow features for building a linguistics problem solver
**Researched:** 2026-03-07
**Confidence:** HIGH

## Recommended Stack

The "stack" for building agentic workflows inside Claude Code is not npm packages -- it is Claude Code's own extensibility system: skills (SKILL.md), subagents (.claude/agents/), slash commands (.claude/commands/), hooks (settings.json), and system prompts (CLAUDE.md). All agents use Opus 4.6 via the `model` field, and the entire workflow runs in the terminal rather than through a web frontend.

### Core Technologies

| Technology | Version / Location | Purpose | Why Recommended |
|------------|-------------------|---------|-----------------|
| **Custom Slash Command** | `.claude/commands/solve.md` | Entry point: `/solve` launches the solver workflow | Simplest invocation path. User types `/solve` with a problem pasted or file referenced. Commands support `$ARGUMENTS` for flexible input. |
| **Subagents** | `.claude/agents/*.md` | Specialized agents for each pipeline step (extract, hypothesize, verify, answer) | Each runs in its own context window with a custom system prompt. Context isolation prevents prompt bleed between steps. Model, tools, and permissions configurable per agent. |
| **Skills** | `.claude/skills/*/SKILL.md` | Reusable prompt fragments and reference material for agents | Skills can be preloaded into subagents via the `skills` field, injecting domain knowledge (e.g., linguistics analysis patterns) without bloating agent definitions. |
| **CLAUDE.md** | `./CLAUDE.md` | Project-level system prompt loaded into every session | Already exists. Add solver-specific conventions and workflow documentation so Claude understands the solver architecture across sessions. |
| **Hooks** | `.claude/settings.json` | Lifecycle automation: session start context, subagent coordination, output formatting | `SubagentStart`/`SubagentStop` hooks can track pipeline progress. `Stop` hooks can verify completion. |
| **Agent Tool** | Built-in (formerly Task tool) | Spawn and delegate to subagents from the orchestrator | The mechanism by which the main session delegates to specialized agents. Supports parallel spawning, model selection, and tool restrictions. |

### Key Claude Code Primitives

| Primitive | File Location | Role in Solver |
|-----------|--------------|----------------|
| Subagent definitions | `.claude/agents/{name}.md` | Define each solver step as a focused agent with its own system prompt, model, and tool restrictions |
| Skill definitions | `.claude/skills/{name}/SKILL.md` | Encapsulate reusable knowledge (linguistic analysis patterns, output format templates) |
| Slash commands | `.claude/commands/solve.md` | `/solve` entry point that orchestrates the full pipeline |
| Rules | `.claude/rules/*.md` | Path-scoped instructions for solver files (optional, load on demand) |
| Agent memory | `.claude/agent-memory/{name}/` | Persistent learning across solver runs (optional, `memory` field in subagent frontmatter) |

### Supporting Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `claude-code/problems/*.md` | Problem input files for the solver | Store Linguini problems as markdown files the solver reads |
| `claude-code/outputs/*.md` | Solver output files | Each run writes structured results to a timestamped markdown file |
| `claude-code/templates/*.md` | Output format templates | Templates for extraction schemas, rule formats, vocabulary tables |

## Subagent Architecture (Primary Pattern)

Subagents are the central building block. Each solver step becomes a subagent with:

1. **YAML frontmatter** -- name, description, model, tools, optional skills
2. **Markdown body** -- the system prompt (instructions for that agent's task)

### Subagent Definition Format

```markdown
---
name: lo-extractor
description: Parse raw Linguistics Olympiad problems into structured context, dataset, and questions. Use when the solver needs to extract structure from a problem.
model: opus
tools: Read, Write, Grep, Glob
skills:
  - extraction-patterns
---

You are a linguistics problem extraction specialist. Given a raw Rosetta Stone
problem, parse it into three structured components:

1. **Context** -- Language family, geographical info, phonological notes
2. **Dataset** -- Source-target sentence pairs as a structured table
3. **Questions** -- Translation questions to answer

[... detailed extraction instructions ...]
```

### Frontmatter Fields (Complete Reference)

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Unique identifier, lowercase with hyphens |
| `description` | Yes | string | When Claude should delegate to this agent (Claude uses this for auto-delegation) |
| `model` | No | `opus` / `sonnet` / `haiku` / `inherit` | AI model. Default: `inherit`. Use `opus` for all solver agents since we want Opus 4.6 |
| `tools` | No | comma-separated | Tool allowlist. Inherits all if omitted. Use `Read, Write, Bash, Grep, Glob` for solver agents |
| `disallowedTools` | No | comma-separated | Tool denylist, removed from inherited/specified list |
| `permissionMode` | No | enum | `default` / `acceptEdits` / `dontAsk` / `bypassPermissions` / `plan`. Use `acceptEdits` for solver agents so they can write output files |
| `maxTurns` | No | number | Max agentic turns before the agent stops. Use to cap verify/improve loops |
| `skills` | No | list | Skills to preload into the agent's context at startup |
| `mcpServers` | No | list | MCP servers available to this subagent |
| `hooks` | No | object | Lifecycle hooks scoped to this subagent |
| `memory` | No | `user` / `project` / `local` | Persistent memory scope for cross-session learning |
| `background` | No | boolean | Run as background task (default: false) |
| `isolation` | No | `worktree` | Run in isolated git worktree (not needed for solver) |

### Critical Constraint: No Nested Subagents

**Subagents cannot spawn other subagents.** This is by design, not a limitation to work around. The orchestrator (main session or slash command) must spawn all subagents directly. A subagent that tries to use the Agent tool gets nothing.

**Implication for solver architecture:** The orchestrator slash command must be the single coordinator. It spawns each step's subagent, receives results, and passes relevant context to the next step. The pipeline is: orchestrator -> extract agent -> (return to orchestrator) -> hypothesize agents -> (return to orchestrator) -> verify/improve agent -> (return to orchestrator) -> answer agent.

### Parallel Subagent Spawning

The orchestrator can spawn multiple subagents in parallel (up to 10 concurrent). This maps directly to the multi-perspective hypothesis generation step:

```
Orchestrator spawns in parallel:
  - hypothesizer-morphological (perspective 1)
  - hypothesizer-phonological (perspective 2)
  - hypothesizer-syntactic (perspective 3)

Each returns its ruleset. Orchestrator selects the best one.
```

Claude automatically handles parallel spawning when asked. No explicit parallel API is needed -- the Agent tool supports concurrent invocations.

### Foreground vs Background Subagents

| Mode | When to Use | Behavior |
|------|-------------|----------|
| Foreground (default) | Sequential steps (extract, answer) | Blocks orchestrator until complete. Permission prompts pass through to user. |
| Background (`background: true`) | Parallel hypothesizers | Runs concurrently. Permissions pre-approved at spawn. Results return when done. |

For the solver, use **foreground** for sequential steps (extract, verify/improve, answer) and **background** for parallel hypothesizers.

## Skill Architecture (Knowledge Injection)

Skills serve two purposes in the solver:

1. **Preloaded knowledge** -- Injected into subagents via the `skills` field to provide domain expertise without bloating agent definitions
2. **Reusable templates** -- Output format specifications, extraction schemas, rule templates

### Skill Definition Format

```markdown
---
name: extraction-patterns
description: Patterns for extracting structure from Rosetta Stone linguistics problems
user-invocable: false
---

## Extraction Patterns for Rosetta Stone Problems

When extracting structure from a linguistics problem:

### Dataset Extraction
- Each sentence pair should be on its own line
- Separate source language from target language clearly
- Preserve all diacritical marks and special characters exactly
- Number each pair for reference

### Question Extraction
- Identify translation direction (source->target or target->source)
- List each question separately with its number
- Preserve exact wording

[... more patterns ...]
```

### Skill Frontmatter Fields

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | string | Identifier, also becomes `/name` command if user-invocable |
| `description` | string | What the skill does, when Claude should use it |
| `disable-model-invocation` | `true` | Prevents Claude from auto-loading (user must invoke with `/name`) |
| `user-invocable` | `false` | Hides from `/` menu (Claude-only background knowledge) |
| `allowed-tools` | comma-separated | Tool restrictions when skill is active |
| `context` | `fork` | Run in isolated subagent context (for task-type skills) |
| `agent` | string | Which subagent to use when `context: fork` (e.g., `Explore`) |
| `model` | string | Model override when skill is active |

### Skills vs Subagents: When to Use Which

| Use Case | Use Skill | Use Subagent |
|----------|-----------|--------------|
| Background knowledge (linguistic patterns) | `user-invocable: false` skill preloaded into agent | -- |
| Step in the pipeline (extract, verify) | -- | Dedicated agent with focused system prompt |
| Output format template | Skill with template file in `templates/` | -- |
| Interactive workflow entry point | Skill with `context: fork` | -- |
| Isolated, focused task | -- | Agent with model/tool restrictions |

## Slash Command Architecture (Entry Point)

The `/solve` command is the user-facing entry point. It can be either a `.claude/commands/solve.md` file or a `.claude/skills/solve/SKILL.md` file (skills are the newer, more capable format).

### Command Definition

```markdown
---
name: solve
description: Solve a Linguistics Olympiad Rosetta Stone problem using the multi-agent pipeline
disable-model-invocation: true
argument-hint: [problem-file-or-paste]
---

Solve the Linguistics Olympiad problem provided.

## Input

The problem is: $ARGUMENTS

If no argument is provided, ask the user to either:
1. Paste the problem text directly
2. Provide a path to a markdown file containing the problem

## Pipeline

Execute the solver pipeline by delegating to specialized agents:

1. **Extract** -- Use the lo-extractor agent to parse the problem
2. **Hypothesize** -- Spawn 3 parallel hypothesizer agents with different perspectives
3. **Select** -- Compare hypotheses by test-translating dataset sentences, pick the best
4. **Verify & Improve** -- Use the lo-verifier agent to test and improve rules (up to 4 iterations)
5. **Answer** -- Use the lo-answerer agent to apply validated rules to questions

## Output

Write results to `claude-code/outputs/solve-{timestamp}.md` with:
- Problem summary
- Extracted dataset
- Final rules and vocabulary
- Answers to all questions
- Confidence assessment
```

### $ARGUMENTS Substitution

| Pattern | What It Contains | Example |
|---------|-----------------|---------|
| `$ARGUMENTS` | All args as a single string | `/solve examples/linguini/problem1.md` -> `"examples/linguini/problem1.md"` |
| `$ARGUMENTS[0]` or `$0` | First argument | `/solve file.md --verbose` -> `"file.md"` |
| `$ARGUMENTS[1]` or `$1` | Second argument | -> `"--verbose"` |

### Dynamic Context Injection

Skills support `!`command`` syntax to inject live data before processing:

```markdown
## Current Problem Files
Available problems: !`ls examples/linguini/`

## Recent Solutions
Last 5 solutions: !`ls -t claude-code/outputs/ | head -5`
```

The command output replaces the placeholder before Claude sees the content.

## Hook Architecture (Lifecycle Automation)

Hooks are configured in `.claude/settings.json` and fire at specific lifecycle points.

### Hook Events Relevant to Solver

| Event | When It Fires | Use for Solver |
|-------|--------------|----------------|
| `SubagentStart` | When a subagent begins | Log pipeline step start, track timing |
| `SubagentStop` | When a subagent completes | Log pipeline step end, collect results summary |
| `Stop` | When Claude finishes responding | Verify all solver steps completed |
| `SessionStart` | Session begins/resumes/compacts | Inject solver context after compaction |
| `PreToolUse` | Before a tool executes | Validate file paths, restrict writes to output directory |
| `PostToolUse` | After a tool succeeds | Format output files, run quality checks |

### Hook Configuration Format

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "lo-.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"[$(date +%H:%M:%S)] Starting solver agent: $(jq -r '.agent_type')\" >> claude-code/logs/solver.log"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "lo-.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"[$(date +%H:%M:%S)] Completed solver agent: $(jq -r '.agent_type')\" >> claude-code/logs/solver.log"
          }
        ]
      }
    ]
  }
}
```

### Hook Types

| Type | Purpose | Use Case |
|------|---------|----------|
| `command` | Run a shell command | Logging, file validation, notifications |
| `prompt` | Single-turn LLM evaluation (yes/no decision) | Quality gate: "Are all questions answered?" |
| `agent` | Multi-turn verification with tool access | Verify output format, run test translations |
| `http` | POST event data to a URL | External logging/monitoring (not needed for solver) |

### Hook I/O

- **Input:** JSON on stdin with `session_id`, `cwd`, `hook_event_name`, and event-specific fields
- **Output:** Exit code 0 (proceed), exit code 2 (block), or structured JSON on stdout
- **Structured output:** `{"hookSpecificOutput": {"permissionDecision": "deny", "permissionDecisionReason": "..."}}`

## CLAUDE.md System (Project Memory)

CLAUDE.md is not just a config file -- it is the primary system prompt mechanism. Content is loaded into every session and survives compaction.

### CLAUDE.md Hierarchy (Load Order)

| Priority | Location | Purpose |
|----------|----------|---------|
| 1 (highest) | Managed policy (`/etc/claude-code/CLAUDE.md`) | Org-wide rules |
| 2 | Project CLAUDE.md (`./CLAUDE.md`) | Project standards (already exists) |
| 3 | User CLAUDE.md (`~/.claude/CLAUDE.md`) | Personal preferences |
| 4 | Local CLAUDE.md (`./CLAUDE.local.md`) | Personal project overrides |
| 5 | Subdirectory CLAUDE.md (e.g., `claude-code/CLAUDE.md`) | Loaded on demand when files in that directory are accessed |

### Rules Directory

`.claude/rules/*.md` files provide modular, path-scoped instructions:

```markdown
---
paths:
  - "claude-code/**/*.md"
---

# Solver Output Rules

When writing solver output files:
- Use markdown with clear section headers
- Include a timestamp in the filename
- List all rules with examples
- Show vocabulary as a two-column table
- Include confidence level per answer
```

Rules without `paths` frontmatter load unconditionally. Rules with `paths` load only when Claude reads matching files.

### Size Guidelines

- Target under 200 lines per CLAUDE.md file
- Move detailed reference material to separate files with `@path/to/import` syntax
- Skills are better than CLAUDE.md for task-specific instructions that don't need to be in context permanently

## Agent Teams (Experimental -- NOT Recommended)

Agent Teams are an experimental feature that coordinates multiple independent Claude Code sessions with inter-agent messaging via a shared task list and mailbox system.

**Why NOT to use for the solver:**

| Concern | Detail |
|---------|--------|
| Experimental | Disabled by default, requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` flag |
| Overkill | Solver steps are sequential with brief parallel phases -- subagents handle this well |
| Token cost | Each teammate is a full Claude instance with its own context window |
| No session resumption | Cannot resume in-process teammates after session restart |
| Coordination overhead | Task list management adds complexity without benefit for a linear pipeline |
| One team per session | Cannot nest teams or have sub-teams |

Subagents are the correct primitive for this project. Agent Teams would only matter if solver steps needed to communicate laterally and challenge each other's work in real time.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Subagents (`.claude/agents/`) | Skills with `context: fork` | When you want a simpler one-off task, not a reusable pipeline step |
| Slash command entry point | Direct prompt ("solve this problem") | When you don't want a formalized entry point -- but `/solve` is better UX |
| Skills for knowledge injection | Inline everything in agent system prompts | When the knowledge is very short (< 20 lines); skills are better for anything longer |
| `model: opus` on all agents | `model: sonnet` for cheaper steps | When cost matters more than accuracy. For a linguistics solver, Opus is worth it |
| Foreground agents for sequential steps | Background agents for everything | When you need interactive permission prompts or step-by-step visibility |
| `SubagentStart`/`SubagentStop` hooks | No lifecycle tracking | When you don't need logging -- but observability helps debugging |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Agent Teams | Experimental, overkill for linear pipeline, high token cost | Subagents for each step |
| `context: fork` skills for pipeline steps | No way to chain results between forked skills | Subagents spawned by orchestrator |
| `bypassPermissions` on solver agents | Security risk, no permission audit trail | `acceptEdits` or `dontAsk` for trusted write operations |
| Nested subagent spawning | Not supported (subagents cannot spawn subagents) | Flat orchestrator pattern: main session spawns all agents |
| `isolation: worktree` for solver agents | Creates git worktrees unnecessarily; solver doesn't need file isolation | Default (shared working directory) |
| MCP servers for inter-agent communication | Over-engineered for passing results between steps | Return results to orchestrator, pass as prompt to next agent |
| Auto memory for solver state | Memory persists across sessions -- solver state is per-run | Write output to markdown files in `claude-code/outputs/` |
| `hooks` type `http` for logging | Requires running a web server; unnecessary complexity | `command` type hooks writing to log files |

## Stack Patterns by Solver Step

**Extract step:**
- Subagent `lo-extractor` with `model: opus`, `tools: Read, Glob, Grep`
- Preload `extraction-patterns` skill for domain knowledge
- Read problem file, return structured JSON-like extraction

**Hypothesize step (parallel):**
- 3 subagents spawned in background: `lo-hypothesizer` with different perspectives passed as prompt
- Each gets the extraction output as input prompt
- Each returns a ruleset + vocabulary
- Orchestrator compares and selects best

**Verify & Improve step (iterative):**
- Subagent `lo-verifier` with `model: opus`, `maxTurns: 50` (allow enough turns for iterative testing)
- Receives winning ruleset + original dataset
- Tests each rule against dataset sentences
- Improves failing rules, up to 4 improvement iterations
- Returns validated ruleset

**Answer step:**
- Subagent `lo-answerer` with `model: opus`, `tools: Read, Write`
- Receives validated rules + vocabulary + questions
- Applies rules to produce translations
- Writes final output file

## File Structure

```
claude-code/
  problems/           # Problem input files (markdown)
  outputs/             # Solver output files (timestamped markdown)
  templates/           # Output format templates
  logs/                # Solver execution logs
.claude/
  agents/
    lo-extractor.md    # Step 1: Parse problem structure
    lo-hypothesizer.md # Step 2: Generate linguistic hypotheses
    lo-verifier.md     # Step 3: Verify and improve rules
    lo-answerer.md     # Step 4: Apply rules to questions
  skills/
    extraction-patterns/
      SKILL.md         # Extraction domain knowledge
    linguistic-analysis/
      SKILL.md         # Linguistics reasoning patterns
      references/
        morphology.md  # Morphological analysis reference
        phonology.md   # Phonological analysis reference
    output-format/
      SKILL.md         # Output formatting conventions
  commands/
    solve.md           # /solve entry point
  settings.json        # Hooks for lifecycle tracking (already exists, add hooks)
```

## Version Compatibility

| Component | Compatible With | Notes |
|-----------|-----------------|-------|
| Subagent `model: opus` | Claude Opus 4.6 | Current frontier model, maps to `claude-opus-4-6` |
| Subagent `model: sonnet` | Claude Sonnet 4 | Balanced alternative for cost-sensitive steps |
| Subagent `model: haiku` | Claude Haiku 3.5 | Fast/cheap, only for simple exploration tasks |
| Agent tool (formerly Task) | Claude Code 2.1.63+ | Task tool renamed to Agent tool; old `Task(...)` references still work as aliases |
| `skills` field in agents | Claude Code current | Full skill content injected at startup, not just made available |
| `background: true` agents | Claude Code current | Up to 10 concurrent tasks with intelligent queuing |
| `SubagentStart`/`SubagentStop` hooks | Claude Code current | Matchers support regex for agent type names |
| Prompt-based hooks (`type: prompt`) | Claude Code current | Single-turn Haiku evaluation for quality gates |
| Agent-based hooks (`type: agent`) | Claude Code current | Multi-turn verification with tool access |
| `.claude/rules/*.md` with `paths` | Claude Code current | Path-scoped rules loaded on demand |

## Sources

- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- Complete subagent configuration, frontmatter fields, built-in agents, patterns, limitations (HIGH confidence, official docs)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) -- Skill creation, frontmatter, invocation control, supporting files, dynamic context injection (HIGH confidence, official docs)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- Hook events, configuration, matchers, structured output, prompt/agent/http hook types (HIGH confidence, official docs)
- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory) -- CLAUDE.md hierarchy, rules directory, auto memory, import syntax (HIGH confidence, official docs)
- [Claude Code Slash Commands](https://code.claude.com/docs/en/slash-commands) -- Custom command creation, $ARGUMENTS, relationship to skills (HIGH confidence, official docs)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) -- Experimental feature, comparison with subagents, limitations (HIGH confidence, official docs)
- [Official Plugins: Skills Reference](local: ~/.claude/plugins/.../references/skills-reference.md) -- Skill structure, frontmatter, invocation patterns (HIGH confidence, first-party reference)
- [Official Plugins: Subagent Templates](local: ~/.claude/plugins/.../references/subagent-templates.md) -- Agent placement, model selection, tool access patterns (HIGH confidence, first-party reference)
- [Official Plugins: Hooks Patterns](local: ~/.claude/plugins/.../references/hooks-patterns.md) -- Hook event reference, notification matchers (HIGH confidence, first-party reference)
- [Task Tool vs Subagents Analysis](https://www.ibuildwith.ai/blog/task-tool-vs-subagents-how-agents-work-in-claude-code/) -- Relationship between Task tool and Agent tool, subagent spawning (MEDIUM confidence, third-party blog)
- [Claude Code Sub-Agents Patterns](https://claudefa.st/blog/guide/agents/sub-agent-best-practices) -- Parallel vs sequential patterns (MEDIUM confidence, third-party guide)

---
*Stack research for: LO-Solver v1.4 Claude Code Native Solver*
*Researched: 2026-03-07*
