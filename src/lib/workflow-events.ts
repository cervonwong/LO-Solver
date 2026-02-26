export type StepId =
  | 'extract-structure'
  | 'initial-hypothesis'
  | 'verify-improve-rules-loop'
  | 'answer-questions';

export const STEP_LABELS: Record<StepId, string> = {
  'extract-structure': 'Extract',
  'initial-hypothesis': 'Hypothesize',
  'verify-improve-rules-loop': 'Verify / Improve',
  'answer-questions': 'Answer',
};

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

export interface AgentReasoningEvent {
  type: 'data-agent-reasoning';
  data: {
    stepId: StepId;
    agentName: string;
    model: string;
    reasoning: string;
    durationMs: number;
    timestamp: string;
  };
}

export interface ToolCallEvent {
  type: 'data-tool-call';
  data: {
    stepId: StepId;
    toolName: string;
    input: Record<string, unknown>;
    result: Record<string, unknown>;
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

export type WorkflowTraceEvent =
  | StepStartEvent
  | StepCompleteEvent
  | AgentReasoningEvent
  | ToolCallEvent
  | VocabularyUpdateEvent
  | IterationUpdateEvent
  | VerifyImprovePhaseEvent;
