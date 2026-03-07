# Architecture Research

**Domain:** Claude Code native solver workflow for Linguistics Olympiad problems
**Researched:** 2026-03-07
**Confidence:** HIGH

## System Overview

```
claude-code/
├─────────────────────────────────────────────────────────────────────┐
│                     Entry Layer (Skill)                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  /solve Skill (SKILL.md)                                     │  │
│  │  Orchestrates the full pipeline, dispatches subagents         │  │
│  └──────────────┬────────────────────────────────────────────────┘  │
│                 │                                                   │
├─────────────────┼───────────────────────────────────────────────────┤
│                 │         Agent Layer (Subagents)                   │
│  ┌──────────┐   │   ┌──────────────┐  ┌──────────────┐             │
│  │ extractor│◄──┤   │hypothesizer-1│  │hypothesizer-N│ (parallel)  │
│  └────┬─────┘   │   └──────┬───────┘  └──────┬───────┘             │
│       │         │          │                  │                     │
│       │    ┌────┴──────┐   └────────┬─────────┘                    │
│       │    │ verifier  │◄───────────┘                              │
│       │    └────┬──────┘                                           │
│       │         │                                                  │
│       │    ┌────┴──────┐                                           │
│       │    │ improver  │ (loop back to verifier, max N rounds)     │
│       │    └────┬──────┘                                           │
│       │         │                                                  │
│       │    ┌────┴──────┐                                           │
│       │    │ answerer  │                                           │
│       │    └───────────┘                                           │
├───────┼─────────────────────────────────────────────────────────────┤
│       │              Data Layer (Files)                             │
│  ┌────┴─────────────────────────────────────────────────────────┐  │
│  │  claude-code/workspace/                                      │  │
│  │  ├── problem.md         (input problem text)                 │  │
│  │  ├── extracted.json     (structured problem data)            │  │
│  │  ├── perspectives.json  (dispatcher output)                  │  │
│  │  ├── hypothesis-*.json  (per-perspective rules + vocab)      │  │
│  │  ├── verification.json  (test results)                       │  │
│  │  ├── rules.json         (current best rules)                 │  │
│  │  ├── vocabulary.json    (current vocabulary)                 │  │
│  │  └── answers.md         (final output)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `/solve` Skill | Entry point, orchestration, iteration loop, file I/O coordination | `claude-code/.claude/skills/solve/SKILL.md` with `context: fork` and `agent: solve-orchestrator` |
| `solve-orchestrator` agent | Coordinates the pipeline: dispatches subagents in sequence, manages verify/improve loop, reads/writes workspace files | `claude-code/.claude/agents/solve-orchestrator.md` |
| `lo-extractor` agent | Parses raw problem text into structured form (context, dataset, questions) | `claude-code/.claude/agents/lo-extractor.md` |
| `lo-hypothesizer` agent | Generates linguistic rules and vocabulary from a specific perspective | `claude-code/.claude/agents/lo-hypothesizer.md` |
| `lo-verifier` agent | Tests every rule and sentence against the dataset, produces structured feedback | `claude-code/.claude/agents/lo-verifier.md` |
| `lo-improver` agent | Revises rules based on verification feedback | `claude-code/.claude/agents/lo-improver.md` |
| `lo-answerer` agent | Applies validated rules to translate question sentences | `claude-code/.claude/agents/lo-answerer.md` |
| workspace files | Intermediate JSON/MD files that pass data between agents | `claude-code/workspace/` directory |

## Recommended Project Structure

```
claude-code/
├── .claude/
│   ├── agents/
│   │   ├── solve-orchestrator.md    # Main orchestrator (runs the pipeline)
│   │   ├── lo-extractor.md          # Step 1: Parse problem
│   │   ├── lo-hypothesizer.md       # Step 2: Generate rules per perspective
│   │   ├── lo-verifier.md           # Step 3a: Test rules against data
│   │   ├── lo-improver.md           # Step 3b: Fix rules from feedback
│   │   └── lo-answerer.md           # Step 4: Answer questions
│   ├── skills/
│   │   └── solve/
│   │       ├── SKILL.md             # Entry point: /solve command
│   │       └── examples/            # Example problems for reference
│   │           ├── georgian.md
│   │           └── turkish.md
│   └── settings.json                # Project-level settings
├── workspace/                        # Working directory for solve runs
│   └── .gitkeep
├── prompts/                          # Reusable prompt fragments
│   ├── linguistics-patterns.md       # Common Linguistics Olympiad patterns
│   ├── rule-format.md                # How rules should be structured
│   └── vocabulary-format.md          # How vocabulary entries should look
└── CLAUDE.md                         # Project instructions for this subdirectory
```

### Structure Rationale

- **`.claude/agents/`**: Each solver agent is a separate markdown file with YAML frontmatter. Claude Code loads these at session start and dispatches via the Agent tool's `agent_type` parameter. One file per agent role keeps prompts focused and independently editable.
- **`.claude/skills/solve/`**: The `/solve` skill is the user-facing entry point. It triggers the orchestrator agent via `context: fork` + `agent: solve-orchestrator`. The skill handles argument parsing (problem text, file reference, or interactive paste).
- **`workspace/`**: Ephemeral per-run data directory. Subagents cannot spawn other subagents in Claude Code, so the orchestrator writes intermediate results to JSON files, then reads them back when composing the next subagent's prompt. This is the file-based equivalent of Mastra's RequestContext.
- **`prompts/`**: Shared prompt fragments referenced by multiple agents via Read tool. Avoids duplicating the linguistics pattern catalog and format specifications across agent system prompts.
- **`CLAUDE.md`**: Project-level instructions specific to the solver workflow (separate from the main repo's CLAUDE.md).

## Architectural Patterns

### Pattern 1: File-Mediated Data Flow (replaces RequestContext)

**What:** Subagents pass data via workspace JSON files instead of in-memory state. The orchestrator writes input files before spawning each subagent, and reads output files after each completes.

**When to use:** Always. Claude Code subagents run in isolated contexts with no shared memory. Files are the only reliable inter-agent communication channel.

**Trade-offs:**
- Pro: Simple, debuggable (inspect files mid-run), resilient to context compaction
- Pro: Human-readable intermediate state makes debugging easier than Mastra's opaque RequestContext
- Con: Slightly slower than in-memory (negligible vs LLM call latency)
- Con: Orchestrator must serialize/deserialize between each step

**Example -- orchestrator dispatches extractor, then reads the result:**

```
Agent(
  agent_type="lo-extractor",
  prompt="Read the problem from claude-code/workspace/problem.md.
  Parse it into structured form.
  Write the result to claude-code/workspace/extracted.json.
  The JSON must have fields: context (string), dataset (array of
  {source, target} pairs), questions (array of {id, type, input})."
)

