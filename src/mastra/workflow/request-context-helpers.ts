/**
 * Shared helpers for accessing WorkflowRequestContext in tools.
 * Centralizes type definitions and context accessor functions to avoid duplication.
 */
import type {
  WorkflowRequestContext,
  StructuredProblemData,
  Rule,
  StepWriter,
  DraftStore,
} from './request-context-types';
import type { VocabularyEntry } from './vocabulary-tools';
import type { Mastra } from '@mastra/core/mastra';
import type { ToolStream } from '@mastra/core/tools';
import { generateEventId } from '@/lib/workflow-events';
import { openrouter, isClaudeCodeMode, type OpenRouterProvider, type ProviderMode } from '../openrouter';

/**
 * Type for the tool execute context that includes requestContext, mastra, and writer.
 * Used with type assertion since Mastra's types may not include these yet.
 */
export interface ToolExecuteContext {
  requestContext?: {
    get: (key: keyof WorkflowRequestContext) => unknown;
  };
  mastra?: Mastra;
  writer?: ToolStream;
}

// Type alias for the requestContext getter interface
type RequestContextGetter = { get: (key: keyof WorkflowRequestContext) => unknown } | undefined;

/**
 * Get the OpenRouter provider from request context.
 * Returns the per-request provider if set, otherwise falls back to the singleton.
 */
export function getOpenRouterProvider(requestContext: RequestContextGetter): OpenRouterProvider {
  if (!requestContext) return openrouter;
  const provider = requestContext.get('openrouter-provider') as OpenRouterProvider | undefined;
  return provider ?? openrouter;
}

/**
 * Helper to get vocabulary state from request context.
 * Throws if vocabulary-state is not set in the context.
 */
export function getVocabularyState(
  requestContext: RequestContextGetter,
): Map<string, VocabularyEntry> {
  if (!requestContext) {
    throw new Error('requestContext is required for vocabulary tools');
  }
  const state = requestContext.get('vocabulary-state') as Map<string, VocabularyEntry> | undefined;
  if (!state) {
    throw new Error("'vocabulary-state' not found in requestContext");
  }
  return state;
}

/**
 * Helper to get vocabulary as an array from request context.
 */
export function getVocabularyArray(requestContext: RequestContextGetter): VocabularyEntry[] {
  return Array.from(getVocabularyState(requestContext).values());
}

/**
 * Helper to get structured problem from request context.
 */
export function getStructuredProblem(requestContext: RequestContextGetter): StructuredProblemData {
  if (!requestContext) {
    throw new Error('requestContext is required');
  }
  const problem = requestContext.get('structured-problem') as StructuredProblemData | undefined;
  if (!problem) {
    throw new Error("'structured-problem' not found in requestContext");
  }
  return problem;
}

/**
 * Helper to get problem context string from request context.
 */
export function getProblemContext(requestContext: RequestContextGetter): string {
  return getStructuredProblem(requestContext).context;
}

/**
 * Helper to get current rules from request context.
 */
export function getCurrentRules(requestContext: RequestContextGetter): Rule[] {
  if (!requestContext) {
    throw new Error('requestContext is required');
  }
  const rules = requestContext.get('current-rules') as Rule[] | undefined;
  if (!rules) {
    throw new Error("'current-rules' not found in requestContext");
  }
  return rules;
}

/**
 * Helper to get log file path from request context.
 * Returns undefined if not set (for tools that can work without logging).
 */
export function getLogFile(requestContext: RequestContextGetter): string | undefined {
  if (!requestContext) {
    return undefined;
  }
  return requestContext.get('log-file') as string | undefined;
}

/**
 * Helper to get workflow start time (epoch ms) from request context.
 * Returns undefined if not set.
 */
export function getWorkflowStartTime(requestContext: RequestContextGetter): number | undefined {
  if (!requestContext) return undefined;
  return requestContext.get('workflow-start-time') as number | undefined;
}

/**
 * Normalizes a translation string for fair comparison.
 * - NFKC Unicode normalization for consistent representation
 * - Collapses whitespace to single spaces
 * - Trims leading/trailing whitespace
 * - Removes trailing periods
 */
export function normalizeTranslation(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim().replace(/\.+$/, '');
}

/**
 * Emit a trace event directly via a step writer.
 * Used in workflow steps where the writer is available directly.
 */
export async function emitTraceEvent(
  writer: StepWriter | undefined,
  event: { type: string; data: Record<string, unknown> },
): Promise<void> {
  await writer?.write?.(event);
}

