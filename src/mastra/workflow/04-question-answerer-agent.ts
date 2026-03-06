import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { QUESTION_ANSWERER_INSTRUCTIONS } from './04-question-answerer-instructions';
import { TESTING_MODEL } from '../openrouter';
import { getOpenRouterProvider } from './request-context-helpers';

/**
 * Question Answerer Agent.
 * Vocabulary is passed in the prompt (read-only), no tools needed.
 */
export const questionAnswererAgent = new Agent({
  id: 'question-answerer',
  name: '[Step 4] Question Answerer Agent',
  instructions: QUESTION_ANSWERER_INSTRUCTIONS,
  // model: openrouter('google/gemini-3-pro-preview'),
  model: ({ requestContext }) =>
    getOpenRouterProvider(requestContext)(
      requestContext?.get('model-mode') === 'production'
        ? 'google/gemini-3-flash-preview'
        : TESTING_MODEL,
    ),
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
