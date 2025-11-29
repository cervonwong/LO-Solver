import { extractThenHypoTestLoopWorkflow } from './workflow';
import { rulesHypothesizerAgent } from './rules-hypothesizer-agent';
import { rulesTesterAgent } from './rules-tester-agent';
import { structuredProblemExtractorAgent } from './structured-problem-extractor-agent';

export const extractThenHypoTestLoopAgents = {
  structuredProblemExtractorAgent,
  rulesHypothesizerAgent,
  rulesTesterAgent,
};

export const extractThenHypoTestLoopScorers = {
  // Add scorers here if any
};

export const extractThenHypoTestLoopWorkflows = {
  extractThenHypoTestLoopWorkflow,
};
