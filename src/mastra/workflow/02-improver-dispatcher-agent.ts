import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { IMPROVER_DISPATCHER_INSTRUCTIONS } from './02-improver-dispatcher-instructions';
import { openrouter, TESTING_MODEL } from '../openrouter';

/**
 * Improver Dispatcher Agent - analyzes gaps and weaknesses in the current ruleset
 * after synthesis and generates targeted perspectives for round 2+ exploration.
 * No tools needed; output is structured via structuredOutput at call site.
 */
export const improverDispatcherAgent = new Agent({
  id: 'improver-dispatcher',
  name: '[Step 2] Improver Dispatcher Agent',
  instructions: {
    role: 'system',
    content: IMPROVER_DISPATCHER_INSTRUCTIONS,
  },
  model: ({ requestContext }) =>
    openrouter(
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
