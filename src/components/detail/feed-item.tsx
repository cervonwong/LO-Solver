'use client';

import type { ReactNode } from 'react';
import { Brain, Wrench, BookOpen, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimestamp } from './feed-utils';

export interface FeedItemProps {
  timestamp: string;
  type: 'reasoning' | 'tool-call' | 'vocabulary' | 'iteration';
  children: ReactNode;
}

const iconMap = {
  reasoning: Brain,
  'tool-call': Wrench,
  vocabulary: BookOpen,
  iteration: Repeat,
} as const;

const iconColorMap = {
  reasoning: 'text-blue-500',
  'tool-call': 'text-orange-500',
  vocabulary: 'text-purple-500',
  iteration: 'text-cyan-500',
} as const;

export function FeedItem({ timestamp, type, children }: FeedItemProps) {
  const Icon = iconMap[type];

  return (
    <div className="flex gap-2 py-1.5">
      {/* Timestamp */}
      <span className="shrink-0 w-14 text-[10px] text-muted-foreground leading-4 pt-0.5 text-right font-mono">
        {formatTimestamp(timestamp)}
      </span>

      {/* Icon */}
      <div className="shrink-0 pt-0.5">
        <Icon className={cn('h-3.5 w-3.5', iconColorMap[type])} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
