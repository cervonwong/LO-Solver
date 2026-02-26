import { EXAMPLE_PROBLEMS, type ExampleProblemMeta } from '@examples/index';

export { EXAMPLE_PROBLEMS, type ExampleProblemMeta };

/** Derive the UI display label from example metadata. */
export function getExampleLabel(e: ExampleProblemMeta): string {
  const year = e.problemUrl.match(/\d{4}/)?.[0] ?? '';
  return `${e.language} (${e.source} ${year})`;
}
