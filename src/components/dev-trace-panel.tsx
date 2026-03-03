'use client';

import { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { TraceEventCard, ToolCallGroupCard, AgentCard } from '@/components/trace-event-card';
import {
  groupEventsByStep,
  groupEventsWithAgents,
  groupEventsWithToolCalls,
  getStepSummary,
  isAgentGroup,
  isToolCallGroup,
  formatDuration,
} from '@/lib/trace-utils';
import type { StepGroup } from '@/lib/trace-utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SkeletonTrace } from '@/components/skeleton-trace';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

interface DevTracePanelProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function DevTracePanel({ events, isRunning }: DevTracePanelProps) {
  const stepGroups = useMemo(() => groupEventsByStep(events), [events]);

  // Elapsed timer for the header (total workflow time)
  const [headerElapsed, setHeaderElapsed] = useState(0);
  useEffect(() => {
    if (events.length === 0) {
      setHeaderElapsed(0);
      return;
    }
    if (!isRunning) return; // Keep last value visible
    const firstEvent = events[0];
    const startMs =
      firstEvent && 'timestamp' in firstEvent.data
        ? new Date((firstEvent.data as { timestamp: string }).timestamp).getTime()
        : Date.now();
    const tick = () => setHeaderElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, events]);

  const formatHeaderTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `T+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (events.length === 0 && isRunning) {
    return <SkeletonTrace />;
  }

  if (events.length === 0 && !isRunning) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="panel-heading flex shrink-0 items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="16"
            viewBox="0 -960 960 960"
            width="16"
            fill="currentColor"
            className="shrink-0"
          >
            <path d="M220-140v-481.01q-35-12.84-57.5-39.49-22.5-26.65-22.5-59.24 0-41.77 29.14-71.02Q198.28-820 239.91-820q41.63 0 70.86 29.24Q340-761.51 340-719.74q0 32.59-22.5 59.24T260-620.85V-180h200v-640h280v481.01q35 12.84 57.5 39.49 22.5 26.65 22.5 59.24 0 41.77-29.14 71.02Q761.72-140 720.09-140q-41.63 0-70.86-29.24Q620-198.49 620-240.26q0-32.59 22.5-59.74t57.5-39.15V-780H500v640H220Zm20-520q24.69 0 42.35-17.65Q300-695.31 300-720t-17.65-42.35Q264.69-780 240-780t-42.35 17.65Q180-744.69 180-720t17.65 42.35Q215.31-660 240-660Zm480 480q24.69 0 42.35-17.65Q780-215.31 780-240t-17.65-42.35Q744.69-300 720-300t-42.35 17.65Q660-264.69 660-240t17.65 42.35Q695.31-180 720-180ZM240-720Zm480 480Z" />
          </svg>
          <h3 className="font-heading text-sm text-foreground">Lex&apos;s Solving Process</h3>
          <span className="dimension">{events.length} events</span>
        </div>
        {headerElapsed > 0 && (
          <span className="text-xs tabular-nums text-accent">
            {formatHeaderTimer(headerElapsed)}
          </span>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          {stepGroups.map((group) => (
            <StepSection key={group.stepId} group={group} isRunning={isRunning} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface StepSectionProps {
  group: StepGroup;
  isRunning: boolean;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="16"
      viewBox="0 -960 960 960"
      width="16"
      fill="currentColor"
      className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z" />
    </svg>
  );
}

function StepSection({ group, isRunning }: StepSectionProps) {
  const isActive = group.durationMs === undefined && group.startTime !== undefined;
  const isComplete = group.durationMs !== undefined;
  const [open, setOpen] = useState(true);
  const [wasActive, setWasActive] = useState(false);

  // Auto-expand when step becomes active
  useEffect(() => {
    if (isActive && isRunning) {
      setOpen(true);
      setWasActive(true);
    }
  }, [isActive, isRunning]);

  // Auto-collapse when step completes (only if it was active and workflow is still running)
  useEffect(() => {
    if (isComplete && wasActive && isRunning) {
      // Delay collapse slightly so user can see completion
      const timer = setTimeout(() => setOpen(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, wasActive, isRunning]);

  const contentEvents = group.events.filter(
    (e) => e.type !== 'data-step-start' && e.type !== 'data-step-complete',
  );

  // Step summary for collapsed header
  const stepSummary = isComplete ? getStepSummary(group) : undefined;

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
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section id={`trace-${group.stepId}`} className="frosted border border-border">
        <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center justify-between border-b border-border px-3 py-2 text-left">
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
                <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
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
            {!open && stepSummary && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {stepSummary}
              </span>
            )}
            <ChevronIcon open={open} />
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent forceMount className="data-[state=closed]:hidden">
          <div className="p-3">
            <EventList events={contentEvents} isStepActive={isActive && isRunning} />
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function EventList({
  events,
  isStepActive,
}: {
  events: WorkflowTraceEvent[];
  isStepActive: boolean;
}) {
  // Filter out ephemeral text chunk events (real-time streaming, not trace entries)
  const displayEvents = events.filter((e) => e.type !== 'data-agent-text-chunk');

  if (displayEvents.length === 0) {
    return <p className="animate-pulse text-xs text-muted-foreground">Agent thinking...</p>;
  }

  // First pass: group agent-start/end/tool-calls into AgentGroups
  const agentGrouped = groupEventsWithAgents(displayEvents);

  // Second pass: for remaining standalone events (non-AgentGroup), group tool calls
  const items: Array<
    | ReturnType<typeof groupEventsWithAgents>[number]
    | ReturnType<typeof groupEventsWithToolCalls>[number]
  > = [];
  let standaloneBuffer: WorkflowTraceEvent[] = [];

  const flushStandalone = () => {
    if (standaloneBuffer.length > 0) {
      const toolGrouped = groupEventsWithToolCalls(standaloneBuffer);
      items.push(...toolGrouped);
      standaloneBuffer = [];
    }
  };

  for (const item of agentGrouped) {
    if (isAgentGroup(item)) {
      flushStandalone();
      items.push(item);
    } else {
      standaloneBuffer.push(item);
    }
  }
  flushStandalone();

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) =>
        isAgentGroup(item) ? (
          <AgentCard key={i} group={item} depth={0} />
        ) : isToolCallGroup(item) ? (
          <ToolCallGroupCard key={i} group={item} />
        ) : (
          <TraceEventCard key={i} event={item} />
        ),
      )}
      {isStepActive && (
        <p className="animate-pulse py-1 text-xs text-muted-foreground">Agent thinking...</p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
      <p className="text-sm text-muted-foreground">Enter a problem on the left for Lex to solve!</p>
    </div>
  );
}
