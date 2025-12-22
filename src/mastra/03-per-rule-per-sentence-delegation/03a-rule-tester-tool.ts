import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getStructuredProblem,
  getVocabularyArray,
  getCurrentRules,
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
 * Provides full ruleset context for understanding rule interdependencies.
 */
export const testRuleTool = createTool({
  id: 'testRule',
  description:
    'Tests a single linguistic rule against the dataset to verify correctness and consistency. The full ruleset is provided for context. Call this for EACH rule you want to test.',
  inputSchema: ruleTestInputSchema,
  outputSchema: ruleTestResultSchema,
  execute: async ({ title, description }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const structuredProblem = getStructuredProblem(ctx?.requestContext);
    const vocabulary = getVocabularyArray(ctx?.requestContext);
    const allRules = getCurrentRules(ctx?.requestContext);

    // Format all rules, highlighting the one being tested
    const formattedRules = allRules
      .map((r, i) => {
        const isTarget = r.title === title;
        const prefix = isTarget ? '>>> ' : '    ';
        const suffix = isTarget ? ' <<< [TESTING THIS RULE]' : '';
        return `${prefix}${i + 1}. **${r.title}** (${r.confidence}): ${r.description}${suffix}`;
      })
      .join('\n\n');

    const prompt = `
# Rule to Test

**Title:** ${title}
**Description:** ${description}

This is the rule you must validate. Test it against ALL relevant sentences in the dataset.

---

## Full Ruleset Context (for reference)

These are all the rules in the current grammar. The rule being tested is highlighted with >>> markers. Use this to understand how the target rule interacts with others.

${formattedRules}

## Dataset Context
${structuredProblem.context}

## Dataset Items
${JSON.stringify(structuredProblem.dataset, null, 2)}

## Vocabulary
${JSON.stringify(vocabulary, null, 2)}

## Questions (for reference)
${JSON.stringify(structuredProblem.questions, null, 2)}

**Your task**: Test the rule shown above against ALL relevant sentences in the dataset. Check if the rule's predictions match the actual data. Note any conflicts with other rules as a secondary concern.
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
