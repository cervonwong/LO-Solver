# Feature Research

**Domain:** Claude Code native solver workflow (replicating Mastra LO-Solver pipeline)
**Researched:** 2026-03-07
**Confidence:** MEDIUM

## Feature Landscape

This maps each feature from the existing Mastra-based LO-Solver pipeline to Claude Code's native capabilities (skills, subagents, slash commands, file I/O). The question for each feature: is it straightforward, does it require workarounds, or is it not possible?

### Table Stakes (Must Replicate for Parity)

Features the existing Mastra workflow already implements. Without these, the Claude Code version is strictly worse than the Mastra version.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Slash command entry point (`/solve`) | User needs a single invocation to start the solver | LOW | Create `.claude/skills/solve/SKILL.md`. Accepts `$ARGUMENTS` for problem text or file path. Straightforward -- this is what skills are designed for. |
| Problem input (paste or file) | User must provide the Rosetta Stone problem text | LOW | Skill receives `$ARGUMENTS`; Claude reads a file path or uses inline text. Can prompt the user via `AskUserQuestion` if no input provided. |
| Extraction step (parse raw problem into structured data) | Core pipeline step -- extract context, dataset, questions from raw text | LOW | Claude (Opus 4.6) performs extraction directly. Write structured JSON to a file (e.g., `claude-code/state/extracted.json`). No subagent needed -- main agent handles this inline. |
| Hypothesis generation (linguistic rules + vocabulary) | Core pipeline step -- produce initial rule hypotheses | MEDIUM | The main agent reasons about the problem and writes rules/vocabulary to JSON files. The Mastra version uses a two-agent chain (reasoner + extractor); Claude Code does this in one pass since Opus 4.6 can both reason and produce structured output. |
| Multi-perspective dispatch | Mastra version generates 2-7 independent linguistic perspectives then runs parallel hypothesizers | MEDIUM | Orchestrator generates perspectives, then spawns parallel subagents (one per perspective). Each subagent writes its draft rules/vocabulary to a perspective-specific file in `claude-code/state/drafts/`. |
| Parallel hypothesis generation (one agent per perspective) | Each perspective explores independently, preventing groupthink | MEDIUM | Spawn N subagents in parallel using the Agent tool. Each gets a system prompt with its assigned perspective plus the extracted problem. Each writes output to its own draft file. Subagents run concurrently by default when launched together. **Key constraint:** subagents cannot spawn other subagents, so the main orchestrator must do all spawning. |
| Verification (test each rule and sentence) | Rules must be tested against the dataset before answering | MEDIUM | A subagent (or the main agent) systematically tests each rule against each sentence in the dataset. In Mastra, this uses tool calls to dedicated tester agents; in Claude Code, the verifier subagent reasons through each test case itself. No separate tool-call-within-subagent needed -- the verifier produces a structured feedback JSON. |
| Iterative improve loop (up to 4 iterations) | Rules that fail verification need revision | HIGH | The main orchestrator runs a sequential loop: verify -> check results -> if not converged, improve -> re-verify. **This is the hardest feature to replicate.** Claude Code has no native loop construct; the main agent must implement this as a manual loop in its reasoning. The orchestrator skill's instructions must explicitly describe the loop logic. |
| Synthesis (merge best perspective results) | After parallel hypothesizers, the best rules must be selected | MEDIUM | A subagent or the main agent reads all perspective draft files, compares test pass rates, and merges the best rules into the main state files. File-based communication makes this straightforward. |
| Answer step (apply rules to translate questions) | Final step -- produce answers using validated rules | LOW | The main agent (or a subagent) reads the final rules/vocabulary and structured problem, then generates answers. Writes to a results file. |
| Structured data passing between steps | Each step's output feeds the next step's input | MEDIUM | **File-based JSON communication.** Each step reads/writes to files in `claude-code/state/`. This is the canonical Claude Code pattern for inter-agent data passing. Schema definitions live in CLAUDE.md or skill instructions rather than Zod schemas. |
| Results output (terminal + markdown file) | User needs to see final answers | LOW | Write a formatted markdown file to `claude-code/results/`. Also display results inline in the Claude Code terminal. |
| All agents use Opus 4.6 | PROJECT.md requirement | LOW | Main conversation uses Opus 4.6 by default. Subagents inherit with `model: inherit` (default) or explicitly set `model: opus`. |

### Differentiators (Advantages of Claude Code Native)

