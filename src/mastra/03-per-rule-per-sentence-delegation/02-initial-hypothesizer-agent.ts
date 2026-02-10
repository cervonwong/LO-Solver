import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { INITIAL_HYPOTHESIZER_INSTRUCTIONS } from './02-initial-hypothesizer-instructions';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { openrouter } from '../openrouter';
import { vocabularyTools } from './vocabulary-tools';
import { testRuleWithRulesetTool } from './03a-rule-tester-tool';
import { testSentenceWithRulesetTool } from './03a-sentence-tester-tool';

// Inject the vocabulary tools instructions into the prompt
const instructions = INITIAL_HYPOTHESIZER_INSTRUCTIONS.replace(
  '{{VOCABULARY_TOOLS_INSTRUCTIONS}}',
  VOCABULARY_TOOLS_INSTRUCTIONS,
);

/**
 * Initial Hypothesizer Agent - generates initial rules and vocabulary from structured problem.
 * Uses static vocabulary tools that read state from requestContext.
 * Has access to testing tools to validate rules before committing.
 */
export const initialHypothesizerAgent = new Agent({
  id: 'wf03-initial-hypothesizer',
  name: '[03-02] Initial Hypothesizer Agent',
  instructions: {
    role: 'system',
    content: instructions,
  },
  model: openrouter('moonshotai/kimi-k2.5'),
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
