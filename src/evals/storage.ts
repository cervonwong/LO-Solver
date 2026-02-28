import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

export interface EvalProblemResult {
  problemId: string;
  title: string;
  score: number; // 0.0-1.0
  reason: string;
  totalQuestions: number;
  correctCount: number;
  details: Array<{
    questionIndex: number;
    predicted: string;
    expected: string[]; // accepted answers
    correct: boolean;
  }>;
}

export interface EvalRunResult {
  id: string; // UUID
  timestamp: string; // ISO-8601
  modelMode: 'testing' | 'production';
  gitCommit?: string | undefined; // from `git rev-parse --short HEAD`
  duration: number; // ms
  problems: EvalProblemResult[];
  summary: {
    totalProblems: number;
    meanScore: number; // average across problems
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: number; // totalCorrect / totalQuestions
  };
}

/** Directory where eval run result JSON files are stored, relative to cwd. */
const RESULTS_DIR = resolve(process.cwd(), 'evals', 'results');

/**
 * Format an ISO timestamp for use in a filename.
 * Replaces colons with dashes so the name is valid on all file systems.
 */
function filenameSafeTimestamp(iso: string): string {
  return iso.replace(/:/g, '-');
}

/**
 * Persist an eval run result as a pretty-printed JSON file.
 * Creates the `evals/results/` directory if it does not exist.
 */
export async function saveEvalRun(result: EvalRunResult): Promise<void> {
  await mkdir(RESULTS_DIR, { recursive: true });
  const filename = `${filenameSafeTimestamp(result.timestamp)}_${result.id}.json`;
  const filepath = join(RESULTS_DIR, filename);
  await writeFile(filepath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
}

/**
 * Load all eval run results from disk, sorted by timestamp descending (newest first).
 * Returns an empty array if the results directory does not exist.
 */
export async function loadEvalRuns(): Promise<EvalRunResult[]> {
  let entries: string[];
  try {
    entries = await readdir(RESULTS_DIR);
  } catch {
    return [];
  }

  const jsonFiles = entries.filter((f) => f.endsWith('.json'));
  const results: EvalRunResult[] = [];

  for (const file of jsonFiles) {
    const content = await readFile(join(RESULTS_DIR, file), 'utf-8');
    results.push(JSON.parse(content) as EvalRunResult);
  }

  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return results;
}

/**
 * Load a single eval run result by its ID.
 * Returns null if no matching file is found.
 */
export async function loadEvalRun(id: string): Promise<EvalRunResult | null> {
  let entries: string[];
  try {
    entries = await readdir(RESULTS_DIR);
  } catch {
    return null;
  }

  const match = entries.find((f) => f.endsWith(`_${id}.json`));
  if (!match) {
    return null;
  }

  const content = await readFile(join(RESULTS_DIR, match), 'utf-8');
  return JSON.parse(content) as EvalRunResult;
}
