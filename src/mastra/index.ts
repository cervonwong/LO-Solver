import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { oneAgentSolverAgents, oneAgentSolverScorers } from './01-one-agent';
import { extractThenHypoTestLoopWorkflowAgents } from './02-extract-then-hypo-test-loop';
import { extractThenHypoTestLoopWorkflow } from './02-extract-then-hypo-test-loop/workflow';
import { workflow03Agents } from './03-per-rule-per-sentence-delegation';
import { workflow03 } from './03-per-rule-per-sentence-delegation/workflow';
import { Observability } from '@mastra/observability';

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
    // stores observability, scores, ...
    // if storing in memory, use `url: ":memory:"`;
    // if it needs to persist, use `url: "file:../../mastra.db"`
    url: 'file:../../mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    default: { enabled: true },
  }),
});
