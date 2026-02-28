# Mastra Package Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade all Mastra packages to the latest stable versions and verify compatibility.

**Architecture:** Update package.json version ranges, install, type-check, and build. No code changes expected for the active workflow. Audit inactive workflows for awareness of changed Memory defaults.

**Tech Stack:** Mastra framework packages, npm, TypeScript, Next.js

**Design doc:** `docs/plans/2026-02-28-mastra-package-upgrade-design.md`

---

### Task 1: Update package.json version ranges

**Files:**
- Modify: `package.json`

**Step 1: Update dependency versions**

In `package.json`, update the `dependencies` section:

```json
"@mastra/ai-sdk": "^1.1.0",
"@mastra/core": "^1.8.0",
"@mastra/evals": "^1.1.2",
"@mastra/libsql": "^1.6.2",
"@mastra/loggers": "^1.0.2",
"@mastra/memory": "^1.5.2",
"@mastra/observability": "^1.2.1",
```

And in `devDependencies`:

```json
"mastra": "^1.3.5",
```

**Step 2: Run npm install**

Run: `npm install`
Expected: Clean install with updated packages, no errors.

**Step 3: Verify installed versions match targets**

Run: `npm ls @mastra/core @mastra/evals @mastra/libsql @mastra/memory @mastra/observability mastra 2>/dev/null | head -20`
Expected: `@mastra/evals@1.1.2`, `@mastra/libsql@1.6.2`, `@mastra/memory@1.5.2`, `@mastra/observability@1.2.1` (or newer patches).

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Upgrade Mastra packages to latest stable versions"
```

---

### Task 2: Type-check and build verification

**Files:**
- None modified — verification only

**Step 1: Run TypeScript type-check**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing CSS module errors:
- `src/app/layout.tsx: Cannot find module './globals.css'`
- `src/app/layout.tsx: Cannot find module 'streamdown/styles.css'`

No new errors. If new errors appear, they indicate breaking API changes that need code fixes.

**Step 2: Run Next.js production build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit (if any fixes were needed)**

Only needed if type-check or build revealed issues requiring code changes.

---

### Task 3: Audit inactive workflows for Memory default changes

**Files:**
- Read only (no changes unless issues found):
  - `src/mastra/01-one-agent/one-agent-solver-agent.ts`
  - `src/mastra/02-extract-then-hypo-test-loop/structured-problem-extractor-agent.ts`
  - `src/mastra/02-extract-then-hypo-test-loop/rules-hypothesizer-agent.ts`
  - `src/mastra/02-extract-then-hypo-test-loop/rules-tester-agent.ts`
  - `src/mastra/02-extract-then-hypo-test-loop/question-answerer-agent.ts`

**Step 1: Check Memory constructor usage**

Read each file above and verify:
- Memory is constructed with `new Memory({ storage: new LibSQLStore({ id, url }) })`
- No explicit `options` are set (relying on defaults)
- No calls to `memory.query()` (renamed to `recall()`) or `memory.rememberMessages()` (removed)

**Step 2: Document behavioral changes**

Note for future reference (no code change needed since workflows are inactive):
- `lastMessages` default changed from 40 to 10
- `semanticRecall` default changed from enabled to disabled
- `generateTitle` default changed from enabled to disabled
- Default scope changed from `thread` to `resource`

When re-enabling these workflows, add explicit Memory options to preserve intended behavior.

---

### Task 4: Database migration check

**Step 1: Check if mastra migrate is needed**

Run: `npx mastra migrate 2>&1 || true`

If the command succeeds or reports no migrations needed, done. If it fails because there's no existing database, that's fine — `npm run dev:new` creates a fresh one.

**Step 2: Alternatively, use fresh database**

Since `mastra.db*` is ephemeral (per CLAUDE.md), running `npm run dev:new` will clear the database and start fresh, avoiding any schema migration issues.
