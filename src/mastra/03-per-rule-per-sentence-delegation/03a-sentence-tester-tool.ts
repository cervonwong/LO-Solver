import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getProblemContext,
  getCurrentRules,
  getVocabularyArray,
  type ToolExecuteContext,
} from './request-context-helpers';

const sentenceTestInputSchema = z.object({
  id: z.string().describe('Identifier for the sentence (e.g., "1", "Q1")'),
  content: z.string().describe('The sentence content to translate'),
  sourceLanguage: z.string().describe('The language to translate FROM'),
  targetLanguage: z.string().describe('The language to translate TO'),
  expectedTranslation: z
    .string()
    .optional()
    .describe('Expected translation if known (from dataset)'),
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
 * testSentenceTool - Tests a single sentence translation against the ruleset.
 * Uses the static sentenceTesterAgent via mastra.getAgentById().
 * Context (rules, vocabulary, problem context) is passed in the prompt.
 */
export const testSentenceTool = createTool({
  id: 'testSentence',
  description:
    'Tests a single sentence against the ruleset to verify it can be translated unambiguously. Call this for EACH sentence you want to test.',
  inputSchema: sentenceTestInputSchema,
  outputSchema: sentenceTestResultSchema,
  execute: async (
    { id, content, sourceLanguage, targetLanguage, expectedTranslation },
    context,
  ) => {
    const ctx = context as unknown as ToolExecuteContext;
    const problemContext = getProblemContext(ctx?.requestContext);
    const rules = getCurrentRules(ctx?.requestContext);
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
${problemContext}

## Rules
${rules.map((r, i) => `${i + 1}. **${r.title}**: ${r.description}`).join('\n\n')}

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
