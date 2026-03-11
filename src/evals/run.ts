import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { mastra } from '@/mastra';
import type { ProviderMode } from '@/mastra/openrouter';

import { scoreExtraction, scoreRuleQuality } from './intermediate-scorers';
import type { EvalProblem, GroundTruthAnswer } from './problems';
import { loadEvalProblems } from './problems';
import type { EvalProblemResult, EvalRunResult } from './storage';
import { saveEvalRun } from './storage';
import { translationAccuracyScorer } from './translation-scorer';
import { solveZeroShot } from './zero-shot-solver';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  providerMode: ProviderMode;
  concurrency: number;
  problem: string | undefined;
  comparison: boolean;
  maxRounds: number;
  perspectiveCount: number;
}

function printHelp(): void {
  console.log(`Usage: npm run eval -- [options]

Options:
  --mode <testing|production>   Model mode (default: testing)
  --concurrency <N>             Parallel problem execution (default: 1)
  --problem <id>                Run a single problem by ID
  --comparison                  Run with zero-shot comparison
  --rounds <N>                  Max verify/improve rounds, 1-5 (default: 3)
  --perspectives <N>            Number of hypothesis perspectives, 2-7 (default: 3)
  --help                        Show this help message`);
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let providerMode: ProviderMode = 'openrouter-testing';
  let concurrency = 1;
  let problem: string | undefined;
  let comparison = false;
  let maxRounds = 3;
  let perspectiveCount = 3;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '--mode') {
      const val = args[i + 1];
      if (val !== 'testing' && val !== 'production') {
        console.error('Error: --mode must be "testing" or "production"');
        process.exit(1);
      }
      providerMode = val === 'production' ? 'openrouter-production' : 'openrouter-testing';
      i++;
    } else if (arg === '--concurrency') {
      const val = args[i + 1];
      const parsed = val !== undefined ? parseInt(val, 10) : NaN;
      if (Number.isNaN(parsed) || parsed < 1) {
        console.error('Error: --concurrency must be a positive integer');
        process.exit(1);
      }
      concurrency = parsed;
      i++;
    } else if (arg === '--problem') {
      problem = args[i + 1];
      if (problem === undefined) {
        console.error('Error: --problem requires a value');
        process.exit(1);
      }
      i++;
    } else if (arg === '--comparison') {
      comparison = true;
    } else if (arg === '--rounds') {
      const val = args[i + 1];
      const parsed = val !== undefined ? parseInt(val, 10) : NaN;
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 5) {
        console.error('Error: --rounds must be an integer between 1 and 5');
        process.exit(1);
      }
      maxRounds = parsed;
      i++;
    } else if (arg === '--perspectives') {
      const val = args[i + 1];
      const parsed = val !== undefined ? parseInt(val, 10) : NaN;
      if (Number.isNaN(parsed) || parsed < 2 || parsed > 7) {
        console.error('Error: --perspectives must be an integer between 2 and 7');
        process.exit(1);
      }
      perspectiveCount = parsed;
      i++;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return { providerMode, concurrency, problem, comparison, maxRounds, perspectiveCount };
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFC');
}

function buildProblemResult(
  problem: EvalProblem,
  score: number,
  reason: string,
  predictedAnswers: string[],
  groundTruth: GroundTruthAnswer[],
): EvalProblemResult {
  let correctCount = 0;
  const details: EvalProblemResult['details'] = [];

  for (let i = 0; i < groundTruth.length; i++) {
    const truth = groundTruth[i];
    const predicted = predictedAnswers[i];

    if (truth === undefined) continue;

    const predictedStr = predicted ?? '';
    const correct =
      predicted !== undefined &&
      truth.acceptedAnswers.some((accepted) => normalize(accepted) === normalize(predicted));

    if (correct) correctCount++;

    details.push({
      questionIndex: truth.questionIndex,
      predicted: predictedStr,
      expected: truth.acceptedAnswers,
      correct,
    });
  }

  return {
    problemId: problem.id,
    title: problem.title,
    score,
    reason,
    totalQuestions: groundTruth.length,
    correctCount,
    details,
  };
}

// ---------------------------------------------------------------------------
// Git commit helper
// ---------------------------------------------------------------------------

