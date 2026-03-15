'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LabeledList } from '@/components/labeled-list';
import type { ToolCallEvent } from '@/lib/workflow-events';
import { ChevronIcon, RawJsonToggle } from './shared';
import {
  isRuleTestTool,
  isSentenceTestTool,
  isStartedStatus,
  hasVocabularyEntries,
  hasRulesEntries,
} from './trace-utils';

interface VocabularyToolCardProps {
  toolCall: {
    data: {
      toolName: string;
      input: Record<string, unknown>;
      result: Record<string, unknown>;
    };
  };
}

function VocabularyToolCard({ toolCall }: VocabularyToolCardProps) {
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

interface RulesToolCardProps {
  toolCall: {
    data: {
      toolName: string;
      input: Record<string, unknown>;
      result: Record<string, unknown>;
    };
  };
}

function RulesToolCard({ toolCall }: RulesToolCardProps) {
  const action = toolCall.data.toolName.replace('Rules', '').toUpperCase();
  const entries = (toolCall.data.input.entries ?? toolCall.data.input.titles ?? []) as Array<
    Record<string, unknown> | string
  >;
  const isUpdate = toolCall.data.toolName === 'updateRules';
  const isRemove = toolCall.data.toolName === 'removeRules';

  return (
    <RawJsonToggle data={toolCall.data}>
      <div className="flex flex-col gap-0.5 text-[11px]">
        {entries.length <= 5 ? (
          entries.map((entry, i) => {
            const title = typeof entry === 'string' ? entry : (entry.title as string);
            const description =
              typeof entry === 'string' ? undefined : (entry.description as string | undefined);
            const truncatedDesc =
              description && description.length > 80
                ? description.slice(0, 80) + '...'
                : description;

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
                <span className="font-medium">{title}</span>
                {truncatedDesc && (
                  <span className="text-muted-foreground truncate">{truncatedDesc}</span>
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

interface SentenceTestToolCardProps {
  toolCall: {
    data: {
      toolName: string;
      input: Record<string, unknown>;
      result: Record<string, unknown>;
    };
  };
}

function SentenceTestToolCard({ toolCall }: SentenceTestToolCardProps) {
  const [open, setOpen] = useState(false);
  const sentenceId = (toolCall.data.input.sentenceId ?? toolCall.data.input.id ?? '?') as string;
  const sentenceContent = toolCall.data.input.content as string | undefined;
  const result = toolCall.data.result;
  const isError = result.success === false;
  const passed = (result.passed as boolean | undefined) ?? false;
  const translation = result.translation as string | undefined;
  const expectedTranslation = result.expectedTranslation as string | undefined;
  const matchesExpected = result.matchesExpected as boolean | null | undefined;
  const reasoning = result.reasoning as string | undefined;
  const errorMsg = result.error as string | undefined;

  const badgeClass = isError
    ? 'border-status-error text-status-error'
    : passed
      ? 'border-status-success text-status-success'
      : 'border-status-error text-status-error';
  const badgeLabel = isError ? 'ERROR' : passed ? 'PASS' : 'FAIL';

  return (
    <RawJsonToggle data={toolCall.data}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center gap-2 py-0.5 text-left text-xs">
          <Badge
            variant="outline"
            className={`${badgeClass} bg-transparent text-[10px]`}
          >
            {badgeLabel}
          </Badge>
          <span className="flex-1 truncate">
            Sentence {sentenceId}
            {sentenceContent && (
              <span className="ml-1 text-muted-foreground text-[11px]">
                &mdash; {sentenceContent}
              </span>
            )}
          </span>
          {matchesExpected === false && !isError && (
            <Badge
              variant="outline"
              className="border-status-warning text-status-warning bg-transparent text-[10px]"
            >
              MISMATCH
            </Badge>
          )}
          <ChevronIcon open={open} />
        </CollapsibleTrigger>
        <CollapsibleContent
          forceMount
          className="data-[state=closed]:hidden pl-6 pr-2 py-1 text-[11px] text-muted-foreground"
        >
          {isError ? (
            <p className="text-status-error">{errorMsg ?? 'Unknown error'}</p>
          ) : (
            <>
              {translation && (
                <p>
                  <span className="font-medium">Translation:</span> {translation}
                </p>
              )}
              {expectedTranslation && (
                <p>
                  <span className="font-medium">Expected:</span> {expectedTranslation}
                </p>
              )}
              {matchesExpected != null && (
                <p>
                  <span className="font-medium">Match:</span>{' '}
                  <span
                    className={
                      matchesExpected ? 'text-status-success' : 'text-status-error'
                    }
                  >
                    {matchesExpected ? 'Yes' : 'No'}
                  </span>
                </p>
              )}
              {reasoning && <p className="mt-1">{reasoning}</p>}
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </RawJsonToggle>
  );
}

interface BulkToolCallGroupProps {
  toolName: string;
  toolCalls: ToolCallEvent[];
  depth: number;
}

export function BulkToolCallGroup({ toolName, toolCalls, depth }: BulkToolCallGroupProps) {
  const [open, setOpen] = useState(false);

  // Calculate pass/fail for test tools
  const isTest = isRuleTestTool(toolName) || isSentenceTestTool(toolName);
  let passCount = 0;
  let failCount = 0;
  if (isTest) {
    for (const tc of toolCalls) {
      if (tc.data.result.passed) passCount++;
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

interface RuleTestCardProps {
  toolCall: {
    data: { input: Record<string, unknown>; result: Record<string, unknown> };
  };
}

function RuleTestCard({ toolCall }: RuleTestCardProps) {
  const [open, setOpen] = useState(false);
  const title = (toolCall.data.input.title as string) || 'Unknown rule';
  const result = toolCall.data.result;
  const passed = (result.passed as boolean | undefined) ?? false;
  const reasoning = result.reasoning as string | undefined;

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
        <CollapsibleContent
          forceMount
          className="data-[state=closed]:hidden pl-6 pr-2 py-1 text-[11px] text-muted-foreground"
        >
          {reasoning && <p>{reasoning}</p>}
        </CollapsibleContent>
      </Collapsible>
    </RawJsonToggle>
  );
}

// ---------------------------------------------------------------------------
// ToolCallRenderer — routes tool calls to specialized or generic renderers
// ---------------------------------------------------------------------------

// Lives in this file (rather than tool-call-cards.tsx) to avoid circular
// dependencies: BulkToolCallGroup calls ToolCallRenderer, and ToolCallRenderer
// calls the specialized card components above.

interface ToolCallRendererProps {
  toolCall: ToolCallEvent;
  depth: number;
}

export function ToolCallRenderer({ toolCall, depth }: ToolCallRendererProps) {
  // Skip intermediate "started" status events
  if (isStartedStatus(toolCall.data.result)) return null;

  if (isRuleTestTool(toolCall.data.toolName)) {
    return <RuleTestCard toolCall={toolCall} />;
  }

  if (isSentenceTestTool(toolCall.data.toolName)) {
    return <SentenceTestToolCard toolCall={toolCall} />;
  }

  if (hasRulesEntries(toolCall)) {
    return <RulesToolCard toolCall={toolCall} />;
  }

  if (hasVocabularyEntries(toolCall)) {
    return <VocabularyToolCard toolCall={toolCall} />;
  }

  // Default: generic tool call card with raw JSON toggle
  return <AgentToolCallCard toolCall={toolCall} />;
}

// ---------------------------------------------------------------------------
// AgentToolCallCard — generic fallback for tool calls without specialized UI
// ---------------------------------------------------------------------------

interface AgentToolCallCardProps {
  toolCall: {
    data: {
      toolName: string;
      input: Record<string, unknown>;
      result: Record<string, unknown>;
    };
  };
}

function AgentToolCallCard({ toolCall }: AgentToolCallCardProps) {
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
            <LabeledList data={toolCall.data.input} label="Input" />
            <LabeledList data={toolCall.data.result} label="Result" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </RawJsonToggle>
  );
}
