import { createWorkflowAgent } from './agent-factory';
import { VERIFIER_FEEDBACK_EXTRACTOR_INSTRUCTIONS } from './03a2-verifier-feedback-extractor-instructions';

/** Verifier Feedback Extractor Agent - extracts structured feedback from verifier output. */
export const verifierFeedbackExtractorAgent = createWorkflowAgent({
  id: 'verifier-feedback-extractor',
  name: '[Step 3] Verifier Feedback Extractor Agent',
  instructions: { role: 'system', content: VERIFIER_FEEDBACK_EXTRACTOR_INSTRUCTIONS },
  productionModel: 'openai/gpt-5-mini',
  claudeCodeModel: 'sonnet',
});
