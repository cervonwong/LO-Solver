import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  getStructuredProblem,
  getVocabularyArray,
  getCurrentRules,
  getLogFile,
  type ToolExecuteContext,
} from './request-context-helpers';
import { logRuleTestResult } from './logging-utils';
import type { StructuredProblemData, Rule } from './request-context-types';
import type { VocabularyEntry } from './vocabulary-tools';
import type { Mastra } from '@mastra/core/mastra';

// ============================================================================
// Shared Schemas
// ============================================================================

export const ruleSchema = z.object({
  title: z.string().describe('A short title that groups or organises the rule'),
  description: z.string().describe('A detailed description of the rule'),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence level for this rule'),
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

// ============================================================================
// Core Execution Function
// ============================================================================

interface ExecuteRuleTestParams {
  rule: { title: string; description: string; confidence?: string };
  allRules: Rule[];
  structuredProblem: StructuredProblemData;
  vocabulary: VocabularyEntry[];
  mastra: Mastra;
  logFile?: string;
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
}: ExecuteRuleTestParams): Promise<z.infer<typeof ruleTestResultSchema>> {
  // Format all rules, highlighting the one being tested
  const formattedRules = allRules
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
    const result = await mastra.getAgentById('wf03-rule-tester').generate(prompt, {
      maxSteps: 100,
      structuredOutput: {
        schema: ruleTestSuccessSchema,
      },
    });

    const ruleResult = result.object as z.infer<typeof ruleTestSuccessSchema>;

    // Log result only if logFile is provided (i.e., using committed rules)
    if (logFile) {
      logRuleTestResult(logFile, rule.title, ruleResult.status);
    }

    return ruleResult;
  } catch (err) {
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

    return executeRuleTest({
      rule: { title, description },
      allRules,
      structuredProblem,
      vocabulary,
      mastra: ctx.mastra!,
      ...(logFile !== undefined && { logFile }),
    });
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

    // Convert ruleset to Rule[] format (add confidence if missing)
    const allRules: Rule[] = ruleset.map((r) => ({
      title: r.title,
      description: r.description,
      confidence: r.confidence,
    }));

    return executeRuleTest({
      rule,
      allRules,
      structuredProblem,
      vocabulary,
      mastra: ctx.mastra!,
      ...(logFile !== undefined && { logFile }),
    });
  },
});
