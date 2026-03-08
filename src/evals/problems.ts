import {
  loadLinguiniQuestions,
  buildLinguiniProblemText,
  EXAMPLE_PROBLEMS,
  loadExampleGroundTruth,
  readExampleInput,
} from '@examples/index';
import type { LinguiniQuestion } from '@examples/index';

export interface GroundTruthAnswer {
  questionIndex: number; // 0-based position
  acceptedAnswers: string[]; // all acceptable answers (1 for single, N for alternatives)
}

export interface EvalProblem {
  id: string; // e.g., "iol-2023-1"
  title: string; // e.g., "Guazacapán Xinka"
  source: 'linguini' | 'hand-curated';
  rawProblemText: string; // full problem text for workflow input
  groundTruth: GroundTruthAnswer[]; // expected answers in order
}

/**
 * Stable set of Linguini question IDs selected for evaluation.
 * Criteria: task_type is translation or fill_blanks, >= 5 total answer items,
 * different languages and years for variety.
 */
const SELECTED_QUESTION_IDS = [
  'iol-2023-2', // Apurinã (translation, 9 answers, has alternative answers)
  'iol-2023-3', // Coastal Marind (translation, 10 answers)
  'iol-2009-5', // Nahuatl (translation, 11 answers, has alternative answers)
  'iol-2016-3', // Kunuz Nubian (translation, 10 answers)
];

/**
 * Build ground truth answers from a LinguiniQuestion's parts.
 *
 * The `answer` field on each LinguiniEntry can be:
 * - `string`: a single answer for a single question
 * - `string[]` (flat): each element is the sole accepted answer for that index
 * - `string[][]`: each inner array contains alternative accepted answers for that index
 */
function buildGroundTruth(question: LinguiniQuestion): GroundTruthAnswer[] {
  const results: GroundTruthAnswer[] = [];
  let globalIndex = 0;

  for (const part of question.parts) {
    const { answer } = part;

    if (typeof answer === 'string') {
      // Bare string: single answer, single question
      results.push({ questionIndex: globalIndex, acceptedAnswers: [answer] });
      globalIndex++;
    } else if (Array.isArray(answer) && answer.length > 0 && Array.isArray(answer[0])) {
      // string[][]: each inner array is a set of alternatives
      for (const alternatives of answer as string[][]) {
        results.push({ questionIndex: globalIndex, acceptedAnswers: alternatives });
        globalIndex++;
      }
    } else if (Array.isArray(answer)) {
      // string[]: each element is a single accepted answer
      for (const singleAnswer of answer as string[]) {
        results.push({ questionIndex: globalIndex, acceptedAnswers: [singleAnswer] });
        globalIndex++;
      }
    }
  }

  return results;
}

/** Load the evaluation problem set from the Linguini dataset and hand-curated examples. */
export function loadEvalProblems(): EvalProblem[] {
  const allQuestions = loadLinguiniQuestions();
  const selectedIds = new Set(SELECTED_QUESTION_IDS);

  const selected = allQuestions.filter((q) => selectedIds.has(q.id));

  const linguiniProblems = selected.map((question) => ({
    id: question.id,
    title: question.title,
    source: 'linguini' as const,
    rawProblemText: buildLinguiniProblemText(question),
    groundTruth: buildGroundTruth(question),
  }));

  const handCurated = EXAMPLE_PROBLEMS.filter((e) => e.groundTruthFile).map((e) => ({
    id: e.id,
    title: e.language,
    source: 'hand-curated' as const,
    rawProblemText: readExampleInput(e),
    groundTruth: loadExampleGroundTruth(e).map((answer, i) => ({
      questionIndex: i,
      acceptedAnswers: [answer],
    })),
  }));

  return [...linguiniProblems, ...handCurated];
}
