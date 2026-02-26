import type { WorkflowTraceEvent, StepId } from './workflow-events';
import { STEP_LABELS } from './workflow-events';

export interface StepGroup {
  stepId: StepId;
  label: string;
  startTime: string | undefined;
  durationMs: number | undefined;
  events: WorkflowTraceEvent[];
}

export interface IterationGroup {
  iteration: number;
  conclusion: string | undefined;
  events: WorkflowTraceEvent[];
}

/** Group events by their stepId. Events without stepId are excluded. */
export function groupEventsByStep(events: WorkflowTraceEvent[]): StepGroup[] {
  const stepMap = new Map<StepId, StepGroup>();
  const order: StepId[] = [];

  for (const event of events) {
    const stepId = getStepId(event);
    if (!stepId) continue;

    let group = stepMap.get(stepId);
    if (!group) {
      group = {
        stepId,
        label: STEP_LABELS[stepId],
        startTime: undefined,
        durationMs: undefined,
        events: [],
      };
      stepMap.set(stepId, group);
      order.push(stepId);
    }

    if (event.type === 'data-step-start') {
      group.startTime = event.data.timestamp;
    } else if (event.type === 'data-step-complete') {
      group.durationMs = event.data.durationMs;
    }

    group.events.push(event);
  }

  return order.map((id) => stepMap.get(id)!);
}

/** Extract iterations from a verify-improve step group. */
export function groupEventsByIteration(events: WorkflowTraceEvent[]): IterationGroup[] {
  const iterations: IterationGroup[] = [];
  let current: IterationGroup = { iteration: 1, conclusion: undefined, events: [] };

  for (const event of events) {
    if (event.type === 'data-iteration-update') {
      current.conclusion = event.data.conclusion;
      current.events.push(event);
      iterations.push(current);
      current = {
        iteration: event.data.iteration + 1,
        conclusion: undefined,
        events: [],
      };
    } else {
      current.events.push(event);
    }
  }

  // Push remaining events as an in-progress iteration
  if (current.events.length > 0) {
    iterations.push(current);
  }

  return iterations;
}

function getStepId(event: WorkflowTraceEvent): StepId | undefined {
  switch (event.type) {
    case 'data-step-start':
    case 'data-step-complete':
    case 'data-agent-reasoning':
    case 'data-tool-call':
      return event.data.stepId;
    case 'data-iteration-update':
      return 'verify-improve-rules-loop';
    case 'data-vocabulary-update':
      return undefined;
  }
}

/** Format milliseconds as human-readable duration. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}
