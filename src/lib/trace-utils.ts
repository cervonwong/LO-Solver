import type { WorkflowTraceEvent, StepId, UIStepId } from './workflow-events';
import { getUIStepLabel } from './workflow-events';

export interface StepGroup {
  stepId: UIStepId;
  label: string;
  startTime: string | undefined;
  durationMs: number | undefined;
  events: WorkflowTraceEvent[];
}

export interface ToolCallGroup {
  toolName: string;
  calls: Array<{
    input: Record<string, unknown>;
    result: Record<string, unknown>;
    timestamp: string;
  }>;
}

/** Group events by their stepId, splitting verify-improve events into separate phase groups. */
export function groupEventsByStep(events: WorkflowTraceEvent[]): StepGroup[] {
  const nonLoopMap = new Map<StepId, StepGroup>();
  const nonLoopOrder: StepId[] = [];
  const loopGroups: StepGroup[] = [];
  let currentLoopGroup: StepGroup | null = null;

  for (const event of events) {
    const rawStepId = getRawStepId(event);
    if (!rawStepId) continue;

    if (rawStepId !== 'verify-improve-rules-loop') {
      // Non-loop event: group by StepId as before
      let group = nonLoopMap.get(rawStepId);
      if (!group) {
        group = {
          stepId: rawStepId,
          label: getUIStepLabel(rawStepId),
          startTime: undefined,
          durationMs: undefined,
          events: [],
        };
        nonLoopMap.set(rawStepId, group);
        nonLoopOrder.push(rawStepId);
      }
      if (event.type === 'data-step-start') group.startTime = event.data.timestamp;
      else if (event.type === 'data-step-complete') group.durationMs = event.data.durationMs;
      group.events.push(event);
      continue;
    }

    // Loop event: split by phase boundaries
    if (event.type === 'data-verify-improve-phase') {
      const { iteration, phase } = event.data;
      if (phase === 'verify-start') {
        currentLoopGroup = {
          stepId: `verify-${iteration}` as UIStepId,
          label: getUIStepLabel(`verify-${iteration}` as UIStepId),
          startTime: event.data.timestamp,
          durationMs: undefined,
          events: [],
        };
        loopGroups.push(currentLoopGroup);
      } else if (phase === 'improve-start') {
        currentLoopGroup = {
          stepId: `improve-${iteration}` as UIStepId,
          label: getUIStepLabel(`improve-${iteration}` as UIStepId),
          startTime: event.data.timestamp,
          durationMs: undefined,
          events: [],
        };
        loopGroups.push(currentLoopGroup);
      } else if (phase === 'verify-complete' || phase === 'improve-complete') {
        if (currentLoopGroup) {
          // Compute duration from start to complete
          const startMs = currentLoopGroup.startTime
            ? new Date(currentLoopGroup.startTime).getTime()
            : 0;
          const endMs = new Date(event.data.timestamp).getTime();
          if (startMs > 0) currentLoopGroup.durationMs = endMs - startMs;
        }
      }
      // Phase events are structural markers -- don't add to events array
      continue;
    }

    // Non-phase loop event: add to current group
    if (event.type === 'data-step-start' || event.type === 'data-step-complete') {
      // Step-level start/complete are for the overall loop step -- skip
      continue;
    }
    if (currentLoopGroup) {
      currentLoopGroup.events.push(event);
    }
  }

  // Assemble: non-loop steps in order, with loop groups inserted after 'initial-hypothesis'
  const result: StepGroup[] = [];
  for (const stepId of nonLoopOrder) {
    result.push(nonLoopMap.get(stepId)!);
    if (stepId === 'initial-hypothesis') {
      result.push(...loopGroups);
    }
  }
  // If initial-hypothesis hasn't appeared yet but we have loop groups, append them
  if (!nonLoopOrder.includes('initial-hypothesis') && loopGroups.length > 0) {
    result.push(...loopGroups);
  }
  return result;
}

/**
 * Group consecutive tool-call events by toolName.
 * Non-tool-call events are returned as-is.
 * Returns an array of either WorkflowTraceEvent or ToolCallGroup.
 */
export function groupEventsWithToolCalls(
  events: WorkflowTraceEvent[],
): Array<WorkflowTraceEvent | ToolCallGroup> {
  const result: Array<WorkflowTraceEvent | ToolCallGroup> = [];
  let currentGroup: ToolCallGroup | null = null;

  for (const event of events) {
    if (event.type === 'data-tool-call') {
      if (currentGroup && currentGroup.toolName === event.data.toolName) {
        currentGroup.calls.push({
          input: event.data.input,
          result: event.data.result,
          timestamp: event.data.timestamp,
        });
      } else {
        if (currentGroup) result.push(currentGroup);
        currentGroup = {
          toolName: event.data.toolName,
          calls: [
            {
              input: event.data.input,
              result: event.data.result,
              timestamp: event.data.timestamp,
            },
          ],
        };
      }
    } else {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(event);
    }
  }

  if (currentGroup) result.push(currentGroup);
  return result;
}

/** Type guard to check if an item is a ToolCallGroup */
export function isToolCallGroup(item: WorkflowTraceEvent | ToolCallGroup): item is ToolCallGroup {
  return 'toolName' in item && 'calls' in item;
}

function getRawStepId(event: WorkflowTraceEvent): StepId | undefined {
  switch (event.type) {
    case 'data-step-start':
    case 'data-step-complete':
    case 'data-agent-reasoning':
    case 'data-tool-call':
      return event.data.stepId;
    case 'data-iteration-update':
    case 'data-verify-improve-phase':
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
