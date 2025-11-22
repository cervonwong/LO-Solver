
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { oneAgentSolverAgent } from './01-one-agent/one-agent-solver-agent';
import { oneAgentSolverScorers } from './01-one-agent/one-agent-solver-scorers';

export const mastra = new Mastra({
  workflows: { },
  agents: { oneAgentSolverAgent },
  scorers: oneAgentSolverScorers,
  storage: new LibSQLStore({
    // stores observability, scores, ... 
    // if storing in memory, use `url: ":memory:"`; 
    // if it needs to persist, use `url: "file:../mastra.db"`
    url: "file:../mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
});
