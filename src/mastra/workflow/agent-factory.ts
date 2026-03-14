import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { claudeCode, type ClaudeCodeProvider } from '../claude-code-provider';
import { TESTING_MODEL, type ProviderMode, isClaudeCodeMode } from '../openrouter';
import { getOpenRouterProvider } from './request-context-helpers';

// ToolsInput is not publicly re-exported from @mastra/core; use Record<string, any> as equivalent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolsInput = Record<string, any>;

/** Configuration for creating a workflow agent via the factory. */
export interface WorkflowAgentConfig {
  /** Unique agent identifier (e.g., 'structured-problem-extractor'). */
  id: string;
  /** Display name (e.g., '[Step 1] Structured Problem Extractor Agent'). */
  name: string;
  /** System instructions -- string or {role: 'system', content} object. Passed through to Agent. */
  instructions: string | { role: 'system'; content: string };
  /** Model ID used in production mode (e.g., 'openai/gpt-5-mini'). */
  productionModel: string;
  /** Model ID used in testing mode. Defaults to TESTING_MODEL. */
  testingModel?: string;
  /** Tools available to the agent. Defaults to {}. */
  tools?: ToolsInput;
  /** Whether to add UnicodeNormalizer input processor. Defaults to true. */
  useUnicodeNormalizer?: boolean;
  /** Claude Code model shortcut for testing mode ('opus', 'sonnet', 'haiku'). Defaults to 'haiku'. */
  claudeCodeTestingModel?: string;
  /** Claude Code model shortcut for production mode ('opus', 'sonnet', 'haiku'). Defaults to 'sonnet'. */
  claudeCodeProductionModel?: string;
  /** Zod schema for requestContext validation (tester agents only). */
  requestContextSchema?: import('zod').ZodType<any>;
}

/**
 * Create a workflow agent with standard boilerplate:
 * - Dynamic model resolution via requestContext provider-mode
 * - UnicodeNormalizer input processor (when enabled)
 * - OpenRouter provider from requestContext
 */
export function createWorkflowAgent(config: WorkflowAgentConfig): Agent {
  const {
    id,
    name,
    instructions,
    productionModel,
    testingModel = TESTING_MODEL,
    claudeCodeTestingModel = 'haiku',
    claudeCodeProductionModel = 'sonnet',
    tools = {},
    useUnicodeNormalizer = true,
    requestContextSchema,
  } = config;

  return new Agent({
    id,
    name,
    instructions,
    model: ({ requestContext }) => {
      const providerMode = requestContext?.get('provider-mode') as ProviderMode | undefined;
      if (providerMode && isClaudeCodeMode(providerMode)) {
        const ccModel = providerMode === 'claude-code-testing'
          ? claudeCodeTestingModel
          : claudeCodeProductionModel;
        // Use factory to get provider (factory caches internally per attachMcpProvider call)
        const providerFactory = requestContext?.get('claude-code-provider-factory') as
          | (() => ClaudeCodeProvider)
          | undefined;
        if (providerFactory) {
          const provider = providerFactory();
          return provider(ccModel);
        }
        // Fall back to singleton (for tool-free agents)
        return claudeCode(ccModel);
      }
      // OpenRouter path (unchanged logic)
      const modelId = providerMode === 'openrouter-production' ? productionModel : testingModel;
      return getOpenRouterProvider(requestContext)(modelId);
    },
    tools,
    ...(useUnicodeNormalizer && {
      inputProcessors: [
        new UnicodeNormalizer({
          stripControlChars: false,
          preserveEmojis: true,
          collapseWhitespace: true,
          trim: true,
        }),
      ],
    }),
    ...(requestContextSchema && { requestContextSchema }),
  });
}
