import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { QUESTION_ANSWERER_INSTRUCTIONS } from './question-answerer-instructions';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const questionAnswererAgent = new Agent({
  name: '[02-03] Question Answerer Agent',
  instructions: QUESTION_ANSWERER_INSTRUCTIONS,
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
