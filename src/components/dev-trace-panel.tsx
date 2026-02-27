'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TraceEventCard, ToolCallGroupCard } from '@/components/trace-event-card';
import {
  groupEventsByStep,
  groupEventsWithToolCalls,
  isToolCallGroup,
  formatDuration,
} from '@/lib/trace-utils';
import type { StepGroup } from '@/lib/trace-utils';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

interface DevTracePanelProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function DevTracePanel({ events, isRunning }: DevTracePanelProps) {
  const stepGroups = useMemo(() => groupEventsByStep(events), [events]);

  if (events.length === 0 && !isRunning) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground">Dev Trace</h2>
        <span className="text-xs text-muted-foreground">
          {isRunning ? `Streaming... (${events.length} events)` : `${events.length} events`}
        </span>
      </div>

      {stepGroups.map((group) => (
        <StepSection key={group.stepId} group={group} isRunning={isRunning} />
      ))}
    </div>
  );
}

interface StepSectionProps {
  group: StepGroup;
  isRunning: boolean;
}

function StepSection({ group, isRunning }: StepSectionProps) {
  const isActive = group.durationMs === undefined && group.startTime !== undefined;

  const contentEvents = group.events.filter(
    (e) => e.type !== 'data-step-start' && e.type !== 'data-step-complete',
  );

  return (
    <section id={`trace-${group.stepId}`} className="rounded border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          {group.label}
          {isActive && isRunning && (
            <Badge variant="secondary" className="animate-pulse text-[10px]">
              Running
            </Badge>
          )}
          {group.durationMs !== undefined && (
            <Badge variant="outline" className="text-[10px]">
              {formatDuration(group.durationMs)}
            </Badge>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{contentEvents.length} events</span>
      </div>

      <div className="p-3">
        <EventList events={contentEvents} />
      </div>
    </section>
  );
}

function EventList({ events }: { events: WorkflowTraceEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No events yet.</p>;
  }

  const grouped = groupEventsWithToolCalls(events);

  return (
    <div className="flex flex-col gap-2">
      {grouped.map((item, i) =>
        isToolCallGroup(item) ? (
          <ToolCallGroupCard key={i} group={item} />
        ) : (
          <TraceEventCard key={i} event={item} />
        ),
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <span className="text-4xl">&#9881;</span>
      <div className="flex max-w-xs flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">No active run</p>
        <p className="text-xs text-muted-foreground">
          Paste a Rosetta Stone problem in the input on the left and click Solve to watch the
          pipeline work through it step by step.
        </p>
        <p className="text-xs text-muted-foreground">
          Try one of the example problems to get started.
        </p>
      </div>
    </div>
  );
}
