import type { ModelMode } from '../openrouter';
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
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}

/** Type for the workflow step writer used to emit trace events. */
export type StepWriter = { write?: (data: unknown) => Promise<void> };

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

  /** Model mode: 'testing' uses cheap model, 'production' uses per-agent models */
  'model-mode': ModelMode;

  /** Step writer for emitting trace events from tools (bypasses broken ctx.writer) */
  'step-writer': StepWriter;
}