/**
 * Emit a trace event from a tool via the step writer stored in requestContext.
 * This bypasses the broken ctx.writer?.custom() path (Mastra does not pass
 * outputWriter to tools when called from workflow steps).
 *
 * For data-tool-call events, automatically injects id, parentId, and stepId
 * from the request context so tools link to their parent agent and step.
 */
export async function emitToolTraceEvent(
  requestContext: RequestContextGetter,
  event: { type: string; data: Record<string, unknown> },
): Promise<void> {
  if (!requestContext) return;
  const writer = requestContext.get('step-writer') as StepWriter | undefined;
  const parentAgentId = requestContext.get('parent-agent-id') as string | undefined;
  const eventSource = requestContext.get('event-source') as 'draft' | 'merged' | undefined;
  const stepId = requestContext.get('step-id') as string | undefined;

  let enrichedData = event.data;

  // Inject parentId, id, and stepId into tool-call events for hierarchical linking
  if (event.type === 'data-tool-call') {
    enrichedData = {
      ...enrichedData,
      id: generateEventId(),
      parentId: parentAgentId ?? '',
      ...(stepId && !enrichedData.stepId && { stepId }),
    };
  }

  // Inject source into vocabulary and rules update events
  if (
    (event.type === 'data-vocabulary-update' || event.type === 'data-rules-update') &&
    eventSource
  ) {
    enrichedData = { ...enrichedData, source: eventSource };
  }

  await emitTraceEvent(writer, { type: event.type, data: enrichedData });
}

// ---------------------------------------------------------------------------
// Cost tracking helpers
// ---------------------------------------------------------------------------

/** Shape of the cost-related metadata nested in agent results. */
interface AgentResultCostInfo {
  steps?: Array<{
    providerMetadata?: {
      openrouter?: { usage?: { cost?: number } };
      'claude-code'?: { costUsd?: number };
    } | undefined;
  }>;
  providerMetadata?: {
    openrouter?: { usage?: { cost?: number } };
    'claude-code'?: { costUsd?: number };
  } | undefined;
  usage?: { inputTokens?: number | undefined; outputTokens?: number | undefined };
}

/**
 * Extract total cost from an agent response.
 * Sums per-step costs for multi-step agents, falls back to top-level cost.
 * Accepts any object shape (FullOutput, AgentGenerateResult, etc.).
 */
export function extractCostFromResult(result: AgentResultCostInfo): number {
  let callCost = 0;
  if (result.steps && Array.isArray(result.steps) && result.steps.length > 0) {
    for (const step of result.steps) {
      const stepCost = step?.providerMetadata?.openrouter?.usage?.cost;
      if (typeof stepCost === 'number') callCost += stepCost;
    }
  }
  if (callCost === 0) {
    const topCost = result.providerMetadata?.openrouter?.usage?.cost;
    if (typeof topCost === 'number') callCost = topCost;
  }
  // Claude Code path (per-step)
  if (callCost === 0 && result.steps && Array.isArray(result.steps)) {
    for (const step of result.steps) {
      const ccCost = step?.providerMetadata?.['claude-code']?.costUsd;
      if (typeof ccCost === 'number') callCost += ccCost;
    }
  }
  // Claude Code path (top-level)
  if (callCost === 0) {
    const ccCost = result.providerMetadata?.['claude-code']?.costUsd;
    if (typeof ccCost === 'number') callCost = ccCost;
  }
  return callCost;
}

/**
 * Extract token counts from an agent response.
 * Reads usage.inputTokens and usage.outputTokens, defaulting to 0.
 */
export function extractTokensFromResult(result: AgentResultCostInfo): { input: number; output: number } {
  return {
    input: result.usage?.inputTokens ?? 0,
    output: result.usage?.outputTokens ?? 0,
  };
}

/** Typed read/write interface for RequestContext in cost-tracking helpers. */
type RequestContextReadWrite = {
  get: (key: keyof WorkflowRequestContext) => unknown;
  set: <K extends keyof WorkflowRequestContext>(
    key: K,
    value: K extends keyof WorkflowRequestContext ? WorkflowRequestContext[K] : never,
  ) => void;
};

/**
 * Update cumulative cost in a RequestContext and emit data-cost-update events.
 * For OpenRouter: emits at each $1 boundary crossing.
 * For Claude Code: emits on every call when callCost > 0 (subscription model).
 * Must be called with the full RequestContext (has set()) from step files.
 */
