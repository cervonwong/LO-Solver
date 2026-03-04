'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';
import { formatDuration } from '@/lib/trace-utils';
import { LabeledList } from '@/components/labeled-list';
import { ChevronIcon, RawJsonToggle } from './shared';
import { formatConclusion } from './trace-utils';

interface TraceEventCardProps {
  event: WorkflowTraceEvent;
}

export function TraceEventCard({ event }: TraceEventCardProps) {
  const [open, setOpen] = useState(false);

  switch (event.type) {
    case 'data-step-start':
      return (
        <div className="animate-fade-in border-l-2 border-l-status-active flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="border-status-active text-status-active bg-transparent text-[10px]"
          >
            START
          </Badge>
          <span>Step started</span>
        </div>
      );

    case 'data-step-complete':
      return (
        <div className="animate-fade-in border-l-2 border-l-status-success flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="border-foreground text-foreground bg-transparent text-[10px]"
          >
            DONE
          </Badge>
          <span>Step completed in {formatDuration(event.data.durationMs)}</span>
        </div>
      );

    case 'data-agent-start':
    case 'data-agent-end':
      // These are now handled by AgentCard via groupEventsWithAgents.
      // Fallback rendering for un-grouped events (shouldn't normally appear).
      return null;

    case 'data-agent-text-chunk':
      // Ephemeral streaming events; filtered out by EventList, no render needed
      return null;

    case 'data-rule-test-result':
      return (
        <div
          className={`animate-fade-in border-l-2 ${event.data.passed ? 'border-l-status-success' : 'border-l-status-error'} flex items-center gap-2 py-1 text-xs text-muted-foreground`}
        >
          <Badge
            variant="outline"
            className={`${event.data.passed ? 'border-status-success text-status-success' : 'border-status-error text-status-error'} bg-transparent text-[10px]`}
          >
            {event.data.passed ? 'PASS' : 'FAIL'}
          </Badge>
          <span>{event.data.ruleTitle}</span>
        </div>
      );

    case 'data-tool-call':
      return (
        <RawJsonToggle data={{ input: event.data.input, result: event.data.result }}>
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="hover-hatch-cyan animate-fade-in border-l-2 border-l-trace-tool flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs">
              <span className="flex items-center gap-2">
                <Badge
                  variant="default"
                  className="border-trace-tool text-trace-tool bg-transparent text-[10px]"
                >
                  TOOL
                </Badge>
                <span className="font-medium">{event.data.toolName}</span>
              </span>
              <ChevronIcon open={open} />
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-collapsible border-x border-b border-border-subtle bg-surface-2 px-3 py-2">
              <div className="flex flex-col gap-2">
                <LabeledList data={event.data.input} label="Input" />
                <LabeledList data={event.data.result} label="Result" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </RawJsonToggle>
      );

    case 'data-iteration-update':
      return (
        <div className="animate-fade-in border-l-2 border-l-status-warning flex items-center gap-2 border border-border-subtle bg-surface-2 px-3 py-2 text-xs">
          <Badge
            variant="secondary"
            className="border-status-warning text-status-warning bg-transparent text-[10px]"
          >
            ITER {event.data.iteration}
          </Badge>
          <span>{formatConclusion(event.data.conclusion)}</span>
          <span className="text-muted-foreground">
            Rules: {event.data.errantRulesCount}/{event.data.rulesTestedCount} errant | Sentences:{' '}
            {event.data.errantSentencesCount}/{event.data.sentencesTestedCount} errant
          </span>
        </div>
      );

    case 'data-vocabulary-update':
      return (
        <div className="animate-fade-in border-l-2 border-l-trace-vocab flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="border-trace-vocab text-trace-vocab bg-transparent text-[10px]"
          >
            VOCAB
          </Badge>
          <span>
            {event.data.action}: {event.data.entries.length} entries (total: {event.data.totalCount}
            )
          </span>
        </div>
      );

    case 'data-verify-improve-phase':
    case 'data-rules-update':
    case 'data-perspective-start':
    case 'data-perspective-complete':
    case 'data-synthesis-start':
    case 'data-synthesis-complete':
    case 'data-convergence-start':
    case 'data-convergence-complete':
    case 'data-round-start':
    case 'data-round-complete':
      // Boundary/structural events consumed by grouping logic; not rendered
      return null;
  }
}
