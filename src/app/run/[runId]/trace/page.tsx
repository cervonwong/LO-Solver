'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { DevTrace } from '@/components/dev/dev-trace';
import { DetailPanel } from '@/components/dev/detail-panel';
import { IterationTabs } from '@/components/dev/iteration-tabs';
import type { SwimlaneLane } from '@/components/dev/swimlane';
import type {
  AgentReasoningEvent,
  StepCompleteEvent,
  IterationUpdateEvent,
} from '@/lib/workflow-events';
import Link from 'next/link';

type StreamEvent =
  | AgentReasoningEvent
  | StepCompleteEvent
  | IterationUpdateEvent
  | { type: string; data: Record<string, unknown> };

export default function TracePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params);
  const [lanes, setLanes] = useState<SwimlaneLane[]>([]);
  const [selectedLane, setSelectedLane] = useState<SwimlaneLane | null>(null);
  const [iterations, setIterations] = useState<number[]>([]);
  const [activeIteration, setActiveIteration] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const processEvents = useCallback((events: StreamEvent[]) => {
    // Key completedSteps by "stepId:iteration" so verify-improve iterations
    // don't overwrite each other's durations
    const completedSteps = new Map<string, number>();
    const iterationSet = new Set<number>();
    let trackIteration = 0;

    // First pass: gather step completion data and iterations
    for (const event of events) {
      if (event.type === 'data-iteration-update') {
        const data = (event as IterationUpdateEvent).data;
        trackIteration = data.iteration;
        iterationSet.add(data.iteration);
      }
      if (event.type === 'data-step-complete') {
        const data = (event as StepCompleteEvent).data;
        const key = data.stepId === 'verify-improve'
          ? `${data.stepId}:${trackIteration}`
          : data.stepId;
        completedSteps.set(key, data.durationMs);
      }
    }

    // Second pass: build lanes from reasoning events, tracking current iteration
    const newLanes: SwimlaneLane[] = [];
    let currentIteration = 0;

    for (const event of events) {
      if (event.type === 'data-iteration-update') {
        const data = (event as IterationUpdateEvent).data;
        currentIteration = data.iteration;
      }
      if (event.type === 'data-agent-reasoning') {
        const data = (event as AgentReasoningEvent).data;
        const isIterative = data.stepId === 'verify-improve';
        const key = isIterative ? `${data.stepId}:${currentIteration}` : data.stepId;
        const durationMs = completedSteps.get(key);
        newLanes.push({
          agentId: data.agentId,
          agentName: data.agentName,
          stepId: data.stepId,
          model: data.model,
          reasoning: data.reasoning,
          timestamp: data.timestamp,
          durationMs,
          iteration: isIterative ? currentIteration : undefined,
          status: completedSteps.has(key) ? 'completed' : 'running',
        });
      }
    }

    const sortedIterations = [...iterationSet].sort((a, b) => a - b);
    return { lanes: newLanes, iterations: sortedIterations };
  }, []);

  useEffect(() => {
    const poll = () => {
      try {
        const raw = sessionStorage.getItem(`run-events-${runId}`);
        if (!raw) return;
        const events: StreamEvent[] = JSON.parse(raw);
        const { lanes: newLanes, iterations: newIterations } = processEvents(events);
        setLanes(newLanes);
        setIterations(newIterations);
      } catch {
        // Ignore parse errors
      }
    };

    // Initial read
    poll();

    // Poll every second
    pollRef.current = setInterval(poll, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId, processEvents]);

  const filteredLanes = lanes.filter(
    (lane) => lane.iteration === undefined || lane.iteration === activeIteration,
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">
          Dev Trace{' '}
          {lanes.length > 0 && (
            <span className="font-normal text-muted-foreground">({lanes.length} agents)</span>
          )}
        </h1>
        <Link
          href={`/run/${runId}`}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Back to run
        </Link>
      </div>

      {/* Main content */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={65} minSize={40}>
          <DevTrace
            lanes={filteredLanes}
            selectedLane={selectedLane}
            onSelectLane={setSelectedLane}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={35} minSize={20}>
          <DetailPanel lane={selectedLane} />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Iteration tabs */}
      {iterations.length > 0 && (
        <div className="border-t px-4 py-2">
          <IterationTabs
            iterations={iterations}
            activeIteration={activeIteration}
            onSelect={setActiveIteration}
          />
        </div>
      )}
    </div>
  );
}
