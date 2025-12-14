import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { INITIAL_HYPOTHESIZER_INSTRUCTIONS } from './02-initial-hypothesizer-instructions';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const initialHypothesizerAgent = new Agent({
  name: '[03-02] Initial Hypothesizer Agent',
  instructions: {
    role: 'system',
    content: INITIAL_HYPOTHESIZER_INSTRUCTIONS,
  },
  // model: openrouter('deepseek/deepseek-v3.2'),
  model: openrouter('google/gemini-3-pro-preview'),
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
