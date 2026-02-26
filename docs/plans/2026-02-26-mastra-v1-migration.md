# Mastra v1 Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade all Mastra packages from beta (1.0.0-beta.x) to stable v1 (target versions below), fixing all breaking API changes.

**Architecture:** The codebase uses Mastra for AI agent orchestration with three workflow variants (only Workflow 03 is active). The migration touches package versions, import paths, tool execute signatures, agent model configuration, observability setup, and the Mastra CLI. The core workflow logic and step composition API remain compatible.

**Tech Stack:** Mastra v1, TypeScript, Zod 4, OpenRouter AI SDK provider, Node.js 22+

---

## Current vs Target Versions

| Package                 | Installed     | Target         | Notes                        |
| ----------------------- | ------------- | -------------- | ---------------------------- |
| `@mastra/core`          | 1.0.0-beta.14 | 1.8.0          | Major breaking changes       |
| `@mastra/evals`         | 1.0.0-beta.2  | 1.1.2          | Minor API changes            |
| `@mastra/libsql`        | 1.0.0-beta.8  | 1.6.2          | Constructor changes          |
| `@mastra/loggers`       | 1.0.0-beta.3  | 1.0.2          | Likely compatible            |
| `@mastra/memory`        | 1.0.0-beta.6  | 1.5.2          | Default changes, API renames |
| `@mastra/observability` | 1.0.0-beta.6  | 1.2.1          | Config key rename            |
| `mastra` (CLI)          | 1.0.0-beta.11 | latest (1.3.5) | DevDep                       |

**New package:** `@mastra/ai-sdk` 1.1.0 is NOT needed by this project (no AI SDK stream format conversion used).

---

## Key Breaking Changes Identified

1. **Tool `execute` signature** changed from `({ context, runtimeContext, mastra })` to `(inputData, context)` -- **already migrated** in our code
2. **`RequestContext`** (was `RuntimeContext`) -- **already migrated** in our code
3. **`model` property** now supports string format (`'openai/gpt-5.1'`) -- our code uses `openrouter('model-name')` provider which should still work
4. **`Observability` constructor** config shape may have changed (new `configs` key)
5. **`LibSQLStore` constructor** now requires `id` -- **already present** in our code
6. **`getAgentById()`** still exists alongside `getAgent()` -- no change needed
7. **`setState()` is now async** in workflows -- **already using `await`** in our code
8. **Zod 4 compatibility** -- already on `zod@^4.3.6`, need to verify Mastra v1 supports it
9. **`UnicodeNormalizer` import path** from `@mastra/core/processors` -- **already using correct path**
10. **`@mastra/evals` import path** -- `@mastra/evals/scorers/prebuilt` may have changed

---

## Pre-Migration Assessment

After thorough analysis, the **active codebase (Workflow 03) is already using the v1 API patterns**:

- Tool execute uses `(inputData, context)` signature
- `RequestContext` (not `RuntimeContext`)
- `await setState()`
- `UnicodeNormalizer` from `@mastra/core/processors`
- `LibSQLStore` with `id` property
- All subpath imports (`@mastra/core/agent`, `/tools`, `/workflows`, `/mastra`, `/request-context`)

The main risk areas are:

- Runtime behavior changes in newer versions
- Observability constructor API changes
- Memory default changes (if Memory is re-enabled)
- Inactive workflows (01, 02) using older patterns

---

### Task 1: Update package.json versions

**Files:**

- Modify: `package.json`

**Step 1: Update dependency versions**

Change all Mastra package versions in `package.json`:

```json
{
  "dependencies": {
    "@mastra/core": "^1.8.0",
    "@mastra/evals": "^1.1.2",
    "@mastra/libsql": "^1.6.2",
    "@mastra/loggers": "^1.0.2",
    "@mastra/memory": "^1.5.2",
    "@mastra/observability": "^1.2.1",
    "@openrouter/ai-sdk-provider": "^2.1.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^25.2.2",
    "mastra": "^1.3.5",
    "prettier": "3.8.1",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Clean install**

```bash
rm -rf node_modules package-lock.json
npm install
```

Expected: Install completes without version conflict errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Update Mastra packages to stable v1 versions"
```

---

### Task 2: Fix Observability constructor (if needed)

**Files:**

- Modify: `src/mastra/index.ts:42-44`

The current code:

```ts
observability: new Observability({
  default: { enabled: true },
}),
```

The v1 stable API may expect a different shape. Check the installed type definition first.

**Step 1: Verify the Observability constructor type**

```bash
npx tsc --noEmit 2>&1 | grep -i observ
```

If there's an error, the constructor likely changed to:

```ts
import { Observability } from '@mastra/observability';

observability: new Observability({
  configs: {
    default: { enabled: true },
  },
}),
```

