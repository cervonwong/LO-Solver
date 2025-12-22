import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getProblemContext,
  getStructuredProblem,
  getCurrentRules,
  getVocabularyArray,
  getLogFile,
  normalizeTranslation,
  type ToolExecuteContext,
} from './request-context-helpers';
import { logSentenceTestResult } from './logging-utils';
import { ruleSchema } from './03a-rule-tester-tool';
import type { Rule } from './request-context-types';
import type { VocabularyEntry } from './vocabulary-tools';
import type { Mastra } from '@mastra/core/mastra';

// ============================================================================
// Shared Schemas
// ============================================================================

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

// ============================================================================
// Core Execution Function
// ============================================================================

interface ExecuteSentenceTestParams {
  id: string;
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  expectedTranslation?: string;
  rules: Rule[];
  problemContext: string;
  vocabulary: VocabularyEntry[];
  mastra: Mastra;
  logFile?: string;
}

/**
 * Core function that executes the sentence test logic.
 * Both testSentenceTool and testSentenceWithRulesetTool call this function.
 */
async function executeSentenceTest({
  id,
  content,
  sourceLanguage,
  targetLanguage,
  expectedTranslation,
  rules,
  problemContext,
  vocabulary,
  mastra,
  logFile,
}: ExecuteSentenceTestParams): Promise<z.infer<typeof sentenceTestResultSchema>> {
  // Phase 1: Blind Translation - agent does NOT see expected translation
  const prompt = `
Translate and validate the following sentence using the provided ruleset:

## Sentence to Translate
**ID:** ${id}
**Content:** ${content}
**From:** ${sourceLanguage}
**To:** ${targetLanguage}

## Context
${problemContext}

## Rules
${rules.map((r, i) => `${i + 1}. **${r.title}** (${r.confidence}): ${r.description}`).join('\n\n')}

## Vocabulary
${JSON.stringify(vocabulary, null, 2)}

Attempt to translate this sentence step by step using the rules and vocabulary above. Flag any ambiguities or issues. Produce your BEST translation based solely on the rules.
`.trim();

  try {
    const result = await mastra.getAgentById('wf03-sentence-tester').generate(prompt, {
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

    // Log result only if logFile is provided (i.e., using committed rules)
    if (logFile) {
      logSentenceTestResult(logFile, id, agentResult.overallStatus);
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
}

// ============================================================================
// testSentenceTool - Uses rules from requestContext
// ============================================================================

const sentenceTestInputSchema = z.object({
  id: z.string().describe('Identifier for the sentence (e.g., "1", "Q1")'),
  content: z.string().describe('The sentence content to translate'),
  sourceLanguage: z.string().describe('The language to translate FROM'),
  targetLanguage: z.string().describe('The language to translate TO'),
  expectedTranslation: z
    .string()
    .optional()
    .describe('Expected translation if known (from dataset).'),
});

/**
 * testSentenceTool - Tests a single sentence translation against the ruleset.
 * Uses blind translation: the agent translates WITHOUT seeing the expected answer.
 * After translation, the tool compares the result to the expected translation (if provided).
 * Reads ruleset from requestContext (committed rules).
 */
export const testSentenceTool = createTool({
  id: 'testSentence',
  description:
    'Tests a single sentence against the ruleset to verify it can be translated unambiguously. Uses blind translation (agent does not see expected answer) to avoid bias.',
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
    const logFile = getLogFile(ctx?.requestContext);

    return executeSentenceTest({
      id,
      content,
      sourceLanguage,
      targetLanguage,
      ...(expectedTranslation !== undefined && { expectedTranslation }),
      rules,
      problemContext,
      vocabulary,
      mastra: ctx.mastra!,
      ...(logFile !== undefined && { logFile }),
    });
  },
});

// ============================================================================
// testSentenceWithRulesetTool - Accepts ruleset as parameter
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
  ruleset: z
    .array(ruleSchema)
    .describe('The full ruleset to use for translation. Pass your entire draft ruleset.'),
});

/**
 * testSentenceWithRulesetTool - Tests a single sentence translation against a provided ruleset.
 * Uses blind translation: the agent translates WITHOUT seeing the expected answer.
 * After translation, the tool compares the result to the expected translation (if provided).
 * Unlike testSentenceTool, accepts ruleset as parameter for testing draft rules.
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
    const logFile = getLogFile(ctx?.requestContext);

    // Convert ruleset to Rule[] format
    const rules: Rule[] = ruleset.map((r) => ({
      title: r.title,
      description: r.description,
      confidence: r.confidence,
    }));

    return executeSentenceTest({
      id,
      content,
      sourceLanguage,
      targetLanguage,
      ...(expectedTranslation !== undefined && { expectedTranslation }),
      rules,
      problemContext: structuredProblem.context,
      vocabulary,
      mastra: ctx.mastra!,
      ...(logFile !== undefined && { logFile }),
    });
  },
});
