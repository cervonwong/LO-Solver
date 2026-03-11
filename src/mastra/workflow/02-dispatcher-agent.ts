import { createWorkflowAgent } from './agent-factory';
import { DISPATCHER_INSTRUCTIONS } from './02-dispatcher-instructions';

/**
 * Perspective Dispatcher Agent - analyzes structured problem data and generates
 * distinct linguistic perspectives for parallel hypothesizer exploration.
 * No tools needed; output is structured via structuredOutput at call site.
 */
export const dispatcherAgent = createWorkflowAgent({
  id: 'perspective-dispatcher',
  name: '[Step 2] Perspective Dispatcher Agent',
  instructions: { role: 'system', content: DISPATCHER_INSTRUCTIONS },
  productionModel: 'google/gemini-3-flash-preview',
  claudeCodeModel: 'opus',
});
