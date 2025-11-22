import { createCompletenessScorer } from '@mastra/evals/scorers/code';

export const completenessScorer = createCompletenessScorer();

export const scorers = {
    completenessScorer,
};