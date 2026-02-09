'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useWorkflowStore } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'extract-structure', label: 'Extract' },
  { id: 'initial-hypothesis', label: 'Hypothesize' },
  { id: 'verify-improve', label: 'Verify & Improve' },
  { id: 'answer-questions', label: 'Answer' },
] as const;

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

interface StepInfo {
  id: string;
  label: string;
  status: StepStatus;
  iteration?: number;
  maxIterations?: number;
}

export function StepProgress({ onClick }: { onClick?: (stepId: string) => void }) {
  const events = useWorkflowStore((s) => s.events);
  const runStatus = useWorkflowStore((s) => s.runStatus);

  const steps: StepInfo[] = useMemo(() => {
    const startedSteps = new Set<string>();
    const completedSteps = new Set<string>();
    let latestIteration: { stepId: string; iteration: number; maxIterations: number } | null = null;

    for (const event of events) {
      if (event.type === 'data-step-start') {
        startedSteps.add(event.data.stepId);
      } else if (event.type === 'data-step-complete') {
        completedSteps.add(event.data.stepId);
      } else if (event.type === 'data-iteration-update') {
        latestIteration = {
          stepId: event.data.stepId,
          iteration: event.data.iteration,
          maxIterations: event.data.maxIterations,
        };
      }
    }

    return STEPS.map((step) => {
      let status: StepStatus = 'pending';
      if (completedSteps.has(step.id)) {
        status = 'completed';
      } else if (startedSteps.has(step.id)) {
        status = runStatus === 'error' ? 'failed' : 'running';
      }

      const info: StepInfo = { id: step.id, label: step.label, status };

      // Attach iteration data to verify-improve step
      if (step.id === 'verify-improve' && latestIteration?.stepId === step.id) {
        info.iteration = latestIteration.iteration;
        info.maxIterations = latestIteration.maxIterations;
      }

      return info;
    });
  }, [events, runStatus]);

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          {/* Connector line before step (except first) */}
          {i > 0 && (
            <div
              className={cn(
                'h-px w-4',
                step.status === 'completed' || step.status === 'running'
                  ? 'bg-foreground/30'
                  : 'bg-muted-foreground/20',
              )}
            />
          )}

          {/* Step badge */}
          <button
            onClick={() => onClick?.(step.id)}
            className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
              rounded-full"
          >
            <Badge
              variant={badgeVariant(step.status)}
              className={cn(
                'cursor-pointer select-none text-[10px] px-2 py-0',
                step.status === 'running' && 'animate-pulse',
              )}
            >
              {step.label}
              {step.id === 'verify-improve' &&
                step.iteration != null &&
                step.maxIterations != null &&
                step.status === 'running' && (
                  <span className="ml-1 font-mono text-[9px] opacity-80">
                    {step.iteration}/{step.maxIterations}
                  </span>
                )}
            </Badge>
          </button>
        </div>
      ))}
    </div>
  );
}

function badgeVariant(status: StepStatus) {
  switch (status) {
    case 'pending':
      return 'secondary' as const;
    case 'running':
      return 'default' as const;
    case 'completed':
      return 'outline' as const;
    case 'failed':
      return 'destructive' as const;
  }
}