# After agent returns, orchestrator reads extracted.json
# and uses it to compose the next agent's prompt
```

### Pattern 2: Orchestrator-Dispatched Pipeline (replaces Mastra Workflow Steps)

**What:** A single orchestrator agent (invoked via the `/solve` skill) runs the pipeline sequentially, dispatching specialized subagents via the Agent tool at each step. The orchestrator handles the verify/improve loop logic itself rather than delegating loop control.

**When to use:** For any multi-step workflow where steps have dependencies.

**Trade-offs:**
- Pro: Orchestrator sees the full pipeline state and can make intelligent decisions about when to stop iterating
- Pro: No framework overhead -- pure Claude Code native
- Con: Orchestrator context grows with each step's summary (mitigate by keeping subagent returns concise)
- Con: Subagents cannot spawn other subagents (Claude Code limitation), so deep nesting is impossible

**Critical constraint -- subagents cannot spawn subagents.** In Mastra, the verifier orchestrator agent calls testRule and testSentence tools which internally invoke sub-agents. In Claude Code, the verifier must do all testing inline within its own context. This is a fundamental architectural difference. The verifier's system prompt must include all testing logic directly.

**Example -- orchestrator pipeline pseudocode:**

```
1. Read problem input from $ARGUMENTS or ask user to paste
2. Write problem text to workspace/problem.md
3. Dispatch lo-extractor -> writes extracted.json
4. Read extracted.json, determine perspectives (inline reasoning)
5. Dispatch lo-hypothesizer x N in parallel -> each writes hypothesis-{id}.json
6. For each round (max 3):
   a. Read hypothesis files, select best, write rules.json + vocabulary.json
   b. Dispatch lo-verifier -> writes verification.json
   c. If all rules pass: break
   d. Dispatch lo-improver -> writes updated rules.json + vocabulary.json
