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
        'flex h-8 w-8 items-center justify-center border text-xs font-medium transition-all duration-300',
        status === 'running' && 'border-accent text-accent shadow-[0_0_6px_rgba(0,255,255,0.4)]',
        status === 'success' && 'border-foreground bg-foreground text-background',
        status === 'failed' && 'border-destructive text-destructive',
        status === 'pending' && 'border-[rgba(255,255,255,0.3)] text-muted-foreground',
      )}
    >
      {status === 'success' ? (
        <span className="animate-checkmark-scale">&#10003;</span>
      ) : status === 'failed' ? (
        <span>&#10007;</span>
      ) : (
        label
      )}
    </div>
  );
}

function Connector({ fromStatus, toStatus }: { fromStatus: StepStatus; toStatus: StepStatus }) {
  const bothComplete = fromStatus === 'success' && toStatus === 'success';
  const completedToRunning = fromStatus === 'success' && toStatus === 'running';
  const hasActivity = fromStatus === 'success' || fromStatus === 'running';

  return (
    <div
      className={cn(
        'mx-1 h-px min-w-3 flex-1 transition-colors duration-300',
        bothComplete && 'bg-[rgba(255,255,255,0.6)]',
        completedToRunning && 'bg-accent',
        !bothComplete && !completedToRunning && hasActivity && 'bg-foreground',
        !hasActivity && 'border-t border-dashed border-[rgba(255,255,255,0.15)]',
      )}
    />
  );
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
            {i > 0 && <Connector fromStatus={steps[i - 1]!.status} toStatus={step.status} />}
            <div className="flex flex-col items-center gap-1">
              <StepCircle status={step.status} label={i + 1} />
              <span
                className={cn(
                  'whitespace-nowrap text-xs uppercase tracking-wider',
                  step.status === 'running' && 'font-bold text-accent',
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
