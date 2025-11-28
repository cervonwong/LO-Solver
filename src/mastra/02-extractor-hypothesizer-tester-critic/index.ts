import { extractorHypothesizerTesterCriticWorkflow } from './extractor-hypothesizer-tester-critic-workflow';
import { rulesHypothesizerAgent } from './rules-hypothesizer-agent';
import { structuredProblemExtractorAgent } from './structured-problem-extractor-agent';

export const extractorHypothesizerTesterCriticAgents = {
  structuredProblemExtractorAgent,
  rulesHypothesizerAgent,
};

export const extractorHypothesizerTesterCriticScorers = {
  // Add scorers here if any
};

export const extractorHypothesizerTesterCriticWorkflows = {
  extractorHypothesizerTesterCriticWorkflow,
};
