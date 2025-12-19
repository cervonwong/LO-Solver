import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_TESTER_INSTRUCTIONS } from './rules-tester-instructions';
import { openrouter } from '../openrouter';

export const rulesTesterAgent = new Agent({
  id: 'wf02-rules-tester',
  name: '[02-02b] Rules Tester Agent',
  instructions: RULES_TESTER_INSTRUCTIONS,
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
      id: 'wf02-rules-tester-memory',
      url: 'file:../../mastra.db',
    }),
  }),
});
