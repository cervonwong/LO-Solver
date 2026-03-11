import { createWorkflowAgent } from './agent-factory';
import { QUESTION_ANSWERER_INSTRUCTIONS } from './04-question-answerer-instructions';

/**
 * Question Answerer Agent.
 * Vocabulary is passed in the prompt (read-only), no tools needed.
 */
export const questionAnswererAgent = createWorkflowAgent({
  id: 'question-answerer',
  name: '[Step 4] Question Answerer Agent',
  instructions: QUESTION_ANSWERER_INSTRUCTIONS,
  productionModel: 'google/gemini-3-flash-preview',
  claudeCodeModel: 'claude-opus-4-6',
});
