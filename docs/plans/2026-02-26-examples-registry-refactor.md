# Examples Registry Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `examples/index.ts` the single source of truth for example problem metadata, eliminating the duplicated registry in `src/lib/examples.ts`.

**Architecture:** `examples/index.ts` becomes a typed export with all metadata (id, language, source, files, URLs, notes). A tsconfig path alias `@examples/*` makes it importable. `src/lib/examples.ts` becomes a thin re-export with a derived `getExampleLabel()` helper. Consumer code continues importing from `@/lib/examples` so churn is minimal.

**Tech Stack:** TypeScript, Next.js 15

**No test framework is configured.** Verification is via `npx tsc --noEmit`.

---

### Task 1: Fix the Saisiyat solution filename typo

The solution file is named `Sasiyat` (missing the `i`), while the input file correctly uses `Saisiyat`. Fix the filename so they're consistent.

**Files:**

- Rename: `examples/uklo_2025R1P3_MoSy_Rosetta_Austr_Sasiyat_Solution.md` → `examples/uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Solution.md`

**Step 1: Rename the file**

```bash
git mv examples/uklo_2025R1P3_MoSy_Rosetta_Austr_Sasiyat_Solution.md examples/uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Solution.md
```

**Step 2: Commit**

```bash
git add -A
git commit -m "Fix Saisiyat solution filename typo (Sasiyat → Saisiyat)"
```

---

### Task 2: Add `@examples` path alias to tsconfig

Make `examples/*.ts` part of the TypeScript compilation and add a path alias for clean imports.

**Files:**

- Modify: `tsconfig.json`

**Step 1: Add path alias and include pattern**

In `tsconfig.json`, add `@examples/*` to `paths` and `examples/**/*.ts` to `include`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@examples/*": ["./examples/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    "examples/**/*.ts",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ]
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors. `examples/index.ts` may now show errors since it's a bare JSON array — that's expected and will be fixed in the next task.

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "Add @examples path alias and include examples in TS compilation"
```

---

### Task 3: Rewrite `examples/index.ts` as a typed export

Replace the bare JSON array with a proper TypeScript module exporting a typed array with all metadata plus new `id` and `language` fields.

**Files:**

- Rewrite: `examples/index.ts`

**Step 1: Rewrite the file**

```typescript
export interface ExampleProblemMeta {
  id: string;
  language: string;
  source: string;
  inputFile: string;
  solutionFile: string;
  sourceUrl: string;
  problemUrl: string;
  solutionUrl: string;
  notes?: string;
}

export const EXAMPLE_PROBLEMS: ExampleProblemMeta[] = [
  {
    id: 'saisiyat',
    language: 'Saisiyat',
    source: 'UKLO',
    inputFile: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Input.md',
    solutionFile: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Solution.md',
    sourceUrl: 'https://uklo.org/',
    problemUrl: 'https://www.uklo.org/wp-content/uploads/2025/04/2025R1-3-Saisiyat.pdf',
    solutionUrl: 'https://www.uklo.org/wp-content/uploads/2025/04/2025R1-3-Saisiyat.pdf',
    notes:
      "Changed No. 13 input description from 'sends' to 'orders' to better reflect the intended meaning.",
  },
  {
    id: 'forest-enets',
    language: 'Forest Enets',
    source: 'Onling.org',
    inputFile: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Input.md',
    solutionFile: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Solution.md',
    sourceUrl: 'https://onling.org/',
    problemUrl: 'https://onling.org/contests/student-2024/online/eng/',
    solutionUrl: 'https://onling.org/contests/student-2024/files/solutions.pdf',
  },
  {
    id: 'okinawan',
    language: 'Okinawan',
    source: 'Onling.org',
    inputFile: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Input.md',
    solutionFile: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Solution.md',
    sourceUrl: 'https://onling.org/',
    problemUrl: 'https://onling.org/contests/student-2024/online/eng/',
    solutionUrl: 'https://onling.org/contests/student-2024/files/solutions.pdf',
  },
];
```

Note: the `inputFile` for Saisiyat is corrected from `Sasiyat` to `Saisiyat` (matching the actual filename on disk).

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from `examples/index.ts`. There may be an unused-export warning, which is fine.

**Step 3: Commit**

```bash
git add examples/index.ts
git commit -m "Rewrite examples/index.ts as typed export with full metadata"
```

---

### Task 4: Convert `src/lib/examples.ts` to a thin re-export

Replace the duplicated data with imports from `@examples/index` and add a `getExampleLabel()` helper.

**Files:**

- Rewrite: `src/lib/examples.ts`

**Step 1: Rewrite the file**

```typescript
import { EXAMPLE_PROBLEMS, type ExampleProblemMeta } from '@examples/index';

