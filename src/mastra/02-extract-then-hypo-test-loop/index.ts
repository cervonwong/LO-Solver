import { rulesHypothesizerAgent } from './rules-hypothesizer-agent';
import { rulesTesterAgent } from './rules-tester-agent';
import { structuredProblemExtractorAgent } from './structured-problem-extractor-agent';
import { questionAnswererAgent } from './question-answerer-agent';

export const extractThenHypoTestLoopWorkflowAgents = {
  wf02_structuredProblemExtractorAgent: structuredProblemExtractorAgent,
  wf02_rulesHypothesizerAgent: rulesHypothesizerAgent,
  wf02_rulesTesterAgent: rulesTesterAgent,
  wf02_questionAnswererAgent: questionAnswererAgent,
};
