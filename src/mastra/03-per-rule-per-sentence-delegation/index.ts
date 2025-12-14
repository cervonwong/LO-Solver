import { initialHypothesizerAgent } from './02-initial-hypothesizer-agent';
import { initialHypothesisExtractorAgent } from './02a-initial-hypothesis-extractor-agent';
import { rulesImproverAgent } from './03b-rules-improver-agent';
import { rulesImprovementExtractorAgent } from './03b2-rules-improvement-extractor-agent';
import { structuredProblemExtractorAgent } from './01-structured-problem-extractor-agent';
import { questionAnswererAgent } from './04-question-answerer-agent';

// Note: verifierOrchestratorAgent is created dynamically per-iteration in the workflow
// using createVerifierOrchestratorAgent() with the current context's tools

export const workflow03Agents = {
  wf03_structuredProblemExtractorAgent: structuredProblemExtractorAgent,
  wf03_initialHypothesizerAgent: initialHypothesizerAgent,
  wf03_initialHypothesisExtractorAgent: initialHypothesisExtractorAgent,
  wf03_rulesImproverAgent: rulesImproverAgent,
  wf03_rulesImprovementExtractorAgent: rulesImprovementExtractorAgent,
  wf03_questionAnswererAgent: questionAnswererAgent,
};
