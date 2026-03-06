// DEPRECATED: This agent is no longer used in the multi-perspective workflow.
// Kept for backward compatibility with existing verify-improve loop.
import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { INITIAL_HYPOTHESIS_EXTRACTOR_INSTRUCTIONS } from './02a-initial-hypothesis-extractor-instructions';
import { TESTING_MODEL } from '../openrouter';
import { getOpenRouterProvider } from './request-context-helpers';

export const initialHypothesisExtractorAgent = new Agent({
  id: 'initial-hypothesis-extractor',
  name: '[Step 2] Initial Hypothesis Extractor Agent',
  instructions: {
    role: 'system',
    content: INITIAL_HYPOTHESIS_EXTRACTOR_INSTRUCTIONS,
  },
  model: ({ requestContext }) =>
    getOpenRouterProvider(requestContext)(
      requestContext?.get('model-mode') === 'production' ? 'openai/gpt-5-mini' : TESTING_MODEL,
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
