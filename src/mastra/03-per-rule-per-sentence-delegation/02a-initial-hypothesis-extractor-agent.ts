import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { INITIAL_HYPOTHESIS_EXTRACTOR_INSTRUCTIONS } from './02a-initial-hypothesis-extractor-instructions';
import { openrouter } from '../openrouter';

export const initialHypothesisExtractorAgent = new Agent({
  id: 'wf03-initial-hypothesis-extractor',
  name: '[03-02a] Initial Hypothesis Extractor Agent',
  instructions: {
    role: 'system',
    content: INITIAL_HYPOTHESIS_EXTRACTOR_INSTRUCTIONS,
  },
  model: openrouter('openai/gpt-5-mini'),
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
