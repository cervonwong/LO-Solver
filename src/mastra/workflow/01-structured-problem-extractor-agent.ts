import { createWorkflowAgent } from './agent-factory';
import { STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS } from './01-structured-problem-extractor-instructions';

/** Structured Problem Extractor Agent - parses raw problem text into structured context/dataset/questions. */
export const structuredProblemExtractorAgent = createWorkflowAgent({
  id: 'structured-problem-extractor',
  name: '[Step 1] Structured Problem Extractor Agent',
  instructions: STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS,
  productionModel: 'openai/gpt-5-mini',
  claudeCodeModel: 'sonnet',
});
