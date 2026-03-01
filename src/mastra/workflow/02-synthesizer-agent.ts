import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { SYNTHESIZER_INSTRUCTIONS } from './02-synthesizer-instructions';
import { RULES_TOOLS_INSTRUCTIONS } from './rules-tools-prompt';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { openrouter, TESTING_MODEL } from '../openrouter';
import { rulesTools } from './rules-tools';
import { vocabularyTools } from './vocabulary-tools';
import { testRuleWithRulesetTool } from './03a-rule-tester-tool';
import { testSentenceWithRulesetTool } from './03a-sentence-tester-tool';

// Inject tool instructions into the prompt
const instructions = SYNTHESIZER_INSTRUCTIONS.replace(
  '{{RULES_TOOLS_INSTRUCTIONS}}',
  RULES_TOOLS_INSTRUCTIONS,
).replace('{{VOCABULARY_TOOLS_INSTRUCTIONS}}', VOCABULARY_TOOLS_INSTRUCTIONS);

/**
 * Hypothesis Synthesizer Agent - merges competing rulesets from multiple perspectives
 * using score-weighted conflict resolution. Has full access to rules, vocabulary,
 * and testing tools for validation.
 */
export const synthesizerAgent = new Agent({
  id: 'hypothesis-synthesizer',
  name: '[Step 2] Hypothesis Synthesizer Agent',
  instructions: {
    role: 'system',
    content: instructions,
  },
  model: ({ requestContext }) =>
    openrouter(
      requestContext?.get('model-mode') === 'production'
        ? 'google/gemini-3-flash-preview'
        : TESTING_MODEL,
    ),
  tools: {
    ...rulesTools,
    ...vocabularyTools,
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
