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
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';

const jsonMarkdown = (label: string, data: unknown) =>
  `**${label}:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;

interface TraceEventCardProps {
  event: WorkflowTraceEvent;
}

export function TraceEventCard({ event }: TraceEventCardProps) {
  const [open, setOpen] = useState(false);

  switch (event.type) {
    case 'data-step-start':
      return (
        <div className="animate-fade-in border-l-3 border-l-status-active flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="bg-status-active-muted text-status-active text-[10px]">
            START
          </Badge>
          <span>Step started</span>
        </div>
      );

    case 'data-step-complete':
      return (
        <div className="animate-fade-in border-l-3 border-l-status-success flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="bg-status-success-muted text-status-success text-[10px]"
          >
            DONE
          </Badge>
          <span>Step completed in {formatDuration(event.data.durationMs)}</span>
        </div>
      );

    case 'data-agent-reasoning':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="animate-fade-in border-l-3 border-l-trace-agent flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
            <span className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-trace-agent-muted text-trace-agent text-[10px]"
              >
                AGENT
              </Badge>
              <span className="font-medium">{event.data.agentName}</span>
              <span className="text-muted-foreground">({event.data.model})</span>
            </span>
            <span className="text-muted-foreground">{formatDuration(event.data.durationMs)}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-collapsible border-x border-b border-border px-3 py-2">
            <Streamdown plugins={{ code }}>{event.data.reasoning}</Streamdown>
          </CollapsibleContent>
        </Collapsible>
      );

    case 'data-tool-call':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="animate-fade-in border-l-3 border-l-trace-tool flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
            <span className="flex items-center gap-2">
              <Badge
                variant="default"
                className="bg-trace-tool-muted text-trace-tool text-[10px]"
              >
                TOOL
              </Badge>
              <span className="font-medium">{event.data.toolName}</span>
            </span>
            <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-collapsible border-x border-b border-border px-3 py-2">
            <div className="flex flex-col gap-2">
              <Streamdown plugins={{ code }}>
                {jsonMarkdown('Input', event.data.input)}
              </Streamdown>
              <Streamdown plugins={{ code }}>
                {jsonMarkdown('Result', event.data.result)}
              </Streamdown>
            </div>
          </CollapsibleContent>
        </Collapsible>
      );

    case 'data-iteration-update':
      return (
        <div className="animate-fade-in border-l-3 border-l-status-warning flex items-center gap-2 rounded border border-border px-3 py-2 text-xs">
          <Badge
            variant="secondary"
            className="bg-status-warning-muted text-status-warning text-[10px]"
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
        <div className="animate-fade-in border-l-3 border-l-trace-vocab flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="bg-trace-vocab-muted text-trace-vocab text-[10px]"
          >
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
        <div className="animate-fade-in border-l-3 border-l-status-warning flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="bg-status-warning-muted text-status-warning text-[10px]"
          >
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
      <CollapsibleTrigger className="animate-fade-in border-l-3 border-l-trace-tool flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-xs hover:bg-accent">
        <span className="flex items-center gap-2">
          <Badge variant="default" className="bg-trace-tool-muted text-trace-tool text-[10px]">
            TOOL
          </Badge>
          <span className="font-medium">{group.toolName}</span>
          <Badge variant="outline" className="text-[10px]">
            x{group.calls.length}
          </Badge>
        </span>
        <span className="text-muted-foreground">{open ? '\u25B2' : '\u25BC'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible border-x border-b border-border">
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
      <CollapsibleContent className="animate-collapsible px-3 py-2">
        <div className="flex flex-col gap-2">
          <Streamdown plugins={{ code }}>
            {jsonMarkdown('Input', call.input)}
          </Streamdown>
          <Streamdown plugins={{ code }}>
            {jsonMarkdown('Result', call.result)}
          </Streamdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
