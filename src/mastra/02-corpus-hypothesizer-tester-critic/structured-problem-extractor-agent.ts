import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS } from './structured-problem-extractor-instructions';

export const structuredProblemExtractorAgent = new Agent({
  name: 'Structured Problem Extractor Agent',
  instructions: STRUCTURED_PROBLEM_EXTRACTOR_INSTRUCTIONS,
  model: 'openrouter/openai/gpt-5-mini',
  tools: {},
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: false,
      preserveEmojis: true,
      collapseWhitespace: true,
      trim: true
    })
  ],
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
