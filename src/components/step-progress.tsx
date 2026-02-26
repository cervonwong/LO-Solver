import { cn } from '@/lib/utils';
import { STEP_LABELS, type StepId } from '@/lib/workflow-events';

export const STEP_ORDER: StepId[] = [
  'extract-structure',
  'initial-hypothesis',
  'verify-improve-rules-loop',
  'answer-questions',
];

export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

interface StepProgressProps {
  stepStatuses: Record<StepId, StepStatus>;
  statusMessage?: string | undefined;
}

export function StepProgress({ stepStatuses, statusMessage }: StepProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEP_ORDER.map((stepId, i) => {
          const status = stepStatuses[stepId];
          return (
            <div key={stepId} className="flex items-center">
              {i > 0 && (
                <div
                  className={cn(
                    'mx-1 h-px flex-1',
                    status === 'success' || status === 'running'
                      ? 'bg-foreground'
                      : 'bg-border',
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-xs',
                    status === 'running' && 'animate-pulse border-foreground bg-foreground text-background',
                    status === 'success' && 'border-foreground bg-foreground text-background',
                    status === 'failed' && 'border-destructive bg-destructive text-background',
                    status === 'pending' && 'border-border text-muted-foreground',
                  )}
                >
                  {status === 'success' ? (
                    <span>&#10003;</span>
                  ) : status === 'failed' ? (
                    <span>&#10007;</span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs',
                    status === 'running' && 'font-bold text-foreground',
                    status === 'success' && 'text-foreground',
                    status === 'failed' && 'text-destructive',
                    status === 'pending' && 'text-muted-foreground',
                  )}
                >
                  {STEP_LABELS[stepId]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {statusMessage && (
        <p className="mt-4 text-center text-sm text-muted-foreground">{statusMessage}</p>
      )}
    </div>
  );
}
