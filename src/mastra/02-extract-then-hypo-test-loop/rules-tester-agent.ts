import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_TESTER_INSTRUCTIONS } from './rules-tester-instructions';

export const rulesTesterAgent = new Agent({
  name: '[02-02b] Rules Tester Agent',
  instructions: RULES_TESTER_INSTRUCTIONS,
  model: 'openrouter/openai/gpt-5-mini',
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
