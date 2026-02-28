# Mastra Package Upgrade Design

## Goal

Upgrade all Mastra packages to the latest stable versions and audit inactive workflows for compatibility.

## Current State

| Package | package.json spec | Installed | Latest | Action |
|---------|-------------------|-----------|--------|--------|
| @mastra/ai-sdk | ^1.1.0 | 1.1.0 | 1.1.0 | Pin spec |
| @mastra/core | ^1.2.0 | 1.8.0 | 1.8.0 | Pin spec to ^1.8.0 |
| @mastra/evals | ^1.1.0 | 1.1.0 | 1.1.2 | Bump to ^1.1.2 |
| @mastra/libsql | ^1.2.0 | 1.2.0 | 1.6.2 | Bump to ^1.6.2 |
| @mastra/loggers | ^1.0.1 | 1.0.2 | 1.0.2 | Pin spec to ^1.0.2 |
| @mastra/memory | ^1.1.0 | 1.1.0 | 1.5.2 | Bump to ^1.5.2 |
| @mastra/observability | ^1.2.0 | 1.2.0 | 1.2.1 | Bump to ^1.2.1 |
| mastra (dev) | ^1.2.0 | 1.3.5 | 1.3.5 | Pin spec to ^1.3.5 |

## API Compatibility Audit

### Workflow 03 (active) — No changes needed

Already uses all v1 APIs:
- `RequestContext` (not RuntimeContext)
- `structuredOutput: { schema }` (not `output` or `experimental_output`)
- `await setState()` (already async)
- Two-param tool signatures `(inputData, context)`
- `agent.generate()` (standard API, not legacy)
- `LibSQLStore` with `id` field

### Workflows 01 & 02 (inactive) — Audit for Memory defaults

These workflows use `Memory` from `@mastra/memory` with `LibSQLStore`. The Memory constructor API is stable, but **default behaviors changed** between 1.1.0 and 1.5.2:

- `lastMessages`: 40 → 10
- `semanticRecall`: enabled by default → disabled by default
- `generateTitle`: enabled by default → disabled by default
- Default scope: `thread` → `resource`

No code changes needed now since these workflows are inactive. When re-enabling them, explicit Memory options should be set.

### API Route (handleWorkflowStream)

Uses `handleWorkflowStream` from `@mastra/ai-sdk` — stable across 1.1.0.

### Mastra Instance

Uses `LibSQLStore` with `id`, `PinoLogger`, `Observability` — all stable patterns.

## Database Considerations

The `@mastra/libsql` upgrade from 1.2.0 to 1.6.2 may include schema changes. If duplicate spans exist in `mastra_spans`, run:

```bash
npx mastra migrate
```

Since we treat `mastra.db*` as ephemeral (per CLAUDE.md), a fresh start via `npm run dev:new` is also an option.

## Verification

1. `npx tsc --noEmit` — expect only the pre-existing CSS module error
2. `npm run build` — Next.js production build succeeds
3. `npm run dev` — smoke test (optional)

## Risk Assessment

**Low risk.** All version bumps are within the same major version (1.x). The active codebase already uses v1 APIs throughout. The only real changes happen to packages the active workflow doesn't directly depend on (Memory).
