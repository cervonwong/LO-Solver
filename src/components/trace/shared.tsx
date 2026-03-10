'use client';

import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { LabeledList } from '@/components/labeled-list';
import { jsonMarkdown } from './trace-utils';

/** Font size class for all Streamdown instances in the trace panel. */
export const TRACE_SD_CLASS = 'text-[11px] leading-4 streamdown-compact';

export function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="16"
      viewBox="0 -960 960 960"
      width="16"
      fill="currentColor"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}${className ? ` ${className}` : ''}`}
    >
      <path d="M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z" />
    </svg>
  );
}

export function RawJsonToggle({
  data,
  children,
}: {
  data: { input: Record<string, unknown>; result: Record<string, unknown> };
  children: React.ReactNode;
}) {
  const [showRaw, setShowRaw] = useState(false);

  const handleToggleRaw = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRaw(!showRaw);
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggleRaw}
        className="absolute top-0 right-0 text-[10px] text-muted-foreground hover:text-foreground opacity-40 hover:opacity-100 transition-opacity px-1"
        title={showRaw ? 'Custom view' : 'Raw JSON'}
      >
        {'{...}'}
      </button>
      {showRaw ? (
        <div className="flex flex-col gap-2">
          {Object.keys(data.input).length > 0 && (
            <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>
              {jsonMarkdown('Input', data.input)}
            </Streamdown>
          )}
          <Streamdown className={TRACE_SD_CLASS} plugins={{ code }} controls={false}>
            {jsonMarkdown('Result', data.result)}
          </Streamdown>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function StructuredOutputSection({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border-subtle pt-2">
      <RawJsonToggle data={{ input: {}, result: data }}>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center gap-2 text-left">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              Structured Output
            </span>
            <ChevronIcon open={open} />
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-collapsible mt-1">
            <LabeledList data={data} />
          </CollapsibleContent>
        </Collapsible>
      </RawJsonToggle>
    </div>
  );
}
