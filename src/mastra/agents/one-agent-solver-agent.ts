import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { scorers } from '../scorers/one-agent-solver-scorers';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { ONE_AGNENT_SOLVER_INSTRUCTIONS } from './one-agent-solver-instructions';

export const oneAgentSolverAgent = new Agent({
  name: 'One-Agent Solver Agent',
  instructions: ONE_AGNENT_SOLVER_INSTRUCTIONS,
  model: 'openrouter/openai/gpt-5-mini',
  tools: {},
  scorers: {
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
  },
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
