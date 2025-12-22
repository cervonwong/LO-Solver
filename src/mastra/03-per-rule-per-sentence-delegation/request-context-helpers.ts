/**
 * Shared helpers for accessing Workflow03RequestContext in tools.
 * Centralizes type definitions and context accessor functions to avoid duplication.
 */
import type {
  Workflow03RequestContext,
  StructuredProblemData,
  Rule,
} from './request-context-types';
import type { VocabularyEntry } from './vocabulary-tools';
import type { Mastra } from '@mastra/core/mastra';

/**
 * Type for the tool execute context that includes requestContext and mastra.
 * Used with type assertion since Mastra's types may not include these yet.
 */
export interface ToolExecuteContext {
  requestContext?: {
    get: (key: keyof Workflow03RequestContext) => unknown;
  };
  mastra?: Mastra;
}

// Type alias for the requestContext getter interface
type RequestContextGetter = { get: (key: keyof Workflow03RequestContext) => unknown } | undefined;

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
 * Normalizes a translation string for fair comparison.
 * - NFKC Unicode normalization for consistent representation
 * - Collapses whitespace to single spaces
 * - Trims leading/trailing whitespace
 * - Removes trailing periods
 */
export function normalizeTranslation(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim().replace(/\.+$/, '');
}
