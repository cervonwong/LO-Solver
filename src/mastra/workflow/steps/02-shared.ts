import { z } from 'zod';
import { RequestContext } from '@mastra/core/request-context';
import type { VocabularyEntry } from '../vocabulary-tools';
import type { WorkflowRequestContext, DraftStore, StepWriter } from '../request-context-types';
import type { Rule } from '../request-context-types';
import { isClaudeCodeMode, type ProviderMode } from '../../openrouter';
import type { StepTiming } from '../logging-utils';
import type { StepId } from '@/lib/workflow-events';
import { createMcpToolServer } from '../../mcp/mcp-tool-bridge';
import { createClaudeCode, type ClaudeCodeProvider } from 'ai-sdk-provider-claude-code';
import { CLAUDE_CODE_DISALLOWED_TOOLS } from '../../claude-code-provider';
import type { Mastra } from '@mastra/core/mastra';
import { structuredProblemDataSchema, verifierFeedbackSchema } from '../workflow-schemas';
import type { Perspective, PerspectiveResult } from '../workflow-schemas';

export type { StepTiming } from '../logging-utils';

/**
 * Attach a Claude Code provider factory to a RequestContext.
 * Only activates when providerMode is 'claude-code'; no-op otherwise.
 * Must be called AFTER all RequestContext keys are set (tool handlers read them via closure).
 *
 * Stores a factory function (not a provider instance) so each agent.generate() call
 * gets a fresh MCP server + transport, avoiding "Already connected to a transport" errors
 * when multiple agents share the same RequestContext.
 */
export function attachMcpProvider(
  rc: RequestContext<WorkflowRequestContext>,
  mastra: Mastra,
  providerMode: ProviderMode,
  testToolMode: 'committed' | 'draft',
): void {
  if (!isClaudeCodeMode(providerMode)) return;
  // Cache the provider in the closure so repeated model() calls within a single
  // generate() reuse the same MCP server (model resolver fires per tool-use step).
  // Each attachMcpProvider call creates a new closure, so separate generate() calls
  // on different requestContexts still get fresh providers.
  let cached: ClaudeCodeProvider | null = null;
  rc.set('claude-code-provider-factory', () => {
    if (cached) return cached;
    const mcpServer = createMcpToolServer(rc, mastra, { testToolMode });
    cached = createClaudeCode({
      defaultSettings: {
        disallowedTools: [...CLAUDE_CODE_DISALLOWED_TOOLS],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxToolResultSize: 50000,
        mcpServers: {
          'lo-solver-tools': mcpServer,
        },
      },
    });
    return cached;
  });
}

/** Shared context carrying references to main stores and immutable problem data. Maps are passed by reference (STR-03). */
export interface HypothesizeContext {
  structuredProblem: z.infer<typeof structuredProblemDataSchema>;
  mainVocabulary: Map<string, VocabularyEntry>;
  mainRules: Map<string, Rule>;
  draftStores: Map<string, DraftStore>;
  mainRequestContext: RequestContext<WorkflowRequestContext>;
  logFile: string;
  providerMode: ProviderMode;
  stepId: StepId;
  effectivePerspectiveCount: number;
  workflowStartTime: number;
}
/** Mastra framework params, separate from application state. */
export interface StepParams {
  mastra: Mastra;
  writer: StepWriter;
  bail: (value: any) => any;
  setState: (state: any) => Promise<void>;
  abortSignal?: AbortSignal;
}
export interface DispatchResult {
  perspectives: Perspective[] | null;
  error?: string;
  timings: StepTiming[];
}
export interface HypothesizeResult {
  results: Array<{ perspective: Perspective; draftStore: DraftStore; timing: StepTiming }>;
  timings: StepTiming[];
}
export interface VerifyResult {
  perspectiveResults: PerspectiveResult[];
  timings: StepTiming[];
}
export interface SynthesizeResult {
  convergencePassRate: number;
  convergenceConclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
  converged: boolean;
  convergenceFeedback: z.infer<typeof verifierFeedbackSchema> | null;
  timings: StepTiming[];
}
