// Custom streaming event types for Workflow 03
// Emitted via writer.custom() in workflow steps, consumed by the frontend
//
// Events arrive with a nested `data` property, e.g.:
//   { type: 'data-step-complete', data: { stepId, stepName, ... } }

export interface StepStartEvent {
  type: 'data-step-start';
  data: {
    stepId: string;
    stepName: string;
    timestamp: string;
  };
}

export interface StepCompleteEvent {
  type: 'data-step-complete';
  data: {
    stepId: string;
    stepName: string;
    timestamp: string;
    durationMs: number;
  };
}

export interface AgentReasoningEvent {
  type: 'data-agent-reasoning';
  data: {
    stepId: string;
    agentId: string;
    agentName: string;
    model: string;
    reasoning: string;
    timestamp: string;
  };
}

export interface ToolCallEvent {
  type: 'data-tool-call';
  data: {
    stepId: string;
    toolName: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    success: boolean;
    timestamp: string;
  };
}

export interface VocabularyUpdateEvent {
  type: 'data-vocabulary-update';
  data: {
    stepId: string;
    action: 'add' | 'update' | 'remove' | 'clear';
    entries: Array<{ foreignForm: string; meaning: string; type: string }>;
    totalCount: number;
    timestamp: string;
  };
}

export interface IterationUpdateEvent {
  type: 'data-iteration-update';
  data: {
    stepId: string;
    iteration: number;
    maxIterations: number;
    conclusion: string;
    timestamp: string;
  };
}

export type WorkflowEvent =
  | StepStartEvent
  | StepCompleteEvent
  | AgentReasoningEvent
  | ToolCallEvent
  | VocabularyUpdateEvent
  | IterationUpdateEvent;
