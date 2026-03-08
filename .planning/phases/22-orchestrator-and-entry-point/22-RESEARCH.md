# Phase 22: Orchestrator and Entry Point - Research

**Researched:** 2026-03-08
**Domain:** Claude Code skill orchestration, subagent dispatch, file-based agent coordination
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Hypothesis selection**: Always run the synthesizer to merge all perspectives -- don't pick a single winner. Even if one perspective scores 100%, other perspectives may have complementary rules. The synthesizer merges the best parts from all perspectives into a coherent solution.
- **Multi-round loop**: Support up to 3 rounds of hypothesis generation (matching Mastra pipeline). After synthesis + convergence check, if rules still fail, dispatch new targeted perspectives and iterate. Full re-verification after synthesis: run the verifier agent on the synthesized solution, stop only if ALL_RULES_PASS. If not converged after 3 rounds, use the best-so-far result.
- **Subagent validation**: File existence only -- just check the output file was written. Trust agents to produce valid output; the verifier catches bad content downstream. No deep structure parsing of intermediate files.
- **User feedback**: Stage announcements: print a line when each major stage starts. Show per-perspective pass rates after verification rounds. Do NOT show individual file writes -- stage names only. Mention non-critical failures briefly. All failures also logged to errors.md for later review.

### Claude's Discretion
- Input handling approach (file path vs inline paste vs both)
- How to dispatch perspectives in parallel vs sequential
- Workspace directory naming convention
- Retry policy for non-critical failures (CLAUDE.md already sets default: retry once then skip)
- How to implement the improver-dispatcher for Round 2+ gap analysis

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORCH-01 | User can trigger solver via `/solve` slash command in Claude Code | SKILL.md skill system with `disable-model-invocation: true` and `argument-hint` already in place; skill body contains orchestrator logic |
| ORCH-02 | Orchestrator asks for problem input (paste text or file path) | `$ARGUMENTS` substitution in SKILL.md; skill can check if arguments were provided and prompt otherwise |
| ORCH-03 | Orchestrator dispatches subagents in pipeline order with file-based state | Sequential Agent tool dispatch from skill body running inline; subagents read/write workspace files |
| ORCH-04 | Each agent reads predecessor files and writes its own named output file | Already established in agent definitions: each agent receives input/output paths and uses Read/Write tools |
| ORCH-05 | Orchestrator selects best hypothesis by comparing test pass rates from files | Orchestrator reads verification files after verifier subagents complete, parses pass rates, always runs synthesizer per user decision |
</phase_requirements>

## Summary

This phase builds the `/solve` skill orchestrator -- the entry point that ties all pipeline agents together. The orchestrator is a SKILL.md file containing procedural instructions that Claude follows when the user invokes `/solve`. It creates a workspace directory, dispatches subagents sequentially via the Agent tool (formerly Task tool), and coordinates the multi-round hypothesis-verify-synthesize loop.

The key architectural insight is that the `/solve` skill runs **inline** in the main conversation context (no `context: fork`), giving the orchestrator full access to the conversation and the ability to dispatch subagents. Subagents cannot spawn other subagents (hard limitation of Claude Code), so the orchestrator must remain in the main context. Each subagent receives explicit file paths and instructions, does its work, and returns. The orchestrator validates completion by checking output file existence (per user decision).

