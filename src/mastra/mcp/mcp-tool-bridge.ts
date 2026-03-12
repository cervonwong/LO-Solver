/**
 * MCP tool server factory.
 * Wraps all 14 Mastra tools as in-process MCP tools via createCustomMcpServer.
 * Each workflow execution creates a fresh MCP server with closure-captured RequestContext.
 */
import {
  createCustomMcpServer,
  type MinimalCallToolResult,
  type McpSdkServerConfigWithInstance,
} from 'ai-sdk-provider-claude-code';
import type { Mastra } from '@mastra/core/mastra';
import type { RequestContext } from '@mastra/core/request-context';
import { z } from 'zod';
import type { WorkflowRequestContext } from '../workflow/request-context-types';
import type { ToolExecuteContext } from '../workflow/request-context-helpers';
import {
  getVocabulary,
  addVocabulary,
  updateVocabulary,
  removeVocabulary,
  clearVocabulary,
  vocabularyEntrySchema,
} from '../workflow/vocabulary-tools';
import {
  getRules,
  addRules,
  updateRules,
  removeRules,
  clearRules,
} from '../workflow/rules-tools';
import { ruleSchema } from '../workflow/workflow-schemas';
import { testRuleTool, testRuleWithRulesetTool } from '../workflow/03a-rule-tester-tool';
import {
  testSentenceTool,
  testSentenceWithRulesetTool,
} from '../workflow/03a-sentence-tester-tool';
import { MCP_TOOL_DESCRIPTIONS } from './mcp-tool-descriptions';

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

function jsonResult(data: unknown): MinimalCallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

function errorResult(message: string): MinimalCallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

// ---------------------------------------------------------------------------
// Context bridge helper
// ---------------------------------------------------------------------------

/**
 * Construct a ToolExecuteContext from closure-captured state.
 * Passes the real RequestContext (not a proxy) so tester tools can forward
 * it to sub-agent generate() calls where Mastra validates the full instance.
 */
function buildToolContext(
  requestContext: RequestContext<WorkflowRequestContext>,
  mastra: Mastra,
): ToolExecuteContext {
  return {
    requestContext,
    mastra,
  } as unknown as ToolExecuteContext;
}

// ---------------------------------------------------------------------------
// Generic handler wrapper
// ---------------------------------------------------------------------------

/**
 * Create an MCP handler that delegates to a Mastra tool's execute function.
 * The Mastra Tool type is complex with many generics, so we extract the
 * execute function and cast via `any` to bridge the type boundary.
 */
function createHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mastraTool: any,
  ctx: ToolExecuteContext,
): (args: Record<string, unknown>, extra: unknown) => Promise<MinimalCallToolResult> {
  return async (args) => {
    try {
      const result = await mastraTool.execute(args, ctx);
      return jsonResult(result);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : 'Unknown error');
    }
  };
}

// ---------------------------------------------------------------------------
// MCP Server Factory
// ---------------------------------------------------------------------------

/**
 * Create an in-process MCP server exposing all 14 Mastra tools.
 *
 * @param requestContext - Per-execution RequestContext with vocabulary/rules Maps
 * @param mastra - Mastra instance for sub-agent spawning (tester tools)
 * @param options.testToolMode - Controls which tester variant is registered
 *   under the `testRule`/`testSentence` names:
 *   - 'committed' (default): uses committed rules from RequestContext
 *   - 'draft': uses WithRuleset handler (accepts ruleset as parameter)
 */