export async function updateCumulativeCost(
  requestContext: RequestContextReadWrite,
  writer: StepWriter | undefined,
  callCost: number,
  callTokens?: { input: number; output: number },
): Promise<void> {
  if (callCost <= 0 && (!callTokens || (callTokens.input === 0 && callTokens.output === 0))) return;

  const prevCost = (requestContext.get('cumulative-cost') as number) ?? 0;
  const newCost = prevCost + callCost;
  requestContext.set('cumulative-cost', newCost);

  // Accumulate tokens
  const prevTokens = (requestContext.get('cumulative-tokens') as number) ?? 0;
  const newTokens = prevTokens + (callTokens ? callTokens.input + callTokens.output : 0);
  requestContext.set('cumulative-tokens', newTokens);

  const providerMode = requestContext.get('provider-mode') as ProviderMode | undefined;
  const isSubscription = providerMode ? isClaudeCodeMode(providerMode) : false;

  if (isSubscription) {
    // Claude Code: emit on every call when cost > 0
    if (callCost > 0) {
      await emitTraceEvent(writer, {
        type: 'data-cost-update',
        data: {
          cumulativeCost: newCost,
          cumulativeTokens: newTokens,
          isSubscription: true,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } else {
    // OpenRouter: emit at each $1 boundary crossing
    const prevBucket = Math.floor(prevCost);
    const newBucket = Math.floor(newCost);
    if (newBucket > prevBucket) {
      for (let i = prevBucket + 1; i <= newBucket; i++) {
        await emitTraceEvent(writer, {
          type: 'data-cost-update',
          data: {
            cumulativeCost: i,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rules state helpers
// ---------------------------------------------------------------------------

/**
 * Helper to get the main rules Map from request context.
 * Throws if rules-state is not set in the context.
 */
export function getRulesState(requestContext: RequestContextGetter): Map<string, Rule> {
  if (!requestContext) {
    throw new Error('requestContext is required for rules tools');
  }
  const state = requestContext.get('rules-state') as Map<string, Rule> | undefined;
  if (!state) {
    throw new Error("'rules-state' not found in requestContext");
  }
  return state;
}

// ---------------------------------------------------------------------------
// Draft store helpers
// ---------------------------------------------------------------------------

/**
 * Internal helper to get or initialize the draft-stores Map.
 * Creates an empty Map on first access if not yet set.
 */
function getDraftStoresMap(requestContext: RequestContextGetter): Map<string, DraftStore> {
  if (!requestContext) {
    throw new Error('requestContext is required for draft store operations');
  }
  let stores = requestContext.get('draft-stores') as Map<string, DraftStore> | undefined;
  if (!stores) {
    // First access — the Map does not exist yet; create it.
    // Note: WorkflowRequestContext.get returns undefined for unset keys,
    // but the map reference must be stored externally by the caller that
    // initializes requestContext. We create a new Map here for safety.
    stores = new Map<string, DraftStore>();
  }
  return stores;
}

/**
 * Create a new draft store for a perspective.
 * If pullFromMain is true, deep-copies the current main vocabulary and rules into the draft.
 */
export function createDraftStore(
  requestContext: RequestContextGetter,
  perspectiveId: string,
  pullFromMain: boolean,
): DraftStore {
  if (!requestContext) {
    throw new Error('requestContext is required for draft store creation');
  }
  const stores = getDraftStoresMap(requestContext);

  let vocabulary = new Map<string, VocabularyEntry>();
  let rules = new Map<string, Rule>();

  if (pullFromMain) {
    // Deep-copy main vocabulary
    const mainVocab = requestContext.get('vocabulary-state') as
      | Map<string, VocabularyEntry>
      | undefined;
    if (mainVocab) {
      for (const [key, entry] of mainVocab) {
        vocabulary.set(key, { ...entry });
      }
    }

    // Deep-copy main rules
    const mainRules = requestContext.get('rules-state') as Map<string, Rule> | undefined;
    if (mainRules) {
      for (const [key, rule] of mainRules) {
        rules.set(key, { ...rule });
      }
    }
  }

  const store: DraftStore = { perspectiveId, vocabulary, rules };
  stores.set(perspectiveId, store);
  return store;
}

/**
 * Clear all draft stores.
 */
export function clearAllDraftStores(requestContext: RequestContextGetter): void {
  const stores = getDraftStoresMap(requestContext);
  stores.clear();
}

