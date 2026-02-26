'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TraceEventCard } from '@/components/trace-event-card';
import { groupEventsByStep, groupEventsByIteration, formatDuration } from '@/lib/trace-utils';
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
  group: ReturnType<typeof groupEventsByStep>[number];
  isRunning: boolean;
}

function StepSection({ group, isRunning }: StepSectionProps) {
  const isVerifyImprove = group.stepId === 'verify-improve-rules-loop';
  const isActive = group.durationMs === undefined && group.startTime !== undefined;

  // Filter out step-start/step-complete for cleaner display
  const contentEvents = group.events.filter(
    (e) => e.type !== 'data-step-start' && e.type !== 'data-step-complete',
  );

  return (
    <section className="rounded border border-border">
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
        {isVerifyImprove ? (
          <IterationTabs events={contentEvents} />
        ) : (
          <EventList events={contentEvents} />
        )}
      </div>
    </section>
  );
}

function IterationTabs({ events }: { events: WorkflowTraceEvent[] }) {
  const iterations = useMemo(() => groupEventsByIteration(events), [events]);

  if (iterations.length === 0) {
    return <p className="text-xs text-muted-foreground">Waiting for events...</p>;
  }

  if (iterations.length === 1) {
    return <EventList events={iterations[0]!.events} />;
  }

  return (
    <Tabs defaultValue="1">
      <TabsList>
        {iterations.map((iter) => (
          <TabsTrigger key={iter.iteration} value={String(iter.iteration)} className="text-xs">
            Iter {iter.iteration}
            {iter.conclusion === 'ALL_RULES_PASS' && ' \u2713'}
          </TabsTrigger>
        ))}
      </TabsList>
      {iterations.map((iter) => (
        <TabsContent key={iter.iteration} value={String(iter.iteration)}>
          <EventList events={iter.events} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function EventList({ events }: { events: WorkflowTraceEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No events yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event, i) => (
        <TraceEventCard key={i} event={event} />
      ))}
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