7. Dispatch lo-answerer -> writes answers.md
8. Display answers.md to user
```

### Pattern 3: Parallel Perspective Generation via Multiple Agent Calls

**What:** The orchestrator spawns multiple hypothesizer agents in parallel, each exploring a different linguistic perspective. Claude Code's Agent tool supports parallelism when multiple calls are independent.

**When to use:** Step 2 (hypothesis generation) where perspectives are independent.

**Trade-offs:**
- Pro: Matches the existing Mastra architecture's parallel perspective pattern
- Pro: Claude Code naturally handles parallel Agent calls
- Con: Each parallel agent returns results to the orchestrator, consuming context
- Con: Results must be written to separate files (hypothesis-morphological.json, hypothesis-syntactic.json, etc.) to avoid conflicts

**Critical design note:** In Mastra, each perspective hypothesizer gets its own DraftStore (isolated vocabulary + rules Maps). In Claude Code, isolation is achieved by having each hypothesizer write to its own output file. The orchestrator then reads all hypothesis files, scores them via verification, and promotes the best one to the main `rules.json` and `vocabulary.json`.

### Pattern 4: Prompt Fragment Inclusion via File References

**What:** Shared prompt content (linguistics patterns, rule format specs, vocabulary format specs) lives in `prompts/` files. Agent system prompts instruct the agent to read these at startup. This replaces Mastra's compile-time template literal interpolation (`{{RULES_TOOLS_INSTRUCTIONS}}`).

**When to use:** When multiple agents need the same domain knowledge.

**Trade-offs:**
- Pro: Single source of truth for shared content
- Pro: Agents can Read the file at runtime, keeping their base system prompt lean
- Con: Agent must spend a tool call to read the file (trivial cost)
- Con: Unlike Mastra's compile-time injection, this is runtime

### Pattern 5: Two-Agent Chain Elimination

**What:** Mastra uses "reasoning agent -> JSON extractor agent" chains because earlier LLMs struggled with simultaneous reasoning and structured output. Opus 4.6 does not have this limitation. Each step can reason AND produce structured output in a single agent call.

**When to use:** All steps. The hypothesizer, verifier, and improver each produce structured output directly.

**Trade-offs:**
- Pro: Halves the number of agents (10 Mastra agents -> 6 Claude Code agents)
- Pro: Eliminates potential data loss in extraction step
- Pro: Faster pipeline (fewer LLM calls)
- Con: Must be explicit in system prompts about output format expectations

**Mastra agents eliminated:** Initial Hypothesis Extractor, Verifier Feedback Extractor, Rules Improvement Extractor, Perspective Dispatcher (absorbed into orchestrator). Their work is absorbed into the agents they previously followed.

## Data Flow

### Request Flow

```
User types /solve [problem-text or @problem-file]
    |
    v
Skill (SKILL.md) activates with context: fork, agent: solve-orchestrator
    |
    v
Orchestrator agent starts (solve-orchestrator) in isolated context
    |
    v
Write problem text to workspace/problem.md
    |
    v
Agent(lo-extractor) --> reads problem.md --> writes extracted.json
    |
    v
Orchestrator reads extracted.json
Orchestrator determines N perspectives via inline reasoning
    |
    v
Agent(lo-hypothesizer) x N in parallel
    --> each reads extracted.json + receives perspective in prompt
    --> each writes hypothesis-{perspectiveId}.json (rules + vocabulary)
    |
    v
Orchestrator reads all hypothesis files, selects/synthesizes best
Writes rules.json + vocabulary.json from winning hypothesis
    |
    v
VERIFY/IMPROVE LOOP (max 3 rounds):
    |
    Agent(lo-verifier) --> reads rules.json + vocabulary.json + extracted.json
                       --> tests every rule and sentence inline
                       --> writes verification.json
    |
    v
    Orchestrator reads verification.json
    If all rules pass OR max rounds reached: exit loop
    |
    Agent(lo-improver) --> reads verification.json + rules.json + vocabulary.json
                       --> writes updated rules.json + vocabulary.json
    |
    v (loop back to verifier)

Agent(lo-answerer) --> reads rules.json + vocabulary.json + extracted.json
                   --> writes answers.md
    |
    v
