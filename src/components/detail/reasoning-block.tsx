'use client';

import ReactMarkdown from 'react-markdown';
import { formatTimestamp } from './feed-utils';

export interface ReasoningBlockProps {
  reasoning: string;
  timestamp: string;
}

export function ReasoningBlock({ reasoning, timestamp }: ReasoningBlockProps) {
  return (
    <div className="space-y-1">
      <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed">
        <ReactMarkdown>{reasoning}</ReactMarkdown>
      </div>
      <span className="block text-[10px] text-muted-foreground">{formatTimestamp(timestamp)}</span>
    </div>
  );
}
