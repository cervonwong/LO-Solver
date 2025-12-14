import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { INITIAL_HYPOTHESIS_EXTRACTOR_INSTRUCTIONS } from './02a-initial-hypothesis-extractor-instructions';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const initialHypothesisExtractorAgent = new Agent({
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
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