Or the simpler form may still work. Check the type definition:

```bash
grep -A 20 'constructor' node_modules/@mastra/observability/dist/index.d.ts
```

**Step 2: Fix the constructor if needed**

Update `src/mastra/index.ts` to match the expected API.

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors related to Observability.

**Step 4: Commit**

```bash
git add src/mastra/index.ts
git commit -m "Update Observability constructor for v1 API"
```

---

### Task 3: Fix Mastra constructor import (if needed)

**Files:**

- Modify: `src/mastra/index.ts:1`

The current import:

```ts
import { Mastra } from '@mastra/core/mastra';
```

The v1 docs show both:

```ts
import { Mastra } from '@mastra/core';
// OR
import { Mastra } from '@mastra/core/mastra';
```

Both should work. Verify with type check.

**Step 1: Run type check on index.ts**

```bash
npx tsc --noEmit
```

If `@mastra/core/mastra` fails, change to:

```ts
import { Mastra } from '@mastra/core';
```

**Step 2: Commit if changed**

```bash
git add src/mastra/index.ts
git commit -m "Update Mastra import path for v1 compatibility"
```

---

### Task 4: Run full type check and fix errors

**Files:**

- Potentially any `.ts` file

**Step 1: Run type check**

```bash
npx tsc --noEmit 2>&1
```

**Step 2: Categorize errors**

Common error categories to expect:

- Type mismatches in `Agent.generate()` return type
- Missing or renamed properties on response objects
- `reasoning` property access on generate results
- Tool context type changes
- Zod 4 compatibility issues with Mastra's Zod 3 schemas

**Step 3: Fix each error**

For each type error, fix the code to match the v1 API. Common fixes:

a. **`response.reasoning`** -- may need to access via `response.reasoning` or may have been renamed
b. **`response.object`** type narrowing -- may need explicit type assertions
c. **Tool execute context type** -- the `context` parameter type may have changed from `unknown` to a specific interface
d. **`mastra.getAgentById()` return type** -- may now throw instead of returning undefined

**Step 4: Run type check again**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "Fix type errors for Mastra v1 migration"
```

---

### Task 5: Fix tool execute context typing (if needed)

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/request-context-helpers.ts:17-22`
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/vocabulary-tools.ts` (all execute functions)
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts` (execute functions)
- Modify: `src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts` (execute functions)

The current code uses `as unknown as ToolExecuteContext` casts because the Mastra types may not expose `requestContext` and `mastra` on the tool context. In v1 stable, the context type is:

```ts
// The official v1 tool execute signature:
execute: async (inputData, context) => {
  const rc = context?.requestContext;
  // context also has: context?.mastra, context?.agent, context?.workflow
};
```

**Step 1: Check if the ToolExecuteContext interface matches v1**

Inspect the actual type from the installed package:

```bash
grep -B5 -A20 'execute' node_modules/@mastra/core/dist/tools/index.d.ts | head -60
```

**Step 2: Update ToolExecuteContext interface if needed**

If the v1 context type now includes `requestContext` and `mastra` natively, simplify the casts:

```ts
// request-context-helpers.ts
export interface ToolExecuteContext {
  requestContext?: {
    get: (key: keyof Workflow03RequestContext) => unknown;
  };
  mastra?: Mastra;
}
```

May be replaceable with the official type, or the casts (`as unknown as ToolExecuteContext`) may become unnecessary.

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/mastra/03-per-rule-per-sentence-delegation/request-context-helpers.ts
git add src/mastra/03-per-rule-per-sentence-delegation/vocabulary-tools.ts
git add src/mastra/03-per-rule-per-sentence-delegation/03a-rule-tester-tool.ts
git add src/mastra/03-per-rule-per-sentence-delegation/03a-sentence-tester-tool.ts
git commit -m "Update tool execute context types for v1 API"
```

---

### Task 6: Fix agent generate return type (if needed)

**Files:**

- Modify: `src/mastra/03-per-rule-per-sentence-delegation/agent-utils.ts`

The `generateWithRetry` wrapper accesses `result.text`, `result.object`, and `result.reasoning`. Verify these properties still exist on the v1 return type.

**Step 1: Check Agent.generate() return type**

```bash
grep -A30 'generate(' node_modules/@mastra/core/dist/agent/index.d.ts | head -40
```

**Step 2: Fix type if needed**

The function signature may need updating if the return type changed. In particular:

- `result.object` access for structured output
- `result.reasoning` access for reasoning models
- The generic type parameter `TOptions`

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/mastra/03-per-rule-per-sentence-delegation/agent-utils.ts
git commit -m "Update generateWithRetry for v1 Agent.generate() return type"
```

