'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2Icon } from 'lucide-react';

export interface SwimlaneLane {
  agentId: string;
  agentName: string;
  stepId: string;
  model: string;
  reasoning: string;
  timestamp: string;
  durationMs?: number | undefined;
  iteration?: number | undefined;
  status: 'running' | 'completed';
}

interface SwimlaneProps {
  lane: SwimlaneLane;
  isSelected: boolean;
  onSelect: (lane: SwimlaneLane) => void;
}

export function Swimlane({ lane, isSelected, onSelect }: SwimlaneProps) {
  const durationLabel = lane.durationMs != null ? `${(lane.durationMs / 1000).toFixed(1)}s` : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(lane)}
      className={cn(
        'flex w-[220px] shrink-0 cursor-pointer flex-col rounded-lg border bg-card p-3 text-left transition-shadow',
        isSelected ? 'ring-2 ring-primary' : 'hover:border-muted-foreground/40',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {lane.stepId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
          <p className="truncate text-sm font-semibold">{lane.agentName}</p>
          <p className="truncate text-xs text-muted-foreground">{lane.model}</p>
        </div>
        {lane.status === 'running' ? (
          <span className="relative mt-1 flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
          </span>
        ) : (
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-green-500" />
        )}
      </div>

      {/* Duration */}
      {durationLabel && (
        <Badge variant="secondary" className="mt-2 w-fit text-[10px]">
          {durationLabel}
        </Badge>
      )}

      {/* Truncated reasoning */}
      <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{lane.reasoning}</p>
    </button>
  );
}
