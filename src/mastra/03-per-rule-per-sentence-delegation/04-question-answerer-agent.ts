import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { QUESTION_ANSWERER_INSTRUCTIONS } from './04-question-answerer-instructions';
import { openrouter } from '../openrouter';

/**
 * Question Answerer Agent.
 * Vocabulary is passed in the prompt (read-only), no tools needed.
 */
export const questionAnswererAgent = new Agent({
  id: 'wf03-question-answerer',
  name: '[03-04] Question Answerer Agent',
  instructions: QUESTION_ANSWERER_INSTRUCTIONS,
  model: openrouter('moonshotai/kimi-k2.5'),
  tools: {},
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: false,
      preserveEmojis: true,
      collapseWhitespace: true,
      trim: true,
    }),
  ],
});