export { EXAMPLE_PROBLEMS, type ExampleProblemMeta };

/** Derive the UI display label from example metadata. */
export function getExampleLabel(e: ExampleProblemMeta): string {
  const year = e.problemUrl.match(/\d{4}/)?.[0] ?? '';
  return `${e.language} (${e.source} ${year})`;
}
```

The old `ExampleProblem` interface and duplicated `EXAMPLE_PROBLEMS` array are removed entirely.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Errors in consumers that still reference the old `ExampleProblem` type. These are fixed in the next tasks.

**Step 3: Commit**

```bash
git add src/lib/examples.ts
git commit -m "Replace duplicated examples registry with re-export from @examples"
```

---

### Task 5: Update `src/lib/examples-server.ts`

Update the import to use the re-exported type.

**Files:**

- Modify: `src/lib/examples-server.ts`

**Step 1: Update the file**

No logic changes needed — just confirm the import still works. The file imports `EXAMPLE_PROBLEMS` from `./examples`, which now re-exports from `@examples/index`. The type of each entry is `ExampleProblemMeta` which still has `id` and `inputFile`, so `readExampleProblem` works unchanged.

If there are any type errors (e.g. the old `ExampleProblem` type was referenced explicitly), update to `ExampleProblemMeta`.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from this file.

**Step 3: Commit (if changes were needed)**

```bash
git add src/lib/examples-server.ts
git commit -m "Update examples-server imports for new registry types"
```

---

### Task 6: Update `src/app/page.tsx`

Use `getExampleLabel()` instead of accessing a `label` property that no longer exists.

**Files:**

- Modify: `src/app/page.tsx`

**Step 1: Update the import and label mapping**

Change line 18 from:

```typescript
import { EXAMPLE_PROBLEMS } from '@/lib/examples';
```

to:

```typescript
import { EXAMPLE_PROBLEMS, getExampleLabel } from '@/lib/examples';
```

Change line 45 from:

```typescript
const examples = EXAMPLE_PROBLEMS.map((e) => ({ id: e.id, label: e.label }));
```

to:

```typescript
const examples = EXAMPLE_PROBLEMS.map((e) => ({ id: e.id, label: getExampleLabel(e) }));
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Use getExampleLabel for derived display labels"
```

---

### Task 7: Update `src/app/api/examples/[id]/route.ts`

The route uses `EXAMPLE_PROBLEMS.find()` which still works since `id` is present on `ExampleProblemMeta`. Verify no type errors remain.

**Files:**

- Modify (if needed): `src/app/api/examples/[id]/route.ts`

**Step 1: Verify the file compiles**

The current code imports `EXAMPLE_PROBLEMS` from `@/lib/examples` and calls `.find((e) => e.id === id)`. The `ExampleProblemMeta` type has `id: string`, so this should work with no changes.

If the old `ExampleProblem` type was referenced explicitly, update to `ExampleProblemMeta`.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit (if changes were needed)**

```bash
git add src/app/api/examples/[id]/route.ts
git commit -m "Update examples API route for new registry types"
```

---

### Task 8: Final verification

**Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: Clean pass (no errors).

**Step 2: Visual verification**

Run: `npm run dev`
Load each example from the dropdown. Verify the labels display correctly:

- "Saisiyat (UKLO 2025)"
- "Forest Enets (Onling.org 2024)"
- "Okinawan (Onling.org 2024)"

Note: labels may differ slightly from the old hardcoded ones (e.g. "Onling.org" vs "Onling") since they're now derived from the `source` field. Adjust `getExampleLabel()` if needed.

**Step 3: Squash or leave as-is**

The task commits are granular. Squash into a single commit if preferred, or leave as-is for traceability.
