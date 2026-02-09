import { resolve } from 'node:path';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { oneAgentSolverAgents, oneAgentSolverScorers } from './01-one-agent';
import { extractThenHypoTestLoopWorkflowAgents } from './02-extract-then-hypo-test-loop';
import { extractThenHypoTestLoopWorkflow } from './02-extract-then-hypo-test-loop/workflow';
import { workflow03Agents } from './03-per-rule-per-sentence-delegation';
import { workflow03 } from './03-per-rule-per-sentence-delegation/workflow';
import { Observability } from '@mastra/observability';

const DB_PATH = resolve(process.cwd(), 'mastra.db');

export const mastra = new Mastra({
  agents: {
    // ...oneAgentSolverAgents,
    // ...extractThenHypoTestLoopWorkflowAgents,
    ...workflow03Agents,
  },
  scorers: {
    // ...oneAgentSolverScorers,
  },
  workflows: {
    // extractThenHypoTestLoopWorkflow,
    workflow03,
  },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: `file:${DB_PATH}`,
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    default: { enabled: true },
  }),
});
