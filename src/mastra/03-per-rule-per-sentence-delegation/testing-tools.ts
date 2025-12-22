import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getStructuredProblem,
  getVocabularyArray,
  normalizeTranslation,
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

    // Format all rules, highlighting the one being tested
    const formattedRules = ruleset
      .map((r, i) => {
        const isTarget = r.title === rule.title;
        const prefix = isTarget ? '>>> ' : '    ';
        const suffix = isTarget ? ' <<< [TESTING THIS RULE]' : '';
        return `${prefix}${i + 1}. **${r.title}** (${r.confidence}): ${r.description}${suffix}`;
      })
      .join('\n\n');

    const prompt = `
# Rule to Test

**Title:** ${rule.title}
**Description:** ${rule.description}
**Confidence:** ${rule.confidence}

This is the rule you must validate. Test it against ALL relevant sentences in the dataset.

---

## Full Ruleset Context (for reference)

These are all the rules being proposed. The rule being tested is highlighted with >>> markers. Use this to understand how the target rule interacts with others.

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
    .describe(
      'Expected translation if known (from dataset). Agent will NOT see this - used for post-hoc comparison only.',
    ),
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
  matchesExpected: z
    .boolean()
    .nullable()
    .describe('Whether the translation matches expected (null if no expected provided)'),
  expectedTranslation: z
    .string()
    .nullable()
    .describe('The expected translation for reference (null if not provided)'),
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

// Schema for the agent's response (without matchesExpected, expectedTranslation)
const agentResponseSchema = z.object({
  canTranslate: z.boolean(),
  translation: z.string(),
  ambiguities: z.array(z.string()),
  suggestions: z.array(suggestionSchema),
  overallStatus: z.enum(['SENTENCE_OK', 'SENTENCE_AMBIGUOUS', 'SENTENCE_UNTRANSLATABLE']),
});

/**
 * testSentenceWithRulesetTool - Tests a single sentence translation against a provided ruleset.
 * Uses blind translation: the agent translates WITHOUT seeing the expected answer.
 * After translation, the tool compares the result to the expected translation (if provided).
 */
export const testSentenceWithRulesetTool = createTool({
  id: 'testSentenceWithRuleset',
  description:
    'Tests a single sentence translation using YOUR proposed ruleset. Uses blind translation (agent does not see expected answer) to avoid bias.',
  inputSchema: sentenceTestWithRulesetInputSchema,
  outputSchema: sentenceTestResultSchema,
  execute: async (
    { id, content, sourceLanguage, targetLanguage, expectedTranslation, ruleset },
    context,
  ) => {
    const ctx = context as unknown as ToolExecuteContext;
    const structuredProblem = getStructuredProblem(ctx?.requestContext);
    const vocabulary = getVocabularyArray(ctx?.requestContext);

    // Phase 1: Blind Translation - agent does NOT see expected translation
    const prompt = `
Translate and validate the following sentence using the provided ruleset:

## Sentence to Translate
**ID:** ${id}
**Content:** ${content}
**From:** ${sourceLanguage}
**To:** ${targetLanguage}

## Context
${structuredProblem.context}

## Rules
${ruleset.map((r, i) => `${i + 1}. **${r.title}** (${r.confidence}): ${r.description}`).join('\n\n')}

## Vocabulary
${JSON.stringify(vocabulary, null, 2)}

Attempt to translate this sentence step by step using the rules and vocabulary above. Flag any ambiguities or issues. Produce your BEST translation based solely on the rules.
`.trim();

    try {
      const result = await ctx.mastra!.getAgentById('wf03-sentence-tester').generate(prompt, {
        structuredOutput: {
          schema: agentResponseSchema,
        },
      });

      const agentResult = result.object as z.infer<typeof agentResponseSchema>;

      // Phase 2: Post-hoc Comparison (if expected translation provided)
      let matchesExpected: boolean | null = null;
      if (expectedTranslation) {
        const normalizedTranslation = normalizeTranslation(agentResult.translation);
        const normalizedExpected = normalizeTranslation(expectedTranslation);
        matchesExpected = normalizedTranslation === normalizedExpected;
      }

      return {
        success: true as const,
        canTranslate: agentResult.canTranslate,
        translation: agentResult.translation,
        matchesExpected,
        expectedTranslation: expectedTranslation ?? null,
        ambiguities: agentResult.ambiguities,
        suggestions: agentResult.suggestions,
        overallStatus: agentResult.overallStatus,
      };
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
