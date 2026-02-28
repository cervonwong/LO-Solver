import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loadLinguiniQuestions, buildLinguiniProblemText, type LinguiniQuestion } from '@examples/index';
import { EXAMPLE_PROBLEMS, getExampleLabel, getLinguiniLabel } from './examples';

/**
 * Read the content of an example problem input file.
 * Server-side only (uses fs).
 */
export function readExampleProblem(id: string): string {
  const example = EXAMPLE_PROBLEMS.find((e) => e.id === id);
  if (!example) {
    throw new Error(`Example problem not found: ${id}`);
  }
  const filePath = resolve(process.cwd(), 'examples', example.inputFile);
  return readFileSync(filePath, 'utf-8');
}

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
export function getAllExampleOptions(): Array<{ id: string; label: string; type: 'curated' | 'linguini' }> {
  const curated = EXAMPLE_PROBLEMS.map((e) => ({ id: e.id, label: getExampleLabel(e), type: 'curated' as const }));
  const linguini = getLinguiniQuestions().map((q) => ({ id: q.id, label: getLinguiniLabel(q), type: 'linguini' as const }));
  return [...curated, ...linguini];
}
