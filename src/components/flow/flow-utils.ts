import type { Node, Edge } from '@xyflow/react';
import type { WorkflowEvent } from '@/lib/workflow-events';

// --- Node data types ---

export type StepNodeData = {
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  durationMs?: number;
};

export type AgentNodeData = {
  agentId: string;
  agentName: string;
  model: string;
  status: 'pending' | 'running' | 'completed';
  durationMs?: number;
  selected: boolean;
};

// --- Pipeline definition ---

const PIPELINE_STEPS = [
  { id: 'extract-structure', label: 'Extract' },
  { id: 'initial-hypothesis', label: 'Hypothesize' },
  { id: 'verify-improve', label: 'Verify & Improve' },
  { id: 'answer-questions', label: 'Answer' },
] as const;

// --- Layout constants ---

const STEP_NODE_WIDTH = 220;
const STEP_Y_GAP = 120;
const AGENT_NODE_WIDTH = 180;
const AGENT_X_OFFSET = 40;
const AGENT_Y_OFFSET = 70;
const AGENT_Y_GAP = 54;

// --- Duration formatting ---

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// --- Graph builder ---

export function buildFlowGraph(
  events: WorkflowEvent[],
  currentIteration: number,
  selectedAgentId: string | null,
  runStatus: 'idle' | 'running' | 'complete' | 'error',
): { nodes: Node[]; edges: Edge[] } {
  // Derive step statuses from events
  const stepStatuses = new Map<
    string,
    { status: 'pending' | 'running' | 'completed' | 'failed'; durationMs?: number }
  >();
  for (const step of PIPELINE_STEPS) {
    stepStatuses.set(step.id, { status: 'pending' });
  }

  for (const event of events) {
    if (event.type === 'data-step-start') {
      const existing = stepStatuses.get(event.data.stepId);
      if (existing && existing.status !== 'completed') {
        stepStatuses.set(event.data.stepId, { status: 'running' });
      }
    } else if (event.type === 'data-step-complete') {
      stepStatuses.set(event.data.stepId, {
        status: 'completed',
        durationMs: event.data.durationMs,
      });
    }
  }

  // Mark running steps as failed if runStatus is error
  if (runStatus === 'error') {
    for (const [, info] of stepStatuses) {
      if (info.status === 'running') {
        info.status = 'failed';
      }
    }
  }

  // Derive agent statuses from events
  const agentMap = new Map<
    string,
    {
      agentId: string;
      agentName: string;
      model: string;
      stepId: string;
      status: 'pending' | 'running' | 'completed';
      durationMs?: number;
    }
  >();

  for (const event of events) {
    if (event.type === 'data-agent-start') {
      const { agentId, agentName, model, stepId } = event.data;
      agentMap.set(agentId, { agentId, agentName, model, stepId, status: 'running' });
    } else if (event.type === 'data-agent-complete') {
      const { agentId, agentName, model, stepId, durationMs } = event.data;
      agentMap.set(agentId, {
        agentId,
        agentName,
        model,
        stepId,
        status: 'completed',
        durationMs,
      });
    }
  }

  // Group agents by step
  const agentsByStep = new Map<string, typeof agentMap extends Map<string, infer V> ? V[] : never>();
  for (const [, agent] of agentMap) {
    const list = agentsByStep.get(agent.stepId) ?? [];
    list.push(agent);
    agentsByStep.set(agent.stepId, list);
  }

  // --- Manual layout (top-to-bottom, centered) ---

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let yOffset = 0;

  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    const step = PIPELINE_STEPS[i]!;
    const nodeId = `step-${step.id}`;
    const info = stepStatuses.get(step.id)!;

    nodes.push({
      id: nodeId,
      type: 'step',
      position: { x: 0, y: yOffset },
      data: {
        label: step.label,
        status: info.status,
        ...(info.durationMs !== undefined ? { durationMs: info.durationMs } : {}),
      } satisfies StepNodeData,
      draggable: false,
    });

    // Add agent child nodes for this step
    const agents = agentsByStep.get(step.id) ?? [];
    for (let j = 0; j < agents.length; j++) {
      const agent = agents[j]!;
      const agentNodeId = `agent-${agent.agentId}`;

      nodes.push({
        id: agentNodeId,
        type: 'agent',
        position: {
          x: STEP_NODE_WIDTH + AGENT_X_OFFSET,
          y: yOffset + AGENT_Y_OFFSET + j * AGENT_Y_GAP,
        },
        data: {
          agentId: agent.agentId,
          agentName: agent.agentName,
          model: agent.model,
          status: agent.status,
          ...(agent.durationMs !== undefined ? { durationMs: agent.durationMs } : {}),
          selected: agent.agentId === selectedAgentId,
        } satisfies AgentNodeData,
        draggable: false,
      });

      // Edge from step to agent
      edges.push({
        id: `edge-${nodeId}-${agentNodeId}`,
        source: nodeId,
        target: agentNodeId,
        type: 'default',
        style: { strokeDasharray: '4 4', opacity: 0.5 },
      });
    }

    // Advance Y accounting for agent nodes
    const agentHeight = agents.length > 0 ? AGENT_Y_OFFSET + agents.length * AGENT_Y_GAP : 0;
    yOffset += Math.max(STEP_Y_GAP, agentHeight + 20);

    // Sequential step-to-step edge
    if (i < PIPELINE_STEPS.length - 1) {
      const nextId = `step-${PIPELINE_STEPS[i + 1]!.id}`;
      edges.push({
        id: `edge-${nodeId}-${nextId}`,
        source: nodeId,
        target: nextId,
        type: 'default',
        animated: false,
      });
    }
  }

  // Loop edge for verify-improve
  const verifyStatus = stepStatuses.get('verify-improve');
  if (currentIteration > 0 || (verifyStatus && verifyStatus.status !== 'pending')) {
    let maxIterations = 4;
    for (const event of events) {
      if (event.type === 'data-iteration-update') {
        maxIterations = event.data.maxIterations;
      }
    }

    edges.push({
      id: 'edge-loop-verify-improve',
      source: 'step-verify-improve',
      target: 'step-verify-improve',
      type: 'loop',
      data: {
        iteration: currentIteration,
        maxIterations,
        isActive: verifyStatus?.status === 'running',
      },
    });
  }

  return { nodes, edges };
}
