'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { WorkflowTraceEvent, ToolCallEvent } from '@/lib/workflow-events';
import { formatDuration, getAgentSummary } from '@/lib/trace-utils';
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

/** Font size class for all Streamdown instances in the trace panel. */
const TRACE_SD_CLASS = 'text-[11px] leading-4 streamdown-compact';

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
              <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>{jsonMarkdown('Input', event.data.input)}</Streamdown>
              <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>
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
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center justify-between px-3 py-1.5 text-left text-[10px]">
        <span className="text-muted-foreground">Call #{index}</span>
        <ChevronIcon open={open} />
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible px-3 py-2">
        <div className="flex flex-col gap-2">
          <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>{jsonMarkdown('Input', call.input)}</Streamdown>
          <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>{jsonMarkdown('Result', call.result)}</Streamdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Raw JSON toggle — shows custom view or raw JSON for any tool call
// ---------------------------------------------------------------------------

function RawJsonToggle({
  data,
  children,
}: {
  data: { input: Record<string, unknown>; result: Record<string, unknown> };
  children: React.ReactNode;
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowRaw(!showRaw);
        }}
        className="absolute top-0 right-0 text-[10px] text-muted-foreground hover:text-foreground opacity-40 hover:opacity-100 transition-opacity px-1"
        title={showRaw ? 'Custom view' : 'Raw JSON'}
      >
        {'{...}'}
      </button>
      {showRaw ? (
        <div className="flex flex-col gap-2">
          <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>{jsonMarkdown('Input', data.input)}</Streamdown>
          <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>{jsonMarkdown('Result', data.result)}</Streamdown>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom tool renderers
// ---------------------------------------------------------------------------

// INERT: Tool-call events currently emit `input: { count }`, not the actual entries array.
// This card activates when events carry `input.entries` — see hasVocabularyEntries().
// To enable: change vocabulary-tools.ts tool-call events to include the entries data.
function VocabularyToolCard({
  toolCall,
}: {
  toolCall: {
    data: {
      toolName: string;
      input: Record<string, unknown>;
      result: Record<string, unknown>;
    };
  };
}) {
  const action = toolCall.data.toolName.replace('Vocabulary', '').toUpperCase();
  const entries = (toolCall.data.input.entries ?? toolCall.data.input.foreignForms ?? []) as Array<
    Record<string, unknown>
  >;
  const isUpdate = toolCall.data.toolName === 'updateVocabulary';
  const isRemove = toolCall.data.toolName === 'removeVocabulary';

  // For updates, try to extract previous values from result for diff display
  const previousEntries = isUpdate
    ? ((toolCall.data.result.previous ?? toolCall.data.result.previousEntries ?? []) as Array<
        Record<string, unknown>
      >)
    : [];

  return (
    <RawJsonToggle data={toolCall.data}>
      <div className="flex flex-col gap-0.5 text-[11px]">
        {entries.length <= 5 ? (
          entries.map((entry, i) => {
            const foreignForm = (entry.foreignForm ?? entry) as string;
            const meaning = entry.meaning as string | undefined;
            const type = entry.type as string | undefined;
            const prev = isUpdate && previousEntries[i] ? previousEntries[i] : undefined;
            const prevMeaning = prev?.meaning as string | undefined;
            const prevType = prev?.type as string | undefined;

            return (
              <div
                key={i}
                className={`flex items-center gap-2 ${isRemove ? 'line-through text-muted-foreground' : ''}`}
              >
                <Badge
                  variant="outline"
                  className={`text-[9px] shrink-0 ${
                    isRemove
                      ? 'border-status-error text-status-error'
                      : isUpdate
                        ? 'border-status-warning text-status-warning'
                        : 'border-status-success text-status-success'
                  } bg-transparent`}
                >
                  {action}
                </Badge>
                <span className="font-medium">{String(foreignForm)}</span>
                {isUpdate && prev ? (
                  <>
                    {prevMeaning && prevMeaning !== meaning && (
                      <span className="text-muted-foreground">
                        <span className="line-through opacity-60">{prevMeaning}</span>
                        {meaning && <span> &rarr; {meaning}</span>}
                      </span>
                    )}
                    {(!prevMeaning || prevMeaning === meaning) && meaning && (
                      <span className="text-muted-foreground">&rarr; {meaning}</span>
                    )}
                    {prevType && prevType !== type && (
                      <span className="text-muted-foreground">
                        [<span className="line-through opacity-60">{prevType}</span>
                        {type && <span> &rarr; {type}</span>}]
                      </span>
                    )}
                    {(!prevType || prevType === type) && type && (
                      <span className="text-muted-foreground">[{type}]</span>
                    )}
                  </>
                ) : (
                  <>
                    {meaning && <span className="text-muted-foreground">&rarr; {meaning}</span>}
                    {type && <span className="text-muted-foreground">[{type}]</span>}
                  </>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[9px] shrink-0 ${
                isRemove
                  ? 'border-status-error text-status-error'
                  : isUpdate
                    ? 'border-status-warning text-status-warning'
                    : 'border-status-success text-status-success'
              } bg-transparent`}
            >
              {action}
            </Badge>
            <span>{entries.length} entries</span>
          </div>
        )}
      </div>
    </RawJsonToggle>
  );
}

function SentenceTestToolCard({
  toolCall,
}: {
  toolCall: {
    data: {
      toolName: string;
      input: Record<string, unknown>;
      result: Record<string, unknown>;
    };
  };
}) {
  const [open, setOpen] = useState(false);
  const sentenceId = (toolCall.data.input.sentenceId ?? toolCall.data.input.id ?? '?') as string;
  const result = toolCall.data.result;
  const status = result.status as string | undefined;
  const passed = status === 'SENTENCE_OK' || status === 'PASS';
  const details = result.details as string | undefined;
  const expected = result.expected as string | undefined;
  const actual = result.actual as string | undefined;

  return (
    <RawJsonToggle data={toolCall.data}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center gap-2 py-0.5 text-left text-xs">
          <Badge
            variant="outline"
            className={`${passed ? 'border-status-success text-status-success' : 'border-status-error text-status-error'} bg-transparent text-[10px]`}
          >
            {passed ? 'PASS' : 'FAIL'}
          </Badge>
          <span className="flex-1 truncate">Sentence {sentenceId}</span>
          <ChevronIcon open={open} />
        </CollapsibleTrigger>
        <CollapsibleContent forceMount className="data-[state=closed]:hidden pl-6 pr-2 py-1 text-[11px] text-muted-foreground">
          {expected && (
            <p>
              <span className="font-medium">Expected:</span> {expected}
            </p>
          )}
          {actual && (
            <p>
              <span className="font-medium">Actual:</span> {actual}
            </p>
          )}
          {details && <p className="mt-1">{details}</p>}
        </CollapsibleContent>
      </Collapsible>
    </RawJsonToggle>
  );
}

// ---------------------------------------------------------------------------
// Bulk tool call grouping — groups 4+ consecutive same-type tool calls
// ---------------------------------------------------------------------------

function BulkToolCallGroup({
  toolName,
  toolCalls,
  depth,
}: {
  toolName: string;
  toolCalls: ToolCallEvent[];
  depth: number;
}) {
  const [open, setOpen] = useState(false);

  // Calculate pass/fail for test tools
  const isTest = isRuleTestTool(toolName) || isSentenceTestTool(toolName);
  let passCount = 0;
  let failCount = 0;
  if (isTest) {
    for (const tc of toolCalls) {
      const status = tc.data.result.status as string | undefined;
      if (status === 'RULE_OK' || status === 'SENTENCE_OK' || status === 'PASS') passCount++;
      else failCount++;
    }
  }

  const summaryText = isTest
    ? `${toolCalls.length}: ${passCount} pass, ${failCount} fail`
    : `${toolCalls.length} calls`;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center gap-2 py-0.5 text-left text-xs">
        <Badge
          variant="default"
          className="border-trace-tool text-trace-tool bg-transparent text-[10px]"
        >
          TOOL
        </Badge>
        <span className="font-medium">{toolName}</span>
        <span className="text-muted-foreground">({summaryText})</span>
        <ChevronIcon open={open} />
      </CollapsibleTrigger>
      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
        <div className="flex flex-col gap-0.5 pl-4">
          {toolCalls.map((tc, i) => (
            <ToolCallRenderer key={i} toolCall={tc} depth={depth + 1} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Tool call type detection and routing
// ---------------------------------------------------------------------------

function isRuleTestTool(toolName: string): boolean {
  return toolName === 'testRule' || toolName === 'testRuleWithRuleset';
}

function isSentenceTestTool(toolName: string): boolean {
  return toolName === 'testSentence' || toolName === 'testSentenceWithRuleset';
}

function hasVocabularyEntries(toolCall: ToolCallEvent): boolean {
  if (!['addVocabulary', 'updateVocabulary', 'removeVocabulary'].includes(toolCall.data.toolName)) {
    return false;
  }
  const entries = toolCall.data.input.entries ?? toolCall.data.input.foreignForms;
  return Array.isArray(entries) && entries.length > 0;
}

function isStartedStatus(result: Record<string, unknown>): boolean {
  return result.status === 'started';
}

function ToolCallRenderer({
  toolCall,
  depth,
}: {
  toolCall: ToolCallEvent;
  depth: number;
}) {
  // Skip intermediate "started" status events
  if (isStartedStatus(toolCall.data.result)) return null;

  if (isRuleTestTool(toolCall.data.toolName)) {
    return <RuleTestCard toolCall={toolCall} />;
  }

  if (isSentenceTestTool(toolCall.data.toolName)) {
    return <SentenceTestToolCard toolCall={toolCall} />;
  }

  if (hasVocabularyEntries(toolCall)) {
    return <VocabularyToolCard toolCall={toolCall} />;
  }

  // Default: generic tool call card with raw JSON toggle
  return <AgentToolCallCard toolCall={toolCall} />;
}

// ---------------------------------------------------------------------------
// Render items: build ordered list from children array with bulk grouping
// ---------------------------------------------------------------------------

type RenderItemType =
  | { kind: 'agent'; group: AgentGroup }
  | { kind: 'tool'; toolCall: ToolCallEvent }
  | { kind: 'bulk'; toolName: string; toolCalls: ToolCallEvent[] };

function buildRenderItems(
  children: Array<AgentGroup | ToolCallEvent>,
): RenderItemType[] {
  const items: RenderItemType[] = [];
  let i = 0;

  while (i < children.length) {
    const child = children[i]!;

    if ('type' in child && child.type === 'agent-group') {
      items.push({ kind: 'agent', group: child as AgentGroup });
      i++;
      continue;
    }

    // It's a tool call -- check for consecutive same-type calls
    const tc = child as ToolCallEvent;
    if (isStartedStatus(tc.data.result)) {
      i++;
      continue;
    }

    // Look ahead for consecutive same-tool calls
    const sameToolCalls: ToolCallEvent[] = [tc];
    let j = i + 1;
    while (j < children.length) {
      const next = children[j]!;
      if ('type' in next && next.type === 'agent-group') break;
      const nextTc = next as ToolCallEvent;
      if (isStartedStatus(nextTc.data.result)) {
        j++;
        continue;
      }
      if (nextTc.data.toolName !== tc.data.toolName) break;
      sameToolCalls.push(nextTc);
      j++;
    }

    if (sameToolCalls.length >= 4) {
      items.push({ kind: 'bulk', toolName: tc.data.toolName, toolCalls: sameToolCalls });
    } else {
      for (const call of sameToolCalls) {
        items.push({ kind: 'tool', toolCall: call });
      }
    }
    i = j;
  }

  return items;
}

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

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={`hover-hatch-cyan animate-fade-in border-l-2 border-l-trace-agent flex w-full items-center justify-between border border-border-subtle bg-surface-2 px-3 py-1.5 text-left text-xs ${indentClass}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Image src="/lex-mascot.png" alt="" width={16} height={16} className="shrink-0" />
          <span className="font-medium truncate">{agentStart.data.agentName}</span>
          <span className="text-muted-foreground shrink-0">({agentStart.data.model})</span>
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
      <CollapsibleContent
        className={`animate-collapsible border-x border-b border-border-subtle bg-surface-2 ${indentClass}`}
      >
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
                <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>{agentEnd.data.reasoning}</Streamdown>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Individual tool call cards (used by ToolCallRenderer)
// ---------------------------------------------------------------------------

function RuleTestCard({
  toolCall,
}: {
  toolCall: {
    data: { input: Record<string, unknown>; result: Record<string, unknown> };
  };
}) {
  const [open, setOpen] = useState(false);
  const title = (toolCall.data.input.title as string) || 'Unknown rule';
  const result = toolCall.data.result;
  const status = result.status as string | undefined;
  const passed = status === 'RULE_OK';
  const reasoning = result.reasoning as string | undefined;
  const recommendation = result.recommendation as string | undefined;

  return (
    <RawJsonToggle data={toolCall.data}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center gap-2 py-0.5 text-left text-xs">
          <Badge
            variant="outline"
            className={`${passed ? 'border-status-success text-status-success' : 'border-status-error text-status-error'} bg-transparent text-[10px]`}
          >
            {passed ? 'PASS' : 'FAIL'}
          </Badge>
          <span className="flex-1 truncate">{title}</span>
          <ChevronIcon open={open} />
        </CollapsibleTrigger>
        <CollapsibleContent forceMount className="data-[state=closed]:hidden pl-6 pr-2 py-1 text-[11px] text-muted-foreground">
          {reasoning && <p>{reasoning}</p>}
          {recommendation && <p className="mt-1 italic">{recommendation}</p>}
        </CollapsibleContent>
      </Collapsible>
    </RawJsonToggle>
  );
}

function AgentToolCallCard({
  toolCall,
}: {
  toolCall: {
    data: {
      toolName: string;
      input: Record<string, unknown>;
      result: Record<string, unknown>;
    };
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <RawJsonToggle data={toolCall.data}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center gap-2 py-0.5 text-left text-xs">
          <Badge
            variant="default"
            className="border-trace-tool text-trace-tool bg-transparent text-[10px]"
          >
            TOOL
          </Badge>
          <span className="font-medium">{toolCall.data.toolName}</span>
          <ChevronIcon open={open} />
        </CollapsibleTrigger>
        <CollapsibleContent forceMount className="data-[state=closed]:hidden pl-6 pr-2 py-1">
          <div className="flex flex-col gap-2">
            <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>{jsonMarkdown('Input', toolCall.data.input)}</Streamdown>
            <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>
              {jsonMarkdown('Result', toolCall.data.result)}
            </Streamdown>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </RawJsonToggle>
  );
}
