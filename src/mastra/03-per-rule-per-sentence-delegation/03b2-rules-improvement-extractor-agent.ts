import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_IMPROVEMENT_EXTRACTOR_INSTRUCTIONS } from './03b2-rules-improvement-extractor-instructions';
import { openrouter, TESTING_MODEL } from '../openrouter';

export const rulesImprovementExtractorAgent = new Agent({
  id: 'wf03-rules-improvement-extractor',
  name: '[03-3b2] Rules Improvement Extractor Agent',
  instructions: {
    role: 'system',
    content: RULES_IMPROVEMENT_EXTRACTOR_INSTRUCTIONS,
  },
  model: ({ requestContext }) =>
    openrouter(
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
