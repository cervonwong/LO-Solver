import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getStructuredProblem,
  getVocabularyArray,
  type ToolExecuteContext,
} from './request-context-helpers';

const ruleTestInputSchema = z.object({
  title: z.string().describe('The title/category of the rule'),
  description: z.string().describe('The detailed description of the rule'),
});

const ruleTestSuccessSchema = z.object({
  success: z.literal(true),
  status: z
    .enum([
      'RULE_OK',
      'RULE_WRONG',
      'RULE_INCONSISTENT',
      'RULE_UNCLEAR',
      'RULE_NEEDS_UPDATE',
      'RULE_NEW_NEEDED',
    ])
    .describe('Status of the rule after testing'),
  reasoning: z
    .string()
    .describe(
      '1-2 sentences explaining why the rule passed or failed, with evidence from the dataset',
    ),
  recommendation: z
    .string()
    .describe('How to improve the rule if it did not pass; empty if RULE_OK'),
});

const ruleTestErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message describing what went wrong'),
});

const ruleTestResultSchema = z.discriminatedUnion('success', [
  ruleTestSuccessSchema,
  ruleTestErrorSchema,
]);

/**
 * testRuleTool - Tests a single linguistic rule against the dataset.
 * Uses the static ruleTesterAgent via mastra.getAgentById().
 * Context (structured problem, vocabulary) is passed in the prompt.
 */
export const testRuleTool = createTool({
  id: 'testRule',
  description:
    'Tests a single linguistic rule against the dataset to verify correctness and consistency. Call this for EACH rule you want to test.',
  inputSchema: ruleTestInputSchema,
  outputSchema: ruleTestResultSchema,
  execute: async ({ title, description }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const structuredProblem = getStructuredProblem(ctx?.requestContext);
    const vocabulary = getVocabularyArray(ctx?.requestContext);

    const prompt = `
Test the following rule against the dataset:

## Rule to Test
**Title:** ${title}
**Description:** ${description}

## Dataset Context
${structuredProblem.context}

## Dataset Items
${JSON.stringify(structuredProblem.dataset, null, 2)}

## Vocabulary
${JSON.stringify(vocabulary, null, 2)}

## Questions (for reference)
${JSON.stringify(structuredProblem.questions, null, 2)}

Analyze this rule against the dataset and vocabulary. Verify the rule correctly handles all vocabulary entries and dataset patterns.
`.trim();

    try {
      const result = await ctx.mastra!.getAgentById('wf03-rule-tester').generate(prompt, {
        structuredOutput: {
          schema: ruleTestSuccessSchema,
        },
      });

      return result.object as z.infer<typeof ruleTestSuccessSchema>;
    } catch (err) {
      return {
        success: false as const,
        error: `Rule test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  },
});
