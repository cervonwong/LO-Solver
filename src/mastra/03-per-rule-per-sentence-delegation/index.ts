import { initialHypothesizerAgent } from './02-initial-hypothesizer-agent';
import { initialHypothesisExtractorAgent } from './02a-initial-hypothesis-extractor-agent';
import { rulesImproverAgent } from './03b-rules-improver-agent';
import { rulesImprovementExtractorAgent } from './03b2-rules-improvement-extractor-agent';
import { structuredProblemExtractorAgent } from './01-structured-problem-extractor-agent';
import { questionAnswererAgent } from './04-question-answerer-agent';
import { verifierOrchestratorAgent } from './03a-verifier-orchestrator-agent';
import { verifierFeedbackExtractorAgent } from './03a2-verifier-feedback-extractor-agent';
import { ruleTesterAgent } from './03a-rule-tester-agent';
import { sentenceTesterAgent } from './03a-sentence-tester-agent';
import { vocabularyTools } from './vocabulary-tools';
import { testRuleTool, testRuleWithRulesetTool } from './03a-rule-tester-tool';
import { testSentenceTool, testSentenceWithRulesetTool } from './03a-sentence-tester-tool';

// All agents for workflow 03, registered for observability
export const workflow03Agents = {
  wf03_structuredProblemExtractorAgent: structuredProblemExtractorAgent,
  wf03_initialHypothesizerAgent: initialHypothesizerAgent,
  wf03_initialHypothesisExtractorAgent: initialHypothesisExtractorAgent,
  wf03_rulesImproverAgent: rulesImproverAgent,
  wf03_rulesImprovementExtractorAgent: rulesImprovementExtractorAgent,
  wf03_verifierOrchestratorAgent: verifierOrchestratorAgent,
  wf03_verifierFeedbackExtractorAgent: verifierFeedbackExtractorAgent,
  wf03_ruleTesterAgent: ruleTesterAgent,
  wf03_sentenceTesterAgent: sentenceTesterAgent,
  wf03_questionAnswererAgent: questionAnswererAgent,
};

// All tools for workflow 03, for reference
export const workflow03Tools = {
  ...vocabularyTools,
  testRule: testRuleTool,
  testSentence: testSentenceTool,
  testRuleWithRuleset: testRuleWithRulesetTool,
  testSentenceWithRuleset: testSentenceWithRulesetTool,
};
