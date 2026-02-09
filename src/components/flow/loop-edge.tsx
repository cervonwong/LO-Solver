'use client';

import { type EdgeProps, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';

type LoopEdgeData = {
  iteration: number;
  maxIterations: number;
  isActive: boolean;
};

export function LoopEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  id,
}: EdgeProps & { data?: LoopEdgeData }) {
  const iteration = data?.iteration ?? 0;
  const maxIterations = data?.maxIterations ?? 4;
  const isActive = data?.isActive ?? false;

  // Draw a curved loop path from the bottom-right of the node back to the top-right
  const offsetX = 140;
  const offsetY = 30;

  const path = [
    `M ${sourceX} ${sourceY + offsetY}`,
    `C ${sourceX + offsetX} ${sourceY + offsetY + 40},`,
    `${targetX + offsetX} ${targetY - offsetY - 40},`,
    `${targetX} ${targetY - offsetY}`,
  ].join(' ');

  const labelX = sourceX + offsetX - 10;
  const labelY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: isActive ? '#3b82f6' : '#94a3b8',
          strokeWidth: 2,
          fill: 'none',
          strokeDasharray: isActive ? '6 4' : '4 4',
          animation: isActive ? 'loopDash 0.6s linear infinite' : 'none',
        }}
        markerEnd="url(#loop-arrow)"
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${String(labelX)}px, ${String(labelY)}px)`,
          }}
        >
          <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
            {iteration}/{maxIterations}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
