import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_HYPOTHESIZER_INSTRUCTIONS } from './rules-hypothesizer-instructions';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  extraBody: {
    reasoning: {
      effort: 'high',
    },
  },
});

export const rulesHypothesizerAgent = new Agent({
  name: '[02-02a] Rules Hypothesizer Agent',
  instructions: {
    role: 'system',
    content: RULES_HYPOTHESIZER_INSTRUCTIONS,
  },
  model: openrouter('openai/gpt-5'),
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
