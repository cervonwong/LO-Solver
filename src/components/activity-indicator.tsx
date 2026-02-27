'use client';

import { useEffect, useState } from 'react';
import type { WorkflowTraceEvent } from '@/lib/workflow-events';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
      <div className="frosted flex items-center gap-2 border border-border px-4 py-2">
        <span className="text-sm text-foreground">&gt;</span>
        <span className="text-xs uppercase tracking-wider text-foreground">Complete</span>
        {totalMs > 0 && (
          <span className="ml-auto text-xs text-accent">
            T+{formatElapsed(Math.round(totalMs / 1000))}
          </span>
        )}
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
    <div className="frosted flex items-center gap-2 border border-border px-4 py-2">
      <span className="animate-blink text-sm text-accent">&gt;</span>
      <span className="text-xs uppercase tracking-wider text-accent">
        ACTIVE: {agentName ?? 'Starting...'}
      </span>
      {model && <span className="text-xs text-muted-foreground">{model}</span>}
      <span className="ml-auto text-xs tabular-nums text-accent">T+{formatElapsed(elapsed)}</span>
    </div>
  );
}
