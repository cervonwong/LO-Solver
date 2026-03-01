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

/** Group events by their stepId, splitting multi-perspective events into separate groups. */
export function groupEventsByStep(events: WorkflowTraceEvent[]): StepGroup[] {
  const nonLoopMap = new Map<StepId, StepGroup>();
  const nonLoopOrder: StepId[] = [];
  const perspectiveGroups: StepGroup[] = [];
  let currentPerspectiveGroup: StepGroup | null = null;

  for (const event of events) {
    const rawStepId = getRawStepId(event);

    // Handle perspective/round/synthesis boundary events
    if (event.type === 'data-round-start') {
      const round = event.data.round;
      const groupId: UIStepId = `round-${round}`;
      currentPerspectiveGroup = {
        stepId: groupId,
        label: getUIStepLabel(groupId),
        startTime: event.data.timestamp,
        durationMs: undefined,
        events: [],
      };
      perspectiveGroups.push(currentPerspectiveGroup);
      continue;
    }

    if (event.type === 'data-round-complete') {
      if (currentPerspectiveGroup) {
        const startMs = currentPerspectiveGroup.startTime
          ? new Date(currentPerspectiveGroup.startTime).getTime()
          : 0;
        const endMs = new Date(event.data.timestamp).getTime();
        if (startMs > 0) currentPerspectiveGroup.durationMs = endMs - startMs;
      }
      continue;
    }

    if (event.type === 'data-perspective-start') {
      const groupId: UIStepId = `perspective-${event.data.perspectiveId}`;
      currentPerspectiveGroup = {
        stepId: groupId,
        label: getUIStepLabel(groupId),
        startTime: event.data.timestamp,
        durationMs: undefined,
        events: [],
      };
      perspectiveGroups.push(currentPerspectiveGroup);
      continue;
    }

    if (event.type === 'data-perspective-complete') {
      if (currentPerspectiveGroup) {
        const startMs = currentPerspectiveGroup.startTime
          ? new Date(currentPerspectiveGroup.startTime).getTime()
          : 0;
        const endMs = new Date(event.data.timestamp).getTime();
        if (startMs > 0) currentPerspectiveGroup.durationMs = endMs - startMs;
      }
      continue;
    }

    if (event.type === 'data-synthesis-start') {
      const groupId: UIStepId = `synthesis-${event.data.round}`;
      currentPerspectiveGroup = {
        stepId: groupId,
        label: getUIStepLabel(groupId),
        startTime: event.data.timestamp,
        durationMs: undefined,
        events: [],
      };
      perspectiveGroups.push(currentPerspectiveGroup);
      continue;
    }

    if (event.type === 'data-synthesis-complete') {
      if (currentPerspectiveGroup) {
        const startMs = currentPerspectiveGroup.startTime
          ? new Date(currentPerspectiveGroup.startTime).getTime()
          : 0;
        const endMs = new Date(event.data.timestamp).getTime();
        if (startMs > 0) currentPerspectiveGroup.durationMs = endMs - startMs;
      }
      continue;
    }

    if (!rawStepId) continue;

    if (rawStepId !== 'multi-perspective-hypothesis') {
      // Non-hypothesis event: group by StepId
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

    // Multi-perspective hypothesis events: add to current perspective group
    if (event.type === 'data-step-start' || event.type === 'data-step-complete') {
      // Step-level start/complete are for the overall step -- skip
      continue;
    }
    if (currentPerspectiveGroup) {
      currentPerspectiveGroup.events.push(event);
    }
  }

  // Assemble: non-loop steps in order, with perspective groups inserted after 'extract-structure'
  const result: StepGroup[] = [];
  for (const stepId of nonLoopOrder) {
    result.push(nonLoopMap.get(stepId)!);
    if (stepId === 'extract-structure') {
      result.push(...perspectiveGroups);
    }
  }
  // If extract-structure hasn't appeared yet but we have perspective groups, append them
  if (!nonLoopOrder.includes('extract-structure') && perspectiveGroups.length > 0) {
    result.push(...perspectiveGroups);
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
      return 'multi-perspective-hypothesis';
    case 'data-vocabulary-update':
    case 'data-perspective-start':
    case 'data-perspective-complete':
    case 'data-synthesis-start':
    case 'data-synthesis-complete':
    case 'data-round-start':
    case 'data-round-complete':
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
