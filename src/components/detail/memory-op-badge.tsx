'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MemoryOpBadgeProps {
  action: 'add' | 'update' | 'remove' | 'clear';
  entries: Array<{ foreignForm: string; meaning: string; type: string }>;
}

const actionStyles: Record<MemoryOpBadgeProps['action'], string> = {
  add: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  update: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  remove: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  clear: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
};

const actionPrefix: Record<MemoryOpBadgeProps['action'], string> = {
  add: '+',
  update: '~',
  remove: '-',
  clear: '\u2298',
};

export function MemoryOpBadge({ action, entries }: MemoryOpBadgeProps) {
  if (action === 'clear') {
    return (
      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', actionStyles[action])}>
        {actionPrefix[action]} cleared
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((entry, i) => (
        <Badge
          key={`${entry.foreignForm}-${i}`}
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0', actionStyles[action])}
        >
          {actionPrefix[action]}{' '}
          {action === 'remove'
            ? entry.foreignForm
            : `${entry.foreignForm} \u2192 ${entry.meaning} (${entry.type})`}
        </Badge>
      ))}
    </div>
  );
}
