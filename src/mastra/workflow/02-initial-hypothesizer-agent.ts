import { createWorkflowAgent } from './agent-factory';
import { INITIAL_HYPOTHESIZER_INSTRUCTIONS } from './02-initial-hypothesizer-instructions';
import { RULES_TOOLS_INSTRUCTIONS } from './rules-tools-prompt';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { rulesTools } from './rules-tools';
import { vocabularyTools } from './vocabulary-tools';
import { testRuleWithRulesetTool } from './03a-rule-tester-tool';
import { testSentenceWithRulesetTool } from './03a-sentence-tester-tool';

// Inject the tool instructions into the prompt
const instructions = INITIAL_HYPOTHESIZER_INSTRUCTIONS.replace(
  '{{RULES_TOOLS_INSTRUCTIONS}}',
  RULES_TOOLS_INSTRUCTIONS,
).replace('{{VOCABULARY_TOOLS_INSTRUCTIONS}}', VOCABULARY_TOOLS_INSTRUCTIONS);

/**
 * Initial Hypothesizer Agent - generates rules and vocabulary from structured problem.
 * Uses rules and vocabulary CRUD tools that read state from requestContext.
 * Has access to testing tools to validate rules before committing.
 */
export const initialHypothesizerAgent = createWorkflowAgent({
  id: 'initial-hypothesizer',
  name: '[Step 2] Initial Hypothesizer Agent',
  instructions: { role: 'system', content: instructions },
  productionModel: 'google/gemini-3-flash-preview',
  claudeCodeProductionModel: 'opus',
  tools: {
    ...vocabularyTools,
    ...rulesTools,
    testRule: testRuleWithRulesetTool,
    testSentence: testSentenceWithRulesetTool,
  },
});
