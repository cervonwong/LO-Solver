---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mastra/workflow/agent-factory.ts
  - src/mastra/openrouter.ts
autonomous: true
requirements: [QUICK-8]

must_haves:
  truths:
    - "All agents use haiku in claude-code-testing mode"
    - "activeModelId returns claude-code/haiku for CC testing mode"
    - "No agent overrides claudeCodeTestingModel to sonnet"
  artifacts:
    - path: "src/mastra/workflow/agent-factory.ts"
      provides: "Factory default for claudeCodeTestingModel"
      contains: "claudeCodeTestingModel = 'haiku'"
    - path: "src/mastra/openrouter.ts"
      provides: "Display model ID for CC testing mode"
      contains: "claudeCodeModel ?? 'haiku'"
  key_links:
    - from: "src/mastra/workflow/agent-factory.ts"
      to: "all *-agent.ts files"
      via: "default parameter value"
      pattern: "claudeCodeTestingModel = 'haiku'"
---

<objective>
Change the Claude Code Testing configuration to use haiku for all agents instead of the current sonnet/haiku mix, minimizing cost.

Purpose: The CC Testing mode currently defaults to sonnet for 7 agents (reasoning agents: hypothesizer, dispatchers, synthesizer, verifier orchestrator, rules improver, question answerer) while 5 agents already explicitly use haiku (extraction/testing agents). Changing the factory default from 'sonnet' to 'haiku' makes all agents use haiku in CC testing mode.

Output: Two files modified -- factory default and display function updated.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/mastra/workflow/agent-factory.ts
@src/mastra/openrouter.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Change CC testing default to haiku in factory and display function</name>
  <files>src/mastra/workflow/agent-factory.ts, src/mastra/openrouter.ts</files>
  <action>
Two changes:

1. In `src/mastra/workflow/agent-factory.ts`:
   - Line 27 (JSDoc comment): Change "Defaults to 'sonnet'" to "Defaults to 'haiku'" for the `claudeCodeTestingModel` field
   - Line 48 (destructuring default): Change `claudeCodeTestingModel = 'sonnet'` to `claudeCodeTestingModel = 'haiku'`

2. In `src/mastra/openrouter.ts`:
   - Line 74 (activeModelId function body): Change `claudeCodeModel ?? 'sonnet'` to `claudeCodeModel ?? 'haiku'`

This means the 7 agents that currently inherit the default (02-initial-hypothesizer, 02-dispatcher, 02-improver-dispatcher, 02-synthesizer, 03a-verifier-orchestrator, 03b-rules-improver, 04-question-answerer) will now use haiku in CC testing mode. The 5 agents that already explicitly set `claudeCodeTestingModel: 'haiku'` are unaffected (their explicit value matches the new default).

No per-agent file changes needed -- the factory default handles everything.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -20</automated>
  </verify>
  <done>
    - `agent-factory.ts` default is `claudeCodeTestingModel = 'haiku'`
    - `openrouter.ts` fallback is `claudeCodeModel ?? 'haiku'`
    - TypeScript compiles without new errors
    - All 12 agents will resolve to haiku in claude-code-testing mode
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
2. Grep confirms no agent file sets `claudeCodeTestingModel: 'sonnet'`
3. Factory default reads `claudeCodeTestingModel = 'haiku'`
4. `activeModelId` fallback reads `'haiku'`
</verification>

<success_criteria>
All Claude Code Testing mode agents resolve to haiku model. No sonnet references remain in CC testing configuration paths.
</success_criteria>

<output>
After completion, create `.planning/quick/8-change-cc-testing-configuration-to-use-h/8-SUMMARY.md`
</output>