function getGitCommit(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const {
    providerMode,
    concurrency,
    problem: problemFilter,
    comparison,
    maxRounds,
    perspectiveCount,
  } = parseArgs();

  console.log(`\nEval runner starting`);
  console.log(`  Mode: ${providerMode}`);
  console.log(`  Concurrency: ${concurrency}`);
  console.log(`  Rounds: ${maxRounds}`);
  console.log(`  Perspectives: ${perspectiveCount}`);
  console.log(`  Comparison: ${comparison}`);
  if (problemFilter !== undefined) {
    console.log(`  Problem filter: ${problemFilter}`);
  }
  console.log();

  // Load and filter problems
  let problems = loadEvalProblems();
  if (problemFilter !== undefined) {
    problems = problems.filter((p) => p.id === problemFilter);
    if (problems.length === 0) {
      console.error(`No problem found with id "${problemFilter}"`);
      process.exit(1);
    }
  }

  console.log(`Loaded ${problems.length} problem(s)\n`);

  // Get the workflow
  const workflow = mastra.getWorkflow('solverWorkflow');

  const startTime = Date.now();
  const problemResults: EvalProblemResult[] = [];

  // Run problems with concurrency control
  const runProblem = async (evalProblem: EvalProblem): Promise<EvalProblemResult> => {
    console.log(`Running: ${evalProblem.id} - ${evalProblem.title}`);
    const problemStart = Date.now();

    // Run workflow and optionally zero-shot in parallel
    const workflowPromise = (async () => {
      const run = await workflow.createRun();
      return run.start({
        inputData: {
          rawProblemText: evalProblem.rawProblemText,
          providerMode,
          maxRounds,
          perspectiveCount,
        },
      });
    })();

    const zeroShotPromise = comparison
      ? solveZeroShot(evalProblem.rawProblemText, providerMode)
      : undefined;

    const [result, zeroShotResult] = await Promise.all([
      workflowPromise,
      zeroShotPromise ?? Promise.resolve(undefined),
    ]);

    const elapsed = ((Date.now() - problemStart) / 1000).toFixed(1);

    if (result.status !== 'success') {
      console.log(`  ${evalProblem.id}: FAILED (${elapsed}s) - workflow status: ${result.status}`);
      return {
        problemId: evalProblem.id,
        title: evalProblem.title,
        score: 0,
        reason: `Workflow ${result.status}`,
        totalQuestions: evalProblem.groundTruth.length,
        correctCount: 0,
        details: evalProblem.groundTruth.map((gt) => ({
          questionIndex: gt.questionIndex,
          predicted: '',
          expected: gt.acceptedAnswers,
          correct: false,
        })),
      };
    }

    // Score workflow result
    const scorerResult = await translationAccuracyScorer.run({
      input: evalProblem.rawProblemText,
      output: result.result,
      groundTruth: evalProblem.groundTruth,
    });

    const preprocessResult = scorerResult.preprocessStepResult as
      | { predictedAnswers: string[]; groundTruth: GroundTruthAnswer[]; totalQuestions: number }
      | undefined;

    const predictedAnswers = preprocessResult?.predictedAnswers ?? [];
    const groundTruth = preprocessResult?.groundTruth ?? evalProblem.groundTruth;

    const problemResult = buildProblemResult(
      evalProblem,
      scorerResult.score,
      scorerResult.reason ?? '',
      predictedAnswers,
      groundTruth,
    );

    // Intermediate scoring (always, for successful workflows)
    const steps = (result as Record<string, unknown>).steps as
      | Record<string, { output?: unknown }>
      | undefined;
    console.log('  Step keys:', Object.keys(steps ?? {}));

    const extractStepOutput = steps?.['extract-structure']?.output;
    const verifyImproveStepOutput = steps?.['multi-perspective-hypothesis']?.output;

    const extractionScore = scoreExtraction(extractStepOutput, evalProblem.groundTruth.length);
    const ruleQualityScore = scoreRuleQuality(verifyImproveStepOutput);

    problemResult.intermediateScores = {
      extraction: extractionScore,
      ruleQuality: ruleQualityScore,
    };

    // Zero-shot comparison scoring
    if (comparison && zeroShotResult !== undefined) {
      const zsScorerResult = await translationAccuracyScorer.run({
        input: evalProblem.rawProblemText,
        output: zeroShotResult,
        groundTruth: evalProblem.groundTruth,
      });

      const zsPreprocessResult = zsScorerResult.preprocessStepResult as
        | { predictedAnswers: string[]; groundTruth: GroundTruthAnswer[]; totalQuestions: number }
        | undefined;

      const zsPredictedAnswers = zsPreprocessResult?.predictedAnswers ?? [];
      const zsGroundTruth = zsPreprocessResult?.groundTruth ?? evalProblem.groundTruth;

      // Build zero-shot details using the same logic as buildProblemResult
      let zsCorrectCount = 0;
      const zsDetails: EvalProblemResult['details'] = [];

      for (let i = 0; i < zsGroundTruth.length; i++) {
        const truth = zsGroundTruth[i];
        const predicted = zsPredictedAnswers[i];

        if (truth === undefined) continue;

        const predictedStr = predicted ?? '';
        const correct =
          predicted !== undefined &&
          truth.acceptedAnswers.some((accepted) => normalize(accepted) === normalize(predicted));

        if (correct) zsCorrectCount++;

        zsDetails.push({
          questionIndex: truth.questionIndex,
          predicted: predictedStr,
          expected: truth.acceptedAnswers,
          correct,
        });
      }

      problemResult.zeroShot = {
        score: zsScorerResult.score,
        reason: zsScorerResult.reason ?? '',
        correctCount: zsCorrectCount,
        details: zsDetails,
      };
    }

    const zsInfo =
      problemResult.zeroShot !== undefined
        ? ` | zero-shot=${problemResult.zeroShot.score.toFixed(2)}`
        : '';

    console.log(
      `  ${evalProblem.id}: score=${problemResult.score.toFixed(2)} ` +
        `(${problemResult.correctCount}/${problemResult.totalQuestions})${zsInfo} [${elapsed}s]`,
    );

    return problemResult;
  };

  // Execute with concurrency limit
  if (concurrency === 1) {
    for (const p of problems) {
      problemResults.push(await runProblem(p));
    }
  } else {
    // Process in batches
    for (let i = 0; i < problems.length; i += concurrency) {
      const batch = problems.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(runProblem));
      problemResults.push(...batchResults);
    }
  }

  const duration = Date.now() - startTime;

  // Compute workflow summary
  const totalQuestions = problemResults.reduce((sum, r) => sum + r.totalQuestions, 0);
  const totalCorrect = problemResults.reduce((sum, r) => sum + r.correctCount, 0);
  const meanScore =
    problemResults.length > 0
      ? problemResults.reduce((sum, r) => sum + r.score, 0) / problemResults.length
      : 0;

  const summary: EvalRunResult['summary'] = {
    totalProblems: problemResults.length,
    meanScore,
    totalQuestions,
    totalCorrect,
    overallAccuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
  };

  // Compute zero-shot summary and delta if comparison mode
  if (comparison) {
    const zsProblems = problemResults.filter((r) => r.zeroShot !== undefined);
    if (zsProblems.length > 0) {
      const zsTotalCorrect = zsProblems.reduce(
        (sum, r) => sum + (r.zeroShot?.correctCount ?? 0),
        0,
      );
      const zsTotalQuestions = zsProblems.reduce((sum, r) => sum + r.totalQuestions, 0);
      const zsMeanScore =
        zsProblems.reduce((sum, r) => sum + (r.zeroShot?.score ?? 0), 0) / zsProblems.length;
      const zsOverallAccuracy = zsTotalQuestions > 0 ? zsTotalCorrect / zsTotalQuestions : 0;

      summary.zeroShot = {
        meanScore: zsMeanScore,
        overallAccuracy: zsOverallAccuracy,
        totalCorrect: zsTotalCorrect,
      };

      summary.delta = {
        meanScore: meanScore - zsMeanScore,
        overallAccuracy: summary.overallAccuracy - zsOverallAccuracy,
      };
    }
  }

  const evalRunResult: EvalRunResult = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    providerMode,
    gitCommit: getGitCommit(),
    duration,
    comparison,
    problems: problemResults,
    summary,
  };

  // Persist
  await saveEvalRun(evalRunResult);

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('EVAL RESULTS');
  console.log('='.repeat(70));
  console.log();

  // Table header
  const idWidth = 16;
  const titleWidth = 24;
  const scoreWidth = 10;
  const correctWidth = 12;

  if (comparison) {
    console.log(
      'Problem ID'.padEnd(idWidth) +
        'Title'.padEnd(titleWidth) +
        'Workflow'.padEnd(scoreWidth) +
        'Zero-Shot'.padEnd(scoreWidth) +
        'Delta',
    );
    console.log('-'.repeat(idWidth + titleWidth + scoreWidth * 2 + 8));

    for (const r of problemResults) {
      const titleTruncated =
        r.title.length > titleWidth - 2 ? r.title.slice(0, titleWidth - 4) + '..' : r.title;
      const zsScore = r.zeroShot?.score ?? 0;
      const delta = r.score - zsScore;
      const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(2);
      console.log(
        r.problemId.padEnd(idWidth) +
          titleTruncated.padEnd(titleWidth) +
          r.score.toFixed(2).padEnd(scoreWidth) +
          zsScore.toFixed(2).padEnd(scoreWidth) +
          deltaStr,
      );
    }
  } else {
    console.log(
      'Problem ID'.padEnd(idWidth) +
        'Title'.padEnd(titleWidth) +
        'Score'.padEnd(scoreWidth) +
        'Correct',
    );
    console.log('-'.repeat(idWidth + titleWidth + scoreWidth + correctWidth));

    for (const r of problemResults) {
      const titleTruncated =
        r.title.length > titleWidth - 2 ? r.title.slice(0, titleWidth - 4) + '..' : r.title;
      console.log(
        r.problemId.padEnd(idWidth) +
          titleTruncated.padEnd(titleWidth) +
          r.score.toFixed(2).padEnd(scoreWidth) +
          `${r.correctCount}/${r.totalQuestions}`,
      );
    }
  }

  // Intermediate scores
  const problemsWithIntermediateScores = problemResults.filter(
    (r) => r.intermediateScores !== undefined,
  );
  if (problemsWithIntermediateScores.length > 0) {
    console.log('\nIntermediate Scores:');
    for (const r of problemsWithIntermediateScores) {
      const is = r.intermediateScores!;
      console.log(
        `  ${r.problemId}: extraction=${is.extraction.score.toFixed(2)} ` +
          `rule-quality=${is.ruleQuality.score.toFixed(2)} ` +
          `(${is.ruleQuality.passingRules}/${is.ruleQuality.totalRules} rules, ` +
          `${is.ruleQuality.iterations} iters)`,
      );
    }
  }

  console.log();
  console.log(
    `Overall accuracy: ${(evalRunResult.summary.overallAccuracy * 100).toFixed(1)}% ` +
      `(${totalCorrect}/${totalQuestions})`,
  );
  console.log(`Mean score: ${meanScore.toFixed(3)}`);

  if (comparison && summary.zeroShot && summary.delta) {
    console.log(
      `Zero-shot accuracy: ${(summary.zeroShot.overallAccuracy * 100).toFixed(1)}% ` +
        `(${summary.zeroShot.totalCorrect}/${totalQuestions})`,
    );
    console.log(`Zero-shot mean score: ${summary.zeroShot.meanScore.toFixed(3)}`);
    const deltaSign = summary.delta.meanScore >= 0 ? '+' : '';
    console.log(`Delta mean score: ${deltaSign}${summary.delta.meanScore.toFixed(3)}`);
    const deltaAccSign = summary.delta.overallAccuracy >= 0 ? '+' : '';
    console.log(
      `Delta accuracy: ${deltaAccSign}${(summary.delta.overallAccuracy * 100).toFixed(1)}%`,
    );
  }

  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Mode: ${providerMode}`);
  if (evalRunResult.gitCommit !== undefined) {
    console.log(`Git commit: ${evalRunResult.gitCommit}`);
  }
  const safeTimestamp = evalRunResult.timestamp.replace(/:/g, '-');
  console.log(`\nResult saved: evals/results/${safeTimestamp}_${evalRunResult.id}.json`);
}

main().catch((err: unknown) => {
  console.error('Eval runner failed:', err);
  process.exit(1);
});
