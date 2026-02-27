# Linguini Dataset Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the Linguini benchmark (160 IOL problems) into the example picker alongside existing UKLO/Onling examples.

**Architecture:** The enriched JSONL lives at `examples/linguini/dataset_enriched.jsonl`. A server-side loader reads and groups the 160 entries into 73 questions. These are merged into the existing `EXAMPLE_PROBLEMS` array and served by the same `/api/examples/[id]` endpoint. No workflow changes — context + queries are combined into `rawProblemText`.

**Tech Stack:** TypeScript, Next.js, existing examples infrastructure

---

### Task 1: Add Linguini data files

**Files:**
- Create: `examples/linguini/dataset_enriched.jsonl`
- Create: `examples/linguini/README.md`

**Step 1: Copy enriched dataset into project**

Copy the already-generated file from `/mnt/c/Users/cervo/Downloads/dataset/dataset_enriched.jsonl` to `examples/linguini/dataset_enriched.jsonl`.

**Step 2: Create attribution README**

Create `examples/linguini/README.md`:

```markdown
# Linguini Dataset

IOL individual contest problems (2003–2023) from the Linguini benchmark, enriched with IOL metadata.

## Attribution

**Dataset:** [facebook/linguini](https://huggingface.co/datasets/facebook/linguini)
**Paper:** Eduardo Sánchez, Belen Alastruey, Christophe Ropers, Pontus Stenetorp, Mikel Artetxe, Marta R. Costa-jussà. "Linguini: A benchmark for language-agnostic linguistic reasoning." [arXiv:2409.12126](https://arxiv.org/abs/2409.12126)
**License:** [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
**Organization:** AI at Meta

## Enrichment

Each JSONL entry has the original Linguini fields plus IOL metadata added by this project:

- `iol_year` — Competition year (e.g. 2023)
- `iol_question_number` — Individual problem number (1–5)
- `iol_question_title` — Problem title from IOL website (e.g. "Guazacapán Xinka")
- `iol_url` — Direct link to the problem on ioling.org
- `iol_location` — Host city of that year's IOL
```

**Step 3: Commit**

```bash
git add examples/linguini/
git commit -m "Add Linguini dataset with IOL metadata and attribution"
```

---

### Task 2: Create Linguini data types and loader

**Files:**
- Modify: `examples/index.ts` — add Linguini types, loader, and merged export

**Step 1: Read the current file**

Read `examples/index.ts` to confirm current state.

**Step 2: Add Linguini types and loader**

Add to `examples/index.ts`:

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';

/** A single JSONL entry from the Linguini dataset. */
export interface LinguiniEntry {
  id: string;
  context: string;
  query: string;
  answer: string[] | string[][] | string;
  explanation: string;
  work_lang: string;
  task_lang: string[];
  task_type: string;
  eval_type: string;
  iol_year: number;
  iol_question_number: number;
  iol_question_title: string;
  iol_url: string;
  iol_location: string;
}

/** A grouped Linguini question (1+ sub-parts sharing the same IOL question). */
export interface LinguiniQuestion {
  id: string; // e.g. "iol-2023-1"
  year: number;
  questionNumber: number;
  title: string;
  url: string;
  location: string;
  parts: LinguiniEntry[];
}

