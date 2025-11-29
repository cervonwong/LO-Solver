import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_HYPOTHESIZER_INSTRUCTIONS } from './rules-hypothesizer-instructions';

export const rulesHypothesizerAgent = new Agent({
  name: 'Rules Hypothesizer Agent',
  instructions: RULES_HYPOTHESIZER_INSTRUCTIONS,
  model: 'openrouter/deepseek/deepseek-r1-0528',
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
