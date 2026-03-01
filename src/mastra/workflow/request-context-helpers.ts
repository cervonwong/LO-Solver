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
 * Helper to get the ID of the currently-executing agent from request context.
 * Returns undefined if no agent is active.
 */
export function getParentAgentId(requestContext: RequestContextGetter): string | undefined {
  if (!requestContext) return undefined;
  return requestContext.get('parent-agent-id') as string | undefined;
}

/**
 * Emit a trace event from a tool via the step writer stored in requestContext.
 * This bypasses the broken ctx.writer?.custom() path (Mastra does not pass
 * outputWriter to tools when called from workflow steps).
 *
 * For data-tool-call events, automatically injects an id and parentId from the
 * request context's parent-agent-id key so tools link to their parent agent.
 */
export async function emitToolTraceEvent(
  requestContext: RequestContextGetter,
  event: { type: string; data: Record<string, unknown> },
): Promise<void> {
  if (!requestContext) return;
  const writer = requestContext.get('step-writer') as StepWriter | undefined;
  const parentAgentId = requestContext.get('parent-agent-id') as string | undefined;
  // Inject parentId and id into tool-call events for hierarchical linking
  const enrichedData =
    event.type === 'data-tool-call'
      ? { ...event.data, id: generateEventId(), parentId: parentAgentId ?? '' }
      : event.data;
  await emitTraceEvent(writer, { type: event.type, data: enrichedData });
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

/**
 * Helper to get rules as an array from the main rules Map.
 */
export function getRulesArray(requestContext: RequestContextGetter): Rule[] {
  return Array.from(getRulesState(requestContext).values());
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
 * Get a specific draft store by perspective ID.
 * Throws if the draft store does not exist.
 */
export function getDraftStore(
  requestContext: RequestContextGetter,
  perspectiveId: string,
): DraftStore {
  const stores = getDraftStoresMap(requestContext);
  const store = stores.get(perspectiveId);
  if (!store) {
    throw new Error(`Draft store not found for perspective '${perspectiveId}'`);
  }
  return store;
}

/**
 * Get all draft stores.
 */
export function getAllDraftStores(requestContext: RequestContextGetter): Map<string, DraftStore> {
  return getDraftStoresMap(requestContext);
}

/**
 * Merge a draft store's vocabulary and rules into the main stores.
 * Overwrites by key. Removes the draft store entry after merge.
 */
export function mergeDraftToMain(
  requestContext: RequestContextGetter,
  perspectiveId: string,
): void {
  if (!requestContext) {
    throw new Error('requestContext is required for draft store merge');
  }
  const stores = getDraftStoresMap(requestContext);
  const draft = stores.get(perspectiveId);
  if (!draft) {
    throw new Error(`Draft store not found for perspective '${perspectiveId}'`);
  }

  // Merge vocabulary into main
  const mainVocab = requestContext.get('vocabulary-state') as
    | Map<string, VocabularyEntry>
    | undefined;
  if (mainVocab) {
    for (const [key, entry] of draft.vocabulary) {
      mainVocab.set(key, entry);
    }
  }

  // Merge rules into main
  const mainRules = requestContext.get('rules-state') as Map<string, Rule> | undefined;
  if (mainRules) {
    for (const [key, rule] of draft.rules) {
      mainRules.set(key, rule);
    }
  }

  // Remove the draft store
  stores.delete(perspectiveId);
}

/**
 * Clear all draft stores.
 */
export function clearAllDraftStores(requestContext: RequestContextGetter): void {
  const stores = getDraftStoresMap(requestContext);
  stores.clear();
}

/**
 * Get the vocabulary Map from a specific draft store.
 */
export function getDraftVocabularyState(
  requestContext: RequestContextGetter,
  perspectiveId: string,
): Map<string, VocabularyEntry> {
  return getDraftStore(requestContext, perspectiveId).vocabulary;
}

/**
 * Get the rules Map from a specific draft store.
 */
export function getDraftRulesState(
  requestContext: RequestContextGetter,
  perspectiveId: string,
): Map<string, Rule> {
  return getDraftStore(requestContext, perspectiveId).rules;
}
