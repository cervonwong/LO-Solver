'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export interface ActivityEvent {
  label: string;
  variant: 'add' | 'update' | 'remove' | 'clear';
  timestamp: number;
}

interface RollingActivityChipsProps {
  events: ActivityEvent[];
  maxVisible?: number;
}

const CHIP_TTL_MS = 8000;

const VARIANT_CLASSES: Record<ActivityEvent['variant'], string> = {
  add: 'border-foreground text-foreground',
  update: 'border-status-warning text-status-warning',
  remove: 'border-destructive text-destructive',
  clear: 'border-destructive text-destructive',
};

export function RollingActivityChips({ events, maxVisible = 3 }: RollingActivityChipsProps) {
  const [visibleEvents, setVisibleEvents] = useState<ActivityEvent[]>([]);

  // Keep visible events in sync with incoming events, applying max-visible limit
  useEffect(() => {
    const now = Date.now();
    const fresh = events.filter((e) => now - e.timestamp < CHIP_TTL_MS);
    setVisibleEvents(fresh.slice(-maxVisible));
  }, [events, maxVisible]);

  // Auto-expire stale chips
  useEffect(() => {
    if (visibleEvents.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setVisibleEvents((prev) => {
        const filtered = prev.filter((e) => now - e.timestamp < CHIP_TTL_MS);
        if (filtered.length === prev.length) return prev;
        return filtered;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visibleEvents.length]);

  if (visibleEvents.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {visibleEvents.map((event) => (
        <Badge
          key={`${event.variant}-${event.timestamp}`}
          variant="outline"
          className={`animate-chip-in text-xs ${VARIANT_CLASSES[event.variant]}`}
        >
          {event.label}
        </Badge>
      ))}
    </div>
  );
}
