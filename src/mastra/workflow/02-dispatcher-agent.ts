import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { DISPATCHER_INSTRUCTIONS } from './02-dispatcher-instructions';
import { TESTING_MODEL } from '../openrouter';
import { getOpenRouterProvider } from './request-context-helpers';

/**
 * Perspective Dispatcher Agent - analyzes structured problem data and generates
 * distinct linguistic perspectives for parallel hypothesizer exploration.
 * No tools needed; output is structured via structuredOutput at call site.
 */
export const dispatcherAgent = new Agent({
  id: 'perspective-dispatcher',
  name: '[Step 2] Perspective Dispatcher Agent',
  instructions: {
    role: 'system',
    content: DISPATCHER_INSTRUCTIONS,
  },
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
