import { createWorkflow } from '@mastra/core/workflows';
import {
  rawProblemInputSchema,
  questionsAnsweredSchema,
  workflowStateSchema,
} from './workflow-schemas';
import { extractionStep } from './steps/01-extract';
import { multiPerspectiveHypothesisStep } from './steps/02-hypothesize';
import { answerQuestionsStep } from './steps/03-answer';

export const solverWorkflow = createWorkflow({
  id: 'solver-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
})
  // Step 1: Extract structured problem data from raw text input.
  .then(extractionStep)
  .map(async ({ inputData }) => inputData.data!)
  // Step 2: Multi-perspective hypothesis generation (dispatch -> hypothesize -> verify -> synthesize loop)
  .then(multiPerspectiveHypothesisStep)
  // Step 3: Answer the user's questions using the validated rules and extracted vocabulary.
  .then(answerQuestionsStep)
  .commit();
