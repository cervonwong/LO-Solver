import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';

import type { ExtractionScore, RuleQualityScore } from './intermediate-scorers';

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

  /** Zero-shot comparison results (only present in comparison mode) */
  zeroShot?: {
    score: number;
    reason: string;
    correctCount: number;
    details: Array<{
      questionIndex: number;
      predicted: string;
      expected: string[];
      correct: boolean;
    }>;
  };

  /** Intermediate step scores (always captured when workflow succeeds) */
  intermediateScores?: {
    extraction: ExtractionScore;
    ruleQuality: RuleQualityScore;
  };
}

export interface EvalRunResult {
  id: string; // UUID
  timestamp: string; // ISO-8601
  modelMode: 'testing' | 'production';
  gitCommit?: string | undefined; // from `git rev-parse --short HEAD`
  duration: number; // ms
  problems: EvalProblemResult[];

  /** Whether this run included comparison mode */
  comparison?: boolean;

  summary: {
    totalProblems: number;
    meanScore: number; // average across problems
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: number; // totalCorrect / totalQuestions

    /** Zero-shot summary (only present in comparison mode) */
    zeroShot?: {
      meanScore: number;
      overallAccuracy: number;
      totalCorrect: number;
    };
    /** Accuracy delta: workflow minus zero-shot (only in comparison mode) */
    delta?: {
      meanScore: number;
      overallAccuracy: number;
    };
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
    try {
      const content = await readFile(join(RESULTS_DIR, file), 'utf-8');
      results.push(JSON.parse(content) as EvalRunResult);
    } catch (error) {
      console.warn(
        `Skipping corrupt eval result file ${file}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return results;
}

/**
 * Load a single eval run result by its ID.
 * Returns null if no matching file is found.
 */
export async function loadEvalRun(id: string): Promise<EvalRunResult | null> {
  // Validate ID format to prevent path traversal (expect UUID format)
  if (!/^[a-f0-9-]+$/i.test(id)) {
    return null;
  }

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

  // Ensure the resolved path stays within RESULTS_DIR
  const resolvedPath = resolve(RESULTS_DIR, match);
  if (!resolvedPath.startsWith(resolve(RESULTS_DIR) + sep)) {
    return null;
  }

  try {
    const content = await readFile(resolvedPath, 'utf-8');
    return JSON.parse(content) as EvalRunResult;
  } catch (error) {
    console.warn(
      `Failed to parse eval run ${id}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
