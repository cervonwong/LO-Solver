'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ActivityIndicator } from '@/components/activity-indicator';
import { SkeletonTrace } from '@/components/skeleton-trace';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

interface DevTracePanelProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function DevTracePanel({ events, isRunning }: DevTracePanelProps) {
  const stepGroups = useMemo(() => groupEventsByStep(events), [events]);

  // Auto-scroll refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);
  const isUserScrollingRef = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Threshold for "close enough to bottom" -- 50px tolerance
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;

    if (atBottom) {
      // User scrolled back to bottom -- resume auto-scroll
      isAutoScrollRef.current = true;
    } else if (!isUserScrollingRef.current) {
      // User scrolled away from bottom -- disable auto-scroll
      isAutoScrollRef.current = false;
    }
  }, []);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !isAutoScrollRef.current) return;

    // Use requestAnimationFrame to scroll after DOM update
    requestAnimationFrame(() => {
      isUserScrollingRef.current = true;
      el.scrollTop = el.scrollHeight;
      // Reset flag after scroll completes
      requestAnimationFrame(() => {
        isUserScrollingRef.current = false;
      });
    });
  }, [events.length]);

  if (events.length === 0 && isRunning) {
    return <SkeletonTrace />;
  }

  if (events.length === 0 && !isRunning) {
    return <EmptyState />;
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
    >
      <ActivityIndicator events={events} isRunning={isRunning} />

      <div className="flex items-center justify-between border-b-4 border-double border-border pb-2">
        <h2 className="font-heading text-lg text-foreground">Lex&apos;s Solving Process</h2>
        <span className="text-xs text-muted-foreground">{events.length} events</span>
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
        <CollapsibleTrigger className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left hover:bg-surface-2">
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
      <p className="text-sm text-muted-foreground">Awaiting input.</p>
    </div>
  );
}
