import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { mastra } from '@/mastra';

import type { EvalProblem, GroundTruthAnswer } from './problems';
import { loadEvalProblems } from './problems';
import type { EvalProblemResult, EvalRunResult } from './storage';
import { saveEvalRun } from './storage';
import { translationAccuracyScorer } from './translation-scorer';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  mode: 'testing' | 'production';
  concurrency: number;
  problem: string | undefined;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let mode: 'testing' | 'production' = 'testing';
  let concurrency = 1;
  let problem: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mode') {
      const val = args[i + 1];
      if (val !== 'testing' && val !== 'production') {
        console.error('Error: --mode must be "testing" or "production"');
        process.exit(1);
      }
      mode = val;
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
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return { mode, concurrency, problem };
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
  const { mode, concurrency, problem: problemFilter } = parseArgs();

  console.log(`\nEval runner starting`);
  console.log(`  Mode: ${mode}`);
  console.log(`  Concurrency: ${concurrency}`);
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

    const run = await workflow.createRun();
    const result = await run.start({
      inputData: {
        rawProblemText: evalProblem.rawProblemText,
        modelMode: mode,
      },
    });

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

    // Score using the scorer
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

    console.log(
      `  ${evalProblem.id}: score=${problemResult.score.toFixed(2)} ` +
        `(${problemResult.correctCount}/${problemResult.totalQuestions}) [${elapsed}s]`,
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

  // Compute summary
  const totalQuestions = problemResults.reduce((sum, r) => sum + r.totalQuestions, 0);
  const totalCorrect = problemResults.reduce((sum, r) => sum + r.correctCount, 0);
  const meanScore =
    problemResults.length > 0
      ? problemResults.reduce((sum, r) => sum + r.score, 0) / problemResults.length
      : 0;

  const evalRunResult: EvalRunResult = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    modelMode: mode,
    gitCommit: getGitCommit(),
    duration,
    problems: problemResults,
    summary: {
      totalProblems: problemResults.length,
      meanScore,
      totalQuestions,
      totalCorrect,
      overallAccuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
    },
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
  const scoreWidth = 8;
  const correctWidth = 12;

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

  console.log();
  console.log(
    `Overall accuracy: ${(evalRunResult.summary.overallAccuracy * 100).toFixed(1)}% ` +
      `(${totalCorrect}/${totalQuestions})`,
  );
  console.log(`Mean score: ${meanScore.toFixed(3)}`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Mode: ${mode}`);
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
