'use client';

import type { SwimlaneLane } from './swimlane';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface DetailPanelProps {
  lane: SwimlaneLane | null;
}

export function DetailPanel({ lane }: DetailPanelProps) {
  if (!lane) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Click any agent in the trace to inspect
      </div>
    );
  }

  const durationLabel = lane.durationMs != null ? `${(lane.durationMs / 1000).toFixed(1)}s` : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="text-base font-semibold">{lane.agentName}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {lane.model}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {lane.stepId}
          </Badge>
          {durationLabel && (
            <Badge variant="secondary" className="text-[10px]">
              {durationLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Full reasoning */}
      <ScrollArea className="flex-1 p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Reasoning
        </p>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
          {lane.reasoning}
        </pre>
      </ScrollArea>
    </div>
  );
}
