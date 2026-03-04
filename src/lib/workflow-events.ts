export type StepId = 'extract-structure' | 'multi-perspective-hypothesis' | 'answer-questions';

export type UIStepId =
  | StepId
  | `round-${number}`
  | `perspective-${string}`
  | `synthesis-${number}`
  | `verify-${number}`
  | `improve-${number}`;

export const STEP_LABELS: Record<StepId, string> = {
  'extract-structure': 'Extract',
  'multi-perspective-hypothesis': 'Hypothesize',
  'answer-questions': 'Answer',
};

// Unique event ID generator (incrementing counter with random prefix)
let eventCounter = 0;
const eventPrefix = Math.random().toString(36).slice(2, 8);

export function generateEventId(): string {
  return `evt_${eventPrefix}_${eventCounter++}`;
}

export function getUIStepLabel(id: UIStepId): string {
  if (id in STEP_LABELS) return STEP_LABELS[id as StepId];
  const roundMatch = id.match(/^round-(\d+)$/);
  if (roundMatch) return `Round ${roundMatch[1]}`;
  const perspectiveMatch = id.match(/^perspective-(.+)$/);
  if (perspectiveMatch && perspectiveMatch[1]) {
    // Capitalize and format perspective name (e.g., "morphological-affixes" -> "Morphological Affixes")
    return perspectiveMatch[1]
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  const synthesisMatch = id.match(/^synthesis-(\d+)$/);
  if (synthesisMatch) return `Synthesis ${synthesisMatch[1]}`;
  const verifyMatch = id.match(/^verify-(\d+)$/);
  if (verifyMatch) return `Verify ${verifyMatch[1]}`;
  const improveMatch = id.match(/^improve-(\d+)$/);
  if (improveMatch) return `Improve ${improveMatch[1]}`;
  return id;
}

export interface StepStartEvent {
  type: 'data-step-start';
  data: {
    stepId: StepId;
    timestamp: string;
  };
}

export interface StepCompleteEvent {
  type: 'data-step-complete';
  data: {
    stepId: StepId;
    durationMs: number;
    timestamp: string;
  };
}

export interface AgentStartEvent {
  type: 'data-agent-start';
  data: {
    id: string;
    parentId?: string;
    perspectiveId?: string;
    stepId: StepId;
    agentName: string;
    model: string;
    task: string;
    timestamp: string;
  };
}

export interface AgentEndEvent {
  type: 'data-agent-end';
  data: {
    id: string;
    parentId?: string;
    perspectiveId?: string;
    stepId: StepId;
    agentName: string;
    reasoning: string;
    durationMs: number;
    attempt: number;
    totalAttempts: number;
    structuredOutput?: Record<string, unknown>;
    timestamp: string;
  };
}

export interface ToolCallEvent {
  type: 'data-tool-call';
  data: {
    id: string;
    parentId: string;
    stepId: StepId;
    toolName: string;
    input: Record<string, unknown>;
    result: Record<string, unknown>;
    timestamp: string;
  };
}

export interface AgentTextChunkEvent {
  type: 'data-agent-text-chunk';
  data: {
    parentId: string;
    text: string;
    timestamp: string;
  };
}

export interface RuleTestResultEvent {
  type: 'data-rule-test-result';
  data: {
    ruleTitle: string;
    passed: boolean;
    failingSentences?: string[];
    timestamp: string;
  };
}

export interface VocabularyUpdateEvent {
  type: 'data-vocabulary-update';
  data: {
    action: 'add' | 'update' | 'remove' | 'clear';
    entries: Array<{
      foreignForm: string;
      meaning: string;
      type: string;
      notes: string;
    }>;
    totalCount: number;
    source?: 'draft' | 'merged';
    timestamp: string;
  };
}

export interface IterationUpdateEvent {
  type: 'data-iteration-update';
  data: {
    iteration: number;
    conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
    rulesTestedCount: number;
    errantRulesCount: number;
    sentencesTestedCount: number;
    errantSentencesCount: number;
    // Failure detail fields (added in Phase 5)
    errantRules?: string[]; // Rule titles that failed
    errantSentences?: string[]; // Sentence IDs that failed (e.g., "#1", "Q2")
    passRate?: number; // Computed pass rate (0.0 to 1.0)
    isConvergenceWarning?: boolean; // True when max rounds exhausted without convergence
    timestamp: string;
  };
}

export interface VerifyImprovePhaseEvent {
  type: 'data-verify-improve-phase';
  data: {
    iteration: number;
    phase: 'verify-start' | 'verify-complete' | 'improve-start' | 'improve-complete';
    timestamp: string;
  };
}

export interface PerspectiveStartEvent {
  type: 'data-perspective-start';
  data: {
    perspectiveId: string;
    perspectiveName: string;
    round: number;
    timestamp: string;
  };
}

export interface PerspectiveCompleteEvent {
  type: 'data-perspective-complete';
  data: {
    perspectiveId: string;
    perspectiveName: string;
    round: number;
    testPassRate: number;
    rulesCount: number;
    vocabularyCount: number;
    timestamp: string;
  };
}

export interface SynthesisStartEvent {
  type: 'data-synthesis-start';
  data: {
    round: number;
    perspectiveCount: number;
    timestamp: string;
  };
}

export interface SynthesisCompleteEvent {
  type: 'data-synthesis-complete';
  data: {
    round: number;
    mergedRulesCount: number;
    mergedVocabCount: number;
    testPassRate: number;
    timestamp: string;
  };
}

export interface ConvergenceStartEvent {
  type: 'data-convergence-start';
  data: {
    round: number;
    timestamp: string;
  };
}

export interface ConvergenceCompleteEvent {
  type: 'data-convergence-complete';
  data: {
    round: number;
    converged: boolean;
    testPassRate: number;
    timestamp: string;
  };
}

export interface RoundStartEvent {
  type: 'data-round-start';
  data: {
    round: number;
    isImproverRound: boolean;
    timestamp: string;
  };
}

export interface RoundCompleteEvent {
  type: 'data-round-complete';
  data: {
    round: number;
    converged: boolean;
    timestamp: string;
  };
}

export interface RulesUpdateEvent {
  type: 'data-rules-update';
  data: {
    action: 'add' | 'update' | 'remove' | 'clear';
    entries: Array<{
      title: string;
      description: string;
      confidence?: string;
    }>;
    totalCount: number;
    source?: 'draft' | 'merged';
    timestamp: string;
  };
}

export interface CostUpdateEvent {
  type: 'data-cost-update';
  data: {
    cumulativeCost: number;
    timestamp: string;
  };
}

export type WorkflowTraceEvent =
  | StepStartEvent
  | StepCompleteEvent
  | AgentStartEvent
  | AgentEndEvent
  | ToolCallEvent
  | AgentTextChunkEvent
  | RuleTestResultEvent
  | VocabularyUpdateEvent
  | RulesUpdateEvent
  | IterationUpdateEvent
  | VerifyImprovePhaseEvent
  | PerspectiveStartEvent
  | PerspectiveCompleteEvent
  | SynthesisStartEvent
  | SynthesisCompleteEvent
  | ConvergenceStartEvent
  | ConvergenceCompleteEvent
  | RoundStartEvent
  | RoundCompleteEvent
  | CostUpdateEvent;
