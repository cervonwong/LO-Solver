import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_HYPOTHESIZER_INSTRUCTIONS } from './rules-hypothesizer-instructions';

export const rulesHypothesizerAgent = new Agent({
  id: 'wf02-rules-hypothesizer',
  name: '[02-02a] Rules Hypothesizer Agent',
  instructions: {
    role: 'system',
    content: RULES_HYPOTHESIZER_INSTRUCTIONS,
  },
  // model: 'openrouter/deepseek/deepseek-v3.2',
  model: 'openrouter/google/gemini-3-pro-preview',
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
      id: 'wf02-rules-hypothesizer-memory',
      url: 'file:../../mastra.db',
    }),
  }),
});
