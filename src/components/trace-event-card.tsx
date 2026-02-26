'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';
import { formatDuration } from '@/lib/trace-utils';
import type { ToolCallGroup } from '@/lib/trace-utils';

interface TraceEventCardProps {
  event: WorkflowTraceEvent;
}

export function TraceEventCard({ event }: TraceEventCardProps) {
  const [open, setOpen] = useState(false);

  switch (event.type) {
    case 'data-step-start':
      return (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            START
          </Badge>
          <span>Step started</span>
        </div>
      );

    case 'data-step-complete':
      return (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            DONE
          </Badge>
          <span>Step completed in {formatDuration(event.data.durationMs)}</span>
        </div>
      );

    case 'data-agent-reasoning':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                AGENT
              </Badge>
              <span className="font-medium">{event.data.agentName}</span>
              <span className="text-muted-foreground">({event.data.model})</span>
            </span>
            <span className="text-muted-foreground">{formatDuration(event.data.durationMs)}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-x border-b border-border px-3 py-2">
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">
              {event.data.reasoning}
            </p>
          </CollapsibleContent>
        </Collapsible>
      );

    case 'data-tool-call':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
            <span className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px]">
                TOOL
              </Badge>
              <span className="font-medium">{event.data.toolName}</span>
            </span>
            <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-x border-b border-border px-3 py-2">
            <div className="flex flex-col gap-2">
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">Input</p>
                <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
                  {JSON.stringify(event.data.input, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">Result</p>
                <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
                  {JSON.stringify(event.data.result, null, 2)}
                </pre>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      );

    case 'data-iteration-update':
      return (
        <div className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs">
          <Badge
            variant={event.data.conclusion === 'ALL_RULES_PASS' ? 'default' : 'secondary'}
            className="text-[10px]"
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
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            VOCAB
          </Badge>
          <span>
            {event.data.action}: {event.data.entries.length} entries (total:{' '}
            {event.data.totalCount})
          </span>
        </div>
      );

    case 'data-verify-improve-phase':
      return (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {event.data.phase.includes('verify') ? 'VERIFY' : 'IMPROVE'}
          </Badge>
          <span>
            Iter {event.data.iteration}: {formatPhase(event.data.phase)}
          </span>
        </div>
      );
  }
}

function formatConclusion(conclusion: string): string {
  switch (conclusion) {
    case 'ALL_RULES_PASS':
      return 'All rules pass';
    case 'NEEDS_IMPROVEMENT':
      return 'Needs improvement';
    case 'MAJOR_ISSUES':
      return 'Major issues found';
    default:
      return conclusion;
  }
}

function formatPhase(phase: string): string {
  switch (phase) {
    case 'verify-start':
      return 'Verification started';
    case 'verify-complete':
      return 'Verification complete';
    case 'improve-start':
      return 'Improvement started';
    case 'improve-complete':
      return 'Improvement complete';
    default:
      return phase;
  }
}

interface ToolCallGroupCardProps {
  group: ToolCallGroup;
}

export function ToolCallGroupCard({ group }: ToolCallGroupCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
        <span className="flex items-center gap-2">
          <Badge variant="default" className="text-[10px]">
            TOOL
          </Badge>
          <span className="font-medium">{group.toolName}</span>
          <Badge variant="outline" className="text-[10px]">
            x{group.calls.length}
          </Badge>
        </span>
        <span className="text-muted-foreground">{open ? '\u25B2' : '\u25BC'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-x border-b border-border">
        <div className="flex flex-col divide-y divide-border">
          {group.calls.map((call, i) => (
            <ToolCallDetail key={i} index={i + 1} call={call} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolCallDetail({
  index,
  call,
}: {
  index: number;
  call: { input: Record<string, unknown>; result: Record<string, unknown> };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[10px] hover:bg-accent">
        <span className="text-muted-foreground">Call #{index}</span>
        <span className="text-muted-foreground">{open ? '\u25B2' : '\u25BC'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 py-2">
        <div className="flex flex-col gap-2">
          <div>
            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Input</p>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Result</p>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
              {JSON.stringify(call.result, null, 2)}
            </pre>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
