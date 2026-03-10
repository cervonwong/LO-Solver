# Phase 28: Agent Factory - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a `createWorkflowAgent()` factory function and migrate all 12 workflow agents to use it, eliminating boilerplate while preserving dynamic model resolution and all per-agent behavior. Pure refactoring — zero behavioral changes.

</domain>

<decisions>
## Implementation Decisions

### Factory API design
- Flat config approach — no variant/category concept, every property explicitly specified
- Factory eliminates boilerplate (model resolver, UnicodeNormalizer, common imports) without categorizing agents
- `productionModel` and `testingModel` both configurable per agent (testingModel defaults to `TESTING_MODEL` if omitted)
- Factory internally builds the `({ requestContext }) => getOpenRouterProvider(requestContext)(...)` dynamic model resolver
- Instructions accepted as `string | { role: string; content: string }` — passed through to `new Agent()` without normalization
- `useUnicodeNormalizer` boolean (default `true`) — factory constructs the UnicodeNormalizer instance when true
- Optional `requestContextSchema` — passed through to `new Agent()` when provided
- Optional `tools` — passed through, defaults to `{}`
- Factory does NOT import zod; schema objects are passed in by the agent file

### Agent file structure
- Keep individual `*-agent.ts` files — each becomes a thin wrapper calling `createWorkflowAgent()`
- Factory lives at `src/mastra/workflow/agent-factory.ts` (next to agent files, consistent with `agent-utils.ts`)
- `index.ts` stays unchanged — continues importing from individual agent files and building `workflowAgents` record
- Extract tester agent instructions to separate files: `03a-rule-tester-instructions.ts` and `03a-sentence-tester-instructions.ts` (same `*-instructions.ts` convention)

### Instruction template injection
- Template `{{placeholder}}` replacement stays as pre-processing in agent files, NOT in the factory
- Only 3 agents use it (hypothesizer, synthesizer, improver) with different replacement sets
- Agent files do `.replace()` calls and pass the result to factory

### Tester agent handling
- Factory accommodates tester agents via `useUnicodeNormalizer: false` and `requestContextSchema` params
- All 12 agents go through the factory — no exceptions
- Zod import stays in tester agent files; factory accepts the schema as an opaque type

### Claude's Discretion
- TypeScript type definition for the factory config object
- Internal implementation details of the factory function
- Order of migration (which agents to migrate first)
- Whether to add JSDoc to the factory function

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `agent-utils.ts`: Contains `generateWithRetry` — factory doesn't need to touch this
- `request-context-helpers.ts`: `getOpenRouterProvider()` — factory will import this
- `../openrouter.ts`: `TESTING_MODEL` constant — factory will import this
- `@mastra/core/processors`: `UnicodeNormalizer` — factory will construct instances

### Established Patterns
- All agents use identical `UnicodeNormalizer` config: `{ stripControlChars: false, preserveEmojis: true, collapseWhitespace: true, trim: true }`
- Model resolver pattern is identical across all 12 agents: `({ requestContext }) => getOpenRouterProvider(requestContext)(productionOrTestingModel)`
- 5 agents use GPT-5-mini in production, 7 use Gemini 3 Flash
- 2 tester agents are the only ones with `requestContextSchema` and without `inputProcessors`

### Integration Points
- `src/mastra/workflow/index.ts` — imports all agents (no changes needed)
- Each `*-agent.ts` file — will be modified to use factory
- New files: `agent-factory.ts`, `03a-rule-tester-instructions.ts`, `03a-sentence-tester-instructions.ts`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 28-agent-factory*
*Context gathered: 2026-03-08*
