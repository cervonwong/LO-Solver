import type { VocabularyEntry } from './vocabulary-tools';

/**
 * Structured problem data extracted from raw input.
 * Immutable throughout the workflow execution.
 */
export interface StructuredProblemData {
  context: string;
  dataset: Record<string, string>[];
  questions: { id: string; type: string; input: string }[];
}

/**
 * A linguistic rule with confidence level.
 */
export interface Rule {
  title: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Request Context type for Workflow 03.
 * All agents and tools access runtime data via this context.
 */
export interface Workflow03RequestContext {
  /** Vocabulary state (mutable Map for vocabulary management) */
  'vocabulary-state': Map<string, VocabularyEntry>;

  /** Structured problem data (immutable through workflow) */
  'structured-problem': StructuredProblemData;

  /** Current rules (updated each iteration) */
  'current-rules': Rule[];

  /** Log file path for writing tool output */
  'log-file': string;
}
