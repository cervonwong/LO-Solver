import type {
  WorkflowEvent,
  AgentReasoningEvent,
  ToolCallEvent,
  VocabularyUpdateEvent,
  IterationUpdateEvent,
} from '@/lib/workflow-events';

// Feed item types for the detail panel chronological feed

export type FeedItemData =
  | { type: 'reasoning'; event: AgentReasoningEvent }
  | { type: 'tool-call'; event: ToolCallEvent }
  | { type: 'vocabulary'; event: VocabularyUpdateEvent }
  | { type: 'iteration'; event: IterationUpdateEvent };

/**
 * Extracts feed items for a given agent by temporal ordering.
 *
 * Tool calls and vocabulary updates do not carry an agentId, so we attribute
 * them to an agent by collecting all events between its agent-start event
 * and the next agent-start or agent-complete for the same agent.
 */
export function getAgentFeedItems(
  events: WorkflowEvent[],
  agentId: string,
): FeedItemData[] {
  const items: FeedItemData[] = [];

  // Find the last agent-start for this agentId (use last occurrence to handle re-runs)
  let startIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]!;
    if (ev.type === 'data-agent-start' && ev.data.agentId === agentId) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return items;

  // Collect events from startIdx+1 until agent-complete for same agentId or end
  for (let i = startIdx + 1; i < events.length; i++) {
    const ev = events[i]!;

    // Stop if we hit agent-complete for this agent
    if (ev.type === 'data-agent-complete' && ev.data.agentId === agentId) {
      break;
    }

    // Stop if another agent-start for a different agent appears in the same step
    // (but not for a different agent -- we keep collecting tool calls etc.)
    // Actually, we should stop at the agent-complete for THIS agent only.

    switch (ev.type) {
      case 'data-agent-reasoning': {
        if (ev.data.agentId === agentId) {
          items.push({ type: 'reasoning', event: ev });
        }
        break;
      }
      case 'data-tool-call': {
        items.push({ type: 'tool-call', event: ev });
        break;
      }
      case 'data-vocabulary-update': {
        items.push({ type: 'vocabulary', event: ev });
        break;
      }
      case 'data-iteration-update': {
        items.push({ type: 'iteration', event: ev });
        break;
      }
      default:
        break;
    }
  }

  return items;
}

/** Format an ISO timestamp as HH:MM:SS */
export function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toTimeString().slice(0, 8);
  } catch {
    return iso;
  }
}
