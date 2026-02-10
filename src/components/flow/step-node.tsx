'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { formatDuration, type StepNodeData } from './flow-utils';

type StepNodeProps = NodeProps & { data: StepNodeData };

function StepNodeComponent({ data }: StepNodeProps) {
  const { label, status, durationMs } = data;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg border-2 px-3 py-2',
        'min-w-[160px] min-h-[40px]',
        'transition-colors duration-200',
        status === 'pending' && 'border-muted bg-muted/20 text-muted-foreground',
        status === 'running' && 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 animate-pulse',
        status === 'completed' && 'border-green-600 bg-green-600/10 text-green-700 dark:text-green-300',
        status === 'failed' && 'border-destructive bg-destructive/10 text-destructive',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground/50 !w-2 !h-2" />

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {status === 'completed' && durationMs !== undefined && (
          <span className="rounded-full bg-green-600/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
            {formatDuration(durationMs)}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground/50 !w-2 !h-2" />
    </div>
  );
}

export const StepNode = memo(StepNodeComponent);
