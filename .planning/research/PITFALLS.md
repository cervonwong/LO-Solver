# Pitfalls Research

**Domain:** Adding Claude Code as alternative model provider to existing Mastra/AI SDK workflow app
**Researched:** 2026-03-10
**Confidence:** HIGH (primary findings from official docs, verified GitHub issues, and codebase analysis)

## Critical Pitfalls

### Pitfall 1: AI SDK Custom Tools Are Not Supported by Claude Code Provider

**What goes wrong:**
The `ai-sdk-provider-claude-code` does not support AI SDK custom tools -- Zod-schema tools passed to `generateText`/`streamText` via the `tools` option are silently ignored. The AI SDK docs page for this provider explicitly marks "Tool Usage" and "Tool Streaming" as unsupported across all models (Opus, Sonnet, Haiku). This means the 10 Mastra tools currently used in the workflow (5 vocabulary CRUD tools, 3 rules CRUD tools, rule tester tool, sentence tester tool) will not work when switching the model provider from OpenRouter to Claude Code. The agents that depend on tool calls (verifier orchestrator, hypothesizers, improvers) will produce text-only responses instead of executing tool calls, breaking the entire verify/improve loop.

**Why it happens:**
The Claude Code provider wraps the Claude Agent SDK `query()` function, which operates Claude as an autonomous agent with its own built-in tools (Bash, Read, Write, Edit, etc.) and MCP-server tools. The AI SDK's tool abstraction (`tool()` with Zod schemas, `maxSteps` for multi-step execution) operates at a different level -- the provider translates prompts into `query()` calls but has no mechanism to inject AI SDK tool definitions into the Claude Agent SDK's tool execution layer.

**How to avoid:**
Bridge custom tools via MCP. The Claude Agent SDK supports custom tools through in-process MCP servers (`createSdkMcpServer` + `tool()` from `@anthropic-ai/claude-agent-sdk`). The Mastra vocabulary/rules/tester tools must be re-exposed as MCP tools that the Claude Code provider can discover and call. This requires:
1. Creating an in-process MCP server wrapping each Mastra tool
2. Passing the MCP server via the provider's `mcpServers` option
3. Adding tools to `allowedTools` using the `mcp__<server-name>__<tool-name>` naming pattern
4. Using streaming input mode (async generator for prompts) -- custom MCP tools require this

Alternatively, for agents that do NOT use tools (extractors, dispatchers, answerers), the Claude Code provider can work directly -- only tool-using agents need MCP bridging.

**Warning signs:**
- Agent responses contain prose descriptions of what they "would do" instead of actual tool calls
- `response.steps` array has length 1 (no multi-step tool execution)
- `response.toolCalls` is empty or undefined
- Tests pass for extraction/answering agents but fail for verifier/hypothesizer agents

**Phase to address:**
Phase 1 (provider integration) -- this is the blocking architectural decision that determines the entire integration approach. Must be resolved before any agent runs through the Claude Code provider.

---

### Pitfall 2: OAuth Token Refresh Race Condition With Concurrent Agent Calls

