import { cn } from '@/lib/utils';
import type { UIStepId } from '@/lib/workflow-events';

export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

export interface ProgressStep {
  id: UIStepId;
  label: string;
  status: StepStatus;
}

interface StepProgressProps {
  steps: ProgressStep[];
  statusMessage?: string | undefined;
  onStepClick?: (stepId: UIStepId) => void;
}

function StepCircle({ status, label }: { status: StepStatus; label: string | number }) {
  return (
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
        label
      )}
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return <div className={cn('mx-1 h-px min-w-3 flex-1', active ? 'bg-foreground' : 'bg-border')} />;
}

export function StepProgress({ steps, statusMessage, onStepClick }: StepProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className="flex items-center"
            onClick={() => onStepClick?.(step.id)}
            role={onStepClick ? 'button' : undefined}
            style={onStepClick ? { cursor: 'pointer' } : undefined}
          >
            {i > 0 && <Connector active={step.status === 'success' || step.status === 'running'} />}
            <div className="flex flex-col items-center gap-1">
              <StepCircle status={step.status} label={i + 1} />
              <span
                className={cn(
                  'whitespace-nowrap text-xs',
                  step.status === 'running' && 'font-bold text-foreground',
                  step.status === 'success' && 'text-foreground',
                  step.status === 'failed' && 'text-destructive',
                  step.status === 'pending' && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      {statusMessage && (
        <p className="mt-4 text-center text-sm text-muted-foreground">{statusMessage}</p>
      )}
    </div>
  );
}