Features that make the Claude Code version potentially *better* than the Mastra version, not just equivalent.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Single-model coherence (Opus 4.6 everywhere) | Mastra uses GPT-5-mini for extraction and Gemini 3 Flash for reasoning. Claude Code uses Opus 4.6 for everything -- potentially higher quality at each step since Opus 4.6 is a frontier model. | LOW | No model routing complexity. Every step gets the best model. The tradeoff is cost (Opus 4.6 is expensive), but for quality comparison this is an advantage. |
| No framework overhead | No Mastra, no OpenRouter, no API key management, no streaming infrastructure. Just Claude reasoning about the problem. | LOW | Eliminates an entire category of bugs (provider errors, streaming failures, schema validation issues, abort propagation). |
| Conversational iteration | After initial solve, user can ask follow-up questions, request re-verification, or adjust specific rules -- all in the same conversation context. | LOW | Mastra workflow is fire-and-forget. Claude Code naturally supports conversation continuation. This is a major UX advantage. |
| Transparent reasoning | Every step's reasoning is visible in the Claude Code terminal. No separate trace UI needed. | LOW | Users see the full chain of thought, tool calls, and subagent activity. Built into Claude Code's UI. |
| Worktree isolation for parallel hypothesizers | Each parallel hypothesizer can run in its own git worktree, preventing file write conflicts | LOW | Set `isolation: worktree` on hypothesizer subagents. Worktrees auto-clean if no changes. |
| Persistent memory across solves | A solver subagent with `memory: project` can accumulate patterns and insights across problems | MEDIUM | Over time, the solver learns common linguistic patterns (e.g., "Austronesian languages typically use reduplication for plurals"). This could improve accuracy on subsequent problems. |
| Resume/continue sessions | If a solve is interrupted or the user wants to revisit results, `/resume` or `--continue` picks up where it left off | LOW | Built-in Claude Code feature. No implementation needed. |
| Eval comparison in same session | User can run the solver on a problem, see results, then compare against zero-shot in the same session | MEDIUM | Main agent can do a zero-shot solve (just answer directly without the pipeline) and compare. No separate eval harness needed for quick comparisons. |
| Dynamic context injection | Skill can use `` !`command` `` syntax to inject problem text from files at invocation time | LOW | Example: `/solve problems/problem-1.txt` with skill using `` !`cat $ARGUMENTS` `` to inject content. |

### Anti-Features (Do Not Attempt)

