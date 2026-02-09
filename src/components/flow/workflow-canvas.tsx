'use client';

import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '@/lib/workflow-store';
import { buildFlowGraph } from './flow-utils';
import { StepNode } from './step-node';
import { AgentNode } from './agent-node';
import { LoopEdge } from './loop-edge';

const nodeTypes: NodeTypes = {
  step: StepNode,
  agent: AgentNode,
};

const edgeTypes: EdgeTypes = {
  loop: LoopEdge,
};

const FIT_VIEW_OPTIONS = { padding: 0.3, duration: 200 };

function WorkflowCanvasInner() {
  const events = useWorkflowStore((s) => s.events);
  const currentIteration = useWorkflowStore((s) => s.currentIteration);
  const selectedAgentId = useWorkflowStore((s) => s.selectedAgentId);
  const runStatus = useWorkflowStore((s) => s.runStatus);
  const setSelectedAgent = useWorkflowStore((s) => s.setSelectedAgent);
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, edges } = useMemo(
    () => buildFlowGraph(events, currentIteration, selectedAgentId, runStatus),
    [events, currentIteration, selectedAgentId, runStatus],
  );

  // Re-fit when nodes change (new agents appear, etc.)
  useEffect(() => {
    const timer = setTimeout(() => fitView(FIT_VIEW_OPTIONS), 50);
    return () => clearTimeout(timer);
  }, [nodes.length, fitView]);

  // Re-fit when the container resizes (e.g. resizable panel dragged)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      fitView(FIT_VIEW_OPTIONS);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitView]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (
        node.type === 'agent' &&
        node.data &&
        typeof node.data === 'object' &&
        'agentId' in node.data
      ) {
        setSelectedAgent(node.data.agentId as string);
      }
    },
    [setSelectedAgent],
  );

  if (runStatus === 'idle') {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 text-muted-foreground">
        <p className="text-xs">Upload a problem and click Solve to start</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      {/* CSS animation for loop edge dash */}
      <style>{`
        @keyframes loopDash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>

      {/* SVG marker definition for loop arrow */}
      <svg className="absolute h-0 w-0">
        <defs>
          <marker
            id="loop-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <WorkflowCanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
