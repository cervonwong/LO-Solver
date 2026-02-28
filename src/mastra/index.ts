import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { workflowAgents } from './workflow';
import { solverWorkflow } from './workflow/workflow';
import { Observability } from '@mastra/observability';
import { resolve } from 'node:path';
import { translationAccuracyScorer } from '@/evals/translation-scorer';

const dbPath = resolve(process.cwd(), 'mastra.db');

export const mastra = new Mastra({
  agents: {
    ...workflowAgents,
  },
  workflows: {
    solverWorkflow,
  },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: `file:${dbPath}`,
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  scorers: {
    translationAccuracy: translationAccuracyScorer,
  },
  observability: new Observability({
    default: { enabled: true },
  }),
});
