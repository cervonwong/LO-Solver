import { createScorer } from '@mastra/core/evals';

interface GroundTruthAnswer {
  questionIndex: number;
  acceptedAnswers: string[];
}

// Normalize a string for comparison: trim, lowercase, Unicode NFC
function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFC');
}

// Natural sort comparator for question IDs like "Q1", "Q2", ..., "Q10"
function naturalSortQuestionId(a: string, b: string): number {
  const numA = parseInt(a.replace(/\D/g, ''), 10);
  const numB = parseInt(b.replace(/\D/g, ''), 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
    return numA - numB;
  }
  return a.localeCompare(b);
}

interface PreprocessResult {
  predictedAnswers: string[];
  groundTruth: GroundTruthAnswer[];
  totalQuestions: number;
}

export const translationAccuracyScorer = createScorer({
  id: 'translation-accuracy',
  description:
    'Scores translation accuracy by comparing predicted answers against accepted ground-truth answers',
})
  .preprocess(({ run }) => {
    const output = run.output as {
      success: boolean;
      explanation: string;
      answers: Array<{
        questionId: string;
        answer: string;
        workingSteps: string;
        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
        confidenceReasoning: string;
      }> | null;
    };

    const groundTruth = run.groundTruth as GroundTruthAnswer[];

    // Extract and sort answers by questionId using natural sort
    const sortedAnswers = [...(output.answers ?? [])].sort((a, b) =>
      naturalSortQuestionId(a.questionId, b.questionId),
    );

    const predictedAnswers = sortedAnswers.map((a) => a.answer);

    const result: PreprocessResult = {
      predictedAnswers,
      groundTruth,
      totalQuestions: groundTruth.length,
    };

    return result;
  })
  .generateScore(({ results }) => {
    const { predictedAnswers, groundTruth, totalQuestions } = results.preprocessStepResult;

    if (totalQuestions === 0) {
      return 0;
    }

    let correct = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const predicted = predictedAnswers[i];
      const truth = groundTruth[i];

      // If no predicted answer for this question, it scores 0
      if (predicted === undefined || truth === undefined) {
        continue;
      }

      const normalizedPredicted = normalize(predicted);
      const isCorrect = truth.acceptedAnswers.some(
        (accepted) => normalize(accepted) === normalizedPredicted,
      );

      if (isCorrect) {
        correct++;
      }
    }

    return correct / totalQuestions;
  })
  .generateReason(({ results, score }) => {
    const { predictedAnswers, groundTruth, totalQuestions } = results.preprocessStepResult;

    const correct = Math.round(score * totalQuestions);
    const lines: string[] = [];

    for (let i = 0; i < totalQuestions; i++) {
      const predicted = predictedAnswers[i];
      const truth = groundTruth[i];
      const qLabel = `Q${i + 1}`;

      if (predicted === undefined || truth === undefined) {
        const expected = truth?.acceptedAnswers[0] ?? '(unknown)';
        lines.push(`${qLabel}: WRONG - predicted: (no answer), expected: ${expected}`);
        continue;
      }

      const normalizedPredicted = normalize(predicted);
      const isCorrect = truth.acceptedAnswers.some(
        (accepted) => normalize(accepted) === normalizedPredicted,
      );

      if (isCorrect) {
        lines.push(`${qLabel}: CORRECT`);
      } else {
        const expected = truth.acceptedAnswers.join(' | ');
        lines.push(`${qLabel}: WRONG - predicted: ${predicted}, expected: ${expected}`);
      }
    }

    lines.push(`\n${correct}/${totalQuestions} correct`);

    return lines.join('\n');
  });
