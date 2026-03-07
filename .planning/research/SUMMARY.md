# Project Research Summary

**Project:** LO-Solver v1.4 -- Claude Code Native Solver
**Domain:** Claude Code multi-agent workflow (converting Mastra orchestration to native Claude Code subagents)
**Researched:** 2026-03-07
**Confidence:** MEDIUM-HIGH

## Executive Summary

LO-Solver v1.4 rebuilds the existing Mastra-based solver pipeline as a Claude Code native workflow using subagents, skills, and file-based state. The existing pipeline (extract, multi-perspective hypothesize, verify/improve, answer) maps cleanly onto Claude Code primitives: a `/solve` skill as the entry point, a `solve-orchestrator` agent coordinating the pipeline, and specialized subagents for each step. The key architectural simplification is that Opus 4.6 eliminates the need for two-agent chains (reasoner + extractor), cutting the agent count from 10 to 6. File-based JSON communication replaces Mastra's RequestContext and Zod schemas.

The recommended approach is a flat orchestrator pattern where the main orchestrator agent spawns all subagents directly -- no nesting allowed. Data passes between steps via JSON files in a `claude-code/workspace/` directory. The verify/improve loop is controlled by the orchestrator reading a state file with an iteration counter, since Claude Code has no native loop construct. Critically, multi-perspective hypothesizers must be dispatched sequentially, not in parallel, due to a confirmed platform bug (#22508, #29181) where parallel Task tool calls silently emit only 1 of N and hallucinate the rest.

The primary risks are: (1) the parallel Task tool bug forcing sequential dispatch and adding latency, (2) context window exhaustion in the orchestrator over multiple verify/improve iterations, (3) the `classifyHandoffIfNeeded` bug causing every subagent to report "failed" even on success (requiring spot-check logic), and (4) subagents having no shared context (each prompt must be fully self-contained). All four risks have known mitigations documented in the pitfalls research, and the GSD workflow system in this repo already implements the spot-check and file-based patterns needed.

## Key Findings

### Recommended Stack

The "stack" is Claude Code's own extensibility system -- no npm packages needed. The solver runs entirely in the terminal using Claude Code primitives.

**Core technologies:**
- **Subagents** (`.claude/agents/*.md`): One per pipeline step (extractor, hypothesizer, verifier, improver, answerer) plus an orchestrator -- each runs in an isolated context with its own system prompt, model, and tool restrictions
- **Skills** (`.claude/skills/solve/SKILL.md`): The `/solve` entry point that triggers the orchestrator via `context: fork` -- handles argument parsing and user interaction
- **File-based JSON state** (`claude-code/workspace/`): Replaces Mastra's RequestContext -- all inter-agent data flows through JSON files with a naming convention per step
- **Prompt fragments** (`claude-code/prompts/`): Shared linguistics patterns and format specs read by agents at runtime -- single source of truth for domain knowledge
- **Hooks** (`.claude/settings.json`): `SubagentStart`/`SubagentStop` for logging pipeline progress -- optional but useful for observability

**Version requirements:** Claude Code 2.1.63+ (Agent tool support), Opus 4.6 model for all agents.

### Expected Features

**Must have (table stakes -- parity with Mastra pipeline):**
- `/solve` skill entry point accepting problem text or file path
- Extraction step parsing raw problem into structured JSON
- Hypothesis generation with linguistic rules and vocabulary
- Verification step testing rules against the dataset
- At least one improve iteration for failing rules
- Answer step applying validated rules to translate questions
- Results output to markdown file and terminal

**Should have (differentiators over Mastra):**
- Multi-perspective dispatch with sequential subagents (one perspective per agent)
- Full verify/improve loop with up to 4 iterations and file-based state tracking
- Conversational follow-up after solve (built-in Claude Code capability)
- Persistent memory across problems via `memory: project` on solver agents

**Defer (v2+):**
- Agent Teams for sustained parallelism (experimental, overkill)
- MCP server for vocabulary/rules CRUD tools (file I/O sufficient)
- Automated eval harness (manual comparison first)
- Custom hook-based validation at step boundaries

### Architecture Approach

The architecture is a flat orchestrator-dispatched pipeline with file-mediated data flow. A `/solve` skill invokes a `solve-orchestrator` agent via `context: fork`, giving it an isolated 200K-token context window. The orchestrator spawns subagents one at a time (extractor, then hypothesizers sequentially, then verifier/improver in a loop, then answerer), reading/writing workspace JSON files between each dispatch. This replaces Mastra's workflow DSL, RequestContext, and two-agent chains with a single coordinating agent and file-based state.

**Major components:**
1. **`/solve` skill** -- User entry point, argument parsing, triggers orchestrator
2. **`solve-orchestrator` agent** -- Pipeline coordinator, subagent dispatch, loop control, context management
3. **`lo-extractor` agent** -- Parses raw problem into `extracted.json`
4. **`lo-hypothesizer` agent** -- Generates rules and vocabulary from a specific linguistic perspective
5. **`lo-verifier` agent** -- Tests every rule and sentence inline (no sub-delegation), writes structured feedback
6. **`lo-improver` agent** -- Revises failing rules based on verification feedback
7. **`lo-answerer` agent** -- Applies validated rules to produce translations

### Critical Pitfalls

1. **Parallel Task tool calls hallucinate results** (issues #22508, #29181) -- The orchestrator may emit only 1 of N parallel Agent calls, fabricating plausible but fake results for the rest. **Avoid by dispatching subagents sequentially.** The Features researcher states parallel execution is "natively supported," but the Pitfalls researcher found confirmed bugs proving it unreliable. **Use sequential dispatch for v1.4.**

2. **Subagents cannot spawn subagents** (confirmed by design, issue #4182) -- The Mastra pipeline's deep nesting (orchestrator -> verifier -> tester agents) must be flattened. The verifier must do all testing inline. **Avoid by enforcing a single level of delegation from the orchestrator.** Note: the Architecture researcher suggests a `context: fork` + `agent: solve-orchestrator` pattern, which spawns the orchestrator as a subagent of the skill. Whether this forked orchestrator can then dispatch further subagents is an open question requiring validation (see Gaps below).

3. **`classifyHandoffIfNeeded` bug causes 100% false failures** (issues #22087, #24181) -- Every Task tool subagent reports "failed" status even when work completes. **Avoid by implementing spot-check logic: verify output files exist and contain valid JSON before proceeding.** Copy the pattern from GSD's `execute-phase.md`.

4. **Subagent prompts are isolated -- no CLAUDE.md inheritance** -- Each subagent gets only its own system prompt. Format specifications, output schemas, and domain knowledge must be embedded inline or loaded via the `skills:` field. **Avoid by making every subagent prompt fully self-contained with explicit input/output format specs.**

5. **Context window exhaustion in orchestrator** -- With 4 pipeline steps plus up to 4 verify/improve iterations, the orchestrator accumulates context rapidly. **Avoid by having subagents return only brief summaries (file paths + pass/fail) and write full data to files.**

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Orchestrator Skeleton

**Rationale:** 6 of 8 pitfalls must be addressed in the orchestrator's architecture. The file naming convention, sequential dispatch pattern, spot-check logic, and context management strategy must be locked in before writing any subagent. This phase also creates the directory structure, CLAUDE.md, and prompt fragments that all subsequent phases depend on.
**Delivers:** Working orchestrator that can dispatch a single subagent, verify its output via spot-check, and manage workspace files. No pipeline logic yet -- just the dispatch/verify/read-file skeleton. Also validates whether `context: fork` orchestrator can dispatch further subagents (critical open question).
**Addresses features:** Directory structure, file-based state convention, workspace setup
**Avoids pitfalls:** #1 (sequential dispatch), #2 (flat hierarchy), #3 (file-based output), #4 (context management), #5 (spot-check for false failures), #8 (file naming isolation)

### Phase 2: Individual Subagent Definitions

**Rationale:** Agents can be built and tested in isolation (manually dispatch a single agent via the Agent tool) once the orchestrator skeleton exists. Building agents before orchestration logic allows validating that each agent's prompt produces correct output format.
**Delivers:** All 5 specialized subagent definitions (extractor, hypothesizer, verifier, improver, answerer) with self-contained prompts, shared prompt fragments, and example I/O.
**Addresses features:** Extraction step, hypothesis generation, verification, improvement, answer step
**Avoids pitfalls:** #7 (thin subagent prompts -- each prompt fully self-contained with schemas)

### Phase 3: Pipeline Orchestration (MVP)

**Rationale:** With all agents defined and tested individually, the orchestrator can now coordinate the full pipeline. Start with single-perspective (no multi-perspective dispatch) and a single verify/improve iteration for the simplest end-to-end path.
**Delivers:** Working `/solve` command that runs the full pipeline: extract -> hypothesize (single perspective) -> verify -> improve (1 iteration) -> answer -> results file.
**Addresses features:** `/solve` entry point, single-perspective hypothesis, single improve iteration, results output
**Avoids pitfalls:** #6 (loop cap via state file), #4 (context management during full pipeline)

### Phase 4: Multi-Perspective and Full Loop

**Rationale:** Once the single-perspective MVP works, add sequential multi-perspective dispatch and the full 4-iteration verify/improve loop. These are the features that differentiate the agentic approach from zero-shot.
**Delivers:** Multi-perspective hypothesis generation (sequential dispatch, N perspectives), synthesis of best perspective, full verify/improve loop with file-based iteration tracking.
**Addresses features:** Multi-perspective dispatch, sequential hypothesis subagents, synthesis step, full verify/improve loop
**Avoids pitfalls:** #1 (sequential dispatch for perspectives), #6 (iteration cap enforced via state file)

### Phase 5: Polish and Evaluation

**Rationale:** After the full pipeline works, add quality-of-life features and compare results against the Mastra pipeline.
**Delivers:** Persistent memory, eval comparison mode, conversational follow-up, prompt tuning based on results.
**Addresses features:** Persistent memory, eval comparison, conversational iteration

### Phase Ordering Rationale

- **Foundation first** because 6 of 8 critical pitfalls are architectural decisions that cascade through everything else. Getting dispatch, file conventions, and spot-check logic wrong would require rewriting all subagent definitions.
- **Agents before orchestration** because each agent can be tested in isolation, validating output formats before the orchestrator depends on them. This catches schema mismatches early.
- **Single-perspective MVP before multi-perspective** because multi-perspective adds complexity (synthesis step, perspective selection) that is only worth building once the core pipeline works end-to-end.
- **Full loop after MVP** because the verify/improve loop is the hardest feature to get right in a prompt-based orchestrator (no native loop construct), and it should build on a working single-iteration pipeline.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (Orchestrator skeleton):** Needs validation of whether a `context: fork` + `agent: solve-orchestrator` subagent can dispatch further subagents via the Agent tool. If not, the orchestrator must run in the main conversation context (sacrificing context isolation). This is the single biggest open question.
- **Phase 3 (Pipeline orchestration):** The verify/improve loop encoded in natural language instructions is rated MEDIUM confidence by the Features researcher. May need experimentation to find the right prompt structure for reliable loop-following.
- **Phase 4 (Multi-perspective):** Sequential dispatch of N perspectives is straightforward, but the synthesis step (merging best rules from multiple perspectives) has no documented pattern in Claude Code. Will need to design the prompt from scratch.

Phases with standard patterns (skip research-phase):

- **Phase 2 (Subagent definitions):** Well-documented pattern -- YAML frontmatter + markdown body. Official docs have complete examples. The main work is prompt engineering, not architecture.
- **Phase 5 (Polish):** Standard Claude Code features (memory, conversation continuation). No architectural novelty.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based entirely on official Claude Code docs. Subagents, skills, hooks are stable, documented features. No third-party dependencies. |
| Features | MEDIUM | Core feature mapping is solid (HIGH), but iterative loop reliability and multi-perspective synthesis are unproven in Claude Code (MEDIUM). The parallel execution claim contradicts confirmed bugs. |
| Architecture | HIGH | File-mediated data flow and flat orchestrator patterns are well-documented and proven in the GSD workflow system in this repo. The `context: fork` orchestrator question is the one gap. |
| Pitfalls | HIGH | All critical pitfalls backed by confirmed GitHub issues with reproduction steps. The `classifyHandoffIfNeeded` bug and parallel Task tool bug are verified platform issues. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **`context: fork` + Agent tool nesting:** The Architecture researcher recommends `context: fork` with `agent: solve-orchestrator` to give the orchestrator its own context window. But the Stack and Pitfalls researchers confirm subagents cannot spawn subagents. Does a `context: fork` agent count as a "subagent" for this restriction? If yes, the orchestrator cannot dispatch any agents and the entire architecture breaks. **Must validate in Phase 1 before building anything else.** Fallback: run orchestration in the main conversation context (loses context isolation but works).

- **Parallel dispatch reliability timeline:** The parallel Task tool bug (issues #22508, #29181) may be fixed in a future Claude Code release. If fixed, multi-perspective hypothesizers could run in parallel instead of sequentially, significantly reducing latency. **Monitor these issues during development.**

- **Loop instruction-following fidelity:** The verify/improve loop is encoded as natural language instructions. No research found empirical data on how reliably Opus 4.6 follows "repeat steps N-M up to K times" instructions as context grows. **Validate early in Phase 3 with a real problem.**

- **Custom agent discovery bug:** GitHub issue #20931 reports custom agents in `~/.claude/agents/` not being loaded as Task subagent types. May affect project-scoped agents in `claude-code/.claude/agents/`. **Test agent discovery in Phase 1.**

## Sources

### Primary (HIGH confidence)
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- Agent definitions, parallel execution, nesting constraints
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) -- Skill format, `context: fork`, `$ARGUMENTS`, invocation control
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- Hook events, matchers, SubagentStart/SubagentStop
- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory) -- CLAUDE.md hierarchy, rules directory
- [GitHub #29181](https://github.com/anthropics/claude-code/issues/29181) -- Parallel Task tool emits only 1 of N (confirmed bug)
- [GitHub #22508](https://github.com/anthropics/claude-code/issues/22508) -- Parallel Task calls truncated (confirmed bug)
- [GitHub #24181](https://github.com/anthropics/claude-code/issues/24181) -- classifyHandoffIfNeeded 100% failure (confirmed bug)
- [GitHub #4182](https://github.com/anthropics/claude-code/issues/4182) -- Subagents cannot spawn subagents (by design)
- GSD workflow system (`.claude/get-shit-done/`) -- Proven orchestrator patterns, spot-check logic, file-based state

### Secondary (MEDIUM confidence)
- [Claude Code Sub-Agent Best Practices (claudefa.st)](https://claudefa.st/blog/guide/agents/sub-agent-best-practices) -- Community patterns for dispatch and data passing
- [Task Tool vs Subagents (ibuildwith.ai)](https://www.ibuildwith.ai/blog/task-tool-vs-subagents-how-agents-work-in-claude-code/) -- Agent tool mechanics
- [Context Window Management (morphllm.com)](https://www.morphllm.com/claude-code-context-window) -- Context exhaustion thresholds

### Tertiary (needs validation)
- [GitHub #20931](https://github.com/anthropics/claude-code/issues/20931) -- Custom agent discovery bug (may be resolved)
- The `context: fork` + Agent tool nesting question -- no source directly addresses this; requires hands-on validation

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*
