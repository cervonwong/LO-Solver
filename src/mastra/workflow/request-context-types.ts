import type { ProviderMode, OpenRouterProvider } from '../openrouter';
import type { ClaudeCodeProvider } from '../claude-code-provider';
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

import type { Rule } from './workflow-schemas';
export type { Rule } from './workflow-schemas';

/** Type for the workflow step writer used to emit trace events. */
export type StepWriter = { write?: (data: unknown) => Promise<void> };

/**
 * Isolated store for a single perspective's rules and vocabulary.
 * Created via createDraftStore, merged back via mergeDraftToMain.
 */
export interface DraftStore {
  perspectiveId: string;
  vocabulary: Map<string, VocabularyEntry>;
  rules: Map<string, Rule>;
}

/**
 * Request Context type for the solver workflow.
 * All agents and tools access runtime data via this context.
 */
export interface WorkflowRequestContext {
  /** Vocabulary state (mutable Map for vocabulary management) */
  'vocabulary-state': Map<string, VocabularyEntry>;

  /** Structured problem data (immutable through workflow) */
  'structured-problem': StructuredProblemData;

  /** Current rules (updated each iteration) — kept for backward compat with verifier tools */
  'current-rules': Rule[];

  /** Main rules store (mutable Map for rules management, keyed by title) */
  'rules-state': Map<string, Rule>;

  /** Per-perspective draft stores for multi-perspective hypothesis generation */
  'draft-stores': Map<string, DraftStore>;

  /** Log file path for writing tool output */
  'log-file': string;

  /** Provider mode: controls which provider and model tier to use */
  'provider-mode': ProviderMode;

  /** Step writer for emitting trace events from tools (bypasses broken ctx.writer) */
  'step-writer': StepWriter;

  /** ID of the currently-executing agent (set before agent calls, read by tools) */
  'parent-agent-id'?: string;

  /** Event source tag: 'draft' for perspective-local events, 'merged' for post-synthesis */
  'event-source'?: 'draft' | 'merged';

  /** Current step ID — tools read this to tag data-tool-call events */
  'step-id'?: string;

  /** Epoch ms when the workflow started, for elapsed-time timestamps */
  'workflow-start-time': number;

  /** Abort signal from the workflow step -- tools read this for cooperative cancellation */
  'abort-signal'?: AbortSignal;

  /** Cumulative API cost in dollars across all agent calls in this workflow step */
  'cumulative-cost': number;

  /** Cumulative token count across all agent calls in this workflow step */
  'cumulative-tokens': number;

  /** Per-request OpenRouter provider (set when user provides their own API key) */
  'openrouter-provider'?: OpenRouterProvider;

  /** Factory that creates a fresh Claude Code provider with MCP tools per agent call (avoids transport reuse) */
  'claude-code-provider-factory'?: () => ClaudeCodeProvider;
}
