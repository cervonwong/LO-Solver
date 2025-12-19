import { createTool } from '@mastra/core/tools';
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { sharedMemory } from './shared-memory';

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

const RULE_TESTER_SYSTEM_PROMPT = `
You are a specialized linguistic rule validator. Your job is to test a SINGLE rule against a linguistic dataset to determine if the rule is correct, consistent, and sufficient.

# Your Task
You will receive:
1. A single rule (title and description)
2. The full structured problem data (context, dataset, questions)

# Testing Process
1. Find ALL examples in the dataset where this rule SHOULD apply
2. Apply the rule to each relevant example
3. Check if the rule's predictions match the actual data
4. Identify any inconsistencies, edge cases, or missing conditions

# Output Requirements
- **status**: One of the following:
  - RULE_OK: Rule is correct, consistent, and sufficient for all relevant examples
  - RULE_WRONG: Rule contradicts the data or produces incorrect outputs
  - RULE_INCONSISTENT: Rule works sometimes but needs exceptions, constraints, or conditions
  - RULE_UNCLEAR: Rule is too vague or ambiguous to apply consistently
  - RULE_NEEDS_UPDATE: Rule needs modification to better fit the data
  - RULE_NEW_NEEDED: This pattern suggests a new rule is needed

- **reasoning**: 1-2 sentences with SPECIFIC evidence from the dataset. Cite item IDs and show the relevant data.

- **recommendation**: Specific, actionable advice on how to fix the rule. Leave empty if RULE_OK.

# Example Output
{
  "status": "RULE_INCONSISTENT",
  "reasoning": "Rule states adjectives follow nouns, but item #5 'red house' = 'aka ie' shows 'aka' (red) preceding 'ie' (house). Items #2, #7, #9 follow the rule correctly.",
  "recommendation": "Add exception: Color adjectives precede nouns, while other adjectives follow nouns."
}
`.trim();

interface StructuredProblemData {
  context: string;
  dataset: Record<string, string>[];
  questions: { id: string; type: string; input: string }[];
}

/**
 * Factory function to create a rule tester tool with shared context baked in.
 * The orchestrator only needs to specify which rule to test.
 */
export function createTestRuleTool(structuredProblem: StructuredProblemData) {
  // Create a dedicated agent for rule testing
  const ruleTesterAgent = new Agent({
    id: 'wf03-rule-tester',
    name: '[03-3a-tool] Rule Tester Agent',
    instructions: RULE_TESTER_SYSTEM_PROMPT,
    model: 'openrouter/openai/gpt-5-mini',
    tools: {},
    memory: sharedMemory,
  });

  return createTool({
    id: 'testRule',
    description:
      'Tests a single linguistic rule against the dataset to verify correctness and consistency. Call this for EACH rule you want to test.',
    inputSchema: ruleTestInputSchema,
    outputSchema: ruleTestResultSchema,
    execute: async (inputData, _context) => {
      const { title, description } = inputData;

      const prompt = `
Test the following rule against the dataset:

## Rule to Test
**Title:** ${title}
**Description:** ${description}

## Dataset Context
${structuredProblem.context}

## Dataset Items
${JSON.stringify(structuredProblem.dataset, null, 2)}

## Questions (for reference)
${JSON.stringify(structuredProblem.questions, null, 2)}

Analyze this rule against the dataset and provide your assessment.
`.trim();

      try {
        const result = await ruleTesterAgent.generate(prompt, {
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
}