---

### Task 7: Fix inactive workflows (01 and 02)

**Files:**

- Modify: Files in `src/mastra/01-one-agent/`
- Modify: Files in `src/mastra/02-extract-then-hypo-test-loop/`

These workflows use `@mastra/memory` and `@mastra/libsql` directly in agent constructors. They are currently commented out in `src/mastra/index.ts`, but they still need to compile.

**Step 1: Check for type errors in workflow 01**

```bash
npx tsc --noEmit 2>&1 | grep '01-one-agent'
```

**Step 2: Fix @mastra/memory constructor changes**

Memory defaults changed in v1:

- `lastMessages`: 40 -> 10
- `semanticRecall`: enabled -> disabled
- `generateTitle`: enabled -> disabled

If these workflows explicitly set these values, no change needed. If they rely on defaults, review and set explicitly.

Also check for API renames:

- `Memory.query()` -> `Memory.recall()`
- `MastraMessageV2` -> `MastraDBMessage`

**Step 3: Fix @mastra/evals import**

The import `@mastra/evals/scorers/prebuilt` may have changed. Check:

```bash
ls node_modules/@mastra/evals/dist/scorers/ 2>/dev/null
```

**Step 4: Check for type errors in workflow 02**

```bash
npx tsc --noEmit 2>&1 | grep '02-extract-then-hypo-test-loop'
```

**Step 5: Fix any remaining errors**

**Step 6: Run full type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 7: Commit**

```bash
git add src/mastra/01-one-agent/ src/mastra/02-extract-then-hypo-test-loop/
git commit -m "Fix inactive workflows for Mastra v1 compatibility"
```

---

### Task 8: Verify Zod 4 compatibility

**Files:**

- Potentially: `package.json`

Mastra v1.8.0 depends on `@mastra/schema-compat` 1.1.3 which bridges Zod 3 and Zod 4. The project uses `zod@^4.3.6`.

**Step 1: Verify Zod version compatibility**

```bash
npm ls zod
```

Check that Mastra packages don't have conflicting Zod requirements.

**Step 2: Test schema operations**

Run the dev server briefly to verify Zod schemas work at runtime:

```bash
timeout 10 npm run dev || true
```

Check for Zod-related runtime errors.

**Step 3: Commit if package.json changed**

```bash
git add package.json package-lock.json
git commit -m "Resolve Zod version compatibility with Mastra v1"
```

---

### Task 9: Verify dev server starts

**Step 1: Start the dev server**

```bash
npm run dev
```

Expected: Server starts without errors. Look for:

- Agent registration messages
- Workflow registration messages
- No import errors
- No type errors at runtime

**Step 2: Check Studio loads**

Open the Mastra Studio URL shown in the terminal and verify:

- Agents are listed
- Workflow 03 is visible
- No JavaScript errors in console

**Step 3: Stop the server**

---

### Task 10: Build verification

**Step 1: Run production build**

```bash
npm run build
```

Expected: Build completes without errors. Output goes to `.mastra/output/`.

**Step 2: Commit final state**

```bash
git add -A
git commit -m "Verify Mastra v1 migration build passes"
```

---

### Task 11: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

**Step 1: Update version references**

Update any version-specific information in CLAUDE.md if it references specific Mastra versions or beta-specific patterns.

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md for Mastra v1 stable"
```

---

## Risk Assessment

| Risk                                       | Likelihood | Impact | Mitigation                                              |
| ------------------------------------------ | ---------- | ------ | ------------------------------------------------------- |
| Tool execute signature mismatch            | LOW        | HIGH   | Code already uses v1 pattern; type check will catch     |
| Observability constructor change           | MEDIUM     | LOW    | Isolated to one file, easy to fix                       |
| Zod 4 incompatibility                      | LOW        | HIGH   | `@mastra/schema-compat` handles bridging                |
| Memory API changes in inactive workflows   | MEDIUM     | LOW    | Workflows are commented out; fix for compilation only   |
| `getAgentById()` behavior change           | LOW        | HIGH   | Still exists in v1 docs; verify return type             |
| Runtime behavior regression                | LOW        | HIGH   | Manual testing via Studio after migration               |
| `reasoning` property removed from response | MEDIUM     | MEDIUM | Used only for logging; graceful fallback already exists |

## Notes

- The `@mastra/ai-sdk` package (v1.1.0) is NOT needed. It provides AI SDK stream format conversion utilities that this project does not use.
- The `dev:new` script in package.json uses PowerShell syntax (`powershell -Command`). This only works on Windows. Consider updating to a cross-platform alternative if needed.
- The `.mastra/` directory will need to be regenerated after the upgrade (`npm run build`).
