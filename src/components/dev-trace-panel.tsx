'use client';

import { useMemo } from 'react';
import { TraceEventCard, ToolCallGroupCard } from '@/components/trace-event-card';
import {
  groupEventsByStep,
  groupEventsWithToolCalls,
  isToolCallGroup,
  formatDuration,
} from '@/lib/trace-utils';
import type { StepGroup } from '@/lib/trace-utils';
import { ActivityIndicator } from '@/components/activity-indicator';
import { SkeletonTrace } from '@/components/skeleton-trace';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

interface DevTracePanelProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function DevTracePanel({ events, isRunning }: DevTracePanelProps) {
  const stepGroups = useMemo(() => groupEventsByStep(events), [events]);

  if (events.length === 0 && isRunning) {
    return <SkeletonTrace />;
  }

  if (events.length === 0 && !isRunning) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <ActivityIndicator events={events} isRunning={isRunning} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">Dev Trace</h2>
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
    <section id={`trace-${group.stepId}`} className="frosted border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 font-heading text-sm text-foreground">
          {group.label}
          {isActive && isRunning && <span className="animate-blink text-accent">&gt;</span>}
          {group.durationMs !== undefined && (
            <span className="dimension">{formatDuration(group.durationMs)}</span>
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
      {/* Crosshair reticle */}
      <svg width="60" height="60" viewBox="0 0 60 60" className="text-accent">
        <line x1="30" y1="0" x2="30" y2="60" stroke="currentColor" strokeWidth="0.5" />
        <line x1="0" y1="30" x2="60" y2="30" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="30" cy="30" r="2" fill="currentColor" />
      </svg>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Awaiting Input</p>
    </div>
  );
}
