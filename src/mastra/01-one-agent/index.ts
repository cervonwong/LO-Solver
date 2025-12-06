import { oneAgentSolverAgent } from './one-agent-solver-agent';
import { completenessScorer } from './one-agent-solver-scorers';

export const oneAgentSolverAgents = {
  wf01_oneAgentSolverAgent: oneAgentSolverAgent,
};

export const oneAgentSolverScorers = {
  wf01_completenessScorer: completenessScorer,
};
