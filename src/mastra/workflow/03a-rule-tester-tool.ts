import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getStructuredProblem,
  getVocabularyArray,
  getCurrentRules,
  getLogFile,
  emitToolTraceEvent,
  type ToolExecuteContext,
} from './request-context-helpers';
import { logRuleTestResult, formatTimestamp } from './logging-utils';
import type { StructuredProblemData, Rule } from './request-context-types';
import type { VocabularyEntry } from './vocabulary-tools';
import type { Mastra } from '@mastra/core/mastra';
import { RequestContext } from '@mastra/core/request-context';
import { generateWithRetry } from './agent-utils';
import { ruleSchema } from './workflow-schemas';

// ============================================================================
// Shared Schemas
// ============================================================================

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

// ============================================================================
// Core Execution Function
// ============================================================================

interface ExecuteRuleTestParams {
  rule: { title: string; description: string; confidence?: 'HIGH' | 'MEDIUM' | 'LOW' };
  allRules: Rule[];
  structuredProblem: StructuredProblemData;
  vocabulary: VocabularyEntry[];
  mastra: Mastra;
  logFile?: string;
  requestContext?: RequestContext;
  abortSignal?: AbortSignal | undefined;
}

/**
 * Core function that executes the rule test logic.
 * Both testRuleTool and testRuleWithRulesetTool call this function.
 */
async function executeRuleTest({
  rule,
  allRules,
  structuredProblem,
  vocabulary,
  mastra,
  logFile,
  requestContext,
  abortSignal,
}: ExecuteRuleTestParams): Promise<z.infer<typeof ruleTestResultSchema>> {
  // Format all rules, highlighting the one being tested
  const formattedRules = allRules
    .map((r, i) => {
      const isTarget = r.title === rule.title;
      const prefix = isTarget ? '>>> ' : '    ';
      const suffix = isTarget ? ' <<< [TESTING THIS RULE]' : '';
      return `${prefix}${i + 1}. **${r.title}**${r.confidence ? ` (${r.confidence})` : ''}: ${r.description}${suffix}`;
    })
    .join('\n\n');

  const prompt = `
# Rule to Test

**Title:** ${rule.title}
**Description:** ${rule.description}

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

  const wfStartTime = requestContext?.get('workflow-start-time') as number | undefined;
  const testStartTime = Date.now();
  console.log(
    `${formatTimestamp(wfStartTime)} [TOOL:testRule] Starting rule-tester sub-agent for "${rule.title}" (${allRules.length} rules in context)...`,
  );

  try {
    const result = await generateWithRetry(mastra.getAgentById('rule-tester'), {
      prompt,
      ...(abortSignal && { abortSignal }),
      options: {
        maxSteps: 100,
        ...(requestContext && { requestContext }),
        structuredOutput: {
          schema: ruleTestSuccessSchema,
        },
      },
    });

    const ruleResult = result.object as z.infer<typeof ruleTestSuccessSchema>;
    const durationSec = ((Date.now() - testStartTime) / 1000).toFixed(1);
    console.log(
      `${formatTimestamp(wfStartTime)} [TOOL:testRule] Rule-tester for "${rule.title}" completed in ${durationSec}s — ${ruleResult.status}`,
    );

    // Log result only if logFile is provided (i.e., using committed rules)
    if (logFile) {
      logRuleTestResult(logFile, rule.title, ruleResult.status, wfStartTime);
    }

    // Emit rule test result for the frontend rules panel
    const rcGetter = requestContext
      ? { get: (key: string) => requestContext.get(key as keyof import('./request-context-types').WorkflowRequestContext) }
      : undefined;
    await emitToolTraceEvent(rcGetter as Parameters<typeof emitToolTraceEvent>[0], {
      type: 'data-rule-test-result',
      data: {
        ruleTitle: rule.title,
        passed: ruleResult.status === 'RULE_OK',
        timestamp: new Date().toISOString(),
      },
    });

    return ruleResult;
  } catch (err) {
    const durationSec = ((Date.now() - testStartTime) / 1000).toFixed(1);
    console.error(
      `${formatTimestamp(wfStartTime)} [TOOL:testRule] Rule-tester for "${rule.title}" FAILED after ${durationSec}s — ${err instanceof Error ? err.message : 'Unknown error'}`,
    );

    // Emit failing rule test result for the frontend rules panel
    const rcGetter = requestContext
      ? { get: (key: string) => requestContext.get(key as keyof import('./request-context-types').WorkflowRequestContext) }
      : undefined;
    await emitToolTraceEvent(rcGetter as Parameters<typeof emitToolTraceEvent>[0], {
      type: 'data-rule-test-result',
      data: {
        ruleTitle: rule.title,
        passed: false,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: false as const,
      error: `Rule test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// testRuleTool - Uses rules from requestContext
// ============================================================================

const ruleTestInputSchema = z.object({
  title: z.string().describe('The title/category of the rule'),
  description: z.string().describe('The detailed description of the rule'),
});

/**
 * testRuleTool - Tests a single linguistic rule against the dataset.
 * Uses the static ruleTesterAgent via mastra.getAgentById().
 * Reads ruleset from requestContext (committed rules).
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
    const logFile = getLogFile(ctx?.requestContext);

    // Emit start event so the UI shows the test is running
    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-tool-call',
      data: {
        stepId: 'multi-perspective-hypothesis',
        toolName: 'testRule',
        input: { title, ruleCount: allRules.length },
        result: { status: 'started', subAgent: 'rule-tester' },
        timestamp: new Date().toISOString(),
      },
    });

    const abortSignal = (ctx.requestContext as any)?.get?.('abort-signal') as
      | AbortSignal
      | undefined;

    const result = await executeRuleTest({
      rule: { title, description },
      allRules,
      structuredProblem,
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
        toolName: 'testRule',
        input: { title, description },
        result: result as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      },
    });

    return result;
  },
});

// ============================================================================
// testRuleWithRulesetTool - Accepts ruleset as parameter
// ============================================================================

const ruleTestWithRulesetInputSchema = z.object({
  rule: ruleSchema.describe('The specific rule to test'),
  ruleset: z
    .array(ruleSchema)
    .describe(
      'The full ruleset context (all rules you are proposing). This provides context for testing the specific rule.',
    ),
});

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
    const logFile = getLogFile(ctx?.requestContext);

    // Emit start event so the UI shows the test is running
    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-tool-call',
      data: {
        stepId: 'multi-perspective-hypothesis',
        toolName: 'testRuleWithRuleset',
        input: { rule: { title: rule.title }, rulesetCount: ruleset.length },
        result: { status: 'started', subAgent: 'rule-tester' },
        timestamp: new Date().toISOString(),
      },
    });

    // Convert ruleset to Rule[] format (conditionally include confidence if present)
    const allRules: Rule[] = ruleset.map((r) => ({
      title: r.title,
      description: r.description,
      ...(r.confidence !== undefined && { confidence: r.confidence }),
    }));

    const abortSignal = (ctx.requestContext as any)?.get?.('abort-signal') as
      | AbortSignal
      | undefined;

    const result = await executeRuleTest({
      rule: {
        title: rule.title,
        description: rule.description,
        ...(rule.confidence !== undefined && { confidence: rule.confidence }),
      },
      allRules,
      structuredProblem,
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
        toolName: 'testRuleWithRuleset',
        input: { rule: { title: rule.title }, rulesetCount: ruleset.length },
        result: result as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      },
    });

    return result;
  },
});
