'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

interface ActivityIndicatorProps {
  events: WorkflowTraceEvent[];
  isRunning: boolean;
}

export function ActivityIndicator({ events, isRunning }: ActivityIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  // Find the most recent agent or tool event to show what's active
  const latestActivity = [...events]
    .reverse()
    .find((e) => e.type === 'data-agent-reasoning' || e.type === 'data-tool-call');

  // Timer: count seconds since the latest activity started
  useEffect(() => {
    if (!isRunning) return;
    setElapsed(0);
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, latestActivity]);

  if (!isRunning && events.length > 0) {
    // Completed state
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const totalMs =
      firstEvent && lastEvent && 'timestamp' in firstEvent.data && 'timestamp' in lastEvent.data
        ? (lastEvent.data as unknown as { timestamp: number }).timestamp -
          (firstEvent.data as unknown as { timestamp: number }).timestamp
        : 0;

    return (
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="h-2 w-2 rounded-full bg-status-success" />
        <span className="text-sm text-muted-foreground">
          Completed {totalMs > 0 ? `in ${Math.round(totalMs / 1000)}s` : ''}
        </span>
      </div>
    );
  }

  if (!isRunning) return null;

  const agentName =
    latestActivity?.type === 'data-agent-reasoning'
      ? (latestActivity.data as { agentName?: string }).agentName
      : latestActivity?.type === 'data-tool-call'
        ? (latestActivity.data as { toolName?: string }).toolName
        : null;

  const model =
    latestActivity?.type === 'data-agent-reasoning'
      ? (latestActivity.data as { model?: string }).model
      : null;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-status-active-muted px-4 py-2">
      <span className="h-2 w-2 animate-pulse rounded-full bg-status-active" />
      <span className="text-sm font-medium">{agentName ?? 'Starting...'}</span>
      {model && <span className="text-xs text-muted-foreground">{model}</span>}
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{elapsed}s</span>
    </div>
  );
}