export function createMcpToolServer(
  requestContext: RequestContext<WorkflowRequestContext>,
  mastra: Mastra,
  options?: { testToolMode?: 'committed' | 'draft' },
): McpSdkServerConfigWithInstance {
  const testToolMode = options?.testToolMode ?? 'committed';
  const ctx = buildToolContext(requestContext, mastra);

  // Select which handler to register under the testRule / testSentence names
  const testRuleHandler =
    testToolMode === 'committed'
      ? createHandler(testRuleTool, ctx)
      : createHandler(testRuleWithRulesetTool, ctx);

  const testSentenceHandler =
    testToolMode === 'committed'
      ? createHandler(testSentenceTool, ctx)
      : createHandler(testSentenceWithRulesetTool, ctx);

  // Input schemas matching the selected handlers
  const testRuleInputSchema =
    testToolMode === 'committed'
      ? z.object({
          title: z.string().describe('The title/category of the rule'),
          description: z.string().describe('The detailed description of the rule'),
        })
      : z.object({
          rule: ruleSchema.describe('The specific rule to test'),
          ruleset: z.array(ruleSchema).describe('The full ruleset context'),
        });

  const testSentenceInputSchema =
    testToolMode === 'committed'
      ? z.object({
          id: z.string().describe('Identifier for the sentence (e.g., "1", "Q1")'),
          content: z.string().describe('The sentence content to translate'),
          sourceLanguage: z.string().describe('The language to translate FROM'),
          targetLanguage: z.string().describe('The language to translate TO'),
          expectedTranslation: z
            .string()
            .optional()
            .describe('Expected translation if known (from dataset).'),
        })
      : z.object({
          id: z.string().describe('Identifier for the sentence (e.g., "1", "Q1")'),
          content: z.string().describe('The sentence content to translate'),
          sourceLanguage: z.string().describe('The language to translate FROM'),
          targetLanguage: z.string().describe('The language to translate TO'),
          expectedTranslation: z
            .string()
            .optional()
            .describe('Expected translation if known (from dataset).'),
          ruleset: z.array(ruleSchema).describe('The full ruleset to use for translation.'),
        });

  return createCustomMcpServer({
    name: 'lo-solver-tools',
    version: '1.0.0',
    tools: {
      // --- Vocabulary tools (5) ---
      getVocabulary: {
        description: MCP_TOOL_DESCRIPTIONS.getVocabulary,
        inputSchema: z.object({}),
        handler: createHandler(getVocabulary, ctx),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      addVocabulary: {
        description: MCP_TOOL_DESCRIPTIONS.addVocabulary,
        inputSchema: z.object({
          entries: z
            .array(vocabularyEntrySchema)
            .describe('Array of new vocabulary entries to add.'),
        }),
        handler: createHandler(addVocabulary, ctx),
        annotations: { destructiveHint: false, openWorldHint: false },
      },
      updateVocabulary: {
        description: MCP_TOOL_DESCRIPTIONS.updateVocabulary,
        inputSchema: z.object({
          entries: z
            .array(vocabularyEntrySchema)
            .describe('Array of vocabulary entries to update.'),
        }),
        handler: createHandler(updateVocabulary, ctx),
        annotations: { destructiveHint: false, openWorldHint: false },
      },
      removeVocabulary: {
        description: MCP_TOOL_DESCRIPTIONS.removeVocabulary,
        inputSchema: z.object({
          foreignForms: z
            .array(z.string())
            .describe('Array of foreignForm keys to remove from vocabulary.'),
        }),
        handler: createHandler(removeVocabulary, ctx),
        annotations: { destructiveHint: false, openWorldHint: false },
      },
      clearVocabulary: {
        description: MCP_TOOL_DESCRIPTIONS.clearVocabulary,
        inputSchema: z.object({}),
        handler: createHandler(clearVocabulary, ctx),
        annotations: { destructiveHint: true, openWorldHint: false },
      },

      // --- Rules tools (5) ---
      getRules: {
        description: MCP_TOOL_DESCRIPTIONS.getRules,
        inputSchema: z.object({}),
        handler: createHandler(getRules, ctx),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      addRules: {
        description: MCP_TOOL_DESCRIPTIONS.addRules,
        inputSchema: z.object({
          entries: z.array(ruleSchema).describe('Array of new rules to add.'),
        }),
        handler: createHandler(addRules, ctx),
        annotations: { destructiveHint: false, openWorldHint: false },
      },
      updateRules: {
        description: MCP_TOOL_DESCRIPTIONS.updateRules,
        inputSchema: z.object({
          entries: z.array(ruleSchema).describe('Array of rules to update.'),
        }),
        handler: createHandler(updateRules, ctx),
        annotations: { destructiveHint: false, openWorldHint: false },
      },
      removeRules: {
        description: MCP_TOOL_DESCRIPTIONS.removeRules,
        inputSchema: z.object({
          titles: z.array(z.string()).describe('Array of rule titles to remove.'),
        }),
        handler: createHandler(removeRules, ctx),
        annotations: { destructiveHint: false, openWorldHint: false },
      },
      clearRules: {
        description: MCP_TOOL_DESCRIPTIONS.clearRules,
        inputSchema: z.object({}),
        handler: createHandler(clearRules, ctx),
        annotations: { destructiveHint: true, openWorldHint: false },
      },

      // --- Tester tools (4) ---
      testRule: {
        description: MCP_TOOL_DESCRIPTIONS.testRule,
        inputSchema: testRuleInputSchema,
        handler: testRuleHandler,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      testRuleWithRuleset: {
        description: MCP_TOOL_DESCRIPTIONS.testRuleWithRuleset,
        inputSchema: z.object({
          rule: ruleSchema.describe('The specific rule to test'),
          ruleset: z
            .array(ruleSchema)
            .describe('The full ruleset context (all rules you are proposing).'),
        }),
        handler: createHandler(testRuleWithRulesetTool, ctx),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      testSentence: {
        description: MCP_TOOL_DESCRIPTIONS.testSentence,
        inputSchema: testSentenceInputSchema,
        handler: testSentenceHandler,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      testSentenceWithRuleset: {
        description: MCP_TOOL_DESCRIPTIONS.testSentenceWithRuleset,
        inputSchema: z.object({
          id: z.string().describe('Identifier for the sentence (e.g., "1", "Q1")'),
          content: z.string().describe('The sentence content to translate'),
          sourceLanguage: z.string().describe('The language to translate FROM'),
          targetLanguage: z.string().describe('The language to translate TO'),
          expectedTranslation: z
            .string()
            .optional()
            .describe('Expected translation if known (from dataset).'),
          ruleset: z
            .array(ruleSchema)
            .describe('The full ruleset to use for translation.'),
        }),
        handler: createHandler(testSentenceWithRulesetTool, ctx),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
    },
  });
}
