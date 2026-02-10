'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { formatDuration, type AgentNodeData } from './flow-utils';

type AgentNodeProps = NodeProps & { data: AgentNodeData };

function AgentNodeComponent({ data }: AgentNodeProps) {
  const { agentName, model, status, durationMs, selected } = data;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5',
        'min-w-[140px] min-h-[34px] cursor-pointer',
        'transition-all duration-200',
        selected && 'ring-2 ring-primary',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground/50 !w-1.5 !h-1.5" />

      {/* Status dot */}
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          status === 'pending' && 'bg-muted-foreground/50',
          status === 'running' && 'bg-blue-500 animate-pulse',
          status === 'completed' && 'bg-green-500',
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-medium leading-tight">{agentName}</span>
        <div className="flex items-center gap-1">
          <span className="rounded bg-muted px-1 py-px text-[10px] leading-tight text-muted-foreground">
            {model}
          </span>
          {status === 'completed' && durationMs !== undefined && (
            <span className="text-[10px] leading-tight text-muted-foreground">
              {formatDuration(durationMs)}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground/50 !w-1.5 !h-1.5" />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
