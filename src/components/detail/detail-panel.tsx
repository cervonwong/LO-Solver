'use client';

import { useRef, useEffect } from 'react';
import { useWorkflowStore } from '@/lib/workflow-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AgentHeader } from './agent-header';
import { ReasoningBlock } from './reasoning-block';
import { ToolCallBlock } from './tool-call-block';
import { MemoryOpBadge } from './memory-op-badge';
import { FeedItem } from './feed-item';
import { getAgentFeedItems } from './feed-utils';
import type { FeedItemData } from './feed-utils';

/** Derive agent metadata from events for the header */
function useAgentMeta(agentId: string) {
  const events = useWorkflowStore((s) => s.events);

  let agentName = agentId;
  let model = '';
  let stepId = '';
  let status: 'running' | 'completed' = 'running';
  let durationMs: number | undefined;

  for (const ev of events) {
    if (ev.type === 'data-agent-start' && ev.data.agentId === agentId) {
      agentName = ev.data.agentName;
      model = ev.data.model;
      stepId = ev.data.stepId;
      status = 'running';
      durationMs = undefined;
    }
    if (ev.type === 'data-agent-complete' && ev.data.agentId === agentId) {
      agentName = ev.data.agentName;
      model = ev.data.model;
      stepId = ev.data.stepId;
      status = 'completed';
      durationMs = ev.data.durationMs;
    }
  }

  return { agentName, model, stepId, status, durationMs };
}

function FeedItemTimestamp(item: FeedItemData): string {
  return item.event.data.timestamp;
}

function FeedContent({ item }: { item: FeedItemData }) {
  switch (item.type) {
    case 'reasoning':
      return (
        <ReasoningBlock
          reasoning={item.event.data.reasoning}
          timestamp={item.event.data.timestamp}
        />
      );
    case 'tool-call':
      return (
        <ToolCallBlock
          toolName={item.event.data.toolName}
          input={item.event.data.input}
          output={item.event.data.output}
          success={item.event.data.success}
          timestamp={item.event.data.timestamp}
        />
      );
    case 'vocabulary':
      return (
        <MemoryOpBadge action={item.event.data.action} entries={item.event.data.entries} />
      );
    case 'iteration':
      return (
        <div className="space-y-0.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Iteration {item.event.data.iteration}/{item.event.data.maxIterations}
          </Badge>
          {item.event.data.conclusion && (
            <p className="text-xs text-muted-foreground">{item.event.data.conclusion}</p>
          )}
        </div>
      );
  }
}

export function DetailPanel() {
  const selectedAgentId = useWorkflowStore((s) => s.selectedAgentId);
  const events = useWorkflowStore((s) => s.events);
  const setSelectedAgent = useWorkflowStore((s) => s.setSelectedAgent);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const feedItems = selectedAgentId ? getAgentFeedItems(events, selectedAgentId) : [];

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedItems.length]);

  if (!selectedAgentId) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Select an agent node to view its activity
        </p>
      </div>
    );
  }

  return <DetailPanelContent agentId={selectedAgentId} onClose={() => setSelectedAgent(null)} />;
}

function DetailPanelContent({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const events = useWorkflowStore((s) => s.events);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const meta = useAgentMeta(agentId);
  const feedItems = getAgentFeedItems(events, agentId);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedItems.length]);

  return (
    <div className="flex h-full flex-col">
      <AgentHeader
        agentName={meta.agentName}
        model={meta.model}
        stepId={meta.stepId}
        status={meta.status}
        durationMs={meta.durationMs}
        onClose={onClose}
      />

      <ScrollArea className="flex-1">
        <div className="px-2 py-1">
          {feedItems.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Waiting for agent activity...
            </p>
          )}
          {feedItems.map((item, i) => (
            <FeedItem key={i} timestamp={FeedItemTimestamp(item)} type={item.type}>
              <FeedContent item={item} />
            </FeedItem>
          ))}
          <div ref={feedEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
