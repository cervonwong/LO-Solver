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
  children: Array<AgentGroup | HierarchicalToolCallEvent>; // Ordered interleaving of sub-agents and tool calls
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
 * Builds a nested hierarchy: sub-agents with parentId are placed inside their parent's
 * children array. Tool calls are added to both the flat toolCalls and ordered children arrays.
 * Events not matched to any agent remain standalone in the output array.
 */
export function groupEventsWithAgents(
  events: WorkflowTraceEvent[],
): Array<AgentGroup | WorkflowTraceEvent> {
  const result: Array<AgentGroup | WorkflowTraceEvent> = [];
  const agentMap = new Map<string, AgentGroup>(); // id -> group (all agents, open or closed)
  // Track active agents in a stack for orphaned tool call fallback
  const activeAgentStack: AgentGroup[] = [];

  for (const event of events) {
    if (event.type === 'data-agent-start') {
      const group: AgentGroup = {
        type: 'agent-group',
        agentStart: event,
        agentEnd: undefined,
        toolCalls: [],
        children: [],
        isActive: true,
      };
      agentMap.set(event.data.id, group);
      activeAgentStack.push(group);

      // If this agent has a parentId and that parent exists, nest inside parent
      const parentId = event.data.parentId;
      if (parentId && agentMap.has(parentId)) {
        const parent = agentMap.get(parentId)!;
        parent.children.push(group);
      } else {
        // Top-level agent
        result.push(group);
      }
      continue;
    }

    if (event.type === 'data-agent-end') {
      const group = agentMap.get(event.data.id);
      if (group) {
        group.agentEnd = event;
        group.isActive = false;
        // Remove from active stack
        const idx = activeAgentStack.indexOf(group);
        if (idx !== -1) activeAgentStack.splice(idx, 1);
        continue;
      }
      // No matching start — render standalone
      result.push(event);
      continue;
    }

    if (event.type === 'data-tool-call') {
      // Try explicit parentId first
      if ('parentId' in event.data && event.data.parentId) {
        const parentGroup = agentMap.get(event.data.parentId);
        if (parentGroup) {
          parentGroup.toolCalls.push(event as HierarchicalToolCallEvent);
          parentGroup.children.push(event as HierarchicalToolCallEvent);
          continue;
        }
      }
      // Fallback: assign to the most recently opened active agent
      if (activeAgentStack.length > 0) {
        const fallbackAgent = activeAgentStack[activeAgentStack.length - 1]!;
        fallbackAgent.toolCalls.push(event as HierarchicalToolCallEvent);
        fallbackAgent.children.push(event as HierarchicalToolCallEvent);
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

/** Generate a one-line summary for a completed agent group. */
export function getAgentSummary(group: AgentGroup): string | undefined {
  if (!group.agentEnd) return undefined;

  const toolCalls = group.toolCalls;
  if (toolCalls.length === 0) return undefined;

  // Count tool calls by type
  const testResults = { pass: 0, fail: 0 };
  const vocabActions = { add: 0, update: 0, remove: 0 };

  for (const tc of toolCalls) {
    const name = tc.data.toolName;

    if (name === 'testRule' || name === 'testRuleWithRuleset') {
      const status = tc.data.result.status as string | undefined;
      if (status === 'RULE_OK') testResults.pass++;
      else testResults.fail++;
    }

    if (name === 'addVocabulary') vocabActions.add++;
    if (name === 'updateVocabulary') vocabActions.update++;
    if (name === 'removeVocabulary') vocabActions.remove++;
  }

  // Build summary based on dominant tool usage
  const ruleTests = testResults.pass + testResults.fail;
  const vocabTotal = vocabActions.add + vocabActions.update + vocabActions.remove;

  if (ruleTests > 0 && ruleTests >= vocabTotal) {
    return `${ruleTests} rules tested, ${testResults.pass} pass, ${testResults.fail} fail`;
  }

  if (vocabTotal > 0) {
    const parts: string[] = [];
    if (vocabActions.add > 0) parts.push(`${vocabActions.add} added`);
    if (vocabActions.update > 0) parts.push(`${vocabActions.update} updated`);
    if (vocabActions.remove > 0) parts.push(`${vocabActions.remove} removed`);
    return `Vocabulary: ${parts.join(', ')}`;
  }

  // Fallback: count tool calls
  return `${toolCalls.length} tool calls`;
}

/** Generate a brief outcome summary for a completed step section. */
export function getStepSummary(group: StepGroup): string | undefined {
  if (group.durationMs === undefined) return undefined; // Not complete

  const events = group.events;
  const agentEnds = events.filter((e) => e.type === 'data-agent-end');
  const toolCalls = events.filter((e) => e.type === 'data-tool-call');
  const iterUpdates = events.filter((e) => e.type === 'data-iteration-update');

  // Extract step: count agents
  if (group.stepId === 'extract-structure') {
    return agentEnds.length > 0 ? 'Problem structure extracted' : undefined;
  }

  // Answer step
  if (group.stepId === 'answer-questions') {
    return agentEnds.length > 0 ? 'Questions answered' : undefined;
  }

  // Perspective/synthesis/verify sections: summarize based on events
  const lastIter = iterUpdates.at(-1);
  if (lastIter && lastIter.type === 'data-iteration-update') {
    const d = lastIter.data;
    const passRate = d.passRate !== undefined ? `${Math.round(d.passRate * 100)}%` : undefined;
    return passRate ? `Pass rate: ${passRate}` : undefined;
  }

  if (toolCalls.length > 0) {
    return `${agentEnds.length} agents, ${toolCalls.length} tool calls`;
  }

  return undefined;
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
