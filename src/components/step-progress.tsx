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
        'flex h-5 w-5 items-center justify-center border text-[10px] font-medium transition-all duration-300',
        status === 'running' && 'animate-pulse-glow border-accent text-accent',
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
        'ml-[9px] h-3 min-h-2 transition-colors duration-300',
        bothComplete && 'w-0.5 bg-[rgba(255,255,255,0.6)]',
        completedToRunning && 'w-0.5 animate-pulse-glow-line bg-accent',
        !bothComplete && !completedToRunning && hasActivity && 'w-0.5 bg-foreground',
        !hasActivity && 'w-px border-l border-dashed border-border-subtle',
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
            className="flex items-center gap-2"
            onClick={() => onStepClick?.(step.id)}
            role={onStepClick ? 'button' : undefined}
            style={onStepClick ? { cursor: 'pointer' } : undefined}
          >
            <StepCircle status={step.status} label={i + 1} />
            <span
              className={cn(
                'text-xs font-heading',
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
        <p className="mt-3 pl-[28px] text-sm text-muted-foreground">{statusMessage}</p>
      )}
    </div>
  );
}
