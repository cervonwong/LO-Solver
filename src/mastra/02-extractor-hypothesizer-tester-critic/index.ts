import { extractorHypothesizerTesterCriticWorkflow } from './workflow';
import { rulesHypothesizerAgent } from './rules-hypothesizer-agent';
import { rulesTesterAgent } from './rules-tester-agent';
import { structuredProblemExtractorAgent } from './structured-problem-extractor-agent';

export const extractorHypothesizerTesterCriticAgents = {
  structuredProblemExtractorAgent,
  rulesHypothesizerAgent,
  rulesTesterAgent,
};

export const extractorHypothesizerTesterCriticScorers = {
  // Add scorers here if any
};

export const extractorHypothesizerTesterCriticWorkflows = {
  extractorHypothesizerTesterCriticWorkflow,
};
