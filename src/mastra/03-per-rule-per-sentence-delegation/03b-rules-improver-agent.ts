import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_IMPROVER_INSTRUCTIONS } from './03b-rules-improver-instructions';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { openrouter } from '../openrouter';
import { vocabularyTools } from './vocabulary-tools';

// Inject the vocabulary tools instructions into the prompt
const instructions = RULES_IMPROVER_INSTRUCTIONS.replace(
  '{{VOCABULARY_TOOLS_INSTRUCTIONS}}',
  VOCABULARY_TOOLS_INSTRUCTIONS,
);

/**
 * Rules Improver Agent - improves rules based on verifier feedback.
 * Uses static vocabulary tools that read state from requestContext.
 */
export const rulesImproverAgent = new Agent({
  id: 'wf03-rules-improver',
  name: '[03-3b] Rules Improver Agent',
  instructions: {
    role: 'system',
    content: instructions,
  },
  // model: openrouter('google/gemini-3-pro-preview'),
  model: openrouter('google/gemini-3-flash-preview'),
  tools: vocabularyTools,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: false,
      preserveEmojis: true,
      collapseWhitespace: true,
      trim: true,
    }),
  ],
});