Orchestrator reads answers.md, presents to user
```

### Data Format Mapping (Mastra -> Claude Code)

| Mastra Concept | Claude Code Equivalent |
|----------------|----------------------|
| `RequestContext['vocabulary-state']` (Map) | `workspace/vocabulary.json` (JSON array) |
| `RequestContext['rules-state']` (Map) | `workspace/rules.json` (JSON array) |
| `RequestContext['structured-problem']` (object) | `workspace/extracted.json` |
| `RequestContext['current-rules']` (array) | `workspace/rules.json` (same file) |
| `DraftStore` per perspective | `workspace/hypothesis-{id}.json` per perspective |
| Workflow State (`workflowStateSchema`) | Orchestrator's conversation context + workspace files |
| `emitTraceEvent()` streaming | Terminal output during solve (no streaming UI) |
| `streamWithRetry()` | Claude Code's built-in Agent tool reliability |
| Vocabulary/Rules CRUD tools | Direct JSON file read/write by agents |
| Two-agent chain (reasoner -> extractor) | Single Opus 4.6 agent with format instructions |
| Dispatcher agent | Orchestrator inline reasoning |

### Key Data Flows

1. **Problem -> Extraction:** Raw text in `problem.md` -> extractor reads it -> writes `extracted.json` with structured problem data `{ context, dataset[], questions[] }`.

2. **Extraction -> Hypotheses:** Orchestrator reads `extracted.json`, determines N perspectives, includes perspective description in each hypothesizer's prompt. Each hypothesizer writes `hypothesis-{perspectiveId}.json` containing `{ rules: [...], vocabulary: [...], reasoning: "..." }`.

3. **Hypotheses -> Verification:** Orchestrator selects the best hypothesis (or synthesizes), writes `rules.json` and `vocabulary.json`. Verifier reads these plus `extracted.json`, tests every rule against every sentence, writes `verification.json` with pass/fail results and feedback per rule/sentence.

4. **Verification -> Improvement:** Improver reads `verification.json` (structured feedback), `rules.json`, `vocabulary.json`, and `extracted.json`. Writes updated `rules.json` and `vocabulary.json`.

5. **Rules -> Answers:** Answerer reads final `rules.json`, `vocabulary.json`, and `extracted.json`. Writes `answers.md` with translations and reasoning.

## Scaling Considerations

Not applicable in the traditional sense (single-user CLI tool), but relevant for context window management:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Simple problems (5-10 sentences) | Single perspective, 1-2 verify rounds. Full pipeline fits easily in one orchestrator context. |
| Medium problems (10-20 sentences) | 2-3 perspectives in parallel, 2-3 verify rounds. Workspace files keep orchestrator context lean. |
| Complex problems (20+ sentences) | Risk of verifier context overflow testing every sentence. May need `maxTurns` setting on verifier or batched testing. |

### Context Management Priorities

1. **First bottleneck -- orchestrator context accumulation.** Each subagent returns a summary to the orchestrator. Over 3 rounds with 3 perspectives, that is 15+ agent returns. **Mitigation:** Keep subagent prompts explicit: "Return ONLY the file path you wrote, not the full content." The orchestrator reads files directly rather than receiving data inline.

2. **Second bottleneck -- verifier context with many sentences.** A problem with 20 sentences tested in both directions = 40+ inline test operations, each producing reasoning. **Mitigation:** The verifier writes results to `verification.json` as it goes and keeps its own reasoning concise. Consider `maxTurns` limit on the agent.

## Anti-Patterns

### Anti-Pattern 1: Passing Full Data in Agent Prompts

**What people do:** Embed the entire problem text, all rules, all vocabulary, and all test results directly in the Agent tool's `prompt` parameter.
**Why it's wrong:** Consumes orchestrator context rapidly. The orchestrator sees the full prompt AND the full return, doubling the cost of every data transfer.
**Do this instead:** Write data to workspace files, pass file paths in prompts. "Read `claude-code/workspace/rules.json` for the current rules" is 10 tokens vs 500+ tokens of inline rules.

### Anti-Pattern 2: Trying to Nest Subagents

**What people do:** Design the verifier agent to spawn testRule and testSentence sub-sub-agents, mimicking Mastra's tool-based delegation pattern.
**Why it's wrong:** Claude Code subagents cannot spawn other subagents. The Agent tool is unavailable inside subagent contexts. This is documented behavior, not a bug.
**Do this instead:** The verifier does all testing inline within its own context. Its system prompt includes complete testing methodology. Opus 4.6 is capable of reasoning about rule correctness without sub-delegation.

### Anti-Pattern 3: Running Pipeline in Main Conversation

**What people do:** Put all orchestration logic in the SKILL.md content without `context: fork`, running the pipeline in the user's main conversation.
**Why it's wrong:** The main conversation accumulates all intermediate state, agent returns, and problem data. Context fills up fast. The user also sees every intermediate step flooding their terminal.
**Do this instead:** Use `context: fork` with `agent: solve-orchestrator` to run the pipeline in an isolated context. The orchestrator gets its own 200k context window. Only a concise summary returns to the main conversation.

### Anti-Pattern 4: One Monolithic Agent

**What people do:** Put the entire solver pipeline (extract + hypothesize + verify + improve + answer) into a single agent's system prompt.
**Why it's wrong:** A single agent cannot parallelize perspectives. Its context fills with all reasoning from all steps. No isolation between steps means errors compound. No iterative improvement loop possible within a single pass.
**Do this instead:** The orchestrator dispatches specialized agents with focused prompts. Each agent does one thing well.

### Anti-Pattern 5: Duplicating Prompt Content Across Agents

**What people do:** Copy the full linguistics patterns catalog, rule format specification, and vocabulary format into every agent's system prompt.
**Why it's wrong:** Maintenance nightmare -- changes must be made in 6 places. Wastes context in agents that only need a subset.
**Do this instead:** Store shared content in `prompts/` files. Agent system prompts say "Read `claude-code/prompts/linguistics-patterns.md` for the pattern reference catalog." Only the agents that need it load it.

## Integration Points

### Relationship to Existing Codebase

| Boundary | Direction | Notes |
|----------|-----------|-------|
| Main repo `CLAUDE.md` | Separate | `claude-code/` has its own `CLAUDE.md`. The main repo's instructions are for the Mastra/Next.js app and should not interfere. |
| Example problems (`examples/`) | Read-only by solver | The `/solve` skill can reference example problems from the main repo for testing. |
| Eval problems (`src/evals/problems.ts`) | Read-only for comparison | Ground truth problems for comparing Claude Code solver vs Mastra pipeline. |
| `.claude/agents/` (main repo) | Separate namespace | The main repo's `.claude/agents/` contains GSD agents. The solver's agents live in `claude-code/.claude/agents/`. Claude Code will discover both when the CWD is `claude-code/`. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Skill -> Orchestrator | `context: fork` + `agent:` field | Skill content becomes the orchestrator's task. `$ARGUMENTS` from `/solve` are substituted into the skill content. |
| Orchestrator -> Subagents | Agent tool with `agent_type` parameter | Orchestrator writes workspace files, then dispatches subagent with file paths in prompt. Subagent reads files, does work, writes output files, returns brief confirmation. |
| Subagent -> Orchestrator | Agent tool return value | Subagent returns a brief confirmation (file paths written). Orchestrator reads the actual data from files. |
| Between subagents | No direct communication | All inter-agent data flows through workspace files, mediated by the orchestrator. This is enforced by Claude Code's "subagents cannot spawn subagents" constraint. |

### Mastra Concept Mapping

| Mastra Mechanism | Claude Code Equivalent | Key Difference |
|-----------------|----------------------|----------------|
| `createWorkflow().then().then()` | Orchestrator's sequential Agent calls | Workflow is in the orchestrator's reasoning, not a framework DSL |
| `createStep()` with Zod schemas | Agent with file-based I/O and format instructions | No Zod runtime validation; prompt instructions enforce output format |
| `Agent.generate()` with `requestContext` | Agent tool dispatch with file paths | No shared memory; files serve as the shared context |
| `streamWithRetry()` | Claude Code's built-in reliability | No manual retry logic needed |
| Vocabulary/Rules CRUD tools | Direct JSON file read/write | Agents manipulate JSON files directly instead of calling tools that manage Maps |
| `emitTraceEvent()` streaming | Terminal output + workspace files | No real-time UI streaming; results visible in terminal and final markdown |
| `DraftStore` per perspective | Separate `hypothesis-{id}.json` files | File-based isolation replaces Map-based isolation |
| Two-agent chain (reasoner -> extractor) | Single Opus 4.6 agent | Model capability eliminates the need for a separate extraction step |
| Dispatcher agent (separate LLM call) | Orchestrator inline reasoning | Opus 4.6 can determine perspectives without a dedicated agent |

## New vs Modified Components

### New Components

| Component | Type | Purpose |
|-----------|------|---------|
| `claude-code/` directory | Directory | Entire new project root for the Claude Code solver |
| `claude-code/.claude/agents/solve-orchestrator.md` | Agent | Pipeline orchestrator dispatching subagents |
| `claude-code/.claude/agents/lo-extractor.md` | Agent | Problem parsing |
| `claude-code/.claude/agents/lo-hypothesizer.md` | Agent | Rule generation per perspective |
| `claude-code/.claude/agents/lo-verifier.md` | Agent | Rule and sentence testing |
| `claude-code/.claude/agents/lo-improver.md` | Agent | Rule revision from feedback |
| `claude-code/.claude/agents/lo-answerer.md` | Agent | Question translation |
| `claude-code/.claude/skills/solve/SKILL.md` | Skill | User-facing `/solve` command |
| `claude-code/prompts/linguistics-patterns.md` | Prompt fragment | Shared linguistics pattern catalog |
| `claude-code/prompts/rule-format.md` | Prompt fragment | Rule JSON format specification |
| `claude-code/prompts/vocabulary-format.md` | Prompt fragment | Vocabulary JSON format specification |
| `claude-code/workspace/` | Directory | Ephemeral per-run data files |
| `claude-code/CLAUDE.md` | Config | Project-level instructions |
| `claude-code/.claude/settings.json` | Config | Agent permissions and tool access |

### Modified Components

None. The Claude Code solver is built entirely in a new `claude-code/` directory. No existing Mastra code, frontend components, or configuration files are modified.

## Build Order

Based on dependencies, build in this order:

### Phase 1: Foundation (no dependencies)
1. **Directory structure** -- Create `claude-code/` with all subdirectories
2. **CLAUDE.md** -- Project instructions for the solver
3. **Prompt fragments** -- Shared prompt content (`linguistics-patterns.md`, `rule-format.md`, `vocabulary-format.md`) adapted from existing Mastra agent instructions
4. **Example problems** -- Copy or symlink from `examples/` for testing
5. **`.claude/settings.json`** -- Configure permissions for the solver agents

### Phase 2: Individual Agents (depends on prompt fragments)
6. **lo-extractor agent** -- Simplest agent, validates the file-based I/O pattern
7. **lo-hypothesizer agent** -- Core reasoning agent, references prompt fragments, most complex system prompt
8. **lo-verifier agent** -- Most architecturally different from Mastra (inline testing instead of tool delegation), needs careful prompt design
9. **lo-improver agent** -- Depends on verifier output format being settled
10. **lo-answerer agent** -- Depends on rules/vocabulary format being settled

### Phase 3: Orchestration (depends on all agents existing)
11. **solve-orchestrator agent** -- Coordinates the full pipeline, dispatches all agents
12. **solve skill (SKILL.md)** -- Entry point, invokes orchestrator via `context: fork`

### Phase 4: Tuning and Evaluation (depends on working pipeline)
13. **End-to-end testing** -- Run against eval problems, verify output quality
14. **Prompt tuning** -- Iterate on agent prompts based on results
15. **Comparison** -- Compare results with Mastra pipeline on same problems

**Phase ordering rationale:**
- Prompt fragments first because agents reference them at runtime
- Individual agents before orchestrator because they can be tested in isolation (manually dispatch a single agent)
- Orchestrator last because it depends on all agents working correctly and having settled I/O formats
- The skill is a thin wrapper and comes at the very end
- Tuning is iterative and ongoing after the pipeline works

## Sources

- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- Official docs covering custom subagents, YAML frontmatter fields, tool access restrictions, `context: fork`, parallel execution, and the constraint that subagents cannot spawn subagents (HIGH confidence)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) -- Official docs covering SKILL.md format, `context: fork` + `agent:` field, `$ARGUMENTS` substitution, invocation control, and skill-agent interaction patterns (HIGH confidence)
- GSD workflow system at `.claude/get-shit-done/` (local reference) -- Demonstrates orchestrator-dispatched multi-agent workflows using the Agent/Task tool, file-path-based subagent prompts, and parallel research spawning pattern (HIGH confidence, verified in this repo)
- GSD `execute-phase.md` workflow (local reference) -- Pattern for orchestrator spawning executor subagents with file paths, collecting results via workspace files, and spot-checking agent output (HIGH confidence)
- GSD `new-project.md` workflow (local reference) -- Pattern for spawning 4 parallel researcher subagents, each writing to separate output files, followed by a synthesizer agent (HIGH confidence)
- Existing Mastra workflow in `src/mastra/workflow/` (local reference) -- Source architecture being mapped: 10 agents, RequestContext for state, DraftStore for perspective isolation, two-agent chains, and vocabulary/rules CRUD tools (HIGH confidence)
- [Claude Code known issue #20931](https://github.com/anthropics/claude-code/issues/20931) -- Bug report about custom agents in `~/.claude/agents/` not being loaded as Task subagent types; may affect project-scoped agents (MEDIUM confidence, may be resolved)

---
*Architecture research for: Claude Code native solver workflow*
*Researched: 2026-03-07*
