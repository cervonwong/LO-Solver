import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { QUESTION_ANSWERER_INSTRUCTIONS } from './question-answerer-instructions';

export const questionAnswererAgent = new Agent({
  id: 'wf02-question-answerer',
  name: '[02-03] Question Answerer Agent',
  instructions: QUESTION_ANSWERER_INSTRUCTIONS,
  // model: 'openrouter/openai/gpt-5-mini',
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
      id: 'wf02-question-answerer-memory',
      url: 'file:../../mastra.db',
    }),
  }),
});
