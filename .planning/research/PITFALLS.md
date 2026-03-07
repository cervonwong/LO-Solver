# Pitfalls Research

**Domain:** Claude Code native multi-agent solver workflow (converting Mastra orchestration to Claude Code subagents)
**Researched:** 2026-03-07
**Confidence:** HIGH (verified against official Claude Code docs, GitHub issues, and GSD workflow patterns)

## Critical Pitfalls

### Pitfall 1: Parallel Task Tool Calls Silently Emit Only 1 of N

**What goes wrong:**
When the orchestrator tries to spawn multiple subagents in parallel (e.g., 3 parallel hypothesizers), Claude Code may emit only 1 of the intended N Task tool calls. The model writes text suggesting it is launching 3 agents, but only 1 actually executes. The "results" for the other 2 are hallucinated -- plausible-looking but fabricated output that was never computed. This is a confirmed open bug (issues #22508, #29181) affecting Opus 4.6 on Claude Code. The problem worsens on subsequent attempts within the same conversation.

**Why it happens:**
The root cause is unclear (model-side vs client-side), but the symptom is that the model's stop_reason is `null` on messages that should contain multiple parallel tool calls. The tool call emission pipeline appears to truncate after the first Task call. This is not a prompt engineering problem -- it is a platform bug in how parallel Task tool use is dispatched.

**How to avoid:**
1. Do NOT rely on the model spontaneously emitting multiple parallel Task calls in a single message. Instead, have the orchestrator explicitly spawn subagents one at a time in a sequential loop, collecting each result before spawning the next.
2. Alternatively, use explicit sequential dispatch with file-based output: spawn agent 1, wait for its file output, spawn agent 2, etc. The GSD workflow's `execute-phase.md` uses exactly this pattern -- it spawns one Task per plan and waits for completion before checking results.
3. If parallelism is essential, use Claude Code Agent Teams (experimental) which coordinate across separate sessions, bypassing the single-message parallel Task limitation.
4. For the LO-Solver specifically: the multi-perspective hypothesis step currently runs 3 parallel hypothesizers. Convert to sequential dispatch (hypothesizer 1 -> collect -> hypothesizer 2 -> collect -> hypothesizer 3 -> collect -> compare results). Accept the latency cost in exchange for correctness.

**Warning signs:**
- The orchestrator says "spawning 3 agents" but only one subagent viewer appears in Ctrl+O
- Results from "parallel" agents arrive instantly (they were hallucinated, not computed)
- Results for different perspectives are suspiciously similar or share the same vocabulary entries
- The orchestrator's response mentions results from agents that never wrote any output files

**Phase to address:**
Phase 1 (Orchestrator skeleton) -- the dispatch model (sequential vs parallel) is an architectural decision that must be locked in before writing subagent definitions.

---

### Pitfall 2: Subagents Cannot Spawn Subagents (No Nesting)

**What goes wrong:**
The current Mastra workflow has a deep call chain: Orchestrator -> Step 2 (multi-perspective) -> Dispatcher Agent -> N Hypothesizer Agents -> (each uses) Rule Tester Tool -> (which calls) Rule Tester Agent. If this hierarchy is naively translated to Claude Code subagents, the hypothesizer subagent would need to spawn a rule-tester subagent. This fails silently -- subagents do not have access to the Task tool and cannot spawn other subagents. The hypothesizer would either skip testing entirely or hallucinate test results.

**Why it happens:**
Claude Code enforces a single level of delegation by design. The Task tool is only available to the main conversation (or the main agent in `--agent` mode). Subagents receive a filtered tool set that excludes Task. This is documented in the official Claude Code subagent docs: "Subagents cannot spawn other subagents."

**How to avoid:**
1. Flatten the agent hierarchy to one level. The orchestrator (main conversation) must be the only entity that spawns subagents. The verify/improve loop must be orchestrated by the main agent, not delegated to a verifier subagent that in turn spawns testers.
2. Structure as: Orchestrator -> [Extractor Subagent] -> Orchestrator -> [Hypothesizer Subagent 1] -> Orchestrator -> [Hypothesizer Subagent 2] -> ... -> Orchestrator -> [Verifier Subagent] -> Orchestrator (evaluates results, decides if another improve round is needed) -> [Improver Subagent] -> repeat.
3. Any operation that currently uses "tool calls within agent calls" (like the verifier orchestrator calling rule-tester tools) must be folded into a single subagent's system prompt with explicit instructions to perform the testing internally, or the testing logic must be moved to the orchestrator level.

**Warning signs:**
- A subagent's system prompt instructs it to "spawn" or "delegate to" another agent
- A subagent references the Task tool in its instructions
- Test results appear in a subagent's output without corresponding file I/O evidence that testing actually occurred

**Phase to address:**
Phase 1 (Orchestrator skeleton) -- the flat hierarchy constraint shapes the entire architecture.

---

### Pitfall 3: Subagent Return Values Are Unstructured Text, Not Typed Data

**What goes wrong:**
In the Mastra workflow, agents return structured Zod-validated objects (e.g., `structuredProblemDataSchema`, `dispatcherOutputSchema`). Data flows through typed schemas between steps. In Claude Code, a subagent returns free-form text to the orchestrator. If the orchestrator expects JSON and the subagent returns markdown, or if the subagent wraps JSON in a code fence, or if the subagent adds commentary before/after the JSON, parsing fails. The orchestrator cannot use Zod validation on subagent returns because there is no structured output enforcement in the Task tool.

**Why it happens:**
Claude Code subagents communicate via natural language text. There is no schema enforcement, no structured output mode, and no JSON-mode for the Task tool return. The Claude API supports structured outputs (tool_use with JSON schema), but the Task tool in Claude Code does not expose this capability to subagent returns.

**How to avoid:**
1. Use file-based data passing instead of relying on return text. Each subagent writes its output to a designated JSON file (e.g., `claude-code/workspace/extraction-result.json`). The orchestrator reads the file after the subagent completes. This is the GSD pattern: subagents write SUMMARY.md files, and the orchestrator reads them after completion.
2. Include explicit formatting instructions in each subagent's system prompt: "Write your complete output to `{output_file}` as valid JSON matching this schema: {...}. Do not include any text before or after the JSON. Do not wrap in code fences."
3. Add defensive parsing in the orchestrator: try JSON.parse on the file contents, and if it fails, try extracting JSON from code fences, then try extracting from the first `{` to the last `}`.
4. For the LO-Solver: define a workspace directory (`claude-code/workspace/`) with a naming convention for intermediate files: `01-extraction.json`, `02-perspective-1.json`, `02-perspective-2.json`, etc.

**Warning signs:**
- The orchestrator says "parsing the extraction result" and then produces garbled or missing data
- A subagent's output file contains markdown commentary mixed with JSON
- The orchestrator skips a step because it couldn't parse the previous step's output
- Rule or vocabulary data is partially lost between steps

**Phase to address:**
Phase 1 (Orchestrator skeleton) -- the data-passing contract (file paths, naming, format) must be defined before writing any subagent.

---

### Pitfall 4: Context Window Exhaustion in the Orchestrator

**What goes wrong:**
The orchestrator (main conversation) accumulates context from every subagent's return text. With 4 solver steps, each returning substantial output (extracted problem data, multiple hypothesis sets with rules and vocabulary, verification results, final answers), the orchestrator's 200K token context window fills up. Performance degrades around 147K-152K tokens due to the lost-in-the-middle problem. By the time the verify/improve loop runs its 3rd or 4th iteration, the orchestrator has lost critical context from earlier steps, leading to degraded decision-making about whether to continue iterating.

**Why it happens:**
Each subagent's return text is injected into the orchestrator's conversation. The orchestrator also has ~30-40K tokens of system prompt, tool definitions, and environment context loaded before any work begins. With 4 main steps plus up to 4 verify/improve iterations, the conversation grows rapidly. Unlike Mastra (which uses RequestContext -- a separate mutable state store), Claude Code has no out-of-band state mechanism.

**How to avoid:**
1. Keep subagent returns minimal. Subagents write full results to files, but return only a brief summary to the orchestrator (e.g., "Extraction complete. 12 dataset pairs, 4 questions. Results in claude-code/workspace/01-extraction.json").
2. Use the file system as the shared state store. Each subagent reads its inputs from files and writes its outputs to files. The orchestrator only needs to know file paths and pass/fail status.
3. Run `/compact` between major phases if the orchestrator detects high context usage.
4. Design the verify/improve loop to be self-contained: the verifier subagent reads rules from a file, tests them, writes results to a file. The orchestrator only reads the pass/fail summary, not the full verification trace.

**Warning signs:**
- The orchestrator starts "forgetting" the problem statement or earlier extraction results
- Verify/improve iterations produce worse results than earlier iterations
- The orchestrator's responses become shorter or less coherent in later steps
- Auto-compaction triggers during the workflow, losing critical context

**Phase to address:**
Phase 1 (Orchestrator skeleton) -- context management strategy must be baked into the architecture from the start.

---

### Pitfall 5: The classifyHandoffIfNeeded Bug Causes False Failures

**What goes wrong:**
Every Task tool subagent reports "failed" even when all work completes successfully. The error message is `classifyHandoffIfNeeded is not defined`. This fires 100% of the time across all sessions, all platforms, and all agent types. It has been an open bug since at least Claude Code v2.1.27 (issues #22087, #22312, #22544, #22567, #22573, #23307, #24181). The error occurs in the completion handler AFTER all tool calls finish, so the actual work is always done. But if the orchestrator naively treats "failed" as an actual failure, it will abort the workflow or retry work that already completed.

**Why it happens:**
A function `classifyHandoffIfNeeded` is referenced in Claude Code's agent completion/handoff code path but was never defined or imported in the bundled `cli.js`. This is a Claude Code runtime bug, not a user error. Built-in agents (Explore, Plan) are also affected.

**How to avoid:**
1. The orchestrator MUST implement spot-check logic for every subagent completion. When a Task reports "failed" with error containing "classifyHandoffIfNeeded", do NOT treat it as a failure. Instead:
   - Check that the expected output file exists on disk
   - Check that the file contains valid content (not empty, parseable)
   - If spot-checks pass, treat as successful and proceed
2. The GSD workflow (`execute-phase.md`) already implements this exact pattern. Copy it: check for SUMMARY.md existence, check for git commits, check for Self-Check marker.
3. For the LO-Solver: after each subagent completes, verify its output file exists and contains valid JSON before proceeding.

**Warning signs:**
- Every single subagent reports "failed" even though output files appear on disk
- The orchestrator enters an infinite retry loop because it keeps getting "failed" status
- The workflow aborts after the first step even though extraction completed successfully

**Phase to address:**
Phase 1 (Orchestrator skeleton) -- the spot-check pattern must be built into the orchestrator's subagent dispatch logic from day one.

---

### Pitfall 6: Verify/Improve Loop Lacks Stopping Criteria, Runs Indefinitely

**What goes wrong:**
The Mastra workflow has a hard-coded 4-iteration cap on the verify/improve loop. In a Claude Code native implementation, the orchestrator runs the loop by spawning verifier and improver subagents in sequence. Without explicit stopping criteria, the evaluator keeps finding minor issues and the improver keeps tweaking, but quality plateaus well before the loop stops. Each iteration consumes ~20-30K tokens of orchestrator context and ~5-10 minutes of wall time. Without a cap, the workflow burns through context and money.

**Why it happens:**
In a framework-based workflow, iteration limits are enforced by code (`for (let i = 0; i < MAX_ITERATIONS; i++)`). In a prompt-based orchestrator, the iteration count is a natural language instruction that the model may or may not respect, especially as context grows and earlier instructions are pushed out of the attention window.

**How to avoid:**
1. Track iteration count in a file (e.g., `claude-code/workspace/verify-improve-state.json` with `{ "iteration": 2, "maxIterations": 4 }`). The orchestrator reads this file before each iteration and increments it after.
2. Define explicit pass/fail thresholds: "If 80% or more rules pass verification, accept the result. If fewer than 50% pass after 4 iterations, output partial results with a warning."
3. Include the iteration count in every verifier and improver prompt: "This is iteration 3 of 4. Focus on the most impactful remaining failures."
4. Use the state file as the source of truth, not the orchestrator's memory of how many iterations have run.

**Warning signs:**
- The workflow runs for 30+ minutes on a problem that should take 10-15
- The orchestrator says "running one more iteration" for the 6th time
- Rules that were passing in iteration 2 start failing in iteration 4 (regression from over-optimization)
- Context auto-compaction triggers during the verify/improve loop

**Phase to address:**
Phase 3 (Verify/Improve loop) -- must be designed with explicit state tracking from the start.

---

### Pitfall 7: Subagent System Prompts Are Thin -- No Claude Code System Prompt Inheritance

**What goes wrong:**
Subagents receive ONLY their custom system prompt plus basic environment details (working directory). They do NOT receive the full Claude Code system prompt, CLAUDE.md contents, or any parent conversation context. A subagent definition that says "follow the patterns in CLAUDE.md" or "use the conventions described in the project" will fail because the subagent has no access to that information. If the extraction subagent's prompt says "parse the problem into structured form" without specifying the exact output format, the subagent has no reference for what "structured form" means.

**Why it happens:**
This is by design for context efficiency -- each subagent gets a fresh 200K context window with only its own system prompt. But developers coming from framework-based workflows (where shared schemas and type definitions are imported) forget that subagents have no implicit shared context.

**How to avoid:**
1. Each subagent's system prompt (the markdown body of the agent definition file) must be FULLY self-contained. Include the complete output schema inline, not by reference. Include all formatting rules, not "follow project conventions."
2. Use the `skills` field in subagent frontmatter to inject relevant skill content. But note: this adds to context consumption.
3. For the LO-Solver: each subagent's `.md` file should include a complete specification of its input format, output format, and expected behavior. Do not rely on the subagent "knowing" what a Rule or VocabularyEntry looks like.
4. Include example input/output in the system prompt if the format is complex.

**Warning signs:**
- A subagent produces output in a different format than the orchestrator expects
- A subagent ignores project conventions (e.g., naming patterns, file structure)
- A subagent asks "what format should I use?" in its return text
- Different subagents produce inconsistent schemas for the same data type

**Phase to address:**
Phase 2 (Subagent definitions) -- each subagent's prompt must be comprehensive and self-contained.

---

### Pitfall 8: File I/O Race Conditions When Multiple Subagents Write to the Same Directory

**What goes wrong:**
If two subagents run concurrently (despite Pitfall 1, Claude Code may still dispatch some work in parallel via background mode), they can write to overlapping files or read files that another subagent is mid-write. The workspace directory becomes corrupted -- partial JSON files, interleaved writes, or one subagent overwriting another's output.

**Why it happens:**
Claude Code subagents share the same filesystem and working directory. There is no file locking, no transaction mechanism, and no isolation between concurrent subagents. Even sequential subagents can collide if the orchestrator spawns the next one before the previous one's file writes have flushed.

**How to avoid:**
1. Use distinct file paths for every subagent's output. Never have two subagents write to the same file. Convention: `{step}-{perspective}-{type}.json` (e.g., `02-morphological-rules.json`, `02-syntactic-rules.json`).
2. If using the `isolation: worktree` option, each subagent gets its own git worktree copy. But this is heavy and the worktree is cleaned up if no changes are made -- not suitable for read-then-write patterns.
3. Wait for each subagent to fully complete (Task tool blocks by default in foreground mode) before spawning the next one.
4. After each subagent completes, verify its output file exists and is valid before proceeding.

**Warning signs:**
- JSON parse errors on files that should be well-formed
- Output files contain content from a different step's subagent
- Files are empty or truncated
- The orchestrator reads stale data from a previous run

**Phase to address:**
Phase 1 (Orchestrator skeleton) -- file naming conventions and write isolation must be established before any subagent writes files.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Embedding full schemas in every subagent prompt | Self-contained subagents | Schema changes require updating N subagent files | Always -- until a shared skill is created with schema definitions that subagents can load via `skills:` field |
| Hardcoding file paths in subagent prompts | Simple, no path resolution needed | Path changes require updating all subagent definitions | Acceptable for v1.4 where the solver is a standalone feature |
| Sequential subagent dispatch instead of parallel | Avoids parallel Task tool bug | 3x slower for multi-perspective hypothesis | Always for v1.4 -- correctness over speed. Parallel can be added when the platform bug is fixed. |
| Using untyped JSON files instead of schema-validated files | No build step, no type generation | Silent data corruption if schema drifts | Acceptable for v1.4 as a proof-of-concept. Add validation in a later milestone. |
| Orchestrator reads entire output files instead of summaries | Simpler implementation | Context window fills faster | Only for small problems. Must switch to summary-only returns for production use. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code Task tool + expected "success" status | Treating Task result "failed" as an actual failure | Check for classifyHandoffIfNeeded error, then spot-check output files. Treat as success if files are valid. |
| Subagent system prompt + CLAUDE.md | Assuming subagent inherits CLAUDE.md content | Subagents get only their own system prompt. Include all relevant instructions inline or via `skills:` field. |
| Subagent + structured data output | Expecting subagent to return valid JSON in its text response | Have subagents write JSON to files. Read files from orchestrator. Never parse return text as structured data. |
| Orchestrator + verify/improve loop state | Tracking iteration count in the orchestrator's memory | Use a state file (`verify-improve-state.json`) as source of truth. Orchestrator reads/writes the file each iteration. |
| Multiple subagents + shared workspace | Having subagents write to overlapping file paths | Use unique file names per subagent per step. Never share output files between concurrent subagents. |
| Subagent + `maxTurns` | Not setting `maxTurns`, allowing a subagent to loop indefinitely on a hard problem | Set `maxTurns` appropriate to the task (e.g., 30 for extraction, 50 for hypothesis generation). Subagent stops and returns partial results at the limit. |
| GSD executor pattern + LO-Solver orchestrator | Trying to use GSD's `gsd-executor` agent type for solver subagents | Create dedicated solver subagent definitions in `.claude/agents/`. GSD agents are for project management, not domain-specific orchestration. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Orchestrator context bloat from subagent returns | Later steps produce lower-quality output, orchestrator "forgets" problem details | Subagents return 1-2 sentence summaries to orchestrator, write full data to files | After 3-4 subagent round-trips (~100K tokens consumed) |
| Unnecessary re-reading of large problem text | Each subagent re-reads the full problem from scratch, wasting tokens | Extract once, store as structured JSON, subsequent subagents read the extracted version | Not a performance cliff, but wastes ~2-5K tokens per subagent |
| Auto-compaction during verify/improve loop | Critical rules or vocabulary dropped from orchestrator memory mid-loop | Keep loop state in files, minimize orchestrator context, run `/compact` between major phases (not mid-loop) | When orchestrator context exceeds ~150K tokens |
| Spawning heavyweight subagents for lightweight tasks | A simple "check if iteration count < 4" takes 30 seconds because a full subagent spins up | Keep control flow decisions in the orchestrator. Only spawn subagents for substantive LLM work (extraction, hypothesis, verification). | Immediately -- every subagent has ~20K tokens of startup overhead |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Subagent with `bypassPermissions` and Bash access | Subagent could execute arbitrary commands without approval | Use `permissionMode: default` or `acceptEdits`. Only grant Bash if needed and with PreToolUse validation hooks. |
| Writing problem data with sensitive content to unprotected workspace files | Problem data could contain real linguistic examples that are copyrighted | Store workspace files in a gitignored directory (`claude-code/workspace/` added to `.gitignore`) |
| Subagent writing to project source files | A misconfigured subagent could modify `src/` or `.planning/` files | Use `disallowedTools: Write, Edit` for subagents that should only produce output files, or restrict to specific paths via hooks |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress visibility during subagent execution | User sees nothing for minutes while a subagent works silently | Have the orchestrator print status messages between subagent dispatches: "Step 1/4: Extracting problem structure..." |
| Outputting raw JSON to terminal | Unreadable wall of text when results are displayed | Format final results as markdown with clear sections: Questions, Answers, Rules Used, Confidence |
| Not saving intermediate results | If the workflow fails at step 3, all step 1-2 work is lost | Write intermediate results to files at each step. User can inspect partial results or restart from a checkpoint. |
| Hiding the verify/improve loop from the user | User does not know if rules are improving or stagnating | Print a summary after each iteration: "Iteration 2/4: 15/20 rules passing (up from 12/20)" |

## "Looks Done But Isn't" Checklist

- [ ] **Orchestrator dispatch:** Verify that ALL subagent results come from actual subagent execution (check output files exist) -- not hallucinated by the orchestrator
- [ ] **Schema consistency:** After each subagent writes its output file, verify the JSON parses successfully and contains the expected top-level keys
- [ ] **Iteration cap:** Run the verify/improve loop on a hard problem and verify it stops at exactly 4 iterations, not 3 or 5
- [ ] **Context health:** After a full workflow run, check that the orchestrator can still accurately describe the original problem (context not lost to compaction)
- [ ] **File cleanup:** After a workflow run, verify that workspace files from a PREVIOUS run do not contaminate the current run -- stale files must be cleared at startup
- [ ] **Subagent independence:** Each subagent should produce the same output regardless of what order other subagents ran -- test by running steps out of order
- [ ] **Error recovery:** Simulate a subagent failure (e.g., truncated output file) and verify the orchestrator reports the error clearly rather than hallucinating results

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Parallel Task tool only emits 1 of N | LOW | Switch to sequential dispatch. No architectural change needed, just run subagents one at a time. |
| Nested subagent fails silently | MEDIUM | Flatten the hierarchy. Requires restructuring the orchestrator to handle verify/improve loop directly instead of delegating to a verifier sub-orchestrator. |
| Unstructured return text breaks parsing | LOW | Switch to file-based data passing. Each subagent writes a JSON file, orchestrator reads the file. |
| Context window exhaustion | MEDIUM | Reduce return text to summaries. Add `/compact` calls between major phases. Restructure prompts to be more concise. May require rewriting subagent definitions. |
| classifyHandoffIfNeeded false failures | LOW | Add spot-check logic (file existence + valid JSON check) after every Task tool call. Copy the pattern from GSD's execute-phase.md. |
| Verify/improve loop runs too long | LOW | Add state file with iteration counter and max. Orchestrator reads before each iteration. |
| Subagent produces wrong output format | LOW | Update subagent system prompt with explicit schema and examples. No architectural change. |
| File I/O race condition | LOW | Ensure sequential dispatch. Use unique file names per subagent. Add file existence verification after each subagent. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Parallel Task tool bug (#1) | Phase 1: Orchestrator skeleton | Sequential dispatch produces correct results for all perspectives |
| No nested subagents (#2) | Phase 1: Orchestrator skeleton | Architecture diagram shows single level of delegation only |
| Unstructured return values (#3) | Phase 1: Orchestrator skeleton | Output file naming convention documented, all files parseable as valid JSON |
| Context window exhaustion (#4) | Phase 1: Orchestrator skeleton | Full workflow run completes without auto-compaction triggering |
| classifyHandoffIfNeeded bug (#5) | Phase 1: Orchestrator skeleton | Orchestrator correctly proceeds after every "failed" Task result |
| Verify/improve loop no cap (#6) | Phase 3: Verify/Improve loop | Loop stops at exactly MAX_ITERATIONS, state file shows correct count |
| Thin subagent prompts (#7) | Phase 2: Subagent definitions | Each subagent produces output matching the expected schema without referencing external files for format guidance |
| File I/O race conditions (#8) | Phase 1: Orchestrator skeleton | No file naming collisions across all subagent outputs in a full run |

## Sources

- [Claude Code official subagent documentation](https://code.claude.com/docs/en/sub-agents) -- HIGH confidence, official docs
- [GitHub issue #29181: Model emits only 1 Task tool call per message](https://github.com/anthropics/claude-code/issues/29181) -- HIGH confidence, confirmed bug
- [GitHub issue #22508: Parallel Task calls, Claude states intent for 16 but only emits 1](https://github.com/anthropics/claude-code/issues/22508) -- HIGH confidence, confirmed bug
- [GitHub issue #24181: Task tool agents always report "failed" -- classifyHandoffIfNeeded](https://github.com/anthropics/claude-code/issues/24181) -- HIGH confidence, confirmed bug, 100% reproduction rate
- [GitHub issue #22087: classifyHandoffIfNeeded SubagentStop hook failure](https://github.com/anthropics/claude-code/issues/22087) -- HIGH confidence, confirmed bug
- [Claude Code context window management guide](https://www.morphllm.com/claude-code-context-window) -- MEDIUM confidence, third-party but well-sourced
- [Claude Code sub-agents: parallel vs sequential patterns](https://claudefa.st/blog/guide/agents/sub-agent-best-practices) -- MEDIUM confidence, third-party best practices
- [GSD execute-phase.md workflow](/.claude/get-shit-done/workflows/execute-phase.md) -- HIGH confidence, proven in-repo pattern for subagent orchestration with spot-check logic
- [GSD execute-plan.md workflow](/.claude/get-shit-done/workflows/execute-plan.md) -- HIGH confidence, proven pattern for file-based state passing and subagent dispatch
- Codebase analysis of existing Mastra workflow (`src/mastra/workflow/`) -- HIGH confidence, direct source reading

---
*Pitfalls research for: LO-Solver v1.4 Claude Code Native Solver*
*Researched: 2026-03-07*
