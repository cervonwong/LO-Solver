import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_IMPROVER_INSTRUCTIONS } from './03b-rules-improver-instructions';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { openrouter, TESTING_MODEL } from '../openrouter';
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
export const rulesImproverAgent = new Agent({
  id: 'rules-improver',
  name: '[Step 3] Rules Improver Agent',
  instructions: {
    role: 'system',
    content: instructions,
  },
  // model: openrouter('google/gemini-3-pro-preview'),
  model: ({ requestContext }) =>
    openrouter(
      requestContext?.get('model-mode') === 'production'
        ? 'google/gemini-3-flash-preview'
        : TESTING_MODEL,
    ),
  tools: {
    ...vocabularyTools,
    // Testing tools renamed for simpler agent usage:
    // - testRule: actually testRuleWithRulesetTool (accepts ruleset param)
    // - testSentence: actually testSentenceWithRulesetTool (accepts ruleset param)
    testRule: testRuleWithRulesetTool,
    testSentence: testSentenceWithRulesetTool,
  },
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: false,
      preserveEmojis: true,
      collapseWhitespace: true,
      trim: true,
    }),
  ],
});
