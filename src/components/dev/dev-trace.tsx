'use client';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Swimlane, type SwimlaneLane } from './swimlane';

interface DevTraceProps {
  lanes: SwimlaneLane[];
  selectedLane: SwimlaneLane | null;
  onSelectLane: (lane: SwimlaneLane) => void;
}

export function DevTrace({ lanes, selectedLane, onSelectLane }: DevTraceProps) {
  const sorted = [...lanes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Waiting for agent events...
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex gap-3 p-4">
        {sorted.map((lane) => (
          <Swimlane
            key={`${lane.agentId}-${lane.timestamp}`}
            lane={lane}
            isSelected={
              selectedLane?.agentId === lane.agentId && selectedLane?.timestamp === lane.timestamp
            }
            onSelect={onSelectLane}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
