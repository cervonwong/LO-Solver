import { createWorkflowAgent } from './agent-factory';
import { RULES_IMPROVEMENT_EXTRACTOR_INSTRUCTIONS } from './03b2-rules-improvement-extractor-instructions';

/** Rules Improvement Extractor Agent - extracts structured rule improvements from improver output. */
export const rulesImprovementExtractorAgent = createWorkflowAgent({
  id: 'rules-improvement-extractor',
  name: '[Step 3] Rules Improvement Extractor Agent',
  instructions: { role: 'system', content: RULES_IMPROVEMENT_EXTRACTOR_INSTRUCTIONS },
  productionModel: 'openai/gpt-5-mini',
});