Features that seem useful but would fight Claude Code's architecture or create unnecessary complexity.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time event streaming to a frontend | Mastra version has a polished trace UI with live updates | Claude Code has no web frontend. Building one would mean building a separate server, WebSocket layer, and React app -- duplicating what Mastra already does. | The Claude Code terminal IS the UI. Transparent reasoning replaces event streaming. |
| Vocabulary/Rules CRUD tools | Mastra version has 5 vocabulary tools and 5 rules tools that agents call | Claude Code subagents cannot call custom MCP tools without extra wiring. Implementing these as MCP servers adds massive complexity for minimal gain when agents can just read/write JSON files directly. | Agents read/write JSON files directly. File I/O replaces tool calls. |
| Agent-to-agent direct communication | Agent Teams let agents message each other, which sounds ideal for verify/improve coordination | Agent Teams are designed for sustained parallelism across sessions, not tight sequential loops. Using them for a 4-iteration verify/improve cycle adds coordination overhead that exceeds the loop's complexity. | Sequential subagent dispatch from main orchestrator. Simpler and more reliable. |
| Nested subagent spawning | Having a verifier subagent spawn tester sub-subagents | Subagents cannot spawn other subagents. This is a hard architectural constraint in Claude Code (confirmed by GitHub issue #4182). | Main orchestrator handles all subagent spawning. Flatten the hierarchy. |
| Zod schema validation at boundaries | Mastra uses Zod schemas to validate data between steps | Claude Code agents don't have a TypeScript runtime for schema validation. JSON files can be validated by the agent reading and checking them, but formal schema validation requires a Bash script/Node.js call. | Agent-level validation: the skill instructions specify the expected JSON shape. Claude checks it naturally. Add a lightweight validation script for critical boundaries if needed. |
| Cost tracking per step | Mastra tracks API cost per step | Claude Code's cost tracking is session-level, not per-subagent. There's no API to query per-invocation cost from within a skill. | Accept session-level cost display in Claude Code's built-in UI. |
| Abort/cancel mid-solve | Mastra has explicit abort propagation | Ctrl+C interrupts Claude Code. Background subagents can be stopped. But there's no programmatic abort-and-resume. | Ctrl+C is sufficient. If a subagent is backgrounded, it can be killed. |
| Frontend results viewer | Mastra has a polished results page with formatted answers and confidence levels | Building a web frontend defeats the purpose of "Claude Code native." | Markdown file output. The results file IS the viewer. |

## Feature Dependencies

```
[Slash command entry point (/solve)]
    |
    v
[Problem input (paste or file)]
    |
    v
[Extraction step]
    |
    v
[Multi-perspective dispatch]
    |
    +-----> [Parallel hypothesis generation] (N subagents)
    |           |
    |           v
    |       [Per-perspective draft files]
    |
    v
[Synthesis (merge best drafts)]
    |
    v
[Verification loop] <----+
    |                      |
    +--- converged? NO ----+
    |
    v (YES)
[Answer step]
    |
    v
[Results output (terminal + file)]
```

### Dependency Notes

- **Extraction requires problem input:** Cannot extract structure from nothing. Extraction writes `extracted.json`.
- **Multi-perspective dispatch requires extraction:** The dispatcher analyzes the extracted structured problem to determine which linguistic angles to explore.
- **Parallel hypothesizers require dispatch:** Each subagent needs its assigned perspective from the dispatcher output.
- **Synthesis requires all hypothesizer outputs:** Must wait for all parallel subagents to complete before merging.
- **Verification requires synthesis:** Tests the merged ruleset against the dataset.
- **Improve loop requires verification:** Only runs if verification finds issues. Loops back to re-verify.
- **Answer step requires converged rules:** Must have a validated ruleset before answering questions.
- **Results output requires answers:** Final step, writes formatted markdown.

### Key Claude Code Constraints Affecting Dependencies

1. **Subagents cannot spawn subagents.** The main orchestrator must spawn all subagents directly. This flattens what was a deep call tree in Mastra (orchestrator -> verifier-orchestrator -> rule-tester-tool -> rule-tester-agent) into a flat fan-out from the main agent.

2. **No native loop construct.** The verify/improve loop must be encoded in the skill instructions as explicit prose: "Repeat steps N-M up to 4 times until verification passes or iterations are exhausted." The main agent follows these instructions using its reasoning capabilities.

3. **File-based state is the communication primitive.** All data flows through JSON files in `claude-code/state/`. This replaces Mastra's RequestContext, workflow state, and Zod-validated schemas.

4. **Subagent results return to the main conversation context.** Running many subagents with large outputs can consume significant context. Subagents should return concise summaries and write detailed data to files.

## MVP Definition

### Launch With (v1.4.0)

Minimum viable Claude Code solver that can solve a Linguistics Olympiad problem end-to-end.

- [ ] `/solve` skill with problem input handling (paste text or `@file` reference) -- entry point
- [ ] Extraction step (main agent parses problem, writes `extracted.json`) -- foundation for all later steps
- [ ] Single-perspective hypothesis generation (skip multi-perspective for MVP) -- simplest path to rules
- [ ] Verification step (main agent tests rules against dataset) -- catches bad rules
- [ ] Single improve iteration (if verification finds issues) -- basic self-correction
- [ ] Answer step (apply rules to questions) -- the actual deliverable
- [ ] Results written to `claude-code/results/` as markdown -- persistent output

### Add After Validation (v1.4.x)

Features to add once the single-perspective pipeline works.

- [ ] Multi-perspective dispatch with parallel subagents -- when single-perspective quality needs improvement
- [ ] Synthesis step (merge multiple perspective results) -- required for multi-perspective
- [ ] Full verify/improve loop (up to 4 iterations) -- when single iteration isn't enough
- [ ] Persistent memory for cross-problem learning -- when solving multiple problems
- [ ] Eval comparison mode (pipeline vs zero-shot in same session) -- when measuring quality

### Future Consideration (v2+)

Features to defer until the core pipeline is proven.

- [ ] Agent Teams for sustained parallel work -- only if parallel subagents prove insufficient
- [ ] MCP server for vocabulary/rules tools -- only if file-based I/O proves insufficient
- [ ] Custom hook-based validation at step boundaries -- only if agent-level validation proves unreliable
- [ ] Automated eval harness that runs multiple problems -- only if manual comparison is too slow

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `/solve` skill entry point | HIGH | LOW | P1 |
| Extraction step | HIGH | LOW | P1 |
| Single-perspective hypothesis | HIGH | MEDIUM | P1 |
| Verification step | HIGH | MEDIUM | P1 |
| Single improve iteration | HIGH | MEDIUM | P1 |
| Answer step | HIGH | LOW | P1 |
| Results markdown output | HIGH | LOW | P1 |
| Multi-perspective dispatch | MEDIUM | MEDIUM | P2 |
| Parallel hypothesis subagents | MEDIUM | MEDIUM | P2 |
| Synthesis (merge perspectives) | MEDIUM | MEDIUM | P2 |
| Full verify/improve loop (4 iters) | MEDIUM | HIGH | P2 |
| Persistent memory | LOW | MEDIUM | P3 |
| Eval comparison mode | MEDIUM | MEDIUM | P3 |
| Conversational follow-up | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Must have for launch -- the core pipeline
- P2: Should have -- multi-perspective and iterative improvement (what makes the agentic approach better than zero-shot)
- P3: Nice to have -- quality-of-life and measurement features

## Implementation Pattern Analysis

### How the Orchestrator Skill Works

The `/solve` skill is the single entry point. It runs in the main conversation context (not forked) so it can maintain state across the full pipeline. The skill content is a detailed playbook that tells Claude:

1. Read the problem text
2. Extract structured data, write to file
3. Generate perspectives (or skip for MVP)
4. Spawn parallel hypothesizer subagents (or do inline for MVP)
5. Read draft results, synthesize best rules
6. Run verification, check results
7. If verification fails and iterations remain, improve rules and re-verify
8. Answer questions using final rules
9. Write results to markdown file

**Confidence:** HIGH -- this pattern is well-documented in Claude Code official docs and aligns with the skill system's design intent.

### How Parallel Subagent Execution Works

Define hypothesizer subagent in `.claude/agents/hypothesizer.md`:
```yaml
---
name: hypothesizer
description: Generate linguistic rules for a specific perspective
tools: Read, Write, Grep, Glob
model: inherit
---
System prompt with instructions for analyzing the problem from a specific
linguistic angle and writing rules/vocabulary to a designated output file.
```

The main orchestrator spawns multiple instances with different prompts:
```
Use the hypothesizer subagent to analyze the problem from a morphological
perspective. Read the problem from claude-code/state/extracted.json.
Write your rules to claude-code/state/drafts/morphological.json.
```

Multiple subagents launch concurrently when dispatched together.

**Confidence:** HIGH -- official docs confirm parallel subagent dispatch. File-based output is the recommended communication pattern.

### How Structured Data Passes Between Steps

All inter-step data flows through JSON files:
- `claude-code/state/extracted.json` -- extraction output
- `claude-code/state/perspectives.json` -- dispatcher output
- `claude-code/state/drafts/{perspective-id}.json` -- per-perspective hypotheses
- `claude-code/state/rules.json` -- synthesized/merged rules
- `claude-code/state/vocabulary.json` -- synthesized/merged vocabulary
- `claude-code/state/verification.json` -- verification feedback
- `claude-code/results/{timestamp}-results.md` -- final answers

The skill instructions specify the JSON shape for each file. Claude reads and writes these files using the Read and Write tools.

**Confidence:** HIGH -- file-based communication is the documented canonical pattern for subagent data passing.

### How Iterative Loops Work

This is the trickiest part. Claude Code has no `for` loop or `while` loop construct. The orchestrator skill must encode the loop in natural language:

```markdown
## Verification Loop (up to 4 iterations)

After synthesis, verify the rules:

1. Read rules from claude-code/state/rules.json
2. Test each rule against each sentence in the dataset
3. Write verification results to claude-code/state/verification.json
4. Check the conclusion field:
   - If "ALL_RULES_PASS": proceed to answering questions
   - If "NEEDS_IMPROVEMENT" or "MAJOR_ISSUES" and iteration < 4:
     a. Read the verification feedback
     b. Revise failing rules based on the feedback
     c. Write updated rules to claude-code/state/rules.json
     d. Go back to step 1 (increment iteration counter)
   - If iteration >= 4: proceed to answering with current best rules
```

Claude follows these instructions using its reasoning capabilities. The loop state (iteration count, convergence status) is tracked in a state file or by the agent's own memory within the conversation.

**Confidence:** MEDIUM -- this depends on Claude's ability to faithfully follow multi-step loop instructions. The pattern works in GSD's executor agent (which handles complex multi-step plans), but a 4-iteration loop with conditional branching is at the edge of reliable instruction-following. Mitigation: keep each iteration's instructions explicit and simple. Write the iteration counter to a file so the agent can read its own state.

### How Results Get Written

The skill instructs Claude to write a formatted markdown file:

```markdown
## Write Results

Write the final answers to claude-code/results/{problem-name}.md with:

# LO-Solver Results: {problem name}
## Answers
For each question:
- Question ID and input text
- Answer
- Confidence level
- Working steps showing rule application
## Rules Used
List all validated rules
## Verification Summary
Final pass rate and conclusion
```

**Confidence:** HIGH -- file writing is a core Claude Code capability.

## Capability Mapping: Mastra vs Claude Code

| Mastra Concept | Claude Code Equivalent | Gap? |
|---------------|----------------------|------|
| Workflow steps (`.then()`) | Skill instructions (sequential prose) | No -- natural mapping |
| RequestContext (shared mutable state) | JSON files in `claude-code/state/` | No -- different mechanism, same purpose |
| Agent `generate()` / `stream()` | Main agent reasoning or subagent delegation | No -- Claude IS the LLM |
| Zod schema validation | Agent-level structural checking + optional Node.js validation scripts | Minor -- less formal but functional |
| OpenRouter model routing | Built-in model selection (`model: opus/sonnet/haiku`) | No -- simpler in Claude Code |
| Vocabulary/Rules CRUD tools | Direct file read/write on JSON files | No -- simpler approach |
| Real-time event streaming | Terminal output (built-in transparency) | Yes -- no web UI, but terminal is adequate |
| Parallel execution via Promise.all | Parallel subagent dispatch | No -- native capability |
| DraftStore isolation | Per-perspective JSON files or worktree isolation | No -- file-based isolation is cleaner |
| Two-agent chain (reasoner + extractor) | Single Opus 4.6 pass (reason and extract in one) | No -- Opus 4.6 handles both |
| Abort signal propagation | Ctrl+C / Ctrl+B | Partial -- less granular but functional |
| Cost tracking per step | Session-level cost display | Yes -- no per-step breakdown |
| Eval harness with scoring | Manual comparison or scripted eval | Yes -- no automated eval in v1.4 |

## Sources

- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- Official docs on subagent creation, parallel execution, file-based communication, and limitations (no nested spawning). **HIGH confidence.**
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) -- Official docs on skill creation, SKILL.md format, `context: fork`, dynamic injection, and argument passing. **HIGH confidence.**
- [Claude Code Common Workflows](https://code.claude.com/docs/en/common-workflows) -- Official patterns for multi-step workflows, plan mode, and worktree isolation. **HIGH confidence.**
- [Claude Code Sub-Agent Best Practices (claudefa.st)](https://claudefa.st/blog/guide/agents/sub-agent-best-practices) -- Community patterns for sequential vs parallel dispatch, data passing, and routing rules. **MEDIUM confidence.**
- [Claude Code Agent Teams Guide (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-teams) -- Overview of Agent Teams for sustained parallelism. **MEDIUM confidence.**
- [Task Tool vs Subagents (ibuildwith.ai)](https://www.ibuildwith.ai/blog/task-tool-vs-subagents-how-agents-work-in-claude-code/) -- Clarification on Agent tool mechanics and structured data passing. **MEDIUM confidence.**
- [Parallel Subagents (Tim Dietrich)](https://timdietrich.me/blog/claude-code-parallel-subagents/) -- Practical examples of parallel subagent execution. **MEDIUM confidence.**
- [Structured Output Feature Request (GitHub #20625)](https://github.com/anthropics/claude-code/issues/20625) -- Confirms structured output for subagents is not yet supported as a formal API; file-based JSON is the current approach. **HIGH confidence (official issue tracker).**
- [Sub-Agent Nesting Limitation (GitHub #4182)](https://github.com/anthropics/claude-code/issues/4182) -- Confirms subagents cannot spawn other subagents by design. **HIGH confidence (official issue tracker).**
- [Best Practices for Claude Code](https://code.claude.com/docs/en/best-practices) -- Official patterns for verification loops and agentic coding. **HIGH confidence.**

---
*Feature research for: Claude Code native solver workflow (v1.4)*
*Researched: 2026-03-07*