**Primary recommendation:** Write the orchestrator as inline SKILL.md instructions that sequentially dispatch agents via the Agent tool. Use sequential dispatch for all agents due to the parallel Agent tool bug (issues #22508, #29181). Implement the multi-round loop as procedural logic within the skill instructions.

## Standard Stack

### Core

| Component | Version/Type | Purpose | Why Standard |
|-----------|-------------|---------|--------------|
| Claude Code Skills | SKILL.md | Entry point and orchestrator logic | Native Claude Code mechanism for slash commands; already has shell in place |
| Claude Code Agent tool | Built-in | Dispatching subagents | Native subagent dispatch mechanism; renamed from Task tool in v2.1.63 |
| File-based state | Markdown files | Inter-agent communication | Established pattern in claude-code/CLAUDE.md; agents already designed for it |
| Agent definitions | `.claude/agents/*.md` | 6 subagent definitions | Already built in Phase 21: extractor, hypothesizer, verifier, improver, synthesizer, answerer |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `$ARGUMENTS` substitution | Pass file path from `/solve <path>` to skill body | When user provides a file path argument |
| `workspace-format.md` reference | Templates for all file types | Agents already reference this for output format |
| `PIPELINE.md` reference | Full pipeline specification | Orchestrator references for dispatch order and data flow |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline skill (no `context: fork`) | `context: fork` with agent | Forked skills run in a subagent which CANNOT spawn further subagents -- would break the entire orchestration pattern |
| Sequential Agent dispatch | Parallel Agent dispatch | Parallel dispatch is bugged (issues #22508, #29181) -- model emits only 1 of N intended calls |
| Agent teams (TeamCreate) | Sequential Agent tool | Teams are experimental/beta; add complexity; sequential dispatch is proven stable |

**No installation needed.** All components are native Claude Code features.

## Architecture Patterns

### Recommended Project Structure

```
claude-code/
  .claude/
    skills/
      solve/
        SKILL.md              # Orchestrator logic (this phase's main deliverable)
    agents/
      extractor.md            # [Phase 21] Parse problem
      hypothesizer.md         # [Phase 21] Generate rules from perspective
      verifier.md             # [Phase 23] Test rules against dataset
      improver.md             # [Phase 23] Revise failing rules
      synthesizer.md          # [Phase 21 shell] Merge perspectives
      answerer.md             # [Phase 23] Translate questions
  references/
    workspace-format.md       # File format templates
  PIPELINE.md                 # Pipeline reference
  CLAUDE.md                   # Project conventions
  workspace/
    {datetime}/               # Per-run output
      problem.md
      hypotheses/
        round-{N}/
          perspective-{N}.md
          verification-{N}.md
      solution.md
      verification.md
      answers.md
      errors.md
```

### Pattern 1: Inline Skill Orchestrator

**What:** The SKILL.md body contains step-by-step procedural instructions that Claude follows in the main conversation context. The orchestrator dispatches subagents, checks file existence, and prints stage announcements.

**When to use:** When the orchestrator needs to dispatch subagents (since subagents cannot spawn other subagents).

**Why inline:** The official Claude Code documentation explicitly states: "Subagents cannot spawn other subagents. If your workflow requires nested delegation, use Skills or chain subagents from the main conversation." The `/solve` skill must run inline to dispatch agents.

**Example SKILL.md structure:**
```markdown
---
name: solve
description: Solve a Linguistics Olympiad Rosetta Stone problem
disable-model-invocation: true
argument-hint: "[file-path]"
---

## 1. Input Handling

If $ARGUMENTS contains a file path, read the problem from that file.
If $ARGUMENTS is empty, ask the user to paste the problem text or provide a file path.

## 2. Create Workspace

Create a timestamped workspace directory at `claude-code/workspace/{YYYY-MM-DD_HH-MM-SS}/`.

## 3. Dispatch Pipeline

### Step 1: Extract
Dispatch the extractor agent...

### Step 2: Hypothesis Loop (up to 3 rounds)
For each round:
  (a) Generate perspectives
  (b) Dispatch hypothesizer for each perspective (sequentially)
  (c) Dispatch verifier for each perspective (sequentially)
  (d) Dispatch synthesizer
  (e) Dispatch verifier for convergence check
  (f) Check convergence

[Phase 23 continues with verify-improve loop and answer step]
```

### Pattern 2: Sequential Agent Dispatch with File Validation

**What:** Each agent is dispatched one at a time via the Agent tool. After each dispatch, the orchestrator checks that the expected output file exists before proceeding.

**When to use:** Always -- this is the only reliable dispatch pattern given the parallel Agent tool bug.

**Key mechanics:**
1. Dispatch agent with explicit instructions including input file path(s) and output file path
2. Agent completes and returns
3. Orchestrator checks output file exists (file-based validation per user decision)
4. Proceed to next agent or handle failure

**Agent invocation pattern:**
```
Use the extractor agent to:
- Read the problem from: {workspace}/problem-raw.md
- Write extracted problem to: {workspace}/problem.md
- Follow workspace-format.md templates
```

### Pattern 3: Multi-Round Hypothesis Loop

**What:** The orchestrator implements a loop structure within the skill instructions: dispatch perspectives, verify each, synthesize, check convergence, repeat if needed.

**When to use:** Core pipeline pattern, runs for up to 3 rounds.

**Loop structure:**
```
Round 1:
  1. Generate 3 perspectives (orchestrator writes perspective assignments inline)
  2. For each perspective: dispatch hypothesizer agent
  3. For each perspective: dispatch verifier agent
  4. Read verification files, extract pass rates
  5. Dispatch synthesizer agent
  6. Dispatch verifier on synthesized solution
  7. Read convergence verification -- if ALL pass, break

Round 2+ (if needed):
  1. Orchestrator performs gap analysis (or dispatches improver-dispatcher)
  2. Generate targeted perspectives based on failures
  3. Repeat steps 2-7 from Round 1
```

### Pattern 4: Perspective Generation in Orchestrator

**What:** For Round 1, the orchestrator itself generates the perspective assignments rather than dispatching a separate perspective-dispatcher agent. This saves a subagent round-trip and keeps the orchestrator in control.

**When to use:** Round 1 perspective generation (the problem data is small enough for inline analysis).

**Rationale:** The perspective-dispatcher in the Mastra pipeline is a Gemini 3 Flash agent that analyzes the problem and produces perspectives. In Claude Code, the main session (Opus 4.6) is more capable and already has the problem context. Generating perspectives inline avoids an unnecessary subagent dispatch.

**For Round 2+:** The orchestrator should also handle gap analysis inline, since it has the verification results and current state in context. It reads the verification files, identifies failures, and generates targeted perspective assignments for the next round's hypothesizers.

### Anti-Patterns to Avoid

- **`context: fork` for orchestrator:** Forked skills run as subagents. Subagents cannot spawn subagents. This breaks the entire pattern.
- **Parallel Agent dispatch:** Bugged -- model emits only 1 of N intended calls (issues #22508, #29181). Must use sequential dispatch.
- **Deep output parsing for validation:** User decided against it. Just check file existence, let the verifier catch content issues downstream.
- **Dispatching a perspective-dispatcher subagent:** Unnecessary round-trip. The main session (Opus) can generate perspectives inline.
- **Relying on agent return values for state:** Agents communicate via files, not return values. The orchestrator reads files to get results.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slash command entry point | Custom CLI or script | SKILL.md with `disable-model-invocation: true` | Native Claude Code skill system, already has shell in place |
| Subagent dispatch | Custom process spawning | Agent tool (built-in) | Native Claude Code mechanism, handles context isolation |
| Workspace directory creation | Complex tooling | Simple `mkdir -p` via Bash in skill instructions | Workspace structure is just directories and files |
| Agent result communication | Message passing, return values, queues | File-based handoff (read/write workspace files) | Established pattern; agents already designed for it |
| Perspective generation | Separate perspective-dispatcher subagent | Inline generation by orchestrator (Opus) | Main session is more capable; saves a subagent round-trip |

**Key insight:** The entire orchestration is procedural instructions in a SKILL.md file. There is no framework to install, no code to write (beyond markdown), and no infrastructure to set up. Claude Code's skill system IS the orchestration framework.

## Common Pitfalls

### Pitfall 1: Using context: fork on the orchestrator skill
**What goes wrong:** The skill runs as a subagent, which cannot dispatch further subagents. All Agent tool calls fail silently or are unavailable.
**Why it happens:** `context: fork` seems logical for isolation, but Claude Code explicitly prohibits subagents from spawning subagents.
**How to avoid:** Do NOT set `context: fork` in the solve SKILL.md. The skill must run inline in the main conversation.
**Warning signs:** Agent tool calls fail or are not available to the skill.

### Pitfall 2: Attempting parallel Agent dispatch
**What goes wrong:** Model states intent to dispatch N agents in parallel but only emits 1 Agent tool call. The other N-1 results may be hallucinated.
**Why it happens:** Known Claude Code bug (issues #22508, #29181, still open as of Feb 2026).
**How to avoid:** Always dispatch agents sequentially, one at a time. Never instruct the orchestrator to "dispatch these in parallel."
**Warning signs:** Only 1 of N expected agents actually runs; suspiciously fast completion of "parallel" tasks.

### Pitfall 3: Over-specifying agent instructions in dispatch
**What goes wrong:** The orchestrator writes a very long prompt for each agent dispatch, consuming main conversation context unnecessarily. The agent's own system prompt (from its .md file) already contains all the domain logic.
**Why it happens:** Treating the agent dispatch like a raw LLM call rather than leveraging the agent's built-in instructions.
**How to avoid:** Keep dispatch instructions minimal: specify input file path(s), output file path, perspective assignment (for hypothesizer), and round/perspective number. The agent's own system prompt handles everything else.
**Warning signs:** Agent dispatch prompts exceeding 500 words; duplicating instructions from agent .md files.

### Pitfall 4: Not handling the workspace path correctly
**What goes wrong:** Agents write files to wrong locations, orchestrator can't find output files, file paths contain spaces or special characters.
**Why it happens:** Inconsistent path construction between orchestrator and agents.
**How to avoid:** The orchestrator creates the workspace directory and passes absolute paths to every agent. Use a consistent naming convention (e.g., `workspace/2026-03-08_14-30-00/`). Store the workspace path in a variable early and reference it throughout.
**Warning signs:** "File not found" errors after agent dispatch; files appearing in unexpected locations.

### Pitfall 5: Losing context across the multi-round loop
**What goes wrong:** By round 2-3, the main conversation context is large and the orchestrator loses track of which perspectives were already tried, which round it's on, or what the previous verification results were.
**Why it happens:** Claude Code's context window fills up with subagent results and file contents.
**How to avoid:** Keep subagent results concise. Don't read entire verification files into context -- instead read just the summary section. Track round number and perspective names as a brief status list. The workspace directory structure itself serves as state.
**Warning signs:** Orchestrator re-dispatching perspectives that were already tried; losing track of round number.

### Pitfall 6: Forgetting that Phase 23 handles verify-improve and answer
**What goes wrong:** Phase 22 orchestrator tries to implement the verify-improve iteration loop and answer step, which are Phase 23's scope.
**Why it happens:** The full pipeline is tempting to implement at once.
**How to avoid:** Phase 22 implements: input handling, workspace creation, extraction, multi-perspective hypothesis loop (hypothesis + verification + synthesis), and convergence checking. Phase 23 adds: the dedicated verify-improve iteration loop on the synthesized solution and the answer step. The SKILL.md should have clear markers (e.g., `[Phase 23]`) for sections to be filled in later.
**Warning signs:** Trying to dispatch the improver or answerer agents in Phase 22.

## Code Examples

### Example 1: SKILL.md Input Handling

```markdown
## Step 1: Get Problem Input

If $ARGUMENTS contains a file path:
  1. Read the file at the specified path using the Read tool
  2. Store the content as the raw problem text

If $ARGUMENTS is empty:
  1. Ask the user: "Please paste your Linguistics Olympiad problem text, or provide a file path (e.g., `/solve examples/problem.md`)"
  2. Wait for the user's response
  3. If the response looks like a file path (ends in .md or .txt, or starts with / or ./), read that file
  4. Otherwise, treat the response as inline problem text
```

### Example 2: Workspace Creation

```markdown
## Step 2: Create Workspace

1. Generate a timestamp: run `date +"%Y-%m-%d_%H-%M-%S"` via Bash
2. Create the workspace directory structure:
   ```bash
   WORKSPACE="claude-code/workspace/{timestamp}"
   mkdir -p "$WORKSPACE/hypotheses/round-1"
   ```
3. Write the raw problem text to `$WORKSPACE/problem-raw.md`
```

### Example 3: Agent Dispatch (Extractor)

```markdown
## Step 3: Extract Problem Structure

Print: "Extracting problem structure..."

Use the extractor agent to parse the raw problem:
- Read the raw problem from: {workspace}/problem-raw.md
- Write the extracted problem to: {workspace}/problem.md
- If extraction fails, the extractor will write an error section in problem.md and append to errors.md

After the extractor completes:
- Check that {workspace}/problem.md exists
- If it does not exist, abort with error: "Extraction failed -- no problem.md produced"
```

### Example 4: Sequential Hypothesizer Dispatch

```markdown
## Step 4b: Dispatch Hypothesizers (Round {N})

For each perspective (sequentially):

Print: "Generating perspective {P} of {total}: {perspective_name}..."

Use the hypothesizer agent to analyze the problem from perspective {P}:
- Read the problem from: {workspace}/problem.md
- Assigned perspective: {perspective_name} -- {perspective_description}
- Round: {N}, Perspective: {P}
- Write output to: {workspace}/hypotheses/round-{N}/perspective-{P}.md
- [If Round 2+] Read baseline rules and vocabulary from: {workspace}/solution.md

After the hypothesizer completes:
- Check that {workspace}/hypotheses/round-{N}/perspective-{P}.md exists
- If it does not exist:
  - If this is the first retry: retry once
  - If retry also fails: print "Perspective {P} failed -- continuing with remaining perspectives"
  - Append error to {workspace}/errors.md
```

### Example 5: Convergence Check

```markdown
## Step 4e: Check Convergence

Read the verification summary from {workspace}/verification.md.
Look for the "## Summary" section and check the pass rate.

If pass rate is 100% (all rules pass, all sentences pass):
  Print: "Converged! All rules pass verification."
  Proceed to [Phase 23: Answer step]

If not converged and round < 3:
  Print: "Round {N} pass rate: {rate}%. Starting round {N+1}..."
  Continue to next round

If not converged and round = 3:
  Print: "Maximum rounds reached. Using best result (pass rate: {rate}%)."
  Proceed to [Phase 23: Answer step]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Task tool | Agent tool | Claude Code v2.1.63 | Same functionality, renamed. `Task(...)` still works as alias |
| No subagent nesting | Still no nesting | Always | Hard constraint -- orchestrator must run inline |
| Parallel Agent dispatch | Sequential dispatch (bug workaround) | Issues #22508, #29181 (Feb 2026) | Must dispatch agents one at a time |
| Agent Teams | Still experimental/beta | 2026 | Not reliable enough for production orchestration |

**Deprecated/outdated:**
- `Task` tool name: Renamed to `Agent` in v2.1.63, but `Task(...)` references still work as aliases
- Parallel Task/Agent dispatch: Bugged since at least v2.1.29, not yet fixed

## Open Questions

1. **Perspective generation in orchestrator vs subagent**
   - What we know: The Mastra pipeline uses a dedicated perspective-dispatcher agent. In Claude Code, the main session is Opus 4.6, which is more capable.
   - What's unclear: Whether Opus can reliably generate good linguistic perspectives inline without a specialized prompt.
   - Recommendation: Generate perspectives inline (orchestrator has problem context and is more capable). If quality is poor, a follow-up phase can add a perspective-dispatcher agent.

2. **Improver-dispatcher for Round 2+**
   - What we know: Round 2+ needs gap analysis to generate targeted perspectives. The orchestrator has all verification results in context.
   - What's unclear: How complex the gap analysis logic needs to be for the orchestrator to handle it inline.
   - Recommendation: Handle inline initially. The orchestrator reads verification files and identifies failed rules/sentences, then generates targeted perspectives. This avoids an extra subagent dispatch.

3. **Pass rate extraction from verification files**
   - What we know: Verification files are markdown with a `## Summary` section containing rule/sentence counts and pass rate.
   - What's unclear: Exact parsing reliability of reading pass rates from markdown files.
   - Recommendation: Verifier agent writes a clear summary section per the workspace-format.md template. Orchestrator reads the summary section and extracts the pass rate. Format is well-defined enough for reliable extraction.

4. **Context window pressure in multi-round loop**
   - What we know: Each round adds subagent dispatch context. By round 3, the main conversation may be large.
   - What's unclear: Whether 3 rounds of 3 perspectives each (9 hypothesizer + 9 verifier + 3 synthesizer + 3 convergence = 24 subagent dispatches) will exhaust the context window.
   - Recommendation: Keep dispatch instructions minimal. Don't read full file contents into the main context -- let agents read files themselves. Auto-compaction is available if needed. The orchestrator should only read verification summary sections (not full reports).

## Sources

### Primary (HIGH confidence)
- Claude Code official docs: [Skills](https://code.claude.com/docs/en/skills) -- skill configuration, frontmatter fields, `$ARGUMENTS`, `context: fork`, `disable-model-invocation`
- Claude Code official docs: [Subagents](https://code.claude.com/docs/en/sub-agents) -- Agent tool, dispatch patterns, "subagents cannot spawn other subagents", built-in agents, configuration
- Existing codebase: `claude-code/.claude/skills/solve/SKILL.md` -- skill shell already in place
- Existing codebase: `claude-code/.claude/agents/*.md` -- 6 agent definitions from Phase 21
- Existing codebase: `claude-code/references/workspace-format.md` -- file format templates
- Existing codebase: `claude-code/PIPELINE.md` -- full pipeline reference
- Existing codebase: `claude-code/CLAUDE.md` -- project conventions

### Secondary (MEDIUM confidence)
- GitHub issue [#22508](https://github.com/anthropics/claude-code/issues/22508) -- parallel Agent tool bug (still open, Feb 2026)
- GitHub issue [#29181](https://github.com/anthropics/claude-code/issues/29181) -- parallel Agent tool bug duplicate (closed as dup of #22508)
- Claude Code docs note on Agent tool rename: v2.1.63, `Task(...)` aliases still work

### Tertiary (LOW confidence)
- Community patterns for sequential dispatch from [claudefa.st](https://claudefa.st/blog/guide/agents/sub-agent-best-practices) -- general best practices, verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- using only native Claude Code features (skills, agents, file I/O), all well-documented
- Architecture: HIGH -- inline skill dispatching sequential agents is the documented pattern; constraints (no nesting, no parallel) are well-understood
- Pitfalls: HIGH -- parallel dispatch bug is verified via GitHub issues; `context: fork` limitation is stated in official docs

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- core Claude Code skill/agent architecture is unlikely to change rapidly)
