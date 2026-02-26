import { readFileSync } from 'fs';
import { resolve } from 'path';
import { EXAMPLE_PROBLEMS } from './examples';

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
