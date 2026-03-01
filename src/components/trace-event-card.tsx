'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';
import { formatDuration } from '@/lib/trace-utils';
import type { ToolCallGroup } from '@/lib/trace-utils';
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="16"
      viewBox="0 -960 960 960"
      width="16"
      fill="currentColor"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z" />
    </svg>
  );
}

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
      return (
        <div className="animate-fade-in border-l-2 border-l-trace-agent flex items-center gap-2 border border-border-subtle bg-surface-2 px-3 py-1.5 text-xs">
          <Image
            src="/lex-mascot.png"
            alt=""
            width={16}
            height={16}
            className="shrink-0"
          />
          <span className="font-medium">{event.data.agentName}</span>
          <span className="text-muted-foreground">({event.data.model})</span>
          <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[200px]">
            {event.data.task.slice(0, 100)}
          </span>
        </div>
      );

    case 'data-agent-end':
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-agent flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs hover:bg-surface-3">
            <span className="flex items-center gap-2">
              <Image
                src="/lex-mascot.png"
                alt=""
                width={16}
                height={16}
                className="shrink-0"
              />
              <span className="font-medium">{event.data.agentName}</span>
              {event.data.totalAttempts > 1 && (
                <Badge variant="outline" className="text-[10px]">
                  Attempt {event.data.attempt}/{event.data.totalAttempts}
                </Badge>
              )}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">{formatDuration(event.data.durationMs)}</span>
              <ChevronIcon open={open} />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-collapsible border-x border-b border-border-subtle bg-surface-2 px-3 py-2">
            <Streamdown plugins={{ code }}>{event.data.reasoning}</Streamdown>
          </CollapsibleContent>
        </Collapsible>
      );

    case 'data-agent-reasoning':
      // Deprecated: kept for backward compatibility with old event data
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-agent flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs hover:bg-surface-3">
            <span className="flex items-center gap-2">
              <Image
                src="/lex-mascot.png"
                alt=""
                width={16}
                height={16}
                className="shrink-0"
              />
              <span className="font-medium">{event.data.agentName}</span>
              <span className="text-muted-foreground">({event.data.model})</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">{formatDuration(event.data.durationMs)}</span>
              <ChevronIcon open={open} />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-collapsible border-x border-b border-border-subtle bg-surface-2 px-3 py-2">
            <Streamdown plugins={{ code }}>{event.data.reasoning}</Streamdown>
          </CollapsibleContent>
        </Collapsible>
      );

    case 'data-agent-text-chunk':
      // Ephemeral streaming events; filtered out by EventList, no render needed
      return null;

    case 'data-rule-test-result':
      return (
        <div className={`animate-fade-in border-l-2 ${event.data.passed ? 'border-l-status-success' : 'border-l-status-error'} flex items-center gap-2 py-1 text-xs text-muted-foreground`}>
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
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-tool flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs hover:bg-surface-3">
            <span className="flex items-center gap-2">
              <Badge variant="default" className="border-trace-tool text-trace-tool bg-transparent text-[10px]">
                TOOL
              </Badge>
              <span className="font-medium">{event.data.toolName}</span>
            </span>
            <ChevronIcon open={open} />
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-collapsible border-x border-b border-border-subtle bg-surface-2 px-3 py-2">
            <div className="flex flex-col gap-2">
              <Streamdown plugins={{ code }}>{jsonMarkdown('Input', event.data.input)}</Streamdown>
              <Streamdown plugins={{ code }}>
                {jsonMarkdown('Result', event.data.result)}
              </Streamdown>
            </div>
          </CollapsibleContent>
        </Collapsible>
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
          <Badge variant="outline" className="border-trace-vocab text-trace-vocab bg-transparent text-[10px]">
            VOCAB
          </Badge>
          <span>
            {event.data.action}: {event.data.entries.length} entries (total: {event.data.totalCount}
            )
          </span>
        </div>
      );

    case 'data-verify-improve-phase':
      // Phase events are structural markers consumed by grouping logic; not rendered
      return null;
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

interface ToolCallGroupCardProps {
  group: ToolCallGroup;
}

export function ToolCallGroupCard({ group }: ToolCallGroupCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-tool flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs hover:bg-surface-3">
        <span className="flex items-center gap-2">
          <Badge variant="default" className="border-trace-tool text-trace-tool bg-transparent text-[10px]">
            TOOL
          </Badge>
          <span className="font-medium">{group.toolName}</span>
          <Badge variant="outline" className="text-[10px]">
            x{group.calls.length}
          </Badge>
        </span>
        <ChevronIcon open={open} />
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible border-x border-b border-border-subtle">
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
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[10px] hover:bg-muted">
        <span className="text-muted-foreground">Call #{index}</span>
        <ChevronIcon open={open} />
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible px-3 py-2">
        <div className="flex flex-col gap-2">
          <Streamdown plugins={{ code }}>{jsonMarkdown('Input', call.input)}</Streamdown>
          <Streamdown plugins={{ code }}>{jsonMarkdown('Result', call.result)}</Streamdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
