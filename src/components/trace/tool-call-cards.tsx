'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { LabeledList } from '@/components/labeled-list';
import type { AgentGroup } from '@/lib/trace-utils';
import { formatDuration, getAgentSummary } from '@/lib/trace-utils';
import { getAgentRole } from '@/lib/agent-roles';
import { ChevronIcon, RawJsonToggle, StructuredOutputSection, TRACE_SD_CLASS } from './shared';
import { isStartedStatus, buildRenderItems } from './trace-utils';
import type { RenderItemType } from './trace-utils';
import { ToolCallRenderer, BulkToolCallGroup } from './specialized-tools';
import type { ToolCallGroup } from '@/lib/trace-utils';

interface ToolCallGroupCardProps {
  group: ToolCallGroup;
}

export function ToolCallGroupCard({ group }: ToolCallGroupCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="hover-hatch-cyan animate-fade-in border-l-2 border-l-trace-tool flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs">
        <span className="flex items-center gap-2">
          <Badge
            variant="default"
            className="border-trace-tool text-trace-tool bg-transparent text-[10px]"
          >
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
    <RawJsonToggle data={{ input: call.input, result: call.result }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center justify-between px-3 py-1.5 text-left text-[10px]">
          <span className="text-muted-foreground">Call #{index}</span>
          <ChevronIcon open={open} />
        </CollapsibleTrigger>
        <CollapsibleContent className="animate-collapsible px-3 py-2">
          <div className="flex flex-col gap-2">
            <LabeledList data={call.input} label="Input" />
            <LabeledList data={call.result} label="Result" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </RawJsonToggle>
  );
}

// ---------------------------------------------------------------------------
// Render items: ordered list from children array with bulk grouping
// ---------------------------------------------------------------------------

function RenderItem({ item, depth }: { item: RenderItemType; depth: number }) {
  switch (item.kind) {
    case 'agent':
      return <AgentCard group={item.group} depth={depth + 1} />;
    case 'tool':
      return <ToolCallRenderer toolCall={item.toolCall} depth={depth + 1} />;
    case 'bulk':
      return (
        <BulkToolCallGroup toolName={item.toolName} toolCalls={item.toolCalls} depth={depth + 1} />
      );
  }
}

// ---------------------------------------------------------------------------
// Depth indent lookup (Tailwind does not support dynamic class values)
// ---------------------------------------------------------------------------

const DEPTH_INDENT: Record<number, string> = {
  0: '',
  1: 'ml-4',
  2: 'ml-8',
  3: 'ml-12',
};

function getIndentClass(depth: number): string {
  if (depth <= 0) return '';
  return DEPTH_INDENT[Math.min(depth, 3)] ?? 'ml-12';
}

// ---------------------------------------------------------------------------
// AgentCard — hierarchical rendering of agent-start + children + agent-end
// ---------------------------------------------------------------------------

export function AgentCard({ group, depth = 0 }: { group: AgentGroup; depth?: number }) {
  const [open, setOpen] = useState(group.isActive);
  const { agentStart, agentEnd, children, toolCalls, isActive } = group;
  const durationMs = agentEnd?.data.durationMs;
  const summary = !isActive ? getAgentSummary(group) : undefined;

  // Count displayable tool calls (excluding "started" intermediates)
  const displayToolCount = toolCalls.filter((tc) => !isStartedStatus(tc.data.result)).length;

  // Build renderable children: group consecutive same-type tool calls for bulk display
  const renderItems = buildRenderItems(children);

  const indentClass = getIndentClass(depth);

  // Role-based duck mascot
  const role = getAgentRole(agentStart.data.agentName);
  const isComplete = !!agentEnd && !isActive;
  const duckSrc = isComplete ? '/lex-happy.png' : '/lex-thinking.png';
  const duckSize = open ? 44 : 20;

  return (
    <div className={`relative ${indentClass}`} style={{ overflow: 'visible' }}>
      {/* Duck mascot — absolute positioned, overflows top-left when expanded */}
      <div
        className="animate-duck-pop-in absolute z-10"
        style={{
          top: open ? '-10px' : '4px',
          left: open ? '-12px' : '8px',
          transition: 'top 200ms ease, left 200ms ease',
        }}
      >
        {/* Animation wrapper — bob/pop applied here so tint overlay moves in sync */}
        <div
          className={`relative ${isActive ? 'animate-duck-bob' : ''} ${isComplete ? 'animate-duck-complete-pop' : ''}`}
          style={{
            width: duckSize,
            height: duckSize,
            transition: 'width 200ms ease, height 200ms ease',
          }}
        >
          <Image
            src={duckSrc}
            alt=""
            width={duckSize}
            height={duckSize}
            style={{
              width: duckSize,
              height: duckSize,
              transition: 'width 200ms ease, height 200ms ease',
            }}
          />
          {/* Color tint overlay — masked to duck silhouette */}
          <div
            className="duck-tint"
            style={{
              backgroundColor: role.color,
              maskImage: `url(${duckSrc})`,
              WebkitMaskImage: `url(${duckSrc})`,
            }}
          />
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className={`hover-hatch-cyan animate-fade-in border-l-2 ${role.borderClass} flex w-full items-center justify-between border border-border-subtle bg-surface-2 text-left text-xs`}
          style={{
            paddingLeft: open ? '36px' : '32px',
            paddingRight: '12px',
            paddingTop: '6px',
            paddingBottom: '6px',
            transition: 'padding-left 200ms ease',
          }}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{agentStart.data.agentName}</span>
            <span className="text-muted-foreground shrink-0">({agentStart.data.model})</span>
            {isActive && <span className="animate-blink text-accent text-[10px]">●</span>}
            {isComplete && (
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
            {!open && displayToolCount > 0 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {displayToolCount} tool calls
              </Badge>
            )}
            {!open && summary && (
              <span className="text-[10px] text-muted-foreground truncate">{summary}</span>
            )}
          </span>
          <span className="flex items-center gap-2 shrink-0">
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

            {/* Render children (interleaved tool calls, bulk groups, sub-agents) */}
            {renderItems.map((item, i) => (
              <RenderItem key={i} item={item} depth={depth} />
            ))}

            {/* Agent reasoning */}
            {agentEnd?.data.reasoning && (
              <div className="border-t border-border-subtle pt-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  Reasoning
                </span>
                <div className="reasoning-compact mt-1">
                  <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>
                    {agentEnd.data.reasoning}
                  </Streamdown>
                </div>
              </div>
            )}

            {/* Agent structured output */}
            {agentEnd?.data.structuredOutput &&
              Object.keys(agentEnd.data.structuredOutput).length > 0 && (
                <StructuredOutputSection data={agentEnd.data.structuredOutput} />
              )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
