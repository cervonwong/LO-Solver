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
        status === 'pending' && 'border-border text-muted-foreground',
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
        'ml-[15px] h-4 w-px min-h-3 transition-colors duration-300',
        bothComplete && 'bg-[rgba(255,255,255,0.6)]',
        completedToRunning && 'bg-accent',
        !bothComplete && !completedToRunning && hasActivity && 'bg-foreground',
        !hasActivity && 'border-l border-dashed border-border-subtle',
      )}
    />
  );
}

export function StepProgress({ steps, statusMessage, onStepClick }: StepProgressProps) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={step.id}>
          {i > 0 && <Connector fromStatus={steps[i - 1]!.status} toStatus={step.status} />}
          <div
            className="flex items-center gap-3"
            onClick={() => onStepClick?.(step.id)}
            role={onStepClick ? 'button' : undefined}
            style={onStepClick ? { cursor: 'pointer' } : undefined}
          >
            <StepCircle status={step.status} label={i + 1} />
            <span
              className={cn(
                'text-xs uppercase tracking-wider',
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
      {statusMessage && (
        <p className="mt-3 pl-[44px] text-sm text-muted-foreground">{statusMessage}</p>
      )}
    </div>
  );
}
