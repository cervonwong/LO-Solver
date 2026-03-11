import { z } from 'zod';
import { createWorkflowAgent } from './agent-factory';
import { RULE_TESTER_INSTRUCTIONS } from './03a-rule-tester-instructions';

/**
 * Rule Tester Agent - tests a single linguistic rule against the dataset.
 * Receives full ruleset context but focuses on validating the highlighted rule.
 */
export const ruleTesterAgent = createWorkflowAgent({
  id: 'rule-tester',
  name: '[Step 3] Rule Tester Agent',
  instructions: RULE_TESTER_INSTRUCTIONS,
  productionModel: 'openai/gpt-5-mini',
  claudeCodeModel: 'claude-sonnet-4-6',
  useUnicodeNormalizer: false,
  requestContextSchema: z.object({
    'provider-mode': z.enum(['openrouter-testing', 'openrouter-production', 'claude-code']),
  }),
});
