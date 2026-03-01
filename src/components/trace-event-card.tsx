'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';
import { formatDuration } from '@/lib/trace-utils';
import type { ToolCallGroup, AgentGroup } from '@/lib/trace-utils';
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
    case 'data-agent-end':
      // These are now handled by AgentCard via groupEventsWithAgents.
      // Fallback rendering for un-grouped events (shouldn't normally appear).
      return null;

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

// ---------------------------------------------------------------------------
// AgentCard — merged rendering of agent-start + tool calls + agent-end
// ---------------------------------------------------------------------------

interface AgentCardProps {
  group: AgentGroup;
}

function isRuleTestTool(toolName: string): boolean {
  return toolName === 'testRule' || toolName === 'testRuleWithRuleset';
}

function isStartedStatus(result: Record<string, unknown>): boolean {
  return result.status === 'started';
}

export function AgentCard({ group }: AgentCardProps) {
  const [open, setOpen] = useState(false);
  const { agentStart, agentEnd, toolCalls, isActive } = group;
  const durationMs = agentEnd?.data.durationMs;

  // Split tool calls: skip intermediate "started" events for rule tests
  const displayToolCalls = toolCalls.filter((tc) => !isStartedStatus(tc.data.result));

  // Separate rule test calls from other calls
  const ruleTestCalls = displayToolCalls.filter((tc) => isRuleTestTool(tc.data.toolName));
  const otherToolCalls = displayToolCalls.filter((tc) => !isRuleTestTool(tc.data.toolName));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="animate-fade-in border-l-2 border-l-trace-agent flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs hover:bg-surface-3">
        <span className="flex items-center gap-2">
          <Image src="/lex-mascot.png" alt="" width={16} height={16} className="shrink-0" />
          <span className="font-medium">{agentStart.data.agentName}</span>
          <span className="text-muted-foreground">({agentStart.data.model})</span>
          {isActive && (
            <Image
              src="/lex-mascot.png"
              alt=""
              width={12}
              height={12}
              className="animate-spin-duck shrink-0"
            />
          )}
          {agentEnd && !isActive && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="14"
              viewBox="0 -960 960 960"
              width="14"
              fill="currentColor"
              className="shrink-0 text-accent"
            >
              <path d="M382-267.69 183.23-466.46 211.77-495 382-324.77 748.23-691l28.54 28.54L382-267.69Z" />
            </svg>
          )}
          {agentEnd && agentEnd.data.totalAttempts > 1 && (
            <Badge variant="outline" className="text-[10px]">
              Attempt {agentEnd.data.attempt}/{agentEnd.data.totalAttempts}
            </Badge>
          )}
        </span>
        <span className="flex items-center gap-2">
          {durationMs !== undefined && (
            <span className="text-muted-foreground">{formatDuration(durationMs)}</span>
          )}
          <ChevronIcon open={open} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible border-x border-b border-border-subtle bg-surface-2">
        <div className="flex flex-col gap-2 px-3 py-2">
          {/* Task description */}
          <div className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Task: </span>
            {agentStart.data.task}
          </div>

          {/* Rule test results */}
          {ruleTestCalls.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Rule Tests ({ruleTestCalls.length})
              </span>
              {ruleTestCalls.map((tc, i) => (
                <RuleTestCard key={i} toolCall={tc} />
              ))}
            </div>
          )}

          {/* Other tool calls */}
          {otherToolCalls.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Tool Calls ({otherToolCalls.length})
              </span>
              {otherToolCalls.map((tc, i) => (
                <AgentToolCallCard key={i} toolCall={tc} />
              ))}
            </div>
          )}

          {/* Agent reasoning */}
          {agentEnd?.data.reasoning && (
            <div className="border-t border-border-subtle pt-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Reasoning
              </span>
              <div className="mt-1">
                <Streamdown plugins={{ code }}>{agentEnd.data.reasoning}</Streamdown>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RuleTestCard({
  toolCall,
}: {
  toolCall: { data: { input: Record<string, unknown>; result: Record<string, unknown> } };
}) {
  const [open, setOpen] = useState(false);
  const title = (toolCall.data.input.title as string) || 'Unknown rule';
  const result = toolCall.data.result;
  const status = result.status as string | undefined;
  const passed = status === 'RULE_OK';
  const reasoning = result.reasoning as string | undefined;
  const recommendation = result.recommendation as string | undefined;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-0.5 text-left text-xs hover:bg-surface-3">
        <Badge
          variant="outline"
          className={`${passed ? 'border-status-success text-status-success' : 'border-status-error text-status-error'} bg-transparent text-[10px]`}
        >
          {passed ? 'PASS' : 'FAIL'}
        </Badge>
        <span className="flex-1 truncate">{title}</span>
        <ChevronIcon open={open} />
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible pl-6 pr-2 py-1 text-[11px] text-muted-foreground">
        {reasoning && <p>{reasoning}</p>}
        {recommendation && <p className="mt-1 italic">{recommendation}</p>}
      </CollapsibleContent>
    </Collapsible>
  );
}

function AgentToolCallCard({
  toolCall,
}: {
  toolCall: { data: { toolName: string; input: Record<string, unknown>; result: Record<string, unknown> } };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-0.5 text-left text-xs hover:bg-surface-3">
        <Badge variant="default" className="border-trace-tool text-trace-tool bg-transparent text-[10px]">
          TOOL
        </Badge>
        <span className="font-medium">{toolCall.data.toolName}</span>
        <ChevronIcon open={open} />
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible pl-6 pr-2 py-1">
        <div className="flex flex-col gap-2">
          <Streamdown plugins={{ code }}>
            {jsonMarkdown('Input', toolCall.data.input)}
          </Streamdown>
          <Streamdown plugins={{ code }}>
            {jsonMarkdown('Result', toolCall.data.result)}
          </Streamdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
