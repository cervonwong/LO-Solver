import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { oneAgentSolverAgents, oneAgentSolverScorers } from './01-one-agent';
import {
  extractorHypothesizerTesterCriticAgents,
  extractorHypothesizerTesterCriticScorers,
  extractorHypothesizerTesterCriticWorkflows,
} from './02-extractor-hypothesizer-tester-critic';

export const mastra = new Mastra({
  agents: {
    // ...oneAgentSolverAgents,
    ...extractorHypothesizerTesterCriticAgents,
  },
  scorers: {
    // ...oneAgentSolverScorers,
    ...extractorHypothesizerTesterCriticScorers,
  },
  workflows: {
    ...extractorHypothesizerTesterCriticWorkflows,
  },
  storage: new LibSQLStore({
    // stores observability, scores, ...
    // if storing in memory, use `url: ":memory:"`;
    // if it needs to persist, use `url: "file:../../mastra.db"`
    url: 'file:../../mastra.db',
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
