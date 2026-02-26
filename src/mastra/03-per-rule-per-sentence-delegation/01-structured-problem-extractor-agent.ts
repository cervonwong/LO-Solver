import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS } from './01-structured-problem-extractor-instructions';
import { openrouter, TESTING_MODEL } from '../openrouter';

export const structuredProblemExtractorAgent = new Agent({
  id: 'wf03-structured-problem-extractor',
  name: '[03-01] Structured Problem Extractor Agent',
  instructions: STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS,
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