/** Load and group Linguini dataset entries by question. */
export function loadLinguiniQuestions(): LinguiniQuestion[] {
  const filePath = resolve(__dirname, 'linguini', 'dataset_enriched.jsonl');
  const raw = readFileSync(filePath, 'utf-8');
  const entries: LinguiniEntry[] = raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

  const grouped = new Map<string, LinguiniQuestion>();
  for (const entry of entries) {
    const key = `iol-${entry.iol_year}-${entry.iol_question_number}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        year: entry.iol_year,
        questionNumber: entry.iol_question_number,
        title: entry.iol_question_title,
        url: entry.iol_url,
        location: entry.iol_location,
        parts: [],
      });
    }
    grouped.get(key)!.parts.push(entry);
  }

  return Array.from(grouped.values()).sort(
    (a, b) => a.year - b.year || a.questionNumber - b.questionNumber,
  );
}

/** Build the problem text for a Linguini question (context + all sub-part queries). */
export function buildLinguiniProblemText(question: LinguiniQuestion): string {
  // All parts share the same context; queries differ
  const context = question.parts[0].context;
  const queries = question.parts.map((p) => p.query);
  return `${context}\n\n${queries.join('\n\n')}`;
}
```

**Note:** `loadLinguiniQuestions` and `buildLinguiniProblemText` use `fs` — they will only be called server-side. The existing `ExampleProblemMeta` and `EXAMPLE_PROBLEMS` stay untouched.

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new errors (the pre-existing `globals.css` error is fine).

**Step 4: Commit**

```bash
git add examples/index.ts
git commit -m "Add Linguini data types and server-side loader"
```

---

### Task 3: Create unified example list for the picker

The picker currently receives `{ id: string; label: string }[]`. We need to merge Linguini questions into this list without changing the `ExampleProblemMeta` type or the existing examples.

**Files:**
- Modify: `src/lib/examples.ts` — add label generation for Linguini entries
- Modify: `src/lib/examples-server.ts` — add Linguini problem text reading
- Modify: `src/app/api/examples/[id]/route.ts` — handle Linguini IDs

**Step 1: Update `src/lib/examples.ts`**

Add a function to generate picker options from Linguini questions. Since `loadLinguiniQuestions` uses `fs`, the picker labels need to be generated server-side and sent to the client. However, the current page.tsx builds labels client-side from `EXAMPLE_PROBLEMS`.

The simplest approach: keep the label generation pure (no fs), and have the server precompute the full picker list.

Add to `src/lib/examples.ts`:

```typescript
import { type LinguiniQuestion } from '@examples/index';

/** Derive the UI display label for a Linguini question. */
export function getLinguiniLabel(q: LinguiniQuestion): string {
  return `IOL ${q.year} #${q.questionNumber} — ${q.title}`;
}
```

**Step 2: Update `src/lib/examples-server.ts`**

Add server-side loading and text building for Linguini examples:

```typescript
import { loadLinguiniQuestions, buildLinguiniProblemText, type LinguiniQuestion } from '@examples/index';
import { getLinguiniLabel } from './examples';

let _linguiniCache: LinguiniQuestion[] | null = null;

function getLinguiniQuestions(): LinguiniQuestion[] {
  if (!_linguiniCache) {
    _linguiniCache = loadLinguiniQuestions();
  }
  return _linguiniCache;
}

/** Read the combined problem text for a Linguini question by its ID (e.g. "iol-2023-1"). */
export function readLinguiniProblem(id: string): string {
  const question = getLinguiniQuestions().find((q) => q.id === id);
  if (!question) {
    throw new Error(`Linguini question not found: ${id}`);
  }
  return buildLinguiniProblemText(question);
}

/** Get all example picker options (hand-curated + Linguini). */
export function getAllExampleOptions(): Array<{ id: string; label: string }> {
  const curated = EXAMPLE_PROBLEMS.map((e) => ({ id: e.id, label: getExampleLabel(e) }));
  const linguini = getLinguiniQuestions().map((q) => ({ id: q.id, label: getLinguiniLabel(q) }));
  return [...curated, ...linguini];
}
```

Import `getExampleLabel` from `./examples` (already imported in this file via `EXAMPLE_PROBLEMS`; add `getExampleLabel` to the import).

**Step 3: Update API route**

Modify `src/app/api/examples/[id]/route.ts` to handle both types:

```typescript
import { NextResponse } from 'next/server';
import { EXAMPLE_PROBLEMS } from '@/lib/examples';
import { readExampleProblem, readLinguiniProblem } from '@/lib/examples-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Check if this is a Linguini ID (format: "iol-YYYY-N")
  if (id.startsWith('iol-')) {
    try {
      const text = readLinguiniProblem(id);
      return NextResponse.json({ text });
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  // Existing hand-curated examples
  const example = EXAMPLE_PROBLEMS.find((e) => e.id === id);
  if (!example) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const text = readExampleProblem(id);
  return NextResponse.json({ text });
}
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/lib/examples.ts src/lib/examples-server.ts src/app/api/examples/\[id\]/route.ts
git commit -m "Add Linguini support to example loading and API route"
```

---

### Task 4: Create API endpoint for picker options

The picker currently builds its list client-side from the static `EXAMPLE_PROBLEMS` import. With 73 Linguini questions added (loaded from JSONL at runtime), we need a server endpoint to provide the full list.

**Files:**
- Create: `src/app/api/examples/route.ts`
- Modify: `src/components/problem-input.tsx` — fetch options from API
- Modify: `src/app/page.tsx` — pass options from server or fetch dynamically

**Step 1: Create the list endpoint**

Create `src/app/api/examples/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getAllExampleOptions } from '@/lib/examples-server';

export async function GET() {
  const options = getAllExampleOptions();
  return NextResponse.json({ examples: options });
}
```

**Step 2: Update page.tsx to fetch examples**

Replace the static `examples` const in `src/app/page.tsx`:

```typescript
// Remove the static import of EXAMPLE_PROBLEMS and getExampleLabel
// Remove: const examples = EXAMPLE_PROBLEMS.map(...)

// Add state for examples
const [examples, setExamples] = useState<Array<{ id: string; label: string }>>([]);

// Fetch examples on mount
useEffect(() => {
  fetch('/api/examples')
    .then((res) => res.json())
    .then((data) => setExamples(data.examples))
    .catch(() => {});
}, []);
```

Remove the `EXAMPLE_PROBLEMS` and `getExampleLabel` imports from `@/lib/examples` (line 17).

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/api/examples/route.ts src/app/page.tsx
git commit -m "Fetch example picker options from server API"
```

---

### Task 5: Manual verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify picker shows all examples**

Open `http://localhost:3000`. The example picker should show:
- 3 existing examples (Saisiyat, Forest Enets, Okinawan)
- 73 Linguini questions (IOL 2003 #3 — Basque Dates, ..., IOL 2023 #5 — Supyire)
- Total: 76 entries

**Step 3: Select a Linguini problem**

Click a Linguini example (e.g. "IOL 2023 #1 — Guazacapán Xinka"). Verify:
- Loading overlay appears briefly
- Textarea populates with the combined context + queries
- The text looks correct (context paragraph followed by the query questions)

**Step 4: Select an existing example**

Click "Saisiyat (UKLO 2025)". Verify it still loads correctly.

**Step 5: Run a solve (optional)**

Submit a Linguini problem and verify the workflow runs normally.

---

### Task 6: Final commit and plan update

**Step 1: Update plan index**

Change status of this plan in `docs/plans/main.md` from `Pending` to `Done`.

**Step 2: Final commit**

```bash
git add docs/plans/main.md
git commit -m "Mark Linguini integration plan as done"
```