**What goes wrong:**
When multiple Claude Code agent calls run concurrently (or near-concurrently), they race on refreshing the single-use OAuth refresh token stored in `~/.claude/.credentials.json`. OAuth refresh tokens are single-use: the first process consumes the token server-side, and the second process receives a 404 `not_found_error` and loses authentication with no automatic recovery. The user must manually run `claude logout && claude login` to re-authenticate. This is a confirmed, documented bug (GitHub issues #27933 and #24317).

**Why it happens:**
The Claude CLI token manager performs a read-HTTP refresh-write cycle on `.credentials.json` with no file locking or inter-process coordination. When two processes read the same `refresh_token=T1`, the first redemption gets a new token T2 and writes it, but the second process tries the now-consumed T1 and gets a 404. OAuth tokens expire after 8-12 hours, so this race can occur during any workflow execution if tokens need refreshing.

**How to avoid:**
1. **Serialize all Claude Code provider calls** -- never run concurrent `query()` calls within the same workflow execution. The existing workflow already uses sequential agent dispatch (key decision in PROJECT.md: "Sequential agent dispatch, not parallel"), so this aligns. But ensure no parallelism leaks in (e.g., the multi-perspective hypothesizer loop currently dispatches perspectives sequentially, which is safe).
2. **Use `setup-token` for long-lived auth** -- `claude setup-token` creates a 1-year token designed for automated/headless workflows, avoiding the OAuth refresh cycle entirely. This is the recommended path for a server-side application.
3. **Single session reuse** -- use the provider's `sessionId` option to maintain a single session across calls, reducing token refresh frequency.

**Warning signs:**
- Intermittent 401/404 errors during workflow execution
- "Refresh token is invalid or expired" in logs from `token-manager` service
- Authentication failures that only occur when the workflow has multiple agent calls in sequence
- OAuth token expiry (8-12 hours) causing mid-workflow failures on long-running solves

**Phase to address:**
Phase 1 (provider integration) -- authentication strategy must be decided before the first end-to-end test. The `setup-token` approach should be the default for server-side usage.

---

### Pitfall 3: Structured Output Schema Silent Fallback to Prose

**What goes wrong:**
Some JSON Schema features cause the Claude Code CLI to silently fall back to prose generation (no `structured_output` in the response). The workflow uses `structuredOutput: { schema: ... }` extensively in extraction (Step 1), hypothesis extraction (Step 2), verification feedback extraction (Step 3a2), rules improvement extraction (Step 3b2), and question answering (Step 4). If the Zod schema generates JSON Schema features the provider does not support, agents return unstructured text instead of JSON, causing `schema.safeParse(response.object)` to fail with `response.object` being null/undefined.

The specific unsupported JSON Schema features that trigger this silent fallback are:
- `format` constraints (e.g., `email`, `uri`, `date-time`)
- Complex regex patterns with lookaheads/backreferences
- Potentially: `.catchall()` schemas -- used in `structuredProblemDataSchema` for variable dataset fields, which generates `additionalProperties` in JSON Schema

**Why it happens:**
The Claude Agent SDK's constrained decoding only supports a subset of JSON Schema. When it encounters unsupported features, it does not error -- it silently drops the `structured_output` constraint and returns free-form text. The provider emits an `unsupported-setting` warning, but this is easy to miss in logs.

**How to avoid:**
1. **Audit all Zod schemas** used with `structuredOutput` against the supported JSON Schema subset. The current schemas in `workflow-schemas.ts` use `.catchall()` (on `structuredProblemDataSchema`), `.nullable()`, `.optional()`, `.enum()`, and nested objects/arrays -- `.catchall()` is the highest-risk feature.
2. **Simplify generation schemas, validate strictly client-side** -- the official workaround from the provider docs. Generate with a simplified schema, then validate with the full schema in application code.
3. **Test each schema individually** before integrating -- run each `structuredOutput` schema through the Claude Code provider in isolation and verify `response.object` is not null.
4. **Listen for the `unsupported-setting` warning** emitted by the provider and surface it as an error rather than silently continuing.

**Warning signs:**
- `response.object` is null/undefined when using Claude Code provider but works with OpenRouter
- `response.text` contains JSON-like content but is not parsed as structured output
- Extraction steps bail with "Validation failed" errors only on Claude Code mode
- Provider logs contain `unsupported-setting` warnings

**Phase to address:**
Phase 2 (schema validation) -- after basic provider connectivity is established, but before full workflow integration. Every schema used with `structuredOutput` must be tested against the Claude Code provider.

---

### Pitfall 4: Cost Tracking Uses OpenRouter-Specific Provider Metadata Path

**What goes wrong:**
The current cost tracking code in `extractCostFromResult()` (at `request-context-helpers.ts:202`) reads cost data from `providerMetadata.openrouter.usage.cost` -- a path that is specific to the OpenRouter provider. The Claude Code provider (via the Claude Agent SDK) reports cost through a completely different mechanism: `total_cost_usd` on the result message and `modelUsage` per-model breakdowns on the result. When using the Claude Code provider, `extractCostFromResult()` will always return 0, and the $1-boundary cost update events will never fire, making the frontend cost display permanently show $0.00.

This function is called in every workflow step (01-extract, 02a-dispatch, 02b-hypothesize, 02c-verify, 02d-synthesize, 03-answer), so the bug affects the entire pipeline -- not just one agent call.

**Why it happens:**
The cost tracking was built for OpenRouter's specific metadata structure. The Claude Agent SDK provides cost data at a different level (per-`query()` call via the result message `total_cost_usd`, not per-step via `providerMetadata`). Additionally, Claude Code subscription usage is not billed per-token in the same way -- Pro/Max users pay a flat subscription, so "cost" has a different meaning (usage quota consumption vs. dollar amounts).

**How to avoid:**
1. **Create a provider-agnostic cost extraction interface** that abstracts over `extractCostFromResult()`. For OpenRouter: read `providerMetadata.openrouter.usage.cost`. For Claude Code: read from the SDK result message's `total_cost_usd` field.
2. **Decide what "cost" means for subscription users** -- Claude Code usage costs $0 in API terms (subscription covers it), but users still care about usage quota consumption. Consider displaying "tokens used" instead of "$X.XX" for Claude Code mode.
3. **Handle the case where cost is genuinely unavailable** -- the Claude Agent SDK's cost tracking is per-`query()` call, not per-AI-SDK-step. The AI SDK provider wrapper may not expose `total_cost_usd` through the same `providerMetadata` path at all.

**Warning signs:**
- Cost display stuck at $0.00 during Claude Code workflow execution
- No cost warning toasts firing even for long/expensive operations
- Cost tracking works fine for OpenRouter but silently returns 0 for Claude Code
- `updateCumulativeCost()` never emits `data-cost-update` events during Claude Code runs

**Phase to address:**
Phase 2 or Phase 3 -- after basic agent execution works. Can be deferred if cost display is not critical for initial Claude Code integration, but must be addressed before the feature is considered complete.

---

### Pitfall 5: Permission Mode Foot Guns in Server-Side Context

**What goes wrong:**
The Claude Agent SDK requires explicit permission handling for tool execution. In a server-side context (Next.js API route), there is no user to approve tool permissions interactively. Using `permissionMode: 'default'` causes the agent to hang waiting for user approval that never comes. Using `permissionMode: 'bypassPermissions'` grants full autonomous system access including file writes outside the project directory and arbitrary command execution via Bash. A documented bug (issue #29048) shows that even with `sandbox.filesystem.allowWrite` configured, the Write tool can create files outside the intended directory when `bypassPermissions` is active.

Additionally, `allowedTools` restrictions may be ignored when `bypassPermissions` is set (documented issue #14279), though `disallowedTools` works correctly in all modes. And when a parent agent uses `bypassPermissions`, all subagents unconditionally inherit this mode (issue #20264), creating privilege escalation concerns.

**Why it happens:**
The Claude Agent SDK was designed for interactive CLI use where a human approves each tool action. The permission model assumes interactive prompting. Server-side headless use requires `bypassPermissions`, but this was designed as a "trust everything" escape hatch, not a fine-grained authorization layer.

**How to avoid:**
1. **For agents that need only MCP tools (not built-in tools):** Use `disallowedTools` to block dangerous built-in tools (`Bash`, `Write`, `Edit`, `Read`, `WebSearch`, `WebFetch`). Only allow the specific MCP tools you defined. `disallowedTools` works reliably in all permission modes.
2. **Use `disallowedTools` over `allowedTools`** -- the former works reliably in all permission modes; the latter may be ignored with `bypassPermissions`.
3. **If `bypassPermissions` is necessary**, run in a sandboxed environment (container, VM) where file system damage is contained.
4. **Never expose the Claude Code provider path to arbitrary user prompts** without sandboxing -- the agent has access to the server's file system.
5. **Set `systemPrompt: undefined` and `loadFileSystemSettings: false`** (v2.0.0+ defaults) to prevent the agent from loading CLAUDE.md or settings.json from the filesystem, which could contain unexpected instructions.

**Warning signs:**
- Agent hangs indefinitely during workflow execution (waiting for permission approval)
- Unexpected files appearing in the project directory or home directory
- Agent executing Bash commands on the server
- Server-side logs showing tool permission requests with no handler
- Agent reading CLAUDE.md and behaving as a coding assistant instead of a linguistics solver

**Phase to address:**
Phase 1 (provider integration) -- permission mode must be configured correctly from the first agent call. Get this wrong and the agent either hangs or has unsafe access.

---

### Pitfall 6: Streaming Behavior and Event Emission Mismatch

**What goes wrong:**
The current workflow emits real-time trace events (`data-agent-text-chunk`, `data-agent-start`, `data-agent-end`, `data-tool-call`, etc.) by consuming `textStream` chunks from `streamWithRetry()`. The Claude Code provider's streaming behavior is fundamentally different:
1. Tool Streaming is explicitly marked as "unsupported" for all Claude Code models on the AI SDK provider page
2. The provider streams the full Claude agent session (which may include multiple internal turns, tool calls, thinking), not a single model response
3. The `textStream` from the provider includes Claude's internal reasoning and tool execution output mixed together, not clean separated text chunks
4. The Claude Code provider's streaming includes built-in tool execution output (file reads, bash outputs) that are not present in OpenRouter responses

This means the frontend trace display will either show garbled mixed content or miss tool execution events entirely when using the Claude Code provider.

**Why it happens:**
OpenRouter provides a direct model API -- one request, one streamed response, clean text chunks. The Claude Code provider wraps an autonomous agent session that internally makes multiple model calls, executes tools, and streams all of this as a single output. The streaming semantics are architecturally different.

**How to avoid:**
1. **Accept degraded streaming for Claude Code mode** -- show a simplified progress display instead of the full hierarchical trace. The trace events that depend on per-tool-call granularity (`data-tool-call`, `data-agent-text-chunk`) may not be available with the same fidelity.
2. **Use the Claude Agent SDK's message-level events** instead of text stream chunks. The SDK emits typed messages (`assistant`, `tool_use`, `tool_result`, `result`) that can be mapped to trace events, but this requires hooking into the raw SDK output, not the AI SDK's `textStream`.
3. **Branch the streaming logic** in `streamWithRetry()` based on provider type. For OpenRouter: use the current `textStream` consumption. For Claude Code: use `generateWithRetry()` instead (non-streaming) for initial implementation, then optionally add SDK-level streaming later.
4. **Do not assume `response.steps` has the same structure** -- with OpenRouter, each step corresponds to one model call. With Claude Code, the entire `query()` call may appear as a single step regardless of how many internal turns the agent took.

**Warning signs:**
- Frontend trace panel shows raw internal reasoning mixed with tool output
- Tool call events missing from the trace timeline
- Agent text chunks arriving in unexpected formats (e.g., XML tool use blocks)
- "Tool Streaming" warnings in console from the AI SDK
- `onTextChunk` callback receiving very large chunks instead of incremental tokens

**Phase to address:**
Phase 3 (frontend integration) -- streaming adaptation requires changes to both the backend event emission and frontend trace display. Can be deprioritized if initial integration uses non-streaming `generateWithRetry()`.

---

### Pitfall 7: Rate Limiting and Throttling Under Subscription Model

**What goes wrong:**
Claude Code Pro/Max subscriptions have usage quotas that are fundamentally different from API pay-per-token pricing. The solver workflow makes 15-30+ agent calls per solve (extractors, dispatchers, hypothesizers, verifiers, tester tools, improvers, answerers across multiple rounds). With a Pro subscription ($20/month), the 5-hour rolling window allows roughly 45 messages. A single workflow run could consume 30-60% of the window quota. Two back-to-back solves could trigger throttling where responses slow dramatically or are queued.

Additionally, usage is shared between Claude.ai (web) and Claude Code -- if the user has been chatting on Claude.ai, their remaining quota for the workflow is reduced. Once 50 sessions per month are reached, access throttling may also occur.

**Why it happens:**
The workflow was designed around API pricing where more calls = more cost but no hard limits. Subscription plans invert this: cost is fixed but capacity is limited. The workflow's multi-agent architecture (12+ agents, multiple rounds of verify/improve) was optimized for cost-per-call, not calls-per-window.

**How to avoid:**
1. **Document subscription tier requirements** -- recommend Max 5x ($100/month, ~225 messages per 5 hours) minimum for workflow usage. Pro tier is likely insufficient for repeated solves.
2. **Add quota awareness** -- before starting a workflow, warn users about estimated message consumption.
3. **Consider agent consolidation for Claude Code mode** -- combine sequential agents that do not use tools into single, longer prompts. For example, the two-agent chain (reasoner + extractor) could become a single call with structured output, halving the call count for those steps.
4. **Implement graceful throttle handling** -- detect rate limit responses (429 or similar) and show a user-friendly "quota exceeded, please wait" message instead of a generic error.

**Warning signs:**
- Workflow runs getting progressively slower during a session
- 429 responses from the Claude API
- Agent calls timing out (not from model latency, but from queue wait times)
- Users reporting "it worked earlier but now it's slow/broken"

**Phase to address:**
Phase 3 (UX integration) -- throttle detection and user messaging. Phase 1 should document the quota impact per workflow run.

---

### Pitfall 8: MCP Tool Prompt Requires Streaming Input Mode (Async Generator)

**What goes wrong:**
Custom MCP tools registered via `createSdkMcpServer` require the `prompt` parameter to use streaming input mode -- an async generator/iterable, not a simple string. The current workflow passes prompts as plain strings to `agent.generate()` and `agent.stream()`. If the MCP bridge is used for tool bridging (Pitfall 1's solution), but prompts are passed as strings, the MCP tools will not be discovered or callable by the agent. The Claude Agent SDK docs explicitly state: "Custom MCP tools require streaming input mode. You must use an async generator/iterable for the prompt parameter - a simple string will not work with MCP servers."

**Why it happens:**
The streaming input requirement is an implementation detail of the Claude Agent SDK's MCP integration. It exists because MCP tool discovery and registration happens during the streaming handshake. With a simple string prompt, the handshake phase is skipped.

**How to avoid:**
1. **Wrap string prompts in an async generator** before passing to the Claude Code provider when MCP tools are configured:
   ```typescript
   async function* wrapPrompt(text: string) {
     yield {
       type: 'user' as const,
       message: { role: 'user' as const, content: text }
     };
   }
   ```
2. **Apply this wrapping conditionally** -- only when the provider is Claude Code and MCP tools are needed. OpenRouter agents should continue using string prompts.
3. **Test MCP tool discovery** by verifying the agent actually calls an MCP tool in a test prompt, not just that the prompt compiles.

**Warning signs:**
- MCP tools registered but agent never calls them
- Agent responds with "I don't have access to any tools" despite MCP server being configured
- Tool discovery works in unit tests but not in the actual workflow
- No `tool_use` messages in the SDK response

**Phase to address:**
Phase 2 (tool bridging) -- this is part of the MCP bridge implementation. Must be resolved alongside Pitfall 1.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-coding `providerMetadata.openrouter` in cost tracking | Works for current single-provider setup | Must refactor for every new provider added | Never -- should be abstracted now that multi-provider is confirmed |
| Skipping streaming for Claude Code provider (using `generateWithRetry` instead) | Simplifies initial integration significantly | Users get degraded UX with no real-time trace for Claude Code mode | Acceptable for MVP of Claude Code mode; fix in follow-up phase |
| Using `bypassPermissions` without sandboxing | Agent executes without hanging | Full system access from server-side code | Only in development; never in production without container isolation |
| Duplicating tool definitions (Mastra tools + MCP wrappers) | Quick integration path | Two definitions to maintain per tool | Acceptable if tool count is stable (currently 10); wrap with adapter function to reduce duplication |
| Treating Claude Code cost as $0 in the UI | Avoids cost tracking complexity | Users have no visibility into quota consumption | Acceptable for initial phase; must add quota/token display before feature is considered complete |
| Skipping the two-agent chain for Claude Code mode | Fewer API calls, stays within quota | Different code path for different providers; behavior divergence over time | Acceptable if clearly documented and the output schemas are identical |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code Provider auth | Assuming `claude login` persists forever; deploying without auth strategy | Use `claude setup-token` for 1-year server auth; handle 401 with re-read of credentials file |
| Structured output | Passing complex Zod schemas unchanged; assuming `response.object` will always be populated | Audit schemas against supported JSON Schema subset; always check `response.object !== null` before parsing; watch for `.catchall()` and `format` constraints |
| Tool bridging | Trying to pass AI SDK `tools` option directly to Claude Code provider | Wrap tools as MCP server tools via `createSdkMcpServer`; use `allowedTools` with `mcp__<server-name>__<tool-name>` prefix naming |
| MCP tool prompts | Using simple string prompts with MCP servers | MCP tools require streaming input mode -- use async generator/iterable for the `prompt` parameter, not a plain string |
| Permission mode | Using `permissionMode: 'default'` in server context | Use `disallowedTools` to block built-in tools; never rely on `allowedTools` alone with `bypassPermissions` |
| Provider metadata for cost | Reading `providerMetadata.openrouter.usage.cost` and expecting it to work for all providers | Create provider-aware cost extraction that checks provider type first; Claude Code uses `total_cost_usd` on result message |
| Agent model resolution | Using `openrouter('model-id')` call pattern for Claude Code provider | Claude Code provider is called differently -- `claudeCode('claude-opus-4-6')` -- different call signature and different model ID format |
| Error classification in retry logic | Assuming all API errors have the same error names/messages | `generateWithRetry` checks for `AI_APICallError` and OpenRouter-specific error messages; Claude Code errors may have different names/shapes |
| File system settings | Letting the agent load CLAUDE.md and settings.json from the project | Set `loadFileSystemSettings: false` (v2.0.0+ default) to prevent the linguistics solver agent from acting as a coding assistant |
| Session persistence | Letting the provider persist sessions to disk | Set `persistSession: false` to prevent Claude Code from writing session data to `~/.claude/` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Subscription quota exhaustion | Workflow slows then stalls, 429 errors | Document per-run quota cost (~20-30 messages); recommend Max tier; consolidate agent calls for Claude Code mode | After 1-2 full workflow runs on Pro tier within a 5-hour window |
| Session startup latency | First agent call takes 3-10s longer than OpenRouter | Accept higher TTFT for Claude Code; show loading indicator; consider reusing sessions across calls | Every workflow start (cold session overhead from CLI subprocess spawn) |
| Token refresh during workflow | Mid-workflow auth failure, unrecoverable without re-login | Use `setup-token` for 1-year auth; serialize all agent calls | After 8-12 hours of session with OAuth login, or any concurrent process |
| MCP server initialization overhead | Tool discovery adds latency per agent call | Initialize MCP server once at workflow start, pass to all Claude Code agent calls | Every agent call that uses MCP tools, especially if server is created per-call |
| Verify/improve loop message explosion | Each round adds 5-10+ agent calls; 3 rounds = 15-30 calls from verification alone | Cap rounds more aggressively for Claude Code mode (2 instead of 3-5); consolidate tester calls | When `maxRounds` is 3+ and the problem requires multiple improvement iterations |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using `bypassPermissions` on a user-facing Next.js server | Agent can execute arbitrary commands, read/write any file on the server | Use `disallowedTools` to block `Bash`, `Write`, `Edit`, `Read`; only allow your MCP tools |
| Storing `setup-token` in `.env` and accidentally committing | Token grants full Claude account access for 1 year | `.env` is already gitignored; add `setup-token` to `.gitignore` documentation; never expose via API responses |
| Passing user-controlled prompt text directly to Claude Code agent | Prompt injection could instruct agent to use built-in tools maliciously if not blocked | Restrict via `disallowedTools` for all dangerous built-in tools; sanitize user input |
| Running Claude Code provider in same process as production Next.js | Agent's built-in tools share filesystem with the app; even with disallowed tools, sandbox bugs exist | Consider subprocess isolation for Claude Code execution in production |
| Allowing agent to load filesystem settings | Agent reads CLAUDE.md from project and follows its instructions (designed for coding) instead of linguistics solver instructions | Set `loadFileSystemSettings: false` explicitly |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing $0.00 cost for Claude Code runs | User thinks feature is free; unaware of quota consumption | Display token count or "included in subscription" indicator; show estimated messages remaining |
| Same trace display for both providers | Claude Code trace shows garbled mix of reasoning + tool output | Provider-aware trace display: simplified progress mode for Claude Code showing step completion without per-chunk streaming |
| No feedback during permission waits | Workflow appears frozen if permission mode is misconfigured | Add timeout on agent calls; surface error if no response within 60s; log permission mode for debugging |
| No indication of quota remaining | User starts workflow, hits rate limit mid-run, loses partial progress | Check/display quota before workflow start if API provides it; warn if subscription tier is Pro |
| Silent fallback from structured to prose output | Extraction step appears to succeed but `response.object` is null | Validate `response.object` is non-null immediately; show explicit error "Claude Code provider returned prose instead of structured data -- schema may be incompatible" |
| Provider toggle does not indicate capability differences | User switches to Claude Code expecting identical behavior | Show informational note when Claude Code is selected: "Streaming trace may be limited; tool execution uses MCP bridge" |

## "Looks Done But Isn't" Checklist

- [ ] **Tool bridging:** Tools registered as MCP tools and visible -- verify agents actually CALL the tools during execution by checking `response.steps` for tool_use events, not just that tool registration succeeded
- [ ] **Structured output:** `generateObject`/`streamObject` returns data -- verify the `response.object` field is populated (not just `response.text` containing JSON-like text); test with EVERY schema, especially `structuredProblemDataSchema` which uses `.catchall()`
- [ ] **Cost tracking:** Cost display shows numbers -- verify the numbers come from the Claude Code provider's actual usage data, not stale OpenRouter metadata returning 0
- [ ] **Auth persistence:** Login works once -- verify auth survives a full 8-12 hour session; run two workflow executions 9 hours apart to confirm token refresh works
- [ ] **Permission mode:** Agent runs without hanging -- verify it also runs WITHOUT excess permissions: confirm `Bash`, `Write`, `Edit` built-in tools are not accessible by attempting to invoke them
- [ ] **Streaming:** Text appears in the trace panel -- verify it is the agent's actual reasoning output, not internal tool execution output, XML markup, or empty chunks
- [ ] **Provider toggle:** UI toggle switches mode -- verify the BACKEND actually creates the correct provider instance (not still using OpenRouter); log the provider type at workflow start
- [ ] **Error handling:** Happy path works -- verify error messages from Claude Code are surfaced correctly by the retry logic (not swallowed as unrecognized error types or shown as generic "Empty response")
- [ ] **Retry logic:** `generateWithRetry`/`streamWithRetry` retries work -- verify Claude Code error types are classified as retryable; the current check for `AI_APICallError` and OpenRouter-specific messages may not match Claude Code error shapes
- [ ] **Filesystem isolation:** Agent cannot read project files -- verify `loadFileSystemSettings: false` prevents CLAUDE.md injection; verify `systemPrompt` is set to the linguistics solver instructions, not the default Claude Code prompt

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tools not working via Claude Code provider | MEDIUM | Implement MCP bridge layer; wrap each Mastra tool as MCP tool; wrap prompts in async generators; test each tool individually |
| OAuth token race condition | LOW | Switch to `setup-token` auth; restart workflow; no code changes needed |
| Structured output silent fallback | MEDIUM | Audit and simplify the failing schema; remove `.catchall()` or `format` constraints; add explicit null check on `response.object`; test each schema individually |
| Cost tracking returning $0 | LOW | Add provider-type branching in `extractCostFromResult()`; read `total_cost_usd` from Claude Code SDK result; add "subscription" cost display mode |
| Permission mode hanging | LOW | Change config to add `disallowedTools` for built-in tools; redeploy; no architectural changes |
| Streaming mismatch | HIGH | Requires architectural changes to event emission; may need separate code path for Claude Code provider; or accept degraded non-streaming mode |
| Rate limiting mid-workflow | LOW | Wait for 5-hour quota refresh window; switch to OpenRouter for immediate retry; reduce `maxRounds` for Claude Code mode |
| MCP prompt format wrong | LOW | Wrap string prompts in async generator; test tool discovery; no architectural changes |
| Error retry classification | LOW | Add Claude Code error patterns to the `isRetryable` check in `generateWithRetry`; test with intentional failures |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AI SDK custom tools unsupported | Phase 1: Provider integration | Run a tool-using agent (verifier orchestrator) through Claude Code; verify tool calls execute and return results |
| OAuth token race condition | Phase 1: Auth setup | Run workflow end-to-end with `setup-token`; verify no auth failures over 24h |
| Structured output fallback | Phase 2: Schema validation | Run each structured output schema through Claude Code provider; verify `response.object` is non-null for all 5 schemas |
| Cost tracking OpenRouter-specific | Phase 2-3: Cost abstraction | Run workflow with Claude Code; verify frontend displays non-zero cost/token information |
| Permission mode foot guns | Phase 1: Provider config | Verify agent cannot execute `Bash` or `Write` built-in tools; verify no hanging on permission prompts; verify filesystem settings not loaded |
| Streaming mismatch | Phase 3: Frontend adaptation | Verify trace panel displays meaningful content for Claude Code runs without garbled output |
| Rate limiting/throttling | Phase 3: UX guards | Run 2 consecutive solves on Pro tier; verify graceful throttle messaging |
| MCP prompt async generator | Phase 2: Tool bridging | Verify MCP tools are discovered and callable; test with both string and async generator prompts |
| Error retry classification | Phase 2: Error handling | Simulate Claude Code errors; verify retry logic classifies them correctly |

## Sources

- [ai-sdk-provider-claude-code GitHub (ben-vargas)](https://github.com/ben-vargas/ai-sdk-provider-claude-code) -- PRIMARY source for provider capabilities, tool support (none), structured output limitations, permission modes, Zod 4 requirement, streaming behavior
- [AI SDK Community Providers: Claude Code](https://ai-sdk.dev/providers/community-providers/claude-code) -- Tool support matrix showing Tool Usage and Tool Streaming as unsupported across all models
- [Claude Agent SDK Custom Tools docs](https://platform.claude.com/docs/en/agent-sdk/custom-tools) -- MCP tool bridging pattern using `createSdkMcpServer` + `tool()`; streaming input requirement for MCP tools
- [Claude Agent SDK Cost Tracking docs](https://platform.claude.com/docs/en/agent-sdk/cost-tracking) -- `total_cost_usd` on result message, `modelUsage` per-model breakdowns, per-query (not per-session) cost reporting
- [Claude Agent SDK Structured Outputs docs](https://platform.claude.com/docs/en/agent-sdk/structured-outputs) -- Supported JSON Schema features for constrained decoding
- [GitHub Issue #27933: OAuth token refresh race condition](https://github.com/anthropics/claude-code/issues/27933) -- CONFIRMED race condition with concurrent sessions, single-use refresh tokens, no file locking
- [GitHub Issue #24317: Frequent re-authentication with concurrent sessions](https://github.com/anthropics/claude-code/issues/24317) -- Root issue for token race condition; closed but not fixed
- [GitHub Issue #29048: sandbox.filesystem.allowWrite not enforced in bypassPermissions](https://github.com/anthropics/claude-code/issues/29048) -- Write tool bypasses sandbox in bypassPermissions mode
- [GitHub Issue #14279: Tool execution requires approval despite bypassPermissions](https://github.com/anthropics/claude-code/issues/14279) -- allowedTools may be ignored with bypassPermissions
- [GitHub Issue #20264: Subagents inherit bypassPermissions unconditionally](https://github.com/anthropics/claude-code/issues/20264) -- Privilege escalation concern
- [Claude Agent SDK Permissions docs](https://platform.claude.com/docs/en/agent-sdk/permissions) -- Permission modes: default, acceptEdits, bypassPermissions, plan
- [Claude Code rate limits guide (Portkey)](https://portkey.ai/blog/claude-code-limits/) -- Subscription tier quotas, 5-hour rolling window, session limits
- [Claude Code rate limits and pricing (Northflank)](https://northflank.com/blog/claude-rate-limits-claude-code-pricing-cost) -- Dual-layer usage framework, weekly ceiling
- [claude-code-mastra integration (t3ta)](https://github.com/t3ta/claude-code-mastra) -- Reference Mastra integration; security warning about built-in tool restriction features not working as expected
- [GitHub Issue #15007: /login does not recover active session after token expiry](https://github.com/anthropics/claude-code/issues/15007) -- 401 error loop after token expiry during active session
- Codebase analysis: `request-context-helpers.ts:202` (`extractCostFromResult`), `agent-utils.ts` (`generateWithRetry`/`streamWithRetry`), `agent-factory.ts` (`createWorkflowAgent`), `vocabulary-tools.ts`, `workflow-schemas.ts` -- integration surface area for provider switching

---
*Pitfalls research for: Claude Code provider integration into LO-Solver Mastra workflow (v1.6 milestone)*
*Researched: 2026-03-10*
