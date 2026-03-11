import { z } from 'zod';
import { createWorkflowAgent } from './agent-factory';
import { SENTENCE_TESTER_INSTRUCTIONS } from './03a-sentence-tester-instructions';

/**
 * Sentence Tester Agent - tests a single sentence translation against the ruleset.
 * Performs BLIND translation - never sees the expected answer to avoid bias.
 */
export const sentenceTesterAgent = createWorkflowAgent({
  id: 'sentence-tester',
  name: '[Step 3] Sentence Tester Agent',
  instructions: SENTENCE_TESTER_INSTRUCTIONS,
  productionModel: 'openai/gpt-5-mini',
  claudeCodeModel: 'claude-sonnet-4-6',
  useUnicodeNormalizer: false,
  requestContextSchema: z.object({
    'provider-mode': z.enum(['openrouter-testing', 'openrouter-production', 'claude-code']),
  }),
});
