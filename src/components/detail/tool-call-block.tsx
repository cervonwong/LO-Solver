'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatTimestamp } from './feed-utils';

export interface ToolCallBlockProps {
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  timestamp: string;
}

export function ToolCallBlock({ toolName, input, output, success, timestamp }: ToolCallBlockProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'rounded border',
          success ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-red-500',
          'border-t-border border-r-border border-b-border',
        )}
      >
        <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-2 py-1 text-left hover:bg-muted/50 transition-colors">
          <ChevronRight
            className={cn('h-3 w-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
          />
          <span className="text-xs font-medium truncate">{toolName}</span>
          <Badge
            variant={success ? 'secondary' : 'destructive'}
            className="text-[10px] px-1 py-0 ml-auto"
          >
            {success ? 'ok' : 'fail'}
          </Badge>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatTimestamp(timestamp)}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-2 py-1.5 space-y-1.5">
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Input</span>
              <pre className="mt-0.5 overflow-x-auto rounded bg-muted/50 px-2 py-1 text-[10px] font-mono leading-tight">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Output
              </span>
              <pre className="mt-0.5 overflow-x-auto rounded bg-muted/50 px-2 py-1 text-[10px] font-mono leading-tight">
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
