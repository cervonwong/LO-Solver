import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getProblemContext,
  getStructuredProblem,
  getCurrentRules,
  getVocabularyArray,
  getLogFile,
  normalizeTranslation,
  emitToolTraceEvent,
  type ToolExecuteContext,
} from './request-context-helpers';
import { logSentenceTestResult, formatTimestamp } from './logging-utils';
import { ruleSchema } from './workflow-schemas';
import type { Rule } from './request-context-types';
import type { VocabularyEntry } from './vocabulary-tools';
import type { Mastra } from '@mastra/core/mastra';
import { RequestContext } from '@mastra/core/request-context';
import { generateWithRetry } from './agent-utils';

// ============================================================================
// Shared Schemas
// ============================================================================

const sentenceTestAgentSchema = z.object({
  passed: z
    .boolean()
    .describe('Whether the sentence can be confidently and unambiguously translated using the ruleset'),
  translation: z.string().describe('The attempted translation, or empty string if not possible'),
  reasoning: z
    .string()
    .describe(
      'Explain the translation process step by step. Note any ambiguities, missing rules, or issues. If failed, suggest how to fix the rules.',
    ),
});

const sentenceTestSuccessSchema = z.object({
  success: z.literal(true),
  passed: z.boolean(),
  translation: z.string(),
  reasoning: z.string(),
  matchesExpected: z
    .boolean()
    .nullable()
    .describe('Whether the translation matches expected (null if no expected provided)'),
  expectedTranslation: z
    .string()
    .nullable()
    .describe('The expected translation for reference (null if not provided)'),
});

const sentenceTestErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message describing what went wrong'),
});

const sentenceTestResultSchema = z.discriminatedUnion('success', [
  sentenceTestSuccessSchema,
  sentenceTestErrorSchema,
]);

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
  requestContext?: RequestContext;
  abortSignal?: AbortSignal | undefined;
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
  requestContext,
  abortSignal,
}: ExecuteSentenceTestParams): Promise<z.infer<typeof sentenceTestResultSchema>> {
  // Create a lightweight RequestContext for the tester sub-agent.
  // Copies essential fields but strips claude-code-provider-factory so the tester
  // uses the singleton Claude Code provider (no MCP overhead — testers don't need tools).
  let testerRequestContext: RequestContext | undefined;
  if (requestContext) {
    testerRequestContext = new RequestContext();
    const keysToForward = [
      'provider-mode',
      'workflow-start-time',
      'abort-signal',
      'openrouter-provider',
    ] as const;
    for (const key of keysToForward) {
      const val = requestContext.get(key as any);
      if (val !== undefined) (testerRequestContext as any).set(key, val);
    }
  }
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
${rules.map((r, i) => `${i + 1}. **${r.title}**${r.confidence ? ` (${r.confidence})` : ''}: ${r.description}`).join('\n\n')}

## Vocabulary
${JSON.stringify(vocabulary, null, 2)}

Attempt to translate this sentence step by step using the rules and vocabulary above. Flag any ambiguities or issues. Produce your BEST translation based solely on the rules.
`.trim();

  const wfStartTime = requestContext?.get('workflow-start-time') as number | undefined;
  const testStartTime = Date.now();
  console.log(
    `${formatTimestamp(wfStartTime)} [TOOL:testSentence] Starting sentence-tester sub-agent for "${id}" (${rules.length} rules, ${vocabulary.length} vocab)...`,
  );

  try {
    const result = await generateWithRetry(mastra.getAgentById('sentence-tester'), {
      prompt,
      ...(abortSignal && { abortSignal }),
      options: {
        maxSteps: 100,
        ...(testerRequestContext && { requestContext: testerRequestContext }),
        structuredOutput: {
          schema: sentenceTestAgentSchema,
        },
      },
    });

    const agentResult = result.object as z.infer<typeof sentenceTestAgentSchema>;
    const durationSec = ((Date.now() - testStartTime) / 1000).toFixed(1);
    console.log(
      `${formatTimestamp(wfStartTime)} [TOOL:testSentence] Sentence-tester for "${id}" completed in ${durationSec}s — ${agentResult.passed ? 'PASS' : 'FAIL'}`,
    );

    // Phase 2: Post-hoc Comparison (if expected translation provided)
    let matchesExpected: boolean | null = null;
    if (expectedTranslation) {
      const normalizedTranslation = normalizeTranslation(agentResult.translation);
      const normalizedExpected = normalizeTranslation(expectedTranslation);
      matchesExpected = normalizedTranslation === normalizedExpected;
    }

    // Log result only if logFile is provided (i.e., using committed rules)
    if (logFile) {
      logSentenceTestResult(logFile, id, agentResult.passed ? 'PASS' : 'FAIL', wfStartTime);
    }

    return {
      success: true as const,
      passed: agentResult.passed,
      translation: agentResult.translation,
      reasoning: agentResult.reasoning,
      matchesExpected,
      expectedTranslation: expectedTranslation ?? null,
    };
  } catch (err) {
    const durationSec = ((Date.now() - testStartTime) / 1000).toFixed(1);
    console.error(
      `${formatTimestamp(wfStartTime)} [TOOL:testSentence] Sentence-tester for "${id}" FAILED after ${durationSec}s — ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
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

    // Emit start event so the UI shows the test is running
    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-tool-call',
      data: {
        stepId: 'multi-perspective-hypothesis',
        toolName: 'testSentence',
        input: { id, content },
        result: { status: 'started', subAgent: 'sentence-tester' },
        timestamp: new Date().toISOString(),
      },
    });

    const abortSignal = ctx.requestContext?.get('abort-signal') as
      | AbortSignal
      | undefined;

    const result = await executeSentenceTest({
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
      ...(ctx.requestContext && { requestContext: ctx.requestContext as RequestContext }),
      ...(abortSignal && { abortSignal }),
    });

    // Emit completion event with actual result
    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-tool-call',
      data: {
        stepId: 'multi-perspective-hypothesis',
        toolName: 'testSentence',
        input: { id, content },
        result: result as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      },
    });

    return result;
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

    // Emit start event so the UI shows the test is running
    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-tool-call',
      data: {
        stepId: 'multi-perspective-hypothesis',
        toolName: 'testSentenceWithRuleset',
        input: { id, content, rulesetCount: ruleset.length },
        result: { status: 'started', subAgent: 'sentence-tester' },
        timestamp: new Date().toISOString(),
      },
    });

    // Convert ruleset to Rule[] format (conditionally include confidence if present)
    const rules: Rule[] = ruleset.map((r) => ({
      title: r.title,
      description: r.description,
      ...(r.confidence !== undefined && { confidence: r.confidence }),
    }));

    const abortSignal = ctx.requestContext?.get('abort-signal') as
      | AbortSignal
      | undefined;

    const result = await executeSentenceTest({
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
      ...(ctx.requestContext && { requestContext: ctx.requestContext as RequestContext }),
      ...(abortSignal && { abortSignal }),
    });

    // Emit completion event with actual result
    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-tool-call',
      data: {
        stepId: 'multi-perspective-hypothesis',
        toolName: 'testSentenceWithRuleset',
        input: { id, content, rulesetCount: ruleset.length },
        result: result as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      },
    });

    return result;
  },
});
