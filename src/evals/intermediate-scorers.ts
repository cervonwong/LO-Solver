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
  roundDetails?: Array<{
    round: number;
    convergencePassRate: number;
    convergenceConclusion: string;
    converged: boolean;
    perspectiveCount: number;
  }>;
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

  if (
    extractionOutput === null ||
    extractionOutput === undefined ||
    typeof extractionOutput !== 'object'
  ) {
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
 * Reads the enriched verificationMetadata format (new) with legacy fallback (old).
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

  // New format: { structuredProblem, rules, verificationMetadata }
  const verificationMetadata = output.verificationMetadata as
    | Record<string, unknown>
    | null
    | undefined;
  if (verificationMetadata && typeof verificationMetadata === 'object') {
    const totalRounds =
      typeof verificationMetadata.totalRounds === 'number' ? verificationMetadata.totalRounds : 0;
    const finalRulesCount =
      typeof verificationMetadata.finalRulesCount === 'number'
        ? verificationMetadata.finalRulesCount
        : 0;
    const finalErrantRulesCount =
      typeof verificationMetadata.finalErrantRulesCount === 'number'
        ? verificationMetadata.finalErrantRulesCount
        : 0;
    const finalSentencesTestedCount =
      typeof verificationMetadata.finalSentencesTestedCount === 'number'
        ? verificationMetadata.finalSentencesTestedCount
        : 0;
    const finalErrantSentencesCount =
      typeof verificationMetadata.finalErrantSentencesCount === 'number'
        ? verificationMetadata.finalErrantSentencesCount
        : 0;
    const finalConclusion =
      typeof verificationMetadata.finalConclusion === 'string'
        ? verificationMetadata.finalConclusion
        : 'unknown';

    const passingRules = Math.max(0, finalRulesCount - finalErrantRulesCount);
    const passingSentences = Math.max(0, finalSentencesTestedCount - finalErrantSentencesCount);
    const score = finalRulesCount > 0 ? passingRules / finalRulesCount : 0;

    const rounds = Array.isArray(verificationMetadata.rounds) ? verificationMetadata.rounds : [];
    const roundDetails = rounds.map((r: Record<string, unknown>) => ({
      round: typeof r.round === 'number' ? r.round : 0,
      convergencePassRate:
        typeof r.convergencePassRate === 'number' ? r.convergencePassRate : 0,
      convergenceConclusion:
        typeof r.convergenceConclusion === 'string' ? r.convergenceConclusion : 'unknown',
      converged: typeof r.converged === 'boolean' ? r.converged : false,
      perspectiveCount: Array.isArray(r.perspectives) ? r.perspectives.length : 0,
    }));

    return {
      totalRules: finalRulesCount,
      passingRules,
      totalSentencesTested: finalSentencesTestedCount,
      passingSentences,
      verifierConclusion: finalConclusion,
      score,
      iterations: totalRounds,
      roundDetails,
    };
  }

  // Legacy format fallback: { iterationCount, testResults.{...} }
  const iterationCount = typeof output.iterationCount === 'number' ? output.iterationCount : 0;

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
