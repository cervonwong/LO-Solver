'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
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
        <h2 className="font-heading text-lg text-foreground">Lex&apos;s Solving Process</h2>
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

  // Live timer for active steps
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isActive || !isRunning || !group.startTime) {
      setElapsed(0);
      return;
    }
    const start = new Date(group.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isActive, isRunning, group.startTime]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `T+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <section id={`trace-${group.stepId}`} className="frosted border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 font-heading text-sm text-foreground">
          {group.label}
          {isActive && isRunning && (
            <Image
              src="/lex-mascot.png"
              alt=""
              width={16}
              height={16}
              className="animate-spin-duck shrink-0"
            />
          )}
          {group.durationMs !== undefined && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="16"
              viewBox="0 -960 960 960"
              width="16"
              fill="currentColor"
              className="animate-checkmark-scale shrink-0 text-accent"
            >
              <path d="M382-267.69 183.23-466.46 211.77-495 382-324.77 748.23-691l28.54 28.54L382-267.69Z" />
            </svg>
          )}
        </span>
        <span className="flex items-center gap-3 font-sans">
          <span className="text-xs text-muted-foreground">{contentEvents.length} events</span>
          {isActive && isRunning && (
            <span className="text-xs tabular-nums text-accent">{formatTimer(elapsed)}</span>
          )}
          {group.durationMs !== undefined && (
            <span className="text-xs tabular-nums text-accent">
              {formatDuration(group.durationMs)}
            </span>
          )}
        </span>
      </div>

      <div className="p-3">
        <EventList events={contentEvents} />
      </div>
    </section>
  );
}

function EventList({ events }: { events: WorkflowTraceEvent[] }) {
  if (events.length === 0) {
    return <p className="animate-pulse text-xs text-muted-foreground">Agent thinking...</p>;
  }

  const grouped = groupEventsWithToolCalls(events);

  return (
    <div className="flex flex-col gap-1">
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
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center opacity-50">
      {/* Crosshair reticle */}
      <svg width="60" height="60" viewBox="0 0 60 60" className="text-accent">
        <line x1="30" y1="0" x2="30" y2="60" stroke="currentColor" strokeWidth="0.5" />
        <line x1="0" y1="30" x2="60" y2="30" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="30" cy="30" r="2" fill="currentColor" />
      </svg>
      <p className="text-sm text-muted-foreground">Awaiting input.</p>
    </div>
  );
}
