import { initialHypothesizerAgent } from './02-initial-hypothesizer-agent';
import { dispatcherAgent } from './02-dispatcher-agent';
import { synthesizerAgent } from './02-synthesizer-agent';
import { improverDispatcherAgent } from './02-improver-dispatcher-agent';
import { rulesImproverAgent } from './03b-rules-improver-agent';
import { rulesImprovementExtractorAgent } from './03b2-rules-improvement-extractor-agent';
import { structuredProblemExtractorAgent } from './01-structured-problem-extractor-agent';
import { questionAnswererAgent } from './04-question-answerer-agent';
import { verifierOrchestratorAgent } from './03a-verifier-orchestrator-agent';
import { verifierFeedbackExtractorAgent } from './03a2-verifier-feedback-extractor-agent';
import { ruleTesterAgent } from './03a-rule-tester-agent';
import { sentenceTesterAgent } from './03a-sentence-tester-agent';
import { vocabularyTools } from './vocabulary-tools';
import { rulesTools } from './rules-tools';
import { testRuleTool, testRuleWithRulesetTool } from './03a-rule-tester-tool';
import { testSentenceTool, testSentenceWithRulesetTool } from './03a-sentence-tester-tool';

// All agents for the solver workflow, registered for observability
export const workflowAgents = {
  structuredProblemExtractorAgent,
  initialHypothesizerAgent,
  dispatcherAgent,
  synthesizerAgent,
  improverDispatcherAgent,
  rulesImproverAgent,
  rulesImprovementExtractorAgent,
  verifierOrchestratorAgent,
  verifierFeedbackExtractorAgent,
  ruleTesterAgent,
  sentenceTesterAgent,
  questionAnswererAgent,
};

// All tools for the solver workflow, for reference
export const workflowTools = {
  ...vocabularyTools,
  ...rulesTools,
  testRule: testRuleTool,
  testSentence: testSentenceTool,
  testRuleWithRuleset: testRuleWithRulesetTool,
  testSentenceWithRuleset: testSentenceWithRulesetTool,
};
