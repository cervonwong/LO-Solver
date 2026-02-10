'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/components/flow/flow-utils';
import { cn } from '@/lib/utils';

export interface AgentHeaderProps {
  agentName: string;
  model: string;
  stepId: string;
  status: 'running' | 'completed';
  durationMs?: number | undefined;
  onClose: () => void;
}

export function AgentHeader({
  agentName,
  model,
  stepId,
  status,
  durationMs,
  onClose,
}: AgentHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      {/* Status dot */}
      <span
        className={cn(
          'inline-block h-2 w-2 shrink-0 rounded-full',
          status === 'running' && 'bg-blue-500 animate-pulse',
          status === 'completed' && 'bg-green-500',
        )}
      />

      {/* Agent name */}
      <span className="text-xs font-semibold text-foreground truncate">{agentName}</span>

      {/* Model badge */}
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {model}
      </Badge>

      {/* Step badge */}
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
        {stepId}
      </Badge>

      {/* Duration */}
      {durationMs !== undefined && (
        <span className="text-[10px] text-muted-foreground ml-auto mr-1">
          {formatDuration(durationMs)}
        </span>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className={cn(
          'ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          durationMs !== undefined && 'ml-0',
        )}
        aria-label="Close detail panel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
