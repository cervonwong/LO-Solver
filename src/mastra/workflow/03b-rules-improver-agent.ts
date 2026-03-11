import { createWorkflowAgent } from './agent-factory';
import { RULES_IMPROVER_INSTRUCTIONS } from './03b-rules-improver-instructions';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { vocabularyTools } from './vocabulary-tools';
import { testRuleWithRulesetTool } from './03a-rule-tester-tool';
import { testSentenceWithRulesetTool } from './03a-sentence-tester-tool';

// Inject the vocabulary tools instructions into the prompt
const instructions = RULES_IMPROVER_INSTRUCTIONS.replace(
  '{{VOCABULARY_TOOLS_INSTRUCTIONS}}',
  VOCABULARY_TOOLS_INSTRUCTIONS,
);

/**
 * Rules Improver Agent - improves rules based on verifier feedback.
 * Uses static vocabulary tools that read state from requestContext.
 * Has access to testing tools to validate revised rules before committing.
 */
export const rulesImproverAgent = createWorkflowAgent({
  id: 'rules-improver',
  name: '[Step 3] Rules Improver Agent',
  instructions: { role: 'system', content: instructions },
  productionModel: 'google/gemini-3-flash-preview',
  claudeCodeModel: 'opus',
  tools: {
    ...vocabularyTools,
    testRule: testRuleWithRulesetTool,
    testSentence: testSentenceWithRulesetTool,
  },
});
