import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_IMPROVEMENT_EXTRACTOR_INSTRUCTIONS } from './03b2-rules-improvement-extractor-instructions';
import { TESTING_MODEL } from '../openrouter';
import { getOpenRouterProvider } from './request-context-helpers';

export const rulesImprovementExtractorAgent = new Agent({
  id: 'rules-improvement-extractor',
  name: '[Step 3] Rules Improvement Extractor Agent',
  instructions: {
    role: 'system',
    content: RULES_IMPROVEMENT_EXTRACTOR_INSTRUCTIONS,
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
