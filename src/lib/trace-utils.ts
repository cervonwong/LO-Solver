import type {
  WorkflowTraceEvent,
  StepId,
  UIStepId,
  HierarchicalAgentStartEvent,
  HierarchicalAgentEndEvent,
  HierarchicalToolCallEvent,
} from './workflow-events';
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

export interface AgentGroup {
  type: 'agent-group';
  agentStart: HierarchicalAgentStartEvent;
  agentEnd: HierarchicalAgentEndEvent | undefined;
  toolCalls: HierarchicalToolCallEvent[];
  isActive: boolean;
}

/** Type guard to check if an item is an AgentGroup */
export function isAgentGroup(
  item: WorkflowTraceEvent | ToolCallGroup | AgentGroup,
): item is AgentGroup {
  return 'type' in item && (item as AgentGroup).type === 'agent-group';
}

/** Group events by their stepId, splitting multi-perspective events into separate groups. */
export function groupEventsByStep(events: WorkflowTraceEvent[]): StepGroup[] {
  const nonLoopMap = new Map<StepId, StepGroup>();
  const nonLoopOrder: StepId[] = [];
  const perspectiveGroups: StepGroup[] = [];
  // Map perspectiveId -> StepGroup for routing concurrent perspective events
  const perspectiveGroupMap = new Map<string, StepGroup>();
  let lastPerspectiveGroup: StepGroup | null = null;

  for (const event of events) {
    const rawStepId = getRawStepId(event);

    // Handle perspective/round/synthesis/convergence boundary events
    if (event.type === 'data-round-start') {
      const round = event.data.round;
      const groupId: UIStepId = `round-${round}`;
      const group: StepGroup = {
        stepId: groupId,
        label: getUIStepLabel(groupId),
        startTime: event.data.timestamp,
        durationMs: undefined,
        events: [],
      };
      lastPerspectiveGroup = group;
      perspectiveGroups.push(group);
      continue;
    }

    if (event.type === 'data-round-complete') {
      if (lastPerspectiveGroup) {
        const startMs = lastPerspectiveGroup.startTime
          ? new Date(lastPerspectiveGroup.startTime).getTime()
          : 0;
        const endMs = new Date(event.data.timestamp).getTime();
        if (startMs > 0) lastPerspectiveGroup.durationMs = endMs - startMs;
      }
      continue;
    }

    if (event.type === 'data-perspective-start') {
      const groupId: UIStepId = `perspective-${event.data.perspectiveId}`;
      const group: StepGroup = {
        stepId: groupId,
        label: getUIStepLabel(groupId),
        startTime: event.data.timestamp,
        durationMs: undefined,
        events: [],
      };
      perspectiveGroupMap.set(event.data.perspectiveId, group);
      lastPerspectiveGroup = group;
      perspectiveGroups.push(group);
      continue;
    }

    if (event.type === 'data-perspective-complete') {
      const group = perspectiveGroupMap.get(event.data.perspectiveId) ?? lastPerspectiveGroup;
      if (group) {
        const startMs = group.startTime ? new Date(group.startTime).getTime() : 0;
        const endMs = new Date(event.data.timestamp).getTime();
        if (startMs > 0) group.durationMs = endMs - startMs;
      }
      continue;
    }

    if (event.type === 'data-synthesis-start') {
      const groupId: UIStepId = `synthesis-${event.data.round}`;
      const group: StepGroup = {
        stepId: groupId,
        label: getUIStepLabel(groupId),
        startTime: event.data.timestamp,
        durationMs: undefined,
        events: [],
      };
      lastPerspectiveGroup = group;
      perspectiveGroups.push(group);
      continue;
    }

    if (event.type === 'data-synthesis-complete') {
      if (lastPerspectiveGroup) {
        const startMs = lastPerspectiveGroup.startTime
          ? new Date(lastPerspectiveGroup.startTime).getTime()
          : 0;
        const endMs = new Date(event.data.timestamp).getTime();
        if (startMs > 0) lastPerspectiveGroup.durationMs = endMs - startMs;
      }
      continue;
    }

    if (event.type === 'data-convergence-start') {
      const groupId: UIStepId = `verify-${event.data.round}`;
      const group: StepGroup = {
        stepId: groupId,
        label: getUIStepLabel(groupId),
        startTime: event.data.timestamp,
        durationMs: undefined,
        events: [],
      };
      lastPerspectiveGroup = group;
      perspectiveGroups.push(group);
      continue;
    }

    if (event.type === 'data-convergence-complete') {
      if (lastPerspectiveGroup) {
        const startMs = lastPerspectiveGroup.startTime
          ? new Date(lastPerspectiveGroup.startTime).getTime()
          : 0;
        const endMs = new Date(event.data.timestamp).getTime();
        if (startMs > 0) lastPerspectiveGroup.durationMs = endMs - startMs;
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

    // Route to the correct perspective group using perspectiveId
    const perspectiveId = getEventPerspectiveId(event);
    const targetGroup = perspectiveId
      ? (perspectiveGroupMap.get(perspectiveId) ?? lastPerspectiveGroup)
      : lastPerspectiveGroup;
    if (targetGroup) {
      targetGroup.events.push(event);
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
 * Extract perspectiveId from events that carry it.
 */
function getEventPerspectiveId(event: WorkflowTraceEvent): string | undefined {
  if (event.type === 'data-agent-start' || event.type === 'data-agent-end') {
    return event.data.perspectiveId;
  }
  // Tool calls inherit perspective from their parent agent; we don't have
  // perspectiveId directly on them, so return undefined (falls back to lastPerspectiveGroup)
  return undefined;
}

/**
 * Group events into AgentGroups (merging agent-start + tool-calls + agent-end).
 * Events not matched to any agent remain standalone in the output array.
 */
export function groupEventsWithAgents(
  events: WorkflowTraceEvent[],
): Array<AgentGroup | WorkflowTraceEvent> {
  const result: Array<AgentGroup | WorkflowTraceEvent> = [];
  const openAgents = new Map<string, AgentGroup>();

  for (const event of events) {
    if (event.type === 'data-agent-start') {
      const group: AgentGroup = {
        type: 'agent-group',
        agentStart: event,
        agentEnd: undefined,
        toolCalls: [],
        isActive: true,
      };
      openAgents.set(event.data.id, group);
      result.push(group);
      continue;
    }

    if (event.type === 'data-agent-end') {
      const group = openAgents.get(event.data.id);
      if (group) {
        group.agentEnd = event;
        group.isActive = false;
        openAgents.delete(event.data.id);
        continue;
      }
      // No matching start — render standalone
      result.push(event);
      continue;
    }

    if (event.type === 'data-tool-call' && 'parentId' in event.data && event.data.parentId) {
      const group = openAgents.get(event.data.parentId);
      if (group) {
        group.toolCalls.push(event as HierarchicalToolCallEvent);
        continue;
      }
    }

    // Not matched to any agent group — keep standalone
    result.push(event);
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
export function isToolCallGroup(
  item: WorkflowTraceEvent | ToolCallGroup | AgentGroup,
): item is ToolCallGroup {
  return 'toolName' in item && 'calls' in item;
}

function getRawStepId(event: WorkflowTraceEvent): StepId | undefined {
  switch (event.type) {
    case 'data-step-start':
    case 'data-step-complete':
    case 'data-agent-reasoning':
    case 'data-tool-call':
      return event.data.stepId;
    case 'data-agent-start':
    case 'data-agent-end':
      return event.data.stepId;
    case 'data-iteration-update':
    case 'data-verify-improve-phase':
      return 'multi-perspective-hypothesis';
    case 'data-agent-text-chunk':
    case 'data-rule-test-result':
      return undefined; // Ephemeral events; not grouped by step
    case 'data-vocabulary-update':
    case 'data-rules-update':
      return undefined;
    case 'data-perspective-start':
    case 'data-perspective-complete':
    case 'data-synthesis-start':
    case 'data-synthesis-complete':
    case 'data-convergence-start':
    case 'data-convergence-complete':
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
