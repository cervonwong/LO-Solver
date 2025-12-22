import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getStructuredProblem,
  getVocabularyArray,
  type ToolExecuteContext,
} from './request-context-helpers';

// Schema for a single rule, matching the workflow rule schema
const ruleSchema = z.object({
  title: z.string().describe('A short title that groups or organises the rule'),
  description: z.string().describe('A detailed description of the rule'),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence level for this rule'),
});

// Array of rules for the ruleset parameter
const rulesetSchema = z.array(ruleSchema);

// ============================================================================
// testRuleWithRuleset Tool
// ============================================================================

const ruleTestWithRulesetInputSchema = z.object({
  rule: ruleSchema.describe('The specific rule to test'),
  ruleset: rulesetSchema.describe(
    'The full ruleset context (all rules you are proposing). This provides context for testing the specific rule.',
  ),
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
 * testRuleWithRulesetTool - Tests a single linguistic rule against the dataset with a provided ruleset.
 * Unlike testRuleTool, this accepts the ruleset as a parameter instead of reading from requestContext.
 * This allows agents to test draft rules before committing them.
 */
export const testRuleWithRulesetTool = createTool({
  id: 'testRuleWithRuleset',
  description:
    'Tests a single linguistic rule against the dataset using YOUR proposed ruleset. Use this to validate your rules BEFORE committing them. Pass your entire draft ruleset for context.',
  inputSchema: ruleTestWithRulesetInputSchema,
  outputSchema: ruleTestResultSchema,
  execute: async ({ rule, ruleset }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const structuredProblem = getStructuredProblem(ctx?.requestContext);
    const vocabulary = getVocabularyArray(ctx?.requestContext);

    const prompt = `
Test the following rule against the dataset:

## Rule to Test
**Title:** ${rule.title}
**Description:** ${rule.description}
**Confidence:** ${rule.confidence}

## Full Ruleset Context
These are all the rules being proposed. Use them to understand the complete grammar system:
${ruleset.map((r, i) => `${i + 1}. **${r.title}** (${r.confidence}): ${r.description}`).join('\n\n')}

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

// ============================================================================
// testSentenceWithRuleset Tool
// ============================================================================

const sentenceTestWithRulesetInputSchema = z.object({
  id: z.string().describe('Identifier for the sentence (e.g., "1", "Q1")'),
  content: z.string().describe('The sentence content to translate'),
  sourceLanguage: z.string().describe('The language to translate FROM'),
  targetLanguage: z.string().describe('The language to translate TO'),
  expectedTranslation: z
    .string()
    .optional()
    .describe('Expected translation if known (from dataset)'),
  ruleset: rulesetSchema.describe(
    'The full ruleset to use for translation. Pass your entire draft ruleset.',
  ),
});

const suggestionSchema = z.object({
  suggestion: z.string().describe('The suggested translation or interpretation'),
  likelihood: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .describe('Likelihood of this suggestion being correct'),
  reasoning: z.string().describe('Why this suggestion might be correct'),
});

const sentenceTestSuccessSchema = z.object({
  success: z.literal(true),
  canTranslate: z
    .boolean()
    .describe('Whether the sentence can be confidently translated using the ruleset'),
  translation: z.string().describe('The attempted translation, or empty if not possible'),
  ambiguities: z.array(z.string()).describe('List of ambiguous or confusing parts encountered'),
  suggestions: z
    .array(suggestionSchema)
    .describe('3 different suggestions for improvement, ranked by likelihood'),
  overallStatus: z
    .enum(['SENTENCE_OK', 'SENTENCE_AMBIGUOUS', 'SENTENCE_UNTRANSLATABLE'])
    .describe('Overall status of the sentence translation attempt'),
});

const sentenceTestErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message describing what went wrong'),
});

const sentenceTestResultSchema = z.discriminatedUnion('success', [
  sentenceTestSuccessSchema,
  sentenceTestErrorSchema,
]);

/**
 * testSentenceWithRulesetTool - Tests a single sentence translation against a provided ruleset.
 * Unlike testSentenceTool, this accepts the ruleset as a parameter instead of reading from requestContext.
 * This allows agents to test draft rules before committing them.
 */
export const testSentenceWithRulesetTool = createTool({
  id: 'testSentenceWithRuleset',
  description:
    'Tests a single sentence translation using YOUR proposed ruleset. Use this to verify your rules can correctly translate sentences BEFORE committing them.',
  inputSchema: sentenceTestWithRulesetInputSchema,
  outputSchema: sentenceTestResultSchema,
  execute: async (
    { id, content, sourceLanguage, targetLanguage, expectedTranslation, ruleset },
    context,
  ) => {
    const ctx = context as unknown as ToolExecuteContext;
    const structuredProblem = getStructuredProblem(ctx?.requestContext);
    const vocabulary = getVocabularyArray(ctx?.requestContext);

    const prompt = `
Translate and validate the following sentence using the provided ruleset:

## Sentence to Translate
**ID:** ${id}
**Content:** ${content}
**From:** ${sourceLanguage}
**To:** ${targetLanguage}
${expectedTranslation ? `**Expected Translation:** ${expectedTranslation}` : ''}

## Context
${structuredProblem.context}

## Rules
${ruleset.map((r, i) => `${i + 1}. **${r.title}** (${r.confidence}): ${r.description}`).join('\n\n')}

## Vocabulary
${JSON.stringify(vocabulary, null, 2)}

Attempt to translate this sentence step by step using the rules and vocabulary above. Flag any ambiguities or issues.
`.trim();

    try {
      const result = await ctx.mastra!.getAgentById('wf03-sentence-tester').generate(prompt, {
        structuredOutput: {
          schema: sentenceTestSuccessSchema,
        },
      });

      return result.object as z.infer<typeof sentenceTestSuccessSchema>;
    } catch (err) {
      return {
        success: false as const,
        error: `Sentence test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  },
});

// Export all testing tools as a record for easy import
export const testingTools = {
  testRuleWithRuleset: testRuleWithRulesetTool,
  testSentenceWithRuleset: testSentenceWithRulesetTool,
};
