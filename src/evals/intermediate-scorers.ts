/**
 * Intermediate step scorers for evaluating extraction and rule quality.
 * These functions inspect raw workflow step outputs defensively and never throw.
 */

export interface ExtractionScore {
  success: boolean;
  questionsFound: number;
  expectedQuestions: number;
  score: number;
}

export interface RuleQualityScore {
  totalRules: number;
  passingRules: number;
  totalSentencesTested: number;
  passingSentences: number;
  verifierConclusion: string;
  score: number;
  iterations: number;
}

/**
 * Score the extraction step output by checking whether the expected number
 * of questions were found.
 */
export function scoreExtraction(
  extractionOutput: unknown,
  expectedQuestionCount: number,
): ExtractionScore {
  const defaultResult: ExtractionScore = {
    success: false,
    questionsFound: 0,
    expectedQuestions: expectedQuestionCount,
    score: 0,
  };

  if (extractionOutput === null || extractionOutput === undefined || typeof extractionOutput !== 'object') {
    return defaultResult;
  }

  const output = extractionOutput as Record<string, unknown>;

  if (output.success !== true) {
    return defaultResult;
  }

  const data = output.data as Record<string, unknown> | null | undefined;
  if (data === null || data === undefined || typeof data !== 'object') {
    return defaultResult;
  }

  const questions = data.questions;
  if (!Array.isArray(questions)) {
    return defaultResult;
  }

  const questionsFound = questions.length;

  // If expected is 0 and extraction succeeded, score is 1
  const score =
    expectedQuestionCount === 0 ? 1 : Math.min(1, questionsFound / expectedQuestionCount);

  return {
    success: true,
    questionsFound,
    expectedQuestions: expectedQuestionCount,
    score,
  };
}

/**
 * Score the rule quality based on verifier feedback from the verify-improve loop.
 */
export function scoreRuleQuality(verifyImproveOutput: unknown): RuleQualityScore {
  const defaultResult: RuleQualityScore = {
    totalRules: 0,
    passingRules: 0,
    totalSentencesTested: 0,
    passingSentences: 0,
    verifierConclusion: 'unknown',
    score: 0,
    iterations: 0,
  };

  if (
    verifyImproveOutput === null ||
    verifyImproveOutput === undefined ||
    typeof verifyImproveOutput !== 'object'
  ) {
    return defaultResult;
  }

  const output = verifyImproveOutput as Record<string, unknown>;

  const iterationCount =
    typeof output.iterationCount === 'number' ? output.iterationCount : 0;

  const testResults = output.testResults as Record<string, unknown> | null | undefined;
  if (testResults === null || testResults === undefined || typeof testResults !== 'object') {
    return { ...defaultResult, iterations: iterationCount };
  }

  const rulesTestedCount =
    typeof testResults.rulesTestedCount === 'number' ? testResults.rulesTestedCount : 0;

  const errantRules = Array.isArray(testResults.errantRules) ? testResults.errantRules : [];

  const sentencesTestedCount =
    typeof testResults.sentencesTestedCount === 'number' ? testResults.sentencesTestedCount : 0;

  const errantSentences = Array.isArray(testResults.errantSentences)
    ? testResults.errantSentences
    : [];

  const conclusion =
    typeof testResults.conclusion === 'string' ? testResults.conclusion : 'unknown';

  const passingRules = Math.max(0, rulesTestedCount - errantRules.length);
  const passingSentences = Math.max(0, sentencesTestedCount - errantSentences.length);
  const score = rulesTestedCount > 0 ? passingRules / rulesTestedCount : 0;

  return {
    totalRules: rulesTestedCount,
    passingRules,
    totalSentencesTested: sentencesTestedCount,
    passingSentences,
    verifierConclusion: conclusion,
    score,
    iterations: iterationCount,
  };
}
