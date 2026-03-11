import { createWorkflowAgent } from './agent-factory';
import { IMPROVER_DISPATCHER_INSTRUCTIONS } from './02-improver-dispatcher-instructions';

/**
 * Improver Dispatcher Agent - analyzes gaps and weaknesses in the current ruleset
 * after synthesis and generates targeted perspectives for round 2+ exploration.
 * No tools needed; output is structured via structuredOutput at call site.
 */
export const improverDispatcherAgent = createWorkflowAgent({
  id: 'improver-dispatcher',
  name: '[Step 2] Improver Dispatcher Agent',
  instructions: { role: 'system', content: IMPROVER_DISPATCHER_INSTRUCTIONS },
  productionModel: 'google/gemini-3-flash-preview',
  claudeCodeModel: 'claude-opus-4-6',
});
