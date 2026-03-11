import { createWorkflowAgent } from './agent-factory';
import { VERIFIER_ORCHESTRATOR_INSTRUCTIONS } from './03a-verifier-orchestrator-instructions';
import { testRuleTool } from './03a-rule-tester-tool';
import { testSentenceTool } from './03a-sentence-tester-tool';

/**
 * Verifier Orchestrator Agent - tests rules and sentences against the dataset.
 * Uses static tester tools that read context from requestContext.
 */
export const verifierOrchestratorAgent = createWorkflowAgent({
  id: 'verifier-orchestrator',
  name: '[Step 3] Verifier Orchestrator Agent',
  instructions: VERIFIER_ORCHESTRATOR_INSTRUCTIONS,
  productionModel: 'google/gemini-3-flash-preview',
  claudeCodeModel: 'claude-opus-4-6',
  tools: {
    testRule: testRuleTool,
    testSentence: testSentenceTool,
  },
});
