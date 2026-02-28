import { EXAMPLE_PROBLEMS, type ExampleProblemMeta, type LinguiniQuestion } from '@examples/index';

export { EXAMPLE_PROBLEMS, type ExampleProblemMeta };

/** Derive the UI display label from example metadata. */
export function getExampleLabel(e: ExampleProblemMeta): string {
  const year = e.problemUrl.match(/\d{4}/)?.[0] ?? '';
  return `${e.language} (${e.source} ${year})`;
}

/** Derive the UI display label for a Linguini question. */
export function getLinguiniLabel(q: LinguiniQuestion): string {
  return `IOL ${q.year} #${q.questionNumber} — ${q.title}`;
}
